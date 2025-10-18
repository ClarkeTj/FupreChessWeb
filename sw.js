// ==========================================================
// FUPRE Chess Club – App Service Worker (Update UI removed)
// ----------------------------------------------------------
// • Pre-cache core assets for offline
// • Network-first fetch with cache fallback
// • Auto-update: skipWaiting() + clients.claim()
//   → New SW takes control immediately and page reloads via
//     controllerchange listener in install.js
// ==========================================================

const CACHE_NAME = "fcc-cache-v2.0"; // bump to invalidate old caches

const ASSETS = [
  "/", "/index.html",
  "/ratings.html", "/matches.html", "/404.html",
  "/data/ratings.json", "/data/matches.json", "/data/countdown.json",
  "/assets/css/styles.css", "/assets/js/ratings.js",
  "/assets/js/matches.js", "/assets/js/script.js",
  "/manifest.json",
  "/assets/icons/fupreChessClub-icon-192.png",
  "/assets/icons/fupreChessClub-icon-512.png"
];

// Install – pre-cache, then immediately activate the new SW.
self.addEventListener("install", (event) => {
  console.log("[SW] install", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      // Auto-update behavior: immediately move to the "activating" phase.
      await self.skipWaiting();
    })()
  );
});

// Activate – remove old caches and take control of all clients.
self.addEventListener("activate", (event) => {
  console.log("[SW] activate", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      );
      // Take control immediately (no manual refresh button in UI).
      await self.clients.claim();
    })()
  );
});

// Fetch – network-first with cache fallback for offline support.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("/404.html"))
      )
  );
});
