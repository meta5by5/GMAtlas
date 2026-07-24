> Rejected-alternatives companion to
> `docs/adr/0019-where-tab-and-scene-fields.md` — split out 2026-07-23 per
> `docs/adr/0042-design-doc-consolidation.md`'s ADR-cleanup extension, so
> the live ADR reads as pure accepted architecture. This file is never
> itself a decision record; it holds the "what was considered and
> rejected, and why" detail for the ADR above, preserved verbatim rather
> than deleted.

# ADR 0019 — Rejected alternatives

## From "Alternatives Considered"

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
