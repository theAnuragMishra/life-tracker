import { z } from "zod";
import { validTimezone } from "./dates";
const date = z.iso.date().nullable();
export const itemSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1, "Give this a title.").max(240),
    kind: z.enum(["action", "practice", "goal", "interest"]).nullable(),
    status: z.enum(["active", "later", "completed", "archived"]),
    inbox: z.boolean(),
    notes: z.string().max(10000),
    area: z.string().trim().max(60),
    parent_id: z.uuid().nullable(),
    due_on: date,
    scheduled_for: date,
    review_on: date,
    pinned: z.boolean(),
    resources: z
      .array(
        z.object({
          id: z.uuid(),
          label: z.string().max(120),
          url: z
            .url()
            .refine(
              (url) => /^https?:\/\//i.test(url),
              "Use an http or https link.",
            ),
        }),
      )
      .max(20),
    rule: z
      .object({
        frequency: z.enum(["daily", "selected", "weekly", "flexible"]),
        days: z.array(z.number().int().min(0).max(6)).max(7),
        target: z.number().positive().max(100000),
        unit: z.string().trim().min(1).max(40),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.inbox && !value.kind && value.status !== "archived")
      ctx.addIssue({
        code: "custom",
        message: "Choose a kind or keep this in Inbox.",
        path: ["kind"],
      });
    if (value.kind === "practice" && !value.rule)
      ctx.addIssue({
        code: "custom",
        message: "Add a rhythm for your practice.",
        path: ["rule"],
      });
    if (value.rule?.frequency === "selected" && !value.rule.days.length)
      ctx.addIssue({
        code: "custom",
        message: "Choose at least one day.",
        path: ["rule"],
      });
    if (
      value.rule?.frequency === "weekly" &&
      (!Number.isInteger(value.rule.target) || value.rule.target > 7)
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose 1–7 days per week.",
        path: ["rule"],
      });
    if (value.parent_id === value.id)
      ctx.addIssue({
        code: "custom",
        message: "An item cannot be its own goal.",
        path: ["parent_id"],
      });
  });
export const profileSchema = z.object({
  name: z.string().trim().max(60),
  timezone: z
    .string()
    .refine(
      validTimezone,
      "Choose a valid IANA timezone, such as Asia/Kolkata.",
    ),
  walkthrough_completed: z.boolean(),
});
export const patchSchema = z.object({
  status: z.enum(["active", "later", "completed", "archived"]).optional(),
  inbox: z.boolean().optional(),
  dismissed_on: date.optional(),
  reviewed_on: date.optional(),
  review_on: date.optional(),
  pinned: z.boolean().optional(),
});
