// main.js — boot sequence: migrate → render → subscribe.
//
// Data safety first: store.load() absorbs any legacy v0.53 keys into the single
// campaign document before the UI ever draws.

import { store } from './core/store.js';
import { mountShell } from './ui/shell.js';

// load() is async (IndexedDB, docs/adr/0015-indexeddb-persistence.md) — an
// IIFE, not top-level await, since the bundled output is a classic script
// (see scripts/build.js's header comment on why), not an ES module.
(async () => {
  await store.load();
  mountShell(document.getElementById('app'));

  // Register the service worker for offline / installable PWA (ignored on file://).
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline is best-effort */ });
  }
})();

// Expose the store for console debugging only. NOT an extension point —
// features import the store module directly (no window monkey-patching).
window.__sagaStore = store;
