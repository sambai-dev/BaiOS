# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is prospective B2B software clients and collaborators evaluating Sam Bai's judgment, range, and ability to move from an unclear software question to a working product. Hiring teams and peers are a secondary audience and should still be able to reach the résumé, GitHub, and LinkedIn.

## Product Purpose

This personal portfolio helps people understand who Sam is, see how he thinks across product direction, design engineering, and production, and choose a clear next step: email Sam, visit Solynth Labs, or open his personal Workbench.

Success means the public surface communicates identity and current focus through the exact statement “Sam designs and builds software.” and the status “Open to B2B software projects.” It provides direct routes to a conventional email address, Solynth Labs, and the optional Workbench. Trekky remains a deeper proof surface inside the Workbench rather than another competing message at arrival. The Workbench is evidence in itself: a functioning browser-based environment whose windowing, local files, tools, experiments, and recovery controls reveal how Sam thinks about software.

## Positioning

Sam is Founder & Product Engineer at Solynth Labs. He works across consultation and hands-on production: clarifying software decisions, shaping systems, building interfaces and workflows, and operating owned products. The personal portfolio should show the human judgment behind Solynth rather than duplicate the company sales site.

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

The registry combines professional context, documented systems, a factual project-enquiry composer, local notes, original experiments, network-backed tools, Archive, and session controls. **Systems** documents only supported facts about Trekky and Workbench and labels its motion surface as a simulation. **Brief** helps a visitor compose an enquiry without inventing price, duration, capacity, or missing inputs. **Agent** discloses its configured network-backed model provider and labels completed generated output as not independently verified. Pulse is a CoinGecko-powered 24-hour crypto market monitor with USD and NZD views; Search queries Wikipedia through this site's server route. Scratch, Vector, and Archive support multiple simultaneous instances. Other registered surfaces reuse an existing saved instance in the current workspace; the same app may exist in another workspace. Desktop windows support focus, pointer drag, keyboard-accessible resize, minimize, close, maximize/restore, and left/right snap. Atlas shows every workspace and restores or focuses an open surface. App-aware Workbench, File, View, Window, and Go menus expose only meaningful actions for the current context, while system search finds apps, saved window instances including closed/reopenable ones, workspaces, Archive entries, and local commands.

Archive is writable within the current browser. Visitors can create folders and notes, edit and rename notes, move items to trash, restore them, and permanently delete them. The paired committed state preserves the selected theme, active workspace, window instances and geometry, open/minimized/maximized/snap state, serialized per-window data, scratch content, Method state, and Archive contents. Control can export that session-plus-Archive pair as a versioned JSON backup, validate and import a backup, or restore the active workspace's default window layout without replacing content. Brief drafts, Vector drafts/view state, sound preference, and local game scores use separate browser storage and are outside Control backup coverage. A fresh session starts in Build with one active Now window; Field and Notes have no open windows until the visitor opens one. A valid existing saved session persists instead of being replaced by that fresh default.

Workbench session and Archive data stay in this browser. There is no account, login, remote sync, or remote filesystem for that state; browser storage and user-triggered JSON backup/restore are its persistence mechanisms. Pulse, Search, and Agent use network-backed services. Product copy must distinguish those service requests from persistence and must never imply that Archive contents or session state are uploaded.

## Capabilities and Constraints

- Solynth Labs, Trekky, résumé, a conventional `mailto:` contact route, GitHub, and LinkedIn (`https://www.linkedin.com/in/sam-bai1/`) must remain reachable.
- The site is a Next.js single-page portfolio and must remain responsive, accessible, and fast.
- The public front door should stay sparse; deeper context belongs in the Workbench or direct links.
- No testimonials, client outcomes, revenue, benchmarks, or commercial claims may be invented.
- The Workbench may use verified professional objects such as current work, principles, notes, tools, links, and original interactive experiments.
- The cobalt, oxide, and graphite themes change the Workbench route/depth/signal palette while preserving carbon-and-ivory structure and content.
- At compact widths, the Workbench becomes a single-active-window environment. Inactive windows remain in session state but are hidden and removed from the interaction and accessibility trees until reactivated.
- Persisted data must remain bounded and validated. Import is size-limited, schema-checked, and applied atomically with the Archive state.
- Corrupt saved state must not be silently overwritten; the recovery path should preserve it until the visitor chooses a safe action.

