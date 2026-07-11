# ADR 0033 — Mobile-Responsive UI: Tab Unification, Phone Breakpoint, Touch-Drag Hover

## Status

Accepted and implemented (2026-07-10). Partially supersedes `docs/adr/0031-
swn-faction-turn-engine.md`'s Faction Events panel design (its left-
anchored, PDF-viewer-style fixed panel is replaced by an ordinary `DRAWERS`
tab — see Decision below) and removes the general-purpose drawer-anchor
mechanism `docs/adr/0031` built on top of. Every other part of both ADRs is
unaffected.

## Context

Direct ask, on the same day as ADR 0032 and immediately following it: make
the whole app usable on a phone/tablet. Specifically — every tab must
resize its content to fit the window (no horizontal scroll); anchored
side-by-side panels should be replaced by ordinary tab groups, since a
panel sharing width with a sibling panel is what makes a phone-width tab
impossible to fit; collapsing the tab group must reveal a fully-fitting
Mission Control ("Story desktop"); statblocks must narrow to fit multiple
compact fields per row instead of a wide 2-column list; Party/Colony/
Journal cards must show every field without overflow, with tighter row
spacing and rich-text toolbars collapsed by default; and Cast entities must
support a touch-drag gesture that can switch to a different tab, or
collapse to Mission Control, mid-drag, before the eventual drop.

Investigation found three separate mechanisms that could each put a fixed
side panel on screen: the drawer-anchor slot (⇤ icon, pins a second drawer
beside the main one), the document viewer (always visible whenever a
document tab is open, offset beside whatever drawer is active), and the
Faction Events panel built earlier this same day (docs/adr/0031's
addendum, explicitly modeled on the document viewer's own side-by-side
behavior). All three needed to change for "every tab fits the window" to
actually hold at phone width.

## Decision

**Anchor panel removed outright.** `anchorDrawerTab`/`unanchorDrawerTab`,
the `anchoredDrawer` state variable, and the `.mc-drawer-anchor` DOM
element/CSS are gone. A drawer is either open (in `openDrawers`, switchable
via the tab strip) or closed — never pinned beside another one. The tab
strip's per-tab ⇤ "anchor" icon is removed along with it (a tab only
switches or closes now).

**Faction Events (docs/adr/0031/0032) is now an ordinary `DRAWERS` entry**
— `openDrawers`/`activeDrawer` alone decide its visibility, same as Cast,
Journal, or any other drawer. It still renders via its own pure function
(`ui/drawers/factionEvents.js`'s `renderFactionEvents`) rather than through
`drawers/index.js`'s `renderDrawer()` switch — that file already imports
`factionTurnSectionHtml` FROM `drawers/index.js` (to reuse the exact same
live Faction Turn card inside its Roster section), so routing
`renderDrawer()` through it too would create a circular import between the
two files. `shell.js`'s `renderActiveDrawerHtml()` special-cases just this
one id; every other aspect (open/close/tab-switch/width) is identical to
any other drawer. The edge-nav "⚔ Faction Events" button still narrows
Cast's own type filter to Faction when opened, so switching to Cast next
shows exactly the roster the button implies — without needing a second
panel open at once.

**The document viewer and the main drawer are now mutually exclusive.**
`.mc-doc-viewer` is always full-width (`left:0; right: var(--edge-w)`, no
more `--viewer-overlap` inset); `shell.js`'s `render()` hides `.mc-drawer`
whenever `doc.documents.openTabs.length > 0`. Closing a document's last
open tab returns to whatever drawer tab was active. This is a real, known
trade-off: while reading a document, the drawer tab-stack is temporarily
inaccessible (previously it stayed visible beside the viewer). Accepted
because documents already have their own multi-tab reading experience
(open several at once, switch, close), and the alternative — a real
literal merge of the viewer into `openDrawers`/`renderDrawer()` — would
require rewriting the iframe's own careful reload-guard logic
(`lastDocViewerSrc`, a past-fixed real bug around blank-then-reload
sequencing) for no functional gain toward "every tab fits the window."

**A new phone breakpoint (`@media (max-width: 480px)`)**, layered under
the existing 1023px/767px tiers in `styles/cockpit.css`, not replacing
them:
- `.mc-drawer` drops its `min(...,88vw)` cap in favor of `left:0` (full
  width) — safe now that it's never sharing space with a sibling panel.
- A handful of fixed-column "table row" grids that would otherwise force
  horizontal overflow at phone width (`.colony-fields`, `.colony-crew-row`,
  `.party-tracker-row`, `.thread-row`, `.trade-contract-row`, `.rel-add`,
  `.field-row2`) collapse to a single column — same later-in-cascade-wins
  technique the existing `.field-row-2col` 1023px override already
  established, not `!important`.
- `.statblock-row` (a field's full-width label|value row) switches to the
  exact compact-badge shape Party's own `.attr-badge` already proved out
  for this same problem (label above, value below, `flex-wrap`) —
  `.statblock-block`'s non-field children (`.statblock-head`, the "+ Add"
  controls, ...) get `flex-basis:100%` to keep their own full-width line
  while every `.statblock-row` (plain/attribute/track — one shared class)
  wraps into the compact grid, ~5 per row at a typical phone width.
- `styles/tokens.css` gains a matching phone-tier override of the `--sp-*`
  spacing scale (denser gaps), scoped to the same media query — every rule
  reading `var(--sp-*)` picks it up for free, addressing "narrow the space
  between rows" app-wide without per-component overrides.

**Rich-text toolbars now default to collapsed** (`settings.
toolbarCollapsedByDefault` schema default `false` → `true`) — additive
default only, an existing campaign with an explicit saved value (including
a prior `false`) is untouched.

**Touch-drag hover-to-switch-tab / hover-to-reveal-Mission-Control.**
Builds on the existing generic touch-drag system (`onTouchStart`/
`onTouchMove`/`onTouchEnd`, already recognizing `[data-drag-entity]`
sources — Cast rows already qualify — and funneling the eventual drop into
the same `completeDrop()` the mouse path uses). New: while a drag is
active, `onTouchMove` hit-tests the touch point against two zones — a
`.drawer-tab` that isn't `activeDrawer`, or the header (`.mc-header`) — and
after a `TOUCH_HOVER_DWELL_MS` (500ms) dwell, switches `activeDrawer` to
the hovered tab (or sets `drawerCollapsed = true`) and re-renders, WITHOUT
ending the drag. The dwell timer resets the instant the touch point leaves
whatever zone it was over, so passing over a tab en route elsewhere doesn't
trigger it. `render()`'s targeted `innerHTML` replacements never touch
`document.body`, so the drag's own ghost element (a `document.body` child,
appended outside `root`) survives a mid-drag re-render untouched; a stale
`lastTarget` reference from before the switch self-heals on the very next
`touchmove` (a detached-node `classList` no-op, harmless). `onTouchEnd`
needed no shape change — it already drops onto whatever's currently under
the touch point, which after a mid-drag switch is correctly the new
panel's/Mission Control's own fields.

