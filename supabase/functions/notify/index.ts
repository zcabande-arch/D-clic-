// Déclic : fonction Edge d'envoi des notifications.
// - GET               → renvoie la clé publique push (générée au premier appel)
// - POST {type:photo} → prévient les autres membres du groupe qu'une photo vient d'être publiée
// - POST {type:reaction|reply} → prévient l'auteur de la photo qu'on y a réagi / répondu
// - POST {type:join}  → prévient les membres qu'une personne vient de rejoindre le groupe
// - POST {type:message} → prévient les autres membres d'un nouveau message dans la conversation
// - POST {type:tick}  → rappel « c'est l'heure » au début de chaque déclic (8h → 20h, heure locale),
//                       le résumé de la journée à 21h, et une fois par jour, effacement des photos de plus de KEEP_DAYS jours
// - POST {type:recovery-create} (avec le jeton de l'utilisateur) → crée son code de récupération
// Chaque personne choisit dans son profil (data.notif) les notifications qu'elle reçoit et les groupes qu'elle coupe.
// Elle ne fait pas confiance au contenu des requêtes : elle relit tout dans la base, et chaque
// photo n'est notifiée qu'une fois. La déployer avec « Verify JWT » désactivé.
// Le chiffrement Web Push (RFC 8291) et la signature VAPID (RFC 8292) utilisent uniquement WebCrypto.
import { createClient } from "npm:@supabase/supabase-js@2";

const FIRST = 8;
const LAST = 20;
const CONTACT = "mailto:declic@example.com";
// Nombre de jours pendant lesquels les photos sont gardées (les points et séries sont conservés).
const KEEP_DAYS = 30;
// Heure locale du résumé de la journée.
const SUMMARY_HOUR = 21;

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Lève une erreur lisible quand Supabase renvoie une erreur.
function must<T>(r: { data: T; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what} : ${r.error.message}`);
  return r.data;
}

// ---------- outils binaires ----------
const enc = new TextEncoder();
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) (out.set(p, i), (i += p.length));
  return out;
};
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// ---------- clés VAPID ----------
type Keys = { public_key: string; private_key: string };
let keysCache: { pub: string; signKey: CryptoKey } | null = null;

async function generateKeys(): Promise<Keys> {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  return { public_key: b64u(raw), private_key: jwk.d! };
}

async function keys() {
  if (keysCache) return keysCache;
  let row = must(await sb.from("push_config").select("public_key,private_key").eq("id", 1).maybeSingle(), "lecture push_config") as Keys | null;
  if (!row) {
    const k = await generateKeys();
    must(await sb.from("push_config").upsert({ id: 1, ...k }, { onConflict: "id", ignoreDuplicates: true }), "écriture push_config");
    row = must(await sb.from("push_config").select("public_key,private_key").eq("id", 1).single(), "relecture push_config") as Keys;
  }
  const pub = unb64u(row.public_key);
  const signKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: row.private_key, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  keysCache = { pub: row.public_key, signKey };
  return keysCache;
}

async function vapidHeader(endpoint: string) {
  const { pub, signKey } = await keys();
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACT })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signKey, enc.encode(`${head}.${claims}`)));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${pub}`;
}

// ---------- chiffrement du message (aes128gcm) ----------
export async function encryptPayload(p256dh: string, auth: string, payload: Uint8Array) {
  const uaPublic = unb64u(p256dh);
  const authSecret = unb64u(auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));

  const prkKey = await hmac(authSecret, shared);
  const ikm = await hmac(prkKey, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

// deno-lint-ignore no-explicit-any
type SubRow = { endpoint: string; uid: string; sub: any; tz: string; last: string | null };
async function send(row: SubRow, payload: Record<string, unknown>) {
  try {
    const body = await encryptPayload(row.sub.keys.p256dh, row.sub.keys.auth, enc.encode(JSON.stringify(payload)));
    const res = await fetch(row.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidHeader(row.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "900",
        Urgency: "high",
      },
      body,
    });
    if (res.status === 404 || res.status === 410) await sb.from("push_subs").delete().eq("endpoint", row.endpoint);
    else if (!res.ok) console.warn("push", res.status, await res.text());
  } catch (e) {
    console.warn("push", (e as Error).message);
  }
}

