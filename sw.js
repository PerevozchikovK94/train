// Network-first: fresh code when online, cached shell when offline.
// `cache: 'no-cache'` revalidates with the server (ETag) instead of trusting the
// browser's HTTP cache, so a deploy shows up on the next open, not 10 minutes later.
const CACHE = 'train-v48';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'food.js', 'config.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(a, {cache: 'reload'}))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('train-') && k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, {cache: 'no-cache'}).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});
// Morning message: the server sends {title, body, url, tag}; a tap opens the app (or focuses it).
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {body: e.data ? e.data.text() : ''}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Неделя', {body: d.body || '', tag: d.tag, icon: 'icons/icon-192.png', data: {url: d.url || './'}}));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(ws => {
    const w = ws.find(c => new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));
    return w ? w.focus() : self.clients.openWindow(e.notification.data?.url || './');
  }));
});
