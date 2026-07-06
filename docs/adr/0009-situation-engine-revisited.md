# ADR 0009 — Situation Engine, revisited: Expedition trackers, Diplomacy fields, and suggestion lenses

## Status

Accepted (design only — none of this is built yet). Amends ADR 0008's
Decision item 6: **reverses** two of its five declines (Expedition
Structure, Diplomacy Engine fields), **redirects** two others into a
different, more specific mechanism than either `gameplay-mechanics.md` or
ADR 0008 first considered (Discovery Quality, Noncombat Resolution — both
become inputs to a new "Suggestion Lens" step in the *What Happens Next?*
flow, not a stored field or a resolution mechanic), and **reconfirms**
ADR 0008's fifth decline (the mechanized session-composition ratio)
unchanged. ADR 0008's Decision items 1–5 and its Faction Pressure Track
reconciliation (a *different* four-dial proposal — Influence/Resources/
Patience/Agenda Progress — kept as a single clock) are untouched by this
ADR.

## Context

ADR 0008 explicitly declined five `gameplay-mechanics.md` proposals, each
with reasoning. Rather than treat those calls as final, each was put back
to the user individually, non-binding and suggestive ("is this relevant to
revisit and pursue more deeply?") — the same posture ADR 0008 itself
modeled toward the source document, now applied a level deeper to ADR
0008's own conclusions. Four of five came back with a direction; one
(session-composition ratio) reconfirmed the original decline.

## Decision

1. **Expedition Structure — reversed.** The user's direction: *"treat those
   four as trackers and not lifecycle states"* — explicitly rejecting ADR
   0008's "fold it into a Thread's `Escalating` status" alternative in favor
   of real, separate numeric dials. Scoped as: a Thread tagged
   `kind: 'expedition'` (the same tagged-Thread convention Contracts and the
   Faction Pressure Track already established — see ADR 0004 and the
   Faction Pressure Track item in `DESIGN-NEW-FUNCTIONALITY.md`) gains three
   additional 0–10 dials — `supplies`, `exposure`, `morale` — alongside its
   own existing fill-clock, which already *is* the fourth ("Progress")
   dial, so no fourth field is added on top of it. Same neutral-midpoint-5
   default and 0–10 range as `context.what`'s Resources/Reputation/Stress
   dials, for the same reason (an old expedition-less save reads as
   unaffected, not suddenly under-supplied). A new `domain/expeditions.js`
   (mirroring `domain/factions.js`'s shape: `createExpedition`,
   `getExpedition`, `setExpeditionDial`) rather than bloating `threads.js`
   itself with expedition-only fields. Co-Pilot integration: crossing a
   GM-set threshold (Supplies ≤2, Exposure ≥8) surfaces an observation
   suggesting a supply-vs-route dilemma, the same shape Stress/Resources
   thresholds already use in `copilot.js`. UI: a compact 3-slider block on
   an expedition-tagged Thread's row, next to its clock. *Effort:
   low-medium* — one new small domain module reusing an established
   pattern, one Co-Pilot rule, one UI block.

2. **Diplomacy Engine's structured per-faction fields — reversed.** Plain
   "pursue further," so scoped as specified: three new fields — `fear`,
   `need`, `secret` — on the Faction card, alongside the existing `hq`/
   `leadership`/`scenarioSeed` (`ensureFactionFields` in `domain/
   entities.js`, same creation/retype-time application). A natural,
   optional follow-on (not required for v1): when the HOW workspace's
   Activity picker (Phase 9) is set to "Negotiate," the Co-Pilot could
   surface the WHO question's active faction's `fear`/`need` as a
   suggested angle — named here so it isn't lost, not committed to. *Effort:
   low* — three fields, same shape as the existing three.

3. **Discovery Quality + Noncombat Resolution — redirected, not simply
   reversed.** The user's direction for both was the same shape: *"these
   should be options presented as creative suggestions during the course of
   an unfolding storyline"* / *"options to stimulate creativity and frame
   suggestions for what happens next"* — explicitly **not** a stored
   classification field on entities (Discovery Quality's original framing)
   and **not** a formal resolution mechanic (Noncombat Resolution's
   original framing). Both want the same thing: to feed **what the GM sees
   offered** at the moment of "what happens next," not data stored
   afterward. That's a different, more specific ask than either
   `gameplay-mechanics.md` or ADR 0008 evaluated, and it names a real,
   previously-unaddressed gap this repo already had: **"Continue Story" and
   "What Happens Next?" are wired to the exact same handler today**
   (`ui/shell.js`: `hit('[data-continue-story]') || hit('[data-what-next]')`
   both call `continueStory(d)`) — two buttons, zero behavioral difference.
   This ADR gives *What Happens Next?* its own identity: a **Suggestion
   Lens** step.
   - **Two new small data tables**, not auto-rolled: a "Discovery Lens"
     list (Technology / History / Politics / Religion / Biology / Physics /
     Trade / Culture — Discovery Quality's eight categories) and an
     "Approach Lens" list (Violence / Negotiation / Stealth / Science /
     Engineering / Economics / Social leverage / Exploration — Noncombat
     Resolution's eight approaches).
   - **A lens → Oracle-category mapping** (data, e.g. "Negotiation" →
     `Frontier Society`/`Factions`; "Technology" → tables whose flavor
     already leans technical), the same kind of lookup table
     `rulesConstitution.js`'s `GAMEPLAY_AREAS` already established for
     Activities → Rules Lens providers (Phase 9) — same pattern, new
     domain.
   - **`What Happens Next?` presents 3–4 lens chips** (a small random draw
     across both lists, or the GM's own pick) instead of immediately
     generating a scene; clicking one calls a new `suggestNextWithLens(campaign,
     lensId, {rng})` — `continueStory`'s existing logic, filtered toward
     the chosen lens's mapped categories before rolling — so picking
     "Stealth" after a tense scene visibly pulls different content than
     picking "Negotiation" would. "Continue Story" (the other button)
     keeps today's no-input, immediate-generation behavior unchanged — the
     two buttons finally do different things, as their separate labels
     already implied.
   *Effort: medium* — this is a small new mechanism (a lens-filtered
   suggestion step), not pure content like ADR 0008's four oracle-chain
   additions, so it belongs in Phase 10 (new-feature-shaped work), not the
   unphased content section. Flagged as user-prioritized within Phase 10 —
   same precedent as Trade & Logistics being "promoted to the front of this
   phase given explicit user interest, but not moved out of Phase 10
   itself" (ADR 0003).

4. **Session-composition ratio — reconfirmed declined.** ADR 0008's
   Decision item 5 stands unchanged: the 35/25/20/15/5 ratio stays
   background design guidance, not a tracked or enforced meter. No new
   decision needed here beyond recording that the user was asked again and
   gave the same answer.

## Alternatives Considered

- **Fold Expedition dials into `context.what`'s existing campaign-wide
  dials** (a sixth/seventh/eighth slider next to Resources/Reputation/
  Stress). Rejected — those dials are deliberately campaign-global (one
  value for the whole campaign at a time); an expedition is scoped to one
  Thread, and multiple expeditions could plausibly run in parallel (a
  survey team in the field while a separate salvage run is also underway).
  A per-Thread home is the only one of the two shapes that doesn't break
  under that case.
- **Store Discovery Quality's category as a field on Lore/discovery
  entities**, then have the Co-Pilot read it back later. Rejected — this is
  exactly the framing ADR 0008 already declined and the user redirected
  away from just now; a stored classification answers "what did this
  discovery already turn out to mean," not "what should happen next,"
  which is the actual ask.
- **Build Noncombat Resolution as a real resolution mechanic** (an explicit
  "choose your approach, then roll" UI competing with each ruleset's own
  skill list). Rejected for the same reason ADR 0008 originally gave (no
  dice-mechanic gap exists) — the redirected framing (a suggestion lens,
  not a resolution step) avoids inventing mechanics a ruleset already owns.
- **Give "Continue Story" the lens picker too, instead of only "What
  Happens Next?"** Rejected — the whole point of having two buttons is that
  one stays the fast, no-input path (today's unchanged behavior) and the
  other becomes the deliberate, GM-steered path; collapsing them back to
  identical behavior with an extra step would just relocate the "these do
  the same thing" problem instead of fixing it.

## Consequences

**Positive:** two real gaps get concrete, scoped designs — Expeditions gain
actual multi-dial tracking (matching the user's explicit correction, not
ADR 0008's lighter alternative), Diplomacy gets its structured fields, and
*What Happens Next?* stops being a dead-duplicate button and becomes this
repo's answer to `gameplay-mechanics.md`'s Discovery Quality and Noncombat
Resolution ideas simultaneously, via one shared mechanism instead of two
unrelated ones. The session-composition ratio stays correctly out of
scope.

**Negative/risk:** items 1 and 3 are real new mechanism work (a new domain
module; a new lens-filtered suggestion path), not free — both are
Phase-10-shaped (new feature, lowest pack-66 priority) despite being
user-prioritized, the same tension Trade & Logistics already navigated.
Neither is built by this ADR; it only fixes the scope so a future
implementation pass has a concrete target instead of re-deriving one.

## Related Packs / Documents

`docs/adr/0008-situation-engine.md` (the ADR this one amends — items 1–5
and the Faction Pressure Track reconciliation there are otherwise
unchanged). `docs/adr/0003-trade-logistics.md` (the "user-prioritized but
still Phase 10" precedent this ADR reapplies). `docs/adr/0004-merchant-
rules-lens.md` and the Faction Pressure Track item in
`DESIGN-NEW-FUNCTIONALITY.md` (the `kind`-tagged-Thread convention
Expeditions reuse). `docs/adr/0002-rules-constitution.md` (the
lookup-table pattern — Activity → Rules Lens — Discovery/Approach lenses'
category mapping reuses). `requirements/design-principles/
gameplay-mechanics.md` (original source, unchanged from ADR 0008's
citation).
