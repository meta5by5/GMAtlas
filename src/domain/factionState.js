// factionState.js — the `campaign.factions` subtree and its append-only
// Ledger (design/Faction-baseline.md B4.4, B4.12; FACTION-ROADMAP F0).
// Pure and DOM-free: every function takes a campaign and returns a new one.

import { defaultFactionsState, deepMerge, isObject } from '../core/schema.js';
import {
  LEDGER_FIELDS, LEDGER_DECAY, LEDGER_SOURCES, VISIBILITY_STATES, MIGRATED_STANCE,
} from '../data/factionRelations.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

const VISIBILITY_IDS = VISIBILITY_STATES.map((v) => v.id);
const ARRAY_KEYS = ['objectives', 'projects', 'operations', 'ledger', 'events', 'changeSets', 'triggers', 'hooks', 'runs'];

/** Fills any missing part of `factions` in place, keeping every record
 *  already there. A non-array where an array belongs is parked under
 *  `factions._legacy` rather than dropped (migration rule 5). */
export function normalizeFactionsState(campaign) {
  const base = defaultFactionsState();
  const cur = isObject(campaign.factions) ? campaign.factions : {};
  const out = deepMerge(base, cur);
  for (const k of ARRAY_KEYS) {
    if (!Array.isArray(out[k])) {
      if (out[k] !== undefined) out._legacy = { ...(out._legacy || {}), [k]: out[k] };
      out[k] = [];
    }
  }
  campaign.factions = out;
  return campaign;
}

/** The read-only view of the subtree, defaults filled, without cloning. */
export function factionsState(campaign) {
  const f = campaign && campaign.factions;
  if (isObject(f) && ARRAY_KEYS.every((k) => Array.isArray(f[k])) && isObject(f.settings)) return f;
  return normalizeFactionsState({ factions: f }).factions;
}

/** The deterministic id of a migrated Ledger entry, so the seed is created
 *  once even when two devices migrate the same campaign independently. */
export function migratedLedgerId(fromId, toId, field = 'stance') {
  return `led_mig_${field}_${fromId}_${toId}`;
}

/** Builds one Ledger entry, filling defaults and rejecting bad values. */
export function makeLedgerEntry(fields, now = new Date().toISOString()) {
  const f = fields || {};
  const delta = Number(f.delta);
  const entry = {
    id: f.id || `led_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    turn: Number.isFinite(Number(f.turn)) ? Number(f.turn) : 0,
    at: f.at || now,
    fromId: String(f.fromId || ''),
    toId: String(f.toId || ''),
    field: LEDGER_FIELDS.includes(f.field) ? f.field : 'stance',
    delta: Number.isFinite(delta) ? delta : 0,
    reason: String(f.reason || ''),
    decay: LEDGER_DECAY.includes(f.decay) ? f.decay : 'none',
    source: LEDGER_SOURCES.includes(f.source) ? f.source : 'gm',
    eventId: f.eventId || '',
    changeSetId: f.changeSetId || '',
    visibility: VISIBILITY_IDS.includes(f.visibility) ? f.visibility : 'gm',
  };
  // An undo never removes an entry: it appends one that cancels it
  // (`reverses` names the cancelled entry), so history is never erased.
  if (f.reverses) entry.reverses = String(f.reverses);
  return entry;
}

/** Ledger entries with every undone pair (an entry and its reversal) left
 *  out, for breakdowns and history lists. Sums are unaffected either way. */
export function liveLedgerEntries(entries) {
  const reversed = new Set(entries.filter((l) => l.reverses).map((l) => l.reverses));
  return entries.filter((l) => !l.reverses && !reversed.has(l.id));
}

/** Appends one entry to the Ledger. Nothing in the Ledger is ever edited
 *  or removed (B4.4: history is never erased). An entry whose id is
 *  already present is ignored. */
export function appendLedgerEntry(campaign, fields, now) {
  const next = normalizeFactionsState(clone(campaign));
  const entry = makeLedgerEntry(fields, now);
  if (!entry.fromId || !entry.toId) return next;
  if (next.factions.ledger.some((l) => l.id === entry.id)) return next;
  next.factions.ledger.push(entry);
  return next;
}

/** Seeds the Ledger from the Context Graph (B4.12): every `allied_with`
 *  edge between two factions becomes a `migrated` entry worth +2, every
 *  `rival_of` edge one worth −2. Additive and idempotent: an entry already
 *  seeded for that pair (by its deterministic id) is never added twice. */
export function seedMigratedLedger(campaign, now = new Date().toISOString()) {
  const next = normalizeFactionsState(clone(campaign));
  const items = (next.entities && Array.isArray(next.entities.items)) ? next.entities.items : [];
  const factionIds = new Set(items.filter((e) => e && e.type === 'faction').map((e) => e.id));
  const have = new Set(next.factions.ledger.map((l) => l.id));
  for (const e of items) {
    if (!e || e.type !== 'faction' || !Array.isArray(e.relationships)) continue;
    for (const r of e.relationships) {
      const delta = r && MIGRATED_STANCE[r.type];
      if (!delta || !factionIds.has(r.to) || r.to === e.id) continue;
      const id = migratedLedgerId(e.id, r.to);
      if (have.has(id)) continue;
      have.add(id);
      next.factions.ledger.push(makeLedgerEntry({
        id, fromId: e.id, toId: r.to, field: 'stance', delta,
        reason: r.type === 'allied_with' ? 'Allied before the Ledger began' : 'Rivals before the Ledger began',
        decay: 'none', source: 'migrated',
      }, now));
    }
  }
  return next;
}

/** The Ledger entries between two parties, oldest first. */
export function ledgerBetween(campaign, fromId, toId, field) {
  return factionsState(campaign).ledger.filter((l) => l.fromId === fromId && l.toId === toId && (!field || l.field === field));
}
