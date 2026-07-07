# ADR 0019 — WHERE tab tag-listbox redesign, and Latest Scene field splitting

## Status

Implemented (2026-07-06), on direct user request (`docs/adr/next-request.md`'s
"USER CHANGES" batch). Two changes bundled into one ADR because both are the
same shape of change — a context/scene data field that already existed in
`schema.js`/`scenes.js` but was either dead or under-exposed in the UI,
finally put to real use.

## Context

**WHERE tab**: `ui/workspace/index.js`'s `where(doc)` rendered a "Change
Location" chip (a blind `window.prompt` overwriting `context.where.summary`)
and `entityList(doc, ['location'])` — literally every Location entity in
the campaign, unfiltered, the exact same function WHO's view uses for every
NPC/Faction. `schema.js` already declared `where: { summary, entityIds: []
}`, but `entityIds` was dead in the UI — the only reader was
`recap.js`'s "relevant entities" union, the only writer a test. The user
asked for the "many links" list to become tag-filtered instead, using a
listbox (not chip buttons) for the tags.

**Latest Scene**: `domain/scenes.js`'s `generateScene()` already rolled
`sensory`, `clue`, `complication`, and a `sceneDriver` from named Oracle
tables, but only `spine` (action/theme/descriptor/focus) and `consequence`
survived as real object fields — the rest were baked into one `text` blob
rendered as a single `<pre>` by `ui/workspace/index.js`'s `lastScene()`.
The user asked for each section to become its own field, linked to its
relevant Oracle category, while the combined `text` view keeps showing
everything together and updates when a field is edited.

## Decision

**WHERE**: `where(doc, ui)` now renders `whereLocationPicker(doc, ui)`
instead of `entityList(doc, ['location'])`. A native `<select
size="N">` listbox (the user's explicit choice over chip buttons) lists
every Location tag (`domain/entities.js`'s existing `listTagVocabulary`);
picking one (a plain `change` event, no new listener — rule 4) filters a
candidate panel of matching Locations; clicking a candidate calls a new
`addContextEntity(campaign, 'where', entityId)` (`domain/session.js`,
mirroring `entities.js`'s `addEntityTag` append-dedupe shape). Below both,
the curated "present here" list reads `context.where.entityIds` — finally
a real reader/writer pair for a schema field that existed since Phase 3A
and was never wired up. `removeContextEntity` undoes it. Both mutators are
written generically (keyed by `key`, not hardcoded to `where`) so WHO/WHY
could reuse the identical mechanism later — not wired into WHO's view
today, since only WHERE was asked for; WHO's `entityList()` is untouched.

A small incidental fix surfaced while wiring WHERE's own "+ New Location"
button: `entityList()`'s "+ Type" buttons (`data-entity-add`, used by
WHO/WHY too) had never had a click handler at all — dead buttons. Fixed
alongside WHERE's own version, which needed the identical create-a-blank-
entity behavior anyway.

**Latest Scene**: `generateScene()`'s returned object gains `sensory`,
`driver` (renamed from the internal `sceneDriver` variable), `clue`, and
`complication` as real top-level fields, alongside the already-exposed
`spine`/`consequence`. The line-building logic that used to live inline in
`generateScene()` moved into a new pure `recomposeSceneText(scene)`,
called both by `generateScene()` (for a freshly-rolled scene) and by a new
`updateSceneField(campaign, sceneId, field, value)` (`session.js`) after
an edit — so the combined `text` is always a live, correct **derivation**
of the current field values, never a second independently-editable copy
(matches the user's own framing: "keep using the full combined statement
... update the related text when the separate field is revised").
`ui/workspace/index.js`'s `lastScene()` renders `sensory`/`driver`/`clue`/
`complication` as short plain `<input>`s (matching how Faction's HQ/
Leadership stay plain inputs rather than full mention-editors — these are
single short phrases, not "large textboxes") each with a 🔮 oracle-jump
icon. Reusing that icon needed no new plumbing: `oracleLinkTagsFor()`
(`data/entityFieldOracleLinks.js`) is a plain `"kind.field"` string-keyed
lookup with no validation against real entity types, so four `'scene.*'`
entries were added directly to the existing map, and the identical
`data-oracle-field-link` click handler in `shell.js` already handles them.

## Alternatives considered

- **Chip buttons for the WHERE Location tags** (matching the Cast drawer's
  existing tag-filter pattern exactly). Rejected — the user explicitly
  asked for a listbox instead.
- **A separate `data/sceneFieldOracleLinks.js` map + a thin `oracleLinkIcon`
  variant**, the first-draft plan for the Scene fields' 🔮 icons. Rejected
  once `oracleLinkTagsFor()`'s lookup turned out to already be a generic
  string-keyed map with no entity-type validation — adding `'scene.*'`
  keys directly to the existing `ENTITY_FIELD_ORACLE_LINKS` needed zero new
  plumbing, versus a whole parallel module and click-handler branch for a
  four-entry map.
- **A two-way binding between Scene fields and the combined `text`** (edit
  either one, keep both in sync). Rejected — the user's own phrasing
  ("keep using the full combined statement... update the related text")
  reads as one-directional (fields → text), and a two-way sync would need
  parsing the free-form `text` blob back into fields on every edit, a much
  larger and more fragile undertaking for no asked-for benefit.

## Consequences

- A GM can now curate which Locations are actually present in the current
  scene instead of scrolling every Location the campaign has ever had.
- `context.where.entityIds` (and the new `addContextEntity`/
  `removeContextEntity` mutators) are real, tested, reusable machinery —
  WHO/WHY adopting the same pattern later is a small, well-scoped
  follow-on, not a new design.
- A Latest Scene's individual beats (the opening detail, the driver, the
  clue, the complication) can be hand-edited without losing the oracle
  roll's overall shape, and each can jump straight to more inspiration via
  its own 🔮 icon.

## Related packs / ADRs

`docs/adr/0016-oracle-tags-and-field-links.md` (the 🔮 field-link mechanism
this reuses); `docs/adr/0009-situation-engine-revisited.md` (Suggestion
Lenses, the other place `generateScene()`'s Driver roll is already
parameterized — untouched by this ADR).
