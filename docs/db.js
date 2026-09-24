// Client de données Déclic sur Supabase.
// Garde la même forme d'API que l'application utilise :
//   db.doc(path).get/set/update/delete, db.doc(path).collection(name)
//   db.collection(path).where(f, op, v).limit(n).onSnapshot(cb, onError), .add(data), .doc(id)
//   db.rpc(name, args)
// Les documents vivent dans une seule table « docs » (coll, id, data) protégée par les règles de supabase/schema.sql.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm";

const MEDIA_FIELDS = ["img", "avatar"];

function dbError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}
function mapError(err) {
  if (!err) return dbError("internal");
  if (err.code === "42501" || /row-level security/i.test(err.message || "")) return dbError("permission_denied", err.message);
  if (err.statusCode === "413" || err.status === 413 || /too large|exceed/i.test(err.message || "")) return dbError("quota_exceeded", err.message);
  if (/fetch|network/i.test(err.message || "")) return dbError("unavailable", err.message);
  return dbError(err.code || "internal", err.message);
}

function splitDoc(path) {
  const segs = path.split("/");
  if (segs.length % 2) throw dbError("invalid_argument", "Chemin de document invalide : " + path);
  return { coll: segs.slice(0, -1).join("/"), id: segs[segs.length - 1] };
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v;
  return out;
}

const OPS = {
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "array-contains": (a, b) => Array.isArray(a) && a.includes(b),
  in: (a, b) => Array.isArray(b) && b.includes(a),
};
const SERVER_OPS = { "==": "eq", "<": "lt", "<=": "lte", ">": "gt", ">=": "gte" };
const matches = (where, data) => where.every(([f, op, v]) => OPS[op](data?.[f], v));

export async function openDb(url, anonKey, notifyUrl) {
  const sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  let {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    const r = await sb.auth.signInAnonymously();
    if (r.error) throw mapError(r.error);
    session = r.data.session;
  }
  const uid = session.user.id;
  return { uid, db: makeDb(sb, uid), account: makeAccount(sb, notifyUrl) };
}

