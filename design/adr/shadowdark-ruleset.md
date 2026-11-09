# Shadowdark RPG ruleset

**Status:** Accepted (2026-11-08, direct request). Built on `main`.

## Context

The request: "a ruleset for shadowdark with statblock and entity import of
equipment and monsters and a mechanic for torch duration and random tables
for carousing." The Shadowdark RPG (The Arcane Library) is a commercial book,
so nothing from its text can ship with the app.

## Decision

1. **A licensed fantasy Game System**, modelled on Five Leagues:
   - `data/licenses.js` `shadowdark` (owned, attested, no bundled PDFs);
   - `data/rulesConstitution.js` `shadowdark` (`requiresActivation`,
     `rulesetId` and `genrePackId` both `shadowdark`).
2. **The character sheet and monster statblock are the game's mechanics in
   this app's own layout**:
   - the sheet (`data/rulesets.js`) uses sections; its six 3-18 scores roll
     with the existing `d20-score` method, since the modifier is derived the
     5e way;
   - the monster template (`data/statblockTemplates.js`
     `shadowdark-lifeform`) follows the game's stat-line order, with the
     ability modifiers as `d20` attributes;
   - the `shadowdark` gear template (`data/gearTemplates.js`) holds cost,
     gear slots, damage, range, AC and properties;
   - new Shadowdark NPCs default to the monster template (statblocks.js).
3. **Monsters and gear come from the GM's own copy**
   (`domain/shadowdarkImport.js`, pure), in Settings › Licenses under the
   license:
   - monsters as pasted stat-block text (name, description, the `AC …, HP …,
     ATK …, MV …, S … Ch …, AL …, LV …` line, wrapped or not, then specials)
     or JSON;
   - gear as CSV/TSV rows (a header is recognised) or JSON;
   - monsters become Lifeforms and gear becomes Items, tagged `shadowdark`;
     names already in the campaign are skipped.
4. **The torch is a real-time timer** (`domain/torchTimer.js`, pure, in
   `campaign.party.light`): an hour of wall-clock time per torch, pausable,
   burning across reloads.
   - The Party tab shows it while Shadowdark is in use.
   - The shell updates the countdown text every second in place (a timer,
     not a re-render).
   - At zero the light goes out, with a Journal entry and a toast.
5. **Carousing tables are original writing** (`data/tables-shadowdark.js`):
   Night Out, Complication, Boon and Who You Met.
   - They live in a `shadowdark` genre pack: the full fantasy oracle set
     plus Carousing, so they appear only in Shadowdark campaigns.
   - The pack shares the fantasy quests, quest briefs, grouping and terms.

## Consequences

- A Shadowdark campaign needs the license ticked and a profile whose Module
  for Profile is Shadowdark, like any owned game.
- The importer reads the book's layout; a page pasted with broken lines may
  need a little tidying first.
- The torch is one shared party light source; several lights at once would
  need a list.
