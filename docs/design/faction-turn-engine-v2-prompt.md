# Faction Turn Engine — clean processing UI, a build prompt

> **How to use this document.** This is a self-contained prompt for a
> Claude Code session (or any competent engineer) to build the Living
> Faction Engine's activity-pacing, mission-generation, and turn-
> processing UI layer from scratch, inside `c:\Dev\GMAtlas` (Saga Atlas /
> GMAtlas). It assumes the reader has NOT seen the conversation that
> produced it — read `CLAUDE.md` first for this repo's non-negotiable
> architectural rules (pure domain layer, single storage module, one
> delegated listener per event type, no `window.prompt()`) and
> `docs/adr/0031`/`0032`/`0034`/`0035` for the existing SWN Faction Turn
> Engine and Living Faction Engine this extends. Everything below is
> either a requirement, an explicit non-goal, or already-shipped context
> — nothing is speculative. (This document previously sketched a
> retcon/command-log rebuild for this layer; that concept was explicitly
> removed on direct request — see §6.)

## 1. Context

- A working SWN-style Faction Turn Engine (`src/domain/factionTurnEngine.js`,
  `docs/adr/0031`/`0032`): typed faction entities, 9 SWN actions, a
  propose-then-confirm Step/Full Round flow, and a committed
  `campaign.factionEvents[]` log.
- Living Faction Engine Phase A (`docs/adr/0034`): universal faction
  membership, conquest flipping a location's real ownership, a deep-region
  presence query, a dossier rollup.
- A UI-refinement pass: Active-Location scoping for Step/Full Round, a
  narrowed Roster "activity summary" card (full editing lives in the
  Entity Editor exclusively), whole-card docking of Faction Events into
  the WHERE workspace tab, and a real bug fix (the turn heuristic could
  get stuck proposing a guaranteed-fail Repair action for a resourceless
  faction).
- **This document's scope**: Phases B (pacing), C (missions), D (a clean
  turn-processing UI) — all shipped together, per `docs/adr/0035`.

## 2. Goals

- A GM can process one faction's turn (Step) or every faction's turn at
  the Active Location (Full Round), per SWN's actual turn sequence,
  reviewing before committing (Article II: GM always retains creative
  authority).
