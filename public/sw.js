const CACHE_NAME = 'jobiflow-pos-cache-v5'; // Incremented for update
const APP_SHELL_URLS = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  './vite.svg',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',

  // Core dependencies from importmap for robust offline support
  'https://esm.sh/react@^19.1.1',
  'https://esm.sh/react-dom@^19.1.1/client',
  'https://esm.sh/recharts@^3.1.2',
  'https://esm.sh/@google/genai@^1.13.0',
  'https://esm.sh/react-icons@^5.5.0/fa',
  'https://esm.sh/react-router-dom@^7.8.0',
  'https://esm.sh/react-markdown@^10.1.0',
  'https://esm.sh/jspdf@^2.5.1',
  'https://esm.sh/jspdf-autotable@^3.8.2',
  'https://esm.sh/html-to-image@^1.11.11',
  'https://esm.sh/@supabase/supabase-js@^2.45.0',
  'https://esm.sh/uuid@^11.1.0'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell and core assets');
        // Use a Request object to bypass cache for precaching
        const cachePromises = APP_SHELL_URLS.map(url => {
            return cache.add(new Request(url, { cache: 'reload' })).catch(err => {
                console.warn(`Service Worker: Failed to cache ${url}`, err);
            });
        });
        return Promise.all(cachePromises);
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

  // Always go to the network for Supabase API calls
  if (url.hostname.endsWith('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }
  
  // For all other GET requests, use a Cache First strategy.
  // Since we precached everything, this will be fast and offline-first.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If not in cache (e.g., an image from i.pravatar.cc), fetch and cache it.
      // This caches on-demand for non-critical assets.
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(error => {
        console.warn(`Service Worker: Network request for ${request.url} failed.`, error);
        // We can return a generic offline fallback here if needed.
      });
    })
  );
});


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
});
