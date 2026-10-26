// CricketVerse Offline Gatekeeper Service Worker
const CACHE_NAME = "cricketverse-blockchain-v18";
const OFFLINE_URLS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/chain.js",
  "/vendor/ethers.min.js",
  "/contracts-config.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching offline gatekeeper shell");
      return cache.addAll(OFFLINE_URLS).catch(err => console.warn("Cache warm error:", err));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Removing legacy cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/contracts-config.json" || url.pathname.startsWith("/artifacts/")) {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) {
        // Clone before yielding to the browser: clone() fails after the body
        // has started streaming to the page.
        const cachedCopy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cachedCopy)));
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) || Response.error()));
    return;
  }
  // Network-first keeps app updates visible while preserving an offline shell.
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: "The CricketVerse server is offline. Start the app server to load player and match data." }), {
          status: 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
        });
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok && event.request.method === "GET") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(async () => (await caches.match(event.request)) || Response.error())
    );
  }
});
