// Persistance SQLite : documents JSON rangés par collection, sessions et abonnements push.
import { DatabaseSync } from "node:sqlite";

export function openStore(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS docs (
      coll TEXT NOT NULL,
      id   TEXT NOT NULL,
      data TEXT NOT NULL,
      v    INTEGER NOT NULL,
      PRIMARY KEY (coll, id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token   TEXT PRIMARY KEY,
      uid     TEXT NOT NULL,
      created INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS push (
      endpoint TEXT PRIMARY KEY,
      uid      TEXT NOT NULL,
      sub      TEXT NOT NULL,
      tz       TEXT NOT NULL,
      last     TEXT
    );
  `);

  const q = {
    get: db.prepare("SELECT data, v FROM docs WHERE coll = ? AND id = ?"),
    list: db.prepare("SELECT id, data, v FROM docs WHERE coll = ?"),
    put: db.prepare("INSERT INTO docs (coll, id, data, v) VALUES (?, ?, ?, ?) ON CONFLICT (coll, id) DO UPDATE SET data = excluded.data, v = excluded.v"),
    del: db.prepare("DELETE FROM docs WHERE coll = ? AND id = ?"),
    maxV: db.prepare("SELECT COALESCE(MAX(v), 0) AS v FROM docs"),
    session: db.prepare("SELECT uid FROM sessions WHERE token = ?"),
    newSession: db.prepare("INSERT INTO sessions (token, uid, created) VALUES (?, ?, ?)"),
    pushPut: db.prepare("INSERT INTO push (endpoint, uid, sub, tz, last) VALUES (?, ?, ?, ?, NULL) ON CONFLICT (endpoint) DO UPDATE SET uid = excluded.uid, sub = excluded.sub, tz = excluded.tz"),
    pushDel: db.prepare("DELETE FROM push WHERE endpoint = ?"),
    pushDelFor: db.prepare("DELETE FROM push WHERE endpoint = ? AND uid = ?"),
    pushAll: db.prepare("SELECT endpoint, uid, sub, tz, last FROM push"),
    pushLast: db.prepare("UPDATE push SET last = ? WHERE endpoint = ?"),
  };

  let rev = q.maxV.get().v;

  return {
    get(coll, id) {
      const r = q.get.get(coll, id);
      return r ? { data: JSON.parse(r.data), v: r.v } : null;
    },
    list(coll) {
      return q.list.all(coll).map((r) => ({ id: r.id, data: JSON.parse(r.data), v: r.v }));
    },
    put(coll, id, data) {
      q.put.run(coll, id, JSON.stringify(data), ++rev);
    },
    del(coll, id) {
      q.del.run(coll, id);
    },
    sessionUid(token) {
      const r = q.session.get(token);
      return r ? r.uid : null;
    },
    createSession(token, uid) {
      q.newSession.run(token, uid, Date.now());
    },
    pushSave(endpoint, uid, sub, tz) {
      q.pushPut.run(endpoint, uid, JSON.stringify(sub), tz);
    },
    pushRemove(endpoint, uid) {
      if (uid) q.pushDelFor.run(endpoint, uid);
      else q.pushDel.run(endpoint);
    },
    pushList() {
      return q.pushAll.all().map((r) => ({ ...r, sub: JSON.parse(r.sub) }));
    },
    pushMark(endpoint, key) {
      q.pushLast.run(key, endpoint);
    },
  };
}
