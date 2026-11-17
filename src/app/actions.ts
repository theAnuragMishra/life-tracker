"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { itemSchema, patchSchema, profileSchema } from "@/lib/validation";
import type {
  Item,
  PracticeLog,
  PracticeRule,
  Resource,
  Snapshot,
} from "@/lib/types";

async function authenticated() {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    throw new Error("Your session expired. Please sign in again.");
  return { db, user };
}
function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function loadSnapshot(): Promise<Snapshot> {
  const { db, user } = await authenticated();
  async function readAll<T>(table: string): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("user_id", user.id)
        .order("id")
        .range(offset, offset + 499);
      fail(error);
      rows.push(...((data ?? []) as T[]));
      if (!data || data.length < 500) return rows;
    }
  }
  const results: [
    Omit<Item, "resources">[],
    (Resource & { item_id: string })[],
    PracticeRule[],
    PracticeLog[],
    { data: Snapshot["profile"] | null; error: { message: string } | null },
  ] = await Promise.all([
    readAll<Omit<Item, "resources">>("items"),
    readAll<Resource & { item_id: string }>("resources"),
    readAll<PracticeRule>("practice_rules"),
    readAll<PracticeLog>("practice_logs"),
    db
      .from("profiles")
      .select("name,timezone,walkthrough_completed")
      .eq("id", user.id)
      .single(),
  ] as const);
  const [items, resources, rules, logs, profile] = results;
  fail(profile.error);
  if (!profile.data)
    throw new Error(
      "Profile not found. Apply the database migration before using the app.",
    );
  return {
    items: items
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        ...item,
        resources: resources.filter((r) => r.item_id === item.id),
      })),
    rules: rules.map((r) => ({ ...r, target: Number(r.target) })),
    logs: logs.map((l) => ({ ...l, amount: Number(l.amount) })),
    profile: profile.data,
  } as Snapshot;
}
export async function saveItem(input: unknown) {
  const parsed = itemSchema.parse(input);
  const { db } = await authenticated();
  const { error } = await db.rpc("save_item", { p_item: parsed });
  fail(error);
  revalidatePath("/");
}
export async function patchItem(id: string, input: unknown) {
  z.uuid().parse(id);
  const parsed = patchSchema.parse(input);
  const { db, user } = await authenticated();
  const { data, error } = await db
    .from("items")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  fail(error);
  if (!data) throw new Error("Item unavailable.");
  revalidatePath("/");
}
export async function logPractice(
  id: string,
  amount: number,
  requestId: string,
) {
  z.uuid().parse(id);
  z.uuid().parse(requestId);
  z.number().positive().max(100000).parse(amount);
  const { db } = await authenticated();
  const { error } = await db.rpc("log_practice", {
    p_item_id: id,
    p_amount: amount,
    p_request_id: requestId,
  });
  fail(error);
  revalidatePath("/");
}
export async function deleteLog(id: string) {
  z.uuid().parse(id);
  const { db, user } = await authenticated();
  const { error } = await db
    .from("practice_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  fail(error);
  revalidatePath("/");
}
export async function saveProfile(input: unknown) {
  const parsed = profileSchema.parse(input);
  const { db, user } = await authenticated();
  const { error } = await db.from("profiles").update(parsed).eq("id", user.id);
  fail(error);
  revalidatePath("/");
}
export async function signOut() {
  const { db } = await authenticated();
  await db.auth.signOut();
  redirect("/login");
}
export async function sendMagicLink(
  _previous: { message: string; success: boolean },
  form: FormData,
) {
  const parsed = z.email().safeParse(form.get("email"));
  if (!parsed.success)
    return { success: false, message: "Enter a valid email address." };
  const db = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await db.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${site.replace(/\/$/, "")}/auth/confirm` },
  });
  return error
    ? { success: false, message: error.message }
    : {
        success: true,
        message:
          "Check your email for a sign-in link. You can close this tab and open the link on this device.",
      };
}
