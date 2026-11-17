import { redirect } from "next/navigation";
import { Sprout, ArrowUpRight } from "lucide-react";
import { supabaseConfig } from "@/lib/supabase/config";
import { LoginForm } from "@/components/login-form";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!supabaseConfig()) redirect("/");
  const params = await searchParams;
  return (
    <main className="login-page">
      <section className="login-story">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Sprout size={23} />
          </span>
          gather<span className="brand-dot">.</span>
        </a>
        <div>
          <span className="eyebrow">A LITTLE ROOM FOR EVERYTHING</span>
          <h1>
            Less juggling.
            <br />
            More living.
          </h1>
          <p>
            The things you need to do. The habits you’re growing. The
            possibilities you don’t want to forget.
          </p>
          <div className="login-caption">
            <span className="mini-leaf">✳</span> All in one thoughtful place.
          </div>
        </div>
        <span className="small muted">Your life is more than a list.</span>
      </section>
      <section className="login-panel">
        <div>
          <span className="eyebrow">WELCOME TO GATHER</span>
          <h2>Make yourself at home.</h2>
          <p className="muted">Sign in or create your personal space.</p>
          {params.error && (
            <p className="error-text" role="alert">
              That link has expired or was already used. Request a fresh one
              below.
            </p>
          )}
          <LoginForm />
          <a className="text-link guide-link" href="/guide">
            Take a look around first <ArrowUpRight size={15} />
          </a>
        </div>
      </section>
    </main>
  );
}
