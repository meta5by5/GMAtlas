# ADR 0029 — Shipyard-inspired vessel deckplan builder

## Status

Proposed — scoping only, no code yet. Unblocks the long-standing
"Shipyard companion link" backlog item (`DESIGN-NEW-FUNCTIONALITY.md`
item E) now that a real source has been read.

## Context

The user pointed at Geomorph Shipyard (`https://gitlab.com/IvanSanchez/
geomorph-shipyard`, GPLv3) as a reference for a feature they want
replicated, with a specific complaint: its part library's "navigation
and filtering for image selection" feels awkward, and they want a
different approach.

Its README (read directly, since the live app is client-rendered and
wasn't fetchable) describes: a Traveller-Geomorphs-based sci-fi ship
deckplan editor (SvelteKit + Leaflet); a part library the user "scroll[s]
through... and press[es] the 'add' button" on, with a hover-based
"Preview library parts" feature as the only real discovery aid; placed
parts can be rotated/cloned/flipped/deleted/moved on a canvas; a running
parts list; a tonnage summary per category (staterooms, airlocks,
docking cradles, drive systems, cargo bays, engineering/biosphere/
training/military spaces), computed against Mongoose Traveller 2e rules
as a "rough guide," not a hard constraint; ships save/load as local JSON
files, no cloud storage.

**The awkwardness the user flagged is named directly in that README**:
there is no search or filter over the part library at all — "scroll and
hover" is the entire browsing model. This app has already solved exactly
that problem once, for a structurally identical need (browsing a growing
tagged image collection to find the right one): the Gallery drawer
(`docs/adr/0021-gallery.md`). That's the concrete "different approach"
this ADR proposes, not a vague improvement.

**This also isn't a new primitive.** A part library you drag onto a
canvas, with placed pieces you can reposition/remove and an aggregate
summary computed from what's placed, is what the Battlemap (ADR 0023)
and its still-unbuilt 11c room/asset-template extension (ADR 0024)
already are. One genuinely new capability is missing: **rotate/flip** —
Battlemap icons today only carry a normalized `x`/`y`, no orientation.

## Decision

**Reuse, don't rebuild**, following the same reasoning ADR 0024 already
used to collapse Base Builder/Interactive Maps into one Battlemap
subsystem:

- **Canvas**: a gridless map (`gridEnabled: false`, already supported) —
  a ship deckplan doesn't need square-grid alignment, geomorph tiles
  self-align edge-to-edge.
- **Part library → a tagged content library, not a scroll list**: parts
  get the Gallery's actual mechanism — a category/tag (stateroom,
  airlock, docking cradle, drive system, cargo bay, engineering,
  biosphere, training, military — the README's own category list) plus
  a search box filtering by name/tag, reusing `entities.js`'s proven
  plain-tags-array shape a third time (Gallery already reused it once
  from Documents). This is the direct fix for "awkward navigation and
  filtering" — a real filter, not scroll+hover.
- **Rotation/flip — the one new field this needs**: a placed icon gains
  optional `rotation` (0/90/180/270) and `flipped` (boolean), rendered as
  a CSS `transform`. Everything else about placement (drag from library,
  drag-to-reposition, click-to-remove) is ADR 0023's existing mechanism
  unchanged.
- **Tonnage/parts summary**: a pure domain function summing each placed
  part's `tonnage` (a data field on the part, like a commodity's price)
  grouped by category — the same shape `domain/trade.js`'s cargo-manifest
  totals already compute, not a new pattern.
- **Part art**: this app has never traced or reproduced third-party
  published art (ADR 0023 explicitly declined this for Planetfall); real
  Traveller Geomorphs tile art is itself a copyrighted, separately
  licensed product (distinct from Geomorph Shipyard's own GPLv3 *code*,
  which this ADR doesn't reuse either — only the feature concept). Parts
  ship as labeled glyph placeholders by default, same posture as
  Battlemap's built-in icon set, with the option to attach a real image
  via Gallery (upload your own scanned/licensed tile) exactly the way a
  battlemap background or entity thumbnail already works.
- **Persistence**: no separate JSON file format — a ship is just another
  named map in `campaign.battlemaps` (or a sibling collection tagged
  `kind: 'vessel'` if deckplans and tactical battlemaps ever need to
  list separately in the UI), living in the one campaign document like
  everything else. `store.export()` already gives a full-campaign JSON
  backup; there's no reason to reintroduce a second, per-object save/load
  format this app doesn't have anywhere else.
- **Ruleset content**: Traveller tonnage/category rules are original
  content, not transcribed from Mongoose Traveller 2e or from Geomorph
  Shipyard's code — same posture ADR 0010 already committed to for
  Traveller's character ruleset ("honestly-labeled original content,"
  since no Traveller sourcebook lives in this repo's library).

## Alternatives considered

- **A genuinely new "vessel builder" drawer/domain module**, separate
  from Battlemap. Rejected for the same reason ADR 0024 rejected three
  separate map-shaped drawers — the data shape (named canvas, placed
  parts, a background-optional surface) is identical; only the
  rotate/flip field and the tonnage rollup are actually new.
- **Replicate Geomorph Shipyard's own scroll+hover library UI.** Rejected
  — it's the literal thing the user asked to do differently, and this
  app already has a proven tag-filter pattern (Gallery) solving the exact
  same "find the right image in a growing collection" problem.
- **A real per-ship JSON export/import**, matching Geomorph Shipyard's
  local-file save/load. Rejected as redundant — this app's whole-campaign
  export/import already covers "get my data out"/"bring it back in";
  adding a second, narrower file format for one sub-object isn't
  something any other feature here does.

## Consequences

- No code changes yet.
- The only genuinely new schema/rendering capability this introduces
  anywhere in the Battlemap family is icon rotation/flip — worth building
  once, reusable by tactical battlemaps too (rotating a vehicle token to
  face a direction), not vessel-deckplans-only.
- Part content (the geomorph category list, tonnage values) still needs
  its own small data-authoring pass before this is buildable — smaller
  than the Buildings icon set (ADR 0027) since the category list is
  fully named in Geomorph Shipyard's own README already.

## Related packs / ADRs

`docs/adr/0021-gallery.md` (the tag/search mechanism this reuses for the
part library); `docs/adr/0023-planetfall-grid-battlemap.md` /
`docs/adr/0024-battlemap-encounter-roadmap.md` (the canvas/placement
primitive this extends, not duplicates); `docs/adr/0010-traveller-swn-
content.md` (precedent for original-content Traveller material, no
sourcebook in this repo's library).
