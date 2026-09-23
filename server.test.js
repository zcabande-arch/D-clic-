import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import WebSocket from "ws";

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "declic-test-"));
let proc;

before(async () => {
  proc = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.js"], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: "pipe" });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + "/api/push/key");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("server did not start");
});
after(() => {
  proc.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function client() {
  const { token, uid } = await (await fetch(BASE + "/api/session", { method: "POST" })).json();
  const ws = new WebSocket(`ws://localhost:${PORT}/ws?token=${token}`);
  await new Promise((res, rej) => (ws.on("open", res), ws.on("error", rej)));
  let n = 0;
  const pending = new Map();
  const snaps = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(raw);
    if (m.t === "res") pending.get(m.id)?.(m);
    else snaps.push(m);
  });
  const req = (msg) =>
    new Promise((resolve) => {
      const id = ++n;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ ...msg, id }));
    });
  return { uid, token, ws, req, snaps };
}
const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("groupes, photos, règles d'accès et temps réel", async () => {
  const a = await client();
  const b = await client();
  const c = await client();

  assert.equal((await a.req({ op: "set", path: "profiles/" + a.uid, data: { name: "Alice", avatar: PIXEL } })).ok, true);
  assert.equal((await b.req({ op: "set", path: "profiles/" + b.uid, data: { name: "Bob", avatar: "" } })).ok, true);
  const forged = await b.req({ op: "set", path: "profiles/" + a.uid, data: { name: "Pirate" } });
  assert.equal(forged.code, "permission_denied");

  // L'avatar est extrait vers /media et servi.
  const prof = await a.req({ op: "get", path: "profiles/" + a.uid });
  assert.match(prof.result.data.avatar, /^\/media\/[a-f0-9]{32}\.png$/);
  assert.equal((await fetch(BASE + prof.result.data.avatar)).status, 200);

  // Création de groupe et abonnement de B aux groupes dont il est membre.
  assert.equal((await a.req({ op: "set", path: "groups/ABC234", data: { name: "Coloc", members: [a.uid], createdBy: a.uid, createdAt: 1 } })).ok, true);
  await b.req({ op: "sub", sub: "g", path: "groups", where: [["members", "array-contains", b.uid]] });
  await wait();
  assert.deepEqual(b.snaps.at(-1).changes, []);

  // B ne peut pas ajouter quelqu'un d'autre, mais peut se rejoindre lui-même.
  assert.equal((await b.req({ op: "update", path: "groups/ABC234", data: { members: [a.uid, c.uid] } })).code, "permission_denied");
  assert.equal((await b.req({ op: "get", path: "groups/ABC234/photos/x_" + b.uid })).code, "permission_denied");
  assert.equal((await b.req({ op: "update", path: "groups/ABC234", data: { members: [a.uid, b.uid] } })).ok, true);
  await wait();
  assert.equal(b.snaps.at(-1).changes[0].id, "ABC234");

  // Photos : chacun n'écrit que les siennes, et les autres membres les reçoivent en direct.
  await b.req({ op: "sub", sub: "p", path: "groups/ABC234/photos", where: [["date", "==", "2026-09-23"]] });
  const photoId = `2026-09-23_09_${a.uid}`;
  const put = await a.req({ op: "set", path: "groups/ABC234/photos/" + photoId, data: { uid: a.uid, date: "2026-09-23", hour: 9, ts: 1, lateMin: 2, img: PIXEL, caption: "Café" } });
  assert.equal(put.ok, true);
  assert.equal((await b.req({ op: "set", path: "groups/ABC234/photos/" + photoId, data: { uid: b.uid, date: "2026-09-23", hour: 9 } })).code, "permission_denied");
  await wait();
  const snap = b.snaps.filter((s) => s.sub === "p").at(-1);
  assert.equal(snap.changes[0].id, photoId);
  assert.match(snap.changes[0].data.img, /^\/media\//);

  // Mise à jour fusionnée des créneaux (days).
  const day = `groups/ABC234/days/2026-09-23_${a.uid}`;
  await a.req({ op: "set", path: day, data: { uid: a.uid, date: "2026-09-23", slots: { 9: 2 } } });
  await a.req({ op: "update", path: day, data: { slots: { 10: 15 } } });
  assert.deepEqual((await a.req({ op: "get", path: day })).result.data.slots, { 9: 2, 10: 15 });

  // Réponse avec identifiant généré.
  const rep = await b.req({ op: "add", path: "groups/ABC234/replies", data: { photoId, uid: b.uid, text: "Miam", img: "", date: "2026-09-23", ts: 2 } });
  assert.equal(rep.ok, true);
  assert.ok(rep.result.id);

  // C (non membre) ne voit ni les photos ni le profil d'Alice.
  const denied = await c.req({ op: "sub", sub: "x", path: "groups/ABC234/photos" });
  assert.equal(denied.ok, true);
  await wait();
  assert.equal(c.snaps.at(-1).t, "suberr");
  await c.req({ op: "sub", sub: "pr", path: "profiles" });
  await wait();
  assert.deepEqual(c.snaps.at(-1).changes, []);

  // B quitte le groupe : il perd l'accès aux photos.
  assert.equal((await b.req({ op: "update", path: "groups/ABC234", data: { members: [a.uid] } })).ok, true);
  await wait();
  assert.ok(b.snaps.some((s) => s.sub === "p" && s.t === "suberr"));

  // Connexion refusée sans jeton valide.
  const bad = new WebSocket(`ws://localhost:${PORT}/ws?token=nope`);
  await new Promise((res) => bad.on("error", res));

  for (const x of [a, b, c]) x.ws.close();
});
