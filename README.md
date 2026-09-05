# BaiOS

[![Release](https://img.shields.io/github/v/release/sambai-dev/BaiOS?display_name=tag)](https://github.com/sambai-dev/BaiOS/releases/latest)
[![Code license: AGPL v3](https://img.shields.io/badge/Code_License-AGPL_v3-blue.svg)](./LICENSE)

**BaiOS** is [Sam Bai](https://www.sambai.dev)'s personal portfolio and open-source browser desktop. The minimal homepage introduces Sam with a large headline and direct links. Project pages explain the work; the optional **Workbench** contains useful tools, games, and experiments.

The name combines **Bai** with **OS**, with a visual nod to BIOS. The homepage leads with large type, generous spacing, plain descriptions, and direct links. Charcoal, ivory, cobalt, and clear controls connect it to the project pages and the more playful Workbench. [`DESIGN.md`](./DESIGN.md) describes the visual system; [`PRODUCT.md`](./PRODUCT.md) describes the product and behavior.

Workbench session and Files data stay in the current browser. Market monitor, Web search, and Ask about Sam identify the external services they use.

## Quick Start

```bash
# Install the exact locked dependencies
npm ci

# Run development server (http://localhost:3000)
npm run dev

# Lint
npm run lint

# Test
npm test

# Build for production
npm run build

# Start production server
npm run start
```

Requires Node.js 24, matching `.nvmrc`, `package.json`, and the Vercel project runtime. No environment variables are required to start the site; Ask about Sam needs the configuration below.

`npm run dev` uses `next dev --webpack` for local stylesheet iteration. The production command remains `next build`, using Next.js's default build pipeline.

## Tech Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | 16.x | App Router, public pages, server API routes |
| React | 19.2 | UI and application state |
| TypeScript | 5.9 | Type safety |
| Tailwind CSS | v4 | Styling alongside component CSS |
| Framer Motion | 12.x | Interface animations and transitions |
| Three.js | 0.185.x | Original 3D game and vector scenes |
| next/font | Built in | Archivo, Archivo Black, Azeret Mono |

## Architecture

### Public homepage

`app/page.tsx` renders `PortfolioShell` with the shared global styles. The identity header gives Sam's role, Hamilton location, and New Zealand time. The large heading “Sam designs and builds software.” sits above Hamilton coordinates and a simple footer.

The footer has three groups: **Selected work**, with a direct website link to Trekky plus **All projects** at `/work`; **Direct**, with email, Solynth Labs, and Open Workbench; and **Elsewhere**, with GitHub, BaiOS Source, LinkedIn, and Résumé. Selected work replaces the generic Site description while preserving the large headline. The compact header tab also opens Workbench.

The orbit component and original cartridge artwork remain in the repository but are not rendered on the homepage. The supplied Clone was an interaction reference; its media, fonts, logos, and project identities are not used as portfolio content. All Workbench games and tools remain available.

### Project pages

The public directory at `/work` groups **Products & web apps** (Trekky, Entangle, and RentAKL) and **Open-source tools** (Rookhold, Portly, and AgentScope). It distinguishes Entangle's research tool and RentAKL's sample-listing demo. Website links open the products directly; project notes explain the work.

Seven public case pages cover those six projects and BaiOS. Entangle and RentAKL join the five existing pages. Their content comes from `project-case-studies.ts` and `product-stories.ts` and renders through `app/work/[slug]/page.tsx`; `project-directory.css` styles the directory.

First-person notes explain why Sam built each project, how it works, and the engineering choices and limits. The two new pages use text without invented interface images. Existing captures, sample data, README examples, and simulators are labeled for what they show. Images retain their proportions and offer full-size links. Source links point only to public repositories. Case-page headers and the Workbench Projects app provide an **All projects** link back to the directory.

### Workbench

`WorkbenchOverlay` loads the desktop dynamically. `WorkbenchOSV3` manages applications, workspaces, windows, menus, search, and browser-local session state. Desktop-sized windows can be dragged, resized, minimized, maximized, restored, and snapped. Compact screens show one active window with a taskbar for switching apps.

Existing deep links remain compatible:

```text
https://www.sambai.dev/?workbench
https://www.sambai.dev/?app=pulse       # Market monitor in Playground
https://www.sambai.dev/?app=scratch     # Notes in Notes
https://www.sambai.dev/?workspace=build # Work workspace
```

Visible labels use Work, Playground, and Notes. Internal IDs such as `build`, `field`, `pulse`, and `scratch` remain stable for saved sessions and links. Apps open in their assigned workspace; an app parameter takes precedence over a conflicting workspace parameter.

## Project Structure

```text
BaiOS/
├── app/
│   ├── api/
│   │   ├── ai/route.ts               # Topic classification and approved public summaries
│   │   ├── crypto/route.ts           # CoinGecko market snapshots
│   │   ├── crypto/history/route.ts   # Timestamped CoinGecko price history
│   │   ├── crypto/sentiment/route.ts # CoinMarketCap Fear & Greed Index
│   │   └── search/route.ts           # Wikipedia search and summaries
│   ├── components/
│   │   ├── PortfolioShell.tsx        # Public page and Workbench launcher
│   │   ├── ProjectOrbit.tsx          # Retained orbit exploration; not on homepage
│   │   ├── ProjectThumbnail.tsx      # Retained original project cartridges
│   │   ├── ProjectMedia.tsx          # Project interface evidence
│   │   ├── WorkbenchOverlay.tsx      # Lazy desktop boundary
│   │   ├── WorkbenchOSV3.tsx         # Desktop, windows, search, and session
│   │   ├── WorkbenchMenuBar.tsx      # Desktop and app-aware menus
│   │   ├── WorkbenchMissionControl.tsx # Window overview
│   │   ├── MarketPulseApp.tsx        # Market monitor
│   │   ├── CaseStudySandboxApp.tsx   # Projects and a spring simulation
│   │   ├── BookConsultApp.tsx        # Project brief email composer
│   │   ├── SubsurfaceLab.tsx         # Underwater research game
│   │   ├── RailshiftLab.tsx          # Metropolitan waterfront runner
│   │   ├── VectorLab.tsx             # Vector missions and exploration
│   │   ├── AgentWorkflowApp.tsx      # Ask about Sam
│   │   ├── SearchApp.tsx             # Web search and Save to Files
│   │   ├── ArchiveApp.tsx            # Browser-local Files
│   │   └── ControlCenterApp.tsx      # Settings and backup tools
│   ├── lib/
│   │   ├── portfolio-projects.ts     # Retained orbit entries and geometry
│   │   ├── project-case-studies.ts   # Seven public case pages
│   │   ├── product-stories.ts        # First-person product notes
│   │   ├── workbench-system.ts       # App registry, workspaces, themes
│   │   ├── workbench-app-routing.ts  # App-to-workspace routing
│   │   ├── workbench-window-manager.ts
│   │   ├── workbench-backup.ts       # Validated JSON backup/import/export
│   │   ├── workbench-files.ts        # Local file system
│   │   ├── market-data.ts            # Market response validation
│   │   ├── market-indicators.ts      # EMA calculations
│   │   ├── market-upstream-cache.ts  # Cache, stale fallback, backoff
│   │   ├── subsurface-engine.ts      # Game simulation; scene in *-scene.ts
│   │   ├── railshift-engine.ts       # Runner simulation; scene in *-scene.ts
│   │   └── vector-lab-scene.ts        # On-demand Three.js vector scene
│   ├── work/page.tsx                 # Public project directory
│   ├── work/[slug]/page.tsx          # Public project pages
│   ├── assets/carbon-grain.webp      # Carbon background texture
│   ├── styles/                      # Global and lazy per-app stylesheets
│   ├── favicon.ico                  # White-square favicon from icon.svg
│   ├── layout.tsx                   # Metadata, JSON-LD, fonts
│   ├── page.tsx                     # Homepage
│   ├── sitemap.ts                   # Sitemap metadata route
│   └── opengraph-image.tsx           # Generated OG image
├── public/
│   ├── portfolio-media/             # Project evidence and gameplay previews
│   ├── licenses/                    # Deployable font and Three.js licenses
│   ├── robots.txt                   # Crawler policy and sitemap location
│   ├── third-party-notices.txt       # Deployable dependency/content notices
│   └── resume/                      # Content-hashed résumé PDF
├── scripts/build_resume.py          # Résumé DOCX generator
├── requirements-resume.txt          # Résumé generation dependency
├── licenses/                        # Third-party license texts
├── DESIGN.md                        # Shared visual system
├── PRODUCT.md                       # Product behavior and boundaries
├── NOTICE.md                        # License scope and attribution
├── THIRD_PARTY_NOTICES.md            # Dependency, font, and service notices
├── TRADEMARKS.md                     # BaiOS name and brand policy
└── README.md
```

## The Workbench

### Workspaces and applications

The registry in `app/lib/workbench-system.ts` assigns every application a home workspace. The Applications launcher uses the same categories.

| Workspace | Applications |
| --- | --- |
| **Work** | Welcome, Tech stack, How I work, Contact & links, Project brief, Projects |
| **Playground** | Market monitor, Subsurface, Railshift, Vector lab |
| **Notes** | Notes, Terminal, Ask about Sam, Files, Web search, Settings |

A fresh session opens **Welcome** in Work. Playground and Notes begin empty. A validated saved session restores its windows and workspace state, with apps organized into their assigned workspace.

Notes, Vector lab, and Files support multiple instances through Shift-modified dock activation. Other apps reuse their saved instance. **Window overview** (`F3`) can focus one window, bring a window to the front while preserving others, or show all minimized windows. Cobalt, Oxide, and Graphite themes change the Workbench accent palette while retaining its structure.

### Games and tools

- **Subsurface** is an original Three.js underwater research game across three zones. Rise, dive, collect specimens, use sonar, and manage hull and protection. Keyboard and touch controls share the same actions. A 2D fallback preserves the simulation when WebGL is unavailable.
- **Railshift** is an original Three.js runner through a dense metropolitan city, with trains and a dock-warden pursuer. Short park and waterfront districts interrupt the downtown skyline; a Ferris wheel belongs to the park, and a whale makes rare waterfront appearances. Change lanes, jump, slide, and collect gold. Rocket backpacks launch automatic flight; magnets pull nearby coins along visible curves. Shields, two lives, checkpoints, and coin-charged Overdrive provide recovery and progression. Arrow/WASD keys, Space, Shift, `P` to pause, swipes, and labeled touch controls are supported.
- **Vector lab** combines a 3D scene with Dock, Thrust, and Lift missions and free Explore mode. Adjust vectors, compare addition, projection, angle, and cross product, then send a probe to test the result. Numeric calculations and mission checks remain usable without WebGL. Vector lab is available in Playground.
- **Market monitor** shows eight crypto assets in USD or NZD, with 24H, 7D, and 30D price history. EMA 20 and EMA 50 overlays use observed sample periods, with the actual sampling cadence shown beside the chart. Pointer inspection and a keyboard/touch history slider expose individual observations. The watchlist sorts by market cap, gainers, or losers; a separate panel shows the actual CoinMarketCap Fear & Greed Index. Visible views refresh every 90 seconds, and stale data or unavailable services are labeled.
- **Projects** contains interactive Trekky and BaiOS details, a labeled spring simulation, and an **All projects** link to the public directory. **Project brief** prepares an email enquiry without inventing a quote or delivery schedule.
- **Web search** retrieves attributed Wikipedia results and can save them to Files. **Ask about Sam** answers questions about Sam's public profile and projects using approved, surface-level summaries. Only the current question is sent to OpenRouter and NVIDIA. The model selects one to three approved topic IDs; the server validates the selection and returns the corresponding written summaries. The interface keeps up to five question-and-answer turns in memory, with Stop and Clear conversation controls. Earlier turns are not sent with a new question. Questions leave the browser, and the interface asks visitors to leave out confidential information.

Games start only on request and pause when the application or page becomes inactive. Resume continues the current in-memory run. Sound is opt-in. Reduced motion removes nonessential movement, and 3D resources are released when no longer needed.

### Browser-local persistence

Workbench session and Files data stay in this browser. There is no account, login, remote sync, or remote filesystem for that state. Files supports folders, editable notes, renaming, trash, restoration, and confirmed permanent deletion.

**Settings** can download or restore a versioned JSON backup containing session and Files state, or restore a workspace's window layout without replacing content. Session data includes the theme, workspace, window geometry, Notes, and How I work state. Session and Files are validated and saved together. Imports are size-limited and schema-checked; corrupt saved state is preserved for recovery, and conflicting edits from another tab have an explicit resolution path.

Project brief drafts, Vector's per-instance vectors/view/mission progress, sound preference, and local game records use separate browser storage and are **not included in Settings backups**. In-progress games and temporary interface state are not promised to survive a reload. Network-backed market data, Wikipedia results, and AI responses are separate from local persistence.

## API Routes

| Route | Description |
| --- | --- |
| `GET /api/crypto` | CoinGecko market snapshots for eight assets. Validates `currency=usd\|nzd` and may return a marked stale snapshot after an upstream failure. |
| `GET /api/crypto/history` | CoinGecko timestamped price observations. Accepts an allowed `coin`, `currency=usd\|nzd`, and `days=1\|7\|30`; returns the actual sampling interval and source timestamp. |
| `GET /api/crypto/sentiment` | CoinMarketCap's Fear & Greed Index with its source timestamp. Uses the keyless public endpoint by default or the authenticated endpoint when configured. |
| `GET /api/search` | Queries Wikipedia, sanitizes summaries, and returns attributed result links. |
| `POST /api/ai` | Validates and rate-limits the current question, asks OpenRouter for a strict JSON selection of one to three approved topic IDs, and returns the matching public summaries after server validation. Model-written prose and arbitrary links are not forwarded to the visitor. |

Market routes use bounded upstream timeouts, in-flight request deduplication, caching, failure backoff, and marked last-good fallbacks. They do not substitute invented prices or sentiment when no valid response is available.

### Environment configuration

Copy `.env.example` to `.env.local` for local development, or configure the same server-only names on the deployment platform. Both OpenRouter variables are required to enable Ask about Sam. The configured model is NVIDIA Nemotron 3 Super through OpenRouter, using the verified free model ID below. CoinGecko and CoinMarketCap keys are optional.

```dotenv
OPENROUTER_API_KEY=<server-only-openrouter-key>
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free

# Optional CoinGecko demo API key
COINGECKO_DEMO_API_KEY=<server-only-coingecko-demo-key>

# Optional CoinMarketCap key; the public index works without one
COINMARKETCAP_API_KEY=<server-only-coinmarketcap-key>
```

Keep credentials server-only; never prefix them with `NEXT_PUBLIC_`. The chat route requires an API key and a named `:free` model, rejects missing settings or model IDs outside that format, sets the provider's maximum prompt and completion prices to zero, and disables fallback routing. It returns a service-unavailable response when configuration is invalid; the rest of BaiOS remains usable. Free-provider capacity can still be unavailable or rate-limited. No private GitHub token is required or used by the chat.

The chat route accepts questions up to 2,000 characters and caps both the request body and upstream response at 32,000 bytes. A 55-second deadline bounds the request. Its in-memory controls allow 12 requests per minute per IP, four concurrent requests, and at most 1,000 tracked IP keys per instance. Restarts and horizontally scaled instances do not share this state, so these controls are not a durable deployment-wide quota. Search and crypto routes have bounded upstream timeouts but no per-client request limiter. Configure durable provider quotas or gateway controls where deployment-wide limits are needed.

Ask about Sam uses a small set of approved public topics. It does not read source code, README architecture details, private repositories, or internal documents. It has no tools for browsing, running actions, accessing accounts, or following links. The server accepts only the allowed topic IDs from the model, then supplies fixed summaries. Replies render as plain text; model-provided HTML, code, and arbitrary links are not rendered or executed.

Chat turns stay in component memory and are not saved in browser storage, Files, or Settings backups. The server does not log questions or upstream error bodies. The chat has no account or password store. OpenRouter and the model provider receive each submitted question under their own data policies, so visitors should not include confidential information. Clear conversation removes the visible local turns; it does not retract questions already sent to a provider. Stop cancels the browser request and stops waiting for a reply.

## Accessibility

The homepage uses a semantic headline, labeled navigation, visible focus, and a skip link to the footer links. The headline and footer adapt to small screens. Reduced-motion preferences remove nonessential animation across the site and apps.

Workbench menus use arrow-key movement, listboxes use roving selection, and the window resize grip accepts arrow keys. Window dragging is pointer-driven; keyboard users can focus, resize, maximize/restore, snap through the Window menu, switch workspaces, and open applications. Primary global shortcuts are `F3` for Window overview, `Ctrl/Cmd+K` for search, and `Alt+1…3` for workspaces. Inactive compact-screen windows are removed from interaction and accessibility trees until reactivated.

## Deployment

Deployed on Vercel ([vercel.com/new](https://vercel.com/new)) using this repository's `next.config.ts`, including custom security headers, output tracing, image formats, and résumé caching. Configure both OpenRouter variables to enable Ask about Sam; the market provider keys are optional.

The résumé PDF uses a content hash in its filename and a one-year immutable cache header. The legacy stable URL redirects temporarily so future résumé versions cannot be pinned behind a cached redirect.

### Résumé source generation

The checked-in generator produces the DOCX source; PDF export remains a separate step:

```bash
python -m pip install -r requirements-resume.txt
python scripts/build_resume.py
```

## Documentation

| Document | Contents |
| --- | --- |
| [`DESIGN.md`](./DESIGN.md) | Shared visual language, typography, artwork, layout, and interaction |
| [`PRODUCT.md`](./PRODUCT.md) | Project content, application behavior, storage, and accessibility boundaries |
| [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) | Dependency, font, media, and data-provider notices |

## Licensing

BaiOS uses a mixed licensing model:

- **Application code:** [GNU Affero General Public License v3.0 or later](./LICENSE).
- **Required attribution:** Reuse of covered code must preserve [`NOTICE.md`](./NOTICE.md) and credit BaiOS with a link to this repository.
- **Name and branding:** The BaiOS identity is reserved under the [brand policy](./TRADEMARKS.md).
- **Personal content:** Sam Bai's résumé, portfolio writing, personal identity, and original media are excluded from the AGPL and reserved as described in [`NOTICE.md`](./NOTICE.md).
- **Third-party components:** Dependencies, fonts, and external services retain their own licenses and terms, documented in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
- **Deployed notices:** A plain-text notice is served at [`/third-party-notices.txt`](./public/third-party-notices.txt), with the [font license](./public/licenses/FONTS-OFL-1.1.txt) and [Three.js MIT license](./public/licenses/THREE-MIT.txt).

Modified network deployments must offer their corresponding source code under the AGPL. Public forks must also remove or replace the excluded personal and brand materials unless written permission is granted.

## Troubleshooting

- **Styles not updating?** Use `npm run dev` to run the configured Webpack development server, and restart it after configuration changes. Keep `@import "tailwindcss"` at the top of `app/styles/global.css`.
- **Textures not showing?** The carbon grain lives at `app/assets/carbon-grain.webp` and is referenced from the global and Workbench CSS bundles.
- **Workbench state lost?** State belongs to the current browser and origin. Settings can download a session and Files backup; separately stored Project brief/Vector state, sound preferences, and game records are not exported.
- **Market data unavailable?** The interface shows provider failures or stale timestamps. Optional provider keys can be configured server-side; the app does not require them to start.
- **3D view unavailable?** Check that the browser supports WebGL and hardware acceleration. Subsurface offers a 2D fallback and Vector retains its calculations; Railshift explains when its required 3D view cannot start.
