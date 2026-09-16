// dnd5eImport.js — pure mapping from a parsed D&D Beyond PDF character-
// sheet export's raw AcroForm field values ({fieldName: value}, gathered
// from every page of the PDF — src/ui/dnd5ePdfImport.js's job, a separate,
// impure, browser-only module, not this one) onto this app's own D&D 5e
// character-sheet template shape (data/rulesets.js's dnd5e
// characterTemplate, phase 1 of this work). Pure and DOM-free per
// architectural rule 3 — fully unit-testable against a plain object of
// field values, no PDF ever touched here.
//
// Tuned to ONE well-known, consistent export format (D&D Beyond's own
// official character sheet PDF, confirmed field-by-field against a real
// export) — not a general PDF-form reader. Field names repeat verbatim
// across every page of that export (CharacterName/CharacterName2/
// CharacterName3/... all carry the same value) and a few carry stray
// whitespace D&D Beyond's own template doesn't consistently trim
// ("DEXmod ", "Stealth ", "Wpn2 AtkBonus ") — both handled by `get()`
// below rather than assumed away.

const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const ABILITY_LABELS = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
const SAVE_FIELD = { STR: 'ST Strength', DEX: 'ST Dexterity', CON: 'ST Constitution', INT: 'ST Intelligence', WIS: 'ST Wisdom', CHA: 'ST Charisma' };
// Label (this app's own dnd5e template field key) -> the PDF's own field
// name for that skill's total bonus.
const SKILL_FIELD = {
  Acrobatics: 'Acrobatics', 'Animal Handling': 'Animal', Arcana: 'Arcana', Athletics: 'Athletics',
  Deception: 'Deception', History: 'History', Insight: 'Insight', Intimidation: 'Intimidation',
  Investigation: 'Investigation', Medicine: 'Medicine', Nature: 'Nature', Perception: 'Perception',
  Performance: 'Performance', Persuasion: 'Persuasion', Religion: 'Religion',
  'Sleight of Hand': 'SleightofHand', Stealth: 'Stealth', Survival: 'Survival',
};

/** Tolerant field lookup: an exact match first, then a whitespace-trimmed
 *  match against every key (real export field names sometimes carry a
 *  stray leading/trailing space that isn't worth hardcoding per-field). */
function get(fields, key) {
  if (fields[key] !== undefined && fields[key] !== null) return fields[key];
  const target = key.trim();
  for (const k of Object.keys(fields)) {
    if (k.trim() === target && fields[k] !== null) return fields[k];
  }
  return '';
}

