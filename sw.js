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

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
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
