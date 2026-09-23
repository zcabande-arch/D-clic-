// Accès aux documents avec règles de sécurité.
// Chemins utilisés par l'application :
//   profiles/{uid}
//   groups/{code}
//   groups/{code}/{photos|reactions|replies|days}/{id}
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SEG = /^[A-Za-z0-9_-]{1,120}$/;
const GROUP_SUBS = new Set(["photos", "reactions", "replies", "days"]);
const MEDIA_FIELDS = ["img", "avatar"];
const MAX_DOC = 20_000; // octets JSON, images exclues
const MAX_IMAGE = 1_500_000; // octets décodés

export class DbError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

export function parsePath(p, want) {
  if (typeof p !== "string") throw new DbError("invalid_argument", "Chemin invalide");
  const segs = p.split("/");
  if (!segs.every((s) => SEG.test(s))) throw new DbError("invalid_argument", "Chemin invalide");
  const isDoc = segs.length % 2 === 0;
  if ((want === "doc") !== isDoc) throw new DbError("invalid_argument", "Chemin invalide");
  if (isDoc) return { coll: segs.slice(0, -1).join("/"), id: segs[segs.length - 1] };
  return { coll: segs.join("/") };
}

function kindOf(coll) {
  if (coll === "profiles" || coll === "groups") return { kind: coll };
  const m = /^groups\/([^/]+)\/([^/]+)$/.exec(coll);
  if (m && GROUP_SUBS.has(m[2])) return { kind: "sub", group: m[1], sub: m[2] };
  throw new DbError("permission_denied", "Collection inconnue");
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v;
  return out;
}

const WHERE_OPS = {
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "array-contains": (a, b) => Array.isArray(a) && a.includes(b),
  in: (a, b) => Array.isArray(b) && b.includes(a),
};

export function validateQuery(where, limit) {
  if (!Array.isArray(where) || where.length > 5) throw new DbError("invalid_argument", "Requête invalide");
  for (const w of where) {
    if (!Array.isArray(w) || w.length !== 3 || typeof w[0] !== "string" || !WHERE_OPS[w[1]]) throw new DbError("invalid_argument", "Requête invalide");
  }
  if (limit != null && !(Number.isInteger(limit) && limit > 0 && limit <= 5000)) throw new DbError("invalid_argument", "Limite invalide");
}