## Interaction and Accessibility Commitments

- Core controls provide keyboard paths: menu bars use standard arrow-key movement; modal Atlas and system-search surfaces trap and restore focus; tabs and listboxes use roving selection; system search supports arrows, Home, End, Enter, and Escape. Arbitrary desktop window movement remains pointer-driven.
- Primary global keyboard shortcuts are F3 for Atlas, Ctrl/Cmd+K for system search, and Alt+1 through Alt+3 for workspaces. Escape closes the topmost transient surface or the Workbench when focus is not in a typing control. Apps are opened through semantic menu and dock controls; Shift-modified click or dock activation creates a new instance only where the registry allows it.
- Window resize grips use arrow keys in 12px steps and Shift+arrow in 32px steps. Maximize, restore, snapping, closing, and workspace switching remain available through semantic controls or menus.
- Archive supports keyboard traversal and file actions, including Home, End, Enter, F2, and Delete, with confirmation for destructive operations.
- Visible focus, semantic roles and labels, live status messages, error association, and reduced-motion behavior are part of the product contract.
- Subsurface starts only after visitor input and supports pointer/tap, Space, Arrow Up, and Enter. Its best score is local-only. In compact single-window mode, hiding its inactive window pauses the animation frame loop without discarding the model; reopening resumes that state.
- Railshift is an original three-lane signal runner with keyboard, swipe, and visible touch controls. Its fixed-step simulation, canvas rendering, sound opt-in, reduced-motion treatment, and local-only best score remain independent from the exported Workbench session. Its animation frame loop stops whenever the app or browser tab is inactive.
- Vector accepts editable decimal input drafts so empty and partial values remain typeable. It marks invalid or out-of-range axes with `aria-invalid`, reports a compact status, and calculates only when all six values are finite and within −3 to 3; otherwise result fields show `N/A`. Pointer drag and arrow keys can orbit the plot. Drafts and view state persist per Vector instance in separate browser storage and are not included in Control backups.

## Brand Commitments

- Name: Sam Bai.
- Current identity: Founder & Product Engineer, Solynth Labs.
- Location: Hamilton, New Zealand.
- Solynth Labs is the company layer; the portfolio is the personal perspective and body of evidence.
- The design should meet a senior portfolio craft bar while remaining specific to Sam.
- Workbench, Atlas, Archive, Control, the menu system, window chrome, and workspace language are original clean-room product vocabulary. Future work must not import third-party operating-system names, icons, or trade dress.
- The supplied references establish a craft bar for restrained typography, purposeful motion, direct manipulation, sparse chrome, and project-led hierarchy; they do not license copied product vocabulary or decoration.

## Evidence on Hand

- Public portfolio and Workbench implementation in `app/`.
- Workbench registry, session, window-manager, Archive, and backup behavior in `app/lib/`.
- Résumé at `public/resume/SamBai_Resume.d85c4735.pdf`.
- Solynth Labs positioning and company facts: https://solynthlabs.com/#services.
- Approved visual composition: "Quiet Junction" (see DESIGN.md for tokens and component spec).
- Public-surface composition brief: `app/page.tsx` renders the sparse front door described in this document.

## Product Principles

1. Lead with identity and judgment, not a logo wall, project grid, or generic claims.
2. Make the public path immediately legible; make personality optional and discoverable.
3. Show software as manipulable systems, with interaction revealing how the work behaves.
4. Use progressive disclosure so a fast-moving client gets clarity and a curious expert finds depth.
5. Keep every claim and artifact truthful, and let specificity, not decoration, create personality.
6. Treat local data honestly: disclose its scope, provide backup and recovery, and never imply an account, remote storage, or sync for that data. Disclose network-backed tools separately.
7. Preserve each task across responsive modes; change the interaction model instead of shrinking desktop chrome until it fails.
