
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); //  Add OneSignal push handler

const CACHE_NAME = "fcc-cache-v1.9";

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
  "/assets/js/script.js",
  "/manifest.json",
  "/assets/icons/fupreChessClub-icon-192.png",
  "/assets/icons/fupreChessClub-icon-512.png"
];

// ========== INSTALL ==========
self.addEventListener("install", (event) => {
  console.log("[SW] Installing new version:", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] Install failed:", err))
  );
});

// ========== ACTIVATE ==========
self.addEventListener("activate", (event) => {
  console.log("[SW] Activated:", CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );

  // Notify open clients only when a new worker replaces an older one
  if (self.registration.active) {
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage("updateAvailable"));
    });
  }
});

// ========== MESSAGE HANDLER ==========
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    console.log("[SW] Skip waiting triggered");
    self.skipWaiting();
  }
});

// ========== FETCH (Network First, Cache Fallback) ==========
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/404.html"))
      )
  );
});

// ========== LOG OneSignal STATUS ==========
console.log("[SW] OneSignal push handler active (merged with PWA)");
