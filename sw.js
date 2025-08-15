const CACHE_NAME = 'jobiflow-pos-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL_URLS).catch(error => {
            console.error('Failed to cache one or more app shell URLs:', error);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Always go to the network for Supabase API calls to ensure data freshness.
  if (request.url.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // For all other GET requests, use a stale-while-revalidate strategy.
  if (request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.warn(`Service Worker: Network request for ${request.url} failed.`, error);
          // If there's no cached response, this will eventually throw, showing the browser's offline page.
        });

        return cachedResponse || fetchPromise;
      })
    );
  } else {
      // For non-GET requests (POST, PUT, etc.) that are not for Supabase, just fetch from network.
      event.respondWith(fetch(request));
  }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
});
