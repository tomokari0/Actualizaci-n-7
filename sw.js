const CACHE_NAME = 'seikoyt-cache-v1';
const DOWNLOADS_CACHE_NAME = 'seikotv-downloads';
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

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== DOWNLOADS_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isVideo = url.pathname.endsWith('.mp4') || url.pathname.endsWith('.m3u8');

  if (isVideo) {
    // Cache First for videos in downloads
    event.respondWith(
      caches.match(event.request, { cacheName: DOWNLOADS_CACHE_NAME }).then((response) => {
        if (response) {
          return response;
        }
        // If not in downloads cache, try regular fetch
        // If offline (network error), this will fail and we can provide a fallback if needed
        return fetch(event.request).catch(() => {
            // Fallback for offline if not found in cache
            return caches.match(event.request);
        });
      })
    );
  } else {
    // Standard caching strategy for other assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((networkResponse) => {
            // Optional: cache newly fetched assets? 
            // For now keep it simple as the user didn't ask to change asset caching
            return networkResponse;
        });
      })
    );
  }
});
