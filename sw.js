// Offline-Cache: Seite wird sofort aus dem Cache geladen und im Hintergrund aktualisiert.
const CACHE = 'dienstplaner-v1';
const FILES = ['./', 'index.html', 'style.css', 'core.js', 'ui.js', 'plan.js', 'abs.js', 'app.js', 'manifest.webmanifest'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
