# ADR 0038 — Location ↔ Faction presence, Conflicts, and a Location Story

## Status

Accepted and implemented. Direct report: on the WHERE tab, picking a
location "doesn't select a location," and WHO "does not select factions
that would be associated to the location" — with no "story about how
factions are operating in the location or what conflict exists between
the factions or what the factions are doing in the location (or
region)." Clarified via two follow-up questions before building: (1)
WHERE's location picker does work (clicking a candidate chip inserts an
`@mention` into Focus, the same mechanism `getCurrentWhereLocations`
reads everywhere else in this app) — the actual gap is no persistent
visual confirmation of which location is currently active, not a broken
control; (2) the requested "story" should be both an auto-composed digest
of existing data AND a GM-editable narrative field, not either alone.

## Context

Investigation found most of the underlying machinery already existed and
was simply under-used:

- `factionTurnEngine.js`'s `factionsPresentAt(campaign, locationId)` and
  `factionsInRegion(campaign, locationId, {maxDepth})` already compute
  "who's active here/nearby" from homeworld/Base of Influence/asset/
  governed-location/faction-membership signals. `factionsInRegion` — the
  full location containment-tree walk, exactly what "or region" in the
  request means — was fully built (Living Faction Engine Phase C) but
  wired to **no UI at all** before this change.
- `entities.js`'s generic relationship system already has a `located_at`
  type whose target is constrained to `location`
  (`RELATIONSHIP_TYPE_TARGETS`), with generic `addRelationship`/
  `removeRelationship` mutators already imported in `shell.js` — the
  natural, zero-new-schema way for a GM to say "this Faction operates at
  this Location" when none of the mechanical SWN Faction Turn Engine
  fields apply. Neither presence query recognized it, and no WHO/WHERE
  control created one.
- `conflict.locationId` (ADR 0036) already scopes a Conflict to a
  location, but nothing on WHERE listed Conflicts scoped to the current
  one.
- `updateEntity(campaign, id, patch)` is already generic enough for a new
  per-location narrative field with zero new mutator code.

So this landed as almost entirely a wiring/surfacing job: extend two
existing presence queries to recognize the existing `located_at`
relationship, build the WHO-tab control that creates one, and a
WHERE-tab digest that reads it all.

## Decision

