// Accès aux données de Courses : Supabase (tables de supabase/courses.sql) ou, avec « ?demo » dans l'adresse,
// une version de démonstration gardée dans ce navigateur. Les deux exposent la même API.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const ITEM_COLS = "id,household,name,qty,quality,cat,prio,shop,done,low,added_by,done_by,created_at,done_at";

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

  return {
    uid,
    mode: "supabase",
    async getProfile() {
      return must(await sb.from("courses_profiles").select("uid,name,emoji").eq("uid", uid).maybeSingle());
    },
    async saveProfile(p) {
      must(await sb.from("courses_profiles").upsert({ uid, name: p.name, emoji: p.emoji, updated_at: new Date().toISOString() }));
    },
    // Prénom déjà choisi dans Déclic, pour préremplir le profil.
    async suggestedName() {
      const r = await sb.from("docs").select("data").eq("coll", "profiles").eq("id", uid).maybeSingle();
      return (r.data && r.data.data && r.data.data.name) || "";
    },
    async households() {
      const rows = must(await sb.from("courses_members").select("household,courses_households(id,name,kind,created_by)").eq("uid", uid));
      return rows.map((r) => r.courses_households).filter(Boolean);
    },
    async members(hid) {
      const rows = must(await sb.from("courses_members").select("uid,joined_at").eq("household", hid).order("joined_at"));
      const ids = rows.map((r) => r.uid);
      const ps = ids.length ? must(await sb.from("courses_profiles").select("uid,name,emoji").in("uid", ids)) : [];
      const byId = Object.fromEntries(ps.map((p) => [p.uid, p]));
      return rows.map((r) => ({ uid: r.uid, joined_at: r.joined_at, name: byId[r.uid]?.name || "", emoji: byId[r.uid]?.emoji || "🙂" }));
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
      return must(await sb.from("courses_items").select(ITEM_COLS).eq("household", hid));
    },
    // Idempotent : renvoyer un ajout déjà reçu (après une coupure réseau) ne crée pas de doublon.
    async insertItems(rows) {
      must(await sb.from("courses_items").upsert(rows, { onConflict: "id", ignoreDuplicates: true }));
    },
    async patchItem(id, patch) {
      must(await sb.from("courses_items").update(patch).eq("id", id));
    },
    async deleteItems(ids) {
      must(await sb.from("courses_items").delete().in("id", ids));
    },
    // Changements en direct sur un foyer. onItem(type, row) avec type INSERT/UPDATE/DELETE (DELETE : row = {id}).
    subscribe(hid, { onItem, onMembers, onHousehold, onStatus }) {
      const ch = sb
        .channel("courses:" + hid)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "courses_items", filter: `household=eq.${hid}` }, (p) => onItem("INSERT", p.new))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "courses_items", filter: `household=eq.${hid}` }, (p) => onItem("UPDATE", p.new))
        // Les suppressions ne peuvent pas être filtrées : on ne reçoit que l'identifiant.
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "courses_items" }, (p) => p.old && p.old.id && onItem("DELETE", { id: p.old.id }))
        .on("postgres_changes", { event: "*", schema: "public", table: "courses_members" }, () => onMembers())
        .on("postgres_changes", { event: "*", schema: "public", table: "courses_profiles" }, () => onMembers())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "courses_households", filter: `id=eq.${hid}` }, (p) => onHousehold(p.new))
        .subscribe((status) => onStatus && onStatus(status === "SUBSCRIBED"));
      return () => sb.removeChannel(ch);
    },
    account: makeAccount(sb),
  };
}

