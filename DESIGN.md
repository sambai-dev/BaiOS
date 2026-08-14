---
name: "Quiet Junction / Sam Bai Portfolio"
description: "A precise, operational portfolio where authored software is the proof."
colors:
  carbon: "#11110f"
  carbon-soft: "#1b1b18"
  ivory: "#f0efe8"
  ivory-muted: "#bbb9b0"
  cobalt: "#4c5ce5"
  cobalt-deep: "#3543bd"
  signal: "#59df79"
  rule-dark: "rgba(17, 17, 15, 0.26)"
  rule-light: "rgba(240, 239, 232, 0.24)"
typography:
  display:
    fontFamily: "Archivo Black, sans-serif"
    fontSize: "clamp(4.4rem, 9.7vw, 9.8rem)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "-0.038em"
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
  workbench-control:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.65rem"
    height: "2rem"
  workbench-control-hover:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.carbon}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.65rem"
    height: "2rem"
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
  scratchpad-field:
    backgroundColor: "transparent"
    textColor: "{colors.carbon}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.9rem"
---

# Design System: Quiet Junction / Sam Bai Portfolio

## Overview

**Creative North Star: "Quiet Junction"**

Quiet Junction is a senior, authored operating environment disguised as a sparse public front door. Carbon grain, monumental ivory type, cobalt route light, tiny operational readouts, and square rules create a private-feeling place where restraint carries more authority than a gallery of claims.

The public layer stays quiet and exacting; the Workbench reveals the machinery behind the person. Its windows, command surfaces, local tools, and two original interactive labs make software itself the personality. The tactility comes from direct manipulation, responsive state, and material contrast—not nostalgic interface cosplay.

**Key Characteristics:**

- Monumental Archivo Black statements paired with Azeret Mono operational telemetry.
- Carbon and ivory fields routed by cobalt, with signal green reserved for live, focus, and immediate action.
- Square geometry, one-pixel rules, and grain establish material without nostalgic interface cosplay.
- Flat public composition gives way only to structurally elevated Workbench windows and palette.
- Working software reveals personality through optional, usable experiments rather than decorative demos.

## Colors

The palette behaves like an operating signal system: warm near-black and paper neutrals carry the field, cobalt shows the current route, and green confirms that something is live or focused.

### Primary

- **Cobalt Operational Light** (`colors.cobalt`): Marks active modules, selected rows, the Workbench field, and the public route underline.
- **Deep Cobalt** (`colors.cobalt-deep`): Carries quieter operational labels and secondary blue emphasis on ivory surfaces.

### Secondary

- **Signal Green** (`colors.signal`): Reserved for live indicators, keyboard focus, active-window outlines, and short success-like control states.

### Neutral

- **Carbon Grain** (`colors.carbon`): The public ground, Workbench chrome, console field, and title bars.
- **Soft Carbon** (`colors.carbon-soft`): A restrained tonal step for inset notes or secondary dark fields.
- **Ivory Paper** (`colors.ivory`): Primary light text on carbon and the Workbench window surface.
- **Muted Ivory** (`colors.ivory-muted`): Low-priority metadata and inactive operational labels.
- **Dark Rule** (`colors.rule-dark`): One-pixel separation on ivory fields.
- **Light Rule** (`colors.rule-light`): One-pixel separation on carbon and cobalt fields.

### Named Rules

**The Cobalt Is Route Rule.** Use cobalt to show where the visitor is, what is selected, or where an interaction leads; do not spread it as ambient decoration.

**The Signal Is Evidence Rule.** Signal green means live, focused, or actionable. Its rarity is what makes it trustworthy.

## Typography

**Display Font:** Archivo Black (with sans-serif fallback)  
**Body Font:** Archivo (with sans-serif fallback)  
**Label/Mono Font:** Azeret Mono (with monospace fallback)

**Character:** The pairing moves between a compressed public declaration and exact operational annotation. Archivo supplies a clear reading voice inside tools; Azeret Mono makes state, coordinates, shortcuts, and small labels feel authored rather than decorative.

### Hierarchy

- **Display** (400, `typography.display`, 0.86): Monumental public statements; keep lines short enough for the compressed rhythm to remain legible.
- **Headline** (400, `typography.headline`, 0.92): Workbench app propositions and major window content headings.
- **Title** (560, `typography.title`, 1): Compact lab and calculator titles where hierarchy must hold inside a window.
- **Body** (400, `typography.body`, 1.48): Explanations and working copy; practical measures typically stop between 48ch and 62ch.
- **Label** (400, `typography.label`, uppercase where operational): State, shortcuts, coordinates, field legends, HUD copy, and navigation metadata.