function parseSignedInt(raw) {
  const n = parseInt(String(raw ?? '').replace(/[^\d+-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function abilityScoresSection(fields) {
  const out = {};
  for (const k of ABILITY_KEYS) out[ABILITY_LABELS[k]] = parseInt(get(fields, k), 10) || 10;
  return out;
}

function savingThrowsSection(fields) {
  const out = {};
  for (const k of ABILITY_KEYS) out[`${ABILITY_LABELS[k]} Save`] = parseSignedInt(get(fields, SAVE_FIELD[k]));
  return out;
}

function skillsSection(fields) {
  const out = {};
  for (const [label, fieldKey] of Object.entries(SKILL_FIELD)) out[label] = parseSignedInt(get(fields, fieldKey));
  return out;
}

function combatSection(fields) {
  const maxHp = parseInt(get(fields, 'MaxHP'), 10) || 0;
  const currentRaw = get(fields, 'CurrentHP');
  const currentHp = /\d/.test(String(currentRaw)) ? parseInt(currentRaw, 10) : maxHp;
  // The "Total" field (not "HD", which is blank in a real export) is
  // where D&D Beyond's own template actually puts the hit-dice formula
  // (e.g. "5d8 + 2d10") — confirmed empirically, a real field-naming
  // surprise in the source PDF, not a guess.
  const hitDice = get(fields, 'Total') || get(fields, 'HD') || '';
  return {
    'Armor Class': get(fields, 'AC') || '',
    Initiative: parseSignedInt(get(fields, 'Init')),
    Speed: get(fields, 'Speed') || '',
    'Proficiency Bonus': get(fields, 'ProfBonus') || '',
    'Hit Points': { value: currentHp, max: maxHp },
    'Temp HP': get(fields, 'TempHP') || '',
    'Hit Dice': hitDice,
  };
}

/** Spell rows (spellNameN/spellSourceN/...) and level-group headers
 *  (spellHeaderN "=== 1st LEVEL ===" + spellSlotHeaderN "4 Slots OOOO")
 *  use two ENTIRELY SEPARATE counters in the PDF's own field names, with
 *  no direct pointer from one to the other — reconstructed here by
 *  walking Object.keys(fields) in its own insertion order (which for a
 *  plain object built by reading pages 1..N in order is exactly the
 *  order those fields actually appear in the PDF), not by guessing an
 *  index range per header. */
/** Returns {text, count} — count is the real number of spell ROWS found
 *  (not derived by re-parsing the composed text back apart later, which
 *  would be fragile against the header lines mixed into it) — used by the
 *  UI's own review-step summary. */
function buildSpellsText(fields) {
  const lines = [];
  let count = 0;
  for (const key of Object.keys(fields)) {
    const headerMatch = key.match(/^spellHeader(\d+)$/);
    if (headerMatch && fields[key]) {
      const slot = fields[`spellSlotHeader${headerMatch[1]}`];
      if (lines.length) lines.push('');
      lines.push(slot ? `${fields[key]} — ${slot}` : fields[key]);
      continue;
    }
    const nameMatch = key.match(/^spellName(\d+)$/);
    if (nameMatch && fields[key]) {
      const n = nameMatch[1];
      const prepared = fields[`spellPrepared${n}`] === 'P';
      const source = fields[`spellSource${n}`];
      const time = fields[`spellCastingTime${n}`];
      const range = fields[`spellRange${n}`];
      const duration = fields[`spellDuration${n}`];
      const parts = [time, range, duration].filter(Boolean).join(', ');
      lines.push(`${prepared ? '[Prepared] ' : ''}${fields[key]}${source ? ` (${source})` : ''}${parts ? ` — ${parts}` : ''}`);
      count++;
    }
  }
  return { text: lines.join('\n').trim(), count };
}

function spellcastingSection(fields) {
  const spells = buildSpellsText(fields);
  return {
    fields: {
      'Spellcasting Ability': get(fields, 'spellCastingAbility0') || '',
      'Spell Save DC': get(fields, 'spellSaveDC0') || '',
      'Spell Attack Bonus': parseSignedInt(get(fields, 'spellAtkBonus0')),
      Spells: spells.text,
    },
    count: spells.count,
  };
}

function featuresAndTraitsText(fields) {
  const parts = [];
  for (let i = 1; i <= 20; i++) {
    const text = fields[`FeaturesTraits${i}`];
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

function equipmentSection(fields) {
  const rows = [];
  for (let i = 0; i <= 99; i++) {
    const name = get(fields, `Eq Name${i}`);
    if (!name) continue;
    const qty = get(fields, `Eq Qty${i}`);
    const weight = get(fields, `Eq Weight${i}`);
    const qtyPart = qty && qty !== '1' ? ` x${qty}` : '';
    const weightPart = weight && weight !== '--' ? ` (${weight})` : '';
    rows.push(`${name}${qtyPart}${weightPart}`);
  }
  const attuned = [];
  for (let i = 1; i <= 30; i++) {
    const name = get(fields, `Attuned Name${i}`);
    if (name) attuned.push(name);
  }
  const currency = ['CP', 'SP', 'EP', 'GP', 'PP']
    .map((k) => `${get(fields, k) || '0'} ${k}`)
    .join(', ');
  return {
    fields: {
      Equipment: rows.join('\n') + (attuned.length ? `\n\nAttuned: ${attuned.join(', ')}` : ''),
      'Currency (CP/SP/EP/GP/PP)': currency,
      'Weight Carried': get(fields, 'Weight Carried') || '',
    },
    count: rows.length + attuned.length,
  };
}

function characterInfoSection(fields) {
  // A handful of real PDF fields (Appearance/Allies & Organizations/
  // Additional Notes, plus basic bio like Age/Height/Eyes/Hair) have no
  // dedicated slot in this app's own template (phase 1 deliberately kept
  // Character Info to the fields listed there) — folded into Backstory
  // as labeled paragraphs instead of silently dropped, same "don't lose
  // real exported content" posture this app's migration layer already
  // holds itself to elsewhere, even though this isn't formal migration.
  const bioBits = ['GENDER', 'AGE', 'SIZE', 'HEIGHT', 'WEIGHT', 'FAITH', 'SKIN', 'EYES', 'HAIR']
    .map((k) => {
      const v = get(fields, k);
      return v ? `${k.charAt(0)}${k.slice(1).toLowerCase()}: ${v}` : null;
    })
    .filter(Boolean)
    .join(', ');
  const extras = [];
  if (bioBits) extras.push(bioBits);
  if (get(fields, 'Appearance')) extras.push(`Appearance: ${get(fields, 'Appearance')}`);
  if (get(fields, 'AlliesOrganizations')) extras.push(`Allies & Organizations: ${get(fields, 'AlliesOrganizations')}`);
  const notes = [get(fields, 'AdditionalNotes1'), get(fields, 'AdditionalNotes2')].filter(Boolean).join(' ');
  if (notes) extras.push(`Additional Notes: ${notes}`);
  const backstory = [get(fields, 'Backstory'), ...extras].filter(Boolean).join('\n\n');
  return {
    Species: get(fields, 'RACE') || '',
    Background: get(fields, 'BACKGROUND') || '',
    Alignment: get(fields, 'ALIGNMENT') || '',
    'Personality Traits': get(fields, 'PersonalityTraits') || '',
    Ideals: get(fields, 'Ideals') || '',
    Bonds: get(fields, 'Bonds') || '',
    Flaws: get(fields, 'Flaws') || '',
    Backstory: backstory,
  };
}

/** Weapon 1's own NAME field has no numeric suffix ("Wpn Name") while
 *  every other weapon's does ("Wpn Name 2", "Wpn Name 3", ...) even
 *  though its OTHER fields (AtkBonus/Damage) DO carry "1" — confirmed
 *  empirically, a genuine quirk of this one template, not a guess. */
function weaponNameKey(i) { return i === 1 ? 'Wpn Name' : `Wpn Name ${i}`; }

function attacksFromWeapons(fields) {
  const attacks = [];
  for (let i = 1; i <= 20; i++) {
    const name = get(fields, weaponNameKey(i));
    if (!name) continue;
    attacks.push({
      name,
      hit: get(fields, `Wpn${i} AtkBonus`) || '',
      damage: get(fields, `Wpn${i} Damage`) || '',
      notes: get(fields, `Wpn Notes ${i}`) || '',
    });
  }
  return attacks;
}

function buildOverview(fields) {
  // Field name has a literal double space ("CLASS  LEVEL") in the real
  // export — kept verbatim, not "corrected," since get()'s trim-based
  // fallback only helps with LEADING/TRAILING whitespace, not an
  // internal double space.
  const classLevel = get(fields, 'CLASS  LEVEL');
  const race = get(fields, 'RACE');
  const background = get(fields, 'BACKGROUND');
  return [classLevel, race, background].filter(Boolean).join(' — ');
}

/** The one exported entry point: raw {fieldName: value} (every page's
 *  annotations merged by the caller, in page order) in, this app's own
 *  dnd5e character-sheet shape out. `sections` keys match
 *  data/rulesets.js's dnd5e characterTemplate section ids; each section's
 *  own keys match that section's field `key`s exactly, so applying this
 *  onto a real entity's statblock group is a generic "look up by key, set
 *  value" operation (see entities.js's applyDnd5ePdfImport) — no
 *  per-field special-casing needed there except Hit Points' own
 *  {value, max} shape (a track field, not a plain scalar). */
export function mapDnd5ePdfFieldsToCharacterSheet(fields) {
  const spellcasting = spellcastingSection(fields);
  const equipment = equipmentSection(fields);
  const skills = skillsSection(fields);
  const attacks = attacksFromWeapons(fields);
  return {
    name: get(fields, 'CharacterName') || '',
    overview: buildOverview(fields),
    sections: {
      abilityScores: abilityScoresSection(fields),
      savingThrows: savingThrowsSection(fields),
      skills,
      combat: combatSection(fields),
      spellcasting: spellcasting.fields,
      featuresAndTraits: { 'Features & Traits': featuresAndTraitsText(fields) },
      equipment: equipment.fields,
      characterInfo: characterInfoSection(fields),
    },
    attacks,
    // Summary counts for the review-step UI — not appliable template
    // fields themselves (kept out of `sections` so the generic "look up
    // by key" apply loop never has to know to skip them).
    counts: {
      skillsWithBonus: Object.values(skills).filter((v) => v !== 0).length,
      spells: spellcasting.count,
      equipment: equipment.count,
      attacks: attacks.length,
    },
  };
}
