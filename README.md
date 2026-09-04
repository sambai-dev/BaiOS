# BaiOS

[![Release](https://img.shields.io/github/v/release/sambai-dev/BaiOS?display_name=tag)](https://github.com/sambai-dev/BaiOS/releases/latest)
[![Code license: AGPL v3](https://img.shields.io/badge/Code_License-AGPL_v3-blue.svg)](./LICENSE)

**BaiOS** is [Sam Bai](https://www.sambai.dev)'s open-source personal operating surface: a sparse public front door backed by an original browser-based desktop environment called the **Workbench**. Workbench session and Archive data stay in the current browser; its live-data and AI tools disclose when they use network-backed services.

The name combines **Bai** with **OS**, with a visual nod to BIOS. Its design language is **Quiet Junction**: carbon grain, monumental ivory type, themeable operational light, and square rules. The full design system is documented in [`DESIGN.md`](./DESIGN.md); the product contract is [`PRODUCT.md`](./PRODUCT.md).

---

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

Requires Node.js 24, matching `.nvmrc`, `package.json`, and the Vercel project runtime.

---

## Tech Stack

| Technology    | Version | Purpose                                    |
| ------------- | ------- | ------------------------------------------ |
| Next.js       | 16.x    | React framework with App Router            |
| React         | 19.2    | UI library                                 |
| TypeScript    | 5.9     | Type safety                                |
| Tailwind CSS  | v4      | Utility-first styling                      |
| Framer Motion | 12.x    | Animations and transitions                 |
| next/font     | Built in | Self-hosted Archivo and Azeret Mono       |

---

## Architecture

The site has two layers:

### 1. Public front door (`PortfolioShell`)

A single sparse page (`app/page.tsx` → `app/components/PortfolioShell.tsx`) built around the direct statement “Sam designs and builds software.” It pairs Sam's role as Founder & Product Engineer at Solynth Labs with a personal framing: engineering thinking, design, and working experiments, and direct routes to email, résumé, GitHub, LinkedIn, Solynth Labs, and the optional Workbench.

Deep links open the Workbench directly:

```
https://www.sambai.dev/?workbench          # or ?app=pulse, ?workspace=field, ?open=1
```

### 2. Workbench (`WorkbenchOSV3`)

An optional second-depth environment loaded dynamically (`ssr: false`) from the shell. It behaves like a small operating surface with draggable, resizable, and snappable windows, a menu bar, direct workspace navigation, system search, Atlas (window overview), three themes, and a registry of working surfaces. The session and Archive persist in the browser. Pulse, Search, and Agent call network-backed services through server routes.

---

## Project Structure

```
BaiOS/
├── app/
│   ├── api/
│   │   ├── ai/route.ts             # OpenRouter-backed Agent stream
│   │   ├── crypto/route.ts         # CoinGecko proxy for Pulse (USD/NZD)
│   │   └── search/route.ts         # Wikipedia search/summary proxy
│   ├── components/
│   │   ├── PortfolioShell.tsx      # Public front door + Workbench launcher
│   │   ├── WorkbenchOverlay.tsx    # Lazy motion/Workbench boundary
│   │   ├── WorkbenchOSV3.tsx       # Workbench OS (windows, menus, Atlas, search)
│   │   ├── WorkbenchMenuBar.tsx    # App-aware menu system
│   │   ├── WorkbenchMissionControl.tsx
│   │   ├── MarketPulseApp.tsx      # Pulse: crypto market monitor
│   │   ├── BookConsultApp.tsx      # Brief: factual project-enquiry composer
│   │   ├── CaseStudySandboxApp.tsx # Systems: documented systems + motion simulation
│   │   ├── AgentWorkflowApp.tsx    # Agent: network-backed model-stream interface
│   │   ├── SearchApp.tsx           # Search: Wikipedia lookup + Archive handoff
│   │   ├── SubsurfaceLab.tsx       # Subsurface: input-gated arcade lab
│   │   ├── RailshiftLab.tsx        # Railshift: three-lane signal runner
│   │   ├── VectorLab.tsx           # Vector: 3D vector calculator
│   │   ├── ArchiveApp.tsx          # Archive: writable local file system
│   │   └── ControlCenterApp.tsx    # Control: theme/session/backup settings
│   ├── lib/
│   │   ├── workbench-identifiers.ts # Lightweight deep-link ID guards
│   │   ├── workbench-system.ts     # App registry, workspaces, themes, types
│   │   ├── workbench-window-manager.ts
│   │   ├── workbench-backup.ts     # Versioned JSON backup validate/import/export
│   │   ├── workbench-files.ts      # Archive file system logic
│   │   └── workbench-sound.ts      # Opt-in sound engine
│   ├── assets/carbon-grain.webp    # Hashed carbon grain background texture
│   ├── styles/                     # global.css + lazy per-app stylesheets (Tailwind v4)
│   ├── favicon.ico                 # Browser favicon generated from icon.svg
│   ├── layout.tsx                  # Metadata, JSON-LD, fonts
│   ├── page.tsx                    # Homepage
│   ├── sitemap.ts                  # Sitemap metadata route
│   └── opengraph-image.tsx         # Generated OG image
├── public/
│   ├── licenses/FONTS-OFL-1.1.txt  # Deployable font copyright/license text
│   ├── robots.txt                  # Crawler policy and sitemap location
│   ├── third-party-notices.txt     # Deployable dependency/content notices
│   └── resume/SamBai_Resume.8aa80702.pdf # Content-hashed résumé with immutable cache
├── scripts/build_resume.py         # Résumé DOCX generator (PDF export is separate)
├── requirements-resume.txt         # Pinned direct dependency for résumé generation
├── licenses/                       # Third-party license texts
├── DESIGN.md                       # Quiet Junction design system spec
├── NOTICE.md                       # License scope and required attribution
├── PRODUCT.md                      # Product contract
├── THIRD_PARTY_NOTICES.md          # Dependency, font, and service notices
├── TRADEMARKS.md                   # BaiOS name and brand policy
└── README.md
```

---

## The Workbench

### Workspaces

| Workspace | Purpose                                            |
| --------- | -------------------------------------------------- |
| Build     | Company, systems, and the current shipping surface |
| Field     | Interactive experiments and spatial tools          |
| Notes     | Archive, working documents, local scratch space    |

### Working surfaces

The registry in `app/lib/workbench-system.ts` is the source of truth. It combines professional context and documented systems with local notes, spatial experiments, live-data tools, network-backed search and AI, Archive, and session controls.

- **Pulse** fetches live market data through `/api/crypto` (a CoinGecko proxy) with USD/NZD views and stale-response fallbacks.
- **Search** queries Wikipedia through `/api/search` and can hand a result to the browser-local Archive.
- **Agent** streams responses through `/api/ai` from the configured model provider; prompts leave the browser and visitors are warned not to include confidential information.
- **Scratch**, **Vector**, and **Archive** support multiple simultaneous instances through Shift-modified dock activation. Other apps reuse an existing saved instance in the current workspace; the same app may exist in another workspace.
- **Subsurface** and **Railshift** pause their animation loops whenever inactive.
- Windows support focus, drag, resize, minimize, close, maximize/restore, and left/right snap; **Atlas** (global F3) can Focus one surface, Raise it without changing the stack, or Show all suspended surfaces.

A fresh session starts in Build with one active **Now** window; Field and Notes are empty until a visitor opens something there. An existing validated saved session keeps its open windows and workspace state.

### Themes

Cobalt, Oxide, and Graphite change the Workbench route/depth/signal palette while preserving the carbon-and-ivory structure.

### Browser-local persistence

Workbench session and Archive data stay in this browser. There is no account, login, remote sync, or remote filesystem for that state. Session data (theme, workspace, window geometry, scratch, Method state, and Archive contents) is validated and committed to browser storage. **Control** can export the session and Archive as a versioned JSON backup, validate and import that backup, or restore the active workspace's default window layout. Imports are size-limited and schema-checked; corrupt saved state is never silently overwritten. Brief drafts, Vector drafts/view state, sound preference, and local game scores use separate browser storage and are not included in Control backups. Pulse, Search, and Agent use network-backed services and are not persistence mechanisms.

---

## API Routes

| Route | Description |
| ----- | ----------- |
| `GET /api/crypto` | Proxies CoinGecko market data, validates currency (`usd`/`nzd`), returns typed 24-hour snapshots, and may serve a last-good snapshot as stale on upstream failure. |
| `GET /api/search` | Queries Wikipedia, sanitizes the returned summary, and returns attributed result links. |
| `POST /api/ai` | Validates and rate-limits a prompt, requests the configured OpenRouter model, and streams the text response without exposing provider credentials to the browser. |

### Agent configuration

The Agent route requires both OpenRouter variables below. Copy `.env.example` to `.env.local` for local development, or configure the same names as encrypted environment variables on the deployment platform. `COINGECKO_DEMO_API_KEY` is optional and can be supplied server-side for the Pulse upstream request.

```dotenv
OPENROUTER_API_KEY=<server-only-openrouter-key>
OPENROUTER_MODEL=<provider/model-id>
# Optional; never expose it as NEXT_PUBLIC_*
COINGECKO_DEMO_API_KEY=<server-only-coingecko-demo-key>
```

`OPENROUTER_API_KEY` must remain server-only; do not prefix it with `NEXT_PUBLIC_`. Without either value, `/api/ai` returns a service-unavailable response and the rest of BaiOS remains usable.

The Agent route uses an in-memory, per-instance request limiter. It is a local abuse guard, not a durable or deployment-wide quota: restarts and horizontally scaled instances do not share its counter. Search and Crypto are public proxy routes with bounded upstream timeouts but no per-client request limiter. For a public deployment, configure durable upstream quota and spend controls with OpenRouter or an API gateway.

## Accessibility

Core Workbench controls have keyboard paths: menu bars use arrow-key movement, listboxes use roving selection, and window resizing works through arrow keys on the resize grip. Arbitrary desktop window movement remains pointer-driven; keyboard users can focus, resize, maximize/restore, snap through the Window menu, switch workspaces, and open apps through semantic menu and dock controls. Primary global shortcuts are `F3` for Atlas, `Ctrl/Cmd+K` for system search, and `Alt+1…3` for workspaces. Reduced-motion preferences are respected across the public page and every app.

---

## Deployment

Deployed on Vercel ([vercel.com/new](https://vercel.com/new)) using this repository's `next.config.ts`, including custom security headers, output tracing, image formats, and résumé caching. Configure the two OpenRouter variables above to enable Agent; the optional CoinGecko key can improve upstream allowance but is not required. The résumé PDF uses a content hash in its filename and a one-year immutable cache header; the legacy stable URL redirects temporarily so future résumé versions cannot be pinned behind a cached redirect.

### Résumé source generation

The checked-in generator produces the DOCX source; PDF export remains a separate step:

```bash
python -m pip install -r requirements-resume.txt
python scripts/build_resume.py
```

---

## Documentation

| Document    | Contents                                        |
| ----------- | ----------------------------------------------- |
| `DESIGN.md` | Quiet Junction design tokens and component spec |
| `PRODUCT.md`| Product purpose, positioning, and constraints   |

## Licensing

BaiOS uses a mixed licensing model:

- **Application code:** [GNU Affero General Public License v3.0 or later](./LICENSE).
- **Required attribution:** Reuse of covered code must preserve [`NOTICE.md`](./NOTICE.md) and credit BaiOS with a link to this repository.
- **Name and branding:** The BaiOS identity is reserved under the [brand policy](./TRADEMARKS.md).
- **Personal content:** Sam Bai's résumé, portfolio writing, personal identity, and original media are excluded from the AGPL and reserved as described in [`NOTICE.md`](./NOTICE.md).
- **Third-party components:** Dependencies, fonts, and external services retain their own licenses and terms, documented in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
- **Deployed notices:** A plain-text notice is served at [`/third-party-notices.txt`](./public/third-party-notices.txt), with the font license at [`/licenses/FONTS-OFL-1.1.txt`](./public/licenses/FONTS-OFL-1.1.txt).

Modified network deployments must offer their corresponding source code under the AGPL. Public forks must also remove or replace the excluded personal and brand materials unless written permission is granted.

## Troubleshooting

- **Styles not loading?** Ensure `@import "tailwindcss"` is at the top of `app/styles/global.css` and restart the dev server after config changes.
- **Textures not showing?** The carbon grain lives at `app/assets/carbon-grain.webp` and is referenced from the global and Workbench CSS bundles.
- **Workbench state lost?** State is browser-local by design. Control → Export backs up the session and Archive only; separately stored Brief/Vector preferences, sound state, and game scores are not exported.
