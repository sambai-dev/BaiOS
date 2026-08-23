"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  parseWorkbenchDeepLink,
  type WorkbenchDeepLink,
} from "@/app/lib/workbench-deep-link";

const loadWorkbenchOS = () => import("@/app/components/WorkbenchOS");
const WorkbenchOS = dynamic(loadWorkbenchOS, { ssr: false });

const CLOCK_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function RollingClock({
  time,
  reducedMotion,
}: {
  time: string;
  reducedMotion: boolean;
}) {
  const [display, setDisplay] = useState("00:00");
  const [settled, setSettled] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(time);
      return;
    }
    const randomPair = () =>
      `${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    const scramble = `${randomPair()}:${randomPair()}`;
    const first = window.setTimeout(() => setDisplay(scramble), 140);
    const second = window.setTimeout(() => {
      setDisplay(time);
      setSettled(true);
    }, 360);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settled) {
      setDisplay(time);
    }
  }, [settled, time]);

  return (
    <>
      <span className="odo-row" aria-hidden="true">
        {display.split("").map((character, index) =>
          character === ":" ? (
            <span key={`${character}-${index}`} className="odo-colon">
              :
            </span>
          ) : (
            <span key={`${character}-${index}`} className="odo-digit">
              <span
                className="odo-strip"
                style={{
                  transform: `translateY(-${Number(character)}em)`,
                }}
              >
                {CLOCK_DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          ),
        )}
      </span>
      <span className="sr-only">{time}</span>
    </>
  );
}

export default function PortfolioShell() {
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [newZealandTime, setNewZealandTime] = useState("--:--");
  const [workbenchOrigin, setWorkbenchOrigin] = useState({ x: 72, y: 72 });
  const [deepLink, setDeepLink] = useState<WorkbenchDeepLink | null>(null);
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
    setDeepLink(null);
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
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
        <header className="public-header">
          <div className="identity-block">
            <p className="identity-name">Sam Bai</p>
            <p>Founder, Solynth Labs</p>
            <p>Hamilton, New Zealand</p>
            <p className="identity-time">
              <span aria-hidden="true">NZT ·&nbsp;</span>
              <RollingClock
                time={newZealandTime}
                reducedMotion={Boolean(prefersReducedMotion)}
              />
              <span className="sr-only">
                <time
                  dateTime={
                    newZealandTime === "--:--" ? undefined : newZealandTime
                  }
                >
                  NZT · {newZealandTime}
                </time>
              </span>
            </p>
          </div>

          <button
            ref={openerRef}
            type="button"
            className="workbench-aperture"
            onClick={openWorkbench}
            onFocus={() => void loadWorkbenchOS()}
            onMouseEnter={() => void loadWorkbenchOS()}
            aria-label="Open Sam's Workbench (keyboard shortcut W)"
            aria-haspopup="dialog"
            aria-expanded={isWorkbenchOpen}
          >
            <span className="aperture-bar">
              <span>Workbench</span>
              <span className="live-state">
                <span className="live-dot" aria-hidden="true" />
                <kbd className="aperture-key" aria-hidden="true">W</kbd>
              </span>
            </span>
            <span className="aperture-body" aria-hidden="true">
              <span className="aperture-column">
                <span>BUILD / 03</span>
                <span>FIELD / 03</span>
                <span>NOTES / 02</span>
              </span>
              <span className="aperture-signal">
                <span>ATLAS / READY</span>
                <span>ARCHIVE / LOCAL</span>
                <span>15 APPS / {newZealandTime}</span>
              </span>
            </span>
            <span className="aperture-action">Enter the local system</span>
          </button>
        </header>

        <div className="hero-cluster">
          <h1
            className="hero-statement"
            aria-label="Sam designs and builds software."
          >
            <span className="hero-line">
              <span className="hero-line-inner">Sam designs and</span>
            </span>
            <span className="hero-line">
              <span className="hero-line-inner">
                builds software
                <span className="hero-period" aria-hidden="true">
                  .
                </span>
              </span>
            </span>
          </h1>
          <p className="hero-coordinates" aria-hidden="true">
            37.7889°S · 175.4646°E · Hamilton NZ
          </p>
        </div>

        <div className="public-index" id="primary-links">
          <div className="index-intro">
            <p className="index-label">Status</p>
            <p className="index-statement">
              Open for select B2B software projects.
            </p>
          </div>

          <nav className="index-group" aria-label="Primary links">
            <p className="index-label" aria-hidden="true">
              Direct
            </p>
            <a
              className="index-link index-link--email"
              href="https://mail.google.com/mail/?view=cm&fs=1&to=sambai.codes%40gmail.com&su=Project%20enquiry"
              target="_blank"
              rel="noreferrer"
              aria-label="Email sambai.codes@gmail.com about a project in Gmail"
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
              rel="noreferrer"
            >
              <span className="index-link-text">Solynth Labs</span>
              <span className="index-arrow" aria-hidden="true">
                →
              </span>
            </a>
            <button
              className="index-link"
              type="button"
              onClick={openWorkbench}
              onFocus={() => void loadWorkbenchOS()}
              onMouseEnter={() => void loadWorkbenchOS()}
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
              rel="noreferrer"
            >
              <span className="index-link-text">GitHub</span>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <a
              className="index-link"
              href="https://www.linkedin.com/in/sam-bai-dev/"
              target="_blank"
              rel="noreferrer"
            >
              <span className="index-link-text">LinkedIn</span>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <a
              className="index-link"
              href="/resume/SamBai_Resume.pdf?v=ba5b8288"
              target="_blank"
              rel="noreferrer"
            >
              <span className="index-link-text">Résumé</span>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </nav>
        </div>
      </section>

      <AnimatePresence onExitComplete={restoreWorkbenchFocus}>
        {isWorkbenchOpen && (
          <WorkbenchOS
            closeButtonRef={closeRef}
            deepLink={deepLink}
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
