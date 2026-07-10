# ADR 0011 — Deepen Stars Without Number content; borrow Cities Without Number's cybernetics concept

## Status

Accepted. Extends `docs/adr/0010-traveller-swn-content.md` (which added SWN's
first oracle group) rather than superseding it.

**Superseded in part by `docs/adr/0031-swn-faction-turn-engine.md`
(2026-07-09)**: this ADR's "original re-implementation, nothing transcribes
SWN's actual Asset lists/faction action names" copyright stance, specifically
for **factions only**, no longer holds — a direct, explicit request to build
"all the decision options" from the real book overrode it for that one
subsystem. The Force/Cunning/Wealth-plus-Assets-list *shape* this ADR
introduced is unchanged and still lives in `domain/factions.js`'s own
lighter-weight mini-game; ADR 0031 adds a second, deeper, SWN-transcribed
engine alongside it, not a replacement. Every OTHER piece of this ADR
(NPC deepening, creature/site/adventure-seed generation, CWN cybernetics)
is untouched and still holds to the original-reimplementation posture below.

## Context

The user asked to revise the SWN content "to incorporate game concepts from
the uploaded PDF, `assets/docs/Stars Without Number Revised - Deluxe
Edition.pdf`, with extra consideration for faction creation and mini-game
turn-based development, creating problems, deepening NPCs and styling
creatures, places, adventure seeds, defining stereotype NPC encounters to
develop a unique Bestiary" — and separately to look at Cities Without
Number's cybernetics ("CWN, `CitiesWithoutNumber_Deluxe.pdf`") and "add both
PDF to the library."

Both PDFs were already present in `assets/docs/` (the build's docs-manifest
scan picks up anything dropped in that folder automatically — no manifest
edit was needed, just a rebuild); this ADR is about the CONTENT built from
them, not the library addition itself.

**Copyright stance, carried over unchanged from ADR 0010**: SWN and CWN are
commercial books by Sine Nomine Publishing. Having the actual PDFs in this
repo's reference library (personal-use GM material, the same treatment
already given to Hostile/5PFH/Starforged/Traveller's own sourcebooks here)
is a different question from what gets built as shipped, distributed app
DATA. This ADR's content is an original re-implementation of well-known,
publicly-discussed game-design CONCEPTS (game mechanics and procedures are
not copyrightable; the book's specific text, tables, and exact wording
are) — the same posture ADR 0010 already established for SWN's first oracle
group, extended here to go considerably deeper per the user's explicit ask.
Nothing below transcribes SWN's or CWN's actual tables, Asset lists, faction
action names, or cyberware catalog.

## Decision

