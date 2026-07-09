# ADR 0023 — Planetfall Grid Battlemap

## Status

**Implemented** (2026-07-08).

**2026-07-09 addendum — pan/zoom camera.** On direct request ("Battlemap
background should be resizeable or allow zoom and repositioning camera
for an unlimited background to move around and place tokens"), the
canvas rendering model changed from a single `.battlemap-canvas` div
(background-image + icons in one box, always showing the whole image at
`background-size: cover`) into a fixed-size `.battlemap-viewport`
(`overflow: hidden`) containing a `.battlemap-world` layer that receives
`transform: translate(x,y) scale(scale)`. Icons keep their existing 0-1
fraction positioning unchanged — it's just relative to the world layer
now, so panning/zooming moves them for free via the shared parent
transform. Camera state is ephemeral (resets on map switch), matching
Graph's own `graphView` zoom/pan in spirit — wheel-zoom anchored to the
cursor, drag-to-pan, +/-/reset buttons — sharing this app's single
delegated `wheel`/`mousedown`/`mousemove`/`mouseup` listeners (branching
on `.battlemap-viewport` alongside Graph's own `.graph-svg` checks, not
new listeners, per rule 4). The two coordinate-math call sites that turn
a click/drop into an icon's stored fraction now route through one shared
`screenToWorldFraction()` (`shell.js`) that inverts the current camera
transform first. No schema change — `domain/battlemaps.js`'s icon
`x`/`y` semantics and `clampFraction` guard are untouched. A later pass on 2026-07-08 (recorded in
`docs/adr/next-request.md`'s "Processed 2026-07-08" note and reflected in
an earlier revision of this Status section) claimed the drawer's render
function, its click/drag handlers, and the canvas/grid/icon-marker CSS
were never written, and marked this ADR "in progress, not complete." That
claim was re-checked directly against the actual repository — by reading
the source (`ui/drawers/index.js`'s `battlemap()` function,
`ui/shell.js`'s `completeBattlemapDrop`/`BATTLEMAP_ICON_DRAG_TYPE`/
`data-battlemap-*` handlers, `styles/cockpit.css`'s ~20 `battlemap`-
prefixed rules) and by running `npm test` (321+ tests passing, 13 of them
battlemap-specific) — and it does not hold: every piece this ADR
describes below was written, is present in the codebase today, and is
covered by the two jsdom smoke-test scripts (31 checks) referenced at the
end of this document. This Status section is corrected back to
"Implemented" accordingly, per this repo's own rule that the code wins
over a stale or mistaken doc claim (`CLAUDE.md`).

The first of Phase 11's Visual & Tactical Tools items
(`DESIGN-NEW-FUNCTIONALITY.md`, from `docs/adr/next-request.md`'s "Add to
roadmap" batch) — Gallery (ADR 0021) and external links (ADR 0022's
addendum context) shipped first; this was the next one, per the user's
explicit choice in the session that built it. `docs/adr/0024-battlemap-
encounter-roadmap.md`'s resequencing of the rest of Phase 11 (folding
Base Builder and Encounter Manager into an extended Battlemap subsystem)
is independent of this correction — that sequencing decision stands
regardless of whether the MVP described here was already complete when
it was made.

## Context

The original ask (`docs/adr/next-request.md`): "Planetfall gridmap": a
grid-based battlemap purpose-built for 5PFH Planetfall's rules; a
resizable background image; icons matching Planetfall's own visual
language, freeform (not grid-locked) drag-and-drop placement; text-box
annotations represented as icons whose content is entered via a text
field but displayed as a hover tooltip.

That one paragraph left real gaps a session of scoping questions and two
research passes closed before any code was written:

- **No spatial/grid concept exists anywhere in this app.** `domain/
  colony.js`'s 5PFH Planetfall turn sheet is pure turn-counter bookkeeping
  (build points, morale, crew roster) — no coordinates, no scale. The
  `5pfh` statblock template's `Speed` field uses `format: 'inches'`
  (`data/statblockTemplates.js`), the one hint this system assumes a
  tabletop-miniatures movement scale, but no combat/positioning rules are
  encoded anywhere to reconcile against.
- **No real Planetfall art exists in this repo.** Only two unrelated
  Intergalactic Space Trader PDFs live under `requirements/rulesystems/`;
  the actual `assets/docs/5PFH Planetfall 1.2.pdf` is registered as an
  in-app Document but was never mined for iconography. "Icons matching
  Planetfall's own visual language" has no source material to draw from.
