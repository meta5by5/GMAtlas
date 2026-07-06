# ADR 0016 — Oracle tags + entity-field "jump to relevant Oracle" links

## Status

Implemented (2026-07-06), on direct user request: an icon next to an
entity field (starting with Faction's Fear/Need/Secret) that opens the
Oracle drawer pre-filtered to whichever table(s) would help write that
field, generalized to every other entity field with a real supporting
oracle. The request explicitly left the mechanism to this repo's
judgment ("if this is best solved through tags, add tag architecture to
the oracles") and specified three hard constraints: tags stay hidden
until a dedicated tag icon is clicked per table, any tag a field link
depends on can't be removed through that tag editor, and every new icon
cluster (both the per-table one and the per-field one) must be
right-aligned.

## Context

Research confirmed only Faction has real bespoke prose fields today
(`hq`/`leadership`/`scenarioSeed`/`agenda`/`fear`/`need`/`secret`,
`entities.js`'s `ensureFactionFields`) — NPC/Location/Asset/Lore/Item have
only the shared Overview/Revealed pair (`ui/drawers/index.js`'s
`inspector()`). That bounded the rollout to 13 concrete link points, not an
open-ended field audit. It also found the exact existing patterns this
should reuse: the Phase 8 oracle table editor's ✎ icon and per-table row
(`oracleGroupRow`/`oracleTableEditor`), the entity/document tag-editor
chip+input+datalist shape (`tagEditor()` alongside `entities.js`'s
`listTagVocabulary`), the seed-then-campaign-override pattern
`campaign.oracles.overrides` already uses for edited table content
(`oracles.js`'s `ensureOracles`/`currentTableEntries`), and Universal
Search's existing "jump to the Oracle drawer with a filter pre-applied"
navigation.

## Decision

**Tags live on oracle tables via the exact same seed-then-override pattern
`overrides` already uses**, not a separate parallel system:
`campaign.oracles.tags[path]` (`path` = `"Group>Table"`, the same key
convention `overrides` uses) stores a full tag list once a GM has touched
a table; an untouched table reads from a new curated
`data/oracleTagSeeds.js` (`ORACLE_TAG_SEEDS`) instead.

**A small, reusable tag vocabulary** — `character`, `secret`, `setting`,
`leadership`, `hook`, `agenda`, `fear`, `faction`, `trade`, `discovery` —
rather than one bespoke tag per field, each seeded onto 2-3 real,
already-shipped tables (e.g. `secret` → `Crew & NPCs>NPC Secret`,
`Mysteries & Coverups>Clue Type`, `Corporate Powers>Hidden Agenda`; no
invented content, every seed path verified against `data/tables.js` and
covered by a data-integrity test). `data/entityFieldOracleLinks.js` maps
`"entityType.field"` → one or more of those tags for the 13 link points.

**Locking**: `isOracleTagLocked(tag)` (`domain/oracles.js`) is true iff the
tag appears in any `entityFieldOracleLinks.js` value array.
`removeOracleTag()` — mirroring `removeOracleEntry`'s clone-and-mutate
shape — no-ops for a locked tag; the Oracle drawer's tag editor shows a 🔒
instead of a ✕ for those chips, visible-not-hidden (same "flag, don't
silently remove" posture `isRelationshipFlagged` already established
elsewhere) so a GM understands why it's stuck rather than wondering where
the remove button went.

**Oracle drawer UI**: each leaf table row's icon cluster is now
`.oracle-row-actions` (right-aligned, `margin-left: auto`, the two flex
children of `.oracle-row` being the label and this cluster) holding, in
order, 🏷 tag-toggle → ✎ edit-toggle → 🎲 roll. Clicking 🏷 toggles a new
ephemeral `oracleTagEditorOpen` Set (mirrors `oracleEditorOpen`), revealing
a tag editor directly under the row — same chips+input+datalist shape as
`tagEditor()`, sourced from a new `listOracleTagVocabulary(campaign,
tables)` (every tag currently in use anywhere, seed ∪ override).

**Field icon + jump**: a new `oracleLinkIcon(entityType, field)` helper
(`ui/drawers/index.js`) renders a right-aligned 🔮 button
(`data-oracle-field-link="entityType.field"`), only when
`entityFieldOracleLinks.js` has an entry for that key — wrapped into a new
`.field-label-row` (label text + icon on one line via `margin-left: auto`)
for exactly the 13 linked fields; every other field is untouched. Clicking
it looks up the field's tags, sets a new ephemeral `oracleTagFilter` array
(alongside the existing text `oracleFilter`) and clears the text filter,
then `openDrawerTab('oracle')` — the same jump Universal Search already
does, just tag-driven instead of text-driven, with an explicit `render()`
call (this was the one real bug caught during verification: `openDrawerTab`
itself never re-renders — every other call site either follows it with a
`store.update()`, whose `notify()` triggers the render as a side effect, or
an explicit `render()`/`else render()` fallback; this is a brand-new
navigation path with no campaign mutation to piggyback on, so it needed
its own explicit call). A new `filterOracleTreeByTags(tree, campaign,
tags)` (`domain/oracles.js`) prunes the tree by tag membership — same
recursive shape as the existing text-based `filterOracleTree` — shown with
a "Filtered by: fear ✕" badge above the tree to clear it back to normal
browsing. Typing in the text search box clears `oracleTagFilter` (the two
modes are mutually exclusive — simplest coherent UX).

## Alternatives considered

- **A rigid 1-field-to-1-table link** (no tags at all). Rejected per the
  request's own framing — several fields (e.g. "Secret") genuinely need
  more than one table to be useful, and a tag layer lets that grow without
  a field's data ever needing to change.
- **One bespoke tag per field** instead of a small reusable vocabulary.
  Rejected — defeats the point of a tag system; a shared vocabulary (e.g.
  `secret`) means a GM's own future field or a later content addition can
  reuse an existing tag instead of inventing a new one per field.
- **Storing tags as a diff/patch on the seed** rather than a full
  replacement once touched. Rejected for consistency — `overrides` already
  established "full replacement once touched" for table content; a second,
  differently-shaped mechanism for tags would be a needless inconsistency.

## Consequences

- 13 fields across all 6 entity types now have a working 🔮 jump,
  verified end to end in a real browser: Faction's Fear (tag `fear`,
  jumping to `Fear Trigger`/`NPC Secret`, excluding unrelated tables) and
  NPC's Overview (tag `character`, jumping to `First Look`) both confirmed,
  plus the tag editor's locked-chip (🔒, no remove) and unlocked
  add/remove flow, and the icon's pixel-exact right alignment.
- Extending this to a 14th field, or a new entity field the app grows
  later, is a one-line addition to `entityFieldOracleLinks.js` (and, if a
  new tag is needed, one line in `oracleTagSeeds.js`) — no UI code changes
  required.
- A GM's own custom tags (added via the Oracle drawer's tag editor) are
  fully theirs to remove — only the ones a shipped field link depends on
  are locked.

## Related packs / ADRs

Phase 8's oracle table editor (the ✎ icon/row this extends); Phase 7's
"flag, don't delete" relationship pattern (the locked-tag 🔒 posture this
reuses); ADR 0002/`rulesConstitution.js`'s Activity → Rules Lens lookup
table (the same "small mapping table, not code" shape
`entityFieldOracleLinks.js` follows).
