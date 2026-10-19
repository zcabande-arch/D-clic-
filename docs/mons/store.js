// Accès aux données de Mons en fête : Supabase (tables de supabase/mons.sql) ou, avec « ?demo » dans l'adresse,
// une version de démonstration gardée dans ce navigateur. Les deux exposent la même API.
import { SUPABASE_URL, SUPABASE_ANON_KEY, MONS_NOTIFY_URL } from "../config.js";

function storeError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}
// « network » : à réessayer plus tard ; « setup » : supabase/mons.sql pas encore lancé ; le reste est un refus.
function mapError(err) {
  if (!err) return storeError("internal");
  const m = err.message || "";
  if (!navigator.onLine || /fetch|network|load failed|timed? ?out/i.test(m)) return storeError("network", m);
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "PGRST202" || /does not exist|could not find/i.test(m)) return storeError("setup", m);
  if (/unknown code/i.test(m)) return storeError("bad_code", m);
  if (/slot full/i.test(m)) return storeError("full", m);
  if (/already set up/i.test(m)) return storeError("already", m);
  if (/too soon/i.test(m)) return storeError("too_soon", m);
  if (err.code === "42501" || /row-level security|permission denied/i.test(m)) return storeError("denied", m);
  return storeError(err.code || "internal", m);
}
const must = ({ data, error }) => {
  if (error) throw mapError(error);
  return data;
};
const first = (rows) => (Array.isArray(rows) ? rows[0] || null : rows || null);
const COLLS = ["events", "planning", "tasks", "posts"];

export function openStore() {
  return new URLSearchParams(location.search).has("demo") ? openDemo() : openSupabase();
}

// ---------- Supabase ----------

async function openSupabase() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm");
  // Même projet et même adresse que Déclic : le compte anonyme de l'appareil est partagé, le profil Mons s'y rattache par code.
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  let session = (await sb.auth.getSession()).data.session;
  if (!session) {
    const r = await sb.auth.signInAnonymously();
    if (r.error) throw mapError(r.error);
    session = r.data.session;
  }

  return {
    mode: "supabase",
    async whoami() {
      return first(must(await sb.rpc("mons_whoami")));
    },
    async needsSetup() {
      return !!must(await sb.rpc("mons_needs_setup"));
    },
    async login(code) {
      return first(must(await sb.rpc("mons_login", { p_code: code })));
    },
    async logout() {
      must(await sb.rpc("mons_logout"));
    },
    async setup(id, nom) {
      return must(await sb.rpc("mons_setup", { p_id: id, p_nom: nom }));
    },
    async loadAll(admin) {
      const [docs, profils, ins, pres] = await Promise.all([
        sb.from("mons_docs").select("coll,id,data"),
        admin ? sb.from("mons_profils").select("id,nom,code,is_admin") : sb.rpc("mons_noms"),
        sb.from("mons_inscriptions").select("slot_id,profil_id,event_id"),
        sb.from("mons_presence").select("profil_id,event_id,valeur"),
      ]);
      const out = { profils: must(profils), inscriptions: must(ins), presence: must(pres) };
      for (const c of COLLS) out[c] = [];
      for (const d of must(docs)) if (out[d.coll]) out[d.coll].push({ ...d.data, id: d.id });
      return out;
    },
    async saveDoc(coll, id, data) {
      must(await sb.from("mons_docs").upsert({ coll, id, data, updated_at: new Date().toISOString() }));
    },
    async removeDoc(coll, id) {
      must(await sb.from("mons_docs").delete().eq("coll", coll).eq("id", id));
    },
    async setPresence(profilId, eventId, valeur) {
      if (valeur) must(await sb.from("mons_presence").upsert({ profil_id: profilId, event_id: eventId, valeur, updated_at: new Date().toISOString() }));
      else must(await sb.from("mons_presence").delete().eq("profil_id", profilId).eq("event_id", eventId));
    },
    async inscrire(slotId, profilId, eventId) {
      must(await sb.from("mons_inscriptions").insert({ slot_id: slotId, profil_id: profilId, event_id: eventId || "" }));
    },
    async desinscrire(slotId, profilId) {
      must(await sb.from("mons_inscriptions").delete().eq("slot_id", slotId).eq("profil_id", profilId));
    },
    async createProfil(id, nom, isAdmin) {
      return must(await sb.from("mons_profils").insert({ id, nom, is_admin: !!isAdmin }).select("code").single()).code;
    },
    async updateProfil(id, patch) {
      must(await sb.from("mons_profils").update(patch).eq("id", id));
    },
    async deleteProfil(id) {
      must(await sb.from("mons_profils").delete().eq("id", id));
    },
    // Rappels par notification (supabase/mons-rappels.sql et la fonction Edge mons-rappels).
    async pushKey() {
      let r;
      try {
        r = await fetch(MONS_NOTIFY_URL);
      } catch (e) {
        throw mapError(e);
      }
      if (!r.ok) throw storeError("push_setup");
      return (await r.json()).publicKey;
    },
    async savePush(sub) {
      must(await sb.from("mons_push").upsert({ endpoint: sub.endpoint, uid: session.user.id, sub }, { onConflict: "endpoint" }));
    },
    async deletePush(endpoint) {
      must(await sb.from("mons_push").delete().eq("endpoint", endpoint));
    },
    async notifStatus() {
      const rows = must(await sb.rpc("mons_notif_status")) || [];
      return Object.fromEntries(rows.map((r) => [r.profil_id, r.devices]));
    },
    async sendRappel(event, who) {
      const token = (await sb.auth.getSession()).data.session?.access_token || "";
      let r;
      try {
        r = await fetch(MONS_NOTIFY_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ type: "rappel", event, who }) });
      } catch (e) {
        throw mapError(e);
      }
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) throw storeError("too_soon");
      if (!r.ok) throw storeError(j.error ? "push_" + j.error : "push_setup", j.detail || j.error);
      return j;
    },
    // Un changement quelconque (par un autre appareil) : l'app recharge tout, les données sont petites.
    subscribe(onChange, onStatus) {
      let ch = sb.channel("mons");
      for (const t of ["mons_docs", "mons_profils", "mons_inscriptions", "mons_presence"])
        ch = ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => onChange());
      ch.subscribe((status) => onStatus && onStatus(status === "SUBSCRIBED"));
      return () => sb.removeChannel(ch);
    },
  };
}

