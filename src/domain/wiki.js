// wiki.js — the campaign wiki's pure half (design/WIKI-ROADMAP.md W1).
//
// The wiki adds no storage of its own. A page is an entity read through
// pageFor(); what links to it is derived (mentionIndex), never stored, so it
// can't go stale and costs nothing to sync (roadmap decision 3.2). Mentions
// stay name-based: `@Name`, `@[Name]`, `@[shown|Name]`, and the wiki's
// `[[Name]]` / `[[Name|shown]]`, which mean the same thing (decision 3.4). A
// rename rewrites every mention of the old name and keeps it as an alias
// (decision 3.5).

import {
  getEntity, findByName, listEntities, parseMentions, getContainingLocation, getContainedLocations,
  RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABEL, entityTypeLabel,
} from './entities.js';
import { findDocumentTabByTitle } from './documents.js';
import { findMapByName } from './mapMentions.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
const lower = (s) => String(s || '').trim().toLowerCase();

/** What kind of place a Location is (roadmap decision 3.3). Optional: a
 *  location without one is just a location. */
export const PLACE_KINDS = ['region', 'hex', 'site', 'building', 'floor', 'dungeon', 'level', 'room', 'other'];
export const PLACE_KIND_LABEL = {
  region: 'Region', hex: 'Hex', site: 'Site', building: 'Building', floor: 'Floor',
  dungeon: 'Dungeon', level: 'Level', room: 'Room', other: 'Other',
};

/** Who can see an entity's page. Everything is GM-only until set otherwise,
 *  which is what every campaign has today (roadmap decision 3.6). */
export const VISIBILITY = ['gm', 'players'];
export function entityVisibility(entity) {
  return entity && entity.visibility === 'players' ? 'players' : 'gm';
}

// --- link syntax --------------------------------------------------------------

const WIKI_LINK_RE = /\[\[([^\[\]\n]+?)\]\]/g;

/** `[[Name]]` and `[[Name|shown text]]`, as `{name, label}` (the target comes
 *  first here, the reverse of `@[shown|Name]`). */
export function parseWikiLinkRefs(text) {
  const out = [];
  const re = new RegExp(WIKI_LINK_RE.source, 'g');
  let m;
  while ((m = re.exec(String(text || '')))) {
    const inner = m[1];
    const i = inner.indexOf('|');
    const name = (i < 0 ? inner : inner.slice(0, i)).trim();
    const label = i < 0 ? null : inner.slice(i + 1).trim() || null;
    if (name) out.push({ name, label });
  }
  return out;
}

export function parseWikiLinks(text) {
  return parseWikiLinkRefs(text).map((r) => r.name);
}

/** Every name a text links to, by either syntax, in order. */
export function linkedNames(text) {
  const s = String(text || '');
  if (!s.includes('@') && !s.includes('[[')) return [];
  return [...parseMentions(s), ...parseWikiLinks(s)];
}

/** What a linked name points at: an entity (by name, then alias), then a
 *  document, then a map — the same order mentions already resolve in.
 *  Null means a red link. */
export function resolveLink(campaign, name) {
  const key = String(name || '').trim();
  if (!key) return null;
  const e = findByName(campaign, key);
  if (e) return { kind: 'entity', id: e.id, name: e.name };
  const d = findDocumentTabByTitle(campaign, key);
  if (d) return { kind: 'document', tabKey: d.tabKey, name: d.title };
  const m = findMapByName(campaign, key);
  if (m) return { kind: 'map', tabKey: m.tabKey, mapType: m.mapType, mapId: m.mapId, name: m.title };
  return null;
}

// --- every text that can hold a link -----------------------------------------
// Each source names where its text lives, so "Linked from" can say where and
// the UI can open it. `visit(source, holder, key)` is called once per string.

const SKIP_KEYS = new Set(['id', 'type', 'createdAt', 'updatedAt', 'tags', 'aliases', 'relationships', 'visibility', 'placeKind', 'kind', 'blobKey', 'mimeType', 'thumbDataUrl', 'originalDataUrl']);

function walkStrings(value, visit, skip) {
  if (!value || typeof value !== 'object') return;
  const keys = Array.isArray(value) ? value.keys() : Object.keys(value);
  for (const k of keys) {
    if (!Array.isArray(value) && (SKIP_KEYS.has(k) || (skip && skip.has(k)) || /Ids?$/.test(k))) continue;
    const v = value[k];
    if (typeof v === 'string') { if (v && !v.startsWith('data:')) visit(value, k); } else if (v && typeof v === 'object') walkStrings(v, visit, null);
  }
}

