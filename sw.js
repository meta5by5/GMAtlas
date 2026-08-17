// sw.js — minimal offline shell cache for the installable PWA.
//
// Network-first for the app shell (index.html, the bundle, styles): a GM who
// is online should always get the build that's actually on disk/deployed —
// never a stale cache from a previous visit. The cache is only a fallback
// for when the network is unavailable (true offline play). This was changed
// from cache-first because cache-first + a never-bumped cache name meant a
// rebuilt bundle could silently keep serving the old one indefinitely (see
// PROGRESS.md "Bug B" — reported as "content doesn't persist" under a local
// dev server, actually stale-SW-cache masking real changes).
const CACHE = 'gmatlas-shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/tokens.css',
  './styles/cockpit.css',
  './dist/app.bundle.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];
// Reference Library PDFs fetched-and-cached-as-a-blob (shell.js's
// loadRefDocBlobUrl, direct follow-up request — "save it to the local
// cache like the rest of app data") live in their OWN cache, not CACHE
// above — a real reported bug this fix would otherwise reintroduce:
// activate's own cleanup below deletes every cache name it doesn't
// recognize, which would have silently wiped the doc cache on every SW
// update (a rebuilt bundle bumps nothing about that cache's own name),
// discarding what the GM just downloaded. Keeping both names in one
// KEEP_CACHES list is what activate now checks against.
const REF_DOC_CACHE = 'gmatlas-refdocs-v1';
const KEEP_CACHES = [CACHE, REF_DOC_CACHE];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !KEEP_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
