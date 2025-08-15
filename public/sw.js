const CACHE_NAME = 'jobiflow-pos-cache-v3';
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
  const url = new URL(request.url);

  // Always go to the network for Supabase API calls (both HTTP and WebSockets)
  // to ensure data freshness.
  if (url.hostname.endsWith('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // For non-GET requests, just fetch from network.
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Define what we want to cache: our own app shell and known CDNs.
  const isAssetFromKnownCdn = 
    url.hostname === 'esm.sh' || 
    url.hostname === 'cdnjs.cloudflare.com' || 
    url.hostname === 'cdn.tailwindcss.com';
  
  const isAppAsset = url.origin === self.origin || isAssetFromKnownCdn;

  if (isAppAsset) {
    // For app assets, use a stale-while-revalidate strategy.
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Check for valid responses before caching.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.warn(`Service Worker: Network request for ${request.url} failed.`, error);
          // If there's no cached response, this will fail, and the browser will show its offline page.
        });

        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // For any other GET request (like a printer websocket handshake to a local IP),
    // just go to the network and don't attempt to cache it.
    event.respondWith(fetch(request));
  }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
});