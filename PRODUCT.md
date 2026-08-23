# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is prospective B2B software clients and collaborators evaluating Sam Bai's judgment, range, and ability to move from an unclear software question to a working product. Hiring teams and peers are a secondary audience and should still be able to reach the résumé, GitHub, and LinkedIn without the portfolio presenting Sam primarily as a junior job seeker.

## Product Purpose

This personal portfolio helps people understand who Sam is, see how he thinks across product direction, design engineering, and production, and choose a clear next step: discuss a project, visit Solynth Labs, or explore his personal Workbench.

Success means the public surface communicates identity and current focus within one viewport through one personal statement, one availability signal, and direct routes to contact, Solynth Labs, and the optional Workbench. Trekky remains a deeper proof surface inside the Workbench rather than another competing message at arrival. The Workbench is evidence in itself: a functioning local environment whose windowing, files, tools, experiments, and recovery controls reveal how Sam thinks about software.

## Positioning

Sam is the founder of Solynth Labs Limited and works across consultation and hands-on production: clarifying software decisions, shaping systems, building interfaces and workflows, and operating owned products. The personal portfolio should show the human judgment behind Solynth rather than duplicate the company sales site.

## Operating Context

- B2B software consultation and production through Solynth Labs.
- Product direction, software systems, AI workflows, design engineering, and production delivery.
- Working capability across React, Next.js, TypeScript, Node.js, PostgreSQL, Drizzle ORM, Supabase, Neon, Cloudflare, React Native, iOS, Android, and SaaS systems.
- Building and operating Trekky.app as a Solynth Labs product.
- The public portfolio intentionally avoids a conventional project-card list; Solynth Labs and Trekky are the current proof surfaces.
- Based in Hamilton, New Zealand, working through web products, prototypes, production systems, and direct client conversations.

## Workbench Product Model

Workbench is an original, optional second-depth environment entered from the public portfolio. Its vocabulary is specific to this product: **Workbench** is the operating surface, **Atlas** maps open work across spaces, **Archive** is the writable local file system, and **Control** manages palette, workspace, session, and backup settings.

Three local workspaces organize the environment without pretending to be remote collaboration spaces:

- **Build:** company, systems, and the current shipping surface.
- **Field:** interactive experiments and spatial tools.
- **Notes:** Archive, working documents, and local scratch space.

The fifteen registered apps are Now, Stack, Method, Scratch, Console, Links, Pulse, Book, Sandbox, Agent, Subsurface, Railshift, Vector, Archive, and Control. Pulse is a CoinGecko-powered 24-hour crypto market monitor with USD and NZD views. Scratch, Vector, and Archive support multiple simultaneous instances; all other apps focus an existing instance when reopened. Desktop windows support focus, drag, resize, minimize, close, maximize/restore, and left/right snap. Atlas shows every workspace and restores or focuses an open surface. App-aware Workbench, File, View, Window, and Go menus expose only meaningful actions for the current context, while system search finds apps, open window instances, workspaces, Archive entries, and local commands.

Archive is writable within the current browser. Visitors can create folders and notes, edit and rename notes, move items to trash, restore them, and permanently delete them. The session preserves the selected theme, active workspace, window instances and geometry, open/minimized/maximized/snap state, per-window data, scratch content, Method state, and Archive contents. Control can export that state as a versioned JSON backup, validate and import a backup, or restore the default window layout.

The Workbench is entirely local to the current browser. It has no account, login, remote sync, filesystem service, or backend; browser-local state, IndexedDB mirroring, and user-triggered JSON backup/restore are the persistence mechanisms. Product copy must never imply that Archive contents or session state are uploaded.

## Capabilities and Constraints

