// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import {
  WORKBENCH_COORDINATE_LIMIT,
  isWorkbenchAppId,
  isWorkbenchThemeId,
  isWorkspaceId,
  parseWorkbenchSession,
  workbenchStorageKeys,
  workspaceIds,
  type WorkbenchAppId,
  type WorkbenchSession,
  type WorkbenchWindow,
  type WorkspaceId,
} from "./workbench-system";
import {
  parseWorkbenchFiles,
  validateWorkbenchFiles,
  type WorkbenchFiles,
} from "./workbench-files";

export const WORKBENCH_BACKUP_FORMAT = "sam-workbench-backup" as const;
export const WORKBENCH_BACKUP_VERSION = 1 as const;
export const MAX_WORKBENCH_STATE_BYTES = 8_388_608;
export const MAX_WORKBENCH_BACKUP_BYTES = MAX_WORKBENCH_STATE_BYTES;
export const WORKBENCH_COMMITTED_STATE_STORAGE_KEY = "sam-workbench-state-v1";
export const WORKBENCH_COMMITTED_STATE_FORMAT = "sam-workbench-state" as const;
export const WORKBENCH_COMMITTED_STATE_VERSION = 1 as const;
export const MAX_WORKBENCH_COMMITTED_STATE_BYTES = MAX_WORKBENCH_STATE_BYTES;

const MAX_LEGACY_VALUE_BYTES = 524_288;
const MAX_WINDOW_COUNT = 60;
/**
 * Persisted window layers stay below the fixed dock/menu band, which begins at
 * z-index 90. With at most 60 windows, compaction to 1..n preserves ordering
 * while retaining headroom for subsequent focus operations.
 */
const WORKBENCH_Z_RENUMBER_THRESHOLD = 64;
const LEGACY_APP_IDS = [
  "now",
  "stack",
  "method",
  "scratch",
  "console",
  "links",
  "lab",
  "vector",
] as const satisfies readonly WorkbenchAppId[];

type LegacyAppId = (typeof LEGACY_APP_IDS)[number];
type LegacyMigrationAppId = LegacyAppId | "archive" | "pulse";
type StorageReader = Pick<Storage, "getItem">;

type LegacyMigrationWindowSpec = Readonly<
  Pick<WorkbenchWindow, "title" | "x" | "y" | "width" | "height">
>;

/**
 * Frozen geometry and titles from the v3 layout that first consumed v1 state.
 * Migration must not drift when the live app registry is renamed or redesigned.
 */
const LEGACY_MIGRATION_WINDOW_SPECS = {
  now: { title: "Now", x: 24, y: 20, width: 395, height: 335 },
  stack: { title: "Stack", x: 434, y: 20, width: 400, height: 355 },
  method: { title: "Method", x: 24, y: 400, width: 395, height: 205 },
  scratch: { title: "Scratch", x: 434, y: 400, width: 395, height: 205 },
  console: { title: "Console", x: 850, y: 400, width: 400, height: 205 },
  links: { title: "Links", x: 850, y: 20, width: 390, height: 300 },
  lab: { title: "Subsurface", x: 300, y: 70, width: 650, height: 430 },
  vector: { title: "Vector", x: 265, y: 48, width: 720, height: 450 },
  archive: { title: "Archive", x: 260, y: 44, width: 760, height: 470 },
  pulse: { title: "Pulse", x: 250, y: 40, width: 760, height: 460 },
} as const satisfies Record<LegacyMigrationAppId, LegacyMigrationWindowSpec>;

type LegacyWindow = {
  id: LegacyAppId;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
};

function createLegacyMigrationWindow(
  appId: LegacyMigrationAppId,
  workspaceId: WorkspaceId,
  z: number,
  instanceId: string,
  createdAt: number,
): WorkbenchWindow {
  const spec = LEGACY_MIGRATION_WINDOW_SPECS[appId];
  return {
    instanceId,
    appId,
    title: spec.title,
    workspaceId,
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    z,
    open: true,
    minimized: false,
    maximized: false,
    snap: null,
    restoreBounds: null,
    data: {},
    createdAt,
  };
}

