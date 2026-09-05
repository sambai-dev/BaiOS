// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import {
  isWorkbenchAppId,
  isWorkspaceId,
  workspaceIds,
  type WorkbenchAppId,
  type WorkspaceId,
} from "./workbench-identifiers";

export {
  isWorkbenchAppId,
  isWorkspaceId,
  workbenchAppIds,
  workspaceIds,
  type WorkbenchAppId,
  type WorkspaceId,
} from "./workbench-identifiers";

export const themeIds = ["cobalt", "oxide", "graphite"] as const;
export type WorkbenchThemeId = (typeof themeIds)[number];

/** Allows persisted window positions across 8K and multi-display desktops. */
export const WORKBENCH_COORDINATE_LIMIT = 32_768;

export type WorkbenchAppDefinition = {
  id: WorkbenchAppId;
  label: string;
  summary: string;
  defaultWorkspaceId: WorkspaceId;
  keywords: string[];
  supportsMultiple: boolean;
  defaultWidth: number;
  defaultHeight: number;
  defaultX: number;
  defaultY: number;
};

export type WorkbenchWindow = {
  instanceId: string;
  appId: WorkbenchAppId;
  title: string;
  workspaceId: WorkspaceId;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  snap: "left" | "right" | null;
  restoreBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  data: Record<string, string>;
  createdAt: number;
};

export type WorkbenchSession = {
  version: 3;
  activeWorkspaceId: WorkspaceId;
  activeInstances: Record<WorkspaceId, string | null>;
  themeId: WorkbenchThemeId;
  windows: WorkbenchWindow[];
  scratch: string;
  methodStep: "clarify" | "shape" | "ship" | "learn";
  updatedAt: number;
};

export const workspaces: Array<{
  id: WorkspaceId;
  label: string;
  description: string;
}> = [
  {
    id: "build",
    label: "Work",
    description: "About Sam, current projects, and ways to get in touch.",
  },
  {
    id: "field",
    label: "Playground",
    description: "Games, interactive experiments, and tools to explore.",
  },
  {
    id: "notes",
    label: "Notes",
    description: "Notes, files, search, and personal tools.",
  },
];

export const workbenchThemes: Array<{
  id: WorkbenchThemeId;
  label: string;
  description: string;
  swatch: string;
}> = [
  {
    id: "cobalt",
    label: "Cobalt",
    description: "Blue desktop with green highlights.",
    swatch: "#4c5ce5",
  },
  {
    id: "oxide",
    label: "Oxide",
    description: "Warm orange desktop with amber highlights.",
    swatch: "#ba5b3f",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Grey desktop with pale blue highlights.",
    swatch: "#515963",
  },
];

