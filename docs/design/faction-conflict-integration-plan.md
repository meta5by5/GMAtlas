# Faction Conflict — integration plan (validated + simplified)

> Source spec: `docs/design/FACTION-CONFLICT.md`. This revision validates
> that spec's design against GM-community sentiment on faction/conflict
> tooling (research below) and simplifies it accordingly before build.
> Superseded its own earlier draft of this file, which mapped the spec
> 1:1 onto GMAtlas architecture without yet stress-testing it against
> real-world adoption patterns.

## Community validation (why this revision exists)

Direct request: design for "80% of users," validated against GM
sentiment, not just mapped onto existing architecture. Research findings:

- Stars Without Number's own faction system — the direct inspiration for
  GMAtlas's Faction Turn Engine — is consistently described as "complex
  and fiddly compared to the rest of the rules" in reviews; tolerated by
  genre-committed GMs for its depth, not adopted *because* of the
  complexity.
- Blades in the Dark's **Progress Clock** (a circle, segments, fill them
  in by GM judgment) is the single most consistently cited "this is how
  you make pressure/tension legible without homework" pattern across
  every source found — the closest thing this hobby has to a universally
  loved GM tool.
- Concrete negative evidence: an indie TTRPG's public devlogs describe a
  faction system being redesigned *twice* because it "took up too much
  headspace" and "bogged down game setup" during real playtesting.
- Gnome Stew's explicit GM complaint about faction systems: frustration
  from "having to learn all these new rules and constantly go back and
  look stuff up" — their recommended fix is reusing systems the GM
  already knows and favoring abstraction over precision.

**Conclusion**: `FACTION-CONFLICT.md`'s full schema (18+ fields per
conflict, per-faction posture objects, enumerated symmetry/appetite
scales) is exactly the shape of design that gets abandoned in practice.
The parts of it that map onto Blades-style clocks and plain one-line
prompts are exactly the shape that gets adopted. This revision keeps
100% of the spec's *ideas* but restructures which parts are required,
which are one-click generated, and which are optional depth a GM adds
only when a conflict earns it.

## The core UX rule this revision applies

**Nothing beyond a name and two factions is ever required to create a
conflict, or to run one.** Every other field is either (a) filled in by
a single "quick-start" roll the GM can accept as-is, or (b) tucked behind
an explicitly-opened "Add depth" section — never a multi-step form
blocking play, never new vocabulary the GM has to learn before touching
anything (field labels are plain GM language, not the spec's schema
jargon: "power_symmetry"/"escalation_appetite" become ordinary sentences
a GM reads once and never needs to look up again).

## Revised design

### Always visible (the "hero path" — this alone is a usable conflict)

