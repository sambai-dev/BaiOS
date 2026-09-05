// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.
"use client";
import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { type RunnerModel, type RunnerStatus, initialModel, updateModel, asLane, requestJump, requestDuck, activateBurst, EVENT_CELL, EVENT_SHIELD, EVENT_IMPACT, EVENT_DAMAGE, EVENT_CHECKPOINT, EVENT_FLIGHT, EVENT_MAGNET, FLIGHT_DURATION, MAGNET_DURATION } from "../lib/railshift-engine";
import type { RailshiftScene } from "../lib/railshift-scene";
import { getRailshiftDistrict } from "../lib/railshift-route";
import "../styles/railshift-lab.css";

type RailshiftLabProps = { isActive: boolean; prefersReducedMotion: boolean; themeId: string; };
const BEST_SCORE_KEY = "sam-workbench-railshift-best-v1";
const BEST_DISTANCE_KEY = "sam-workbench-railshift-best-distance-v1";
const FIXED_STEP = 1 / 60;
const RENDER_STEP_MS = 1000 / 60;
const DISTRICTS = { downtown: "City centre", waterfront: "Waterfront", park: "Amusement park" };
function hudFromModel(model: RunnerModel, fps: number) {
  return { score: Math.floor(model.score), distance: Math.floor(model.distance), combo: model.combo,
    cells: model.cells, shield: model.shield, fps: Math.round(fps), hull: model.hull,
    district: model.district, checkpoints: model.checkpoints, energy: model.energy, burstTimer: model.burstTimer,
    flightTimer: model.flightTimer, flightHeight: model.flightHeight, magnetTimer: model.magnetTimer, elapsed: model.elapsed,
    message: model.messageTimer > 0 ? model.message : "", tutorial: model.tutorialTimer > 0 ? model.tutorial : "",
    endCause: model.endCause, bestStreak: model.bestStreak };
}
type RunnerHud = ReturnType<typeof hudFromModel>;
const EMPTY_HUD: RunnerHud = { score: 0, distance: 0, combo: 1, cells: 0, shield: 0, fps: 60, hull: 2, district: 0, checkpoints: 0, energy: 0, burstTimer: 0, message: "", tutorial: "", endCause: "", bestStreak: 0, flightTimer: 0, flightHeight: 0, magnetTimer: 0, elapsed: 0 };

function EquipmentIcon({ kind }: { kind: "jetpack" | "magnet" }) {
  return <svg className="railshift__gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "jetpack" ? <><path d="M5 5a2 2 0 0 1 4 0v12H5V5Zm10 0a2 2 0 0 1 4 0v12h-4V5ZM9 7h6v8H9M6 20l1 2 1-2m8 0 1 2 1-2" /><path d="M5 12h4m6 0h4" /></> : <><path d="M5 4v9a7 7 0 0 0 14 0V4h-4v9a3 3 0 0 1-6 0V4H5Z" /><path d="M5 8h4m6 0h4" /></>}
  </svg>;
}

