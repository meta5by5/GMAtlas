> Rejected-alternatives companion to `docs/adr/0026-hostile-canon-
> locations.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted. (This ADR's large
> "## Status" section, recording several same-day implementation
> follow-ups, is untouched — nothing there was extracted, per the
> instruction to leave Status sections alone.)

# ADR 0026 — Rejected alternatives

## From "Alternatives Considered"

- **Auto-seed all 108 into every new Hostile-genre campaign.** Rejected
  — most automatic, but clutters a fresh campaign a GM might want empty,
  and isn't reversible without a bespoke "undo the seed" mechanism.
- **Read-only reference table only, no entity creation.** Rejected —
  doesn't satisfy "build an entities database" and leaves a GM
  hand-typing 30+ Locations to actually use any of this.
- **Merge World Profile into the existing "Location card" as one
  undifferentiated block.** Rejected in favor of a visually distinct
  sub-card — 13 fields is a lot to mix into the 2-field Development
  Level/Biome block without making that block's own "these two dials
  bias Trade" framing harder to scan.
- **Verbatim paragraph capture.** Rejected per the resolved scoping
  question — a full Planetology+Development paragraph pair runs several
  times longer per world than a usable at-the-table summary; the `page`
  citation lets a GM pull the original from the Reference Library when
  they want the full text.

## Rejected option(s) narrated inline in the original Context section

The live ADR's Context section originally phrased two of its four
resolved scoping questions as inline comparisons against the rejected
alternative:

- Item 1 read: "**Import, not read-only reference or auto-seed.** A
  Settings button bulk-creates real, fully-editable Location entities in
  the GM's current campaign — matches "build an entities database"
  literally, and nothing is forced on a campaign that doesn't want it."
  The rejected read-only-reference and auto-seed alternatives (bolded
  above) are the same ones formally rejected under "Alternatives
  Considered" above.
- Item 3 read: "**Condensed prose**, not verbatim paragraphs — a few
  GM-scannable sentences per world rather than the book's full
  multi-paragraph write-ups, so 108 (eventually) entities stay usable at
  the table." The rejected verbatim-paragraph-capture alternative is the
  same one formally rejected under "Alternatives Considered" above.

The live ADR now states both resolutions without the rejected-alternative
comparison; the verbatim original text is preserved above.
