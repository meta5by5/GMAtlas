// oracles.js — the roll engine, as pure functions. Lifted and cleaned from
// v0.53's app.js. No DOM, no globals. Deterministic when given a seeded RNG,
// which is what makes it testable.

import { SCENE_TABLES } from '../data/tables.js';
import { ORACLE_GROUPS, GROUP_ALIASES } from '../data/oracleGroups.js';
import { findGenrePack } from '../data/genrePacks.js';

export { SCENE_TABLES };

/** Mulberry32 — a tiny deterministic PRNG for reproducible rolls/tests. */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Resolve a table by path, e.g. getTable(tables, "Core Oracles", "Action"). */
export function getTable(tables, ...path) {
  return path.reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), tables);
}

/** Flatten a nested table object into leaf arrays with their paths. */
export function flattenKeys(obj, path = []) {
  let rows = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) rows.push({ path: [...path, key], key, values: value });
    else if (value && typeof value === 'object') rows = rows.concat(flattenKeys(value, [...path, key]));
  }
  return rows;
}

/** Roll a single table (array leaf) at a path. Returns a structured result. */
export function rollTable(tables, path, rng = Math.random) {
  const values = getTable(tables, ...path);
  if (!Array.isArray(values)) return { path, result: null, error: 'not a table' };
  return { path, result: pick(values, rng) };
}

/** Roll every leaf table within a group, returning one line per leaf. */
export function rollGroup(tables, path, rng = Math.random) {
  const group = getTable(tables, ...path);
  if (!group || typeof group !== 'object') return { path, lines: [] };
  const leaves = flattenKeys(group, path);
  const prefix = commonPathPrefix(leaves.map((l) => l.path));
  const base = prefix.length ? prefix : path;
  const lines = leaves.map((l) => ({
    label: l.path.slice(base.length).join(' > ') || l.key,
    result: pick(l.values, rng),
  }));
  return { path: base, lines };
}

export function commonPathPrefix(paths) {
  if (!paths.length) return [];
  const prefix = [];
  for (let i = 0; i < paths[0].length; i++) {
    const v = paths[0][i];
    if (paths.every((p) => p[i] === v)) prefix.push(v);
    else break;
  }
  return prefix;
}

/** A friendly one-line string for a table roll (for journal/oracle output). */
export function formatRoll(roll) {
  if (roll.lines) return `${roll.path.join(' > ')}\n${roll.lines.map((l) => `${l.label}: ${l.result}`).join('\n')}`;
  return `${roll.path.join(' > ')}\n${roll.result}`;
}

/**
 * Merge user overrides onto the active genre pack's base tables (Phase 9:
 * `genrePackId` selects which SCENE_TABLES-shaped set — see
 * data/genrePacks.js — defaults to 'hostile' so every pre-Phase-9 call
 * site/campaign keeps working unchanged).
 */
export function tablesWithOverrides(overrides = {}, genrePackId) {
  const base = findGenrePack(genrePackId).tables;
  if (!overrides || !Object.keys(overrides).length) return base;
  const clone = structuredCloneSafe(base);
  for (const [key, values] of Object.entries(overrides)) {
    if (!Array.isArray(values)) continue;
    const path = key.split('>');
    let node = clone;
    for (let i = 0; i < path.length - 1; i++) {
      if (!node[path[i]] || typeof node[path[i]] !== 'object') node[path[i]] = {};
      node = node[path[i]];
    }
    node[path[path.length - 1]] = values;
  }
  return clone;
}

function structuredCloneSafe(o) {
  try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); }
}

// --- Oracle table editor (Phase 8) -----------------------------------------
// Builds on the override mechanism above rather than adding a second one:
// editing a table just writes a full replacement array to
// campaign.oracles.overrides[path.join('>')], the same shape
// tablesWithOverrides() already reads (and rollOracle() in session.js
// already rolls against). "Reset" is just deleting that key, reverting to
// the shipped SCENE_TABLES entries — nothing is migrated or duplicated.
function ensureOracles(campaign) {
  if (!campaign.oracles || typeof campaign.oracles !== 'object') campaign.oracles = { overrides: {}, usage: {} };
  if (!campaign.oracles.overrides || typeof campaign.oracles.overrides !== 'object') campaign.oracles.overrides = {};
  return campaign.oracles;
}