// ---------- événements ----------
async function onPhoto(coll: unknown, id: unknown) {
  const m = typeof coll === "string" ? /^groups\/([A-Z0-9]{6})\/photos$/.exec(coll) : null;
  if (!m || typeof id !== "string") return json({ error: "invalid" }, 400);
  const group = m[1];

  const photo = must(await sb.from("docs").select("data,updated_at").eq("coll", coll).eq("id", id).maybeSingle(), "lecture photo");
  if (!photo || Date.now() - new Date(photo.updated_at).getTime() > 10 * 60_000) return json({ skipped: "stale" });
  const { error: dup } = await sb.from("push_sent").insert({ key: `${coll}/${id}` });
  if (dup) return json({ skipped: "already sent" });

  const g = must(await sb.from("docs").select("data").eq("coll", "groups").eq("id", group).maybeSingle(), "lecture groupe");
  if (!g) return json({ skipped: "no group" });
  const author: string = photo.data.uid;
  const others = (g.data.members as string[]).filter((u) => u !== author);
  if (!others.length) return json({ sent: 0 });

  const name = await nameOf(author);
  const payload = {
    title: g.data.name || "Déclic",
    body: `📸 ${name} a publié sa photo de ${photo.data.hour}h` + (photo.data.caption ? ` : « ${photo.data.caption} »` : ""),
    tag: `photo-${group}-${photo.data.hour}`,
  };
  return json({ sent: await notifyUids(others, payload, "photo", group) });
}

const recent = (updatedAt: string) => Date.now() - new Date(updatedAt).getTime() <= 10 * 60_000;
// Réserve une clé d'envoi : renvoie false si cette notification est déjà partie.
async function claim(key: string) {
  const { error } = await sb.from("push_sent").insert({ key });
  return !error;
}
async function nameOf(uid: string) {
  const prof = must(await sb.from("docs").select("data").eq("coll", "profiles").eq("id", uid).maybeSingle(), "lecture profil");
  return prof?.data?.name || "Quelqu’un";
}
// Préférences de notification (profil.notif) : { photo, reaction, message, join, reminder, summary: bool, muted: [codes] }.
type Prefs = Record<string, unknown> & { muted?: string[] };
async function prefsOf(uids: string[]) {
  const map = new Map<string, Prefs>();
  if (!uids.length) return map;
  const rows = must(await sb.from("docs").select("id,data").eq("coll", "profiles").in("id", uids), "lecture préférences") || [];
  for (const r of rows as { id: string; data: { notif?: Prefs } }[]) map.set(r.id, r.data?.notif || {});
  return map;
}
const wants = (p: Prefs | undefined, kind: string, group?: string) =>
  !p || (p[kind] !== false && !(group && Array.isArray(p.muted) && p.muted.includes(group)));

async function notifyUids(uids: string[], payload: Record<string, unknown>, kind: string, group?: string) {
  if (!uids.length) return 0;
  const prefs = await prefsOf(uids);
  uids = uids.filter((u) => wants(prefs.get(u), kind, group));
  if (!uids.length) return 0;
  const subs = must(await sb.from("push_subs").select("*").in("uid", uids), "lecture abonnements") || [];
  await Promise.all(subs.map((s: SubRow) => send(s, payload)));
  return subs.length;
}

// Réaction ou réponse sur une photo → son auteur est prévenu.
async function onReaction(kind: "reaction" | "reply", coll: unknown, id: unknown) {
  const re = kind === "reaction" ? /^groups\/([A-Z0-9]{6})\/reactions$/ : /^groups\/([A-Z0-9]{6})\/replies$/;
  const m = typeof coll === "string" ? re.exec(coll) : null;
  if (!m || typeof id !== "string") return json({ error: "invalid" }, 400);
  const group = m[1];
  const row = must(await sb.from("docs").select("data,updated_at").eq("coll", coll).eq("id", id).maybeSingle(), "lecture réaction");
  if (!row || !recent(row.updated_at)) return json({ skipped: "stale" });
  const photo = must(
    await sb.from("docs").select("data").eq("coll", `groups/${group}/photos`).eq("id", String(row.data.photoId)).maybeSingle(),
    "lecture photo",
  );
  if (!photo) return json({ skipped: "no photo" });
  const author: string = photo.data.uid;
  const who: string = row.data.uid;
  if (author === who) return json({ skipped: "own photo" });
  if (!(await claim(`${coll}/${id}`))) return json({ skipped: "already sent" });
  const g = must(await sb.from("docs").select("data").eq("coll", "groups").eq("id", group).maybeSingle(), "lecture groupe");
  const name = await nameOf(who);
  const text = typeof row.data.text === "string" && row.data.text ? ` : « ${row.data.text.slice(0, 80)} »` : row.data.img ? " avec une photo" : "";
  const body = kind === "reaction"
    ? `${row.data.emoji || "❤️"} ${name} a réagi à ta photo de ${photo.data.hour}h`
    : `💬 ${name} a répondu à ta photo de ${photo.data.hour}h${text}`;
  const sent = await notifyUids([author], { title: g?.data?.name || "Déclic", body, tag: `${kind}-${group}-${row.data.photoId}` }, "reaction", group);
  return json({ sent });
}