/**
 * Historical v3 baseline used only while translating v1 browser state. Keep
 * this separate from the intentionally narrow first-visit seed: migration
 * previously merged legacy geometry into these eight windows, and dropping
 * them would silently rewrite an existing visitor's workspace.
 */
function createLegacyMigrationBaseSession(): WorkbenchSession {
  const now = Date.now();
  const windows: WorkbenchWindow[] = [
    createLegacyMigrationWindow("now", "build", 3, "build-now", now),
    createLegacyMigrationWindow("stack", "build", 5, "build-stack", now),
    createLegacyMigrationWindow("console", "build", 4, "build-console", now),
    createLegacyMigrationWindow("archive", "field", 3, "field-archive", now),
    createLegacyMigrationWindow("vector", "field", 4, "field-vector", now),
    createLegacyMigrationWindow("pulse", "field", 5, "field-pulse", now),
    createLegacyMigrationWindow("archive", "notes", 3, "notes-archive", now),
    createLegacyMigrationWindow("scratch", "notes", 4, "notes-scratch", now),
  ];

  return {
    version: 3,
    activeWorkspaceId: "build",
    activeInstances: {
      build: "build-stack",
      field: "field-pulse",
      notes: "notes-scratch",
    },
    themeId: "cobalt",
    windows,
    scratch: "",
    methodStep: "clarify",
    updatedAt: now,
  };
}

export type WorkbenchBackupEnvelope = {
  format: typeof WORKBENCH_BACKUP_FORMAT;
  version: typeof WORKBENCH_BACKUP_VERSION;
  exportedAt: string;
  session: WorkbenchSession;
  files: WorkbenchFiles;
};

export type WorkbenchCommittedStateEnvelope = {
  format: typeof WORKBENCH_COMMITTED_STATE_FORMAT;
  version: typeof WORKBENCH_COMMITTED_STATE_VERSION;
  revision: string;
  committedAt: string;
  session: WorkbenchSession;
  files: WorkbenchFiles;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function isValidIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function fitsUtf8ByteLimit(value: string, maximum: number) {
  if (value.length > maximum) return false;
  return new TextEncoder().encode(value).byteLength <= maximum;
}

function isValidRevision(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value) &&
    value !== "__proto__" &&
    value !== "constructor" &&
    value !== "prototype"
  );
}

export function createWorkbenchStateRevision() {
  const uniquePart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `revision-${uniquePart}`;
}

function deriveLegacyStateRevision(serialized: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `revision-legacy-${(hash >>> 0).toString(36)}`;
}

