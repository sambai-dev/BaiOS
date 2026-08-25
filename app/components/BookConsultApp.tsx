"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { playSound } from "../lib/workbench-sound";

const BOOK_DRAFT_KEY = "sam-workbench-book-draft-v1";

type BookDraft = {
  model: EngagementModel;
  selectedDeliverables: string[];
  timelineTarget: string;
  clientName: string;
  clientEmail: string;
  projectNotes: string;
};

type EngagementModel = "sprint" | "retainer" | "audit" | "advisory";

type DeliverableItem = {
  id: string;
  label: string;
  category: "frontend" | "backend" | "ai" | "mobile";
  timeDays: number;
};

const ENGAGEMENT_MODELS: Record<
  EngagementModel,
  { title: string; subtitle: string; baseWeeks: string; defaultCommitment: string; description: string }
> = {
  sprint: {
    title: "2-Week MVP Sprint",
    subtitle: "Rapid 0-to-1 Production",
    baseWeeks: "2 weeks",
    defaultCommitment: "Full-time dedicated sprint",
    description: "Move from an idea or wireframe to a live, production-grade web or mobile product with senior design engineering.",
  },
  retainer: {
    title: "Design Engineering Retainer",
    subtitle: "Embedded Senior Craft",
    baseWeeks: "Monthly ongoing",
    defaultCommitment: "15–20 hrs / week",
    description: "Ongoing partnership for high-velocity teams needing top-tier interfaces, complex state machines, and design systems.",
  },
  audit: {
    title: "Architecture & AI Audit",
    subtitle: "Systems & Workflows",
    baseWeeks: "3–5 days",
    defaultCommitment: "Intensive deep-dive",
    description: "Comprehensive code, database, performance, and LLM/agentic workflow review with actionable refactor pull requests.",
  },
  advisory: {
    title: "Advisory & Strategy",
    subtitle: "Fractional Founding Engineer",
    baseWeeks: "Flexible",
    defaultCommitment: "Weekly syncs + async reviews",
    description: "Strategic guidance on architecture decisions, hiring screens, stack evaluation, and high-leverage software trade-offs.",
  },
};

const AVAILABLE_DELIVERABLES: DeliverableItem[] = [
  { id: "del-next", label: "Next.js 16 / React 19 Frontend", category: "frontend", timeDays: 3 },
  { id: "del-ds", label: "Design System & Micro-Interactions", category: "frontend", timeDays: 3 },
  { id: "del-pg", label: "PostgreSQL & Supabase / Neon RLS", category: "backend", timeDays: 2 },
  { id: "del-edge", label: "Cloudflare Workers & Edge Caching", category: "backend", timeDays: 2 },
  { id: "del-ai", label: "AI Agentic Workflows & Streaming UI", category: "ai", timeDays: 4 },
  { id: "del-mobile", label: "React Native / Expo iOS & Android", category: "mobile", timeDays: 5 },
];

