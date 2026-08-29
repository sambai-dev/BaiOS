# Make the public promise specific and trustworthy everywhere

Status: **Rejected / historical — 2026-08-30.** The proposed “I turn software questions into working systems” promise and conversion-style action labels were not accepted. The restored public contract is documented in `DESIGN.md` and `PRODUCT.md`. Retain this file only as decision history; do not use it as implementation guidance.

Written against: 439ff49866483eed6421c4d52ed12d0e88ad35e6

## Evidence chain

- Surface: `/` before Workbench opens, the root document metadata and JSON-LD, link-preview imagery from `app/opengraph-image.tsx`, and the downloadable résumé reached from the public index.
- Problem: the public surface currently describes Sam with several incompatible labels (`Founder, Solynth Labs`, `Founder and Software Consultant`, and `SOFTWARE CONSULTATION AND PRODUCTION`) while the generic hero “Sam designs and builds software.” does not say what outcome a visitor can expect. Contact is routed through a Gmail web-compose URL instead of the visitor’s mail handler, LinkedIn points at the superseded `/in/sam-bai-dev/` path, and the aperture presents coordinates plus workspace/app counts that are neither needed for the decision path nor reliably true. The same inconsistencies propagate into metadata, JSON-LD, the generated Open Graph image, and the résumé source.
- Design evidence: `PRODUCT.md` defines the product as a truthful, legible one-page professional portfolio; requires identity, current focus, availability, and direct contact in the first viewport; prioritizes conventional links and honest claims; and explicitly forbids invented benchmarks or commercial claims. `DESIGN.md` defines Quiet Junction as one restrained composition, not a marketing-card grid, with Workbench as optional second depth. The approved positioning synthesis supplies the exact public promise, role, availability, and primary action below.
- Runtime evidence: `app/page.tsx` renders `PortfolioShell`; `app/layout.tsx` owns Metadata and Person JSON-LD; `app/opengraph-image.tsx` owns the generated share image; `scripts/build_resume.py` generates `public/resume/SamBai_Resume.pdf`. These are separate output channels for one public identity and must agree.
- Owner: visible public copy/link markup and aperture telemetry in `app/components/PortfolioShell.tsx`; document metadata and JSON-LD in `app/layout.tsx`; social-preview copy in `app/opengraph-image.tsx`; résumé link source/generation in `scripts/build_resume.py` and `public/resume/SamBai_Resume.pdf`. `app/styles/global.css` is deliberately excluded so `design-plans/public-front-door-short-viewports.md` can own responsive fitting in parallel.
- Scope and affected surfaces: human-readable identity and calls to action, default-mail-client behavior, verified LinkedIn destination, assistive names, search/social snippets, JSON-LD, link-preview image, résumé link consistency, and the expanded aperture’s trust signals.
- Uncertainty: the identity, hero, status, primary action, and LinkedIn URL are approved inputs. The generated résumé binary must only be updated through its existing generator; if local generation is not reproducible, stop rather than hand-editing the PDF.

## Design decision

Use one exact promise and one exact professional identity across every public representation:

- Hero: “I turn software questions into working systems.”
- Role: “Founder & Product Engineer, Solynth Labs.”
- Status: “Available for select B2B software engagements.”
- Primary action: “Discuss a software project” through conventional email.

Keep Quiet Junction’s existing visual hierarchy, typography, palette, rules, and single-composition layout. Keep Workbench as the optional second-depth action. Remove unverifiable location/count telemetry instead of substituting new precision, and make metadata and link previews repeat the same promise rather than introduce another positioning line.

## Reuse

- Existing identity block, two `.hero-line` beats, status row, public index, arrow treatment, and aperture interaction in `app/components/PortfolioShell.tsx`.
- Existing `Metadata`, Open Graph, Twitter, and Person JSON-LD owners in `app/layout.tsx`.
- Existing carbon/ivory/cobalt Open Graph composition and type treatment in `app/opengraph-image.tsx`.
- Existing résumé generator and PDF output path in `scripts/build_resume.py` and `public/resume/SamBai_Resume.pdf`.
- Existing Workbench launch behavior and accessibility mechanics; only its public label may become “Explore the Workbench” to make second-depth status explicit.

