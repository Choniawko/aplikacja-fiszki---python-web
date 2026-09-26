/// <reference lib="webworker" />
export {};
declare const __PWA_BUILD_ID__: string;
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] };

const entries = self.__WB_MANIFEST;
const urls = [...new Set(entries.map((entry) => new URL(entry.url, self.registration.scope).href))];
const revisions = new Map(entries.map((entry) => [new URL(entry.url, self.registration.scope).href, entry.revision]));
const prefix = `fiszki-pwa:${new URL(self.registration.scope).pathname}:`;
const cacheName = `${prefix}${__PWA_BUILD_ID__}`;
const indexUrl = new URL('index.html', self.registration.scope).href;

async function tellClients(message: object) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) if (client.url.startsWith(self.registration.scope)) client.postMessage(message);
}

async function complete(): Promise<boolean> {
  const cache = await caches.open(cacheName);
  const responses = await Promise.all(urls.map((url) => cache.match(url)));
  return responses.every((response) => response?.ok);
}

let download: Promise<void> | undefined;
function populate(repair = false): Promise<void> {
  if (download) return download;
  download = (async () => {
    const cache = await caches.open(cacheName);
    let next = 0;
    let finished = 0;
    let failure: unknown;
    async function worker() {
      while (next < urls.length && !failure) {
        const url = urls[next++]!;
        try {
          if (!repair || !(await cache.match(url))?.ok) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);
            try {
              const downloadUrl = new URL(url);
              const revision = revisions.get(url);
              // Stable filenames (HTML, JSON and lesson images) also bypass stale
              // CDN entries during a deployment, not only the browser HTTP cache.
              if (revision) downloadUrl.searchParams.set('__fiszki_revision', revision);
              const response = await fetch(downloadUrl, { cache: 'reload', credentials: 'same-origin', signal: controller.signal });
              if (!response.ok || response.type === 'opaque') throw new Error(`HTTP ${response.status}: ${url}`);
              const type = response.headers.get('content-type') ?? '';
              if (/\.(png|jpe?g|bmp|gif|webp)$/i.test(url) && !type.startsWith('image/')) throw new Error('Nieprawidłowy obraz.');
              await cache.put(url, response);
            } finally { clearTimeout(timeout); }
          }
          finished++;
          await tellClients({ type: 'OFFLINE_PROGRESS', finished, total: urls.length });
        } catch (error) { failure = error; }
      }
    }
    await Promise.all(Array.from({ length: 6 }, () => worker()));
    if (failure || !(await complete())) {
      if (!repair) await caches.delete(cacheName);
      await tellClients({ type: 'OFFLINE_FAILED' });
      throw new Error('Nie udało się zapisać wszystkich materiałów offline.');
    }
  })().finally(() => { download = undefined; });
  return download;
}

self.addEventListener('install', (event) => {
  // A new worker is installed only after EVERY required response is committed.
  // No skipWaiting here: an existing lesson continues on the previous worker.
  event.waitUntil(populate());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (!(await complete())) throw new Error('Niekompletne materiały offline.');
    await self.clients.claim();
    // Retain the previous app cache for tabs still showing the old application.
    // IndexedDB is independent and is never removed by a worker update.
    const older = (await caches.keys()).filter((name) => name.startsWith(prefix) && name !== cacheName);
    await Promise.all(older.slice(0, -1).map((name) => caches.delete(name)));
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'CHECK_OFFLINE' || event.data?.type === 'REPAIR_OFFLINE') {
    event.waitUntil((async () => {
      try {
        if (event.data.type === 'REPAIR_OFFLINE') await populate(true);
        event.ports[0]?.postMessage({ ready: await complete(), version: __PWA_BUILD_ID__, count: urls.length });
      } catch { event.ports[0]?.postMessage({ ready: false }); }
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const isStart = event.request.mode === 'navigate' && (url.pathname === new URL(self.registration.scope).pathname || url.pathname === new URL(indexUrl).pathname);
  url.search = '';
  const key = isStart ? indexUrl : url.href;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const response = await cache.match(key);
    if (response) return response;
    // A tab can retain an old JS/CSS URL when another tab accepts an update.
    // Serve that asset from the retained app cache, without touching other PWAs.
    if (!isStart) {
      const older = (await caches.keys()).filter((name) => name.startsWith(prefix) && name !== cacheName).reverse();
      for (const name of older) {
        const previous = await (await caches.open(name)).match(key);
        if (previous) return previous;
      }
    }
    return fetch(event.request);
  })());
});