// Code de récupération (sans e-mail) : le code sert de mot de passe et l'adresse de connexion en est dérivée,
// exactement comme dans la fonction Edge. Créer un code ne déconnecte pas ; il remplace l'ancien.
const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function recoveryEmail(norm) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("declic:" + norm)));
  return `r-${Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("")}@declic-recup.invalid`;
}
function makeAccount(sb, notifyUrl) {
  return {
    async createCode() {
      const { data } = await sb.auth.getSession();
      const r = await fetch(notifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (data?.session?.access_token || "") },
        body: JSON.stringify({ type: "recovery-create" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.code) throw dbError(j.error || "internal", j.detail || "Création du code impossible");
      return j.code;
    },
    async login(code) {
      const norm = normCode(code);
      if (norm.length !== 16) throw dbError("invalid_argument", "Code incomplet");
      const { error } = await sb.auth.signInWithPassword({ email: await recoveryEmail(norm), password: norm });
      if (error) throw dbError(/invalid/i.test(error.message) ? "bad_code" : "unavailable", error.message);
    },
  };
}

function makeDb(sb, uid) {
  const subs = new Set();

  async function fetchSub(s) {
    let q = sb.from("docs").select("id,data").eq("coll", s.coll);
    // Filtres simples envoyés au serveur pour limiter le volume ; tout est revérifié localement.
    for (const [f, op, v] of s.where) if (SERVER_OPS[op] && typeof v === "string") q = q[SERVER_OPS[op]]("data->>" + f, v);
    q = q.order("id");
    if (s.limit) q = q.limit(s.limit);
    const { data, error } = await q;
    if (!s.active) return;
    if (error) {
      s.onError && s.onError(mapError(error));
      return;
    }
    s.docs = new Map(data.filter((r) => matches(s.where, r.data)).map((r) => [r.id, r.data]));
    s.emit();
  }

  function refresh(coll) {
    const list = [...subs].filter((s) => s.coll === coll || (coll === "groups" && s.coll === "profiles"));
    return Promise.all(list.map(fetchSub));
  }
  const refreshAll = () => Promise.all([...subs].map(fetchSub));

  // Un seul canal temps réel pour toute l'application ; Supabase n'envoie que les lignes que l'utilisateur a le droit de voir.
  let everSubscribed = false;
  let healthy = false;
  sb.channel("docs")
    .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, (p) => {
      if (p.eventType === "DELETE") {
        const { coll, id } = p.old || {};
        for (const s of subs) if (s.coll === coll && s.docs.delete(id)) s.emit();
        return;
      }
      const row = p.new;
      for (const s of subs) {
        if (s.coll !== row.coll) continue;
        if (matches(s.where, row.data)) s.docs.set(row.id, row.data);
        else if (!s.docs.delete(row.id)) continue;
        s.emit();
      }
      // Quelqu'un a rejoint ou quitté un groupe : la liste des profils visibles change.
      if (row.coll === "groups") refresh("groups");
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (everSubscribed && !healthy) refreshAll();
        everSubscribed = healthy = true;
      } else if (healthy && (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")) {
        healthy = false;
        for (const s of subs) s.onError && s.onError(dbError("unavailable"));
      }
    });
  // Sur iPhone/iPad, les connexions sont coupées en arrière-plan : on resynchronise au retour.
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refreshAll());
  addEventListener("online", refreshAll);

  async function uploadMedia(data) {
    const out = { ...data };
    for (const f of MEDIA_FIELDS) {
      const v = out[f];
      if (typeof v !== "string" || !v.startsWith("data:")) continue;
      const blob = await (await fetch(v)).blob();
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
      if (error) throw mapError(error);
      out[f] = sb.storage.from("media").getPublicUrl(path).data.publicUrl;
    }
    return out;
  }

  async function readRow(coll, id) {
    const { data, error } = await sb.from("docs").select("data").eq("coll", coll).eq("id", id).maybeSingle();
    if (error) throw mapError(error);
    return data ? data.data : null;
  }

  async function write(coll, id, data) {
    const clean = await uploadMedia(data);
    const { error } = await sb.from("docs").upsert({ coll, id, data: clean, updated_at: new Date().toISOString() }, { onConflict: "coll,id" });
    if (error) throw mapError(error);
    await refresh(coll);
  }

  class DocRef {
    constructor(path) {
      this.path = path;
      Object.assign(this, splitDoc(path));
    }
    collection(name) {
      return new Query(this.path + "/" + name);
    }
    async get() {
      const d = await readRow(this.coll, this.id);
      return { id: this.id, exists: d != null, data: () => d };
    }
    set(data) {
      return write(this.coll, this.id, data);
    }
    async update(data) {
      const before = await readRow(this.coll, this.id);
      if (before == null) throw dbError("not_found", "Document introuvable");
      return write(this.coll, this.id, deepMerge(before, data));
    }
    async delete() {
      const { error } = await sb.from("docs").delete().eq("coll", this.coll).eq("id", this.id);
      if (error) throw mapError(error);
      await refresh(this.coll);
    }
  }

  class Query {
    constructor(coll, where = [], limit = null) {
      this.coll = coll;
      this._where = where;
      this._limit = limit;
    }
    where(f, op, v) {
      if (!OPS[op]) throw dbError("invalid_argument", "Opérateur inconnu : " + op);
      return new Query(this.coll, [...this._where, [f, op, v]], this._limit);
    }
    limit(n) {
      return new Query(this.coll, this._where, n);
    }
    doc(id) {
      return new DocRef(this.coll + "/" + id);
    }
    async add(data) {
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      await write(this.coll, id, data);
      return this.doc(id);
    }
    onSnapshot(cb, onError) {
      const s = {
        coll: this.coll,
        where: this._where,
        limit: this._limit,
        onError,
        active: true,
        docs: new Map(),
        emit: () => {
          const docs = [...s.docs.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([id, d]) => ({ id, data: () => d }));
          cb({ docs, size: docs.length, empty: !docs.length });
        },
      };
      subs.add(s);
      fetchSub(s);
      return () => {
        s.active = false;
        subs.delete(s);
      };
    }
  }

  return {
    // Envoie une image (data URL) dans le stockage et renvoie son adresse publique.
    async uploadImage(dataUrl) {
      return (await uploadMedia({ img: dataUrl })).img;
    },
    async savePush(sub, tz) {
      const { error } = await sb.from("push_subs").upsert({ endpoint: sub.endpoint, uid, sub, tz }, { onConflict: "endpoint" });
      if (error) throw mapError(error);
    },
    async removePush(endpoint) {
      const { error } = await sb.from("push_subs").delete().eq("endpoint", endpoint);
      if (error) throw mapError(error);
    },
    // Canal temps réel sans base de données (indicateur « … écrit »).
    typing(group, onTyping) {
      const ch = sb.channel(`typing:${group}`, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "typing" }, (m) => m.payload && onTyping(m.payload.uid)).subscribe();
      return {
        send: () => ch.send({ type: "broadcast", event: "typing", payload: { uid } }),
        close: () => sb.removeChannel(ch),
      };
    },
    doc: (p) => new DocRef(p),
    collection: (p) => new Query(p),
    async rpc(name, args) {
      const { data, error } = await sb.rpc(name, args);
      if (error) throw mapError(error);
      await refresh("groups");
      return data;
    },
  };
}