// ---------- Démonstration (gardée dans ce navigateur) ----------

const DEMO_KEY = "mons-demo-v1";
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.getRandomValues(new Uint32Array(6)), (x) => ALPHA[x % ALPHA.length]).join("");

function demoSeed() {
  const d = (n) => {
    const t = new Date();
    t.setDate(t.getDate() + n);
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  };
  return {
    profils: [
      { id: "zoe-demo", nom: "Zoé", code: "DEMO26", is_admin: true },
      { id: "maxime-demo", nom: "Maxime", code: "MAXI26", is_admin: true },
      { id: "lea-demo", nom: "Léa", code: "BENE26", is_admin: false },
      { id: "paul-demo", nom: "Paul", code: "PAUL26", is_admin: false },
    ],
    events: [
      { id: "soiree-disco-demo", title: "Soirée disco", date: d(12), heure: "20h00", lieu: "Salle des fêtes", prix: "10 €", statut: "confirme", affiche: true, details: "Buvette et petite restauration sur place." },
      { id: "loto-demo", title: "Grand loto", date: d(33), heure: "14h30", lieu: "Salle polyvalente", prix: "3 € le carton", statut: "date_a_confirmer", dateAlt: d(40), affiche: false },
      { id: "marche-noel-demo", title: "Marché de Noël", date: d(55), endDate: d(56), heure: "10h00", lieu: "Place du village", statut: "a_definir", affiche: false },
    ],
    planning: [
      { id: "soiree-disco-demo--a", eventId: "soiree-disco-demo", heure: "17h00", ordre: 1, role: "Installation de la salle", places: 4, personnes: "Maxime" },
      { id: "soiree-disco-demo--b", eventId: "soiree-disco-demo", heure: "20h00", ordre: 2, role: "Entrée et billetterie", places: 2, notes: "Prévoir le fond de caisse." },
      { id: "soiree-disco-demo--c", eventId: "soiree-disco-demo", heure: "20h00", ordre: 3, role: "Buvette", places: 3 },
      { id: "soiree-disco-demo--d", eventId: "soiree-disco-demo", heure: "1h00", ordre: 4, role: "Rangement", places: null },
    ],
    tasks: [
      { id: "soiree-disco-demo--t1", eventId: "soiree-disco-demo", label: "Commander les boissons", due: d(5), done: false },
      { id: "soiree-disco-demo--t2", eventId: "soiree-disco-demo", label: "Réserver la sono", due: d(-2), done: false },
      { id: "loto-demo--t1", eventId: "loto-demo", label: "Trouver les lots", due: d(20), done: false },
    ],
    posts: [
      { id: "soiree-disco-demo--p1", eventId: "soiree-disco-demo", date: d(1), format: "Post", idea: "Annonce de la soirée avec l'affiche", done: false },
      { id: "soiree-disco-demo--p2", eventId: "soiree-disco-demo", date: d(8), format: "Reel", idea: "Coulisses de la préparation", done: false },
      { id: "soiree-disco-demo--p3", eventId: "soiree-disco-demo", date: d(11), format: "Story", idea: "Compte à rebours J-1", done: false },
      { id: "loto-demo--p1", eventId: "loto-demo", date: d(25), format: "Carrousel", idea: "Les lots à gagner", done: false },
    ],
    inscriptions: [{ slot_id: "soiree-disco-demo--c", profil_id: "lea-demo", event_id: "soiree-disco-demo" }],
    presence: [
      { profil_id: "lea-demo", event_id: "soiree-disco-demo", valeur: "oui" },
      { profil_id: "paul-demo", event_id: "soiree-disco-demo", valeur: "non" },
    ],
    session: null,
  };
}