const NAME_ONLY = new Set(['name']);
const TITLE_ONLY = new Set(['title']);

function eachTextSource(campaign, visit) {
  for (const e of listEntities(campaign)) {
    const src = { kind: 'entity', id: e.id, label: e.name || 'Unnamed' };
    walkStrings(e, (h, k) => visit(src, h, k), NAME_ONLY);
  }
  for (const j of campaign.journal || []) {
    if (typeof j.text === 'string') visit({ kind: 'journal', id: j.id, label: `Journal · ${String(j.createdAt || '').slice(0, 10)}`, createdAt: j.createdAt || '' }, j, 'text');
  }
  for (const s of campaign.scenes || []) {
    const src = { kind: 'scene', id: s.id, label: s.number ? `Scene ${s.number}` : 'Scene' };
    walkStrings(s, (h, k) => visit(src, h, k), null);
  }
  if (campaign.context) {
    const src = { kind: 'composer', id: 'context', label: 'Composer' };
    walkStrings(campaign.context, (h, k) => visit(src, h, k), null);
  }
  for (const t of campaign.threads || []) {
    const src = { kind: 'thread', id: t.id, label: t.name || 'Thread' };
    walkStrings(t, (h, k) => visit(src, h, k), NAME_ONLY);
  }
  for (const d of (campaign.guide && campaign.guide.docs) || []) {
    if (typeof d.text === 'string') visit({ kind: 'guide', id: d.id, label: d.title || 'Guide' }, d, 'text');
  }
  for (const d of (campaign.documents && campaign.documents.library) || []) {
    if (d.kind !== 'file' && typeof d.content === 'string') visit({ kind: 'document', id: d.id, label: d.title || 'Document' }, d, 'content');
  }
  for (const m of (campaign.hexcrawls && campaign.hexcrawls.maps) || []) {
    for (const [k, hex] of Object.entries(m.hexes || {})) {
      if (hex && typeof hex.notes === 'string') {
        const [q, r] = k.split(',').map(Number);
        visit({ kind: 'hex', id: `${m.id}:${k}`, mapId: m.id, q, r, label: `${m.name || 'Hexcrawl'} · hex ${k}` }, hex, 'notes');
      }
    }
  }
  for (const m of (campaign.dungeonCrawls && campaign.dungeonCrawls.maps) || []) {
    for (const [k, tile] of Object.entries(m.tiles || {})) {
      if (tile && typeof tile.notes === 'string') {
        const [x, y] = k.split(',').map(Number);
        visit({ kind: 'tile', id: `${m.id}:${k}`, mapId: m.id, x, y, label: `${m.name || 'Dungeon'} · tile ${k}` }, tile, 'notes');
      }
    }
  }
  for (const m of (campaign.battlemaps && campaign.battlemaps.maps) || []) {
    for (const icon of m.icons || []) {
      if (typeof icon.note === 'string') visit({ kind: 'battlemap', id: `${m.id}:${icon.id}`, mapId: m.id, label: `${m.name || 'Battlemap'} · ${icon.label || 'marker'}` }, icon, 'note');
    }
  }
}

/** Entity id -> the places that link to it, one entry per source (an entity
 *  never lists itself). Each entry: the source ({kind, id, label, ...}) plus
 *  `fields`, the keys within it that hold the link. */
export function mentionIndex(campaign) {
  const byName = new Map();
  const resolve = (name) => {
    const k = lower(name);
    if (!byName.has(k)) { const e = findByName(campaign, name); byName.set(k, e ? e.id : null); }
    return byName.get(k);
  };
  const out = new Map();
  eachTextSource(campaign, (src, holder, key) => {
    for (const name of linkedNames(holder[key])) {
      const id = resolve(name);
      if (!id || (src.kind === 'entity' && src.id === id)) continue;
      if (!out.has(id)) out.set(id, new Map());
      const bySrc = out.get(id);
      const sk = `${src.kind}:${src.id}`;
      if (!bySrc.has(sk)) bySrc.set(sk, { ...src, fields: [] });
      const rec = bySrc.get(sk);
      if (!rec.fields.includes(key)) rec.fields.push(key);
    }
  });
  return new Map([...out].map(([id, m]) => [id, [...m.values()]]));
}

/** Just one entity's backlinks. */
export function linkedFrom(campaign, id, index) {
  return (index || mentionIndex(campaign)).get(id) || [];
}

/** Every linked name in the campaign that resolves to nothing at all — the
 *  red links, with where each one is. */
