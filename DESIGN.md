---
name: "Quiet Junction / Sam Bai Portfolio"
description: "A precise, local-first portfolio where authored working software is the proof."
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
    fontSize: "clamp(3.9rem, 7.2vw, 6rem)"
    fontWeight: 650
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 3.45rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 560
    lineHeight: 1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.48
    letterSpacing: "normal"
  label:
    fontFamily: "Azeret Mono, monospace"
    fontSize: "0.58rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.02em"
rounded:
  none: "0"
  status: "50%"
components:
  public-index-link:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0"
  workbench-menu-trigger:
    backgroundColor: "transparent"
    textColor: "{colors.ivory-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.78rem"
    height: "3.75rem"
  workbench-menu-trigger-active:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.carbon}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.78rem"
    height: "3.75rem"
  dock-app:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.6rem 0.75rem"
    height: "4.6rem"
  dock-app-active:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.6rem 0.75rem"
    height: "4.6rem"
  system-search-field:
    backgroundColor: "transparent"
    textColor: "{colors.carbon}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    padding: "0.4rem 0"
---

# Design System: Quiet Junction / Sam Bai Portfolio

## Overview

**Creative North Star: "Quiet Junction"**

Quiet Junction is a senior, authored operating environment disguised as a sparse public front door. Carbon grain, monumental ivory type, themeable route light, tiny operational readouts, and square rules create a private-feeling place where restraint carries more authority than a gallery of claims.

The public layer stays quiet and exacting; the Workbench reveals the machinery behind the person. Workbench, Atlas, Archive, Control, the menu system, and the workspace language form an original clean-room visual and interaction vocabulary. Their windows, local tools, recoverable state, and three interactive labs make working software itself the personality without importing another product's names, icons, or trade dress.

The Workbench is explicitly local-only: there is no account, login, remote sync, filesystem service, or backend. Browser storage and visitor-initiated JSON export/import are the only persistence paths, and every state message must preserve that truth.

**Key Characteristics:**

- Monumental Archivo statements paired with Azeret Mono operational telemetry.
- Carbon and ivory structure routed by cobalt, oxide, or graphite accents with a coordinated signal color.
- Square geometry, one-pixel rules, and restrained grain establish material without nostalgia cosplay.
- Flat public composition gives way only to structurally elevated Workbench windows, menus, Atlas, and system search.
- Working software reveals personality through optional, usable instruments rather than decorative demos.

## Colors

The palette behaves like an operating signal system. Warm near-black and paper neutrals carry the field; the selected theme changes route, depth, and signal together. Carbon, ivory, and the one-pixel rules remain stable so theme changes preserve hierarchy and contrast.

### Base Theme: Cobalt

- **Cobalt Operational Light** (`colors.cobalt`): The default route color for the desktop field, active modules, selected rows, and public route underline.
- **Deep Cobalt** (`colors.cobalt-deep`): Quieter route metadata and secondary blue emphasis on ivory.
- **Signal Green** (`colors.signal`): Live indicators, keyboard focus, active-window outlines, and immediate action.

### Alternate Themes

- **Oxide** (`colors.oxide`), **Oxide Deep** (`colors.oxide-deep`), and **Oxide Signal** (`colors.oxide-signal`): A warmer, late-session route with amber focus evidence.
- **Graphite** (`colors.graphite`), **Graphite Deep** (`colors.graphite-deep`), and **Graphite Signal** (`colors.graphite-signal`): A quieter neutral route with blue-white focus evidence.

### Neutral

- **Carbon Grain** (`colors.carbon`): Public ground, Workbench chrome, console field, and title bars.
- **Soft Carbon** (`colors.carbon-soft`): A restrained tonal step for inset notes and secondary dark fields.
- **Ivory Paper** (`colors.ivory`): Primary light text on carbon and the Workbench window surface.
- **Muted Ivory** (`colors.ivory-muted`): Low-priority metadata and inactive operational labels.
- **Dark Rule** (`colors.rule-dark`): One-pixel separation on ivory fields.
- **Light Rule** (`colors.rule-light`): One-pixel separation on carbon and route-color fields.

