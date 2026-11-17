# Deploy Gather

The source is ready for a standard Next.js deployment on Vercel with Supabase. You need your own accounts for those services. Nothing has been published automatically.

## 1. Install and verify

Use Node.js 22 LTS or newer:

```sh
npm install
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Commit the `package-lock.json` produced by the successful installation. Use `npm ci` in subsequent reproducible builds. Do not commit `.env.local`.

Development-environment verification is recorded in [VALIDATION.md](VALIDATION.md). Complete the checks above on a machine with registry access before release.

## 2. Create Supabase and apply the database migration

1. Create a Supabase project. Choose a database region close to your users and application hosting region.
2. Open SQL Editor and run the entire contents of `supabase/migrations/001_initial.sql` **once** against a fresh project.
3. Confirm the following tables appear: `profiles`, `items`, `resources`, `practice_rules`, `practice_logs`, `item_events`.
4. Confirm row-level security is enabled on each table. The migration creates the ownership policies and grants.
5. In project settings, copy the **Project URL** and **publishable key**. Use the publishable key, never a secret/service-role key.

If you use the Supabase CLI, link your project and apply this file through your normal migration workflow instead of also running it manually. Do not apply it through both methods.

The migration backfills profiles for existing auth users. New profiles are created automatically by a trigger. The application needs no service-role key.

## 3. Configure local authentication

```sh
cp .env.example .env.local
```

Fill in:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

In Supabase Authentication:

- Enable the Email provider and allow new user signup if you want other users to register.
- Set the Site URL to `http://localhost:3000` during local testing.
- Add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
- Edit **both Confirm signup and Magic link** email templates to use this link:

```html
<h2>Your Gather space is waiting</h2>
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email"
    >Open Gather</a
  >
</p>
```

The app sets `RedirectTo` to the complete `/auth/confirm` endpoint. Do not append a second `/auth/confirm` to this template. The confirmation route validates the token and creates the cookie session. It also accepts PKCE `code` callbacks.

See Supabase's [passwordless email guide](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates).

Restart `npm run dev` after changing environment variables. Sign in with your email. A cloud account starts empty; local demo records remain separate.

For public use, configure your own SMTP provider in Supabase and verify your sending domain. Supabase's default email service has restrictions intended for development; consult the [SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp). Email delivery is handled by Supabase, so Gather needs no SMTP credentials.

## 4. Create the Vercel deployment

1. Put the source in your own GitHub/GitLab/Bitbucket repository.
2. Import the repository into Vercel. Select the **Next.js** preset and repository root as the project directory.
3. Choose a supported Node.js version at least 22. Leave the framework build/output defaults in place.
4. Set these environment variables for Production:

| Variable                               | Value                                                  |
| -------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Project URL                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key                               |
| `NEXT_PUBLIC_SITE_URL`                 | Final public origin, e.g. `https://gather.example.com` |

5. Deploy. If you need the assigned Vercel URL first, create the project, copy its production domain, set `NEXT_PUBLIC_SITE_URL`, and redeploy with that value before testing auth.

Vercel environment changes apply to new deployments; trigger a redeployment after changing them. [Vercel environment variable documentation](https://vercel.com/docs/environment-variables)

All `NEXT_PUBLIC_` values are public by design. Database security comes from authentication and RLS, not from hiding the publishable key. Never add a service-role key to a public variable.

## 5. Connect production sign-in

In Supabase Authentication → URL Configuration:

1. Set Site URL to your production origin, e.g. `https://gather.example.com`.
2. Add the exact redirect URL `https://gather.example.com/auth/confirm`.
3. Keep the localhost redirect only if you still need it for development.
4. Confirm both email templates use the token-hash link from step 3.

The configured `NEXT_PUBLIC_SITE_URL`, Supabase redirect allowlist, and actual browser origin must agree. For preview deployments, explicitly configure their origin and redirect URL; use a separate Supabase project when testing schema changes.

## 6. Verify before sharing

- Sign up with a fresh email, follow the link, and finish the walkthrough.
- Capture an Inbox thought, classify it, add a link, and complete it.
- Create a practice, log partial progress, undo it, and check its history.
- Create a goal and link an action through “Supports a goal.”
- Move an interest to Later with today's revisit date; confirm it appears in Review.
- Reload, sign out, and sign back in; confirm data persists.
- Sign in on a second device; reload to see the same collection.
- Use a separate account and confirm it starts empty and cannot access the first account's data.
- Run `supabase/tests/ownership.sql` in a development project's SQL Editor to verify database ownership behavior. The script rolls back its fixtures.
- Test a narrow mobile screen, keyboard navigation, `/guide`, and JSON export.

No scheduled jobs are needed. Focus and Review are calculated when the app loads; the open app updates its local-day boundary every 30 seconds. This version has no email reminders or browser notifications.

## Troubleshooting

**The deployed site says Local demo:** both Supabase environment variables are missing or empty. Set them and redeploy. Demo data does not sync or migrate automatically.

**A configuration error appears:** only one Supabase variable is set. Set both together, or clear both for a demo deployment.

**The account is ready but data won't load:** check the migration, table permissions, RLS, Supabase project availability, and that both environment values belong to the same project.

**The sign-in link points to localhost:** update `NEXT_PUBLIC_SITE_URL`, redeploy, and check Supabase's templates and URL configuration. Request a new link.

**The email never arrives:** check SMTP configuration, provider restrictions, auth rate limits, and spam folders in Supabase's auth logs. New public users may need custom SMTP before emails can be delivered.

**The link expired:** request a new one. Email links are single-use and have a limited lifetime.

**A change from another tab isn't visible:** reload. This version refreshes after its own mutations and on page load, without a realtime subscription.