export function unresolvedLinks(campaign) {
  const out = new Map();
  eachTextSource(campaign, (src, holder, key) => {
    for (const name of linkedNames(holder[key])) {
      if (resolveLink(campaign, name)) continue;
      const k = lower(name);
      if (!out.has(k)) out.set(k, { name, sources: [] });
      const rec = out.get(k);
      if (!rec.sources.some((s) => s.kind === src.kind && s.id === src.id)) rec.sources.push(src);
    }
  });
  return [...out.values()];
}

// --- rename -------------------------------------------------------------------

const BARE_NAME = /^[A-Za-z0-9_''-]+$/;

/** `text` with every link to `oldName` pointed at `newName` instead, keeping
 *  each link's own shown text and page anchor. Matching ignores case, like
 *  every other mention lookup. */
export function rewriteLinks(text, oldName, newName) {
  const s = String(text || '');
  const from = lower(oldName);
  const to = String(newName || '').trim();
  if (!from || !to || (!s.includes('@') && !s.includes('[['))) return s;
  let out = s.replace(/@\[([^\]]+)\]/g, (whole, inner) => {
    const bar = inner.indexOf('|');
    const label = bar < 0 ? null : inner.slice(0, bar);
    const target = bar < 0 ? inner : inner.slice(bar + 1);
    const m = target.match(/^(.*?)(\s*(?:#|p\.?)\s*\d+)$/i);
    const base = m && m[1].trim() ? m[1] : target;
    const anchor = m && m[1].trim() ? m[2] : '';
    if (lower(base) !== from) return whole;
    return `@[${label !== null ? `${label}|` : ''}${to}${anchor}]`;
  });
  if (BARE_NAME.test(from)) {
    out = out.replace(/(^|[^\w@[\]])@([A-Za-z0-9_''-]+)/g, (whole, pre, name) => (
      lower(name) === from ? `${pre}${BARE_NAME.test(to) ? `@${to}` : `@[${to}]`}` : whole));
  }
  out = out.replace(/\[\[([^\[\]\n]+?)\]\]/g, (whole, inner) => {
    const bar = inner.indexOf('|');
    const target = bar < 0 ? inner : inner.slice(0, bar);
    if (lower(target) !== from) return whole;
    return `[[${to}${bar < 0 ? '' : inner.slice(bar)}]]`;
  });
  return out;
}

/** Rename an entity and every link to it, in one new campaign. The old name
 *  becomes an alias, so text written with it later still resolves. Links
 *  are only rewritten while the old name actually means this entity (not
 *  when another entity has that name). */
export function renameEntityEverywhere(campaign, id, newName) {
  const current = getEntity(campaign, id);
  const to = String(newName || '').trim();
  if (!current) return campaign;
  const from = String(current.name || '').trim();
  const next = clone(campaign);
  const e = getEntity(next, id);
  e.name = newName;
  if (!from || !to || lower(from) === lower(to)) return next;
  const owner = findByName(campaign, from);
  if (owner && owner.id === id) {
    eachTextSource(next, (_src, holder, key) => {
      const v = holder[key];
      const r = rewriteLinks(v, from, to);
      if (r !== v) holder[key] = r;
    });
  }
  const aliases = (Array.isArray(e.aliases) ? e.aliases : []).filter((a) => lower(a) !== lower(to));
  if (!aliases.some((a) => lower(a) === lower(from))) aliases.push(from);
  e.aliases = aliases;
  return next;
}

// --- page fields ----------------------------------------------------------------

/** Replace an entity's aliases from a comma- or line-separated text. Its own
 *  name and duplicates are dropped. */
export function setEntityAliases(campaign, id, text) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (!e) return campaign;
  const seen = new Set([lower(e.name)]);
  const list = (Array.isArray(text) ? text : String(text || '').split(/[,\n]/)).map((a) => String(a || '').trim()).filter(Boolean);
  e.aliases = list.filter((a) => (seen.has(lower(a)) ? false : (seen.add(lower(a)), true)));
  return next;
}

export function setEntityVisibility(campaign, id, visibility) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (!e || !VISIBILITY.includes(visibility)) return campaign;
  e.visibility = visibility;
  return next;
}

/** A location's place kind; '' clears it. Other types are left alone. */
export function setPlaceKind(campaign, id, kind) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (!e || e.type !== 'location') return campaign;
  if (!kind) delete e.placeKind;
  else if (PLACE_KINDS.includes(kind)) e.placeKind = kind;
  else return campaign;
  return next;
}