function fnv1a(serialized: string, basis: number) {
  let hash = basis;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Revisions identify committed *content*, not write events: identical session
 * and files state always derives the same revision. This lets redundant saves
 * (boot refits, visibility flushes, hydration replays) produce byte-identical
 * storage values that never fire cross-tab conflict signals, while any real
 * edit still yields a fresh revision.
 */
export function deriveWorkbenchContentRevision(
  session: WorkbenchSession,
  files: WorkbenchFiles,
): string {
  const canonical = serializeWorkbenchCommittedState(
    { ...session, updatedAt: 0 },
    files,
    {
      revision: "revision-content-seed",
      committedAt: "1970-01-01T00:00:00.000Z",
    },
  );
  return `revision-state-${fnv1a(canonical, 2_166_136_261)}-${fnv1a(
    canonical,
    3_760_217_689,
  )}`;
}

type RepairableWorkbenchBounds = Partial<
  NonNullable<WorkbenchWindow["restoreBounds"]>
>;

type StrictWorkbenchWindowInput = Omit<WorkbenchWindow, "restoreBounds"> & {
  restoreBounds: RepairableWorkbenchBounds | null;
};

function isOptionalFiniteNumber(value: unknown, min: number, max: number) {
  return value === undefined || isFiniteNumber(value, min, max);
}

/**
 * A saved restore object may predate one of its geometry fields. Present values
 * remain strict; the shared parser supplies registry fallbacks for omissions.
 */
function hasRepairableBounds(value: unknown): value is RepairableWorkbenchBounds {
  return (
    isRecord(value) &&
    isOptionalFiniteNumber(
      value.x,
      -WORKBENCH_COORDINATE_LIMIT,
      WORKBENCH_COORDINATE_LIMIT,
    ) &&
    isOptionalFiniteNumber(
      value.y,
      -WORKBENCH_COORDINATE_LIMIT,
      WORKBENCH_COORDINATE_LIMIT,
    ) &&
    isOptionalFiniteNumber(value.width, 320, 3_000) &&
    isOptionalFiniteNumber(value.height, 190, 2_000)
  );
}

function isStrictWindow(value: unknown): value is StrictWorkbenchWindowInput {
  if (
    !isRecord(value) ||
    typeof value.instanceId !== "string" ||
    value.instanceId.length === 0 ||
    value.instanceId.length > 160 ||
    !isWorkbenchAppId(value.appId) ||
    typeof value.title !== "string" ||
    value.title.length > 240 ||
    !isWorkspaceId(value.workspaceId) ||
    !isFiniteNumber(
      value.x,
      -WORKBENCH_COORDINATE_LIMIT,
      WORKBENCH_COORDINATE_LIMIT,
    ) ||
    !isFiniteNumber(
      value.y,
      -WORKBENCH_COORDINATE_LIMIT,
      WORKBENCH_COORDINATE_LIMIT,
    ) ||
    !isFiniteNumber(value.width, 320, 3_000) ||
    !isFiniteNumber(value.height, 190, 2_000) ||
    !isFiniteNumber(value.z, 1, 100_000) ||
    typeof value.open !== "boolean" ||
    typeof value.minimized !== "boolean" ||
    typeof value.maximized !== "boolean" ||
    (value.snap !== null && value.snap !== "left" && value.snap !== "right") ||
    (value.restoreBounds !== null && !hasRepairableBounds(value.restoreBounds)) ||
    !isRecord(value.data) ||
    !isFiniteNumber(value.createdAt, 0, Number.MAX_SAFE_INTEGER)
  ) {
    return false;
  }

  const dataEntries = Object.entries(value.data);
  return (
    dataEntries.length <= 30 &&
    dataEntries.every(
      ([key, item]) =>
        key.length > 0 && key.length <= 120 && typeof item === "string",
    )
  );
}

/**
 * Validates a complete v3 session. The shared parser supplies canonical copies;
 * this wrapper rejects partial windows and incomplete top-level state instead of
 * accepting parser fallbacks as a valid persisted session.
 */
export function parseStrictWorkbenchSession(value: unknown): WorkbenchSession | null {
  if (
    !isRecord(value) ||
    value.version !== 3 ||
    !isWorkspaceId(value.activeWorkspaceId) ||
    !isRecord(value.activeInstances) ||
    !isWorkbenchThemeId(value.themeId) ||
    !Array.isArray(value.windows) ||
    value.windows.length > MAX_WINDOW_COUNT ||
    typeof value.scratch !== "string" ||
    (value.methodStep !== "clarify" &&
      value.methodStep !== "shape" &&
      value.methodStep !== "ship" &&
      value.methodStep !== "learn") ||
    !isFiniteNumber(value.updatedAt, 0, Number.MAX_SAFE_INTEGER) ||
    !value.windows.every(isStrictWindow)
  ) {
    return null;
  }

  const windows = value.windows as StrictWorkbenchWindowInput[];
  const instanceIds = new Set(windows.map((windowState) => windowState.instanceId));
  if (instanceIds.size !== windows.length) return null;

  // Z values accrue monotonically across a durable session's lifetime and are
  // persisted, so they must be compacted before they breach the parser's own
  // 100_000 ceiling and permanently fail every save/export. Renumbering
  // preserves relative stack order exactly, so this is invisible in the UI.
  const maxZ = windows.reduce((highest, windowState) => Math.max(highest, windowState.z), 0);
  let stacked = windows;
  if (maxZ > WORKBENCH_Z_RENUMBER_THRESHOLD) {
    const byStackOrder = windows
      .map((windowState, originalIndex) => ({ windowState, originalIndex }))
      .sort(
        (left, right) =>
          left.windowState.z - right.windowState.z ||
          left.originalIndex - right.originalIndex,
      )
      .map(({ windowState }) => windowState);
    const renumbered = new Map(
      byStackOrder.map((windowState, index) => [windowState.instanceId, index + 1]),
    );
    stacked = windows.map((windowState) => ({
      ...windowState,
      z: renumbered.get(windowState.instanceId) ?? windowState.z,
    }));
  }

  for (const workspaceId of workspaceIds) {
    const activeInstanceId = value.activeInstances[workspaceId];
    if (activeInstanceId !== null && typeof activeInstanceId !== "string") {
      return null;
    }
    if (
      typeof activeInstanceId === "string" &&
      !windows.some(
        (windowState) =>
          windowState.instanceId === activeInstanceId &&
          windowState.workspaceId === workspaceId &&
          windowState.open &&
          !windowState.minimized,
      )
    ) {
      return null;
    }
  }

  const parsed = parseWorkbenchSession(value);
  if (!parsed || parsed.windows.length !== windows.length) return null;
  const sourceById = new Map(stacked.map((windowState) => [windowState.instanceId, windowState]));

  return {
    ...parsed,
    windows: parsed.windows.map((windowState) => ({
      ...windowState,
      z: sourceById.get(windowState.instanceId)?.z ?? windowState.z,
    })),
  };
}

/** Parses the single-key, atomically committed browser state envelope. */
export function parseWorkbenchCommittedState(
  serialized: string | null | undefined,
): WorkbenchCommittedStateEnvelope | null {
  if (
    typeof serialized !== "string" ||
    serialized.length === 0 ||
    !fitsUtf8ByteLimit(serialized, MAX_WORKBENCH_COMMITTED_STATE_BYTES)
  ) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(serialized);
    const revision =
      isRecord(value) && value.revision === undefined
        ? deriveLegacyStateRevision(serialized)
        : isRecord(value)
          ? value.revision
          : undefined;
    if (
      !isRecord(value) ||
      value.format !== WORKBENCH_COMMITTED_STATE_FORMAT ||
      value.version !== WORKBENCH_COMMITTED_STATE_VERSION ||
      !isValidRevision(revision) ||
      !isValidIsoDate(value.committedAt)
    ) {
      return null;
    }
    const session = parseStrictWorkbenchSession(value.session);
    const files = parseWorkbenchFiles(JSON.stringify(value.files));
    if (!session || !files) return null;
    return {
      format: WORKBENCH_COMMITTED_STATE_FORMAT,
      version: WORKBENCH_COMMITTED_STATE_VERSION,
      revision,
      committedAt: value.committedAt,
      session,
      files,
    };
  } catch {
    return null;
  }
}

