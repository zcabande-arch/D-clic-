// Accès aux données de Take Out : Supabase (tables de supabase/courses.sql) ou, avec « ?demo » dans l'adresse,
// une version de démonstration gardée dans ce navigateur. Les deux exposent la même API.
import { SUPABASE_URL, SUPABASE_ANON_KEY, NOTIFY_URL } from "../config.js";

const ITEM_COLS = "id,household,name,qty,quality,cat,prio,shop,done,low,price,added_by,done_by,created_at,done_at";
const PURCHASE_COLS = "id,household,item_id,name,cat,amount,paid_by,created_by,bought_at";
// Les deux tables que l'application modifie : « items » (articles) et « purchases » (achats).
const TABLES = { items: "courses_items", purchases: "courses_purchases" };
// Postgres renvoie les montants en texte : on les remet en nombres.
const num = (v) => (v == null ? null : Number(v));
const fixItem = (r) => ({ ...r, price: num(r.price) });
const fixPurchase = (r) => ({ ...r, amount: num(r.amount) });

function storeError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}
// « network » : à réessayer plus tard ; tout le reste est un refus définitif.
function mapError(err) {
  if (!err) return storeError("internal");
  const m = err.message || "";
  if (!navigator.onLine || /fetch|network|load failed|timed? ?out/i.test(m)) return storeError("network", m);
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "PGRST202" || /does not exist|could not find/i.test(m)) return storeError("setup", m);
  if (err.code === "42501" || /row-level security|not a member/i.test(m)) return storeError("denied", m);
  return storeError(err.code || "internal", m);
}
const must = ({ data, error }) => {
  if (error) throw mapError(error);
  return data;
};

export function openStore() {
  return new URLSearchParams(location.search).has("demo") ? openDemo() : openSupabase();
}

// ---------- Supabase ----------