// Compte protégé par e-mail : Supabase envoie un code à 6 chiffres (modèles d'e-mails à régler, voir le README).
const realEmail = (e) => (e && !/\.invalid$/i.test(e) ? e : "");
function emailError(error) {
  const m = error?.message || "";
  if (/already.*(registered|exists|been)/i.test(m)) return storeError("email_taken", m);
  if (/signups? not allowed|user not found/i.test(m)) return storeError("no_account", m);
  if (/expired|invalid|token/i.test(m)) return storeError("bad_code", m);
  if (/rate limit|too many|security purposes/i.test(m)) return storeError("rate_limit", m);
  if (/email.*invalid|valid email/i.test(m)) return storeError("bad_email", m);
  return mapError(error);
}
function makeAccount(sb) {
  return {
    // Adresse confirmée du compte, et adresse en attente de confirmation.
    async email() {
      const { data } = await sb.auth.getUser();
      const u = data?.user;
      return { email: realEmail(u?.email), pending: realEmail(u?.new_email) };
    },
    // 1. Lier une adresse : un code part sur cette adresse. 2. On le confirme.
    async linkEmail(email) {
      const { error } = await sb.auth.updateUser({ email });
      if (error) throw emailError(error);
    },
    async confirmEmail(email, token) {
      const { error } = await sb.auth.verifyOtp({ email, token: token.replace(/\D/g, ""), type: "email_change" });
      if (error) throw emailError(error);
    },
    // Sur un autre appareil : un code part sur l'adresse du compte, et on se connecte avec.
    async sendLoginCode(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw emailError(error);
    },
    async loginWithCode(email, token) {
      const { error } = await sb.auth.verifyOtp({ email, token: token.replace(/\D/g, ""), type: "email" });
      if (error) throw emailError(error);
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
  const st = load() || { profiles: { [PARTNER]: { uid: PARTNER, name: "Sam", emoji: "🐼" } }, households: {}, members: [], items: [] };
  const listeners = new Set();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {}
  };
  const emit = (hid, type, row) => listeners.forEach((l) => l.hid === hid && l.onItem(type, row));
  const uid = "demo-me";
  const tick = () => new Promise((r) => setTimeout(r, 30));
  return Promise.resolve({
    uid,
    mode: "demo",
    async getProfile() {
      return st.profiles[uid] || null;
    },
    async saveProfile(p) {
      st.profiles[uid] = { uid, name: p.name, emoji: p.emoji };
      save();
    },
    async suggestedName() {
      return "";
    },
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
    async insertItems(rows) {
      await tick();
      for (const r of rows) {
        if (st.items.some((i) => i.id === r.id)) continue;
        const row = { qty: "", quality: "", cat: "autre", prio: "bientot", shop: "", done: false, low: false, done_by: null, done_at: null, created_at: new Date().toISOString(), ...r };
        st.items.push(row);
        emit(row.household, "INSERT", { ...row });
      }
      save();
    },
    async patchItem(id, patch) {
      await tick();
      const it = st.items.find((i) => i.id === id);
      if (it) {
        Object.assign(it, patch);
        emit(it.household, "UPDATE", { ...it });
      }
      save();
    },
    async deleteItems(ids) {
      await tick();
      const gone = st.items.filter((i) => ids.includes(i.id));
      st.items = st.items.filter((i) => !ids.includes(i.id));
      gone.forEach((i) => emit(i.household, "DELETE", { id: i.id }));
      save();
    },
    subscribe(hid, { onItem, onStatus }) {
      const l = { hid, onItem };
      listeners.add(l);
      onStatus && onStatus(true);
      return () => listeners.delete(l);
    },
    // Faux e-mails : le code est toujours 123456.
    account: {
      async email() {
        return { email: st.email || "", pending: st.pending || "" };
      },
      async linkEmail(email) {
        st.pending = email;
        save();
      },
      async confirmEmail(email, token) {
        if (token.replace(/\D/g, "") !== "123456") throw storeError("bad_code");
        st.email = email;
        st.pending = "";
        save();
      },
      async sendLoginCode(email) {
        if (email !== st.email) throw storeError("no_account");
      },
      async loginWithCode(email, token) {
        if (token.replace(/\D/g, "") !== "123456") throw storeError("bad_code");
      },
    },
  });
}
