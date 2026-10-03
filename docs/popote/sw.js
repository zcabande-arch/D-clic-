// Service worker de Popote : l'app s'ouvre même sans réseau (au magasin).
const SHELL = "popote-shell-v1";
const FONTS = "popote-fonts-v1";
const SHELL_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("popote-") && k !== SHELL && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Police Outfit : le cache d'abord.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(FONTS).then((c) => c.put(e.request, copy));
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
