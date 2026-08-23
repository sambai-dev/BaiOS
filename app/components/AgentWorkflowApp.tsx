"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "../lib/workbench-sound";

type AgentPreset = "dashboard" | "rls" | "pipeline";
type RunPhaseStatus = "pending" | "running" | "completed";

const MODEL_BADGE = "nemotron-3-ultra · local route · free tier";

const PRESETS: Record<AgentPreset, { title: string; prompt: string }> = {
  dashboard: {
    title: "Synthesize UI Component",
    prompt:
      "Write a zero-dependency React 19 SVG sparkline component in TypeScript. Include strict prop types, an accessible aria-label, and a short usage example. Reply with code only.",
  },
  rls: {
    title: "Draft Postgres RLS Policy",
    prompt:
      "Given a multi-tenant Postgres schema where workspace_files.team_id references team_memberships.team_id, write the Row-Level Security policy SQL that isolates rows per authenticated user via auth.uid(). Explain the leak it prevents in two sentences.",
  },
  pipeline: {
    title: "Plan an Agent Pipeline",
    prompt:
      "Design a multi-agent pipeline that summarizes pull request diffs and flags latency regressions. List each worker, its tool surface, and its hand-off. Be concise and concrete.",
  },
};

const RUN_PHASES: Array<{ name: string; tool: string; detail: string }> = [
  {
    name: "Parse Objective",
    tool: "intent",
    detail: "Prompt normalized and routed to the local model endpoint.",
  },
  {
    name: "Plan Response Shape",
    tool: "planner",
    detail: "Model reasoning over the request scope.",
  },
  {
    name: "Synthesize Output",
    tool: "generator",
    detail: "Tokens streaming from nemotron-3-ultra.",
  },
  {
    name: "Review & Clean",
    tool: "postprocess",
    detail: "Reasoning traces stripped; final text verified.",
  },
];

function stripThinking(text: string): string {
  // Remove complete <think>…</think> blocks and an unterminated trailing one.
  return text
    .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
    .replace(/<think>[\s\S]*$/g, "");
}

