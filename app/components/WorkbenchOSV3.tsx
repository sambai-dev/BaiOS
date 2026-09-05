// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useIsPresent } from "framer-motion";
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
import WorkbenchAppBoundary from "./WorkbenchAppBoundary";
import WorkbenchMenuBar, {
  type WorkbenchMenu,
} from "./WorkbenchMenuBar";
import WorkbenchMissionControl from "./WorkbenchMissionControl";
import {
  MAX_WORKBENCH_BACKUP_BYTES,
  WORKBENCH_COMMITTED_STATE_STORAGE_KEY,
  deriveWorkbenchContentRevision,
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
  getWorkbenchSessionUrl,
  openWorkbenchApplication,
  organizeWorkbenchSession,
} from "../lib/workbench-app-routing";
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
  focusWindowOnly as focusManagedWindowOnly,
  minimizeWindow as minimizeManagedWindow,
  restoreWorkspaceWindows,
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
  loading: () => <div className="os-app-loading">Loading Market monitor…</div>,
});

const BookConsultApp = dynamic(() => import("./BookConsultApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Project brief…</div>,
});

const CaseStudySandboxApp = dynamic(() => import("./CaseStudySandboxApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Projects…</div>,
});

const AgentWorkflowApp = dynamic(() => import("./AgentWorkflowApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading AI assistant…</div>,
});

const SearchApp = dynamic(() => import("./SearchApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Web search…</div>,
});

const ArchiveApp = dynamic(() => import("./ArchiveApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Files…</div>,
});

