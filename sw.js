/* Service Worker for JARVIS PWA Cross-Device Support */
const CACHE_NAME = 'jarvis-pwa-v1';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './voice.js',
  './personas.js',
  './tools.js',
  './manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
