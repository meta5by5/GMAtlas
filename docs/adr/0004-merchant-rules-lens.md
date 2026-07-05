# ADR 0004 — Merchant Rules Lens: contracts over commodity speculation

## Status

**Implemented** (2026-07-05) — the "concrete, buildable slice" this ADR's
Consequences section named: "a contract is a Thread with a patron/type/
route/payout, generated from a new Oracle table." `domain/trade.js`'s
`createContract()`/`generateContract()`/`updateContract()`/`listContracts()`,
a new "Contract Type" oracle table (15-type taxonomy, Trade & Cargo group),
and a `trade` drawer (market view, cargo manifest, Contract board with an
inline creation form) shipped exactly as decided below — a contract really
is `{...thread, kind: 'contract', patronId, originId, destinationId, type,
payout}`, and every existing Thread mutator (`advanceThread`,
`setThreadStatus`, `setThreadPriority`, `removeThread`) works on one
completely unchanged, with zero new state-machine code. Everything listed
under Decision item 5 ("Explicitly deferred, not designed here") is still
deferred, exactly as decided — this ADR's scope discipline held.
Supersedes ADR 0003's *framing* (contracts as the primary loop, not
buy-low/sell-high); keeps ADR 0003's *mechanics* (market dials, pricing,
Oracle/Co-Pilot risk resolution, Vehicle cargo) as the pricing engine
underneath the contract layer. Consolidates `requirements/Saga_Atlas_
Merchant_*.txt` (three source documents) into this one place.

## Context

The user supplied three additional design documents after ADR 0003 already
shipped a scoped Trade & Logistics design: `Saga_Atlas_Merchant_Game_
Architecture_Roadmap.txt`, `..._Campaign_Engine_Development_Reference.txt`,
and `..._Integration_Guide.txt`. All three describe the same product —
"Saga Atlas Merchant Frontier" — at increasing levels of implementation
detail, and were asked to be (1) incorporated into this repo's design and
(2) consolidated into one place so the three source files can be retired
without losing anything development actually needs.

