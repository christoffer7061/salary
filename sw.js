/* Salary Tracker service worker — makes the app open offline.
   Strategy: network-first for the page (always up to date online, cached copy offline);
   cache-first for the supabase library + icons (they rarely change). */
const CACHE = "salary-v1";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(["./"]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // the page itself: try the network, fall back to the cached copy when offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put("./", copy)).catch(() => {});
        return r;
      }).catch(() => caches.match("./"))
    );
    return;
  }

  // static assets: serve from cache, fetch + store on first use
  const url = req.url;
  if (url.indexOf("cdn.jsdelivr.net") > -1 || url.indexOf("icon-") > -1 || url.indexOf("manifest.webmanifest") > -1) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return r;
      }))
    );
  }
});