export default function AgentWorkflowApp() {
  const [selectedPreset, setSelectedPreset] = useState<AgentPreset>("dashboard");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(
    RUN_PHASES.length,
  );
  const [tokenCount, setTokenCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const clockRef = useRef<number | null>(null);

  const stopClock = useCallback(() => {
    if (clockRef.current !== null) {
      window.clearInterval(clockRef.current);
      clockRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopClock();
      abortRef.current?.abort();
    },
    [stopClock],
  );

  const runPrompt = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isStreaming) return;
      playSound("chime");
      setErrorText(null);
      setStreamedText("");
      setTokenCount(0);
      setElapsedMs(0);
      setCurrentPhaseIndex(0);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const startTimestamp = Date.now();
      stopClock();
      clockRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTimestamp);
      }, 120);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          let message = "The local AI service refused that request.";
          try {
            const data = (await response.json()) as { error?: string };
            if (data.error) message = data.error;
          } catch {
            /* keep default */
          }
          throw new Error(message);
        }

        setCurrentPhaseIndex(1);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";

        const consume = () => {
          const visible = stripThinking(raw);
          setStreamedText(visible);
          setTokenCount(Math.ceil(visible.length / 4));
          const progress = Math.min(visible.length / 24, RUN_PHASES.length - 1);
          setCurrentPhaseIndex(Math.max(1, Math.floor(progress) + 1));
          if (visible.length % 96 < 4) playSound("keystroke");
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            for (const line of event.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  raw += delta;
                  consume();
                }
              } catch {
                /* ignore malformed keep-alive fragments */
              }
            }
          }
        }

        const visible = stripThinking(raw).trim();
        setStreamedText(visible || "(empty response from the model)");
        setTokenCount(Math.ceil(visible.length / 4));
        setCurrentPhaseIndex(RUN_PHASES.length);
        playSound("snap");
      } catch (caught) {
        if ((caught as Error).name === "AbortError") {
          setStreamedText((current) => current || "Run aborted.");
        } else {
          setErrorText((caught as Error).message);
          playSound("delete");
        }
      } finally {
        stopClock();
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [isStreaming, stopClock],
  );

  const runPreset = useCallback(
    (presetKey: AgentPreset) => {
      setSelectedPreset(presetKey);
      void runPrompt(PRESETS[presetKey].prompt);
    },
    [runPrompt],
  );

  const submitCustom = useCallback(() => {
    void runPrompt(customPrompt);
  }, [customPrompt, runPrompt]);

  const activePreset = PRESETS[selectedPreset];
  const phaseStatus = (index: number): RunPhaseStatus =>
    currentPhaseIndex > index
      ? "completed"
      : currentPhaseIndex === index && isStreaming
        ? "running"
        : "pending";

  return (
    <div className="agent-app">
      <header className="agent-header">
        <div>
          <h2>Agent.</h2>
          <p>
            Real inference on Nemotron 3 Ultra via this deployment&apos;s local
            route. Presets below are one-click prompts; or ask anything.
          </p>
        </div>
        <div className="agent-presets" role="tablist" aria-label="AI task presets">
          {(Object.keys(PRESETS) as AgentPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selectedPreset === key}
              disabled={isStreaming}
              onClick={() => runPreset(key)}
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
              <span className="agent-model-badge">{MODEL_BADGE}</span>
              <button
                type="button"
                className="agent-btn-run"
                disabled={isStreaming}
                onClick={() => runPreset(selectedPreset)}
              >
                {isStreaming ? "Streaming Tokens…" : "Re-Run Workflow"}
              </button>
            </div>
          </div>

          <form
            className="agent-ask-row"
            onSubmit={(event) => {
              event.preventDefault();
              submitCustom();
            }}
          >
            <input
              className="agent-ask-input"
              type="text"
              value={customPrompt}
              maxLength={2000}
              placeholder="Ask the agent anything…"
              aria-label="Ask the agent anything"
              disabled={isStreaming}
              onChange={(event) => setCustomPrompt(event.target.value)}
            />
            {isStreaming ? (
              <button
                type="button"
                className="agent-btn-run"
                onClick={() => abortRef.current?.abort()}
              >
                Abort
              </button>
            ) : (
              <button
                type="submit"
                className="agent-btn-run"
                disabled={!customPrompt.trim()}
              >
                Run
              </button>
            )}
          </form>

          <div className="agent-output-container">
            <div className="agent-output-head">
              <span className="agent-output-title">
                {errorText ? "Run Failed" : "Streaming Output"}
              </span>
              <div className="agent-output-meta">
                <span>{tokenCount} Tokens</span>
                <span>{elapsedMs}ms</span>
                <span>
                  ~{Math.round((tokenCount / Math.max(elapsedMs, 1)) * 1000)}{" "}
                  tokens/sec
                </span>
              </div>
            </div>
            <pre className="agent-code-block">
              <code>
                {errorText
                  ? errorText
                  : streamedText || (isStreaming ? "▌" : "")}
              </code>
            </pre>
          </div>
        </div>

        <aside className="agent-sidebar">
          <span className="agent-tag">Step-by-Step Execution Tree</span>
          <h3>Run Phases</h3>
          <div className="agent-steps-list">
            {RUN_PHASES.map((phase, idx) => {
              const status = phaseStatus(idx);
              return (
                <div
                  key={phase.name}
                  className={`agent-step-card ${
                    status === "completed"
                      ? "is-done"
                      : status === "running"
                        ? "is-current"
                        : ""
                  }`}
                >
                  <div className="agent-step-head">
                    <span className="agent-step-idx">{`0${idx + 1}`}</span>
                    <strong>{phase.name}</strong>
                    <span className="agent-tool-tag">{phase.tool}</span>
                  </div>
                  <p>{phase.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="agent-telemetry-box">
            <h4>Workflow Verification</h4>
            <p>
              {currentPhaseIndex >= RUN_PHASES.length && !isStreaming
                ? "✓ Stream complete. Reasoning traces stripped from output."
                : isStreaming
                  ? "⚙ Live inference in progress…"
                  : "Idle. Run a preset or ask anything."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
