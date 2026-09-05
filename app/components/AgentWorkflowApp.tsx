// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import "@/app/styles/agent-workflow-app.css";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type AgentWorkflowAppProps = { isPresented: boolean };
type TurnStatus = "pending" | "complete" | "stopped" | "error";
type ChatTurn = {
  id: number;
  question: string;
  answer: string;
  status: TurnStatus;
  error?: string;
};
type ActiveRequest = {
  id: number;
  turnId: number;
  controller: AbortController;
};

const MAX_QUESTION_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 2000;
const MAX_TURNS = 5;
const PRESETS = [
  { label: "Sam’s background", question: "What is Sam’s background?" },
  { label: "Products & projects", question: "What products has Sam built?" },
  { label: "Working together", question: "How can I contact Sam about a role or project?" },
];
const PUBLIC_SOURCES = [
  { label: "Selected work", href: "/work" },
  { label: "Trekky", href: "https://trekky.app/" },
  { label: "Rookhold", href: "https://github.com/sambai-dev/rookhold" },
  { label: "Portly", href: "https://github.com/sambai-dev/portly" },
  { label: "AgentScope", href: "https://github.com/sambai-dev/agentscope" },
  { label: "BaiOS", href: "https://github.com/sambai-dev/BaiOS" },
];

class ChatRequestError extends Error {}

function requestFailure(status: number): string {
  if (status === 429) return "The chat is busy. Please wait a moment before trying again.";
  if (status === 400 || status === 413) return "That question could not be sent. Try a shorter question about Sam or his work.";
  if (status === 403) return "That request could not be accepted. Reload the page and try again.";
  return "The chat is unavailable right now. Try again, or use the public links below.";
}

