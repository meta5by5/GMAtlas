> Rejected-alternatives companion to `docs/adr/0016-oracle-tags-and-field-
> links.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0016 — Rejected alternatives

## From "Alternatives considered"

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
