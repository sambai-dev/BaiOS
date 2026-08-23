import {
  getWorkbenchApp,
  isWorkbenchAppId,
  isWorkspaceId,
  type WorkbenchAppId,
  type WorkbenchWindow,
  type WorkspaceId,
} from "./workbench-system";

export const workbenchSnapTargets = ["left", "right", "top"] as const;

export type WorkbenchSnapTarget = (typeof workbenchSnapTargets)[number];

export type WorkbenchBounds = Readonly<{
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}>;

export type WindowManagerResult = Readonly<{
  windows: WorkbenchWindow[];
  activeInstanceId: string | null;
  /** The first z-index that has not been assigned by this operation. */
  nextZ: number;
}>;

export type OpenAppWindowOptions = Readonly<{
  /** Create another instance only when the registered app supports it. */
  forceNew?: boolean;
  /** A caller-owned z cursor. Values behind the current stack are advanced safely. */
  z?: number;
  /** Useful for deterministic restores and tests. Must be unique when supplied. */
  instanceId?: string;
  /** A logical creation time. Defaults to one beyond the newest current window. */
  createdAt?: number;
  /** Offset between sibling instances of the same app. */
  cascadeOffset?: number;
}>;

const DEFAULT_MIN_WIDTH = 320;
const DEFAULT_MIN_HEIGHT = 190;
const DEFAULT_CASCADE_OFFSET = 24;
const MAX_CASCADE_SLOTS = 8;
const MAX_WINDOW_INSTANCES = 60;

function assertWindows(windows: readonly WorkbenchWindow[]): void {
  if (!Array.isArray(windows)) {
    throw new TypeError("Workbench windows must be an array.");
  }

  const instanceIds = new Set<string>();
  for (const windowState of windows) {
    if (
      !windowState ||
      typeof windowState !== "object" ||
      typeof windowState.instanceId !== "string" ||
      windowState.instanceId.trim().length === 0 ||
      typeof windowState.title !== "string" ||
      !isWorkbenchAppId(windowState.appId) ||
      !isWorkspaceId(windowState.workspaceId) ||
      !Number.isFinite(windowState.x) ||
      !Number.isFinite(windowState.y) ||
      !Number.isFinite(windowState.width) ||
      windowState.width <= 0 ||
      !Number.isFinite(windowState.height) ||
      windowState.height <= 0 ||
      !Number.isFinite(windowState.z) ||
      typeof windowState.open !== "boolean" ||
      typeof windowState.minimized !== "boolean" ||
      typeof windowState.maximized !== "boolean" ||
      !Number.isFinite(windowState.createdAt) ||
      (windowState.snap !== null &&
        windowState.snap !== "left" &&
        windowState.snap !== "right") ||
      !windowState.data ||
      typeof windowState.data !== "object" ||
      Object.values(windowState.data).some((value) => typeof value !== "string") ||
      (windowState.restoreBounds !== null &&
        (!Number.isFinite(windowState.restoreBounds.x) ||
          !Number.isFinite(windowState.restoreBounds.y) ||
          !Number.isFinite(windowState.restoreBounds.width) ||
          windowState.restoreBounds.width <= 0 ||
          !Number.isFinite(windowState.restoreBounds.height) ||
          windowState.restoreBounds.height <= 0))
    ) {
      throw new TypeError("Workbench windows contain an invalid window.");
    }
    if (instanceIds.has(windowState.instanceId)) {
      throw new TypeError(`Duplicate window instance id: ${windowState.instanceId}`);
    }
    instanceIds.add(windowState.instanceId);
  }
}

function assertWorkspaceId(workspaceId: WorkspaceId): void {
  if (!isWorkspaceId(workspaceId)) {
    throw new RangeError(`Unknown workspace id: ${String(workspaceId)}`);
  }
}

function assertAppId(appId: WorkbenchAppId): void {
  if (!isWorkbenchAppId(appId)) {
    throw new RangeError(`Unknown workbench app id: ${String(appId)}`);
  }
}

