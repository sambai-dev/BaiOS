// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.
"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { add, angleDegrees, cross, dot, evaluateMission, magnitude, missionDefinitions, projection, type MissionId, type Vector3 } from "../lib/vector-lab-math";
import { createVectorScene, type VectorScene, type VectorView } from "../lib/vector-lab-scene";
import "../styles/vector-lab.css";

export type VectorLabProps = { idPrefix?: string; themeId?: string; isActive?: boolean };
type SavedState = { a: Vector3; b: Vector3; view: VectorView; mission: MissionId; completed: MissionId[] };
type Drag = { id: number; target: "a" | "b" | "camera"; x: number; y: number };
const defaultView: VectorView = { yaw: 0.52, pitch: 0.48 };
const axes = ["X", "Y", "Z"] as const;
const number = (value: number) => Math.abs(value) < 0.005 ? "0" : String(Number(value.toFixed(2)));
const tuple = (vector: Vector3) => vector.map(number).join(", ");
const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");

function CoordinateInput({ id, label, value, disabled, onChange, onValidity }: { id: string; label: string; value: number; disabled: boolean; onChange: (value: number) => void; onValidity: (valid: boolean) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) { setLastValue(value); setDraft(String(value)); }
  const valid = draft.trim() !== "" && Number.isFinite(Number(draft)) && Math.abs(Number(draft)) <= 3;
  return <input id={id} aria-label={label} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={draft} disabled={disabled} aria-invalid={!valid} onChange={(event) => {
    const next = event.currentTarget.value;
    const parsed = Number(next);
    const isValid = next.trim() !== "" && Number.isFinite(parsed) && Math.abs(parsed) <= 3;
    setDraft(next); onValidity(isValid);
    if (isValid) { setLastValue(parsed); onChange(parsed); }
  }} onBlur={() => { if (!valid) { setDraft(String(value)); onValidity(true); } }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />;
}

function readState(key: string): SavedState {
  const first = missionDefinitions[0]!;
  const fallback: SavedState = { a: [...first.initialA], b: [...first.initialB], view: defaultView, mission: "dock", completed: [] };
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) || "null");
    if (!saved || typeof saved !== "object") return fallback;
    const vector = (value: unknown): Vector3 | null => Array.isArray(value) && value.length === 3 && value.every((entry) => (typeof entry === "string" || typeof entry === "number") && String(entry).trim() !== "" && Number.isFinite(Number(entry)) && Math.abs(Number(entry)) <= 3) ? value.map(Number) as Vector3 : null;
    const a = vector(saved.a), b = vector(saved.b);
    const mission = missionDefinitions.some((item) => item.id === saved.mission) ? saved.mission as MissionId : a && b ? "explore" : "dock";
    const definition = missionDefinitions.find((item) => item.id === mission)!;
    return {
      a: a || [...definition.initialA], b: definition.fixedB ? [...definition.initialB] : b || [...definition.initialB], mission,
      view: Number.isFinite(saved.view?.yaw) && Number.isFinite(saved.view?.pitch) ? { yaw: Math.max(-Math.PI, Math.min(Math.PI, saved.view.yaw)), pitch: Math.max(0.12, Math.min(1.2, saved.view.pitch)) } : defaultView,
      completed: Array.isArray(saved.completed) ? [...new Set<MissionId>(saved.completed.filter((id: unknown) => id === "dock" || id === "thrust" || id === "lift"))] : [],
    };
  } catch { return fallback; }
}

