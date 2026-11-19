// Service worker de Budget du foyer : l'app s'ouvre même sans réseau (les données restent sur le téléphone).
const SHELL = "budget-shell-v2";
const LIBS = "budget-libs-v1";
const SHELL_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/favicon-32.png", "./icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("budget-") && k !== SHELL && k !== LIBS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Police Inter Tight : le cache d'abord.
  if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname)) {
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
  // Interface : le réseau d'abord pour recevoir les mises à jour, sinon la copie gardée.
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