### Named Rules

**The Monument and Telemetry Rule.** Use display type for a decisive idea and mono type for the system around it; never let both voices compete at the same scale.

## Layout

The shared spatial grammar is field-and-rule, not card-and-gap. Content sits in broad carbon, cobalt, or ivory fields; one-pixel rules establish alignment; large declarations and compact operational data create the density contrast. Public outer padding steps from 2rem to 1.5rem below 980px and 1.1rem below 620px. Within the Workbench, compact control padding clusters around 0.6–1rem, while app content uses about 1–1.2rem.

At 980px, free-positioned Workbench windows become one active inset window, resize grips disappear, and the eight-app dock becomes horizontally scrollable. Split lab layouts stack vertically instead of compressing their working surface. The public index reflows before its labels become illegible. At 620px the public link field becomes two columns; at 520px Workbench metadata and multi-column data rows simplify again. Preserve the task and hierarchy at each breakpoint instead of miniaturizing the desktop.

**The Collapse by Mode Rule.** Desktop supports spatial composition and direct window management; small screens support one clear active task with the same content and state.

## Elevation & Depth

The system is flat by default. Grain, field color, one-pixel rules, and active-state inversion create most separation. Shadows are structural and appear only where an object genuinely floats: the live Workbench aperture, movable windows, the command palette, and a temporary lab overlay.

### Shadow Vocabulary

- **Aperture Rest** (`0 14px 36px rgba(0, 0, 0, 0.28)`): Holds the live Workbench aperture above the public field.
- **Aperture Hover** (`0 20px 52px rgba(0, 0, 0, 0.42)`): Confirms the aperture can open without turning it into a card.
- **Window Rest** (`0 22px 58px rgba(10, 10, 9, 0.32)`): Separates movable ivory windows from the cobalt desktop.
- **Window Active** (`0 28px 78px rgba(10, 10, 9, 0.46)`): Raises the focused window; a one-pixel signal outline carries the active state.
- **Palette** (`0 30px 90px rgba(10, 10, 9, 0.5)`): Reserves the strongest lift for the modal command surface.
- **Lab Overlay** (`0 18px 50px rgba(10, 10, 9, 0.34)`): Lifts the start or restart prompt above the Subsurface canvas.

### Named Rules

**The Structural Lift Rule.** If a surface cannot be dragged, opened, or treated as a temporary layer, it does not earn a shadow.

## Shapes

The form language is square and mechanical. Panels, windows, controls, text fields, docks, and the command palette use zero corner radius. One-pixel rules and hard clipping define their silhouettes; the Workbench resize grip uses diagonal rule marks instead of an ornamental handle. Circles are limited to status dots, route marks, and plotted data—not container corners.

**The Square Instrument Rule.** Controls should read as instruments set into a system, never as soft app-store cards or pills.

## Components

### Buttons

- **Shape:** Square, border-led controls (`rounded.none`) with compact horizontal padding.
- **Primary:** The common Workbench action is transparent ivory on carbon; high-intent local actions invert to signal green on carbon.
- **Hover / Focus:** Hover and keyboard focus use the same color inversion. The global focus indicator is a two-pixel signal outline with a four-pixel offset; inset focus is used only where a canvas or field must retain its dimensions.
- **Secondary / Ghost:** Public links and dock items remain transparent until hover, focus, or selection gives them a cobalt field or a drawn underline.

### Cards / Containers

- **Corner Style:** Square (`rounded.none`).
- **Background:** Carbon, cobalt, or ivory fields only; avoid nested neutral card stacks.
- **Shadow Strategy:** Follow the Structural Lift Rule.
- **Border:** One-pixel dark-on-light or light-on-dark rules.
- **Internal Padding:** Compact tools use 0.6–1rem; content windows use 1–1.2rem.

### Inputs / Fields