## Scope, called out explicitly

- The document viewer/main-drawer mutual exclusivity (above) is a real,
  accepted UX trade-off, not an oversight.
- No new CSS class was added specifically for a mid-drag hover-pending
  visual state on a tab — the tab switches outright once the dwell fires;
  a lighter "about to switch" affordance during the dwell itself is a
  future polish item, not built here.
- The phone-tier statblock badge width (4.4rem plain / 7.5rem track) was
  tuned to read reasonably at common phone widths, not verified pixel-
  perfect against every possible field-name length — a genuinely long
  field label still truncates via `text-overflow: ellipsis` rather than
  breaking the layout, by design.
- `.mc-strip` (the WHO/WHERE/WHAT/WHY/HOW context tab row) already had its
  own contained `overflow-x: auto` before this ADR and keeps it — a
  horizontally-scrollable tab strip within its own fixed-height region is
  a standard, accepted mobile pattern, distinct from "the whole page
  scrolls sideways," which every other change in this ADR targets.

## Alternatives considered

- **Literally merging the document viewer into `openDrawers`/
  `renderDrawer()`.** Rejected — would require rewriting its iframe
  reload-guard logic for a real risk of regressing a previously-fixed bug,
  for no functional difference over the simpler mutual-exclusivity
  approach actually shipped.
- **Keeping the anchor panel but auto-collapsing it below some width.**
  Rejected per the direct instruction that anchored windows shouldn't be
  used "in favor of just tab groups" — a conditional anchor would still
  need all the same removal work for the case that actually matters
  (phone width) while adding complexity for the desktop case that doesn't.

## Consequences

- A GM who never resizes below desktop width sees almost no functional
  change beyond: the ⇤ anchor icon is gone (tabs only switch/close now),
  Faction Events opens as a normal tab instead of a left-anchored panel,
  and rich-text toolbars start collapsed on a brand-new campaign.
- This is a UI/CSS-only change — no domain-layer logic changed, so
  `npm test`'s 401 domain+migrate tests are unaffected and don't cover it;
  verification here was `node scripts/build.js` (which caught and fixed a
  real bundler-compatibility bug unrelated to this ADR — see below),
  `npm test` staying green, and direct code-path review of every removed/
  changed reference. A real narrow-viewport visual pass (`npm run serve`
  plus a phone-width/touch-emulated browser check) is recommended before
  treating this as fully verified — not performed in this session due to
  environment tooling constraints (see next-request.md if a gap surfaces).

## Related packs / ADRs

`docs/adr/0031-swn-faction-turn-engine.md` (Faction Events' original
anchored-panel design, partially superseded here), `docs/adr/0032-gmatlas-
core-faction-provider.md` (same day, immediately preceding this one).

## Incidental fix

While verifying this change, `node scripts/build.js`'s "successful" output
was found to be misleading: `src/data/factionRulesProviders.js` (added in
ADR 0032, same day) used `import * as swn from './swnFactionData.js'` —
a namespace-import style `scripts/build.js`'s regex-based import stripper
doesn't recognize (confirmed: the only file in `src/` using this style).
The bundler produced output containing a raw, un-stripped `import`
statement, which is invalid inside the classic script `index.html` loads —
the bundle would have thrown `SyntaxError: Cannot use import statement
outside a module` in a real browser despite `npm run build` reporting
success. Fixed by rewriting that file to use named imports, matching every
other file's convention — no bundler change made, since avoiding the
untested import style was the lower-risk fix. Caught here specifically
because this ADR's own verification pass loaded the actual built bundle
in a script context (via jsdom) rather than relying solely on the
bundler's own "bundled N modules" success message.
