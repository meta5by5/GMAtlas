// shadowdarkImport.js — bring Shadowdark RPG monsters and gear in from the
// GM's own copy (direct request, 2026-11-08: "entity import of equipment and
// monsters"). Pure and DOM-free: parse text or JSON, then make entities.
//
// Nothing from the book ships with GMAtlas (it's a commercial book, owned
// under data/licenses.js's 'shadowdark' license). The GM pastes or picks:
//   - monsters, as the stat blocks read in the book: a name line, any
//     description, the stat line
//       AC 13, HP 9, ATK 1 bite +2 (1d6), MV near, S +1, D +2, C +0,
//       I -2, W +0, Ch -3, AL N, LV 2
//     (wrapped over lines or not), then its specials; or JSON
//     [{name, ac, hp, atk, mv, s, d, c, i, w, ch, al, lv, specials, description}];
//   - gear, as CSV/TSV rows `Name, Cost, Gear Slots[, Damage, Range, AC, Properties]`
//     (a header row is recognised and skipped), or JSON
//     [{name, cost, slots, damage, range, ac, properties, description}].
// Monsters become Lifeform entities with the 'shadowdark-lifeform'
// statblock; gear becomes Item entities with the 'shadowdark' gear
// statblock. Names already in the campaign are skipped, so re-importing
// is safe.

import { createEntity, listEntities } from './entities.js';
import { makeStatblock } from './statblocks.js';

const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const mod = (s) => { const m = /^([+-−–]?)\s*(\d+)$/.exec(clean(s)); if (!m) return 0; const n = Number(m[2]); return m[1] && m[1] !== '+' ? -n : n; };
const int = (s) => { const n = parseInt(clean(s), 10); return Number.isFinite(n) ? n : 0; };

// --- monsters ----------------------------------------------------------------

const STAT_START = /\bAC\s*\d+/i;
const STAT_END = /\bLV\s*\d+/i;

/** One stat line's fields, or null if it isn't one. */
export function parseStatLine(line) {
  const t = clean(line).replace(/[−–]/g, '-');
  if (!STAT_START.test(t) || !/\bHP\s*\d+/i.test(t)) return null;
  const grab = (re) => { const m = re.exec(t); return m ? clean(m[1]) : ''; };
  return {
    ac: grab(/\bAC\s*([^,]+?)(?=,\s*HP\b)/i) || grab(/\bAC\s*(\d+)/i),
    hp: int(grab(/\bHP\s*(\d+)/i)),
    atk: grab(/\bATK\s*(.+?)(?=,\s*MV\b)/i),
    mv: grab(/\bMV\s*(.+?)(?=,\s*S\s*[+-]?\d)/i),
    s: mod(grab(/(?:^|,)\s*S\s*([+-]?\s*\d+)/i)),
    d: mod(grab(/(?:^|,)\s*D\s*([+-]?\s*\d+)/i)),
    c: mod(grab(/(?:^|,)\s*C\s*([+-]?\s*\d+)/i)),
    i: mod(grab(/(?:^|,)\s*I\s*([+-]?\s*\d+)/i)),
    w: mod(grab(/(?:^|,)\s*W\s*([+-]?\s*\d+)/i)),
    ch: mod(grab(/(?:^|,)\s*Ch\s*([+-]?\s*\d+)/i)),
    al: grab(/\bAL\s*([A-Za-z]+)/i).toUpperCase(),
    lv: int(grab(/\bLV\s*(\d+)/i)),
  };
}

const looksLikeName = (line) => {
  const t = clean(line);
  return t.length > 1 && t.length <= 48 && /[A-Za-z]/.test(t) && t === t.toUpperCase() && !STAT_START.test(t);
};
const titleCase = (s) => clean(s).toLowerCase().replace(/(^|[\s,'(-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

/** Monsters from pasted stat-block text: [{name, description, specials, ...stats}]. */
export function parseMonsterText(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim());
  // Each stat line, joined across wraps until its LV.
  const stats = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!STAT_START.test(lines[i]) || !(/\bHP\s*\d+/i.test(lines.slice(i, i + 4).join(' ')))) continue;
    let end = i;
    let joined = lines[i];
    while (!STAT_END.test(joined) && end + 1 < lines.length && end - i < 4) { end += 1; joined += ` ${lines[end]}`; }
    const parsed = parseStatLine(joined);
    if (parsed) { stats.push({ start: i, end, parsed }); i = end; }
  }
  const out = [];
  stats.forEach((s, n) => {
    const floor = n ? stats[n - 1].end + 1 : 0;
    // The name: the nearest all-caps line above (the book's style), else
    // the first line of this block.
    let nameAt = -1;
    for (let k = s.start - 1; k >= floor; k -= 1) if (looksLikeName(lines[k])) { nameAt = k; break; }
    if (nameAt < 0) { for (let k = floor; k < s.start; k += 1) if (lines[k]) { nameAt = k; break; } }
    const name = nameAt >= 0 ? (looksLikeName(lines[nameAt]) ? titleCase(lines[nameAt]) : clean(lines[nameAt])) : `Monster ${n + 1}`;
    const description = nameAt >= 0 ? clean(lines.slice(nameAt + 1, s.start).join(' ')) : '';
    // Specials: from after the stat line to just before the next monster's name.
    const next = stats[n + 1];
    let stop = next ? next.start : lines.length;
    if (next) { for (let k = next.start - 1; k > s.end; k -= 1) if (looksLikeName(lines[k])) { stop = k; break; } }
    const specials = lines.slice(s.end + 1, stop).filter(Boolean).join('\n');
    out.push({ name, description, specials, ...s.parsed });
  });
  return out;
}

