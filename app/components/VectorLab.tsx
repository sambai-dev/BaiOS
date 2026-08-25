// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type Vector3 = [number, number, number];
type VectorDraft = [string, string, string];

type ViewState = {
  yaw: number;
  pitch: number;
};

type DragState = {
  pointerId: number;
  x: number;
  y: number;
} | null;

export type VectorLabProps = {
  idPrefix?: string;
  themeId?: string;
};

const AXIS_LABELS = ["X", "Y", "Z"] as const;

const VECTOR_STORAGE_KEY = "sam-workbench-vector-v1";

function parseVectorDraft(draft: VectorDraft) {
  const invalid = draft.map((value) => {
    if (!value.trim()) return true;
    const parsed = Number(value);
    return !Number.isFinite(parsed) || parsed < -3 || parsed > 3;
  });
  return {
    invalid,
    vector: invalid.some(Boolean)
      ? null
      : (draft.map((value) => Number(value)) as Vector3),
  };
}

function magnitude(vector: Vector3) {
  return Math.hypot(...vector);
}

function dot(a: Vector3, b: Vector3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function rotate(vector: Vector3, view: ViewState): Vector3 {
  const [x, y, z] = vector;
  const cosY = Math.cos(view.yaw);
  const sinY = Math.sin(view.yaw);
  const xY = x * cosY - z * sinY;
  const zY = x * sinY + z * cosY;
  const cosX = Math.cos(view.pitch);
  const sinX = Math.sin(view.pitch);
  return [xY, y * cosX - zY * sinX, y * sinX + zY * cosX];
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

function drawVectorScene(
  canvas: HTMLCanvasElement,
  vectorA: Vector3 | null,
  vectorB: Vector3 | null,
  view: ViewState,
) {
  const { context, width, height } = configureCanvas(canvas);
  if (!context) return;
  const style = window.getComputedStyle(canvas);
  const ivory = style.getPropertyValue("--ivory").trim() || "#f0efe8";
  const route = style.getPropertyValue("--cobalt").trim() || "#4c5ce5";
  const contrast = "#ba5b3f";
  const dataFont = style.getPropertyValue("--font-data").trim() || "monospace";
  const scale = Math.min(width, height) / 6.6;
  const origin = { x: width * 0.5, y: height * 0.54 };

  const project = (point: Vector3) => {
    const rotated = rotate(point, view);
    const perspective = 1 / Math.max(0.55, 1 + rotated[2] * 0.055);
    return {
      x: origin.x + rotated[0] * scale * perspective,
      y: origin.y - rotated[1] * scale * perspective,
    };
  };

  context.clearRect(0, 0, width, height);
  context.fillStyle = ivory;
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.strokeStyle = "rgba(17, 17, 15, 0.16)";
  for (let index = -3; index <= 3; index += 1) {
    const xStart = project([index, 0, -3]);
    const xEnd = project([index, 0, 3]);
    const zStart = project([-3, 0, index]);
    const zEnd = project([3, 0, index]);
    context.beginPath();
    context.moveTo(xStart.x, xStart.y);
    context.lineTo(xEnd.x, xEnd.y);
    context.stroke();
    context.beginPath();
    context.moveTo(zStart.x, zStart.y);
    context.lineTo(zEnd.x, zEnd.y);
    context.stroke();
  }

  const axes: Array<{ point: Vector3; label: string }> = [
    { point: [2.8, 0, 0], label: "X" },
    { point: [0, 2.8, 0], label: "Y" },
    { point: [0, 0, 2.8], label: "Z" },
  ];
  context.strokeStyle = "rgba(17, 17, 15, 0.66)";
  context.fillStyle = "#11110f";
  context.font = `10px ${dataFont}, monospace`;
  for (const axis of axes) {
    const end = project(axis.point);
    context.beginPath();
    context.moveTo(origin.x, origin.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.fillText(axis.label, end.x + 5, end.y - 5);
  }

  const drawArrow = (vector: Vector3, color: string, label: string) => {
    const start = project([0, 0, 0]);
    const end = project(vector);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    context.lineWidth = 3;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.beginPath();
    context.moveTo(end.x, end.y);
    context.lineTo(end.x - 10 * Math.cos(angle - 0.45), end.y - 10 * Math.sin(angle - 0.45));
    context.lineTo(end.x - 10 * Math.cos(angle + 0.45), end.y - 10 * Math.sin(angle + 0.45));
    context.closePath();
    context.fill();
    context.font = `600 11px ${dataFont}, monospace`;
    context.fillText(label, end.x + 8, end.y + 14);
  };

  if (vectorA) drawArrow(vectorA, route, "A");
  if (vectorB) drawArrow(vectorB, contrast, "B");
}

function format(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function angleBetween(a: Vector3, b: Vector3) {
  const denominator = magnitude(a) * magnitude(b);
  if (denominator === 0) return null;
  return Math.atan2(magnitude(cross(a, b)), dot(a, b));
}

function safeDomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export default function VectorLab({ idPrefix, themeId }: VectorLabProps = {}) {
  const generatedId = useId();
  const domIdPrefix = `${safeDomId(idPrefix?.trim() || "vector-lab")}-${safeDomId(generatedId)}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState>(null);
  // Client-only component (loaded with ssr: false), so window and
  // localStorage exist during the first render and can seed initial state.
  function readStoredDrafts(): { a?: VectorDraft; b?: VectorDraft } {
    try {
      const stored: unknown = JSON.parse(
        window.localStorage.getItem(VECTOR_STORAGE_KEY) ?? "null",
      );
      if (!stored || typeof stored !== "object") return {};
      const candidate = stored as { a?: unknown; b?: unknown };
      const readDraft = (value: unknown): VectorDraft | undefined => {
        if (!Array.isArray(value) || value.length !== 3) return undefined;
        if (!value.every((item) => typeof item === "string" && item.length <= 24)) {
          return undefined;
        }
        return value as VectorDraft;
      };
      return { a: readDraft(candidate.a), b: readDraft(candidate.b) };
    } catch {
      return {};
    }
  }

  function readStoredView(): ViewState | undefined {
    try {
      const stored: unknown = JSON.parse(
        window.localStorage.getItem(VECTOR_STORAGE_KEY) ?? "null",
      );
      if (!stored || typeof stored !== "object") return undefined;
      const candidate = (stored as { view?: unknown }).view as
        | { yaw?: unknown; pitch?: unknown }
        | undefined;
      if (
        !candidate ||
        typeof candidate.yaw !== "number" ||
        typeof candidate.pitch !== "number" ||
        !Number.isFinite(candidate.yaw) ||
        !Number.isFinite(candidate.pitch)
      ) {
        return undefined;
      }
      return {
        yaw: Math.max(-Math.PI, Math.min(Math.PI, candidate.yaw)),
        pitch: Math.max(-1.1, Math.min(1.1, candidate.pitch)),
      };
    } catch {
      return undefined;
    }
  }

  const [vectorADraft, setVectorADraft] = useState<VectorDraft>(
    () => readStoredDrafts().a ?? ["1.8", "1.2", "0.6"],
  );
  const [vectorBDraft, setVectorBDraft] = useState<VectorDraft>(
    () => readStoredDrafts().b ?? ["-0.8", "1.7", "1.4"],
  );
  const [view, setView] = useState<ViewState>(
    () => readStoredView() ?? { yaw: -0.55, pitch: 0.45 },
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copyTimerRef = useRef<number | null>(null);

  const parsedA = useMemo(() => parseVectorDraft(vectorADraft), [vectorADraft]);
  const parsedB = useMemo(() => parseVectorDraft(vectorBDraft), [vectorBDraft]);

  const results = useMemo(() => {
    if (!parsedA.vector || !parsedB.vector) return null;
    const crossProduct = cross(parsedA.vector, parsedB.vector);
    return {
      dot: dot(parsedA.vector, parsedB.vector),
      cross: crossProduct,
      area: magnitude(crossProduct),
      angle: angleBetween(parsedA.vector, parsedB.vector),
    };
  }, [parsedA.vector, parsedB.vector]);

  // Persist drafts and camera once they settle into a valid shape.
  useEffect(() => {
    if (!parsedA.vector || !parsedB.vector) return;
    try {
      window.localStorage.setItem(
        VECTOR_STORAGE_KEY,
        JSON.stringify({ a: vectorADraft, b: vectorBDraft, view }),
      );
    } catch {
      // Storage may be unavailable; the session simply won't persist.
    }
  }, [vectorADraft, vectorBDraft, view, parsedA.vector, parsedB.vector]);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawVectorScene(canvas, parsedA.vector, parsedB.vector, view);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [parsedA.vector, parsedB.vector, view, themeId]);

  const updateVectorDraft = (
    target: "a" | "b",
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    const update = (current: VectorDraft): VectorDraft =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)) as VectorDraft;
    if (target === "a") setVectorADraft(update);
    else setVectorBDraft(update);
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setView((current) => ({
      yaw: current.yaw + deltaX * 0.009,
      pitch: Math.max(-1.1, Math.min(1.1, current.pitch + deltaY * 0.009)),
    }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const step = 0.14;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    setView((current) => ({
      yaw: current.yaw + delta[0],
      pitch: Math.max(-1.1, Math.min(1.1, current.pitch + delta[1])),
    }));
  };

  const handleCopyResults = async () => {
    if (!results) return;
    const lines = [
      `A = [${vectorADraft.join(", ")}]`,
      `B = [${vectorBDraft.join(", ")}]`,
      `A · B = ${format(results.dot)}`,
      `A × B = [${results.cross.map(format).join(", ")}]`,
      `|A × B| = ${format(results.area)}`,
      results.angle === null ? null : `angle(A,B) = ${format((results.angle * 180) / Math.PI)}°`,
    ].filter((line): line is string => line !== null);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="os-vector">
      <div className="os-vector-stage">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleCanvasKeyDown}
          aria-label={
            results
              ? `Interactive vector plot. Dot product ${format(results.dot)}. Cross product ${results.cross.map(format).join(", ")}.${results.angle === null ? "" : ` Angle ${format((results.angle * 180) / Math.PI)} degrees.`} Arrow keys orbit.`
              : "Interactive vector plot. Complete both vectors with values from minus three to three."
          }
        />
        <span>Drag or arrow keys to orbit</span>
      </div>

      <div className="os-vector-panel">
        <header>
          <span>Spatial calculator</span>
          <h2>Vector field</h2>
        </header>
        <div className="os-vector-inputs">
          {(["a", "b"] as const).map((target) => {
            const draft = target === "a" ? vectorADraft : vectorBDraft;
            const validation = target === "a" ? parsedA : parsedB;
            const guidanceId = `${domIdPrefix}-${target}-vector-guidance`;
            return (
              <fieldset key={target}>
                <legend>Vector {target.toUpperCase()}</legend>
                {draft.map((value, index) => (
                  <label key={AXIS_LABELS[index]}>
                    <span>{AXIS_LABELS[index]}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck="false"
                      aria-invalid={validation.invalid[index]}
                      aria-describedby={guidanceId}
                      value={value}
                      onChange={(event) => updateVectorDraft(target, index, event)}
                    />
                  </label>
                ))}
                <p
                  className={`os-vector-error${validation.vector ? " is-valid" : ""}`}
                  id={guidanceId}
                  role="status"
                >
                  {validation.vector ? "Range −3 to 3" : "Complete every value from −3 to 3"}
                </p>
              </fieldset>
            );
          })}
        </div>
        <dl className="os-vector-results">
          <div><dt>A · B</dt><dd>{results ? format(results.dot) : "N/A"}</dd></div>
          <div><dt>A × B</dt><dd>{results ? `[${results.cross.map(format).join(", ")}]` : "N/A"}</dd></div>
          <div><dt>Area</dt><dd>{results ? format(results.area) : "N/A"}</dd></div>
          <div>
            <dt>Angle</dt>
            <dd>
              {results && results.angle !== null
                ? `${format((results.angle * 180) / Math.PI)}°`
                : "N/A"}
            </dd>
          </div>
        </dl>
        <div className="os-vector-actions">
          <button type="button" onClick={handleCopyResults} disabled={!results}>
            {copyState === "copied" ? "Copied" : copyState === "failed" ? "Blocked" : "Copy"}
          </button>
          <button
            type="button"
            className="os-vector-random"
            onClick={() => {
              const randomDraft = (): VectorDraft =>
                Array.from({ length: 3 }, () =>
                  String(Math.round((Math.random() * 6 - 3) * 10) / 10),
                ) as VectorDraft;
              setVectorADraft(randomDraft());
              setVectorBDraft(randomDraft());
            }}
          >
            Randomize
          </button>
          <span aria-live="polite">saves locally</span>
        </div>
      </div>
    </div>
  );
}
