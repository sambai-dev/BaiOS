// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import type { ProjectCaseStudy } from "./project-case-studies";

export const webProductStories: ProjectCaseStudy[] = [
  {
    slug: "rivet",
    title: "Rivet",
    eyebrow: "Construction operations · private workspace",
    tagline: "The right view of the work, for each role.",
    summary:
      "A construction workspace that gives managers practical task controls and directors a focused view of decisions, milestones, and programme risk.",
    stack: ["React", "TypeScript", "Vite", "Dexie", "Hono", "Cloudflare Workers", "PostgreSQL"],
    links: [{ label: "Visit Rivet", href: "https://rivet-workspace.vercel.app" }],
    sections: [
      {
        title: "Different jobs need different views",
        body:
          "A manager needs to update the task in front of them. A director needs to see what is slipping and which decisions cannot wait. I designed two views of the same construction records, so each person can focus on their part without maintaining a separate version of the project.",
      },
      {
        title: "Keep everyday work close",
        body:
          "I kept the manager's interface centered on updates they can make in the field, with task links and photo evidence beside the work. Milestones, approvals, and forecast consequences receive more attention in the director's view.",
      },
      {
        title: "Fast edits, reviewed consequences",
        body:
          "I used a local outbox for ordinary edits so they can save before connectivity returns. The server validates and acknowledges each change. Scheduling takes a separate path: calculate the consequences, review them, then apply them. Conflicts stay visible, and missing planning information stays missing.",
      },
    ],
    facts: [
      { label: "Access", value: "Private workspace" },
      { label: "Views", value: "Manager + director" },
      { label: "Field edits", value: "Local save + sync" },
    ],
  },
  {
    slug: "clearfold",
    title: "Clearfold",
    eyebrow: "Digital-asset operations · product preview",
    tagline: "Keep the evidence beside the decision.",
    summary:
      "A read-only workspace that connects digital-asset research with its source evidence and operating records. The public preview lets visitors explore the market interface.",
    stack: ["React", "TypeScript", "Vite", "Hono", "PostgreSQL"],
    links: [{ label: "View Clearfold", href: "https://clearfold.vercel.app" }],
    sections: [
      {
        title: "A chart is only part of the picture",
        body:
          "A market chart tells you where the price went. It does not tell you why someone made a decision or which evidence they used. I built Clearfold around that missing context, connecting research and source material to records that can be reviewed later.",
      },
      {
        title: "Make each source legible",
        body:
          "I gave the public preview a concrete path from a selected pool to observed candles and a practice ticket. Provider labels, refresh information, and simulation labels stay visible. The private workspace organizes versioned research, reconciliation work, and audit history.",
      },
      {
        title: "Read-only is a deliberate boundary",
        body:
          "I kept market data and assistant output separate from authoritative accounting. Versioned records and controlled state changes retain the evidence behind an action. The project remains a pre-production preview. It does not submit trades or withdrawals, and the public preview has no wallet-signing surface.",
      },
    ],
    facts: [
      { label: "Status", value: "Pre-production preview" },
      { label: "Operating model", value: "Read-only" },
      { label: "Workspace", value: "Authenticated access" },
    ],
  },
  {
    slug: "entangle",
    title: "Entangle",
    eyebrow: "Quantum research · interactive tool",
    tagline: "Understand what the result actually means.",
    summary:
      "A public research workstation for inspecting quantum evidence, exploring states, compiling small circuits, and comparing bounded simulations.",
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "OpenQASM", "QIR"],
    links: [{ label: "Open Entangle", href: "https://entangle-quantum.vercel.app" }],
    sections: [
      {
        title: "Different evidence should look different",
        body:
          "A hardware measurement and a local simulation can look equally convincing on a dashboard. I wanted the difference to be visible. Entangle puts the source, type of evidence, and limitations beside each claim, so readers can see what a number actually supports.",
      },
      {
        title: "Let the reasoning be inspected",
        body:
          "I connected an evidence atlas to a state lens, circuit compiler, and error-correction laboratory. Visitors can follow compilation stages, compare a seeded experiment with an exact reference, and export the assumptions with the result. Local outputs remain labeled as simulated.",
      },
      {
        title: "Reproducibility belongs in the model",
        body:
          "I separated deterministic scientific transforms from presentation. Identical source and target inputs produce the same compiler artifact and fingerprint. Simulation requests are recompiled and bounded on the server. The tool supports inspectable experiments, without presenting them as live quantum hardware or evidence of quantum advantage.",
      },
    ],
    facts: [
      { label: "Access", value: "Public research tool" },
      { label: "Workspaces", value: "Evidence · State · Circuit · QEC" },
      { label: "Execution", value: "Bounded simulation" },
    ],
  },
  {
    slug: "rentakl",
    title: "RentAKL",
    eyebrow: "Rental research · interactive demo",
    tagline: "Compare Auckland rentals with more context.",
    summary:
      "A map-first rental research demo that puts weekly rents, local benchmarks, location accuracy, and risk explanations beside the listing.",
    stack: ["Next.js", "TypeScript", "Supabase", "PostGIS", "TanStack Query", "MapLibre", "Node.js"],
    links: [{ label: "Explore RentAKL", href: "https://rentakl.vercel.app" }],
    sections: [
      {
        title: "A weekly price leaves questions open",
        body:
          "A weekly rent tells you the cost, but very little about how a listing compares. I built RentAKL to put that context beside the property: the local price range, the accuracy of its location, and details that deserve a closer look.",
      },
      {
        title: "Connect the map to the detail",
        body:
          "I paired a map-first dashboard with listing details, suburb and bedroom benchmarks, and deterministic risk explanations. Location precision stays visible. The public version demonstrates the workflow with sample listings, so it should be explored as a product demo rather than live rental inventory.",
      },
      {
        title: "Keep heavy work outside the request",
        body:
          "I separated ingestion from the Next.js interface, placing heavier parsing and extraction in a worker with shared schemas. I also reserved exact pins for address-level coordinates. A suburb-level source stays approximate instead of gaining false precision just because it appears on a map.",
      },
    ],
    facts: [
      { label: "Status", value: "Demo with sample listings" },
      { label: "Focus", value: "Auckland rentals" },
      { label: "Context", value: "Rent · location · risk signals" },
    ],
  },
];
