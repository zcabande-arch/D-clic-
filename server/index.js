// Serveur Déclic : fichiers statiques, API de session, rappels push et synchronisation temps réel (WebSocket).
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { openStore } from "./store.js";
import { createDocs, DbError, parsePath, validateQuery } from "./docs.js";
import { setupPush, validTz } from "./push.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const MEDIA = path.join(DATA, "media");
const PORT = Number(process.env.PORT || 3000);

fs.mkdirSync(DATA, { recursive: true });
const store = openStore(path.join(DATA, "declic.db"));
const docs = createDocs(store, MEDIA);
const push = setupPush(store, DATA);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...headers });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { "Content-Type": "application/json", "Cache-Control": "no-store" });

function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Introuvable");
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  });
}

function readJson(req, limit = 16_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too_large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function authUid(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  return token ? store.sessionUid(token) : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  try {
    if (p === "/api/session" && req.method === "POST") {
      const token = crypto.randomBytes(24).toString("base64url");
      const uid = "u_" + crypto.randomBytes(9).toString("base64url").replace(/[^A-Za-z0-9]/g, "x");
      store.createSession(token, uid);
      return json(res, 200, { token, uid });
    }
    if (p === "/api/me" && req.method === "GET") {
      const uid = authUid(req);
      return uid ? json(res, 200, { uid }) : json(res, 401, { error: "unauthenticated" });
    }
    if (p === "/api/push/key" && req.method === "GET") return json(res, 200, { key: push.publicKey });
    if (p === "/api/push/subscribe" && req.method === "POST") {
      const uid = authUid(req);
      if (!uid) return json(res, 401, { error: "unauthenticated" });
      const { sub, tz } = await readJson(req);
      if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth || !validTz(tz)) return json(res, 400, { error: "invalid_argument" });
      store.pushSave(sub.endpoint, uid, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, tz);
      return json(res, 200, { ok: true });
    }
    if (p === "/api/push/unsubscribe" && req.method === "POST") {
      const uid = authUid(req);
      if (!uid) return json(res, 401, { error: "unauthenticated" });
      const { endpoint } = await readJson(req);
      if (typeof endpoint === "string") store.pushRemove(endpoint, uid);
      return json(res, 200, { ok: true });
    }
    if (p.startsWith("/api/")) return json(res, 404, { error: "not_found" });

    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Méthode non autorisée");
    if (p.startsWith("/media/")) {
      const name = p.slice(7);
      if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name)) return send(res, 404, "Introuvable");
      return serveFile(res, path.join(MEDIA, name), "private, max-age=31536000, immutable");
    }
    const rel = p === "/" ? "index.html" : decodeURIComponent(p.slice(1));
    const file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 404, "Introuvable");
    return serveFile(res, file, rel === "sw.js" || rel === "index.html" ? "no-cache" : "public, max-age=300");
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "internal" });
  }
});

// ---------- temps réel ----------
const subs = new Set(); // { ws, uid, key, coll, where, limit, seen: Map<id, v> }

function evaluate(s, reset) {
  let list;
  try {
    list = docs.query(s.uid, s.coll, s.where, s.limit);
  } catch (e) {
    s.ws.send(JSON.stringify({ t: "suberr", sub: s.key, code: e.code || "internal" }));
    subs.delete(s);
    return;
  }
  const next = new Map(list.map((d) => [d.id, d.v]));
  const changes = [];
  for (const d of list) if (reset || s.seen.get(d.id) !== d.v) changes.push({ id: d.id, data: d.data });
  if (!reset) for (const id of s.seen.keys()) if (!next.has(id)) changes.push({ id, data: null });
  s.seen = next;
  if (reset || changes.length) s.ws.send(JSON.stringify({ t: "snap", sub: s.key, reset: !!reset, changes }));
}

function changed(coll) {
  // L'appartenance aux groupes conditionne tout ce qui est visible : on réévalue tout quand un groupe change.
  for (const s of subs) if (coll === "groups" || s.coll === coll) evaluate(s, false);
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://x");
  const uid = url.pathname === "/ws" ? store.sessionUid(url.searchParams.get("token") || "") : null;
  if (!uid) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, uid));
});

wss.on("connection", (ws, uid) => {
  const mine = new Map();
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  ws.on("message", (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const reply = (body) => m.id != null && ws.send(JSON.stringify({ t: "res", id: m.id, ...body }));
    try {
      switch (m.op) {
        case "get":
          return reply({ ok: true, result: docs.get(uid, m.path) });
        case "set":
        case "update":
        case "delete":
        case "add": {
          const { coll, id } = docs.write(uid, m.op, m.path, m.data);
          // Les instantanés partent avant la réponse : quand la promesse du client se résout,
          // ses abonnements reflètent déjà l'écriture (comme la compensation de latence de Firestore).
          changed(coll);
          return reply({ ok: true, result: { id } });
        }
        case "sub": {
          const { coll } = parsePath(m.path, "coll");
          const where = m.where || [];
          validateQuery(where, m.limit);
          const old = mine.get(m.sub);
          if (old) subs.delete(old);
          const s = { ws, uid, key: m.sub, coll, where, limit: m.limit || null, seen: new Map() };
          mine.set(m.sub, s);
          subs.add(s);
          reply({ ok: true });
          return evaluate(s, true);
        }
        case "unsub": {
          const s = mine.get(m.sub);
          if (s) subs.delete(s);
          mine.delete(m.sub);
          return reply({ ok: true });
        }
        default:
          throw new DbError("invalid_argument", "Opération inconnue");
      }
    } catch (e) {
      if (!(e instanceof DbError)) console.error(e);
      reply({ ok: false, code: e.code || "internal", message: e instanceof DbError ? e.message : "Erreur interne" });
    }
  });
  ws.on("close", () => {
    for (const s of mine.values()) subs.delete(s);
    mine.clear();
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000).unref();

server.listen(PORT, () => console.log(`Déclic prêt sur http://localhost:${PORT}`));
