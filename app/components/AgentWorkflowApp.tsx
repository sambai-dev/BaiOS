// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import "@/app/styles/agent-workflow-app.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "../lib/workbench-sound";

type AgentPreset = "dashboard" | "rls" | "pipeline";
type RunPhaseStatus =
  "pending" | "running" | "completed" | "stopped" | "failed";
type RunOutcome =
  "idle" | "requesting" | "streaming" | "complete" | "aborted" | "error";
type PromptSource = AgentPreset | "custom";
type LastRun = { prompt: string; source: PromptSource };

type AgentWorkflowAppProps = {
  isPresented: boolean;
};

const PROVIDER_TARGET_BADGE =
  "AI provider · OpenRouter";

const PRESETS: Record<AgentPreset, { title: string; prompt: string }> = {
  dashboard: {
    title: "Build a chart",
    prompt:
      "Write a zero-dependency React 19 SVG sparkline component in TypeScript. Include strict prop types, an accessible aria-label, and a short usage example. Reply with code only.",
  },
  rls: {
    title: "Draft database access rules",
    prompt:
      "Given a multi-tenant Postgres schema where workspace_files.team_id references team_memberships.team_id, write the Row-Level Security policy SQL that isolates rows per authenticated user via auth.uid(). Explain the leak it prevents in two sentences.",
  },
  pipeline: {
    title: "Plan an AI workflow",
    prompt:
      "Design a multi-agent pipeline that summarizes pull request diffs and flags latency regressions. List each worker, its tool surface, and its hand-off. Be concise and concrete.",
  },
};

const RUN_PHASES: Array<{ name: string; tool: string; detail: string }> = [
  {
    name: "Prepare the prompt",
    tool: "client",
    detail: "Your browser prepares the prompt to send to this site.",
  },
  {
    name: "Contact OpenRouter",
    tool: "server",
    detail: "This site asks OpenRouter for a response.",
  },
  {
    name: "Receive the response",
    tool: "network",
    detail: "The response arrives a little at a time.",
  },
  {
    name: "Show the answer",
    tool: "interface",
    detail:
      "The answer appears here, with internal thinking blocks removed.",
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

export default function AgentWorkflowApp({
  isPresented,
}: AgentWorkflowAppProps) {
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
  const runStartedAtRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const askInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    stopClock();
    const startedAt = runStartedAtRef.current;
    if (!isRunning || !isPresented || startedAt === null) return;

    const updateElapsed = () => setElapsedMs(Date.now() - startedAt);
    updateElapsed();
    clockRef.current = window.setInterval(updateElapsed, 120);
    return stopClock;
  }, [isPresented, isRunning, stopClock]);

  const runPrompt = useCallback(
    async (prompt: string, source: PromptSource) => {
      const submittedPrompt = prompt.trim();
      if (!submittedPrompt || isRunningRef.current) return;
      // Abort any orphaned controller before starting. The isRunning state
      // closure can be stale on rapid double-run, the ref cannot.
      abortRef.current?.abort();
      isRunningRef.current = true;
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
      const controller = new AbortController();
      abortRef.current = controller;
      runStartedAtRef.current = Date.now();
      setIsRunning(true);

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
            const contentType =
              response.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              const data = (await response.json()) as { error?: string };
              if (data.error) message = data.error;
            } else {
              const text = await response.text();
              if (text.trim()) message = text.trim().slice(0, 300);
            }
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
        let receivedDone = false;
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
              if (!payload) continue;
              if (payload === "[DONE]") {
                receivedDone = true;
                continue;
              }
              try {
                const parsed = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                  error?: unknown;
                };
                if (typeof parsed.error === "string" && parsed.error.trim()) {
                  throw new Error(parsed.error);
                }
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  raw += delta;
                  consume();
                }
              } catch (caught) {
                if (caught instanceof SyntaxError) {
                  throw new Error("The model stream returned malformed data.");
                }
                throw caught;
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
        try {
          reader.releaseLock();
        } catch {
          /* lock already released on abort */
        }

        if (controller.signal.aborted) {
          throw new DOMException("The run was stopped.", "AbortError");
        }
        if (!receivedDone) {
          throw new Error(
            "The model stream ended before confirming completion. Partial output may be incomplete.",
          );
        }

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
          // Stop the server request if a typed stream error or malformed event
          // arrives before completion, so the upstream generation cannot run
          // invisibly after the UI has failed the run.
          controller.abort();
          setRunOutcome("error");
          setErrorText((caught as Error).message);
          playSound("delete");
        }
      } finally {
        stopClock();
        const startedAt = runStartedAtRef.current;
        if (startedAt !== null) setElapsedMs(Date.now() - startedAt);
        runStartedAtRef.current = null;
        abortRef.current = null;
        isRunningRef.current = false;
        setIsRunning(false);
        // The Abort button unmounts when the run ends. Return focus so
        // keyboard users are not dropped to <body>.
        window.requestAnimationFrame(() => {
          askInputRef.current?.focus({ preventScroll: true });
        });
      }
    },
    [stopClock],
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
          <h2>AI assistant.</h2>
          <p>
            Ask a question or try an example. Prompts are sent to OpenRouter;
            model details are not shown. Keep confidential information out of your prompt.
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
              {lastRun ? "Last prompt" : "Try this prompt"}
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
                {isRunning ? "Waiting for a response…" : lastRun ? "Send again" : "Send prompt"}
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
              ref={askInputRef}
              className="agent-ask-input"
              name="agent-prompt"
              type="text"
              value={customPrompt}
              maxLength={2000}
              placeholder="What would you like help with?"
              aria-label="Your prompt for the AI assistant"
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
                Stop
              </button>
            ) : (
              <button
                type="submit"
                className="agent-btn-run"
                disabled={!customPrompt.trim()}
              >
                Send
              </button>
            )}
          </form>

          <div className="agent-output-container">
            <div className="agent-output-head">
              <span className="agent-output-title">
                {runOutcome === "idle"
                  ? "Your response will appear here"
                  : runOutcome === "requesting"
                    ? "Connecting to OpenRouter"
                    : runOutcome === "streaming"
                      ? "Receiving the response"
                      : runOutcome === "complete"
                        ? "Response"
                        : runOutcome === "aborted"
                          ? "Response stopped"
                          : "Request failed"}
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
                    ? "Response received from OpenRouter."
                    : "Waiting for OpenRouter to respond."}
                </strong>{" "}
                This AI response has not been independently checked. Review its code or advice before use.
              </p>
            ) : null}
            <pre className="agent-code-block">
              <code>
                {errorText
                  ? errorText
                  : streamedText ||
                    (runOutcome === "requesting"
                      ? "Sending your prompt…"
                      : runOutcome === "streaming"
                        ? "Waiting for the response to begin…"
                        : "")}
              </code>
            </pre>
          </div>
        </div>

        <aside className="agent-sidebar">
          <span className="agent-tag">Illustrated request stages</span>
          <h3>How the request works</h3>
          <p className="agent-stage-note">
            This illustration follows the request and response. It does not show
            the model&apos;s thoughts or any work it performs.
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
            <h4>Request status</h4>
            <p>
              {runOutcome === "complete"
                ? "Response complete. Check it before use."
                : runOutcome === "streaming"
                  ? "Receiving the response…"
                  : runOutcome === "requesting"
                    ? "Prompt sent. Waiting for OpenRouter."
                    : runOutcome === "aborted"
                      ? "Stopped. The response may be incomplete."
                      : runOutcome === "error"
                        ? "The request could not finish. Try sending it again."
                        : "Choose an example or write a prompt to begin."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
