> Rejected-alternatives companion to `docs/adr/0036-faction-conflict.md`
> — split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension. Preserved verbatim, never deleted.

# ADR 0036 — Rejected alternatives

## From "Alternatives Considered"

- **The spec's literal schema, built as-is.** Rejected — this is exactly
  the shape of design the research found gets abandoned in practice
  (SWN's own tolerated-not-loved complexity, the "desert" devlogs'
  concrete redesign-twice story).
- **`power_symmetry` and `escalation_appetite` as separate enumerated
  fields.** Dropped entirely rather than demoted — the two fields
  research most directly flags as "spreadsheet-feeling," and nothing
  else in this design depends on them.
- **A second, date-based "clock" distinct from the escalation ladder**
  (the spec's own `clock` object). Folded into the one escalation clock
  instead — this app has no calendar/date system, and "the fewer things
  a GM has to track, the better it lands" argues against a second
  parallel clock even if one could be built.
- **A separate `campaign.factionConflicts[]` record type**, as the
  spec's own "Implementation Notes" section suggested. Rejected in favor
  of a first-class entity type — see the live ADR's Decision section.