/** Serializes only state that the next browser load can accept unchanged. */
export function serializeWorkbenchCommittedState(
  session: WorkbenchSession,
  files: WorkbenchFiles,
  options: { committedAt?: string; revision?: string } = {},
) {
  const committedAt = options.committedAt ?? new Date().toISOString();
  const revision = options.revision ?? createWorkbenchStateRevision();
  const validSession = parseStrictWorkbenchSession(session);
  const validFiles = validateWorkbenchFiles(files);
  if (
    !validSession ||
    !validFiles ||
    !isValidIsoDate(committedAt) ||
    !isValidRevision(revision)
  ) {
    throw new TypeError("Cannot commit invalid workbench state.");
  }
  const serialized = JSON.stringify({
    format: WORKBENCH_COMMITTED_STATE_FORMAT,
    version: WORKBENCH_COMMITTED_STATE_VERSION,
    revision,
    committedAt,
    session: validSession,
    files: validFiles,
  } satisfies WorkbenchCommittedStateEnvelope);
  if (!fitsUtf8ByteLimit(serialized, MAX_WORKBENCH_COMMITTED_STATE_BYTES)) {
    throw new RangeError("Workbench state exceeds the supported browser limit.");
  }
  return serialized;
}

/** Parses and validates a complete backup without reading or changing storage. */
export function parseWorkbenchBackup(
  serialized: string | null | undefined,
): WorkbenchBackupEnvelope | null {
  if (
    typeof serialized !== "string" ||
    serialized.length === 0 ||
    !fitsUtf8ByteLimit(serialized, MAX_WORKBENCH_BACKUP_BYTES)
  ) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      value.format !== WORKBENCH_BACKUP_FORMAT ||
      value.version !== WORKBENCH_BACKUP_VERSION ||
      !isValidIsoDate(value.exportedAt)
    ) {
      return null;
    }

    const session = parseStrictWorkbenchSession(value.session);
    if (!session) return null;

    const filesSerialized = JSON.stringify(value.files);
    const files = parseWorkbenchFiles(filesSerialized);
    if (!files) return null;

    return {
      format: WORKBENCH_BACKUP_FORMAT,
      version: WORKBENCH_BACKUP_VERSION,
      exportedAt: value.exportedAt,
      session,
      files,
    };
  } catch {
    return null;
  }
}

