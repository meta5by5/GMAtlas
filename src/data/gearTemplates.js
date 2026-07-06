// gearTemplates.js — per-system field manifests for `gear`-kind statblock
// groups on Item entities (ADR 0012), the same "future-state" field-manifest
// design data/statblockTemplates.js already uses for Bestiary NPCs, applied
// to gear instead. Each system defines only the fields it actually uses —
// Starforged has no numeric Damage (its combat is narrative); Traveller has
// no "Bonus to Iron" — so a gear group's shape genuinely varies system to
// system, matching "genre-aware, not genre-locked."
//
// Unlike Bestiary templates (an NPC picks ONE), gear groups are discriminated
// by `ruleset` like a Character sheet — an Item entity can carry several
// simultaneously (Starforged AND 5PFH AND Traveller stats on the same
// "Snub Pistol"), one group per system, added additively via the same
// "+ Add a statblock" mechanism Character sheets already use.
//
// All fields default to kind: 'text', rollMethod: 'none' (withDefaults'
// own baseline) — a gear stat is read, not rolled; the ruleset's own combat
// mechanic is what actually resolves a roll, not the item's own field.
import { withDefaults } from './statblockTemplates.js';

export const DEFAULT_GEAR_TEMPLATES = {
  // Starforged has no itemized damage/range/armor stats at all — gear is
  // either a free narrative "Spacer Kit" item (no mechanical bookkeeping)
  // or an Asset card granting a named move a flat bonus (+1 and/or +1
  // momentum on a hit), sometimes gated behind a requirement ("if you wield
  // a bladed weapon..."). Fields reflect that narrative-first shape rather
  // than forcing invented damage dice onto a system that doesn't use them.
  starforged: {
    label: 'Starforged',
    fields: withDefaults([
      { key: 'Description' },
      { key: 'Linked Move' },
      { key: 'Bonus' },
      { key: 'Notes' },
    ]),
  },
  // 5PFH weapons use a compact Range/Shots/Damage/Traits profile (Range in
  // tabletop inches or "Brawl" for melee-only, Shots = number of D6 attack
  // dice, Damage = a flat modifier); armor/screens use Type + a Saving
  // Throw target instead of a damage-reduction number; other gear (Consumable/
  // Implant/Utility Device/On-board Item) is just a Type + plain-English
  // Effect string. One shared field set covers all three shapes — a given
  // item only fills in the fields that apply to it, same as every other
  // Bestiary-shaped template in this app.
  '5pfh': {
    label: '5PFH',
    fields: withDefaults([
      { key: 'Range' },
      { key: 'Shots' },
      { key: 'Damage' },
      { key: 'Traits' },
      { key: 'Type' },
      { key: 'Saving Throw' },
      { key: 'Effect' },
      { key: 'Cost' },
    ]),
  },
  // Traveller 2e: Damage is d6-pool notation ("XD", occasionally "XDD" =
  // X d6 x10 for top-end weapons); armor uses a flat Protection rating
  // subtracted from rolled damage (not an AC/to-hit mechanic) plus a
  // separate Rad(iation) protection value and sometimes a Required Skill
  // (e.g. Vacc Suit rating); Magazine covers ammo capacity/reload cost for
  // ranged weapons.
  traveller: {
    label: 'Traveller',
    fields: withDefaults([
      { key: 'TL' },
      { key: 'Damage' },
      { key: 'Range' },
      { key: 'Magazine' },
      { key: 'Protection' },
      { key: 'Rad' },
      { key: 'Required Skill' },
      { key: 'Weight' },
      { key: 'Cost' },
      { key: 'Traits' },
    ]),
  },
  // Hostile runs on the Cepheus Engine (Traveller-derived 2D6): damage is
  // dice-pool notation ("3D6+2") rolled against a target after Armor Rating
  // (a single flat subtraction, not a to-hit mechanic) is subtracted; ROF is
  // one of three fixed bands (1/4/10), Range an abstract category (pistol/
  // rifle/assault/...) that sets task difficulty rather than a meter value.
  hostile: {
    label: 'Hostile',
    fields: withDefaults([
      { key: 'Damage' },
      { key: 'ROF' },
      { key: 'Range' },
      { key: 'Recoil' },
      { key: 'Rounds' },
      { key: 'Armor Rating' },
      { key: 'Weight' },
      { key: 'Cost' },
      { key: 'Traits' },
    ]),
  },
  swn: {
    label: 'Stars Without Number',
    fields: withDefaults([
      { key: 'Damage' },
      { key: 'Range' },
      { key: 'Ammo' },
      { key: 'Attribute' },
      { key: 'Armor Class' },
      { key: 'Shock' },
      { key: 'System Strain' },
      { key: 'Encumbrance' },
      { key: 'Tech Level' },
      { key: 'Cost' },
      { key: 'Traits' },
    ]),
  },
};

export const GEAR_TEMPLATE_SYSTEMS = Object.keys(DEFAULT_GEAR_TEMPLATES);

export function findGearTemplate(id) {
  return DEFAULT_GEAR_TEMPLATES[id] || DEFAULT_GEAR_TEMPLATES.hostile;
}