function openDemo() {
  let db;
  try {
    db = JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
  } catch (e) {}
  if (!db) db = demoSeed();
  const listeners = new Set();
  const save = () => {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(db));
    } catch (e) {}
    setTimeout(() => listeners.forEach((f) => f()), 0);
  };
  const me = () => db.profils.find((p) => p.id === db.session) || null;
  const admin = () => !!me()?.is_admin;
  const deny = () => {
    throw storeError("denied");
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));

  return Promise.resolve({
    mode: "demo",
    async whoami() {
      const p = me();
      return p && { id: p.id, nom: p.nom, is_admin: p.is_admin };
    },
    async needsSetup() {
      return !db.profils.some((p) => p.is_admin);
    },
    async login(code) {
      const c = String(code || "").replace(/\s/g, "").toUpperCase();
      const p = db.profils.find((x) => x.code === c);
      if (!p) throw storeError("bad_code");
      db.session = p.id;
      save();
      return { id: p.id, nom: p.nom, is_admin: p.is_admin };
    },
    async logout() {
      db.session = null;
      save();
    },
    async setup(id, nom) {
      if (db.profils.some((p) => p.is_admin)) throw storeError("already");
      const code = newCode();
      db.profils.push({ id, nom, code, is_admin: true });
      db.session = id;
      save();
      return code;
    },
    async loadAll(isAdmin) {
      if (!me()) return { events: [], planning: [], tasks: [], posts: [], profils: [], inscriptions: [], presence: [] };
      const out = clone(db);
      if (!isAdmin) {
        out.tasks = [];
        out.posts = [];
        out.profils = out.profils.map(({ id, nom, is_admin }) => ({ id, nom, is_admin }));
        out.presence = out.presence.filter((p) => p.profil_id === db.session);
      }
      return out;
    },
    async saveDoc(coll, id, data) {
      if (!admin()) deny();
      const arr = db[coll];
      const i = arr.findIndex((x) => x.id === id);
      const row = { ...clone(data), id };
      if (i >= 0) arr[i] = row;
      else arr.push(row);
      save();
    },
    async removeDoc(coll, id) {
      if (!admin()) deny();
      db[coll] = db[coll].filter((x) => x.id !== id);
      if (coll === "events") {
        for (const c of ["planning", "tasks", "posts"]) db[c] = db[c].filter((x) => x.eventId !== id);
        db.presence = db.presence.filter((x) => x.event_id !== id);
      }
      const slots = new Set(db.planning.map((x) => x.id));
      db.inscriptions = db.inscriptions.filter((x) => slots.has(x.slot_id));
      save();
    },
    async setPresence(profilId, eventId, valeur) {
      if (profilId !== db.session) deny();
      db.presence = db.presence.filter((x) => !(x.profil_id === profilId && x.event_id === eventId));
      if (valeur) db.presence.push({ profil_id: profilId, event_id: eventId, valeur });
      save();
    },
    async inscrire(slotId, profilId, eventId) {
      if (profilId !== db.session && !admin()) deny();
      const slot = db.planning.find((x) => x.id === slotId);
      if (slot?.places && db.inscriptions.filter((x) => x.slot_id === slotId).length >= slot.places) throw storeError("full");
      if (!db.inscriptions.some((x) => x.slot_id === slotId && x.profil_id === profilId)) db.inscriptions.push({ slot_id: slotId, profil_id: profilId, event_id: eventId || "" });
      save();
    },
    async desinscrire(slotId, profilId) {
      if (profilId !== db.session && !admin()) deny();
      db.inscriptions = db.inscriptions.filter((x) => !(x.slot_id === slotId && x.profil_id === profilId));
      save();
    },
    async createProfil(id, nom, isAdmin) {
      if (!admin()) deny();
      let code = newCode();
      while (db.profils.some((p) => p.code === code)) code = newCode();
      db.profils.push({ id, nom, code, is_admin: !!isAdmin });
      save();
      return code;
    },
    async updateProfil(id, patch) {
      if (!admin()) deny();
      const p = db.profils.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
      save();
    },
    async deleteProfil(id) {
      if (!admin()) deny();
      db.profils = db.profils.filter((x) => x.id !== id);
      db.inscriptions = db.inscriptions.filter((x) => x.profil_id !== id);
      db.presence = db.presence.filter((x) => x.profil_id !== id);
      if (db.session === id) db.session = null;
      save();
    },
    async pushKey() {
      throw storeError("demo");
    },
    async savePush() {},
    async deletePush() {},
    async notifStatus() {
      return { "zoe-demo": 1, "lea-demo": 1 };
    },
    async sendRappel(event, who) {
      if (!admin()) deny();
      return { personnes: who === "tous" ? 3 : 1, appareils: who === "tous" ? 3 : 1, sansNotif: 1, demo: true };
    },
    subscribe(onChange, onStatus) {
      listeners.add(onChange);
      onStatus && onStatus(true);
      return () => listeners.delete(onChange);
    },
    reset() {
      db = demoSeed();
      save();
    },
  });
}