export default function VectorLab({ idPrefix, themeId, isActive = true }: VectorLabProps = {}) {
  const generatedId = useId();
  const domId = `${safeId(idPrefix || "vector")}-${safeId(generatedId)}`;
  const storageKey = `sam-workbench-vector-v1${idPrefix?.trim() ? `:${safeId(idPrefix.trim())}` : ""}`;
  const [state, setState] = useState(() => readState(storageKey));
  const [selected, setSelected] = useState<"a" | "b">("a");
  const [plane, setPlane] = useState<"xy" | "xz">("xy");
  const [operation, setOperation] = useState<"sum" | "projection" | "cross">("sum");
  const [attempt, setAttempt] = useState<"ready" | "running" | "passed" | "missed">("ready");
  const [hint, setHint] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [invalidCoordinate, setInvalidCoordinate] = useState(false);
  const [copyState, setCopyState] = useState("Copy results");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleARef = useRef<HTMLButtonElement>(null);
  const handleBRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<VectorScene | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const finishRef = useRef<() => void>(() => {});
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const definition = missionDefinitions.find((item) => item.id === state.mission)!;
  const evaluation = useMemo(() => evaluateMission(state.mission, state.a, state.b), [state.mission, state.a, state.b]);
  const output = useMemo(() => state.mission !== "explore" ? evaluation.output : operation === "cross" ? cross(state.a, state.b) : operation === "projection" ? projection(state.a, state.b) : add(state.a, state.b), [state.mission, state.a, state.b, evaluation.output, operation]);
  const angle = angleDegrees(state.a, state.b);
  const current = selected === "a" ? state.a : state.b;
  const locked = selected === "b" && definition.fixedB;
  const equation = state.mission === "lift" || state.mission === "explore" && operation === "cross" ? "A × B" : state.mission === "thrust" || state.mission === "explore" && operation === "projection" ? "A along B" : "A + B";

  useEffect(() => {
    finishRef.current = () => {
      setAttempt(evaluation.success ? "passed" : "missed");
      if (evaluation.success) setState((previous) => ({ ...previous, completed: [...new Set([...previous.completed, previous.mission])] }));
    };
  }, [evaluation.success]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const scene = createVectorScene(canvas, {
        onProject: (a, b) => {
          [[handleARef.current, a], [handleBRef.current, b]].forEach(([handle, point]) => {
            const element = handle as HTMLButtonElement | null;
            const position = point as typeof a;
            if (!element) return;
            element.style.left = `${position.x}px`;
            element.style.top = `${position.y}px`;
            element.style.visibility = position.visible ? "visible" : "hidden";
          });
        },
        onFinish: () => finishRef.current(),
      });
      sceneRef.current = scene;
      return () => { scene.dispose(); sceneRef.current = null; };
    } catch {
      let cancelled = false;
      queueMicrotask(() => { if (!cancelled) setSceneError(true); });
      return () => { cancelled = true; };
    }
  }, []);

  useEffect(() => { sceneRef.current?.update({ a: state.a, b: state.b, output, target: evaluation.target, mission: state.mission, view: state.view, success: evaluation.success }); }, [state.a, state.b, state.mission, state.view, output, evaluation.target, evaluation.success, themeId]);
  useEffect(() => { sceneRef.current?.setActive(isActive); }, [isActive]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { window.localStorage.setItem(storageKey, JSON.stringify({ ...state, a: state.a.map(String), b: state.b.map(String) })); } catch { /* A private session remains fully usable. */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [state, storageKey]);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const changeVector = (target: "a" | "b", vector: Vector3) => {
    if (attempt === "running" || target === "b" && definition.fixedB) return;
    setState((previous) => ({ ...previous, [target]: vector }));
    setInvalidCoordinate(false);
    setAttempt("ready");
  };
  const chooseMission = (mission: MissionId) => {
    const next = missionDefinitions.find((item) => item.id === mission)!;
    setState((previous) => ({ ...previous, mission, a: [...next.initialA], b: [...next.initialB] }));
    setSelected("a"); setAttempt("ready"); setHint(false); setPlane("xy");
  };
  const pointerDown = (event: PointerEvent<HTMLElement>, target: Drag["target"]) => {
    if (event.button !== 0 || dragRef.current || attempt === "running" || target === "b" && definition.fixedB) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    dragRef.current = { id: event.pointerId, target, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (target !== "camera") setSelected(target);
  };
  const pointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.target === "camera") {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      setState((previous) => ({ ...previous, view: { yaw: ((previous.view.yaw - dx * 0.009 + Math.PI * 3) % (Math.PI * 2)) - Math.PI, pitch: Math.max(0.12, Math.min(1.2, previous.view.pitch + dy * 0.007)) } }));
    } else {
      const value = sceneRef.current?.drag(event.clientX, event.clientY, plane, state[drag.target]);
      if (value) changeVector(drag.target, value);
    }
    drag.x = event.clientX; drag.y = event.clientY;
  };
  const pointerUp = (event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleKey = (event: KeyboardEvent<HTMLElement>, target: "a" | "b" | "camera") => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const sign = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
    if (target === "camera") setState((previous) => ({ ...previous, view: { yaw: previous.view.yaw + (horizontal ? sign * 0.12 : 0), pitch: Math.max(0.12, Math.min(1.2, previous.view.pitch + (horizontal ? 0 : sign * 0.12))) } }));
    else {
      const next = [...state[target]] as Vector3;
      const index = horizontal ? 0 : plane === "xy" ? 1 : 2;
      next[index] = Math.max(-3, Math.min(3, Math.round((next[index] + sign * (event.shiftKey ? 0.5 : 0.1)) * 10) / 10));
      changeVector(target, next);
    }
  };
  const run = () => {
    setAttempt("running");
    // On a phone the controls sit below the scene. Bring the actual outcome
    // back into view before the on-demand renderer starts its test flight.
    const canvas = canvasRef.current;
    const lab = canvas?.closest<HTMLElement>(".vector-lab");
    if (canvas && lab) {
      const sceneRect = canvas.getBoundingClientRect();
      const labRect = lab.getBoundingClientRect();
      if (sceneRect.top < labRect.top || sceneRect.bottom > labRect.bottom) {
        lab.scrollTo({ top: Math.max(0, lab.scrollTop + sceneRect.top - labRect.top - 12), behavior: "instant" });
      }
    }
    if (sceneError) finishRef.current();
    else sceneRef.current?.launch(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`A = [${tuple(state.a)}]\nB = [${tuple(state.b)}]\n${equation} = [${tuple(output)}]\nA · B = ${number(dot(state.a, state.b))}\nAngle = ${angle === null ? "undefined" : `${number(angle)}°`}`); setCopyState("Copied"); }
    catch { setCopyState("Copy unavailable"); }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("Copy results"), 1800);
  };

  return (
    <section className="vector-lab" aria-label="Vector Lab interactive experiments">
      <header className="vl-header"><div><span className="vl-brand-mark" aria-hidden="true">↗</span><h2>Vector Lab</h2><span className="vl-header-subtitle">Ideas you can move.</span></div><span className="vl-progress-label">{state.completed.length}/3 completed</span></header>
      <nav className="vl-missions" aria-label="Vector experiments">
        {missionDefinitions.map((item, index) => <button type="button" key={item.id} onClick={() => chooseMission(item.id)} aria-current={state.mission === item.id ? "step" : undefined} disabled={attempt === "running"}><span>{state.completed.includes(item.id) ? "✓" : item.id === "explore" ? "↗" : `0${index + 1}`}</span>{["Dock", "Thrust", "Lift", "Explore"][index]}</button>)}
      </nav>
      <div className="vl-mobile-brief"><strong>{definition.title}</strong><p>{definition.instruction}</p></div>
      <div className="vl-workspace">
        <div className="vl-scene-column">
          <div className="vl-scene">
            <div className="vl-scene-caption"><span>LIVE EXPERIMENT</span><strong>{equation} <span>=</span> [{tuple(output)}]</strong></div>
            {attempt !== "ready" && <span className={`vl-scene-outcome vl-scene-outcome-${attempt}`}>{attempt === "running" ? "Testing your vectors…" : attempt === "passed" ? "✓ Target reached" : state.mission === "explore" ? "Probe arrived" : "Missed the target · adjust & retry"}</span>}
            <canvas ref={canvasRef} tabIndex={0} aria-label={`3D vector experiment. ${equation} equals ${tuple(output)}. Drag empty space or use arrow keys to rotate the view. Use the A and B handles or coordinate controls to change vectors.`} onPointerDown={(event) => pointerDown(event, "camera")} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={(event) => handleKey(event, "camera")} />
            {!sceneError && (["a", "b"] as const).map((target) => <button key={target} ref={target === "a" ? handleARef : handleBRef} className={`vl-handle vl-handle-${target}${selected === target ? " is-selected" : ""}`} type="button" aria-label={`Vector ${target.toUpperCase()} handle${target === "b" && definition.fixedB ? ", fixed guide" : ". Drag to move, or use arrow keys"}`} aria-disabled={target === "b" && definition.fixedB || attempt === "running"} onClick={() => setSelected(target)} onPointerDown={(event) => pointerDown(event, target)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={(event) => handleKey(event, target)}>{target.toUpperCase()}{target === "b" && definition.fixedB && <span aria-hidden="true">·</span>}</button>)}
            {sceneError && <div className="vl-fallback"><strong>Use the coordinate controls to experiment.</strong><p>Your browser could not start the 3D view. All calculations and missions still work.</p></div>}
            <div className="vl-scene-legend"><span><i className="vl-key-a" />A · your force</span><span><i className="vl-key-b" />B · {definition.fixedB ? "fixed guide" : "second force"}</span><span><i className="vl-key-result" />result</span></div>
          </div>
          <div className="vl-scene-tools"><span>Drag a letter to move it. Drag space to orbit.</span><button type="button" onClick={() => setState((previous) => ({ ...previous, view: defaultView }))}>Reset view</button></div>
          <div className="vl-observations"><div><span>ANGLE BETWEEN</span><strong>{angle === null ? "Undefined" : `${number(angle)}°`}</strong></div><div><span>DOT PRODUCT</span><strong>{number(dot(state.a, state.b))}</strong></div><div><span>RESULT LENGTH</span><strong>{number(magnitude(output))}<small> units</small></strong></div></div>
        </div>
        <aside className="vl-panel">
          <div className="vl-brief"><span className="vl-eyebrow">{state.mission === "explore" ? "Your own experiment" : `Experiment ${missionDefinitions.indexOf(definition) + 1} / 3`}</span><h3>{definition.title}</h3><p>{definition.instruction}</p></div>
          {state.mission === "explore" ? <label className="vl-operation" htmlFor={`${domId}-operation`}>Show the result of<select id={`${domId}-operation`} disabled={attempt === "running"} value={operation} onChange={(event) => { setOperation(event.target.value as typeof operation); setAttempt("ready"); }}><option value="sum">Addition · A + B</option><option value="projection">Projection · A along B</option><option value="cross">Cross product · A × B</option></select></label> : <div className={`vl-feedback${evaluation.success ? " is-aligned" : ""}`}><div><span>{evaluation.success ? "Ready to test" : "Target match"}</span><strong>{Math.round(evaluation.score)}%</strong></div><progress max={100} value={evaluation.score} aria-label="Target match" /><p>{evaluation.feedback}</p></div>}
          <div className="vl-vector-controls"><div className="vl-control-heading"><div role="group" aria-label="Choose a vector"><button type="button" aria-pressed={selected === "a"} onClick={() => setSelected("a")}>Vector A</button><button type="button" aria-pressed={selected === "b"} onClick={() => setSelected("b")}>Vector B{definition.fixedB ? " · fixed" : ""}</button></div></div><div className="vl-coordinates">{axes.map((axis, index) => <label key={axis} htmlFor={`${domId}-${selected}-${axis}`}><span>{axis}</span><CoordinateInput key={`${selected}-${axis}`} id={`${domId}-${selected}-${axis}`} label={`Vector ${selected.toUpperCase()} ${axis}`} value={current[index]!} disabled={locked || attempt === "running"} onValidity={(valid) => setInvalidCoordinate(!valid)} onChange={(value) => { const next = [...current] as Vector3; next[index] = value; changeVector(selected, next); }} /></label>)}</div><div className="vl-plane-control"><span>{invalidCoordinate ? "Use a number from −3 to 3." : locked ? "This guide stays fixed." : "Drag plane"}</span>{!locked && <div role="group" aria-label="Drag plane"><button type="button" aria-pressed={plane === "xy"} onClick={() => setPlane("xy")}>X / Y</button><button type="button" aria-pressed={plane === "xz"} onClick={() => setPlane("xz")}>X / Z</button></div>}</div></div>
          <button type="button" className="vl-run" onClick={run} disabled={attempt === "running" || invalidCoordinate}>{attempt === "running" ? "Testing…" : state.mission === "explore" ? "Send the probe" : "Test this setup"}<span aria-hidden="true">↗</span></button>
          <div className={`vl-attempt vl-attempt-${attempt}`} aria-live="polite">{attempt === "passed" ? "Target reached. You made the math work." : attempt === "missed" && state.mission !== "explore" ? "The probe missed. Adjust a vector and try again." : attempt === "missed" ? `The probe moved to [${tuple(output)}]. Try another operation.` : attempt === "running" ? "Following your result vector…" : "The white probe follows your result when you test."}</div>
          {attempt === "passed" && state.mission !== "explore" && <button type="button" className="vl-next" onClick={() => chooseMission(missionDefinitions[missionDefinitions.indexOf(definition) + 1]!.id)}>{state.mission === "lift" ? "All three complete · Explore freely" : "Next experiment"} <span aria-hidden="true">→</span></button>}
          <div className="vl-learning"><button type="button" aria-expanded={hint} onClick={() => setHint(!hint)}>{hint ? "Hide the explanation" : "How does this work?"}<span aria-hidden="true">{hint ? "−" : "+"}</span></button>{hint && <p>{definition.meaning} {state.mission === "lift" && "With B = (0, 0, 2), try making A point left: the result points up."}</p>}</div>
          <footer className="vl-panel-footer"><button type="button" onClick={() => chooseMission(state.mission)} disabled={attempt === "running"}>Start over</button><button type="button" onClick={copy}>{copyState}</button><span>Saved on this device</span></footer>
        </aside>
      </div>
    </section>
  );
}
