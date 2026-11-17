import { describe, expect, it } from "vitest";
import { localDate, shiftDate, weekStart } from "../src/lib/dates";
import {
  focusItems,
  practiceProgress,
  reviewReason,
  ruleFor,
} from "../src/lib/planner";
import { itemSchema, profileSchema } from "../src/lib/validation";
import type {
  Item,
  PracticeLog,
  PracticeRule,
  Snapshot,
} from "../src/lib/types";
const today = "2026-11-17";
function item(extra: Partial<Item> = {}): Item {
  return {
    id: crypto.randomUUID(),
    title: "A thought",
    kind: "action",
    status: "active",
    inbox: false,
    notes: "",
    area: "",
    parent_id: null,
    due_on: null,
    scheduled_for: null,
    review_on: null,
    dismissed_on: null,
    pinned: false,
    created_at: "2026-11-17T10:00:00Z",
    updated_at: "2026-11-17T10:00:00Z",
    reviewed_on: null,
    resources: [],
    ...extra,
  };
}
function snapshot(items: Item[]): Snapshot {
  return {
    items,
    rules: [],
    logs: [],
    profile: { name: "", timezone: "UTC", walkthrough_completed: true },
  };
}
function rule(id: string, extra: Partial<PracticeRule> = {}): PracticeRule {
  return {
    id: crypto.randomUUID(),
    item_id: id,
    frequency: "daily",
    target: 30,
    unit: "minutes",
    days: [],
    effective_from: "2026-11-01",
    ...extra,
  };
}
function log(id: string, date: string, amount: number): PracticeLog {
  return {
    id: crypto.randomUUID(),
    item_id: id,
    local_date: date,
    amount,
    created_at: `${date}T12:00:00Z`,
  };
}

