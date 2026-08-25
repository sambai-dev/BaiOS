// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ArchiveApp from "./ArchiveApp";
import ControlCenterApp from "./ControlCenterApp";
import WorkbenchAppBoundary from "./WorkbenchAppBoundary";
import WorkbenchMenuBar, {
  type WorkbenchMenu,
} from "./WorkbenchMenuBar";
import WorkbenchMissionControl from "./WorkbenchMissionControl";
import {
  MAX_WORKBENCH_BACKUP_BYTES,
  WORKBENCH_COMMITTED_STATE_STORAGE_KEY,
  createWorkbenchStateRevision,
  migrateLegacyWorkbenchSession,
  parseWorkbenchBackup,
  parseWorkbenchCommittedState,
  parseStrictWorkbenchSession,
  serializeWorkbenchBackup,
  serializeWorkbenchCommittedState,
  type WorkbenchCommittedStateEnvelope,
} from "../lib/workbench-backup";
import {
  ROOT_FILE_ID,
  WORKBENCH_FILES_STORAGE_KEY,
  createDefaultWorkbenchFiles,
  createNote,
  getNodePath,
  isNodeInTrash,
  parseWorkbenchFiles,
  type FileNode,
  type WorkbenchFiles,
} from "../lib/workbench-files";
import { type WorkbenchDeepLink } from "../lib/workbench-deep-link";
import {
  createDefaultWorkbenchSession,
  getWorkbenchApp,
  isWorkbenchAppId,
  isWorkbenchThemeId,
  isWorkspaceId,
  workbenchApps,
  workbenchStorageKeys,
  workbenchThemes,
  workspaces,
  type WorkbenchAppId,
  type WorkbenchSession,
  type WorkbenchWindow,
  type WorkspaceId,
} from "../lib/workbench-system";
import {
  closeWindow as closeManagedWindow,
  closeWorkspaceWindows,
  fitWindowsToBounds,
  focusWindow as focusManagedWindow,
  minimizeWindow as minimizeManagedWindow,
  openAppWindow,
  snapWindow,
  switchWorkspaceActiveInstance,
  tidyWorkspace,
  toggleMaximize as toggleManagedMaximize,
  type WindowManagerResult,
  type WorkbenchBounds,
  type WorkbenchSnapTarget,
} from "../lib/workbench-window-manager";

const SubsurfaceLab = dynamic(() => import("./SubsurfaceLab"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Subsurface…</div>,
});

const RailshiftLab = dynamic(() => import("./RailshiftLab"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Railshift…</div>,
});

const VectorLab = dynamic(() => import("./VectorLab"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Vector…</div>,
});

const MarketPulseApp = dynamic(() => import("./MarketPulseApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Pulse…</div>,
});

const BookConsultApp = dynamic(() => import("./BookConsultApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Book…</div>,
});

const CaseStudySandboxApp = dynamic(() => import("./CaseStudySandboxApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Sandbox…</div>,
});

const AgentWorkflowApp = dynamic(() => import("./AgentWorkflowApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Agent…</div>,
});

const SearchApp = dynamic(() => import("./SearchApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Search…</div>,
});

import { playSound } from "../lib/workbench-sound";

type WorkbenchOSProps = {
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  deepLink?: WorkbenchDeepLink | null;
  onClose: () => void;
  prefersReducedMotion: boolean;
  revealOrigin: Readonly<{ x: number; y: number }>;
  time: string;
};