// The short facts shown in a page's infobox, by type. Data, so a genre pack
// or later phase can extend it without touching the page code.
const INFOBOX_FIELDS = {
  npc: [['currentGoal', 'Current goal']],
  faction: [['agenda', 'Agenda'], ['leadership', 'Leadership'], ['hq', 'HQ'], ['force', 'Force'], ['cunning', 'Cunning'], ['wealth', 'Wealth']],
  location: [['objectType', 'Kind of world'], ['biome', 'Biome'], ['developmentLevel', 'Development'], ['population', 'Population'], ['techLevel', 'Tech level'], ['starport', 'Starport']],
  conflict: [['status', 'Status'], ['statedCause', 'Stated cause']],
};

/** Everything a wiki page shows for one entity, or null. `index` (from
 *  mentionIndex) can be passed in when rendering several pages at once. */
export function pageFor(campaign, id, { index } = {}) {
  const e = getEntity(campaign, id);
  if (!e) return null;
  const genre = campaign.settings && campaign.settings.genrePack;
  const infobox = [];
  if (e.type === 'location' && e.placeKind) infobox.push({ key: 'placeKind', label: 'Place', value: PLACE_KIND_LABEL[e.placeKind] || e.placeKind });
  for (const [key, label] of INFOBOX_FIELDS[e.type] || []) {
    const v = e[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') infobox.push({ key, label, value: String(v) });
  }

  const breadcrumb = [];
  if (e.type === 'location') {
    const seen = new Set([e.id]);
    let p = getContainingLocation(campaign, e.id);
    while (p && !seen.has(p.id)) { breadcrumb.unshift({ id: p.id, name: p.name || 'Unnamed' }); seen.add(p.id); p = getContainingLocation(campaign, p.id); }
  }
  // What a place contains: other places are its children; anyone or
  // anything else located there is listed as "here".
  const contained = e.type === 'location' ? getContainedLocations(campaign, e.id) : [];
  const children = contained.filter((c) => c.type === 'location').map((c) => ({ id: c.id, name: c.name || 'Unnamed', placeKind: c.placeKind || null }));
  const here = contained.filter((c) => c.type !== 'location').map((c) => ({ id: c.id, name: c.name || 'Unnamed', type: c.type }));

  const groups = new Map();
  for (const r of e.relationships || []) {
    const other = getEntity(campaign, r.to);
    if (!other) continue;
    const t = RELATIONSHIP_TYPES.includes(r.type) ? r.type : 'linked';
    if (!groups.has(t)) groups.set(t, { type: t, label: RELATIONSHIP_TYPE_LABEL[t] || t, items: [] });
    groups.get(t).items.push({ id: other.id, name: other.name || 'Unnamed', type: other.type, label: r.label || '' });
  }
  const relations = RELATIONSHIP_TYPES.filter((t) => groups.has(t)).map((t) => groups.get(t));

  const from = linkedFrom(campaign, id, index);
  const sessions = from.filter((s) => s.kind === 'journal').sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  return {
    id: e.id,
    name: e.name || 'Unnamed',
    type: e.type,
    typeLabel: entityTypeLabel(e.type, genre),
    aliases: Array.isArray(e.aliases) ? [...e.aliases] : [],
    visibility: entityVisibility(e),
    placeKind: e.type === 'location' ? (e.placeKind || null) : null,
    infobox,
    breadcrumb,
    children,
    here,
    relations,
    linkedFrom: from,
    sessions,
  };
}

// --- reading: GM blocks, [[ ]] display, the player-safe lens (W2) ---------------

const GM_OPEN = /^\s*:::\s*gm\s*$/i;
const GM_CLOSE = /^\s*:::\s*$/;

/** A text split into runs, each `{gm, text}`. `:::gm` on a line of its own
 *  opens a GM-only block and `:::` closes it; an unclosed block runs to the
 *  end (so a forgotten close hides more, never less). */
export function splitGmBlocks(text) {
  const out = [];
  let gm = false;
  let buf = [];
  const flush = () => { if (buf.length) out.push({ gm, text: buf.join('\n') }); buf = []; };
  for (const line of String(text || '').split('\n')) {
    if (!gm && GM_OPEN.test(line)) { flush(); gm = true; continue; }
    if (gm && GM_CLOSE.test(line)) { flush(); gm = false; continue; }
    buf.push(line);
  }
  flush();
  return out.filter((r) => r.text.trim() !== '' || r.gm);
}

/** `text` without its GM-only blocks. */
export function stripGmBlocks(text) {
  return splitGmBlocks(text).filter((r) => !r.gm).map((r) => r.text).join('\n').trim();
}

/** `[[Name]]` / `[[Name|shown]]` written as the equivalent `@[Name]` /
 *  `@[shown|Name]`, so one renderer draws both kinds of link. */
export function wikiLinksToMentions(text) {
  return String(text || '').replace(/\[\[([^\[\]\n]+?)\]\]/g, (whole, inner) => {
    const bar = inner.indexOf('|');
    const name = (bar < 0 ? inner : inner.slice(0, bar)).trim();
    const shown = bar < 0 ? '' : inner.slice(bar + 1).trim();
    if (!name) return whole;
    return shown && lower(shown) !== lower(name) ? `@[${shown}|${name}]` : `@[${name}]`;
  });
}

function shownText(inner, wiki) {
  const bar = inner.indexOf('|');
  if (bar < 0) return inner.replace(/\s*(?:#|p\.?)\s*\d+$/i, '').trim();
  return (wiki ? inner.slice(bar + 1) : inner.slice(0, bar)).trim();
}

/** `text` with every link to something a player can't open turned into its
 *  plain shown text: GM-only entities, documents, maps and red links. Links
 *  to pages shared with players stay links. */
export function unlinkHidden(campaign, text) {
  const shared = (name) => { const e = findByName(campaign, name); return !!e && entityVisibility(e) === 'players'; };
  return String(text || '')
    .replace(/\[\[([^\[\]\n]+?)\]\]/g, (whole, inner) => {
      const bar = inner.indexOf('|');
      return shared((bar < 0 ? inner : inner.slice(0, bar)).trim()) ? whole : shownText(inner, true);
    })
    .replace(/@\[([^\]]+)\]/g, (whole, inner) => (shared(parseMentions(whole)[0] || '') ? whole : shownText(inner, false)))
    .replace(/(^|[^\w@[\]])@([A-Za-z0-9_''-]+)/g, (whole, pre, name) => (shared(name) ? whole : `${pre}${name}`));
}

// Facts a player may see in an infobox. A whitelist: anything not named
// here (agendas, goals, causes, secrets) stays with the GM.
const PLAYER_INFOBOX_KEYS = new Set(['placeKind', 'objectType', 'biome', 'developmentLevel', 'population', 'techLevel', 'starport', 'leadership', 'hq', 'status']);

/** The one way any player-facing copy of a page is made (roadmap decision
 *  3.6): the Player View, and later markdown export, Drive sharing and S5
 *  tables. Null when the page isn't shared with players. Built from a
 *  whitelist, so a GM field added later stays hidden until listed here:
 *  name, type, place kind, the player-known `overview` without its GM
 *  blocks or links to hidden pages, public infobox facts, and only those
 *  places, occupants and relations that are themselves shared. Relationship
 *  notes, `revealed`, GM notes, aliases and backlinks are never included. */
export function playerSafe(campaign, id) {
  const e = getEntity(campaign, id);
  if (!e || entityVisibility(e) !== 'players') return null;
  const page = pageFor(campaign, id, { index: new Map() });
  const shared = (x) => { const o = getEntity(campaign, x.id); return !!o && entityVisibility(o) === 'players'; };
  const relations = page.relations
    .map((g) => ({ type: g.type, label: g.label, items: g.items.filter(shared).map((i) => ({ id: i.id, name: i.name, type: i.type })) }))
    .filter((g) => g.items.length);
  return {
    id: page.id,
    name: page.name,
    type: page.type,
    typeLabel: page.typeLabel,
    placeKind: page.placeKind,
    overview: unlinkHidden(campaign, stripGmBlocks(e.overview || '')),
    infobox: page.infobox.filter((f) => PLAYER_INFOBOX_KEYS.has(f.key)),
    breadcrumb: page.breadcrumb.filter(shared),
    children: page.children.filter(shared),
    here: page.here.filter(shared),
    relations,
  };
}

/** The Wiki panel's list: every page matching `search` (name, alias or tag)
 *  and `type`, sorted by name, each with how many places link to it. */
export function wikiIndex(campaign, { search = '', type = '' } = {}) {
  const q = lower(search);
  const index = mentionIndex(campaign);
  return listEntities(campaign)
    .filter((e) => !type || e.type === type)
    .filter((e) => !q || [e.name, ...(e.aliases || []), ...(e.tags || [])].some((s) => lower(s).includes(q)))
    .map((e) => ({
      id: e.id,
      name: e.name || 'Unnamed',
      type: e.type,
      placeKind: e.type === 'location' ? (e.placeKind || null) : null,
      visibility: entityVisibility(e),
      linkCount: (index.get(e.id) || []).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
