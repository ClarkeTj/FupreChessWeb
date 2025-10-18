// FUPRE Chess Club – App Service Worker
// NOTE: This SW is for the app. OneSignal uses its own SW files separately.
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

// Install – pre-cache without auto-activating.
// (Do NOT call skipWaiting() here; we want a clean “waiting” phase for updates.)
self.addEventListener("install", (event) => {
  console.log("[SW] install", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate – cleanup old caches and take control.
self.addEventListener("activate", (event) => {
  console.log("[SW] activate", CACHE_NAME);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// Message channel – allow page to trigger SKIP_WAITING for updates.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "SKIP_WAITING") {
    console.log("[SW] SKIP_WAITING received");
    self.skipWaiting();
  }
});

// Fetch – network-first with cache fallback.
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
      .catch(() => caches.match(req).then((c) => c || caches.match("/404.html")))
  );
});
