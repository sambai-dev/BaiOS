// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import "@/app/styles/book-consult-app.css";

import {
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { playSound } from "../lib/workbench-sound";

const BOOK_DRAFT_KEY = "sam-workbench-book-draft-v1";
const PRIMARY_EMAIL = "sambai.codes@gmail.com";
const MAILTO_MAX_HREF_LENGTH = 1_800;
const MAILTO_MAX_SUBJECT_LENGTH = 96;
const MAILTO_TRUNCATION_NOTE =
  "\n\n[Project context shortened for email. Copy or download the full planning brief from Workbench.]";

type ServiceArea = "direction" | "interface" | "architecture" | "ongoing";
type ViewMode = "builder" | "contact";

type BookDraft = {
  version: 2;
  serviceArea: ServiceArea | "";
  selectedFocusAreas: string[];
  timelineTarget: string;
  clientName: string;
  clientEmail: string;
  projectNotes: string;
};

type FocusArea = {
  id: string;
  label: string;
};

const SERVICE_AREAS: Record<
  ServiceArea,
  { title: string; subtitle: string; description: string }
> = {
  direction: {
    title: "Product direction",
    subtitle: "Clarify the product decision",
    description:
      "Clarify the product decision and define the first useful version.",
  },
  interface: {
    title: "Interface & workflow build",
    subtitle: "Production design engineering",
    description:
      "Design and build production interfaces, stateful workflows, and the systems behind them.",
  },
  architecture: {
    title: "Architecture & AI workflow review",
    subtitle: "Technical decision support",
    description:
      "Review architecture, data flows, and AI-assisted workflows, then identify the next decisions.",
  },
  ongoing: {
    title: "Ongoing product production",
    subtitle: "Embedded product engineering",
    description:
      "Work across product direction, design engineering, and delivery as the product evolves.",
  },
};

const SERVICE_AREA_KEYS = Object.keys(SERVICE_AREAS) as ServiceArea[];

const FOCUS_AREAS: FocusArea[] = [
  { id: "del-next", label: "Web product interfaces" },
  { id: "del-ds", label: "Design systems & interaction" },
  { id: "del-pg", label: "Data models & application state" },
  { id: "del-edge", label: "Cloud & edge delivery" },
  { id: "del-ai", label: "AI-assisted workflows & streaming UI" },
  { id: "del-mobile", label: "Mobile & cross-platform products" },
];

const TIMELINE_OPTIONS = [
  "As soon as practical",
  "Within 30 days",
  "This quarter",
  "Exploring timing",
] as const;

function truncateSubject(subject: string): string {
  const codePoints = Array.from(subject);
  if (codePoints.length <= MAILTO_MAX_SUBJECT_LENGTH) return subject;
  return `${codePoints
    .slice(0, MAILTO_MAX_SUBJECT_LENGTH - 1)
    .join("")
    .trimEnd()}…`;
}

function buildBoundedMailtoHref(subject: string, body: string): string {
  const boundedSubject = truncateSubject(subject);
  const buildHref = (nextBody: string) =>
    `mailto:${PRIMARY_EMAIL}?subject=${encodeURIComponent(boundedSubject)}&body=${encodeURIComponent(nextBody)}`;

  const completeHref = buildHref(body);
  if (completeHref.length <= MAILTO_MAX_HREF_LENGTH) return completeHref;

  const bodyCodePoints = Array.from(body);
  let lowerBound = 0;
  let upperBound = bodyCodePoints.length;
  let bestLength = 0;

  while (lowerBound <= upperBound) {
    const midpoint = Math.floor((lowerBound + upperBound) / 2);
    const candidate = `${bodyCodePoints.slice(0, midpoint).join("").trimEnd()}${MAILTO_TRUNCATION_NOTE}`;
    if (buildHref(candidate).length <= MAILTO_MAX_HREF_LENGTH) {
      bestLength = midpoint;
      lowerBound = midpoint + 1;
    } else {
      upperBound = midpoint - 1;
    }
  }

  let shortenedBody = bodyCodePoints.slice(0, bestLength).join("").trimEnd();
  const lastBoundary = Math.max(
    shortenedBody.lastIndexOf("\n"),
    shortenedBody.lastIndexOf(" "),
  );
  if (lastBoundary >= Math.floor(shortenedBody.length * 0.7)) {
    shortenedBody = shortenedBody.slice(0, lastBoundary).trimEnd();
  }

  return buildHref(`${shortenedBody}${MAILTO_TRUNCATION_NOTE}`);
}

function readStoredDraft(): Partial<BookDraft> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(BOOK_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const candidate = parsed as Record<string, unknown>;
    const readString = (value: unknown) =>
      typeof value === "string" ? value : undefined;
    const isCurrentDraft = candidate.version === 2;

    return {
      version: 2,
      serviceArea:
        isCurrentDraft &&
        typeof candidate.serviceArea === "string" &&
        (candidate.serviceArea === "" ||
          Object.hasOwn(SERVICE_AREAS, candidate.serviceArea))
          ? (candidate.serviceArea as ServiceArea | "")
          : "",
      selectedFocusAreas:
        isCurrentDraft && Array.isArray(candidate.selectedFocusAreas)
          ? candidate.selectedFocusAreas.filter(
              (id): id is string =>
                typeof id === "string" &&
                FOCUS_AREAS.some((item) => item.id === id),
            )
          : [],
      timelineTarget:
        isCurrentDraft &&
        typeof candidate.timelineTarget === "string" &&
        (candidate.timelineTarget === "" ||
          (TIMELINE_OPTIONS as readonly string[]).includes(
            candidate.timelineTarget,
          ))
          ? candidate.timelineTarget
          : "",
      // Carry forward visitor-authored text from the old estimator draft,
      // but not its preselected packages, timings, or capability defaults.
      clientName: readString(candidate.clientName),
      clientEmail: readString(candidate.clientEmail),
      projectNotes: readString(candidate.projectNotes),
    };
  } catch {
    return null;
  }
}