No new card, badge, testimonial strip, logo row, navigation system, tracking layer, or content source is warranted.

## Changes

1. `app/components/PortfolioShell.tsx`
   - Change: set the visible identity line to the exact `Founder & Product Engineer, Solynth Labs.` and the availability line to `Available for select B2B software engagements.`
   - Change: replace the hero text and its `aria-label` with `I turn software questions into working systems.` Preserve the current two-line construction by breaking after “questions” (`I turn software questions` / `into working systems.`); do not add a subtitle or card.
   - Change: make the first public action read `Discuss a software project` and use `mailto:sambai.codes@gmail.com?subject=Project%20enquiry`. Remove the Gmail-specific target/`rel` behavior and use the accessible name `Discuss a software project with Sam by email`.
   - Change: update LinkedIn to `https://www.linkedin.com/in/sam-bai1/` while retaining the existing external-link treatment and safe target attributes.
   - Change: remove the coordinates line. Replace the aperture’s numeric `BUILD / 03`, `FIELD / 03`, and `NOTES / 02` rows with nonnumeric `BUILD / READY`, `FIELD / READY`, and `NOTES / READY`; retain truthful `ATLAS / READY` and `ARCHIVE / LOCAL`; remove the `15 APPS / …` row rather than replacing it with another count. Keep the clock only where it is clearly presented as live time, not as evidence of a location.
   - Change: label the optional second-depth action `Explore the Workbench`; retain its existing button/anchor semantics, W shortcut, focus restoration, and open behavior.
   - Preserve: name, logo mark, page composition, link groups/order except for the copy above, Solynth/GitHub/source/résumé destinations, animation and reduced-motion behavior, and all Workbench internals.
   - Verify: the first viewport answers who Sam is, what he does, whether he is available, and how to start a project without any unsupported numerical or geographic claim.
2. `app/layout.tsx`
   - Change: use `Sam Bai | Founder & Product Engineer, Solynth Labs` as the default/absolute document, Open Graph, and Twitter title.
   - Change: use one aligned description for HTML, Open Graph, and Twitter: `Sam Bai is Founder & Product Engineer at Solynth Labs. I turn software questions into working systems for select B2B engagements.`
   - Change: set JSON-LD `jobTitle` to `Founder & Product Engineer` and replace the LinkedIn `sameAs` entry with `https://www.linkedin.com/in/sam-bai1/`. Keep the existing Person/Organization relationship, canonical URL, email, image, and verified address fields.
   - Preserve: viewport/theme configuration, icons, robots, metadata base, canonical URL, and script-safe JSON serialization.
   - Verify: rendered `<title>`, description, Open Graph, Twitter, canonical, and JSON-LD expose no old role, hero, or LinkedIn path.
3. `app/opengraph-image.tsx`
   - Change: set `alt` to `Sam Bai | Founder & Product Engineer, Solynth Labs`.
   - Change: render the exact hero in two calm lines (`I turn software questions` / `into working systems.`) and use the exact `Founder & Product Engineer, Solynth Labs.` as the supporting footer/role line; retain the existing visual casing treatment rather than introducing different copy.
   - Preserve: 1200×630 output, current carbon/ivory/cobalt treatment, monospaced identity details, corner/rule motif, and one-composition Quiet Junction character; do not turn the image into a card grid or add unverified product claims.
   - Verify: render the image and inspect it at full size and thumbnail scale for line fit, contrast, clipping, and agreement with page metadata.
4. `scripts/build_resume.py` and `public/resume/SamBai_Resume.pdf`
   - Change: replace both the displayed LinkedIn path and hyperlink target with `linkedin.com/in/sam-bai1/` and `https://www.linkedin.com/in/sam-bai1/`; keep the existing `Founder & Product Engineer` role and conventional email link.
   - Change: regenerate `public/resume/SamBai_Resume.pdf` exclusively through the checked-in generator. If the generator produces a new cache-busting résumé query value in `PortfolioShell.tsx`, update only that value while preserving the public action label and destination.
   - Preserve: résumé claims, chronology, formatting, filename, and all content outside the verified identity/link correction.
   - Verify: extract text/links from the generated PDF and click-test email and LinkedIn; no `/in/sam-bai-dev/` link remains.