export const workbenchApps: WorkbenchAppDefinition[] = [
  {
    id: "now",
    defaultWorkspaceId: "build",
    label: "Welcome",
    summary: "Meet Sam and explore what he is working on.",
    keywords: ["now", "about", "current", "solynth", "trekky", "consulting"],
    supportsMultiple: false,
    defaultWidth: 540,
    defaultHeight: 500,
    defaultX: 48,
    defaultY: 36,
  },
  {
    id: "stack",
    defaultWorkspaceId: "build",
    label: "Tech stack",
    summary: "The languages, frameworks, and tools Sam uses.",
    keywords: ["stack", "react", "next", "typescript", "cloudflare", "mobile"],
    supportsMultiple: false,
    defaultWidth: 400,
    defaultHeight: 355,
    defaultX: 434,
    defaultY: 20,
  },
  {
    id: "method",
    defaultWorkspaceId: "build",
    label: "How I work",
    summary: "How Sam takes an idea from first questions to delivery.",
    keywords: ["method", "process", "product", "decision", "delivery"],
    supportsMultiple: false,
    defaultWidth: 395,
    defaultHeight: 205,
    defaultX: 24,
    defaultY: 400,
  },
  {
    id: "scratch",
    defaultWorkspaceId: "notes",
    label: "Notes",
    summary: "Write a note saved in this browser.",
    keywords: ["scratch", "note", "text", "idea", "draft"],
    supportsMultiple: true,
    defaultWidth: 395,
    defaultHeight: 205,
    defaultX: 434,
    defaultY: 400,
  },
  {
    id: "console",
    defaultWorkspaceId: "notes",
    label: "Terminal",
    summary: "Use text commands to open apps and manage this desktop.",
    keywords: ["console", "terminal", "command", "help", "system"],
    supportsMultiple: false,
    defaultWidth: 400,
    defaultHeight: 205,
    defaultX: 850,
    defaultY: 400,
  },
  {
    id: "links",
    defaultWorkspaceId: "build",
    label: "Contact & links",
    summary: "Email Sam, view his résumé, or visit his work.",
    keywords: ["links", "email", "github", "linkedin", "resume"],
    supportsMultiple: false,
    defaultWidth: 390,
    defaultHeight: 300,
    defaultX: 850,
    defaultY: 20,
  },
  {
    id: "pulse",
    defaultWorkspaceId: "field",
    label: "Market monitor",
    summary: "Explore crypto prices, EMA trends, and market sentiment.",
    keywords: ["pulse", "crypto", "bitcoin", "ethereum", "price", "market", "coingecko", "ema", "fear", "greed", "coinmarketcap"],
    supportsMultiple: false,
    defaultWidth: 960,
    defaultHeight: 660,
    defaultX: 250,
    defaultY: 40,
  },
  {
    id: "book",
    defaultWorkspaceId: "build",
    label: "Project brief",
    summary: "Outline your project and prepare an email enquiry.",
    keywords: [
      "project brief",
      "brief",
      "book",
      "consult",
      "consultation",
      "scope",
      "enquiry",
      "contact",
      "service area",
      "product direction",
      "architecture",
      "ai workflow",
    ],
    supportsMultiple: false,
    defaultWidth: 760,
    defaultHeight: 480,
    defaultX: 250,
    defaultY: 40,
  },
  {
    id: "sandbox",
    defaultWorkspaceId: "build",
    label: "Projects",
    summary: "Explore Trekky, this desktop, and a motion simulation.",
    keywords: [
      "systems",
      "sandbox",
      "case study",
      "trekky",
      "workbench",
      "architecture",
      "motion",
      "simulation",
      "product",
    ],
    supportsMultiple: false,
    defaultWidth: 780,
    defaultHeight: 500,
    defaultX: 240,
    defaultY: 36,
  },
  {
    id: "agent",
    defaultWorkspaceId: "notes",
    label: "Ask about Sam",
    summary: "Ask about Sam's public background, projects, and working together.",
    keywords: [
      "agent",
      "ai",
      "model",
      "chat",
      "portfolio",
      "projects",
      "contact",
      "background",
    ],
    supportsMultiple: false,
    defaultWidth: 760,
    defaultHeight: 650,
    defaultX: 250,
    defaultY: 50,
  },
  {
    id: "lab",
    defaultWorkspaceId: "field",
    label: "Subsurface",
    summary: "Explore underwater zones, collect specimens, and protect your research sub.",
    keywords: ["game", "canvas", "depth", "sonar"],
    supportsMultiple: false,
    defaultWidth: 940,
    defaultHeight: 650,
    defaultX: 300,
    defaultY: 70,
  },
  {
    id: "railshift",
    defaultWorkspaceId: "field",
    label: "Railshift",
    summary: "Ride a 3D rail route, collect energy, and reach the next checkpoint.",
    keywords: ["game", "runner", "rail", "arcade", "canvas", "score"],
    supportsMultiple: false,
    defaultWidth: 980,
    defaultHeight: 670,
    defaultX: 280,
    defaultY: 56,
  },
  {
    id: "vector",
    defaultWorkspaceId: "field",
    label: "Vector lab",
    summary: "Solve hands-on 3D missions with forces, directions, and vector maths.",
    keywords: ["vector", "3d", "calculator", "math", "canvas"],
    supportsMultiple: true,
    defaultWidth: 1020,
    defaultHeight: 680,
    defaultX: 265,
    defaultY: 48,
  },
  {
    id: "archive",
    defaultWorkspaceId: "notes",
    label: "Files",
    summary: "Create and organize notes and folders in this browser.",
    keywords: ["archive", "files", "folders", "notes", "documents", "local archive"],
    supportsMultiple: true,
    defaultWidth: 760,
    defaultHeight: 470,
    defaultX: 260,
    defaultY: 44,
  },
  {
    id: "search",
    defaultWorkspaceId: "notes",
    label: "Web search",
    summary: "Search Wikipedia and save useful results to Files.",
    keywords: ["search", "lookup", "summary", "wikipedia", "archive", "find"],
    supportsMultiple: false,
    defaultWidth: 640,
    defaultHeight: 470,
    defaultX: 310,
    defaultY: 50,
  },
  {
    id: "control",
    defaultWorkspaceId: "notes",
    label: "Settings",
    summary: "Change the theme, manage workspaces, and back up your data.",
    keywords: ["control", "settings", "theme", "session", "workspace", "restore"],
    supportsMultiple: false,
    defaultWidth: 520,
    defaultHeight: 400,
    defaultX: 370,
    defaultY: 70,
  },
];

