> Rejected-alternatives companion to `docs/adr/0042-design-doc-
> consolidation.md` — split out 2026-07-23 as part of the same ADR-
> cleanup extension this file itself documents (a little recursive, but
> consistent). Preserved verbatim, never deleted.

# ADR 0042 — Rejected alternatives

## From "Alternatives considered"

- **Rewrite the six faction ADRs in place to reflect the new design.**
  Rejected — violates this repo's own "ADRs are immutable history" rule
  (`CLAUDE.md`, and this cleanup's own ground rule 0.3); an ADR records a
  decision *at the time it was made*, and rewriting 0031's body to
  describe two-sided impact would make it lie about what actually shipped
  in July.
- **Leave the six ADRs standing with no consolidation.** Rejected — a
  reader hitting 0031 first has no way to discover that 0032/0034/0035/
  0038 modify its behavior, or that a scope document exists which reverses
  specific cuts it made. The fragmentation was the actual problem this ADR
  fixes.
- **Delete the superseded `docs/design/` docs instead of archiving.**
  Rejected outright by the cleanup's own ground rules (archive, never
  delete — git history is a backstop, not the primary provenance record).
