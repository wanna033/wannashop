// Sirve las fotos (foto/<id>) pidiéndolas a la página, que es quien tiene la sesión de Google.
// Cada id es el hash del contenido: una foto nunca cambia, así que se guarda en caché para siempre.
const CACHE = 'ws-fotos-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url), match = url.origin === self.location.origin && url.pathname.match(/\/foto\/([a-f0-9]{32})$/);
  if (match) event.respondWith(photo(event, match[1]));
});

async function photo(event, id) {
  const cache = await caches.open(CACHE), key = new Request(new URL(`foto/${id}`, self.registration.scope));
  const hit = await cache.match(key);
  if (hit) return hit;
  const client = (event.clientId && await self.clients.get(event.clientId)) || (await self.clients.matchAll({ type: 'window' }))[0];
  if (!client) return new Response('', { status: 404 });
  const blob = await new Promise(resolve => {
    const channel = new MessageChannel(), timer = setTimeout(() => resolve(null), 20000);
    channel.port1.onmessage = message => { clearTimeout(timer); resolve(message.data); };
    client.postMessage({ type: 'ws-foto', id }, [channel.port2]);
  });
  if (!blob) return new Response('', { status: 404 });
  const response = new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  await cache.put(key, response.clone());
  return response;
}
