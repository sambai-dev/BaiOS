# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

This is Sam Bai's personal website. Peers, collaborators, and hiring teams use it to understand what Sam builds, how he thinks, and how the software behaves. A visitor can browse real projects, read a case study, try a game or tool, open the Workbench, or go straight to contact details.

## Product Purpose

The portfolio introduces Sam's product design and engineering work. The minimal homepage gives his identity, a large headline, and direct links. The public project directory leads to real products and first-person notes explaining the problem, implementation choices, and limits, with actual interface evidence where available. The optional Workbench lets visitors use tools, games, and experiments directly.

The homepage leads with typography, space, and plain language. Charcoal, ivory, cobalt, and clear controls connect it to the project pages and the more playful browser desktop.

## Identity and Positioning

- Sam Bai, Founder & Product Engineer at Solynth Labs.
- Based in Hamilton, New Zealand.
- Builds and operates Trekky.app through Solynth Labs.
- Works across product direction, interface design, software systems, AI workflows, and production engineering.
- The personal portfolio shows Sam's work and judgment; Solynth Labs remains the company destination.

The writing uses a direct personal voice and specific descriptions. Headings, labels, and introductions evolve with the design and the work being presented.

## Public Homepage

The headline is “Sam designs and builds software.” The identity header gives Sam's name, Founder & Product Engineer role at Solynth Labs, Hamilton location, and New Zealand time. Hamilton coordinates appear beneath the headline.

The footer contains Selected work, Direct, and Elsewhere. Selected work replaces the generic Site description with a direct website link to Trekky plus All projects at `/work`. Direct links to Sam's email, Solynth Labs, and Open Workbench. Elsewhere links to GitHub, BaiOS Source, LinkedIn, and Résumé. The original giant headline remains unchanged; the headline and footer adapt to small screens.

Workbench remains available through the compact header tab and the Open Workbench footer link. Games, Market monitor, Vector lab, and the other desktop applications remain available through Workbench.

The orbit component, its data, and original cartridge artwork remain in the repository but are not rendered on the homepage. Gameplay previews come from the implemented games. The supplied Clone was an interaction reference; its downloaded imagery, films, logos, fonts, and project identities are not portfolio content.

Personal Notes and visitor-created files remain local Workbench content.

## Project Pages

The plain public directory at `/work` groups Products & web apps (Trekky, Entangle, and RentAKL) and Open-source tools (Rookhold, Portly, and AgentScope). Entangle is a research tool, and RentAKL is a demo using sample listings. Visitors can open each website directly or read its project notes.

Seven public case pages describe those six projects and BaiOS. Entangle and RentAKL join the five existing pages. Their content lives in `app/lib/project-case-studies.ts` and `app/lib/product-stories.ts` and renders through `app/work/[slug]/page.tsx`. Each page has a clear title and purpose, source-backed project details, useful links, and routes back to the portfolio and Workbench. The All projects link in each case-page header returns to `/work`.

First-person notes explain why Sam built each project, how it works, and the engineering decisions and tradeoffs in human language without em dashes. The two new pages are text-only and do not use invented interface images. Repository links are provided only for public source; private repositories are not linked.

Trekky's page uses light ivory surfaces and a genuine earlier light-theme sample dashboard, labeled as an empty sample board. Other project pages remain dark while sharing the same typography and controls.

Interface images distinguish an actual capture, a documented example, and a simulated demo. For example, AgentScope's simulator is identified as a simulator, Portly's README example is labeled, and an older Rookhold console screenshot retains its version caption. A screenshot is not presented as evidence of a newer release's complete interface. Full-size image links make dense interface evidence inspectable on small screens.

Project claims stay within the documented implementation. Rookhold's guarded Linux execution is distinct from its unisolated development mode. AgentScope observes and reports activity rather than blocking it. Demo events, sample data, current release facts, and future work remain clearly separated. No testimonials, client outcomes, revenue, benchmark results, or commercial commitments are invented.

## Workbench Product Model

Workbench is an optional browser desktop. Familiar desktop conventions organize the experience: an Applications launcher, a taskbar of running apps, workspace switching, recognizable window controls, Desktop and Window menus, Overview, Search, and Back to site.

Three workspaces organize applications:

- **Work:** About Sam, current projects, technical background, process, and contact.
- **Playground:** Subsurface, Railshift, Vector lab, and Market monitor.
- **Notes:** Notes, Files, Terminal, Web search, Ask about Sam, and Settings.

The app registry assigns each app a home workspace. Applications uses All, Work, Playground, and Notes categories. Launching through the launcher, shortcuts, Files, or a shared link opens or focuses the app in its assigned workspace. An app link takes precedence over a conflicting workspace parameter. Restored windows are organized into their app's workspace while retaining IDs, content, geometry, and open or minimized state. The active window follows its move; an empty selected workspace stays selected.

