// Déclic : fonction Edge « notify ».
// - GET               → renvoie la clé publique push (générée au premier appel)
// - POST {type:photo} → prévient les autres membres du groupe qu'une photo vient d'être publiée
// - POST {type:tick}  → rappel « c'est l'heure » au début de chaque déclic (8h → 20h, heure locale)
// Elle ne fait pas confiance au contenu des requêtes : elle relit tout dans la base, et chaque
// photo n'est notifiée qu'une fois. La déployer avec « Verify JWT » désactivé.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const FIRST = 8;
const LAST = 20;
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

type Keys = { public_key: string; private_key: string };
let keysCache: Keys | null = null;
async function keys(): Promise<Keys> {
  if (keysCache) return keysCache;
  let { data } = await sb.from("push_config").select("public_key,private_key").eq("id", 1).maybeSingle();
  if (!data) {
    const k = webpush.generateVAPIDKeys();
    await sb.from("push_config").upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey }, { onConflict: "id", ignoreDuplicates: true });
    ({ data } = await sb.from("push_config").select("public_key,private_key").eq("id", 1).single());
  }
  keysCache = data as Keys;
  webpush.setVapidDetails("mailto:declic@example.com", keysCache.public_key, keysCache.private_key);
  return keysCache;
}

// deno-lint-ignore no-explicit-any
type SubRow = { endpoint: string; uid: string; sub: any; tz: string; last: string | null };
async function send(row: SubRow, payload: Record<string, unknown>) {
  try {
    await webpush.sendNotification(row.sub, JSON.stringify(payload), { TTL: 900, urgency: "high" });
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await sb.from("push_subs").delete().eq("endpoint", row.endpoint);
    else console.warn("push", code, (e as Error).message);
  }
}

async function onPhoto(coll: unknown, id: unknown) {
  const m = typeof coll === "string" ? /^groups\/([A-Z0-9]{6})\/photos$/.exec(coll) : null;
  if (!m || typeof id !== "string") return json({ error: "invalid" }, 400);
  const group = m[1];

  const { data: photo } = await sb.from("docs").select("data,updated_at").eq("coll", coll).eq("id", id).maybeSingle();
  if (!photo || Date.now() - new Date(photo.updated_at).getTime() > 10 * 60_000) return json({ skipped: "stale" });
  const { error: dup } = await sb.from("push_sent").insert({ key: `${coll}/${id}` });
  if (dup) return json({ skipped: "already sent" });

  const { data: g } = await sb.from("docs").select("data").eq("coll", "groups").eq("id", group).maybeSingle();
  if (!g) return json({ skipped: "no group" });
  const author: string = photo.data.uid;
  const others = (g.data.members as string[]).filter((u) => u !== author);
  if (!others.length) return json({ sent: 0 });

  const { data: prof } = await sb.from("docs").select("data").eq("coll", "profiles").eq("id", author).maybeSingle();
  const name = prof?.data?.name || "Quelqu’un";
  const { data: subs } = await sb.from("push_subs").select("*").in("uid", others);
  await keys();
  const payload = {
    title: g.data.name || "Déclic",
    body: `📸 ${name} a publié sa photo de ${photo.data.hour}h` + (photo.data.caption ? ` : « ${photo.data.caption} »` : ""),
    tag: `photo-${group}-${photo.data.hour}`,
  };
  await Promise.all((subs || []).map((s) => send(s as SubRow, payload)));
  return json({ sent: subs?.length || 0 });
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
  const { data: subs } = await sb.from("push_subs").select("*");
  const now = new Date();
  await keys();
  const jobs: Promise<unknown>[] = [];
  for (const s of (subs || []) as SubRow[]) {
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
    if (req.method === "GET") return json({ publicKey: (await keys()).public_key });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const body = await req.json().catch(() => ({}));
    if (body.type === "photo") return await onPhoto(body.coll, body.id);
    if (body.type === "tick") return await onTick();
    return json({ error: "unknown type" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "internal" }, 500);
  }
});