### Named Rules

**The Route Is State Rule.** Use the active route color to show where the visitor is, what is selected, or where an interaction leads; do not spread it as ambient decoration.

**The Signal Is Evidence Rule.** The active theme's signal means live, focused, or immediately actionable. Its rarity is what makes it trustworthy.

**The Palette Contract Rule.** Cobalt, oxide, and graphite swap route, deep, and signal values as one set; carbon, ivory, typography, rules, and square geometry do not change with the theme.

## Typography

**Display/Body Font:** Archivo (with sans-serif fallback)

**Workbench Headline/Title Font:** Archivo Black (with sans-serif fallback)

**Label/Mono Font:** Azeret Mono (with monospace fallback)

**Character:** The pairing moves between a compressed public declaration and exact operational annotation. Archivo supplies a clear reading voice inside tools; Azeret Mono makes state, coordinates, shortcuts, file metadata, and menu labels feel authored rather than decorative.

### Hierarchy

- **Display** (650, `typography.display`, 0.9): Monumental public statements; keep lines short enough for the compressed rhythm to remain legible.
- **Headline** (400, `typography.headline`, 0.92): Workbench app propositions and major window content headings.
- **Title** (560, `typography.title`, 1): Compact lab and calculator titles where hierarchy must hold inside a window.
- **Body** (400, `typography.body`, 1.48): Explanations and working copy; practical measures typically stop between 48ch and 62ch.
- **Label** (400, `typography.label`, uppercase where operational): Menus, state, shortcuts, coordinates, field legends, HUD copy, and navigation metadata.

### Named Rules

**The Monument and Telemetry Rule.** Use display type for a decisive idea and mono type for the system around it; never let both voices compete at the same scale.

## Layout

The shared spatial grammar is field-and-rule, not card-and-gap. Content sits in broad carbon, route-color, or ivory fields; one-pixel rules establish alignment; large declarations and compact operational data create the density contrast. Public outer padding steps from 2rem to 1.5rem below 980px and 1.1rem below 620px. Within the Workbench, compact control padding clusters around 0.6–1rem while app content uses about 1–1.2rem.

Workbench desktop space is divided into the menu bar, a free window field, and an eleven-app dock. Build, Field, and Notes are three local workspaces with independent active-window memory. The right-side desktop objects provide direct routes to Archive, Atlas, Subsurface, Railshift, and Control; Atlas is the cross-workspace map rather than another workspace. Scratch, Vector, and Archive can open multiple instances in a workspace; other apps recover or focus their existing instance. The total saved window registry is bounded at 60 instances.

Between 981px and 1120px, the dock becomes a horizontal strip without changing the desktop window model. At 980px, the environment changes modes: only one active window is visible while inactive or minimized open windows in visited workspaces remain mounted, hidden, inert, and `aria-hidden`. Drag, resize, desktop objects, context menus, and snap previews disappear; the dock becomes the persistent horizontal task switcher. Heavy app bodies mount only after their workspace has been visited. Archive restructures at 840px and 580px, the menu bar condenses at 1080px and 760px, Atlas simplifies at 620px, and the Workbench compacts again at 520px.

Workspace changes outside Atlas transfer focus after rendering to that workspace's remembered active window, or to the Workbench root when the workspace is empty. Atlas retains focus ownership while its own workspace tabs change.

**The Collapse by Mode Rule.** Desktop supports spatial composition and direct window management; compact screens support one clear active task while preserving open local work, focus order, and session state.

## Elevation & Depth

The system is flat by default. Grain, field color, one-pixel rules, and active-state inversion create most separation. Shadows are structural and appear only where an object genuinely floats: the live Workbench aperture, movable windows, popup menus, Atlas, system search, context menus, and temporary status or lab overlays.

### Shadow Vocabulary

