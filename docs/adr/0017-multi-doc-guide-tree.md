# ADR 0017 — Multi-document Guide tree with drag-and-drop reparenting

## Status

Implemented (2026-07-06), on direct user request: the Guide tab grows from
one freeform field into multiple named, nested documents, organized in a
tree shown below the main editor and reorganizable via drag-and-drop
(mouse and touch); the editor itself also gained a resize handle and
(already-present, now more discoverable) scrollbar.

## Context

`campaign.guide` was `{ text: '' }` — one field, `domain/guide.js`'s
`getGuideText`/`setGuideText`, rendered as a single `contenteditable`
"mention editor" div. The user wanted this to become a real document tree
(create/rename/delete/reparent), with two scope decisions confirmed
directly rather than assumed: deleting a doc with sub-documents confirms
first (naming the doc and how many descendants), then cascades — common
file/folder-tree behavior; and drag-and-drop reparenting needed to work on
touch, not just mouse, extending this app's existing touch-drag equivalent
(built for entity/document mention-linking) rather than shipping
mouse-only.

## Decision

**Schema**: `campaign.guide` becomes `{ docs: [{id, title, text, parentId,
order}], activeId }`. Reused patterns: the entity list's drag handle
markup (`⠿`, `draggable`, `data-drag-*`/`data-drop-*`); the Documents
drawer's inline-rename toggle (✎/💾); the existing mouse+touch dual
drag-drop implementation (`ENTITY_DRAG_TYPE`/`DOCUMENT_DRAG_TYPE`
dataTransfer types plus `touchDrag`'s ghost-follows-finger mechanism) —
extended with a third `GUIDE_NODE_DRAG_TYPE` in parallel, not folded into
the existing entity/document drop-target resolution (`completeDrop`),
since that function's job is text-mention insertion, a different shape
than tree reparenting.

**A real migration-ordering bug found and fixed before it ever shipped**:
the natural design — lazy migration via an `ensureGuide()` mirroring
`ensureOracles`/`ensureFactionFields`, only invoked inside write mutators,
with pure reads (`buildGuideTree`/`getActiveGuideDoc`) tolerating the
not-yet-migrated shape via their own read-only fallback — has a real gap
none of this repo's prior seed-then-lazy-init fields ever exposed: those
fields are keyed by fixed paths/names, never generated ids, so a mismatch
between "what a pure read assumes" and "what a real write actually
produces" was never possible before. A Guide doc IS identified by a
generated id, so a naive fallback (a fresh random id on every un-migrated
read) would let the UI render click targets that silently stopped
resolving the moment any other code path's write triggered the real
migration with a *different* random id. Fixed with a fixed, deterministic
bootstrap id (`'gd_root'`, not `newId()`'s timestamp+random) used
identically by both the pure-read fallback and the real migration path, so
they always agree — caught by writing the domain tests before wiring up
the UI, not by a later integration failure.

Also newly exposed by this ADR (not a regression from it):
`schema.js`'s `withDefaults` deep-merges an old `{ text }` campaign against
the new default `{ docs: [], activeId: null }` shape, leaving `docs` as an
already-empty ARRAY (not "missing") on every load — `ensureGuide`'s
migration trigger had to check `!docs.length`, not "is `docs` missing or
not an array," or the old text would have been silently invisible forever
once merged (still present in memory, but never read since the emptiness
check would never fire). Verified directly: a real legacy `{ text: '...'
}` campaign seeded into a fresh browser profile shows its old content
immediately, and the first real edit persists it as the one migrated root
doc with the old text intact.

**Domain functions** (`domain/guide.js`): `buildGuideTree`,
`getActiveGuideDoc`/`setActiveGuideId`, `createGuideDoc`, `renameGuideDoc`,
`setGuideDocText`, `removeGuideDoc` (cascades — the UI confirms first via
`countGuideDescendants`), `moveGuideDoc` (reparents, appended after the new
parent's existing children; no-ops on a cycle attempt or a
non-existent/self target). Deliberately does NOT support drag-to-reorder
among siblings, only drag-to-reparent — a smaller, well-scoped first
version.

**UI**: the active doc's title + editor render above the tree (`guide(doc,
ui)`); the tree itself (`guideTreeRow`, recursive) gets an expand/collapse
caret, a `⠿` drag handle, click-to-select, inline rename, add-child, and
delete, plus a "📄 Top level" drop zone to un-parent a dragged node back to
root. `.guide-editor` gains `resize: vertical` (its `overflow-y: auto` was
already there, just not obviously so without a resize handle to reveal it)
— scoped to this class alone, not every `.mention-editor`, since WHO/
WHERE/etc. context fields shouldn't gain a resize handle.

**Drag-and-drop**: `GUIDE_NODE_DRAG_TYPE` checked first (a separate branch,
not merged into the entity/document logic) in `onDragStart`/`onDragOver`/
`onDrop`, dispatching to a new `completeGuideNodeDrop`. Touch: `touchDrag`
gained an optional `guideNodeId` alongside its existing `entityId`/
`documentId`, recognized in `onTouchStart`, using the same ghost-element
mechanism, resolved via `completeGuideNodeDrop` on `onTouchEnd` — verified
directly via simulated CDP touch events (touchStart/Move/End), not just
the mouse path, since touch support was explicitly in scope this time.

## Alternatives considered

- **A random id for the migration-bootstrap root doc**, matching every
  other `newId()` call. Rejected once the read/write id-mismatch bug (see
  above) was found — the fixed `'gd_root'` id is the actual fix, not a
  stylistic choice.
- **Migrating eagerly** (e.g. inside `core/migrate.js`'s `migrateDocument`,
  which already runs on every load) instead of lazily inside `domain/
  guide.js`'s write mutators. Rejected — `core/*.js` has no existing
  precedent of importing from `domain/*.js`, and introducing one here
  would reverse this repo's established layering (core is foundational,
  domain builds on it) for a problem the fixed-id fix already solves
  without that dependency.
- **Cascading delete without confirmation**, or the reverse (promoting
  children up instead of deleting them). Asked directly rather than
  assumed; confirm-then-cascade was the user's explicit choice.

## Consequences

- Existing single-Guide-field content is never lost — verified with a real
  legacy campaign, not just unit tests.
- A GM can now organize reference material (e.g. "5PFH Campaign Turn
  Sequence," a Colony rules page, faction lore) as separate, nested,
  linkable documents instead of one long scroll, matching how the
  Documents drawer already organizes uploaded material.
- Sibling reordering (as opposed to reparenting) is a reasonable, small
  follow-on if it turns out to matter — deliberately not built here.

## Related packs / ADRs

The entity-linking touch-drag system (`ui/shell.js`'s `onTouchStart`/
`onTouchMove`/`onTouchEnd`) this extends rather than duplicates; `domain/
oracles.js`'s `ensureOracles`/`entities.js`'s `ensureFactionFields` (the
seed-then-lazy-init idiom this mostly follows, with the one id-determinism
wrinkle this ADR's Decision section names as new).
