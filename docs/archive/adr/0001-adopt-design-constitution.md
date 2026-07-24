> Rejected-alternatives companion to `docs/adr/0001-adopt-design-
> constitution.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0001 — Rejected alternatives

## From "Alternatives Considered"

- **Rewrite the domain layer to match the corpus's object model and engine
  names literally** (Storage Kernel, Context Graph class, Story Engine
  class, etc.). Rejected: high risk/high churn for a rename with no
  behavior change, and the corpus itself isn't consistent enough to copy
  verbatim without first making its own internal decisions (which this ADR
  now makes for our purposes only).
- **Ignore the corpus and keep the existing architecture unchanged.**
  Rejected: the corpus contains genuinely high-value, concrete features not
  yet built (richer Threads, Narrative Trackers, session recap/Narrative
  Recall, Universal Search) that directly serve the existing "Frictionless
  Empowerment" principle this repo already commits to — treating 7,600
  lines of design work as inert reference material would waste it.
- **Implement the full corpus immediately as one large phase.** Rejected:
  disproportionate to the request (a design review + roadmap, not a build
  sprint) and against the corpus's own guidance (pack 58: "architecture
  evolves by refinement... not replacement"; pack 66: prioritize
  continuity work before new features).
