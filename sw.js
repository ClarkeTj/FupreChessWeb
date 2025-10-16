// sw.js — Fupre Chess Club 

// Increment this version whenever you update assets
const CACHE_NAME = "fcc-cache-v3";

// Core files to pre-cache
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/ratings.html",
  "/matches.html",
  "/404.html",
  "/data/ratings.json",
  "/data/matches.json",
  "/data/countdown.json",
  "/assets/css/styles.css",
  "/assets/js/ratings.js",
  "/assets/js/matches.js",
  "/manifest.json",
  "/assets/icons/fupreChessClub-icon-192.png",
  "/assets/icons/fupreChessClub-icon-512.png"
];

// === INSTALL: cache essential assets ===
self.addEventListener("install", event => {
  console.log("[SW] Installing new version:", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.warn("[SW] Install failed:", err))
  );
});

// === ACTIVATE: clean old caches ===
self.addEventListener("activate", event => {
  console.log("[SW] Activated:", CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// === FETCH: network-first for fresh content, fallback to cache ===
self.addEventListener("fetch", event => {
  // Only handle GET requests (ignore POST, PUT, etc.)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and update cache with new version
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request)
          .then(cached => cached || caches.match("/404.html"));
      })
  );
});
