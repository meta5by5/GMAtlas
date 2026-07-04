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
      // If the developer has placed an imported campaign into the repository
      // and the bundler embedded it into the bundle (window.__importedCampaign),
      // prefer that as the initial document so imports persist across builds.
      if (typeof window !== 'undefined' && window.__importedCampaign) {
        try {
          doc = migrateDocument(window.__importedCampaign);
          persist();
          localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
        } catch (e) {
          doc = defaultCampaign();
          persist();
        }
      } else {
        doc = defaultCampaign();
        persist();
      }
    }
    notify();
    return doc;
  }

  function get() { return doc; }

  /** Mutate immutably: pass a function that returns a new (or mutated) doc.
   *  If the change can't actually be saved (most commonly a localStorage
   *  quota error from an oversized embedded upload — see addDocument in
   *  domain/documents.js), the in-memory doc is rolled back to what's
   *  really on disk before re-throwing, so the app never shows a change as
   *  "there" when it silently failed to persist (campaign data is sacred —
   *  Article VIII — an unpersisted phantom state violates that as much as
   *  losing data outright). Callers that want to surface a friendly message
   *  (e.g. the doc-upload handler in ui/shell.js) should wrap this call in
   *  try/catch; callers that don't care still get a safe, consistent state. */
  function update(mutator) {
    const prev = doc;
    const next = mutator(structuredCloneSafe(doc));
    doc = next || doc;
    doc.meta.updatedAt = new Date().toISOString();
    const result = persist();
    if (!result.ok) {
      doc = prev;
      notify();
      throw result.error;
    }
    notify();
    return doc;
  }

  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

  function persist() {
    const json = JSON.stringify(doc);
    // Keep the previous good copy as a one-slot backup before overwriting —
    // but best-effort only. Writing it needs quota for BOTH the outgoing and
    // incoming campaign copies at once; once a campaign (commonly one with
    // large embedded document uploads) grows past half of localStorage's
    // quota, that momentary double-copy is what fails, not the actual save —
    // and unconditionally treating the backup write as fatal meant EVERY
    // future save silently failed forever after, not just the backup
    // (real report: clicking to select a Cast entity "did nothing" once a
    // campaign crossed this line — see git history for the guarded()
    // wrapper that surfaced the previously-silent failure this uncovered).
    // The backup itself has no restore UI wired to it yet, so a skipped
    // backup costs nothing today; a failed real save costs everything.
    try {
      const prev = localStorage.getItem(STORAGE_KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
    } catch (e) {
      console.warn('backup write skipped (quota?)', e);
    }
    try {
      localStorage.setItem(STORAGE_KEY, json);
      return { ok: true };
    } catch (e) {
      console.warn('persist failed (quota?)', e);
      return { ok: false, error: e };
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

  // --- storage visibility + recovery (ADR 0005 follow-up) ----------------
  // Byte counts via Blob (UTF-8) rather than .length (UTF-16 code units) —
  // meaningfully different once a campaign has any non-ASCII text (accented
  // names, curly quotes from a pasted document, etc.), and this number
  // exists specifically so a GM can judge it against a real quota.
  function byteSize(str) { return str ? new Blob([str]).size : 0; }

  function storageInfo() {
    let backupRaw = null;
    try { backupRaw = localStorage.getItem(BACKUP_KEY); } catch { /* ignore */ }
    return {
      campaignBytes: byteSize(JSON.stringify(doc)),
      hasBackup: !!backupRaw,
      backupBytes: byteSize(backupRaw),
    };
  }

  // Restore the one-slot backup as the active campaign — the counterpart
  // to persist()'s backup write that nothing previously read from. Same
  // "never show a change as there when it didn't really happen" posture as
  // update(): a bad/missing backup rolls back to whatever was current
  // rather than leaving doc half-replaced.
  function restoreBackup() {
    const prevDoc = doc;
    let backupRaw = null;
    try { backupRaw = localStorage.getItem(BACKUP_KEY); } catch { /* ignore */ }
    if (!backupRaw) return { ok: false, error: new Error('No backup available.') };
    const parsed = safeParse(backupRaw);
    if (!parsed) return { ok: false, error: new Error('Backup is corrupt or unreadable.') };
    doc = importCampaign(parsed);
    const result = persist();
    if (!result.ok) { doc = prevDoc; notify(); return result; }
    notify();
    return { ok: true };
  }

  // --- optional File System Access binding (OneDrive-synced folder) -----
  function supportsFileBinding() { return typeof window !== 'undefined' && 'showSaveFilePicker' in window; }
  async function bindFile() {
    if (!supportsFileBinding()) throw new Error('File binding unsupported in this browser.');
    boundFileHandle = await window.showSaveFilePicker({
      suggestedName: 'gmatlas-campaign.json',
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
    storageInfo, restoreBackup,
    STORAGE_KEY, BACKUP_KEY, LEGACY_KEYS,
  };
}

function safeParse(raw) { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function structuredCloneSafe(o) {
  try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); }
}

export const store = createStore();
