"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Flag,
  Link2,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Modal } from "./ui/dialog";
import { practiceProgress, ruleFor } from "@/lib/planner";
import { prettyDate } from "@/lib/dates";
import { itemSchema } from "@/lib/validation";
import type { Item, ItemInput, Kind, Snapshot } from "@/lib/types";
export const kindInfo = {
  action: { label: "Action", description: "Something to finish", Icon: Circle },
  practice: {
    label: "Practice",
    description: "Something to repeat",
    Icon: Repeat2,
  },
  goal: { label: "Goal", description: "An outcome to reach", Icon: Flag },
  interest: {
    label: "Interest",
    description: "Something to explore",
    Icon: Sparkles,
  },
};
const blank = (): ItemInput => ({
  id: crypto.randomUUID(),
  title: "",
  kind: null,
  status: "active",
  inbox: true,
  notes: "",
  area: "",
  parent_id: null,
  due_on: null,
  scheduled_for: null,
  review_on: null,
  pinned: false,
  resources: [],
});
export function ItemEditor({
  item,
  data,
  today,
  busy,
  onClose,
  onSave,
  onLog,
  onRemoveLog,
  onOpen,
}: {
  item?: Item;
  data: Snapshot;
  today: string;
  busy: boolean;
  onClose: () => void;
  onSave: (input: ItemInput) => Promise<boolean>;
  onLog: (id: string, amount: number) => Promise<boolean>;
  onRemoveLog: (id: string) => Promise<boolean>;
  onOpen: (item: Item) => void;
}) {
  const [form, setForm] = useState<ItemInput>(() =>
    item ? { ...item, rule: ruleFor(data.rules, item.id, today) } : blank(),
  );
  const [expanded, setExpanded] = useState(!!item);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(1);
  const [dirty, setDirty] = useState(false);
  function update(patch: Partial<ItemInput>) {
    setDirty(true);
    setForm((f) => ({ ...f, ...patch }));
  }
  function selectKind(kind: Kind) {
    update({
      kind,
      inbox: false,
      parent_id: kind === "goal" ? null : form.parent_id,
      rule:
        kind === "practice"
          ? (form.rule ?? {
              frequency: "daily",
              days: [],
              target: 1,
              unit: "session",
            })
          : undefined,
    });
    setExpanded(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = itemSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError("");
    if (await onSave(parsed.data)) onClose();
  }
  const children = item
    ? data.items.filter(
        (i) => i.parent_id === item.id && i.status !== "archived",
      )
    : [];
  const progress =
    item?.kind === "practice"
      ? practiceProgress(item, data.rules, data.logs, today)
      : null;
  const logs = item
    ? data.logs
        .filter((l) => l.item_id === item.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 14)
    : [];
  const areas = [...new Set(data.items.map((i) => i.area).filter(Boolean))];
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={item ? "A closer look" : "Make a little room"}
      description={
        item
          ? "Everything you need to move this forward."
          : "Capture a thought now. Figure out the details whenever you’re ready."
      }
      wide
    >
      <form onSubmit={submit} className="editor-form">
        <label htmlFor="item-title" className="sr-only">
          Title
        </label>
        <input
          id="item-title"
          className="title-input"
          placeholder="What’s on your mind?"
          maxLength={240}
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          autoFocus
          required
        />
        <div className="kind-grid">
          {Object.entries(kindInfo).map(
            ([kind, { label, description, Icon }]) => (
              <button
                className={`kind-choice ${form.kind === kind ? "selected" : ""}`}
                type="button"
                key={kind}
                onClick={() => selectKind(kind as Kind)}
              >
                <Icon size={18} />
                <strong>{label}</strong>
                <span>{description}</span>
              </button>
            ),
          )}
        </div>
        {!expanded && (
          <button
            type="button"
            className="text-link"
            onClick={() => setExpanded(true)}
          >
            <Plus size={15} /> Add details or a link
          </button>
        )}
        {expanded && (
          <>
            <label>
              Notes
              <textarea
                placeholder="Why this matters, a first step, or anything worth remembering…"
                rows={3}
                maxLength={10000}
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label>
                Commitment
                <select
                  value={form.status}
                  onChange={(e) =>
                    update({ status: e.target.value as ItemInput["status"] })
                  }
                >
                  <option value="active">Active — making room for this</option>
                  <option value="later">Later — keeping the possibility</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label>
                Life area
                <input
                  list="life-areas"
                  placeholder="e.g. Wellbeing"
                  maxLength={60}
                  value={form.area}
                  onChange={(e) => update({ area: e.target.value })}
                />
                <datalist id="life-areas">
                  {areas.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </label>
            </div>
            {form.kind !== "goal" && (
              <label>
                Supports a goal
                <select
                  value={form.parent_id ?? ""}
                  onChange={(e) =>
                    update({ parent_id: e.target.value || null })
                  }
                >
                  <option value="">Standalone item</option>
                  {data.items
                    .filter((i) => i.kind === "goal" && i.id !== form.id)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {form.kind === "practice" && form.rule && (
              <fieldset className="practice-settings">
                <legend>Your rhythm</legend>
                <div className="form-row">
                  <label>
                    Frequency
                    <select
                      value={form.rule.frequency}
                      onChange={(e) =>
                        update({
                          rule: {
                            ...form.rule!,
                            frequency: e.target.value as NonNullable<
                              ItemInput["rule"]
                            >["frequency"],
                            target: 1,
                            unit:
                              e.target.value === "weekly" ? "days" : "session",
                          },
                        })
                      }
                    >
                      <option value="daily">Every day</option>
                      <option value="selected">Selected days</option>
                      <option value="weekly">Days per week</option>
                      <option value="flexible">
                        Flexible, whenever it fits
                      </option>
                    </select>
                  </label>
                  <label>
                    {form.rule.frequency === "weekly"
                      ? "Days per week (1–7)"
                      : "Daily target"}
                    <input
                      type="number"
                      min="0.1"
                      step={form.rule.frequency === "weekly" ? "1" : "any"}
                      max={form.rule.frequency === "weekly" ? 7 : 100000}
                      value={form.rule.target}
                      onChange={(e) =>
                        update({
                          rule: {
                            ...form.rule!,
                            target: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  {form.rule.frequency !== "weekly" && (
                    <label>
                      Unit
                      <input
                        maxLength={40}
                        value={form.rule.unit}
                        onChange={(e) =>
                          update({
                            rule: { ...form.rule!, unit: e.target.value },
                          })
                        }
                        placeholder="minutes, pages, session"
                      />
                    </label>
                  )}
                </div>
                {form.rule.frequency === "selected" && (
                  <div className="day-picker">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, index) => (
                        <button
                          type="button"
                          aria-pressed={form.rule!.days.includes(index)}
                          className={
                            form.rule!.days.includes(index) ? "selected" : ""
                          }
                          key={day}
                          onClick={() =>
                            update({
                              rule: {
                                ...form.rule!,
                                days: form.rule!.days.includes(index)
                                  ? form.rule!.days.filter((d) => d !== index)
                                  : [...form.rule!.days, index].sort(),
                              },
                            })
                          }
                        >
                          {day}
                        </button>
                      ),
                    )}
                  </div>
                )}
                <p className="small muted">
                  Changes take effect today. Earlier check-ins stay in your
                  history. Weekly targets count distinct days, Monday–Sunday.
                </p>
              </fieldset>
            )}
            <div className="form-row dates-row">
              {form.kind !== "practice" && (
                <>
                  <label>
                    Deadline
                    <input
                      type="date"
                      value={form.due_on ?? ""}
                      onChange={(e) =>
                        update({ due_on: e.target.value || null })
                      }
                    />
                    <span className="field-help">
                      Must be done by this date
                    </span>
                  </label>
                  <label>
                    Work on
                    <input
                      type="date"
                      value={form.scheduled_for ?? ""}
                      onChange={(e) =>
                        update({ scheduled_for: e.target.value || null })
                      }
                    />
                    <span className="field-help">
                      When you plan to give it attention
                    </span>
                  </label>
                </>
              )}
              <label>
                Revisit on
                <input
                  type="date"
                  value={form.review_on ?? ""}
                  onChange={(e) =>
                    update({ review_on: e.target.value || null })
                  }
                />
                <span className="field-help">Bring it back during Review</span>
              </label>
            </div>
            <div className="resource-heading">
              <label>Links & resources</label>
              <button
                type="button"
                className="text-link small"
                onClick={() =>
                  update({
                    resources: [
                      ...form.resources,
                      { id: crypto.randomUUID(), label: "", url: "" },
                    ],
                  })
                }
                disabled={form.resources.length >= 20}
              >
                <Plus size={14} /> Add link
              </button>
            </div>
            {form.resources.map((resource, index) => (
              <div className="resource-edit" key={resource.id}>
                <Link2 size={16} />
                <input
                  aria-label={`Link ${index + 1} label`}
                  placeholder="Label (optional)"
                  maxLength={120}
                  value={resource.label}
                  onChange={(e) =>
                    update({
                      resources: form.resources.map((r) =>
                        r.id === resource.id
                          ? { ...r, label: e.target.value }
                          : r,
                      ),
                    })
                  }
                />
                <input
                  aria-label={`Link ${index + 1} URL`}
                  placeholder="https://…"
                  type="url"
                  value={resource.url}
                  onChange={(e) =>
                    update({
                      resources: form.resources.map((r) =>
                        r.id === resource.id
                          ? { ...r, url: e.target.value }
                          : r,
                      ),
                    })
                  }
                  required
                />
                {resource.url && /^https?:\/\//i.test(resource.url) && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-button"
                    aria-label={`Open ${resource.label || "resource"}`}
                  >
                    <ArrowRight size={16} />
                  </a>
                )}
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Remove link"
                  onClick={() =>
                    update({
                      resources: form.resources.filter(
                        (r) => r.id !== resource.id,
                      ),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="check-options">
              <label>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => update({ pinned: e.target.checked })}
                />{" "}
                Pin to Focus
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.inbox}
                  onChange={(e) => update({ inbox: e.target.checked })}
                />{" "}
                Keep in Inbox
              </label>
            </div>
          </>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy
              ? "Saving…"
              : item
                ? "Save changes"
                : form.inbox
                  ? "Capture to Inbox"
                  : "Add to collection"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
      {children.length > 0 && (
        <section className="detail-section">
          <h3>Steps & supporting practices</h3>
          {children.map((child) => (
            <button
              key={child.id}
              className="linked-item"
              disabled={dirty || busy}
              onClick={() => onOpen(child)}
            >
              <span>
                {child.status === "completed" ? (
                  <Check size={16} />
                ) : (
                  <Circle size={16} />
                )}
                {child.title}
              </span>
              <ArrowRight size={15} />
            </button>
          ))}
          {dirty && (
            <p className="small muted">
              Save your changes before opening another item.
            </p>
          )}
        </section>
      )}
      {item?.kind === "practice" && (
        <section className="detail-section">
          <h3>A little progress</h3>
          <p className="muted small">
            {progress?.amount ?? 0} / {progress?.target ?? 1}{" "}
            {progress?.rule?.unit ?? "sessions"}
            {progress?.rule?.frequency === "weekly" ? " this week" : " today"}
          </p>
          {item.status === "active" &&
            !item.inbox &&
            progress &&
            !progress.done &&
            !(
              progress.rule?.frequency === "weekly" && progress.checkedToday
            ) && (
              <div className="log-form">
                <label className="sr-only" htmlFor="log-amount">
                  Progress amount
                </label>
                <input
                  id="log-amount"
                  type="number"
                  min="0.1"
                  step="any"
                  max={progress.target - progress.amount}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  disabled={progress.rule?.frequency === "weekly"}
                />
                <button
                  className="button secondary"
                  disabled={
                    busy ||
                    amount <= 0 ||
                    amount > progress.target - progress.amount
                  }
                  onClick={() =>
                    onLog(
                      item.id,
                      progress.rule?.frequency === "weekly" ? 1 : amount,
                    )
                  }
                >
                  Record progress
                </button>
              </div>
            )}
          <h4>Recent check-ins</h4>
          {!logs.length && (
            <p className="small muted">
              Your first check-in is a good place to start.
            </p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="log-row">
              <span>
                {prettyDate(log.local_date)}{" "}
                <span className="muted">
                  · +{log.amount}
                  {progress?.rule?.frequency === "weekly" ? " check-in" : ""}
                </span>
              </span>
              <button
                className="text-link small"
                onClick={() => onRemoveLog(log.id)}
                disabled={busy}
              >
                Undo check-in
              </button>
            </div>
          ))}
        </section>
      )}
    </Modal>
  );
}
