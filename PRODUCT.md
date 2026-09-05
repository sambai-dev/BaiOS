# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

This is a personal website. The primary audience is anyone curious how Sam Bai thinks and builds: peers, collaborators, and hiring teams evaluating judgment, range, and the ability to move from an unclear software question to working software. Visitors should be able to reach the résumé, GitHub, and LinkedIn, and optionally go deeper in the Workbench.

## Product Purpose

This personal portfolio helps people understand who Sam is, see how he thinks across product direction, design engineering, and production, and choose a clear next step: email Sam, visit Solynth Labs, or open his personal Workbench.

Success means the public surface communicates identity and current focus through the exact statement “Sam designs and builds software.” and the personal framing “A personal site: engineering thinking, design, and working experiments.” It provides direct routes to a conventional email address, Solynth Labs, and the optional Workbench. Trekky remains a deeper proof surface inside the Workbench rather than another competing message at arrival. The Workbench is evidence in itself: a functioning browser-based environment whose windowing, local files, tools, experiments, and recovery controls reveal how Sam thinks about software.

## Positioning

Sam is Founder & Product Engineer at Solynth Labs. He works across hands-on production: clarifying software decisions, shaping systems, building interfaces and workflows, and operating owned products. The personal portfolio shows the human judgment behind the work: engineering thinking, design skills, and working experiments, rather than duplicating the company site.

## Operating Context

- Personal engineering work and production through Solynth Labs.
- Product direction, software systems, AI workflows, design engineering, and production delivery.
- Working capability across React, Next.js, TypeScript, Node.js, PostgreSQL, Drizzle ORM, Supabase, Neon, Cloudflare, React Native, iOS, Android, and SaaS systems.
- Building and operating Trekky.app as a Solynth Labs product.
- The public portfolio intentionally avoids a conventional project-card list; Solynth Labs and Trekky are the current proof surfaces.
- Based in Hamilton, New Zealand, working through web products, prototypes, production systems, and direct client conversations.

## Workbench Product Model

Workbench is an optional browser desktop entered from the personal portfolio. Navigation follows familiar Linux desktop conventions: an Applications launcher, a taskbar containing running apps, a workspace switcher, and recognizable window controls. Desktop and Window menus use readable names. Overview shows open windows; Files stores local notes and folders; Settings controls appearance, workspace layout, sound, and backups.

Three local workspaces organize the environment:

- **Work:** About Sam, current projects, and ways to get in touch.
- **Playground:** Interactive experiments, games, and visual tools.
- **Notes:** Notes and folders saved in this browser.

Applications are named Welcome, Tech stack, How I work, Notes, Terminal, Contact & links, Market monitor, Project brief, Projects, AI assistant, Subsurface, Railshift, Vector lab, Files, Web search, and Settings. The launcher supplies concise descriptions and Work, Tools, and Labs categories. Internal app IDs, saved links, commands, and user data remain compatible with the earlier labels. Existing default window titles display the readable names; custom titles remain intact.

Projects documents supported facts about Trekky and Workbench and labels its motion demo as a simulation. Project brief helps compose an enquiry without inventing price, duration, capacity, or missing inputs. AI assistant identifies its model provider and marks generated output as not independently verified. Market monitor shows CoinGecko crypto prices in USD or NZD; Web search queries Wikipedia. Notes, Vector lab, and Files allow multiple instances. Other apps reopen or focus an existing saved instance in the current workspace.

Desktop windows support focus, drag, keyboard resize, minimize, close, maximize/restore, and left/right snap. Window overview shows every workspace. Focus one displays a selected window while minimizing others; Bring to front preserves the stack; Show all restores minimized windows. Search finds applications, saved windows, workspaces, local files, and commands. At compact widths, one active window is shown and the taskbar switches tasks.

Files supports folders, notes, editing, rename, trash, restore, and confirmed permanent deletion. Settings can download or restore a validated backup containing session and Files state, or restore window layout without replacing content. Project brief drafts, Vector lab drafts/view state, sound preference, and game scores use separate browser storage outside that backup. A fresh session opens Welcome in Work; Playground and Notes start empty. Existing saved sessions retain their state.

Session and Files data stay in this browser, with no account or remote sync. Market monitor, Web search, and AI assistant make network requests; copy must distinguish these requests from local persistence and must not imply that files or session state are uploaded.

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
- Résumé at `public/resume/SamBai_Resume.8aa80702.pdf`.
- Solynth Labs positioning and company facts: https://solynthlabs.com/#services.
- Approved visual composition: "Quiet Junction" (see DESIGN.md for tokens and component spec).
- Public-surface composition brief: `app/page.tsx` renders the sparse front door described in this document.

## Product Principles

1. Lead with identity and judgment, not a logo wall, project grid, or generic claims.
2. Make the public path immediately legible; make personality optional and discoverable.
3. Show software as manipulable systems, with interaction revealing how the work behaves.
4. Use progressive disclosure so a fast-moving visitor gets clarity and a curious expert finds depth.
5. Keep every claim and artifact truthful, and let specificity, not decoration, create personality.
6. Treat local data honestly: disclose its scope, provide backup and recovery, and never imply an account, remote storage, or sync for that data. Disclose network-backed tools separately.
7. Preserve each task across responsive modes; change the interaction model instead of shrinking desktop chrome until it fails.