type DragSession = {
  instanceId: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  nextX: number;
  nextY: number;
  /** Snapped geometry to restore once the pointer moves past a real drag. */
  pendingRestoreBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

type ResizeSession = {
  instanceId: string;
  pointerId: number;
  startX: number;
  startY: number;
  originWidth: number;
  originHeight: number;
  nextWidth: number;
  nextHeight: number;
};

type PaletteAction = {
  id: string;
  label: string;
  meta: string;
  terms: string;
  restoreInvoker?: boolean;
  run: () => void;
};

type ContextMenuState = {
  x: number;
  y: number;
};

const DOCK_INSET = 84;
const SNAP_EDGE = 28;
/** Pointer travel required before a drag releases a snapped window. */
const UNSNAP_DRAG_THRESHOLD_PX = 4;

/** The whole OS is branded around NZT; stamps must not silently use UTC. */
const WORKBENCH_TIME_ZONE = "Pacific/Auckland";
const workbenchBackupDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: WORKBENCH_TIME_ZONE,
});
const workbenchTimestampFormat = new Intl.DateTimeFormat("en-NZ", {
  timeZone: WORKBENCH_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

const stackRows = [
  ["Applications", "React · Next.js · TypeScript"],
  ["Systems", "Node.js · PostgreSQL · Drizzle ORM"],
  ["Data + edge", "Supabase · Neon · Cloudflare"],
  ["Mobile", "React Native · iOS · Android"],
  ["Product mode", "SaaS · Automation · AI-assisted workflows"],
] as const;

const methodSteps = [
  {
    id: "clarify",
    label: "Clarify",
    text: "Find the actual decision hiding underneath the requested feature.",
  },
  {
    id: "shape",
    label: "Shape",
    text: "Turn ambiguity into a legible product surface and technical path.",
  },
  {
    id: "ship",
    label: "Ship",
    text: "Build the smallest complete version that can survive real use.",
  },
  {
    id: "learn",
    label: "Learn",
    text: "Use the result to make the next product decision less expensive.",
  },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function safeDomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function readSession(serialized: string | null) {
  if (!serialized) return null;
  try {
    return parseStrictWorkbenchSession(JSON.parse(serialized) as unknown);
  } catch {
    return null;
  }
}

function formatSavedTime(timestamp: number | string) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Not saved yet";
  return date.toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function scorePaletteAction(action: PaletteAction, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 1;
  const label = action.label.toLowerCase();
  const haystack = `${label} ${action.meta.toLowerCase()} ${action.terms.toLowerCase()}`;
  if (label === query) return 120;
  if (label.startsWith(query)) return 100;
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.every((token) => haystack.split(/\s+/).some((word) => word.startsWith(token)))) {
    return 80;
  }
  if (tokens.every((token) => haystack.includes(token))) return 60;
  if (haystack.includes(query)) return 40;
  return -1;
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isSafeExternalHref(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

function cloneSession(session: WorkbenchSession): WorkbenchSession {
  return {
    ...session,
    activeInstances: { ...session.activeInstances },
    windows: session.windows.map((windowState) => ({
      ...windowState,
      data: { ...windowState.data },
      restoreBounds: windowState.restoreBounds
        ? { ...windowState.restoreBounds }
        : null,
    })),
  };
}

export default function WorkbenchOSV3({
  closeButtonRef,
  deepLink = null,
  onClose,
  prefersReducedMotion,
  revealOrigin,
  time,
}: WorkbenchOSProps) {
  const defaultSession = useMemo(() => createDefaultWorkbenchSession(), []);
  const [session, setSession] = useState<WorkbenchSession>(defaultSession);
  const [files, setFiles] = useState<WorkbenchFiles>(() =>
    createDefaultWorkbenchFiles(),
  );
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [consoleHistoryIndex, setConsoleHistoryIndex] = useState<number | null>(
    null,
  );
  const [consoleLines, setConsoleLines] = useState([
    "SAM WORKBENCH / SESSION READY",
    "Type help to inspect available commands.",
  ]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(0);
  const [isAtlasOpen, setIsAtlasOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [snapZone, setSnapZone] = useState<WorkbenchSnapTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [hasStorageConflict, setHasStorageConflict] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<
    "restored" | "fresh" | "saving"
  >("fresh");
  const [lastSaved, setLastSaved] = useState("Not saved yet");
  const [isCompact, setIsCompact] = useState(false);
  const [visitedWorkspaceIds, setVisitedWorkspaceIds] = useState<WorkspaceId[]>([
    "build",
  ]);

  const desktopRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const paletteOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const paletteInvokerRef = useRef<HTMLElement | null>(null);
  const consoleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const methodTabRefs = useRef<
    Record<string, Array<HTMLButtonElement | null>>
  >({});
  const dockButtonRefs = useRef<
    Partial<Record<WorkbenchAppId, HTMLButtonElement | null>>
  >({});
  const windowRefs = useRef<Record<string, HTMLElement | null>>({});
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const dragSession = useRef<DragSession | null>(null);
  const resizeSession = useRef<ResizeSession | null>(null);
  const snapZoneRef = useRef<WorkbenchSnapTarget | null>(null);
  const sessionRef = useRef(session);
  const filesRef = useRef(files);
  const committedRevisionRef = useRef<string | null>(null);
  const storageConflictRef = useRef<WorkbenchCommittedStateEnvelope | null>(null);
  const storageConflictPendingRef = useRef(false);
  const corruptStorageRef = useRef<{
    committed: string | null;
    session: string | null;
    files: string | null;
  }>({ committed: null, session: null, files: null });
  const zCounter = useRef(
    Math.max(10, ...defaultSession.windows.map((windowState) => windowState.z + 1)),
  );

  const replaceSession = useCallback((nextSession: WorkbenchSession) => {
    const cloned = cloneSession(nextSession);
    sessionRef.current = cloned;
    setSession(cloned);
    zCounter.current = Math.max(
      10,
      ...cloned.windows.map((windowState) => windowState.z + 1),
    );
  }, []);

  const updateSession = useCallback(
    (updater: (current: WorkbenchSession) => WorkbenchSession) => {
      const next = updater(sessionRef.current);
      replaceSession({ ...next, updatedAt: Date.now() });
    },
    [replaceSession],
  );

  const replaceFiles = useCallback((nextFiles: WorkbenchFiles) => {
    filesRef.current = nextFiles;
    setFiles(nextFiles);
  }, []);

  const markStorageConflict = useCallback((serialized: string | null) => {
    storageConflictRef.current = parseWorkbenchCommittedState(serialized);
    storageConflictPendingRef.current = true;
    setHasStorageConflict(true);
    setNotice(
      storageConflictRef.current
        ? "Another tab saved a different Workbench revision. Choose which version to keep."
        : "Another tab removed or replaced Workbench storage. Keep this tab to create a new committed revision.",
    );
  }, []);

  const getDesktopBounds = useCallback((): WorkbenchBounds | null => {
    const desktop = desktopRef.current;
    if (!desktop) return null;
    return {
      width: Math.max(320, desktop.clientWidth),
      height: Math.max(190, desktop.clientHeight - DOCK_INSET),
    };
  }, []);

  const commitWindowResult = useCallback(
    (result: WindowManagerResult, workspaceId: WorkspaceId) => {
      zCounter.current = result.nextZ;
      updateSession((current) => ({
        ...current,
        windows: result.windows,
        activeInstances: {
          ...current.activeInstances,
          [workspaceId]: result.activeInstanceId,
        },
      }));
    },
    [updateSession],
  );

  const persistPair = useCallback(
    (
      nextSession: WorkbenchSession,
      nextFiles: WorkbenchFiles,
      options: { force?: boolean } = {},
    ) => {
      try {
        const storage = window.localStorage;
        const existingSerialized = storage.getItem(
          WORKBENCH_COMMITTED_STATE_STORAGE_KEY,
        );
        if (!options.force) {
          const existing = parseWorkbenchCommittedState(existingSerialized);
          const expectedRevision = committedRevisionRef.current;
          const revisionMatches = existing?.revision === expectedRevision;
          const absenceMatches =
            existingSerialized === null && expectedRevision === null;
          if (!revisionMatches && !absenceMatches) {
            markStorageConflict(existingSerialized);
            return false;
          }
        }

        const revision = createWorkbenchStateRevision();
        const serialized = serializeWorkbenchCommittedState(nextSession, nextFiles, {
          revision,
        });
        storage.setItem(WORKBENCH_COMMITTED_STATE_STORAGE_KEY, serialized);
        if (storage.getItem(WORKBENCH_COMMITTED_STATE_STORAGE_KEY) !== serialized) {
          return false;
        }
        committedRevisionRef.current = revision;
        storageConflictRef.current = null;
        storageConflictPendingRef.current = false;
        setHasStorageConflict(false);
        try {
          storage.removeItem(workbenchStorageKeys.session);
          storage.removeItem(WORKBENCH_FILES_STORAGE_KEY);
        } catch {
          // The committed envelope is authoritative; stale migration keys are harmless.
        }
        return true;
      } catch {
        return false;
      }
    },
    [markStorageConflict],
  );

  useEffect(() => {
    window.requestAnimationFrame(() => overlayRef.current?.focus());
  }, []);

  useEffect(() => {
    const compactQuery = window.matchMedia("(max-width: 980px)");
    const syncCompactMode = () => setIsCompact(compactQuery.matches);
    syncCompactMode();
    compactQuery.addEventListener("change", syncCompactMode);
    return () => compactQuery.removeEventListener("change", syncCompactMode);
  }, []);

  useEffect(() => {
    let loadedSession = createDefaultWorkbenchSession();
    let loadedFiles = createDefaultWorkbenchFiles();
    let restored = false;
    let blocked = false;

    try {
      const storage = window.localStorage;
      const serializedCommitted = storage.getItem(
        WORKBENCH_COMMITTED_STATE_STORAGE_KEY,
      );
      if (serializedCommitted !== null) {
        const committed = parseWorkbenchCommittedState(serializedCommitted);
        if (!committed) {
          corruptStorageRef.current.committed = serializedCommitted;
          blocked = true;
        } else {
          loadedSession = committed.session;
          loadedFiles = committed.files;
          committedRevisionRef.current = committed.revision;
          restored = true;
        }
      } else {
        const serializedSession = storage.getItem(workbenchStorageKeys.session);
        const serializedFiles = storage.getItem(WORKBENCH_FILES_STORAGE_KEY);
        const parsedSession = readSession(serializedSession);
        const migratedSession = serializedSession
          ? null
          : migrateLegacyWorkbenchSession(storage);
        const parsedFiles = serializedFiles
          ? parseWorkbenchFiles(serializedFiles)
          : createDefaultWorkbenchFiles();

        if (serializedSession && !parsedSession) {
          corruptStorageRef.current.session = serializedSession;
          blocked = true;
        } else if (parsedSession || migratedSession) {
          loadedSession = parsedSession ?? migratedSession ?? loadedSession;
          restored = true;
        }

        if (serializedFiles && !parsedFiles) {
          corruptStorageRef.current.files = serializedFiles;
          blocked = true;
        } else if (parsedFiles) {
          loadedFiles = parsedFiles;
        }
      }
    } catch {
      blocked = true;
    }

    if (deepLink?.workspaceId || deepLink?.appId) {
      const targetWorkspaceId =
        deepLink.workspaceId ?? loadedSession.activeWorkspaceId;
      let nextWindows = loadedSession.windows;
      let nextActiveInstanceId =
        loadedSession.activeInstances[targetWorkspaceId] ?? null;
      if (deepLink.appId) {
        try {
          const opened = openAppWindow(
            nextWindows,
            deepLink.appId,
            targetWorkspaceId,
          );
          nextWindows = opened.windows;
          nextActiveInstanceId = opened.activeInstanceId;
        } catch {
          // Window capacity reached, so fall back to the workspace switch alone.
        }
      }
      loadedSession = {
        ...loadedSession,
        activeWorkspaceId: targetWorkspaceId,
        activeInstances: {
          ...loadedSession.activeInstances,
          [targetWorkspaceId]: nextActiveInstanceId,
        },
        windows: nextWindows,
      };
    }

    replaceSession(loadedSession);
    replaceFiles(loadedFiles);
    setSessionStatus(restored ? "restored" : "fresh");
    setLastSaved(restored ? formatSavedTime(loadedSession.updatedAt) : "Not saved yet");
    setStorageBlocked(blocked);
    if (blocked) {
      setNotice(
        "Saved local data could not be validated. A fresh session is running without overwriting it.",
      );
    }
    setHasHydrated(true);
  }, [deepLink, replaceFiles, replaceSession]);

  useEffect(() => {
    if (!hasHydrated || storageBlocked || hasStorageConflict) return;
    setSessionStatus("saving");
    const timer = window.setTimeout(() => {
      const snapshot = {
        ...sessionRef.current,
        updatedAt: Date.now(),
      } satisfies WorkbenchSession;
      if (persistPair(snapshot, filesRef.current)) {
        setLastSaved(formatSavedTime(snapshot.updatedAt));
        setSessionStatus("restored");
      } else {
        setSessionStatus("fresh");
        if (!storageConflictPendingRef.current) {
          setNotice("This browser could not save the local Workbench session.");
        }
      }
    }, 240);
    return () => window.clearTimeout(timer);
  }, [files, hasHydrated, hasStorageConflict, persistPair, session, storageBlocked]);

  useEffect(() => {
    if (!hasHydrated || storageBlocked || hasStorageConflict) return;
    const flush = () => {
      const snapshot = {
        ...sessionRef.current,
        updatedAt: Date.now(),
      } satisfies WorkbenchSession;
      persistPair(snapshot, filesRef.current);
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [hasHydrated, hasStorageConflict, persistPair, storageBlocked]);

  useEffect(() => {
    if (!hasHydrated) return;
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== WORKBENCH_COMMITTED_STATE_STORAGE_KEY &&
        !(event.key === null && committedRevisionRef.current !== null)
      ) {
        return;
      }
      const incoming = parseWorkbenchCommittedState(event.newValue);
      if (incoming?.revision === committedRevisionRef.current) return;
      markStorageConflict(event.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [hasHydrated, markStorageConflict]);

  useEffect(() => {
    if (!hasHydrated || isCompact) return;
    const frame = window.requestAnimationFrame(() => {
      const bounds = getDesktopBounds();
      if (!bounds) return;
      updateSession((current) => ({
        ...current,
        windows: fitWindowsToBounds(current.windows, bounds),
      }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [getDesktopBounds, hasHydrated, isCompact, updateSession]);

  useEffect(() => {
    if (!isPaletteOpen) return;
    window.requestAnimationFrame(() => paletteInputRef.current?.focus());
  }, [isPaletteOpen]);

  useEffect(() => {
    if (!isPaletteOpen) return;
    window.requestAnimationFrame(() => {
      paletteOptionRefs.current[paletteActiveIndex]?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    });
  }, [isPaletteOpen, paletteActiveIndex]);

  const activeWorkspaceId = session.activeWorkspaceId;
  const activeInstanceId = session.activeInstances[activeWorkspaceId];
  const activeWindow = session.windows.find(
    (windowState) => windowState.instanceId === activeInstanceId,
  );
  const activeAppId = activeWindow?.appId ?? null;
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  ) ?? workspaces[0];

  useEffect(() => {
    setVisitedWorkspaceIds((current) =>
      current.includes(activeWorkspaceId)
        ? current
        : [...current, activeWorkspaceId],
    );
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!isCompact || !activeAppId) return;
    window.requestAnimationFrame(() => {
      dockButtonRefs.current[activeAppId]?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }, [activeAppId, isCompact, prefersReducedMotion]);

  const focusManagedSurface = useCallback((instanceId: string | null) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (instanceId) {
          windowRefs.current[instanceId]?.focus();
        } else {
          overlayRef.current?.focus();
        }
      });
    });
  }, []);

  const raiseWindowInstance = useCallback(
    (instanceId: string) => {
      const current = sessionRef.current;
      const target = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target) return false;
      const result = focusManagedWindow(
        current.windows,
        instanceId,
        zCounter.current,
      );
      commitWindowResult(result, target.workspaceId);
      return true;
    },
    [commitWindowResult],
  );

  const openWindow = useCallback(
    (
      appId: WorkbenchAppId,
      options: { forceNew?: boolean; focusConsole?: boolean } = {},
    ) => {
      const current = sessionRef.current;
      let result: WindowManagerResult;
      try {
        result = openAppWindow(
          current.windows,
          appId,
          current.activeWorkspaceId,
          {
            forceNew: options.forceNew,
            z: zCounter.current,
          },
        );
      } catch {
        setNotice("Workbench has reached its 60-window local session limit.");
        return null;
      }
      commitWindowResult(result, current.activeWorkspaceId);
      const instanceId = result.activeInstanceId;
      playSound("focus");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("app", appId);
        window.history.replaceState(null, "", url.toString());
      }
      if (instanceId) {
        window.requestAnimationFrame(() => {
          windowRefs.current[instanceId]?.focus();
          if (options.focusConsole) {
            consoleInputRefs.current[instanceId]?.focus();
          }
        });
      }
      setContextMenu(null);
      return instanceId;
    },
    [commitWindowResult],
  );

  const openArchiveAt = useCallback(
    (folderId: string, forceNew = false) => {
      const current = sessionRef.current;
      let result: WindowManagerResult;
      try {
        result = openAppWindow(
          current.windows,
          "archive",
          current.activeWorkspaceId,
          { forceNew, z: zCounter.current },
        );
      } catch {
        setNotice("Workbench has reached its 60-window local session limit.");
        return;
      }
      const instanceId = result.activeInstanceId;
      const nextWindows = result.windows.map((windowState) =>
        windowState.instanceId === instanceId
          ? {
              ...windowState,
              data: { ...windowState.data, folderId },
            }
          : windowState,
      );
      commitWindowResult(
        { ...result, windows: nextWindows },
        current.activeWorkspaceId,
      );
      if (instanceId) {
        focusManagedSurface(instanceId);
      }
      setContextMenu(null);
    },
    [commitWindowResult, focusManagedSurface],
  );

  const minimizeWindow = useCallback(
    (instanceId: string) => {
      const current = sessionRef.current;
      const target = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target) return;
      const result = minimizeManagedWindow(current.windows, instanceId);
      commitWindowResult(result, target.workspaceId);
      focusManagedSurface(result.activeInstanceId);
    },
    [commitWindowResult, focusManagedSurface],
  );

  const closeWindow = useCallback(
    (instanceId: string) => {
      const current = sessionRef.current;
      const target = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target) return;
      playSound("snap");
      const result = closeManagedWindow(current.windows, instanceId);
      commitWindowResult(result, target.workspaceId);
      focusManagedSurface(result.activeInstanceId);
    },
    [commitWindowResult, focusManagedSurface],
  );

  const toggleMaximize = useCallback(
    (instanceId: string) => {
      const current = sessionRef.current;
      const target = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target) return;
      commitWindowResult(
        toggleManagedMaximize(current.windows, instanceId, zCounter.current),
        target.workspaceId,
      );
    },
    [commitWindowResult],
  );

  const tidyCurrentWorkspace = useCallback(() => {
    const current = sessionRef.current;
    commitWindowResult(
      tidyWorkspace(current.windows, current.activeWorkspaceId),
      current.activeWorkspaceId,
    );
    setContextMenu(null);
    setNotice("Current workspace returned to its authored layout.");
  }, [commitWindowResult]);

  const snapActiveWindow = useCallback(
    (target: Extract<WorkbenchSnapTarget, "left" | "right">) => {
      if (isCompact) return;
      const current = sessionRef.current;
      const instanceId = current.activeInstances[current.activeWorkspaceId];
      const active = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      const bounds = getDesktopBounds();
      if (!instanceId || !active || !bounds) return;
      const result = snapWindow(
        current.windows,
        instanceId,
        target,
        bounds,
        zCounter.current,
      );
      commitWindowResult(result, active.workspaceId);
      focusManagedSurface(instanceId);
    },
    [commitWindowResult, focusManagedSurface, getDesktopBounds, isCompact],
  );

  const closeCurrentWorkspace = useCallback(() => {
    const current = sessionRef.current;
    const result = closeWorkspaceWindows(
      current.windows,
      current.activeWorkspaceId,
    );
    commitWindowResult(result, current.activeWorkspaceId);
    setContextMenu(null);
    focusManagedSurface(result.activeInstanceId);
  }, [commitWindowResult, focusManagedSurface]);

  const switchWorkspace = useCallback((workspaceId: WorkspaceId, focusSurface = true) => {
    const current = sessionRef.current;
    playSound("snap");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("workspace", workspaceId);
      window.history.replaceState(null, "", url.toString());
    }
    const active = switchWorkspaceActiveInstance(
      current.windows,
      workspaceId,
      current.activeInstances[workspaceId],
    );
    updateSession((latest) => ({
      ...latest,
      activeWorkspaceId: workspaceId,
      activeInstances: {
        ...latest.activeInstances,
        [workspaceId]: active,
      },
    }));
    setVisitedWorkspaceIds((visited) =>
      visited.includes(workspaceId) ? visited : [...visited, workspaceId],
    );
    setContextMenu(null);
    if (focusSurface) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (active) windowRefs.current[active]?.focus();
          else overlayRef.current?.focus();
        });
      });
    }
  }, [updateSession]);

  const selectAtlasWindow = useCallback(
    (instanceId: string) => {
      const current = sessionRef.current;
      const target = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target) return;
      const result = focusManagedWindow(
        current.windows,
        instanceId,
        zCounter.current,
      );
      zCounter.current = result.nextZ;
      updateSession((latest) => ({
        ...latest,
        windows: result.windows,
        activeWorkspaceId: target.workspaceId,
        activeInstances: {
          ...latest.activeInstances,
          [target.workspaceId]: result.activeInstanceId,
        },
      }));
      setIsAtlasOpen(false);
      window.requestAnimationFrame(() => windowRefs.current[instanceId]?.focus());
    },
    [updateSession],
  );

  const updateWindowData = useCallback(
    (instanceId: string, key: string, value: string) => {
      updateSession((current) => ({
        ...current,
        windows: current.windows.map((windowState) =>
          windowState.instanceId === instanceId
            ? {
                ...windowState,
                data: { ...windowState.data, [key]: value },
              }
            : windowState,
        ),
      }));
    },
    [updateSession],
  );

  const setTheme = useCallback(
    (themeId: string) => {
      if (!isWorkbenchThemeId(themeId)) return;
      updateSession((current) => ({ ...current, themeId }));
    },
    [updateSession],
  );

  const openPalette = useCallback(() => {
    paletteInvokerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setContextMenu(null);
    setIsAtlasOpen(false);
    setPaletteQuery("");
    setPaletteActiveIndex(0);
    setIsPaletteOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    const invoker = paletteInvokerRef.current;
    paletteInvokerRef.current = null;
    setIsPaletteOpen(false);
    setPaletteQuery("");
    window.requestAnimationFrame(() => {
      if (invoker?.isConnected) invoker.focus();
      else overlayRef.current?.focus();
    });
  }, []);

  const openAtlas = useCallback(() => {
    paletteInvokerRef.current = null;
    setContextMenu(null);
    setIsPaletteOpen(false);
    setPaletteQuery("");
    setIsAtlasOpen(true);
  }, []);

  const closePortfolio = useCallback(() => {
    if (hasStorageConflict) {
      setNotice("Choose which tab revision to keep before closing Workbench.");
      return;
    }
    if (storageBlocked) {
      setNotice("Resolve local storage recovery or export a backup before closing Workbench.");
      return;
    }
    const snapshot = {
      ...sessionRef.current,
      updatedAt: Date.now(),
    } satisfies WorkbenchSession;
    if (!persistPair(snapshot, filesRef.current)) {
      if (!storageConflictPendingRef.current) {
        setNotice("Workbench could not save. Export a backup before closing to protect local edits.");
      }
      return;
    }
    onClose();
  }, [hasStorageConflict, onClose, persistPair, storageBlocked]);

  const openExternal = useCallback((href: string) => {
    if (!isSafeExternalHref(href)) {
      setNotice("That external route was blocked because its protocol is not trusted.");
      return;
    }
    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (opened) opened.opener = null;
  }, []);

  const handleFileResult = useCallback(
    (node: FileNode) => {
      if (node.kind === "app") {
        if (isWorkbenchAppId(node.appId)) openWindow(node.appId);
        return;
      }
      if (node.kind === "external") {
        openExternal(node.href);
        return;
      }
      const folderId =
        node.kind === "folder" ? node.id : node.parentId ?? ROOT_FILE_ID;
      openArchiveAt(folderId);
    },
    [openArchiveAt, openExternal, openWindow],
  );

  const exportSession = useCallback(() => {
    try {
      const serialized = serializeWorkbenchBackup(
        { ...sessionRef.current, updatedAt: Date.now() },
        filesRef.current,
      );
      const blob = new Blob([serialized], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `sam-workbench-${workbenchBackupDateFormat.format(new Date())}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setNotice("Session backup exported with local Archive content.");
    } catch {
      setNotice("The current Workbench state could not be packaged for export.");
    }
  }, []);

  const chooseImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImport = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (file.size > MAX_WORKBENCH_BACKUP_BYTES) {
        setNotice(
          `That backup is larger than the ${MAX_WORKBENCH_BACKUP_BYTES / 1_048_576} MiB local import limit.`,
        );
        if (importInputRef.current) importInputRef.current.value = "";
        return;
      }
      try {
        const parsed = parseWorkbenchBackup(await file.text());
        if (!parsed) {
          setNotice("That file is not a valid Workbench backup.");
          return;
        }
        if (!persistPair(parsed.session, parsed.files, { force: true })) {
          setNotice("The backup was valid, but this browser could not store it.");
          return;
        }
        replaceSession(parsed.session);
        replaceFiles(parsed.files);
        corruptStorageRef.current = { committed: null, session: null, files: null };
        setStorageBlocked(false);
        setSessionStatus("restored");
        setLastSaved(formatSavedTime(parsed.session.updatedAt));
        setNotice("Session and Archive restored from the selected backup.");
      } catch {
        setNotice("The selected backup could not be read.");
      } finally {
        if (importInputRef.current) importInputRef.current.value = "";
      }
    },
    [persistPair, replaceFiles, replaceSession],
  );

  const acceptFreshStorage = useCallback(() => {
    const timestamp = Date.now();
    const writtenRecoveryKeys: string[] = [];
    try {
      const storage = window.localStorage;
      const probeKey = `${WORKBENCH_COMMITTED_STATE_STORAGE_KEY}-probe-${timestamp}`;
      storage.setItem(probeKey, "ready");
      if (storage.getItem(probeKey) !== "ready") {
        throw new Error("Local storage write probe did not round-trip.");
      }
      storage.removeItem(probeKey);

      // Recovery copies land before the fresh commit; if anything below
      // fails they are rolled back so repeated attempts cannot stack
      // duplicate multi-megabyte blobs against an already-tight quota.
      const stagedRecovery: Array<[key: string, value: string]> = [];
      const blocked = corruptStorageRef.current;
      if (blocked.committed) {
        stagedRecovery.push([
          `${WORKBENCH_COMMITTED_STATE_STORAGE_KEY}-recovery-${timestamp}`,
          blocked.committed,
        ]);
      }
      if (blocked.session) {
        stagedRecovery.push([
          `${workbenchStorageKeys.session}-recovery-${timestamp}`,
          blocked.session,
        ]);
      }
      if (blocked.files) {
        stagedRecovery.push([
          `${WORKBENCH_FILES_STORAGE_KEY}-recovery-${timestamp}`,
          blocked.files,
        ]);
      }
      for (const [key, value] of stagedRecovery) {
        storage.setItem(key, value);
        writtenRecoveryKeys.push(key);
      }

      const snapshot = {
        ...sessionRef.current,
        updatedAt: Date.now(),
      } satisfies WorkbenchSession;
      if (!persistPair(snapshot, filesRef.current, { force: true })) {
        throw new Error("Fresh state could not be committed.");
      }
      corruptStorageRef.current = { committed: null, session: null, files: null };
      setStorageBlocked(false);
      setSessionStatus("restored");
      setLastSaved(formatSavedTime(snapshot.updatedAt));
      setNotice("Unreadable local data was preserved under recovery keys. Fresh saving is active.");
    } catch {
      for (const key of writtenRecoveryKeys) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Best effort; a stranded copy is preferable to masking the error.
        }
      }
      setNotice("The browser could not preserve the unreadable data, so it remains untouched.");
    }
  }, [persistPair]);

  const loadOtherTabRevision = useCallback(() => {
    const incoming = storageConflictRef.current;
    if (!incoming) {
      setNotice("The other tab removed its committed state. Keep this tab to save a new revision.");
      return;
    }
    replaceSession(incoming.session);
    replaceFiles(incoming.files);
    committedRevisionRef.current = incoming.revision;
    storageConflictRef.current = null;
    storageConflictPendingRef.current = false;
    setHasStorageConflict(false);
    setSessionStatus("restored");
    setLastSaved(formatSavedTime(incoming.session.updatedAt));
    setNotice("Loaded the Workbench revision saved by the other tab.");
  }, [replaceFiles, replaceSession]);

  const keepThisTabRevision = useCallback(() => {
    const snapshot = {
      ...sessionRef.current,
      updatedAt: Date.now(),
    } satisfies WorkbenchSession;
    if (!persistPair(snapshot, filesRef.current, { force: true })) {
      setNotice("This tab could not commit its revision. Export a backup before retrying.");
      return;
    }
    setSessionStatus("restored");
    setLastSaved(formatSavedTime(snapshot.updatedAt));
    setNotice("Kept this tab and committed it as the latest Workbench revision.");
  }, [persistPair]);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, instanceId: string) => {
      if (
        event.button !== 0 ||
        isCompact ||
        (event.target as HTMLElement).closest("button")
      ) {
        return;
      }
      const current = sessionRef.current;
      const original = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!original || original.maximized) return;

      const result = focusManagedWindow(
        current.windows,
        instanceId,
        zCounter.current,
      );
      const target = result.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target) return;

      // A snapped window only releases its geometry once the pointer
      // actually drags; a bare focus click keeps the snap intact.
      dragSession.current = {
        instanceId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: target.x,
        originY: target.y,
        nextX: target.x,
        nextY: target.y,
        pendingRestoreBounds:
          target.snap && target.restoreBounds
            ? { ...target.restoreBounds }
            : null,
      };
      commitWindowResult(result, target.workspaceId);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [commitWindowResult, isCompact],
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, instanceId: string) => {
      if (event.button !== 0 || isCompact) return;
      const current = sessionRef.current;
      const target = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target || target.maximized || target.snap) return;
      const result = focusManagedWindow(
        current.windows,
        instanceId,
        zCounter.current,
      );
      commitWindowResult(result, target.workspaceId);
      resizeSession.current = {
        instanceId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originWidth: target.width,
        originHeight: target.height,
        nextWidth: target.width,
        nextHeight: target.height,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    },
    [commitWindowResult, isCompact],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const desktop = desktopRef.current;
      if (!desktop) return;
      const desktopRect = desktop.getBoundingClientRect();
      const bounds = getDesktopBounds();
      if (!bounds) return;

      const resizing = resizeSession.current;
      if (resizing && resizing.pointerId === event.pointerId) {
        const target = sessionRef.current.windows.find(
          (windowState) => windowState.instanceId === resizing.instanceId,
        );
        const element = windowRefs.current[resizing.instanceId];
        if (!target || !element) return;
        resizing.nextWidth = clamp(
          resizing.originWidth + event.clientX - resizing.startX,
          320,
          Math.max(320, bounds.width - target.x),
        );
        resizing.nextHeight = clamp(
          resizing.originHeight + event.clientY - resizing.startY,
          190,
          Math.max(190, bounds.height - target.y),
        );
        element.style.width = `${resizing.nextWidth}px`;
        element.style.height = `${resizing.nextHeight}px`;
        event.preventDefault();
        return;
      }

      const dragging = dragSession.current;
      if (!dragging || dragging.pointerId !== event.pointerId) return;
      let target = sessionRef.current.windows.find(
        (windowState) => windowState.instanceId === dragging.instanceId,
      );
      const element = windowRefs.current[dragging.instanceId];
      if (!target || !element) return;

      if (dragging.pendingRestoreBounds) {
        const movedDistance = Math.hypot(
          event.clientX - dragging.startX,
          event.clientY - dragging.startY,
        );
        if (movedDistance < UNSNAP_DRAG_THRESHOLD_PX) {
          return;
        }
        const restored = dragging.pendingRestoreBounds;
        updateSession((latest) => ({
          ...latest,
          windows: latest.windows.map((windowState) =>
            windowState.instanceId === dragging.instanceId
              ? { ...windowState, ...restored, snap: null, restoreBounds: null }
              : windowState,
          ),
        }));
        target = { ...target, ...restored, snap: null, restoreBounds: null };
        element.style.left = `${restored.x}px`;
        element.style.top = `${restored.y}px`;
        element.style.width = `${restored.width}px`;
        element.style.height = `${restored.height}px`;
        dragging.startX = event.clientX;
        dragging.startY = event.clientY;
        dragging.originX = restored.x;
        dragging.originY = restored.y;
        dragging.pendingRestoreBounds = null;
      }

      dragging.nextX = clamp(
        dragging.originX + event.clientX - dragging.startX,
        0,
        Math.max(0, bounds.width - target.width),
      );
      dragging.nextY = clamp(
        dragging.originY + event.clientY - dragging.startY,
        0,
        Math.max(0, bounds.height - target.height),
      );
      element.style.left = `${dragging.nextX}px`;
      element.style.top = `${dragging.nextY}px`;

      const nextZone: WorkbenchSnapTarget | null =
        event.clientY <= desktopRect.top + SNAP_EDGE
          ? "top"
          : event.clientX <= desktopRect.left + SNAP_EDGE
            ? "left"
            : event.clientX >= desktopRect.right - SNAP_EDGE
              ? "right"
              : null;
      if (snapZoneRef.current !== nextZone) {
        snapZoneRef.current = nextZone;
        setSnapZone(nextZone);
      }
      event.preventDefault();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const dragging = dragSession.current;
      const resizing = resizeSession.current;

      if (dragging && dragging.pointerId === event.pointerId) {
        const current = sessionRef.current;
        const target = current.windows.find(
          (windowState) => windowState.instanceId === dragging.instanceId,
        );
        const bounds = getDesktopBounds();
        if (dragging.pendingRestoreBounds) {
          // Bare click on a snapped title bar: keep the snapped geometry.
        } else if (
          target &&
          bounds &&
          snapZoneRef.current &&
          event.type !== "pointercancel"
        ) {
          commitWindowResult(
            snapWindow(
              current.windows,
              dragging.instanceId,
              snapZoneRef.current,
              bounds,
              zCounter.current,
            ),
            target.workspaceId,
          );
        } else if (target) {
          updateSession((latest) => ({
            ...latest,
            windows: latest.windows.map((windowState) =>
              windowState.instanceId === dragging.instanceId
                ? {
                    ...windowState,
                    x: dragging.nextX,
                    y: dragging.nextY,
                    snap: null,
                    restoreBounds: null,
                  }
                : windowState,
            ),
          }));
        }
      }

      if (resizing && resizing.pointerId === event.pointerId) {
        updateSession((current) => ({
          ...current,
          windows: current.windows.map((windowState) =>
            windowState.instanceId === resizing.instanceId
              ? {
                  ...windowState,
                  width: resizing.nextWidth,
                  height: resizing.nextHeight,
                }
              : windowState,
          ),
        }));
      }

      dragSession.current = null;
      resizeSession.current = null;
      snapZoneRef.current = null;
      setSnapZone(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [commitWindowResult, getDesktopBounds, updateSession]);

  useEffect(() => {
    const fitDesktopWindows = () => {
      if (window.matchMedia("(max-width: 980px)").matches) return;
      const bounds = getDesktopBounds();
      if (!bounds) return;
      updateSession((current) => ({
        ...current,
        windows: fitWindowsToBounds(current.windows, bounds),
      }));
    };
    window.addEventListener("resize", fitDesktopWindows);
    return () => window.removeEventListener("resize", fitDesktopWindows);
  }, [getDesktopBounds, updateSession]);

  const resizeWindowBy = useCallback(
    (instanceId: string, widthDelta: number, heightDelta: number) => {
      const bounds = getDesktopBounds();
      if (!bounds) return;
      updateSession((current) => ({
        ...current,
        windows: current.windows.map((windowState) => {
          if (windowState.instanceId !== instanceId || windowState.maximized) {
            return windowState;
          }
          const width = clamp(
            windowState.width + widthDelta,
            320,
            Math.max(320, bounds.width - windowState.x),
          );
          const height = clamp(
            windowState.height + heightDelta,
            190,
            Math.max(190, bounds.height - windowState.y),
          );
          return {
            ...windowState,
            width,
            height,
            snap: null,
            restoreBounds: null,
          };
        }),
      }));
    },
    [getDesktopBounds, updateSession],
  );

  const runConsoleCommand = useCallback(
    (rawCommand: string) => {
      const command = rawCommand.trim().toLowerCase();
      if (!command) return;
      if (command === "clear") {
        setConsoleLines([]);
        setConsoleInput("");
        return;
      }

      let response = "Unknown command. Type help for the command index.";
      const directApp = workbenchApps.find(
        (app) =>
          command === app.id ||
          command === `open ${app.id}` ||
          command === `open ${app.label.toLowerCase()}`,
      );
      const workspaceCommand = command.match(/^workspace\s+(build|field|notes)$/);
      const themeCommand = command.match(/^theme\s+(cobalt|oxide|graphite)$/);

      if (directApp) {
        openWindow(directApp.id, {
          focusConsole: directApp.id === "console",
        });
        response = `Opened ${directApp.label}.`;
      } else if (workspaceCommand && isWorkspaceId(workspaceCommand[1])) {
        switchWorkspace(workspaceCommand[1]);
        response = `Switched to ${workspaceCommand[1]}.`;
      } else if (themeCommand && isWorkbenchThemeId(themeCommand[1])) {
        setTheme(themeCommand[1]);
        response = `Theme set to ${themeCommand[1]}.`;
      } else if (command === "help") {
        response =
          "open [app] · workspace [build|field|notes] · theme [cobalt|oxide|graphite] · atlas · search · tidy · close all · whoami · contact · clear";
      } else if (command === "tidy") {
        tidyCurrentWorkspace();
        response = "Current workspace returned to its authored positions.";
      } else if (command === "close all") {
        closeCurrentWorkspace();
        response = "Current workspace cleared. Applications remain available in the dock.";
      } else if (command === "atlas") {
        openAtlas();
        response = "Atlas opened.";
      } else if (command === "search") {
        openPalette();
        response = "System search opened.";
      } else if (command === "whoami") {
        response = "Sam Bai · founder/operator · Solynth Labs · Hamilton, New Zealand";
      } else if (command === "contact") {
        response = "sambai.codes@gmail.com · solynthlabs.com";
      }
      setConsoleLines((current) => [
        ...current,
        `> ${rawCommand.trim()}`,
        response,
      ]);
      setConsoleHistory((current) => {
        const next =
          current[current.length - 1] === rawCommand.trim()
            ? current
            : [...current, rawCommand.trim()].slice(-40);
        return next;
      });
      setConsoleHistoryIndex(null);
      setConsoleInput("");
    },
    [
      closeCurrentWorkspace,
      openAtlas,
      openPalette,
      openWindow,
      setTheme,
      switchWorkspace,
      tidyCurrentWorkspace,
    ],
  );

  const paletteActions = useMemo<PaletteAction[]>(() => {
    const appActions = workbenchApps.map((app) => ({
      id: `app-${app.id}`,
      label: `Open ${app.label}`,
      meta: `App · ${app.shortcut}`,
      terms: `${app.summary} ${app.keywords.join(" ")}`,
      run: () =>
        openWindow(app.id, {
          focusConsole: app.id === "console",
        }),
    }));

    const workspaceActions = workspaces.map((workspace, index) => ({
      id: `workspace-${workspace.id}`,
      label: `Switch to ${workspace.label}`,
      meta: `Workspace · Alt+${index + 1}`,
      terms: workspace.description,
      run: () => switchWorkspace(workspace.id),
    }));

    const openWindowActions = session.windows.map((windowState) => {
      const action = !windowState.open
        ? "Reopen"
        : windowState.minimized
          ? "Restore"
          : "Focus";
      return {
        id: `window-${windowState.instanceId}`,
        label: `${action} ${windowState.title}`,
        meta: `${
          workspaces.find((workspace) => workspace.id === windowState.workspaceId)
            ?.label ?? windowState.workspaceId
        } · Window`,
        terms: `${windowState.appId} ${getWorkbenchApp(windowState.appId).summary}`,
        run: () => selectAtlasWindow(windowState.instanceId),
      };
    });

    const fileActions = files.nodes
      .filter(
        (node) =>
          node.kind !== "root" &&
          node.kind !== "trash" &&
          !isNodeInTrash(files, node.id),
      )
      .map((node) => ({
        id: `file-${node.id}`,
        label: node.name,
        meta: `Archive · ${getNodePath(files, node.id)
          .slice(1, -1)
          .map((item) => item.name)
          .join(" / ") || node.kind}`,
        terms: `${node.summary ?? ""} ${
          node.kind === "note"
            ? node.content
            : node.kind === "app"
              ? node.appId
              : node.kind === "external"
                ? node.href
                : "folder"
        }`,
        restoreInvoker: node.kind === "external",
        run: () => handleFileResult(node),
      }));

    const systemActions: PaletteAction[] = [
      {
        id: "system-atlas",
        label: "Open Atlas",
        meta: "System · F3",
        terms: "overview windows workspaces surfaces",
        run: openAtlas,
      },
      {
        id: "system-tidy",
        label: "Tidy current workspace",
        meta: "System",
        terms: "reset arrange layout",
        restoreInvoker: true,
        run: tidyCurrentWorkspace,
      },
      {
        id: "system-export",
        label: "Export local session",
        meta: "Backup",
        terms: "download archive files restore json",
        restoreInvoker: true,
        run: exportSession,
      },
      {
        id: "system-return",
        label: "Return to portfolio",
        meta: "System · Esc",
        terms: "close exit",
        run: closePortfolio,
      },
    ];

    return [
      ...appActions,
      ...systemActions,
      ...workspaceActions,
      ...openWindowActions,
      ...fileActions,
    ];
  }, [
    closePortfolio,
    exportSession,
    files,
    handleFileResult,
    openAtlas,
    openWindow,
    selectAtlasWindow,
    session.windows,
    switchWorkspace,
    tidyCurrentWorkspace,
  ]);

  const filteredPaletteActions = useMemo(
    () =>
      paletteActions
        .map((action, index) => ({
          action,
          index,
          score: scorePaletteAction(action, paletteQuery),
        }))
        .filter((result) => result.score >= 0)
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .slice(0, 18)
        .map((result) => result.action),
    [paletteActions, paletteQuery],
  );

  useEffect(() => {
    if (paletteActiveIndex < filteredPaletteActions.length) return;
    setPaletteActiveIndex(Math.max(0, filteredPaletteActions.length - 1));
  }, [filteredPaletteActions.length, paletteActiveIndex]);

  const runPaletteAction = useCallback(
    (action: PaletteAction) => {
      if (action.restoreInvoker) {
        closePalette();
        action.run();
        return;
      }
      paletteInvokerRef.current = null;
      setIsPaletteOpen(false);
      setPaletteQuery("");
      action.run();
    },
    [closePalette],
  );

  const menus = useMemo<WorkbenchMenu[]>(() => {
    const activeDefinition = activeAppId ? getWorkbenchApp(activeAppId) : null;
    return [
      {
        id: "workbench",
        label: "Workbench",
        items: [
          {
            id: "about",
            label: "Open Now",
            shortcut: "1",
            onSelect: () => openWindow("now"),
          },
          {
            id: "control",
            label: "Open Control",
            shortcut: "0",
            onSelect: () => openWindow("control"),
          },
          {
            id: "return",
            label: "Return to portfolio",
            shortcut: "Esc",
            onSelect: closePortfolio,
          },
        ],
      },
      {
        id: "file",
        label: "File",
        items: [
          {
            id: "new-active",
            label: activeDefinition
              ? `New ${activeDefinition.label} window`
              : "New application window",
            shortcut: "Shift+Click",
            disabled: !activeDefinition?.supportsMultiple,
            onSelect: () => {
              if (activeAppId) openWindow(activeAppId, { forceNew: true });
            },
          },
          {
            id: "open-archive-root",
            label: "Open Archive root",
            shortcut: "9",
            onSelect: () => openArchiveAt(ROOT_FILE_ID),
          },
          {
            id: "export",
            label: "Export session",
            onSelect: exportSession,
          },
          {
            id: "close-window",
            label: "Close active window",
            disabled: !activeInstanceId,
            danger: true,
            onSelect: () => {
              if (activeInstanceId) closeWindow(activeInstanceId);
            },
          },
        ],
      },
      {
        id: "view",
        label: "View",
        items: [
          {
            id: "atlas",
            label: "Open Atlas",
            shortcut: "F3",
            onSelect: openAtlas,
          },
          {
            id: "search",
            label: "Search everything",
            shortcut: "/",
            onSelect: openPalette,
          },
          {
            id: "tidy",
            label: "Tidy current workspace",
            onSelect: tidyCurrentWorkspace,
          },
        ],
      },
      {
        id: "window",
        label: "Window",
        items: [
          {
            id: "minimize",
            label: "Minimize active window",
            disabled: !activeInstanceId,
            onSelect: () => {
              if (activeInstanceId) minimizeWindow(activeInstanceId);
            },
          },
          {
            id: "maximize",
            label: activeWindow?.maximized ? "Restore active window" : "Maximize active window",
            disabled: !activeInstanceId,
            onSelect: () => {
              if (activeInstanceId) toggleMaximize(activeInstanceId);
            },
          },
          {
            id: "snap-left",
            label: "Snap active window left",
            disabled: !activeInstanceId || isCompact,
            onSelect: () => snapActiveWindow("left"),
          },
          {
            id: "snap-right",
            label: "Snap active window right",
            disabled: !activeInstanceId || isCompact,
            onSelect: () => snapActiveWindow("right"),
          },
          {
            id: "close-all",
            label: "Close workspace windows",
            danger: true,
            onSelect: closeCurrentWorkspace,
          },
        ],
      },
      {
        id: "go",
        label: "Go",
        items: [
          ...workspaces.map((workspace, index) => ({
            id: `go-${workspace.id}`,
            label: `${workspace.label} workspace`,
            shortcut: `Alt+${index + 1}`,
            disabled: workspace.id === activeWorkspaceId,
            onSelect: () => switchWorkspace(workspace.id),
          })),
          {
            id: "go-archive",
            label: "Open Archive",
            shortcut: "9",
            onSelect: () => openArchiveAt(ROOT_FILE_ID),
          },
        ],
      },
    ];
  }, [
    activeAppId,
    activeInstanceId,
    activeWindow?.maximized,
    activeWorkspaceId,
    closeCurrentWorkspace,
    closePortfolio,
    closeWindow,
    exportSession,
    isCompact,
    minimizeWindow,
    openArchiveAt,
    openAtlas,
    openPalette,
    openWindow,
    snapActiveWindow,
    switchWorkspace,
    tidyCurrentWorkspace,
    toggleMaximize,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // Ignore OS key autorepeat: held keys must not re-toggle the OS,
      // re-run persistence, or spam shortcuts.
      if (event.repeat) return;

      if (event.key === "Escape") {
        if (isPaletteOpen) {
          event.preventDefault();
          closePalette();
        } else if (isAtlasOpen) {
          event.preventDefault();
          setIsAtlasOpen(false);
        } else if (contextMenu) {
          event.preventDefault();
          setContextMenu(null);
        } else {
          event.preventDefault();
          closePortfolio();
        }
        return;
      }

      if (event.key === "Tab") {
        const scope = isAtlasOpen
          ? overlayRef.current?.querySelector<HTMLElement>(
              ".mission-control-surface",
            )
          : isPaletteOpen
            ? overlayRef.current?.querySelector<HTMLElement>(".os-palette")
            : overlayRef.current;
        if (!scope) return;
        const focusable = Array.from(
          scope.querySelectorAll<HTMLElement>(
            'a[href], input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            element.offsetParent !== null &&
            !element.closest('[aria-hidden="true"]'),
        );
        if (!focusable.length) {
          event.preventDefault();
          scope.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;
        if (!(activeElement instanceof Node) || !scope.contains(activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (isAtlasOpen || isPaletteOpen) return;
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey) return;
      if (event.key === "F3") {
        event.preventDefault();
        openAtlas();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        openPalette();
        return;
      }
      if (event.altKey) {
        // Use the physical key code: on macOS, Option+digit produces a
        // composed character in event.key ("¡", "™", "£"), which never
        // maps back to a workspace index.
        const digitMatch = /^Digit(\d)$/.exec(event.code);
        const digit = digitMatch
          ? Number(digitMatch[1])
          : /^\d$/.test(event.key)
            ? Number(event.key)
            : NaN;
        const workspace = workspaces[digit - 1];
        if (workspace) {
          event.preventDefault();
          switchWorkspace(workspace.id);
        }
        return;
      }
      if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        closePortfolio();
        return;
      }
      const shortcutApp = workbenchApps.find(
        (app) => app.shortcut.toLowerCase() === event.key.toLowerCase(),
      );
      if (shortcutApp) {
        event.preventDefault();
        openWindow(shortcutApp.id, {
          forceNew: event.shiftKey,
          focusConsole: shortcutApp.id === "console",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closePalette,
    closePortfolio,
    contextMenu,
    isAtlasOpen,
    isPaletteOpen,
    openAtlas,
    openPalette,
    openWindow,
    switchWorkspace,
  ]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeContext = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("pointerdown", closeContext);
    window.requestAnimationFrame(() =>
      contextMenuRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
    );
    return () => document.removeEventListener("pointerdown", closeContext);
  }, [contextMenu]);

  const renderApp = (windowState: WorkbenchWindow) => {
    const instanceDomId = safeDomId(windowState.instanceId);

    if (windowState.appId === "now") {
      return (
        <div className="os-now">
          <h2>Building the company and the products inside it.</h2>
          <p>
            I work with businesses on software direction and production while
            operating Solynth Labs and building Trekky.app.
          </p>
          <dl className="os-signal-list">
            <div><dt>Solynth Labs</dt><dd>Operating</dd></div>
            <div><dt>Trekky.app</dt><dd>Current product</dd></div>
            <div><dt>Consulting</dt><dd>Open</dd></div>
          </dl>
          <p className="os-now-foot" aria-hidden="true">
            NZT {time} · Hamilton · 37.79°S 175.46°E
          </p>
        </div>
      );
    }

    if (windowState.appId === "stack") {
      return (
        <div className="os-stack">
          <div className="os-stack-intro">
            <h2>One shipping surface.</h2>
            <p>Web, mobile, data, infrastructure, and product loops.</p>
          </div>
          <dl className="os-stack-list">
            {stackRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="os-stack-foot" aria-hidden="true">
            <span>{stackRows.length} domains</span>
            <span>
              {stackRows
                .map(([, value]) => value.split(" · ").length)
                .reduce((sum, count) => sum + count, 0)}{" "}
              tools in rotation
            </span>
          </div>
        </div>
      );
    }

    if (windowState.appId === "method") {
      const activeStep =
        methodSteps.find((step) => step.id === session.methodStep) ?? methodSteps[0];
      const handleMethodKeyDown = (
        event: ReactKeyboardEvent<HTMLButtonElement>,
        currentIndex: number,
      ) => {
        let nextIndex = currentIndex;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          nextIndex = (currentIndex + 1) % methodSteps.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          nextIndex = (currentIndex - 1 + methodSteps.length) % methodSteps.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = methodSteps.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        const step = methodSteps[nextIndex];
        updateSession((current) => ({ ...current, methodStep: step.id }));
        methodTabRefs.current[windowState.instanceId]?.[nextIndex]?.focus();
      };
      return (
        <div className="os-method">
          <div className="os-method-steps" role="tablist" aria-label="Product method">
            {methodSteps.map((step, index) => {
              const tabId = `${instanceDomId}-method-tab-${step.id}`;
              const panelId = `${instanceDomId}-method-panel-${step.id}`;
              return (
                <button
                  key={step.id}
                  ref={(element) => {
                    const instanceRefs =
                      methodTabRefs.current[windowState.instanceId] ?? [];
                    instanceRefs[index] = element;
                    methodTabRefs.current[windowState.instanceId] = instanceRefs;
                  }}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={session.methodStep === step.id}
                  aria-controls={panelId}
                  tabIndex={session.methodStep === step.id ? 0 : -1}
                  onClick={() =>
                    updateSession((current) => ({
                      ...current,
                      methodStep: step.id,
                    }))
                  }
                  onKeyDown={(event) => handleMethodKeyDown(event, index)}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
          <motion.div
            className="os-method-detail"
            key={activeStep.id}
            id={`${instanceDomId}-method-panel-${activeStep.id}`}
            role="tabpanel"
            aria-labelledby={`${instanceDomId}-method-tab-${activeStep.id}`}
            tabIndex={0}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2>{activeStep.label}</h2>
            <p>{activeStep.text}</p>
          </motion.div>
          <div className="os-method-progress" aria-hidden="true">
            {methodSteps.map((step, index) => (
              <span
                key={step.id}
                data-active={index <= methodSteps.indexOf(activeStep)}
              />
            ))}
            <small>
              {methodSteps.indexOf(activeStep) + 1}/{methodSteps.length}
            </small>
          </div>
        </div>
      );
    }

    if (windowState.appId === "scratch") {
      const scratchId = `${instanceDomId}-scratch`;
      const scratchText = windowState.data.text ?? "";
      const wordCount = scratchText.trim()
        ? scratchText.trim().split(/\s+/).length
        : 0;
      const downloadScratch = () => {
        const blob = new Blob([scratchText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "scratch.txt";
        anchor.click();
        URL.revokeObjectURL(url);
      };
      return (
        <div className="os-scratch">
          <label htmlFor={scratchId}>Scratchpad</label>
          <textarea
            id={scratchId}
            value={scratchText}
            maxLength={100_000}
            onChange={(event) =>
              updateWindowData(windowState.instanceId, "text", event.target.value)
            }
            placeholder="Capture a thought, a question, or the next thing to build."
          />
          <div className="os-scratch-bar">
            <p>Saved only in this browser and included in session exports.</p>
            <span className="os-scratch-count" aria-hidden="true">
              {wordCount}w · {scratchText.length}c
            </span>
            <button
              type="button"
              className="os-scratch-download"
              onClick={downloadScratch}
              disabled={!scratchText.trim()}
            >
              Download .txt
            </button>
          </div>
        </div>
      );
    }

    if (windowState.appId === "lab") {
      return (
        <SubsurfaceLab
          isActive={
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId
          }
          prefersReducedMotion={prefersReducedMotion}
          themeId={session.themeId}
        />
      );
    }

    if (windowState.appId === "railshift") {
      return (
        <RailshiftLab
          isActive={
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId
          }
          prefersReducedMotion={prefersReducedMotion}
          themeId={session.themeId}
        />
      );
    }

    if (windowState.appId === "vector") {
      return (
        <VectorLab
          idPrefix={windowState.instanceId}
          themeId={session.themeId}
        />
      );
    }

    if (windowState.appId === "pulse") {
      return <MarketPulseApp />;
    }

    if (windowState.appId === "book") {
      return <BookConsultApp />;
    }

    if (windowState.appId === "sandbox") {
      return (
        <CaseStudySandboxApp
          isActive={
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId &&
            !windowState.minimized
          }
        />
      );
    }

    if (windowState.appId === "agent") {
      return <AgentWorkflowApp />;
    }

    if (windowState.appId === "search") {
      return (
        <SearchApp
          onSavedToArchive={(note) => {
            const outcome = createNote(files, ROOT_FILE_ID, note.title, {
              content: `${note.body}\n\nSaved from Search · ${workbenchTimestampFormat.format(new Date())} NZT`,
            });
            if (outcome !== files) {
              replaceFiles(outcome);
              setNotice(`Saved "${note.title}" to Archive → Notes.`);
            } else {
              setNotice("Archive is full; could not save that note.");
            }
          }}
        />
      );
    }

    if (windowState.appId === "archive") {
      return (
        <ArchiveApp
          files={files}
          currentFolderId={windowState.data.folderId ?? ROOT_FILE_ID}
          onFolderChange={(folderId) =>
            updateWindowData(windowState.instanceId, "folderId", folderId)
          }
          onFilesChange={replaceFiles}
          onOpenApp={(appId) => {
            if (isWorkbenchAppId(appId)) openWindow(appId);
          }}
          onOpenExternal={openExternal}
          onMutationRejected={setNotice}
        />
      );
    }

    if (windowState.appId === "control") {
      return (
        <ControlCenterApp
          themeId={session.themeId}
          themes={workbenchThemes}
          onThemeChange={setTheme}
          activeWorkspaceId={activeWorkspaceId}
          workspaces={workspaces}
          onWorkspaceChange={(workspaceId) => {
            if (isWorkspaceId(workspaceId)) switchWorkspace(workspaceId);
          }}
          session={{
            lastSaved,
            status: sessionStatus,
            openWindows: session.windows.filter((w) => w.open).length,
            minimizedWindows: session.windows.filter((w) => w.minimized).length,
          }}
          onRestoreDefaultLayout={tidyCurrentWorkspace}
          onExportSession={exportSession}
          onImportSession={chooseImport}
        />
      );
    }

    if (windowState.appId === "console") {
      const consoleId = `${instanceDomId}-console`;
      return (
        <div className="os-console">
          <div className="os-console-log" aria-live="polite">
            {consoleLines.length ? (
              consoleLines.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))
            ) : (
              <p>Console cleared.</p>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              runConsoleCommand(consoleInput);
            }}
          >
            <label htmlFor={consoleId}>Command</label>
            <span aria-hidden="true">&gt;</span>
            <input
              ref={(element) => {
                consoleInputRefs.current[windowState.instanceId] = element;
              }}
              id={consoleId}
              value={consoleInput}
              onChange={(event) => setConsoleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                if (!consoleHistory.length) return;
                event.preventDefault();
                let nextIndex: number;
                if (event.key === "ArrowUp") {
                  const base =
                    consoleHistoryIndex === null
                      ? consoleHistory.length
                      : consoleHistoryIndex;
                  nextIndex = Math.max(0, base - 1);
                } else {
                  if (consoleHistoryIndex === null) return;
                  nextIndex = consoleHistoryIndex + 1;
                  if (nextIndex >= consoleHistory.length) {
                    setConsoleHistoryIndex(null);
                    setConsoleInput("");
                    return;
                  }
                }
                setConsoleHistoryIndex(nextIndex);
                setConsoleInput(consoleHistory[nextIndex] ?? "");
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="help"
            />
            <button type="submit">Run</button>
          </form>
        </div>
      );
    }

    return (
      <nav className="os-links" aria-label="Sam Bai links">
        <a href="https://solynthlabs.com" target="_blank" rel="noreferrer">
          <span>Company</span><strong>Solynth Labs</strong>
          <small aria-hidden="true">↗</small>
        </a>
        <a href="https://trekky.app" target="_blank" rel="noreferrer">
          <span>Product</span><strong>Trekky.app</strong>
          <small aria-hidden="true">↗</small>
        </a>
        <a href="mailto:sambai.codes@gmail.com">
          <span>Direct</span><strong>Email Sam</strong>
          <small aria-hidden="true">→</small>
        </a>
        <a href="https://github.com/sambai-dev/BaiOS" target="_blank" rel="noreferrer">
          <span>Source</span><strong>BaiOS Repository</strong>
          <small aria-hidden="true">↗</small>
        </a>
        <a
          href="https://www.linkedin.com/in/sam-bai-dev/"
          target="_blank"
          rel="noreferrer"
        >
          <span>Network</span><strong>LinkedIn</strong>
          <small aria-hidden="true">↗</small>
        </a>
      </nav>
    );
  };

  const mountedWindows = session.windows
    .filter(
      (windowState) =>
        windowState.open &&
        (windowState.workspaceId === activeWorkspaceId ||
          visitedWorkspaceIds.includes(windowState.workspaceId)),
    )
    .sort((left, right) => left.z - right.z);
  const visibleWindows = mountedWindows.filter(
    (windowState) =>
      windowState.workspaceId === activeWorkspaceId && !windowState.minimized,
  );
  const revealClipOrigin = `${Math.round(revealOrigin.x)}px ${Math.round(
    revealOrigin.y,
  )}px`;

  return (
    <motion.section
      ref={overlayRef}
      tabIndex={-1}
      className="workbench-os"
      data-os-theme={session.themeId}
      role="dialog"
      aria-modal="true"
      aria-label="Sam's Workbench operating system"
      initial={
        prefersReducedMotion
          ? { opacity: 0 }
          : { clipPath: `circle(0vmax at ${revealClipOrigin})` }
      }
      animate={
        prefersReducedMotion
          ? { opacity: 1 }
          : { clipPath: `circle(160vmax at ${revealClipOrigin})` }
      }
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { clipPath: `circle(0vmax at ${revealClipOrigin})` }
      }
      transition={{
        duration: prefersReducedMotion ? 0.15 : 0.72,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <WorkbenchMenuBar
        activeAppLabel={activeWindow?.title ?? "Desktop"}
        time={time}
        workspaceLabel={activeWorkspace.label}
        menus={menus}
        onOpenMissionControl={openAtlas}
        onOpenSearch={openPalette}
        onClosePortfolio={closePortfolio}
        portfolioButtonRef={closeButtonRef}
      />

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />

      <div
        className="os-desktop"
        ref={desktopRef}
        onContextMenu={(event) => {
          const target = event.target as HTMLElement;
          if (
            isCompact ||
            target.closest(
              ".os-window, .os-dock, .os-desktop-icons, .os-system-notice, .os-context-menu",
            )
          ) {
            return;
          }
          event.preventDefault();
          setContextMenu({
            x: clamp(event.clientX, 8, window.innerWidth - 280),
            y: clamp(event.clientY, 8, window.innerHeight - 260),
          });
        }}
      >
        <div className="os-field-copy" aria-hidden="true">
          <span>SAM / PERSONAL WORKBENCH</span>
          <strong>Build.<br />Ship.<br />Learn.</strong>
        </div>
        <span className="os-coordinate os-coordinate-top" aria-hidden="true">
          {activeWorkspace.label} / {visibleWindows.length.toString().padStart(2, "0")} LIVE
        </span>
        <span className="os-coordinate os-coordinate-bottom" aria-hidden="true">
          Hamilton / {time} / LOCAL
        </span>

        <nav className="os-desktop-icons" aria-label="Desktop objects">
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openArchiveAt(ROOT_FILE_ID)}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">AR</span>
            <span>Archive</span>
          </button>
          <button type="button" className="os-desktop-object" onClick={openAtlas}>
            <span className="os-desktop-object-mark" aria-hidden="true">AT</span>
            <span>Atlas</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("lab")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">SS</span>
            <span>Subsurface</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("railshift")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">RS</span>
            <span>Railshift</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("pulse")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">PX</span>
            <span>Pulse</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("book")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">BK</span>
            <span>Book</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("sandbox")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">SB</span>
            <span>Sandbox</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("agent")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">AG</span>
            <span>Agent</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("control")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">CC</span>
            <span>Control</span>
          </button>
        </nav>

        {snapZone && <div className="os-snap-preview" data-zone={snapZone} />}

        {notice && (
          <div className="os-system-notice" role="status" aria-live="polite">
            <span>{notice}</span>
            {hasStorageConflict ? (
              <>
                {storageConflictRef.current ? (
                  <button type="button" onClick={loadOtherTabRevision}>
                    Load other tab
                  </button>
                ) : null}
                <button type="button" onClick={keepThisTabRevision}>
                  Keep this tab
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={storageBlocked ? acceptFreshStorage : () => setNotice(null)}
              >
                {storageBlocked ? "Use fresh" : "Dismiss"}
              </button>
            )}
          </div>
        )}

        {!visibleWindows.length && (
          <div className="os-empty">
            <p>{activeWorkspace.label} is clear.</p>
            <button type="button" onClick={() => openWindow("now")}>Open Now</button>
            <button type="button" onClick={openPalette}>Search Workbench</button>
          </div>
        )}

        <AnimatePresence>
          {mountedWindows.map((windowState) => {
            const isActive = activeInstanceId === windowState.instanceId;
            const isWorkspaceHidden =
              windowState.workspaceId !== activeWorkspaceId;
            const isPresentationHidden =
              isWorkspaceHidden || windowState.minimized || (isCompact && !isActive);
            const style: CSSProperties = {
              left: windowState.x,
              top: windowState.y,
              width: windowState.width,
              height: windowState.height,
              zIndex: windowState.z,
            };
            return (
              <motion.section
                ref={(element) => {
                  windowRefs.current[windowState.instanceId] = element;
                }}
                tabIndex={-1}
                className={`os-window${isActive ? " is-active" : ""}${
                  windowState.maximized ? " is-maximized" : ""
                }${windowState.minimized ? " is-minimized" : ""}${
                  isWorkspaceHidden ? " is-workspace-hidden" : ""
                }`}
                data-snap={windowState.snap ?? undefined}
                key={windowState.instanceId}
                style={style}
                role="region"
                aria-label={`${windowState.title} window`}
                aria-hidden={isPresentationHidden ? true : undefined}
                inert={isPresentationHidden ? true : undefined}
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, scale: 0.96, clipPath: "inset(0 0 100% 0)" }
                }
                animate={{ opacity: 1, scale: 1, clipPath: "inset(0 0 0% 0)" }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.97 }
                }
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                onPointerDown={() => {
                  const current = sessionRef.current;
                  if (
                    current.activeWorkspaceId !== windowState.workspaceId ||
                    current.activeInstances[windowState.workspaceId] !==
                      windowState.instanceId
                  ) {
                    raiseWindowInstance(windowState.instanceId);
                  }
                }}
                onFocusCapture={() => {
                  const current = sessionRef.current;
                  if (
                    current.activeWorkspaceId !== windowState.workspaceId ||
                    current.activeInstances[windowState.workspaceId] !==
                      windowState.instanceId
                  ) {
                    raiseWindowInstance(windowState.instanceId);
                  }
                }}
              >
                <div
                  className="os-window-bar"
                  onPointerDown={(event) => startDrag(event, windowState.instanceId)}
                  onDoubleClick={() => toggleMaximize(windowState.instanceId)}
                >
                  <span>{windowState.title}</span>
                  <span className="os-window-state">
                    {isActive ? "Active" : "Standby"}
                  </span>
                  <div
                    className="os-window-controls"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => minimizeWindow(windowState.instanceId)}
                    >
                      Minimize
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMaximize(windowState.instanceId)}
                    >
                      {windowState.maximized ? "Restore" : "Maximize"}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeWindow(windowState.instanceId)}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className={`os-window-content os-app-${windowState.appId}`}>
                  <WorkbenchAppBoundary resetKey={windowState.instanceId}>
                    {renderApp(windowState)}
                  </WorkbenchAppBoundary>
                </div>
                {!windowState.maximized && (
                  <button
                    type="button"
                    className="os-window-resize"
                    aria-label={`Resize ${windowState.title} window`}
                    onPointerDown={(event) =>
                      startResize(event, windowState.instanceId)
                    }
                    onKeyDown={(event) => {
                      const step = event.shiftKey ? 32 : 12;
                      if (event.key === "ArrowRight") {
                        resizeWindowBy(windowState.instanceId, step, 0);
                      } else if (event.key === "ArrowLeft") {
                        resizeWindowBy(windowState.instanceId, -step, 0);
                      } else if (event.key === "ArrowDown") {
                        resizeWindowBy(windowState.instanceId, 0, step);
                      } else if (event.key === "ArrowUp") {
                        resizeWindowBy(windowState.instanceId, 0, -step);
                      } else {
                        return;
                      }
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  />
                )}
              </motion.section>
            );
          })}
        </AnimatePresence>

        <nav className="os-dock" aria-label="Workbench applications">
          <div className="os-dock-label">
            <span>{activeWorkspace.label}</span>
            <span>Keys 1–0 · P · B · S · A · R</span>
          </div>
          {workbenchApps.map((app) => {
            const instances = session.windows.filter(
              (windowState) =>
                windowState.appId === app.id &&
                windowState.workspaceId === activeWorkspaceId,
            );
            const openInstances = instances.filter((windowState) => windowState.open);
            const isAppActive = activeWindow?.appId === app.id;
            const status = !openInstances.length
              ? "Closed"
              : openInstances.every((windowState) => windowState.minimized)
                ? "Suspended"
                : isAppActive
                  ? "Active"
                  : "Running";
            return (
              <button
                key={app.id}
                ref={(element) => {
                  dockButtonRefs.current[app.id] = element;
                }}
                type="button"
                className={isAppActive ? "is-active" : undefined}
                data-instance-count={
                  openInstances.length > 1 ? openInstances.length : undefined
                }
                aria-pressed={isAppActive}
                title={
                  app.supportsMultiple
                    ? `${app.summary} Shift-click for another window.`
                    : app.summary
                }
                onClick={(event) =>
                  openWindow(app.id, {
                    forceNew: event.shiftKey,
                    focusConsole: app.id === "console",
                  })
                }
              >
                <span>{app.label}</span>
                <span>[{app.shortcut}]</span>
                <small>{status}</small>
              </button>
            );
          })}
        </nav>

        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="os-context-menu"
            role="menu"
            aria-label={`${activeWorkspace.label} desktop actions`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onKeyDown={(event) => {
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
              );
              const currentIndex = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const lastIndex = items.length - 1;
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? lastIndex
                    : event.key === "ArrowDown"
                      ? (currentIndex + 1) % items.length
                      : event.key === "ArrowUp"
                        ? (currentIndex - 1 + items.length) % items.length
                        : -1;
              if (nextIndex >= 0) {
                event.preventDefault();
                items[nextIndex]?.focus();
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setContextMenu(null);
                overlayRef.current?.focus();
              }
            }}
          >
            <span>{activeWorkspace.label} / Desktop</span>
            <button type="button" role="menuitem" onClick={openPalette}>
              Search Workbench <kbd>/</kbd>
            </button>
            <button type="button" role="menuitem" onClick={openAtlas}>
              Open Atlas <kbd>F3</kbd>
            </button>
            <button type="button" role="menuitem" onClick={tidyCurrentWorkspace}>
              Tidy workspace
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openWindow("archive", { forceNew: true })}
            >
              New Archive window
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openWindow("control")}
            >
              Open Control <kbd>0</kbd>
            </button>
          </div>
        )}

        <AnimatePresence>
          {isPaletteOpen && (
            <motion.div
              className="os-palette-backdrop"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={(event) => {
                if (event.currentTarget === event.target) closePalette();
              }}
            >
              <motion.section
                className="os-palette"
                role="dialog"
                aria-modal="true"
                aria-label="Search the Workbench"
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, y: -14, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -8 }
                }
              >
                <div className="os-palette-search">
                  <label htmlFor="workbench-system-search">Search everything</label>
                  <button
                    type="button"
                    className="os-palette-close"
                    onClick={closePalette}
                    aria-label="Close Workbench search"
                  >
                    Close <kbd aria-hidden="true">Esc</kbd>
                  </button>
                  <input
                    ref={paletteInputRef}
                    id="workbench-system-search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-controls="workbench-system-search-results"
                    aria-activedescendant={
                      filteredPaletteActions[paletteActiveIndex]
                        ? `palette-option-${safeDomId(
                            filteredPaletteActions[paletteActiveIndex].id,
                          )}`
                        : undefined
                    }
                    value={paletteQuery}
                    onChange={(event) => {
                      setPaletteQuery(event.target.value);
                      setPaletteActiveIndex(0);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closePalette();
                        return;
                      }
                      if (!filteredPaletteActions.length) return;
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setPaletteActiveIndex(
                          (current) =>
                            (current + 1) % filteredPaletteActions.length,
                        );
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setPaletteActiveIndex(
                          (current) =>
                            (current - 1 + filteredPaletteActions.length) %
                            filteredPaletteActions.length,
                        );
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        setPaletteActiveIndex(0);
                      } else if (event.key === "End") {
                        event.preventDefault();
                        setPaletteActiveIndex(filteredPaletteActions.length - 1);
                      } else if (event.key === "Enter") {
                        event.preventDefault();
                        const action = filteredPaletteActions[paletteActiveIndex];
                        if (action) runPaletteAction(action);
                      }
                    }}
                    placeholder="Apps, windows, workspaces, files, commands"
                    autoComplete="off"
                  />
                </div>
                <div
                  className="os-palette-results"
                  id="workbench-system-search-results"
                  role="listbox"
                  aria-label="Search results"
                >
                  {filteredPaletteActions.length ? (
                    filteredPaletteActions.map((action, index) => (
                      <button
                        key={action.id}
                        ref={(element) => {
                          paletteOptionRefs.current[index] = element;
                        }}
                        id={`palette-option-${safeDomId(action.id)}`}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-selected={paletteActiveIndex === index}
                        className={paletteActiveIndex === index ? "is-selected" : ""}
                        onPointerMove={() => setPaletteActiveIndex(index)}
                        onFocus={() => setPaletteActiveIndex(index)}
                        onClick={() => runPaletteAction(action)}
                      >
                        <span>{action.label}</span>
                        <span>{action.meta}</span>
                      </button>
                    ))
                  ) : (
                    <p>No local result matches “{paletteQuery}”.</p>
                  )}
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <WorkbenchMissionControl
        open={isAtlasOpen}
        currentWorkspaceId={activeWorkspaceId}
        workspaces={workspaces}
        windows={session.windows.filter((windowState) => windowState.open)}
        onSelect={selectAtlasWindow}
        onSwitchWorkspace={(workspaceId) => {
          if (isWorkspaceId(workspaceId)) switchWorkspace(workspaceId, false);
        }}
        onClose={() => setIsAtlasOpen(false)}
      />
    </motion.section>
  );
}