- **The existing drag-and-drop system is entirely target-based.**
  `ui/shell.js`'s `onDragStart/onDragOver/onDrop` (native HTML5 DnD) and
  the touch equivalents only ever resolve "did you drop on THIS specific
  existing element" (`completeDrop`'s target-matching) — never a
  continuous x/y position within a container. Freeform 2D placement is
  new interaction logic, not a reuse of anything already built.
- **Gallery's image pipeline has exactly one caller.** `addGalleryImages`/
  `ui/imageResize.js`'s `loadAndMaybeResize` are only ever invoked from
  the entity-photo-upload call site, tightly coupled to an `entityId`.
  There was no path to upload/store an image with no entity owner before
  this feature needed one for a map background.
- **The tool is named "Grid" but placement is explicitly freeform** — the
  original ask never actually says why there's a grid at all, or whether
  it should ever be optional.

Four scoping rounds (recorded in this session's conversation, not
duplicated here) resolved all five gaps:

1. Canvas tech: absolutely-positioned DOM elements, not SVG or `<canvas>`
   pixel drawing — reuses this app's existing HTML5 drag-and-drop system
   rather than a new coordinate-tracking input model.
2. Icon art: a small built-in icon set for annotations (since no real
   asset exists); combatant tokens use the linked entity's own Gallery
   thumbnail.
3. What's on the map: both annotation icons AND Party/NPC combatant
   tokens — not a decoration-only reference map.
4. Multiple named maps per campaign, switchable.
5. Background image sourced through the Gallery (upload or pick an
   existing image) — one image pipeline for everything, not a second
   parallel upload path.
6. The grid is an optional/toggleable visual overlay (on/off, adjustable
   cell size) that never snaps placement — designed as the shared
   foundation a later, still-unscoped Phase 11 item (Interactive Maps)
   can build its own snap-to-grid overlay on top of, not a one-off.

## Decision

**Schema** (`src/core/schema.js`): an additive `battlemaps: { maps: [],
activeId: null }` section — confirmed safe with no `migrate.js` step
needed (`withDefaults()`/`deepMerge()` fills in any missing key from
`defaultCampaign()`'s defaults on load; a migration step is only needed
for *transforming* an existing shape, not adding a new one). Each map:
`{ id, name, createdAt, backgroundImageId, gridEnabled, gridSize, icons:
[] }`; each icon: `{ id, kind: 'annotation'|'token', x, y, iconKey, note,
entityId, label }`, `x`/`y` as 0-1 fractions of the rendered canvas (never
pixels), so a map reads correctly regardless of the window it's opened
in.

**Built-in icon set** (`src/data/battlemapIcons.js`): a small fixed
array — data, not code, matching `data/tables.js`/`data/economyTypes.js`'s
existing convention, so the set can grow later without touching domain or
UI logic. Combatant tokens don't use this list at all; their art is
resolved from the linked entity's `thumbnailId` through Gallery.

**Domain module** (`src/domain/battlemaps.js`): pure, DOM-free CRUD
mirroring `domain/threads.js`'s exact shape (`ensure()` lazy-inits the
section, `clone()` via the existing `structuredClone`-with-JSON-fallback
pattern, every mutator is `clone → ensure → mutate → return next`).
Covered by a full `tests/domain.test.js` suite (14 tests) — this is the
one layer of the feature that's genuinely unit-testable without touching
a simulated DOM.

**New drawer** (`src/ui/drawers/index.js`'s `battlemap()`, wired into
`shell.js`'s `DRAWERS`/`EDGE_ORDER`): map switcher tabs + "+ New Map"
(the standard inline prompt, `docs/adr/0022` — zero new plumbing beyond
one more `commitInlinePrompt` branch), a background control (upload via
`loadAndMaybeResize` at `maxDim: 1600` — larger than an entity thumbnail's
256, since a map background is meant to be looked at full-drawer-width —
or pick an existing Gallery image from a `<select>`), a grid toggle +
size input, the icon palette, and the canvas itself.

**Placement/repositioning — a new native-HTML5-DnD path, not a new
input model**: a fourth custom MIME type,
`application/x-gmatlas-battlemap-icon` (mirroring how `ENTITY_DRAG_TYPE`/
`DOCUMENT_DRAG_TYPE`/`GUIDE_NODE_DRAG_TYPE` already coexist in `onDragStart/
onDragOver/onDrop`), lets an *already-placed* icon be dragged to a new
position on the same canvas. Dragging a Cast entity chip (the *existing*
`ENTITY_DRAG_TYPE`) onto the canvas creates a *new* token instead of a
mention/relationship — `completeBattlemapDrop()` (shell.js) is the one
place that decides which, computing the drop's normalized `(x, y)` from
`getBoundingClientRect()`, the same "one function owns what a drop
means" posture `completeDrop`/`completeGuideNodeDrop` already established.
Placing a built-in annotation icon is a separate, simpler two-click
gesture instead of a third drag flow: click a palette glyph to "arm" it
(`battlemapPlacingIcon`, ephemeral UI state), then click anywhere on the
canvas to drop it there — chosen over a third drag-source type because
it's more touch-friendly (a tap-tap sequence, no drag gesture required at
all) and avoids two different placement mechanisms for what's
conceptually one action.

