# ADR 0008 — Situation Engine: reconciling `gameplay-mechanics.md`

## Status

Accepted. Split three ways: (1) a naming/documentation decision with no
code changes — this repo already implements the pattern the source
document proposes, years before the document arrived; (2) four small
Oracle content additions, unblocked by phase order (same reasoning Phase 8
already used for the NPC-generation chain and the two hazard/dilemma
tables — see `DESIGN-NEW-FUNCTIONALITY.md`'s "Why these aren't all dumped
in as one flat list"); (3) everything else, explicitly deferred with
reasoning (Decision item 6), same discipline as ADR 0004.

**Partially superseded by `docs/adr/0009-situation-engine-revisited.md`**:
Decision item 6's Expedition Structure and Diplomacy Engine declines were
put back to the user and reversed; its Discovery Quality and Noncombat
Resolution declines were redirected into a different mechanism (a
Suggestion Lens step in *What Happens Next?*, not a stored field or a
resolution mechanic). Item 6's session-composition-ratio decline and every
other Decision item here (1–5, and the separate Faction Pressure Track
reconciliation) are unaffected — see ADR 0009 for exactly what changed.

## Context

`requirements/design-principles/gameplay-mechanics.md` is a ChatGPT session
transcript added under `design-principles/` — not one of the 77 numbered
Constitution packs, and not consolidated/retired like the three Merchant
`.txt` files ADR 0004 folded in (this one stays as reference; nothing here
duplicates it, so there's nothing to retire). It covers two distinct
things:

**(a) Sci-fi campaign-structure research**: a session-focus ratio for
long-running sandbox campaigns (Exploration 35%, Social/Trade 25%, Combat
20%, Investigation 15%, Survival/Logistics 5% — "almost the reverse of
many fantasy campaigns"), a story-type frequency/longevity table (Frontier
exploration, Merchant/trading, Smuggling, and Archaeology/xeno-ruins score
"Very High"/"Excellent"; Horror survival scores lowest), the Traveller
"sandbox loop" (arrive → rumors → factions → choose → explore → complicate
→ profit → move on), the "crew with a ship" framework as the dominant
long-running structure, and a combat-frequency norm (roughly one encounter
per 1–3 sessions, dangerous when it happens rather than routine).

**(b) A proposed "Situation Engine" pattern** — every gameplay system
(Trade, Salvage, Exploration, Expedition, Science, Diplomacy, Faction
Pressure, Discovery, Noncombat Resolution) reduced to the same shape,
**State → Pressure → Choice → Consequence → World Change** — plus a
generalized "Oracle Prompt Chain" technique (sequential questions that
escalate a situation: *who benefits → who loses → who notices → who
acts*), a "Campaign Momentum" heuristic (a session should produce a New
Ally, New Rival, New Knowledge, or New Opportunity or it "probably didn't
move the campaign forward"), and a **GM Prompt Hierarchy**: Situation → why
are the characters here / what do they expect → Complication → what's
different than expected / who else is involved / what resource is running
short → Decision → what valuable thing costs something to get / three
plausible solutions → Consequence → what changes, which factions/
environments/future opportunities are affected.

**The core finding of this ADR: most of (b) is already built, just without
this name attached to it.** Specifically:

- The **GM Prompt Hierarchy is exactly the existing WHAT card + Shift Story
  reducers** (`domain/context.js`, Phase 2): `situation`/`intent` is
  "Situation," `threat`/`mystery`/`resources`/`reputation` are "Pressure,"
  `Reveal Clue`/`Complicate`/`Raise Threat` are the GM's "Complication"
  lever, and `Reward`/`Set Objective` plus the Co-Pilot's `consequence`
  field are "Decision"/"Consequence." This repo arrived at the same shape
  from "give the GM deliberate controls instead of hunting through tabs,"
  not from this document — but it's the identical scaffold.
- The **"Oracle Prompt Chain" is exactly `generateNpc`'s existing five-table
  sequential roll** (Phase 8: Role → Goal → Revealed Aspect → Disposition →
  Name), generalized. The pattern already has a working, tested
  implementation; this document just names it.
- **"Campaign Momentum" is exactly Session Recap** (`domain/recap.js`,
  Phase 6) plus the Co-Pilot's existing `opportunity`/`consequence` fields
  — "what happened last time, open threads, the current objective" already
  is the New Ally/Rival/Knowledge/Opportunity check, read back to the GM
  instead of tracked as a pass/fail meter.
- **"Crew with a ship" is the framing this app already assumed** — the
  Party drawer (character roster), Colony drawer (turn sheet + crew
  roster), and Vehicle Stats statblock kind (Phase 3C/5) exist because
  that's the default campaign shape, not because this document asked for
  it.
- **The Faction Pressure Track already scoped in Phase 10** (a `pressure`
  clock reusing `threads.js`'s existing machinery, ADR-adjacent design in
  `DESIGN-NEW-FUNCTIONALITY.md`) is this document's "Faction Pressure"
  engine, already planned before this document arrived.
- **ADR 0003/0004's Trade & Logistics / Merchant Rules Lens design**
  (contract-as-Thread, `priceAt()`, Oracle-triggered route complications)
  is this document's "Trading as Story Generation" engine, already
  designed in more mechanical depth (a priced market, not just a value/
  interest/volatility label set) than this document proposes.

What's left, once the already-built overlap is subtracted, is small: a
handful of oracle-content gaps (Salvage, Survey, Cargo hooks, Anomaly
investigation) and some genuinely-new-mechanism ideas this ADR evaluates
and, mostly, declines — following the exact discipline ADR 0001 (corpus
describes an end-state, not a spec) and ADR 0004 (mine for the buildable
slice, defer the rest with reasons) already established.

## Decision

1. **Name the pattern retroactively: "Situation Engine."** No code
   changes from this item alone — it's a documentation decision so future
   engine-shaped work (a new Rules Lens, a new tertiary drawer) gets built
   to this named scaffold deliberately, instead of each new subsystem
   re-deriving "state, pressure, a choice, a consequence" from scratch.
   Recorded here and cross-referenced from
   `DESIGN-NEW-FUNCTIONALITY.md` items 2–3.

2. **Four small Oracle content additions, unblocked by phase order** (data,
   not a new mechanism — same reasoning that already un-gated the NPC
   chain and hazard tables from "new feature" phase treatment):
   - **"Salvage Investigation" chain**, three new tables under the
     existing `Derelicts` oracle group — *What Happened* / *What Remains*
     / *Still Changing* — turning that group's existing Location/Type/
     Condition/First-Look flavor tables into an actual mystery generator,
     matching the document's "detective story" framing (every room answers
     one question while creating another).
   - **"Site Survey" chain**, under the existing `Exploration` oracle
     group — *What's Normal* / *What's Strange* / *What's Dangerous* /
     *What's Valuable* / *What's Beautiful* — deliberately keeping the
     document's own observation that only one of five questions involves
     danger, which matches this group's existing `Discovery`/`Exploration
     Payoff` tables' discovery-first bias already.
   - **"Cargo Interest" table**, under the existing `Trade & Cargo` group —
     who unexpectedly wants this cargo (authorities / pirates / original
     owner / refugees / scientist / AI / cult / competitor) and why. This
     is the concrete table ADR 0003 gestured at but never named
     ("advancing a transport Thread is a natural trigger for an Oracle
     roll") — it feeds a contract's complication the same way any other
     Oracle roll does, no new mechanism.
   - **"Anomaly Investigation" chain**, under the existing `Mysteries &
     Coverups` group — *Observation* / *Hypothesis* / *Contradiction* /
     *Discovery* — the document's Science Engine, reduced to a table chain
     the same way Salvage and Survey are above.
   *Effort: low.* Each ships as ordinary tables a GM rolls in sequence in
   the Oracle drawer — zero new domain code required, the same way most of
   this app's 100+ existing tables work. A one-click "Generate Salvage
   Site" composite action (mirroring `generateNpc`'s roll-and-compose
   pattern) is a plausible low-effort follow-on once the tables exist, but
   isn't required to ship the content itself — don't build the composite
   action speculatively ahead of the tables it would consume.

3. **Faction Pressure Track (Phase 10, already scoped) keeps its
   single-clock design.** The document proposes four named dials
   (Influence/Resources/Patience/Agenda Progress); considered and declined
   — no concrete mechanic today reads "high Influence, low Patience"
   differently than a single pressure clock would, and speculatively
   splitting one dial into four is exactly the "half-finished
   implementation" / premature-field problem ADR 0004 already declined for
   colony fields. Split later if a feature actually needs the distinction.

4. **Cargo Value/Interest/Volatility (the document's "Trading as Story
   Generation" attributes) need no new schema.** Value is already
   `basePrice` in ADR 0003's planned `data/commodities.js`; Volatility is
   already covered by ADR 0003's Oracle-triggered route complications
   (ambush/spoilage/customs); Interest is the new Cargo Interest table
   adopted in item 2. Nothing added on top of the existing Trade &
   Logistics design.

5. **Session-focus ratios / story-type longevity data / combat-frequency
   norms are adopted as design guidance, not code.** They corroborate why
   this repo's default genre (Hostile) and Co-Pilot's suggested-oracle
   logic already lean exploration/discovery-heavy rather than combat-first,
   and they're the reasoning behind picking Salvage/Survey/Trade/Mystery
   content in item 2 over, say, four new combat tables. Explicitly **not**
   built as a tracked "session composition" meter — mechanizing a GM's
   pacing choices would cut against Article II (the GM always retains
   creative authority); the ratio is background research informing what
   content gets authored, not a budget to enforce.

6. **Explicitly deferred, not designed here** (same posture as ADR 0004
   item 5 — none of this blocks the content additions in item 2):
   - **Expedition Structure's four-pressure-dial** (Progress/Supplies/
     Exposure/Morale) as a new tracked entity or mechanism. An expedition
     is already well-modeled as an ordinary Thread — its progress clock
     covers "Progress," and the existing 7-state lifecycle's `Escalating`
     already covers rising danger/dwindling supply. A GM can narrate a
     supply-vs-route dilemma by hand once a Thread crosses into
     `Escalating`, exactly like every other Thread-driven complication in
     this app; no second multi-dial primitive needed alongside Threads and
     `context.what`'s existing dials.
   - **Diplomacy Engine's structured per-faction Fear/Need/Secret fields.**
     The existing Faction card's free-text `scenarioSeed` (Phase 7) already
     carries this — "wants security, fears the independence movement"
     costs nothing new to write there. No new structured fields.
   - **Discovery Quality's eight-category "this changes..."
     classification** as a field on Lore/discovery entities. Free-text
     `overview` already covers it, the same reasoning ADR 0004 used for
     colony richness fields — add a structured field only once a concrete
     mechanic reads it.
   - **Noncombat Resolution's eight-approach taxonomy** (Violence/
     Negotiation/Stealth/Science/Engineering/Economics/Social leverage/
     Exploration) as a new mechanic. There's no dice-mechanic gap to fill
     — a GM already narrates whatever approach the players choose and
     calls for the ruleset's matching skill roll. This is a GM-technique
     essay, not a missing feature.

## Alternatives Considered

- **Build a literal `domain/situations.js`** formalizing Objective/
  Pressure/Unknown/Decision/Consequence as a stored, structured record per
  scene. Rejected — that state already exists, spread across
  `context.what` (Objective/Pressure), Threads (long-running Unknowns), and
  the Co-Pilot (Consequence). A parallel structured record would duplicate
  state that already lives elsewhere — the same objection ADR 0004 raised
  against a separate `domain/contracts.js`.
- **Mechanize the 35/25/20/15/5 session-focus ratio** as an enforced or
  tracked budget. Rejected per Article II — see Decision item 5.
- **Give each of the four new oracle chains its own new oracle group.**
  Rejected — `Derelicts`, `Exploration`, `Trade & Cargo`, and `Mysteries &
  Coverups` already exist and are exactly where each chain belongs; a new
  group per chain would fragment the tree for no reason.

## Consequences

**Positive:** `gameplay-mechanics.md`'s actually-buildable ideas (four
small oracle-content additions) are scoped concretely and don't need to
wait for Phase 10; its already-matched patterns (GM Prompt Hierarchy,
Oracle Prompt Chains, Campaign Momentum, "crew with a ship") are documented
as already-shipped so nobody re-derives them as gaps in a future review;
its longer-range/mechanized ideas (Expedition dials, Diplomacy fields,
Discovery classification, Noncombat taxonomy, session-ratio enforcement)
are explicitly declined with reasons, so they don't get silently rebuilt
later without this context.

**Negative/risk:** a reader of the source document expecting a distinct
"Situation Engine" subsystem, an Expedition tracker, or a Diplomacy
mini-game will find all three explicitly deferred here. Intentional — same
posture as ADR 0004 toward the Merchant documents' larger vision.

## Related Packs / Documents

`requirements/design-principles/gameplay-mechanics.md` (source — not
retired; stays as reference, nothing here consolidates or replaces it).
`docs/adr/0001-adopt-design-constitution.md` (corpus-describes-an-end-state
precedent, reapplied). `docs/adr/0003-trade-logistics.md` and
`docs/adr/0004-merchant-rules-lens.md` (Cargo Interest table extends these;
Value/Interest/Volatility reconciled against their existing design).
`docs/adr/0002-rules-constitution.md` (session-focus data corroborates the
Hostile/Starforged exploration-heavy default already assumed). Pack 66
(backlog prioritization, unaffected — the content additions are unphased
per the same rule that already applied to Phase 8's NPC chain).
