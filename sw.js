
const CACHE_NAME = 'serafim-core-v3.3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/512x512/1f9e0.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
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
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// --- TRUE BACKGROUND NOTIFICATIONS (Notification Triggers API) ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_TASK') {
    const { id, title, timestamp } = event.data.payload;
    
    // Check if TimestampTrigger is supported (Chrome Android / PWA)
    if ('showTrigger' in Notification.prototype) {
      self.registration.showNotification(title, {
        body: 'Время пришло! Нажми, чтобы открыть Serafim.',
        icon: 'https://img.icons8.com/fluency/512/artificial-intelligence.png',
        tag: `task-${id}`, // Unique tag to replace/update existing schedules
        vibrate: [200, 100, 200, 100, 200],
        data: { url: '/' },
        // @ts-ignore - TimestampTrigger is experimental but works in PWA
        showTrigger: new TimestampTrigger(timestamp) 
      });
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('./');
    })
  );
});
