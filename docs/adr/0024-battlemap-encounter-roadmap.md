# ADR 0024 — Battlemap/Encounter feature roadmap (reconciling the 2026-07-08 VTT wishlist)

## Status

Proposed — a design/prioritization roadmap only, no code. Nothing in this
ADR is built; it sequences what should be built next, after ADR 0023's
Battlemap MVP is finished.

## Context

`docs/adr/next-request.md`'s "Added 7/8 1626CST" entry pastes a large
ChatGPT-drafted feature list for a full virtual tabletop (14 categories:
Canvas & Navigation, Building Tools, Asset Library, Token System,
Encounter Management, Fog of War, Lighting, Measurement, Annotation, Map
Metadata, Procedural Generation, Campaign Integration, Search &
Organization, Export & Sharing) plus ChatGPT's own priority table, and
asks: "Build a roadmap and prioritize the following features and design
elements as an encounter and gameplay tool (not a map designer)."

Three things need reconciling before this becomes a buildable sequence
rather than a restated wishlist:

1. **It arrived mid-flight on ADR 0023.** The Planetfall Grid Battlemap
   (multiple named maps, Gallery-sourced background, built-in annotation
   icons, freeform Cast-entity tokens, an optional non-snapping grid) has
   its schema/data/domain layer and tests done but its drawer UI not yet
   wired (see ADR 0023's corrected Status). Nothing here starts before
   that finishes — there's no second battlemap primitive to build against
   yet.
2. **The wishlist assumes three separate tools** (this repo's own prior
   Phase 11 backlog: Planetfall Grid Battlemap, Planetfall Base Builder,
   Interactive Maps) where ADR 0023 already built one generalized enough
   to cover all three's actual requirements. A "gridless battlemap for
   colony layout" is `gridEnabled: false` on the exact same map object; an
   "Owlbear-Rodeo-style" token/map editor is the same canvas with a
   snap-to-grid flag added. Building three drawers/domain modules instead
   of feature-flagging one would violate Article IX (extend via
   engines/templates, not parallel systems) for no real gain — nothing in
   the wishlist requires a genuinely different data shape.
3. **Several wishlist items assume a genre-locked asset list**
   ("Planetfall's defined assets/buildings," a hardcoded sci-fi/military/
   colony/alien category tree). This app's controlling principle is
   "genre-aware, not genre-locked" — statblocks, oracle tables, and genre
   packs are all data, never hardcoded to one ruleset. An asset/room
   library has to follow the same shape (`data/genrePacks.js`'s pattern:
   swappable per-pack content, not one fixed list) or it's a structural
   regression the next genre pack would have to work around.
4. **Some categories are large enough to be infeasible as scoped** given
   this app's own non-negotiable constraints (zero-dependency, DOM-based
   rendering, no `<canvas>` pixel engine, `file://`-double-click-first).
   "Infinite canvas," true dynamic lighting/raycasting vision, and VTT
   export formats (Foundry/Roll20 JSON) fall in this bucket — flagged
   explicitly below as declined-for-now rather than silently dropped.

Where this sits in the master priority order: pack 66's continuity >
workflow > Context Graph > storage > recommendations > UX > integrations >
**new features** ordering (adopted in ADR 0001) puts all of this — the
whole encounter/battlemap engine — in the lowest tier, below Phase 7
(Context Graph depth, `CLAUDE.md`'s "in progress" status). This ADR
doesn't change that; it only prioritizes *within* Phase 11 once Phase 11
work is actually being picked up.

## Decision

**One subsystem, feature-flagged — not three drawers.** Everything below
extends ADR 0023's existing `battlemaps` schema/domain/drawer rather than
adding parallel modules. The sub-phase letters continue Phase 11's
existing "Gallery, Battlemap, ..." ordering.

### 11a — Battlemap Foundation (ADR 0023, in progress — finish first)

Already decided; not re-litigated here. Everything below assumes this
ships first: named maps, Gallery-sourced background, toggleable
non-snapping grid, freeform annotation icons, freeform Cast-entity
tokens.

### 11b — Encounter overlays (folds in "Encounter Management" + the old
separate Encounter Manager backlog item)