async function openSupabase() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm");
  // Même projet et même adresse que Déclic : le compte (anonyme ou retrouvé par code) est partagé entre les deux applications.
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  let session = (await sb.auth.getSession()).data.session;
  if (!session) {
    const r = await sb.auth.signInAnonymously();
    if (r.error) throw mapError(r.error);
    session = r.data.session;
  }
  const uid = session.user.id;
  // Lecture des profils avec la photo ; si la colonne n'existe pas encore (script SQL pas relancé), sans elle.
  let hasAvatar = true;
  async function profilesQuery(build) {
    if (hasAvatar) {
      const r = await build("uid,name,emoji,avatar");
      if (!r.error || !/avatar/i.test(r.error.message || "")) return r;
      hasAvatar = false;
    }
    return build("uid,name,emoji");
  }

  return {
    uid,
    mode: "supabase",
    async getProfile() {
      return must(await profilesQuery((cols) => sb.from("courses_profiles").select(cols).eq("uid", uid).maybeSingle()));
    },
    async saveProfile(p) {
      const row = { uid, name: p.name, emoji: p.emoji, updated_at: new Date().toISOString() };
      // La colonne « avatar » n'existe qu'une fois supabase/courses.sql relancé : on ne l'envoie que si elle est connue.
      if (hasAvatar) row.avatar = p.avatar || null;
      must(await sb.from("courses_profiles").upsert(row));
    },
    // Prénom et photo déjà choisis dans Déclic, pour préremplir le profil.
    async suggested() {
      const r = await sb.from("docs").select("data").eq("coll", "profiles").eq("id", uid).maybeSingle();
      const d = (r.data && r.data.data) || {};
      return { name: d.name || "", avatar: d.avatar || "" };
    },
    // Photo de profil : envoyée dans le stockage « media » (dossier de la personne), renvoie son adresse publique.
    async uploadAvatar(dataUrl) {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${uid}/courses-avatar-${Date.now()}.jpg`;
      const { error } = await sb.storage.from("media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (error) throw mapError(error);
      return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
    },
    get canAvatar() {
      return hasAvatar;
    },
    async households() {
      const rows = must(await sb.from("courses_members").select("household,courses_households(id,name,kind,created_by)").eq("uid", uid));
      return rows.map((r) => r.courses_households).filter(Boolean);
    },
    async members(hid) {
      const rows = must(await sb.from("courses_members").select("uid,joined_at").eq("household", hid).order("joined_at"));
      const ids = rows.map((r) => r.uid);
      const ps = ids.length ? must(await profilesQuery((cols) => sb.from("courses_profiles").select(cols).in("uid", ids))) : [];
      const byId = Object.fromEntries(ps.map((p) => [p.uid, p]));
      return rows.map((r) => ({ uid: r.uid, joined_at: r.joined_at, name: byId[r.uid]?.name || "", emoji: byId[r.uid]?.emoji || "🙂", avatar: byId[r.uid]?.avatar || "" }));
    },
    async createHousehold(name, kind) {
      return must(await sb.rpc("courses_create_household", { hname: name, hkind: kind }));
    },
    async join(code) {
      return must(await sb.rpc("courses_join", { code }));
    },
    async rename(code, name) {
      must(await sb.rpc("courses_rename", { code, hname: name }));
    },
    async leave(code) {
      must(await sb.rpc("courses_leave", { code }));
    },
    async items(hid) {
      return must(await sb.from("courses_items").select(ITEM_COLS).eq("household", hid)).map(fixItem);
    },
    // Achats des 13 derniers mois (de quoi comparer avec l'an dernier).
    async purchases(hid) {
      const since = new Date(Date.now() - 400 * 864e5).toISOString();
      return must(
        await sb.from("courses_purchases").select(PURCHASE_COLS).eq("household", hid).gte("bought_at", since).order("bought_at", { ascending: false }).limit(3000),
      ).map(fixPurchase);
    },
    // Idempotent : renvoyer un ajout déjà reçu (après une coupure réseau) ne crée pas de doublon.
    async insertRows(tbl, rows) {
      must(await sb.from(TABLES[tbl]).upsert(rows, { onConflict: "id", ignoreDuplicates: true }));
    },
    async patchRow(tbl, id, patch) {
      must(await sb.from(TABLES[tbl]).update(patch).eq("id", id));
    },
    async deleteRows(tbl, ids) {
      must(await sb.from(TABLES[tbl]).delete().in("id", ids));
    },
    // Changements en direct sur un foyer. onItem(tbl, type, row) avec type INSERT/UPDATE/DELETE (DELETE : row = {id}).
    subscribe(hid, { onItem, onMembers, onHousehold, onStatus }) {
      const ch = sb
        .channel("courses:" + hid)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "courses_items", filter: `household=eq.${hid}` }, (p) => onItem("items", "INSERT", fixItem(p.new)))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "courses_items", filter: `household=eq.${hid}` }, (p) => onItem("items", "UPDATE", fixItem(p.new)))
        // Les suppressions ne peuvent pas être filtrées : on ne reçoit que l'identifiant.
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "courses_items" }, (p) => p.old && p.old.id && onItem("items", "DELETE", { id: p.old.id }))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "courses_purchases", filter: `household=eq.${hid}` }, (p) => onItem("purchases", "INSERT", fixPurchase(p.new)))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "courses_purchases", filter: `household=eq.${hid}` }, (p) => onItem("purchases", "UPDATE", fixPurchase(p.new)))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "courses_purchases" }, (p) => p.old && p.old.id && onItem("purchases", "DELETE", { id: p.old.id }))
        .on("postgres_changes", { event: "*", schema: "public", table: "courses_members" }, () => onMembers())
        .on("postgres_changes", { event: "*", schema: "public", table: "courses_profiles" }, () => onMembers())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "courses_households", filter: `id=eq.${hid}` }, (p) => onHousehold(p.new))
        .subscribe((status) => onStatus && onStatus(status === "SUBSCRIBED"));
      return () => sb.removeChannel(ch);
    },
    account: makeAccount(sb),
  };
}

// Sauvegarde du compte sans e-mail, commune avec Déclic : un code de 16 caractères sert de mot de passe,
// et l'adresse de connexion en est dérivée (même calcul que la fonction Edge supabase/functions/notify).
// Créer un code ne déconnecte pas ; il remplace l'ancien.
const RECOVERY_DOMAIN = "@declic-recup.invalid";
const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function recoveryEmail(norm) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("declic:" + norm)));
  return `r-${Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("")}${RECOVERY_DOMAIN}`;
}
function makeAccount(sb) {
  return {
    // Un code existe-t-il déjà pour ce compte ?
    async status() {
      const { data } = await sb.auth.getUser();
      return { hasCode: !!data?.user?.email?.endsWith(RECOVERY_DOMAIN) };
    },
    async createCode() {
      const { data } = await sb.auth.getSession();
      let r;
      try {
        r = await fetch(NOTIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + (data?.session?.access_token || "") },
          body: JSON.stringify({ type: "recovery-create" }),
        });
      } catch (e) {
        throw storeError("network", e.message);
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.code) throw storeError(j.error || "internal", j.detail || "Création du code impossible");
      return j.code;
    },
    async login(code) {
      const norm = normCode(code);
      if (norm.length !== 16) throw storeError("short_code", "Code incomplet");
      const { error } = await sb.auth.signInWithPassword({ email: await recoveryEmail(norm), password: norm });
      if (error) throw storeError(/invalid/i.test(error.message) ? "bad_code" : "network", error.message);
    },
  };
}

// ---------- démonstration (ce navigateur uniquement) ----------

function openDemo() {
  const KEY = "courses-demo-v1";
  const PARTNER = "demo-partner";
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  };
  const st = load() || { profiles: { [PARTNER]: { uid: PARTNER, name: "Sam", emoji: "🐼" } }, households: {}, members: [], items: [], purchases: [] };
  const listeners = new Set();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {}
  };
  const emit = (hid, tbl, type, row) => listeners.forEach((l) => l.hid === hid && l.onItem(tbl, type, row));
  const uid = "demo-me";
  const tick = () => new Promise((r) => setTimeout(r, 30));
  return Promise.resolve({
    uid,
    mode: "demo",
    async getProfile() {
      return st.profiles[uid] || null;
    },
    async saveProfile(p) {
      st.profiles[uid] = { uid, name: p.name, emoji: p.emoji, avatar: p.avatar || "" };
      save();
    },
    async suggested() {
      return { name: "", avatar: "" };
    },
    // En démonstration, la photo reste dans ce navigateur.
    async uploadAvatar(dataUrl) {
      return dataUrl;
    },
    canAvatar: true,
    async households() {
      return st.members.filter((m) => m.uid === uid).map((m) => st.households[m.household]).filter(Boolean);
    },
    async members(hid) {
      return st.members.filter((m) => m.household === hid).map((m) => ({ ...m, ...(st.profiles[m.uid] || { name: "", emoji: "🙂" }) }));
    },
    async createHousehold(name, kind) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X");
      st.households[code] = { id: code, name, kind, created_by: uid };
      // Une deuxième personne fictive pour voir la liste partagée.
      st.members.push({ household: code, uid, joined_at: new Date().toISOString() }, { household: code, uid: PARTNER, joined_at: new Date().toISOString() });
      // Quelques achats fictifs (ce mois-ci et le mois dernier) pour voir l'onglet Dépenses.
      const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
      const demo = [
        ["Poulet fermier", "viande", 9.8, PARTNER, 2], ["Saumon", "viande", 12.4, uid, 9], ["Tomates", "fruits", 3.2, uid, 1], ["Bananes", "fruits", 2.1, PARTNER, 4],
        ["Comté", "frais", 6.9, PARTNER, 3], ["Yaourts", "frais", 3.5, uid, 6], ["Pâtes", "epicerie", 2.4, uid, 5], ["Café", "epicerie", 7.9, PARTNER, 8],
        ["Baguette", "pain", 1.3, uid, 0], ["Lessive", "maison", 11.5, PARTNER, 7], ["Chips", "snacks", 2.6, uid, 3], ["Jus d'orange", "boissons", 3.9, PARTNER, 1],
        ["Courses du mois dernier", "autre", 58.4, uid, 35], ["Marché", "fruits", 21.3, PARTNER, 38],
      ];
      st.purchases = st.purchases || [];
      for (const [name, cat, amount, by, d] of demo)
        st.purchases.push({ id: crypto.randomUUID(), household: code, item_id: null, name, cat, amount, paid_by: by, created_by: by, bought_at: ago(d) });
      save();
      return code;
    },
    async join(code) {
      const h = st.households[String(code || "").toUpperCase().trim()];
      if (!h) return null;
      if (!st.members.some((m) => m.household === h.id && m.uid === uid)) st.members.push({ household: h.id, uid, joined_at: new Date().toISOString() });
      save();
      return h;
    },
    async rename(code, name) {
      st.households[code].name = name;
      save();
    },
    async leave(code) {
      st.members = st.members.filter((m) => !(m.household === code && m.uid === uid));
      save();
    },
    async items(hid) {
      await tick();
      return st.items.filter((i) => i.household === hid).map((i) => ({ ...i }));
    },
    async purchases(hid) {
      await tick();
      return (st.purchases || []).filter((i) => i.household === hid).map((i) => ({ ...i }));
    },
    async insertRows(tbl, rows) {
      await tick();
      const list = (st[tbl] = st[tbl] || []);
      for (const r of rows) {
        if (list.some((i) => i.id === r.id)) continue;
        const row =
          tbl === "items"
            ? { qty: "", quality: "", cat: "autre", prio: "bientot", shop: "", done: false, low: false, price: null, done_by: null, done_at: null, created_at: new Date().toISOString(), ...r }
            : { cat: "autre", item_id: null, bought_at: new Date().toISOString(), ...r };
        list.push(row);
        emit(row.household, tbl, "INSERT", { ...row });
      }
      save();
    },
    async patchRow(tbl, id, patch) {
      await tick();
      const it = (st[tbl] || []).find((i) => i.id === id);
      if (it) {
        Object.assign(it, patch);
        emit(it.household, tbl, "UPDATE", { ...it });
      }
      save();
    },
    async deleteRows(tbl, ids) {
      await tick();
      const gone = (st[tbl] || []).filter((i) => ids.includes(i.id));
      st[tbl] = (st[tbl] || []).filter((i) => !ids.includes(i.id));
      gone.forEach((i) => emit(i.household, tbl, "DELETE", { id: i.id }));
      save();
    },
    subscribe(hid, { onItem, onStatus }) {
      const l = { hid, onItem };
      listeners.add(l);
      onStatus && onStatus(true);
      return () => listeners.delete(l);
    },
    // Code de démonstration toujours identique.
    account: {
      async status() {
        return { hasCode: !!st.code };
      },
      async createCode() {
        st.code = "DEMO-2345-6789-ABCD";
        save();
        return st.code;
      },
      async login(code) {
        const n = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (n.length !== 16) throw storeError("short_code");
        if (n !== "DEMO23456789ABCD") throw storeError("bad_code");
      },
    },
  });
}
