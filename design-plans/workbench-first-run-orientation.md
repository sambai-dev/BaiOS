# Give first-time Workbench visitors one clear orientation window

Status: **Completed — 2026-08-30.** The one-Now-window fresh seed, empty Field/Notes defaults, legacy migration preservation, tests, and governing documentation are part of the 2026-08-30 release.

Written against: 439ff49866483eed6421c4d52ed12d0e88ad35e6

## Evidence chain

- Surface: a fresh visit to `/`, opening Workbench with no saved browser session, in the Build workspace.
- Problem: `createDefaultWorkbenchSession()` opens eight windows across three workspaces and initially renders Now, Stack, and Console together. At 1280×720 the first frame shows three window title bars, nine desktop routes, and the full dock before the visitor has chosen a task; Now and Stack both require internal scrolling at their shipped sizes (measured content: Now 372px inside a 297px viewport; Stack 373px inside a 302px viewport). The active Stack window therefore competes with the more useful Now orientation copy instead of progressively revealing the system.
- Design evidence: `PRODUCT.md` defines Workbench as an optional second-depth environment, says the public path should make personality optional and discoverable, and requires progressive disclosure so a fast-moving client gets clarity while a curious expert can find depth. The existing Now composition already supplies the deterministic orientation content: current work, Solynth Labs, Trekky.app, consulting status, location, and time.
- Owner: fresh-session defaults and window geometry in `app/lib/workbench-system.ts`; legacy/default recovery coupling in `app/lib/workbench-backup.ts`. `design-plans/public-positioning-contact-metadata.md` separately owns the nonnumeric public aperture telemetry in `app/components/PortfolioShell.tsx`.
- Scope and affected surfaces: fresh Workbench sessions, the first Build frame, Atlas’s initial surface count, dock running states, and workspace switching into initially empty Field/Notes spaces.
- Uncertainty: existing persisted visitor sessions must not be rewritten. `createDefaultWorkbenchSession()` is also used by legacy migration, so the executor must preserve legacy data rather than treating the narrower fresh seed as permission to discard it.

## Design decision

Seed one open Now window in Build, make it active, and leave Field and Notes empty until the visitor chooses an app. Increase Now’s default height just enough to present its current orientation composition without an internal scrollbar. Keep the complete app registry, dock, desktop routes, Atlas, shortcuts, and saved-session behavior available as the next layer.

## Reuse

- `now` app definition and `build-now` instance owner in `app/lib/workbench-system.ts`.
- Existing Now composition in `app/components/WorkbenchOSV3.tsx` (`Building the company and the products inside it.`, current-work paragraph, and three status rows).
- Existing empty-workspace presentation in `app/components/WorkbenchOSV3.tsx` (`.os-empty` with Open Now and Search Workbench actions).
- Existing window fitting, opening, workspace, dock, and Atlas owners; do not introduce an onboarding modal, tour, or new app.

## Changes

1. `app/lib/workbench-system.ts`
   - Change: make the fresh `windows` seed contain only `createWindowInstance("now", "build", 1, 0, "build-now")`.
   - Change: set `activeInstances` to `{ build: "build-now", field: null, notes: null }` and retain `activeWorkspaceId: "build"`.
   - Change: raise Now’s `defaultHeight` from 335 to 420; keep its 395px width, x/y position, title, copy, and single-instance behavior.
   - Preserve: every app definition and shortcut, the 60-instance bound, visitor-created/reopened windows, and existing session schema unless a version change is strictly required for validation.
   - Verify: a fresh desktop session displays one active Now window with no inner vertical scrollbar; a fresh compact session displays the same one active task.
2. `app/lib/workbench-backup.ts`
   - Change: audit every use of `createDefaultWorkbenchSession()` in migration/recovery. If legacy migration needs the former multi-window fallback registry, split “fresh visitor seed” from “legacy migration fallback” rather than dropping a visitor’s valid legacy windows or scratch content.
   - Preserve: parsing of valid v3 sessions, corrupt-state recovery, atomic committed state, Archive pairing, imports, and existing saved visitor layouts.
   - Verify: opening Workbench with an existing committed session renders that session unchanged; the one-window seed applies only when no valid saved state exists or when an explicitly defined fresh default is requested.
3. `app/lib/workbench-system.test.ts` and, if the migration split is required, `app/lib/workbench-backup.test.ts`
   - Change: add focused tests for the one-window seed, active-instance map, Now geometry, and non-destructive legacy migration behavior.
   - Preserve: existing test conventions and fixtures.
   - Verify: tests fail if extra windows silently return to the fresh seed or if migration loses a valid legacy window.

## Scope

- Inherit: first entry through the aperture, W shortcut, or a Workbench deep link when no valid session exists; Atlas and dock derive their initial states from the same seed.
- Verify: fresh session, valid persisted session, legacy session, invalid/corrupt session, desktop mode above 980px, compact mode at and below 980px, and Restore/Tidy actions that consume default geometry.
- Exclude: deleting or unregistering apps, changing the app registry, editing public aperture copy/counts, clearing real user storage, forcing existing visitors back to the new seed, adding a tutorial carousel, or changing Workbench navigation. Public telemetry cleanup belongs to `design-plans/public-positioning-contact-metadata.md`.

## Validation

- Product: in an isolated browser context with no Workbench storage, enter Workbench and confirm the first answer is “what Sam is doing now”; open Stack, Console, Field, and Notes through existing controls to confirm the deeper environment remains discoverable.
- Interface: check 1280×720, 981×720, 980×720, and 390×844. Now must fit without an internal scrollbar; Atlas must show one Build surface; Field and Notes must use the existing clear-workspace state; dock statuses must show only Now as Active/Running at first entry. Validate the public aperture separately through the positioning/contact plan; it must not expose a conflicting invented count.
- System: load fixtures for a valid current session, a legacy session, and corrupt storage. Confirm only the genuinely fresh path receives the new seed and no persisted windows or Archive data are discarded.
- Repository: `npm run lint && npm test && npm run build` → all checks pass, including the new seed/migration assertions.

## Stop conditions

- Stop if narrowing `createDefaultWorkbenchSession()` would cause valid saved or legacy state to be rejected or discarded. Split the fresh-seed owner from migration defaults before changing the rendered baseline.

## Design documentation

- After acceptance and validation: add the one-Now-window fresh baseline and empty Field/Notes behavior to `DESIGN.md` under Workbench Window/Layout and to `PRODUCT.md` under Workbench Product Model; record that existing saved sessions are preserved.
