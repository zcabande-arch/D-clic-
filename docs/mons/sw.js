// Service worker de Mons en fête : l'app s'ouvre même sans réseau.
const SHELL = "mons-shell-v4";
const LIBS = "mons-libs-v1";
const SHELL_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./store.js", "../config.js", "./manifest.webmanifest", "./icons/logo.png", "./icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mons-") && k !== SHELL && k !== LIBS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Bibliothèque Supabase (adresse versionnée, donc immuable) : le cache d'abord.
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(LIBS).then((c) => c.put(e.request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  if (url.origin !== location.origin) return;
  // Interface : le réseau d'abord pour recevoir les mises à jour (GitHub Pages met 10 min en cache), sinon la copie gardée.
  const fresh = e.request.mode === "navigate" ? fetch(e.request.url, { cache: "no-cache" }) : fetch(new Request(e.request, { cache: "no-cache" }));
  e.respondWith(
    fresh
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(e.request, { ignoreSearch: e.request.mode === "navigate" })) || (e.request.mode === "navigate" ? caches.match("./") : Response.error())),
  );
});

// Rappels du comité : afficher la notification, et au toucher ouvrir l'app sur le bon événement.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {}
  e.waitUntil(
    self.registration.showNotification(d.title || "Mons en fête", {
      body: d.body || "",
      tag: d.tag || "mons",
      renotify: true,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      data: { url: d.url || "./" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("navigate" in c) return c.navigate(url).then((w) => (w || c).focus());
      return self.clients.openWindow(url);
    }),
  );
});
