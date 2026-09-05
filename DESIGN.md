---
name: "Sam Bai / Portfolio"
description: "A minimal personal portfolio with a large headline, direct links, and an optional browser desktop."
colors:
  carbon: "#11110f"
  carbon-soft: "#1b1b18"
  ivory: "#f0efe8"
  ivory-muted: "#bbb9b0"
  cobalt: "#4c5ce5"
  cobalt-deep: "#3543bd"
  signal: "#59df79"
  oxide: "#ba5b3f"
  oxide-deep: "#8f3e29"
  oxide-signal: "#f0c95d"
  graphite: "#515963"
  graphite-deep: "#353b43"
  graphite-signal: "#b8d9ff"
  rule-dark: "rgba(17, 17, 15, 0.26)"
  rule-light: "rgba(240, 239, 232, 0.24)"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(1.5rem, 3.1cqi, 2.15rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Azeret Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
rounded:
  controls: "0"
  status: "50%"
---

# Design System: Sam Bai / Portfolio

## Direction

The homepage is a minimal personal introduction: an identity header, large headline, coordinates, and a short footer of direct links. Generous space and strong type carry the composition. Project pages provide detail, and the optional Workbench retains its familiar desktop, useful tools, and playful 3D experiments.

Charcoal, ivory, cobalt, square controls, clear rules, strong type, and small status marks connect the whole site. The homepage uses a simple reading order; the Workbench and original game worlds carry the more expressive interactions.

The site remains personal: Sam Bai, Founder & Product Engineer at Solynth Labs, based in Hamilton, New Zealand. Plain first-person introductions and specific project descriptions take priority over invented system language.

## Color and Material

- **Carbon and soft carbon** form the public background, desktop chrome, media frames, and dark tool panels.
- **Ivory and muted ivory** supply reading surfaces and text. Long passages have clear contrast and comfortable line spacing.
- **Cobalt** connects the Workbench, selected controls, links, and cartridge illustrations.
- **Signal green** marks focus, readiness, selection, and immediate feedback.
- **Oxide and graphite** remain alternative Workbench themes. Route, depth, and signal colors change together while structure and content remain stable.

Original project illustrations and 3D scenes can use additional colors that explain their subjects: amber specimens underwater, golden runner cells, or distinct vector axes. Those colors belong to the artwork or simulation; shared navigation and chrome keep the portfolio palette.

Grain, thin rules, shallow insets, and deliberate shadows give the interface material. Dense texture, glow, and decorative readouts do not compete with names, actions, or game feedback.

## Typography and Language

Archivo supplies the main reading and interface voice. Archivo Black is used selectively for cartridge titles, project identities, or a bold game title. Azeret Mono carries concise labels, coordinates, shortcuts, numbers, and system state.

Public and case-page titles can be large; app headings use calmer weights and proportions so they fit a window. Body text has room to wrap, and control labels remain readable at compact sizes. Labels use sentence case except where a short cartridge or data treatment deliberately calls for capitals.

The visible names are Workbench, Work, Playground, Notes, Applications, Window overview, Files, Settings, Projects, Project brief, Web search, and Ask about Sam. Older names such as Atlas, Archive, Control, and Sandbox remain internal compatibility identifiers, not competing navigation names. Visitor-authored titles and notes are preserved.

Copy explains what the visitor can do: “Open Workbench,” “Save to Files,” “Email Sam,” “Start riding,” or “Test this setup.” First-person project notes explain why Sam built the software, how it works, and the engineering choices and limitations in plain language without em dashes. Demo labels, external service use, and browser-local storage are explicit without turning every introduction into implementation documentation.

## Shared Layout

The frontpage, case pages, Workbench, and games share alignment, readable type, square framing, and a clear separation between content and controls. The homepage places its headline between the identity header and footer links. Case studies offer a comfortable reading path. Desktop windows support focused tools, while game scenes use their available window area.

Public gutters scale with the viewport. Workbench components respond to their own container size as well as the viewport, so a resized window remains usable. At compact widths, the desktop changes to a single active window with a persistent taskbar; the interaction model changes before controls become too small.

Screenshots retain their native proportions on project pages. Dense interface examples have descriptive captions and full-size links. On mobile, project prose, facts, actions, and game controls reflow into a readable order rather than becoming miniature desktop layouts.

## Public Homepage

“Sam designs and builds software.” leads the page in large ivory type with a cobalt full stop. Hamilton coordinates sit beneath the headline. The identity header names Sam, his role at Solynth Labs, Hamilton, New Zealand, and the local time.

The footer has three groups separated from the hero by a fine rule. Selected work replaces the generic Site description with direct website links to Trekky, Rivet, and Clearfold and an All projects link to `/work`. Direct contains email, Solynth Labs, and Open Workbench. Elsewhere contains GitHub, BaiOS Source, LinkedIn, and Résumé. The original giant headline remains unchanged; the headline and footer reflow on narrow screens.

The compact header tab and Open Workbench footer link offer the desktop as an optional next step.

`PortfolioShell.tsx` and the shared global styles define this page. `ProjectOrbit.tsx`, its data, and the original cartridge artwork remain in the repository as a retained exploration; the homepage does not render them.

## Retained Original Artwork

`ProjectThumbnail.tsx` retains the original cartridge treatment: a strong title band, a concise purpose line, and original subject-specific artwork. Trekky shows connected application steps; Rookhold shows bounded execution and a receipt; Portly shows local services; AgentScope shows activity relationships; BaiOS shows the browser desktop. Games use their own scenes, while Market monitor uses a price-and-moving-average diagram. These cartridges are not the current homepage layout.

Thumbnails are readable entry points rather than evidence of a product interface. Actual screenshots and recorded gameplay are identified separately. The Clone establishes an interaction reference only; its downloaded brand imagery, video, typefaces, logos, and project identities are not used as portfolio assets. Original illustration, procedural geometry, and captures of Sam's own software supply the visual material.

## Public Project Pages

The plain public directory at `/work` uses readable rows grouped into Products & web apps (Trekky, Rivet, Clearfold, Entangle, and RentAKL) and Open-source tools (Rookhold, Portly, and AgentScope). Status labels distinguish Rivet's private workspace requiring sign-in, Clearfold's preproduction preview, Entangle's research tool, and RentAKL's sample-listing demo. Direct website links and project-note links make their destinations clear. `project-directory.css` defines this surface.

Nine case pages cover those eight projects and BaiOS. Rivet, Clearfold, Entangle, and RentAKL join the five existing pages with text-only notes and no invented interface images. `project-case-studies.ts` and `product-stories.ts` supply the content. A project page combines a clear identity and purpose, factual details and links, readable first-person sections explaining the work, and navigation to the next project, portfolio, or Workbench. The All projects link in each case-page header returns to the directory. Source links appear only for public repositories.

Trekky uses an ivory reading surface with dark ink and its genuine earlier light-theme sample dashboard. Other project pages use charcoal. Shared typography, square controls, cobalt actions, and layout keep these variants connected.

The shared computer-lab treatment carries through dark chrome, square media frames, ivory reading areas, cobalt accents, and restrained mono labels. Screenshots remain complete and inspectable. Captions distinguish live interfaces, sample data, README examples, and simulated events; release facts do not silently relabel older screenshots.

The content explains concrete problems, implementation choices, and current scope. Claims about isolation, authentication, enforcement, outcomes, or performance remain tied to the actual project. Technical detail belongs where it helps a reader assess the work.

## Workbench Entry and Return

The embedded Workbench tab stays at the top-right of the public header. Hover or keyboard focus expands the preview to show Work, Playground, Notes, and Open Workbench. Its action separator aligns with the fixed header rule, and the overlay does not push surrounding content down. Touch layouts retain a clear entry action.

The status dot anchors the circular opening and return. Return remeasures the dot, and focus is restored to the invoking control after the public page is interactive again. Reduced motion substitutes a short fade. Background content stays inert and scroll-locked during both opening and closing.

## Desktop Navigation and Windows

The top panel uses familiar desktop conventions: Desktop and Window menus, Work / Playground / Notes switching, Overview, Search, and Back to site. Compact layouts retain labeled routes through the menus and Overview.

Applications opens a searchable launcher with All, Work, Playground, and Notes categories. The bottom taskbar contains Applications and the apps open in the current workspace, with Active, Running, or Minimized states. Each app has one home workspace; launching it switches to that workspace and recovers an existing instance when appropriate. Notes, Vector lab, and Files allow multiple instances.

Windows use readable content, dark title bars, square edges, an active outline, and structural shadows. Desktop actions include focus, drag, minimize, close, maximize, restore, resize, and snap. Resize handles support arrow keys as well as pointer input. Closing retains serialized content and geometry; reopening can recover the same instance.

Window overview shows workspaces and open windows with clear behavior choices. Focus one minimizes siblings, Bring to front preserves them, and Show all restores minimized windows. System search reaches apps, workspaces, saved windows, files, and commands. Menus, dialogs, tabs, and listboxes retain keyboard navigation and focus restoration.

## Project and Utility Windows

**Projects** pairs Trekky and Workbench introductions with original artwork, readable headings, sentence-case tabs, and interactive workflow or architecture details. Its All projects header link opens the public directory. A charcoal sidebar adds context. The Motion tab remains a labeled spring simulation with stiffness, damping, presets, and a clear trigger. Short windows scroll; narrow windows stack their content.

**How I work** uses Clarify, Shape, Ship, and Learn tabs with meaningful descriptions. **Tech stack** describes the actual tools and areas of work. **Project brief** helps a visitor describe a project and email Sam, without calculating a price or promising timing.

**Files** provides notes and folders, search, list and grid views, editing, rename, trash, restore, and confirmed permanent deletion. **Settings** manages appearance, workspace layout, sound, and validated backup or restore. Both explain that session and Files storage belong to this browser.

**Market monitor** pairs an ivory toolbar with a charcoal price chart and watchlist. Signed change, chart labels, USD/NZD controls, refresh state, CoinGecko attribution, and cached-data timestamps describe the data accurately.

**Web search** queries Wikipedia and saves attributed excerpts to Files. **Ask about Sam** uses suggested questions, a readable conversation area, labeled input, and Send, Stop, and Clear conversation controls. It keeps up to five turns in memory and shows clear pending, stopped, and unavailable states. Input accepts up to 2,000 characters. Replies are plain text assembled from approved public summaries about Sam and his projects.

The chat's name and suggested questions describe its narrow purpose. The model selects approved topics rather than writing the visible answer. The interface identifies OpenRouter and the model provider, explains that only the current question is sent, and asks visitors to leave out passwords and confidential information. Clear conversation removes the turns from this page; provider data policies still apply to submitted questions. The chat does not present tools, browsing, source-code access, account access, or actions it cannot perform.

## Railshift

Railshift is a real Three.js metropolitan runner with an original rider, tracks, trains, barriers, signs, scenery, and changing districts. The surrounding interface uses the shared charcoal, ivory, and cobalt treatment; the game world uses color and depth to make lanes, hazards, gold, and equipment legible.

Lane changes, jumping, sliding, cells, streaks, shields, two lives, checkpoints, and charged Overdrive form the game loop. Onboarding introduces the controls, feedback explains collisions and bonuses, and end screens show results and a restart. Keyboard, swipe, and labeled touch controls provide the same core actions.

A bounded fixed-step simulation is separate from rendering. The renderer loads when needed, limits resolution, reuses scene objects, and releases resources. Inactive windows or hidden pages pause the run until resumed. Reduced motion removes camera sway and decorative movement while preserving play. Sound is opt-in. Best score and distance are local and outside the Workbench backup. A failed WebGL startup has an explicit recovery message.

## Subsurface

Subsurface is a real 3D underwater research game. Original procedural geometry, depth layers, light, and restrained particles define three underwater zones. The craft, channels, amber specimens, hull, protection, and sonar are readable at the available window size.

Visitors start a dive, control rise and descent, collect specimens, and navigate the route. Pause, resume, loss, completion, and restart have explicit states. Keyboard and touch controls remain visible and equivalent. A 2D fallback keeps the same game rules and controls available when WebGL cannot start.

The simulation and render loop pause when the app or page is inactive, retaining the run in memory. Reduced motion removes ambient water movement, particles, craft roll, and sonar expansion while preserving navigation. Best score remains local and outside session export. Closing releases the scene; an in-progress run is not represented as serialized backup data.

## Vector Lab

Vector lab is a mission-based 3D experiment. Dock teaches addition by combining two thrusters, Thrust teaches projection along a fixed guide, and Lift teaches the cross product. Explore removes the target and lets visitors compare operations freely.

The scene shows vector handles, a result, a target where relevant, and a probe that tests the setup. Coordinate fields, axis controls, keyboard adjustment, and direct dragging support the same experiment. XY and XZ planes make dragging understandable; camera orbit remains separate from changing a vector. Target feedback, explanations, and completion state connect a mathematical operation to a visible result.

Inputs accept values from −3 to 3, preserve partial entry while editing, indicate invalid input, and prevent testing an invalid setup. Vector length, angle, sum, projection, and cross product stay inspectable through the numeric controls. The scene renders on demand, pauses while hidden, and resolves test flights immediately for reduced motion. If WebGL is unavailable, calculations and mission checks remain usable.

Each Vector instance stores valid vectors, camera view, selected mission, and completion progress in browser storage. Existing valid vector/view state remains readable. This per-app state is outside the Settings session-and-Files backup.

## Data, Accessibility, and Motion

Session and Files state are validated and committed together after a short debounce. The bounded window registry remembers workspaces, geometry, appearance, serialized app data, Notes, and How I work state. Backup import checks the pair before replacement; corrupt or conflicting data has an explicit recovery path.

Settings backups cover session and Files only. Separate brief drafts, Vector state, sound preference, game records, and transient component state have their own lifecycles. Local session and Files data have no account, upload, or remote sync. Market monitor, Web search, and Ask about Sam use separate network services and disclose those boundaries.

Visible focus, readable control names, semantic headings, keyboard routes, status announcements, and validation remain part of every surface. Permanent deletion names its consequence. Responsive layouts preserve tasks and access to controls. The homepage uses labeled navigation and a skip link to its footer; spatial tools retain numeric controls. Motion has a clear purpose, stops when not needed, and respects reduced motion.
