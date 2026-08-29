# Keep the public decision path inside short viewports

Status: **Rejected / historical — 2026-08-30.** This plan depended on the discarded public-positioning direction and its no-initial-scroll acceptance criterion is not the current contract. `DESIGN.md` now permits natural scrolling on short viewports rather than compressing or rewriting the restored front door. Do not implement this file as an active plan.

Written against: 439ff49866483eed6421c4d52ed12d0e88ad35e6

## Evidence chain

- Surface: `/` public front door, both the resting state and the focus-restored state after closing Workbench.
- Problem: the route responds to width but not height. On a fresh 1280×600 viewport, the document measures 659px tall and the public index ends at 630.8px; primary links begin below the 600px fold. After Workbench returns focus to the expanded aperture, the document grows further. At 390×600 the document measures 666px and the index ends at 648.6px. The current literal email label also splits inside its domain, but the approved positioning/contact plan replaces that label and owns the markup correction.
- Design evidence: `PRODUCT.md` defines success as identity, current focus, availability, and direct contact/Solynth/Workbench routes within one viewport; it requires the single-page portfolio to remain responsive and the public path immediately legible. `DESIGN.md` defines the front door as one quiet composition with the availability line and two compact link groups anchored at the bottom, and says compact widths collapse spacing without changing that hierarchy.
- Owner: height, hero, index, aperture, and compact link presentation in `app/styles/global.css`. `design-plans/public-positioning-contact-metadata.md` owns all public copy and link markup in `app/components/PortfolioShell.tsx`.
- Scope and affected surfaces: fresh load, focused/expanded aperture, return from Workbench, desktop/tablet short-height viewports, compact phone viewports, and the approved public action labels supplied by the positioning/contact plan.
- Uncertainty: none about the failure at the measured viewports. A 320px-wide browser is supported by `html { min-width: 320px; }`; no minimum viewport height is documented, so validation must cover realistic short browser heights rather than assuming 720px.

## Design decision

Add a height-aware density branch that reuses the existing compact public spacing/type values so the complete decision path remains visible on short screens, including when the aperture is expanded or focused. Treat the approved “Discuss a software project” contact action and optional Workbench action as fixed content inputs: this plan makes them fit but does not rename or reimplement them.

## Reuse

- Existing compact public padding `1.1rem` from `app/styles/global.css`.
- Existing 980px hero scale `clamp(3.6rem, 9.2vw, 5.8rem)`, `line-height: 0.9`, and line gap `clamp(1rem, 3vw, 2rem)`.
- Existing compact hero scale and two-column public index below 620px.
- Existing `.public-index` grid, link arrow treatment, and operational-label scale; reuse these unchanged around the approved public actions from `design-plans/public-positioning-contact-metadata.md`.

The width-only media queries cannot express the proven height constraint, so a surface-local height query belongs in `global.css`; no shared responsive primitive is warranted.

## Changes

1. `app/styles/global.css`
   - Change: add a short-height branch for widths above 620px and heights at or below 740px. Set `.public-surface` vertical padding to the existing `1.1rem`; set `.hero-cluster` vertical margins to `1.1rem`; reuse the existing 980px hero font scale/line-height and line-gap values listed above.
   - Change: add a compact short-height branch at widths at or below 620px and heights at or below 640px. Keep the existing compact type hierarchy, reduce `.hero-cluster` vertical margins to `1.1rem`, and tighten only the existing public-index vertical gap/padding as necessary to keep every link visible at 390×600. If 320×568 still needs reduction, step the current compact hero clamp down without changing its weight, order, or four-part hierarchy.
   - Change: remove the obsolete compact-contact `overflow-wrap: anywhere` rule once `PortfolioShell.tsx` uses the approved short action label. Do not introduce breakpoint-specific duplicate link text.
   - Preserve: carbon/ivory/cobalt palette, public gutter behavior, two calm hero beats on ordinary-height desktop screens, the two compact link columns, focus styling, motion/reduced-motion behavior, and natural document scrolling as a fallback below the validated minimum.
   - Verify: the public index’s bottom edge is at or above the viewport bottom at all validation sizes and in both aperture states; no link text is clipped or split inside a word.

## Scope

- Inherit: root-route initial render, aperture hover/focus, Workbench close/focus restoration, and width breakpoints at 980px and 620px.
- Verify: 1280×720, 1280×600, 981×600, 980×600, 620×600, 390×844, 390×600, and 320×568; test mouse rest, keyboard focus on the aperture, and reduced motion.
- Exclude: changing the approved hero, role, availability, contact destination/copy, LinkedIn URL, metadata, or telemetry; adding explanatory deck copy; removing required links; redesigning Workbench; or solving unrelated browser chrome/safe-area behavior. Those public-content changes belong to `design-plans/public-positioning-contact-metadata.md`.

## Validation

- Product: at every viewport, confirm identity, availability, Discuss a software project, Solynth Labs, the optional Workbench action, GitHub, BaiOS Source, LinkedIn, and Résumé can all be seen and chosen without an initial scroll; the hero remains the dominant message.
- Interface: capture resting and focused-aperture screenshots at the specified desktop/tablet sizes and resting compact screenshots at the specified phone sizes. Confirm `document.documentElement.scrollWidth === innerWidth` and the last public link’s bottom is `<= innerHeight` for the validated first-viewport states.
- System: confirm the 980px and 620px width branches still own mode/hierarchy changes, the new height rules only compress vertical rhythm, and no duplicate contact-link component or parallel color/type token is introduced.
- Repository: `npm run lint && npm test && npm run build` → all checks pass without new warnings or layout-source type errors.

## Stop conditions

- Stop if fitting the required routes would require hiding a required link, changing the hero statement, or shrinking operational text below the existing label scale. In that case, revisit the height threshold and layout allocation rather than removing content.

## Design documentation

- After acceptance and validation: add the short-height behavior to `DESIGN.md` under Public Front Door, including the validated minimum viewport sizes and the requirement that aperture focus restoration not push the decision path below the fold. The positioning/contact plan owns documentation of the action labels.
