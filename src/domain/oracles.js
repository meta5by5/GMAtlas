// oracles.js — the roll engine, as pure functions. Lifted and cleaned from
// v0.53's app.js. No DOM, no globals. Deterministic when given a seeded RNG,
// which is what makes it testable.

import { SCENE_TABLES } from '../data/tables.js';

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
 * Merge user overrides (campaign.oracles.overrides) onto the base tables.
 * Overrides are keyed by "A>B>C" path → replacement array.
 */
export function tablesWithOverrides(overrides = {}) {
  if (!overrides || !Object.keys(overrides).length) return SCENE_TABLES;
  const clone = structuredCloneSafe(SCENE_TABLES);
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
