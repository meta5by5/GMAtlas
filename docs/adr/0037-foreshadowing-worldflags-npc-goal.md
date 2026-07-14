# ADR 0037 — Foreshadowing, World State Flags, NPC Current Goal

## Status

Accepted and implemented. Direct request: "Review the architecture and
consider the UI design in `docs/design/GMAtlas_Scene_Story_Data_Model.md`
and review the overall design plan and implement improvements" — a large
external spec for a full Scene & Story data model (pre-authored branching
scene graph, an NPC roster, World State Flags, foreshadowing tracking,
clocks/countdowns, a Story-So-Far recap). Reconciled against this
codebase's actual architecture in `docs/design/scene-story-integration-
plan.md` before building anything, same workflow as ADR 0036.

## Context

Most of the source spec turned out to already exist under different
names, or to conflict outright with how this app is built:

- **Clocks/Countdowns** → `domain/threads.js`, already reused four times
  (`'expedition'`, `'faction-pressure'`, `'faction-goal'`,
  `'faction-conflict-escalation'`). Nothing new needed.
- **NPC/Faction/Location reference tables** → `domain/entities.js` already
  covers this generically.
- **Story-So-Far recap** → `domain/recap.js`'s `buildSessionRecap()`
  already does this, read-only.
- **Thread staleness / "you forgot about this"** → `overlookedThreads`/
  `threadUnderPressure` in `copilot.js` already covers the general case.
- **The pre-authored branching scene graph**
  (`prerequisite_scenes`/`exit_conditions`/`follow_on_scenes`, a scene's
  own stable identity to point foreshadowing/flags at) — a genuine
  **philosophical mismatch**, not a gap. This app has no `resolveScene()`
  and no pre-authored scene identity anywhere: `domain/scenes.js`'s
  `generateScene()` is 100% live, oracle-driven improv text generated at
  the table, consistent with Article II (GM retains creative authority)
  and this codebase's "flag, don't auto-advance" convention throughout.
  Building a scene graph would mean inventing the one concept this app
  has deliberately avoided everywhere else.

What was left, once the above was subtracted, was three small,
genuinely-missing, low-risk primitives: a GM's own to-do list for setups
made live during play, a lightweight fact ledger, and a single field on
NPCs mirroring what Factions already have (`agenda`).

## Decision

**Foreshadowing** (`domain/foreshadowing.js`, `campaign.foreshadowing[]`,
additive/lazy-init, no migration step) — `{id, text, payoffNote, paidOff,
paidOffNote, plantedAt, paidOffAt}`. `addForeshadowing`/
`markForeshadowingPaidOff`/`removeForeshadowing`/`openForeshadowing`
(derived, unpaid entries oldest-first). Scoped down from the spec's
`foreshadowing_planted`/`foreshadowing_payoffs_due`, which link a plant to
a specific scene/thread id — dropped, since nothing in this app has a
stable id to point at ahead of time; a plant's own `payoffNote` covers the
same intent as free text. Unlike Faction Conflict's `irreversibleFacts`,
removal is allowed — this is a GM's private to-do, not campaign canon. UI:
a `threads`-styled block on the WHY workspace tab (`foreshadowingBlock`,
`workspace/index.js`), reusing the exact `.thread-row`/`.threads-head` CSS
Threads already established — `data-foreshadowing-add` (inline prompt,
two fields: text + optional payoff idea), `-paidoff` (inline prompt for
how it actually resolved), `-remove`.

**World State Flags** (`domain/worldFlags.js`, `campaign.worldFlags[]`,
same additive/lazy-init posture) — `{id, description, value, notes,
setAt}`, `value` one of `unknown`/`suspected`/`confirmed`/`false`
(`WORLD_FLAG_VALUES`). The spec allows a simple bool or a multi-state
value; the richer four-state option was kept since a GM who only wants
true/false can just ignore the middle two. `addWorldFlag`/
`updateWorldFlagValue`/`updateWorldFlagNotes`/`removeWorldFlag`. Dropped
the spec's `set_in_scene_id` FK for the same reason as Foreshadowing — no
stable scene identity to point at; `notes` can @mention the relevant
entity/journal entry by hand, same as everywhere else in this app. UI: a
second `threads`-styled block on the WHAT workspace tab
(`worldFlagsBlock`), each row a description, a value `<select>`, a notes
`<input>`, and a remove button — `data-worldflag-add` (inline prompt),
`-value`/`-notes` (plain `change`, no prompt needed for an already-visible
field), `-remove`.

**NPC current goal** — one plain-text field, `ensureNpcFields(e)` in
`entities.js` (`e.currentGoal = ''` by default), wired into both
`_create()` and `updateEntity()` alongside the existing
`ensureFactionFields`/`ensureLocationFields`/`ensureConflictFields`
chain. The smallest possible slice of the spec's fuller NPC Roster
(role/status/disposition-to-party/voice notes — all postponed, not
validated as worth the schema weight yet). UI: `npcSection(e)` in
`drawers/index.js`, a type-gated section mirroring `factionSection`'s
pattern exactly, one plain `data-entity-field="currentGoal"` input (no
rich-text editor — this is meant as a quick jot, not prose, same posture
as `hq`/`leadership` on the Faction card).

All three reuse the generic mechanisms already in place: the ADR
0022 inline-prompt standard (no new `window.prompt()`), the existing
delegated `click`/`change` handlers in `shell.js` (no new listeners), and
`data-entity-field` for the NPC field (already fully generic — no new
handler needed at all for that one).

## Alternatives considered

- **The spec's full branching scene graph.** Rejected — see Context.
  Flagged explicitly rather than silently ignored, per this repo's "no
  two docs get to disagree about current reality" rule: `docs/design/
  scene-story-integration-plan.md` records the mismatch so a future
  reader doesn't re-propose it without re-deriving why it doesn't fit.
- **Linking Foreshadowing/World State Flags to a scene or journal entry
  by id.** Rejected — no stable scene identity exists to link to; free-
  text/`@mention` covers the same need without inventing one.
- **A fuller NPC Roster (role/status/disposition/voice notes) up front.**
  Rejected for now as unvalidated scope — `currentGoal` alone answers the
  concrete "what does this NPC want" question the spec raises; the rest
  can be added later if it proves to earn its keep in play, same
  incremental-ADR posture as every other phase in this Living Faction
  Engine arc.
- **A Co-Pilot signal surfacing the oldest open Foreshadowing entry**
  (mirroring `hotFaction`/`threadUnderPressure`). Postponed, not built —
  the three primitives above were the validated subset; a Co-Pilot signal
  is a natural next increment once these see actual play, not required
  for the feature to be usable today (a GM can already see open items
  directly on the WHY tab).

## Consequences

- A campaign that never touches any of the three sees zero behavior
  change — all three are inert until used, same posture as every other
  additive/lazy-init field in this schema.
- Verified via 4 new domain tests (431 total): Foreshadowing add/paidoff/
  remove and `openForeshadowing` ordering; World State Flags full CRUD
  including invalid-value clamping; NPC `currentGoal` default and
  non-NPC-entity isolation — plus direct render-path smoke checks
  confirming the WHY tab's Foreshadowing block, the WHAT tab's World
  State Flags block, and the Entity Editor's NPC Current Goal field all
  render correctly (including populated data) against real campaign data.
- `node scripts/build.js` — 77 modules (up from 75), clean.

## Related packs / ADRs

`docs/design/GMAtlas_Scene_Story_Data_Model.md` (the source spec),
`docs/design/scene-story-integration-plan.md` (this decision's full
reconciliation and field-by-field mapping), `docs/adr/0022` (inline-prompt
standard, followed for both `-add` triggers), `docs/adr/0034`–`0036`
(the Living Faction Engine phases whose `agenda`/pressure-track/Thread-
reuse patterns this ADR's NPC field and Foreshadowing clock directly
mirror).
