"use client";

import { AnimatePresence, motion } from "framer-motion";
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
import SubsurfaceLab from "./SubsurfaceLab";
import VectorLab from "./VectorLab";

type AppId =
  | "now"
  | "stack"
  | "method"
  | "scratch"
  | "console"
  | "links"
  | "lab"
  | "vector";

type WindowState = {
  id: AppId;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
};

type WorkbenchOSProps = {
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  prefersReducedMotion: boolean;
  time: string;
};

type DragSession = {
  id: AppId;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type ResizeSession = {
  id: AppId;
  pointerId: number;
  startX: number;
  startY: number;
  originWidth: number;
  originHeight: number;
};

const appMeta: Array<{ id: AppId; label: string; shortcut: string }> = [
  { id: "now", label: "Now", shortcut: "1" },
  { id: "stack", label: "Stack", shortcut: "2" },
  { id: "method", label: "Method", shortcut: "3" },
  { id: "scratch", label: "Scratch", shortcut: "4" },
  { id: "console", label: "Console", shortcut: "5" },
  { id: "links", label: "Links", shortcut: "6" },
  { id: "lab", label: "Subsurface", shortcut: "7" },
  { id: "vector", label: "Vector", shortcut: "8" },
];

const defaultWindows: WindowState[] = [
  {
    id: "now",
    x: 28,
    y: 28,
    width: 410,
    height: 370,
    z: 3,
    open: true,
    minimized: false,
    maximized: false,
  },
  {
    id: "stack",
    x: 465,
    y: 42,
    width: 510,
    height: 400,
    z: 5,
    open: true,
    minimized: false,
    maximized: false,
  },
  {
    id: "method",
    x: 560,
    y: 255,
    width: 420,
    height: 315,
    z: 2,
    open: false,
    minimized: false,
    maximized: false,
  },
  {
    id: "scratch",
    x: 540,
    y: 245,
    width: 430,
    height: 300,
    z: 2,
    open: false,
    minimized: false,
    maximized: false,
  },
  {
    id: "console",
    x: 125,
    y: 375,
    width: 540,
    height: 210,
    z: 4,
    open: true,
    minimized: false,
    maximized: false,
  },
  {
    id: "links",
    x: 580,
    y: 145,
    width: 390,
    height: 300,
    z: 2,
    open: false,
    minimized: false,
    maximized: false,
  },
  {
    id: "lab",
    x: 360,
    y: 105,
    width: 650,
    height: 430,
    z: 6,
    open: false,
    minimized: false,
    maximized: false,
  },
  {
    id: "vector",
    x: 285,
    y: 82,
    width: 720,
    height: 450,
    z: 6,
    open: false,
    minimized: false,
    maximized: false,
  },
];

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

const storageKeys = {
  layout: "sam-workbench-layout-v1",
  scratch: "sam-workbench-scratch-v1",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fitWindowToBounds(item: WindowState, width: number, height: number) {
  const fittedWidth = clamp(item.width, 320, Math.max(320, width));
  const fittedHeight = clamp(item.height, 190, Math.max(190, height));
  return {
    ...item,
    width: fittedWidth,
    height: fittedHeight,
    x: clamp(item.x, 0, Math.max(0, width - fittedWidth)),
    y: clamp(item.y, 0, Math.max(0, height - fittedHeight)),
  };
}

function appLabel(id: AppId) {
  return appMeta.find((app) => app.id === id)?.label ?? id;
}

export default function WorkbenchOS({
  closeButtonRef,
  onClose,
  prefersReducedMotion,
  time,
}: WorkbenchOSProps) {
  const [windows, setWindows] = useState<WindowState[]>(defaultWindows);
  const [activeWindow, setActiveWindow] = useState<AppId>("stack");
  const [methodStep, setMethodStep] = useState<(typeof methodSteps)[number]["id"]>(
    "clarify",
  );
  const [scratch, setScratch] = useState("");
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleLines, setConsoleLines] = useState([
    "SAM WORKBENCH OS / SESSION READY",
    "Type help to inspect available commands.",
  ]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(0);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const commandButtonRef = useRef<HTMLButtonElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const paletteOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const methodTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dockButtonRefs = useRef<Partial<Record<AppId, HTMLButtonElement | null>>>({});
  const windowRefs = useRef<Partial<Record<AppId, HTMLElement | null>>>({});
  const dragSession = useRef<DragSession | null>(null);
  const resizeSession = useRef<ResizeSession | null>(null);
  const zCounter = useRef(10);

  useEffect(() => {
    window.requestAnimationFrame(() => overlayRef.current?.focus());
  }, []);

  useEffect(() => {
    try {
      const savedLayout = window.localStorage.getItem(storageKeys.layout);
      const savedScratch = window.localStorage.getItem(storageKeys.scratch);
      if (savedLayout) {
        const parsed = JSON.parse(savedLayout) as WindowState[];
        if (Array.isArray(parsed)) {
          const restoredWindows = defaultWindows.map((fallback) => {
            const saved = parsed.find((item) => item.id === fallback.id);
            if (!saved) return fallback;
            const restored = { ...fallback, ...saved, maximized: false };
            return window.innerWidth > 980
              ? fitWindowToBounds(
                  restored,
                  window.innerWidth,
                  Math.max(190, window.innerHeight - 130),
                )
              : restored;
          });
          zCounter.current = Math.max(10, ...restoredWindows.map((item) => item.z));
          setWindows(restoredWindows);
        }
      }
      if (savedScratch) setScratch(savedScratch);
    } catch {
      // Local state is optional; the default desktop remains fully functional.
    } finally {
      setHasLoadedLocalState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalState) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeys.layout, JSON.stringify(windows));
      } catch {
        // Persistence is a progressive enhancement.
      }
    }, 240);
    return () => window.clearTimeout(saveTimer);
  }, [hasLoadedLocalState, windows]);

  useEffect(() => {
    if (!hasLoadedLocalState) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeys.scratch, scratch);
      } catch {
        // Persistence is a progressive enhancement.
      }
    }, 240);
    return () => window.clearTimeout(saveTimer);
  }, [hasLoadedLocalState, scratch]);

  useEffect(() => {
    if (isPaletteOpen) {
      window.requestAnimationFrame(() => paletteInputRef.current?.focus());
    }
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

  useEffect(() => {
    if (!window.matchMedia("(max-width: 980px)").matches) return;
    window.requestAnimationFrame(() => {
      dockButtonRefs.current[activeWindow]?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }, [activeWindow, prefersReducedMotion]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const desktop = desktopRef.current;
      if (!desktop) return;
      const bounds = desktop.getBoundingClientRect();

      const resize = resizeSession.current;
      if (resize && resize.pointerId === event.pointerId) {
        event.preventDefault();
        setWindows((current) =>
          current.map((item) =>
            item.id === resize.id
              ? {
                  ...item,
                  width: clamp(
                    resize.originWidth + event.clientX - resize.startX,
                    320,
                    Math.max(320, bounds.width - item.x),
                  ),
                  height: clamp(
                    resize.originHeight + event.clientY - resize.startY,
                    190,
                    Math.max(190, bounds.height - item.y - 70),
                  ),
                }
              : item,
          ),
        );
        return;
      }

      const session = dragSession.current;
      if (!session || session.pointerId !== event.pointerId) return;
      setWindows((current) =>
        current.map((item) => {
          if (item.id !== session.id) return item;
          const nextX = session.originX + event.clientX - session.startX;
          const nextY = session.originY + event.clientY - session.startY;
          return {
            ...item,
            x: clamp(nextX, 0, Math.max(0, bounds.width - item.width)),
            y: clamp(nextY, 0, Math.max(0, bounds.height - item.height - 70)),
          };
        }),
      );
    };

    const handlePointerEnd = () => {
      dragSession.current = null;
      resizeSession.current = null;
      if (window.matchMedia("(max-width: 980px)").matches) return;
      window.requestAnimationFrame(() => {
        const desktop = desktopRef.current;
        if (!desktop) return;
        const bounds = desktop.getBoundingClientRect();
        const workHeight = Math.max(190, bounds.height - 70);
        setWindows((current) =>
          current.map((item) => {
            const element = windowRefs.current[item.id];
            if (!element || !item.open || item.minimized || item.maximized) return item;
            const rect = element.getBoundingClientRect();
            return fitWindowToBounds(
              { ...item, width: rect.width, height: rect.height },
              bounds.width,
              workHeight,
            );
          }),
        );
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, []);

  useEffect(() => {
    const handleViewportResize = () => {
      if (window.innerWidth <= 980) return;
      const desktop = desktopRef.current;
      const width = desktop?.clientWidth ?? window.innerWidth;
      const height = Math.max(
        190,
        (desktop?.clientHeight ?? window.innerHeight - 60) - 70,
      );
      setWindows((current) =>
        current.map((item) =>
          item.maximized ? item : fitWindowToBounds(item, width, height),
        ),
      );
    };
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  const focusWindow = useCallback((id: AppId) => {
    zCounter.current += 1;
    setActiveWindow(id);
    setWindows((current) =>
      current.map((item) =>
        item.id === id ? { ...item, z: zCounter.current } : item,
      ),
    );
  }, []);

  const openWindow = useCallback(
    (id: AppId, focusTarget?: "console") => {
      zCounter.current += 1;
      setActiveWindow(id);
      setWindows((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, open: true, minimized: false, z: zCounter.current }
            : item,
        ),
      );
      window.requestAnimationFrame(() => {
        windowRefs.current[id]?.focus();
        if (focusTarget === "console") consoleInputRef.current?.focus();
      });
    },
    [],
  );

  const findNextActive = useCallback((nextWindows: WindowState[]) => {
    const visible = nextWindows
      .filter((item) => item.open && !item.minimized)
      .sort((a, b) => b.z - a.z);
    if (visible[0]) setActiveWindow(visible[0].id);
  }, []);

  const minimizeWindow = useCallback(
    (id: AppId) => {
      setWindows((current) => {
        const next = current.map((item) =>
          item.id === id ? { ...item, minimized: true } : item,
        );
        findNextActive(next);
        return next;
      });
    },
    [findNextActive],
  );

  const closeWindow = useCallback(
    (id: AppId) => {
      setWindows((current) => {
        const next = current.map((item) =>
          item.id === id
            ? { ...item, open: false, minimized: false, maximized: false }
            : item,
        );
        findNextActive(next);
        return next;
      });
    },
    [findNextActive],
  );

  const toggleMaximize = useCallback((id: AppId) => {
    setWindows((current) =>
      current.map((item) =>
        item.id === id ? { ...item, maximized: !item.maximized } : item,
      ),
    );
    focusWindow(id);
  }, [focusWindow]);

  const tidyWindows = useCallback(() => {
    setWindows((current) =>
      current.map((item) => {
        const fallback = defaultWindows.find((windowState) => windowState.id === item.id);
        return fallback
          ? {
              ...item,
              x: fallback.x,
              y: fallback.y,
              width: fallback.width,
              height: fallback.height,
              maximized: false,
            }
          : item;
      }),
    );
  }, []);

  const closeAllWindows = useCallback(() => {
    setWindows((current) =>
      current.map((item) => ({
        ...item,
        open: false,
        minimized: false,
        maximized: false,
      })),
    );
  }, []);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, id: AppId) => {
      if (
        event.button !== 0 ||
        window.matchMedia("(max-width: 980px)").matches ||
        (event.target as HTMLElement).closest("button")
      ) {
        return;
      }
      const current = windows.find((item) => item.id === id);
      if (!current || current.maximized) return;
      dragSession.current = {
        id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: current.x,
        originY: current.y,
      };
      focusWindow(id);
      event.preventDefault();
    },
    [focusWindow, windows],
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, id: AppId) => {
      if (event.button !== 0 || window.matchMedia("(max-width: 980px)").matches) {
        return;
      }
      const current = windows.find((item) => item.id === id);
      if (!current || current.maximized) return;
      resizeSession.current = {
        id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originWidth: current.width,
        originHeight: current.height,
      };
      focusWindow(id);
      event.preventDefault();
      event.stopPropagation();
    },
    [focusWindow, windows],
  );

  const resizeWindowBy = useCallback((id: AppId, widthDelta: number, heightDelta: number) => {
    const desktop = desktopRef.current;
    if (!desktop) return;
    const bounds = desktop.getBoundingClientRect();
    setWindows((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              width: clamp(item.width + widthDelta, 320, Math.max(320, bounds.width - item.x)),
              height: clamp(
                item.height + heightDelta,
                190,
                Math.max(190, bounds.height - item.y - 70),
              ),
            }
          : item,
      ),
    );
  }, []);

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
      const directApp = appMeta.find(
        (app) => command === app.id || command === `open ${app.id}`,
      );
      if (directApp) {
        openWindow(directApp.id);
        response = `Opened ${directApp.label}.`;
      } else if (command === "help") {
        response = "open [app] · tidy · close all · whoami · contact · clear";
      } else if (command === "tidy") {
        tidyWindows();
        response = "Windows returned to their working positions.";
      } else if (command === "close all") {
        closeAllWindows();
        response = "Desktop cleared. The dock is still available.";
      } else if (command === "whoami") {
        response = "Sam Bai · founder/operator · Solynth Labs · Hamilton, New Zealand";
      } else if (command === "contact") {
        response = "sambai.codes@gmail.com · solynthlabs.com";
      }
      setConsoleLines((current) => [...current, `> ${rawCommand.trim()}`, response]);
      setConsoleInput("");
    },
    [closeAllWindows, openWindow, tidyWindows],
  );

  const paletteActions = useMemo(
    () => [
      ...appMeta.map((app) => ({
        id: `open-${app.id}`,
        label: `Open ${app.label}`,
        meta: `App · ${app.shortcut}`,
        run: () => openWindow(app.id, app.id === "console" ? "console" : undefined),
      })),
      {
        id: "tidy",
        label: "Tidy windows",
        meta: "Workspace",
        run: tidyWindows,
      },
      {
        id: "close-all",
        label: "Close all windows",
        meta: "Workspace",
        run: closeAllWindows,
      },
      {
        id: "return",
        label: "Return to portfolio",
        meta: "System · Esc",
        run: onClose,
      },
    ],
    [closeAllWindows, onClose, openWindow, tidyWindows],
  );

  const filteredPaletteActions = paletteActions.filter((action) =>
    `${action.label} ${action.meta}`.toLowerCase().includes(paletteQuery.toLowerCase()),
  );

  const openPalette = useCallback(() => {
    setPaletteActiveIndex(0);
    setIsPaletteOpen(true);
  }, []);

  const runPaletteAction = (action: (typeof paletteActions)[number]) => {
    action.run();
    setIsPaletteOpen(false);
    setPaletteQuery("");
    setPaletteActiveIndex(0);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        event.preventDefault();
        if (isPaletteOpen) {
          setIsPaletteOpen(false);
          setPaletteQuery("");
          window.requestAnimationFrame(() => commandButtonRef.current?.focus());
        } else {
          onClose();
        }
        return;
      }

      if (event.key === "Tab" && overlayRef.current) {
        const focusScope = isPaletteOpen
          ? overlayRef.current.querySelector<HTMLElement>(".os-palette")
          : overlayRef.current;
        if (!focusScope) return;
        const focusable = Array.from(
          focusScope.querySelectorAll<HTMLElement>(
            'a[href], input, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => !element.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      if (isTyping) return;

      if (event.key === "/") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        onClose();
        return;
      }

      const shortcutApp = appMeta.find((app) => app.shortcut === event.key);
      if (shortcutApp) {
        event.preventDefault();
        openWindow(shortcutApp.id);
        return;
      }

    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaletteOpen, onClose, openPalette, openWindow]);

  const renderApp = (id: AppId) => {
    if (id === "now") {
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
        </div>
      );
    }

    if (id === "stack") {
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
        </div>
      );
    }

    if (id === "method") {
      const activeStep = methodSteps.find((step) => step.id === methodStep) ?? methodSteps[0];
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
        setMethodStep(methodSteps[nextIndex].id);
        methodTabRefs.current[nextIndex]?.focus();
      };
      return (
        <div className="os-method">
          <div className="os-method-steps" role="tablist" aria-label="Product method">
            {methodSteps.map((step, index) => (
              <button
                key={step.id}
                ref={(element) => {
                  methodTabRefs.current[index] = element;
                }}
                id={`method-tab-${step.id}`}
                type="button"
                role="tab"
                aria-selected={methodStep === step.id}
                aria-controls={`method-panel-${step.id}`}
                tabIndex={methodStep === step.id ? 0 : -1}
                onClick={() => setMethodStep(step.id)}
                onKeyDown={(event) => handleMethodKeyDown(event, index)}
              >
                {step.label}
              </button>
            ))}
          </div>
          <motion.div
            className="os-method-detail"
            key={activeStep.id}
            id={`method-panel-${activeStep.id}`}
            role="tabpanel"
            aria-labelledby={`method-tab-${activeStep.id}`}
            tabIndex={0}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2>{activeStep.label}</h2>
            <p>{activeStep.text}</p>
          </motion.div>
        </div>
      );
    }

    if (id === "scratch") {
      return (
        <div className="os-scratch">
          <label htmlFor="workbench-scratch">Scratchpad</label>
          <textarea
            id="workbench-scratch"
            value={scratch}
            onChange={(event) => setScratch(event.target.value)}
            placeholder="Capture a thought, a question, or the next thing to build."
          />
          <p>Saved only in this browser.</p>
        </div>
      );
    }

    if (id === "lab") {
      return (
        <SubsurfaceLab
          isActive={activeWindow === "lab"}
          prefersReducedMotion={prefersReducedMotion}
        />
      );
    }

    if (id === "vector") {
      return <VectorLab />;
    }

    if (id === "console") {
      return (
        <div className="os-console">
          <div className="os-console-log" aria-live="polite">
            {consoleLines.length ? (
              consoleLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
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
            <label htmlFor="workbench-console">Command</label>
            <span aria-hidden="true">&gt;</span>
            <input
              ref={consoleInputRef}
              id="workbench-console"
              value={consoleInput}
              onChange={(event) => setConsoleInput(event.target.value)}
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
        </a>
        <a href="https://trekky.app" target="_blank" rel="noreferrer">
          <span>Product</span><strong>Trekky.app</strong>
        </a>
        <a href="mailto:sambai.codes@gmail.com">
          <span>Direct</span><strong>Email Sam</strong>
        </a>
        <a href="https://github.com/sambai-dev" target="_blank" rel="noreferrer">
          <span>Code</span><strong>GitHub</strong>
        </a>
        <a href="https://www.linkedin.com/in/sam-bai-dev/" target="_blank" rel="noreferrer">
          <span>Network</span><strong>LinkedIn</strong>
        </a>
      </nav>
    );
  };

  const visibleWindows = windows.filter((item) => item.open && !item.minimized);

  return (
    <motion.section
      ref={overlayRef}
      tabIndex={-1}
      className="workbench-os"
      role="dialog"
      aria-modal="true"
      aria-label="Sam's Workbench operating system"
      initial={
        prefersReducedMotion
          ? { opacity: 0 }
          : { clipPath: "circle(0vmax at calc(100% - 72px) 72px)" }
      }
      animate={
        prefersReducedMotion
          ? { opacity: 1 }
          : { clipPath: "circle(160vmax at calc(100% - 72px) 72px)" }
      }
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { clipPath: "circle(0vmax at calc(100% - 72px) 72px)" }
      }
      transition={{
        duration: prefersReducedMotion ? 0.15 : 0.72,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <header className="os-topbar">
        <div className="os-brand">
          <span className="os-mark">S/B</span>
          <span>Workbench OS</span>
          <span className="os-release">Build 01</span>
        </div>
        <div className="os-system-status">
          <span><span className="live-dot" aria-hidden="true" /> Layout saved locally</span>
          <span>Hamilton · {time}</span>
          <button ref={commandButtonRef} type="button" onClick={openPalette}>
            Command [/]
          </button>
          <button type="button" onClick={tidyWindows}>Tidy</button>
          <button ref={closeButtonRef} type="button" onClick={onClose}>
            Portfolio [Esc]
          </button>
        </div>
      </header>

      <div className="os-desktop" ref={desktopRef}>
        <div className="os-field-copy" aria-hidden="true">
          <span>SAM / PERSONAL SYSTEM</span>
          <strong>Build.<br />Ship.<br />Learn.</strong>
        </div>
        <span className="os-coordinate os-coordinate-top" aria-hidden="true">NZ / 37.7870 S</span>
        <span className="os-coordinate os-coordinate-bottom" aria-hidden="true">175.2793 E / LIVE</span>

        {!visibleWindows.length && (
          <div className="os-empty">
            <p>The desktop is clear.</p>
            <button type="button" onClick={() => openWindow("now")}>Open Now</button>
            <button type="button" onClick={openPalette}>Open command</button>
          </div>
        )}

        <AnimatePresence>
          {visibleWindows.map((windowState) => {
            const isActive = activeWindow === windowState.id;
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
                  windowRefs.current[windowState.id] = element;
                }}
                tabIndex={-1}
                className={`os-window${isActive ? " is-active" : ""}${
                  windowState.maximized ? " is-maximized" : ""
                }`}
                key={windowState.id}
                style={style}
                aria-label={`${appLabel(windowState.id)} window`}
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, scale: 0.96, clipPath: "inset(0 0 100% 0)" }
                }
                animate={{ opacity: 1, scale: 1, clipPath: "inset(0 0 0% 0)" }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                onPointerDown={() => focusWindow(windowState.id)}
              >
                <div
                  className="os-window-bar"
                  onPointerDown={(event) => startDrag(event, windowState.id)}
                  onDoubleClick={() => toggleMaximize(windowState.id)}
                >
                  <span>{appLabel(windowState.id)}</span>
                  <span className="os-window-state">{isActive ? "Active" : "Standby"}</span>
                  <div className="os-window-controls" onPointerDown={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => minimizeWindow(windowState.id)}>
                      Minimize
                    </button>
                    <button type="button" onClick={() => toggleMaximize(windowState.id)}>
                      {windowState.maximized ? "Restore" : "Maximize"}
                    </button>
                    <button type="button" onClick={() => closeWindow(windowState.id)}>
                      Close
                    </button>
                  </div>
                </div>
                <div className={`os-window-content os-app-${windowState.id}`}>
                  {renderApp(windowState.id)}
                </div>
                {!windowState.maximized && (
                  <button
                    type="button"
                    className="os-window-resize"
                    aria-label={`Resize ${appLabel(windowState.id)} window`}
                    onPointerDown={(event) => startResize(event, windowState.id)}
                    onKeyDown={(event) => {
                      const step = event.shiftKey ? 32 : 12;
                      if (event.key === "ArrowRight") resizeWindowBy(windowState.id, step, 0);
                      else if (event.key === "ArrowLeft") resizeWindowBy(windowState.id, -step, 0);
                      else if (event.key === "ArrowDown") resizeWindowBy(windowState.id, 0, step);
                      else if (event.key === "ArrowUp") resizeWindowBy(windowState.id, 0, -step);
                      else return;
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
            <span>Applications</span>
            <span>1–8</span>
          </div>
          {appMeta.map((app) => {
            const state = windows.find((item) => item.id === app.id);
            return (
              <button
                key={app.id}
                ref={(element) => {
                  dockButtonRefs.current[app.id] = element;
                }}
                type="button"
                className={activeWindow === app.id && state?.open && !state.minimized ? "is-active" : ""}
                aria-pressed={Boolean(state?.open && !state.minimized)}
                onClick={() => openWindow(app.id, app.id === "console" ? "console" : undefined)}
              >
                <span>{app.label}</span>
                <span>[{app.shortcut}]</span>
                <small>{state?.minimized ? "Minimized" : state?.open ? "Open" : "Closed"}</small>
              </button>
            );
          })}
        </nav>

        <AnimatePresence>
          {isPaletteOpen && (
            <motion.div
              className="os-palette-backdrop"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={(event) => {
                if (event.currentTarget === event.target) {
                  setIsPaletteOpen(false);
                  setPaletteQuery("");
                  window.requestAnimationFrame(() => commandButtonRef.current?.focus());
                }
              }}
            >
              <motion.section
                className="os-palette"
                role="dialog"
                aria-modal="true"
                aria-label="Workbench command palette"
                initial={prefersReducedMotion ? false : { opacity: 0, y: -14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="os-palette-search">
                  <label htmlFor="workbench-palette">Run a command</label>
                  <input
                    ref={paletteInputRef}
                    id="workbench-palette"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-controls="workbench-palette-results"
                    aria-activedescendant={
                      filteredPaletteActions[paletteActiveIndex]
                        ? `palette-option-${filteredPaletteActions[paletteActiveIndex].id}`
                        : undefined
                    }
                    value={paletteQuery}
                    onChange={(event) => {
                      setPaletteQuery(event.target.value);
                      setPaletteActiveIndex(0);
                    }}
                    onKeyDown={(event) => {
                      if (!filteredPaletteActions.length) return;
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setPaletteActiveIndex(
                          (current) => (current + 1) % filteredPaletteActions.length,
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
                    placeholder="Search apps and workspace actions"
                    autoComplete="off"
                  />
                  <span>Esc to close</span>
                </div>
                <div
                  className="os-palette-results"
                  id="workbench-palette-results"
                  role="listbox"
                  aria-label="Commands"
                >
                  {filteredPaletteActions.length ? (
                    filteredPaletteActions.map((action, index) => (
                      <button
                        key={action.id}
                        ref={(element) => {
                          paletteOptionRefs.current[index] = element;
                        }}
                        id={`palette-option-${action.id}`}
                        type="button"
                        role="option"
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
                    <p>No command matches “{paletteQuery}”.</p>
                  )}
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