export function createDocs(store, mediaDir) {
  fs.mkdirSync(mediaDir, { recursive: true });

  const group = (id) => store.get("groups", id)?.data || null;
  const isMember = (uid, gid) => !!group(gid)?.members?.includes(uid);

  function relatedUids(uid) {
    const set = new Set([uid]);
    for (const g of store.list("groups")) if (g.data.members?.includes(uid)) g.data.members.forEach((m) => set.add(m));
    return set;
  }

  // Renvoie un filtre (id, data) => bool des documents lisibles, ou lève permission_denied.
  function readFilter(uid, coll) {
    const k = kindOf(coll);
    if (k.kind === "profiles") {
      const rel = relatedUids(uid);
      return (id) => rel.has(id);
    }
    if (k.kind === "groups") return (_id, d) => Array.isArray(d.members) && d.members.includes(uid);
    if (!isMember(uid, k.group)) throw new DbError("permission_denied", "Tu n’es pas membre de ce groupe");
    return () => true;
  }

  function query(uid, coll, where = [], limit = null) {
    const allow = readFilter(uid, coll);
    let docs = store.list(coll).filter((d) => allow(d.id, d.data) && where.every(([f, op, v]) => WHERE_OPS[op](d.data[f], v)));
    docs.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (limit) docs = docs.slice(0, limit);
    return docs;
  }

  function get(uid, p) {
    const { coll, id } = parsePath(p, "doc");
    const k = kindOf(coll);
    const doc = store.get(coll, id);
    // N'importe quel utilisateur peut lire un groupe par son code : c'est ce qui permet de le rejoindre.
    if (k.kind !== "groups") {
      const allow = readFilter(uid, coll);
      if (doc && !allow(id, doc.data)) throw new DbError("permission_denied");
    }
    return doc ? { exists: true, data: doc.data } : { exists: false, data: null };
  }

  function checkWrite(uid, coll, id, before, after) {
    const k = kindOf(coll);
    if (k.kind === "profiles") {
      if (id !== uid || !after) throw new DbError("permission_denied");
      if (typeof after.name !== "string" || !after.name.trim() || after.name.length > 30) throw new DbError("invalid_argument", "Nom invalide");
      return;
    }
    if (k.kind === "groups") {
      if (!after) throw new DbError("permission_denied");
      const m = after.members;
      if (!Array.isArray(m) || m.some((x) => typeof x !== "string") || new Set(m).size !== m.length) throw new DbError("invalid_argument");
      if (!before) {
        if (!/^[A-Z0-9]{6}$/.test(id)) throw new DbError("invalid_argument", "Code invalide");
        if (typeof after.name !== "string" || !after.name.trim() || after.name.length > 40) throw new DbError("invalid_argument", "Nom invalide");
        if (after.createdBy !== uid || m.length !== 1 || m[0] !== uid) throw new DbError("permission_denied");
        return;
      }
      if (after.name !== before.name || after.createdBy !== before.createdBy || after.createdAt !== before.createdAt) throw new DbError("permission_denied");
      const added = m.filter((x) => !before.members.includes(x));
      const removed = before.members.filter((x) => !m.includes(x));
      const ok = (added.length === 0 && removed.length === 0) || (added.length === 1 && added[0] === uid && removed.length === 0) || (removed.length === 1 && removed[0] === uid && added.length === 0);
      if (!ok) throw new DbError("permission_denied", "Tu ne peux ajouter ou retirer que toi-même");
      return;
    }
    // Sous-collections d'un groupe : membres uniquement, et chacun n'écrit que ses propres documents.
    if (!isMember(uid, k.group)) throw new DbError("permission_denied", "Tu n’es pas membre de ce groupe");
    if (before && before.uid !== uid) throw new DbError("permission_denied");
    if (after && after.uid !== uid) throw new DbError("permission_denied");
    if (after && typeof after.date !== "string") throw new DbError("invalid_argument");
    if (k.sub !== "replies" && !id.endsWith("_" + uid)) throw new DbError("permission_denied");
    if (k.sub === "photos" && after && !(Number.isInteger(after.hour) && after.hour >= 0 && after.hour <= 23)) throw new DbError("invalid_argument");
  }

  // Les images envoyées en data: URL sont écrites sur disque et remplacées par une URL /media/…
  function storeMedia(before, after) {
    const created = [];
    for (const f of MEDIA_FIELDS) {
      const v = after[f];
      if (v == null || v === "" || (before && v === before[f])) continue;
      const m = typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(v);
      if (!m) throw new DbError("invalid_argument", "Image invalide");
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > MAX_IMAGE) throw new DbError("quota_exceeded", "Image trop lourde");
      const name = crypto.randomBytes(16).toString("hex") + "." + (m[1] === "jpeg" ? "jpg" : m[1]);
      fs.writeFileSync(path.join(mediaDir, name), buf);
      created.push(name);
      after[f] = "/media/" + name;
    }
    return created;
  }

  function dropMedia(before, after) {
    if (!before) return;
    for (const f of MEDIA_FIELDS) {
      const v = before[f];
      if (typeof v === "string" && v.startsWith("/media/") && (!after || after[f] !== v)) {
        fs.rm(path.join(mediaDir, path.basename(v)), { force: true }, () => {});
      }
    }
  }

  function write(uid, op, p, data) {
    let coll, id;
    if (op === "add") {
      ({ coll } = parsePath(p, "coll"));
      id = crypto.randomBytes(10).toString("hex");
    } else ({ coll, id } = parsePath(p, "doc"));

    if (op !== "delete" && !isObj(data)) throw new DbError("invalid_argument", "Données invalides");
    const before = store.get(coll, id)?.data || null;
    let after;
    if (op === "delete") after = null;
    else if (op === "update") {
      if (!before) throw new DbError("not_found", "Document introuvable");
      after = deepMerge(before, data);
    } else after = structuredClone(data);

    checkWrite(uid, coll, id, before, after);
    if (op === "delete") {
      if (before) {
        store.del(coll, id);
        dropMedia(before, null);
      }
      return { coll, id };
    }
    const created = storeMedia(before, after);
    if (JSON.stringify(after).length > MAX_DOC) {
      created.forEach((n) => fs.rm(path.join(mediaDir, n), { force: true }, () => {}));
      throw new DbError("quota_exceeded", "Document trop volumineux");
    }
    store.put(coll, id, after);
    dropMedia(before, after);
    return { coll, id };
  }

  return { get, query, write, readFilter };
}
