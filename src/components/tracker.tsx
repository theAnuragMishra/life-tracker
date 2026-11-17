"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Compass,
  Flower2,
  Inbox,
  LayoutGrid,
  ListFilter,
  LogOut,
  Menu,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  X,
} from "lucide-react";
import { signOut } from "@/app/actions";
import { useTracker } from "@/lib/use-tracker";
import {
  focusItems,
  practiceProgress,
  reviewReason,
  suggestionReason,
} from "@/lib/planner";
import { prettyDate, shiftDate } from "@/lib/dates";
import type { Item, Kind, Snapshot, View } from "@/lib/types";
import { Modal } from "./ui/dialog";
import { ItemEditor, kindInfo } from "./item-editor";

const viewInfo = {
  focus: {
    label: "Focus",
    Icon: Sun,
    eyebrow: "A LITTLE AT A TIME",
    title: "Room for what matters.",
    subtitle: "A few things for today. The rest is safe here.",
  },
  inbox: {
    label: "Inbox",
    Icon: Inbox,
    eyebrow: "OUT OF YOUR HEAD, INTO HERE",
    title: "Thoughts, gathered.",
    subtitle: "Capture first. Make sense of it when you have a moment.",
  },
  overview: {
    label: "Overview",
    Icon: LayoutGrid,
    eyebrow: "THE BIGGER PICTURE",
    title: "A life in progress.",
    subtitle: "Your commitments and possibilities, all in one place.",
  },
  review: {
    label: "Review",
    Icon: Compass,
    eyebrow: "PAUSE. RECONSIDER. CONTINUE.",
    title: "A little perspective.",
    subtitle: "Make sure the things you’re holding still belong with you.",
  },
};
function download(data: Snapshot) {
  const blob = new Blob(
    [
      JSON.stringify(
        { version: 1, exported_at: new Date().toISOString(), ...data },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gather-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Tracker({
  initial,
  mode,
}: {
  initial: Snapshot | null;
  mode: "demo" | "cloud";
}) {
  const store = useTracker(initial, mode);
  const { data, ready, busy, today, notice, setNotice } = store;
  const [view, setView] = useState<View>("focus");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [kind, setKind] = useState("all");
  const [area, setArea] = useState("all");
  const [editor, setEditor] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [tour, setTour] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const tourChecked = useRef(false);
  useEffect(() => {
    if (ready && !tourChecked.current) {
      tourChecked.current = true;
      if (!data.profile.walkthrough_completed) setTour(true);
    }
  }, [ready, data.profile.walkthrough_completed]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest(
          "input,textarea,select,[contenteditable=true],[role=dialog]",
        ) ||
          editor ||
          settings ||
          tour)
      )
        return;
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        setEditor("new");
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [editor, settings, tour]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 10000);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  const focus = focusItems(data, today);
  const inbox = data.items.filter(
    (i) => i.inbox && i.status !== "archived" && i.status !== "completed",
  );
  const review = data.items.filter((i) =>
    reviewReason(i, data.items, today, data.logs),
  );
  const areas = [
    ...new Set(data.items.map((i) => i.area).filter(Boolean)),
  ].sort();
  const active = data.items.filter((i) => i.status === "active" && !i.inbox);
  const selectedItem = data.items.find((i) => i.id === editor);
  const info = viewInfo[view];
  const query = search.trim().toLocaleLowerCase();
  const results = query
    ? data.items.filter((i) =>
        [
          i.title,
          i.notes,
          i.area,
          ...i.resources.flatMap((r) => [r.label, r.url]),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query),
      )
    : [];
  function navigate(next: View) {
    setView(next);
    setSearch("");
    setArea("all");
    setMobileNav(false);
  }
  const complete = (item: Item) =>
    store.patch(
      item.id,
      { status: item.status === "completed" ? "active" : "completed" },
      item.status === "completed"
        ? "Back in your active collection"
        : "One less thing to hold. Nicely done.",
    );
  function card(item: Item, reason?: string, dismiss = false) {
    const metadata = item.kind ? kindInfo[item.kind] : null;
    const Icon = metadata?.Icon ?? Inbox;
    return (
      <article
        className={`item-row ${item.status === "completed" ? "is-complete" : ""}`}
        key={item.id}
      >
        {item.kind === "action" || item.kind === "interest" ? (
          <button
            className="complete-button"
            aria-label={
              item.status === "completed"
                ? `Reopen ${item.title}`
                : `Complete ${item.title}`
            }
            disabled={busy || item.status === "archived"}
            onClick={() => complete(item)}
          >
            {item.status === "completed" && <Check size={15} />}
          </button>
        ) : (
          <span className={`item-kind-icon ${item.kind ?? "inbox"}`}>
            <Icon size={18} />
          </span>
        )}
        <button className="item-body" onClick={() => setEditor(item.id)}>
          <span className="item-title">
            {item.title}
            {item.pinned && <Pin size={11} className="muted" />}
          </span>
          <span className="item-meta">
            {item.area && <span>{item.area}</span>}
            {reason && (
              <span
                className={item.due_on && item.due_on < today ? "overdue" : ""}
              >
                {reason}
              </span>
            )}
            {!reason && (
              <span>
                {metadata?.label ?? "Unsorted thought"}
                {item.status !== "active" ? ` · ${item.status}` : ""}
              </span>
            )}
            {item.resources.length > 0 && (
              <span className="resource-count">
                <BookOpen size={11} />
                {item.resources.length} link
                {item.resources.length > 1 ? "s" : ""}
              </span>
            )}
          </span>
        </button>
        {dismiss ? (
          <button
            className="icon-button row-more"
            title="Hide for today"
            aria-label={`Hide ${item.title} for today`}
            disabled={busy}
            onClick={() =>
              store.patch(
                item.id,
                { dismissed_on: today },
                "Set aside for today. Still in Overview.",
              )
            }
          >
            <MoreHorizontal size={19} />
          </button>
        ) : (
          <button
            className="icon-button row-more"
            aria-label={`Open ${item.title}`}
            onClick={() => setEditor(item.id)}
          >
            <ArrowUpRight size={16} />
          </button>
        )}
      </article>
    );
  }
  function practiceCard(item: Item) {
    const p = practiceProgress(item, data.rules, data.logs, today);
    const weekly = p.rule?.frequency === "weekly";
    const checked = p.done || (weekly && p.checkedToday);
    return (
      <article
        className={`practice-card ${checked ? "checked" : ""}`}
        key={item.id}
      >
        <div className="practice-top">
          <span className="practice-symbol">
            {checked ? <Check size={18} /> : <Flower2 size={20} />}
          </span>
          <button className="item-title" onClick={() => setEditor(item.id)}>
            {item.title}
          </button>
          <button
            className="icon-button"
            aria-label={`Open ${item.title}`}
            onClick={() => setEditor(item.id)}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
        <div className="practice-bottom">
          <span className="small muted">
            {p.amount} / {p.target} {p.rule?.unit}
            {weekly ? " this week" : " today"}
          </span>
          <button
            className={`check-in ${checked ? "done" : ""}`}
            disabled={busy || checked}
            title={
              weekly
                ? "Record one day of practice"
                : "Record the remaining amount to reach today’s target; open the item for partial progress"
            }
            onClick={() =>
              store.log(item.id, weekly ? 1 : Math.max(0, p.target - p.amount))
            }
          >
            {checked
              ? p.done
                ? "Complete"
                : "Today ✓"
              : weekly
                ? "Check in"
                : "Finish today"}
            {!checked && <Plus size={12} />}
          </button>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`${item.title} progress`}
          aria-valuenow={Math.min(p.amount, p.target)}
          aria-valuemin={0}
          aria-valuemax={p.target}
        >
          <span
            style={{ width: `${Math.min(100, (p.amount / p.target) * 100)}%` }}
          />
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          className="nav-backdrop"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a href="/" className="brand">
          <span className="brand-icon">
            <Sprout size={24} />
          </span>
          gather<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">
            {data.profile.name?.slice(0, 1).toUpperCase() || "Y"}
          </span>
          <span>Your personal space</span>
          <ChevronDown size={13} />
        </div>
        <div className="sidebar-section-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          {(Object.entries(viewInfo) as [View, typeof info][]).map(
            ([key, { label, Icon }]) => (
              <button
                className={`nav-item ${view === key && !query ? "active" : ""}`}
                key={key}
                onClick={() => navigate(key)}
                aria-current={view === key && !query ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {key === "inbox" && inbox.length > 0 && (
                  <span className="nav-count">{inbox.length}</span>
                )}
                {key === "review" && review.length > 0 && (
                  <span className="review-dot" />
                )}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-section-label areas-label">
          LIFE AREAS{" "}
          <button
            className="icon-button"
            aria-label="Add an item with a life area"
            onClick={() => setEditor("new")}
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="area-nav">
          {areas.length ? (
            areas.map((value, index) => (
              <button
                key={value}
                className={
                  view === "overview" && area === value ? "selected" : ""
                }
                onClick={() => {
                  navigate("overview");
                  setArea(value);
                  setStatus("all");
                }}
              >
                <span className={`area-dot dot-${index % 4}`} />
                {value}
              </button>
            ))
          ) : (
            <p className="small muted">Add life areas as you go.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-flower">✳</span>
            <p>
              You don’t have to do it all.
              <br />
              <strong>Just the next little thing.</strong>
            </p>
          </div>
          <button className="nav-item" onClick={() => setTour(true)}>
            <BookOpen size={17} />
            <span>A little walkthrough</span>
            <ArrowUpRight size={14} />
          </button>
          <button className="nav-item" onClick={() => setSettings(true)}>
            <Settings size={17} />
            <span>Settings & data</span>
          </button>
          <div className="mode-label">
            <span className={mode === "demo" ? "demo-dot" : "cloud-dot"} />
            {mode === "demo"
              ? "Local demo · this browser only"
              : "Your private, synced space"}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>Your space</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{query ? "Search" : info.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="search-field">
              <Search size={16} />
              <input
                ref={searchRef}
                placeholder="Find anything…"
                aria-label="Search everything"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>/</kbd>
              {search && (
                <button
                  className="icon-button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              className="button primary add-button"
              onClick={() => setEditor("new")}
              disabled={!ready}
            >
              <Plus size={16} />
              <span>Add something</span>
              <kbd>N</kbd>
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {query ? "NOTHING LOST, EVERYTHING FINDABLE" : info.eyebrow}
              </span>
              <h1>{query ? "Found in your space." : info.title}</h1>
              <p>
                {query
                  ? `${results.length} result${results.length === 1 ? "" : "s"} for “${search}”`
                  : info.subtitle}
              </p>
            </div>
            <span
              className="date-chip"
              style={!ready ? { visibility: "hidden" } : undefined}
            >
              <Sun size={15} />
              {new Intl.DateTimeFormat("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${today}T12:00:00Z`))}
            </span>
          </div>
          {mode === "demo" && (
            <div className="demo-banner">
              <span>
                <span className="demo-dot" />
                You’re exploring a local demo. Changes stay in this browser.
              </span>
              <a href="/guide#demo">
                About demo mode <ArrowUpRight size={12} />
              </a>
            </div>
          )}
          {!ready ? (
            <div className="empty-state" aria-busy="true">
              <Sprout size={30} />
              <h3>Gathering your things…</h3>
            </div>
          ) : query ? (
            <section className="panel search-results">
              {results.length ? (
                results.map((item) => card(item))
              ) : (
                <Empty
                  title="Nothing here by that name."
                  text="Try another word, a life area, or part of a saved link."
                />
              )}
            </section>
          ) : view === "focus" ? (
            <>
              <section className="focus-banner">
                <div>
                  <span className="banner-label">
                    <span className="little-star">✳</span> YOUR DAY, WITH A
                    LITTLE BREATHING ROOM
                  </span>
                  <h2>
                    Small steps.
                    <br />
                    <em>Meaningful progress.</em>
                  </h2>
                  <p>
                    Give a little attention to what matters.
                    <br />
                    Everything else can wait its turn.
                  </p>
                  <div className="banner-stats">
                    <span>
                      <strong>{focus.needs.length}</strong> need attention
                    </span>
                    <span>
                      <strong>{focus.practices.length}</strong> practices
                    </span>
                    <span>
                      <strong>
                        {active.filter((i) => i.kind === "goal").length}
                      </strong>{" "}
                      growing goals
                    </span>
                  </div>
                </div>
                <Garden />
              </section>
              <div className="focus-columns">
                <div className="focus-left">
                  <section>
                    <SectionHeading
                      icon={<Circle size={17} />}
                      title="Needs attention"
                      count={focus.needs.length}
                      caption="The things with a little urgency."
                    />
                    <div className="panel">
                      {focus.needs.length ? (
                        focus.needs.map((item) =>
                          card(
                            item,
                            item.due_on && item.due_on <= today
                              ? item.due_on < today
                                ? `Overdue · ${prettyDate(item.due_on)}`
                                : "Due today"
                              : "Planned for today",
                          ),
                        )
                      ) : (
                        <Empty
                          title="A little breathing room."
                          text="Nothing due or scheduled. Pick something that feels worthwhile."
                          compact
                        />
                      )}
                    </div>
                  </section>
                  <section className="worth-section">
                    <SectionHeading
                      icon={<Sparkles size={17} />}
                      title="Worth picking up"
                      count={focus.suggestions.length}
                      caption="A few possibilities. No pressure to do them all."
                    />
                    <div className="panel">
                      {focus.suggestions.length ? (
                        focus.suggestions.map((item) =>
                          card(item, suggestionReason(item, today), true),
                        )
                      ) : (
                        <Empty
                          title="Room for a new possibility."
                          text="Add a goal, an interest, or a next step when you’re ready."
                          compact
                        />
                      )}
                    </div>
                    <button
                      className="text-link view-all"
                      onClick={() => navigate("overview")}
                    >
                      See the bigger picture <ArrowRight size={14} />
                    </button>
                  </section>
                </div>
                <section className="practices-section">
                  <SectionHeading
                    icon={<Flower2 size={18} />}
                    title="Your practices"
                    count={focus.practices.length}
                    caption="Consistency, with kindness."
                  />
                  <div className="practices-list">
                    {focus.practices.length ? (
                      focus.practices.map(practiceCard)
                    ) : (
                      <div className="panel">
                        <Empty
                          title="Grow something slowly."
                          text="Add a practice for something you want to return to."
                          compact
                        />
                      </div>
                    )}
                  </div>
                  <div className="gentle-note">
                    <Sprout size={18} />
                    <p>
                      A missed day is just a day.
                      <br />
                      You can always begin again.
                    </p>
                  </div>
                </section>
              </div>
            </>
          ) : view === "inbox" ? (
            <>
              <div className="list-intro">
                <span>
                  {inbox.length} thought{inbox.length === 1 ? "" : "s"} to make
                  sense of
                </span>
                <button className="text-link" onClick={() => setEditor("new")}>
                  <Plus size={15} /> Capture a thought
                </button>
              </div>
              <section className="panel">
                {inbox.length ? (
                  inbox.map((item) =>
                    card(item, "Open to choose a kind and a commitment"),
                  )
                ) : (
                  <Empty
                    title="A clear little corner."
                    text="Your thoughts have a home. Add something whenever it crosses your mind."
                  />
                )}
              </section>
              <p className="page-footnote">
                Tip: press <kbd>N</kbd> anywhere to capture a thought without
                leaving your place.
              </p>
            </>
          ) : view === "overview" ? (
            <>
              <div className="filter-bar">
                <ListFilter size={16} />
                <label className="sr-only" htmlFor="status-filter">
                  Commitment filter
                </label>
                <select
                  id="status-filter"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active commitments</option>
                  <option value="later">Later possibilities</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                  <option value="all">All commitments</option>
                </select>
                <label className="sr-only" htmlFor="kind-filter">
                  Kind filter
                </label>
                <select
                  id="kind-filter"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="all">Every kind</option>
                  {Object.entries(kindInfo).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="area-filter">
                  Life area filter
                </label>
                <select
                  id="area-filter"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  <option value="all">All life areas</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                  <option value="none">Without an area</option>
                </select>
              </div>
              {(() => {
                const filtered = data.items.filter(
                  (i) =>
                    !i.inbox &&
                    (status === "all" || i.status === status) &&
                    (kind === "all" || i.kind === kind) &&
                    (area === "all" ||
                      (area === "none" ? !i.area : i.area === area)),
                );
                const groups = [
                  ...new Set(filtered.map((i) => i.area || "Without an area")),
                ].sort();
                return groups.length ? (
                  groups.map((group) => (
                    <section className="overview-group" key={group}>
                      <SectionHeading
                        title={group}
                        count={
                          filtered.filter(
                            (i) => (i.area || "Without an area") === group,
                          ).length
                        }
                      />
                      <div className="panel">
                        {filtered
                          .filter(
                            (i) => (i.area || "Without an area") === group,
                          )
                          .map((item) => card(item))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="panel">
                    <Empty
                      title="Room to make your own."
                      text="No items match these filters. Try another view or add something new."
                    />
                  </div>
                );
              })()}
              <p className="page-footnote">
                Unsorted thoughts live in Inbox. Every other commitment is here,
                including Later, completed, and archived items.
              </p>
            </>
          ) : (
            <>
              <div className="review-intro">
                <Compass size={24} />
                <div>
                  <strong>A few small decisions, a lighter mind.</strong>
                  <p>
                    Keep what matters. Adjust what changed. Let something go.
                  </p>
                </div>
                <span>{review.length} to consider</span>
              </div>
              {review.length ? (
                <div className="review-list">
                  {review.map((item) => (
                    <article className="review-card" key={item.id}>
                      <div>
                        <span className="eyebrow">
                          {reviewReason(item, data.items, today, data.logs)}
                        </span>
                        <button
                          className="review-title"
                          onClick={() => setEditor(item.id)}
                        >
                          {item.title}
                        </button>
                        <p className="small muted">
                          {item.area || "Your space"} ·{" "}
                          {item.inbox
                            ? "Inbox"
                            : item.status === "later"
                              ? "Later possibility"
                              : item.kind
                                ? kindInfo[item.kind].label
                                : "Unsorted"}
                        </p>
                      </div>
                      <div className="review-actions">
                        {item.inbox ? (
                          <button
                            className="button secondary small"
                            onClick={() => setEditor(item.id)}
                          >
                            Make sense of this <ArrowRight size={14} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="button secondary small"
                              disabled={busy}
                              onClick={() =>
                                store.patch(
                                  item.id,
                                  {
                                    status: "active",
                                    review_on: null,
                                    reviewed_on: today,
                                    dismissed_on: null,
                                  },
                                  "Keeping this in your active collection",
                                )
                              }
                            >
                              {item.status === "later"
                                ? "Make active"
                                : "Keep active"}
                            </button>
                            <button
                              className="button quiet small"
                              disabled={busy}
                              onClick={() =>
                                store.patch(
                                  item.id,
                                  {
                                    status: "later",
                                    review_on: shiftDate(today, 7),
                                    reviewed_on: today,
                                  },
                                  "Set aside. We’ll revisit it in a week.",
                                )
                              }
                            >
                              Later, next week
                            </button>
                          </>
                        )}
                        <button
                          className="icon-button"
                          title="Archive this item"
                          aria-label={`Archive ${item.title}`}
                          disabled={busy}
                          onClick={() =>
                            store.patch(
                              item.id,
                              { status: "archived", inbox: false },
                              "Archived. You can find it in Overview.",
                            )
                          }
                        >
                          <ArrowDownToLine size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section className="panel">
                  <Empty
                    title="A little clearer, a little lighter."
                    text="Nothing needs reconsidering right now. New review dates and stale commitments will appear here when it’s time."
                  />
                </section>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              <Sprout size={14} /> A little room for everything.
            </span>
            <a href="/guide">
              The Gather guide <ArrowUpRight size={12} />
            </a>
          </footer>
        </main>
      </div>
      {editor && (
        <ItemEditor
          key={editor}
          item={selectedItem}
          data={data}
          today={today}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={store.save}
          onLog={store.log}
          onRemoveLog={store.removeLog}
          onOpen={(item) => setEditor(item.id)}
        />
      )}
      {settings && (
        <Preferences
          data={data}
          mode={mode}
          busy={busy}
          onClose={() => setSettings(false)}
          onSave={store.profile}
          onTour={() => {
            setSettings(false);
            setTour(true);
          }}
        />
      )}
      {tour && (
        <Walkthrough
          data={data}
          busy={busy}
          onClose={() => setTour(false)}
          onFinish={async (profile) => {
            if (await store.profile(profile)) setTour(false);
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function SectionHeading({
  icon,
  title,
  count,
  caption,
}: {
  icon?: React.ReactNode;
  title: string;
  count?: number;
  caption?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>
          {icon}
          {title}
          {count !== undefined && (
            <span className="section-count">{count}</span>
          )}
        </h2>
        {caption && <p>{caption}</p>}
      </div>
    </div>
  );
}
function Empty({
  title,
  text,
  compact = false,
}: {
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <Sprout size={compact ? 20 : 30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Garden() {
  return (
    <div className="garden" aria-hidden="true">
      <svg viewBox="0 0 310 250" fill="none">
        <ellipse
          cx="158"
          cy="222"
          rx="111"
          ry="10"
          fill="#d8ddcb"
          opacity=".6"
        />
        <circle cx="218" cy="53" r="29" fill="#e8c494" opacity=".75" />
        <path
          d="M151 207V94M151 149c-40 1-57-25-57-51 38-1 57 20 57 51Z"
          fill="#729078"
        />
        <path d="M151 125c39 0 57-25 57-53-37 0-57 24-57 53Z" fill="#365e48" />
        <path d="M151 181c-31-1-48-20-48-43 31-1 48 17 48 43Z" fill="#a1ad87" />
        <path d="M151 173c33 0 52-21 52-46-35 0-52 20-52 46Z" fill="#557759" />
        <path d="M151 210V106" stroke="#365e48" strokeWidth="3" />
        <path d="m124 190 7 33h41l7-33h-55Z" fill="#bd7957" />
        <path d="M121 190h61v10h-61z" fill="#ca8967" />
        <path
          d="M69 218v-49m0 22c-20 0-29-13-29-27 20 0 29 13 29 27Z"
          fill="#8e9e7d"
        />
        <path d="M69 182c18 0 28-12 28-27-20 0-28 12-28 27Z" fill="#5e7d61" />
        <path d="m54 205 4 19h23l4-19H54Z" fill="#e0cfa9" />
        <path d="M232 220v-54" stroke="#8b9274" strokeWidth="2" />
        <path d="M233 192c-20-3-28-14-26-29 20 4 28 14 26 29Z" fill="#b6ba93" />
        <path d="M232 206c20-3 28-14 26-29-20 4-28 14-26 29Z" fill="#8c9d79" />
        <path d="m217 211 3 13h25l3-13h-31Z" fill="#b0b59d" />
        <path
          d="M64 80h8m-4-4v8M246 116h8m-4-4v8"
          stroke="#ac9c77"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="93" cy="55" r="2" fill="#ac9c77" />
        <circle cx="260" cy="81" r="2" fill="#ac9c77" />
      </svg>
    </div>
  );
}
function Preferences({
  data,
  mode,
  busy,
  onClose,
  onSave,
  onTour,
}: {
  data: Snapshot;
  mode: string;
  busy: boolean;
  onClose: () => void;
  onSave: (profile: Snapshot["profile"]) => Promise<boolean>;
  onTour: () => void;
}) {
  const [profile, setProfile] = useState(data.profile);
  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title="Make yourself at home"
      description="A few preferences, and your data."
    >
      <form
        className="editor-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSave(profile)) onClose();
        }}
      >
        <label>
          Your name
          <input
            value={profile.name}
            maxLength={60}
            placeholder="What should we call you?"
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </label>
        <label>
          Timezone
          <input
            list="timezones"
            value={profile.timezone}
            required
            onChange={(e) =>
              setProfile({ ...profile, timezone: e.target.value })
            }
          />
          <datalist id="timezones">
            {Intl.supportedValuesOf("timeZone").map((zone) => (
              <option key={zone} value={zone} />
            ))}
            <option value="UTC" />
          </datalist>
          <span className="field-help">
            Practices follow your local day. Existing check-ins keep their
            original dates.
          </span>
        </label>
        <button className="button primary" disabled={busy}>
          Save preferences
        </button>
      </form>
      <div className="detail-section">
        <h3>Your data belongs to you.</h3>
        <p className="small muted">
          Export your collection, resources, practice rules, and check-in
          history as JSON. Keep the file somewhere private.
        </p>
        <button className="button secondary" onClick={() => download(data)}>
          <ArrowDownToLine size={16} /> Export my data
        </button>
        <p className="small muted storage-explanation">
          <ShieldCheck size={16} />
          {mode === "demo"
            ? "Demo data is stored in this browser only. Clearing browser storage removes it. A deployed, configured app uses your private Supabase account data."
            : "Your collection is stored in Supabase and restricted to your account. It syncs when you open or reload the app."}
        </p>
      </div>
      <div className="settings-links">
        <button className="text-link" onClick={onTour}>
          <BookOpen size={16} /> Replay the walkthrough
        </button>
        <a className="text-link" href="/guide">
          Read the full guide <ArrowUpRight size={14} />
        </a>
        {mode === "cloud" && (
          <button
            className="text-link"
            disabled={busy}
            onClick={() => signOut()}
          >
            <LogOut size={16} /> Sign out
          </button>
        )}
      </div>
    </Modal>
  );
}
const tourSteps = [
  {
    label: "A place to land",
    title: "Your life is more than a list.",
    text: "Gather keeps the must-dos, the things you’re growing, and the possibilities you want to remember in one thoughtful space.",
    tip: "Start small. You don’t need to organize your whole life today.",
    icon: Sprout,
  },
  {
    label: "Capture freely",
    title: "Out of your head. Into Inbox.",
    text: "Use Add something (or press N) to save a thought, task, or link. A title is enough. Unsorted captures wait in Inbox until you’re ready.",
    tip: "No need to decide what it is while you’re remembering it.",
    icon: Inbox,
  },
  {
    label: "Give things a shape",
    title: "Different things need different care.",
    text: "Actions finish once. Practices repeat. Goals connect to next steps. Interests hold things you want to explore. Active means now; Later keeps a possibility without making it a commitment.",
    tip: "Attach links and notes, and give anything a life area if it helps.",
    icon: LayoutGrid,
  },
  {
    label: "Return to what matters",
    title: "A manageable slice of today.",
    text: "Focus shows deadlines, scheduled work, your practices, and a few suggestions. Finish today records a practice’s full remaining target; open it to record a smaller amount. Missed days never pile up.",
    tip: "Suggestions explain why they appear. Use the three dots to hide one for today.",
    icon: Sun,
  },
  {
    label: "Keep the bigger picture",
    title: "A little perspective, now and then.",
    text: "Overview holds all your commitments, with filters for Later, completed, and archived items. Review brings back things that need a decision. Search finds titles, notes, life areas, and links.",
    tip: "Set a revisit date for something you want to consider again. It’s different from a deadline.",
    icon: Compass,
  },
];
function Walkthrough({
  data,
  busy,
  onClose,
  onFinish,
}: {
  data: Snapshot;
  busy: boolean;
  onClose: () => void;
  onFinish: (profile: Snapshot["profile"]) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [timezone, setTimezone] = useState(
    data.profile.walkthrough_completed
      ? data.profile.timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone ||
          data.profile.timezone,
  );
  const entry = tourSteps[step];
  const Icon = entry.icon;
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="A little walkthrough"
      description="Five small steps to find your way around."
    >
      <div className="tour-body">
        <div className="tour-icon">
          <Icon size={32} strokeWidth={1.4} />
        </div>
        <span className="eyebrow">
          {String(step + 1).padStart(2, "0")} / 05 · {entry.label}
        </span>
        <h3>{entry.title}</h3>
        <p>{entry.text}</p>
        <div className="tour-tip">
          <Sparkles size={16} />
          <span>{entry.tip}</span>
        </div>
        {step === 0 && (
          <label className="tour-timezone">
            Your timezone
            <input
              aria-label="Walkthrough timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <span className="field-help">
              Your practices will follow this local day.
            </span>
          </label>
        )}
        <div className="tour-dots" aria-label={`Step ${step + 1} of 5`}>
          {tourSteps.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to step ${index + 1}`}
              aria-current={index === step ? "step" : undefined}
              onClick={() => setStep(index)}
              className={index === step ? "active" : ""}
            />
          ))}
        </div>
        <div className="tour-footer">
          <button
            className="text-link small"
            disabled={busy}
            onClick={() =>
              onFinish({
                ...data.profile,
                timezone,
                walkthrough_completed: true,
              })
            }
          >
            Skip walkthrough
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              step < 4
                ? setStep(step + 1)
                : onFinish({
                    ...data.profile,
                    timezone,
                    walkthrough_completed: true,
                  })
            }
          >
            {step === 4 ? "Make yourself at home" : "Next little step"}
            <ArrowRight size={15} />
          </button>
        </div>
        <a className="tour-guide-link" href="/guide">
          You can always read the full guide.
        </a>
      </div>
    </Modal>
  );
}
