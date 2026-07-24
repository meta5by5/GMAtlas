> Rejected-alternatives companion to `docs/adr/0004-merchant-rules-lens.md`
> — split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0004 — Rejected alternatives

## From "Alternatives Considered"

- **Treat the three documents as a literal build spec and scope all 8
  phases.** Rejected — this is the same mistake ADR 0001 explicitly warned
  against for the 77-pack corpus: a mature end-state description isn't
  evidence the current repo should build toward it wholesale. The concrete,
  buildable slice is contracts-over-existing-Threads; the rest stays
  reference material.
- **Keep ADR 0003's buy/sell framing as primary and add contracts as an
  optional flavor.** Rejected — the source documents are unambiguous that
  contracts are the *point* ("Key Innovation: Replace buy-low/sell-high
  with living contracts"), and a GM reading a "Merchant" feature would
  expect jobs with patrons and stakes, not a spreadsheet. Buy/sell-style
  free trading isn't removed (a contract can still be "sell surplus cargo
  at the best price," using the same `priceAt()`), it's just not the
  headline loop.
- **A new `domain/contracts.js` module, separate from Threads.** Rejected
  for the same reason ADR 0003 rejected a bespoke transport clock: Threads
  already have a clock, a lifecycle, and Co-Pilot surfacing. A contract
  needing a few extra reference fields doesn't justify a second
  state-machine to maintain in parallel.
- **Build the full "Living Galaxy" colony record now, since the docs
  already spec the field list.** Rejected — most of those ~19 fields have
  no consuming mechanic yet; adding them speculatively is exactly the
  "half-finished implementation" this project's own conventions warn
  against. Free-text `overview`/`revealed` already covers the narrative
  half; add structured fields only when something reads them.