**Domain** — `factionsPresentAt`/`factionsInRegion` (`factionTurnEngine.js`)
each gained one more OR-branch: a faction with a `located_at`
relationship pointing at the location (or, for `factionsInRegion`,
anywhere in the region's containment tree) counts as present, alongside
the existing asset/homeworld/Base/governed/membership signals. `entities.js`'s
`ensureLocationFields` gained `locationStory` (default `''`) — a GM's own
free-text note, same lazy-set-on-touch shape as every other additive
field in this file, mirroring Faction's `scenarioSeed`. No new mutators:
associating a faction is the existing `addRelationship(campaign,
factionId, locationId, 'Located At', 'located_at')`; un-associating is
the existing `removeRelationship`; editing the story field is the
existing `updateEntity`.

**WHO tab** (`workspace/index.js`'s `factionsActiveNearbyBlock`) — now
computed via `factionsInRegion` per current WHERE location (region-wide,
not just single-district) instead of an ad hoc `isSameDistrict` loop that
missed governed-locations/membership/relationship presence entirely.
Each chip keeps its existing "open Faction Events" click target, plus a
✕ shown ONLY when that faction's presence is a manual `located_at` link
(mechanically-derived presence isn't removable from here — same "curated
convenience, not a restriction" posture ADR 0036's Conflict picker
already established). A new "+ faction operating here" `<select>`
(mirroring `conflictSection`'s existing `data-conflict-faction-link`
select-picks-then-links pattern exactly) creates the `located_at`
relationship.

**WHERE tab** (`workspace/index.js`) gained four new read paths, all
additive:
- `currentLocationBanner` — a persistent "📍 Current location" chip row
  reading `getCurrentWhereLocations`, giving the missing "this is
  selected" feedback without touching how selection itself works (a past
  redesign deliberately removed a separate curated location list as
  duplicative of Focus text — this banner is read-only derived display,
  not a second storage mechanism).
- `locationFactionsBlock` — factions present at the exact current
  location (`factionsPresentAt`), each with a truncated Agenda snippet.
- `locationConflictsBlock` — Conflicts whose `locationId` matches the
  current location.
- `locationStoryBlock` — the new rich-text `locationStory` field, one per
  current WHERE location. Bound to a new `data-location-story="locId"`
  attribute rather than the generic `data-entity-field` (which always
  targets the Cast-active entity — confirmed via `activeConflictLocationPicker`'s
  own existing comment on this distinction — not necessarily whichever
  location WHERE currently has mentioned).

The existing `factionActivityHereBlock` (recent Faction Events at this
location) is unchanged and sits alongside the new blocks.

**Same-day follow-up** (direct request, after using this feature): three
more additions to the same WHERE tab. (1) A read-only quick-awareness
summary — System/Star/Colony-Base/District — top-right of the WHERE
card's own header row, next to its title/lead (`cardWithHeaderRight`, a
WHERE-only variant of the shared `card()` helper — special-cased rather
than widening `card()` itself, since no other workspace tab needs a
header-row slot). Reuses existing World Profile fields with no new
schema, per direct confirmation: `zone` (free text) → System, `starSystem`
(confusingly labeled "Star System" but actually stores a `#star`-tagged
Location's NAME) → Star, `bases[]` (curated name strings) → Colony/Base,
and the structural parent one hop up the `contains`/`located_at` entity
graph (`getContainingLocation`, the same edge `isSameDistrict` reads) →
District — four genuinely different signals a Location may have some,
all, or none of. (2) `nearbyLocationsBlock` — every sibling Location
under the current one's same immediate parent (`getContainedLocations`
on `getContainingLocation`'s result), a read-only jump list. (3)
`storyInspirationBlock` — the exact existing `generateSiteConcept`/
`generateAdventureSeed` oracle-driven generators (`domain/worldbuilding.js`,
already wired to `data-generate-site`/`data-generate-seed` in shell.js,
appends straight to the Journal) surfaced a second time on WHERE
verbatim, not a new generator — Article IX (extend via what exists).

## Alternatives considered

- **A new curated "current location" field/list, replacing the
  mention-based selection.** Rejected — that's the exact mechanism a
  prior redesign deliberately removed as duplicative of Focus text; the
  actual gap (confirmed via direct follow-up) was visual feedback, not
  the underlying mechanism, so `currentLocationBanner` adds the feedback
  without re-introducing a second source of truth.
- **A bespoke faction↔location association array on the Location or
  Faction entity.** Rejected — the generic relationship system already
  has an unused, correctly-typed edge (`located_at`) for exactly this,
  with existing generic mutators and existing Entity Editor UI; adding a
  parallel structured field would be a second, redundant mechanism for
  the same fact.
- **Auto-composed digest only, no GM-editable field (or vice versa).**
  Rejected per direct answer — both were requested, and they don't
  conflict: the digest surfaces what's already true, the field is where a
  GM writes what the digest can't derive (motives, plans, tone).

## Consequences

- A campaign that never touches any of this sees zero behavior change —
  `locationStory` is blank by default, and every new block returns `''`
  (renders nothing) until WHERE has a current location.
- `factionsPresentAt`/`factionsInRegion` are also used elsewhere
  (Faction Events panel scoping, the Conflict picker's "local faction"
  list) — those callers now also see manually `located_at`-linked
  factions, which is a strict widening (more correct inclusion), not a
  behavior change for existing data.
- Verified via 1 new domain test (432 total) covering the `located_at`
  signal on both `factionsPresentAt` and `factionsInRegion`, plus an
  extended existing `ensureLocationFields` test for `locationStory`'s
  default — plus `node scripts/build.js` (77 modules, clean). The
  same-day follow-up (header summary, nearby locations, story
  inspiration) is a pure UI composition of already-tested domain data —
  no new domain functions, so no new domain tests — verified via
  `node scripts/build.js` staying clean.
- I don't have a browser automation tool in this environment
  (`chromium-cli`/Playwright not installed) — verified structurally
  (tests + build); a manual smoke pass in the running app is recommended
  before calling this fully done.

## Related packs / ADRs

`docs/adr/0031` (Faction Turn Engine — `factionsPresentAt`/
`factionsInRegion`'s origin), `docs/adr/0035` (Faction Events'
`getCurrentWhereLocations`), `docs/adr/0036` (Faction Conflict —
`conflict.locationId`, the `data-conflict-faction-link` pattern this
mirrors), `docs/adr/0037` (Foreshadowing/World State Flags/NPC goal — the
most recent prior "small additive primitives, reuse generic mechanisms"
precedent in this same arc).