Reuses 11a's existing `icons[]` array — a token gains a few more optional
fields (`hp`, `maxHp`, `initiative`, `statusEffects: []`) rather than a
second combatant list living somewhere else. New:

- A per-map **initiative/round tracker**: sort tokens by `initiative`,
  step through turns, a round counter — a small header bar above the
  existing canvas, not a new drawer.
- **Spawn zones / patrol routes / triggers / ambush markers / objectives**
  as new `iconKey` entries in `data/battlemapIcons.js` (data, not new
  code) — they're annotation icons with a note, exactly like the existing
  hazard/door/cover set, not a new placement mechanism.
- Combat/initiative math reads `settings.statRuleset` (the existing
  per-campaign Rules Lens selector) the same way the HOW workspace's
  Activity picker already contextualizes by ruleset — no new
  ruleset-detection logic.

*Effort: low-medium — mostly new fields on an existing shape plus one new
header UI, no new domain module.*

### 11c — Room/asset templates + procedural generation (folds in "Asset
Library," "Building Tools," "Procedural Generation," and the old
Planetfall Base Builder item)

The wishlist's ★★★★★ items (procedural generation, reusable room
templates, entity-aware rooms) are also its most genre-locked as
originally framed. Generalized:

- `data/genrePacks.js` gains an optional **room/asset template list per
  pack** (data: a name, a handful of default `iconKey`s, and an oracle
  table to roll for hazards/loot/NPCs) — Hostile's pack ships a
  Planetfall-flavored set (habitats, hydroponics, cargo bays), a
  different genre pack ships its own, same swap mechanism genre packs
  already use for oracle tables.
