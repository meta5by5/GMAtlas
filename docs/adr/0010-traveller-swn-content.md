# ADR 0010 — Traveller character ruleset + Stars Without Number oracle content

## Status

Accepted.

## Context

Direct request: "create the Traveller/SWN content." Two established facts
govern how this is built:

1. **No Traveller or SWN sourcebook exists anywhere in this repo's
   `assets/docs/`.** Anything authored here is original content inspired
   by each system's public reputation/conventions, not a transcription —
   the same honesty bar `docs/adr/0003-trade-logistics.md` already applied
   to Traveller for the Merchant Rules Lens, and Phase 9 applied to the
   Cyberpunk/Fantasy genre packs.
2. **`rulesConstitution.js`'s Gameplay Areas table is unchanged.**
   Traveller is named for Exploration, Trade, NPC generation, Vehicle
   rules, and Reputation & Heat; SWN is named for Sector generation, World
   generation, Factions, and NPC generation. This ADR's content targets
   the areas from that list where a concrete, scoped, low-risk deliverable
   already existed — it doesn't reopen or expand that table.

## Decision

1. **Traveller gets a `data/rulesets.js` character template.** The
   concrete trigger: `domain/dice.js`'s `rollTraveller` (2d6 + value vs. a
   target, defaulting to 8 — "classic Traveller task resolution") has
   existed since Phase 6 with no ruleset ever attached to it — every other
   roll mechanic in this app (`rollAction`, `rollFlat`) has a real
   character sheet built on it; `rollTraveller` alone sat unused. Filling
   that gap is a narrow, mechanical addition, not building out Traveller
   as a full setting.
   - The six classic characteristics (STR/DEX/END/INT/EDU/SOC) are
     collapsed to this app's existing "small rollable modifier"
     abstraction (the same one Starforged's Edge/Heart and 5PFH's
     Reaction/Speed already use) rather than literal 2-12 UPP scores with
     a separately derived dice modifier — using a raw UPP value directly
     in `2d6 + value vs 8` would make every check trivially easy. This is
     an explicit, commented simplification, not an attempt at faithful
     transcription.
   - Damage is collapsed to one `Stamina` track (0-8) rather than
     replicating classic Traveller's three-stat (STR/DEX/END) damage
     system — more precision than this app's abstraction level needs.
   - `doc: null` (no PDF field) — `assets/docs/` has nothing to link to,
     and the Settings drawer's "Reference" link renders an explanatory
     "no sourcebook — original content" line instead of a broken/
     fabricated URL for any ruleset with no `doc`.
2. **SWN gets a new "Stars Without Number" oracle group** (`data/
   tables.js`: *Faction Action*, *World Tag*) rather than a character
   template — a Factions/World-generation contribution, matching the area
   `rulesConstitution.js` already names SWN for. Both tables are original
   phrasing inspired by SWN's faction-turn and two-tag world-generation
   *conventions* (a faction takes one discrete strategic action per turn;
   a world is characterized by a couple of evocative tags), not a
   transcription of SWN's actual named action list or tag tables, which
   remain proprietary content this repo doesn't reproduce.
   - The Faction card (Phase 10's Faction Pressure Track) has a second
     roll button, *Faction Action*, alongside the existing Hostile-
     flavored *Faction Activity* — both are ordinary oracle tables a GM
     can reach for regardless of which "genre pack" is active; this is
     not a genre-pack swap.
3. **`rulesConstitution.js`'s status strings are honest**: Traveller reads
   `'character ruleset authored (original content)'` and SWN
   `'faction/world content authored (original content)'` — both
   explicitly note the absence of a real sourcebook, so nobody mistakes
   either for a transcription.

## Alternatives Considered

See `docs/archive/adr/0010-traveller-swn-content.md` (leaving Traveller/
SWN without any authored content, building them out as full genre packs,
and replicating Traveller's literal UPP scores were each considered and
rejected).

## Consequences

**Positive:** `rollTraveller` (previously dead code with no consumer) has
a real character sheet; the Faction Pressure Track (Phase 10) gains a
second, genuinely different-flavored oracle option instead of the one
Hostile-flavored table it shipped with; both additions are small, tested,
and clearly labeled as original content, not new mechanism or new engine
work.

**Negative / risk:** if a real Traveller or SWN sourcebook is ever added
to `assets/docs/`, this content should be revisited against it rather
than assumed accurate — it was authored from each system's public
reputation, not a rulebook. `rulesConstitution.js`'s status notes already
flag this for a future reader.

## Related Packs / Documents

`docs/adr/0002-rules-constitution.md` (the Rules Constitution table and
honesty requirement this content fills in against), `docs/adr/0003-
trade-logistics.md` (the "no sourcebook = original content, honestly
labeled" precedent this reapplies), pack 66 (backlog prioritization —
this is authored content, not new mechanism, so it doesn't reorder
anything).
