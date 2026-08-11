const APP_SHELL_CACHE = 'stub-shell-v2';
const API_CACHE = 'stub-api-v1';
const IMG_CACHE = 'stub-img-v1';

// Everything the app needs to boot with zero network.
// Adjust this list to match your actual file names/paths.
const APP_SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/Stub-192.png',
  './icons/Stub-512.png'
];

// ============== INSTALL: cache the app shell ==============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

// ============== ACTIVATE: clean up old cache versions ==============
self.addEventListener('activate', (event) => {
  const currentCaches = [APP_SHELL_CACHE, API_CACHE, IMG_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !currentCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ============== FETCH: route by request type ==============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests — POST/etc pass straight through
  if (request.method !== 'GET') return;

  // TMDB API calls: network-first, fall back to cache when offline
  if (url.hostname === 'api.themoviedb.org') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // TMDB poster images: cache-first, since posters never change once fetched
  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(cacheFirst(request, IMG_CACHE));
    return;
  }

  // Everything else (your own app files): cache-first, network fallback
  event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
});

// ============== STRATEGIES ==============
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    // No cache, no network — nothing we can do for this request
    return new Response('Offline and not cached.', {
      status: 503,
      statusText: 'Offline'
    });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ results: [], offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}