function monsterFromJson(o) {
  if (!o || typeof o !== 'object' || !clean(o.name)) return null;
  const pick = (...keys) => { for (const k of keys) if (o[k] != null && o[k] !== '') return o[k]; return ''; };
  return {
    name: clean(o.name), description: clean(pick('description', 'desc')), specials: String(pick('specials', 'traits', 'abilities')).trim(),
    ac: clean(pick('ac', 'armorClass')), hp: int(pick('hp', 'hitPoints')), atk: clean(pick('atk', 'attacks', 'attack')), mv: clean(pick('mv', 'movement', 'move')),
    s: mod(pick('s', 'str')), d: mod(pick('d', 'dex')), c: mod(pick('c', 'con')), i: mod(pick('i', 'int')), w: mod(pick('w', 'wis')), ch: mod(pick('ch', 'cha')),
    al: clean(pick('al', 'alignment')).toUpperCase(), lv: int(pick('lv', 'level')),
  };
}

// --- gear --------------------------------------------------------------------

function splitRow(line) {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes('|')) return line.split('|');
  const cells = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

/** Gear from CSV/TSV rows: [{name, cost, slots, damage, range, ac, properties}]. */
export function parseGearText(text) {
  const rows = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => splitRow(l).map(clean));
  if (rows.length && /name|item/i.test(rows[0][0] || '') && /cost|price/i.test(rows[0].join(' '))) rows.shift();
  return rows.filter((r) => r[0]).map((r) => ({ name: r[0], cost: r[1] || '', slots: r[2] || '', damage: r[3] || '', range: r[4] || '', ac: r[5] || '', properties: r.slice(6).filter(Boolean).join(', ') }));
}

function gearFromJson(o) {
  if (!o || typeof o !== 'object' || !clean(o.name)) return null;
  return { name: clean(o.name), cost: clean(o.cost), slots: clean(o.slots != null ? o.slots : o.gearSlots), damage: clean(o.damage), range: clean(o.range), ac: clean(o.ac), properties: clean(o.properties), description: clean(o.description) };
}

/** Either kind, from text or JSON. `kind`: 'monsters' | 'gear'. */
export function parseShadowdark(text, kind) {
  const raw = String(text || '').trim();
  if (raw.startsWith('[') || raw.startsWith('{')) {
    let data;
    try { data = JSON.parse(raw); } catch { return { items: [], error: 'That isn’t valid JSON.' }; }
    const list = Array.isArray(data) ? data : (data && Array.isArray(data[kind]) ? data[kind] : []);
    const items = list.map(kind === 'gear' ? gearFromJson : monsterFromJson).filter(Boolean);
    return { items, error: items.length ? null : `No ${kind} found in that JSON.` };
  }
  const items = kind === 'gear' ? parseGearText(raw) : parseMonsterText(raw);
  return { items, error: items.length ? null : (kind === 'gear' ? 'No gear rows found (expected “Name, Cost, Gear Slots, …”).' : 'No stat blocks found (expected a line like “AC 13, HP 9, ATK …, MV …, S +1, … LV 2”).') };
}

// --- making entities -----------------------------------------------------------

function setField(group, key, value) {
  const f = group.fields.find((x) => x.key === key);
  if (!f) return;
  if (f.track) { const v = Math.max(0, Number(value) || 0); f.max = Math.max(f.max || 0, v); f.value = v; } else f.value = value;
}

/** Adds the parsed monsters (Lifeform entities) or gear (Item entities) to
 *  the campaign, skipping names it already has of that type. Returns
 *  {campaign, added, skipped}. */
export function importShadowdark(campaign, items, kind, settings) {
  const type = kind === 'gear' ? 'item' : 'lifeform';
  const have = new Set(listEntities(campaign, [type]).map((e) => clean(e.name).toLowerCase()));
  let next = campaign;
  let added = 0;
  const skipped = [];
  for (const it of items || []) {
    const key = clean(it.name).toLowerCase();
    if (!key || have.has(key)) { skipped.push(it.name); continue; }
    have.add(key);
    const made = createEntity(next, { type, name: clean(it.name) });
    next = made.campaign;
    const e = next.entities.items.find((x) => x.id === made.id);
    e.tags = kind === 'gear' ? ['shadowdark', 'gear'] : ['shadowdark'];
    e.overview = clean(it.description);
    if (kind === 'gear') {
      const g = makeStatblock('gear', 'shadowdark');
      setField(g, 'Cost', it.cost); setField(g, 'Gear Slots', it.slots); setField(g, 'Damage', it.damage);
      setField(g, 'Range', it.range); setField(g, 'Armor Class', it.ac); setField(g, 'Properties', it.properties);
      e.statblocks = [g];
    } else {
      const g = makeStatblock('npc', null, 'shadowdark-lifeform', settings || next.settings);
      setField(g, 'Armor Class', it.ac); setField(g, 'Hit Points', it.hp); setField(g, 'Attacks', it.atk); setField(g, 'Movement', it.mv);
      setField(g, 'STR', it.s); setField(g, 'DEX', it.d); setField(g, 'CON', it.c); setField(g, 'INT', it.i); setField(g, 'WIS', it.w); setField(g, 'CHA', it.ch);
      setField(g, 'Alignment', it.al); setField(g, 'Level', it.lv); setField(g, 'Specials', it.specials);
      e.statblocks = [g];
    }
    added += 1;
  }
  return { campaign: next, added, skipped };
}
