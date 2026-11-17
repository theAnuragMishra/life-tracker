"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="setup-error">
      <span className="eyebrow">GATHER</span>
      <h1>A small interruption.</h1>
      <p>
        We couldn’t load this page. Check your connection and try again. Your
        saved items are still there.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
