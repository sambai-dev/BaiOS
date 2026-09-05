// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  parseWorkbenchDeepLink,
  type WorkbenchDeepLink,
} from "@/app/lib/workbench-deep-link";

const loadWorkbenchOverlay = () => import("@/app/components/WorkbenchOverlay");
const WorkbenchOverlay = dynamic(loadWorkbenchOverlay, { ssr: false });

function RollingClock({ time }: { time: string }) {
  return (
    <>
      <span key={time} className="clock-value" aria-hidden="true">
        {time}
      </span>
      <span className="sr-only">{time}</span>
    </>
  );
}

export default function PortfolioShell() {
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [isWorkbenchExiting, setIsWorkbenchExiting] = useState(false);
  const [hasOpenedWorkbench, setHasOpenedWorkbench] = useState(false);
  const [newZealandTime, setNewZealandTime] = useState("--:--");
  const [workbenchOrigin, setWorkbenchOrigin] = useState({ x: 72, y: 72 });
  const [deepLink, setDeepLink] = useState<WorkbenchDeepLink | null>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const workbenchInvokerRef = useRef<HTMLElement | null>(null);
  const workbenchPreloadTimerRef = useRef<number | null>(null);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    []
  );

  const openWorkbench = useCallback((invoker?: HTMLElement | null) => {
    if (workbenchPreloadTimerRef.current !== null) {
      window.clearTimeout(workbenchPreloadTimerRef.current);
      workbenchPreloadTimerRef.current = null;
    }
    void loadWorkbenchOverlay();
    workbenchInvokerRef.current =
      invoker?.isConnected ? invoker : openerRef.current;

    const apertureBounds = openerRef.current?.getBoundingClientRect();
    if (apertureBounds) {
      setWorkbenchOrigin({
        x: apertureBounds.left + apertureBounds.width / 2,
        y: apertureBounds.top + apertureBounds.height / 2,
      });
    }
    setHasOpenedWorkbench(true);
    setIsWorkbenchExiting(false);
    setIsWorkbenchOpen(true);
  }, []);

  const scheduleWorkbenchPreload = useCallback(() => {
    if (workbenchPreloadTimerRef.current !== null) return;
    workbenchPreloadTimerRef.current = window.setTimeout(() => {
      workbenchPreloadTimerRef.current = null;
      void loadWorkbenchOverlay();
    }, 120);
  }, []);

  const cancelWorkbenchPreload = useCallback(() => {
    if (workbenchPreloadTimerRef.current === null) return;
    window.clearTimeout(workbenchPreloadTimerRef.current);
    workbenchPreloadTimerRef.current = null;
  }, []);

  const closeWorkbench = useCallback(() => {
    setIsWorkbenchOpen(false);
    setIsWorkbenchExiting(true);
    setDeepLink(null);
    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      for (const parameter of ["app", "workspace", "open", "workbench"]) {
        nextUrl.searchParams.delete(parameter);
      }
      window.history.replaceState(
        window.history.state,
        "",
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
      );
    }
  }, []);

  const restoreWorkbenchFocus = useCallback(() => {
    const invoker = workbenchInvokerRef.current;
    if (invoker?.isConnected) {
      invoker.focus({ preventScroll: true });
    } else {
      openerRef.current?.focus({ preventScroll: true });
    }
    workbenchInvokerRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const link = parseWorkbenchDeepLink(window.location.search);
    if (link.requested) {
      const raf = window.requestAnimationFrame(() => {
        setDeepLink(link);
        openWorkbench();
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [openWorkbench]);

  useEffect(() => {
    const tick = () => setNewZealandTime(timeFormatter.format(new Date()));
    tick();
    let interval: number | undefined;
    // Align to the next minute boundary so the clock never sits up to 30s stale.
    const now = new Date();
    const msToNextMinute =
      (60 - now.getSeconds()) * 1_000 - now.getMilliseconds() + 250;
    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, Math.max(250, msToNextMinute));
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [timeFormatter]);

  useEffect(
    () => () => {
      if (workbenchPreloadTimerRef.current !== null) {
        window.clearTimeout(workbenchPreloadTimerRef.current);
      }
    },
    [],
  );

  const handleWorkbenchExitComplete = useCallback(() => {
    setIsWorkbenchExiting(false);
    restoreWorkbenchFocus();
  }, [restoreWorkbenchFocus]);

  // Keep the public surface inert (and scroll-locked) for the full overlay
  // lifecycle, including the exit reveal. Otherwise background links become
  // interactive while the Workbench is still animating out.
  const isBackgroundLocked = isWorkbenchOpen || isWorkbenchExiting;

  useEffect(() => {
    if (!isBackgroundLocked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isBackgroundLocked]);

  useEffect(() => {
    if (!isWorkbenchOpen) return;

    const syncWorkbenchOrigin = () => {
      const apertureBounds = openerRef.current?.getBoundingClientRect();
      if (!apertureBounds) return;
      setWorkbenchOrigin({
        x: apertureBounds.left + apertureBounds.width / 2,
        y: apertureBounds.top + apertureBounds.height / 2,
      });
    };

    window.addEventListener("resize", syncWorkbenchOrigin);
    return () => window.removeEventListener("resize", syncWorkbenchOrigin);
  }, [isWorkbenchOpen]);

  return (
    <main className="site-shell">
      <section
        className="public-surface"
        aria-label="Sam Bai portfolio"
        aria-hidden={isBackgroundLocked || undefined}
        inert={isBackgroundLocked ? true : undefined}
      >
        <a className="skip-link" href="#primary-links">
          Skip to links
        </a>

        <header className="public-header">
          <div className="identity-block">
            <p className="identity-name">Sam Bai</p>
            <p>Founder &amp; Product Engineer, Solynth Labs</p>
            <p>Hamilton, New Zealand</p>
            <p className="identity-time">
              <span aria-hidden="true">NZT ·&nbsp;</span>
              <span>
                <RollingClock time={newZealandTime} />
              </span>
            </p>
          </div>

          <button
            ref={openerRef}
            type="button"
            className="workbench-aperture"
            onClick={(event) => openWorkbench(event.currentTarget)}
            onFocus={() => void loadWorkbenchOverlay()}
            onMouseEnter={scheduleWorkbenchPreload}
            onMouseLeave={cancelWorkbenchPreload}
            aria-label="Open the Workbench"
            aria-haspopup="dialog"
            aria-expanded={isWorkbenchOpen}
          >
            <span className="aperture-bar">
              <span>Workbench</span>
              <span className="live-state">
                <span className="live-dot" aria-hidden="true" />
                <span aria-hidden="true">Open</span>
              </span>
            </span>
            <span className="aperture-body" aria-hidden="true">
              <span className="aperture-column">
                <span>Work</span>
                <span>Playground</span>
                <span>Notes</span>
              </span>
              <span className="aperture-signal">
                <span>Projects &amp; process</span>
                <span>Tools &amp; experiments</span>
                <span>Saved in this browser</span>
              </span>
            </span>
            <span className="aperture-action">Open Workbench</span>
          </button>
        </header>

        <div className="hero-cluster">
          <h1
            className="hero-statement"
            aria-label="Sam designs and builds software."
          >
            <span className="hero-opening">Sam designs</span>{" "}
            <span className="hero-conjunction">and</span>{" "}
            <span className="hero-build">builds software<span className="hero-period" aria-hidden="true">.</span></span>
          </h1>
          <p className="hero-coordinates" aria-hidden="true">
            37.7889°S · 175.4646°E · Hamilton NZ
          </p>
        </div>

        <div className="public-index" id="primary-links">
          <div className="index-intro">
            <p className="index-label">Site</p>
            <p className="index-statement">
              A personal site: engineering thinking, design, and working
              experiments.
            </p>
          </div>

          <nav className="index-group" aria-label="Primary links">
            <p className="index-label" aria-hidden="true">
              Direct
            </p>
            <a
              className="index-link index-link--email"
              href="mailto:sambai.codes@gmail.com?subject=Hello"
              aria-label="Email Sam"
            >
              <span className="index-link-text">sambai.codes@gmail.com</span>
              <span className="index-arrow" aria-hidden="true">
                →
              </span>
            </a>
            <a
              className="index-link"
              href="https://solynthlabs.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="index-link-text">Solynth Labs</span>
              <span className="index-arrow" aria-hidden="true">
                →
              </span>
            </a>
            <button
              className="index-link"
              type="button"
              onClick={(event) => openWorkbench(event.currentTarget)}
              onFocus={() => void loadWorkbenchOverlay()}
              onMouseEnter={scheduleWorkbenchPreload}
              onMouseLeave={cancelWorkbenchPreload}
            >
              <span className="index-link-text">Open Workbench</span>
              <span className="index-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </nav>

          <nav className="index-group" aria-label="Social and résumé links">
            <p className="index-label" aria-hidden="true">
              Elsewhere
            </p>
            <a
              className="index-link"
              href="https://github.com/sambai-dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="index-link-text">GitHub</span>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <a
              className="index-link"
              href="https://github.com/sambai-dev/BaiOS"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="index-link-text">BaiOS Source</span>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <a
              className="index-link"
              href="https://www.linkedin.com/in/sam-bai1/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="index-link-text">LinkedIn</span>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <a
              className="index-link"
              href="/resume/SamBai_Resume.8aa80702.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="index-link-text">Résumé</span>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </nav>
        </div>
      </section>

      {hasOpenedWorkbench && (
        <WorkbenchOverlay
          deepLink={deepLink}
          onClose={closeWorkbench}
          onExitComplete={handleWorkbenchExitComplete}
          open={isWorkbenchOpen}
          revealOrigin={workbenchOrigin}
          time={newZealandTime}
        />
      )}
    </main>
  );
}
