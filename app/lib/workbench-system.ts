export const workbenchAppIds = [
  "now",
  "stack",
  "method",
  "scratch",
  "console",
  "links",
  "pulse",
  "book",
  "sandbox",
  "agent",
  "lab",
  "railshift",
  "vector",
  "archive",
  "search",
  "control",
] as const;

export type WorkbenchAppId = (typeof workbenchAppIds)[number];

export const workspaceIds = ["build", "field", "notes"] as const;
export type WorkspaceId = (typeof workspaceIds)[number];

export const themeIds = ["cobalt", "oxide", "graphite"] as const;
export type WorkbenchThemeId = (typeof themeIds)[number];

export type WorkbenchAppDefinition = {
  id: WorkbenchAppId;
  label: string;
  shortcut: string;
  summary: string;
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
    label: "Build",
    description: "Company, systems, and the current shipping surface.",
  },
  {
    id: "field",
    label: "Field",
    description: "Interactive experiments and spatial tools.",
  },
  {
    id: "notes",
    label: "Notes",
    description: "Archive, working documents, and local scratch space.",
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
    description: "The original operational route light.",
    swatch: "#4c5ce5",
  },
  {
    id: "oxide",
    label: "Oxide",
    description: "A warmer field for late working sessions.",
    swatch: "#ba5b3f",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "A quieter neutral system with blue-white focus.",
    swatch: "#515963",
  },
];

