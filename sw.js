
const CACHE_NAME = 'serafim-core-v2.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/512x512/1f9e0.png'
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Ensure the service worker takes control of the page immediately.
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for a smooth offline-like experience
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Optional: dynamic caching can be added here
        return response;
      });
    }).catch(() => {
      // Offline fallback can be added here
      return fetch(event.request);
    })
  );
});
