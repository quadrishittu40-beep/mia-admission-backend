// Minimal service worker: satisfies PWA installability requirements
// and lets the page load instantly on repeat visits. It does not try
// to serve the app fully offline, since every submission genuinely
// needs a live network connection (email, Google Sheet, payment).

var CACHE_NAME = "mia-admissions-v1";
var CORE_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  // Network-first for everything: always try to get the latest page
  // and data, only falling back to the cached shell if the network
  // is genuinely unreachable (e.g. the page itself while offline).
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match("/");
      });
    })
  );
});
