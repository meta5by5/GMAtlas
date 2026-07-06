// store.js — the ONLY module that touches persistence.
//
// Everything else calls store.get() / store.update(fn) / store.subscribe(fn).
// No global function reassignment, no polling, no timing hacks — state changes
// notify subscribers and the UI follows. This is the structural fix for the
// v0.53 "load order is the architecture" problem.
//
// Backed by IndexedDB (docs/adr/0015-indexeddb-persistence.md), not
// localStorage — localStorage's ~5-10MB per-origin quota was a real,
// user-hit ceiling (a campaign with a few embedded uploaded documents gets
// there fast). IndexedDB's quota is a large fraction of free disk space
// (a few GB in practice), same local-only/zero-server/works-via-file://
// architecture, just a bigger box. `store.get()` stays fully synchronous —
// it always reads the in-memory `doc`, which is authoritative — so the ~100
// ordinary `store.update((d) => ...)` call sites throughout ui/shell.js
// needed NO changes: mutate in memory and notify() immediately (identical,
// instant UI feedback to before), persist to IndexedDB in the background,
// and roll back + notify again on the rare async failure (Article VIII:
// never show a change as there when it didn't really persist — just
// surfaced a beat later than a synchronous throw would have been). Only the
// handful of call sites that already wanted a real success/failure signal
// (import, restoreBackup, newCampaign) are real async functions now.

import { defaultCampaign } from './schema.js';
import {
  importCampaign, migrateDocument, migrateFromLegacyKeys, readLegacyKeys, LEGACY_KEYS,
} from './migrate.js';

const STORAGE_KEY = 'sagaatlas.campaign'; // legacy localStorage key — read-only fallback for pre-IndexedDB campaigns, never written again
const BACKUP_KEY = 'sagaatlas.campaign.backup'; // ditto
const MIGRATED_FLAG = 'sagaatlas.migratedFromLegacy';

const DB_NAME = 'gmatlas';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const CAMPAIGN_KEY = 'campaign';
const CAMPAIGN_BACKUP_KEY = 'campaignBackup';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked (another tab holding an old version?)'));
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB get failed'));
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
  });
}

function createStore() {
  const subs = new Set();
  const persistErrorSubs = new Set();
  let doc = null;
  let dbPromise = null;
  let boundFileHandle = null;
  // Kept in sync with the actual backup record so storageInfo() (read by
  // every Settings render) stays synchronous — an async IndexedDB read on
  // every render would be a much bigger ripple for no real benefit.
  let backupMeta = { exists: false, bytes: 0 };

  function db() {
    if (!dbPromise) dbPromise = idbOpen();
    return dbPromise;
  }

  function notify() {
    for (const fn of subs) {
      try { fn(doc); } catch (e) { console.error('subscriber failed', e); }
    }
  }

  function notifyPersistError(err) {
    for (const fn of persistErrorSubs) {
      try { fn(err); } catch (e) { console.error('persist-error subscriber failed', e); }
    }
  }

  /** Load on boot: absorb legacy keys once, else read our own document.
   *  Async now (IndexedDB) — main.js awaits this before mounting the shell. */
  async function load() {
    const database = await db();
    const fromIdb = await idbGet(database, CAMPAIGN_KEY);
    if (fromIdb) {
      doc = migrateDocument(fromIdb);
      const backup = await idbGet(database, CAMPAIGN_BACKUP_KEY);
      backupMeta = { exists: !!backup, bytes: byteSize(JSON.stringify(backup || null)) };
      notify();
      return doc;
    }
    // No IndexedDB record yet — same legacy-absorption logic as before,
    // just reading from localStorage as a one-time fallback source instead
    // of as the ongoing store. The old keys are left in place afterward
    // (rule 5: migration never drops data), just never written to again.
    const existing = safeParse(localStorage.getItem(STORAGE_KEY));
    if (existing) {
      doc = migrateDocument(existing);
    } else if (!localStorage.getItem(MIGRATED_FLAG)) {
      const legacy = readLegacyKeys(localStorage);
      doc = Object.keys(legacy).length
        ? migrateFromLegacyKeys(legacy)
        : defaultCampaign();
      localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
    } else if (typeof window !== 'undefined' && window.__importedCampaign) {
      try { doc = migrateDocument(window.__importedCampaign); }
      catch (e) { doc = defaultCampaign(); }
    } else {
      doc = defaultCampaign();
    }
    await idbPut(database, CAMPAIGN_KEY, doc);
    notify();
    return doc;
  }

  function get() { return doc; }

  /** Mutate immutably: pass a function that returns a new (or mutated) doc.
   *  Updates the in-memory doc and notifies subscribers immediately (same
   *  instant feedback as before IndexedDB), then persists in the
   *  background. If that background persist fails, rolls back to the
   *  pre-mutation doc and notifies again — unless a newer edit has already
   *  landed on top of this one, in which case the newer edit wins rather
   *  than a stale rollback clobbering it. Failures surface via
   *  onPersistError(fn), not a thrown exception (there is no synchronous
   *  outcome to throw from anymore). */
  function update(mutator) {
    const prev = doc;
    const next = mutator(structuredCloneSafe(doc));
    doc = next || doc;
    doc.meta.updatedAt = new Date().toISOString();
    const thisWrite = doc;
    notify();
    persist(prev, doc).catch((err) => {
      console.warn('persist failed (IndexedDB)', err);
      if (doc === thisWrite) { doc = prev; notify(); }
      notifyPersistError(err);
    });
    return doc;
  }

  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  function onPersistError(fn) { persistErrorSubs.add(fn); return () => persistErrorSubs.delete(fn); }

  /** Best-effort one-slot backup of the outgoing doc, then the real write —
   *  same ordering/intent as the pre-IndexedDB version (ADR 0005: a failed
   *  backup write is never fatal, only a failed real write is), just async. */
  async function persist(prevDoc, nextDoc) {
    const database = await db();
    try {
      await idbPut(database, CAMPAIGN_BACKUP_KEY, prevDoc);
      backupMeta = { exists: true, bytes: byteSize(JSON.stringify(prevDoc)) };
    } catch (e) {
      console.warn('backup write skipped (quota?)', e);
    }
    await idbPut(database, CAMPAIGN_KEY, nextDoc);
  }

  // --- portability: one serialize path → lossless by construction -------
  function exportDocument() { return JSON.stringify(doc, null, 2); }

  async function importDocument(rawText) {
    doc = importCampaign(safeParse(rawText));
    await persist(doc, doc);
    notify();
    return doc;
  }

  async function newCampaign() {
    doc = defaultCampaign();
    await persist(doc, doc);
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
    return {
      campaignBytes: byteSize(JSON.stringify(doc)),
      hasBackup: backupMeta.exists,
      backupBytes: backupMeta.bytes,
    };
  }

  // Restore the one-slot backup as the active campaign — the counterpart
  // to persist()'s backup write. Same "never show a change as there when
  // it didn't really happen" posture as update(): a bad/missing backup
  // rolls back to whatever was current rather than leaving doc
  // half-replaced.
  async function restoreBackup() {
    const prevDoc = doc;
    const database = await db();
    let backup;
    try { backup = await idbGet(database, CAMPAIGN_BACKUP_KEY); }
    catch (e) { return { ok: false, error: e }; }
    if (!backup) return { ok: false, error: new Error('No backup available.') };
    doc = importCampaign(backup);
    try {
      await persist(doc, doc);
    } catch (e) {
      doc = prevDoc;
      notify();
      return { ok: false, error: e };
    }
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
    load, get, update, subscribe, onPersistError,
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
