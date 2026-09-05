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
];
