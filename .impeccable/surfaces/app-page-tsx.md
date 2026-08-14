---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/components/PortfolioShell.tsx","app/components/WorkbenchOS.tsx","app/components/SubsurfaceLab.tsx","app/components/VectorLab.tsx"]
---

## Scope and mode

- Surface: personal portfolio home at `/`.
- Mode: Experience, with a complete and fast B2B front door.

## Audience, job, action, and proof

- Primary audience: prospective software-consulting clients and collaborators evaluating Sam Bai.
- Job: understand Sam's current role and judgment quickly, then either visit Solynth Labs, contact Sam, or explore the personal Workbench.
- Primary action: visit Solynth Labs or email Sam about a project.
- Proof: Sam founded Solynth Labs, provides software consultation and production, operates Trekky.app, and exposes an authored interactive Workbench.

## Chosen direction

- Approved composition: `.impeccable/mocks/quiet-junction.png`.
- Visual world: Quiet Junction — a dark, type-led departure board with ivory text, cobalt route light, tiny operational metadata, and a live top-right Workbench aperture.
- Memorable moment: the Workbench aperture expands from the top-right into a full-screen personal operating system with movable windows and persistent local state.
- User override: omit Waka Eastern Bay and TaskFlow entirely; do not use a conventional project-card portfolio.

## Implementation inventory

| Comp ingredient | Implementation medium | Commitment |
| --- | --- | --- |
| Monumental two-line identity statement | Semantic HTML/CSS | Dominates the first viewport without becoming an image |
| Tiny identity and location metadata | Semantic HTML | Remains readable and truthful |
| Workbench live aperture | Real interactive React UI | Top-right, functional, opens with click or `W` |
| Full-screen Workbench OS | React state + semantic windows | Original typographic system, not a retro-Mac clone |
| Window manager | Pointer events + persisted React state | Drag, resize, minimize, maximize, close, raise, and tidy |
| Command palette | Searchable native controls | Open apps and run workspace actions with `/` |
| Console | Local command parser | `help`, app launch, layout, identity, and contact commands |
| Scratchpad | Native textarea + localStorage | Useful visitor-authored notes, explicitly local-only |
| Subsurface | Canvas + React game loop | Original depth-control mini-game with keyboard/pointer controls and local best score |
| Vector field | Canvas + native number inputs | Spatial calculator with live dot/cross results and drag-to-orbit projection |
| Carbon grain | Generated raster texture | Subtle and performance-safe |
| Cobalt route light | CSS layout rules and state styling | Indicates current module and interactive state |
| Public links | Native anchors | Solynth, email, GitHub, LinkedIn, résumé |
| Motion | Framer Motion + reduced-motion fallback | One spatial reveal tied to the Workbench |

## Responsive behavior

- Desktop preserves radical scale contrast and the live aperture.
- Mobile reduces the statement, keeps an explicit Workbench button, and turns the OS into a single active window with a horizontally scrollable app dock rather than compressing the desktop.

## Unresolved

- Personal music, reading, photography, and private artifacts remain omitted until Sam supplies them.
