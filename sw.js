/* Kaushal Mela 2026 — offline support (service worker)
   Change VERSION whenever you upload new files, so phones fetch the update. */
const VERSION = 'km2026-app-v5';
const CORE = ['./', 'app.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'promo-poster.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\.mp4$/i.test(url.pathname) || req.headers.has('range')) return;   // videos stream normally

  // Pages: try the network first (fresh), fall back to the saved copy when offline
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('app.html'))));
    return;
  }
  // App files and Google Fonts: use the saved copy, refresh it in the background
  if (url.origin === location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
  // Everything else (Google Sheet data, Drive photos) goes to the network as normal
});