**The core idea that changes ADR 0003's framing:** all three documents
state the same "key innovation" — *replace buy-low/sell-high with living
contracts*. "Trade creates adventures, not just profit." ADR 0003 modeled
Trade as commodity speculation (a `market {supply, demand}` per Location,
`buy()`/`sell()`, profit from price deltas) because that's what the
original request literally asked for ("supply and demand across multiple
Locations for planning, purchasing, and transporting goods"). These new
documents reframe the *player-facing verb* from "buy/sell a commodity" to
"accept/complete a contract" — the commodity math still exists, but as the
engine under a narrative contract, not the goal itself.

**Everything else in these documents is a much larger product than this.**
Ships with damage/maintenance/insurance/upgrades; crew with skills/morale/
promotion/retirement/conflict; 19 procedural generators; a 15-type contract
taxonomy; "Living Galaxy" colonies with ~19 tracked fields each; faction
politics/espionage/wars; an 8-phase roadmap ending in "GM-less campaign
mode, VTT/web implementation" and "Saga Atlas becomes a genre-independent
procedural campaign platform." This is the same situation CLAUDE.md
already documents for the 77-pack Design Constitution: a mature, Level 4-5
end-state vision (per the Constitution's own maturity ladder, pack 39),
not a spec for this repo's current Level 1-2 state. Treating it as a build
spec would mean designing a second product; treating it as *source
material to mine for this repo's next actual increment* is the same
discipline ADR 0001 already applied to the 77-pack corpus.

**Source-material check** (same honesty test ADR 0003 applied to
Traveller): the Merchant docs repeatedly reference world-building from "the
Hostile Settings book." `assets/docs/Hostile setting.pdf` and
`assets/docs/Hostile_colony-builder4.pdf` both exist in this repo's
library — unlike Traveller (confirmed by the 2026-07-03 ruleset library
review to have zero sourcebook present), Hostile is a real, available
source for colony/frontier flavor. This corroborates `rulesConstitution.js`
already naming Hostile (alongside Traveller) as a Trade provider. The
Architecture Roadmap document's own "Notes on IST Inspiration" also names
its actual source: `requirements/rulesystems/` holds the three
"Intergalactic Space Trader" PDFs it's describing (planet scanning, ship
logs, procedural market/travel workflow) — real source material to borrow
*workflow* from, per that document's own instruction, not mechanics to
transcribe wholesale.

## Decision

1. **Contracts, not commodities, are the primary loop** — the one change
   that actually alters ADR 0003. A contract is a lightweight structured
   record, modeled the same way ADR 0003 modeled a trade run: **it's a
   Thread with a few extra fields**, not a new domain module or state
   machine. A "Thread" already has exactly what a contract needs — a name,
   a progress clock, a 7-state lifecycle (Seeded fits "rumor heard,"
   Active fits "underway," Escalating fits "complication," Resolved fits
   "delivered"), and Co-Pilot surfacing — so a contract is `{...thread,
   patronId, type, originId, destinationId, payout}`, where `patronId`/
   `originId`/`destinationId` are references to existing NPC/Location
   entities (exactly the "reference by id, don't duplicate stats" pattern
   `colony.js`'s crew roster already established). `payout` reads from
   ADR 0003's `priceAt()` — the price delta between two Locations' markets
   for whatever the contract is moving — so the commodity math survives
   entirely, it's just in service of a job instead of being the job.
2. **Contract types are Oracle data, not branching logic.** The 15-type
   taxonomy (Humanitarian, Corporate, Scientific, Military, Exploration,
   Diplomatic, Smuggling, Courier, Passenger, Recovery, Colonization,
   Mining, Research, Emergency, Escort) becomes a new "Contract Type" table
   under the existing `Trade & Cargo` oracle category (`data/tables.js`
   already has `Cargo Problem`/`Trade Opportunity` there) — rolling it is
   how a contract gets generated, matching how every other procedural
   element in this app already works. No new generator engine.
3. **"Living Galaxy" colony richness starts as data already on the entity,
   not ~19 new schema fields.** A Location entity's existing `overview`/
   `revealed` free text already carries government, culture, and story
   hooks perfectly well (that's what they're for). The only *structured*
   addition ADR 0003 didn't already cover is a Location-level Heat/danger
   dial (mirrors `context.what`'s threat/resources pattern — a per-Location
   pressure gauge the Co-Pilot can read) — added only when a contract
   actually needs to react to it, not spun up as a speculative 19-field
   colony record. Population/industries/prosperity/infrastructure/etc.
   stay in free text until a concrete mechanic needs one of them as a
   number.
4. **Discoveries become entities, using the mechanism that already exists.**
   "Every discovery becomes an Entity, automatically linked to Journal,
   Lore, Factions, Contracts and Story" is exactly what `@mention`
   auto-linking + `createEntity` + `addRelationship` already do — an
   Oracle-rolled discovery (a ruin, an artifact, a derelict) gets logged to
   the Journal as a note, and typing `@[Discovery Name]` in it creates and
   links the entity, same as any other name. No separate Discovery Atlas
   data model.
5. **Explicitly deferred, not designed here** (pack 66: new features last;
   Constitution maturity-ladder honesty; none of this blocks Phase 10's
   contract MVP):
   - Ships/crew as rich subsystems (skills, morale, promotion, retirement,
     conflict, insurance, maintenance). Cargo capacity is already a Vehicle
     Stats field per ADR 0003; a crew *roster* already exists via
     `colony.js`'s entity-referencing crew rows. A full crew-as-characters
     subsystem is a second RPG inside this one — not scoped now.
   - Faction politics/espionage/wars as a dedicated subsystem. Entities
     already carry tags and typed-someday relationships (Phase 7); a
     Faction Standing tracker is a plausible small follow-on (same shape as
     Resources/Reputation) if a contract's payout or availability ever
     needs to key off it, but isn't built speculatively.
   - The 19-generator list beyond what's named above. Most map onto oracle
     tables that already exist (Planet/System/Encounter/Station/Ruin →
     `Space Encounters`/`Planets`/`Settlements`/`Derelicts`/`Vaults /
     Ruins`) or don't yet have a concrete triggering mechanic to attach to.
   - GM-less campaign mode, VTT/Foundry integration, "genre-independent
     procedural campaign platform." Out of scope for this app's own
     identity (a GM's cockpit, not a VTT or an automated referee) — see
     CLAUDE.md's Article II, "the GM always retains creative authority."
   - AI-assisted campaign generation as a separate system — `copilot.js`'s
     `advise()` is already this repo's answer to "AI-assisted," by design
     swappable for an LLM-backed advisor later behind the same signature.
6. **Everything above stays a Rules Lens, not a parallel system** — the
   Merchant docs say this explicitly ("Merchant Engine is a Rules Lens...
   uses existing Saga Atlas infrastructure... no duplication of journal,
   entities or campaign systems") and it's exactly Article IX. No new
   dashboard-of-dashboards; the existing tertiary-drawer pattern (Party/
   Colony/Guide, and ADR 0003's planned `trade` drawer) is where a Contract
   Board / Route Planner view belongs when built.

## Alternatives Considered

- **Treat the three documents as a literal build spec and scope all 8
  phases.** Rejected — this is the same mistake ADR 0001 explicitly warned
  against for the 77-pack corpus: a mature end-state description isn't
  evidence the current repo should build toward it wholesale. The concrete,
  buildable slice is contracts-over-existing-Threads; the rest stays
  reference material.
- **Keep ADR 0003's buy/sell framing as primary and add contracts as an
  optional flavor.** Rejected — the source documents are unambiguous that
  contracts are the *point* ("Key Innovation: Replace buy-low/sell-high
  with living contracts"), and a GM reading a "Merchant" feature would
  expect jobs with patrons and stakes, not a spreadsheet. Buy/sell-style
  free trading isn't removed (a contract can still be "sell surplus cargo
  at the best price," using the same `priceAt()`), it's just not the
  headline loop.
- **A new `domain/contracts.js` module, separate from Threads.** Rejected
  for the same reason ADR 0003 rejected a bespoke transport clock: Threads
  already have a clock, a lifecycle, and Co-Pilot surfacing. A contract
  needing a few extra reference fields doesn't justify a second
  state-machine to maintain in parallel.
- **Build the full "Living Galaxy" colony record now, since the docs
  already spec the field list.** Rejected — most of those ~19 fields have
  no consuming mechanic yet; adding them speculatively is exactly the
  "half-finished implementation" this project's own conventions warn
  against. Free-text `overview`/`revealed` already covers the narrative
  half; add structured fields only when something reads them.

## Consequences

**Positive:** the richer Merchant vision is captured in one reconciled
document instead of three loose files with an implicit, undecided tension
(commodities vs. contracts) between them and ADR 0003. The actual next
buildable increment shrinks to "a contract is a Thread with a patron/type/
route/payout, generated from a new Oracle table" — small, reuses four
already-tested systems (Threads, Oracle, entities, `priceAt()`), and
doesn't touch existing schema shape beyond optional new fields.

**Negative / risk:** a reader of the original three documents expecting
ships/crew/factions/VTT integration will find most of it explicitly
deferred here. That's intentional — this ADR is the "solid set of
requirements in one place" the consolidation was asked for, and it's
honest about what's actually scoped vs. aspirational, the same posture
`rulesConstitution.js` already takes for Traveller/SWN.

## Related Packs / Documents

`docs/adr/0003-trade-logistics.md` (the mechanics this ADR builds on,
unchanged), `docs/adr/0001-adopt-design-constitution.md` (the "corpus
describes an end-state, not a spec" precedent this ADR reapplies),
`docs/adr/0002-rules-constitution.md` (Trade → Traveller/Hostile
providers), pack 39 (maturity ladder), pack 66 (backlog prioritization —
still Phase 10, still last). Source documents (retired after this ADR,
content fully captured above): `requirements/Saga_Atlas_Merchant_Game_
Architecture_Roadmap.txt`, `Saga_Atlas_Merchant_Campaign_Engine_
Development_Reference.txt`, `Saga_Atlas_Merchant_Integration_Guide.txt`.
