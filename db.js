// Client de synchronisation : même forme d'API que celle utilisée par l'application
// (db.doc(...).set/update/get/delete, db.collection(...).where(...).limit(...).onSnapshot(...), .add(...)).

const TOKEN_KEY = "declic.token";

function storageGet(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function storageSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

export function getToken() {
  return storageGet(TOKEN_KEY);
}
export function setToken(t) {
  storageSet(TOKEN_KEY, t);
}

export async function api(path, body) {
  const token = getToken();
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.error || "http_" + r.status);
    e.status = r.status;
    throw e;
  }
  return data;
}

// Récupère (ou crée) la session de cet appareil et renvoie l'identifiant utilisateur.
export async function ensureSession() {
  if (getToken()) {
    try {
      return (await api("/api/me")).uid;
    } catch (e) {
      if (e.status !== 401) throw e;
    }
  }
  const { token, uid } = await api("/api/session", {});
  setToken(token);
  return uid;
}

function dbError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

class Connection {
  constructor(token, onStatus) {
    this.token = token;
    this.onStatus = onStatus || (() => {});
    this.nextId = 1;
    this.pending = new Map();
    this.subs = new Map();
    this.waiters = [];
    this.retry = 0;
    this.open = false;
    this.start();
    addEventListener("online", () => this.kick());
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && this.kick());
  }
  kick() {
    if (!this.open && this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.start();
    }
  }
  start() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = (this.ws = new WebSocket(`${proto}//${location.host}/ws?token=${encodeURIComponent(this.token)}`));
    ws.onopen = () => {
      this.open = true;
      this.retry = 0;
      this.onStatus(true);
      for (const s of this.subs.values()) this.sendSub(s);
      this.waiters.splice(0).forEach((w) => w.resolve());
    };
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.t === "res") {
        const p = this.pending.get(m.id);
        if (!p) return;
        this.pending.delete(m.id);
        m.ok ? p.resolve(m.result) : p.reject(dbError(m.code, m.message));
      } else if (m.t === "snap") {
        const s = this.subs.get(m.sub);
        if (!s) return;
        if (m.reset) s.docs.clear();
        for (const c of m.changes) c.data == null ? s.docs.delete(c.id) : s.docs.set(c.id, c.data);
        s.emit();
      } else if (m.t === "suberr") {
        const s = this.subs.get(m.sub);
        if (s) {
          this.subs.delete(m.sub);
          s.onError && s.onError(dbError(m.code));
        }
      }
    };
    ws.onclose = () => {
      const was = this.open;
      this.open = false;
      for (const p of this.pending.values()) p.reject(dbError("unavailable", "Connexion perdue"));
      this.pending.clear();
      if (was) {
        this.onStatus(false);
        for (const s of this.subs.values()) s.onError && s.onError(dbError("unavailable"));
      }
      const delay = Math.min(1000 * 2 ** this.retry++, 15000);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.start();
      }, delay);
    };
  }
  ready(ms = 10000) {
    if (this.open) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const w = { resolve };
      this.waiters.push(w);
      setTimeout(() => {
        const i = this.waiters.indexOf(w);
        if (i >= 0) {
          this.waiters.splice(i, 1);
          reject(dbError("unavailable", "Pas de connexion"));
        }
      }, ms);
    });
  }
  async req(msg) {
    await this.ready();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ ...msg, id }));
    });
  }
  sendSub(s) {
    this.ws.send(JSON.stringify({ op: "sub", sub: s.key, path: s.path, where: s.where, limit: s.limit }));
  }
  subscribe(path, where, limit, cb, onError) {
    const key = "s" + this.nextId++;
    const s = {
      key,
      path,
      where,
      limit,
      onError,
      docs: new Map(),
      emit: () => {
        const docs = [...s.docs.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([id, d]) => ({ id, data: () => d }));
        cb({ docs, size: docs.length, empty: !docs.length });
      },
    };
    this.subs.set(key, s);
    if (this.open) this.sendSub(s);
    return () => {
      if (!this.subs.delete(key)) return;
      if (this.open) this.ws.send(JSON.stringify({ op: "unsub", sub: key }));
    };
  }
}

class DocRef {
  constructor(c, path) {
    this.c = c;
    this.path = path;
    this.id = path.split("/").pop();
  }
  collection(name) {
    return new Query(this.c, this.path + "/" + name);
  }
  async get() {
    const r = await this.c.req({ op: "get", path: this.path });
    return { id: this.id, exists: r.exists, data: () => r.data };
  }
  set(data) {
    return this.c.req({ op: "set", path: this.path, data }).then(() => {});
  }
  update(data) {
    return this.c.req({ op: "update", path: this.path, data }).then(() => {});
  }
  delete() {
    return this.c.req({ op: "delete", path: this.path }).then(() => {});
  }
}

class Query {
  constructor(c, path, where = [], limit = null) {
    this.c = c;
    this.path = path;
    this._where = where;
    this._limit = limit;
  }
  where(field, op, value) {
    return new Query(this.c, this.path, [...this._where, [field, op, value]], this._limit);
  }
  limit(n) {
    return new Query(this.c, this.path, this._where, n);
  }
  doc(id) {
    return new DocRef(this.c, this.path + "/" + id);
  }
  async add(data) {
    const r = await this.c.req({ op: "add", path: this.path, data });
    return this.doc(r.id);
  }
  onSnapshot(cb, onError) {
    return this.c.subscribe(this.path, this._where, this._limit, cb, onError);
  }
}

export function connect(onStatus) {
  const c = new Connection(getToken(), onStatus);
  return {
    doc: (p) => new DocRef(c, p),
    collection: (p) => new Query(c, p),
  };
}
