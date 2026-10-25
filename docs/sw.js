// Service worker : ouverture hors ligne de l'interface Déclic et affichage des notifications.
const SHELL = "declic-shell-v4";
const SHELL_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./db.js", "./config.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord pour recevoir les mises à jour, cache si hors ligne. Les données (Supabase) ne passent pas par ici.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // « no-cache » : on redemande toujours au serveur s'il y a une version plus récente (GitHub Pages met 10 min en cache).
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
      .catch(async () => (await caches.match(e.request)) || (e.request.mode === "navigate" ? caches.match("./") : Response.error())),
  );
});

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {}
  e.waitUntil(
    self.registration
      .showNotification(d.title || "Déclic", {
        body: d.body || "",
        tag: d.tag || "declic",
        renotify: true,
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png",
      })
      .then(() => updateBadge(false)),
  );
});

// Pastille sur l'icône de l'écran d'accueil, même app fermée : le nombre de notifications
// de tes groupes encore affichées (photos, messages, réactions…), sans compter les rappels de déclic.
// À l'ouverture, l'app remplace ce nombre par celui des photos et messages non lus.
async function updateBadge(canClear) {
  if (!("setAppBadge" in self.navigator)) return;
  try {
    const list = await self.registration.getNotifications();
    const n = list.filter((x) => x.tag !== "declic" && x.tag !== "resume").length;
    // Sans notification affichée, on ne retire la pastille qu'après un geste (notification touchée ou balayée) :
    // certains systèmes ne listent pas les notifications et on effacerait le nombre posé par l'app.
    if (n) await self.navigator.setAppBadge(n);
    else if (canClear) await self.navigator.clearAppBadge();
  } catch {}
}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    (async () => {
      await updateBadge(true);
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(self.registration.scope);
    })(),
  );
});

self.addEventListener("notificationclose", (e) => e.waitUntil(updateBadge(true)));
