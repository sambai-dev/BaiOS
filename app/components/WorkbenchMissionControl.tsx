// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
} from "react";
import "../styles/workbench-mission-control.css";

export type MissionControlWorkspace = {
  id: string;
  label: string;
};

export type MissionControlWindow = {
  instanceId: string;
  appId: string;
  title: string;
  workspaceId: string;
  minimized: boolean;
  z: number;
  width: number;
  height: number;
};

export type WorkbenchMissionControlProps = {
  open: boolean;
  currentWorkspaceId: string;
  workspaces: MissionControlWorkspace[];
  windows: MissionControlWindow[];
  onSelect: (instanceId: string) => void;
  onSwitchWorkspace: (id: string) => void;
  onClose: () => void;
};

type Direction = "left" | "right" | "up" | "down";

const interactiveSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function geometryVariant(value: string) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total + value.charCodeAt(index) * (index + 3)) % 4;
  }
  return total;
}

function focusDirectionalItem(
  current: HTMLButtonElement,
  direction: Direction,
  container: HTMLElement | null,
) {
  if (!container) return;

  const items = Array.from(
    container.querySelectorAll<HTMLButtonElement>("[data-mission-window]"),
  );
  if (items.length < 2) return;

  const currentRect = current.getBoundingClientRect();
  const currentX = currentRect.left + currentRect.width / 2;
  const currentY = currentRect.top + currentRect.height / 2;

  const candidates = items
    .filter((item) => item !== current)
    .map((item) => {
      const rect = item.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const deltaX = x - currentX;
      const deltaY = y - currentY;
      const isEligible =
        direction === "left"
          ? deltaX < -1
          : direction === "right"
            ? deltaX > 1
            : direction === "up"
              ? deltaY < -1
              : deltaY > 1;
      const primaryDistance =
        direction === "left" || direction === "right"
          ? Math.abs(deltaX)
          : Math.abs(deltaY);
      const crossDistance =
        direction === "left" || direction === "right"
          ? Math.abs(deltaY)
          : Math.abs(deltaX);

      return {
        item,
        isEligible,
        score: primaryDistance + crossDistance * 2.25,
      };
    })
    .filter((candidate) => candidate.isEligible)
    .sort((a, b) => a.score - b.score);

  if (candidates[0]) {
    candidates[0].item.focus();
    return;
  }

  const currentIndex = items.indexOf(current);
  const delta = direction === "left" || direction === "up" ? -1 : 1;
  items[(currentIndex + delta + items.length) % items.length]?.focus();
}

