"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
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

type SubsurfaceLabProps = {
  isActive: boolean;
  prefersReducedMotion: boolean;
};

const BEST_SCORE_KEY = "sam-workbench-subsurface-best-v1";
const COMPACT_LAYOUT_QUERY = "(max-width: 980px)";

function subscribeToCompactLayout(callback: () => void) {
  const media = window.matchMedia(COMPACT_LAYOUT_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getCompactLayoutSnapshot() {
  return window.matchMedia(COMPACT_LAYOUT_QUERY).matches;
}

function getServerCompactLayoutSnapshot() {
  return false;
}

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

function configureCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const nextWidth = Math.round(width * pixelRatio);
  const nextHeight = Math.round(height * pixelRatio);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  const context = canvas.getContext("2d");
  context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { context, width, height };
}

function drawScene(
  canvas: HTMLCanvasElement,
  model: GameModel,
  timestamp: number,
  prefersReducedMotion: boolean,
) {
  const { context, width, height } = configureCanvas(canvas);
  if (!context) return;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#1424f5";
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.strokeStyle = "rgba(244, 241, 225, 0.16)";
  for (let x = 0; x <= width; x += Math.max(34, width / 12)) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += Math.max(28, height / 8)) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const sweep = prefersReducedMotion ? width * 0.5 : ((timestamp / 2600) % 1) * width;
  const sweepGradient = context.createLinearGradient(sweep - 80, 0, sweep + 12, 0);
  sweepGradient.addColorStop(0, "rgba(244, 241, 225, 0)");
  sweepGradient.addColorStop(1, "rgba(244, 241, 225, 0.2)");
  context.fillStyle = sweepGradient;
  context.fillRect(sweep - 80, 0, 92, height);

  const gateWidth = Math.max(24, width * 0.065);
  const gapHeight = Math.max(92, height * 0.29);
  for (const gate of model.gates) {
    const gateX = gate.x * width;
    const gapCenter = gate.gap * height;
    const upperHeight = gapCenter - gapHeight / 2;
    const lowerY = gapCenter + gapHeight / 2;
    context.fillStyle = "#10100e";
    context.fillRect(gateX - gateWidth / 2, 0, gateWidth, upperHeight);
    context.fillRect(gateX - gateWidth / 2, lowerY, gateWidth, height - lowerY);
    context.fillStyle = "#f0eddb";
    context.fillRect(gateX - gateWidth / 2, Math.max(0, upperHeight - 2), gateWidth, 2);
    context.fillRect(gateX - gateWidth / 2, lowerY, gateWidth, 2);
  }

  const subX = width * 0.2;
  const subY = model.y * height;
  const bodyWidth = Math.max(38, width * 0.085);
  const bodyHeight = Math.max(16, height * 0.055);

  context.save();
  context.translate(subX, subY);
  context.rotate(Math.max(-0.22, Math.min(0.28, model.velocity * 0.55)));
  context.fillStyle = "#f0eddb";
  context.beginPath();
  context.ellipse(0, 0, bodyWidth / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#10100e";
  context.beginPath();
  context.moveTo(-bodyWidth / 2 + 3, 0);
  context.lineTo(-bodyWidth / 2 - 12, -bodyHeight / 2);
  context.lineTo(-bodyWidth / 2 - 12, bodyHeight / 2);
  context.closePath();
  context.fill();
  context.fillRect(-4, -bodyHeight / 2 - 8, 3, 9);
  context.fillRect(-4, -bodyHeight / 2 - 8, 11, 3);
  context.fillStyle = "#1424f5";
  context.beginPath();
  context.arc(bodyWidth * 0.16, 0, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.fillStyle = "rgba(244, 241, 225, 0.78)";
  context.font = "10px monospace";
  context.fillText("00M", 10, 17);
  context.fillText("240M", 10, height - 10);
}

export default function SubsurfaceLab({ isActive, prefersReducedMotion }: SubsurfaceLabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameModel>(initialModel());
  const isCompactLayout = useSyncExternalStore(
    subscribeToCompactLayout,
    getCompactLayoutSnapshot,
    getServerCompactLayoutSnapshot,
  );
  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawScene(canvas, gameRef.current, performance.now(), prefersReducedMotion);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [prefersReducedMotion, status]);

  useEffect(() => {
    if (status !== "playing" || (isCompactLayout && !isActive)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrame = 0;
    let lastTimestamp = performance.now();

    const finishRun = () => {
      const finalScore = gameRef.current.score;
      setScore(finalScore);
      setStatus("crashed");
      setBest((current) => {
        const next = Math.max(current, finalScore);
        try {
          window.localStorage.setItem(BEST_SCORE_KEY, String(next));
        } catch {
          // Best-score persistence is optional.
        }
        return next;
      });
    };

    const loop = (timestamp: number) => {
      const delta = Math.min(0.034, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
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

      const collidingGate = model.gates.some((gate) => {
        const overlapsX = Math.abs(gate.x - 0.2) < 0.065;
        const gapHalf = 0.145;
        return overlapsX && (model.y < gate.gap - gapHalf || model.y > gate.gap + gapHalf);
      });
      if (model.y < 0.045 || model.y > 0.955 || collidingGate) {
        drawScene(canvas, model, timestamp, prefersReducedMotion);
        finishRun();
        return;
      }

      drawScene(canvas, model, timestamp, prefersReducedMotion);
      animationFrame = window.requestAnimationFrame(loop);
    };

    animationFrame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isActive, isCompactLayout, prefersReducedMotion, status]);

  const startRun = useCallback(() => {
    gameRef.current = initialModel();
    setScore(0);
    setStatus("playing");
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

  return (
    <div className="os-lab">
      <header className="os-lab-heading">
        <div>
          <span>Experiment 01</span>
          <h2>Subsurface</h2>
        </div>
        <p>Hold depth through a live sonar channel.</p>
      </header>

      <div
        className={`subsurface-game is-${status}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        aria-label="Subsurface depth game. Press Space, Enter, Arrow Up, or tap to rise."
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="subsurface-hud" aria-live="polite">
          <span>Depth control / manual</span>
          <span>Score {String(score).padStart(2, "0")}</span>
          <span>Best {String(best).padStart(2, "0")}</span>
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