- **Aperture Rest** (`0 14px 36px rgba(0, 0, 0, 0.28)`): Holds the live Workbench aperture above the public field.
- **Aperture Hover** (`0 20px 52px rgba(0, 0, 0, 0.42)`): Confirms the aperture can open without turning it into a card.
- **Window Rest** (`0 22px 58px rgba(10, 10, 9, 0.32)`): Separates movable ivory windows from the route-color desktop.
- **Window Active** (`0 28px 78px rgba(10, 10, 9, 0.46)`): Raises the focused window; a one-pixel signal outline carries the active state.
- **Window Snapped** (`0 18px 48px rgba(10, 10, 9, 0.4)`): Holds a snapped window without making it appear as elevated as the freely focused state.
- **Menu Popup** (`0 24px 70px rgba(17, 17, 15, 0.36)`): Separates a temporary app-aware menu from the window field.
- **Context Menu** (`0 20px 52px rgba(10, 10, 9, 0.42)`): Gives the desktop-local action list a clear temporary layer.
- **System Search** (`0 30px 90px rgba(10, 10, 9, 0.5)`): Reserves the strongest routine lift for the modal command surface.
- **Atlas Surface** (`0 36px 96px rgba(0, 0, 0, 0.52)`): Holds the workspace map above every working surface.
- **Lab / Notice Overlay** (`0 18px 50px rgba(10, 10, 9, 0.34)`): Lifts a start, restart, save, or recovery notice above its immediate context.

### Named Rules

**The Structural Lift Rule.** If a surface cannot be dragged, opened, or treated as a temporary layer, it does not earn a shadow.

## Shapes

The form language is square and mechanical. Panels, windows, controls, text fields, docks, menus, Atlas previews, and system search use zero corner radius. One-pixel rules and hard clipping define their silhouettes; the Workbench resize grip uses two diagonal rule marks in a 1.25rem square instead of an ornamental handle. Circles are limited to status dots, route marks, and plotted data—not container corners.

**The Square Instrument Rule.** Controls should read as instruments set into a system, never as soft app-store cards or pills.

## Components

### Buttons

- **Shape:** Square, border-led controls (`rounded.none`) with compact horizontal padding.
- **Primary:** The common Workbench action is transparent ivory on carbon; high-intent local actions invert to the active signal color on carbon.
- **Hover / Focus:** Hover and keyboard focus use the same color inversion where practical. The shared focus indicator is a two-pixel signal outline with a four-pixel offset; inset focus is used where a menu or field must retain its dimensions.
- **Secondary / Ghost:** Public links and dock items remain transparent until hover, focus, or selection gives them a route-color field or a drawn underline.

### Cards / Containers

- **Corner Style:** Square (`rounded.none`).
- **Background:** Carbon, route-color, or ivory fields only; avoid nested neutral card stacks.
- **Shadow Strategy:** Follow the Structural Lift Rule.
- **Border:** One-pixel dark-on-light or light-on-dark rules.
- **Internal Padding:** Compact tools use 0.6–1rem; content windows use 1–1.2rem.

### Inputs / Fields

- **Style:** Text controls remain square and legible. Scratch uses a transparent ivory field with a one-pixel dark rule; console input is borderless within a ruled carbon command row; Vector axes use editable text drafts with decimal input hints so empty and partial values remain typeable.
- **Focus:** Use route-color inset focus for light fields and the active signal outline for standalone interactive surfaces.
- **Error / Disabled:** Vector drafts mark invalid or out-of-range values with `aria-invalid`, a compact associated status line, and a restrained red field tint. Calculations run only when all six drafts are finite values from −3 to 3; otherwise the results show em dashes. Disabled actions retain labels and reduce emphasis rather than disappearing.

### Workbench Aperture

The aperture is a small live instrument, not a promotional card. On desktop it rests at a compact 11.4rem width with its detail rows collapsed, then expands to `clamp(18rem, 22vw, 21rem)` on hover or focus to reveal its operational body and action. It uses carbon, a one-pixel cobalt border, a cobalt title strip, and a signal live dot; the width and border carry the invitation with no scale transform. Opening it expands a circular reveal from the top-right over 720ms using the shared exponential ease; reduced motion receives a 150ms opacity fade.

### Workbench Menu Bar