// Message dans la conversation → les autres membres sont prévenus.
async function onMessage(coll: unknown, id: unknown) {
  const m = typeof coll === "string" ? /^groups\/([A-Z0-9]{6})\/messages$/.exec(coll) : null;
  if (!m || typeof id !== "string") return json({ error: "invalid" }, 400);
  const group = m[1];
  const row = must(await sb.from("docs").select("data,updated_at").eq("coll", coll).eq("id", id).maybeSingle(), "lecture message");
  if (!row || !recent(row.updated_at)) return json({ skipped: "stale" });
  if (!(await claim(`${coll}/${id}`))) return json({ skipped: "already sent" });
  const g = must(await sb.from("docs").select("data").eq("coll", "groups").eq("id", group).maybeSingle(), "lecture groupe");
  if (!g) return json({ skipped: "no group" });
  const who: string = row.data.uid;
  const name = await nameOf(who);
  const text = String(row.data.text || "");
  const others = (g.data.members as string[]).filter((u) => u !== who);
  const sent = await notifyUids(others, {
    title: g.data.name || "Déclic",
    body: `💬 ${name} : ${text.length > 120 ? text.slice(0, 117) + "…" : text}`,
    tag: `msg-${group}`,
  }, "message", group);
  return json({ sent });
}

// Nouveau membre → les autres membres sont prévenus.
async function onJoin(group: unknown, uid: unknown) {
  if (typeof group !== "string" || !/^[A-Z0-9]{6}$/.test(group) || typeof uid !== "string") return json({ error: "invalid" }, 400);
  const g = must(await sb.from("docs").select("data,updated_at").eq("coll", "groups").eq("id", group).maybeSingle(), "lecture groupe");
  if (!g || !recent(g.updated_at) || !(g.data.members as string[]).includes(uid)) return json({ skipped: "stale" });
  if (!(await claim(`join-${group}-${uid}`))) return json({ skipped: "already sent" });
  const name = await nameOf(uid);
  const others = (g.data.members as string[]).filter((u) => u !== uid);
  const sent = await notifyUids(others, { title: g.data.name || "Déclic", body: `👋 ${name} a rejoint le groupe`, tag: `join-${group}` }, "join", group);
  return json({ sent });
}

