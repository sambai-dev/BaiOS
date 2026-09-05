// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

export type ProjectCaseStudy = {
  slug: string;
  title: string;
  eyebrow: string;
  tagline: string;
  summary: string;
  year?: string;
  stack: string[];
  links: { label: string; href: string }[];
  sections: { title: string; body: string }[];
  facts: { label: string; value: string }[];
  cover: string;
  coverAlt: string;
};

export const caseStudies: ProjectCaseStudy[] = [
  {
    slug: "rookhold",
    title: "Rookhold",
    eyebrow: "Execution infrastructure",
    tagline: "Run code. Set limits. Keep the evidence.",
    summary:
      "A bounded job runner for applications and AI agents that need to execute short scripts, follow their output, and retain a verifiable record of the result.",
    year: "2026",
    stack: ["Rust", "Tokio", "Axum", "SQLite", "gVisor", "Python", "TypeScript"],
    links: [
      { label: "Read the documentation", href: "https://rookhold.pages.dev/" },
      { label: "View source", href: "https://github.com/sambai-dev/rookhold" },
      { label: "Download a release", href: "https://github.com/sambai-dev/rookhold/releases/latest" },
      { label: "Explore the architecture", href: "https://github.com/sambai-dev/rookhold/blob/main/docs/architecture.md" },
    ],
    sections: [
      {
        title: "A small script still needs a boundary",
        body:
          "Generated code, user-defined transforms, and code evaluators share a practical problem: a short piece of source can consume resources, read files, or keep running indefinitely. Rookhold gives these jobs a separate execution path with server-controlled limits on time, memory, processes, files, and output.",
      },
      {
        title: "One job, from admission to result",
        body:
          "The Rust service connects scoped authentication, a bounded queue, fair scheduling, execution, and durable results. Python, Node, and Bash jobs expose live output and cancellation through the same API used by the CLI, SDKs, MCP adapter, and embedded dashboard. SQLite holds the job state and ordered event history, so a disconnected client can catch up.",
      },
      {
        title: "Evidence that travels with the job",
        body:
          "Finished jobs record the controls the executor actually observed. A receipt can be bound to a signed DSSE/in-toto statement using Ed25519, with an offline verifier for checking the exact bytes. A durable outbox separates saving a result from signing it, so a restart can resume unfinished attestation work.",
      },
      {
        title: "A deliberate scope",
        body:
          "The released system runs short, stateless jobs on one node. Guarded execution requires a configured Linux x86_64 service with gVisor and the documented host setup; the local development mode has no isolation boundary. Persistent workspaces, interactive terminals, and multi-node scheduling sit outside the current design.",
      },
    ],
    facts: [
      { label: "Release", value: "v0.8.0" },
      { label: "Job runtimes", value: "Python · Node · Bash" },
      { label: "Persistence", value: "SQLite + ordered events" },
      { label: "Evidence", value: "Signed execution receipts" },
    ],
    cover: "/portfolio-media/rookhold-interface.webp",
    coverAlt: "Rookhold v0.6 console demo showing the job queue, execution results, and service controls",
  },
  {
    slug: "portly",
    title: "Portly",
    eyebrow: "Developer tools",
    tagline: "Know what is running on localhost.",
    summary:
      "A terminal workspace that brings listening ports, host processes, Docker containers, health checks, and logs into one view.",
    year: "2026",
    stack: ["Rust", "Ratatui", "Crossterm", "Tokio", "sysinfo", "Bollard"],
    links: [
      { label: "View source", href: "https://github.com/sambai-dev/portly" },
      { label: "Download Portly", href: "https://github.com/sambai-dev/portly/releases/latest" },
      { label: "Explore the architecture", href: "https://github.com/sambai-dev/portly/blob/main/docs/ARCHITECTURE.md" },
    ],
    sections: [
      {
        title: "The answer was scattered across terminals",
        body:
          "Finding the owner of port 3000 is easy. Understanding its memory use, checking whether it responds, finding its logs, and noticing a related container takes more context switching. Portly joins that information around the service you are trying to inspect.",
      },
      {
        title: "Discover, inspect, act",
        body:
          "Host processes and Docker containers appear as first-class rows with ports, CPU trends, memory, and optional health checks. Keyboard and mouse controls support filtering, sorting, and log inspection. Process termination and container actions require an explicit second step; the process path also checks that the PID still owns the expected port before killing it.",
      },
      {
        title: "Keep a slow collector out of the way",
        body:
          "Independent collectors feed an Elm-style model and update loop, while rendering stays free of I/O. Each collector owns its rows, so a failed Docker request cannot erase host processes. Log messages carry a generation number, preventing an old follower from writing into a newly opened pane. A JSON snapshot mode makes the same discovery useful in scripts.",
      },
      {
        title: "Useful defaults, visible limits",
        body:
          "Portly ships binaries for Windows, macOS, and Linux. TCP listeners are its reliable core; UDP ownership varies by operating system. Health probes are opt-in plain HTTP checks against localhost. CPU cells remain blank until enough real samples exist, and stale data is marked instead of made to look current.",
      },
    ],
    facts: [
      { label: "Release", value: "v0.1.0" },
      { label: "Platforms", value: "Windows · macOS · Linux" },
      { label: "Interface", value: "Terminal + JSON snapshots" },
      { label: "Sources", value: "Host processes + Docker" },
    ],
    cover: "/portfolio-media/portly-interface.webp",
    coverAlt: "Portly terminal interface using the documented README example of local ports and processes",
  },
  {
    slug: "agentscope",
    title: "AgentScope",
    eyebrow: "Runtime observability",
    tagline: "See what an agent actually does.",
    summary:
      "A Rust and eBPF observability system that follows process execution, file access, and outbound connections, then surfaces policy violations in a live dashboard.",
    year: "2026",
    stack: ["Rust", "eBPF", "Aya", "Tokio", "Axum", "Server-Sent Events"],
    links: [
      { label: "View source", href: "https://github.com/sambai-dev/agentscope" },
      { label: "Download AgentScope", href: "https://github.com/sambai-dev/agentscope/releases/latest" },
      { label: "Read the threat model", href: "https://github.com/sambai-dev/agentscope/blob/main/docs/THREAT_MODEL.md" },
    ],
    sections: [
      {
        title: "Look beyond the agent's own logs",
        body:
          "An autonomous coding agent can install packages, read credentials, and contact remote hosts. Its application logs only describe what the process chooses to report. AgentScope explores another source of evidence: Linux kernel tracepoints for process execution, file opens, and outbound connections.",
      },
      {
        title: "Turn events into something an operator can read",
        body:
          "eBPF probes send bounded records through a ring buffer to a Rust collector. A declarative policy engine flags selected processes, secret paths, and network destinations. The embedded dashboard brings together a process tree, network map, file-access timeline, violations feed, and a live policy editor, with REST and Server-Sent Events exposing the same data.",
      },
      {
        title: "A reproducible path through the whole system",
        body:
          "A deterministic event simulator and replay command exercise collection, policy evaluation, and the dashboard without requiring a Linux kernel. This keeps the demonstration available on Windows and macOS and provides a repeatable way to test changes to detection rules.",
      },
      {
        title: "Observation before enforcement",
        body:
          "The current release detects and reports activity; it does not block syscalls. Real collection requires Linux, while other platforms use simulated events. History lives in memory, and the API has no built-in authentication, so it belongs on localhost or a trusted management network. Persistent storage, stronger attribution, and enforcement remain further work.",
      },
    ],
    facts: [
      { label: "Release", value: "v0.2.0" },
      { label: "Kernel signals", value: "Exec · file open · connect" },
      { label: "Mode", value: "Observe + alert" },
      { label: "Demo", value: "Deterministic event replay" },
    ],
    cover: "/portfolio-media/agentscope-interface.webp",
    coverAlt: "AgentScope v0.2.0 simulator demo showing its real process, network, and policy dashboard",
  },
  {
    slug: "trekky",
    title: "Trekky",
    eyebrow: "Solynth Labs · product",
    tagline: "Keep the whole job search together.",
    summary:
      "A job-search product connecting discovery, application preparation, tracking, and follow-ups across a shared workflow.",
    stack: ["Web app", "PWA", "MV3 extension", "Authenticated MCP", "Google sync"],
    links: [
      { label: "Visit Trekky", href: "https://trekky.app" },
      { label: "Visit Solynth Labs", href: "https://solynthlabs.com/" },
    ],
    sections: [
      {
        title: "Carry the context through the search",
        body:
          "Finding an opportunity is only one part of a job search. Preparation, contacts, interviews, and follow-ups create work of their own. Trekky connects these steps so the search can be managed as one continuing workflow.",
      },
      {
        title: "From discovery to preparation",
        body:
          "Job sources across New Zealand, Australia, the United States, and Singapore feed the discovery workflow. Duplicate handling and source history keep imported listings reviewable. AI apply kits help prepare application material, while the person applying reviews the output and makes the final submission.",
      },
      {
        title: "Stay with the work after applying",
        body:
          "Tracking, contacts, analytics, and follow-ups remain connected to the search. Google calendar sync brings interviews and reminders alongside tracked work. The product spans a web app, PWA, browser extension, and authenticated MCP access.",
      },
    ],
    facts: [
      { label: "Company", value: "Solynth Labs" },
      { label: "Workflow", value: "Discover → prepare → follow up" },
      { label: "Access", value: "Web · PWA · extension · MCP" },
      { label: "Final submission", value: "Always chosen by the user" },
    ],
    cover: "/portfolio-media/trekky-interface-light.webp",
    coverAlt: "Trekky light-theme sample dashboard with an empty sample board, from a historical product capture",
  },
  {
    slug: "baios",
    title: "BaiOS",
    eyebrow: "Design engineering",
    tagline: "A personal website you can work inside.",
    summary:
      "This portfolio opens into Workbench, a browser desktop with real windows, local files, useful tools, and playable experiments.",
    stack: ["Next.js", "React", "TypeScript", "Motion", "Canvas", "Browser storage"],
    links: [
      { label: "Open Workbench", href: "/?workspace=build&app=now" },
      { label: "View source", href: "https://github.com/sambai-dev/BaiOS" },
      { label: "Read the product notes", href: "https://github.com/sambai-dev/BaiOS/blob/main/PRODUCT.md" },
    ],
    sections: [
      {
        title: "Let the interface become the evidence",
        body:
          "BaiOS makes the portfolio itself a piece of working software. A visitor can read about the projects, then open a desktop and try the windowing, tools, and interactions directly. The Work, Playground, and Notes workspaces give each kind of activity a familiar place.",
      },
      {
        title: "A desktop with a working memory",
        body:
          "Windows can focus, drag, resize, snap, maximize, minimize, and restore. Notes and folders live in a local file system, and the session remembers window positions, app state, and appearance. Compact screens switch to one active window at a time while retaining the other tasks in the session.",
      },
      {
        title: "Treat saved work as part of the product",
        body:
          "Files and desktop state save together in a validated snapshot. Backup imports are checked before replacing saved work, and damaged data is preserved for recovery. When another tab changes the same session, the interface lets the visitor choose which version to keep.",
      },
      {
        title: "Make the boundary clear",
        body:
          "Desktop sessions and files stay in the current browser, without an account or remote sync. Market data, search, and the AI assistant use network-backed services and disclose that distinction. Games and visual tools pause their animation loops when inactive, and keyboard controls and reduced-motion behavior are built into the desktop.",
      },
    ],
    facts: [
      { label: "Workspaces", value: "Work · Playground · Notes" },
      { label: "Persistence", value: "Local to this browser" },
      { label: "Windowing", value: "Desktop + compact modes" },
      { label: "Recovery", value: "Validated backup + restore" },
    ],
    cover: "/portfolio-media/workbench-interface.webp",
    coverAlt: "The actual BaiOS Workbench desktop with its working applications and workspace navigation",
  },
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((project) => project.slug === slug);
}
