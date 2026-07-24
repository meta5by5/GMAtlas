> Rejected-alternatives companion to `docs/adr/0005-best-effort-backup-
> write.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0005 — Rejected alternatives

## From "Alternatives Considered"

- **Shrink or evict the backup before writing it** (e.g., only keep a
  backup under some size threshold, or delete `BACKUP_KEY` first to free
  its slot before writing the new one). Rejected for now: doesn't fully
  solve the problem (a large-enough campaign still can't hold two
  copies, backup or not), and adds complexity for a key nothing reads yet.
  Worth revisiting *if* a real restore-from-backup feature gets built and
  the one-slot design needs to get smarter about size.
- **Drop the backup mechanism entirely.** Rejected — it's cheap insurance
  when it fits, and pack 66's storage-reliability priority (`docs/adr/0001`)
  argues for keeping a safety net where one exists, not removing it because
  it doesn't always fit.
