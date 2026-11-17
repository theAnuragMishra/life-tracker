import { redirect } from "next/navigation";
import { supabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { loadSnapshot } from "./actions";
import { Tracker } from "@/components/tracker";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!supabaseConfig()) return <Tracker initial={null} mode="demo" />;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  try {
    const data = await loadSnapshot();
    return <Tracker initial={data} mode="cloud" />;
  } catch {
    return (
      <main className="setup-error">
        <span className="eyebrow">GATHER · SETUP</span>
        <h1>
          Your account is ready.
          <br />
          Let’s connect your data.
        </h1>
        <p>
          We couldn’t load your tracker. Apply the migration in{" "}
          <code>supabase/migrations/001_initial.sql</code> and check your
          Supabase connection.
        </p>
        <a className="button primary" href="/">
          Try again
        </a>
        <a className="text-link" href="/guide">
          Read the user guide
        </a>
      </main>
    );
  }
}
