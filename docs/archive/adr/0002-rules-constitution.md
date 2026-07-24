> Rejected-alternatives companion to `docs/adr/0002-rules-constitution.md`
> — split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0002 — Rejected alternatives

## From "Alternatives Considered"

- **Build the Activity → Rules Lens recommender now, using this document as
  the spec.** Rejected: Phase 9 isn't next in the priority order (pack 66:
  continuity > workflow > graph depth > storage > recommendations > UX >
  integrations > new features), and this document didn't change that
  ordering — it gave Phase 9 better source material, not new urgency.
- **Add Traveller/SWN as full `data/rulesets.js` entries now** (with
  character templates like Starforged/5PFH have). Rejected *at the time* —
  this document positions Traveller and SWN primarily as
  *setting/procedural-generation* providers (sector generation, faction
  turns, trade tables), not character-sheet providers. **Reversed for
  Traveller specifically on direct user request, 2026-07-06 — see
  `docs/adr/0010-traveller-swn-content.md`**, which also explains why SWN's
  own content stayed a Factions/World-generation oracle group rather than
  a character template (that rejection's actual reasoning still holds for
  SWN).
- **Ignore the document as redundant with Article III.** Rejected: the
  concrete area-by-area table and the "reserved to Saga Atlas" list are
  genuinely new information worth keeping queryable, even though the
  underlying principle isn't new.