/**
 * Serializes a validated session and filesystem as a versioned backup. Invalid
 * state throws TypeError; a backup over the import ceiling throws RangeError.
 */
export function serializeWorkbenchBackup(
  session: WorkbenchSession,
  files: WorkbenchFiles,
  exportedAt = new Date().toISOString(),
) {
  const validSession = parseStrictWorkbenchSession(session);
  const validFiles = validateWorkbenchFiles(files);
  if (!validSession || !validFiles || !isValidIsoDate(exportedAt)) {
    throw new TypeError("Cannot serialize invalid workbench state.");
  }

  const serialized = JSON.stringify({
    format: WORKBENCH_BACKUP_FORMAT,
    version: WORKBENCH_BACKUP_VERSION,
    exportedAt,
    session: validSession,
    files: validFiles,
  } satisfies WorkbenchBackupEnvelope);

  if (!fitsUtf8ByteLimit(serialized, MAX_WORKBENCH_BACKUP_BYTES)) {
    throw new RangeError("Workbench backup exceeds the supported size.");
  }
  return serialized;
}

function isLegacyAppId(value: unknown): value is LegacyAppId {
  return (
    isWorkbenchAppId(value) &&
    LEGACY_APP_IDS.includes(value as LegacyAppId)
  );
}

function parseLegacyLayout(serialized: string): LegacyWindow[] | null {
  if (!fitsUtf8ByteLimit(serialized, MAX_LEGACY_VALUE_BYTES)) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value) || value.length > LEGACY_APP_IDS.length) return null;

    const windows: LegacyWindow[] = [];
    const appIds = new Set<LegacyAppId>();
    for (const candidate of value) {
      if (
        !isRecord(candidate) ||
        !isLegacyAppId(candidate.id) ||
        appIds.has(candidate.id) ||
        !isFiniteNumber(candidate.x, -3_000, 3_000) ||
        !isFiniteNumber(candidate.y, -3_000, 3_000) ||
        !isFiniteNumber(candidate.width, 320, 3_000) ||
        !isFiniteNumber(candidate.height, 190, 2_000) ||
        !isFiniteNumber(candidate.z, 1, 100_000) ||
        typeof candidate.open !== "boolean" ||
        typeof candidate.minimized !== "boolean" ||
        typeof candidate.maximized !== "boolean"
      ) {
        return null;
      }
      appIds.add(candidate.id);
      windows.push({
        id: candidate.id,
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height,
        z: candidate.z,
        open: candidate.open,
        minimized: candidate.minimized,
        maximized: candidate.maximized,
      });
    }
    return windows;
  } catch {
    return null;
  }
}

