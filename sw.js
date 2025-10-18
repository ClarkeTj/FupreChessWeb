// ==========================================================
// FUPRE Chess Club – App Service Worker (Stable Prompt Update)
// ----------------------------------------------------------
// • Detects new version and notifies clients
// • Prompts user to reload manually (no infinite loop)
// • Full offline caching retained
// ==========================================================

const CACHE_NAME = "fcc-cache-v2.6"; // bump version to trigger new SW
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
  console.log("[SW] Installing:", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
    })()
  );
});

// ---------- Activate ----------
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating:", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      );
      await self.clients.claim();
      console.log("[SW] Active and controlling clients.");
    })()
  );
});

// ---------- Listen for SKIP_WAITING ----------
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Skip waiting requested by client");
    self.skipWaiting();
  }
});

// ---------- Detect new SW and notify clients ----------
self.addEventListener("install", () => {
  console.log("[SW] Install event fired.");
});

self.addEventListener("activate", () => {
  console.log("[SW] Activated:", CACHE_NAME);
});

// When a new version is waiting (after install completes)
self.addEventListener("updatefound", () => {
  console.log("[SW] updatefound fired (from registration).");
});

// Track state changes for new workers
self.addEventListener("statechange", (e) => {
  console.log("[SW] State changed:", e.target.state);
});

// Core logic to notify open pages when new version ready
self.addEventListener("install", (event) => {
  const installingWorker = self.registration.installing;
  if (installingWorker) {
    installingWorker.addEventListener("statechange", () => {
      if (
        installingWorker.state === "installed" &&
        self.registration.waiting
      ) {
        console.log("[SW] New version ready → notifying clients.");
        self.clients.matchAll({ type: "window" }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "NEW_VERSION_AVAILABLE" });
          }
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
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("/404.html"))
      )
  );
});
