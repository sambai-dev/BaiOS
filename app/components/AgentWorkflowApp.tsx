// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "../lib/workbench-sound";

type AgentPreset = "dashboard" | "rls" | "pipeline";
type RunPhaseStatus =
  "pending" | "running" | "completed" | "stopped" | "failed";
type RunOutcome =
  "idle" | "requesting" | "streaming" | "complete" | "aborted" | "error";
type PromptSource = AgentPreset | "custom";
type LastRun = { prompt: string; source: PromptSource };

const PROVIDER_TARGET_BADGE =
  "Provider target · OpenRouter · server-side route";

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
    name: "Prepare Request",
    tool: "client",
    detail: "The browser prepares the submitted prompt for this site’s route.",
  },
  {
    name: "Contact Provider",
    tool: "server",
    detail: "The route attempts to request a response from OpenRouter.",
  },
  {
    name: "Receive Stream",
    tool: "network",
    detail: "Response chunks arrive after the provider accepts the request.",
  },
  {
    name: "Finalize Display",
    tool: "interface",
    detail:
      "The client removes hidden thinking blocks and renders visible text.",
  },
];

const PHASE_STATUS_LABELS: Record<RunPhaseStatus, string> = {
  pending: "Pending",
  running: "In progress",
  completed: "Complete",
  stopped: "Stopped",
  failed: "Failed",
};

function stripThinking(text: string): string {
  // Remove complete <think>…</think> blocks and an unterminated trailing one.
  return text
    .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
    .replace(/<think>[\s\S]*$/g, "");
}

