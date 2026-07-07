# ADR 0021 — Gallery: per-entity thumbnails + a tagged image collection

## Status

Implemented (2026-07-07), the first item built from `DESIGN-NEW-
FUNCTIONALITY.md`'s Phase 11 backlog (`docs/adr/next-request.md`'s "Add
to roadmap" batch). Per direct clarification: a new top-level drawer tab
(not folded into Cast or Documents), thumbnails resize to a 256px max
dimension.

## Context

The request asked for three things at once: (1) any entity can carry a
thumbnail image, shown left-aligned beside its Type/Tags; (2) a browsable
Gallery reusing "the same tag management method used for Oracles"; (3) an
oversized upload gets auto-resized, with both the original and the
resized thumbnail kept, both auto-tagged with the entity's type, that tag
locked from removal.

Research (before planning) settled the two real design questions this
raised:
- **Which tag system to copy.** Not Oracle's (`domain/oracles.js`'s
  `getOracleTags`/`isOracleTagLocked`) — confirmed hardcoded to
  oracle-table paths and to `ENTITY_FIELD_ORACLE_LINKS` for its lock
  check, not a generic mechanism a different content type could plug
  into. `entities.js`'s plain `tags` array + `listTagVocabulary` — already
  copied once for `documents.js`'s own tags — is the real, proven,
  generic template; Gallery is a third copy of it, plus one addition
  neither prior copy needed: a single non-removable tag per image.
- **Whether storing a full-resolution original alongside a resized
  thumbnail is safe.** Confirmed against `docs/adr/0015-indexeddb-
  persistence.md`'s actual numbers: the old localStorage ceiling (~5-
  10MB) that motivated that migration is gone, replaced by IndexedDB's
  ~3.2GB observed headroom. Storing both would have been a real risk
  before that ADR; it isn't now.

Also confirmed: this app has never manipulated image pixels before (zero
`<canvas>`/`Image()`/`drawImage` anywhere in `src/`) — the resize step is
genuinely new capability, not a variation on something existing.

## Decision

**Data model** — `campaign.gallery.images: []` (new, `schema.js`), each
entry `{id, entityId (nullable), kind: 'thumbnail'|'original', pairId
(nullable), title, tags: [], lockedTag, mimeType, dataUrl, createdAt,
updatedAt}`. An entity's `thumbnailId` (nullable, no schema-default entry
needed — this app already treats an unset field as falsy-fallback
elsewhere, e.g. `track`/`rollMethod`) points at its active `'thumbnail'`
record — the image data itself is never duplicated onto the entity,
matching how Colony's crew roster already references character/vehicle
entities by id rather than copying their fields.

**Upload behavior**: if the file is already ≤256px on its longest side,
ONE record is created (no redundant duplicate of an already-small file).
If it's larger, TWO records are created — a resized `'thumbnail'` and the
untouched `'original'`, cross-linked via `pairId` — both carrying
`lockedTag` (the entity's type at upload time), both visible in the
Gallery grid.

**`src/ui/imageResize.js`** (new): the browser-only half — `FileReader` →
`Image()` → (only if oversized) an offscreen `<canvas>` scaled draw →
`toDataURL()`. Lives in `ui/`, not `domain/` (rule 3 — canvas/Image are
DOM APIs), the same split `ui/mechanicsScan.js`/`ui/tocScan.js` already
established for their own browser-only work (PDF.js there, Canvas here).
Returns plain `{thumbDataUrl, originalDataUrl, resized}` data; the domain
layer never touches a canvas or an `Image` object.

**`src/domain/gallery.js`** (new, pure): `addGalleryImages` (creates the
one-or-two records above, points `entity.thumbnailId` at the new
thumbnail), `removeGalleryImage` (clears a dangling `thumbnailId`,
un-links a surviving paired image's `pairId`), `addGalleryTag`/
`removeGalleryTag` (the latter refuses to remove `image.lockedTag` — a
plain inline equality check, not a shared "lock" mechanism, per the
Oracle-tags finding above), `listGalleryImages`/`listGalleryTagVocabulary`
(search/tag-filter, same shape as `documents.js`'s equivalents),
`setEntityThumbnail`/`clearEntityThumbnail`.

**UI**: a new `gallery` drawer (`DRAWERS`/`EDGE_ORDER`, 🖼) — search box +
collapsible tag-filter chip row (the exact markup/data-attribute shape
Documents' own tag filter already uses, just re-prefixed) over a
responsive grid of cards; `'thumbnail'`-kind images render circular
(`border-radius: 50%`, the "common TTRPG thumbnail" look asked for),
`'original'`-kind images render as plain rectangular cards, so a resized
pair's two halves are visually distinct without a text label. The entity
inspector's Type/Tags block is now wrapped in a new `.inspector-photo-row`
with the resolved thumbnail (or a "+ Photo" upload button, same hidden-
file-input shape Documents' own upload control uses) as a left column.

## Alternatives considered

- **Storing the image data directly on the entity** (`entity.thumbnail =
  dataUrl`) instead of a separate Gallery collection. Rejected — the
  request explicitly wants a browsable, taggable collection independent
  of any one entity, and duplicating image bytes onto every entity that
  references one would make "delete this image" ambiguous (which
  entity's copy?).
- **Reusing `domain/oracles.js`'s tag-lock mechanism directly.** Rejected
  once research confirmed it's genuinely hardcoded to oracle-table paths
  and `ENTITY_FIELD_ORACLE_LINKS` — force-fitting Gallery images into that
  shape would have meant bending oracle-specific code to a second,
  unrelated use rather than writing five straightforward lines.
- **Always storing an "original" record, even when no resize happened.**
  Rejected as a needless duplicate — if the upload was already small
  enough to serve as its own thumbnail, there is no second, larger file
  to preserve.

## Consequences

- A GM can now visually identify entities at a glance (Cast rows/relationship
  chips are a natural follow-on for showing the thumbnail there too — not
  built in this pass, scoped to the inspector only per the literal ask).
- Interactive Maps (a later Phase 11 item) can reuse this exact pipeline
  for token art, per the dependency ordering `DESIGN-NEW-FUNCTIONALITY.md`
  already named.
- This is the first feature whose stored payload can meaningfully grow
  per-entity (an original photo plus a thumbnail, per entity, potentially
  many entities) — safe today because of ADR 0015's IndexedDB headroom,
  worth re-checking if a future campaign's storage-usage display
  (Settings) ever shows this becoming the dominant contributor.

## Related packs / ADRs

`docs/adr/0015-indexeddb-persistence.md` (the storage headroom this
depends on); `docs/adr/0016-oracle-tags-and-field-links.md` (the tag
system explicitly NOT reused, and why); `DESIGN-NEW-FUNCTIONALITY.md`'s
Phase 11 section (this ADR's parent backlog entry).
