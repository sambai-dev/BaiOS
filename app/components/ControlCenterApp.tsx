// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import "../styles/control-center-app.css";
import {
  isWorkbenchSoundEnabled,
  setWorkbenchSoundEnabled,
  playSound,
} from "../lib/workbench-sound";

export type ControlCenterTheme = {
  id: string;
  label: string;
  description: string;
  swatch: string;
};

export type ControlCenterWorkspace = {
  id: string;
  label: string;
  description: string;
};

export type ControlCenterSession = {
  lastSaved: string;
  status: "restored" | "fresh" | "saving";
  openWindows?: number;
  minimizedWindows?: number;
};

export type ControlCenterAppProps = {
  themeId: string;
  themes: readonly ControlCenterTheme[];
  onThemeChange: (themeId: string) => void;
  activeWorkspaceId: string;
  workspaces: readonly ControlCenterWorkspace[];
  onWorkspaceChange: (workspaceId: string) => void;
  session: ControlCenterSession;
  onRestoreDefaultLayout: () => void;
  onExportSession: () => void;
  onImportSession: () => void;
};

type PendingAction = "restore" | "import" | null;

const SESSION_COPY: Record<
  ControlCenterSession["status"],
  { label: string; detail: string }
> = {
  fresh: {
    label: "New session",
    detail: "No recovered layout was found on this device.",
  },
  restored: {
    label: "Session restored",
    detail: "Workspace, theme, and window positions are back in place.",
  },
  saving: {
    label: "Saving locally",
    detail: "Workbench memory is being updated on this device.",
  },
};

const CONFIRMATION_COPY: Record<
  Exclude<PendingAction, null>,
  { heading: string; detail: string; action: string }
> = {
  restore: {
    heading: "Restore the authored layout?",
    detail:
      "Every window in the active workspace returns to its starting position. Notes and other local content stay intact.",
    action: "Restore layout",
  },
  import: {
    heading: "Import a session backup?",
    detail:
      "The selected backup can replace your current local workspace, theme, and window state after it passes validation.",
    action: "Choose backup",
  },
};