- A gentle, non-intrusive reminder ("it's been a few scenes — consider a
  faction round") that never fires as an urgent alarm and never
  auto-advances anything on its own.
- A hot faction's activity can become a real, trackable mission the party
  can accept/decline/resolve — not just Co-Pilot narration.
- The turn-review interface shows only what's relevant to deciding
  whether to accept a turn: which faction, what action, **where**, which
  **assets were affected** (structured, not prose), and **recent activity
  at that same location** (any faction) for context.
- Clicking a faction's name anywhere in Faction Events opens that
  faction's full Entity Editor card, which shows every stat/asset/goal
  field, **the specific mechanical impact of the turn clicked from**, and
  **the complete campaign-wide turn history for that faction**.
- A GM can browse **faction turn history grouped by round**.

## 3. Inherited architectural constraints (do not violate)

- `src/domain/*.js` stays pure and DOM-free: every mutator takes a
  campaign object, returns a NEW one via `clone()`.
- `src/core/store.js` remains the only persistence module.
- `src/ui/shell.js` keeps exactly one delegated listener per DOM event
  type — every interactive control is a `data-*` attribute read via
  `target.closest(...)`.
- No `window.prompt()` (unaffected by this feature — nothing here needed
  a new free-text entry point).
- Additive schema changes are lazy-initialized — no `migrate.js` step
  needed for a plain default value/empty array.

## 4. Phase B — activity-based pacing

- `settings.factionPacing = { scenesPerRound: 3, scenesSinceLastRound: 0 }`
  — additive schema default.
- `continueStory`/`suggestNextWithLens` (`src/domain/session.js`) each
  increment `scenesSinceLastRound` by 1 per scene generated — the closest
  proxy this app has for "a unit of party activity has passed."
- `isFactionRoundDue(campaign)` (`factionTurnEngine.js`) — a **derived**
  read (not a stored flag, matching `isRelationshipFlagged`'s convention):
  `scenesSinceLastRound >= scenesPerRound`. Treat `scenesPerRound <= 0` as
  "off," never as "always due" — this is an easy off-by-default-semantics
  bug to introduce with a naive `||` fallback; use an explicit `!= null`
  check.
- `resetFactionPacing(campaign)` — zeroes the counter; called wherever a
  faction turn is actually committed (Step or Full Round — simplified
  from an earlier draft of this design that wanted to reset ONLY on a
  genuine Full Round; not worth the extra state tracking for a reminder,
  not a rule).
- Surface as a new priority slot in `copilot.js`'s `advise()`, ranked
  below other Faction Events signals (a hot faction/goal/world-event is
  more actionable right now) but above the generic threat/stress
  fallbacks.
- A Settings control (a plain number input) lets a GM tune the cadence.

## 5. Phase C — faction-driven missions

- `campaign.missions: []` — additive schema default.
- `generateMission(campaign, { danger, rng, factionId })`
  (`src/domain/missions.js`) — when `factionId` is given, derive `danger`
  from that faction's own current-goal urgency (its goal-track fill
  ratio) instead of `context.what.threat`, and set `title`/
  `sourceFactionId` naming the faction as patron. The existing
  factionless path (defaulting to campaign threat) is unchanged.
- `addMission`/`updateMissionStatus`/`removeMission`/`missionsForFaction`
  — plain CRUD, matching `threads.js`'s `addThread`/`removeThread` shape.
  Valid statuses: `open → accepted → resolved`, or `open → declined`.
- `copilot.js`'s `advise()` gains `hotFactionId`/`hotFactionName` —
  whichever faction signal (hot-under-pressure, hot-goal, hot-world-event)
  is actually driving the current observation, in the same priority
  order already established. The UI offers a one-click "Generate mission
  from them" button when set — Article II: this only *generates and
  persists* the mission; a GM still decides whether/how to hand it to the
  party.
- A Missions list in the Faction Events panel: every mission regardless
  of source, with accept/decline/resolve buttons matching its current
  status, and a remove (✕) control.

## 6. Phase D — a clean turn-processing UI (no retcon)

### 6a. Event impact — computed once, stored forever, never replayed

The single most important simplification in this document: **do not
build a replayable command log.** An earlier draft of this design
required recording every roll separately from its outcome, splitting
each of the 9 SWN action functions into a "decide" (rolls) and "apply"
(pure, replayable) half, and a `replayFactionTurns` engine to support
retconning a turn and reprocessing everything after it. That entire
concept was removed on direct instruction ("remove the retcon concept,
keep it simple").

Instead: `proposeFactionTurn` already has both the faction's state right
before its action (`f`, after upkeep/goal-pick) and its state right after
(from `resultCampaign`) — both naturally available in the SAME function,
at propose time. Compute a plain diff **once**, there, and attach it
permanently to the event as `event.impact`:

```
{
  hpDelta,          // number, +/-
  facCredsDelta,    // number, +/-
  assetsAdded,      // [{ id, catalogId }]
  assetsRemoved,    // [{ id, catalogId }]
  assetsChanged,    // [{ id, catalogId, hpBefore, hpAfter, statusBefore, statusAfter }]
}
```

Scope this to the ACTING faction's own before/after state only — an
Attack's defender-side damage is not folded into the attacker's own
`impact` (it shows up on the defender's own future turn's diff / their
own Turn History instead). This is a deliberate, documented scope cut,
not an oversight — see §7.

Every propose path (including the `busy`/`none` fallback branches) must
attach `impact` — a diff of "no change" is still a valid, useful answer
("this faction did nothing this turn, here's proof").

### 6b. Draft/event cards — assets affected, recent-location context

- Structured "assets affected" (reading `event.impact`, resolving each
  `catalogId` to a readable name via that faction's own rules provider) —
  not buried in narrative prose.
- A "recent events at this location" panel (any faction, last ~5,
  reverse chronological) shown alongside a draft under review — this is
  new; previously only a faction's *own* recent events were ever shown,
  never a *location's*.
- The location itself, named and prominent (already existed in narrative
  text; keep it, just make sure it's not the only place it appears).

### 6c. Clickable faction names → Entity Editor

- Every faction name in a draft row, a committed event row, and a Round
  History row becomes a link into the existing universal
  "open this entity" mechanism (`data-open-entity` — do not invent a new
  navigation concept).
- A name clicked from a *specific turn* additionally carries a second
  data attribute (e.g. `data-open-entity-event`) so the click handler can
  capture which event to highlight once the Entity Editor opens. Clear
  this ephemeral "focus" state on every OTHER entity-open trigger so a
  stale highlight never leaks in from an unrelated click.

### 6d. Entity Editor — Turn History

- The faction's full stat/asset/goal card is unchanged — "everything
  about a faction" lives there exclusively, per the earlier decision that
  Faction Events itself stays narrow.
- Append a new "Turn History" section: every round this faction has ever
  acted in, campaign-wide (not location-filtered), grouped by round,
  most recent first. Reuse the SAME round-grouping function the Round
  History browser uses (§6e) with an added optional per-faction filter —
  do not write a second query for this.
- The specific event matching the "focus" state from §6c renders
  highlighted, with its own `impact` shown inline as a plain-language
  summary; every other entry stays a compact one-liner.

### 6e. Round History browser

- A collapsed-by-default toggle in the Faction Events panel expanding to
  every committed round, most recent first, each listing every faction's
  turn that round (faction name — clickable, same as everywhere else —
  action, outcome, location).
- Read-only. No editing, no retcon, no "reprocess." Just browsing.

## 7. Explicitly out of scope (cancelled or postponed — with reasons)

- **Cancelled outright: the replayable command log / retcon-and-
  reprocess design.** Per direct instruction. `event.impact` (§6a) is
  the entire replacement — a frozen, permanent summary, never
  recomputed. If a future request reopens retcon, treat it as a
  genuinely new design exercise, not a resumption of this one; the two
  are architecturally incompatible (a frozen diff cannot be "replayed").
- **Postponed: cross-faction impact.** An Attack's effect on the
  defending faction's own assets isn't folded into the attacker's
  `impact` object. Revisit only if a GM specifically asks to see both
  sides of an exchange in one place.
- **Postponed: a faction-driven encounter generator** (distinct from
  missions — a random-encounter composer scoped by Phase A's
  `factionsInRegion`). Missions alone satisfy "a hot faction's activity
  becomes something to hand the party" for this pass; an encounter
  generator is its own oracle-composition feature, better scoped
  separately if requested.
- **Postponed: resetting the pacing counter only on a genuine Full
  Round** (vs. any commit). Simplified per §4 — not worth the extra
  ephemeral state for a reminder rather than a rule.
- **Unchanged, not revisited by this pass**: Seize Planet's single-turn
  HP-pool approximation of SWN's full multi-turn per-asset siege
  (`docs/adr/0031`'s own scope cut).

## 8. Testing requirements

- `isFactionRoundDue`: false below threshold, true at/above it, and
  explicitly false when `scenesPerRound` is 0 (the off-by-default-
  semantics trap called out in §4).
- `resetFactionPacing`: zeroes the counter, leaves the threshold alone,
  doesn't mutate its input.
- `generateMission` with a `factionId`: danger/title reflect that
  faction's own goal state, not the campaign's ambient threat.
- Mission CRUD: add/update-status (including rejecting an invalid
  status)/remove/filter-by-faction all round-trip correctly.
- `advise()`: `hotFactionId`/`hotFactionName` populated correctly
  whichever signal is driving the observation; both `null` when none is.
- `proposeFactionTurn`'s `impact`: present on every propose path
  (including `none`/`busy`); a buyAsset-driven turn specifically shows a
  negative FacCreds delta and exactly one added asset (search across
  several rng seeds until one actually produces that action, rather than
  hand-picking a single seed and hoping it's stable across unrelated
  future changes to the action-choice heuristic).
- `factionEventsByRound`'s optional per-faction filter: scopes correctly
  without disturbing the unfiltered (campaign-wide) behavior.
