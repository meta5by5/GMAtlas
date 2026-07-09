# ADR 0025 — Location Development Level + Biome fields, compounding Trade bias

## Status

Accepted and implemented (2026-07-08). Extends ADR 0013 rather than
replacing it — see that ADR's own Status/Decision sections for the
mechanic this one builds on.

## Context

Direct ask: "Entities of Location type need additional attributes about
locations such as biome or level of development, as appropriate to the
Location type selected. Then the Trade tab should include a
functionality that applies smart exchange rates suitable to the biome or
level of development (such as farm, industrial, waterworld would each
have different priorities for goods and thus different exchange rates)."

ADR 0013 already ships a "development level"-shaped mechanic
(`data/economyTypes.js`'s `ECONOMY_TYPES`, `domain/trade.js`'s
`economyBiasAt()`/`priceAt()`), but with a real gap: there was no
dedicated UI for it at all (confirmed via grep — zero hits in `src/ui/`
for it) — a GM set it by typing a tag that happened to string-match an
`ECONOMY_TYPES` label, with no dropdown and no visible confirmation it
took effect. "Biome" was a genuinely new concept (only a same-named but
unrelated global v0.53 legacy field existed, migrated to `_legacy` and
never reused). Commodities (`data/commodities.js`, 8 entries) only
distinguished `category: 'raw' | 'manufactured'` — too coarse for biome
to meaningfully bias "different priorities for goods," since a waterworld
and a desert world would otherwise push the exact same two knobs
development level already does.

## Decision

**Development level becomes a real field, with the tag scan kept as an
automatic fallback.** `entities.js`'s new `ensureLocationFields(e)`
(mirroring `ensureFactionFields`'s exact shape) lazy-inits
`developmentLevel: ''` and `biome: ''` on every Location, at the same two
call sites (`_create`, `updateEntity`) `ensureFactionFields` already
uses. `trade.js`'s new `developmentLevelBiasAt(location, commodityId)`
prefers `findEconomyType(location.developmentLevel)` when the field is
set, and falls back to the pre-existing `economyTypeForLocation()` tag
scan otherwise — an already-tagged Location from before this change
keeps pricing exactly as it did, with zero migration needed.
`economyBiasAt`/`economyTypeForLocation` stay exported and unchanged;
the new function wraps rather than replaces them.

**Biome is a second, independent bias axis**, not a rename of
development level — the user's own example ("farm, industrial,
waterworld would each have different priorities") implies a Location's
build-out level and its raw environment are different questions that
should both be able to influence price without canceling each other out.
`data/biomes.js` (new) is a flat `BIOMES` array, same shape convention as
`ECONOMY_TYPES`: `{ id, label, genrePack, resourceScarcity: {water, fuel,
food, ore, tech, luxury}, description }`, each dial 0-10 in the same
direction convention `scarcity` already uses (0 = locally abundant/cheap,
10 = scarce/expensive). Authored per genre pack (`data/genrePacks.js`),
original content, no sourcebook transcription — same posture as
`ECONOMY_TYPES`' own header comment: 7 hostile biomes (Waterworld,
Desert, Ice/Arctic, Volcanic, Forest/Jungle, Orbital Station, Barren
Rock), 6 cyberpunk (Megasprawl, Corporate Arcology, Undercity, Industrial
Zone, Wastes, Suburbs/Sprawl Edge), 6 fantasy (Deep Forest, Mountains,
Coastal, Swamp/Marsh, Plains/Farmland, Badlands/Frontier).
`findBiome(id)`/`biomesForGenrePack(packId)` mirror
`findEconomyType`/`economyTypesForModel` exactly.

**Commodities gain a finer `resourceType`** (`water`/`fuel`/`food`/
`ore`/`tech`/`luxury`) alongside the existing `category`, so biome has
something distinct from development level to bias against. `trade.js`'s
new `biomeBiasAt(location, commodityId)` resolves
`findBiome(location.biome)`; if found and the commodity has a
`resourceType`, it returns a bias from
`biome.resourceScarcity[resourceType]` using the same `0.6 +
(dial/10)*0.8` formula `economyBiasAt` already used (factored into a
shared `biasFromDial()` helper rather than copy-pasted). No match on
either side — unset biome, unset `resourceType`, or an unrecognized
biome id — returns 1 (no change), the same "purely additive" posture
ADR 0013 established.

**The two biases compound, multiplicatively, in `priceAt()`.** A
Location that is both Waterworld (biome) and Industrial (development
level) prices Water cheap AND manufactured goods cheap, independently —
neither factor overrides or cancels the other structurally:

```
price = basePrice * demandFactor * developmentLevelBias * biomeBias / supplyFactor
```

**Both fields live on every Location entity, optional and blank by
default.** An unset Location prices exactly as it did before this ADR
(both biases default to 1), matching ADR 0013's own "additive, never
required" posture.

**UI**: a new "Location card" section (`ui/drawers/index.js`'s
`locationSection(doc, e)`, mirroring `factionSection`'s "only render for
this entity type" shape) with two `<select>`s
(`data-entity-field="developmentLevel"` / `="biome"`, a `— unset —`
option plus the active model's/pack's options), inserted into
`inspector()`'s template. No new click/change handler was needed at all
— `data-entity-field` (`shell.js`) was already fully generic, patching
any field via `updateEntity()`, the same mechanism the Type dropdown
already used. `tradeEconomyModelSection` (Settings) gained a second
reference list for the active genre pack's biomes (dials + description),
matching the existing economy-type reference list's
`<ul class="rules-provider-legend">` treatment.

## Alternatives considered

- **Merge biome into development level as one bigger enum** (e.g.
  "Waterworld-Industrial" as a single choice). Rejected: multiplies the
  option count combinatorially, and doesn't match the user's own framing
  of these as two separate, compounding questions.
- **Keep development level as a tag forever, only add biome as a
  field.** Rejected as inconsistent — the request asked for both to work
  the same way ("appropriate to the Location type selected"), and having
  one be a real field with a dropdown while the other stays a
  string-match tag would leave the exact UX gap ADR 0013 already flagged
  half-fixed.
- **A hard commodity allow/deny list per biome** (no biome-appropriate
  goods at all, rather than a price bias). Rejected for the same reason
  ADR 0013 rejected it for development level: harder to migrate away
  from later, and a strong price bias already delivers the "this is
  scarce here" GM signal ADR 0013 relies on.

## Consequences

- A GM who never sets either field sees zero behavior change on any
  existing campaign — both biases default to 1, and a Location already
  tagged the ADR-0013 way keeps pricing through the tag-fallback path.
- Still open (same "MVP slice" discipline ADR 0013 and ADR 0004 used):
  biome doesn't yet feed Contract generation's flavor text, Colony
  turns, or Faction agendas — a reasonable next increment if a GM finds
  the current Trade-only effect too quiet.

## Related packs / ADRs

ADR 0013 (the development-level mechanic this one extends and adds a
real field/UI to), ADR 0003/0004 (the underlying Trade & Logistics
pricing engine and Merchant Rules Lens both bias functions multiply
into).
