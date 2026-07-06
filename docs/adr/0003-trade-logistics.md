# ADR 0003 — Trade & Logistics minigame: supply/demand across Locations

## Status

**Implemented** (2026-07-05, as ADR 0004 refined it — see that ADR's own
Status line for exactly what shipped: `data/commodities.js` + `domain/
trade.js`'s market/`priceAt()`/buy-sell/manifest, plus the Trade drawer).
The *mechanics* below (market dials, pricing, Oracle/Co-Pilot risk
resolution, Vehicle cargo) shipped as designed; "Thread-based transport"
shipped folded into the contract itself (a contract's `originId`/
`destinationId` already ARE "cargo + origin + destination" — no separate
free-floating transport Thread was built alongside a contract, since ADR
0004's contract-Thread already covers that shape). Buy/sell without a
contract at all still works directly against `priceAt()`, so the
buy-low/sell-high mechanic this ADR designed is fully present — ADR 0004
just changed which one is the headline UI verb. This ADR's own Consequences
section flagged that Location-to-Location economy differentiation was
worth revisiting "if a Traveller... sourcebook is ever added" — see
`docs/adr/0013-trade-economy-types.md` for that: tag-driven economy types
biasing `priceAt()` per Location.

## Context

The user asked, directly, for trade mechanics: a merchant-RPG minigame
component that looks at supply and demand across multiple Locations for
planning, purchasing, and transporting goods. This is not a new idea for
this repo — `rulesConstitution.js` already names Trade as a gameplay area
(providers `['traveller', 'hostile']`), and `DESIGN-NEW-FUNCTIONALITY.md`'s
Phase 10 already carried a one-line placeholder ("automated trade... maps
onto the Living World Engine, pack 38") — but nothing concrete had been
designed, and the request asks for a real, scoped mechanic rather than an
aspiration.

Two things were checked before designing this, per this repo's own
"genre-aware, not genre-locked" discipline and the Rules Constitution's
honesty requirement (`docs/adr/0002`):

1. **Where does Trade fit against the existing priority order?** Pack 66's
   backlog framework (continuity > workflow > Context Graph > storage >
   recommendations > UX > integrations > new features), already adopted in
   `docs/adr/0001` and reflected in every phase below Phase 6, ranks new
   features last. Trade & Logistics is unambiguously a new feature, not a
   continuity/workflow/graph fix, so it belongs in Phase 10 — the same
   phase the placeholder bullet already lived in. Moving it earlier would
   contradict a prioritization this repo already committed to in two prior
   ADRs, for no reason this request supplies (the user asked for the
   "soonest phase that doesn't cause conflicts," not for a reprioritization
   of continuity/graph/discovery work).
2. **Is Traveller actually a usable source for this?** `rulesConstitution.js`
   lists Traveller as a Trade provider; at the time of this ADR its
   `status` read `'reference only'` with "no dedicated mechanics built
   yet" (later corrected to `'not yet integrated'` once the same
   no-sourcebook finding below was formalized — see ADR 0002's amendment).
   Checking the actual library (`assets/docs/`) confirms there is no
   Traveller sourcebook present at all — only Starforged/Starsmith, Five
   Parsecs From Home/Planetfall, and the Hostile line. So this design
   cannot responsibly claim to be "Traveller's trade system, implemented" —
   it has to be an
   original mechanic, Hostile-flavored where it takes cues from an actual
   library book (Hostile's colony/logistics material), honestly documented
   as such rather than attributed to a book that isn't here.

## Decision

1. **Trade & Logistics stays in Phase 10, promoted to the front of that
   phase's bullet list.** Explicit user interest changes its priority
   *within* the new-features bucket, not its membership in that bucket.
2. **Model it as data + a pure domain module, matching every other
   ruleset-flavored subsystem in this repo** (`colony.js` for Planetfall,
   `rulesets.js` for character sheets):
   - `data/commodities.js` — a flat, swappable list of tradeable goods
     (`{id, label, basePrice}`), Hostile-flavored by default (Water, Fuel,
     Medical Supplies, Weapons, Salvage, Luxury Goods), replaceable by a
     genre pack exactly like `data/tables.js`.
   - `domain/trade.js` — a new pure module (clone-and-return, no DOM,
     `ensure()`-normalized like `colony.js`) owning:
     - a `market` on each Location entity: per-commodity `{supply, demand}`
       dials (0–100, GM- or oracle-set — not a live economic simulation);
     - `priceAt(location, commodityId)`: `basePrice * demandFactor /
       supplyFactor`, pure and stateless;
     - `buy()`/`sell()`: mutate a party cargo manifest and the local
       market's `supply` dial in the same direction a real transaction
       would (buying drains supply and raises the next price at that
       Location; selling floods supply and lowers it) — this is what makes
       supply/demand *across* Locations matter: two markets are never
       forced into agreement, so a commodity can be cheap at one Location
       and dear at another, which is the entire planning problem the user
       described.
3. **Transport reuses the existing Thread mechanic instead of a new progress
   primitive.** A trade run (cargo + origin + destination) is exactly a
   Thread that resolves on arrival — it gets the 7-state lifecycle,
   priority dial, and "what did I overlook?" surfacing for free, and adds
   zero new state-machine code.
4. **Risk vs. reward is resolved with the Oracle and Co-Pilot, not a new
   resolution engine.** Advancing a transport Thread is a natural trigger
   point for an Oracle roll (ambush, spoilage, customs) and a Co-Pilot
   recommendation. Reward is framed as the price *delta* between two
   Locations' markets for a commodity, weighed against route danger — not
   a flat margin — because that's the actual "plan a purchase and
   transport" gameplay loop being asked for.
5. **Cargo capacity is a field, not a new entity concept.** It rides on the
   existing Vehicle Stats statblock kind (already scoped to Asset-type
   entities via the Bestiary-template mechanism) as one more track/attribute
   field.
6. **New tertiary drawer tab (`trade`)**, following the Party/Colony/Guide
   precedent from Phase 5 exactly — a market view for the selected Location,
   a cargo/manifest view for the party's active transport(s), buy/sell
   controls wired through the shell's single delegated `click` handler
   (CLAUDE.md rule 4) rather than any new listener.

## Alternatives Considered

- **Reorder the roadmap so Trade lands before Phase 6/7/8/9.** Rejected —
  contradicts the pack-66 priority framework this repo already adopted
  twice (ADR 0001, ADR 0002) with no new information that would justify
  reopening that ordering; the user's own phrasing ("soonest phase that
  doesn't cause conflicts") asks to respect existing prioritization, not
  override it.
- **Wait for a Traveller sourcebook and build this as "Traveller's trade
  rules, implemented."** Rejected for now — no such book exists in this
  repo's library, and blocking a user-requested feature on an unspecified
  future document acquisition isn't a real plan. If a Traveller sourcebook
  is added later, its trade tables become a second, swappable
  `data/commodities.js`-shaped data set (same pattern SWN/Traveller
  character content would follow per ADR 0002), not a rewrite of this
  design.
- **A full economic simulation** (multiple interacting commodities, NPC
  traders acting independently, supply chains). Rejected as scope well
  beyond "Frictionless Empowerment" — the corpus's own maturity-ladder
  framing (pack 39) puts this comfortably at "Level 4-5," far past this
  repo's current Level 1-2; two GM-legible dials per commodity per Location
  is enough to make the planning/risk/reward loop real without becoming a
  second product to maintain.
- **A bespoke progress mechanic for "in transit" instead of reusing
  Threads.** Rejected — `domain/threads.js` already has everything a
  transport run needs (a clock, a lifecycle, Co-Pilot surfacing); a second
  clock primitive would just be the same idea maintained twice.

## Consequences

**Positive:** the design is additive — no existing schema, entity type, or
domain module needs to change shape, only gain new optional fields
(`entity.market` on Locations, a cargo manifest on the party/Vehicle
statblock). It reuses three already-tested systems (Threads, Oracle,
Co-Pilot) instead of introducing new resolution machinery, keeping the
"one new pure module + a thin view" testing posture from
`DESIGN-NEW-FUNCTIONALITY.md`'s closing section intact.

**Negative / risk:** because Traveller has no source material in this
repo, the "best rules for the situation" bar this design is held to is
necessarily self-authored rather than transcribed from a named provider —
worth revisiting if a Traveller (or another trade-focused) sourcebook is
ever added to `assets/docs/`.

## Related Packs / Documents

`requirements/initial design inputs/gameplay-goals.md` (source of the Trade gameplay-area
assignment), `docs/adr/0002-rules-constitution.md` (Trade →
Traveller/Hostile, and the "services to automate" deferral this ADR now
gives a concrete shape to), pack 38 (Living World Engine — where
faction-turn/trade automation was filed as long-horizon), pack 66 (backlog
prioritization — why this stays in Phase 10 despite explicit user request).