/** The entries a table path currently rolls against — the override array if
 *  one exists, else the shipped default. Path is an array, e.g. ['Missions',
 *  'Patron']. */
export function currentTableEntries(campaign, path) {
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  const values = getTable(tables, ...path);
  return Array.isArray(values) ? values.slice() : [];
}

/** Whether a table path has a saved override (vs. still reading the shipped
 *  default) — powers the editor's "↺ Reset" button, which only makes sense
 *  to show once something has actually been changed. */
export function hasOracleOverride(campaign, path) {
  const overrides = (campaign.oracles && campaign.oracles.overrides) || {};
  return Object.prototype.hasOwnProperty.call(overrides, path.join('>'));
}

export function addOracleEntry(campaign, path, value) {
  const next = structuredCloneSafe(campaign);
  const oracles = ensureOracles(next);
  const v = String(value || '').trim();
  if (!v) return next;
  const entries = currentTableEntries(next, path);
  entries.push(v);
  oracles.overrides[path.join('>')] = entries;
  return next;
}

export function updateOracleEntry(campaign, path, index, value) {
  const next = structuredCloneSafe(campaign);
  const oracles = ensureOracles(next);
  const entries = currentTableEntries(next, path);
  if (index < 0 || index >= entries.length) return next;
  entries[index] = String(value || '');
  oracles.overrides[path.join('>')] = entries;
  return next;
}

export function removeOracleEntry(campaign, path, index) {
  const next = structuredCloneSafe(campaign);
  const oracles = ensureOracles(next);
  const entries = currentTableEntries(next, path);
  if (index < 0 || index >= entries.length) return next;
  entries.splice(index, 1);
  oracles.overrides[path.join('>')] = entries;
  return next;
}

/** Discard a table's override, reverting it to the shipped default entries. */
export function resetOracleTable(campaign, path) {
  const next = structuredCloneSafe(campaign);
  const oracles = ensureOracles(next);
  delete oracles.overrides[path.join('>')];
  return next;
}

// --- grouped/collapsible oracle tree (Oracle drawer) -----------------------
// A node is either a leaf table ({kind:'table', path, values}) or a group
// ({kind:'group'|'category', label, children}). `path` on a table node is
// the breadcrumb used by rollTable/rollGroup (see session.js rollOracle).
function buildOracleNode(node, path) {
  return Object.entries(node).map(([key, value]) => {
    const nodePath = [...path, key];
    return Array.isArray(value)
      ? { kind: 'table', label: key, path: nodePath, values: value }
      : { kind: 'group', label: key, path: nodePath, children: buildOracleNode(value, nodePath) };
  });
}

/** The full tree, top-level keys folded into ORACLE_GROUPS categories (any
 *  key not listed in a category lands under an automatic "Other" bucket). */
export function buildGroupedOracleTree(tables, groups = ORACLE_GROUPS) {
  const used = new Set();
  const categories = groups.map((g) => {
    const children = g.children.filter((k) => tables[k] && typeof tables[k] === 'object').map((k) => {
      used.add(k);
      return { kind: 'group', label: k, path: [k], children: buildOracleNode(tables[k], [k]) };
    });
    return { kind: 'category', label: g.label, children };
  }).filter((g) => g.children.length);

  const leftover = Object.keys(tables).filter((k) => !used.has(k) && typeof tables[k] === 'object');
  if (leftover.length) {
    categories.push({
      kind: 'category', label: '📦 Other',
      children: leftover.map((k) => ({ kind: 'group', label: k, path: [k], children: buildOracleNode(tables[k], [k]) })),
    });
  }
  return categories;
}

/** Filter the tree by a case-insensitive substring match against group/table
 *  names or (for leaf tables) individual entries. A group whose own name
 *  matches keeps its whole subtree; otherwise only matching descendants
 *  survive — the caller (UI) force-opens whatever this returns. */
export function filterOracleTree(nodes, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return nodes;
  const walk = (node) => {
    if (node.label.toLowerCase().includes(q)) return node;
    const aliases = GROUP_ALIASES[node.label];
    if (aliases && aliases.some((a) => a.toLowerCase().includes(q))) return node;
    if (node.kind === 'table') {
      return node.values.some((v) => String(v).toLowerCase().includes(q)) ? node : null;
    }
    const children = node.children.map(walk).filter(Boolean);
    return children.length ? { ...node, children } : null;
  };
  return nodes.map(walk).filter(Boolean);
}
