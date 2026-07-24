> Rejected-alternatives companion to `docs/adr/0011-swn-cwn-content.md` —
> split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0011 — Rejected alternatives

## From "Alternatives Considered"

- **Transcribe SWN's actual faction Asset list, Bestiary creature-part
  tables, and CWN's cyberware catalog/strain formula.** Rejected — exactly
  the line ADR 0010 already drew: reproducing a commercial book's specific
  tables/text is a copyright concern this project avoids categorically,
  regardless of whether the PDF happens to sit in this repo's own reference
  library for the GM's personal use.
- **Faction-vs-faction opposed combat** (two factions rolling against each
  other, SWN's actual resolution shape for faction conflict). Rejected for
  this pass — it needs a target-faction picker and doubles the stat
  bookkeeping (both sides' Force/Cunning/Wealth), a materially bigger UI
  surface than "resolve one faction's own turn." The single-faction stat
  check delivers the requested "mini-game turn-based development" without
  that scope jump; opposed resolution is a reasonable future extension if
  a GM asks for it specifically.
- **Add CWN as a seventh Rules Constitution provider.** Rejected — see
  Decision point 7. One borrowed subsystem doesn't justify expanding a
  roster that was deliberately sourced from a single design document.
- **A full CWN urban/cyberpunk content pack** (matching Phase 9's
  Cyberpunk genre pack). Rejected as beyond what was asked — the request
  named cybernetics specifically, not a full CWN-flavored setting; Phase
  9's Cyberpunk pack already covers general cyberpunk flavor.
