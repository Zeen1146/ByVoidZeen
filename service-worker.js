// ================================================================
// SERVICE WORKER — PWA Cache & Offline Mode
// ================================================================

const CACHE_NAME = "portfolio-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/config.js",
  "/js/github.js",
  "/js/projects.js",
  "/js/terminal.js",
  "/js/ui.js",
  "/manifest.json",
];

// Install — cache semua aset statis
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — strategi: Network First untuk API, Cache First untuk aset statis
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // GitHub API — selalu network, fallback ke cache
  if (url.hostname === "api.github.com") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Aset statis — Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