Visible app names are Welcome, Tech stack, How I work, Notes, Terminal, Contact & links, Market monitor, Project brief, Projects, Ask about Sam, Subsurface, Railshift, Vector lab, Files, Web search, and Settings. Internal IDs and commands remain compatible with saved sessions and earlier links. Custom window and file names remain visitor-owned.

Desktop windows support focus, dragging, resizing, minimizing, closing, maximizing, restoring, and snapping. Overview shows open windows across workspaces. Focus one minimizes siblings; Bring to front preserves them; Show all restores minimized windows. At compact widths, one active window is visible and the taskbar switches tasks. Open inactive apps remain in the session and outside the interaction and accessibility trees until reactivated.

Projects inside the Workbench provides interactive Trekky and BaiOS details plus a labeled spring simulation, with an All projects link to the public directory. Project brief helps prepare an email enquiry without inventing a quote or delivery schedule. Market monitor uses CoinGecko for its eight-asset watchlist and timestamped 24-hour, 7-day, and 30-day charts in USD or NZD. EMA 20 and EMA 50 overlays use the actual sample cadence, with a visible explanation, pointer inspection, and keyboard-accessible history slider. Its Fear & Greed panel reads the genuine CoinMarketCap index through the documented keyless public API. Each provider has its own source timestamp and honest cached or unavailable state; automatic refresh runs only while the app and browser tab are visible. Web search uses Wikipedia and can save attributed results to Files. Ask about Sam helps visitors learn about Sam's public profile and projects through approved, surface-level summaries. It sends only the current question to OpenRouter and NVIDIA; earlier turns are not resent.

Ask about Sam keeps up to five question-and-answer turns in memory. Suggested questions make its scope clear, Stop cancels the browser request, and Clear conversation removes the visible turns. Chat content is not written to browser storage, Files, or Settings backups. The internal app ID remains `agent` so existing links and sessions keep working.

The model classifies a question into one to three approved topic IDs using strict JSON. The server validates those IDs and supplies fixed public summaries; the model does not write the answer shown to the visitor. The chat does not load source code, README architecture details, private GitHub repositories, or internal documents. It cannot browse, follow links, call tools, or perform actions. Replies use plain text and approved content, with no model-provided HTML or arbitrary links. Unsupported questions receive a short explanation of the chat's scope.

Questions are sent to OpenRouter and the NVIDIA model provider, whose data policies apply. The interface asks visitors to leave out passwords and confidential information. The chat has no account or password store and uses no private GitHub token. The server does not log questions or upstream error bodies. Clear and Stop do not retract information already sent to a provider.

## Games and Vector Lab

**Railshift** is an original Three.js runner through a dense metropolitan skyline. Each 3,000 m route spends ten of twelve checkpoint stretches downtown, with short waterfront and amusement-park excursions. The Ferris wheel appears only in the park; a whale breaches briefly on alternating waterfront visits. The HUD names the current district. A modeled dock warden pursues the opening run. Visitors change lanes, jump barriers, slide under signs, collect rows of gold coins, and build streaks. Rocket backpacks automatically launch 5.5 seconds of horizontal flight, with smooth lift-off, landing, and brief touchdown protection. Six-second magnets pull nearby coins along visible low curves, including adjacent lanes; ground coin rows stay fixed during flight. Shields absorb a hit and collected coins charge manual Overdrive, whose charge is preserved while flying. Two lives, checkpoints, clear equipment timers, and an explicit restart explain the rules. The shaped surf-style hoverboard banks through lane changes, with staggered grip pads and a raised nose and tail. A planted-foot leg rig lets the knees absorb motion while the torso and arms balance through turns and landings. Jumps trigger a kickflip: the rider tucks their legs as the deck rotates underneath, then catches it before touchdown. Down triggers a fast, deep crouch: the hips sink, chest folds forward, and arms tuck in while the feet remain planted. Reduced motion keeps the board level. Articulated poses blend smoothly without delaying collision controls. Layered mountain ridges and foothills create depth beyond the city. Keyboard, swipe, and labeled touch controls remain available. Sound is opt-in. Best score and distance stay in browser storage outside the Workbench backup.

**Subsurface** is an original 3D underwater research game across three zones. Visitors control rise and dive, navigate channels, collect amber specimens, and use sonar while managing hull and protection. Start, Pause, Resume, and results are explicit. Keyboard and touch controls provide the same actions. Best score stays in browser storage outside the Workbench backup. If WebGL is unavailable, a 2D renderer preserves the same simulation and controls.

