# ADR 0030 — Starforged/StarSmith-inspired oracle content + source labels

## Status

Accepted.

## Context

A follow-up batch asked to "Add Oracles specific to Starforged and
StarSmith with appropriate tags and list them as their 'oracle name
(source)' along with the other oracles," with a fallback to a separate
navigation tree "if it would be less confusing." Real source PDFs already
sit in `assets/docs/` (`Starforged-reference-guide.pdf`,
`Ironsworn-Starforged-rulebook.pdf`, `Starsmith-Assets-Mar-5-23.pdf`,
`Starsmith-Expanded-Oracles-May-15-23.pdf`).

**Copyright stance, carried over unchanged from ADR 0010/0011**: Starforged
(Ironsworn) and StarSmith are commercial/community works. Having the actual
PDFs in this repo's reference library is a different question from what
gets built as shipped, distributed app DATA. The content below is an
original re-implementation of well-known, publicly-discussed oracle
CONCEPTS from the Ironsworn/Starforged oracle family ("plot twist" and
"combat gambit/maneuver" prompts are both broadly known genre conventions,
not exclusive to one book) — it does not transcribe Starforged's or
StarSmith's actual table entries, wording, or exact oracle names.

A separate `AskUserQuestion` resolved the navigation-structure fork ahead
of implementation: keep the same merged Oracle tree (matching the existing
Stars Without Number precedent, ADR 0010/0011) rather than a second
per-system tree, since a GM already has one tree with tags/search and a
second parallel navigation mode would add a mode switch for one small
content group.

## Decision

1. New `SCENE_TABLES['Starforged Oracles']` (`data/tables.js`) with two
   sub-tables, matching the Stars Without Number group's own scale
   (~15 original short-phrase entries each): **Plot Twist** (mid-scene
   complication prompts) and **Combat Gambit** (a tactical-option prompt
   list). Both are original phrasing.
2. `ORACLE_GROUPS` (`data/oracleGroups.js`) gains `'Starforged Oracles'` as
   a child of the existing "📚 Story Beats" category — no new top-level
   category, so it sits alongside `Plot Engine`/`Adventure Seed` rather
   than needing its own bucket.
3. New `ORACLE_TABLE_SOURCES` lookup (`data/oracleGroups.js`), a plain
   `{ groupKey: 'source label' }` map keyed by the same string already used
   as a top-level `SCENE_TABLES` key (and therefore as that group node's
   `label`/`path[0]` in `buildGroupedOracleTree`) — `'Stars Without Number':
   'SWN'`, `'Starforged Oracles': 'Starforged/StarSmith-inspired'`.
4. `oracleGroupRow` (`ui/drawers/index.js`) renders
   `${label}${source ? ` (${source})` : ''}` for a top-level group node
   only (`node.kind === 'group' && node.path.length === 1`) — a pure
   display-time lookup. `node.label`/`node.path` themselves are untouched,
   so `rollGroup` dispatch (`data-roll-group`) and `filterOracleTree`'s
   substring search still key off the plain table/group name with no
   knowledge the suffix exists.

## Alternatives Considered

- **A second, per-system navigation tree/tab.** Rejected per the resolved
  `AskUserQuestion` — one small content group doesn't justify a parallel
  browsing mode; the existing tree + search already scales to this.
- **Bake the source into `label` itself** (e.g. store the key as
  `'Starforged Oracles (Starforged/StarSmith-inspired)'`). Rejected —
  `label`/`path` double as functional identifiers for roll dispatch and
  search; changing them risks breaking `rollGroup`/`filterOracleTree`
  call sites and would make the suffix show up inside search-match
  highlighting instead of being purely cosmetic.
- **Transcribe Starforged's/StarSmith's actual oracle tables.** Rejected —
  the same line ADR 0010/0011 already drew.

## Consequences

**Positive:** a GM using Starforged/StarSmith gets two more genre-fit
oracle prompts without a new UI surface; the `(source)` convention is
reusable for any future sourced content group with a one-line lookup
entry, no render-path changes needed.

**Negative / risk:** same as ADR 0010/0011 — if a close reading of the
Starforged/StarSmith PDFs (already in this repo's library) happens later,
this content should be checked for accidental over-similarity in phrasing,
not assumed safe by virtue of being "original" in intent.

## Related Packs / Documents

`docs/adr/0010-traveller-swn-content.md`, `docs/adr/0011-swn-cwn-content.md`
(the honesty posture this follows), `data/tables.js` (Starforged Oracles
content), `data/oracleGroups.js` (`ORACLE_GROUPS`/`ORACLE_TABLE_SOURCES`),
`ui/drawers/index.js`'s `oracleGroupRow`.
