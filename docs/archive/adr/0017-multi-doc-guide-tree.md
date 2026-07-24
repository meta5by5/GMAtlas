> Rejected-alternatives companion to `docs/adr/0017-multi-doc-guide-
> tree.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0017 — Rejected alternatives

## From "Alternatives considered"

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