1. **Faction creation depth** (`entities.js`, `domain/factions.js`): a
   faction entity now carries `force`/`cunning`/`wealth` (0-10, default 3)
   and a growing `assets` list — an original re-implementation of the
   "a faction is three stats plus a list of Assets it accumulates" concept
   SWN's own community and reviewers consistently name as its standout
   subsystem. A new "Faction Asset" oracle table (Corporate Powers group)
   gives the GM a roll-and-append shortcut (`rollFactionAsset`); the actual
   Asset names are original (e.g. "an elite enforcer cadre," "a hidden
   cache"), not SWN's own catalog.
2. **Turn-based mini-game** (`domain/factions.js`'s `resolveFactionTurn`):
   a faction's turn resolves as a stat check — d10 + whichever stat its
   action plays to (Attack/force, Scheme/cunning, Expand/wealth), weighted
   toward whatever stat is already strongest, vs. a flat difficulty. A
   strong success (12+) raises that stat; a setback (<8) adds an extra tick
   to the faction's existing Pressure Track. This is deliberately a
   single-faction stat check, not faction-vs-faction opposed combat (see
   Alternatives Considered) — the existing "Advance Faction Turns" bulk
   action (Phase 10) now resolves one of these per tracked faction
   automatically, and the Faction card gained its own "▶ Turn" button to
   resolve one on demand.
3. **Deepening NPCs** (`domain/session.js`'s `deepenNpc`, new Characters
   oracle tables Stereotype/Want/Complication): unlike `generateNpc` (which
   builds a new NPC from nothing), this rolls onto an EXISTING Cast member's
   Overview — the well-known "start from an archetype, then add one want and
   one complication" quick-NPC technique, in this app's own original
   phrasing. A "🎲 Deepen" button sits next to an NPC's name in Entity
   Detail.
4. **Styling creatures and places** (`domain/worldbuilding.js`, new
   Xenobestiary and Site Concept oracle groups): both are small
   combinatorial "building block" generators — origin + method of movement
   + trait + threat for a creature, feature + danger + wonder for a site —
   in the same building-block STYLE SWN's own alien-creation chapter is
   known for, with entirely original entries. A Journal drawer button rolls
   each into one readable block, same shape as the existing Mission
   generator.
5. **Adventure seeds** (`domain/worldbuilding.js`, new Adventure Seed oracle
   group: Hook/Twist): "creating problems" on demand — reuses the existing
   Story Complication table for its third beat instead of adding a
   duplicate.
6. **CWN's cybernetics concept** (`domain/cybernetics.js`, new): the
   well-documented "installing cyberware costs Strain against a limited
   capacity" idea — CWN's best-known contribution on top of the shared SWN
   engine, per its own community/reviewers. Original re-implementation: a
   `cyberware` list per entity (name/strain/notes) and a `strainCapacity`
   (default 8, GM-overridable), with `isOverStrained` as a visible flag, not
   an auto-applied penalty (Article II — the GM decides what an overstrained
   character actually suffers). A "Cyberware Concept" oracle table
   (Augmentation group) gives flavor ideas; the GM commits the actual
   name/Strain into the entity's Cybernetics section by hand, mirroring the
   Faction Asset roll-then-commit split. CWN's own numeric strain formula
   (tied to a Constitution-equivalent stat neither exists in this app's
   generic field model) and its actual cyberware catalog are not reproduced.
7. **CWN is NOT added as a `RULES_PROVIDERS` entry.** `rulesConstitution.js`'s
   six-system roster (Starforged/Traveller/5PFH/Hostile/SWN/Planetfall) is a
   curated list sourced from `gameplay-goals.md` (ADR 0002) — CWN was never
   one of the six, and adding a seventh provider on the strength of one
   borrowed subsystem would overreach past what this content actually is
   (a supplementary mechanic attached to the general NPC/character model,
   not a Rules Lens for a whole gameplay area). The cybernetics feature is
   ordinary domain content, available regardless of which Rules Lens/genre
   pack is active — the same "not a genre-pack swap" posture the Faction
   Action table already established.

## Alternatives Considered

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

## Consequences

**Positive:** the Faction Pressure Track (Phase 10) gains real mechanical
teeth (stats that matter, a turn that produces concrete outcomes) instead
of being flavor-text-only; NPCs and Bestiary entries have a fast, repeatable
way to gain depth beyond their first-draft description; cybernetics is
available to any campaign without requiring a genre-pack switch.

**Negative / risk:** if a real close reading of the SWN/CWN sourcebooks
(now sitting in this repo's own library) ever happens, this content should
be checked against them for accidental over-similarity in phrasing, not
assumed safe by virtue of being "original" in intent — the same risk ADR
0010 already flagged for its own, smaller SWN addition.

## Related Packs / Documents

`docs/adr/0010-traveller-swn-content.md` (the ADR this extends), `docs/adr/
0002-rules-constitution.md` (the Rules Constitution roster this doesn't
expand), `domain/factions.js`/`domain/cybernetics.js`/`domain/worldbuilding.js`
(the new/extended domain modules), `data/tables.js` (Faction Asset,
Stereotype/Want/Complication, Xenobestiary, Site Concept, Adventure Seed,
Augmentation oracle content).