**Vector lab** teaches through Dock, Thrust, and Lift missions, followed by free Explore mode. Visitors move vectors through coordinates, keyboard-accessible handles, and dragging; compare addition, projection, angle, and cross product; then send a probe to test the result. Target feedback and explanations connect the mathematics to a visible outcome. The Three.js scene supports camera orbit, while calculations and mission checks remain usable without WebGL.

Game simulations run only after a visitor starts them and pause when the application or page becomes inactive. Resume preserves the current in-memory run. The 3D renderers bound resolution and release resources when no longer needed. Reduced motion removes nonessential movement; Vector test flights resolve directly when reduced motion is requested. A browser unable to start Railshift's 3D view receives a clear explanation.

## Local Data and Recovery

Session and Files data stay in this browser, without an account or remote sync. Files supports folders, notes, editing, renaming, trash, restoring, and confirmed permanent deletion. Settings can download or restore a validated backup containing session and Files state, or restore the window layout without replacing content.

Notes, Vector lab, and Files support multiple instances. Closed windows retain serialized content and geometry for reopening. A fresh session opens Welcome in Work, while Playground and Notes begin empty. The saved window registry is bounded at 60 instances.

Session and Files are validated and saved together. Imports are size-limited and schema-checked before replacement. Corrupt saved data is preserved for recovery, and competing edits from another tab have an explicit resolution path.

Backup coverage is specific: it includes workspace/session state and Files. Project brief drafts, Vector's per-instance vectors, view and mission progress, sound preference, game records, and transient component state have separate lifecycles. In-progress games and temporary interface state are not promised to survive a reload or appear in the backup.

Market monitor, Web search, and Ask about Sam make network requests. Their service use does not imply that local files or desktop sessions are uploaded. Ask about Sam sends only the submitted question to OpenRouter and the model provider, and retains no saved chat history. Provider, source, cached-data, estimate, and generated-output labels describe what actually happened.

## Interaction and Accessibility

- The homepage has a semantic headline, labeled navigation, visible focus, and a skip link to the footer links. Responsive text keeps the page readable on small screens.
- The compact Workbench tab expands on hover or keyboard focus. Its separator aligns with the fixed header rule. Opening and returning use the anchored status dot; focus returns after the public page becomes interactive.
- Desktop menus support arrow keys. Overview and search manage modal focus and restore it on close. Search supports arrows, Home, End, Enter, and Escape.
- F3 opens Overview, Ctrl/Cmd+K opens search, and Alt+1 through Alt+3 switch workspaces. Escape closes the top transient surface or Workbench when focus is not in a typing control.
- Window resize handles support arrow-key resizing in 12px steps and 32px with Shift. Window and workspace actions also have labeled controls.
- Files supports keyboard traversal and file actions, including Home, End, Enter, F2, and Delete, with confirmation for permanent deletion.
- Ask about Sam provides labeled input, suggested questions, a 2,000-character limit, Send, Stop, Clear conversation, and readable pending or failure states. Provider privacy information stays beside the input, and chat replies render as plain text.
- Games expose keyboard and touch controls, visible instructions, pause, and outcome messages. Vector retains coordinate inputs and keyboard adjustment alongside direct manipulation.
- Focus indicators, semantic headings and control states, live status messages, input validation, reduced motion, and readable mobile layouts are part of the product.

## Evidence and Source of Truth

- Homepage: `app/components/PortfolioShell.tsx` and `app/styles/global.css`.
- Retained orbit exploration: `app/components/ProjectOrbit.tsx` and `app/lib/portfolio-projects.ts`; not rendered on the homepage.
- Project directory: `app/work/page.tsx` and `app/styles/project-directory.css`.
- Project pages: `app/work/[slug]/page.tsx`, `app/lib/project-case-studies.ts`, and `app/lib/product-stories.ts`.
- Original thumbnails: `app/components/ProjectThumbnail.tsx`; interface and gameplay evidence: `public/portfolio-media/`.
- Desktop, apps, games, renderers, state, and recovery: `app/components/`, `app/lib/`, and their tests.
- Résumé: `public/resume/SamBai_Resume.562eb942.pdf`.
- Company context: https://solynthlabs.com/; product context: https://trekky.app/.
- Shared visual direction and component behavior: `DESIGN.md`.

## Product Principles

1. Introduce Sam clearly and keep contact and navigation easy to find.
2. Keep the homepage minimal and offer tools, play, and exploration through Workbench.
3. Connect the frontpage, project details, Workbench, and games through one visual language.
4. Show real software and explain the choices behind it.
5. Keep names and controls familiar, and make outcomes visible.
6. Describe sources, capabilities, limits, storage, and recovery honestly.
7. Preserve tasks across responsive modes and stop unnecessary background work.
