# Gather — life tracker

A responsive Next.js app for actions, recurring practices, goals, and interests. Capture broadly, commit deliberately, and show selectively.

## Run locally

Requires **Node.js 22 LTS or newer** and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase variables, the app runs a **clearly labeled local demo** with example items. Changes persist in this browser's local storage. No account or backend is needed to explore it.

The demo is separate from cloud account data and is not automatically migrated. To use real accounts and sync, follow [deployment setup](docs/DEPLOYMENT.md).

## Features

- Quick capture and Inbox clarification.
- Actions, practices, goals, and interests; Active, Later, Completed, Archived states.
- Custom life areas, goal-linked items, notes, and HTTP/HTTPS resources.
- Separate deadlines, work dates, and revisit dates.
- Focus with explainable suggestions, pins, and hide-for-today.
- Daily, selected-day, weekly, and flexible practices; incremental logs, undo, dated rule history.
- Overview filters, global search, guided Review, JSON export.
- First-run walkthrough, replay in Settings, and a public [user guide](docs/USER_GUIDE.md) mirrored at `/guide`.
- Email-link authentication, cookie sessions, server validation, PostgreSQL row-level security, and transactional save/check-in functions.
- Responsive layouts, keyboard shortcuts, focus-trapped dialogs, and reduced-motion support.

## Stack and source map

Next.js App Router / TypeScript / React, Tailwind CSS, Radix dialog primitives, Lucide icons, Zod, Supabase Auth and PostgreSQL. The UI uses small local components rather than a generated component catalog.

| Location                              | Purpose                                               |
| ------------------------------------- | ----------------------------------------------------- |
| `src/components/tracker.tsx`          | Main views, preferences, walkthrough                  |
| `src/components/item-editor.tsx`      | Capture, details, links, goal steps, practice history |
| `src/lib/planner.ts`                  | Pure Focus, Review, and practice progress rules       |
| `src/lib/dates.ts`                    | Timezone-aware dates, Monday-based weeks              |
| `src/lib/use-tracker.ts`              | Demo/cloud persistence and mutation feedback          |
| `src/app/actions.ts`                  | Authenticated server operations and validation        |
| `src/proxy.ts`                        | Supabase cookie session refresh                       |
| `supabase/migrations/001_initial.sql` | Schema, ownership policies, transactional operations  |
| `tests/`                              | Domain tests and end-to-end scenarios                 |

## Checks

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Browser tests start a dedicated demo-mode server. Never point them at an account containing real data. Database ownership tests and their prerequisites are documented in `supabase/tests/ownership.sql`.

## Scope

Sync occurs on opening/reloading or after a successful mutation. This version does not provide live updates between open tabs, offline cloud writes, notifications, calendar integration, file uploads, data import, nested goals, or collaboration. Resources are links and notes. Practice history displays the latest 14 entries; the full history is included in exports.

Dates are day-level, not hour-level deadlines. Weekly goals measure distinct practice days. Multiple rule edits on one day replace that day's rule; previous days are preserved. A goal cannot change kind until its linked items have been moved. Archived items remain searchable and can be restored through their details.

## Deploy

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Supabase, email templates, Vercel environment variables, and the release checklist. No secrets or service-role keys are required in the app.
