import type { Item, PracticeLog, PracticeRule, Snapshot } from "./types";
import { shiftDate, weekday, weekStart } from "./dates";

export function ruleFor(rules: PracticeRule[], id: string, date: string) {
  return rules
    .filter((r) => r.item_id === id && r.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
}
export function practiceProgress(
  item: Item,
  rules: PracticeRule[],
  logs: PracticeLog[],
  today: string,
) {
  const rule = ruleFor(rules, item.id, today);
  if (!rule)
    return {
      rule,
      amount: 0,
      target: 1,
      done: false,
      checkedToday: false,
      eligible: false,
    };
  const todayAmount = logs
    .filter((l) => l.item_id === item.id && l.local_date === today)
    .reduce((sum, l) => sum + l.amount, 0);
  const amount =
    rule.frequency === "weekly"
      ? new Set(
          logs
            .filter(
              (l) =>
                l.item_id === item.id &&
                l.local_date >= weekStart(today) &&
                l.local_date <= today &&
                l.amount > 0,
            )
            .map((l) => l.local_date),
        ).size
      : todayAmount;
  const done = amount >= rule.target;
  const eligible =
    rule.frequency !== "selected" || rule.days.includes(weekday(today));
  return {
    rule,
    amount,
    target: rule.target,
    done,
    checkedToday: todayAmount > 0,
    eligible,
  };
}
export function reviewReason(
  item: Item,
  all: Item[],
  today: string,
  logs: PracticeLog[] = [],
): string | null {
  if (item.status === "completed" || item.status === "archived") return null;
  if (item.inbox) return "Ready to clarify";
  if (item.reviewed_on === today) return null;
  if (item.review_on && item.review_on <= today)
    return "You wanted to revisit this";
  if (item.status === "later") return null;
  if (item.due_on && item.due_on < today) return "The deadline has passed";
  if (
    item.kind === "goal" &&
    !all.some(
      (child) =>
        child.parent_id === item.id &&
        child.status === "active" &&
        !child.inbox,
    )
  )
    return "Choose a next step";
  const recentPractice =
    item.kind === "practice" &&
    logs.some(
      (l) =>
        l.item_id === item.id &&
        l.local_date > shiftDate(today, -14) &&
        l.local_date <= today,
    );
  if (!recentPractice && item.updated_at.slice(0, 10) <= shiftDate(today, -14))
    return "Still part of your plans?";
  return null;
}
export function focusItems(data: Snapshot, today: string) {
  const active = data.items.filter(
    (i) => !i.inbox && i.status === "active" && i.dismissed_on !== today,
  );
  const needs = active
    .filter(
      (i) =>
        i.kind !== "practice" &&
        ((i.due_on && i.due_on <= today) ||
          (i.scheduled_for && i.scheduled_for <= today)),
    )
    .sort((a, b) =>
      (a.due_on ?? a.scheduled_for ?? "").localeCompare(
        b.due_on ?? b.scheduled_for ?? "",
      ),
    );
  const practices = active.filter(
    (i) =>
      i.kind === "practice" &&
      practiceProgress(i, data.rules, data.logs, today).eligible,
  );
  const suggestions = active
    .filter(
      (i) =>
        i.kind !== "practice" &&
        !needs.includes(i) &&
        (!i.scheduled_for || i.scheduled_for <= today),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        Number(!!b.review_on && b.review_on <= today) -
          Number(!!a.review_on && a.review_on <= today) ||
        a.created_at.localeCompare(b.created_at) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 4);
  return { needs, practices, suggestions };
}
export function suggestionReason(item: Item, today: string): string {
  if (item.pinned) return "Pinned by you";
  if (item.review_on && item.review_on <= today) return "Ready to revisit";
  if (item.parent_id) return "A step toward your goal";
  if (item.kind === "goal") return "An active goal";
  return "From your active collection";
}
