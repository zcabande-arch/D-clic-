// Déclic : fonction Edge d'envoi des notifications.
// - GET               → renvoie la clé publique push (générée au premier appel)
// - POST {type:photo} → prévient les autres membres du groupe qu'une photo vient d'être publiée
// - POST {type:tick}  → rappel « c'est l'heure » au début de chaque déclic (8h → 20h, heure locale)
// Elle ne fait pas confiance au contenu des requêtes : elle relit tout dans la base, et chaque
// photo n'est notifiée qu'une fois. La déployer avec « Verify JWT » désactivé.
// Le chiffrement Web Push (RFC 8291) et la signature VAPID (RFC 8292) utilisent uniquement WebCrypto.
import { createClient } from "npm:@supabase/supabase-js@2";

const FIRST = 8;
const LAST = 20;
const CONTACT = "mailto:declic@example.com";

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

  const prof = must(await sb.from("docs").select("data").eq("coll", "profiles").eq("id", author).maybeSingle(), "lecture profil");
  const name = prof?.data?.name || "Quelqu’un";
  const subs = must(await sb.from("push_subs").select("*").in("uid", others), "lecture abonnements") || [];
  const payload = {
    title: g.data.name || "Déclic",
    body: `📸 ${name} a publié sa photo de ${photo.data.hour}h` + (photo.data.caption ? ` : « ${photo.data.caption} »` : ""),
    tag: `photo-${group}-${photo.data.hour}`,
  };
  await Promise.all(subs.map((s: SubRow) => send(s, payload)));
  return json({ sent: subs.length });
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
  const now = new Date();
  const jobs: Promise<unknown>[] = [];
  for (const s of subs) {
    let t;
    try {
      t = localParts(s.tz, now);
    } catch {
      continue;
    }
    if (t.hour < FIRST || t.hour > LAST || t.minute >= 10) continue;
    const key = `${t.day}T${t.hour}`;
    if (s.last === key) continue;
    jobs.push(
      sb.from("push_subs").update({ last: key }).eq("endpoint", s.endpoint).then(() =>
        send(s, { title: `Déclic de ${t.hour}h`, body: "C’est maintenant : 10 minutes pour envoyer ta photo à l’heure.", tag: "declic" })
      ),
    );
  }
  await Promise.all(jobs);
  await sb.from("push_sent").delete().lt("sent_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  return json({ reminders: jobs.length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (req.method === "GET") return json({ publicKey: (await keys()).pub });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const body = await req.json().catch(() => ({}));
    if (body.type === "photo") return await onPhoto(body.coll, body.id);
    if (body.type === "tick") return await onTick();
    return json({ error: "unknown type" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "internal", detail: (e as Error).message }, 500);
  }
});
