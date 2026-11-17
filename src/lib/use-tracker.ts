"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "@/app/actions";
import { emptySnapshot, demoSnapshot } from "./seed";
import { localDate } from "./dates";
import { itemSchema, patchSchema, profileSchema } from "./validation";
import type { Item, ItemInput, Profile, Snapshot } from "./types";
const STORAGE_KEY = "gather-demo-v1";

export function useTracker(initial: Snapshot | null, mode: "demo" | "cloud") {
  const [data, setData] = useState<Snapshot>(initial ?? emptySnapshot());
  const [ready, setReady] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const ref = useRef(data);
  const lock = useRef(false);
  const [clock, setClock] = useState(() => new Date());
  const commit = useCallback((next: Snapshot) => {
    ref.current = next;
    setData(next);
  }, []);
  useEffect(() => {
    if (mode !== "demo") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Snapshot;
        if (
          !Array.isArray(parsed.items) ||
          !Array.isArray(parsed.rules) ||
          !Array.isArray(parsed.logs)
        )
          throw new Error("Unrecognized demo data.");
        profileSchema.parse(parsed.profile);
        parsed.items.forEach((i) =>
          itemSchema.parse({
            ...i,
            rule:
              i.kind === "practice"
                ? parsed.rules.find((r) => r.item_id === i.id)
                : undefined,
          }),
        );
        commit(parsed);
      } else {
        const sample = demoSnapshot();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
        commit(sample);
      }
    } catch {
      setNotice(
        "Local demo storage is unavailable or unreadable. Export any visible data before clearing your browser storage. Changes will only succeed if storage is available.",
      );
    }
    setReady(true);
  }, [mode, commit]);
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const today = localDate(data.profile.timezone, clock);
  async function mutate(
    transform: (before: Snapshot) => Snapshot,
    remote: () => Promise<void>,
    message = "Saved",
    optimistic = false,
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    const before = ref.current;
    try {
      const next = transform(before);
      if (mode === "demo") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        commit(next);
      } else {
        if (optimistic) commit(next);
        try {
          await remote();
        } catch (error) {
          if (optimistic) commit(before);
          throw error;
        }
        try {
          commit(await api.loadSnapshot());
        } catch {
          commit(next);
          setNotice(
            "Saved, but we couldn’t refresh the full collection. Reload when your connection returns.",
          );
          return true;
        }
      }
      setNotice(message);
      return true;
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Couldn’t save. Try again.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save(input: ItemInput) {
    const parsed = itemSchema.safeParse(input);
    if (!parsed.success) {
      setNotice(parsed.error.issues[0].message);
      return false;
    }
    return mutate(
      (before) => {
        if (
          input.parent_id &&
          !before.items.some(
            (i) => i.id === input.parent_id && i.kind === "goal",
          )
        )
          throw new Error("Choose one of your goals.");
        const old = before.items.find((i) => i.id === input.id);
        if (
          old?.kind === "goal" &&
          input.kind !== "goal" &&
          before.items.some((i) => i.parent_id === input.id)
        )
          throw new Error(
            "Move the linked items before changing this goal into another kind.",
          );
        const { rule, ...fields } = input;
        const now = new Date().toISOString();
        const item: Item = {
          created_at: now,
          reviewed_on: null,
          dismissed_on: null,
          ...old,
          ...fields,
          updated_at: now,
        };
        let rules = before.rules;
        if (rule && input.kind === "practice") {
          const previous = rules
            .filter((r) => r.item_id === item.id && r.effective_from <= today)
            .sort((a, b) =>
              b.effective_from.localeCompare(a.effective_from),
            )[0];
          if (
            !previous ||
            previous.frequency !== rule.frequency ||
            previous.target !== rule.target ||
            previous.unit !== rule.unit ||
            JSON.stringify(previous.days) !== JSON.stringify(rule.days)
          ) {
            rules = [
              ...rules.filter(
                (r) => !(r.item_id === item.id && r.effective_from === today),
              ),
              {
                ...rule,
                id: crypto.randomUUID(),
                item_id: item.id,
                effective_from: today,
              },
            ];
          }
        }
        return {
          ...before,
          items: old
            ? before.items.map((i) => (i.id === item.id ? item : i))
            : [...before.items, item],
          rules,
        };
      },
      () => api.saveItem(input),
      "Added to your collection",
    );
  }
  async function patch(
    id: string,
    input: Parameters<typeof patchSchema.parse>[0],
    message = "Updated",
  ) {
    const patch = patchSchema.parse(input);
    return mutate(
      (before) => ({
        ...before,
        items: before.items.map((i) =>
          i.id === id
            ? { ...i, ...patch, updated_at: new Date().toISOString() }
            : i,
        ),
      }),
      () => api.patchItem(id, patch),
      message,
      true,
    );
  }
  async function log(id: string, amount: number) {
    const requestId = crypto.randomUUID();
    return mutate(
      (before) => ({
        ...before,
        logs: [
          ...before.logs,
          {
            id: requestId,
            item_id: id,
            amount,
            local_date: today,
            created_at: new Date().toISOString(),
          },
        ],
      }),
      () => api.logPractice(id, amount, requestId),
      "A little progress. It all counts.",
      true,
    );
  }
  async function removeLog(id: string) {
    return mutate(
      (before) => ({ ...before, logs: before.logs.filter((l) => l.id !== id) }),
      () => api.deleteLog(id),
      "Check-in removed",
    );
  }
  async function profile(input: Profile) {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      setNotice(parsed.error.issues[0].message);
      return false;
    }
    return mutate(
      (before) => ({ ...before, profile: input }),
      () => api.saveProfile(input),
      "Preferences saved",
    );
  }
  return {
    data,
    ready,
    busy,
    notice,
    setNotice,
    today,
    save,
    patch,
    log,
    removeLog,
    profile,
  };
}
