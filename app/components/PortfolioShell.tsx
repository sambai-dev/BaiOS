"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const loadWorkbenchOS = () => import("@/app/components/WorkbenchOS");
const WorkbenchOS = dynamic(loadWorkbenchOS, { ssr: false });

export default function PortfolioShell() {
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [newZealandTime, setNewZealandTime] = useState("--:--");
  const [workbenchOrigin, setWorkbenchOrigin] = useState({ x: 72, y: 72 });
  const prefersReducedMotion = useReducedMotion();
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const workbenchInvokerRef = useRef<HTMLElement | null>(null);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    []
  );

  const openWorkbench = useCallback(() => {
    void loadWorkbenchOS();
    const activeElement = document.activeElement;
    workbenchInvokerRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : openerRef.current;

    const apertureBounds = openerRef.current?.getBoundingClientRect();
    if (apertureBounds) {
      setWorkbenchOrigin({
        x: apertureBounds.left + apertureBounds.width / 2,
        y: apertureBounds.top + apertureBounds.height / 2,
      });
    }
    setIsWorkbenchOpen(true);
  }, []);

  const closeWorkbench = useCallback(() => {
    setIsWorkbenchOpen(false);
  }, []);

  const restoreWorkbenchFocus = useCallback(() => {
    const invoker = workbenchInvokerRef.current;
    if (invoker?.isConnected) {
      invoker.focus();
    } else {
      openerRef.current?.focus();
    }
    workbenchInvokerRef.current = null;
  }, []);

  useEffect(() => {
    const tick = () => setNewZealandTime(timeFormatter.format(new Date()));
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, [timeFormatter]);

  useEffect(() => {
    if (!isWorkbenchOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isWorkbenchOpen]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isWorkbenchOpen && event.key.toLowerCase() === "w") {
        event.preventDefault();
        openWorkbench();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeWorkbench, isWorkbenchOpen, openWorkbench]);

  return (
    <main className="site-shell">
      <a className="skip-link" href="#primary-links">
        Skip to links
      </a>

      <section
        className="public-surface"
        aria-label="Sam Bai portfolio"
        aria-hidden={isWorkbenchOpen || undefined}
        inert={isWorkbenchOpen ? true : undefined}
      >
        <header className="identity-block">
          <p className="identity-name">Sam Bai</p>
          <p>Founder, Solynth Labs</p>
          <p>Hamilton, New Zealand</p>
        </header>

        <button
          ref={openerRef}
          type="button"
          className="workbench-aperture"
          onClick={openWorkbench}
          onFocus={() => void loadWorkbenchOS()}
          onMouseEnter={() => void loadWorkbenchOS()}
          aria-label="Open Sam's Workbench"
          aria-haspopup="dialog"
          aria-expanded={isWorkbenchOpen}
        >
          <span className="aperture-bar">
            <span>S/B · Workbench [W]</span>
            <span className="live-state">
              <span className="live-dot" aria-hidden="true" /> Live
            </span>
          </span>
          <span className="aperture-body" aria-hidden="true">
            <span className="aperture-column">
              <span>BUILD / 03</span>
              <span>FIELD / 02</span>
              <span>NOTES / 02</span>
            </span>
            <span className="aperture-signal">
              <span>ATLAS / READY</span>
              <span>ARCHIVE / LOCAL</span>
              <span>11 APPS / {newZealandTime}</span>
            </span>
          </span>
          <span className="aperture-action">Enter the local system</span>
        </button>

        <div className="hero-cluster">
          <h1
            className="hero-statement"
            aria-label="Sam designs and builds software."
          >
            <span>
              Sam{" "}
              <button
                className="hero-route hero-route--workbench"
                type="button"
                onClick={openWorkbench}
                onFocus={() => void loadWorkbenchOS()}
                onMouseEnter={() => void loadWorkbenchOS()}
                aria-label="Open Workbench"
              >
                designs
              </button>{" "}
              and
            </span>
            <span>
              builds{" "}
              <a
                className="hero-route hero-route--solynth"
                href="https://solynthlabs.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit Solynth Labs"
              >
                software
              </a>
              .
            </span>
          </h1>
        </div>

        <div className="public-index" id="primary-links">
          <div className="index-intro">
            <p>Open for select B2B software projects.</p>
          </div>

          <nav className="index-group" aria-label="Primary links">
            <a className="index-link" href="mailto:sambai.codes@gmail.com">
              Discuss a project
            </a>
            <a
              className="index-link"
              href="https://solynthlabs.com"
              target="_blank"
              rel="noreferrer"
            >
              Solynth Labs
            </a>
            <button
              className="index-link"
              type="button"
              onClick={openWorkbench}
              onFocus={() => void loadWorkbenchOS()}
              onMouseEnter={() => void loadWorkbenchOS()}
            >
              Open Workbench
            </button>
          </nav>

          <nav className="index-group" aria-label="Social and résumé links">
            <a
              className="index-link"
              href="https://github.com/sambai-dev"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="index-link"
              href="https://www.linkedin.com/in/sam-bai-dev/"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
            <a
              className="index-link"
              href="/resume/SamBai_Resume.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Résumé
            </a>
          </nav>
        </div>
      </section>

      <AnimatePresence onExitComplete={restoreWorkbenchFocus}>
        {isWorkbenchOpen && (
          <WorkbenchOS
            closeButtonRef={closeRef}
            onClose={closeWorkbench}
            prefersReducedMotion={Boolean(prefersReducedMotion)}
            revealOrigin={workbenchOrigin}
            time={newZealandTime}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
