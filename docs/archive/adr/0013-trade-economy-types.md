> Rejected-alternatives companion to `docs/adr/0013-trade-economy-types.md`
> — split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0013 — Rejected alternatives

## From "Alternatives considered"

- **A new structured `location.economyType` field** instead of a tag. Would
  have needed its own dropdown UI, its own migration story, and its own
  "what happens when the model changes" logic. Rejected: the tag system
  already solves discovery (suggested vocabulary), display (chips), and
  cross-model survival (a string, not an enum reference) for free.
- **A literal Tech Level number per Location.** Directly contradicted the
  request's explicit instruction to avoid this; also would have coupled
  Hostile's setting to a Traveller-specific concept it doesn't otherwise
  use anywhere.
- **A full "available commodities" allow/deny list per economy type**
  (hard exclusion rather than a price bias). Rejected for this pass as
  more data-entry-heavy than the request's actual ask, and less safe under
  a model switch — a hard-excluded commodity would need its own migration
  story if a GM later wanted it back. A strong (0.6x-1.4x) price bias
  achieves the same "scarce here" GM signal without ever making a
  commodity un-tradeable.
