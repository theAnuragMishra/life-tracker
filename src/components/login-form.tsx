"use client";
import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { sendMagicLink } from "@/app/actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, {
    message: "",
    success: false,
  });
  return (
    <form action={action} className="login-form">
      <label htmlFor="email">Email address</label>
      <div className="input-with-icon">
        <Mail size={18} />
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <button className="button primary" disabled={pending}>
        {pending ? "Sending your link…" : "Send me a sign-in link"}
        <ArrowRight size={17} />
      </button>
      {state.message && (
        <p
          role="status"
          className={state.success ? "success-text" : "error-text"}
        >
          {state.message}
        </p>
      )}
      <p className="muted small">
        No password to remember. We’ll email you a secure link.
      </p>
    </form>
  );
}
