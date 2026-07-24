> Rejected-alternatives companion to `docs/adr/0041-scene-operating-
> model.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension. Preserved verbatim, never
> deleted.

# ADR 0041 — Rejected alternatives

## From "Alternatives Considered"

- **One giant pass building everything described.** Rejected outright —
  at least 3 pieces (oracle learning, the guided mode, the Co-Pilot/
  drawer merge) have no existing pattern to extend and a wrong guess at
  their shape would mean redoing real work; CLAUDE.md's own "no
  half-finished implementations" argues against committing to a design
  this large without checkpoints.
- **A weighted-preference oracle "learning" layer** (tracking edit
  *patterns*, not just remembering the last edit per table entry).
  Rejected for v1, per the direct answer above — `oracles.overrides`
  already does the concrete, provable half of "remembered and applied to
  subsequent suggestions"; a pattern-learning layer is a genuinely
  different, fuzzier feature that deserves its own scoping conversation
  once the simpler version is in use and its gaps are known.
- **Auto-derive Bystanders from location presence** instead of a
  GM-driven add-list. Rejected for 13b — there's no existing query for
  "NPCs physically nearby but not @mentioned anywhere," and inventing one
  now (versus reusing WHO/WHERE's established @mention-is-truth
  convention) risks a second, competing "who's really in the scene"
  signal; a manual add-list is honest about that gap instead of papering
  over it with a guess.
