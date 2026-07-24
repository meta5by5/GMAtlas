> Rejected-alternatives companion to `docs/adr/0012-gear-item-entity-
> subtype.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0012 — Rejected alternatives

## From "Alternatives Considered"

- **Model gear as a statblock `kind` on the existing `asset` entity type**
  instead of a new `item` type. Rejected — `asset` already means "Vehicle
  Stats," and conflating "a starship" and "a snub pistol" under one type
  would break the existing Vehicle-only `statblockAddChoices` scoping and
  muddy the Cast drawer's type filter (a GM filtering "Asset" wanting
  ships would also see every pistol). A new `item` type costs one array
  entry and is unambiguous.
- **One gear template shared across all systems** (a single universal
  field set: Damage/Range/Traits/Cost) instead of per-system templates.
  Rejected — Starforged genuinely has no numeric damage to put in a
  "Damage" field (its combat is narrative), and forcing every system into
  one shape is exactly the "genre-locked" mistake `CLAUDE.md` warns
  against; per-system templates (already proven by Bestiary) let each
  system's real shape show through.
- **Pick-one-template like Bestiary, instead of multiple-simultaneous like
  Character.** Rejected per Context point 1 above — the user's own
  wording is explicit that an item should carry every system's stats at
  once, not force a choice.
- **Fold "wetware" gear into the existing `domain/cybernetics.js` Strain
  system** (installing a Wetware-tagged Item auto-adds a `cyberware[]`
  entry). Deferred, not adopted now — cybernetics.js already models
  *installed* cyberware as a growing list on the wearer, a different
  concept from a catalog of purchasable/lootable items sitting in the
  world. A future link (dragging a `wetware`-tagged Item onto a Character
  offers "Install as cyberware?") is a plausible small follow-on, named
  here so it isn't lost, not built as part of this ADR.
