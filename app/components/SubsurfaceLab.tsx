// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type GameStatus = "idle" | "playing" | "crashed";

type Gate = {
  x: number;
  gap: number;
  passed: boolean;
};

type GameModel = {
  y: number;
  velocity: number;
  score: number;
  gates: Gate[];
};

type SubsurfacePalette = {
  carbon: string;
  ivory: string;
  route: string;
  deep: string;
  signal: string;
  dataFont: string;
};

type SubsurfaceCanvasMetrics = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;
  palette: SubsurfacePalette;
  backgroundLayer: HTMLCanvasElement;
  foregroundLayer: HTMLCanvasElement;
  sweepLayer: HTMLCanvasElement;
  subX: number;
  gateWidth: number;
  gapHeight: number;
  bandHeight: number;
  bodyWidth: number;
  bodyHeight: number;
};

type SubsurfaceLabProps = {
  isActive: boolean;
  prefersReducedMotion: boolean;
  themeId: string;
};

const BEST_SCORE_KEY = "sam-workbench-subsurface-best-v1";

function initialModel(): GameModel {
  return {
    y: 0.48,
    velocity: -0.24,
    score: 0,
    gates: [
      { x: 0.78, gap: 0.38, passed: false },
      { x: 1.2, gap: 0.62, passed: false },
      { x: 1.62, gap: 0.46, passed: false },
    ],
  };
}

function createCanvasLayer(
  width: number,
  height: number,
  pixelRatio: number,
  alpha: boolean,
) {
  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.round(width * pixelRatio));
  layer.height = Math.max(1, Math.round(height * pixelRatio));
  const context = layer.getContext("2d", { alpha });
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { canvas: layer, context };
}

function canvasPixelRatio(width: number, height: number) {
  const ratioCap = width * height > 650_000 ? 1.5 : 2;
  return Math.min(window.devicePixelRatio || 1, ratioCap);
}

function configureCanvas(
  canvas: HTMLCanvasElement,
): SubsurfaceCanvasMetrics | null {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelRatio = canvasPixelRatio(width, height);
  const nextWidth = Math.round(width * pixelRatio);
  const nextHeight = Math.round(height * pixelRatio);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const style = window.getComputedStyle(canvas);
  const palette: SubsurfacePalette = {
    carbon: style.getPropertyValue("--carbon").trim() || "#11110f",
    ivory: style.getPropertyValue("--ivory").trim() || "#f0efe8",
    route: style.getPropertyValue("--cobalt").trim() || "#4c5ce5",
    deep: style.getPropertyValue("--cobalt-deep").trim() || "#3543bd",
    signal: style.getPropertyValue("--signal").trim() || "#59df79",
    dataFont: style.getPropertyValue("--font-data").trim() || "monospace",
  };

  const background = createCanvasLayer(width, height, pixelRatio, false);
  const foreground = createCanvasLayer(width, height, pixelRatio, true);
  const sweep = createCanvasLayer(92, 1, pixelRatio, true);
  if (!background || !foreground || !sweep) return null;

  const water = background.context.createLinearGradient(0, 0, 0, height);
  water.addColorStop(0, palette.route);
  water.addColorStop(0.58, palette.deep);
  water.addColorStop(1, palette.carbon);
  background.context.fillStyle = water;
  background.context.fillRect(0, 0, width, height);

  background.context.lineWidth = 1;
  background.context.strokeStyle = "rgba(240, 239, 232, 0.13)";
  for (let x = 0; x <= width; x += Math.max(34, width / 12)) {
    background.context.beginPath();
    background.context.moveTo(x, 0);
    background.context.lineTo(x, height);
    background.context.stroke();
  }
  for (let y = 0; y <= height; y += Math.max(28, height / 8)) {
    background.context.beginPath();
    background.context.moveTo(0, y);
    background.context.lineTo(width, y);
    background.context.stroke();
  }

  const bandHeight = Math.max(6, height * 0.045);
  foreground.context.fillStyle = palette.carbon;
  foreground.context.globalAlpha = 0.68;
  foreground.context.fillRect(0, 0, width, bandHeight);
  foreground.context.fillRect(0, height - bandHeight, width, bandHeight);
  foreground.context.globalAlpha = 1;
  foreground.context.fillStyle = palette.signal;
  foreground.context.globalAlpha = 0.55;
  foreground.context.fillRect(0, bandHeight, width, 1);
  foreground.context.fillRect(0, height - bandHeight - 1, width, 1);
  foreground.context.globalAlpha = 1;

  foreground.context.fillStyle = "rgba(240, 239, 232, 0.78)";
  foreground.context.strokeStyle = "rgba(240, 239, 232, 0.42)";
  foreground.context.font = `10px ${palette.dataFont}, monospace`;
  foreground.context.lineWidth = 1;
  for (let metres = 0; metres <= 240; metres += 20) {
    const y = bandHeight + (metres / 240) * (height - bandHeight * 2);
    const major = metres % 60 === 0;
    foreground.context.beginPath();
    foreground.context.moveTo(8, y);
    foreground.context.lineTo(major ? 18 : 13, y);
    foreground.context.stroke();
    if (major) foreground.context.fillText(`${metres}M`, 23, y + 3.5);
  }

  const sweepGradient = sweep.context.createLinearGradient(0, 0, 92, 0);
  sweepGradient.addColorStop(0, "rgba(240, 239, 232, 0)");
  sweepGradient.addColorStop(1, "rgba(240, 239, 232, 0.18)");
  sweep.context.fillStyle = sweepGradient;
  sweep.context.fillRect(0, 0, 92, 1);

  return {
    context,
    width,
    height,
    pixelRatio,
    palette,
    backgroundLayer: background.canvas,
    foregroundLayer: foreground.canvas,
    sweepLayer: sweep.canvas,
    subX: width * 0.2,
    gateWidth: Math.max(24, width * 0.065),
    gapHeight: gateGapHeight(height),
    bandHeight,
    bodyWidth: Math.max(38, width * 0.085),
    bodyHeight: Math.max(16, height * 0.055),
  };
}

