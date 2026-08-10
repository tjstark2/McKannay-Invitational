// TourneyBirdie service worker: push delivery only. No offline caching yet -
// scores must always come from the network, never a stale cache.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
