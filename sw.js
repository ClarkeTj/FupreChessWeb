// sw.js — Fupre Chess Club (auto-update + offline ready)

const CACHE_NAME = "fcc-cache-v1.2"; // bump this when you update assets
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/ratings.html",
  "/matches.html",
  "/data/ratings.json",
  "/data/matches.json",
  "/assets/css/styles.css",
  "/assets/js/ratings.js",
  "/assets/js/matches.js",
  "/manifest.json",
  "/assets/icons/fupreChessClub-icon-192.png",
  "/assets/icons/fupreChessClub-icon-512.png"
];

// Install event: pre-cache essential assets
self.addEventListener("install", event => {
  console.log("[SW] Installing new version…");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting()) // activate immediately
      .catch(err => console.warn("[SW] Install failed:", err))
  );
});

// Activate event: clear old caches
self.addEventListener("activate", event => {
  console.log("[SW] Activated. Cleaning old caches…");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log("[SW] Removing old cache:", key);
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch event: network-first, fallback to cache
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache with fresh version
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request)) // offline fallback
  );
});
