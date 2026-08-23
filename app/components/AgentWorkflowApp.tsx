"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "../lib/workbench-sound";

type AgentPreset = "dashboard" | "rls" | "pipeline";

type StepStatus = "pending" | "running" | "completed";

const PRESETS: Record<
  AgentPreset,
  {
    title: string;
    prompt: string;
    steps: Array<{ name: string; tool: string; detail: string; status?: StepStatus }>;
    outputCode: string;
  }
> = {
  dashboard: {
    title: "Synthesize Reactive UI Component",
    prompt: "Generate a zero-dependency SVG sparkline component in React 19 with accessible ARIA metrics.",
    steps: [
      { name: "Parse Component Specs", tool: "schema_analyzer", detail: "Extracted: SVG path builder, auto-scale Y, Intl currency." },
      { name: "Generate TypeScript Interface", tool: "ts_synthesizer", detail: "Defined strictly typed MarketSparklineProps." },
      { name: "Compile SVG Math & Curves", tool: "math_optimizer", detail: "Calculated non-scaling vector path coordinates." },
      { name: "Verify A11y & ARIA Contract", tool: "a11y_validator", detail: "Passed WCAG contrast & screen-reader tree validation." },
    ],
    outputCode: `// Generated via Solynth AI Orchestrator
export function Sparkline({ points, stroke = "#4c5ce5" }: SparklineProps) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const path = points.map((p, i) => \`\${i ? "L" : "M"}\${i * 12} \${100 - ((p - min) / range) * 80}\`).join(" ");
  return (
    <svg viewBox="0 0 240 100" role="img" aria-label="Trend line">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" />
    </svg>
  );
}`,
  },
  rls: {
    title: "Audit Database & Supabase RLS",
    prompt: "Analyze multi-tenant Postgres schema and generate airtight Row-Level Security policies.",
    steps: [
      { name: "Inspect Foreign Keys", tool: "pg_introspect", detail: "Mapped workspaces -> teams -> memberships hierarchy." },
      { name: "Detect Tenant Leak Vector", tool: "security_auditor", detail: "Found unguarded SELECT on workspace_files table." },
      { name: "Synthesize RLS Policy", tool: "sql_generator", detail: "Generated auth.uid() matching team_members condition." },
      { name: "Execute Dry-Run Simulation", tool: "sandbox_runner", detail: "0 cross-tenant leaks across 10,000 synthetic queries." },
    ],
    outputCode: `-- Generated Supabase RLS Security Policy
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for workspace files"
ON public.workspace_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_memberships.team_id = workspace_files.team_id
      AND team_memberships.user_id = auth.uid()
  )
);`,
  },
  pipeline: {
    title: "Orchestrate Multi-Agent Pipeline",
    prompt: "Coordinate parallel workers to summarize pull request diffs and benchmark latency regressions.",
    steps: [
      { name: "Spawn Git Diff Analyzer Subagent", tool: "agent_spawner", detail: "Parsed 14 modified files across 3 workspaces." },
      { name: "Benchmark Bundle Size Impact", tool: "perf_worker", detail: "Measured +0.4kB delta on main client bundle." },
      { name: "Run Integration Tests", tool: "test_runner", detail: "18 unit tests passed in 240ms." },
      { name: "Synthesize Pull Request Summary", tool: "report_builder", detail: "Assembled markdown summary for engineering review." },
    ],
    outputCode: `### Automated PR Summary & Benchmarks
• Architecture: All 15 apps and labs verified.
• Latency: TTFB maintained at 38ms average.
• Type Safety: 0 TypeScript regressions.
• Status: Approved for production deployment.`,
  },
};

export default function AgentWorkflowApp() {
  const [selectedPreset, setSelectedPreset] = useState<AgentPreset>("dashboard");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState(PRESETS.dashboard.outputCode);
  const [currentStepIndex, setCurrentStepIndex] = useState(4);
  const [tokenCount, setTokenCount] = useState(148);
  const [elapsedMs, setElapsedMs] = useState(42);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startStream = useCallback((presetKey: AgentPreset) => {
    playSound("chime");
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedPreset(presetKey);
    setIsStreaming(true);
    setStreamedText("");
    setCurrentStepIndex(0);
    setTokenCount(0);

    const fullText = PRESETS[presetKey].outputCode;
    let charIndex = 0;
    const startTimestamp = Date.now();

    timerRef.current = setInterval(() => {
      charIndex += 4;
      if (charIndex % 32 === 0) {
        playSound("keystroke");
      }

      setStreamedText(fullText.slice(0, charIndex));
      setTokenCount(Math.floor(charIndex / 3.8));
      setElapsedMs(Date.now() - startTimestamp);

      const stepProgress = Math.min(
        Math.floor((charIndex / fullText.length) * PRESETS[presetKey].steps.length),
        PRESETS[presetKey].steps.length
      );
      setCurrentStepIndex(stepProgress);

      if (charIndex >= fullText.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsStreaming(false);
        setCurrentStepIndex(PRESETS[presetKey].steps.length);
        playSound("snap");
      }
    }, 18);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const activePreset = PRESETS[selectedPreset];

  return (
    <div className="agent-app">
      <header className="agent-header">
        <div>
          <h2>Agent.</h2>
          <p>Agentic workflow orchestration, streaming token synthesis, and automated systems engineering.</p>
        </div>
        <div className="agent-presets" role="tablist" aria-label="AI task presets">
          {(Object.keys(PRESETS) as AgentPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selectedPreset === key}
              onClick={() => startStream(key)}
            >
              {PRESETS[key].title}
            </button>
          ))}
        </div>
      </header>

      <div className="agent-workspace">
        <div className="agent-main">
          <div className="agent-prompt-box">
            <span className="agent-tag">User Objective / Task Prompt</span>
            <p className="agent-prompt-text">{activePreset.prompt}</p>
            <div className="agent-prompt-bar">
              <span className="agent-model-badge">solynth-agent-v2-flash</span>
              <button
                type="button"
                className="agent-btn-run"
                disabled={isStreaming}
                onClick={() => startStream(selectedPreset)}
              >
                {isStreaming ? "Streaming Tokens…" : "Re-Run Workflow"}
              </button>
            </div>
          </div>

          <div className="agent-output-container">
            <div className="agent-output-head">
              <span className="agent-output-title">Streaming Output</span>
              <div className="agent-output-meta">
                <span>{tokenCount} Tokens</span>
                <span>{elapsedMs}ms</span>
                <span>~{Math.round((tokenCount / Math.max(elapsedMs, 1)) * 1000)} tokens/sec</span>
              </div>
            </div>
            <pre className="agent-code-block">
              <code>{streamedText || (isStreaming ? "▌" : "")}</code>
            </pre>
          </div>
        </div>

        <aside className="agent-sidebar">
          <span className="agent-tag">Step-by-Step Execution Tree</span>
          <h3>Orchestrator Plan</h3>
          <div className="agent-steps-list">
            {activePreset.steps.map((step, idx) => {
              const isDone = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              return (
                <div
                  key={step.name}
                  className={`agent-step-card ${isDone ? "is-done" : isCurrent ? "is-current" : ""}`}
                >
                  <div className="agent-step-head">
                    <span className="agent-step-idx">{`0${idx + 1}`}</span>
                    <strong>{step.name}</strong>
                    <span className="agent-tool-tag">{step.tool}</span>
                  </div>
                  <p>{step.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="agent-telemetry-box">
            <h4>Workflow Verification</h4>
            <p>
              {currentStepIndex >= activePreset.steps.length
                ? "✓ All tool calls validated. Output clean of syntax and security regressions."
                : "⚙ Executing tool pipeline..."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
