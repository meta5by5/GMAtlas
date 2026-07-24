> Rejected-alternatives companion to `docs/adr/0025-location-biome-trade.md`
> — split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0025 — Rejected alternatives

## From "Alternatives Considered"

- **Merge biome into development level as one bigger enum** (e.g.
  "Waterworld-Industrial" as a single choice). Rejected: multiplies the
  option count combinatorially, and doesn't match the user's own framing
  of these as two separate, compounding questions.
- **Keep development level as a tag forever, only add biome as a
  field.** Rejected as inconsistent — the request asked for both to work
  the same way ("appropriate to the Location type selected"), and having
  one be a real field with a dropdown while the other stays a
  string-match tag would leave the exact UX gap ADR 0013 already flagged
  half-fixed.
- **A hard commodity allow/deny list per biome** (no biome-appropriate
  goods at all, rather than a price bias). Rejected for the same reason
  ADR 0013 rejected it for development level: harder to migrate away
  from later, and a strong price bias already delivers the "this is
  scarce here" GM signal ADR 0013 relies on.
