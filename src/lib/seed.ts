import type { Item, Snapshot } from "./types";
import { localDate, shiftDate } from "./dates";
export function emptySnapshot(timezone = "UTC"): Snapshot {
  return {
    items: [],
    rules: [],
    logs: [],
    profile: { name: "", timezone, walkthrough_completed: false },
  };
}
export function demoSnapshot(): Snapshot {
  const data = emptySnapshot(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const today = localDate(data.profile.timezone);
  const now = new Date().toISOString();
  const make = (
    title: string,
    kind: Item["kind"],
    extra: Partial<Item> = {},
  ): Item => ({
    id: crypto.randomUUID(),
    title,
    kind,
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
    created_at: now,
    updated_at: now,
    reviewed_on: null,
    resources: [],
    ...extra,
  });
  const goal = make("Make room for creative work", "goal", {
    area: "Creativity",
    notes: "A small corner of the week for making things, just because.",
    pinned: true,
  });
  const walk = make("Get outside for a walk", "practice", {
    area: "Wellbeing",
  });
  const write = make("Write a little", "practice", {
    area: "Creativity",
    parent_id: goal.id,
  });
  data.items = [
    make("Book a dentist appointment", "action", {
      area: "Wellbeing",
      due_on: today,
      notes: "Call during the afternoon break.",
    }),
    walk,
    write,
    goal,
    make("Explore The Creative Independent", "interest", {
      area: "Creativity",
      notes:
        "Conversations about the process of making things. Start with one interview.",
      resources: [
        {
          id: crypto.randomUUID(),
          label: "The Creative Independent",
          url: "https://thecreativeindependent.com",
        },
      ],
    }),
    make("Plan a slow weekend away", "goal", {
      status: "later",
      area: "Personal",
      review_on: shiftDate(today, 14),
    }),
    make("That recipe I wanted to try", null, {
      inbox: true,
      notes: "Something to come back to when there is time.",
    }),
  ];
  data.rules = [
    {
      id: crypto.randomUUID(),
      item_id: walk.id,
      effective_from: today,
      frequency: "daily",
      days: [],
      target: 30,
      unit: "minutes",
    },
    {
      id: crypto.randomUUID(),
      item_id: write.id,
      effective_from: today,
      frequency: "weekly",
      days: [],
      target: 3,
      unit: "days",
    },
  ];
  return data;
}