const ControlCenterApp = dynamic(() => import("./ControlCenterApp"), {
  ssr: false,
  loading: () => <div className="os-app-loading">Loading Settings…</div>,
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
  appId?: WorkbenchAppId;
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
const WINDOW_Z_BASE = 10;
const WINDOW_Z_CEILING = 80;
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

/** Recovery/probe snapshots younger than this are left untouched. */
const RECOVERY_SWEEP_MIN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Prefixes of safety-net keys written by acceptFreshStorage (and its write
 * probe). Failed attempts used to strand multi-megabyte copies forever.
 */
const RECOVERY_KEY_PREFIXES = [
  `${WORKBENCH_COMMITTED_STATE_STORAGE_KEY}-probe-`,
  `${WORKBENCH_COMMITTED_STATE_STORAGE_KEY}-recovery-`,
  `${workbenchStorageKeys.session}-recovery-`,
  `${WORKBENCH_FILES_STORAGE_KEY}-recovery-`,
];

/**
 * True when a recovery/probe key carries an embeddable timestamp older than
 * the retention window. Keys without a parseable timestamp are preserved.
 */
function isStaleRecoveryKey(key: string): boolean {
  const match = /-(?:recovery|probe)-(\d+)$/.exec(key);
  const timestamp = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp >= RECOVERY_SWEEP_MIN_AGE_MS;
}

const stackRows = [
  ["Applications", "React · Next.js · TypeScript"],
  ["Systems", "Node.js · PostgreSQL · Drizzle ORM"],
  ["Data + edge", "Supabase · Neon · Cloudflare"],
  ["Mobile", "React Native · iOS · Android"],
  ["Product mode", "SaaS · Automation · AI-assisted workflows"],
] as const;

const legacyAppLabels: Record<WorkbenchAppId, string> = {
  now: "Now", stack: "Stack", method: "Method", scratch: "Scratch",
  console: "Console", links: "Links", pulse: "Pulse", book: "Brief",
  sandbox: "Systems", agent: "Agent", lab: "Subsurface", railshift: "Railshift",
  vector: "Vector", archive: "Archive", search: "Search", control: "Control",
};

function getWindowDisplayTitle(windowState: WorkbenchWindow) {
  const legacyLabel = legacyAppLabels[windowState.appId];
  if (windowState.title === legacyLabel) return getWorkbenchApp(windowState.appId).label;
  const suffix = windowState.title.slice(legacyLabel.length);
  if (windowState.title.startsWith(legacyLabel) && /^ \d+$/.test(suffix)) {
    return `${getWorkbenchApp(windowState.appId).label}${suffix}`;
  }
  return windowState.title;
}

const methodSteps = [
  {
    id: "clarify",
    label: "Clarify",
    text: "Find the actual decision hiding underneath the requested feature.",
  },
  {
    id: "shape",
    label: "Shape",
    text: "Turn the idea into a clear design and a practical technical plan.",
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
    timeZone: WORKBENCH_TIME_ZONE,
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
  const [isAppLauncher, setIsAppLauncher] = useState(false);
  const [launcherGroup, setLauncherGroup] = useState<"all" | WorkspaceId>("all");
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(0);
  const [isAtlasOpen, setIsAtlasOpen] = useState(false);
  const [isCloseGuardOpen, setIsCloseGuardOpen] = useState(false);
  const [closeGuardExportStatus, setCloseGuardExportStatus] = useState<
    string | null
  >(null);
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
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () =>
      typeof document === "undefined" ||
      document.visibilityState === "visible",
  );
  const [visitedWorkspaceIds, setVisitedWorkspaceIds] = useState<WorkspaceId[]>([
    "build",
  ]);

  const desktopRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const paletteOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const paletteInvokerRef = useRef<HTMLElement | null>(null);
  const atlasInvokerRef = useRef<HTMLElement | null>(null);
  const closeGuardInvokerRef = useRef<HTMLElement | null>(null);
  const closeGuardExportRef = useRef<HTMLButtonElement>(null);
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
  // AnimatePresence keeps this component mounted during its exit animation.
  // Stop late events before they can restore URLs cleared by PortfolioShell.
  const closingRef = useRef(false);
  const snapZoneRef = useRef<WorkbenchSnapTarget | null>(null);
  const sessionRef = useRef(session);
  const filesRef = useRef(files);
  const committedRevisionRef = useRef<string | null>(null);
  // Render must read state, not a ref: button visibility inside the notice has
  // no other re-render trigger if a future refactor mutates a ref alone.
  const [storageConflictEnvelope, setStorageConflictEnvelope] =
    useState<WorkbenchCommittedStateEnvelope | null>(null);
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
    if (closingRef.current) return;
    const cloned = cloneSession(organizeWorkbenchSession(nextSession));
    sessionRef.current = cloned;
    setSession(cloned);
    zCounter.current = Math.max(
      10,
      ...cloned.windows.map((windowState) => windowState.z + 1),
    );
    const href = getWorkbenchSessionUrl(window.location.href, cloned);
    if (href !== window.location.href) {
      window.history.replaceState(window.history.state, "", href);
    }
  }, []);

  const updateSession = useCallback(
    (updater: (current: WorkbenchSession) => WorkbenchSession) => {
      if (closingRef.current) return;
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
    const incoming = parseWorkbenchCommittedState(serialized);
    setStorageConflictEnvelope(incoming);
    storageConflictPendingRef.current = true;
    setHasStorageConflict(true);
    setNotice(
      incoming
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
        // The revision derives from committed content (updatedAt excluded):
        // an unchanged session/files pair always re-derives the same one.
        const revision = deriveWorkbenchContentRevision(nextSession, nextFiles);
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
          // The revision derives from committed content, so an unchanged
          // session/files pair re-derives the live revision. Skipping the
          // write keeps redundant saves (boot refits, visibility flushes)
          // from firing storage events or churning quota in other tabs.
          if (existing && existing.revision === revision) {
            return true;
          }
        }

        // A real edit yields a fresh content-derived revision, which other
        // tabs legitimately treat as divergence.
        const serialized = serializeWorkbenchCommittedState(nextSession, nextFiles, {
          revision,
        });
        storage.setItem(WORKBENCH_COMMITTED_STATE_STORAGE_KEY, serialized);
        if (storage.getItem(WORKBENCH_COMMITTED_STATE_STORAGE_KEY) !== serialized) {
          return false;
        }
        committedRevisionRef.current = revision;
        setStorageConflictEnvelope(null);
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
    const frame = window.requestAnimationFrame(() => overlayRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const compactQuery = window.matchMedia("(max-width: 980px)");
    const syncCompactMode = () => setIsCompact(compactQuery.matches);
    syncCompactMode();
    compactQuery.addEventListener("change", syncCompactMode);
    return () => compactQuery.removeEventListener("change", syncCompactMode);
  }, []);

  useEffect(() => {
    const syncDocumentVisibility = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };
    syncDocumentVisibility();
    document.addEventListener("visibilitychange", syncDocumentVisibility);
    return () =>
      document.removeEventListener("visibilitychange", syncDocumentVisibility);
  }, []);

  const hydrationDoneRef = useRef(false);
  useEffect(() => {
    // Hydrate exactly once per mount. The shell clears `deepLink` to null the
    // moment closing starts, and re-reading storage mid-exit would swap state
    // identities and needlessly re-arm persistence while fading out.
    if (hydrationDoneRef.current) return;
    hydrationDoneRef.current = true;
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

    loadedSession = organizeWorkbenchSession(loadedSession);
    if (deepLink?.workspaceId || deepLink?.appId) {
      const targetWorkspaceId =
        deepLink.appId
          ? getWorkbenchApp(deepLink.appId).defaultWorkspaceId
          : deepLink.workspaceId ?? loadedSession.activeWorkspaceId;
      loadedSession = { ...loadedSession, activeWorkspaceId: targetWorkspaceId };
      if (deepLink.appId) {
        try {
          loadedSession = openWorkbenchApplication(
            loadedSession,
            deepLink.appId,
          ).session;
        } catch {
          // Window capacity reached, so fall back to the workspace switch alone.
        }
      }
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

  // One-shot quota reclaim: once boot resolves healthy, drop recovery/probe
  // snapshots stranded by failed fresh-start attempts in earlier sessions.
  // Recent snapshots (and anything written later by an active recovery flow)
  // are always preserved.
  const recoverySweepDoneRef = useRef(false);
  useEffect(() => {
    if (!hasHydrated || recoverySweepDoneRef.current) return;
    recoverySweepDoneRef.current = true;
    const blocked = corruptStorageRef.current;
    if (
      storageBlocked ||
      hasStorageConflict ||
      blocked.committed ||
      blocked.session ||
      blocked.files
    ) {
      return;
    }
    try {
      const storage = window.localStorage;
      const doomed: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        const matchesRecovery = RECOVERY_KEY_PREFIXES.some((prefix) =>
          key.startsWith(prefix),
        );
        if (matchesRecovery && isStaleRecoveryKey(key)) doomed.push(key);
      }
      for (const key of doomed) {
        try {
          storage.removeItem(key);
        } catch {
          // Individual removals are best effort.
        }
      }
    } catch {
      // Storage unavailable; sweeping is optional.
    }
  }, [hasHydrated, storageBlocked, hasStorageConflict]);

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
    if (!isCloseGuardOpen) return;
    window.requestAnimationFrame(() => {
      closeGuardExportRef.current?.focus({ preventScroll: true });
    });
  }, [isCloseGuardOpen]);

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
  const fallbackWorkspace = workspaces[0];
  if (!fallbackWorkspace) throw new Error("workspaces registry must not be empty");
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? fallbackWorkspace;

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

  const clearAppDeepLink = useCallback((expectedAppId?: WorkbenchAppId) => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    const linkedAppId = url.searchParams.get("app");
    if (!linkedAppId || (expectedAppId && linkedAppId !== expectedAppId)) {
      return false;
    }
    url.searchParams.delete("app");
    window.history.replaceState(window.history.state, "", url.toString());
    return true;
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
      if (closingRef.current) return null;
      const current = sessionRef.current;
      let result: ReturnType<typeof openWorkbenchApplication>;
      try {
        result = openWorkbenchApplication(
          current,
          appId,
          {
            forceNew: options.forceNew,
            z: zCounter.current,
          },
        );
      } catch {
        setNotice("Workbench has reached its 60-window local session limit.");
        return null;
      }
      zCounter.current = result.nextZ;
      updateSession(() => result.session);
      const instanceId = result.activeInstanceId;
      playSound("focus");
      if (instanceId) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            windowRefs.current[instanceId]?.focus();
            if (options.focusConsole) {
              consoleInputRefs.current[instanceId]?.focus();
            }
          });
        });
      }
      setContextMenu(null);
      return instanceId;
    },
    [updateSession],
  );

  const openArchiveAt = useCallback(
    (folderId: string, forceNew = false) => {
      const instanceId = openWindow("archive", { forceNew });
      if (!instanceId) return;
      updateSession((current) => ({
        ...current,
        windows: current.windows.map((windowState) =>
          windowState.instanceId === instanceId
            ? { ...windowState, data: { ...windowState.data, folderId } }
            : windowState,
        ),
      }));
    },
    [openWindow, updateSession],
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
      // Retire the ?app= deep link once its last instance is gone; otherwise
      // a plain reload force-reopens an app the user explicitly closed.
      if (typeof window !== "undefined") {
        const appStillOpen = result.windows.some(
          (windowState) => windowState.appId === target.appId && windowState.open,
        );
        if (!appStillOpen) {
          clearAppDeepLink(target.appId);
        }
      }
    },
    [clearAppDeepLink, commitWindowResult, focusManagedSurface],
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
    const linkedAppId =
      typeof window === "undefined"
        ? null
        : new URL(window.location.href).searchParams.get("app");
    const closesLinkedApp =
      linkedAppId !== null &&
      current.windows.some(
        (windowState) =>
          windowState.workspaceId === current.activeWorkspaceId &&
          windowState.open &&
          windowState.appId === linkedAppId,
      );
    const result = closeWorkspaceWindows(
      current.windows,
      current.activeWorkspaceId,
    );
    commitWindowResult(result, current.activeWorkspaceId);
    setContextMenu(null);
    focusManagedSurface(result.activeInstanceId);
    if (closesLinkedApp && isWorkbenchAppId(linkedAppId)) {
      clearAppDeepLink(linkedAppId);
    }
  }, [clearAppDeepLink, commitWindowResult, focusManagedSurface]);

  const switchWorkspace = useCallback(
    (workspaceId: WorkspaceId, focusSurface = true) => {
      if (closingRef.current) return;
      const current = sessionRef.current;
      playSound("snap");
      const active = switchWorkspaceActiveInstance(
        current.windows,
        workspaceId,
        current.activeInstances[workspaceId],
      );
      if (typeof window !== "undefined") {
        const activeWindow = current.windows.find(
          (windowState) => windowState.instanceId === active && windowState.open,
        );
        const url = new URL(window.location.href);
        url.searchParams.set("workspace", workspaceId);
        if (activeWindow) url.searchParams.set("app", activeWindow.appId);
        else url.searchParams.delete("app");
        window.history.replaceState(window.history.state, "", url.toString());
      }
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
    },
    [updateSession],
  );

  const selectAtlasWindow = useCallback(
    (instanceId: string, mode: "focus" | "raise" = "raise") => {
      if (closingRef.current) return;
      const current = sessionRef.current;
      const target = current.windows.find(
        (windowState) => windowState.instanceId === instanceId,
      );
      if (!target) return;
      const result =
        mode === "focus"
          ? focusManagedWindowOnly(
              current.windows,
              instanceId,
              zCounter.current,
            )
          : focusManagedWindow(current.windows, instanceId, zCounter.current);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("workspace", target.workspaceId);
        url.searchParams.set("app", target.appId);
        window.history.replaceState(window.history.state, "", url.toString());
      }
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
      atlasInvokerRef.current = null;
      setIsAtlasOpen(false);
      window.requestAnimationFrame(() => windowRefs.current[instanceId]?.focus());
    },
    [updateSession],
  );

  const restoreAtlasWorkspace = useCallback(() => {
    const current = sessionRef.current;
    const result = restoreWorkspaceWindows(
      current.windows,
      current.activeWorkspaceId,
    );
    commitWindowResult(result, current.activeWorkspaceId);
    setNotice("All open windows in this workspace are visible again.");
  }, [commitWindowResult]);

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
    // Move focus out of the background before it becomes inert/aria-hidden;
    // the palette input takes over on the next animation frame.
    overlayRef.current?.focus({ preventScroll: true });
    setContextMenu(null);
    setIsAtlasOpen(false);
    setPaletteQuery("");
    setPaletteActiveIndex(0);
    setIsAppLauncher(false);
    setIsPaletteOpen(true);
  }, []);

  const openApplications = useCallback(() => {
    openPalette();
    setIsAppLauncher(true);
    setLauncherGroup(sessionRef.current.activeWorkspaceId);
  }, [openPalette]);

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
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // Atlas can be launched from a Palette result. The result button unmounts
    // with Palette, so transfer Palette's original invoker instead of keeping
    // a reference to that temporary button.
    atlasInvokerRef.current = activeElement?.closest(".os-palette")
      ? paletteInvokerRef.current
      : activeElement;
    // Capture the real invoker first, then move focus out of content that is
    // about to become inert. Mission Control can safely take focus next frame.
    overlayRef.current?.focus({ preventScroll: true });
    paletteInvokerRef.current = null;
    setContextMenu(null);
    setIsPaletteOpen(false);
    setPaletteQuery("");
    setIsAtlasOpen(true);
  }, []);

  const closeAtlas = useCallback(() => {
    const invoker = atlasInvokerRef.current;
    atlasInvokerRef.current = null;
    setIsAtlasOpen(false);
    window.requestAnimationFrame(() => {
      if (invoker?.isConnected && invoker.offsetParent !== null) {
        invoker.focus({ preventScroll: true });
        return;
      }
      const current = sessionRef.current;
      const activeInstanceId =
        current.activeInstances[current.activeWorkspaceId];
      const activeWindow = activeInstanceId
        ? windowRefs.current[activeInstanceId]
        : null;
      if (activeWindow && activeWindow.offsetParent !== null) {
        activeWindow.focus({ preventScroll: true });
      } else {
        overlayRef.current?.focus({ preventScroll: true });
      }
    });
  }, []);

  const openCloseGuard = useCallback(() => {
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeGuardInvokerRef.current = activeElement?.closest(".os-palette")
      ? paletteInvokerRef.current
      : activeElement;
    setCloseGuardExportStatus(null);
    setContextMenu(null);
    // Leave focus on a stable node until the dialog's first action mounts.
    overlayRef.current?.focus({ preventScroll: true });
    setIsCloseGuardOpen(true);
  }, []);

  const stayInWorkbench = useCallback(() => {
    const invoker = closeGuardInvokerRef.current;
    closeGuardInvokerRef.current = null;
    setIsCloseGuardOpen(false);
    setCloseGuardExportStatus(null);
    window.requestAnimationFrame(() => {
      if (invoker?.isConnected) invoker.focus({ preventScroll: true });
      else if (closeButtonRef.current?.isConnected) {
        closeButtonRef.current.focus({ preventScroll: true });
      } else {
        overlayRef.current?.focus({ preventScroll: true });
      }
    });
  }, [closeButtonRef]);

  const leaveWithoutSaving = useCallback(() => {
    // This is the only path that abandons the in-memory session. It is reached
    // through the explicit destructive action in the guard and never writes to
    // storage, so an invalid stored payload remains available for recovery.
    if (closingRef.current) return;
    closingRef.current = true;
    closeGuardInvokerRef.current = null;
    setIsCloseGuardOpen(false);
    clearAppDeepLink();
    onClose();
  }, [clearAppDeepLink, onClose]);

  const closePortfolio = useCallback(() => {
    if (closingRef.current) return;
    if (storageBlocked) {
      openCloseGuard();
      return;
    }
    if (hasStorageConflict) {
      setNotice("Choose which tab revision to keep before closing Workbench.");
      return;
    }
    const snapshot = {
      ...sessionRef.current,
      updatedAt: Date.now(),
    } satisfies WorkbenchSession;
    if (!persistPair(snapshot, filesRef.current)) {
      if (!storageConflictPendingRef.current) {
        setNotice("Workbench could not save this session.");
        openCloseGuard();
      }
      return;
    }
    closingRef.current = true;
    clearAppDeepLink();
    onClose();
  }, [
    clearAppDeepLink,
    hasStorageConflict,
    onClose,
    openCloseGuard,
    persistPair,
    storageBlocked,
  ]);

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
      // Firefox blocks downloads from detached anchors. Mount briefly.
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setNotice("Backup downloaded with your workspace and local files.");
      return true;
    } catch {
      setNotice("The current Workbench state could not be packaged for export.");
      return false;
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
        const importedSession = organizeWorkbenchSession(parsed.session);
        if (!persistPair(importedSession, parsed.files, { force: true })) {
          setNotice("The backup was valid, but this browser could not store it.");
          return;
        }
        replaceSession(importedSession);
        replaceFiles(parsed.files);
        corruptStorageRef.current = { committed: null, session: null, files: null };
        setStorageBlocked(false);
        setSessionStatus("restored");
        setLastSaved(formatSavedTime(parsed.session.updatedAt));
        setNotice("Your workspace and files were restored from the backup.");
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
    const incoming = storageConflictEnvelope;
    if (!incoming) {
      setNotice("The other tab removed its committed state. Keep this tab to save a new revision.");
      return;
    }
    replaceSession(incoming.session);
    replaceFiles(incoming.files);
    committedRevisionRef.current = incoming.revision;
    setStorageConflictEnvelope(null);
    storageConflictPendingRef.current = false;
    setHasStorageConflict(false);
    setSessionStatus("restored");
    setLastSaved(formatSavedTime(incoming.session.updatedAt));
    setNotice("Loaded the Workbench revision saved by the other tab.");
  }, [replaceFiles, replaceSession, storageConflictEnvelope]);

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
      // Single-gesture occupancy: a second concurrent pointer must not
      // clobber the live drag session (its teardown would freeze geometry).
      if (dragSession.current || resizeSession.current) return;
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
      if (dragSession.current || resizeSession.current) return;
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
      if (closingRef.current) return;
      const resizing = resizeSession.current;
      const dragging = dragSession.current;
      if (
        (!resizing || resizing.pointerId !== event.pointerId) &&
        (!dragging || dragging.pointerId !== event.pointerId)
      ) {
        return;
      }

      const desktop = desktopRef.current;
      if (!desktop) return;
      const bounds = getDesktopBounds();
      if (!bounds) return;

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

      if (!dragging || dragging.pointerId !== event.pointerId) return;
      const desktopRect = desktop.getBoundingClientRect();
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

      // Only the owning pointer tears its gesture down; a foreign pointer
      // ending must not kill a surviving concurrent gesture.
      if (!dragSession.current || dragSession.current.pointerId === event.pointerId) {
        dragSession.current = null;
      }
      if (
        !resizeSession.current ||
        resizeSession.current.pointerId === event.pointerId
      ) {
        resizeSession.current = null;
      }
      if (!dragSession.current) {
        snapZoneRef.current = null;
        setSnapZone(null);
      }
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
    let frame = 0;
    const fitDesktopWindows = () => {
      if (closingRef.current) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (closingRef.current) return;
        if (window.matchMedia("(max-width: 980px)").matches) return;
        const bounds = getDesktopBounds();
        if (!bounds) return;
        updateSession((current) => ({
          ...current,
          windows: fitWindowsToBounds(current.windows, bounds),
        }));
      });
    };
    window.addEventListener("resize", fitDesktopWindows);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", fitDesktopWindows);
    };
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
        response = "Window overview opened.";
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
      appId: app.id,
      label: `Open ${app.label}`,
      meta: `${workspaces.find((workspace) => workspace.id === app.defaultWorkspaceId)?.label} · ${app.summary}`,
      terms: `${app.id} ${app.summary} ${app.keywords.join(" ")}`,
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
        label: `${action} ${getWindowDisplayTitle(windowState)}`,
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
        meta: `Files · ${getNodePath(files, node.id)
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
        label: "Window overview",
        meta: "System · F3",
        terms: "overview windows workspaces surfaces",
        run: openAtlas,
      },
      {
        id: "system-tidy",
        label: "Arrange windows",
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
        .filter((action) => !isAppLauncher || (
          action.appId && (launcherGroup === "all" || getWorkbenchApp(action.appId).defaultWorkspaceId === launcherGroup)
        ))
        .map((action, index) => ({
          action,
          index,
          score: scorePaletteAction(action, paletteQuery),
        }))
        .filter((result) => result.score >= 0)
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .slice(0, 18)
        .map((result) => result.action),
    [isAppLauncher, launcherGroup, paletteActions, paletteQuery],
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
      setIsPaletteOpen(false);
      setPaletteQuery("");
      action.run();
      paletteInvokerRef.current = null;
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
            label: "About Sam",
            onSelect: () => openWindow("now"),
          },
          {
            id: "control",
            label: "Settings",
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
            label: "Open Files",
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
            label: "Window overview",
            shortcut: "F3",
            onSelect: openAtlas,
          },
          {
            id: "search",
            label: "Search everything",
            shortcut: "Ctrl+K",
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
            label: "Open Files",
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
      if (closingRef.current) return;
      if (event.defaultPrevented) return;
      // Ignore OS key autorepeat: held keys must not re-toggle the OS,
      // re-run persistence, or spam shortcuts.
      if (event.repeat) return;

      if (event.key === "Escape") {
        if (isCloseGuardOpen) {
          event.preventDefault();
          stayInWorkbench();
        } else if (isPaletteOpen) {
          event.preventDefault();
          closePalette();
        } else if (isAtlasOpen) {
          event.preventDefault();
          closeAtlas();
        } else if (contextMenu) {
          event.preventDefault();
          setContextMenu(null);
        } else if (!isTypingTarget(event.target)) {
          // Esc inside a typing surface (scratchpad, console, inputs) belongs
          // to that surface; it must not dismiss the whole Workbench.
          event.preventDefault();
          closePortfolio();
        }
        return;
      }

      if (event.key === "Tab") {
        const scope = isCloseGuardOpen
          ? overlayRef.current?.querySelector<HTMLElement>(".os-close-guard")
          : isAtlasOpen
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
        if (!first || !last) return;
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

      if (isCloseGuardOpen || isAtlasOpen || isPaletteOpen) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
        return;
      }
      if (event.key === "F3") {
        event.preventDefault();
        openAtlas();
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey) return;
      if (event.altKey) {
        // Use the physical key code: on macOS, Option+digit produces a
        // composed character in event.key ("¡", "™", "£"), which never
        // maps back to a workspace index.
        const digitMatch = /^(?:Digit|Numpad)(\d)$/.exec(event.code);
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closePalette,
    closeAtlas,
    closePortfolio,
    contextMenu,
    isAtlasOpen,
    isCloseGuardOpen,
    isPaletteOpen,
    openAtlas,
    openPalette,
    stayInWorkbench,
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

  const isModalSurfaceOpen = isAtlasOpen || isPaletteOpen || isCloseGuardOpen;
  const isWorkbenchPresented = isDocumentVisible && !isModalSurfaceOpen;

  const renderApp = (windowState: WorkbenchWindow) => {
    const instanceDomId = safeDomId(windowState.instanceId);

    if (windowState.appId === "now") {
      return (
        <div className="os-now">
          <div className="os-now-kicker">
            <span>Sam Bai / Current focus</span>
            <span>Hamilton, NZ</span>
          </div>
          <h2>Products, tools, and room to experiment.</h2>
          <p>
            I work with businesses on software direction and production while
            operating Solynth Labs and building Trekky.app.
          </p>
          <nav className="os-now-actions" aria-label="Workbench starting points">
            <button type="button" onClick={() => openWindow("sandbox")}>
              <strong>See current work</strong>
              <span>Products and developer tools</span>
              <span className="os-now-action-arrow" aria-hidden="true">↗</span>
            </button>
            <button type="button" onClick={() => openWindow("method")}>
              <strong>Explore how I work</strong>
              <span>From product question to shipped software</span>
              <span className="os-now-action-arrow" aria-hidden="true">↗</span>
            </button>
            <button type="button" onClick={() => openWindow("book")}>
              <strong>Start a project</strong>
              <span>Prepare a concise project brief</span>
              <span className="os-now-action-arrow" aria-hidden="true">↗</span>
            </button>
          </nav>
          <dl className="os-signal-list">
            <div><dt>Solynth Labs</dt><dd>Operating</dd></div>
            <div><dt>Trekky.app</dt><dd>Current product</dd></div>
            <div><dt>Consulting</dt><dd>Open</dd></div>
          </dl>
          <p className="os-now-foot">Find tools and experiments in the Applications menu.</p>
        </div>
      );
    }

    if (windowState.appId === "stack") {
      return (
        <div className="os-stack">
          <div className="os-stack-intro">
            <h2>Software from interface to infrastructure.</h2>
            <p>Web, mobile, data, and deployment tools used in production.</p>
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
            <span>{stackRows.length} areas of work</span>
            <span>
              {stackRows
                .map(([, value]) => value.split(" · ").length)
                .reduce((sum, count) => sum + count, 0)}{" "}
              technologies
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
        if (!step) return;
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
                  aria-controls={
                    session.methodStep === step.id ? panelId : undefined
                  }
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
          <m.div
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
          </m.div>
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
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      };
      return (
        <div className="os-scratch">
          <label htmlFor={scratchId}>Your note</label>
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
            isWorkbenchPresented &&
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId &&
            !windowState.minimized
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
            isWorkbenchPresented &&
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId &&
            !windowState.minimized
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
          isActive={isWorkbenchPresented && activeWorkspaceId === windowState.workspaceId && activeInstanceId === windowState.instanceId && !windowState.minimized}
        />
      );
    }

    if (windowState.appId === "pulse") {
      return (
        <MarketPulseApp
          isPresented={
            isWorkbenchPresented &&
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId &&
            !windowState.minimized
          }
        />
      );
    }

    if (windowState.appId === "book") {
      return <BookConsultApp />;
    }

    if (windowState.appId === "sandbox") {
      return (
        <CaseStudySandboxApp
          isActive={
            isWorkbenchPresented &&
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId &&
            !windowState.minimized
          }
        />
      );
    }

    if (windowState.appId === "agent") {
      return (
        <AgentWorkflowApp
          isPresented={
            isWorkbenchPresented &&
            activeWorkspaceId === windowState.workspaceId &&
            activeInstanceId === windowState.instanceId &&
            !windowState.minimized
          }
        />
      );
    }

    if (windowState.appId === "search") {
      return (
        <SearchApp
          onSavedToArchive={(note) => {
            // filesRef (not the render-closed `files`): two saves fired in the
            // same tick must chain off each other, not both branch from a
            // stale tree and silently drop the first note.
            const currentFiles = filesRef.current;
            const savedAt = new Date();
            const outcome = createNote(currentFiles, ROOT_FILE_ID, note.title, {
              content: `${note.body}\n\nSaved from Search · ${workbenchTimestampFormat.format(savedAt)} NZT`,
              now: savedAt.toISOString(),
            });
            if (outcome !== currentFiles) {
              replaceFiles(outcome);
              setNotice(`Saved "${note.title}" in Files.`);
              return true;
            } else {
              setNotice("Files is full; could not save that note.");
              return false;
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
          href="https://www.linkedin.com/in/sam-bai1/"
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
  const hasOpenWorkspaceWindows = mountedWindows.some(
    (windowState) => windowState.workspaceId === activeWorkspaceId,
  );
  const isPresent = useIsPresent();
  const revealClipOrigin = `${Math.round(revealOrigin.x)}px ${Math.round(
    revealOrigin.y,
  )}px`;

  return (
    <LazyMotion features={domAnimation}>
      <m.section
      ref={overlayRef}
      tabIndex={-1}
      className="workbench-os"
      inert={!isPresent || undefined}
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
      variants={{
        closed: (origin: Readonly<{ x: number; y: number }> = revealOrigin) =>
          prefersReducedMotion
            ? { opacity: 0 }
            : { clipPath: `circle(0vmax at ${Math.round(origin.x)}px ${Math.round(origin.y)}px)` },
      }}
      exit="closed"
      transition={{
        duration: prefersReducedMotion ? 0.15 : 0.72,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <button
        type="button"
        className="os-skip-link"
        aria-hidden={isModalSurfaceOpen || undefined}
        inert={isModalSurfaceOpen || undefined}
        onClick={() => {
          if (activeInstanceId) focusManagedSurface(activeInstanceId);
          else openWindow("now");
        }}
      >
        Skip to active window
      </button>
      <WorkbenchMenuBar
        activeAppLabel={activeWindow ? getWindowDisplayTitle(activeWindow) : "Desktop"}
        backgroundInert={isModalSurfaceOpen}
        time={time}
        workspaceLabel={activeWorkspace.label}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchWorkspace={switchWorkspace}
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
        aria-hidden={isAtlasOpen || isCloseGuardOpen || undefined}
        inert={isAtlasOpen || isCloseGuardOpen || undefined}
        onContextMenu={(event) => {
          if (isAtlasOpen || isPaletteOpen) {
            event.preventDefault();
            setContextMenu(null);
            return;
          }
          const target = event.target as HTMLElement;
          if (
            isCompact ||
            target.closest(
              ".os-window, .os-dock, .os-workspace-map, .os-desktop-icons, .os-system-notice, .os-context-menu",
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
        <nav
          className="os-workspace-map"
          aria-label="Workspace shortcuts"
          aria-hidden={isPaletteOpen || undefined}
          inert={isPaletteOpen || undefined}
        >
          <div className="os-workspace-map-heading">
            <span>Personal workbench</span>
            <span>Switch workspace</span>
          </div>
          <strong className="os-workspace-watermark" aria-hidden="true">{activeWorkspace.label}.</strong>
          <div className="os-workspace-map-routes">
            {workspaces.map((workspace, index) => {
              const openCount = session.windows.filter(
                (windowState) => windowState.workspaceId === workspace.id && windowState.open,
              ).length;
              return (
                <button
                  key={workspace.id}
                  type="button"
                  aria-pressed={workspace.id === activeWorkspaceId}
                  title={workspace.description}
                  onClick={() => switchWorkspace(workspace.id)}
                >
                  <span>{workspace.label}<kbd>Alt {index + 1}</kbd></span>
                  <small>{openCount ? `${openCount} open ${openCount === 1 ? "window" : "windows"}` : "No open windows"}</small>
                </button>
              );
            })}
          </div>
          <p>{activeWorkspace.description}</p>
        </nav>
        <span className="os-coordinate os-coordinate-top" aria-hidden="true">
          {activeWorkspace.label} / {visibleWindows.length.toString().padStart(2, "0")} LIVE
        </span>
        <span className="os-coordinate os-coordinate-bottom" aria-hidden="true">
          Hamilton / {time} / LOCAL
        </span>

        <nav
          className="os-desktop-icons"
          aria-label="Desktop objects"
          aria-hidden={isPaletteOpen || undefined}
          inert={isPaletteOpen || undefined}
        >
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openArchiveAt(ROOT_FILE_ID)}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 6h7l2 3h9v11H3Z" /><path d="M3 9h9" /></svg>
            </span>
            <span>{getWorkbenchApp("archive").label}</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("sandbox")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 4h16v16H4zM4 9h16M10 9v11" /></svg>
            </span>
            <span>{getWorkbenchApp("sandbox").label}</span>
          </button>
          <button
            type="button"
            className="os-desktop-object"
            onClick={() => openWindow("control")}
          >
            <span className="os-desktop-object-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 3v5m0 5v8M12 3v10m0 5v3M18 3v3m0 5v10M3 8h6v5H3zM9 13h6v5H9zM15 6h6v5h-6z" /></svg>
            </span>
            <span>{getWorkbenchApp("control").label}</span>
          </button>
        </nav>

        {snapZone && <div className="os-snap-preview" data-zone={snapZone} />}

        {notice && (
          <div
            className="os-system-notice"
            role="status"
            aria-live="polite"
            aria-hidden={isPaletteOpen || undefined}
            inert={isPaletteOpen || undefined}
          >
            <span>{notice}</span>
            {hasStorageConflict ? (
              <>
                {storageConflictEnvelope ? (
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
          <div
            className="os-empty"
            aria-hidden={isPaletteOpen || undefined}
            inert={isPaletteOpen || undefined}
          >
            <p>{hasOpenWorkspaceWindows
              ? "Your windows are minimized. Reopen one from the taskbar."
              : `No apps open in ${activeWorkspace.label}.`}</p>
            {!hasOpenWorkspaceWindows && (
              <button type="button" onClick={() => openWindow("now")}>About Sam</button>
            )}
            <button type="button" onClick={openApplications}>Open Applications</button>
          </div>
        )}

        <AnimatePresence>
          {mountedWindows.map((windowState, renderIndex) => {
            const displayTitle = getWindowDisplayTitle(windowState);
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
              zIndex: Math.min(
                WINDOW_Z_CEILING,
                WINDOW_Z_BASE + renderIndex,
              ),
            };
            return (
              <m.section
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
                aria-label={`${displayTitle} window`}
                aria-hidden={
                  isPresentationHidden || isPaletteOpen ? true : undefined
                }
                inert={isPresentationHidden || isPaletteOpen ? true : undefined}
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
                  <span className="os-window-title">{displayTitle}</span>
                  <span className="os-window-state">
                    {isActive ? "Active" : ""}
                  </span>
                  <div
                    className="os-window-controls"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label={`Minimize ${displayTitle} window`}
                      title="Minimize to taskbar"
                      onClick={() => minimizeWindow(windowState.instanceId)}
                    >
                      <span aria-hidden="true">−</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${
                        windowState.maximized ? "Restore" : "Maximize"
                      } ${displayTitle} window`}
                      title={windowState.maximized ? "Restore window size" : "Maximize window"}
                      onClick={() => toggleMaximize(windowState.instanceId)}
                    >
                      <span aria-hidden="true">{windowState.maximized ? "❐" : "□"}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Close ${displayTitle} window`}
                      title="Close window"
                      onClick={() => closeWindow(windowState.instanceId)}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>
                <div
                  className={`os-window-content os-app-${windowState.appId}`}
                  tabIndex={0}
                  role="region"
                  aria-label={`${displayTitle} content`}
                >
                  <WorkbenchAppBoundary resetKey={windowState.instanceId}>
                    {renderApp(windowState)}
                  </WorkbenchAppBoundary>
                </div>
                {!windowState.maximized && (
                  <button
                    type="button"
                    className="os-window-resize"
                    aria-label={`Resize ${displayTitle} window`}
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
              </m.section>
            );
          })}
        </AnimatePresence>

        <nav
          className="os-dock"
          aria-label="Workbench applications"
          aria-hidden={isPaletteOpen || undefined}
          inert={isPaletteOpen || undefined}
        >
          <button
            type="button"
            className="os-applications-trigger"
            onClick={openApplications}
            aria-haspopup="dialog"
            aria-expanded={isPaletteOpen && isAppLauncher}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 2h5v5H2zM13 2h5v5h-5zM2 13h5v5H2zM13 13h5v5h-5z" /></svg>
            <span>Applications</span>
          </button>
          <div className="os-running-apps">
          {workbenchApps.map((app) => {
            const instances = session.windows.filter(
              (windowState) =>
                windowState.appId === app.id &&
                windowState.workspaceId === activeWorkspaceId,
            );
            const openInstances = instances.filter((windowState) => windowState.open);
            if (!openInstances.length) return null;
            const isAppActive = activeWindow?.appId === app.id;
            const status = openInstances.every((windowState) => windowState.minimized)
                ? "Minimized"
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
                data-status={status.toLowerCase()}
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
                <small>{status}</small>
              </button>
            );
          })}
          {!hasOpenWorkspaceWindows && (
            <span className="os-taskbar-empty">No open apps in {activeWorkspace.label}</span>
          )}
          </div>
          <span className="os-taskbar-hint">{activeWorkspace.label} workspace</span>
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
              Find an app or file <kbd>Ctrl K</kbd>
            </button>
            <button type="button" role="menuitem" onClick={openAtlas}>
              Window overview <kbd>F3</kbd>
            </button>
            <button type="button" role="menuitem" onClick={tidyCurrentWorkspace}>
              Tidy workspace
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openWindow("archive", { forceNew: true })}
            >
              New Files window
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openWindow("control")}
            >
              Settings
            </button>
          </div>
        )}

        <AnimatePresence>
          {isPaletteOpen && (
            <m.div
              className={`os-palette-backdrop${isAppLauncher ? " is-launcher" : ""}`}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
              onPointerDown={(event) => {
                if (event.currentTarget === event.target) closePalette();
              }}
            >
              <m.section
                className={`os-palette${isAppLauncher ? " os-app-launcher" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={isAppLauncher ? "Applications" : "Search the Workbench"}
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
                transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
              >
                <div className="os-palette-search">
                  <label htmlFor="workbench-system-search">{isAppLauncher ? "Applications" : "Search everything"}</label>
                  <button
                    type="button"
                    className="os-palette-close"
                    onClick={closePalette}
                    aria-label={isAppLauncher ? "Close Applications" : "Close Workbench search"}
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
                        // Stop native bubbling: the window-level Escape
                        // branch would otherwise run closePalette a second
                        // time in the same tick, and its rAF would steal
                        // focus back from the invoker to the overlay.
                        event.stopPropagation();
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
                    placeholder={isAppLauncher ? "Find an application…" : "Find apps, windows or files…"}
                    autoComplete="off"
                  />
                </div>
                {isAppLauncher && (
                  <div className="os-launcher-categories" role="group" aria-label="Application categories">
                    {[{ id: "all", label: "All" }, ...workspaces].map((group) => (
                      <button
                        type="button"
                        key={group.id}
                        aria-pressed={launcherGroup === group.id}
                        onClick={() => {
                          setLauncherGroup(group.id as "all" | WorkspaceId);
                          setPaletteActiveIndex(0);
                        }}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                )}
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
                        <span>{isAppLauncher && action.appId ? getWorkbenchApp(action.appId).label : action.label}</span>
                        <span>{isAppLauncher && action.appId && launcherGroup !== "all"
                          ? getWorkbenchApp(action.appId).summary
                          : action.meta}</span>
                      </button>
                    ))
                  ) : (
                    <p>No {isAppLauncher ? "application" : "result"} matches “{paletteQuery}”.</p>
                  )}
                </div>
              </m.section>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isCloseGuardOpen && (
          <m.div
            className="os-close-guard-backdrop"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(event) => {
              if (event.currentTarget === event.target) stayInWorkbench();
            }}
          >
            <m.section
              className="os-close-guard"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="workbench-close-guard-title"
              aria-describedby="workbench-close-guard-description"
              tabIndex={-1}
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, y: 12, clipPath: "inset(0 0 12% 0)" }
              }
              animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, clipPath: "inset(0 0 8% 0)" }
              }
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="os-close-guard-copy">
                <h2 id="workbench-close-guard-title">This session isn’t saved.</h2>
                <p id="workbench-close-guard-description">
                  Browser storage is unavailable or could not accept the latest
                  session. Export a backup before leaving, or stay and keep working.
                  Any unreadable data already in storage will remain untouched.
                </p>
              </div>

              {closeGuardExportStatus ? (
                <p className="os-close-guard-status" role="status" aria-live="polite">
                  {closeGuardExportStatus}
                </p>
              ) : null}

              <div className="os-close-guard-actions">
                <button
                  ref={closeGuardExportRef}
                  type="button"
                  className="is-primary"
                  onClick={() => {
                    const exported = exportSession();
                    setCloseGuardExportStatus(
                      exported
                        ? "Backup download started. You can now leave without relying on browser storage."
                        : "The backup could not be created. Stay in Workbench and try again.",
                    );
                  }}
                >
                  Export backup
                </button>
                <button type="button" onClick={stayInWorkbench}>
                  Stay in Workbench
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={leaveWithoutSaving}
                >
                  Leave without saving
                </button>
              </div>
            </m.section>
          </m.div>
        )}
      </AnimatePresence>

      <WorkbenchMissionControl
        open={isAtlasOpen}
        currentWorkspaceId={activeWorkspaceId}
        workspaces={workspaces}
        windows={session.windows.filter((windowState) => windowState.open).map((windowState) => ({
          ...windowState,
          title: getWindowDisplayTitle(windowState),
        }))}
        onSelect={selectAtlasWindow}
        onRestoreAll={restoreAtlasWorkspace}
        onSwitchWorkspace={(workspaceId) => {
          if (isWorkspaceId(workspaceId)) switchWorkspace(workspaceId, false);
        }}
        onClose={closeAtlas}
      />
      </m.section>
    </LazyMotion>
  );
}
