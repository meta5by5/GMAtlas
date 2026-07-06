# ADR 0010 — Traveller/SWN content: reversing ADR 0002's "no character template" call

## Status

Accepted (supersedes one specific alternative rejected in `docs/adr/0002-rules-constitution.md`, not the rest of that ADR).

## Context

`docs/adr/0002-rules-constitution.md` recorded, as a rejected alternative:

> **Add Traveller/SWN as full `data/rulesets.js` entries now** (with
> character templates like Starforged/5PFH have). Rejected: this document
> positions Traveller and SWN primarily as *setting/procedural-generation*
> providers (sector generation, faction turns, trade tables), not
> character-sheet providers — forcing them into the existing
> character-template shape would misrepresent what they're actually for.

That reasoning held as long as this was a design-review judgment call with no explicit user request behind it. The user has now directly asked: "create the Traveller/SWN content." A direct, current instruction outranks a past session's judgment call about what a user might want — per `CLAUDE.md`'s "no two docs get to disagree about current reality" rule, this ADR records the reversal explicitly rather than silently contradicting ADR 0002.

The underlying facts ADR 0002 and the 2026-07-03 ruleset library review established are unchanged and still govern this work:

1. **No Traveller or SWN sourcebook exists anywhere in this repo's `assets/docs/`.** Anything authored here is original content inspired by each system's public reputation/conventions, not a transcription — the same honesty bar ADR 0003 already applied to Traveller for the Merchant Rules Lens, and Phase 9 applied to the Cyberpunk/Fantasy genre packs.
2. **`rulesConstitution.js`'s Gameplay Areas table is unchanged.** Traveller is still named for Exploration, Trade, NPC generation, Vehicle rules, and Reputation & Heat; SWN is still named for Sector generation, World generation, Factions, and NPC generation. This ADR's content targets the areas from that list where a concrete, scoped, low-risk deliverable already existed — it doesn't reopen or expand that table.

## Decision

1. **Traveller gets a `data/rulesets.js` character template**, reversing ADR 0002's specific rejection of this. The concrete trigger: `domain/dice.js`'s `rollTraveller` (2d6 + value vs. a target, defaulting to 8 — "classic Traveller task resolution") has existed since Phase 6 with **no ruleset ever attached to it** — every other roll mechanic in this app (`rollAction`, `rollFlat`) has a real character sheet built on it; `rollTraveller` alone sat unused. Filling that gap is a narrow, mechanical fix, not "building out Traveller as a setting," which is what ADR 0002's rejection was actually guarding against.
   - The six classic characteristics (STR/DEX/END/INT/EDU/SOC) are collapsed to this app's existing "small rollable modifier" abstraction (the same one Starforged's Edge/Heart and 5PFH's Reaction/Speed already use) rather than literal 2-12 UPP scores with a separately derived dice modifier — using a raw UPP value directly in `2d6 + value vs 8` would make every check trivially easy. This is an explicit, commented simplification, not an attempt at faithful transcription.
   - Damage is collapsed to one `Stamina` track (0-8) rather than replicating classic Traveller's three-stat (STR/DEX/END) damage system — more precision than this app's abstraction level needs.
   - `doc: null` (no PDF field) — `assets/docs/` has nothing to link to, and the Settings drawer's "Reference" link now renders an explanatory "no sourcebook — original content" line instead of a broken/fabricated URL for any ruleset with no `doc`.
2. **SWN gets a new "Stars Without Number" oracle group** (`data/tables.js`: *Faction Action*, *World Tag*) rather than a character template — this is squarely a Factions/World-generation contribution, exactly what ADR 0002 already positioned SWN for, so no reversal was needed here. Both tables are original phrasing inspired by SWN's faction-turn and two-tag world-generation *conventions* (a faction takes one discrete strategic action per turn; a world is characterized by a couple of evocative tags), not a transcription of SWN's actual named action list or tag tables, which remain proprietary content this repo doesn't reproduce.
   - The Faction card (Phase 10's Faction Pressure Track) gained a second roll button, *Faction Action*, alongside the existing Hostile-flavored *Faction Activity* — both are ordinary oracle tables a GM can reach for regardless of which "genre pack" is active; this is not a genre-pack swap.
3. **`rulesConstitution.js`'s status strings updated honestly**: Traveller now reads `'character ruleset authored (original content)'` and SWN `'faction/world content authored (original content)'` — both still explicitly note the absence of a real sourcebook, so nobody mistakes either for a transcription.

## Alternatives Considered

- **Leave ADR 0002's rejection standing and decline the request, or silently override it without comment.** Rejected — the user gave a direct, current instruction; declining would be unresponsive, and silently overriding without a record would leave ADR 0002 and this repo's actual code permanently disagreeing about why Traveller does or doesn't have a character template, which is exactly the kind of drift `CLAUDE.md` asks to be corrected explicitly, not left to be rediscovered.
- **Build out Traveller/SWN as full genre packs** (a `tables-traveller.js`/`tables-swn.js` the way Cyberpunk/Fantasy got in Phase 9). Rejected as scope well beyond "content" — Traveller and SWN are both already sci-fi settings overlapping heavily with Hostile's own default flavor, unlike Cyberpunk/Fantasy's genuinely distinct genres; a full parallel table set would duplicate Hostile's own content rather than adding something distinct. The targeted additions above (one character ruleset, one small oracle group) serve the *specific* gameplay areas each system is actually named for.
- **Replicate Traveller's literal 2-12 UPP scores plus a separately-tracked derived DM.** Rejected — adds a second attribute-representation concept this app's field model doesn't have anywhere else, for marginal authenticity gain; the existing small-modifier abstraction is simpler and consistent with every other ruleset here.

## Consequences

**Positive:** `rollTraveller` (previously dead code with no consumer) now has a real character sheet; the Faction Pressure Track (Phase 10) gains a second, genuinely different-flavored oracle option instead of the one Hostile-flavored table it shipped with; both additions are small, tested, and clearly labeled as original content, not new mechanism or new engine work.

**Negative / risk:** if a real Traveller or SWN sourcebook is ever added to `assets/docs/`, this content should be revisited against it rather than assumed accurate — it was authored from each system's public reputation, not a rulebook. `rulesConstitution.js`'s status notes already flag this for a future reader.

## Related Packs / Documents

`docs/adr/0002-rules-constitution.md` (the ADR this reverses one alternative from — its Rules Constitution table and honesty requirement are otherwise unchanged), `docs/adr/0003-trade-logistics.md` (the "no sourcebook = original content, honestly labeled" precedent this reapplies), pack 66 (backlog prioritization — this is authored content, not new mechanism, so it doesn't reorder anything).