export const workbenchStorageKeys = {
  session: "sam-workbench-session-v3",
  legacyLayout: "sam-workbench-layout-v1",
  legacyScratch: "sam-workbench-scratch-v1",
} as const;

export function getWorkbenchApp(id: WorkbenchAppId): WorkbenchAppDefinition {
  const found = workbenchApps.find((app) => app.id === id);
  if (found) return found;
  // The static registry always has entries; guard instead of asserting so a
  // future empty-registry refactor fails loudly here rather than downstream.
  const fallback = workbenchApps.at(0);
  if (!fallback) throw new Error("workbenchApps registry must not be empty");
  return fallback;
}

export function isWorkbenchThemeId(value: unknown): value is WorkbenchThemeId {
  return typeof value === "string" && themeIds.includes(value as WorkbenchThemeId);
}

export function createWindowInstance(
  appId: WorkbenchAppId,
  workspaceId: WorkspaceId,
  z: number,
  sequence = 0,
  instanceId?: string,
): WorkbenchWindow {
  const app = getWorkbenchApp(appId);
  const cascade = sequence * 24;
  const uniquePart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const generatedId =
    instanceId ??
    `${appId}-${uniquePart}`;
  return {
    instanceId: generatedId,
    appId,
    title: sequence ? `${app.label} ${sequence + 1}` : app.label,
    workspaceId,
    x: app.defaultX + cascade,
    y: app.defaultY + cascade,
    width: app.defaultWidth,
    height: app.defaultHeight,
    z,
    open: true,
    minimized: false,
    maximized: false,
    snap: null,
    restoreBounds: null,
    data: {},
    createdAt: Date.now(),
  };
}

export function createDefaultWorkbenchSession(): WorkbenchSession {
  const now = Date.now();
  const windows: WorkbenchWindow[] = [
    createWindowInstance("now", "build", 1, 0, "build-now"),
  ];
  return {
    version: 3,
    activeWorkspaceId: "build",
    activeInstances: {
      build: "build-now",
      field: null,
      notes: null,
    },
    themeId: "cobalt",
    windows,
    scratch: "",
    methodStep: "clarify",
    updatedAt: now,
  };
}

