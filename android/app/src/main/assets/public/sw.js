const CACHE_NAME = "geladinhos-roze-pwa-v3-1";
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./pwa-192x192.png",
  "./pwa-512x512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first with runtime cache fallback so installed Android/iOS apps work offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Skip caching Supabase live API requests so data is always fresh when online
  if (url.hostname.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          (url.origin === self.location.origin ||
            url.hostname.includes("fonts.googleapis.com") ||
            url.hostname.includes("fonts.gstatic.com"))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return undefined;
        })
      )
  );
});
