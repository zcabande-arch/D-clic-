// Mons en fête : fonction Edge des rappels par notification.
// - GET                 → renvoie la clé publique push (la même que Déclic, table push_config)
// - POST {type:"tick"}  → tous les jours (pg_cron, supabase/mons-rappels.sql) : à J-14, J-7 et J-2 de chaque événement,
//                         « Tu seras là ? » à qui n'a pas répondu, « Il reste des postes » à qui vient mais n'est inscrit nulle part
// - POST {type:"rappel", event, who:"manquants"|"tous"} avec le jeton de session d'un admin → la même chose tout de suite,
//                         pour un événement (« tous » : aussi un rappel simple à ceux qui ont déjà tout fait)
// Elle relit tout dans la base et chaque rappel automatique ne part qu'une fois. La déployer avec « Verify JWT » désactivé.
// Le chiffrement Web Push (RFC 8291) et la signature VAPID (RFC 8292) utilisent uniquement WebCrypto.
import { createClient } from "npm:@supabase/supabase-js@2";

const CONTACT = "mailto:declic@example.com";
const TZ = "Europe/Paris";
const AUTO_DAYS = [14, 7, 2];

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

// ---------- clés VAPID (partagées avec Déclic) ----------
type Keys = { public_key: string; private_key: string };
let keysCache: { pub: string; signKey: CryptoKey } | null = null;
async function keys() {
  if (keysCache) return keysCache;
  let row = must(await sb.from("push_config").select("public_key,private_key").eq("id", 1).maybeSingle(), "lecture push_config") as Keys | null;
  if (!row) {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
    must(await sb.from("push_config").upsert({ id: 1, public_key: b64u(raw), private_key: jwk.d! }, { onConflict: "id", ignoreDuplicates: true }), "écriture push_config");
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
type PushRow = { endpoint: string; uid: string; sub: any };
async function send(row: PushRow, payload: Record<string, unknown>) {
  try {
    const body = await encryptPayload(row.sub.keys.p256dh, row.sub.keys.auth, enc.encode(JSON.stringify(payload)));
    const res = await fetch(row.endpoint, {
      method: "POST",
      headers: { Authorization: await vapidHeader(row.endpoint), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "normal" },
      body,
    });
    if (res.status === 404 || res.status === 410) await sb.from("mons_push").delete().eq("endpoint", row.endpoint);
    else if (!res.ok) console.warn("push", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.warn("push", (e as Error).message);
    return false;
  }
}

// ---------- qui doit recevoir quoi ----------
// deno-lint-ignore no-explicit-any
type Doc = Record<string, any> & { id: string };
type Data = {
  events: Doc[];
  planning: Doc[];
  profils: { id: string; nom: string }[];
  inscriptions: { slot_id: string; profil_id: string }[];
  presence: { profil_id: string; event_id: string; valeur: string }[];
};
export type Kind = "presence" | "inscription" | "general";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
// Pour un événement : le rappel qui convient à chaque profil (ou rien), et les postes encore ouverts.
export function plan(ev: Doc, d: Data, who: "manquants" | "tous") {
  const slots = d.planning.filter((s) => s.eventId === ev.id);
  const attribues = (s: Doc) => String(s.personnes || "").split(",").map(norm).filter(Boolean);
  const inscrits = (s: Doc) => d.inscriptions.filter((x) => x.slot_id === s.id);
  const open = slots.filter((s) => !s.places || inscrits(s).length + attribues(s).length < Number(s.places));
  const out = new Map<string, Kind>();
  for (const p of d.profils) {
    const pres = d.presence.find((x) => x.profil_id === p.id && x.event_id === ev.id)?.valeur;
    const tient = slots.some((s) => inscrits(s).some((x) => x.profil_id === p.id) || attribues(s).includes(norm(p.nom)));
    let k: Kind | null = null;
    if (!pres) k = "presence";
    else if (pres === "oui" && !tient && open.length) k = "inscription";
    else if (who === "tous" && pres === "oui") k = "general";
    if (k) out.set(p.id, k);
  }
  return { kinds: out, openRoles: [...new Set(open.map((s) => String(s.role || "")).filter(Boolean))] };
}

const parse = (s: string) => {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd, 12));
};
const todayParis = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const daysUntil = (date: string) => Math.round((parse(date).getTime() - parse(todayParis()).getTime()) / 864e5);
const whenLabel = (ev: Doc) =>
  parse(ev.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) + (ev.heure ? ` à ${ev.heure}` : "");
const lead = (n: number) => (n <= 0 ? "C'est aujourd'hui ! " : n === 1 ? "C'est demain ! " : n === 2 ? "C'est après-demain ! " : `Dans ${n} jours. `);

export function message(ev: Doc, kind: Kind, openRoles: string[], n: number | null) {
  const pre = n == null ? "" : lead(n);
  const roles = openRoles.slice(0, 3).join(", ") + (openRoles.length > 3 ? "…" : "");
  const body =
    kind === "presence"
      ? `${pre}Tu seras là ? Réponds en un clic dans l'app.`
      : kind === "inscription"
        ? `${pre}Il reste des postes à pourvoir${roles ? ` (${roles})` : ""}. Inscris-toi dans le Planning.`
        : `${pre}On compte sur toi ! Le planning est dans l'app.`;
  return { title: `${ev.title} · ${whenLabel(ev)}`, body, tag: `mons-${ev.id}`, url: `./?tab=plan&ev=${encodeURIComponent(ev.id)}` };
}

async function load(): Promise<Data> {
  const [docs, profils, ins, pres] = await Promise.all([
    sb.from("mons_docs").select("coll,id,data").in("coll", ["events", "planning"]),
    sb.from("mons_profils").select("id,nom"),
    sb.from("mons_inscriptions").select("slot_id,profil_id"),
    sb.from("mons_presence").select("profil_id,event_id,valeur"),
  ]);
  const rows = must(docs, "lecture événements") as { coll: string; id: string; data: Doc }[];
  return {
    events: rows.filter((r) => r.coll === "events").map((r) => ({ ...r.data, id: r.id })),
    planning: rows.filter((r) => r.coll === "planning").map((r) => ({ ...r.data, id: r.id })),
    profils: must(profils, "lecture profils") || [],
    inscriptions: must(ins, "lecture inscriptions") || [],
    presence: must(pres, "lecture présences") || [],
  };
}
// Appareils abonnés, par profil (via la session de chaque appareil).
async function devicesByProfil() {
  const subs = (must(await sb.from("mons_push").select("endpoint,uid,sub"), "lecture abonnements") || []) as PushRow[];
  if (!subs.length) return new Map<string, PushRow[]>();
  const sess = must(await sb.from("mons_sessions").select("uid,profil_id").in("uid", [...new Set(subs.map((s) => s.uid))]), "lecture sessions") as {
    uid: string;
    profil_id: string;
  }[];
  const of = new Map(sess.map((s) => [s.uid, s.profil_id]));
  const map = new Map<string, PushRow[]>();
  for (const s of subs) {
    const pid = of.get(s.uid);
    if (pid) map.set(pid, [...(map.get(pid) || []), s]);
  }
  return map;
}
async function claim(key: string) {
  const { error } = await sb.from("push_sent").insert({ key });
  return !error;
}

async function remind(ev: Doc, d: Data, devices: Map<string, PushRow[]>, who: "manquants" | "tous", n: number | null, keyPrefix: string | null) {
  const { kinds, openRoles } = plan(ev, d, who);
  const count = { personnes: 0, appareils: 0, sansNotif: 0, presence: 0, inscription: 0, general: 0 };
  for (const [pid, kind] of kinds) {
    const devs = devices.get(pid) || [];
    if (!devs.length) {
      count.sansNotif++;
      continue;
    }
    if (keyPrefix && !(await claim(`${keyPrefix}-${pid}`))) continue;
    const payload = message(ev, kind, openRoles, n);
    const ok = (await Promise.all(devs.map((s) => send(s, payload)))).filter(Boolean).length;
    count.personnes++;
    count.appareils += ok;
    count[kind]++;
  }
  return count;
}

async function onTick() {
  const d = await load();
  const devices = await devicesByProfil();
  const done: Record<string, unknown>[] = [];
  for (const ev of d.events) {
    if (ev.statut === "annule" || !ev.date) continue;
    const n = daysUntil(ev.date);
    if (!AUTO_DAYS.includes(n)) continue;
    done.push({ event: ev.id, j: n, ...(await remind(ev, d, devices, "manquants", n, `mons-auto-${ev.id}-J${n}`)) });
  }
  await sb.from("push_sent").delete().like("key", "mons-%").lt("sent_at", new Date(Date.now() - 60 * 86_400_000).toISOString());
  return json({ done });
}

async function onRappel(req: Request, eventId: unknown, who: unknown) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error } = await sb.auth.getUser(token);
  if (error || !u?.user) return json({ error: "unauthenticated" }, 401);
  const s = must(await sb.from("mons_sessions").select("profil_id").eq("uid", u.user.id).maybeSingle(), "lecture session");
  const me = s && must(await sb.from("mons_profils").select("is_admin").eq("id", s.profil_id).maybeSingle(), "lecture profil");
  if (!me?.is_admin) return json({ error: "forbidden" }, 403);
  const d = await load();
  const ev = d.events.find((e) => e.id === eventId);
  if (!ev) return json({ error: "unknown event" }, 404);
  const mode = who === "tous" ? "tous" : "manquants";
  // Pas plus d'un rappel manuel par événement et par heure : évite d'envoyer deux fois en touchant le bouton deux fois.
  const hour = new Date().toISOString().slice(0, 13);
  if (!(await claim(`mons-manuel-${ev.id}-${mode}-${hour}`))) return json({ error: "too soon" }, 429);
  const n = ev.date ? daysUntil(ev.date) : null;
  return json(await remind(ev, d, await devicesByProfil(), mode, n != null && n >= 0 ? n : null, null));
}

if (typeof Deno !== "undefined" && Deno.serve)
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    try {
      if (req.method === "GET") return json({ publicKey: (await keys()).pub });
      if (req.method !== "POST") return json({ error: "method" }, 405);
      const body = await req.json().catch(() => ({}));
      if (body.type === "tick") return await onTick();
      if (body.type === "rappel") return await onRappel(req, body.event, body.who);
      return json({ error: "unknown type" }, 400);
    } catch (e) {
      console.error(e);
      return json({ error: "internal", detail: (e as Error).message }, 500);
    }
  });