export const workbenchApps: WorkbenchAppDefinition[] = [
  {
    id: "now",
    label: "Now",
    shortcut: "1",
    summary: "Current operating context.",
    keywords: ["current", "solynth", "trekky", "consulting"],
    supportsMultiple: false,
    defaultWidth: 395,
    defaultHeight: 335,
    defaultX: 24,
    defaultY: 20,
  },
  {
    id: "stack",
    label: "Stack",
    shortcut: "2",
    summary: "Production systems and tooling.",
    keywords: ["react", "next", "typescript", "cloudflare", "mobile"],
    supportsMultiple: false,
    defaultWidth: 400,
    defaultHeight: 355,
    defaultX: 434,
    defaultY: 20,
  },
  {
    id: "method",
    label: "Method",
    shortcut: "3",
    summary: "Clarify, shape, ship, and learn.",
    keywords: ["process", "product", "decision", "delivery"],
    supportsMultiple: false,
    defaultWidth: 395,
    defaultHeight: 205,
    defaultX: 24,
    defaultY: 400,
  },
  {
    id: "scratch",
    label: "Scratch",
    shortcut: "4",
    summary: "A local browser notebook.",
    keywords: ["note", "text", "idea", "draft"],
    supportsMultiple: true,
    defaultWidth: 395,
    defaultHeight: 205,
    defaultX: 434,
    defaultY: 400,
  },
  {
    id: "console",
    label: "Console",
    shortcut: "5",
    summary: "A command surface for the system.",
    keywords: ["terminal", "command", "help", "system"],
    supportsMultiple: false,
    defaultWidth: 400,
    defaultHeight: 205,
    defaultX: 850,
    defaultY: 400,
  },
  {
    id: "links",
    label: "Links",
    shortcut: "6",
    summary: "Company, product, and contact routes.",
    keywords: ["email", "github", "linkedin", "resume"],
    supportsMultiple: false,
    defaultWidth: 390,
    defaultHeight: 300,
    defaultX: 850,
    defaultY: 20,
  },
  {
    id: "pulse",
    label: "Pulse",
    shortcut: "P",
    summary: "A CoinGecko-powered 24-hour crypto market monitor.",
    keywords: ["crypto", "bitcoin", "ethereum", "price", "market", "coingecko"],
    supportsMultiple: false,
    defaultWidth: 760,
    defaultHeight: 460,
    defaultX: 250,
    defaultY: 40,
  },
  {
    id: "book",
    label: "Book",
    shortcut: "B",
    summary: "B2B scope estimator & consultation booking.",
    keywords: ["book", "consult", "scope", "estimate", "sprint", "retainer", "cal"],
    supportsMultiple: false,
    defaultWidth: 760,
    defaultHeight: 480,
    defaultX: 250,
    defaultY: 40,
  },
  {
    id: "sandbox",
    label: "Sandbox",
    shortcut: "S",
    summary: "Interactive systems teardown & case studies.",
    keywords: ["sandbox", "case study", "trekky", "solynth", "architecture", "telemetry", "metrics"],
    supportsMultiple: false,
    defaultWidth: 780,
    defaultHeight: 500,
    defaultX: 240,
    defaultY: 36,
  },
  {
    id: "agent",
    label: "Agent",
    shortcut: "A",
    summary: "AI workflow orchestrator & prompt-to-UI terminal.",
    keywords: ["ai", "agent", "workflow", "prompt", "llm", "tokens", "streaming"],
    supportsMultiple: false,
    defaultWidth: 760,
    defaultHeight: 480,
    defaultX: 250,
    defaultY: 50,
  },
  {
    id: "lab",
    label: "Subsurface",
    shortcut: "7",
    summary: "A live depth-control experiment.",
    keywords: ["game", "canvas", "depth", "sonar"],
    supportsMultiple: false,
    defaultWidth: 650,
    defaultHeight: 430,
    defaultX: 300,
    defaultY: 70,
  },
  {
    id: "railshift",
    label: "Railshift",
    shortcut: "R",
    summary: "A high-speed three-lane signal runner.",
    keywords: ["game", "runner", "rail", "arcade", "canvas", "score"],
    supportsMultiple: false,
    defaultWidth: 720,
    defaultHeight: 480,
    defaultX: 280,
    defaultY: 56,
  },
  {
    id: "vector",
    label: "Vector",
    shortcut: "8",
    summary: "A spatial vector calculator.",
    keywords: ["3d", "calculator", "math", "canvas"],
    supportsMultiple: true,
    defaultWidth: 720,
    defaultHeight: 450,
    defaultX: 265,
    defaultY: 48,
  },
  {
    id: "archive",
    label: "Archive",
    shortcut: "9",
    summary: "A writable local filesystem.",
    keywords: ["files", "folders", "notes", "documents", "local archive"],
    supportsMultiple: true,
    defaultWidth: 760,
    defaultHeight: 470,
    defaultX: 260,
    defaultY: 44,
  },
  {
    id: "search",
    label: "Search",
    shortcut: "d",
    summary: "Instant answers with save-to-Archive notes.",
    keywords: ["search", "lookup", "answers", "wikipedia", "ddg", "find"],
    supportsMultiple: false,
    defaultWidth: 640,
    defaultHeight: 470,
    defaultX: 310,
    defaultY: 50,
  },
  {
    id: "control",
    label: "Control",
    shortcut: "0",
    summary: "Theme, workspace, and session controls.",
    keywords: ["settings", "theme", "session", "workspace", "restore"],
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

export function getWorkbenchApp(id: WorkbenchAppId) {
  return workbenchApps.find((app) => app.id === id) ?? workbenchApps[0];
}

export function isWorkbenchAppId(value: unknown): value is WorkbenchAppId {
  return typeof value === "string" && workbenchAppIds.includes(value as WorkbenchAppId);
}

export function isWorkspaceId(value: unknown): value is WorkspaceId {
  return typeof value === "string" && workspaceIds.includes(value as WorkspaceId);
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
    createWindowInstance("now", "build", 3, 0, "build-now"),
    createWindowInstance("stack", "build", 5, 0, "build-stack"),
    createWindowInstance("console", "build", 4, 0, "build-console"),
    createWindowInstance("archive", "field", 3, 0, "field-archive"),
    createWindowInstance("vector", "field", 4, 0, "field-vector"),
    createWindowInstance("pulse", "field", 5, 0, "field-pulse"),
    createWindowInstance("archive", "notes", 3, 0, "notes-archive"),
    createWindowInstance("scratch", "notes", 4, 0, "notes-scratch"),
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
  const restoreBounds =
    candidate.restoreBounds && typeof candidate.restoreBounds === "object"
      ? {
          x: numberOr(candidate.restoreBounds.x, app.defaultX, -3_000, 3_000),
          y: numberOr(candidate.restoreBounds.y, app.defaultY, -3_000, 3_000),
          width: numberOr(candidate.restoreBounds.width, app.defaultWidth, 320, 3_000),
          height: numberOr(candidate.restoreBounds.height, app.defaultHeight, 190, 2_000),
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
    x: numberOr(candidate.x, app.defaultX, -3_000, 3_000),
    y: numberOr(candidate.y, app.defaultY, -3_000, 3_000),
    width: numberOr(candidate.width, app.defaultWidth, 320, 3_000),
    height: numberOr(candidate.height, app.defaultHeight, 190, 2_000),
    z: numberOr(candidate.z, 1, 1, 100_000),
    open: candidate.open !== false,
    minimized: candidate.minimized === true,
    maximized: candidate.maximized === true,
    snap: candidate.snap === "left" || candidate.snap === "right" ? candidate.snap : null,
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