export default function AgentWorkflowApp({ isPresented }: AgentWorkflowAppProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const instanceId = useId();
  const turnsRef = useRef<ChatTurn[]>([]);
  const activeRef = useRef<ActiveRequest | null>(null);
  const requestIdRef = useRef(0);
  const turnIdRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const presentedRef = useRef(isPresented);

  const updateTurns = useCallback((update: (current: ChatTurn[]) => ChatTurn[]) => {
    const next = update(turnsRef.current).slice(-MAX_TURNS);
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const focusInput = useCallback(() => {
    if (presentedRef.current) inputRef.current?.focus({ preventScroll: true });
  }, []);

  const stopRequest = useCallback((restoreFocus = true) => {
    const active = activeRef.current;
    if (!active) return;
    activeRef.current = null;
    requestIdRef.current += 1;
    active.controller.abort();
    updateTurns((current) => current.map((turn) => turn.id === active.turnId
      ? { ...turn, status: "stopped", error: undefined }
      : turn));
    setIsRunning(false);
    setAnnouncement("Response stopped.");
    if (restoreFocus) focusInput();
  }, [focusInput, updateTurns]);

  useEffect(() => {
    presentedRef.current = isPresented;
    if (!isPresented) stopRequest(false);
  }, [isPresented, stopRequest]);

  useEffect(() => () => {
    presentedRef.current = false;
    requestIdRef.current += 1;
    activeRef.current?.controller.abort();
    activeRef.current = null;
  }, []);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (isPresented && transcript && followLatestRef.current) {
      transcript.scrollTop = turns.length ? transcript.scrollHeight : 0;
    }
  }, [isPresented, turns]);

  const sendQuestion = useCallback(async (question: string, retryTurnId?: number) => {
    const submitted = question.trim();
    if (!submitted || submitted.length > MAX_QUESTION_LENGTH || activeRef.current || !presentedRef.current) return;

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const turnId = retryTurnId ?? ++turnIdRef.current;
    activeRef.current = { id: requestId, turnId, controller };
    const isCurrent = () => activeRef.current?.id === requestId;
    const changeCurrentTurn = (update: (turn: ChatTurn) => ChatTurn) => {
      if (isCurrent()) updateTurns((current) => current.map((turn) => turn.id === turnId ? update(turn) : turn));
    };

    followLatestRef.current = true;
    updateTurns((current) => retryTurnId === undefined
      ? [...current, { id: turnId, question: submitted, answer: "", status: "pending" }]
      : current.map((turn) => turn.id === turnId ? { ...turn, answer: "", status: "pending", error: undefined } : turn));
    if (retryTurnId === undefined) setDraft("");
    setIsRunning(true);
    setAnnouncement("Question sent. Waiting for a reply.");
    focusInput();

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        // The transcript is display-only. Previous questions, partial replies,
        // and completed answers are never resent to the server or provider.
        body: JSON.stringify({ messages: [{ role: "user", content: submitted }], stream: true }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!isCurrent()) {
        await response.body?.cancel();
        return;
      }
      if (!response.ok) throw new ChatRequestError(requestFailure(response.status));
      if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
        throw new ChatRequestError("The reply could not be read. Please try again.");
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      let receivedDone = false;

      const readEvent = (event: string) => {
        if (!isCurrent() || receivedDone) return;
        const lines = event.split(/\r?\n/);
        const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const payload = lines.filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, "")).join("\n").trim();
        if (eventName === "error") throw new ChatRequestError("The reply was interrupted. Please try again.");
        if (!payload) return;
        if (payload === "[DONE]") {
          receivedDone = true;
          return;
        }

        let parsed: unknown;
        try { parsed = JSON.parse(payload); } catch {
          throw new ChatRequestError("The reply could not be read. Please try again.");
        }
        if (!parsed || typeof parsed !== "object") throw new ChatRequestError("The reply could not be read. Please try again.");
        const data = parsed as { choices?: Array<{ delta?: { content?: unknown } }>; error?: unknown };
        if (data.error !== undefined) throw new ChatRequestError("The reply was interrupted. Please try again.");
        const delta = Array.isArray(data.choices) ? data.choices[0]?.delta?.content : undefined;
        if (typeof delta !== "string") return;
        if (answer.length + delta.length > MAX_ANSWER_LENGTH) {
          throw new ChatRequestError("The reply was too long to finish here. Try a more specific question.");
        }
        answer += delta;
        changeCurrentTurn((turn) => ({ ...turn, answer }));
      };

      const readBufferedEvents = () => {
        for (;;) {
          const separator = /\r?\n\r?\n/.exec(buffer);
          if (!separator) break;
          const event = buffer.slice(0, separator.index);
          buffer = buffer.slice(separator.index + separator[0].length);
          readEvent(event);
          if (receivedDone || !isCurrent()) break;
        }
        if (buffer.length > 65536) throw new ChatRequestError("The reply could not be read. Please try again.");
      };

      while (isCurrent() && !receivedDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        readBufferedEvents();
      }
      if (!isCurrent()) return;
      buffer += decoder.decode();
      readBufferedEvents();
      if (buffer.trim() && !receivedDone) readEvent(buffer);
      if (!receivedDone) throw new ChatRequestError("The connection ended before the reply finished. Please try again.");
      if (!answer.trim()) throw new ChatRequestError("No reply came through. Please try again.");
      changeCurrentTurn((turn) => ({ ...turn, answer: answer.trim(), status: "complete" }));
      setAnnouncement("Answer ready.");
    } catch (caught) {
      if (!isCurrent()) return;
      controller.abort();
      const error = caught instanceof ChatRequestError
        ? caught.message
        : "The chat could not connect. Check your connection and try again.";
      changeCurrentTurn((turn) => ({ ...turn, status: "error", error }));
      setAnnouncement(error);
    } finally {
      // Finish the request before asynchronous stream cleanup. Stop or hide
      // must not turn an already completed answer into a stopped exchange.
      if (isCurrent()) {
        activeRef.current = null;
        setIsRunning(false);
        // Keep the user's reading position. Only move focus if the action
        // button they were using is about to become a disabled Send button.
        if (document.activeElement === actionRef.current) focusInput();
      }
      if (reader) {
        try { await reader.cancel(); } catch { /* The stream may already be aborted. */ }
        reader.releaseLock();
      }
    }
  }, [focusInput, updateTurns]);

  const clearConversation = () => {
    const active = activeRef.current;
    activeRef.current = null;
    requestIdRef.current += 1;
    active?.controller.abort();
    updateTurns(() => []);
    setDraft("");
    setIsRunning(false);
    setAnnouncement("Conversation cleared.");
    followLatestRef.current = true;
    focusInput();
  };

  return (
    <section className="portfolio-chat" aria-labelledby={`${instanceId}-title`}>
      <header className="portfolio-chat-header">
        <div>
          <h2 id={`${instanceId}-title`}>Ask about Sam</h2>
          <p>Ask about his background, a project by name, or working together.</p>
        </div>
        <button className="portfolio-chat-clear" type="button" disabled={!turns.length && !draft} onClick={clearConversation}>
          Clear conversation
        </button>
      </header>

      <div className="portfolio-chat-transcript" ref={transcriptRef} role="log" aria-label="Conversation about Sam" aria-live="off" aria-busy={isRunning} tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          followLatestRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
        }}>
        <div className="portfolio-chat-thread">
          {!turns.length ? (
            <div className="portfolio-chat-welcome">
              <span className="portfolio-chat-label">A little about the work</span>
              <h3>What would you like to know?</h3>
              <p>Start with a question below, or write your own.</p>
              <div className="portfolio-chat-presets" role="group" aria-label="Suggested questions">
                {PRESETS.map((preset) => <button key={preset.label} type="button" disabled={isRunning} onClick={() => void sendQuestion(preset.question)}>
                  <span>{preset.label}</span><span aria-hidden="true">↗</span>
                </button>)}
              </div>
              <p className="portfolio-chat-scope">Answers use selected public summaries, not source code or private files.</p>
            </div>
          ) : turns.map((turn, index) => (
            <div className="portfolio-chat-turn" key={turn.id}>
              <div className="portfolio-chat-message portfolio-chat-question">
                <span className="portfolio-chat-label">You</span>
                <p>{turn.question}</p>
              </div>
              <div className="portfolio-chat-message portfolio-chat-answer" data-status={turn.status}>
                <span className="portfolio-chat-label">Portfolio guide</span>
                {turn.answer ? <p>{turn.answer}</p> : turn.status === "pending" ? <p className="portfolio-chat-pending">Finding a reply<span aria-hidden="true">…</span></p> : null}
                {turn.status === "stopped" || turn.status === "error" ? <div className="portfolio-chat-interruption">
                  <p>{turn.status === "stopped" ? "Response stopped." : turn.error} {turn.answer ? "The answer above is incomplete." : ""}</p>
                  {index === turns.length - 1 ? <button type="button" disabled={isRunning} onClick={() => void sendQuestion(turn.question, turn.id)}>Try again</button> : null}
                </div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="portfolio-chat-bottom">
        <form className="portfolio-chat-composer" onSubmit={(event) => { event.preventDefault(); void sendQuestion(draft); }}>
          <label htmlFor={`${instanceId}-question`}>Your question</label>
          <div className="portfolio-chat-input-row">
            <textarea ref={inputRef} id={`${instanceId}-question`} name="portfolio-question" value={draft} rows={2} maxLength={MAX_QUESTION_LENGTH} autoComplete="off" spellCheck
              placeholder="Ask about Sam or a project…" aria-describedby={`${instanceId}-privacy ${instanceId}-input-help`}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!isRunning) event.currentTarget.form?.requestSubmit();
                }
              }} />
            {isRunning
              ? <button ref={actionRef} className="portfolio-chat-send" type="button" onClick={() => stopRequest()}>Stop<span aria-hidden="true">■</span></button>
              : <button ref={actionRef} className="portfolio-chat-send" type="submit" disabled={!draft.trim()}>Send<span aria-hidden="true">↑</span></button>}
          </div>
          <div className="portfolio-chat-input-help" id={`${instanceId}-input-help`}>
            <span>Enter to send. Shift + Enter for a new line.</span>
            <span>{draft.length.toLocaleString()} / 2,000<span className="portfolio-chat-sr-only"> characters</span></span>
          </div>
        </form>
        <div className="portfolio-chat-footnotes">
          <p id={`${instanceId}-privacy`}>Questions are sent to OpenRouter and the model provider. Please leave out passwords and private information. This site does not save your chat.</p>
          <details className="portfolio-chat-sources">
            <summary>Public sources</summary>
            <p>Each question is answered on its own using selected public summaries. The chat does not open links or read source code.</p>
            <nav aria-label="Public portfolio sources">{PUBLIC_SOURCES.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label}<span aria-hidden="true">↗</span></a>)}</nav>
          </details>
        </div>
      </div>
      <p className="portfolio-chat-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}