function parseWindow(value: unknown): WorkbenchWindow | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WorkbenchWindow>;
  if (
    typeof candidate.instanceId !== "string" ||
    candidate.instanceId.trim().length === 0 ||
    candidate.instanceId.length > 160 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(candidate.instanceId) ||
    candidate.instanceId === "__proto__" ||
    candidate.instanceId === "constructor" ||
    candidate.instanceId === "prototype" ||
    !isWorkbenchAppId(candidate.appId) ||
    !isWorkspaceId(candidate.workspaceId) ||
    (candidate.title !== undefined &&
      (typeof candidate.title !== "string" ||
        candidate.title.length > 240 ||
        /[\u0000-\u001f\u007f]/.test(candidate.title))) ||
    (candidate.data !== undefined &&
      (!candidate.data ||
        typeof candidate.data !== "object" ||
        Array.isArray(candidate.data)))
  ) {
    return null;
  }
  const app = getWorkbenchApp(candidate.appId);
  const numberOr = (input: unknown, fallback: number, min: number, max: number) =>
    typeof input === "number" && Number.isFinite(input)
      ? Math.min(Math.max(input, min), max)
      : fallback;
  const maximized = candidate.maximized === true;
  const snap =
    !maximized && (candidate.snap === "left" || candidate.snap === "right")
      ? candidate.snap
      : null;
  const restoreBounds =
    candidate.restoreBounds && typeof candidate.restoreBounds === "object"
      ? {
          x: numberOr(
            candidate.restoreBounds.x,
            app.defaultX,
            -WORKBENCH_COORDINATE_LIMIT,
            WORKBENCH_COORDINATE_LIMIT,
          ),
          y: numberOr(
            candidate.restoreBounds.y,
            app.defaultY,
            -WORKBENCH_COORDINATE_LIMIT,
            WORKBENCH_COORDINATE_LIMIT,
          ),
          width: numberOr(candidate.restoreBounds.width, app.defaultWidth, 320, 3_000),
          height: numberOr(candidate.restoreBounds.height, app.defaultHeight, 190, 2_000),
        }
      : maximized || snap
        ? {
            x: app.defaultX,
            y: app.defaultY,
            width: app.defaultWidth,
            height: app.defaultHeight,
          }
        : null;
  const dataEntries = candidate.data ? Object.entries(candidate.data) : [];
  if (
    dataEntries.length > 30 ||
    dataEntries.some(
      ([key, item]) =>
        key.length === 0 ||
        key.length > 120 ||
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype" ||
        typeof item !== "string" ||
        item.length > 524_288,
    )
  ) {
    return null;
  }
  return {
    instanceId: candidate.instanceId,
    appId: candidate.appId,
    title: typeof candidate.title === "string" ? candidate.title : app.label,
    workspaceId: candidate.workspaceId,
    x: numberOr(
      candidate.x,
      app.defaultX,
      -WORKBENCH_COORDINATE_LIMIT,
      WORKBENCH_COORDINATE_LIMIT,
    ),
    y: numberOr(
      candidate.y,
      app.defaultY,
      -WORKBENCH_COORDINATE_LIMIT,
      WORKBENCH_COORDINATE_LIMIT,
    ),
    width: numberOr(candidate.width, app.defaultWidth, 320, 3_000),
    height: numberOr(candidate.height, app.defaultHeight, 190, 2_000),
    z: numberOr(candidate.z, 1, 1, 100_000),
    open: candidate.open !== false,
    minimized: candidate.minimized === true,
    maximized,
    snap,
    restoreBounds,
    data: Object.fromEntries(dataEntries) as Record<string, string>,
    createdAt: numberOr(candidate.createdAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
  };
}

export function parseWorkbenchSession(value: unknown): WorkbenchSession | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WorkbenchSession>;
  if (
    candidate.version !== 3 ||
    !Array.isArray(candidate.windows) ||
    candidate.windows.length > 60 ||
    (candidate.scratch !== undefined &&
      (typeof candidate.scratch !== "string" || candidate.scratch.length > 524_288))
  ) {
    return null;
  }
  const seenInstanceIds = new Set<string>();
  const windows: WorkbenchWindow[] = [];
  for (const windowValue of candidate.windows) {
    const parsedWindow = parseWindow(windowValue);
    if (!parsedWindow || seenInstanceIds.has(parsedWindow.instanceId)) return null;
    seenInstanceIds.add(parsedWindow.instanceId);
    windows.push(parsedWindow);
  }
  const activeWorkspaceId = isWorkspaceId(candidate.activeWorkspaceId)
    ? candidate.activeWorkspaceId
    : "build";
  const candidateActiveInstances =
    candidate.activeInstances && typeof candidate.activeInstances === "object"
      ? (candidate.activeInstances as Partial<Record<WorkspaceId, string | null>>)
      : ({} as Partial<Record<WorkspaceId, string | null>>);
  const activeInstances = Object.fromEntries(
    workspaceIds.map((workspaceId) => {
      const requested = candidateActiveInstances[workspaceId];
      const active =
        typeof requested === "string" &&
        windows.some(
          (item) =>
            item.instanceId === requested &&
            item.workspaceId === workspaceId &&
            item.open &&
            !item.minimized,
        )
          ? requested
          : windows
              .filter(
                (item) =>
                  item.workspaceId === workspaceId && item.open && !item.minimized,
              )
              .sort((a, b) => b.z - a.z)[0]?.instanceId ?? null;
      return [workspaceId, active];
    }),
  ) as Record<WorkspaceId, string | null>;
  return {
    version: 3,
    activeWorkspaceId,
    activeInstances,
    themeId: isWorkbenchThemeId(candidate.themeId) ? candidate.themeId : "cobalt",
    windows,
    scratch: typeof candidate.scratch === "string" ? candidate.scratch : "",
    methodStep:
      candidate.methodStep === "shape" ||
      candidate.methodStep === "ship" ||
      candidate.methodStep === "learn"
        ? candidate.methodStep
        : "clarify",
    updatedAt:
      typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt)
        ? candidate.updatedAt
        : Date.now(),
  };
}
