> Rejected-alternatives companion to `docs/adr/0021-gallery.md` — split out
> 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s ADR-cleanup
> extension, so the live ADR reads as pure accepted architecture. This
> file is never itself a decision record; it holds the "what was
> considered and rejected, and why" detail for the ADR above, preserved
> verbatim rather than deleted.

# ADR 0021 — Rejected alternatives

## From "Alternatives Considered"

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
