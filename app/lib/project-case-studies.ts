// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { webProductStories } from "./product-stories";

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
  cover?: string;
  coverAlt?: string;
};

export const caseStudies: ProjectCaseStudy[] = [
  ...webProductStories,
  {
    slug: "rookhold",
    title: "Rookhold",
    eyebrow: "Execution infrastructure",
    tagline: "Run code. Set limits. Keep the evidence.",
    summary:
      "I built Rookhold to run short scripts with resource limits, live output, and a verifiable record of the result.",
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
        title: "Put a boundary around each job",
        body:
          "A short script can still consume too much memory, read files, or keep running indefinitely. I built Rookhold around that problem: give generated code, user-defined transforms, and evaluators a separate execution path, with the server setting limits on time, memory, processes, files, and output.",
      },
      {
        title: "Keep the job history together",
        body:
          "I use one Rust service for scoped authentication, a bounded queue, fair scheduling, execution, and durable results. Python, Node, and Bash jobs share an API for live output and cancellation across the CLI, SDKs, MCP adapter, and dashboard. SQLite keeps the job state and ordered events, so a disconnected client can catch up without losing its place.",
      },
      {
        title: "Make the result checkable",
        body:
          "A completed job records the controls the executor actually observed. Its receipt can be bound to a signed DSSE/in-toto statement using Ed25519. I included an offline verifier to check the exact bytes. Saving the result and signing it are separate steps, with a durable outbox letting a restarted service finish pending attestation work.",
      },
      {
        title: "Keep execution narrowly scoped",
        body:
          "I kept the released system focused on short, stateless jobs on one node. That leaves persistent workspaces, interactive terminals, and multi-node scheduling outside its scope. Guarded execution requires Linux x86_64, gVisor, and the documented host setup. The local development mode has no isolation boundary.",
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
      "I built Portly to bring local ports, processes, Docker containers, health checks, and logs into one terminal view.",
    year: "2026",
    stack: ["Rust", "Ratatui", "Crossterm", "Tokio", "sysinfo", "Bollard"],
    links: [
      { label: "View source", href: "https://github.com/sambai-dev/portly" },
      { label: "Download Portly", href: "https://github.com/sambai-dev/portly/releases/latest" },
      { label: "Explore the architecture", href: "https://github.com/sambai-dev/portly/blob/main/docs/ARCHITECTURE.md" },
    ],
    sections: [
      {
        title: "A port number is only part of the answer",
        body:
          "Finding the process on port 3000 is straightforward. Checking its memory use, response, logs, and related container takes more digging. I put that information around the service being inspected, so the terminal can answer the next question as well as the first.",
      },
      {
        title: "Make actions deliberate",
        body:
          "Host processes and Docker containers have the same row structure: ports, CPU trends, memory, and optional health checks. Keyboard and mouse controls handle filtering, sorting, and logs. I require a second step before terminating a process or acting on a container. Before killing a process, Portly also checks that its PID still owns the expected port.",
      },
      {
        title: "Keep collection separate from rendering",
        body:
          "I separated the collectors from the Elm-style model and update loop, keeping I/O out of rendering. Each collector owns its rows, so a failed Docker request cannot erase host processes. Log messages carry a generation number to stop an old follower writing into a newly opened pane. The same discovery can also produce a JSON snapshot for scripts.",
      },
      {
        title: "Show what the system can actually tell us",
        body:
          "Portly ships binaries for Windows, macOS, and Linux. I focused on TCP listeners as the reliable core; UDP ownership varies by operating system. Health probes are opt-in plain HTTP checks against localhost. CPU cells stay blank until enough real samples exist, and stale data is labeled. This leaves some cells empty, but keeps the interface honest about what it knows.",
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
      "I built AgentScope to show what an agent executes, which files it opens, and where it connects, with policy alerts alongside the activity.",
    year: "2026",
    stack: ["Rust", "eBPF", "Aya", "Tokio", "Axum", "Server-Sent Events"],
    links: [
      { label: "View source", href: "https://github.com/sambai-dev/agentscope" },
      { label: "Download AgentScope", href: "https://github.com/sambai-dev/agentscope/releases/latest" },
      { label: "Read the threat model", href: "https://github.com/sambai-dev/agentscope/blob/main/docs/THREAT_MODEL.md" },
    ],
    sections: [
      {
        title: "Look beyond what the agent reports",
        body:
          "An autonomous coding agent can install packages, read credentials, and contact remote hosts. Its own logs only show what it reports. I use Linux kernel tracepoints to observe process execution, file opens, and outbound connections, giving AgentScope a source of evidence outside those application logs.",
      },
      {
        title: "Give the events enough context",
        body:
          "The eBPF probes send bounded records through a ring buffer to a Rust collector. I connect those records to a declarative policy engine that flags selected processes, secret paths, and network destinations. The dashboard combines a process tree, network map, file-access timeline, violations feed, and live policy editor. REST and Server-Sent Events expose the same data.",
      },
      {
        title: "Make a run repeatable",
        body:
          "I added a deterministic event simulator and replay command so collection, policy evaluation, and the dashboard can be exercised without a Linux kernel. Windows and macOS use that simulated path. Replaying the same events also provides a repeatable check when a detection rule changes.",
      },
      {
        title: "Observation before enforcement",
        body:
          "I kept this release focused on observation and alerts. It detects and reports activity but does not block syscalls. Real collection requires Linux; other platforms use simulated events. History lives in memory, and the API has no built-in authentication, so it belongs on localhost or a trusted management network. Persistent storage, stronger attribution, and enforcement remain further work.",
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
      "I build and operate Trekky to keep job discovery, application preparation, tracking, and follow-ups together around each role.",
    stack: ["Web app", "PWA", "MV3 extension", "Authenticated MCP", "Google sync"],
    links: [
      { label: "Visit Trekky", href: "https://trekky.app" },
      { label: "Visit Solynth Labs", href: "https://solynthlabs.com/" },
    ],
    sections: [
      {
        title: "Keep the work around the role",
        body:
          "A job search spreads across saved links, spreadsheets, inbox threads, calendar reminders, and versions of a résumé. I built Trekky around the role being pursued. Its stage, documents, contacts, interviews, and next action belong to the same workflow, from finding the opening through preparation and follow-up.",
      },
      {
        title: "Keep tracking responsive and records durable",
        body:
          "Protected Next.js pages load their starting data on the server, with MongoDB holding the records and SWR optimistic updates keeping day-to-day tracking responsive. I record a saved role and a submitted application as separate lifecycle events. That distinction matters: saving an interesting job should not count as applying for it in the outcome analytics.",
      },
      {
        title: "Search the dataset before the live sources",
        body:
          "I read from a cached job dataset before falling back to live sources. This reduces repeated upstream work, but a cached listing can lag behind its source. Discovery covers sources across New Zealand, Australia, the United States, and Singapore. Duplicate handling and source history keep imported listings reviewable.",
      },
      {
        title: "Preparation still needs a person's decision",
        body:
          "AI apply kits help prepare material for a specific role, but the person applying reviews the output and chooses the final submission. I keep that decision explicit. The web app is the core, with PWA, browser extension, Google calendar sync, and authenticated MCP integration paths. Their setup and availability vary; an integration in the codebase is not a promise that every account has it enabled.",
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
      "I built Workbench into this portfolio so visitors can try the windows, local files, tools, and experiments themselves.",
    stack: ["Next.js", "React", "TypeScript", "Motion", "Canvas", "Browser storage"],
    links: [
      { label: "Open Workbench", href: "/?workspace=build&app=now" },
      { label: "View source", href: "https://github.com/sambai-dev/BaiOS" },
      { label: "Read the product notes", href: "https://github.com/sambai-dev/BaiOS/blob/main/PRODUCT.md" },
    ],
    sections: [
      {
        title: "Let visitors try the interface",
        body:
          "I made the portfolio itself a piece of working software. The public page stays simple, while Workbench opens a desktop that visitors can use directly. Work, Playground, and Notes give projects, experiments, and personal writing their own places, with familiar controls for finding an app and moving between tasks.",
      },
      {
        title: "Keep the task when the layout changes",
        body:
          "Windows can focus, drag, resize, snap, maximize, minimize, and restore. I keep positions, app state, and appearance in the saved session, alongside local notes and folders. Compact screens show one active window at a time. The other tasks stay in the session, so adapting the layout does not discard the work.",
      },
      {
        title: "Make recovery part of saving",
        body:
          "I save Files and desktop state together in a validated snapshot. Backup imports are checked before replacing saved work, and damaged data is preserved for recovery. Two tabs can still disagree about the same session. When that happens, the interface asks which version to keep rather than silently choosing one.",
      },
      {
        title: "Keep local work local",
        body:
          "I keep desktop sessions and files in the current browser, without an account or remote sync. Moving that work to another browser needs an exported backup. Market data, search, and the AI assistant use separate network services and disclose that distinction. Games and visual tools pause when inactive, and the desktop includes keyboard controls and reduced-motion behavior.",
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
