"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const loadWorkbenchOS = () => import("@/app/components/WorkbenchOS");
const WorkbenchOS = dynamic(loadWorkbenchOS, { ssr: false });

const externalLinks = [
  { label: "GitHub", href: "https://github.com/sambai-dev" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sam-bai-dev/" },
  { label: "Résumé", href: "/resume/SamBai_Resume.pdf" },
];

export default function PortfolioShell() {
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [newZealandTime, setNewZealandTime] = useState("--:--");
  const prefersReducedMotion = useReducedMotion();
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
    setIsWorkbenchOpen(true);
  }, []);

  const closeWorkbench = useCallback(() => {
    setIsWorkbenchOpen(false);
    window.setTimeout(() => openerRef.current?.focus(), 80);
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
            <span>Workbench [W]</span>
            <span className="live-state">
              <span className="live-dot" aria-hidden="true" /> Live
            </span>
          </span>
          <span className="aperture-body" aria-hidden="true">
            <span className="aperture-column">
              <span>NOW</span>
              <span>METHOD</span>
              <span>TOOLKIT</span>
            </span>
            <span className="aperture-signal">
              <span>SOLYNTH / OPERATING</span>
              <span>TREKKY / CURRENT</span>
              <span>Hamilton / {newZealandTime}</span>
            </span>
          </span>
          <span className="aperture-action">Open the personal layer</span>
        </button>

        <h1 className="hero-statement">
          <span>Sam is building</span>
          <a
            href="https://solynthlabs.com"
            target="_blank"
            rel="noreferrer"
          >
            Solynth Labs.
          </a>
        </h1>

        <div className="public-index" id="primary-links">
          <div className="index-intro">
            <p>Software consultation and production.</p>
            <p className="index-status">
              Hamilton {newZealandTime} · Workbench online
            </p>
          </div>

          <nav className="index-group" aria-label="Primary links">
            <p className="index-label">Go</p>
            <a
              className="index-link"
              href="https://solynthlabs.com"
              target="_blank"
              rel="noreferrer"
            >
              Visit Solynth Labs
            </a>
            <button
              className="index-link"
              type="button"
              onClick={openWorkbench}
              onFocus={() => void loadWorkbenchOS()}
              onMouseEnter={() => void loadWorkbenchOS()}
            >
              Explore Workbench
            </button>
          </nav>

          <div className="index-group">
            <p className="index-label">Current</p>
            <a
              className="index-link"
              href="https://solynthlabs.com"
              target="_blank"
              rel="noreferrer"
            >
              Solynth Labs
            </a>
            <a
              className="index-link"
              href="https://trekky.app"
              target="_blank"
              rel="noreferrer"
            >
              Trekky.app
            </a>
          </div>

          <nav className="index-group" aria-label="Social and contact links">
            <p className="index-label">Connect</p>
            <a className="index-link" href="mailto:sambai.codes@gmail.com">
              Email
            </a>
            {externalLinks.map((link) => (
              <a
                className="index-link"
                href={link.href}
                key={link.label}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <AnimatePresence>
        {isWorkbenchOpen && (
          <WorkbenchOS
            closeButtonRef={closeRef}
            onClose={closeWorkbench}
            prefersReducedMotion={Boolean(prefersReducedMotion)}
            time={newZealandTime}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
