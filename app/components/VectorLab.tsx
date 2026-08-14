"use client";

import {
  type ChangeEvent,
  type PointerEvent,
  useEffect,
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

const AXIS_LABELS = ["X", "Y", "Z"] as const;

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
  context.fillStyle = "#f0eddb";
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.strokeStyle = "rgba(16, 16, 14, 0.16)";
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
  context.strokeStyle = "rgba(16, 16, 14, 0.66)";
  context.fillStyle = "#10100e";
  context.font = "10px monospace";
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
    context.font = "600 11px monospace";
    context.fillText(label, end.x + 8, end.y + 14);
  };

  if (vectorA) drawArrow(vectorA, "#1424f5", "A");
  if (vectorB) drawArrow(vectorB, "#df3d26", "B");
}

function format(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export default function VectorLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState>(null);
  const [vectorADraft, setVectorADraft] = useState<VectorDraft>(["1.8", "1.2", "0.6"]);
  const [vectorBDraft, setVectorBDraft] = useState<VectorDraft>(["-0.8", "1.7", "1.4"]);
  const [view, setView] = useState<ViewState>({ yaw: -0.55, pitch: 0.45 });

  const parsedA = useMemo(() => parseVectorDraft(vectorADraft), [vectorADraft]);
  const parsedB = useMemo(() => parseVectorDraft(vectorBDraft), [vectorBDraft]);

  const results = useMemo(() => {
    if (!parsedA.vector || !parsedB.vector) return null;
    const crossProduct = cross(parsedA.vector, parsedB.vector);
    return {
      dot: dot(parsedA.vector, parsedB.vector),
      cross: crossProduct,
      area: magnitude(crossProduct),
    };
  }, [parsedA.vector, parsedB.vector]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawVectorScene(canvas, parsedA.vector, parsedB.vector, view);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [parsedA.vector, parsedB.vector, view]);

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

  return (
    <div className="os-vector">
      <div className="os-vector-stage">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={
            results
              ? `Interactive vector plot. Dot product ${format(results.dot)}. Cross product ${results.cross.map(format).join(", ")}.`
              : "Interactive vector plot. Complete both vectors with values from minus three to three."
          }
        />
        <span>Drag to orbit</span>
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
                      aria-describedby={`${target}-vector-guidance`}
                      value={value}
                      onChange={(event) => updateVectorDraft(target, index, event)}
                    />
                  </label>
                ))}
                <p
                  className={`os-vector-error${validation.vector ? " is-valid" : ""}`}
                  id={`${target}-vector-guidance`}
                  role="status"
                >
                  {validation.vector ? "Range −3 to 3" : "Complete every value from −3 to 3"}
                </p>
              </fieldset>
            );
          })}
        </div>
        <dl className="os-vector-results">
          <div><dt>A · B</dt><dd>{results ? format(results.dot) : "—"}</dd></div>
          <div><dt>A × B</dt><dd>{results ? `[${results.cross.map(format).join(", ")}]` : "—"}</dd></div>
          <div><dt>Area</dt><dd>{results ? format(results.area) : "—"}</dd></div>
        </dl>
      </div>
    </div>
  );
}
