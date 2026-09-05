// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import "@/app/styles/case-study-sandbox-app.css";

import Link from "next/link";
import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ProjectThumbnail from "./ProjectThumbnail";
import { playSound } from "../lib/workbench-sound";

const CASE_TABS = [
  { id: "trekky", label: "Trekky" },
  { id: "workbench", label: "Workbench" },
  { id: "motion", label: "Motion" },
] as const;

type CaseTab = (typeof CASE_TABS)[number]["id"];

const TREKKY_STEPS = [
  {
    label: "Discover",
    eyebrow: "Find opportunities",
    detail:
      "Job sources across New Zealand, Australia, the United States, and Singapore feed one discovery workflow.",
    note: "Duplicate handling and source history keep imported listings reviewable.",
  },
  {
    label: "Organize",
    eyebrow: "Keep the search organized",
    detail:
      "Tracking, contacts, follow-ups, analytics, and Google sync stay connected across the job-search workflow.",
    note: "The product spans web, PWA, an MV3 extension, and authenticated MCP.",
  },
  {
    label: "Prepare",
    eyebrow: "Prepare an application",
    detail:
      "AI apply kits help prepare application material while the final submission remains with the user.",
    note: "Review the prepared material, then choose when to submit it yourself.",
  },
  {
    label: "Follow through",
    eyebrow: "Keep track of what comes next",
    detail:
      "Calendar sync keeps interviews, reminders, and application follow-ups beside tracked work.",
    note: "The same workflow connects discovery, preparation, and follow-up without automating the final submission.",
  },
] as const;

const WORKBENCH_LAYERS = [
  {
    label: "Interaction",
    title: "A working window manager",
    detail:
      "Windows can focus, drag, resize, snap, maximize, minimize, and restore across three local workspaces.",
  },
  {
    label: "State",
    title: "A desktop that remembers your work",
    detail:
      "The session saves your workspaces, window positions, theme, app data, and notes in Files.",
  },
  {
    label: "Saving",
    title: "Files and desktop state save together",
    detail:
      "One saved snapshot keeps Files and desktop state in step. If another tab changes the same session, you can choose which version to keep.",
  },
  {
    label: "Recovery",
    title: "Check a backup before restoring it",
    detail:
      "Backups are checked before they replace saved work. Older sessions can be updated, and damaged data is kept for recovery.",
  },
] as const;

