// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { createDive, DIVE_GATE_COUNT, DIVE_ZONES, stepDive, activateSonar, type DiveControls } from "../lib/subsurface-engine";
import type { DiveRenderer } from "../lib/subsurface-scene";
import "../styles/subsurface-lab.css";

type GameStatus = "idle" | "playing" | "paused" | "lost" | "complete";
type SubsurfaceLabProps = { isActive: boolean; prefersReducedMotion: boolean; themeId: string };
const BEST_SCORE_KEY = "sam-workbench-subsurface-best-v1";

export default function SubsurfaceLab({ isActive, prefersReducedMotion, themeId }: SubsurfaceLabProps) {
  const sceneHostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<DiveRenderer | null>(null);
  const modelRef = useRef(createDive());
  const controlsRef = useRef<DiveControls>({ rise: false, dive: false });
  const [status, setStatus] = useState<GameStatus>("idle");
  const [best, setBest] = useState(0);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hud, setHud] = useState({ score: 0, samples: 0, combo: 0, hull: 3, shield: true, passed: 0, zone: 0, feedback: "", elapsed: 0 });
  const bestRef = useRef(0);

  const updateHUD = useCallback(() => {
    const model = modelRef.current;
    setHud({ score: model.score, samples: model.samples, combo: model.combo, hull: model.hull, shield: model.shield, passed: model.passed, zone: model.zone, feedback: model.feedbackTime > 0 ? model.feedback : "", elapsed: model.elapsed });
  }, []);

  useEffect(() => {
    let hydrationFrame = 0;
    try {
      const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        bestRef.current = saved;
        hydrationFrame = requestAnimationFrame(() => setBest(saved));
      }
    } catch { /* Storage is optional. */ }
    return () => cancelAnimationFrame(hydrationFrame);
  }, []);

  useEffect(() => {
    const suspend = () => {
      controlsRef.current = { rise: false, dive: false };
      setStatus((current) => current === "playing" ? "paused" : current);
    };
    const visibility = () => { setVisible(!document.hidden); if (document.hidden) suspend(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", suspend);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", suspend);
    };
  }, []);

  useEffect(() => {
    if (isActive) return;
    controlsRef.current = { rise: false, dive: false };
    const frame = requestAnimationFrame(() => setStatus((current) => current === "playing" ? "paused" : current));
    return () => cancelAnimationFrame(frame);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !visible) return;
    const host = sceneHostRef.current;
    if (!host) return;
    let disposed = false;
    let scene: DiveRenderer | null = null;
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { scene?.resize(); scene?.draw(modelRef.current, prefersReducedMotion); });
    });
    void import("../lib/subsurface-scene").then(({ createDiveRenderer }) => {
      if (disposed) return;
      scene = createDiveRenderer(host);
      rendererRef.current = scene;
      scene.draw(modelRef.current, prefersReducedMotion);
      observer.observe(host);
      setReady(true);
    });
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      scene?.dispose();
      if (rendererRef.current === scene) rendererRef.current = null;
    };
  }, [isActive, visible, prefersReducedMotion, themeId]);

  useEffect(() => {
    if (!isActive || !visible || status !== "playing") return;
    let frame = 0;
    let last = performance.now();
    let lastHUD = 0;
    const loop = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      if (rendererRef.current) {
        stepDive(modelRef.current, controlsRef.current, delta);
        rendererRef.current.draw(modelRef.current, prefersReducedMotion);
        const model = modelRef.current;
        if (now - lastHUD > 90 || model.outcome !== "playing") { updateHUD(); lastHUD = now; }
        if (model.outcome !== "playing") {
          controlsRef.current = { rise: false, dive: false };
          let stored = 0;
          try { stored = Number(window.localStorage.getItem(BEST_SCORE_KEY)) || 0; } catch { /* Optional. */ }
          const nextBest = Math.max(Number.isFinite(stored) ? stored : 0, bestRef.current, model.score);
          bestRef.current = nextBest;
          setBest(nextBest);
          try { window.localStorage.setItem(BEST_SCORE_KEY, String(nextBest)); } catch { /* Optional. */ }
          setStatus(model.outcome);
          return;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isActive, visible, status, prefersReducedMotion, updateHUD]);

  const start = () => {
    modelRef.current = createDive(Math.floor(Date.now() % 4294967296));
    controlsRef.current = { rise: false, dive: false };
    updateHUD();
    setStatus("playing");
    surfaceRef.current?.focus({ preventScroll: true });
  };
  const pause = () => {
    controlsRef.current = { rise: false, dive: false };
    setStatus("paused");
  };
  const resume = () => {
    controlsRef.current = { rise: false, dive: false };
    setStatus("playing");
    surfaceRef.current?.focus({ preventScroll: true });
  };
  const sonar = () => {
    if (status === "playing" && activateSonar(modelRef.current)) updateHUD();
    surfaceRef.current?.focus({ preventScroll: true });
  };
  const handleKey = (event: KeyboardEvent<HTMLDivElement>, down: boolean) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "w", "arrowdown", "s", "p", "e"].includes(key)) {
      event.preventDefault(); event.stopPropagation();
      if (key === "p" && down && !event.repeat) { if (status === "playing") pause(); else if (status === "paused") resume(); return; }
      if (key === "e" && down && !event.repeat) { sonar(); return; }
      if (status !== "playing") return;
      if ([" ", "arrowup", "w"].includes(key)) controlsRef.current.rise = down;
      if (["arrowdown", "s"].includes(key)) controlsRef.current.dive = down;
    }
  };
  const hold = (event: PointerEvent<HTMLElement>) => {
    if (status !== "playing") return;
    if (event.currentTarget === surfaceRef.current && (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    controlsRef.current.rise = true;
    surfaceRef.current?.focus({ preventScroll: true });
  };
  const release = () => { controlsRef.current.rise = false; };
  const playing = status === "playing";
  const ended = status === "lost" || status === "complete";
  const depth = Math.round(120 + hud.passed / DIVE_GATE_COUNT * 1080);

  return (
    <div className="subsurface-expedition" data-game-status={status}>
      <header className="subsurface-heading">
        <div><span className="subsurface-mark" aria-hidden="true">◉</span><h2>Subsurface</h2><span className="subsurface-edition">Deep-sea expedition</span></div>
        <span className="subsurface-best">Personal best <b>{best.toLocaleString()}</b></span>
      </header>
      <div ref={surfaceRef} className="subsurface-stage" tabIndex={0} role="group" aria-roledescription="game"
        aria-label="Subsurface. Hold Space or Up to rise; release to descend. Down to dive faster. E for sonar shield. P to pause."
        aria-keyshortcuts="Space ArrowUp ArrowDown E P" onKeyDown={(event) => handleKey(event, true)} onKeyUp={(event) => handleKey(event, false)}
        onPointerDown={hold} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) controlsRef.current = { rise: false, dive: false }; }}>
        <div ref={sceneHostRef} className="subsurface-scene" />
        <div className="subsurface-vignette" aria-hidden="true" />
        <div className="subsurface-instruments">
          <div className="subsurface-location"><span>{String(hud.zone + 1).padStart(2, "0")} / {DIVE_ZONES[hud.zone]}</span><strong>{depth}<small>m</small></strong></div>
          <div className="subsurface-telemetry">
            <span className="subsurface-hull" aria-label={`Hull: ${hud.hull} of 3`}><span>Hull</span>{[1, 2, 3].map((part) => <i key={part} className={part <= hud.hull ? "is-intact" : ""} />)}</span>
            <span className="subsurface-specimens"><b>{String(hud.samples).padStart(2, "0")}</b> specimens</span>
            {playing && <button type="button" className="subsurface-pause" onClick={pause} aria-label="Pause dive">Ⅱ</button>}
          </div>
        </div>
        <div className="subsurface-route" aria-label={`${hud.passed} of ${DIVE_GATE_COUNT} channels cleared`}>
          {Array.from({ length: DIVE_GATE_COUNT }, (_, i) => <i key={i} className={i < hud.passed ? "is-cleared" : ""} />)}
        </div>
        {status !== "playing" && (
          <div className={`subsurface-briefing ${ended ? "is-result" : ""}`}>
            <span className="subsurface-kicker">{status === "paused" ? "Take your time" : status === "complete" ? "Expedition complete" : status === "lost" ? "Back on the surface" : "An expedition into the unknown"}</span>
            <h3>{status === "paused" ? "A moment of quiet." : status === "complete" ? "The deep is yours." : status === "lost" ? "There’s more down there." : <>Go a little<br />deeper.</>}</h3>
            <p>{status === "paused" ? "Your dive is right where you left it." : ended ? `${hud.samples} specimens recovered across ${hud.passed} channels. ${status === "complete" ? "All three zones explored." : "Keep a steady depth and follow the amber specimens."}` : "Pilot a research sub through three underwater worlds. Follow the amber specimens. Make it back in one piece."}</p>
            {ended && <div className="subsurface-results"><strong>{hud.score.toLocaleString()}<span>Expedition score</span></strong><strong>{Math.floor(hud.elapsed)}s<span>Time underwater</span></strong></div>}
            <button type="button" className="subsurface-primary" disabled={!ready} onClick={status === "paused" ? resume : start}>
              {status === "paused" ? "Resume dive" : ended ? "Explore again" : ready ? "Begin expedition" : "Preparing the sub…"}<span aria-hidden="true">↗</span>
            </button>
            {status === "idle" && <div className="subsurface-legend"><span><i />Amber: specimens</span><span><i />Mint: repair + sonar</span></div>}
          </div>
        )}
        {playing && <div className="subsurface-live-footer"><span className="subsurface-feedback">{hud.feedback || `${DIVE_GATE_COUNT - hud.passed} channels to the surface station`}</span><strong>{hud.score.toLocaleString()} <small>pts</small></strong></div>}
        <span className="sr-only" role="status">{ended ? `${status === "complete" ? "Expedition complete" : "Dive ended"}. Score ${hud.score}. ${hud.samples} specimens.` : status === "paused" ? "Dive paused." : ""}</span>
      </div>
      <footer className="subsurface-controls">
        <button type="button" className="subsurface-rise" disabled={!playing} onPointerDown={hold} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
          onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); controlsRef.current.rise = true; } }}
          onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); release(); } }}
          onBlur={release}>↑ <span>Hold to rise</span></button>
        <p>Release to descend<span>Space / ↑ rise · ↓ dive · P pause</span></p>
        <button type="button" className="subsurface-sonar" disabled={!playing || !hud.shield} onClick={sonar}><span aria-hidden="true">◎</span><span>{hud.shield ? "Sonar shield" : "Sonar used"}<small>{hud.shield ? "3s protection · E" : "Recharge at mint ring"}</small></span></button>
      </footer>
    </div>
  );
}