- Solynth Labs, Trekky, résumé, email, GitHub, and LinkedIn must remain reachable.
- The site is a Next.js single-page portfolio and must remain responsive, accessible, and fast.
- The public front door should stay sparse; deeper context belongs in the Workbench or direct links.
- No testimonials, client outcomes, revenue, benchmarks, or commercial claims may be invented.
- The Workbench may use verified professional objects such as current work, principles, notes, tools, links, and original interactive experiments.
- The cobalt, oxide, and graphite themes change the Workbench route/depth/signal palette while preserving carbon-and-ivory structure and content.
- At compact widths, the Workbench becomes a single-active-window environment. Inactive windows remain in session state but are hidden and removed from the interaction and accessibility trees until reactivated.
- Persisted data must remain bounded and validated. Import is size-limited, schema-checked, and applied atomically with the Archive state.
- Corrupt saved state must not be silently overwritten; the recovery path should preserve it until the visitor chooses a safe action.

## Interaction and Accessibility Commitments

- Pointer interactions have keyboard equivalents: menu bars use standard arrow-key movement; dialogs trap and restore focus; tabs and listboxes use roving selection; system search supports arrows, Home, End, Enter, and Escape.
- Global shortcuts include F3 for Atlas, `/` for system search, Alt+1 through Alt+3 for workspaces, the numbered app shortcuts, and letter shortcuts (P, B, S, A, R). Shift plus an app shortcut creates a new instance only where the registry allows it.
- Window resize grips use arrow keys in 12px steps and Shift+arrow in 32px steps. Maximize, restore, snapping, closing, and workspace switching remain available through semantic controls or menus.
- Archive supports keyboard traversal and file actions, including Home, End, Enter, F2, and Delete, with confirmation for destructive operations.
- Visible focus, semantic roles and labels, live status messages, error association, and reduced-motion behavior are part of the product contract.
- Subsurface starts only after visitor input and supports pointer/tap, Space, Arrow Up, and Enter. Its best score is local-only. In compact single-window mode, hiding its inactive window pauses the animation frame loop without discarding the model; reopening resumes that state.
- Railshift is an original three-lane signal runner with keyboard, swipe, and visible touch controls. Its fixed-step simulation, canvas rendering, sound opt-in, reduced-motion treatment, and local-only best score remain independent from the exported Workbench session. Its animation frame loop stops whenever the app or browser tab is inactive.
- Vector accepts editable decimal input drafts so empty and partial values remain typeable. It marks invalid or out-of-range axes with `aria-invalid`, reports a compact status, and calculates only when all six values are finite and within −3 to 3; otherwise result fields show em dashes. Drag-to-orbit remains a direct-manipulation enhancement, not the only way to use the calculator.

## Brand Commitments

- Name: Sam Bai.
- Current identity: founder/operator of Solynth Labs and B2B software consultant/producer.
- Location: Hamilton, New Zealand.
- Solynth Labs is the company layer; the portfolio is the personal perspective and body of evidence.
- The design should meet a senior portfolio craft bar while remaining specific to Sam.
- Workbench, Atlas, Archive, Control, the menu system, window chrome, and workspace language are original clean-room product vocabulary. Future work must not import third-party operating-system names, icons, or trade dress.
- The supplied references establish a craft bar for restrained typography, purposeful motion, direct manipulation, sparse chrome, and project-led hierarchy; they do not license copied product vocabulary or decoration.

## Evidence on Hand

- Public portfolio and Workbench implementation in `app/`.
- Workbench registry, session, window-manager, Archive, and backup behavior in `app/lib/`.
- Résumé at `public/resume/SamBai_Resume.pdf`.
- Solynth Labs positioning and company facts: https://solynthlabs.com/#services.
- Approved visual composition at `.impeccable/mocks/quiet-junction.png`.
- Public-surface composition brief at `.impeccable/surfaces/app-page-tsx.md`.

## Product Principles

1. Lead with identity and judgment, not a logo wall, project grid, or generic claims.
2. Make the public path immediately legible; make personality optional and discoverable.
3. Show software as manipulable systems, with interaction revealing how the work behaves.
4. Use progressive disclosure so a fast-moving client gets clarity and a curious expert finds depth.
5. Keep every claim and artifact truthful, and let specificity—not decoration—create personality.
6. Treat local data honestly: disclose its scope, provide backup and recovery, and never imply an account or remote service.
7. Preserve each task across responsive modes; change the interaction model instead of shrinking desktop chrome until it fails.
