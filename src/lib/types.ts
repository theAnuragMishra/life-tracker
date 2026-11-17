export type Kind = "action" | "practice" | "goal" | "interest";
export type Status = "active" | "later" | "completed" | "archived";
export type View = "focus" | "inbox" | "overview" | "review";
export interface Resource {
  id: string;
  label: string;
  url: string;
}
export interface PracticeRule {
  id: string;
  item_id: string;
  effective_from: string;
  frequency: "daily" | "selected" | "weekly" | "flexible";
  days: number[];
  target: number;
  unit: string;
}
export interface PracticeLog {
  id: string;
  item_id: string;
  local_date: string;
  amount: number;
  created_at: string;
}
export interface Item {
  id: string;
  title: string;
  kind: Kind | null;
  status: Status;
  inbox: boolean;
  notes: string;
  area: string;
  parent_id: string | null;
  due_on: string | null;
  scheduled_for: string | null;
  review_on: string | null;
  dismissed_on: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  reviewed_on: string | null;
  resources: Resource[];
}
export interface Profile {
  timezone: string;
  name: string;
  walkthrough_completed: boolean;
}
export interface Snapshot {
  items: Item[];
  rules: PracticeRule[];
  logs: PracticeLog[];
  profile: Profile;
}
export interface ItemInput {
  id: string;
  title: string;
  kind: Kind | null;
  status: Status;
  inbox: boolean;
  notes: string;
  area: string;
  parent_id: string | null;
  due_on: string | null;
  scheduled_for: string | null;
  review_on: string | null;
  pinned: boolean;
  resources: Resource[];
  rule?: Omit<PracticeRule, "id" | "item_id" | "effective_from">;
}
