// store.js — the ONLY module that touches localStorage.
//
// Everything else calls store.get() / store.update(fn) / store.subscribe(fn).
// No global function reassignment, no polling, no timing hacks — state changes
// notify subscribers and the UI follows. This is the structural fix for the
// v0.53 "load order is the architecture" problem.

import { defaultCampaign } from './schema.js';
import {
  importCampaign, migrateDocument, migrateFromLegacyKeys, readLegacyKeys, LEGACY_KEYS,
} from './migrate.js';

const STORAGE_KEY = 'sagaatlas.campaign';
const BACKUP_KEY = 'sagaatlas.campaign.backup';
const MIGRATED_FLAG = 'sagaatlas.migratedFromLegacy';

function createStore() {
  const subs = new Set();
  let doc = null;
  let boundFileHandle = null;

  function notify() {
    for (const fn of subs) {
      try { fn(doc); } catch (e) { console.error('subscriber failed', e); }
    }
  }

  /** Load on boot: absorb legacy keys once, else read our own document. */
  function load() {
    const existing = safeParse(localStorage.getItem(STORAGE_KEY));
    if (existing) {
      doc = migrateDocument(existing);
    } else if (!localStorage.getItem(MIGRATED_FLAG)) {
      // First run of the new app — pull everything the old app left behind.
      const legacy = readLegacyKeys(localStorage);
      doc = Object.keys(legacy).length
        ? migrateFromLegacyKeys(legacy)
        : defaultCampaign();
      persist();
      localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
    } else {
      doc = defaultCampaign();
      persist();
    }
    notify();
    return doc;
  }

  function get() { return doc; }

  /** Mutate immutably: pass a function that returns a new (or mutated) doc. */
  function update(mutator) {
    const next = mutator(structuredCloneSafe(doc));
    doc = next || doc;
    doc.meta.updatedAt = new Date().toISOString();
    persist();
    notify();
    return doc;
  }

  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

  function persist() {
    try {
      const json = JSON.stringify(doc);
      // Keep the previous good copy as a one-slot backup before overwriting.
      const prev = localStorage.getItem(STORAGE_KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      localStorage.setItem(STORAGE_KEY, json);
    } catch (e) {
      console.warn('persist failed (quota?)', e);
    }
  }

  // --- portability: one serialize path → lossless by construction -------
  function exportDocument() { return JSON.stringify(doc, null, 2); }

  function importDocument(rawText) {
    doc = importCampaign(safeParse(rawText));
    persist();
    notify();
    return doc;
  }

  function newCampaign() {
    doc = defaultCampaign();
    persist();
    notify();
    return doc;
  }

  // --- optional File System Access binding (OneDrive-synced folder) -----
  function supportsFileBinding() { return typeof window !== 'undefined' && 'showSaveFilePicker' in window; }
  async function bindFile() {
    if (!supportsFileBinding()) throw new Error('File binding unsupported in this browser.');
    boundFileHandle = await window.showSaveFilePicker({
      suggestedName: 'saga-atlas-campaign.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    });
    await saveBoundFile();
  }
  async function saveBoundFile() {
    if (!boundFileHandle) return;
    const w = await boundFileHandle.createWritable();
    await w.write(exportDocument());
    await w.close();
  }

  return {
    load, get, update, subscribe,
    export: exportDocument, import: importDocument, newCampaign,
    supportsFileBinding, bindFile, saveBoundFile,
    STORAGE_KEY, BACKUP_KEY, LEGACY_KEYS,
  };
}

function safeParse(raw) { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function structuredCloneSafe(o) {
  try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); }
}

export const store = createStore();
