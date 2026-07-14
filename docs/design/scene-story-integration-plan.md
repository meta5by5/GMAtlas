# Scene & Story Data Model — reconciliation

> Source spec: `docs/design/GMAtlas_Scene_Story_Data_Model.md`. Like
> `FACTION-CONFLICT.md` before it, this is a generic, tool-agnostic spec
> written for a "campaign planning" style tool, not against GMAtlas's
> actual architecture. This document maps it onto what already exists,
> flags one genuine philosophical mismatch, and scopes what's actually
> worth building.

## What the spec assumes vs. what GMAtlas actually is

The spec models **scenes as pre-authored branching graph nodes** —
`prerequisite_scenes`, `exit_conditions` (each naming a `leads_to_scene_id`),
`follow_on_scenes`, `parallel_scenes` — the data shape of a visual-novel/
CYOA authoring tool, where a GM builds the whole campaign's shape ahead of
time and the system routes through it.

GMAtlas's actual scene layer (`domain/scenes.js`) is the opposite:
`generateScene()` rolls a scene from oracle tables **live, one at a time**,
seeded from the campaign's single rolling WHO/WHERE/WHAT/WHY/HOW context
(`domain/context.js`) — there is no per-scene WHO/WHAT/WHERE/WHY/HOW
record, no prerequisites, no exit conditions, and — per this repo's own
terminology map — deliberately **no `resolveScene()` mechanic yet**. This
isn't an oversight; it's consistent with Article II ("the GM always
retains creative authority") and the "flag, don't auto-advance" posture
that shows up everywhere else in this codebase (Co-Pilot observations,
`overlookedThreads`, the Faction Engine's propose-then-confirm turns).

**Decision: do not build the branching scene graph.** It's a different
authoring model than anything else in this app, would be the first
pre-authored-ahead-of-time content type in a codebase whose scene layer
is otherwise 100% generated live, and nothing in the existing design
asks for it. If a GM specifically wants pre-planned branching adventures,
that's a legitimately different tool posture worth its own design pass,
not a bolt-on to the current Story Engine.

## Field-by-field: what's already covered

| Spec concept | Already exists as |
|---|---|
| NPC Roster, Faction Table, Location Table | `domain/entities.js` — extensively, especially Factions after the Living Faction Engine work |
| Clock/Countdown Table | `domain/threads.js` — reused 4× already (expedition, faction-pressure, faction-goal, faction-conflict-escalation) |
| Story-So-Far Recap Generator | `domain/recap.js`'s `buildSessionRecap()` — already composes journal + threads + context + entities + Co-Pilot advice |
| Thread Status Dashboard / staleness | `threads.js`'s `overlookedThreads()` (gone quiet) + `threadUnderPressure()` (about to pay off) — both already surfaced via Co-Pilot's "What did I overlook?" |
| Session Prep (loosely) | The WHO/WHERE/WHAT/WHY/HOW workspace tabs + Co-Pilot already serve "what do I need to run this scene," just as one continuously-updated view, not a per-scene sheet |

## Field-by-field: genuine gaps worth closing

1. **Foreshadowing/payoff tracking** — the spec's own Implementation Notes
   call this "the highest-value consistency feature... the field GMs most
   often lose track of manually." Genuinely absent (confirmed: no
   `campaign.foreshadowing`, nothing resembling it). Crucially, this
   doesn't require branching scenes — a GM improvising can still jot down
   "I just planted X" mid-session and want a nudge later. **Building
   this.**
2. **World State Flags** — a lightweight "does the party know X"
   ledger, separate from any one entity's own fields. Confirmed
   genuinely absent (the closest analogs — `entity.revealed`, a
   faction's `secret`, a conflict's `informationAsymmetry` — are all
   entity-scoped, not a general fact ledger). Low complexity, valuable
   regardless of prep style. **Building this.**
3. **NPC "current goal"** — the spec's `npc_scene_goals` idea, scoped
   down: a single plain field on the NPC entity ("what they want right
   now"), mirroring the exact pattern `faction.agenda` already
   established. Cheap, well-precedented. **Building this.**

## Explicitly postponed (and why)

- **The full branching scene graph** (prerequisites/exit-conditions/
  follow-on/parallel scenes) — philosophical mismatch, see above.
- **Session Prep Sheet / Live-Run Card / Continuity Graph View as
  dedicated new UI surfaces** — the workspace tabs + Co-Pilot already
  serve this need continuously rather than as a per-scene generated
  document; a literal "sheet" would duplicate that, not add to it.
- **Thread `type` taxonomy** (Main Plot/Side Plot/Personal/Faction/
  Mystery/Ticking Clock) — a reasonable idea, but the existing `kind`
  tag mechanism already does the *programmatic* categorization every
  subsystem needs; a GM-facing `type` dropdown is a smaller, separable
  follow-up, not bundled into this pass.
- **Full NPC Roster fields** (role, status, disposition-to-party scale,
  voice notes, plot_significance) — real ideas, but a materially larger
  scope than this pass's "close the highest-value gaps" mandate; `role`/
  `status`/`disposition` in particular would need real design work (a
  0-10 disposition dial toward "the party" specifically doesn't compose
  cleanly with the existing entity-to-entity relationship system without
  deciding what "the party" resolves to). Worth a future, focused pass.
- **World State Flag → scene/journal FK linkage** (`set_in_scene_id`) —
  since scenes don't have stable prep-time identity the way the spec
  assumes, flags link to nothing structural for this pass; a flag's
  `notes` field can @mention the relevant journal entry/entity by hand,
  same as everywhere else in this app.
