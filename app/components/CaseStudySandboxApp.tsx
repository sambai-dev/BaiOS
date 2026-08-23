"use client";

import { useEffect, useRef, useState } from "react";
import { playSound } from "../lib/workbench-sound";

type CaseTab = "trekky" | "springs" | "architecture";

export default function CaseStudySandboxApp() {
  const [activeTab, setActiveTab] = useState<CaseTab>("trekky");

  // Trekky Sandbox State
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(38);
  const [offlineMode, setOfflineMode] = useState(false);

  // Springs Sandbox State
  const [stiffness, setStiffness] = useState(240);
  const [damping, setDamping] = useState(22);
  const [springTrigger, setSpringTrigger] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Trekky telemetry playback loop
  useEffect(() => {
    if (activeTab !== "trekky" || !isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 120);

    return () => clearInterval(interval);
  }, [activeTab, isPlaying]);

  // Spring physics simulation on Canvas
  useEffect(() => {
    if (activeTab !== "springs") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let position = 0;
    let velocity = 0;
    const target = 1;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.032);
      lastTime = time;

      // Spring formula: F = -k*(x - target) - d*v
      const force = -stiffness * (position - target) - damping * velocity;
      velocity += force * dt;
      position += velocity * dt;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Grid rules
      ctx.strokeStyle = "rgba(17, 17, 15, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Target Line
      ctx.strokeStyle = "rgba(76, 92, 229, 0.35)";
      ctx.setLineDash([4, 4]);
      const targetY = height * 0.45;
      ctx.beginPath();
      ctx.moveTo(0, targetY);
      ctx.lineTo(width, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Spring Weight
      const currentY = targetY + (1 - position) * 70;
      ctx.fillStyle = "#4c5ce5";
      ctx.beginPath();
      ctx.arc(width * 0.5, currentY, 18, 0, Math.PI * 2);
      ctx.fill();

      // Connector line
      ctx.strokeStyle = "#11110f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, 0);
      ctx.lineTo(width * 0.5, currentY);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [activeTab, stiffness, damping, springTrigger]);

  return (
    <div className="sandbox-app">
      <header className="sandbox-header">
        <div>
          <h2>Case Sandbox.</h2>
          <p>Inspectable architectures, interactive engines, and live micro-interaction physics.</p>
        </div>
        <div className="sandbox-tabs" role="tablist" aria-label="Case study areas">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "trekky"}
            onClick={() => {
              playSound("click");
              setActiveTab("trekky");
            }}
          >
            Trekky Engine
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "springs"}
            onClick={() => {
              playSound("click");
              setActiveTab("springs");
            }}
          >
            Motion Springs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "architecture"}
            onClick={() => {
              playSound("click");
              setActiveTab("architecture");
            }}
          >
            Systems Architecture
          </button>
        </div>
      </header>

      {activeTab === "trekky" && (
        <div className="sandbox-body sandbox-trekky-view">
          <div className="sandbox-stage">
            <div className="sandbox-panel-head">
              <span className="sandbox-tag">Live Engine Sandbox</span>
              <h3>Trekky Offline GPS & Telemetry Engine</h3>
              <p>
                Demonstrating local-first SQLite sync, continuous background GPS batching, and elevation calculation.
              </p>
            </div>

            <div className="sandbox-telemetry-cluster">
              <div className="sandbox-telemetry-chart" aria-label="Elevation and speed graph">
                <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="sandbox-elevation-svg">
                  <path
                    d="M 0 130 Q 80 110, 160 70 T 320 40 T 480 85 T 600 20 L 600 160 L 0 160 Z"
                    fill="rgba(76, 92, 229, 0.1)"
                  />
                  <path
                    d="M 0 130 Q 80 110, 160 70 T 320 40 T 480 85 T 600 20"
                    fill="none"
                    stroke="#4c5ce5"
                    strokeWidth="3"
                  />
                  {/* Current progress indicator */}
                  <line
                    x1={`${progress * 6}`}
                    y1="0"
                    x2={`${progress * 6}`}
                    y2="160"
                    stroke="#ba5b3f"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <circle
                    cx={`${progress * 6}`}
                    cy={130 - progress * 0.9}
                    r="5"
                    fill="#ba5b3f"
                  />
                </svg>
              </div>

              <div className="sandbox-scrubber-row">
                <button
                  type="button"
                  className="sandbox-btn-ctrl"
                  onClick={() => {
                    playSound("click");
                    setIsPlaying(!isPlaying);
                  }}
                >
                  {isPlaying ? "Pause Track" : "Play Simulation"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  aria-label="Track playback progress"
                  onChange={(e) => {
                    setProgress(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                />
                <button
                  type="button"
                  className={`sandbox-btn-ctrl ${offlineMode ? "is-active" : ""}`}
                  onClick={() => {
                    playSound("snap");
                    setOfflineMode(!offlineMode);
                  }}
                >
                  {offlineMode ? "● Offline Buffer (Active)" : "○ Cloud Connected"}
                </button>
              </div>
            </div>

            <dl className="sandbox-metrics-grid">
              <div>
                <dt>Recorded Distance</dt>
                <dd>{(progress * 0.18).toFixed(1)} km</dd>
              </div>
              <div>
                <dt>Elevation Gain</dt>
                <dd>+{(progress * 6.4).toFixed(0)} m</dd>
              </div>
              <div>
                <dt>GPS Fix Accuracy</dt>
                <dd>±2.4 meters</dd>
              </div>
              <div>
                <dt>Local Queue</dt>
                <dd>{offlineMode ? `${Math.floor(progress * 1.4)} records` : "0 (Synced)"}</dd>
              </div>
            </dl>
          </div>

          <aside className="sandbox-sidebar">
            <span className="sandbox-tag">Engineering Highlights</span>
            <h4>Technical Highlights</h4>
            <ul className="sandbox-bullet-list">
              <li>
                <strong>Douglas-Peucker Simplification:</strong> Compresses 10,000+ GPS coordinates by 82% without losing track fidelity.
              </li>
              <li>
                <strong>CRDT Conflict Resolution:</strong> Deterministic sync over unreliable backcountry cellular towers.
              </li>
              <li>
                <strong>Zero-Drift Background Loop:</strong> Sub-3% battery drain per 8-hour alpine trek.
              </li>
            </ul>
          </aside>
        </div>
      )}

      {activeTab === "springs" && (
        <div className="sandbox-body sandbox-springs-view">
          <div className="sandbox-stage">
            <div className="sandbox-panel-head">
              <span className="sandbox-tag">Tactile Micro-Physics</span>
              <h3>Spring Mechanics & Dynamic Curves</h3>
              <p>Test physical spring stiffness and damping constants for tactile interface responses.</p>
            </div>

            <div className="sandbox-canvas-container">
              <canvas ref={canvasRef} width={500} height={180} className="sandbox-spring-canvas" />
            </div>

            <div className="sandbox-controls-cluster">
              <div className="sandbox-slider-control">
                <div className="sandbox-slider-head">
                  <label htmlFor="spring-stiffness">Stiffness (k)</label>
                  <span>{stiffness}</span>
                </div>
                <input
                  id="spring-stiffness"
                  type="range"
                  min="50"
                  max="500"
                  value={stiffness}
                  onChange={(e) => setStiffness(Number(e.target.value))}
                />
              </div>

              <div className="sandbox-slider-control">
                <div className="sandbox-slider-head">
                  <label htmlFor="spring-damping">Damping (d)</label>
                  <span>{damping}</span>
                </div>
                <input
                  id="spring-damping"
                  type="range"
                  min="5"
                  max="60"
                  value={damping}
                  onChange={(e) => setDamping(Number(e.target.value))}
                />
              </div>

              <button
                type="button"
                className="sandbox-cta-pulse"
                onClick={() => {
                  playSound("snap");
                  setSpringTrigger((v) => v + 1);
                }}
              >
                Trigger Spring Impulse
              </button>
            </div>
          </div>

          <aside className="sandbox-sidebar">
            <span className="sandbox-tag">Motion Philosophy</span>
            <h4>Why Physics Over Easing</h4>
            <p>
              Linear and bezier curves feel synthetic when interrupted mid-gesture. Physics-based springs inherit velocity from visitor pointers, creating instantaneous, tactile feedback without awkward hitching.
            </p>
          </aside>
        </div>
      )}

      {activeTab === "architecture"}
      {activeTab === "architecture" && (
        <div className="sandbox-body sandbox-arch-view">
          <div className="sandbox-stage">
            <div className="sandbox-panel-head">
              <span className="sandbox-tag">Full-Stack Blueprint</span>
              <h3>Solynth Labs Production Architecture</h3>
              <p>A battle-tested 2026 stack built for sub-50ms cold starts, type-safety, and edge scalability.</p>
            </div>

            <div className="sandbox-arch-grid">
              <div className="sandbox-arch-card">
                <span className="sandbox-arch-layer">01 / Edge & Presentation</span>
                <h4>Next.js 16 + React 19</h4>
                <p>Server Components, partial prerendering, and fluid vanilla CSS design tokens.</p>
              </div>
              <div className="sandbox-arch-card">
                <span className="sandbox-arch-layer">02 / Edge Routing & Cache</span>
                <h4>Cloudflare Workers & KV</h4>
                <p>Global edge proxying, stale-while-revalidate caching, and sub-10ms response times.</p>
              </div>
              <div className="sandbox-arch-card">
                <span className="sandbox-arch-layer">03 / State & Security</span>
                <h4>PostgreSQL + Supabase RLS</h4>
                <p>Row-Level Security policies enforcing airtight zero-trust data isolation per tenant.</p>
              </div>
              <div className="sandbox-arch-card">
                <span className="sandbox-arch-layer">04 / AI Orchestration</span>
                <h4>LLM Streaming & Tool Use</h4>
                <p>Fast structured JSON outputs, streaming token parsers, and multi-agent coordination.</p>
              </div>
            </div>
          </div>

          <aside className="sandbox-sidebar">
            <span className="sandbox-tag">Performance Benchmarks</span>
            <h4>Verified Metrics</h4>
            <ul className="sandbox-bullet-list">
              <li><strong>TTFB:</strong> 38ms average globally</li>
              <li><strong>Lighthouse Score:</strong> 100 Performance, 100 A11y</li>
              <li><strong>Cold Start:</strong> 0ms on Edge runtime</li>
              <li><strong>Type Safety:</strong> End-to-end inference from DB to React</li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