- **Name**, **status** (Cold / Simmering / Active / Escalated / Open War
  / Resolved — plain labels, not the spec's `open_war` snake_case).
- **The Escalation clock** — a Thread (`kind: 'faction-conflict-escalation'`,
  segments default 6), rendered with the EXACT pip UI already built for
  faction goal tracks. This is deliberately the single most prominent
  element on the card, matching Blades in the Dark's own visual
  language — a GM should be able to glance at a conflict and read its
  temperature in under a second.
- **What people say it's about** / **What's actually driving it** — two
  plain one-line text fields (the spec's stated/root cause, renamed).
  Kept in the hero path because it's cheap (two text boxes, no
  bookkeeping) and is the single highest-leverage idea in the whole
  spec for making a conflict feel alive at the table.
- **Someone innocent gets hurt regardless** — one line, not a structured
  object. Same reasoning: high narrative value, zero mechanical cost.
- **Session hooks** — a short list with a "used" checkbox each. This is
  the payoff field — "what can I actually run tonight" — so it stays
  visible, not tucked away.
- The two (or more) factions involved, linked via the existing
  relationship system — clicking either name opens its own Entity Editor,
  same as everywhere else in this app.

### One-click quick-start (not a wizard)

A single "🎲 Quick-start" button — not a multi-step review form — rolls
new oracle tables (root cause category, cause-gap flavor, a third-party
casualty idea, a starter session hook) and drops the results straight
into the hero-path fields above, already editable in place. The GM either
keeps rolling, edits the text, or ignores it and types their own — no
separate draft-review screen, matching how a single generated Mission
(Phase C) already works, not the heavier Faction Turn propose/commit flow
(that pattern fits *resolving dice*, which this isn't).

### "Add depth" (collapsed by default, opened only if a conflict earns it)

Everything else from the original spec survives, unchanged in substance,
demoted to an explicitly-opened section: deep-root history, the
precipitating incident, the last de-escalation attempt, irreversible
facts (append-only — kept exactly as originally planned, matching this
app's existing "flag/append, don't delete" ethos), per-faction posture
(cohesion, dependency, doctrine red lines, public/private goals —
cohesion/dependency reuse this app's existing 0-10 relationship-strength
dial styling instead of inventing a new 0-5 scale a GM has to relearn),
information asymmetry (with a "reveal" action), party leverage, and GM
notes. A GM running a light conflict never opens this section at all; a
GM who wants SWN-level depth for one specific conflict gets it without
it being mandatory overhead on every other one.

### What stayed cut from the original integration plan

- `power_symmetry` and `escalation_appetite` as separate enumerated
  fields are dropped entirely rather than demoted — they're the two
  fields research most directly flags as "spreadsheet-feeling" rather
  than GM-useful, and nothing else in this design depends on them. A GM
  who wants to express "faction A is clearly dominant" can just say so in
  a plain field or the GM Notes; it doesn't need its own enum.
- The escalation ladder's rung *labels* stay a static default template
  (Cold/Simmering/Skirmish/Active/Escalated/Open War), editable per
  conflict, not re-rolled — same as the previous plan.
- No calendar/date tracking (unchanged from the previous plan — this app
  has none). The clock concept in the original spec (a date-based trigger
  distinct from the escalation ladder) is folded INTO the escalation
  clock itself for this pass, rather than built as a second parallel
  clock — one visible clock per conflict, not two, per the "the fewer
  things a GM has to track, the better it lands" conclusion above. A GM
  who wants a literal calendar trigger can note it in the plain-text
  "what's actually driving it" or GM Notes fields.

## Build scope for this pass

1. `ENTITY_TYPES` gains `'conflict'`; `TYPE_LABEL.conflict = 'Conflict'`;
   `ensureConflictFields(e)` (entities.js).
2. Escalation clock via the existing Threads engine
   (`ensureConflictEscalationTrack`/`getConflictEscalationTrack`,
   mirroring the faction goal track helpers exactly).
3. New `src/domain/factionConflicts.js`: hero-path field setters, the
   "Add depth" fields' setters (irreversible facts append, session hooks
   with used-toggle, information-asymmetry reveal), and
   `generateConflictSeed(campaign, { rng })` — the one-click quick-start,
   pure/RNG-injectable like every other generator in this app.
4. New oracle tables (`data/tables.js`'s `'Faction Conflict'` group):
   Root Cause Category, Cause-Gap Flavor, Third-Party Casualty, Starter
   Session Hook — original GMAtlas content, cited honestly.
5. UI: a `conflictSection(doc, e, ui)` in `drawers/index.js` (mirrors
   `factionSection`'s pattern exactly — hero fields always shown, "Add
   depth" behind a collapse toggle matching this app's existing
   collapsible-section convention), a Conflicts list in the Faction
   Events drawer (mirrors the Roster/Missions sections), and
   `TYPE_COLOR.conflict` in `graph.js` (one line).
6. Domain tests for every new pure function.

## Explicitly postponed (from both this revision and the earlier plan)

- Co-Pilot signal for a hot conflict — straightforward to add later
  (mirrors `hotFaction`), postponed only to keep this pass's scope to the
  validated hero-path + depth design, not because of any concern.
- Universal Search / Cast filter verification for `#conflict` entities —
  should work for free per existing generic entity infra; verify in a
  follow-up smoke pass rather than blocking this build on it.
