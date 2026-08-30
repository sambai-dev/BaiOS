// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import "@/app/styles/case-study-sandbox-app.css";

import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
    eyebrow: "Multi-market discovery",
    detail:
      "Job sources across New Zealand, Australia, the United States, and Singapore feed one discovery workflow.",
    note: "Duplicate handling and source history keep imported listings reviewable.",
  },
  {
    label: "Organize",
    eyebrow: "One working system",
    detail:
      "Tracking, contacts, follow-ups, analytics, and Google sync stay connected across the job-search workflow.",
    note: "The product spans web, PWA, an MV3 extension, and authenticated MCP.",
  },
  {
    label: "Prepare",
    eyebrow: "AI-assisted, human-led",
    detail:
      "AI apply kits help prepare application material while the final submission remains with the user.",
    note: "Automation is review-first: the system assists, and the user submits.",
  },
  {
    label: "Follow through",
    eyebrow: "Calendar-connected follow-up",
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
    title: "Typed, versioned local state",
    detail:
      "The session records workspace, window geometry, theme, app data, and the shared editable Archive tree.",
  },
  {
    label: "Commit",
    title: "Session and Archive move together",
    detail:
      "A content-derived revision commits both stores as one envelope and exposes competing edits from another tab.",
  },
  {
    label: "Recovery",
    title: "Validation before replacement",
    detail:
      "Versioned JSON backups are schema-checked before import; migration and corrupt-state recovery preserve a safe path back.",
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
          <span className="sandbox-header-index">Systems / 03</span>
          <h2>Systems &amp; experiments.</h2>
          <p>Documented product systems beside one clearly labeled local simulation.</p>
        </div>
        <div className="sandbox-tabs" role="tablist" aria-label="System and experiment views">
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
      </header>

      <div
        id="sandbox-panel-trekky"
        className="sandbox-body sandbox-trekky-view"
        role="tabpanel"
        aria-labelledby="sandbox-tab-trekky"
        hidden={activeTab !== "trekky"}
      >
        <div className="sandbox-stage" role="region" aria-label="Trekky system details" tabIndex={0}>
          <div className="sandbox-panel-head">
            <span className="sandbox-tag">Owned product · documented scope</span>
            <h3>Trekky job-search workflow engine.</h3>
            <p>
              A live Next.js, React, and TypeScript product operated across web, PWA,
              an MV3 extension, and authenticated MCP.
            </p>
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
              <dt>Product surfaces</dt>
              <dd>Web · PWA · MV3 · MCP</dd>
            </div>
            <div>
              <dt>Discovery markets</dt>
              <dd>NZ · AU · US · Singapore</dd>
            </div>
            <div>
              <dt>Automation boundary</dt>
              <dd>Review first; users submit</dd>
            </div>
          </dl>
        </div>

        <section className="sandbox-sidebar" aria-labelledby="sandbox-trekky-proof-title" tabIndex={0}>
          <span className="sandbox-tag">Coverage</span>
          <h4 id="sandbox-trekky-proof-title">One workflow across four product surfaces.</h4>
          <ul className="sandbox-bullet-list">
            <li>
              <strong>Multiple surfaces:</strong> one workflow reaches web, installable,
              extension, and authenticated tool contexts.
            </li>
            <li>
              <strong>Workflow continuity:</strong> tracking, contacts, calendar sync, and
              follow-ups stay connected.
            </li>
            <li>
              <strong>Human control:</strong> AI helps prepare work without submitting on a
              person&apos;s behalf.
            </li>
          </ul>
          <p className="sandbox-sidebar-note">
            This view shows documented build scope. Product outcomes and performance measurements
            are not included.
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
          <div className="sandbox-panel-head">
            <span className="sandbox-tag">This portfolio · observable architecture</span>
            <h3>Browser-local state with a recovery path.</h3>
            <p>
              The surrounding Workbench is the proof: a typed window system, editable Archive,
              atomic local commits, and validated backup controls.
            </p>
          </div>

          <div className="sandbox-architecture-shell">
            <div className="sandbox-architecture-status" aria-hidden="true">
              <span>Browser</span>
              <i />
              <span>Committed state</span>
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
          <span className="sandbox-tag">Local means local</span>
          <h4 id="sandbox-local-boundary-title">A precise persistence boundary.</h4>
          <p>
            Workbench session and Archive data stay in this browser. They are not uploaded and do
            not imply an account, remote sync, or cross-device storage.
          </p>
          <dl className="sandbox-sidebar-facts">
            <div>
              <dt>Editable</dt>
              <dd>Folders, notes, window state</dd>
            </div>
            <div>
              <dt>Portable</dt>
              <dd>Visitor-triggered JSON backup</dd>
            </div>
            <div>
              <dt>Defensive</dt>
              <dd>Validation, conflicts, migration</dd>
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
            <span className="sandbox-tag">Local simulation · editable parameters</span>
            <h3>Spring response, made inspectable.</h3>
            <p>
              Tune stiffness and damping while the spring moves, then trigger a new impulse to
              compare the response. Values below describe this demo only.
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
              Trigger impulse
            </button>
          </div>
        </div>

        <section className="sandbox-sidebar" aria-labelledby="sandbox-motion-limits-title" tabIndex={0}>
          <span className="sandbox-tag">Observable behavior</span>
          <h4 id="sandbox-motion-limits-title">A simulation with clear limits.</h4>
          <ul className="sandbox-bullet-list">
            <li>
              <strong>Inputs:</strong> sliders and presets tune the active trajectory without
              starting it again.
            </li>
            <li>
              <strong>Integration:</strong> the demo advances a damped spring on Canvas.
            </li>
            <li>
              <strong>Lifecycle:</strong> drawing pauses when hidden and stops once the spring
              settles.
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
