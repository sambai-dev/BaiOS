# BaiOS

[![Release](https://img.shields.io/github/v/release/sambai-dev/BaiOS?display_name=tag)](https://github.com/sambai-dev/BaiOS/releases/latest)
[![Code license: AGPL v3](https://img.shields.io/badge/Code_License-AGPL_v3-blue.svg)](./LICENSE)

**BaiOS** is [Sam Bai](https://www.sambai.dev)'s open-source personal operating surface: a sparse public front door backed by an original, fully local desktop-style environment called the **Workbench**.

The name combines **Bai** with **OS**, with a visual nod to BIOS. Its design language is **Quiet Junction**: carbon grain, monumental ivory type, themeable operational light, and square rules. The full design system is documented in [`DESIGN.md`](./DESIGN.md); the product contract is [`PRODUCT.md`](./PRODUCT.md).

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Lint
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

Requires Node.js 20+.

---

## Tech Stack

| Technology    | Version | Purpose                                    |
| ------------- | ------- | ------------------------------------------ |
| Next.js       | 16.x    | React framework with App Router            |
| React         | 19.2    | UI library                                 |
| TypeScript    | 5.9     | Type safety                                |
| Tailwind CSS  | v4      | Utility-first styling                      |
| Framer Motion | 12.x    | Animations and transitions                 |
| next/font     | Built in | Archivo, Archivo Black, Azeret Mono       |

---

## Architecture

The site has two layers:

### 1. Public front door (`PortfolioShell`)

A single sparse page (`app/page.tsx` → `app/components/PortfolioShell.tsx`) that communicates identity, a live New Zealand clock, and direct routes: contact, résumé, GitHub, LinkedIn, Solynth Labs, and an aperture that opens the Workbench.

Deep links open the Workbench directly:

```
https://www.sambai.dev/?workbench          # or ?app=pulse, ?workspace=field, ?open=1
```

### 2. Workbench (`WorkbenchOSV3`)

An optional second-depth environment loaded dynamically (`ssr: false`) from the shell. It behaves like a small operating surface with draggable, resizable, and snappable windows, a menu bar, system search, Atlas (window overview), three themes, and fifteen registered apps, all running entirely in the browser.

---

## Project Structure

```
BaiOS/
├── app/
│   ├── api/crypto/route.ts         # CoinGecko proxy for the Pulse app (USD/NZD)
│   ├── components/
│   │   ├── PortfolioShell.tsx      # Public front door + Workbench launcher
│   │   ├── WorkbenchOSV3.tsx       # Workbench OS (windows, menus, Atlas, search)
│   │   ├── WorkbenchMenuBar.tsx    # App-aware menu system
│   │   ├── WorkbenchMissionControl.tsx
│   │   ├── MarketPulseApp.tsx      # Pulse: crypto market monitor
│   │   ├── BookConsultApp.tsx      # Book: consultation estimator
│   │   ├── CaseStudySandboxApp.tsx # Sandbox: case study sandbox
│   │   ├── AgentWorkflowApp.tsx    # Agent: AI workflow console
│   │   ├── SubsurfaceLab.tsx       # Subsurface: input-gated arcade lab
│   │   ├── RailshiftLab.tsx        # Railshift: three-lane signal runner
│   │   ├── VectorLab.tsx           # Vector: 3D vector calculator
│   │   ├── ArchiveApp.tsx          # Archive: writable local file system
│   │   └── ControlCenterApp.tsx    # Control: theme/session/backup settings
│   ├── lib/
│   │   ├── workbench-system.ts     # App registry, workspaces, themes, types
│   │   ├── workbench-window-manager.ts
│   │   ├── workbench-backup.ts     # Versioned JSON backup validate/import/export
│   │   ├── workbench-files.ts      # Archive file system logic
│   │   ├── workbench-idb.ts        # IndexedDB mirroring
│   │   └── workbench-sound.ts      # Opt-in sound engine
│   ├── styles/                     # global.css + per-app stylesheets (Tailwind v4)
│   ├── layout.tsx                  # Metadata, JSON-LD, fonts
│   ├── page.tsx                    # Homepage
│   ├── sitemap.ts / robots.txt     # SEO plumbing
│   └── opengraph-image.tsx         # Generated OG image
├── public/
│   ├── textures/carbon-grain.webp  # Carbon grain background texture
│   └── resume/SamBai_Resume.pdf    # Résumé (served with no-store)
├── scripts/build_resume.py         # Résumé build script
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

### Registered apps (15)

Now, Stack, Method, Scratch, Console, Links, Pulse, Book, Sandbox, Agent, Subsurface, Railshift, Vector, Archive, Control.

- **Pulse** fetches live market data through `/api/crypto` (a CoinGecko proxy) with USD/NZD views and stale-response fallbacks.
- **Scratch**, **Vector**, and **Archive** support multiple simultaneous instances (Shift + app shortcut); all other apps focus their existing window when reopened.
- **Subsurface** and **Railshift** pause their animation loops whenever inactive.
- Windows support focus, drag, resize, minimize, close, maximize/restore, and left/right snap; **Atlas** (F3) restores or focuses any open surface.

### Themes

Cobalt, Oxide, and Graphite change the Workbench route/depth/signal palette while preserving the carbon-and-ivory structure.

### Persistence (local only)

There is **no account, login, remote sync, filesystem service, or backend** for the Workbench. Session state (theme, workspace, window geometry, scratch, Method state, Archive contents) lives in browser-local state mirrored to IndexedDB. **Control** can export it as a versioned JSON backup, validate and import a backup, or restore defaults. Imports are size-limited and schema-checked; corrupt saved state is never silently overwritten.

---

## API Routes

| Route          | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `GET /api/crypto` | Proxies CoinGecko market data for 8 coins, validates currency (`usd`/`nzd`), returns a typed payload with 24h sparklines, and serves last-good data as stale on upstream failure. |

## Accessibility

Pointer interactions have keyboard equivalents throughout: menu bars use arrow-key movement, dialogs trap and restore focus, listboxes use roving selection, and window resizing works via arrow keys on the grips. Global shortcuts include `F3` (Atlas), `/` (system search), `Alt+1…3` (workspaces), and per-app letter shortcuts. Reduced-motion preferences are respected across the public page and every app.

---

## Deployment

Deployed on Vercel ([vercel.com/new](https://vercel.com/new)) with default Next.js settings, so no extra configuration is required. The résumé PDF is served with a `no-store` cache header configured in `next.config.ts`.

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

Modified network deployments must offer their corresponding source code under the AGPL. Public forks must also remove or replace the excluded personal and brand materials unless written permission is granted.

## Troubleshooting

- **Styles not loading?** Ensure `@import "tailwindcss"` is at the top of `app/styles/global.css` and restart the dev server after config changes.
- **Textures not showing?** The carbon grain lives at `public/textures/carbon-grain.webp` and is referenced from `app/styles/global.css`.
- **Workbench state lost?** State is browser-local by design. Use Control → Export to keep a versioned JSON backup before clearing site data.
