// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import type { ProjectCaseStudy } from "./project-case-studies";

export const webProductStories: ProjectCaseStudy[] = [
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