**Click semantics on a placed icon**: a token's plain click opens its
linked entity (`data-open-entity`, the same convention every other
entity reference in this app already uses); an annotation's plain click
opens the inline prompt to edit its note (`kind: 'battlemap-icon-note'`).
Both coexist with `draggable="true"` on the same element without a
click-vs-drag threshold hack — Cast's own entity-list rows already prove
native HTML5 `draggable` and a plain click coexist correctly in this
exact codebase. A small ✕ badge (shown on hover) removes an icon without
opening/editing it — checked *before* the generic `data-open-entity`
handler in `onClick`, since the ✕ is a descendant of the icon's own
`data-open-entity`-carrying div and `closest()` would otherwise resolve
to the wrong handler.

**Hover tooltip**: a plain HTML `title` attribute on each annotation icon
— literally what the original ask specifies ("displayed as a hover
tooltip"), no custom tooltip mechanism needed.

## Alternatives considered

- **SVG or `<canvas>` pixel rendering** for the map surface. Rejected in
  scoping — absolutely-positioned DOM elements let placement/dragging
  reuse this app's existing HTML5 DnD system directly; SVG would need its
  own drag-node logic distinct from the relationship graph's (which
  re-runs a force layout on drag, not free placement), and `<canvas>`
  would need hand-built hit-testing, drag handling, and tooltips instead
  of native DOM element events.
- **A new mousedown/mousemove/mouseup drag-threshold system** for
  repositioning placed icons (to distinguish a click from a drag).
  Rejected — native HTML5 `draggable` plus a plain click already coexist
  correctly on the same element elsewhere in this codebase (Cast's entity
  rows), so reusing that proven combination needed no new interaction
  primitive at all.
- **A real drag gesture for placing annotation icons from the palette**
  (matching how tokens are placed from Cast). Rejected — click-to-arm-
  then-click-to-place is simpler to build, is friendlier on touch devices
  (no drag gesture at all), and there's no benefit to a third drag-source
  type when the two-click alternative is strictly easier for both the
  code and the GM.
- **A separate, parallel image-upload path for map backgrounds** instead
  of the Gallery. Rejected per the scoping decision — one image pipeline
  for everything (thumbnails, tokens, and now backgrounds) is simpler to
  maintain than a second one, and a battlemap background genuinely
  benefits from being resizable/reusable the same way any other Gallery
  image is.
- **A fixed, non-toggleable grid always drawn over every map.** Rejected
  — the original ask's own placement description ("freeform... not grid-
  locked") reads as the grid being a visual reference only, and making it
  optional (rather than mandatory) costs nothing while directly serving
  the scoping decision to design this as shared groundwork for Interactive
  Maps' own planned grid/hex overlay with snap-to-grid.

## Consequences

- A GM can now build named battle scenes ahead of a session (or live, mid-
  fight) — a background image, hazards/doors/notes from the built-in
  palette, and the actual Party/NPC tokens dragged in from Cast, each
  showing that entity's real portrait if one's been set.
- The custom-MIME-type drag system now has four types instead of three;
  `onDragStart/onDragOver/onDrop` each gained one more branch following
  the exact shape the existing three already used — no new delegated
  listener was added (rule 4 stays satisfied).
- Gallery's image pipeline now has a second real caller beyond entity
  photos, proving `addGalleryImages`/`loadAndMaybeResize` generalize
  cleanly to an owner-less image (`entityId: null`) without any change to
  either function.
- **Not built here, deliberately deferred**: no combat/turn-order
  tracking (that's Encounter Manager, a separate still-unscoped Phase 11
  item), no snap-to-grid (Interactive Maps' job, reusing this feature's
  grid-overlay groundwork), no hex grid (square only, for now), no
  distance/range measurement.

## Related packs / ADRs

`docs/adr/0021-gallery.md` (the image pipeline this reuses for
backgrounds and token art); `docs/adr/0022-inline-prompt-standard.md`
(map naming and annotation-note editing both go through the standard
inline prompt, not a new popup); `DESIGN-NEW-FUNCTIONALITY.md`'s Phase 11
section (Base Builder, Encounter Manager, and Interactive Maps are still
unscoped, ordered after this one).