The top bar combines the S/B mark, current app and workspace context, five app-aware menus, system controls, and local time. Workbench, File, View, Window, and Go expose only actions meaningful to the active window; File offers a new window only for multi-instance apps, Window changes Maximize to Restore when appropriate, and Go lists all three workspaces. The semantic menubar and popup menus use roving focus, arrows, Home, End, Enter, Space, Escape, and Tab-close behavior. Selected and focused controls invert to signal; destructive actions use a local dark-red treatment rather than a new global color token.

### Workbench Window

Windows use ivory content, carbon title bars, square clipping, structural shadow, and a signal outline when active. Desktop windows can be raised, dragged, minimized, closed, maximized/restored, resized, snapped left or right, or maximized through the top snap target. The resize grip supports arrow-key resizing in 12px steps and 32px steps with Shift. Closing marks an instance closed instead of deleting it: geometry and serialized app data remain available for a later reopen, while the closed instance leaves Atlas and the dock's running count. Scratch and Archive instance data can therefore recover after reopening. At the 60-instance capacity, opening a matching saved instance recovers it rather than creating another.

### Workbench Dock

The dock exposes all eleven registered apps—Now, Stack, Method, Scratch, Console, Links, Subsurface, Railshift, Vector, Archive, and Control—with number shortcuts plus R for Railshift and exact Closed, Suspended, Active, or Running status. Shift plus a shortcut or dock activation requests a new instance only for Scratch, Vector, and Archive. The dock shows multiple-instance count as a small signal badge and becomes horizontally scrollable before labels need to compress.

### System Search

System search is a modal editable combobox and listbox, not a decorative command field. `/` opens it and results span apps, open window instances, workspaces, non-trash Archive entries, and local system commands. Arrows, Home, End, and Enter move and execute the active result; Escape closes the surface and returns focus to the Workbench root. Hover, focus, and active-result state use the same route-color inversion.

### Atlas

Atlas is the original cross-workspace map. It opens as a modal surface, exposes Build, Field, and Notes as semantic workspace tabs, and previews only the selected workspace's open windows; minimized windows are labeled Suspended. Tabs support arrows, Home, and End. Preview buttons support spatial four-arrow movement and Enter to restore or focus a surface. Atlas traps focus and restores the invoking control when it closes.

### Archive

Archive is a bounded, writable file environment shared by all Archive windows in the browser. It supports indexed search, folder and note creation, note editing, rename, trash, restore, recursive permanent deletion, breadcrumbs, list/grid views, and location shortcuts. Each Archive window remembers its current folder while sharing the same validated tree. Listbox traversal supports arrows, Home, End, Enter, F2, and Delete; destructive actions require confirmation. Its footer states that the archive lives only in the browser and nothing is uploaded. Archive does not represent uploads, arbitrary attachments, remote storage, or collaboration.

### Control

Control is the local settings and recovery instrument. Its real radio inputs switch among cobalt, oxide, and graphite; workspace controls route to Build, Field, or Notes; an `aria-live` status reports session writes. Export downloads a dated, versioned JSON backup containing the validated session and Archive tree. Import validates and replaces that paired state rather than merging it. Restore default layout resets geometry, size, snap, and maximize state for existing windows in the current workspace without recreating closed defaults or deleting extra instances.

### Method Tabs

Method is a real tablist with Clarify, Shape, Ship, and Learn panels. Selected and hover states invert to the active route color; arrow keys, Home, and End move selection and focus. Panel changes use an eight-pixel rise with opacity, suppressed when reduced motion is requested.

### Subsurface Lab

Subsurface is an original depth-control mini-game contained inside a Workbench window. Its route-color sonar field, ivory craft, carbon obstacles, mono HUD, and square signal overlay belong to the same system while remaining locally tuned canvas colors. Motion begins only with an explicit start or pulse; pointer/tap, Space, Arrow Up, and Enter are equivalent controls. The best score is described and stored as local-only and is not part of the session backup. Reduced motion freezes the ambient sweep without disabling play. Open Subsurface bodies remain mounted after their workspace has been visited; when the window is inactive, minimized, or hidden by a workspace switch, the animation frame loop pauses while preserving its in-memory model and resumes when active. Closing the window unmounts that body.

