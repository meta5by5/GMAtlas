# ADR 0035 — Faction Engine: activity pacing, faction-driven missions, and a clean turn-processing UI

## Status

Accepted and implemented. Phases B, C, and D of the "Living Faction Engine"
roadmap (`docs/adr/0034` was Phase A), on direct request, landed together
in one pass. Supersedes the retcon/reprocess design initially proposed for
Phase D (a command-log/replay architecture) — the user explicitly asked to
drop that concept and keep the feature simple; see "Alternatives
considered" below for what was cut and why.

## Context

Direct ask, in three parts:

1. **Phase B/C** — unchanged from the original roadmap: a scene-count
   pacing nudge (Co-Pilot surfaces "faction round is due," never
   auto-commits) and faction-driven missions (a hot faction's activity
   becomes a real, trackable job, not just narration).
2. **Phase D, redefined** — "a clean interface for the GM to process
   faction turns... The Faction Turn process should have an interface
   that shows just the related information to the turn (location, assets
   affected) and the log of recent events for that location, but clicking
   any faction name on the card should open the Faction Editor to that
   faction to see all the details of the faction, impact of the event on
   the faction and the log of all turns across the campaign involving the
   faction." Also: "I want to see the history of faction turns per
   round."
3. A follow-up explicitly removed retcon from scope: "let's remove the
   retcon concept, and keep it simple."

## Decision

### Phase B — activity-based pacing (`src/domain/session.js`, `src/domain/factionTurnEngine.js`)

`settings.factionPacing = { scenesPerRound: 3, scenesSinceLastRound: 0 }`
(additive schema default). `continueStory`/`suggestNextWithLens` each
increment `scenesSinceLastRound` once per scene generated — the closest
proxy this app has for "a unit of party activity has passed."
`isFactionRoundDue(campaign)` (derived, not stored — same convention as
`isRelationshipFlagged`) compares it against `scenesPerRound`; `0` is
treated as "off," never as "always due." `resetFactionPacing` zeroes the
counter, called from `shell.js`'s commit handler (Step or Full Round —
simplified from the original design's "only a genuine Full Round resets
it," since the nudge is a reminder, not a strict mechanic). Surfaced as a
new priority slot in `copilot.js`'s `advise()`, ranked below other
Faction Events signals (a hot faction/goal/world-event is more actionable
right now) but above the generic threat/stress fallbacks. A small Settings
control (`data-faction-pacing-scenes-per-round`) tunes the cadence.

### Phase C — faction-driven missions (`src/domain/missions.js`)

