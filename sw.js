const CACHE_NAME = 'seikoyt-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/index.css', // Assuming styles are here
  '/logo.png', // Placeholder for logo
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