## Scope

- Inherit: the root route, server-rendered document head, generated Open Graph image route, Person JSON-LD, and downloadable résumé reached from the public front door.
- Verify: direct page visit, keyboard navigation, default-mail-client launch, LinkedIn navigation, view-source/head inspection, link-preview image rendering, résumé download, PDF link annotations, and Workbench opening as an optional second step.
- Exclude: changing `app/styles/global.css`, solving short-height fitting, adding a card grid or case-study section, rewriting case-study/Workbench app claims, changing Workbench registry/window behavior, adding analytics, inventing proof, or changing Solynth/company/legal facts.
- Parallel ownership: implement this plan’s `PortfolioShell.tsx`, `layout.tsx`, `opengraph-image.tsx`, and résumé files as one content/trust slice. Implement `design-plans/public-front-door-short-viewports.md` only after or against these final strings, and let it own `global.css` exclusively.

## Validation

- Product: a first-time visitor can repeat the promise “I turn software questions into working systems,” identify Sam as `Founder & Product Engineer, Solynth Labs.`, see current B2B availability, start an email through their configured client, and choose Workbench only for deeper exploration.
- Content/trust: run `rg -n "Sam designs and builds software|Founder, Solynth Labs|Founder and Software Consultant|SOFTWARE CONSULTATION AND PRODUCTION|sam-bai-dev|15 APPS|37\\.7889|175\\.4646" app scripts public DESIGN.md PRODUCT.md`. After implementation, no user-facing stale positioning, old LinkedIn path, removed coordinate, or removed public app-count claim should remain; any intentional historical/design-document reference must be updated after acceptance.
- Interface: capture `/` at 1280×720 and 390×844 plus the generated Open Graph image. Confirm the exact strings, two-beat hero, link order, focus treatment, and Quiet Junction silhouette remain intact with no card grid or extra content band. Use `design-plans/public-front-door-short-viewports.md` for the separate 1280×600, 390×600, and 320×568 fit checks.
- Contact/accessibility: inspect the contact anchor’s computed accessible name and `href`; activate it from keyboard and confirm the OS/browser mail handler receives recipient `sambai.codes@gmail.com` and subject `Project enquiry`. Confirm LinkedIn uses the verified URL and safe external-link attributes.
- Metadata/social: inspect rendered title, description, canonical, Open Graph, Twitter, and JSON-LD fields; render `/opengraph-image` at 1200×630 and ensure page/share/PDF identities agree exactly.
- Résumé: regenerate, open, visually inspect, extract annotations, and confirm the PDF’s LinkedIn text and target are both `/in/sam-bai1/`; confirm the public résumé URL still resolves after any cache-key update.
- Repository: `npm run lint && npm test && npm run build` → all checks pass without new warnings, metadata serialization errors, image overflow, or broken generated artifacts.

## Stop conditions

- Stop if the verified LinkedIn slug, approved professional role, or approved exact hero/status/action copy changes; resolve the canonical source before propagating another variant.
- Stop if résumé generation is not reproducible in the repository environment or changes unrelated résumé content; do not hand-edit the PDF binary or accept an opaque broad diff.
- Stop if the exact hero cannot fit the existing two-beat Quiet Junction composition without a new content band or card treatment; coordinate only a typography/spacing adjustment with the short-viewport plan rather than changing the approved words.

## Design documentation

- After acceptance and validation: update `DESIGN.md` Public Front Door and Open Graph descriptions to record the exact hero, role, status, conventional contact action, optional “Explore the Workbench” action, and nonnumeric aperture telemetry; remove the old coordinates and app-count contract.
- After acceptance and validation: update `PRODUCT.md` only where its public identity/contact examples or app-count wording would contradict the shipped, verified surface. Preserve its truthfulness, progressive-disclosure, and conventional-navigation principles.
