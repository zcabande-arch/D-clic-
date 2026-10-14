// Service worker de Take Out : l'app s'ouvre même sans réseau (au fond du magasin).
const SHELL = "courses-shell-v14";
const LIBS = "courses-libs-v1";
const SHELL_FILES = ["./", "./index.html", "./legal.html", "./styles.css", "./app.js", "./store.js", "../config.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/logo.png",
  "./illus/amis.svg", "./illus/autre.svg", "./illus/banane.webp", "./illus/bebe.svg", "./illus/beurre.webp", "./illus/boissons.webp", "./illus/brocoli.webp", "./illus/cafe.webp", "./illus/carotte.webp", "./illus/cle.svg", "./illus/coloc.svg", "./illus/conserves.svg", "./illus/couple.svg", "./illus/crevette.webp", "./illus/email.svg", "./illus/epicerie.webp", "./illus/epices.webp", "./illus/famille.svg", "./illus/fete.svg", "./illus/frais.webp", "./illus/fraise.webp", "./illus/fromage.webp", "./illus/fruits.webp", "./illus/hero.webp", "./illus/hygiene.svg", "./illus/invite.svg", "./illus/liste.svg", "./illus/maison.svg", "./illus/oeufs.webp", "./illus/ok.svg", "./illus/orange.webp", "./illus/pain.webp", "./illus/pomme.webp", "./illus/saumon.webp", "./illus/snacks.webp", "./illus/surgeles.webp", "./illus/tete-cuisine.webp", "./illus/tete-liste.webp", "./illus/viande.webp",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("courses-") && k !== SHELL && k !== LIBS).map((k) => caches.delete(k))))
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