export default function RailshiftLab({
  isActive,
  prefersReducedMotion,
  themeId,
}: RailshiftLabProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<RailshiftScene | null>(null);
  const [sceneStatus, setSceneStatus] = useState<"loading" | "ready" | "error">("loading");
  const [initialGame] = useState(initialModel);
  const modelRef = useRef<RunnerModel>(initialGame);
  const statusRef = useRef<RunnerStatus>("idle");
  const soundEnabledRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const gestureRef = useRef({ x: 0, y: 0, pointerId: -1 });
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [hud, setHud] = useState<RunnerHud>(EMPTY_HUD);
  const [best, setBest] = useState(0);
  const [bestDistance, setBestDistance] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const commitStatus = useCallback((next: RunnerStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const playTone = useCallback(
    (frequency: number, duration = 0.08, volume = 0.025) => {
      if (!soundEnabledRef.current) return;
      try {
        const audio = audioRef.current ?? new AudioContext();
        audioRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const now = audio.currentTime;
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + duration);
      } catch {
        soundEnabledRef.current = false;
        setSoundEnabled(false);
      }
    },
    [],
  );

  const redraw = useCallback(() => {
    sceneRef.current?.draw(modelRef.current, prefersReducedMotion, statusRef.current === "idle");
  }, [prefersReducedMotion]);

  useEffect(() => {
    const hydrationFrames: number[] = [];
    try {
      const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        hydrationFrames.push(
          window.requestAnimationFrame(() => setBest(saved)),
        );
      }
      const savedDistance = Number(
        window.localStorage.getItem(BEST_DISTANCE_KEY),
      );
      if (Number.isFinite(savedDistance) && savedDistance > 0) {
        hydrationFrames.push(
          window.requestAnimationFrame(() => setBestDistance(savedDistance)),
        );
      }
    } catch {
      // Railshift remains playable when local storage is unavailable.
    }
    return () => {
      for (const frame of hydrationFrames) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let resizeFrame = 0;
    let mountedScene: RailshiftScene | undefined;
    const contextLost = (event: Event) => {
      event.preventDefault();
      commitStatus("paused");
      setSceneStatus("error");
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    void import("../lib/railshift-scene").then(({ createRailshiftScene }) => {
      if (cancelled) return;
      try {
        mountedScene = createRailshiftScene(canvas);
        sceneRef.current = mountedScene;
        const configure = () => {
          window.cancelAnimationFrame(resizeFrame);
          resizeFrame = window.requestAnimationFrame(() => {
            const rect = canvas.getBoundingClientRect();
            mountedScene?.resize(rect.width, rect.height);
            redraw();
          });
        };
        observer = new ResizeObserver(configure);
        observer.observe(canvas);
        configure();
        setSceneStatus("ready");
      } catch {
        setSceneStatus("error");
      }
    }).catch(() => { if (!cancelled) setSceneStatus("error"); });
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      canvas.removeEventListener("webglcontextlost", contextLost);
      mountedScene?.dispose();
      sceneRef.current = null;
    };
  }, [commitStatus, redraw]);

  useEffect(() => {
    return () => {
      if (audioRef.current) void audioRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (status !== "playing" || !isActive || sceneStatus !== "ready") {
      redraw();
      return;
    }

    let frame = 0;
    let lastTimestamp = performance.now();
    let lastRenderTimestamp = 0;
    let lastDrawTimestamp = 0;
    let accumulator = 0;
    let lastHudUpdate = 0;
    let smoothedFps = 60;

    const finishRun = () => {
      const model = modelRef.current;
      const finalScore = Math.floor(model.score);
      commitStatus("crashed");
      setHud(hudFromModel(model, smoothedFps));
      // Read storage at commit time: two open instances racing setBest(c=>…)
      // on stale per-instance state could otherwise downgrade the saved best.
      setBest(() => {
        let next = finalScore;
        try {
          const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY));
          if (Number.isFinite(stored)) next = Math.max(stored, finalScore);
        } catch {
          /* persistence is optional */
        }
        try {
          window.localStorage.setItem(BEST_SCORE_KEY, String(next));
        } catch {
          // Best-score persistence is optional.
        }
        return next;
      });
      setBestDistance(() => {
        const finalDistance = Math.floor(model.distance);
        let next = finalDistance;
        try {
          const stored = Number(window.localStorage.getItem(BEST_DISTANCE_KEY));
          if (Number.isFinite(stored)) next = Math.max(stored, finalDistance);
        } catch {
          /* persistence is optional */
        }
        try {
          window.localStorage.setItem(BEST_DISTANCE_KEY, String(next));
        } catch {
          // Best-distance persistence is optional.
        }
        return next;
      });
      playTone(82, 0.24, 0.045);
    };

    const loop = (timestamp: number) => {
      frame = 0;
      const rawDelta = Math.min(0.1, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      accumulator = Math.min(accumulator + rawDelta, FIXED_STEP * 5);

      let steps = 0;
      let events = 0;
      while (accumulator >= FIXED_STEP && steps < 5) {
        events |= updateModel(modelRef.current, FIXED_STEP, prefersReducedMotion);
        accumulator -= FIXED_STEP;
        steps += 1;
        if (events & EVENT_IMPACT) break;
      }

      if (events & EVENT_CELL) playTone(520 + modelRef.current.combo * 70, 0.055);
      if (events & EVENT_SHIELD) playTone(220, 0.14, 0.035);
      if (events & EVENT_DAMAGE) playTone(110, 0.18, 0.035);
      if (events & EVENT_CHECKPOINT) playTone(740, 0.22, 0.03);
      if (events & EVENT_FLIGHT) playTone(880, 0.28, 0.025);
      if (events & EVENT_MAGNET) playTone(660, 0.16, 0.025);
      const renderElapsed = lastRenderTimestamp
        ? timestamp - lastRenderTimestamp
        : RENDER_STEP_MS;
      const shouldRender =
        lastRenderTimestamp === 0 || renderElapsed >= RENDER_STEP_MS;
      if (shouldRender || (events & EVENT_IMPACT) !== 0) {
        if (shouldRender) {
          const drawElapsed = lastDrawTimestamp
            ? timestamp - lastDrawTimestamp
            : RENDER_STEP_MS;
          const instantaneousFps = 1000 / Math.max(1, drawElapsed);
          smoothedFps += (instantaneousFps - smoothedFps) * 0.08;
          lastDrawTimestamp = timestamp;
          const elapsedSteps = Math.max(
            1,
            Math.floor(renderElapsed / RENDER_STEP_MS),
          );
          lastRenderTimestamp = lastRenderTimestamp
            ? lastRenderTimestamp + elapsedSteps * RENDER_STEP_MS
            : timestamp;
        }
        redraw();
      }

      if (events & EVENT_IMPACT) {
        finishRun();
        return;
      }

      if (timestamp - lastHudUpdate > 110) {
        lastHudUpdate = timestamp;
        setHud(hudFromModel(modelRef.current, smoothedFps));
      }
      if (statusRef.current === "playing" && document.visibilityState === "visible") {
        frame = window.requestAnimationFrame(loop);
      }
    };

    const startLoop = () => {
      if (document.visibilityState !== "visible" || frame) return;
      lastTimestamp = performance.now();
      lastRenderTimestamp = 0;
      lastDrawTimestamp = 0;
      accumulator = 0;
      frame = window.requestAnimationFrame(loop);
    };
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        commitStatus("paused");
      }
    };

    startLoop();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [commitStatus, isActive, playTone, prefersReducedMotion, redraw, sceneStatus, status]);

  useEffect(() => {
    if (!isActive && statusRef.current === "playing") {
      const frame = requestAnimationFrame(() => commitStatus("paused"));
      return () => cancelAnimationFrame(frame);
    }
  }, [commitStatus, isActive]);

  const startRun = useCallback(() => {
    if (sceneStatus !== "ready") return;
    modelRef.current = initialModel();
    setHud(hudFromModel(modelRef.current, 60));
    commitStatus("playing");
    window.requestAnimationFrame(() => {
      surfaceRef.current?.focus({ preventScroll: true });
    });
  }, [commitStatus, sceneStatus]);

  const pauseOrResume = useCallback(() => {
    if (statusRef.current === "playing") {
      commitStatus("paused");
    } else if (statusRef.current === "paused") {
      commitStatus("playing");
      window.requestAnimationFrame(() => surfaceRef.current?.focus({ preventScroll: true }));
    }
  }, [commitStatus]);

  const moveLane = useCallback(
    (direction: -1 | 1) => {
      if (statusRef.current !== "playing") return;
      const model = modelRef.current;
      const nextLane = asLane(model.lane + direction);
      if (nextLane === model.lane) return;
      model.lane = nextLane;
      playTone(150 + (nextLane + 1) * 30, 0.035, 0.014);
    },
    [playTone],
  );

  const jump = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const model = modelRef.current;
    if (!requestJump(model)) return;
    playTone(310, 0.07, 0.018);
  }, [playTone]);

  const duck = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const model = modelRef.current;
    if (!requestDuck(model)) return;
    playTone(118, 0.06, 0.018);
  }, [playTone]);

  const burst = useCallback(() => {
    if (statusRef.current !== "playing") return;
    if (activateBurst(modelRef.current)) playTone(660, 0.2, 0.03);
  }, [playTone]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    if (next) {
      try {
        const audio = audioRef.current ?? new AudioContext();
        audioRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
      } catch {
        soundEnabledRef.current = false;
        setSoundEnabled(false);
        return;
      }
      window.setTimeout(() => playTone(440, 0.06, 0.02), 0);
    }
  }, [playTone]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // A focused child control (Resume/touch buttons) owns Enter and Space for
    // native activation; intercepting them here would swallow clicks or fire
    // the wrong move ("Duck" focused + Space must not jump).
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, a, input, select, textarea")
    ) {
      return;
    }
    const key = event.key.toLowerCase();
    const handled = [
      "arrowleft",
      "arrowright",
      "arrowup",
      "arrowdown",
      "a",
      "d",
      "w",
      "s",
      "p",
      "shift",
      "enter",
      " ",
    ].includes(key);
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;

    if (key === "enter" && statusRef.current !== "playing") {
      if (statusRef.current === "paused") pauseOrResume();
      else startRun();
    } else if (key === "shift") {
      burst();
    } else if (key === "p") {
      pauseOrResume();
    } else if (key === "arrowleft" || key === "a") {
      moveLane(-1);
    } else if (key === "arrowright" || key === "d") {
      moveLane(1);
    } else if (key === "arrowdown" || key === "s") {
      duck();
    } else if (key === "arrowup" || key === "w" || key === " ") {
      if (statusRef.current === "idle" || statusRef.current === "crashed") startRun();
      else jump();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, .railshift__overlay")) return;
    // One gesture at a time: a second finger must not steal the tracked
    // pointer or overwrite the first swipe's origin.
    if (gestureRef.current.pointerId !== -1) return;
    gestureRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;
    gestureRef.current.pointerId = -1;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
      jump();
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      moveLane(deltaX < 0 ? -1 : 1);
    } else if (deltaY < 0) {
      jump();
    } else {
      duck();
    }
  };

  const flying = hud.flightTimer > 0 || hud.flightHeight > 0;
  const districtName = DISTRICTS[getRailshiftDistrict(hud.distance)];
  const remaining = 250 - hud.distance % 250;
  const statusMessage = status === "crashed"
    ? `Run ended at ${hud.distance} metres with ${hud.score} points. ${hud.endCause}`
    : status === "paused" ? "Run paused." : status === "playing" ? hud.message || "Run in progress." : "Ready to ride.";

  return (
    <div ref={hostRef} className="railshift" data-theme={themeId}>
      <header className="railshift__header">
        <div className="railshift__identity"><span className="railshift__mark" aria-hidden="true">↗</span><h2>Railshift</h2><span>Cityline</span></div>
        <div className="railshift__header-actions">
          <button type="button" aria-pressed={soundEnabled} onClick={toggleSound}>Sound {soundEnabled ? "on" : "off"}</button>
          <button type="button" disabled={status === "idle" || status === "crashed" || sceneStatus !== "ready"} onClick={pauseOrResume}>{status === "paused" ? "Resume" : "Pause"}</button>
        </div>
      </header>
      <div ref={surfaceRef} className={`railshift__surface is-${status}`} role="group" aria-roledescription="game"
        aria-label="Railshift. Left and Right change lanes, Up or Space jump, Down slide, Shift activates overdrive, P pauses."
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown A D W S Space Shift P Enter" tabIndex={0}
        onKeyDown={handleKeyDown} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}
        onPointerCancel={() => { gestureRef.current = { x: 0, y: 0, pointerId: -1 }; }}>
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="railshift__hud" aria-hidden="true">
          <div className="railshift__score"><small>Score</small><strong>{hud.score.toLocaleString()}</strong><span>×{hud.combo} multiplier</span></div>
          <div className="railshift__route"><small>{districtName}</small><strong>{hud.distance}<i> m</i></strong><span>{remaining} m to checkpoint</span><div className="railshift__progress"><i style={{ width: `${(hud.distance % 250) / 2.5}%` }} /></div></div>
          <div className="railshift__health"><small>Hull</small><strong className={hud.hull < 2 ? "is-low" : ""}>{"◆".repeat(hud.hull)}<i>{"◇".repeat(Math.max(0, 2 - hud.hull))}</i></strong><span>{hud.shield ? "Shield ready" : `${hud.cells} gold coins`}</span></div>
        </div>
        {status === "playing" && <>
          {(hud.elapsed < 2.8 || (hud.tutorial && !flying)) && <div className="railshift__hint">{hud.elapsed < 2.8 ? "The dock warden is on your tail. Go!" : hud.tutorial}</div>}
          {hud.message && <div className="railshift__feedback" key={hud.message}>{hud.message}</div>}
          <div className="railshift__equipment" aria-label="Equipped gear">
            {flying && <div className="railshift__gear is-rocket"><EquipmentIcon kind="jetpack" /><span><strong>{hud.flightTimer > 0 ? "Rocket flight" : "Landing"}</strong><small>{hud.flightTimer > 0 ? `${hud.flightTimer.toFixed(1)}s · Steer left / right` : "Touchdown protection"}</small></span><i style={{ transform: `scaleX(${hud.flightTimer / FLIGHT_DURATION})` }} /></div>}
            {hud.magnetTimer > 0 && <div className="railshift__gear is-magnet"><EquipmentIcon kind="magnet" /><span><strong>Coin magnet</strong><small>{hud.magnetTimer.toFixed(1)}s · Pulls nearby gold</small></span><i style={{ transform: `scaleX(${hud.magnetTimer / MAGNET_DURATION})` }} /></div>}
          </div>
          <button className={`railshift__burst ${hud.energy >= 100 && !flying ? "is-ready" : ""}`} type="button" disabled={hud.energy < 100 || flying} onClick={burst} aria-label={`Overdrive${flying ? " saved until landing" : hud.energy >= 100 ? " ready. Activate" : ` charging ${Math.floor(hud.energy)} percent`}`}>
            <span>↗</span><div><strong>{hud.burstTimer > 0 ? "Overdrive active" : flying ? "Overdrive saved for landing" : hud.energy >= 100 ? "Activate overdrive" : "Collect gold to charge"}</strong><small>{hud.energy >= 100 && !flying ? "Shift · Break through obstacles" : `${Math.floor(hud.energy)}% · Overdrive`}</small></div>
            <i style={{ width: `${hud.energy}%` }} />
          </button>
        </>}
        {status !== "playing" && <div className="railshift__overlay">
          <span className="railshift__eyebrow">{status === "crashed" ? "Shift complete" : status === "paused" ? "Take a breath" : "An endless ride above the city"}</span>
          <h3>{status === "crashed" ? "One more run?" : status === "paused" ? "Right where you left off." : <>Ride the<br /> skyline.</>}</h3>
          <p>{sceneStatus === "error" ? "The 3D view could not start. Enable hardware acceleration in your browser, then reload to ride." : status === "crashed" ? hud.endCause : status === "paused" ? "Your route is paused. Resume when you are ready." : "Outrun the dock warden. Grab rocket packs to fly and magnets to pull in gold. Jump barriers; slide under signs."}</p>
          {status === "crashed" ? <div className="railshift__results"><span><strong>{hud.score.toLocaleString()}</strong>Points</span><span><strong>{hud.distance} m</strong>Distance</span><span><strong>{hud.bestStreak}</strong>Best streak</span></div> : status === "idle" && <div className="railshift__lessons"><span><b>← →</b>Change lane</span><span><b>↑</b>Jump</span><span><b>↓</b>Slide</span></div>}
          <button type="button" className="railshift__start" disabled={sceneStatus !== "ready"} onClick={status === "paused" ? pauseOrResume : startRun}>
            {sceneStatus === "loading" ? "Preparing your ride…" : sceneStatus === "error" ? "3D unavailable" : status === "crashed" ? "Ride again" : status === "paused" ? "Resume ride" : "Start riding"}<span aria-hidden="true">↗</span>
          </button>
          <small className="railshift__best">{status === "idle" ? "First checkpoint: 250 m · Two hits per ride" : `Personal best ${best.toLocaleString()} pts · ${bestDistance.toLocaleString()} m`}</small>
        </div>}
        {status === "playing" && <div className="railshift__touch-controls" role="group" aria-label="Touch controls">
          <button type="button" aria-label="Move left" onClick={() => moveLane(-1)}><b>←</b><span>Left</span></button>
          <button type="button" aria-label="Jump" onClick={jump}><b>↑</b><span>Jump</span></button>
          <button type="button" aria-label="Slide" onClick={duck}><b>↓</b><span>Slide</span></button>
          <button type="button" aria-label="Move right" onClick={() => moveLane(1)}><b>→</b><span>Right</span></button>
        </div>}
      </div>
      <footer className="railshift__footer"><span>← → Move <b>·</b> ↑ Jump <b>·</b> ↓ Slide <b>·</b> Shift Overdrive</span><span>{status === "playing" ? `${hud.fps} fps` : "Swipe or use arrow keys"} <b>·</b> Best {best.toLocaleString()}</span></footer>
      <p className="railshift__announcement" aria-live="polite">{statusMessage}</p>
    </div>
  );
}