export default function BookConsultApp() {
  // Client-only component (loaded with ssr: false), so window and
  // localStorage exist during the first render and can seed initial state.
  function readStoredDraft(): Partial<BookDraft> | null {
    try {
      const raw = window.localStorage.getItem(BOOK_DRAFT_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const candidate = parsed as Record<string, unknown>;
      const readString = (value: unknown) =>
        typeof value === "string" ? value : undefined;
      return {
        model:
          typeof candidate.model === "string" &&
          candidate.model in ENGAGEMENT_MODELS
            ? (candidate.model as EngagementModel)
            : undefined,
        selectedDeliverables: Array.isArray(candidate.selectedDeliverables)
          ? candidate.selectedDeliverables.filter(
              (id): id is string => typeof id === "string",
            )
          : undefined,
        timelineTarget: readString(candidate.timelineTarget),
        clientName: readString(candidate.clientName),
        clientEmail: readString(candidate.clientEmail),
        projectNotes: readString(candidate.projectNotes),
      };
    } catch {
      /* corrupt or unavailable storage, so start fresh */
      return null;
    }
  }

  const storedDraft = readStoredDraft();
  const [model, setModel] = useState<EngagementModel>(
    storedDraft?.model ?? "sprint",
  );
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    storedDraft?.selectedDeliverables ?? [
      "del-next",
      "del-ds",
      "del-pg",
      "del-ai",
    ],
  );
  const [timelineTarget, setTimelineTarget] = useState(
    storedDraft?.timelineTarget ?? "Immediate (Within 2 weeks)",
  );
  const [clientName, setClientName] = useState(storedDraft?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(storedDraft?.clientEmail ?? "");
  const [projectNotes, setProjectNotes] = useState(storedDraft?.projectNotes ?? "");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"estimator" | "calendar">("estimator");

  // Persist on every change (payload is tiny).
  useEffect(() => {
    const draft: BookDraft = {
      model,
      selectedDeliverables,
      timelineTarget,
      clientName,
      clientEmail,
      projectNotes,
    };
    try {
      window.localStorage.setItem(BOOK_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage full or blocked; estimator keeps working in-memory */
    }
  }, [
    model,
    selectedDeliverables,
    timelineTarget,
    clientName,
    clientEmail,
    projectNotes,
  ]);

  const nameInputId = useId();
  const emailInputId = useId();
  const notesInputId = useId();

  const toggleDeliverable = (id: string) => {
    playSound("click");
    setSelectedDeliverables((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const estimatedDays = useMemo(() => {
    const base = model === "sprint" ? 10 : model === "audit" ? 4 : model === "retainer" ? 20 : 5;
    const additional = selectedDeliverables.reduce((acc, id) => {
      const item = AVAILABLE_DELIVERABLES.find((d) => d.id === id);
      return acc + (item ? item.timeDays : 0);
    }, 0);
    return Math.max(base, Math.round(base * 0.5 + additional * 0.6));
  }, [model, selectedDeliverables]);

  const scopeBriefMarkdown = useMemo(() => {
    const activeModel = ENGAGEMENT_MODELS[model];
    const items = selectedDeliverables
      .map((id) => AVAILABLE_DELIVERABLES.find((d) => d.id === id)?.label)
      .filter(Boolean)
      .map((label) => `• ${label}`)
      .join("\n");

    return `### Project Scope Inquiry for Sam Bai / Solynth Labs
**Engagement Model:** ${activeModel.title} (${activeModel.subtitle})
**Target Start / Timeline:** ${timelineTarget} (~${estimatedDays} days estimated effort)
**Client / Company:** ${clientName.trim() || "Not specified"} (${clientEmail.trim() || "Email not specified"})

**Selected Architecture & Deliverables:**
${items || "• Custom full-stack architecture"}

**Project Goals & Notes:**
${projectNotes.trim() || "Looking to discuss scope, timeline, and architectural approach."}
`;
  }, [model, timelineTarget, estimatedDays, clientName, clientEmail, selectedDeliverables, projectNotes]);

  const downloadBrief = () => {
    playSound("click");
    const blob = new Blob([scopeBriefMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "solynth-scope-brief.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyBriefToClipboard = async () => {
    playSound("snap");
    try {
      await navigator.clipboard.writeText(scopeBriefMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const openGmailDraft = () => {
    playSound("chime");
    const subject = encodeURIComponent(`Project Inquiry: ${ENGAGEMENT_MODELS[model].title}`);
    const body = encodeURIComponent(scopeBriefMarkdown);
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=sambai.codes%40gmail.com&su=${subject}&body=${body}`,
      "_blank",
      "noreferrer"
    );
  };

  return (
    <div className="book-app">
      <header className="book-header">
        <div>
          <h2>Book.</h2>
          <p>Estimate a B2B engagement, configure deliverables, and schedule an intro call.</p>
        </div>
        <div className="book-nav" role="tablist" aria-label="Booking view selector">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "estimator"}
            onClick={() => {
              playSound("click");
              setViewMode("estimator");
            }}
          >
            Scope Estimator
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "calendar"}
            onClick={() => {
              playSound("click");
              setViewMode("calendar");
            }}
          >
            Schedule Sync
          </button>
        </div>
      </header>

      {viewMode === "calendar" ? (
        <div className="book-calendar-surface">
          <div className="book-calendar-card">
            <div className="book-calendar-meta">
              <span className="book-tag">Introductory Call</span>
              <h3>30-Minute Architecture & Project Sync</h3>
              <p>
                Direct discussion with Sam Bai covering product goals, technical constraints, timeline, and execution fit.
              </p>
              <ul className="book-calendar-bullets">
                <li>Discussion on product direction & architecture</li>
                <li>Live assessment of technical scope</li>
                <li>Fixed pricing quote or retainer terms</li>
              </ul>
            </div>
            <div className="book-calendar-actions">
              <a
                href="https://cal.com/sambai-dev"
                target="_blank"
                rel="noreferrer"
                className="book-cta-primary"
                onClick={() => playSound("chime")}
              >
                Open Cal.com Booking
              </a>
              <button type="button" className="book-cta-secondary" onClick={openGmailDraft}>
                Direct Email (sambai.codes@gmail.com)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="book-workspace">
          <div className="book-config">
            <section className="book-section">
              <span className="book-section-label">01 / Choose Engagement Model</span>
              <div className="book-models-grid" role="radiogroup" aria-label="Engagement models">
                {(Object.keys(ENGAGEMENT_MODELS) as EngagementModel[]).map((key) => {
                  const item = ENGAGEMENT_MODELS[key];
                  const isSelected = model === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`book-model-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        playSound("click");
                        setModel(key);
                      }}
                    >
                      <div className="book-model-head">
                        <strong>{item.title}</strong>
                        <span className="book-model-tag">{item.baseWeeks}</span>
                      </div>
                      <p>{item.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="book-section">
              <span className="book-section-label">02 / Select Target Capabilities</span>
              <div className="book-deliverables-grid">
                {AVAILABLE_DELIVERABLES.map((item) => {
                  const isChecked = selectedDeliverables.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      className={`book-chip ${isChecked ? "is-active" : ""}`}
                      onClick={() => toggleDeliverable(item.id)}
                    >
                      <span className="book-chip-mark" aria-hidden="true">
                        {isChecked ? "■" : "□"}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="book-section">
              <span className="book-section-label">03 / Project Context & Timeline</span>
              <div className="book-inputs-grid">
                <div>
                  <label htmlFor={nameInputId}>Your Name / Company</label>
                  <input
                    id={nameInputId}
                    type="text"
                    placeholder="e.g. Alex / Acme Ventures"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={emailInputId}>Contact Email</label>
                  <input
                    id={emailInputId}
                    type="email"
                    placeholder="alex@acme.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="book-input-full">
                  <label htmlFor="timeline-target-select">Target Timeline</label>
                  <select
                    id="timeline-target-select"
                    value={timelineTarget}
                    onChange={(e) => setTimelineTarget(e.target.value)}
                  >
                    <option value="Immediate (Within 2 weeks)">Immediate (Within 2 weeks)</option>
                    <option value="Next Month (Within 30 days)">Next Month (Within 30 days)</option>
                    <option value="Upcoming Quarter">Upcoming Quarter</option>
                    <option value="Flexible / Exploring Scope">Flexible / Exploring Scope</option>
                  </select>
                </div>
                <div className="book-input-full">
                  <label htmlFor={notesInputId}>Brief Notes / Core Challenge</label>
                  <textarea
                    id={notesInputId}
                    rows={2}
                    placeholder="What are you building, and what is the primary technical or design bottleneck?"
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="book-summary-panel">
            <div className="book-summary-head">
              <span className="book-tag">Scope Summary</span>
              <h3>{ENGAGEMENT_MODELS[model].title}</h3>
              <p>{ENGAGEMENT_MODELS[model].defaultCommitment}</p>
            </div>

            <dl className="book-summary-stats">
              <div>
                <dt>Estimated Duration</dt>
                <dd>~{estimatedDays} Working Days</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>Hamilton, NZ (Async / US & Global Friendly)</dd>
              </div>
              <div>
                <dt>Deliverables</dt>
                <dd>{selectedDeliverables.length} Modules Selected</dd>
              </div>
            </dl>

            <div className="book-actions">
              <button
                type="button"
                className="book-cta-primary"
                onClick={openGmailDraft}
              >
                Send Scope via Gmail
              </button>
              <button
                type="button"
                className="book-cta-secondary"
                onClick={copyBriefToClipboard}
              >
                {copied ? "✓ Copied Scope Brief" : "Copy Formatted Brief"}
              </button>
              <button
                type="button"
                className="book-cta-secondary"
                onClick={downloadBrief}
              >
                Download .md
              </button>
              <button
                type="button"
                className="book-cta-link"
                onClick={() => {
                  playSound("click");
                  setViewMode("calendar");
                }}
              >
                Or schedule an introductory call →
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
