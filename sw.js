const BUILD_TIMESTAMP = '20260330_154800';
const CACHE_NAME = 'meshcore-wardrive-v1.01-' + BUILD_TIMESTAMP;
const TILE_CACHE_NAME = 'meshcore-map-tiles-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/scope.js',
  './js/protocol.js',
  './js/bluetooth.js',
  './js/radar.js',
  './js/graphs.js',
  './js/trilateration.js',
  './js/app.js',
  './vendor/fontawesome/all.min.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[ServiceWorker] Pre-caching offline app assets v4200...');
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[ServiceWorker] Pre-cache notice for ' + asset, err);
        }
      }
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME && k !== TILE_CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // 1. Map Tiles Caching (Cache-First for Map Tiles)
  const isTileRequest = url.includes('cartocdn.com') ||
                        url.includes('openstreetmap.org') ||
                        url.includes('arcgisonline.com') ||
                        url.includes('opentopomap.org') ||
                        url.includes('openfreemap.org') ||
                        url.includes('maplibre.org') ||
                        url.includes('/tile/');

  if (isTileRequest && e.request.method === 'GET') {
    e.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cachedResponse) => {
          const fetchPromise = fetch(e.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(e.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Navigation & App Assets: Network-First for Real-Time Updates, Fallback to Cache when Offline
  if (e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // OFFLINE FALLBACK: Use ignoreSearch: true so dynamic ?v= queries match cached JS/CSS files!
        return caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
            return caches.match('./index.html', { ignoreSearch: true }) || caches.match('./', { ignoreSearch: true }) || caches.match('index.html', { ignoreSearch: true });
          }
          return null;
        });
      })
    );
  }
});

// 3. System Web Push & Notification Click Handler
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
