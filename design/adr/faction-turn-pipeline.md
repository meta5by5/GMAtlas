# The Faction Turn pipeline

**Status:** Accepted, built 2026-11-22 (design/FACTION-ROADMAP.md F3).

## Context

The Factions design (design/Faction-baseline.md B4.5) asks for a Faction
Turn that only relevant factions take part in, that explains every choice,
that a cautious faction can't turn into open war, that gives the same
result for the same inputs and seed, and that never cascades within one
run (SRS 7.2–7.5). F2 already records any consequence as an undoable
change set (design/adr/faction-change-sets.md), so F3 only has to decide
*what* happens.

## Decision

`src/domain/factionTurn.js` adds the pipeline. All of its content
(the 27 action families, the seven outcome bands, weights, budgets and the
resolution curve) is data in `src/data/factionActions.js`.

- **Propose is read-only.** `proposeFactionTurn(campaign, {seed})` runs
  TRIGGER → EVALUATE → DECIDE → ACT → RESOLVE and plans PROPAGATE and
  INVOLVE PLAYER. It returns a **run** and never changes the campaign.
- **Relevance** sums named parts (trigger, interest, objective, proximity,
  capability, urgency, history, stage, minus cooldown), with weights per
  Mode. The top three positive parts are kept as the reasons. Paused,
  muted, excluded and off-stage factions are skipped with a stated reason.
  Passive mode acts only on triggers.
- **Decision** builds a pool of families from the faction's methods, its
  objective's stake, its conditions (weak, wronged, a friend in trouble,
  endgame) and its relationships. It scores each family on behavior fit,
  method, stake, project progress, risk against the faction's tolerance,
  Pressure, a variety penalty and a same-move-as-last-turn penalty, and
  keeps the best 3–5 as candidates. A seeded jitter, never larger than
  0.4, breaks ties.
- **Determinism:** each faction draws from its own stream, seeded by the
  run seed plus its id, so adding an unrelated faction doesn't change
  anyone else's result.
- **Resolution** shares one modifier (capability band against opposition,
  preparation, reach, readiness, exposure; −3..+3) across the styles:
  - **GMAtlas:** 2d6 on its own seven-band curve.
  - **Oracle:** a d100 yes/no with the likelihood set by the modifier.
  - **GM decides:** the band is left empty until the GM picks it.
  - **Campaign ruleset:** stands in with GMAtlas style until F7 wraps SWN.
  An unrated capability counts as band 2, so a faction with no ratings
  still resolves, at the narrative level (SRS 14.3).
- **Effects** are one pure mutator per action and band:
  - project progress;
  - the target's stance toward the actor, plus a grievance memory;
  - backfire on failure;
  - attention toward the party;
  - the actor's own state, but only bands already set.
  The preview diffs the mutator on a scratch copy, so the GM sees the exact
  changes before committing.
- **Budgets:** factions and events per Mode, loud moves per Pressure. When
  the loud budget is spent, a faction falls back to its best quiet move.
- **Runs** are stored under `factions.runs` (the last 12) as `preview`,
  `committed`, `superseded` (rerolled) or `discarded`. A reroll is a new
  run that points back at the old one.
- **Commit** (`commitFactionRun`) records each kept action through
  `recordEvent`, one change set per action, then:
  - moves the faction clock on one turn;
  - marks the answered triggers processed;
  - queues each target's reaction as a `follow-on` trigger, at most 2
    deep, for the **next** run.
  Critical actions are kept only when the GM ticks them.

## Consequences

- F4's Review Queue replaces the preview's tick boxes as the place
  decisions happen. Its `autoApplyQuiet` setting will commit low-impact
  actions without asking. The run and event records don't change shape.
- `abandon` gives up the active objective. `split` and `merge` are recorded
  as critical events with an open-thread hook but change no records. F5
  adds their ripple bundles.
- The classic SWN turn engine (`factionTurnEngine.js`) is untouched and
  stays under History › Classic SWN turn. Its `commitFactionTurn` export is
  why the new commit is named `commitFactionRun`: the bundler puts both in
  shell.js's scope.
- The workflow steps that offer **Run Faction Turn** inline are listed by id
  in `FACTION_TURN_STEPS`. No turn-step list was edited, so saved step
  progress (which is index-based) doesn't move.