function localParts(tz: string, d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

async function onTick() {
  const subs = (must(await sb.from("push_subs").select("*"), "lecture abonnements") || []) as SubRow[];
  const prefs = await prefsOf([...new Set(subs.map((s) => s.uid))]);
  const now = new Date();
  const jobs: Promise<unknown>[] = [];
  let groups: { id: string; data: { members: string[] } }[] | null = null;
  const photosByDay = new Map<string, Map<string, number>>();
  // Nombre de photos par groupe pour un jour donné (chargé une seule fois par jour concerné).
  async function photosOn(day: string) {
    if (!photosByDay.has(day)) {
      const rows = must(await sb.from("docs").select("coll").like("coll", "groups/%/photos").eq("data->>date", day), "lecture photos du jour") || [];
      const m = new Map<string, number>();
      for (const r of rows as { coll: string }[]) { const g = r.coll.split("/")[1]; m.set(g, (m.get(g) || 0) + 1); }
      photosByDay.set(day, m);
    }
    return photosByDay.get(day)!;
  }
  for (const s of subs) {
    let t;
    try {
      t = localParts(s.tz, now);
    } catch {
      continue;
    }
    if (t.minute >= 10) continue;
    const key = `${t.day}T${t.hour}`;
    if (s.last === key) continue;
    const p = prefs.get(s.uid);
    if (t.hour >= FIRST && t.hour <= LAST) {
      if (!wants(p, "reminder")) continue;
      jobs.push(
        sb.from("push_subs").update({ last: key }).eq("endpoint", s.endpoint).then(() =>
          send(s, { title: `Déclic de ${t.hour}h`, body: "C’est maintenant : 10 minutes pour envoyer ta photo à l’heure.", tag: "declic" })
        ),
      );
    } else if (t.hour === SUMMARY_HOUR && wants(p, "summary")) {
      if (!groups) groups = (must(await sb.from("docs").select("id,data").eq("coll", "groups"), "lecture groupes") || []) as typeof groups;
      const counts = await photosOn(t.day);
      const mine = groups!.filter((g) => g.data.members?.includes(s.uid) && !(Array.isArray(p?.muted) && p!.muted!.includes(g.id)));
      const total = mine.reduce((n, g) => n + (counts.get(g.id) || 0), 0);
      if (!total) continue;
      jobs.push(
        sb.from("push_subs").update({ last: key }).eq("endpoint", s.endpoint).then(() =>
          send(s, { title: "Résumé de la journée", body: `🧩 Ta journée en ${total} déclic${total > 1 ? "s" : ""} est prête : viens voir la mosaïque !`, tag: "resume" })
        ),
      );
    }
  }
  await Promise.all(jobs);
  await sb.from("push_sent").delete().lt("sent_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  const purged = await purgeOldPhotos();
  return json({ notified: jobs.length, purged });
}

// ---------- nettoyage des vieilles photos ----------
const MEDIA_MARK = "/storage/v1/object/public/media/";
async function purgeOldPhotos() {
  const today = new Date().toISOString().slice(0, 10);
  const { error: already } = await sb.from("push_sent").insert({ key: `purge-${today}` });
  if (already) return 0; // déjà fait aujourd'hui
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
  let removed = 0;
  for (const kind of ["photos", "replies", "messages"]) {
    for (;;) {
      const rows = must(
        await sb.from("docs").select("coll,id,data").like("coll", `groups/%/${kind}`).lt("data->>date", cutoff).limit(200),
        "lecture vieilles photos",
      ) || [];
      if (!rows.length) break;
      const paths = rows
        .map((r: { data: { img?: string } }) => r.data.img || "")
        .filter((u: string) => u.includes(MEDIA_MARK))
        .map((u: string) => u.slice(u.indexOf(MEDIA_MARK) + MEDIA_MARK.length));
      if (paths.length) must(await sb.storage.from("media").remove(paths), "suppression fichiers");
      for (const r of rows) must(await sb.from("docs").delete().eq("coll", r.coll).eq("id", r.id), "suppression photo");
      removed += rows.length;
      if (rows.length < 200) break;
    }
  }
  // Les réactions des photos effacées ne servent plus à rien.
  must(await sb.from("docs").delete().like("coll", "groups/%/reactions").lt("data->>date", cutoff), "suppression réactions");
  return removed;
}

// ---------- code de récupération (sans e-mail) ----------
// Le code sert de mot de passe ; l'adresse de connexion est dérivée du code (empreinte SHA-256),
// si bien qu'un nouvel appareil n'a besoin que du code. Aucun e-mail n'est jamais envoyé.
const RC_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
async function recoveryEmail(norm: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode("declic:" + norm)));
  return `r-${Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("")}@declic-recup.invalid`;
}
async function onRecoveryCreate(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return json({ error: "unauthenticated" }, 401);
  const norm = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => RC_ALPHA[b % RC_ALPHA.length]).join("");
  const email = await recoveryEmail(norm);
  must(await sb.auth.admin.updateUserById(data.user.id, { email, password: norm, email_confirm: true }), "création du code");
  return json({ code: norm.match(/.{4}/g)!.join("-") });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (req.method === "GET") return json({ publicKey: (await keys()).pub });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const body = await req.json().catch(() => ({}));
    if (body.type === "photo") return await onPhoto(body.coll, body.id);
    if (body.type === "reaction" || body.type === "reply") return await onReaction(body.type, body.coll, body.id);
    if (body.type === "join") return await onJoin(body.group, body.uid);
    if (body.type === "message") return await onMessage(body.coll, body.id);
    if (body.type === "tick") return await onTick();
    if (body.type === "recovery-create") return await onRecoveryCreate(req);
    return json({ error: "unknown type" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "internal", detail: (e as Error).message }, 500);
  }
});