- A **"Generate Room" button** rolls a template, drops its default icons
  onto the active map at reasonable default positions, and rolls its
  linked oracle chain into the Journal — this is a thin `domain/
  battlemaps.js` addition plus reuse of the oracle engine
  (`domain/oracles.js`) and the existing `worldbuilding.js` generator
  pattern (Site Concept/Xenobestiary already prove this "combinatorial
  generator + Journal entry" shape). No new rendering tech.
- Placing an asset icon can optionally create/link an Asset or Location
  entity tagged to the active Colony (`#colonyname`, the existing Colony
  worksheet convention) — this is what the old "Base Builder" ask
  actually wanted; it's now one option on 11a's existing token-placement
  path (create-entity-then-place, vs. link-existing-entity-then-place),
  not a second gridless drawer.

*Effort: medium — genuinely new (a room-template data shape + a
generator), but built entirely on existing engines (oracles, genre packs,
Journal).*

### 11d — Deeper campaign integration

Much of this wishlist category is already true: a token's plain click
already opens its linked Entity Detail (ADR 0023). What's missing:

- An annotation icon's note field becomes a real mention-editor field
  (reusing `domain/documents.js`'s `@mention`/`@[Doc]` parser, the same
  one Journal/Guide/context fields use) instead of plain text — so a
  battlemap note can link a Journal entry, a Mission, or a Thread
  directly, not just describe one in prose.

*Effort: low — swaps one field's editor component for an existing one,
no new parsing logic.*

### 11e — Fog of war (manual reveal only)

The wishlist's "dynamic lighting"/"vision reveal"/"doors blocking vision"
sub-items require real 2D visibility geometry (raycasting against
wall/door segments) — a genuinely different kind of engine than anything
else in this app, and disproportionate to build on a DOM/CSS renderer
with no existing wall/geometry model to cast rays against (11a's
annotation icons are points, not line segments). Scoped down to what's
actually feasible and still valuable:

- A **per-cell manual reveal** toggle when the grid is on (GM clicks cells
  to reveal/hide, players' view — if this app ever gets a player-facing
  view — only renders revealed cells). No automatic vision range, no
  dynamic light sources, no line-of-sight calculation.

*Effort: medium. Automatic/dynamic fog is explicitly declined below, not
deferred-and-forgotten — it would need a wall/geometry model this app has
no reason to build otherwise.*

### 11f — Multi-map "floors"

"Multi-level support" doesn't need a z-stack layer engine — 11a already
supports multiple named maps per campaign. Adding an optional
`linkedFloorIds: []` on a map (schema-only) and a small "↑/↓ floor" switcher
next to the existing map-tab switcher covers the real requirement (a
station's deck 2 links back to deck 1) without a new rendering concept.

*Effort: low — schema field plus a UI affordance, no new domain module.*

## Explicitly declined (not deferred — see `docs/adr/0001` for this
project's convention on recording a real "no," not silence)

- **Infinite/very large canvas.** This app's rendering is DOM elements
  sized to a background image; "infinite" has no meaning without a
  virtualized viewport this app has never needed anywhere else. Stays a
  large-but-finite canvas sized to the background, as ADR 0023 already
  chose.
- **Dynamic lighting / automatic vision reveal / doors blocking
  vision / light sources.** Needs a wall/geometry + raycasting model this
  app has no other reason to build. 11e's manual-reveal fog covers the
  actual GM need ("hide what the party hasn't seen yet") without it.
- **VTT export formats (Foundry/Roll20/other JSON, print layouts).** No
  integration partner exists and none has been requested independently of
  this list; this app's own PNG/whatever screenshot of a map is already
  possible via the browser, so nothing is actually blocked by not
  building this.
- **Full freehand/vector drawing tools (draw, arrows, ink).** Matches the
  wishlist's own ★★★☆☆ (lowest) ranking. 11a's annotation-icon system
  already covers "GM notes"/"numbered locations"; true freehand drawing
  would need `<canvas>` pixel rendering, a genuinely different rendering
  model than everything else in this app.
- **Hex grid.** Square only, per ADR 0023's existing choice — revisit only
  if a specific ruleset in active use actually needs it (none of the six
  Rules Constitution providers are hex-based).

## Alternatives considered

- **Build the wishlist's three original tools (Battlemap, Base Builder,
  Interactive Maps) as three separate drawers/domain modules**, as
  Phase 11's original backlog entry framed them. Rejected — once ADR 0023
  was actually scoped, all three turned out to need the same data shape
  (a named map, a background, placed icons, an optional grid); building
  three would mean three copies of drag/placement/rendering code to keep
  in sync, the exact "parallel systems" Article IX exists to prevent.
- **Take the wishlist's 14 categories at face value and build all of
  them.** Rejected — several (infinite canvas, dynamic lighting, VTT
  export) are disproportionate to this app's zero-dependency/DOM
  architecture for the value they'd add, and the request's own framing
  ("an encounter and gameplay tool, not a map designer") argues against
  chasing full VTT parity in the first place.
- **Keep the asset/room library Planetfall-specific**, matching the
  original ask's literal wording. Rejected — would hardcode one
  ruleset's building list into `battlemaps.js`/UI code, the exact thing
  "genre-aware, not genre-locked" and `data/genrePacks.js`'s existing
  precedent both argue against; generalizing costs nothing extra (it's
  still just data) and keeps the next genre pack from having to work
  around Planetfall-only assumptions.

## Consequences

- Phase 11's backlog goes from four vaguely-scoped, partially-overlapping
  tools to one subsystem (ADR 0023) with five sequenced, independently
  shippable extensions (11b–11f), each buildable without the others.
- `data/genrePacks.js` gains a new optional field shape (room/asset
  templates) — additive, doesn't change any existing pack's behavior
  until a pack actually populates it.
- No new rendering technology is introduced anywhere in this sequence —
  everything extends ADR 0023's existing DOM/CSS + HTML5-drag-and-drop
  primitive.
- Fog of war, multi-floor, and encounter overlays ship as real but
  deliberately modest slices of what the wishlist described — each
  explicitly *not* aiming for VTT feature parity, matching the request's
  own "not a map designer" framing.

## Related packs / ADRs

`docs/adr/0023-planetfall-grid-battlemap.md` (the foundation everything
here extends); `docs/adr/0021-gallery.md` (token/background art);
`docs/adr/0001-adopt-design-constitution.md` (pack-66 priority ordering,
and this project's convention of recording a declined item explicitly
rather than dropping it silently); `DESIGN-NEW-FUNCTIONALITY.md`'s Phase
11 section (superseded bullets point here).