`campaign.missions: []` (additive). `generateMission()` gained an optional
`factionId` — when given, `danger` derives from that faction's own
current-goal urgency (`getFactionGoalTrack`'s fill ratio) instead of
`context.what.threat`, and the mission's `title`/`sourceFactionId` name the
faction as patron. New `addMission`/`updateMissionStatus`/`removeMission`/
`missionsForFaction` — plain CRUD, same shape as `threads.js`'s
`addThread`/`removeThread`. The older `generateMission()`+journal-note path
(`data-generate-mission`, unchanged) still exists for a GM who just wants
flavor text with no faction attached. `copilot.js`'s `advise()` now
returns `hotFactionId`/`hotFactionName` (whichever faction signal is
actually driving the observation, in the existing priority order) so
`copilotPanel.js` can offer a one-click "Generate mission from them"
button (`data-generate-faction-mission`) — Article II: the GM still
decides whether to hand it to the party; nothing here auto-assigns
anything. A new Missions section in the Faction Events drawer lists every
mission with accept/decline/resolve status buttons and a ✕ to remove.

### Phase D — clean turn-processing UI, no retcon (`src/domain/factionTurnEngine.js`, `src/ui/drawers/factionEvents.js`, `src/ui/drawers/index.js`)

**Impact, computed once, stored forever — not a replayable command log.**
The retcon design this replaces would have required treating every
committed turn as a replayable command (recorded rolls, a pure `apply`
step, a `replayFactionTurns` function). Dropped per direct instruction.
Instead: `proposeFactionTurn` now computes a plain before/after diff
(`computeImpact` — HP/FacCreds deltas, which of the faction's own assets
were added/removed/changed) once, at the moment both states are naturally
on hand, and attaches it as `event.impact` — a frozen summary, never
recomputed, never replayed. This is "the impact of the event on the
faction" the request asked for, at a small fraction of the engineering
cost of a full command log.

**Draft/event cards, narrowed to what's needed to decide.** `draftRow`/
`eventEntryRow` (`factionEvents.js`) now show: the location (already
present, made more prominent), a new structured "assets affected" list
(`assetsAffectedHtml`, reading `event.impact`) instead of only prose, and
a new "recent events at this location" panel (`recentEventsAtLocationHtml`
— every OTHER faction's activity there too, last 5) shown alongside a
draft under review, so the GM has situational context before accepting.

**Clickable faction names → Entity Editor.** Every faction name in a
draft/event/round-history row is now a `data-open-entity` link (the same
universal mechanism every entity chip in the app already uses) — no new
navigation concept. A name clicked from a *specific turn* also carries
`data-open-entity-event`, captured into a new ephemeral
`entityDetailFocusEventId` (`shell.js`), threaded through `buildDrawerUi()`
into `factionTurnSectionHtml`'s new optional `focusEventId` parameter.

**Entity Editor gains "Turn History."** `factionTurnSectionHtml`
(unchanged in every other respect — still "everything about a faction,"
per Phase A's own earlier decision) now appends a Turn History card:
every round this faction has ever acted in, campaign-wide, via
`factionEventsByRound(campaign, { factionId })` — a new optional filter on
the existing round-grouping function, not a second query. The specific
entry matching `focusEventId` (if any) renders highlighted with its own
"Impact of this turn" line (`factionImpactSummary`) inline; every other
entry stays a compact one-liner.

**Round History browser.** A collapsed-by-default toggle in the Faction
Events drawer (`data-faction-round-history-toggle`,
`factionRoundHistoryOpen` ephemeral state) lists every committed round via
the same `factionEventsByRound` (no filter this time — the whole
campaign), each faction's turn that round, most recent round first — a
pure read view, no editing, no retcon.

## Alternatives considered

- **A replayable command log + `retconCommand`/`replayFactionTurns`**
  (the design initially proposed for Phase D). Rejected per direct
  instruction — cancelled outright, not merely deferred. It would have
  required recording every roll explicitly, splitting each of the 9 action
  functions into decide/apply halves, and a from-scratch replay engine —
  real engineering weight for a capability the user decided the app
  doesn't need right now.
- **A cross-faction impact diff** (e.g., an Attack's defender-side asset
  damage folded into the SAME `impact` object as the attacker's). Rejected
  for this pass — `computeImpact` is scoped to the acting faction's own
  before/after state only; a defender's own `impact` (on their own future
  turn's diff, or their own Entity Editor's Turn History) still shows
  their side, just not co-located in the attacker's event. Revisit only if
  a GM specifically asks to see both sides in one place.
- **Resetting the pacing counter only on a genuine Full Round** (the
  original Phase B design's stated intent). Simplified to "reset on any
  commit, Step or Full Round" — the nudge is a reminder, not a rule, and
  tracking "was this commit a step or a round" would have needed new
  ephemeral state for no real gameplay benefit.
- **A faction-driven encounter generator** (region-scoped, using Phase
  A's `factionsInRegion`) was part of the original Phase C sketch.
  Postponed — missions alone satisfy "a hot faction's activity becomes
  something to hand the party"; an encounter generator is a distinct,
  larger feature (its own oracle composition, its own UI) better scoped
  as its own pass if a GM asks for it specifically.

## Consequences

- A GM who never touches Faction Events sees no behavior change beyond
  an occasional Co-Pilot line and, once they generate one, a Missions
  section — every new field/section is additive.
- `event.impact` only exists on events committed after this change —
  older campaigns' pre-existing events simply render with no "assets
  affected" line (`assetsAffectedHtml`/`factionImpactSummary` both
  already guard on `!impact`), same posture as every other "additive,
  no migration" field in this schema.
- Verified via 7 new domain tests (416 total): the pacing counter's
  increment/reset/due-threshold behavior (including the 0-is-off fix),
  `factionEventsByRound`'s optional per-faction filter, faction-sourced
  `generateMission`'s danger/title derivation, the full mission CRUD
  round-trip, `advise()`'s `hotFactionId`/`hotFactionName` naming, and
  `proposeFactionTurn`'s `impact` diff (including a buyAsset-specific
  assertion across 20 rng seeds) — plus direct render-path smoke checks
  covering every new UI surface (draft/event impact + recent-location
  feed, clickable faction names, the Entity Editor's Turn History with a
  focused/highlighted entry, the Round History toggle, and the Missions
  list).

## Related packs / ADRs

`docs/adr/0034-faction-membership-and-region-depth.md` (Phase A, this
extends), `docs/adr/0031`/`0032` (the underlying SWN Faction Turn
Engine), `docs/adr/0022-inline-prompt-standard.md` (not used here — no
new free-text entry point was added this pass).