/** Shared by renderer and collider so the visible gap is always the real gap. */
function gateGapHeight(height: number) {
  return Math.max(92, height * 0.29);
}

function drawScene(
  metrics: SubsurfaceCanvasMetrics,
  model: GameModel,
  timestamp: number,
  prefersReducedMotion: boolean,
) {
  const {
    context,
    width,
    height,
    palette,
    backgroundLayer,
    foregroundLayer,
    sweepLayer,
    subX,
    gateWidth,
    gapHeight,
    bodyWidth,
    bodyHeight,
  } = metrics;
  context.drawImage(backgroundLayer, 0, 0, width, height);

  const subY = model.y * height;

  // Sonar ping rings radiate from the craft; frozen under reduced motion.
  if (!prefersReducedMotion) {
    context.lineWidth = 1;
    context.strokeStyle = palette.signal;
    for (let ring = 0; ring < 3; ring += 1) {
      const phase = (timestamp / 2100 + ring / 3) % 1;
      const radius = phase * Math.max(width, height) * 0.42;
      context.globalAlpha = (1 - phase) * 0.15;
      context.beginPath();
      context.arc(subX, subY, radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  // The sonar sweep line.
  const sweep = prefersReducedMotion ? width * 0.5 : ((timestamp / 2600) % 1) * width;
  context.drawImage(sweepLayer, sweep - 80, 0, 92, height);

  // Pressure gates: carbon columns with signal lamps marking the channel edge.
  for (const gate of model.gates) {
    const gateX = gate.x * width;
    const gapCenter = gate.gap * height;
    const upperHeight = gapCenter - gapHeight / 2;
    const lowerY = gapCenter + gapHeight / 2;
    context.fillStyle = palette.carbon;
    context.fillRect(gateX - gateWidth / 2, 0, gateWidth, upperHeight);
    context.fillRect(gateX - gateWidth / 2, lowerY, gateWidth, height - lowerY);
    const lampWidth = gateWidth * 0.55;
    context.fillStyle = palette.signal;
    for (let lamp = 0; lamp < 3; lamp += 1) {
      context.fillRect(
        gateX - lampWidth / 2,
        upperHeight - 4 - lamp * 9 - 4,
        lampWidth,
        4,
      );
      context.fillRect(gateX - lampWidth / 2, lowerY + 4 + lamp * 9, lampWidth, 4);
    }
  }

  context.drawImage(foregroundLayer, 0, 0, width, height);

  // The craft.
  context.save();
  context.translate(subX, subY);
  context.rotate(Math.max(-0.22, Math.min(0.28, model.velocity * 0.55)));
  context.fillStyle = palette.ivory;
  context.beginPath();
  context.ellipse(0, 0, bodyWidth / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.carbon;
  context.beginPath();
  context.moveTo(-bodyWidth / 2 + 3, 0);
  context.lineTo(-bodyWidth / 2 - 12, -bodyHeight / 2);
  context.lineTo(-bodyWidth / 2 - 12, bodyHeight / 2);
  context.closePath();
  context.fill();
  context.fillRect(-4, -bodyHeight / 2 - 8, 3, 9);
  context.fillRect(-4, -bodyHeight / 2 - 8, 11, 3);
  // Beacon brightens while the craft is climbing.
  context.fillStyle = palette.signal;
  context.globalAlpha = model.velocity < 0 ? 1 : 0.45;
  context.fillRect(-3.5, -bodyHeight / 2 - 13, 4, 4);
  context.globalAlpha = 1;
  context.fillStyle = palette.route;
  context.beginPath();
  context.arc(bodyWidth * 0.16, 0, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export default function SubsurfaceLab({ isActive, prefersReducedMotion, themeId }: SubsurfaceLabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metricsRef = useRef<SubsurfaceCanvasMetrics | null>(null);
  const gameSurfaceRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameModel>(initialModel());
  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [divesPlayed, setDivesPlayed] = useState(0);

  useEffect(() => {
    let hydrationFrame = 0;
    try {
      const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        hydrationFrame = window.requestAnimationFrame(() => setBest(saved));
      }
    } catch {
      // The game remains playable when storage is unavailable.
    }
    return () => window.cancelAnimationFrame(hydrationFrame);
  }, []);

  useEffect(() => {
    if (!isActive) {
      metricsRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let configureFrame = 0;
    let configureTimer = 0;
    const configureNow = (force = false) => {
      window.cancelAnimationFrame(configureFrame);
      configureFrame = window.requestAnimationFrame(() => {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        const pixelRatio = canvasPixelRatio(width, height);
        const current = metricsRef.current;
        if (
          !force &&
          current &&
          Math.abs(current.width - width) < 0.5 &&
          Math.abs(current.height - height) < 0.5 &&
          current.pixelRatio === pixelRatio
        ) {
          drawScene(current, gameRef.current, performance.now(), prefersReducedMotion);
          return;
        }

        const metrics = configureCanvas(canvas);
        if (!metrics) return;
        metricsRef.current = metrics;
        drawScene(metrics, gameRef.current, performance.now(), prefersReducedMotion);
      });
    };

    const scheduleConfigure = () => {
      window.clearTimeout(configureTimer);
      configureTimer = window.setTimeout(() => configureNow(), 100);
    };

    configureNow(true);
    const observer = new ResizeObserver(scheduleConfigure);
    observer.observe(canvas);
    window.addEventListener("resize", scheduleConfigure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleConfigure);
      window.cancelAnimationFrame(configureFrame);
      window.clearTimeout(configureTimer);
    };
  }, [isActive, prefersReducedMotion, themeId]);

  useEffect(() => {
    if (status !== "playing" || !isActive) return;
    if (!canvasRef.current) return;

    let animationFrame = 0;
    let lastTimestamp = performance.now();

    const finishRun = () => {
      const finalScore = gameRef.current.score;
      setScore(finalScore);
      setStatus("crashed");
      setDivesPlayed((current) => current + 1);
      // Compare against the freshly stored best (not this instance's state):
      // several lab windows can be mounted at once, and a stale local "best"
      // would downgrade a higher score another instance just committed.
      let storedBest = 0;
      try {
        const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY));
        if (Number.isFinite(saved) && saved > 0) storedBest = saved;
      } catch {
        // Storage read failed; the local best folds back in via setBest.
      }
      const nextBest = Math.max(storedBest, finalScore);
      try {
        window.localStorage.setItem(BEST_SCORE_KEY, String(nextBest));
      } catch {
        // Best-score persistence is optional.
      }
      setBest((current) => Math.max(current, nextBest));
    };

    const loop = (timestamp: number) => {
      const delta = Math.min(0.034, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      const metrics = metricsRef.current;
      if (!metrics) {
        animationFrame = window.requestAnimationFrame(loop);
        return;
      }
      const model = gameRef.current;
      model.velocity += 0.72 * delta;
      model.y += model.velocity * delta;

      let maxGateX = Math.max(...model.gates.map((gate) => gate.x));
      for (const gate of model.gates) {
        gate.x -= 0.27 * delta;
        if (!gate.passed && gate.x < 0.2) {
          gate.passed = true;
          model.score += 1;
          setScore(model.score);
        }
        if (gate.x < -0.12) {
          maxGateX += 0.42;
          gate.x = maxGateX;
          gate.gap = 0.3 + Math.random() * 0.4;
          gate.passed = false;
        }
      }

      // Match the renderer: the pixel gap has a 92px floor, so the
      // normalized collider half-gap widens on short canvases. Without
      // this, the kill zone extends past the drawn channel ("invisible
      // walls" flanking every gate).
      const surfaceHeight = metrics.height;
      const collidingGate = model.gates.some((gate) => {
        const overlapsX = Math.abs(gate.x - 0.2) < 0.065;
        const gapHalf = metrics.gapHeight / 2 / surfaceHeight;
        return overlapsX && (model.y < gate.gap - gapHalf || model.y > gate.gap + gapHalf);
      });
      if (model.y < 0.045 || model.y > 0.955 || collidingGate) {
        drawScene(metrics, model, timestamp, prefersReducedMotion);
        finishRun();
        return;
      }

      drawScene(metrics, model, timestamp, prefersReducedMotion);
      animationFrame = window.requestAnimationFrame(loop);
    };

    animationFrame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isActive, prefersReducedMotion, status]);

  const startRun = useCallback(() => {
    gameRef.current = initialModel();
    setScore(0);
    setStatus("playing");
    window.requestAnimationFrame(() => {
      gameSurfaceRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const pulse = useCallback(() => {
    if (status !== "playing") {
      gameRef.current = initialModel();
      setScore(0);
      setStatus("playing");
    }
    gameRef.current.velocity = -0.34;
  }, [status]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "ArrowUp" || event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      pulse();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.focus();
    pulse();
  };

  const accessibleStatus =
    status === "playing"
      ? "Dive in progress."
      : status === "crashed"
        ? "Signal lost."
        : "Channel ready.";

  return (
    <div className="os-lab">
      <header className="os-lab-heading">
        <div>
          <span>Depth-control lab</span>
          <h2>Subsurface</h2>
        </div>
        <p>Hold depth through a live sonar channel.</p>
      </header>

      <div
        ref={gameSurfaceRef}
        className={`subsurface-game is-${status}`}
        role="group"
        aria-roledescription="game"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        aria-keyshortcuts="Space Enter ArrowUp"
        aria-label={`Subsurface depth game. ${accessibleStatus} Press Space, Enter, Arrow Up, or tap to rise.`}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="subsurface-hud" aria-live="polite">
          <span>Depth control / manual</span>
          <span>Score {String(score).padStart(2, "0")}</span>
          <span>Best {String(best).padStart(2, "0")}</span>
          <span>Dives {String(divesPlayed).padStart(2, "0")}</span>
        </div>
        {status !== "playing" && (
          <div className="subsurface-overlay">
            <p>{status === "crashed" ? "Signal lost." : "Channel ready."}</p>
            <button type="button" onClick={startRun}>
              {status === "crashed" ? "Dive again" : "Start dive"}
            </button>
          </div>
        )}
        <span className="subsurface-scan" aria-hidden="true" />
      </div>

      <footer className="os-lab-controls">
        <span>Tap · Space · ↑ to pulse</span>
        <span>Best score stays in this browser</span>
      </footer>
    </div>
  );
}