export default function AgentWorkflowApp() {
  const [selectedPreset, setSelectedPreset] = useState<AgentPreset | null>(
    "dashboard",
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [runOutcome, setRunOutcome] = useState<RunOutcome>("idle");
  const [providerResponseConfirmed, setProviderResponseConfirmed] =
    useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [estimatedTokenCount, setEstimatedTokenCount] = useState(0);
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
    async (prompt: string, source: PromptSource) => {
      const submittedPrompt = prompt.trim();
      if (!submittedPrompt || isRunning) return;
      playSound("chime");
      setLastRun({ prompt: submittedPrompt, source });
      if (source === "custom") setSelectedPreset(null);
      setErrorText(null);
      setStreamedText("");
      setRunOutcome("requesting");
      setProviderResponseConfirmed(false);
      setEstimatedTokenCount(0);
      setElapsedMs(0);
      setCurrentPhaseIndex(0);
      setIsRunning(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const startTimestamp = Date.now();
      stopClock();
      clockRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTimestamp);
      }, 120);

      try {
        setCurrentPhaseIndex(1);
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: submittedPrompt }],
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          let message = "The AI service refused that request.";
          try {
            const data = (await response.json()) as { error?: string };
            if (data.error) message = data.error;
          } catch {
            /* keep default */
          }
          throw new Error(message);
        }

        setProviderResponseConfirmed(true);
        setRunOutcome("streaming");
        setCurrentPhaseIndex(2);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";
        // One keystroke tick per 96 characters of visible output; measured
        // against a high-water mark so a frozen visible length (while the
        // model is inside <think>…</think>) never machine-guns the sound.
        let keystrokeMark = 0;

        const consume = () => {
          const visible = stripThinking(raw);
          setStreamedText(visible);
          setEstimatedTokenCount(Math.ceil(visible.length / 4));
          if (visible.length - keystrokeMark >= 96) {
            keystrokeMark += 96;
            playSound("keystroke");
          }
        };

        const handleEvents = (events: string[]) => {
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
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          handleEvents(events);
        }

        // Flush the tail: a final SSE event terminated by EOF rather than a
        // blank line must not be dropped, or the last tokens disappear.
        // Malformed fragments are already ignored inside handleEvents, so
        // every remaining segment is safe to process.
        buffer += decoder.decode();
        handleEvents(buffer.split("\n\n"));
        buffer = "";

        setCurrentPhaseIndex(3);
        const visible = stripThinking(raw).trim();
        setStreamedText(visible || "(empty response from the model)");
        setEstimatedTokenCount(Math.ceil(visible.length / 4));
        setCurrentPhaseIndex(RUN_PHASES.length);
        setRunOutcome("complete");
        playSound("snap");
      } catch (caught) {
        if ((caught as Error).name === "AbortError") {
          setRunOutcome("aborted");
          setStreamedText((current) =>
            current
              ? `${current}\n\n[Run stopped: partial output is incomplete.]`
              : "Run stopped before a response was received. No complete output is available.",
          );
        } else {
          setRunOutcome("error");
          setErrorText((caught as Error).message);
          playSound("delete");
        }
      } finally {
        stopClock();
        abortRef.current = null;
        setIsRunning(false);
      }
    },
    [isRunning, stopClock],
  );

  const runPreset = useCallback(
    (presetKey: AgentPreset) => {
      setSelectedPreset(presetKey);
      void runPrompt(PRESETS[presetKey].prompt, presetKey);
    },
    [runPrompt],
  );

  const submitCustom = useCallback(() => {
    void runPrompt(customPrompt, "custom");
  }, [customPrompt, runPrompt]);

  const readyPrompt = selectedPreset
    ? PRESETS[selectedPreset].prompt
    : PRESETS.dashboard.prompt;
  const displayedPrompt = lastRun?.prompt ?? readyPrompt;
  const displayedPromptSource =
    lastRun?.source ?? selectedPreset ?? "dashboard";
  const phaseStatus = (index: number): RunPhaseStatus => {
    if (runOutcome === "complete" || currentPhaseIndex > index) {
      return "completed";
    }
    if (currentPhaseIndex !== index) return "pending";
    if (runOutcome === "requesting" || runOutcome === "streaming") {
      return "running";
    }
    if (runOutcome === "aborted") return "stopped";
    if (runOutcome === "error") return "failed";
    return "pending";
  };

  const showOutputDisclosure =
    runOutcome === "requesting" ||
    runOutcome === "streaming" ||
    runOutcome === "complete" ||
    runOutcome === "aborted";

  return (
    <div className="agent-app">
      <header className="agent-header">
        <div>
          <h2>Agent.</h2>
          <p>
            When available, this site&apos;s server route sends prompts to
            OpenRouter. The model identifier is not exposed here. Do not include
            confidential information.
          </p>
        </div>
        <div
          className="agent-presets"
          role="group"
          aria-label="AI task presets"
        >
          {(Object.keys(PRESETS) as AgentPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={selectedPreset === key}
              disabled={isRunning}
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
            <span className="agent-tag">
              {lastRun ? "Last submitted prompt" : "Prompt ready to run"}
            </span>
            <p className="agent-prompt-text">{displayedPrompt}</p>
            <div className="agent-prompt-bar">
              <span className="agent-model-badge">{PROVIDER_TARGET_BADGE}</span>
              <button
                type="button"
                className="agent-btn-run"
                disabled={isRunning}
                onClick={() =>
                  void runPrompt(displayedPrompt, displayedPromptSource)
                }
              >
                {isRunning ? "Request in progress…" : "Run prompt again"}
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
              name="agent-prompt"
              type="text"
              value={customPrompt}
              maxLength={2000}
              placeholder="Ask the agent anything…"
              aria-label="Ask the agent anything"
              autoComplete="off"
              disabled={isRunning}
              onChange={(event) => setCustomPrompt(event.target.value)}
            />
            {isRunning ? (
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
                {runOutcome === "idle"
                  ? "No output yet"
                  : runOutcome === "requesting"
                    ? "Connecting to provider"
                    : runOutcome === "streaming"
                      ? "Streaming output"
                      : runOutcome === "complete"
                        ? "Response output"
                        : runOutcome === "aborted"
                          ? "Incomplete output"
                          : "Run failed"}
              </span>
              <div className="agent-output-meta">
                <span>≈{estimatedTokenCount} tokens estimated</span>
                <span>{elapsedMs}ms</span>
                <span>
                  ≈
                  {Math.round(
                    (estimatedTokenCount / Math.max(elapsedMs, 1)) * 1000,
                  )}{" "}
                  tokens/s estimated
                </span>
              </div>
            </div>
            {showOutputDisclosure ? (
              <p className="agent-output-disclosure">
                <strong>
                  {providerResponseConfirmed
                    ? "Provider: OpenRouter response confirmed."
                    : "Provider target: OpenRouter; no provider response confirmed yet."}
                </strong>{" "}
                AI output is unverified and may be inaccurate. Validate code,
                facts, and security-sensitive guidance before use.
              </p>
            ) : null}
            <pre className="agent-code-block">
              <code>
                {errorText
                  ? errorText
                  : streamedText ||
                    (runOutcome === "requesting"
                      ? "Waiting for the server route…"
                      : runOutcome === "streaming"
                        ? "Waiting for the first response chunk…"
                        : "")}
              </code>
            </pre>
          </div>
        </div>

        <aside className="agent-sidebar">
          <span className="agent-tag">Request lifecycle illustration</span>
          <h3>Interface stages · simulated</h3>
          <p className="agent-stage-note">
            These stages describe the client request and stream lifecycle. They
            are not provider reasoning, tool calls, or execution traces.
          </p>
          <div className="agent-steps-list">
            {RUN_PHASES.map((phase, idx) => {
              const status = phaseStatus(idx);
              return (
                <div
                  key={phase.name}
                  className="agent-step-card"
                  data-status={status}
                  aria-current={status === "running" ? "step" : undefined}
                >
                  <div className="agent-step-head">
                    <span className="agent-step-idx">{`0${idx + 1}`}</span>
                    <strong>{phase.name}</strong>
                    <span className="agent-tool-tag">{phase.tool}</span>
                    <span className="agent-step-status">
                      {PHASE_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <p>{phase.detail}</p>
                </div>
              );
            })}
          </div>

          <div
            className="agent-telemetry-box"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <h4>Run Status</h4>
            <p>
              {runOutcome === "complete"
                ? "Response stream complete. Output has not been independently verified."
                : runOutcome === "streaming"
                  ? "Response stream in progress…"
                  : runOutcome === "requesting"
                    ? "Request sent. Provider response not yet confirmed."
                    : runOutcome === "aborted"
                      ? "Run stopped. Partial output is incomplete."
                      : runOutcome === "error"
                        ? "Run failed before completion."
                        : "Idle. Run a preset or ask anything."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
