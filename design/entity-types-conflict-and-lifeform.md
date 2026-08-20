# Entity types: Conflict, and adding Lifeform

## Part 1 — Conflict (existing, documented here on request)

### Status

Accepted and implemented. Part of `entities.js`'s `ENTITY_TYPES`
(`['npc', 'location', 'faction', 'asset', 'lore', 'item', 'conflict', 'lifeform']`)
since the Living Faction Engine / Faction Conflicts work (referenced in
code as ADR 0036). This section documents what already exists — no
behavior changes here.

### Why Conflict is a first-class entity type, not a field on something else

A Faction Conflict — two or more factions (or a faction and the world)
locked in an escalating dispute over something real — used to have nowhere
natural to live: not a property of any one Faction (a conflict can involve
several), not a Thread (a Thread tracks *progress toward a goal*, a
Conflict tracks *relationship state between parties*), not a Location (the
conflict is often ABOUT a location, but isn't reducible to one).

Making it a peer entity type buys it, for free, everything every other
entity type already gets: @mentions in the Journal/Composer, a node in the
Relationship Graph, Universal Search, a row in Cast, and the generic
relationship system for "who's involved" — rather than a bespoke
id-array/lookup table built just for this one concept.

### Data model (`entities.js`'s `ensureConflictFields`)

Every field is lazily set on first touch — nothing is required to create
a Conflict entity, same posture every other entity type has.

**Always visible:**

| Field | Shape | Purpose |
|---|---|---|
| `status` | `'cold' \| 'simmering' \| 'active' \| 'escalated' \| 'open_war' \| 'resolved'` | Where the conflict sits on its own ladder — a plain `<select>`, GM-set, never auto-advanced (Article II). |
| `statedCause` | string | The public story — what people SAY it's about. |
| `rootCause` | string | What's actually driving it — the gap between this and `statedCause` is the hook. |
| `causeGapHook` | string | Why that gap matters — what happens if the party notices it. |
| `thirdPartyCasualty` | string | Who gets hurt regardless of who "wins" — keeps a conflict from reading as a clean binary. |
| `locationId` | entity id | The contested zone. Set from WHO's own tab (`activeConflictLocationPicker`, `workspace/index.js`), not from the Conflict card itself — scoping "which factions are eligible to be involved" is treated as a WHO-tab concern. Conflict's own card just *reads* it, to narrow the "Involved" faction picker to factions `factionsPresentAt` that location (Living Faction Engine). |
| `sessionHooks` | `[{id, text, used}]` | A running list of concrete scene hooks a GM jots down and checks off as they get used at the table. |

**Involved factions** are not a bespoke array — they're the existing
relationship system, using a dedicated `involves` type (`RELATIONSHIP_TYPES`
in `entities.js`). "Link a faction to this conflict" is a real
`addRelationship(conflict, faction, ..., 'involves')` call, so a Conflict's
"who's involved" is queryable the exact same way any other relationship is
(the Relationship Graph, an entity's own Relationships block, etc.) — no
second source of truth for the same fact.

**Escalation clock**: a Conflict's escalation state is a Thread
(`kind: 'faction-goal'`-style progress clock, `getConflictEscalationTrack`/
`ensureConflictEscalationTrack`, `factionTurnEngine.js`) — reusing the
generic Thread/clock mechanism the rest of the app already has, rather
than a bespoke pip-tracker. `suggestedConflictEscalations`
(`factionTurnEngine.js`) proposes advancing a conflict's clock when a
committed Faction Turn event actually involves two factions linked to the
same conflict (an Attack between two `involves`-linked factions, or an
Expand Influence into a co-located RIVAL) — a suggestion the GM still
confirms, never automatic.

**"Add depth"** — a second tier of narrative fields, collapsed behind an
explicit toggle (`ui.expandedConflictDepth`) so a lightweight conflict
doesn't force a GM through eight more fields they don't need yet:

| Field | Shape | Purpose |
|---|---|---|
| `deepRootSummary` | rich text | What started this, long before the party got involved. |
| `precipitatingIncident` | rich text | The recent, smaller thing that actually lit the fuse. |
| `lastDeescalationAttempt` | rich text | Who tried to fix this, why it failed, who got blamed. |
| `irreversibleFacts` | `[{id, summary, consequence}]`, append-only | Things that happened and can't be undone — a running ledger, never edited or removed once added, so a conflict's history stays honest turn over turn. |
| `factionPostures` | `[{factionId, cohesion, notes}]` | Per-involved-faction internal state — a 0-10 cohesion dial plus free-text notes (dependency, doctrine, public-vs-private goal) — stored on the CONFLICT, not the shared Faction entity, so two different conflicts can disagree about the same faction's internal cohesion. |
| `informationAsymmetry` | `{holderFactionId, whatTheyKnow, impactIfRevealed, revealed}` or `null` | One faction knows something the other(s) don't — tracked as a single slot (add/reveal/clear), not a list, since a conflict typically has one live secret worth tracking at a time. |
| `partyLeverage` | string | Information, an asset, or an NPC neither faction controls — the party's own point of influence over the outcome. |
| `gmNotes` | rich text | Anything else worth remembering. |

### Generation helper

`generateConflictSeed` (`factionTurnEngine.js`) rolls from the "Faction
Conflict" oracle table group and returns plain strings only — it never
touches the campaign itself. The Conflict card's own "🎲 Quick-start"
button is what actually commits a roll into the entity's fields, keeping
the same "oracle rolls flavor, the GM commits the real record" split every
other oracle-backed generator in this app already uses.

### What Conflict is NOT

- Not a Thread. A Thread tracks progress toward completion (a clock that
  fills up and is "done"); a Conflict tracks an ongoing relationship state
  that can oscillate (de-escalate, flare back up, resolve, reopen). The
  escalation CLOCK is a Thread; the Conflict itself is a richer container
  around it.
- Not owned by any one Faction. `factionPostures` deliberately lives on
  the Conflict, not on the Faction entity, precisely so the same Faction
  can hold a different posture in two unrelated conflicts at once.
- Not auto-advanced. Every mutator here (status, clock, postures,
  asymmetry reveal) is a GM-triggered write. `suggestedConflictEscalations`
  only ever proposes; the GM still clicks.

---

## Part 2 — Adding Lifeform (this change)

### Status

Accepted and implemented (direct follow-up request: "add a lifeform
[entity] type to the list" — the same `ENTITY_TYPES` list Conflict
belongs to).

### Context

Colony's "Lifeform Encounters" section (5PFH Planetfall's Colony Turn
Sheet) has existed for a while as a live filter over entities tagged
`#lifeform` (`colony.js`'s `listLifeformEncounters`) — almost always an
NPC entity carrying that tag, so it could get a Bestiary statblock the
same way any other creature/monster NPC does. That worked, but it meant a
lifeform/beast/creature read as a "Non-Player Character" everywhere else
in the app (Cast's type filter, the Relationship Graph's legend, Universal
Search results) — an odd label for something that usually isn't a
character in the narrative sense at all.

### Decision

`lifeform` joins `ENTITY_TYPES` as an eighth peer type, structurally
**identical to `npc`** rather than getting Conflict's kind of bespoke
field set — there's nothing lifeform-specific to model beyond "a creature
that needs a name, tags, and a statblock":

- `entities.js`: added to `ENTITY_TYPES`/`TYPE_LABEL` (`'Lifeform'`).
  Every generic, data-driven UI surface that already maps over
  `ENTITY_TYPES` (Cast's type filter chips and "Generate…" dropdown, the
  Entity Editor's own type `<select>`, the Relationship Graph's legend)
  picked it up automatically — no separate wiring needed at any of those
  call sites.
- `graph.js`: a `TYPE_COLOR` entry (`#2dd4bf`, teal — distinct from every
  other type's hue) so it renders as its own color in the graph rather
  than falling back to the generic gray `nodeColor` uses for an
  unrecognized type.
- `statblocks.js`'s `ensureAutoStatblock` and `drawers/index.js`'s
  `statblockAddChoices`: a `lifeform` entity gets exactly the same
  Character Sheet / Bestiary statblock options an `npc` entity does
  (including the same auto-attached Bestiary group on creation) — a
  creature is what a Bestiary template is FOR. It does **not** get
  NPC-only narrative features that don't fit a beast the same way
  (`npcSection`'s "Current goal" field, `enhancementsSection`'s
  cybernetics/Enhancements panel) — those stay gated to `npc` specifically,
  a deliberate, narrower scope than "identical to npc in every way."
- `colony.js`'s `listLifeformEncounters`: now matches an entity typed
  `'lifeform'` directly, OR the original `#lifeform` tag convention —
  both, not one replacing the other, so a campaign that already has
  #lifeform-tagged NPCs keeps seeing them in Colony's Lifeform Encounters
  list unchanged (migration rule 5's spirit, applied even though no schema
  migration is actually needed here — nothing about the OLD tag-based
  campaigns needs to change on disk, the read path just recognizes a
  second, equally-valid way of marking one).

### Consequences

- A GM can now create a "real" Lifeform from Cast's Generate… menu (or
  retype an existing entity to it via the Entity Editor's type dropdown)
  and get a Bestiary statblock immediately, without also needing to
  remember to add the `#lifeform` tag by hand.
- Existing campaigns are completely unaffected — every already-tagged
  NPC keeps showing up in Colony's Lifeform Encounters exactly as before;
  nothing is migrated, retyped, or retagged automatically.
- Not extended: Party Roster membership (`listPartyMembers` is still
  `type === 'npc'` + `#character` tag only — a Lifeform doesn't play as a
  party character), and the NPC-only narrative fields named above. If a
  real need for either surfaces later, it's a small, separate follow-up,
  not something this change tries to anticipate.
