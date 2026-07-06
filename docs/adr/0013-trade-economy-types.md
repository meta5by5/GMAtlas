# ADR 0013 — Tag-driven Location economy types for the Merchant Rules Lens

## Status

Accepted and implemented (2026-07-06), per `docs/adr/next-request.md`'s
2026-07-05/06 batch. Extends ADR 0003/0004 rather than replacing either —
see their own Status lines, updated to point here for anything about
economy differentiation across Locations, which neither ADR addressed
(ADR 0003's own Consequences section flagged this as "worth revisiting if
a Traveller... sourcebook is ever added," which motivated part of this
request).

## Context

The user asked for several related things at once:

1. Trade mechanics should reference "different economy types using Location
   tags derived from either a custom model or from the Traveller system"
   that determine available commodities/supply/demand.
2. Economy types must be compatible with Hostile's own worlds (biome,
   government type, tech level, per the Hostile references already in
   `assets/docs/`) — if no existing system's economy fits a Hostile world,
   create one; Hostile's lore wins any conflict.
3. Swapping game systems mid-campaign must never break the trade system or
   discard historical data.
4. Traveller tech levels specifically should NOT be referenced directly —
   "build everything off a similar tech level but different scarcity and
   manufacturing capability" instead.
5. A custom trade engine "inspired by Intergalactic Space Trader" (source
   material under `requirements/rulesystems/`, reference-only) but
   Hostile-compatible, Hostile-lore-preferred on conflict.
6. Location economy types tracked in Settings per game system, always
   offered by default in the Location tag list; removed from that list (not
   from any entity's own tags) if the source game system is switched away.
7. No copyright conflicts — prefer the setting-native model, but make a
   borrowed system's real inspiration legible via naming (a "bridge," e.g.
   an oracle/label suffixed with the system it's inspired by) rather than
   silently reproducing it.
8. Only one trade economy model operates at a time; changing it mid-campaign
   must not be game-breaking.

`domain/trade.js` (ADR 0003/0004) already has a working pricing engine — a
per-Location `market` of `{supply, demand}` dials feeding `priceAt()` — but
no concept of a Location's ECONOMY at all: every Location, regardless of
what kind of place it is, starts identical. Research confirmed no existing
biome/government/tech-level/economy taxonomy exists anywhere in this
codebase; Location tags are 100% freeform (`entities.js`'s
`listTagVocabulary`).

## Decision

**Reuse the existing tag system; don't add a new structured field.** A
Location's economy type IS a tag, drawn from a curated, model-driven
vocabulary (`data/economyTypes.js`) that the existing tag datalist already
surfaces for Location entities (`listTagVocabulary`, extended to append the
active model's labels). This keeps the feature purely additive: an
untagged Location behaves exactly as it did before this ADR.

**Two dials instead of a Tech Level number.** Each economy type carries
`scarcity` (0-10, how hard RAW goods are to source locally) and
`manufacturing` (0-10, local capacity to produce MANUFACTURED goods) —
directly satisfying "avoid direct reference to tech level... build off a
similar tech level but different scarcity and manufacturing capability."
Every commodity (`data/commodities.js`) gained a `category: 'raw' |
'manufactured'` field; `domain/trade.js`'s new `economyBiasAt()` prices raw
goods off `scarcity` and manufactured goods off the inverse of
`manufacturing`, producing a 0.6x-1.4x multiplier that `priceAt()`
multiplies on top of the existing supply/demand dial math. A Location with
no matching tag gets a bias of exactly 1 (no change).

**Two models, one active at a time.** `settings.tradeEconomyModel`
(`'hostile'` default, or `'traveller'`) selects which model's types get
suggested going forward — the same single-select pattern
`settings.genrePack`/`settings.statRuleset` already use. Critically,
`economyBiasAt()` checks a Location's tag against **both** models'
`ECONOMY_TYPES` regardless of which is active, so switching the active
model only changes future tag SUGGESTIONS (via `listTagVocabulary`) — it
never breaks a Location that's already tagged from the other model. This is
what makes "not game-breaking to change models during a campaign" true
without any migration step: nothing about a Location's own data ever
depends on which model is "active."

**Hostile-native model, six types**, checked against the Hostile setting
material already in `assets/docs/`: Agricultural, Industrial, Extraction
Outpost, Frontier Outpost, Black Market Hub, Corporate Enclave — chosen to
cover the biome/government/scarcity spread Hostile's own worlds actually
describe, not mapped one-to-one from any other system.

**Traveller-style model, five types, honestly labeled.** No Traveller
sourcebook exists in this repo for trade rules specifically (confirmed;
ADR 0002/0003's honesty note already covers general Traveller content).
General trade-classification vocabulary (Agricultural/Industrial/
Non-Agricultural/Rich/Poor) is common genre language, not any one book's
proprietary text, but every label in this model still carries a
"(Traveller-style)" suffix — the copyright bridge the request asked for:
prefer the setting-native model by default, and when a borrowed system's
inspiration IS used, name it plainly rather than let it pass as this app's
own invention.

**Intergalactic Space Trader** (`requirements/rulesystems/`, PDFs, reference
only) informed the general shape of "a location has a character that
biases what's cheap/scarce there" but contributed no specific mechanic,
number, or table — Hostile's own lore took priority everywhere the two
might have suggested different economy shapes, per the user's explicit
ordering.

**Settings UI**: a new "Trade Economy Model" section (model `<select>` plus
a read-only list of the active model's types/dials/descriptions), mirroring
the existing Rules Constitution reference table's shape exactly.

## Alternatives considered

- **A new structured `location.economyType` field** instead of a tag. Would
  have needed its own dropdown UI, its own migration story, and its own
  "what happens when the model changes" logic. Rejected: the tag system
  already solves discovery (suggested vocabulary), display (chips), and
  cross-model survival (a string, not an enum reference) for free.
- **A literal Tech Level number per Location.** Directly contradicted the
  request's explicit instruction to avoid this; also would have coupled
  Hostile's setting to a Traveller-specific concept it doesn't otherwise
  use anywhere.
- **A full "available commodities" allow/deny list per economy type**
  (hard exclusion rather than a price bias). Rejected for this pass as
  more data-entry-heavy than the request's actual ask, and less safe under
  a model switch — a hard-excluded commodity would need its own migration
  story if a GM later wanted it back. A strong (0.6x-1.4x) price bias
  achieves the same "scarce here" GM signal without ever making a
  commodity un-tradeable.

## Consequences

- A GM who never tags a Location sees zero behavior change — this is a
  pure opt-in layer on ADR 0003/0004's existing pricing engine.
- Still open (deliberately out of scope for this pass, same "MVP slice"
  discipline ADR 0004 used): a Location's economy type doesn't yet feed
  Contract generation's flavor text or the Faction/Colony systems; that's
  a reasonable next increment if a GM finds the current Settings-only
  visibility too quiet.

## Related packs / ADRs

ADR 0002 (Rules Constitution honesty about unsourced systems), ADR 0003
(Trade & Logistics mechanics this extends), ADR 0004 (Merchant Rules Lens,
whose Consequences section named this exact gap), ADR 0010 (the same
no-sourcebook-for-Traveller posture this ADR's naming convention follows).
