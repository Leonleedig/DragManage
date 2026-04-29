// sw.js
const CACHE_NAME = 'av-equipment-cache-v1';
const urlsToCache = ['./', './app.html', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isGoogleApi = requestUrl.hostname.includes('googleapis.com') || requestUrl.hostname.includes('google.com');
  const isPostRequest = event.request.method !== 'GET';

  if (isGoogleApi || isPostRequest) return;

  if (requestUrl.pathname.endsWith('app.html') || requestUrl.pathname === '/' || requestUrl.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (requestUrl.origin === location.origin) cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
