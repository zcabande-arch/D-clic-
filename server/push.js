// Rappels push : une notification au début de chaque déclic (8h à 20h, heure locale de l'appareil).
import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";

export const FIRST = 8;
export const LAST = 20;

function localParts(tz, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

export function validTz(tz) {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function setupPush(store, dataDir) {
  let keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const file = path.join(dataDir, "vapid.json");
    if (fs.existsSync(file)) keys = JSON.parse(fs.readFileSync(file, "utf8"));
    else {
      keys = webpush.generateVAPIDKeys();
      fs.writeFileSync(file, JSON.stringify(keys), { mode: 0o600 });
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:declic@example.com", keys.publicKey, keys.privateKey);

  async function sweep() {
    const now = new Date();
    for (const row of store.pushList()) {
      let t;
      try {
        t = localParts(row.tz, now);
      } catch {
        continue;
      }
      if (t.hour < FIRST || t.hour > LAST || t.minute >= 5) continue;
      const key = `${t.day}T${t.hour}`;
      if (row.last === key) continue;
      store.pushMark(row.endpoint, key);
      const payload = JSON.stringify({
        title: `Déclic de ${t.hour}h`,
        body: "C’est maintenant : 10 minutes pour envoyer ta photo à l’heure.",
        tag: "declic",
      });
      webpush.sendNotification(row.sub, payload, { TTL: 600, urgency: "high" }).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) store.pushRemove(row.endpoint);
        else console.warn("push:", err.statusCode || err.message);
      });
    }
  }
  setInterval(() => sweep().catch((e) => console.error(e)), 30_000).unref();

  return { publicKey: keys.publicKey };
}