describe("local dates and recurrence boundaries", () => {
  it("uses the account timezone at midnight", () => {
    const instant = new Date("2026-11-17T19:00:00Z");
    expect(localDate("Asia/Kolkata", instant)).toBe("2026-11-18");
    expect(localDate("America/Los_Angeles", instant)).toBe("2026-11-17");
  });
  it("handles daylight saving transitions without adding 24-hour timestamps", () => {
    expect(
      localDate("America/New_York", new Date("2026-03-08T06:59:00Z")),
    ).toBe("2026-03-08");
    expect(
      localDate("America/New_York", new Date("2026-03-08T07:01:00Z")),
    ).toBe("2026-03-08");
    expect(shiftDate("2026-03-08", 1)).toBe("2026-03-09");
  });
  it("starts weeks on Monday across year boundaries", () => {
    expect(weekStart("2027-01-03")).toBe("2026-12-28");
    expect(weekStart("2027-01-04")).toBe("2027-01-04");
  });
});
describe("practice progress", () => {
  const practice = item({ kind: "practice" });
  it("adds incremental progress and excludes previous days", () => {
    const p = practiceProgress(
      practice,
      [rule(practice.id)],
      [
        log(practice.id, today, 10),
        log(practice.id, today, 15),
        log(practice.id, "2026-11-16", 30),
      ],
      today,
    );
    expect(p.amount).toBe(25);
    expect(p.done).toBe(false);
  });
  it("counts distinct days, not sessions, toward a weekly target", () => {
    const p = practiceProgress(
      practice,
      [rule(practice.id, { frequency: "weekly", target: 3, unit: "days" })],
      [
        log(practice.id, "2026-11-15", 1),
        log(practice.id, "2026-11-16", 1),
        log(practice.id, today, 1),
        log(practice.id, today, 1),
        log(practice.id, "2026-11-18", 1),
      ],
      today,
    );
    expect(p.amount).toBe(2);
    expect(p.checkedToday).toBe(true);
  });
  it("does not invent overdue sessions on a new day", () => {
    const p = practiceProgress(
      practice,
      [rule(practice.id)],
      [log(practice.id, "2026-11-16", 30)],
      today,
    );
    expect(p.amount).toBe(0);
    expect(p.target).toBe(30);
  });
  it("only includes selected weekdays", () => {
    expect(
      practiceProgress(
        practice,
        [rule(practice.id, { frequency: "selected", days: [1, 3] })],
        [],
        today,
      ).eligible,
    ).toBe(false);
  });
  it("chooses the rule effective on the requested date", () => {
    const rules = [
      rule(practice.id),
      rule(practice.id, { effective_from: "2026-11-18", target: 60 }),
    ];
    expect(ruleFor(rules, practice.id, today)?.target).toBe(30);
    expect(ruleFor(rules, practice.id, "2026-11-18")?.target).toBe(60);
  });
  it("supports flexible practices without an overdue calculation", () => {
    expect(
      practiceProgress(
        practice,
        [rule(practice.id, { frequency: "flexible" })],
        [],
        today,
      ).eligible,
    ).toBe(true);
  });
});
describe("Focus", () => {
  it("keeps Inbox, Later, completed, archived, and dismissed items out", () => {
    const data = snapshot([
      item({ inbox: true }),
      item({ status: "later" }),
      item({ status: "completed" }),
      item({ status: "archived" }),
      item({ dismissed_on: today }),
    ]);
    expect(focusItems(data, today)).toEqual({
      needs: [],
      practices: [],
      suggestions: [],
    });
  });
  it("separates real urgency from suggestions", () => {
    const due = item({ due_on: today });
    const revisit = item({ review_on: today });
    const f = focusItems(snapshot([due, revisit]), today);
    expect(f.needs).toEqual([due]);
    expect(f.suggestions).toEqual([revisit]);
  });
  it("does not suggest work scheduled for the future", () => {
    expect(
      focusItems(
        snapshot([item({ scheduled_for: "2026-12-01", pinned: true })]),
        today,
      ).suggestions,
    ).toHaveLength(0);
  });
  it("prioritizes pins and limits optional suggestions deterministically", () => {
    const pin = item({ pinned: true });
    const data = snapshot([...Array.from({ length: 6 }, () => item()), pin]);
    const result = focusItems(data, today);
    expect(result.suggestions[0]).toEqual(pin);
    expect(result.suggestions).toHaveLength(4);
    expect(focusItems(data, today)).toEqual(result);
  });
  it("restores hidden items the following day", () => {
    expect(
      focusItems(snapshot([item({ dismissed_on: today })]), shiftDate(today, 1))
        .suggestions,
    ).toHaveLength(1);
  });
});
describe("Review", () => {
  it("does not turn a future Later item into urgency", () => {
    const later = item({ status: "later", updated_at: "2020-01-01T00:00:00Z" });
    expect(reviewReason(later, [later], today)).toBeNull();
  });
  it("resurfaces a Later item when its revisit date arrives", () => {
    const later = item({ status: "later", review_on: today });
    expect(reviewReason(later, [later], today)).toBe(
      "You wanted to revisit this",
    );
  });
  it("acknowledges decisions for the rest of the local day", () => {
    const due = item({ due_on: "2026-11-16", reviewed_on: today });
    expect(reviewReason(due, [due], today)).toBeNull();
  });
  it("recognizes goal support only when active and clarified", () => {
    const goal = item({ kind: "goal" });
    const step = item({ parent_id: goal.id, status: "later" });
    expect(reviewReason(goal, [goal, step], today)).toBe("Choose a next step");
    step.status = "active";
    expect(reviewReason(goal, [goal, step], today)).toBeNull();
  });
  it("ignores archived items even with arrived revisit dates", () => {
    const archived = item({ status: "archived", review_on: today });
    expect(reviewReason(archived, [archived], today)).toBeNull();
  });
  it("does not call a recently logged practice stale", () => {
    const p = item({ kind: "practice", updated_at: "2026-10-01T00:00:00Z" });
    expect(reviewReason(p, [p], today, [log(p.id, today, 10)])).toBeNull();
  });
});
describe("input boundaries", () => {
  it("rejects executable resource URLs", () => {
    expect(
      itemSchema.safeParse({
        ...item(),
        resources: [
          { id: crypto.randomUUID(), label: "Bad", url: "javascript:alert(1)" },
        ],
      }).success,
    ).toBe(false);
  });
  it("requires selected weekdays and limits weekly targets to seven distinct days", () => {
    const p = item({ kind: "practice" });
    expect(
      itemSchema.safeParse({
        ...p,
        rule: rule(p.id, { frequency: "selected", days: [] }),
      }).success,
    ).toBe(false);
    expect(
      itemSchema.safeParse({
        ...p,
        rule: rule(p.id, { frequency: "weekly", target: 8 }),
      }).success,
    ).toBe(false);
  });
  it("allows unclassified thoughts to be archived", () => {
    expect(
      itemSchema.safeParse(
        item({ kind: null, inbox: false, status: "archived" }),
      ).success,
    ).toBe(true);
  });
  it("validates calendar dates and timezones", () => {
    expect(itemSchema.safeParse(item({ due_on: "2026-02-31" })).success).toBe(
      false,
    );
    expect(
      profileSchema.safeParse({
        name: "",
        timezone: "Made/Up",
        walkthrough_completed: true,
      }).success,
    ).toBe(false);
  });
});