export default function BookConsultApp() {
  const [storedDraft] = useState<Partial<BookDraft> | null>(readStoredDraft);
  const [serviceArea, setServiceArea] = useState<ServiceArea | "">(
    storedDraft?.serviceArea ?? "",
  );
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(
    storedDraft?.selectedFocusAreas ?? [],
  );
  const [timelineTarget, setTimelineTarget] = useState(
    storedDraft?.timelineTarget ?? "",
  );
  const [clientName, setClientName] = useState(storedDraft?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(
    storedDraft?.clientEmail ?? "",
  );
  const [projectNotes, setProjectNotes] = useState(
    storedDraft?.projectNotes ?? "",
  );
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [showEmailError, setShowEmailError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("builder");
  const copiedTimerRef = useRef<number | null>(null);
  const tabRefs = useRef<Record<ViewMode, HTMLButtonElement | null>>({
    builder: null,
    contact: null,
  });
  const contactPrimaryActionRef = useRef<HTMLAnchorElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const pendingViewFocusRef = useRef<
    "tab" | "contact-action" | "email-input" | null
  >(null);
  const serviceAreaRefs = useRef<Record<ServiceArea, HTMLButtonElement | null>>(
    {
      direction: null,
      interface: null,
      architecture: null,
      ongoing: null,
    },
  );

  const nameInputId = useId();
  const emailInputId = useId();
  const emailErrorId = useId();
  const notesInputId = useId();
  const timelineInputId = useId();
  const builderTabId = useId();
  const contactTabId = useId();
  const builderPanelId = useId();
  const contactPanelId = useId();
  const focusAreasLabelId = useId();

  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const focusTarget = pendingViewFocusRef.current;
    if (!focusTarget) return;
    pendingViewFocusRef.current = null;

    const frame = window.requestAnimationFrame(() => {
      if (focusTarget === "email-input") {
        emailInputRef.current?.focus({ preventScroll: false });
        return;
      }
      if (focusTarget === "contact-action") {
        contactPrimaryActionRef.current?.focus({ preventScroll: true });
        return;
      }
      tabRefs.current[viewMode]?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [viewMode]);

  useEffect(() => {
    const draft: BookDraft = {
      version: 2,
      serviceArea,
      selectedFocusAreas,
      timelineTarget,
      clientName,
      clientEmail,
      projectNotes,
    };

    try {
      window.localStorage.setItem(BOOK_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* The brief remains usable in-memory when storage is unavailable. */
    }
  }, [
    serviceArea,
    selectedFocusAreas,
    timelineTarget,
    clientName,
    clientEmail,
    projectNotes,
  ]);

  const activeService = serviceArea ? SERVICE_AREAS[serviceArea] : null;

  const planningBriefMarkdown = useMemo(() => {
    const selectedLabels = selectedFocusAreas
      .map((id) => FOCUS_AREAS.find((item) => item.id === id)?.label)
      .filter((label): label is string => Boolean(label));

    return `# Planning brief (not a quote or delivery estimate)

**Name / company:** ${clientName.trim() || "Not provided"}
**Contact email:** ${clientEmail.trim() || "Not provided"}
**Service area:** ${activeService?.title ?? "Not selected"}
**Target timing:** ${timelineTarget || "Not provided"}

## Focus areas
${selectedLabels.length > 0 ? selectedLabels.map((label) => `- ${label}`).join("\n") : "None selected"}

## Project context
${projectNotes.trim() || "Not provided"}

## Next step
Email Sam Bai at Solynth Labs to discuss this brief.
`;
  }, [
    activeService?.title,
    clientEmail,
    clientName,
    projectNotes,
    selectedFocusAreas,
    timelineTarget,
  ]);

  const emailHref = useMemo(() => {
    const subject = activeService
      ? `Project enquiry: ${activeService.title}`
      : "Project enquiry: planning brief";
    return buildBoundedMailtoHref(subject, planningBriefMarkdown);
  }, [activeService, planningBriefMarkdown]);

  const toggleFocusArea = (id: string) => {
    playSound("click");
    setSelectedFocusAreas((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const chooseServiceArea = (nextServiceArea: ServiceArea) => {
    playSound("click");
    setServiceArea(nextServiceArea);
  };

  const handleServiceAreaKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentServiceArea: ServiceArea,
  ) => {
    const currentIndex = SERVICE_AREA_KEYS.indexOf(currentServiceArea);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % SERVICE_AREA_KEYS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + SERVICE_AREA_KEYS.length) %
        SERVICE_AREA_KEYS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = SERVICE_AREA_KEYS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextServiceArea = SERVICE_AREA_KEYS[nextIndex];
      if (!nextServiceArea) return;
      chooseServiceArea(nextServiceArea);
      serviceAreaRefs.current[nextServiceArea]?.focus();
    }
  };

  const setActiveView = (
    nextView: ViewMode,
    focusTarget: "tab" | "contact-action" | null = null,
  ) => {
    playSound("click");
    pendingViewFocusRef.current = focusTarget;
    setViewMode(nextView);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentView: ViewMode,
  ) => {
    let nextView: ViewMode | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextView = currentView === "builder" ? "contact" : "builder";
    } else if (event.key === "Home") {
      nextView = "builder";
    } else if (event.key === "End") {
      nextView = "contact";
    }

    if (nextView) {
      event.preventDefault();
      setActiveView(nextView, "tab");
    }
  };

  const downloadBrief = () => {
    playSound("click");
    const blob = new Blob([planningBriefMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sam-bai-project-brief.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyBriefToClipboard = async () => {
    playSound("snap");

    let succeeded = false;
    try {
      await navigator.clipboard.writeText(planningBriefMarkdown);
      succeeded = true;
    } catch {
      succeeded = false;
    }

    if (copiedTimerRef.current !== null) {
      window.clearTimeout(copiedTimerRef.current);
    }

    setCopied(succeeded);
    setCopyFailed(!succeeded);
    copiedTimerRef.current = window.setTimeout(() => {
      copiedTimerRef.current = null;
      setCopied(false);
      setCopyFailed(false);
    }, 2500);
  };

  const handleEmailAction = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const emailInput = emailInputRef.current;
    const hasInvalidEmail =
      clientEmail.trim().length > 0 &&
      Boolean(emailInput && !emailInput.validity.valid);

    if (!hasInvalidEmail) {
      setShowEmailError(false);
      playSound("chime");
      return;
    }

    event.preventDefault();
    playSound("delete");
    setShowEmailError(true);

    if (viewMode !== "builder") {
      pendingViewFocusRef.current = "email-input";
      setViewMode("builder");
      return;
    }

    window.requestAnimationFrame(() => {
      emailInput?.focus({ preventScroll: false });
    });
  };

  return (
    <div className="book-app">
      <header className="book-header">
        <div>
          <h2>Project brief.</h2>
          <p>
            Shape a factual project enquiry. Your draft stays in this browser.
          </p>
        </div>
        <div
          className="book-nav"
          role="tablist"
          aria-label="Project brief view"
        >
          <button
            ref={(node) => {
              tabRefs.current.builder = node;
            }}
            id={builderTabId}
            type="button"
            role="tab"
            aria-selected={viewMode === "builder"}
            aria-controls={builderPanelId}
            tabIndex={viewMode === "builder" ? 0 : -1}
            onClick={() => setActiveView("builder")}
            onKeyDown={(event) => handleTabKeyDown(event, "builder")}
          >
            Build brief
          </button>
          <button
            ref={(node) => {
              tabRefs.current.contact = node;
            }}
            id={contactTabId}
            type="button"
            role="tab"
            aria-selected={viewMode === "contact"}
            aria-controls={contactPanelId}
            tabIndex={viewMode === "contact" ? 0 : -1}
            onClick={() => setActiveView("contact")}
            onKeyDown={(event) => handleTabKeyDown(event, "contact")}
          >
            Contact Sam
          </button>
        </div>
      </header>

      <section
        id={contactPanelId}
        role="tabpanel"
        aria-labelledby={contactTabId}
        className="book-contact-surface"
        hidden={viewMode !== "contact"}
      >
        <div className="book-contact-card">
          <div className="book-contact-meta">
            <span className="book-tag">Direct contact</span>
            <h3>Start a project conversation.</h3>
            <p>
              Send the problem, product decision, or system you need help with.
              The brief is optional and deliberately avoids promising a quote,
              schedule, or engagement format.
            </p>
            <ul className="book-contact-bullets">
              <li>Describe the outcome or decision that matters.</li>
              <li>Add constraints and target timing only when known.</li>
              <li>Discuss the brief and next steps directly.</li>
            </ul>
          </div>
          <div className="book-contact-actions">
            <a
              ref={contactPrimaryActionRef}
              href={emailHref}
              className="book-cta-primary"
              onClick={handleEmailAction}
            >
              Email project enquiry
            </a>
            <button
              type="button"
              className="book-cta-secondary"
              onClick={copyBriefToClipboard}
            >
              {copied
                ? "Copied planning brief"
                : copyFailed
                  ? "Copy blocked: download instead"
                  : "Copy planning brief"}
            </button>
            <button
              type="button"
              className="book-cta-secondary"
              onClick={downloadBrief}
            >
              Download Markdown
            </button>
          </div>
        </div>
      </section>

      <div
        id={builderPanelId}
        role="tabpanel"
        aria-labelledby={builderTabId}
        className="book-workspace"
        hidden={viewMode !== "builder"}
      >
        <div className="book-config">
          <section className="book-section">
            <span className="book-section-label">
              01 / Choose a starting point
            </span>
            <div
              className="book-models-grid"
              role="radiogroup"
              aria-label="Service areas"
            >
              {SERVICE_AREA_KEYS.map((key) => {
                const item = SERVICE_AREAS[key];
                const isSelected = serviceArea === key;

                return (
                  <button
                    key={key}
                    ref={(node) => {
                      serviceAreaRefs.current[key] = node;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={
                      isSelected || (!serviceArea && key === "direction")
                        ? 0
                        : -1
                    }
                    className={`book-model-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => chooseServiceArea(key)}
                    onKeyDown={(event) => handleServiceAreaKeyDown(event, key)}
                  >
                    <span className="book-model-head">
                      <strong>{item.title}</strong>
                      <span className="book-model-tag">{item.subtitle}</span>
                    </span>
                    <span className="book-model-description">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="book-section">
            <span id={focusAreasLabelId} className="book-section-label">
              02 / Add relevant focus areas
            </span>
            <div
              className="book-deliverables-grid"
              role="group"
              aria-labelledby={focusAreasLabelId}
            >
              {FOCUS_AREAS.map((item) => {
                const isChecked = selectedFocusAreas.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    className={`book-chip ${isChecked ? "is-active" : ""}`}
                    onClick={() => toggleFocusArea(item.id)}
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
            <span className="book-section-label">03 / Add what you know</span>
            <div className="book-inputs-grid">
              <div>
                <label htmlFor={nameInputId}>Your name / company</label>
                  <input
                    id={nameInputId}
                    name="client-name"
                    type="text"
                  autoComplete="name"
                  placeholder="Name or company"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor={emailInputId}>Contact email</label>
                  <input
                    ref={emailInputRef}
                    id={emailInputId}
                    name="client-email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                  maxLength={254}
                  placeholder="you@example.com"
                  value={clientEmail}
                  aria-describedby={showEmailError ? emailErrorId : undefined}
                  aria-invalid={showEmailError ? "true" : undefined}
                  onChange={(event) => {
                    setClientEmail(event.target.value);
                    setShowEmailError(false);
                  }}
                />
                {showEmailError ? (
                  <p
                    id={emailErrorId}
                    className="book-field-error"
                    role="alert"
                  >
                    Enter an email like name@example.com, or leave this field
                    blank.
                  </p>
                ) : null}
              </div>
              <div className="book-input-full">
                <label htmlFor={timelineInputId}>Target timing</label>
                  <select
                    id={timelineInputId}
                    name="target-timing"
                  value={timelineTarget}
                  onChange={(event) => setTimelineTarget(event.target.value)}
                >
                  <option value="">Choose a target if known</option>
                  {TIMELINE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="book-input-full">
                <label htmlFor={notesInputId}>Project context</label>
                  <textarea
                    id={notesInputId}
                    name="project-context"
                  rows={3}
                  placeholder="What are you building, changing, or deciding?"
                  value={projectNotes}
                  onChange={(event) => setProjectNotes(event.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <section
          className="book-summary-panel"
          aria-label="Planning brief summary"
        >
          <div>
            <div className="book-summary-head">
              <span className="book-tag">Planning brief</span>
              <h3>{activeService?.title ?? "No service area selected"}</h3>
              <p>
                {activeService?.description ??
                  "Choose a starting point only if one fits. This does not define a package or commitment."}
              </p>
            </div>

            <dl className="book-summary-stats">
              <div>
                <dt>Target timing</dt>
                <dd>{timelineTarget || "Not provided"}</dd>
              </div>
              <div>
                <dt>Focus areas</dt>
                <dd>
                  {selectedFocusAreas.length > 0
                    ? `${selectedFocusAreas.length} selected`
                    : "None selected"}
                </dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{clientEmail.trim() || "Not provided"}</dd>
              </div>
            </dl>

            <p className="book-brief-note">
              Planning brief (not a quote or delivery estimate).
            </p>
          </div>

          <div className="book-actions">
            <a
              href={emailHref}
              className="book-cta-primary"
              onClick={handleEmailAction}
            >
              Email project enquiry
            </a>
            <button
              type="button"
              className="book-cta-secondary"
              onClick={copyBriefToClipboard}
            >
              {copied
                ? "Copied planning brief"
                : copyFailed
                  ? "Copy blocked: download instead"
                  : "Copy planning brief"}
            </button>
            <button
              type="button"
              className="book-cta-secondary"
              onClick={downloadBrief}
            >
              Download Markdown
            </button>
            <button
              type="button"
              className="book-cta-link"
              onClick={() => setActiveView("contact", "contact-action")}
            >
              Read contact guidance →
            </button>
          </div>
        </section>
      </div>

      <span className="sr-only" aria-live="polite">
        {copied
          ? "Planning brief copied to clipboard."
          : copyFailed
            ? "Clipboard access was blocked. Download the brief instead."
            : ""}
      </span>
    </div>
  );
}