function createMigratedWindow(
  legacy: LegacyWindow,
  fallback: WorkbenchWindow | undefined,
  scratch: string,
  createdAt: number,
): WorkbenchWindow {
  const base =
    fallback ??
    createLegacyMigrationWindow(
      legacy.id,
      "build",
      legacy.z,
      `legacy-build-${legacy.id}`,
      createdAt,
    );
  const restoreBounds = legacy.maximized
    ? {
        x: legacy.x,
        y: legacy.y,
        width: legacy.width,
        height: legacy.height,
      }
    : null;

  return {
    ...base,
    workspaceId: "build",
    x: legacy.x,
    y: legacy.y,
    width: legacy.width,
    height: legacy.height,
    z: legacy.z,
    open: legacy.open,
    minimized: legacy.minimized,
    maximized: legacy.maximized,
    snap: null,
    restoreBounds,
    data: legacy.id === "scratch" ? { ...base.data, text: scratch } : base.data,
    createdAt: fallback?.createdAt ?? createdAt,
  };
}

/**
 * Reads legacy v1 keys and returns a new v3 session merged with current defaults.
 * It is deliberately read-only: missing, inaccessible, oversized, or malformed
 * legacy values return null and the original keys remain untouched.
 */
export function migrateLegacyWorkbenchSession(
  storage: StorageReader | null | undefined,
): WorkbenchSession | null {
  if (!storage) return null;

  let serializedLayout: string | null;
  let legacyScratch: string | null;
  try {
    serializedLayout = storage.getItem(workbenchStorageKeys.legacyLayout);
    legacyScratch = storage.getItem(workbenchStorageKeys.legacyScratch);
  } catch {
    return null;
  }

  if (serializedLayout === null && legacyScratch === null) return null;
  if (
    legacyScratch !== null &&
    !fitsUtf8ByteLimit(legacyScratch, MAX_LEGACY_VALUE_BYTES)
  ) {
    return null;
  }

  const legacyWindows =
    serializedLayout === null ? [] : parseLegacyLayout(serializedLayout);
  if (!legacyWindows) return null;

  const scratch = legacyScratch ?? "";
  const defaults = createLegacyMigrationBaseSession();
  const now = Date.now();
  const windows = defaults.windows.map((windowState) => ({
    ...windowState,
    data:
      windowState.appId === "scratch"
        ? { ...windowState.data, text: scratch }
        : { ...windowState.data },
  }));

  for (const legacy of legacyWindows) {
    const fallbackIndex = windows.findIndex(
      (windowState) =>
        windowState.workspaceId === "build" && windowState.appId === legacy.id,
    );
    const fallback = fallbackIndex >= 0 ? windows[fallbackIndex] : undefined;
    const migrated = createMigratedWindow(legacy, fallback, scratch, now);
    if (fallbackIndex >= 0) windows[fallbackIndex] = migrated;
    else windows.push(migrated);
  }

  const activeBuild = windows
    .filter(
      (windowState) =>
        windowState.workspaceId === "build" &&
        windowState.open &&
        !windowState.minimized,
    )
    .sort((left, right) => right.z - left.z)[0]?.instanceId ?? null;

  const migratedSession: WorkbenchSession = {
    ...defaults,
    activeWorkspaceId: "build",
    activeInstances: {
      ...defaults.activeInstances,
      build: activeBuild,
    } as Record<WorkspaceId, string | null>,
    windows,
    scratch,
    updatedAt: now,
  };

  return parseStrictWorkbenchSession(migratedSession);
}