export default function WorkbenchMissionControl({
  open,
  currentWorkspaceId,
  workspaces,
  windows,
  onSelect,
  onSwitchWorkspace,
  onClose,
}: WorkbenchMissionControlProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const workspaceTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const visibleWindows = windows
    .filter((windowState) => windowState.workspaceId === currentWorkspaceId)
    .sort((a, b) => {
      if (a.minimized !== b.minimized) return a.minimized ? 1 : -1;
      return b.z - a.z;
    });
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentWorkspaceId,
  );

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = window.requestAnimationFrame(() => {
      const firstWindow = dialogRef.current?.querySelector<HTMLElement>(
        "[data-mission-window]",
      );
      (firstWindow ?? closeButtonRef.current ?? dialogRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(interactiveSelector) ?? [],
    ).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleWorkspaceKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    workspaceIndex: number,
  ) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    const lastIndex = workspaces.length - 1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? lastIndex
          : event.key === "ArrowLeft"
            ? (workspaceIndex - 1 + workspaces.length) % workspaces.length
            : (workspaceIndex + 1) % workspaces.length;
    const nextWorkspace = workspaces[nextIndex];
    if (!nextWorkspace) return;
    onSwitchWorkspace(nextWorkspace.id);
    window.requestAnimationFrame(() => {
      workspaceTabRefs.current[nextWorkspace.id]?.focus();
    });
  };

  if (!open) return null;

  return (
    <div className="workbench-mission-control" aria-hidden={!open || undefined}>
      <div
        ref={dialogRef}
        className="mission-control-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleDialogKeyDown}
        tabIndex={-1}
      >
        <header className="mission-control-header">
          <div>
            <h2 id={titleId}>All working surfaces.</h2>
            <p id={descriptionId} className="mission-control-description">
              Atlas maps every workspace. Restore a surface or inspect what is
              still running locally.
            </p>
          </div>
          <div className="mission-control-header-meta">
            <p>
              {windows.length.toString().padStart(2, "0")} windows ·{" "}
              {workspaces.length.toString().padStart(2, "0")} spaces
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              className="mission-control-close"
              onClick={onClose}
              aria-label="Close Atlas"
            >
              Close <span aria-hidden="true">Esc</span>
            </button>
          </div>
        </header>

        <div
          className="mission-control-workspaces"
          role="tablist"
          aria-label="Workspaces"
        >
          {workspaces.map((workspace, workspaceIndex) => {
            const isCurrent = workspace.id === currentWorkspaceId;
            const workspaceWindowCount = windows.filter(
              (windowState) => windowState.workspaceId === workspace.id,
            ).length;

            return (
              <button
                key={workspace.id}
                ref={(element) => {
                  workspaceTabRefs.current[workspace.id] = element;
                }}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-controls={isCurrent ? panelId : undefined}
                tabIndex={isCurrent ? 0 : -1}
                onClick={() => onSwitchWorkspace(workspace.id)}
                onKeyDown={(event) =>
                  handleWorkspaceKeyDown(event, workspaceIndex)
                }
              >
                <span>{workspace.label}</span>
                <span>{workspaceWindowCount.toString().padStart(2, "0")}</span>
              </button>
            );
          })}
        </div>

        <section
          id={panelId}
          className="mission-control-panel"
          role="tabpanel"
          aria-label={`${currentWorkspace?.label ?? "Current workspace"} windows`}
        >
          <div className="mission-control-panel-heading">
            <p>{currentWorkspace?.label ?? "Current workspace"}</p>
            <p>
              {visibleWindows.length === 1
                ? "1 active surface"
                : `${visibleWindows.length} active surfaces`}
            </p>
          </div>

          {visibleWindows.length > 0 ? (
            <div className="mission-control-grid">
              {visibleWindows.map((windowState) => (
                <button
                  key={windowState.instanceId}
                  type="button"
                  className={`mission-window-preview${
                    windowState.minimized ? " is-minimized" : ""
                  }`}
                  data-mission-window={windowState.instanceId}
                  onClick={() => onSelect(windowState.instanceId)}
                  onKeyDown={(event) => {
                    const keyDirections: Partial<Record<string, Direction>> = {
                      ArrowLeft: "left",
                      ArrowRight: "right",
                      ArrowUp: "up",
                      ArrowDown: "down",
                    };
                    const direction = keyDirections[event.key];
                    if (direction) {
                      event.preventDefault();
                      focusDirectionalItem(
                        event.currentTarget,
                        direction,
                        dialogRef.current,
                      );
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      onSelect(windowState.instanceId);
                    }
                  }}
                  aria-label={`${windowState.minimized ? "Restore" : "Select"} ${
                    windowState.title
                  }`}
                >
                  <span
                    className="mission-window-frame"
                    data-geometry={geometryVariant(
                      `${windowState.appId}-${windowState.instanceId}`,
                    )}
                    aria-hidden="true"
                  >
                    <span className="mission-window-chrome">
                      <span />
                      <span>{windowState.appId}</span>
                    </span>
                    <span className="mission-window-geometry">
                      <span className="mission-geometry-rail" />
                      <span className="mission-geometry-block mission-geometry-block-a" />
                      <span className="mission-geometry-block mission-geometry-block-b" />
                      <span className="mission-geometry-line mission-geometry-line-a" />
                      <span className="mission-geometry-line mission-geometry-line-b" />
                      <span className="mission-geometry-line mission-geometry-line-c" />
                    </span>
                    {windowState.minimized && (
                      <span className="mission-window-suspended">Suspended</span>
                    )}
                  </span>
                  <span className="mission-window-caption">
                    <span>
                      <strong>{windowState.title}</strong>
                      <small>{windowState.appId}</small>
                    </span>
                    <span>
                      <small>
                        {Math.round(windowState.width)}×
                        {Math.round(windowState.height)}
                      </small>
                      <small>Z{windowState.z}</small>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mission-control-empty">
              <span aria-hidden="true">00</span>
              <div>
                <h3>Nothing is staged here.</h3>
                <p>
                  This workspace is clear. Choose another space or close
                  Atlas to open an application.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
