import { ArrowRight, ArrowUpRight, Sprout } from "lucide-react";
export const metadata = { title: "The Gather guide — Find your own rhythm" };
const sections = [
  ["start", "Start here"],
  ["kinds", "Four kinds"],
  ["focus", "Your day"],
  ["dates", "Dates & rhythms"],
  ["review", "The bigger picture"],
  ["data", "Your data"],
  ["demo", "Demo mode"],
];
export default function Guide() {
  return (
    <main className="guide-page">
      <nav className="guide-nav" aria-label="Guide navigation">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Sprout size={24} />
          </span>
          gather<span className="brand-dot">.</span>
        </a>
        <a className="button primary" href="/">
          Go to your space <ArrowUpRight size={15} />
        </a>
      </nav>
      <header className="guide-header">
        <span className="eyebrow">THE GATHER GUIDE</span>
        <h1>
          A little room.
          <br />A rhythm of your own.
        </h1>
        <p>
          You don’t need a perfect system to get started. Capture what’s on your
          mind, choose a few things to care for, and come back when you need a
          little perspective.
        </p>
      </header>
      <nav className="guide-toc" aria-label="Guide sections">
        {sections.map(([id, title]) => (
          <a href={`#${id}`} key={id}>
            {title}
          </a>
        ))}
      </nav>
      <section id="start" className="guide-section">
        <h2>01. Start with what’s on your mind.</h2>
        <ol>
          <li>
            Open <strong>Add something</strong>, or press <kbd>N</kbd> when you
            aren’t typing in a field.
          </li>
          <li>
            Write a title. You can save immediately to Inbox, or choose a kind
            and add more detail.
          </li>
          <li>
            Open <strong>Inbox</strong> when you have time. Choose what each
            thought represents, and decide whether it’s Active or Later.
            Choosing a kind clears “Keep in Inbox”; leave that box checked if
            you’re still thinking.
          </li>
          <li>
            Give it a life area, add notes, or attach links if those will help
            your future self. All are optional.
          </li>
        </ol>
        <div className="guide-callout">
          Try it: capture “Book a check-up,” “Walk more often,” and “That book I
          want to read.” These can live together without being treated the same
          way.
        </div>
      </section>
      <section id="kinds" className="guide-section">
        <h2>02. Different things need different care.</h2>
        <div className="guide-kind-grid">
          <article>
            <h3>Actions · Something to finish</h3>
            <p>
              Book an appointment, submit an application, or send a document.
              Check the circle to finish it. Find completed actions in Overview
              and click the circle again to reopen one.
            </p>
          </article>
          <article>
            <h3>Practices · Something to repeat</h3>
            <p>
              Read, exercise, study, or create. Choose a rhythm and record
              progress. The practice stays around; each check-in becomes part of
              its history.
            </p>
          </article>
          <article>
            <h3>Goals · An outcome to reach</h3>
            <p>
              Plan a move, launch a project, or learn a skill. Link actions,
              interests, and practices through “Supports a goal.” Open the goal
              to see its supporting steps. Complete it through its commitment
              setting when you’ve reached the outcome.
            </p>
          </article>
          <article>
            <h3>Interests · Something to explore</h3>
            <p>
              A book, a place, or a creative possibility. Save the link and a
              little context. You can finish it, keep it for Later, or change
              its kind if it grows into a goal.
            </p>
          </article>
        </div>
        <p style={{ marginTop: 20 }}>
          <strong>Active</strong> means you’re making room for it now.{" "}
          <strong>Later</strong> means you want to keep the possibility without
          promising attention today. <strong>Completed</strong> records a
          finish; <strong>Archived</strong> sets something aside. All remain
          searchable.
        </p>
        <p>
          Changing a goal’s kind requires moving its linked items first. This
          keeps the relationship between a goal and its steps meaningful.
        </p>
      </section>
      <section id="focus" className="guide-section">
        <h2>03. Give today a manageable shape.</h2>
        <p>
          <strong>Needs attention</strong> contains active items with a deadline
          or a planned work date that has arrived. Overdue items stay visible
          until you finish, reschedule, or move them to Later.
        </p>
        <p>
          <strong>Your practices</strong> contains the practices relevant to
          today. “Finish today” records the amount remaining to reach your daily
          target. Open a practice to log a smaller amount, see recent check-ins,
          or undo a mistaken entry.
        </p>
        <p>
          <strong>Worth picking up</strong> offers up to four active
          possibilities. Pins come first, then items ready to revisit, then the
          oldest active items. A future work date keeps an item out of these
          suggestions until that date. Each suggestion explains why it appears.
          Use its three-dot button to hide it for today; it remains in Overview
          and returns on another day.
        </p>
        <div className="guide-callout">
          Focus is a selective view. You are not expected to finish everything
          it shows, and the rest of your collection is still there in Overview.
        </div>
      </section>
      <section id="dates" className="guide-section">
        <h2>04. Give dates the right meaning.</h2>
        <ul>
          <li>
            <strong>Deadline:</strong> something must be finished by this date.
          </li>
          <li>
            <strong>Work on:</strong> the date you intend to give something
            attention.
          </li>
          <li>
            <strong>Revisit on:</strong> bring something back into Review to
            reconsider it. This is useful for Later items and saved interests;
            it doesn’t make them overdue tasks.
          </li>
        </ul>
        <p>
          Practices can happen every day, on selected weekdays, a number of days
          per week, or flexibly. Weekly targets count distinct days from Monday
          through Sunday. You can check in once each day toward a weekly target.
          Daily targets can use amounts such as 20 minutes or 10 pages; several
          smaller entries can add up to the target.
        </p>
        <p>
          Flexible practices appear in Focus whenever active, without an overdue
          penalty or a fixed weekly promise. Daily targets reset for a new local
          day; weekly totals reset on Monday. A missed day never generates an
          overdue copy.
        </p>
        <p>
          Set your timezone during the walkthrough or in{" "}
          <strong>Settings & data</strong>. Existing check-ins retain their
          original local dates when you change timezones. Rhythm changes apply
          starting today; earlier rules and logs are preserved. Multiple edits
          to a rhythm on the same day replace that day’s rule.
        </p>
      </section>
      <section id="review" className="guide-section">
        <h2>05. Look up from time to time.</h2>
        <p>
          <strong>Overview</strong> groups your collection by life area. Use
          filters to see Active, Later, Completed, Archived, or all commitments.
          Inbox thoughts stay in Inbox until clarified. Clicking a life area in
          the sidebar opens its full collection.
        </p>
        <p>
          <strong>Review</strong> collects Inbox thoughts, arrived revisit
          dates, overdue commitments, active goals without an active supporting
          step, and active items unchanged for two weeks. You can keep an item
          active, move it to Later with a revisit in one week, edit it, or
          archive it.
        </p>
        <p>
          Keeping an item active acknowledges it for today. An unresolved
          overdue deadline or goal without a step can appear again the following
          day. Review is optional and resumable: each decision saves
          independently.
        </p>
        <p>
          Use Search (or press <kbd>/</kbd>) to find titles, notes, life areas,
          and saved links across every commitment state, including archived
          items. Clear the search to return to the screen you were viewing.
        </p>
      </section>
      <section id="data" className="guide-section">
        <h2>06. Your space, your data.</h2>
        <p>
          In a configured deployment, sign in with the link sent to your email.
          Your account starts empty. Your collection is saved to Supabase and
          restricted to your account. Reload or reopen the app to pick up
          changes made on another device; live multi-device updates are not part
          of this version.
        </p>
        <p>
          In Settings & data, update your name or timezone, replay the
          walkthrough, sign out, or export a JSON copy of your collection and
          practice history. The export contains your notes and links, so keep it
          private. Importing an export is not currently supported.
        </p>
        <p>
          A save notification confirms an operation. If saving fails, the app
          reports the error; optimistic changes are rolled back when a cloud
          operation fails. Cloud mode needs a working connection and doesn’t
          queue offline changes.
        </p>
      </section>
      <section id="demo" className="guide-section">
        <h2>07. Try things out in the local demo.</h2>
        <p>
          When no Supabase configuration is provided, Gather opens a labeled
          demo with sample items. Captures, edits, practice check-ins, and
          preferences are stored in this browser using local storage.
        </p>
        <p>
          The demo has no account or cross-device sync. Anyone using the same
          browser profile can see its collection. Clearing site storage removes
          demo data. Export anything you want to keep first.
        </p>
        <p>
          Connecting Supabase starts a separate, empty account collection. Demo
          items are not automatically uploaded. Deployment setup is documented
          in the repository’s README and deployment guide.
        </p>
      </section>
      <footer className="guide-footer">
        <span>Your life is more than a list.</span>
        <a className="text-link" href="/">
          Find your next little step <ArrowRight size={14} />
        </a>
      </footer>
    </main>
  );
}
