// ==========================================================
// FUPRE Chess Club – App Service Worker (Stable Auto-Update)
// ----------------------------------------------------------
// • Detects new version and notifies clients
// • User decides when to refresh (no auto-reload loop)
// • Keeps full offline caching support
// ==========================================================

const CACHE_NAME = "fcc-cache-v2.2"; // bump version
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

// ---------- Install ----------
self.addEventListener("install", (event) => {
  console.log("[SW] Installing", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      // Wait for user confirmation before activating
      // (no skipWaiting to avoid auto reload)
    })()
  );
});

// ---------- Activate ----------
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// ---------- Update detection ----------
self.addEventListener("statechange", (e) => {
  console.log("[SW] State changed:", e.target.state);
});

self.addEventListener("updatefound", () => {
  console.log("[SW] Update found");
});

// When a new worker reaches waiting, notify clients
self.addEventListener("installing", () => {
  console.log("[SW] Installing new worker");
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Skip waiting requested by client");
    self.skipWaiting();
  }
});

// Inform client pages that a new version is available
self.addEventListener("controllerchange", () => {
  console.log("[SW] Controller changed");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Custom logic to inform clients of update availability
self.addEventListener("updatefound", function (event) {
  const newWorker = self.registration.installing;
  if (newWorker) {
    newWorker.addEventListener("statechange", function () {
      if (newWorker.state === "installed" && self.registration.waiting) {
        // Notify all clients
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "NEW_VERSION_AVAILABLE" });
          });
        });
      }
    });
  }
});

// ---------- Fetch ----------
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
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/404.html")))
  );
});