### Railshift Lab

Railshift is an original pseudo-spatial, three-lane signal runner contained inside a Workbench window. A carbon rail corridor, active route color, ivory obstacles, signal cells, and geometric courier form one sharp instrument rather than an imported game world. Visitors change lanes, jump barriers, duck gantries, avoid blocks, collect combo-building cells, and recover a one-hit shield through arrows or WASD, swipe gestures, and visible touch controls. Sound is synthetic and opt-in; the best score stays local and outside session export.

The simulation advances through a capped fixed timestep while drawing directly to Canvas without per-frame React state. Canvas geometry and theme colors are cached on resize, device pixel ratio is capped by surface area, HUD updates are throttled, entity and particle pools are reused, and the animation frame loop stops whenever the window or document is inactive. Reduced motion removes streaks and particles without disabling play.

### Vector Lab

Vector Field is a working spatial calculator, not an illustration. Decimal input drafts keep empty and partial values editable while exposing decimal input keyboards; each axis reports invalid or out-of-range state with `aria-invalid` and compact status guidance. Dot product, cross product, and area update only when both vectors contain finite values from −3 to 3, and show em dashes otherwise. A canvas-projected three-dimensional grid responds to pointer drag for direct orbit; the numeric calculator remains usable without orbit interaction. Mounted window bodies preserve drafts and view while inactive, minimized, or hidden after a workspace switch; closing unmounts that component-local state. Narrow layouts stack the plot over inputs and results.

### Local Session and Recovery

Session state and the Archive tree are separately validated and saved as a pair in browser storage after a short debounce. The session includes theme, active workspace, remembered active instances, the bounded window registry, serialized per-window data, Scratch content, and Method state. It does not claim to capture transient console history, search/Atlas UI, Subsurface or Railshift best scores, or unsaved component-only state. Corrupt saved values block silent overwrite and may be preserved under recovery keys. There is no network path, account, backend, cloud sync, collaboration, or cross-device promise.

### Named Rules

**The Working Software as Personality Rule.** Use an interactive experiment when it demonstrates real judgment or capability and remains optional; not every screen needs to be gamified.

**The Native Control Rule.** Direct manipulation must keep a legible keyboard or native-input path, visible focus, and truthful local-state language.

**The Local Means Local Rule.** Describe browser persistence, backup coverage, destructive actions, and recovery exactly; never imply an account, upload, remote sync, or backend.

## Do's and Don'ts

### Do:

- **Do** pair one monumental message with quiet operational metadata.
- **Do** use the theme's route color for selection and current state; reserve its signal for live, focus, or immediate action.
- **Do** use the original Workbench, Atlas, Archive, and Control vocabulary consistently.
- **Do** let optional working software reveal personality when it remains useful, truthful, and self-contained.
- **Do** use square fields, one-pixel rules, and restrained grain before adding depth.
- **Do** preserve semantic menus, tabs, listboxes, dialogs, keyboard routes, focus movement, reduced motion, and local-only state conventions.
- **Do** pause hidden animation work without discarding an open visitor task, and distinguish mounted component state from serialized session data.
- **Do** disclose export/import scope and the consequences of delete, trash, close, reset, and restore actions.

### Don't:

- **Don't** turn the portfolio into a project-card résumé or a wall of interchangeable case-study tiles.
- **Don't** drift into a generic SaaS component dashboard or rounded-card shell.
- **Don't** import third-party operating-system names, icons, window decoration, or trade dress; this is a clean-room original system.
- **Don't** imply an account, upload, cloud sync, collaboration layer, remote filesystem, or backend.
- **Don't** use shadows on static content fields or treat route and signal colors as decoration.
- **Don't** claim every state is exported: Subsurface and Railshift scores plus transient component state have deliberately narrower lifecycles.
- **Don't** start continuous lab motion before the visitor initiates it or hide the core calculator behind pointer-only interaction.
