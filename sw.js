const CACHE_NAME = 'seikoyt-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://59m37zkauy.ucarecd.net/6449ac81-e76b-4b61-bddb-52b4d8f8a27f/AirbrushIMAGEENHANCER177165941446117716594144612.jpg', // Logo
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;500;700&display=swap',
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