export default function ControlCenterApp({
  themeId,
  themes,
  onThemeChange,
  activeWorkspaceId,
  workspaces,
  onWorkspaceChange,
  session,
  onRestoreDefaultLayout,
  onExportSession,
  onImportSession,
}: ControlCenterAppProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [soundActive, setSoundActive] = useState(() => isWorkbenchSoundEnabled());
  const instanceId = useId();
  const confirmationButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const themeTitleId = `${instanceId}-theme-title`;
  const themeRadioName = `${instanceId}-theme`;
  const workspaceTitleId = `${instanceId}-workspace-title`;
  const sessionTitleId = `${instanceId}-session-title`;
  const operationsTitleId = `${instanceId}-operations-title`;
  const confirmationId = `${instanceId}-confirmation`;
  const confirmationTitleId = `${instanceId}-confirmation-title`;
  const confirmationDescriptionId = `${instanceId}-confirmation-description`;
  const isSaving = session.status === "saving";
  const sessionCopy = SESSION_COPY[session.status];
  const activeTheme = themes.find((theme) => theme.id === themeId);
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  );

  useEffect(() => {
    if (pendingAction) confirmationButtonRef.current?.focus();
  }, [pendingAction]);

  function cancelPendingAction() {
    const returnTarget =
      pendingAction === "restore"
        ? restoreButtonRef.current
        : importButtonRef.current;
    setPendingAction(null);
    window.requestAnimationFrame(() => returnTarget?.focus());
  }

  function runPendingAction() {
    const returnTarget =
      pendingAction === "restore"
        ? restoreButtonRef.current
        : importButtonRef.current;
    if (pendingAction === "restore") onRestoreDefaultLayout();
    if (pendingAction === "import") onImportSession();
    setPendingAction(null);
    window.requestAnimationFrame(() => returnTarget?.focus());
  }

  function handleConfirmationKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancelPendingAction();
  }

  return (
    <section
      className="control-center-app"
      aria-label="Workbench control center"
      aria-busy={isSaving}
    >
      <header className="control-center-header">
        <div className="control-center-identity">
          <span className="control-center-mark" aria-hidden="true">
            CC
          </span>
          <div>
            <h2>Control center</h2>
            <p>Shape the Workbench, then carry the session forward.</p>
          </div>
        </div>

        <div
          className="control-center-live-status"
          data-status={session.status}
          role="status"
          aria-live="polite"
        >
          <span className="control-center-status-dot" aria-hidden="true" />
          <span>
            <strong>{sessionCopy.label}</strong>
            <small>{session.lastSaved || "Not saved yet"}</small>
          </span>
        </div>
      </header>

      <div className="control-center-grid">
        <div className="control-center-primary-column">
          <section
            className="control-center-section control-center-theme-section"
            aria-labelledby={themeTitleId}
          >
            <header className="control-center-section-heading">
              <h3 id={themeTitleId}>Theme memory</h3>
              <p>
                Choose the Workbench route light. The active theme is remembered
                with this local session.
              </p>
            </header>

            <fieldset className="control-center-theme-fieldset">
              <legend>Workbench theme</legend>
              {themes.length > 0 ? (
                <div className="control-center-theme-options">
                  {themes.map((theme, index) => {
                    const isActive = theme.id === themeId;
                    const themeRadioId = `${instanceId}-theme-${index}`;
                    const swatchStyle = {
                      "--control-center-theme-swatch": theme.swatch,
                    } as CSSProperties;

                    return (
                      <label
                        htmlFor={themeRadioId}
                        className="control-center-theme-option"
                        data-active={isActive}
                        key={theme.id}
                      >
                        <input
                          id={themeRadioId}
                          type="radio"
                          name={themeRadioName}
                          value={theme.id}
                          checked={isActive}
                          onChange={() => onThemeChange(theme.id)}
                        />
                        <span
                          className="control-center-swatch"
                          style={swatchStyle}
                          aria-hidden="true"
                        >
                          <span />
                          <span />
                        </span>
                        <span className="control-center-option-copy">
                          <strong>{theme.label}</strong>
                          <small>{theme.description}</small>
                        </span>
                        <span className="control-center-option-state">
                          {isActive ? "Active" : "Select"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="control-center-empty-state">
                  No palettes are available in this build.
                </p>
              )}
            </fieldset>
          </section>

          <section
            className="control-center-section control-center-workspace-section"
            aria-labelledby={workspaceTitleId}
          >
            <header className="control-center-section-heading">
              <h3 id={workspaceTitleId}>Workspaces</h3>
              <p>
                Move between saved arrangements. Each space keeps its own working
                context.
              </p>
            </header>

            {workspaces.length > 0 ? (
              <div
                className="control-center-workspace-options"
                role="group"
                aria-label="Choose active workspace"
              >
                {workspaces.map((workspace, index) => {
                  const isActive = workspace.id === activeWorkspaceId;
                  return (
                    <button
                      type="button"
                      className="control-center-workspace-option"
                      data-active={isActive}
                      aria-pressed={isActive}
                      onClick={() => onWorkspaceChange(workspace.id)}
                      key={workspace.id}
                    >
                      <span className="control-center-workspace-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="control-center-option-copy">
                        <strong>{workspace.label}</strong>
                        <small>{workspace.description}</small>
                      </span>
                      <span className="control-center-option-state">
                        {isActive ? "Current" : "Open"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="control-center-empty-state">
                No workspaces are available in this session.
              </p>
            )}
          </section>

          <section className="control-center-section">
            <header className="control-center-section-heading">
              <h3>Tactile Web Audio</h3>
              <p>Subtle mechanical relays and haptic sound synthesis on window and dock actions.</p>
            </header>
            <div className="control-center-workspace-options">
              <button
                type="button"
                className="control-center-workspace-option"
                data-active={soundActive}
                aria-pressed={soundActive}
                onClick={() => {
                  const next = !soundActive;
                  setSoundActive(next);
                  setWorkbenchSoundEnabled(next);
                  if (next) playSound("snap");
                }}
              >
                <span className="control-center-workspace-index">FX</span>
                <span className="control-center-option-copy">
                  <strong>Synthesized Audio Feedback</strong>
                  <small>Zero-asset Web Audio API oscillator synthesis.</small>
                </span>
                <span className="control-center-option-state">
                  {soundActive ? "Enabled" : "Muted"}
                </span>
              </button>
            </div>
          </section>
        </div>

        <aside className="control-center-secondary-column" aria-label="Session controls">
          <section
            className="control-center-session-panel"
            aria-labelledby={sessionTitleId}
          >
            <header>
              <h3 id={sessionTitleId}>Session memory</h3>
              <p>{sessionCopy.detail}</p>
            </header>

            <div className="control-center-memory-track" aria-hidden="true">
              <span />
              <span />
              <span data-saving={isSaving} />
            </div>

            <dl className="control-center-session-data">
              <div>
                <dt>Workspace</dt>
                <dd>{activeWorkspace?.label || "Unavailable"}</dd>
              </div>
              <div>
                <dt>Theme</dt>
                <dd>{activeTheme?.label || "Unavailable"}</dd>
              </div>
              <div>
                <dt>Last saved</dt>
                <dd>{session.lastSaved || "Not yet"}</dd>
              </div>
              <div>
                <dt>Windows</dt>
                <dd>
                  {typeof session.openWindows === "number"
                    ? `${session.openWindows} open${
                        session.minimizedWindows
                          ? ` · ${session.minimizedWindows} min`
                          : ""
                      }`
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>This device</dd>
              </div>
            </dl>
          </section>

          <section
            className="control-center-section control-center-operations"
            aria-labelledby={operationsTitleId}
          >
            <header className="control-center-section-heading">
              <h3 id={operationsTitleId}>Session controls</h3>
              <p>Back up the local environment or return its layout to baseline.</p>
            </header>

            <div className="control-center-action-list">
              <button
                type="button"
                className="control-center-action control-center-action-primary"
                onClick={onExportSession}
                disabled={isSaving}
              >
                <span>
                  <strong>Export session</strong>
                  <small>Download the current Workbench state.</small>
                </span>
                <span aria-hidden="true">Export</span>
              </button>

              <button
                ref={importButtonRef}
                type="button"
                className="control-center-action"
                onClick={() => setPendingAction("import")}
                disabled={isSaving}
                aria-expanded={pendingAction === "import"}
                aria-controls={
                  pendingAction === "import"
                    ? confirmationId
                    : undefined
                }
              >
                <span>
                  <strong>Import session</strong>
                  <small>Recover a validated Workbench backup.</small>
                </span>
                <span aria-hidden="true">Import</span>
              </button>

              <button
                ref={restoreButtonRef}
                type="button"
                className="control-center-action"
                onClick={() => setPendingAction("restore")}
                disabled={isSaving}
                aria-expanded={pendingAction === "restore"}
                aria-controls={
                  pendingAction === "restore"
                    ? confirmationId
                    : undefined
                }
              >
                <span>
                  <strong>Restore default layout</strong>
                  <small>Reset window positions in this workspace.</small>
                </span>
                <span aria-hidden="true">Reset</span>
              </button>
            </div>

            {pendingAction ? (
              <div
                id={confirmationId}
                className="control-center-confirmation"
                role="group"
                aria-labelledby={confirmationTitleId}
                aria-describedby={confirmationDescriptionId}
                onKeyDown={handleConfirmationKeyDown}
              >
                <h4 id={confirmationTitleId}>
                  {CONFIRMATION_COPY[pendingAction].heading}
                </h4>
                <p id={confirmationDescriptionId}>
                  {CONFIRMATION_COPY[pendingAction].detail}
                </p>
                <div className="control-center-confirmation-actions">
                  <button type="button" onClick={cancelPendingAction}>
                    Cancel
                  </button>
                  <button
                    ref={confirmationButtonRef}
                    type="button"
                    onClick={runPendingAction}
                  >
                    {CONFIRMATION_COPY[pendingAction].action}
                  </button>
                </div>
              </div>
            ) : null}

            {isSaving ? (
              <p className="control-center-saving-note" role="status">
                Session controls resume when the local save completes.
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </section>
  );
}
