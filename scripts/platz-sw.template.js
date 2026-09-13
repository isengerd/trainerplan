/* Only the public field-mode shell and its immutable assets. Never API/user data. */
const CACHE = 'nextsession-platz-v1';
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const response = await fetch('/platz', { cache: 'reload', credentials: 'omit' });
  if (!response.ok) throw new Error('Field shell unavailable');
  const html = await response.clone().text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"<>]+)"/g)].map(m => m[1].replaceAll('&amp;', '&')).filter(path => path.startsWith('/_next/static/')))];
  if (!assets.length) throw new Error('No field assets');
  await cache.addAll(assets);
  await cache.put('/platz', response);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('nextsession-platz-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && url.pathname === '/platz') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/platz')).then(cached => cached || fetch(event.request)));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  }
});
