# ADR 0034 — Faction Membership, Conquest Flips, and Region-Depth Queries

## Status

Accepted and implemented. Phase A of the "Living Faction Engine" roadmap
(a direct ask to make factions in `docs/adr/0031`/`0032`'s SWN Faction Turn
Engine behave as an independent, living regional engine, paced by party
activity, driving missions/encounters, absorbing conquered territory, and
supporting GM retcons). Phases B (activity-based pacing), C (faction-driven
missions/encounters), and D (retcon) are tracked separately and build on
this phase's foundation; this ADR covers Phase A only. Extends
`entities.js`'s relationship taxonomy (Phase 7, `docs/adr/0031`'s district
helpers) and `factionTurnEngine.js`'s `seizePlanet`/`factionsAtLocation` —
no existing behavior is replaced, only extended.

## Context

The request: factions should be independent actors whose story continues
whether or not the party engages, and territory changing hands should be a
real, structural fact — "if a faction conquers a frontier outpost, the
outpost location becomes a member of that faction" — with every entity,
"even if it is bystander," conceptually belonging to a faction, and
location being "the central determining factor in which factions are
active in the region."

Auditing the existing engine (`docs/adr/0031`/`0032`) found three concrete
gaps against this:

1. `seizePlanet` only appended the conquered location's id to the
   attacking faction's own `governedLocationIds` array. Nothing on the
   Location entity itself changed — no reciprocal relationship edge, no
   effect on any query that answers "who does this location belong to."
2. No entity is ever required to have a `member_of` relationship, and no
   "Unaligned/bystander" sentinel exists — an NPC or location with no
   explicit faction link is simply unrepresented in any faction-scoped
   view.
3. `isSameDistrict` (the only existing "who's nearby" query) is
   deliberately single-hop only, by design, for its own witnessed/
   unwitnessed use case (see ADR 0031's Scope section) — it was never
   meant to answer "which factions are active across this whole region,"
   and using it for that purpose would under-report.

## Decision

**`getEntityFaction(campaign, entityId)` (`entities.js`)** — resolves an
entity's real `member_of` edge if one exists; otherwise returns a
synthetic, non-persisted `{ id: null, name: 'Unaligned', type: 'faction',
synthetic: true }` descriptor. Computed on every read, nothing stored —
the same posture `isRelationshipFlagged` already established for
"derive it, don't cache a flag field." A `member_of` edge whose target has
since stopped being type `faction` (already independently flaggable via
`isRelationshipFlagged`) also degrades to Unaligned here, rather than
returning a non-faction entity.

**`setEntityFactionMembership(campaign, entityId, factionId)`
(`entities.js`)** — replaces any existing `member_of` edge on the entity
outright (never adds a second one), or clears it when `factionId` is
`null`/falsy, which `getEntityFaction` then reads back as Unaligned. Reuses
the existing `_link` helper so the mirrored edge on the faction's own side
is created exactly the way every other relationship already is.

**Conquest wired to a real membership change** — `seizePlanet`
(`factionTurnEngine.js`) now calls `setEntityFactionMembership` on the
seized location at both points a siege can complete (immediate and
multi-turn), in addition to its existing `governedLocationIds` append
(kept, unchanged — still the faction-side "what do I govern" list). A
location previously owned by a different faction has that edge replaced,
not doubled. The committed event's `narrative` now says so explicitly
("`<Location>` is now under `<Faction>`'s control"), so the fact is visible
in the Faction Events log itself, not just on the two entities.

**`factionsInRegion(campaign, locationId, { anchorFactionId, maxDepth })`
(`factionTurnEngine.js`)** — the deep-traversal counterpart to
`factionsAtLocation`. A private `regionLocationIds` helper walks the full
`located_at` ancestor chain from `locationId` (capped by `maxDepth`,
default 6) and then breadth-first descends every `contains` edge from that
whole chain, using a single `visited` Set that both prevents re-queuing
and is by itself sufficient cycle protection (a location already visited
is never re-added, so a `contains` cycle — impossible with today's data,
but not structurally prevented — can't hang the walk). Any faction with an
asset, homeworld, Base of Influence, governed location, or a `member_of`
member location anywhere in that set is included, tagged with `.stance`
relative to `anchorFactionId` when one is given (same shape
`factionsAtLocation` already uses). `isSameDistrict`/`factionsAtLocation`
are untouched — still correct for their own single-hop witnessed/
unwitnessed and direct-co-location use cases.

**`getFactionDossier(campaign, factionId)` (`factionTurnEngine.js`)** — a
read-only rollup: the faction record, every entity with a real `member_of`
edge to it, its governed locations, its current goal (definition +
progress track), its allies/rivals (via `relationshipStanceBetween`), and
its own slice of `campaign.factionEvents`. Nothing new is stored — this
answers "make the faction forms track all faction history, NPCs, assets,
colonies, and storyline" by assembling data that's already tracked
elsewhere (relationships, the faction's own fields, the shared event log)
into one query, for a future extension of the existing Faction Events
inspector card to read from.

## Alternatives considered

- **A real "Unaligned" faction entity, seeded into every campaign.**
  Rejected — it would force a migration touching every existing
  entity to get a `member_of` edge for the property to be meaningful, for
  no mechanical gain over a derived fallback; the "derive on read" pattern
  is already this codebase's established answer to exactly this shape of
  problem.
- **A new "Region" entity type.** Rejected — the existing
  `contains`/`located_at` containment hierarchy already expresses regional
  structure (it's HOSTILE's own Zone>Star>World>Base gazetteer chain, per
  ADR 0026); it only needed a traversal deeper than the single hop
  `isSameDistrict` deliberately stops at, not a new data shape.

## Consequences

- A GM who never touches faction conquest or region queries sees no
  behavior change — `governedLocationIds` still updates exactly as before,
  every new function is additive, and `isSameDistrict`/`factionsAtLocation`
  are byte-for-byte unchanged.
- A location's faction membership is now a real, queryable fact
  (`getEntityFaction`) rather than only inferable from a faction's own
  array field — this is the foundation Phase C (faction-driven missions/
  encounters, reading from `factionsInRegion`) and any future "Region" UI
  view build on, without a new entity type to migrate around later.
- Verified via 6 new domain tests (406 total): `getEntityFaction`'s real/
  synthetic/degraded-type paths, `setEntityFactionMembership`'s replace-
  not-duplicate behavior, `seizePlanet`'s membership flip (including
  replacing a prior owner), `factionsInRegion` finding a faction two
  structural hops away that `isSameDistrict`/`factionsAtLocation` miss
  plus a cyclic-fixture non-hang check, and `getFactionDossier`'s full
  aggregation shape.

## Related packs / ADRs

`docs/adr/0031-swn-faction-turn-engine.md` (the district helpers and
`factionsAtLocation` this extends), `docs/adr/0032-gmatlas-core-faction-
provider.md` (the provider indirection `getFactionDossier`'s goal lookup
reuses), Constitution pack 21 ("Locations reference factions"), pack 66
(Context Graph depth — the typed/weighted relationship edges this builds
on).
