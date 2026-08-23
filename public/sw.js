// TourneyBirdie service worker.
//
// Two jobs: deliver push notifications, and let the app OPEN with no signal.
// Golf courses have dead zones, and until now the app simply would not launch
// offline - the offline score queue only ever helped if you already had it
// open.
//
// The caching is deliberately conservative, because stale JavaScript has cost
// more debugging time on this project than any real bug:
//   - Navigations are NETWORK FIRST. With a signal you always get the live
//     app; the cache is only a fallback when the network fails.
//   - The cache name carries a version. Bumping it drops everything old, so a
//     force-quit and relaunch always lands on fresh code.
//   - API and Supabase calls are NEVER cached. A cached score would be worse
//     than no score.

const CACHE = "tourneybirdie-shell-v1";
const SHELL = ["/home", "/manifest.webmanifest", "/pwa-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never cache anything that carries data.
  if (url.pathname.startsWith("/api/") || url.hostname.endsWith(".supabase.co")) return;

  // Pages: try the network, fall back to whatever we last saw.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/home")) || Response.error())
    );
    return;
  }

  // Build assets are content-hashed, so a cache hit is always the right file.
  const cacheable = ["/_next/", "/avatars/", "/brand/", "/draw/"];
  if (url.origin === self.location.origin && cacheable.some((d) => url.pathname.startsWith(d))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
            return res;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "TourneyBirdie", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "TourneyBirdie";
  const options = {
    body: data.body || "",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/home" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