type CaseStudySandboxAppProps = {
  /** False while the host window is minimized or hidden, pausing background loops. */
  isActive: boolean;
};

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export default function CaseStudySandboxApp({ isActive }: CaseStudySandboxAppProps) {
  const [activeTab, setActiveTab] = useState<CaseTab>("trekky");
  const [activeTrekkyStep, setActiveTrekkyStep] = useState(0);
  const [activeWorkbenchLayer, setActiveWorkbenchLayer] = useState(0);
  const [stiffness, setStiffness] = useState(240);
  const [damping, setDamping] = useState(22);
  const [springTrigger, setSpringTrigger] = useState(0);
  const [canvasThemeRevision, setCanvasThemeRevision] = useState(0);
  const [canvasSizeRevision, setCanvasSizeRevision] = useState(0);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  // Parameters live in refs so controls can tune a moving trajectory. The
  // effect restarts only for a new impulse, visibility, theme, or canvas size.
  const stiffnessRef = useRef(stiffness);
  const dampingRef = useRef(damping);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    stiffnessRef.current = stiffness;
    dampingRef.current = damping;
  }, [stiffness, damping]);

  useEffect(() => {
    if (activeTab !== "motion") return;

    const themeRoot = canvasRef.current?.closest("[data-os-theme]");
    if (!themeRoot) return;

    const observer = new MutationObserver(() => {
      setCanvasThemeRevision((revision) => revision + 1);
    });
    observer.observe(themeRoot, {
      attributes: true,
      attributeFilter: ["data-os-theme"],
    });

    return () => observer.disconnect();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "motion" || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let previousWidth = -1;
    let previousHeight = -1;
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      if (nextWidth === previousWidth && nextHeight === previousHeight) return;
      previousWidth = nextWidth;
      previousHeight = nextHeight;
      setCanvasSizeRevision((revision) => revision + 1);
    };

    updateCanvasSize();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateCanvasSize);
    resizeObserver?.observe(canvas);
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [activeTab, isActive]);

  useEffect(() => {
    if (activeTab !== "motion" || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const viewWidth = Math.max(1, Math.round(rect.width));
    const viewHeight = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const styles = getComputedStyle(canvas);
    const carbon = styles.getPropertyValue("--carbon").trim() || styles.color;
    const route = styles.getPropertyValue("--cobalt").trim() || styles.color;

    const draw = (position: number) => {
      const targetY = viewHeight * 0.45;
      const currentY = targetY + (1 - position) * Math.min(70, viewHeight * 0.38);

      ctx.clearRect(0, 0, viewWidth, viewHeight);

      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = carbon;
      ctx.lineWidth = 1;
      for (let x = 0; x < viewWidth; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, viewHeight);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = route;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, targetY);
      ctx.lineTo(viewWidth, targetY);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = carbon;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(viewWidth * 0.5, 0);
      ctx.lineTo(viewWidth * 0.5, currentY);
      ctx.stroke();

      ctx.fillStyle = route;
      ctx.beginPath();
      ctx.arc(viewWidth * 0.5, currentY, 18, 0, Math.PI * 2);
      ctx.fill();
    };

    if (prefersReducedMotion) {
      draw(1);
      animationRef.current = null;
      return;
    }

    let position = 0;
    let velocity = 0;
    let settledFrames = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      const frameDelta = Math.min((time - lastTime) / 1000, 0.032);
      lastTime = time;

      const maximumStep = 1 / 120;
      const substeps = Math.max(1, Math.ceil(frameDelta / maximumStep));
      const step = frameDelta / substeps;
      for (let index = 0; index < substeps; index += 1) {
        const force =
          -stiffnessRef.current * (position - 1) - dampingRef.current * velocity;
        velocity += force * step;
        position += velocity * step;
      }
      draw(position);

      const isSettled = Math.abs(position - 1) < 0.001 && Math.abs(velocity) < 0.01;
      settledFrames = isSettled ? settledFrames + 1 : 0;

      if (settledFrames >= 4) {
        draw(1);
        animationRef.current = null;
        return;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    activeTab,
    canvasSizeRevision,
    canvasThemeRevision,
    isActive,
    prefersReducedMotion,
    springTrigger,
  ]);

  const selectTab = (tab: CaseTab, index: number) => {
    setActiveTab(tab);
    tabRefs.current[index]?.focus();
    playSound("click");
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % CASE_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + CASE_TABS.length) % CASE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = CASE_TABS.length - 1;
    }

    if (nextIndex === null) return;
    const nextTab = CASE_TABS[nextIndex];
    if (!nextTab) return;
    event.preventDefault();
    selectTab(nextTab.id, nextIndex);
  };

  const selectedTrekkyStep = TREKKY_STEPS[activeTrekkyStep] ?? TREKKY_STEPS[0];
  const selectedWorkbenchLayer =
    WORKBENCH_LAYERS[activeWorkbenchLayer] ?? WORKBENCH_LAYERS[0];

  return (
    <div className="sandbox-app">
      <header className="sandbox-header">
        <div>
          <span className="sandbox-header-index">Project details</span>
          <h2>Inside the projects.</h2>
          <p>A closer look at Trekky and the Workbench.</p>
        </div>
        <div className="sandbox-header-actions">
          <Link className="sandbox-projects-link" href="/work">
            View all projects <span aria-hidden="true">→</span>
          </Link>
          <div className="sandbox-tabs" role="tablist" aria-label="Projects and experiments">
            {CASE_TABS.map((tab, index) => (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                id={`sandbox-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-controls={`sandbox-panel-${tab.id}`}
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => selectTab(tab.id, index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div
        id="sandbox-panel-trekky"
        className="sandbox-body sandbox-trekky-view"
        role="tabpanel"
        aria-labelledby="sandbox-tab-trekky"
        hidden={activeTab !== "trekky"}
      >
        <div className="sandbox-stage" role="region" aria-label="Trekky system details" tabIndex={0}>
          <div className="sandbox-panel-head sandbox-panel-head--illustrated">
            <div className="sandbox-project-intro">
              <span className="sandbox-tag">Trekky · A Solynth Labs product</span>
              <h3>Bring the job search together.</h3>
              <p>
                Find opportunities, track applications, and prepare for what comes next.
                Trekky connects the web app with an installable app, a browser extension,
                and authenticated AI tools.
              </p>
            </div>
            <div className="sandbox-project-art" aria-hidden="true">
              <ProjectThumbnail id="trekky" title="Trekky" subtitle="Job-search workspace" />
            </div>
          </div>

          <div className="sandbox-flow-shell">
            <ol className="sandbox-flow-track" aria-label="Trekky workflow stages">
              {TREKKY_STEPS.map((step, index) => (
                <li key={step.label}>
                  <button
                    type="button"
                    aria-pressed={activeTrekkyStep === index}
                    onClick={() => {
                      setActiveTrekkyStep(index);
                      playSound("click");
                    }}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.label}</strong>
                  </button>
                </li>
              ))}
            </ol>

            <div className="sandbox-flow-detail" aria-live="polite">
              <div>
                <span className="sandbox-detail-label">{selectedTrekkyStep.eyebrow}</span>
                <p>{selectedTrekkyStep.detail}</p>
              </div>
              <p className="sandbox-proof-note">{selectedTrekkyStep.note}</p>
            </div>
          </div>

          <dl className="sandbox-facts-grid">
            <div>
              <dt>Available through</dt>
              <dd>Web, installable app, extension &amp; AI tools</dd>
            </div>
            <div>
              <dt>Job discovery</dt>
              <dd>NZ · AU · US · Singapore</dd>
            </div>
            <div>
              <dt>You stay in control</dt>
              <dd>Review, then submit yourself</dd>
            </div>
          </dl>
        </div>

        <section className="sandbox-sidebar" aria-labelledby="sandbox-trekky-proof-title" tabIndex={0}>
          <span className="sandbox-tag">Coverage</span>
          <h4 id="sandbox-trekky-proof-title">One search, wherever you work.</h4>
          <ul className="sandbox-bullet-list">
            <li>
              <strong>Use it where you work:</strong> the web app, installable app,
              browser extension, and connected tools share one workflow.
            </li>
            <li>
              <strong>Keep the details together:</strong> tracking, contacts, calendar sync, and
              follow-ups stay connected.
            </li>
            <li>
              <strong>Stay in control:</strong> AI helps prepare an application;
              you review and submit it.
            </li>
          </ul>
          <p className="sandbox-sidebar-note">
            A look at what the product does and how its parts connect.
          </p>
        </section>
      </div>

      <div
        id="sandbox-panel-workbench"
        className="sandbox-body sandbox-workbench-view"
        role="tabpanel"
        aria-labelledby="sandbox-tab-workbench"
        hidden={activeTab !== "workbench"}
      >
        <div className="sandbox-stage" role="region" aria-label="Workbench architecture details" tabIndex={0}>
          <div className="sandbox-panel-head sandbox-panel-head--illustrated">
            <div className="sandbox-project-intro">
              <span className="sandbox-tag">Workbench · This portfolio</span>
              <h3>A desktop you can make your own.</h3>
              <p>
                Move windows, switch between tasks, and keep notes in Files. Your layout
                and saved work stay in this browser, with backups when you need them.
              </p>
            </div>
            <div className="sandbox-project-art" aria-hidden="true">
              <ProjectThumbnail id="workbench" title="BaiOS" subtitle="Desktop in a browser" />
            </div>
          </div>

          <div className="sandbox-architecture-shell">
            <div className="sandbox-architecture-status" aria-hidden="true">
              <span>Browser</span>
              <i />
              <span>Saved work</span>
              <i />
              <span>Recovery</span>
            </div>

            <div className="sandbox-layer-grid" role="group" aria-label="Workbench architecture layers">
              {WORKBENCH_LAYERS.map((layer, index) => (
                <button
                  key={layer.label}
                  type="button"
                  aria-pressed={activeWorkbenchLayer === index}
                  onClick={() => {
                    setActiveWorkbenchLayer(index);
                    playSound("click");
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{layer.label}</strong>
                </button>
              ))}
            </div>

            <div className="sandbox-layer-detail" aria-live="polite">
              <span className="sandbox-detail-label">{selectedWorkbenchLayer.label}</span>
              <h4>{selectedWorkbenchLayer.title}</h4>
              <p>{selectedWorkbenchLayer.detail}</p>
            </div>
          </div>
        </div>

        <section className="sandbox-sidebar" aria-labelledby="sandbox-local-boundary-title" tabIndex={0}>
          <span className="sandbox-tag">Saved in this browser</span>
          <h4 id="sandbox-local-boundary-title">Your files stay here.</h4>
          <p>
            Your desktop session and Files are saved on this device. Download a backup
            to keep a copy or move them to another browser. They do not sync automatically.
          </p>
          <dl className="sandbox-sidebar-facts">
            <div>
              <dt>Save</dt>
              <dd>Folders, notes, window state</dd>
            </div>
            <div>
              <dt>Back up</dt>
              <dd>Download a JSON file</dd>
            </div>
            <div>
              <dt>Recover</dt>
              <dd>Checked backups and older sessions</dd>
            </div>
          </dl>
        </section>
      </div>

      <div
        id="sandbox-panel-motion"
        className="sandbox-body sandbox-motion-view"
        role="tabpanel"
        aria-labelledby="sandbox-tab-motion"
        hidden={activeTab !== "motion"}
      >
        <div className="sandbox-stage" role="region" aria-label="Motion simulation controls" tabIndex={0}>
          <div className="sandbox-panel-head">
            <span className="sandbox-tag">Motion · A spring simulation</span>
            <h3>See how a spring settles.</h3>
            <p>
              Adjust stiffness and damping, then move the spring again to compare the
              response. The values describe this simulation.
            </p>
          </div>

          <div className="sandbox-canvas-container">
            <canvas
              ref={canvasRef}
              width={500}
              height={180}
              className="sandbox-spring-canvas"
              role="img"
              aria-label="Simulated spring weight moving toward a target line"
            >
              A local spring simulation moving a weight toward a target.
            </canvas>
            <span className="sandbox-canvas-state">
              {prefersReducedMotion ? "Reduced motion · resting state" : "F = −kx − dv"}
            </span>
          </div>

          <div className="sandbox-controls-cluster">
            <div className="sandbox-presets" role="group" aria-label="Spring presets">
              {(
                [
                  ["Bouncy", 320, 12],
                  ["Snappy", 420, 28],
                  ["Critical", 240, Math.round(2 * Math.sqrt(240))],
                  ["Floaty", 90, 18],
                ] as const
              ).map(([label, k, d]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={stiffness === k && damping === d}
                  onClick={() => {
                    setStiffness(k);
                    setDamping(d);
                    playSound("click");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="sandbox-slider-control">
              <div className="sandbox-slider-head">
                <label htmlFor="spring-stiffness">Stiffness (k)</label>
                <output htmlFor="spring-stiffness">{stiffness}</output>
              </div>
              <input
                id="spring-stiffness"
                name="spring-stiffness"
                type="range"
                min="50"
                max="500"
                value={stiffness}
                onChange={(event) => setStiffness(Number(event.target.value))}
              />
            </div>

            <div className="sandbox-slider-control">
              <div className="sandbox-slider-head">
                <label htmlFor="spring-damping">Damping (d)</label>
                <output htmlFor="spring-damping">{damping}</output>
              </div>
              <input
                id="spring-damping"
                name="spring-damping"
                type="range"
                min="5"
                max="60"
                value={damping}
                onChange={(event) => setDamping(Number(event.target.value))}
              />
            </div>

            <button
              type="button"
              className="sandbox-cta-pulse"
              onClick={() => {
                setSpringTrigger((trigger) => trigger + 1);
                playSound("snap");
              }}
            >
              Move the spring
            </button>
          </div>
        </div>

        <section className="sandbox-sidebar" aria-labelledby="sandbox-motion-limits-title" tabIndex={0}>
          <span className="sandbox-tag">How it works</span>
          <h4 id="sandbox-motion-limits-title">A small study in motion.</h4>
          <ul className="sandbox-bullet-list">
            <li>
              <strong>Adjust:</strong> sliders and presets change the spring while it moves.
            </li>
            <li>
              <strong>Watch:</strong> a Canvas drawing shows the spring slowing toward its target.
            </li>
            <li>
              <strong>Pause:</strong> drawing stops when hidden or once the spring settles.
            </li>
          </ul>
          <p className="sandbox-sidebar-note">
            With reduced motion enabled, the canvas resolves directly to its resting state.
          </p>
        </section>
      </div>
    </div>
  );
}