function assertInstanceId(instanceId: string): void {
  if (
    typeof instanceId !== "string" ||
    instanceId.trim().length === 0 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(instanceId) ||
    instanceId === "__proto__" ||
    instanceId === "constructor" ||
    instanceId === "prototype"
  ) {
    throw new TypeError("Window instance id must be a non-empty string.");
  }
}

function assertBounds(bounds: WorkbenchBounds): Required<WorkbenchBounds> {
  if (
    !bounds ||
    typeof bounds !== "object" ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    throw new RangeError("Workbench bounds must have positive finite dimensions.");
  }

  const minWidth = bounds.minWidth ?? DEFAULT_MIN_WIDTH;
  const minHeight = bounds.minHeight ?? DEFAULT_MIN_HEIGHT;
  if (
    !Number.isFinite(minWidth) ||
    !Number.isFinite(minHeight) ||
    minWidth <= 0 ||
    minHeight <= 0
  ) {
    throw new RangeError("Minimum window dimensions must be positive and finite.");
  }

  return {
    width: bounds.width,
    height: bounds.height,
    minWidth,
    minHeight,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function compareWindowStack(left: WorkbenchWindow, right: WorkbenchWindow): number {
  return (
    left.z - right.z ||
    left.createdAt - right.createdAt ||
    compareText(left.instanceId, right.instanceId)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneWindow(windowState: WorkbenchWindow): WorkbenchWindow {
  return {
    ...windowState,
    restoreBounds: windowState.restoreBounds
      ? { ...windowState.restoreBounds }
      : null,
    data: { ...windowState.data },
  };
}

function windowBounds(windowState: WorkbenchWindow) {
  return {
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
  };
}

function highestZ(windows: readonly WorkbenchWindow[]): number {
  return windows.reduce((highest, windowState) => Math.max(highest, windowState.z), 0);
}

function allocateZ(
  windows: readonly WorkbenchWindow[],
  requestedZ?: number,
): { assignedZ: number; nextZ: number } {
  if (requestedZ !== undefined && !Number.isFinite(requestedZ)) {
    throw new RangeError("The requested z-index must be finite.");
  }
  const currentHighest = Math.ceil(highestZ(windows));
  const requested = requestedZ === undefined ? currentHighest + 1 : Math.ceil(requestedZ);
  const assignedZ = Math.max(1, currentHighest + 1, requested);
  return { assignedZ, nextZ: assignedZ + 1 };
}

function nextLogicalCreatedAt(windows: readonly WorkbenchWindow[]): number {
  return windows.reduce(
    (newest, windowState) => Math.max(newest, Math.ceil(windowState.createdAt)),
    0,
  ) + 1;
}

function cascadeSlot(sequence: number): number {
  return Math.max(0, Math.floor(sequence)) % MAX_CASCADE_SLOTS;
}

function requireWindow(
  windows: readonly WorkbenchWindow[],
  instanceId: string,
): WorkbenchWindow {
  assertInstanceId(instanceId);
  const target = windows.find((windowState) => windowState.instanceId === instanceId);
  if (!target) {
    throw new RangeError(`Unknown window instance id: ${instanceId}`);
  }
  return target;
}

function result(
  windows: WorkbenchWindow[],
  activeInstanceId: string | null,
  minimumNextZ = 1,
): WindowManagerResult {
  return {
    windows,
    activeInstanceId,
    nextZ: Math.max(minimumNextZ, Math.ceil(highestZ(windows)) + 1, 1),
  };
}

function createUniqueInstanceId(
  windows: readonly WorkbenchWindow[],
  appId: WorkbenchAppId,
  workspaceId: WorkspaceId,
  requestedId?: string,
): string {
  const occupied = new Set(windows.map((windowState) => windowState.instanceId));
  if (requestedId !== undefined) {
    assertInstanceId(requestedId);
    if (occupied.has(requestedId)) {
      throw new RangeError(`Window instance id already exists: ${requestedId}`);
    }
    return requestedId;
  }

  const base = `${workspaceId}-${appId}`;
  if (!occupied.has(base)) return base;
  let suffix = 2;
  while (occupied.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Returns every window in a workspace, back-to-front, without mutating the source. */
export function getWorkspaceWindows(
  windows: readonly WorkbenchWindow[],
  workspaceId: WorkspaceId,
): WorkbenchWindow[] {
  assertWindows(windows);
  assertWorkspaceId(workspaceId);
  return windows
    .filter((windowState) => windowState.workspaceId === workspaceId)
    .map(cloneWindow)
    .sort(compareWindowStack);
}

/** Returns open, non-minimized workspace windows, back-to-front. */
export function getVisibleWorkspaceWindows(
  windows: readonly WorkbenchWindow[],
  workspaceId: WorkspaceId,
): WorkbenchWindow[] {
  return getWorkspaceWindows(windows, workspaceId).filter(
    (windowState) => windowState.open && !windowState.minimized,
  );
}

/** Selects the deterministic front-most visible instance in a workspace. */
export function getNextActiveInstanceId(
  windows: readonly WorkbenchWindow[],
  workspaceId: WorkspaceId,
  excludingInstanceId?: string,
): string | null {
  if (excludingInstanceId !== undefined) assertInstanceId(excludingInstanceId);
  const visible = getVisibleWorkspaceWindows(windows, workspaceId).filter(
    (windowState) => windowState.instanceId !== excludingInstanceId,
  );
  return visible.at(-1)?.instanceId ?? null;
}

/** Raises a window and returns the next safe z cursor for the caller. */
export function focusWindow(
  windows: readonly WorkbenchWindow[],
  instanceId: string,
  z?: number,
): WindowManagerResult {
  assertWindows(windows);
  const target = requireWindow(windows, instanceId);
  const allocation = allocateZ(windows, z);
  const nextWindows = windows.map((windowState) =>
    windowState.instanceId === instanceId
      ? {
          ...cloneWindow(windowState),
          open: true,
          minimized: false,
          z: allocation.assignedZ,
        }
      : cloneWindow(windowState),
  );
  return result(nextWindows, target.instanceId, allocation.nextZ);
}

/**
 * Opens an app in a workspace. Existing instances are reused by default; forceNew
 * creates a cascaded sibling only for apps registered as multi-instance capable.
 */
export function openAppWindow(
  windows: readonly WorkbenchWindow[],
  appId: WorkbenchAppId,
  workspaceId: WorkspaceId,
  options: OpenAppWindowOptions = {},
): WindowManagerResult {
  assertWindows(windows);
  assertAppId(appId);
  assertWorkspaceId(workspaceId);
  const app = getWorkbenchApp(appId);
  const matches = windows
    .filter(
      (windowState) =>
        windowState.appId === appId && windowState.workspaceId === workspaceId,
    )
    .slice()
    .sort(compareWindowStack);
  const createNew = options.forceNew === true && app.supportsMultiple;
  const reusable = createNew
    ? undefined
    : matches.filter((windowState) => windowState.open).at(-1) ?? matches.at(-1);

  if (reusable) {
    return focusWindow(windows, reusable.instanceId, options.z);
  }

  if (windows.length >= MAX_WINDOW_INSTANCES) {
    const recoverable = matches.filter((windowState) => !windowState.open).at(-1);
    if (recoverable) return focusWindow(windows, recoverable.instanceId, options.z);
    throw new RangeError("Workbench window capacity has been reached.");
  }

  const cascadeOffset = options.cascadeOffset ?? DEFAULT_CASCADE_OFFSET;
  if (!Number.isFinite(cascadeOffset) || cascadeOffset < 0) {
    throw new RangeError("Window cascade offset must be finite and non-negative.");
  }
  if (options.createdAt !== undefined && !Number.isFinite(options.createdAt)) {
    throw new RangeError("Window creation time must be finite.");
  }

  const allocation = allocateZ(windows, options.z);
  const sequence = matches.length;
  const offsetSequence = cascadeSlot(sequence);
  const instanceId = createUniqueInstanceId(
    windows,
    appId,
    workspaceId,
    options.instanceId,
  );
  const placement = resolveDefaultPlacement(app);
  const createdWindow: WorkbenchWindow = {
    instanceId,
    appId,
    title: sequence === 0 ? app.label : `${app.label} ${sequence + 1}`,
    workspaceId,
    x: placement.x + offsetSequence * cascadeOffset,
    y: placement.y + offsetSequence * cascadeOffset,
    width: app.defaultWidth,
    height: app.defaultHeight,
    z: allocation.assignedZ,
    open: true,
    minimized: false,
    maximized: false,
    snap: null,
    restoreBounds: null,
    data: {},
    createdAt: options.createdAt ?? nextLogicalCreatedAt(windows),
  };

  return result(
    [...windows.map(cloneWindow), createdWindow],
    instanceId,
    allocation.nextZ,
  );
}

const VIEWPORT_MARGIN = 10;
const DESKTOP_TOP_RESERVE = 0;
const DESKTOP_BOTTOM_RESERVE = 84;

/**
 * Keep an app's composed default position inside the visible desktop.
 * Registry coordinates are authored for a ~1264px laptop viewport; on
 * smaller viewports they are pulled back in so windows never open
 * clipped or stacked outside view. SSR-safe: without a DOM it is a
 * passthrough.
 */
function resolveDefaultPlacement(app: WorkbenchAppDefinition): {
  x: number;
  y: number;
} {
  if (typeof window === "undefined") {
    return { x: app.defaultX, y: app.defaultY };
  }
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const maxX = Math.max(
    VIEWPORT_MARGIN,
    viewWidth - app.defaultWidth - VIEWPORT_MARGIN,
  );
  const maxY = Math.max(
    DESKTOP_TOP_RESERVE + VIEWPORT_MARGIN,
    viewHeight -
      app.defaultHeight -
      DESKTOP_BOTTOM_RESERVE -
      DESKTOP_TOP_RESERVE,
  );
  return {
    x: Math.min(Math.max(app.defaultX, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(app.defaultY, DESKTOP_TOP_RESERVE + 6), maxY),
  };
}

export function minimizeWindow(
  windows: readonly WorkbenchWindow[],
  instanceId: string,
): WindowManagerResult {
  assertWindows(windows);
  const target = requireWindow(windows, instanceId);
  const minimumNextZ = Math.ceil(highestZ(windows)) + 1;
  const nextWindows = windows.map((windowState) =>
    windowState.instanceId === instanceId
      ? { ...cloneWindow(windowState), minimized: true }
      : cloneWindow(windowState),
  );
  return result(
    nextWindows,
    getNextActiveInstanceId(nextWindows, target.workspaceId, instanceId),
    minimumNextZ,
  );
}

/** Closes an instance while preserving its geometry and local app data. */
export function closeWindow(
  windows: readonly WorkbenchWindow[],
  instanceId: string,
): WindowManagerResult {
  assertWindows(windows);
  const target = requireWindow(windows, instanceId);
  const minimumNextZ = Math.ceil(highestZ(windows)) + 1;
  const nextWindows = windows.map((windowState) =>
    windowState.instanceId === instanceId
      ? {
          ...cloneWindow(windowState),
          ...(windowState.restoreBounds ?? {}),
          open: false,
          minimized: false,
          maximized: false,
          snap: null,
          restoreBounds: null,
        }
      : cloneWindow(windowState),
  );
  return result(
    nextWindows,
    getNextActiveInstanceId(nextWindows, target.workspaceId),
    minimumNextZ,
  );
}

export function toggleMaximize(
  windows: readonly WorkbenchWindow[],
  instanceId: string,
  z?: number,
): WindowManagerResult {
  assertWindows(windows);
  const target = requireWindow(windows, instanceId);
  const allocation = allocateZ(windows, z);
  const leavingMaximized = target.maximized;
  const restoredBounds = target.restoreBounds;
  const nextWindows = windows.map((windowState) =>
    windowState.instanceId === instanceId
      ? {
          ...cloneWindow(windowState),
          ...(leavingMaximized && restoredBounds ? restoredBounds : {}),
          open: true,
          minimized: false,
          maximized: !leavingMaximized,
          snap: null,
          restoreBounds: leavingMaximized
            ? null
            : restoredBounds ?? windowBounds(target),
          z: allocation.assignedZ,
        }
      : cloneWindow(windowState),
  );
  return result(nextWindows, instanceId, allocation.nextZ);
}

/** Restores registry dimensions and deterministic cascades for one workspace. */
export function tidyWorkspace(
  windows: readonly WorkbenchWindow[],
  workspaceId: WorkspaceId,
): WindowManagerResult {
  assertWindows(windows);
  assertWorkspaceId(workspaceId);
  const occurrenceByInstance = new Map<string, number>();
  const occurrences = new Map<WorkbenchAppId, number>();
  getWorkspaceWindows(windows, workspaceId)
    .slice()
    .sort(
      (left, right) =>
        left.createdAt - right.createdAt || compareText(left.instanceId, right.instanceId),
    )
    .forEach((windowState) => {
      const occurrence = occurrences.get(windowState.appId) ?? 0;
      occurrenceByInstance.set(windowState.instanceId, occurrence);
      occurrences.set(windowState.appId, occurrence + 1);
    });

  const nextWindows = windows.map((windowState) => {
    if (windowState.workspaceId !== workspaceId) return cloneWindow(windowState);
    const app = getWorkbenchApp(windowState.appId);
    const sequence = occurrenceByInstance.get(windowState.instanceId) ?? 0;
    const offsetSequence = cascadeSlot(sequence);
    const placement = resolveDefaultPlacement(app);
    return {
      ...cloneWindow(windowState),
      x: placement.x + offsetSequence * DEFAULT_CASCADE_OFFSET,
      y: placement.y + offsetSequence * DEFAULT_CASCADE_OFFSET,
      width: app.defaultWidth,
      height: app.defaultHeight,
      maximized: false,
      snap: null,
      restoreBounds: null,
    };
  });

  return result(
    nextWindows,
    getNextActiveInstanceId(nextWindows, workspaceId),
    Math.ceil(highestZ(windows)) + 1,
  );
}

/** Closes every instance in one workspace without discarding local app data. */
export function closeWorkspaceWindows(
  windows: readonly WorkbenchWindow[],
  workspaceId: WorkspaceId,
): WindowManagerResult {
  assertWindows(windows);
  assertWorkspaceId(workspaceId);
  const minimumNextZ = Math.ceil(highestZ(windows)) + 1;
  const nextWindows = windows.map((windowState) =>
    windowState.workspaceId === workspaceId
      ? {
          ...cloneWindow(windowState),
          ...(windowState.restoreBounds ?? {}),
          open: false,
          minimized: false,
          maximized: false,
          snap: null,
          restoreBounds: null,
        }
      : cloneWindow(windowState),
  );
  return result(nextWindows, null, minimumNextZ);
}

/** Clamps stored window geometry to a desktop's usable bounds. */
export function fitWindowsToBounds(
  windows: readonly WorkbenchWindow[],
  bounds: WorkbenchBounds,
  workspaceId?: WorkspaceId,
): WorkbenchWindow[] {
  assertWindows(windows);
  const safeBounds = assertBounds(bounds);
  if (workspaceId !== undefined) assertWorkspaceId(workspaceId);
  const minimumWidth = Math.min(safeBounds.minWidth, safeBounds.width);
  const minimumHeight = Math.min(safeBounds.minHeight, safeBounds.height);

  const fitBounds = (geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    const width = clamp(geometry.width, minimumWidth, safeBounds.width);
    const height = clamp(geometry.height, minimumHeight, safeBounds.height);
    return {
      width,
      height,
      x: clamp(geometry.x, 0, Math.max(0, safeBounds.width - width)),
      y: clamp(geometry.y, 0, Math.max(0, safeBounds.height - height)),
    };
  };

  return windows.map((windowState) => {
    if (workspaceId !== undefined && windowState.workspaceId !== workspaceId) {
      return cloneWindow(windowState);
    }
    const restoreBounds = windowState.restoreBounds
      ? fitBounds(windowState.restoreBounds)
      : null;
    if (windowState.maximized) {
      return {
        ...cloneWindow(windowState),
        x: 0,
        y: 0,
        width: safeBounds.width,
        height: safeBounds.height,
        restoreBounds,
      };
    }
    if (windowState.snap === "left" || windowState.snap === "right") {
      const split = safeBounds.width / 2;
      return {
        ...cloneWindow(windowState),
        x: windowState.snap === "left" ? 0 : split,
        y: 0,
        width: windowState.snap === "left" ? split : safeBounds.width - split,
        height: safeBounds.height,
        restoreBounds,
      };
    }
    return {
      ...cloneWindow(windowState),
      ...fitBounds(windowState),
      restoreBounds,
    };
  });
}

/** Snaps left/right to half the desktop; top uses the system maximize state. */
export function snapWindow(
  windows: readonly WorkbenchWindow[],
  instanceId: string,
  target: WorkbenchSnapTarget,
  bounds: WorkbenchBounds,
  z?: number,
): WindowManagerResult {
  assertWindows(windows);
  requireWindow(windows, instanceId);
  if (!workbenchSnapTargets.includes(target)) {
    throw new RangeError(`Unknown window snap target: ${String(target)}`);
  }
  const safeBounds = assertBounds(bounds);
  const allocation = allocateZ(windows, z);
  const split = safeBounds.width / 2;
  const snapped = windows.map((windowState) => {
    if (windowState.instanceId !== instanceId) return cloneWindow(windowState);
    const restoreBounds = windowState.restoreBounds ?? windowBounds(windowState);
    if (target === "top") {
      return {
        ...cloneWindow(windowState),
        x: 0,
        y: 0,
        width: safeBounds.width,
        height: safeBounds.height,
        z: allocation.assignedZ,
        open: true,
        minimized: false,
        maximized: true,
        snap: null,
        restoreBounds,
      };
    }
    return {
      ...cloneWindow(windowState),
      x: target === "left" ? 0 : split,
      y: 0,
      width: target === "left" ? split : safeBounds.width - split,
      height: safeBounds.height,
      z: allocation.assignedZ,
      open: true,
      minimized: false,
      maximized: false,
      snap: target,
      restoreBounds,
    };
  });
  return result(snapped, instanceId, allocation.nextZ);
}

/** Preserves a preferred visible instance when switching workspaces, if possible. */
export function switchWorkspaceActiveInstance(
  windows: readonly WorkbenchWindow[],
  workspaceId: WorkspaceId,
  preferredInstanceId?: string | null,
): string | null {
  assertWindows(windows);
  assertWorkspaceId(workspaceId);
  if (preferredInstanceId !== undefined && preferredInstanceId !== null) {
    assertInstanceId(preferredInstanceId);
    const preferred = windows.find(
      (windowState) =>
        windowState.instanceId === preferredInstanceId &&
        windowState.workspaceId === workspaceId &&
        windowState.open &&
        !windowState.minimized,
    );
    if (preferred) return preferred.instanceId;
  }
  return getNextActiveInstanceId(windows, workspaceId);
}