- **Style:** Text controls remain square and legible. Scratchpad uses a transparent ivory field with a one-pixel dark rule; console input is borderless within a ruled carbon command row; vector axes use editable text drafts with decimal input hints so empty and partial values remain typeable.
- **Focus:** Use cobalt inset focus for light fields and the shared signal focus outline for standalone interactive surfaces.
- **Error / Disabled:** Vector drafts mark invalid or out-of-range values with `aria-invalid`, a compact status line, and a restrained red field tint. Calculations run only when all six drafts are finite values from −3 to 3; otherwise the results show em dashes. No generic disabled visual is established.

### Navigation

Public navigation is plain text with an underline that draws from right to left on hover or focus (280ms, exponential ease). Workbench navigation is an eight-app dock: compact mono labels, shortcut numbers, and open/minimized/closed state text; active items become cobalt. On small screens the dock scrolls horizontally and remains the persistent app switcher.

### Workbench Aperture

The aperture is a small live instrument, not a promotional card. It uses carbon, a one-pixel cobalt border, a cobalt title strip, operational rows, and a signal live dot; hover changes the border to signal green and applies a restrained 1.025 scale. Opening it expands a circular reveal from the top-right over 720ms using the shared exponential ease; reduced motion receives a 150ms opacity fade.

### Workbench Window

Windows use ivory content, carbon title bars, square clipping, structural shadow, and a signal outline when active. Desktop windows can be raised, dragged, minimized, maximized, closed, and resized from an explicit bottom-right grip. The grip supports arrow-key resizing in 12px steps and 32px steps with Shift; layout is saved locally. Below 980px only the active window is shown and drag/resize controls are removed rather than simulated.

### Command Palette

The command palette is the highest-elevation surface: an ivory panel over a blurred carbon scrim, a display-sized native search field, and rule-separated results. `/` opens it; arrows, Home, End, and Enter manage the active result; Escape closes and returns focus. Hover, focus, and active-result state all use the same cobalt inversion.

### Method Tabs

Method is a real tablist with Clarify, Shape, Ship, and Learn panels. Selected and hover states invert to cobalt; arrow keys, Home, and End move selection and focus. Panel changes use an eight-pixel rise with opacity, suppressed when reduced motion is requested.

### Subsurface Lab

Subsurface is an original depth-control mini-game contained inside a Workbench window. Its cobalt sonar field, ivory craft, carbon obstacles, mono HUD, and square signal overlay belong to the same system while remaining locally tuned canvas colors. Motion begins with an explicit start or pulse; pointer/tap, Space, Arrow Up, and Enter are equivalent controls. The best score is described and stored as local-only, and reduced motion freezes the ambient sweep without disabling play. In the mobile single-window layout, an inactive Subsurface window pauses its animation frame loop while preserving the model, then resumes from that state when active again.

### Vector Lab

Vector Field is a working spatial calculator, not an illustration. Decimal input drafts keep empty and partial values editable while exposing native decimal keyboards; each axis reports invalid or out-of-range state accessibly. Dot product, cross product, and area update only when both vectors contain finite values from −3 to 3, and show em dashes otherwise. A canvas-projected three-dimensional grid responds to pointer drag for direct orbit. The desktop split gives the canvas more space than the control panel, while narrow layouts stack the plot over its inputs and results.

### Named Rules

**The Working Software as Personality Rule.** Use an interactive experiment when it demonstrates real judgment or capability and remains optional; not every screen needs to be gamified.

**The Native Control Rule.** Direct manipulation must keep a legible keyboard or native-input path, visible focus, and truthful local-state language.

## Do's and Don'ts

### Do:

- **Do** pair one monumental message with quiet operational metadata.
- **Do** use cobalt for route, selection, and current state; use signal green only for live, focus, or immediate action.
- **Do** let optional working software reveal personality when it remains useful, truthful, and self-contained.
- **Do** use square fields, one-pixel rules, and restrained grain before adding depth.
- **Do** preserve keyboard, native-input, reduced-motion, and local-only state conventions wherever interaction is direct.
- **Do** pause hidden animation work in compact single-window layouts without discarding the visitor's in-progress state.

### Don't:

- **Don't** turn the portfolio into a project-card résumé or a wall of interchangeable case-study tiles.
- **Don't** drift into a generic SaaS component dashboard or rounded-card shell.
- **Don't** clone retro-Mac chrome, icons, or window decoration; the Workbench is an original typographic operating system.
- **Don't** use shadows on static content fields or treat cobalt and signal green as decoration.
- **Don't** start continuous lab motion before the visitor initiates it or hide the same task behind pointer-only interaction.
