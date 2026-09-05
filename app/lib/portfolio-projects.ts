// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import type { WorkbenchAppId } from "./workbench-identifiers";

export const portfolioProjects = [
  {
    id: "trekky", title: "Trekky", kind: "Job-search workspace", href: "/work/trekky", cover: "/portfolio-media/trekky-interface-light.webp",
    description: "A place to find jobs, prepare applications, and keep track of what comes next.",
    action: "Explore the project",
  },
  {
    id: "rookhold", title: "Rookhold", kind: "Bounded code execution", href: "/work/rookhold", cover: "/portfolio-media/rookhold-interface.webp",
    description: "Short-lived code execution with limits, live output, and receipts you can verify.",
    action: "Read the case study",
  },
  {
    id: "portly", title: "Portly", kind: "Local process manager", href: "/work/portly", cover: "/portfolio-media/portly-interface.webp",
    description: "See what is running on your machine. Ports, processes, and containers in one terminal.",
    action: "Read the case study",
  },
  {
    id: "agentscope", title: "AgentScope", kind: "Agent activity monitor", href: "/work/agentscope", cover: "/portfolio-media/agentscope-interface.webp",
    description: "A look at what AI coding agents actually do, from processes to network activity.",
    action: "Read the case study",
  },
  {
    id: "workbench", title: "BaiOS", kind: "Desktop in a browser", href: "/work/baios", cover: "/portfolio-media/workbench-interface.webp",
    description: "A desktop inside this website. Open a window, try a tool, make it yours.",
    action: "Read the case study",
  },
  {
    id: "subsurface", title: "Subsurface", kind: "Deep-sea expedition", appId: "lab", cover: "/portfolio-media/subsurface-final.webp",
    description: "Pilot a submarine through three underwater zones. Collect specimens, protect your hull, and find a way through.",
    action: "Play Subsurface",
  },
  {
    id: "railshift", title: "Railshift", kind: "Three-lane harbour runner", appId: "railshift", cover: "/portfolio-media/railshift-final.webp",
    description: "Outrun a dock warden, fly over the tracks, and collect gold through a changing 3D city.",
    action: "Play Railshift",
  },
  {
    id: "market", title: "Market monitor", kind: "Crypto prices & trends", appId: "pulse",
    description: "Explore price history, compare moving averages, and keep market sentiment in view.",
    action: "Open Market monitor",
  },
] as const satisfies ReadonlyArray<{
  id: string; title: string; kind: string; appId?: WorkbenchAppId; href?: string; cover?: string;
  description: string; action: string;
}>;

export type PortfolioProject = (typeof portfolioProjects)[number];

/** Screen-facing cards arranged along an ellipse, in local stage coordinates. */
export function getOrbitPosition(angle: number, width: number, height: number) {
  const narrow = width < 621;
  // A taller narrow-screen path gives all eight cards room without clipping
  // the sides. The desktop ellipse is round enough to keep its ends spacious.
  const radiusX = narrow ? width * 0.35 : Math.min(width * 0.34, 460);
  const radiusY = narrow ? Math.min(height * 0.405, 200) : Math.min(height * 0.30, 225);
  const tilt = narrow ? 0 : -0.22;
  const x = Math.cos(angle) * radiusX;
  const y = Math.sin(angle) * radiusY;
  return {
    x: x * Math.cos(tilt) - y * Math.sin(tilt),
    y: x * Math.sin(tilt) + y * Math.cos(tilt),
    // The cards face the viewer throughout their orbit; their size stays steady.
    scale: 0.94,
  };
}

type OrbitSample = ReturnType<typeof getOrbitPosition> & { distance: number };

export type OrbitPath = { length: number; samples: readonly OrbitSample[] };

/** Build once per size change, then sample by distance rather than angle. */
export function createOrbitPath(width: number, height: number): OrbitPath {
  const samples: OrbitSample[] = [];
  let length = 0;
  let previous = getOrbitPosition(0, Math.max(width, 1), Math.max(height, 1));
  samples.push({ ...previous, distance: 0 });
  for (let index = 1; index <= 720; index += 1) {
    const position = getOrbitPosition(index / 720 * Math.PI * 2, Math.max(width, 1), Math.max(height, 1));
    length += Math.hypot(position.x - previous.x, position.y - previous.y);
    samples.push({ ...position, distance: length });
    previous = position;
  }
  return { length, samples };
}

/** A normalized lap, with a unit tangent for direct manipulation. */
export function getOrbitPoint(path: OrbitPath, progress: number) {
  const distance = ((progress % 1 + 1) % 1) * path.length;
  let lower = 0;
  let upper = path.samples.length - 1;
  while (upper - lower > 1) {
    const middle = (lower + upper) >>> 1;
    if ((path.samples[middle]?.distance ?? 0) <= distance) lower = middle;
    else upper = middle;
  }
  const start = path.samples[lower];
  const end = path.samples[upper];
  if (!start || !end) return { x: 0, y: 0, scale: 0.94, tangentX: 1, tangentY: 0 };
  const segment = Math.max(end.distance - start.distance, Number.EPSILON);
  const fraction = (distance - start.distance) / segment;
  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
    scale: start.scale,
    tangentX: (end.x - start.x) / segment,
    tangentY: (end.y - start.y) / segment,
  };
}
