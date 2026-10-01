// Courses : la liste de courses partagée du foyer (famille, coloc, couple, amis) et ce qu'il y a déjà dans la cuisine.
// Un article est soit sur la liste de courses (done = false), soit acheté et « dans notre cuisine » (done = true).
// Les changements s'affichent tout de suite et partent dans une file d'attente : sans réseau (au fond du magasin),
// tout reste utilisable et se synchronise dès que la connexion revient.
import { openStore } from "./store.js";

const CATS = [
  { id: "fruits", e: "🥦", l: "Fruits & légumes" },
  { id: "viande", e: "🥩", l: "Viande & poisson" },
  { id: "frais", e: "🧀", l: "Frais & laitiers" },
  { id: "epicerie", e: "🍝", l: "Épicerie" },
  { id: "conserves", e: "🥫", l: "Conserves & sauces" },
  { id: "epices", e: "🧂", l: "Épices & condiments" },
  { id: "pain", e: "🥖", l: "Boulangerie" },
  { id: "surgeles", e: "🧊", l: "Surgelés" },
  { id: "boissons", e: "🥤", l: "Boissons" },
  { id: "snacks", e: "🍫", l: "Snacks" },
  { id: "hygiene", e: "🧴", l: "Hygiène & beauté" },
  { id: "maison", e: "🧽", l: "Maison & entretien" },
  { id: "bebe", e: "🍼", l: "Bébé & animaux" },
  { id: "autre", e: "🧺", l: "Autre" },
];
const PRIOS = [
  { id: "urgent", l: "🔥 Urgent" },
  { id: "bientot", l: "Bientôt" },
  { id: "plustard", l: "Quand on peut" },
];
const SHOPS = [
  { id: "", l: "Peu importe" },
  { id: "super", l: "Supermarché" },
  { id: "marche", l: "Marché" },
  { id: "boucherie", l: "Boucherie" },
  { id: "boulangerie", l: "Boulangerie" },
  { id: "bio", l: "Magasin bio" },
  { id: "pharmacie", l: "Pharmacie" },
];
// « pour » complète « Une liste pour … ».
const KINDS = [
  { id: "famille", l: "Famille", d: "Toute la maisonnée", pour: "la famille", ph: "La famille" },
  { id: "coloc", l: "Coloc", d: "Entre colocataires", pour: "la coloc", ph: "L'appart" },
  { id: "couple", l: "Couple", d: "À deux", pour: "vous deux", ph: "Chez nous" },
  { id: "amis", l: "Amis", d: "Vacances, week-ends, soirées", pour: "la bande", ph: "Le week-end entre potes" },
];
const KIND_OTHER = { id: "autre", l: "Autre", d: "", pour: "vous", ph: "Notre liste", img: "autre" };
const kindOf = (id) => KINDS.find((k) => k.id === id) || KIND_OTHER;
const EMOJIS = ["🦊", "🐻", "🐼", "🐨", "🐸", "🐙", "🦄", "🐝", "🐱", "🐶", "🌻", "🍓", "🥑", "🍕", "⭐", "🌙"];
const PRANK = { urgent: 0, bientot: 1, plustard: 2 };

// Illustrations (Fluent Emoji 3D, licence MIT : voir illus/LICENCE.txt).
const ill = (name, cls = "ill") => `<img class="${cls}" src="illus/${name}.webp" alt="" aria-hidden="true" draggable="false">`;
const catIll = (id, cls) => ill(CATS.some((c) => c.id === id) ? id : "autre", cls);
const logo = (cls = "logo") => `<img class="${cls}" src="icons/logo.png" alt="Courses" draggable="false">`;
const kindIll = (id, cls) => ill(KINDS.some((k) => k.id === id) ? id : "autre", cls);

// ---------- rayon deviné à partir du nom ----------
const GUESS = {
  fruits: "pomme, poire, banane, orange, clementine, citron, fraise, framboise, myrtille, tomate, salade, laitue, roquette, mache, carotte, courgette, oignon, ail, echalote, pomme de terre, patate, poivron, concombre, avocat, champignon, epinard, brocoli, chou, poireau, aubergine, kiwi, raisin, mangue, ananas, melon, pasteque, peche, abricot, prune, cerise, legume, fruit, herbes fraiches, basilic, persil, coriandre, menthe, ciboulette, gingembre, radis, betterave, celeri, fenouil, potiron, butternut, patate douce",
  viande: "poulet, boeuf, steak, jambon, lardon, saucisse, saucisson, porc, dinde, canard, agneau, veau, poisson, saumon, thon frais, cabillaud, colin, crevette, moules, viande, hache, merguez, chipolata, escalope, filet de poulet, cordon bleu, nuggets",
  frais: "lait, beurre, yaourt, yogourt, fromage, creme fraiche, creme, oeuf, mozza, mozzarella, parmesan, feta, emmental, comte, chevre, raclette, skyr, tofu, houmous, fromage blanc, petit suisse, burrata, ricotta, mascarpone, gruyere, pate a tarte, pate feuilletee, pate brisee, gnocchi",
  epicerie: "pates, riz, farine, sucre, huile, vinaigre, cereale, muesli, granola, flocon, avoine, lentille, pois chiche, quinoa, semoule, boulgour, cafe, the, tisane, miel, confiture, chocolat en poudre, chocolat noir, chocolat patissier, levure, maizena, polenta, nouilles, spaghetti, tagliatelle, penne, coquillettes, fusilli, lasagne, puree, pate a tartiner, nutella, beurre de cacahuete, lait de coco, chapelure",
  conserves: "sauce, sauce tomate, concassee, pesto, conserve, haricot rouge, haricots rouges, mais, coulis, bouillon, soupe, moutarde, ketchup, mayo, mayonnaise, sauce soja, thon, sardine, olive, cornichon, capres, pulpe de tomate",
  epices: "sel, poivre, epice, paprika, curry, cumin, cannelle, origan, thym, herbes de provence, piment, muscade, curcuma, laurier, vanille",
  pain: "pain, baguette, brioche, pain de mie, tortilla, wrap, croissant, biscotte, pain au chocolat, chocolatine, pita, burger bun",
  surgeles: "surgele, glace, frite, petits pois, pizza, poelee, sorbet",
  boissons: "eau, jus, soda, biere, vin, coca, sirop, limonade, cidre, champagne, lait vegetal, lait d'avoine, lait d'amande, lait de soja, lait de riz, kombucha, ice tea",
  snacks: "chips, gateau, biscuit, cookie, bonbon, apero, cacahuete, noix, amande, barre, chocolat, madeleine, compote, crackers, pop corn",
  hygiene: "dentifrice, brosse a dents, shampoing, shampooing, apres shampoing, gel douche, savon, deodorant, coton tige, coton, rasoir, serviette hygienique, tampon, protege slip, mouchoir, creme solaire, creme hydratante, maquillage, demaquillant",
  maison: "papier toilette, pq, essuie tout, sopalin, lessive, adoucissant, liquide vaisselle, tablettes lave vaisselle, pastilles lave vaisselle, eponge, sac poubelle, sacs poubelle, javel, nettoyant, vinaigre blanc, aluminium, papier cuisson, film alimentaire, ampoule, pile, allumette, bougie",
  bebe: "couche, lingette, lait infantile, petit pot, croquette, litiere, patee",
};
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
// Mots-clés triés du plus long au plus court : « sauce tomate » l'emporte sur « tomate », « lait d'avoine » sur « lait ».
const KEYWORDS = Object.entries(GUESS)
  .flatMap(([cat, words]) => words.split(",").map((w) => [w.trim(), cat]))
  .sort((a, b) => b[0].length - a[0].length);
function guessCat(name) {
  const n = " " + norm(name).replace(/[^a-z0-9' ]/g, " ") + " ";
  const memo = loadJSON("courses:memo", {})[norm(name)];
  if (memo && memo.cat) return memo.cat;
  // Le mot-clé doit commencer un mot (« eau » ne doit pas trouver « gâteau »), le pluriel passe (« pommes »).
  for (const [w, cat] of KEYWORDS) if (n.includes(" " + w)) return cat;
  return "autre";
}

// « 2 paquets de pâtes » → { qty: "2 paquets", name: "pâtes" } ; « lait x3 » → { qty: "3", name: "lait" }.
const UNITS = "kg|g|gr|l|cl|ml|paquets?|boites?|boîtes?|bouteilles?|pots?|sachets?|briques?|barquettes?|tranches?|bottes?|filets?|packs?|rouleaux?|douzaines?";
function parseQuick(text) {
  const t = text.trim().replace(/\s+/g, " ");
  let m = t.match(new RegExp(`^(\\d+(?:[.,]\\d+)?|une?|deux|trois|quatre|cinq|six)\\s*(?:(${UNITS})\\b\\.?\\s*)?(?:x\\s+)?(?:(?:de|d')\\s*)?(.+)$`, "i"));
  if (m && m[3] && !/^\d/.test(m[3]) && (m[2] || /^\d/.test(m[1]))) return { qty: (m[1] + (m[2] ? " " + m[2] : "")).trim(), name: cap(m[3]) };
  m = t.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
  if (m) return { qty: m[2], name: cap(m[1]) };
  return { qty: "", name: cap(t) };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- petits outils ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function loadJSON(k, d) {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? d;
  } catch {
    return d;
  }
}
function saveJSON(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
const nowIso = () => new Date().toISOString();
function ago(iso) {
  if (!iso) return "";
  const d = new Date(iso),
    s = (Date.now() - d) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  const today = new Date().toDateString(),
    yest = new Date(Date.now() - 864e5).toDateString();
  const hm = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today) return `aujourd'hui à ${hm}`;
  if (d.toDateString() === yest) return `hier à ${hm}`;
  const days = Math.round(s / 86400);
  if (days < 7) return `il y a ${days} jours`;
  return "le " + d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
let toastTimer;
function toast(text, action, onAction) {
  $("#toastText").textContent = text;
  const b = $("#toastBtn");
  b.hidden = !action;
  b.textContent = action || "";
  b.onclick = () => {
    $("#toast").classList.remove("show");
    onAction && onAction();
  };
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), action ? 5000 : 2600);
}
function errText(e) {
  if (!e) return "Une erreur est survenue.";
  if (e.code === "network") return "Pas de connexion. Réessaie quand le réseau revient.";
  if (e.code === "setup") return "La base n'est pas prête : il faut lancer supabase/courses.sql dans Supabase (voir le README).";
  if (e.code === "denied") return "Tu n'as pas accès à cette liste.";
  if (e.code === "bad_code") return "Code incorrect ou expiré. Vérifie le dernier e-mail reçu.";
  if (e.code === "email_taken") return "Cette adresse est déjà liée à un autre compte. Pour l'ouvrir ici, utilise « J'ai déjà un compte ».";
  if (e.code === "no_account") return "Aucun compte n'est lié à cette adresse.";
  if (e.code === "rate_limit") return "Trop de demandes d'un coup : attends quelques minutes avant de redemander un code.";
  if (e.code === "bad_email") return "Cette adresse e-mail n'a pas l'air valide.";
  return "Une erreur est survenue, réessaie.";
}
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// ---------- état ----------
const S = {
  store: null,
  uid: loadJSON("courses:uid", null),
  me: loadJSON("courses:me", null),
  email: { email: "", pending: "" },
  households: loadJSON("courses:households", []),
  hid: loadJSON("courses:hid", null),
  members: [],
  server: new Map(), // articles tels que la base les connaît
  queue: loadJSON("courses:queue", []), // changements pas encore envoyés
  view: loadJSON("courses:view", "list"), // « list » : liste de courses ; « kitchen » : dans notre cuisine
  shop: "",
  kfilter: "all",
  screen: "loading",
  onb: { kind: null, mode: null }, // choix faits à la première ouverture
  live: null,
  flushing: false,
  connecting: false,
  unsub: null,
  editingId: null,
  sheetPlace: "list",
  flashId: null,
  bootError: null,
};
const household = () => S.households.find((h) => h.id === S.hid) || null;
const memberName = (uid) => (uid === S.uid ? "toi" : S.members.find((m) => m.uid === uid)?.name || "quelqu'un");

function cacheHousehold() {
  if (!S.hid) return;
  saveJSON("courses:cache:" + S.hid, { items: [...S.server.values()], members: S.members });
}
function restoreHousehold() {
  const c = loadJSON("courses:cache:" + S.hid, null);
  S.server = new Map((c?.items || []).map((r) => [r.id, r]));
  S.members = c?.members || [];
}

// Ce qui est affiché = ce que la base connaît + les changements en attente.
function viewItems() {
  const m = new Map([...S.server].map(([k, v]) => [k, { ...v }]));
  for (const op of S.queue) {
    if (op.hid !== S.hid) continue;
    if (op.t === "insert") for (const r of op.rows) m.set(r.id, { ...r, _pending: true });
    else if (op.t === "patch") {
      const it = m.get(op.id);
      if (it) m.set(op.id, { ...it, ...op.patch, _pending: true });
    } else if (op.t === "delete") op.ids.forEach((id) => m.delete(id));
  }
  return [...m.values()];
}

// ---------- file d'attente des changements ----------
function enqueue(op) {
  op.hid = S.hid;
  S.queue.push(op);
  saveJSON("courses:queue", S.queue);
  render();
  flush();
}
async function flush() {
  if (S.flushing || !S.store || !S.queue.length) return;
  S.flushing = true;
  try {
    while (S.queue.length) {
      const op = S.queue[0];
      try {
        if (op.t === "insert") await S.store.insertItems(op.rows);
        else if (op.t === "patch") await S.store.patchItem(op.id, op.patch);
        else if (op.t === "delete") await S.store.deleteItems(op.ids);
        // Ce qui vient d'être envoyé fait désormais partie de l'état connu, même si le temps réel est coupé.
        if (op.hid === S.hid) applyToServer(op);
      } catch (e) {
        if (e.code === "network") break; // on réessaiera au retour du réseau
        toast(op.t === "insert" ? "Article non ajouté : " + errText(e) : "Modification refusée : " + errText(e));
      }
      S.queue.shift();
      saveJSON("courses:queue", S.queue);
    }
  } finally {
    S.flushing = false;
    cacheHousehold();
    render();
  }
}
function applyToServer(op) {
  if (op.t === "insert") for (const r of op.rows) S.server.set(r.id, { ...r });
  else if (op.t === "patch") {
    const it = S.server.get(op.id);
    if (it) S.server.set(op.id, { ...it, ...op.patch });
  } else if (op.t === "delete") op.ids.forEach((id) => S.server.delete(id));
}

// ---------- actions sur les articles ----------
function remember(it) {
  const memo = loadJSON("courses:memo", {});
  const k = norm(it.name);
  if (!k) return;
  memo[k] = { name: it.name, cat: it.cat, quality: it.quality || "", shop: it.shop || "", n: (memo[k]?.n || 0) + 1, at: Date.now() };
  // On garde les 300 articles les plus récents.
  const keys = Object.keys(memo);
  if (keys.length > 300) keys.sort((a, b) => memo[a].at - memo[b].at).slice(0, keys.length - 300).forEach((x) => delete memo[x]);
  saveJSON("courses:memo", memo);
}
const TO_LIST = () => ({ done: false, low: false, done_by: null, done_at: null, added_by: S.uid, created_at: nowIso() });
const TO_KITCHEN = () => ({ done: true, low: false, done_by: S.uid, done_at: nowIso() });

// place : « list » (à acheter) ou « kitchen » (on l'a déjà).
function addItem(data, place) {
  const same = viewItems().find((i) => norm(i.name) === norm(data.name));
  const extra = {};
  if (data.qty) extra.qty = data.qty;
  if (same) {
    S.flashId = same.id;
    if (place === "list" && !same.done) {
      if (data.qty && data.qty !== same.qty) {
        enqueue({ t: "patch", id: same.id, patch: extra });
        toast(`« ${same.name} » était déjà sur la liste : quantité mise à jour`);
      } else {
        toast(`« ${same.name} » est déjà sur la liste`);
        render();
      }
    } else if (place === "list") {
      // Il était dans la cuisine : on le remet sur la liste au lieu de créer un doublon.
      enqueue({ t: "patch", id: same.id, patch: { ...extra, ...TO_LIST() } });
      toast(`« ${same.name} » ajouté à la liste`);
    } else if (same.done) {
      if (same.low || data.qty) enqueue({ t: "patch", id: same.id, patch: { ...extra, low: false } });
      else render();
      toast(same.low ? `« ${same.name} » : stock refait` : `« ${same.name} » est déjà dans la cuisine`);
    } else {
      enqueue({ t: "patch", id: same.id, patch: { ...extra, ...TO_KITCHEN() } });
      toast(`« ${same.name} » rayé de la liste et rangé dans la cuisine`);
    }
    return;
  }
  const row = {
    id: uuid(),
    household: S.hid,
    name: data.name,
    qty: data.qty || "",
    quality: data.quality || "",
    cat: data.cat || "autre",
    prio: data.prio || "bientot",
    shop: data.shop || "",
    done: place === "kitchen",
    low: false,
    added_by: S.uid,
    done_by: place === "kitchen" ? S.uid : null,
    created_at: nowIso(),
    done_at: place === "kitchen" ? nowIso() : null,
  };
  remember(row);
  S.flashId = row.id;
  enqueue({ t: "insert", rows: [row] });
}
const snapshot = (it) => ({ done: it.done, low: !!it.low, done_by: it.done_by, done_at: it.done_at, added_by: it.added_by, created_at: it.created_at, prio: it.prio });
// Coché sur la liste : il part dans la cuisine.
function bought(it) {
  const before = snapshot(it);
  enqueue({ t: "patch", id: it.id, patch: TO_KITCHEN() });
  toast(`« ${it.name} » rangé dans la cuisine`, "Annuler", () => enqueue({ t: "patch", id: it.id, patch: before }));
}
// Fini dans la cuisine : il repart sur la liste de courses.
function finished(it) {
  const before = snapshot(it);
  enqueue({ t: "patch", id: it.id, patch: { ...TO_LIST(), prio: it.low ? "urgent" : "bientot" } });
  toast(`« ${it.name} » ajouté à la liste de courses`, "Annuler", () => enqueue({ t: "patch", id: it.id, patch: before }));
}
function removeItems(list, msg) {
  if (!list.length) return;
  const rows = list.map(({ _pending, ...r }) => r);
  enqueue({ t: "delete", ids: rows.map((r) => r.id) });
  toast(msg, "Annuler", () => enqueue({ t: "insert", rows }));
}

// ---------- affichage ----------
function render() {
  const app = $("#app");
  document.body.classList.toggle("has-nav", S.screen === "main");
  if (S.screen === "loading") app.innerHTML = `<p class="loading">${logo("logo bob")}</p>`;
  else if (S.screen === "error") renderError(app);
  else if (S.screen === "welcome") renderWelcome(app);
  else if (S.screen === "profile") renderProfileSetup(app);
  else if (S.screen === "setup") renderHouseholdSetup(app);
  else renderMain(app);
}

function renderError(app) {
  app.innerHTML = `<div class="intro">${logo()}<h1>Courses</h1>
    <p class="lead">${esc(errText(S.bootError))}</p>
    <button class="btn wide" id="retry">Réessayer</button></div>`;
  $("#retry").onclick = () => location.reload();
}

// Première ouverture : « C'est pour qui ? »
function renderWelcome(app) {
  app.innerHTML = `<div class="intro">
    ${logo()}
    <h1>Bienvenue&nbsp;!</h1>
    <p class="lead">La liste de courses partagée de ton foyer&nbsp;: ce qu'il faut acheter, et ce qu'il y a déjà dans la cuisine. Tout le monde voit les changements en direct.</p>
    <h2 class="q">C'est pour qui&nbsp;?</h2>
    <div class="kinds">${KINDS.map(
      (k) => `<button class="kind" data-kind="${k.id}">${ill(k.id, "ill lg")}<b>${esc(k.l)}</b><small>${esc(k.d)}</small></button>`,
    ).join("")}</div>
    <div class="stack" style="margin-top:22px">
      <button class="btn ghost wide" id="wJoin">${ill("invite", "ill sm")} On m'a invité·e sur une liste</button>
      ${S.store?.account ? `<button class="link" id="wRecover">J'ai déjà un compte</button>` : ""}
    </div>
  </div>`;
  app.querySelectorAll("[data-kind]").forEach(
    (b) =>
      (b.onclick = () => {
        S.onb = { kind: b.dataset.kind, mode: "create" };
        S.screen = "profile";
        render();
      }),
  );
  $("#wJoin").onclick = () => {
    S.onb = { kind: null, mode: "join" };
    S.screen = "profile";
    render();
  };
  $("#wRecover") && ($("#wRecover").onclick = openRecover);
}

function emojiPicker(sel) {
  return `<div class="emojis" id="emojiPick" role="group" aria-label="Ton emoji">${EMOJIS.map(
    (e) => `<button type="button" class="chip" data-v="${e}" aria-pressed="${e === sel}">${e}</button>`,
  ).join("")}</div>`;
}
function bindPicker(el) {
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    el.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
  });
}
const picked = (el) => el.querySelector('[aria-pressed="true"]')?.dataset.v || "";

async function renderProfileSetup(app) {
  const invited = loadJSON("courses:join", null);
  const k = S.onb.kind ? kindOf(S.onb.kind) : null;
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const lead = invited
    ? "Tu as été invité·e sur une liste de courses partagée. Dis-nous qui tu es pour la rejoindre."
    : k
      ? `Une liste pour ${esc(k.pour)}, super&nbsp;! D'abord, qui es-tu&nbsp;? Les autres verront ton prénom à côté de ce que tu ajoutes.`
      : "D'abord, qui es-tu&nbsp;? Les autres verront ton prénom à côté de ce que tu ajoutes.";
  app.innerHTML = `<div class="intro">
    ${!invited ? `<button class="link back" id="pBack">← Retour</button>` : ""}
    ${invited ? ill("invite", "ill xl") : k ? kindIll(k.id, "ill xl") : ill("salut", "ill xl")}
    <h1>Ton profil</h1>
    <p class="lead">${lead}</p>
    <form class="card" id="pForm" autocomplete="off">
      <div class="field"><label for="pName">Ton prénom</label><input id="pName" maxlength="30" required placeholder="ex : Camille" autocomplete="given-name"></div>
      <div class="field"><span>Ton emoji</span>${emojiPicker(emoji)}</div>
      <p class="err" id="pErr"></p>
      <button class="btn wide" type="submit">Continuer</button>
    </form>
    ${invited && S.store?.account ? `<p class="or">Tu as déjà un compte&nbsp;? <button class="link" id="pRecover">Me connecter avec mon e-mail</button></p>` : ""}
  </div>`;
  bindPicker($("#emojiPick"));
  $("#pBack") &&
    ($("#pBack").onclick = () => {
      S.screen = "welcome";
      render();
    });
  $("#pRecover") && ($("#pRecover").onclick = openRecover);
  $("#pForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#pName").value.trim();
    if (!name) return;
    const btn = $("#pForm button[type=submit]");
    btn.disabled = true;
    try {
      const me = { name, emoji: picked($("#emojiPick")) || emoji };
      await S.store.saveProfile(me);
      S.me = me;
      saveJSON("courses:me", me);
      await afterProfile();
    } catch (err) {
      $("#pErr").textContent = errText(err);
      btn.disabled = false;
    }
  };
  // Prénom déjà choisi dans Déclic : on le propose.
  if (S.store) {
    const n = await S.store.suggestedName().catch(() => "");
    if (n && $("#pName") && !$("#pName").value) $("#pName").value = n;
  }
}

function kindChips(sel) {
  return `<div class="chips" id="kindPick">${KINDS.map(
    (k) => `<button type="button" class="chip" data-v="${k.id}" aria-pressed="${k.id === sel}">${kindIll(k.id, "ill xs")} ${esc(k.l)}</button>`,
  ).join("")}</div>`;
}
function createForm(prefix, kind) {
  const k = kindOf(kind);
  return `<form class="card" id="${prefix}Create" autocomplete="off">
      <h2>Créer la liste</h2>
      <div class="field"><span>Pour qui&nbsp;?</span>${kindChips(k.id)}</div>
      <div class="field"><label for="${prefix}Name">Nom de la liste</label><input id="${prefix}Name" maxlength="40" placeholder="${esc(k.ph)}"></div>
      <p class="err" id="${prefix}CErr"></p>
      <button class="btn wide" type="submit">Créer et inviter</button>
    </form>`;
}
function joinForm(prefix) {
  return `<form class="card" id="${prefix}Join" autocomplete="off">
      <h2>Rejoindre une liste</h2>
      <p class="hint">Ouvre le lien d'invitation qu'on t'a envoyé, ou tape le code à 6 caractères.</p>
      <div class="field"><label for="${prefix}Code">Code</label><input id="${prefix}Code" class="code-in" maxlength="6" autocapitalize="characters" spellcheck="false" placeholder="ABC123"></div>
      <p class="err" id="${prefix}JErr"></p>
      <button class="btn ghost wide" type="submit">Rejoindre</button>
    </form>`;
}
function bindHouseholdForms(prefix) {
  const kp = $("#kindPick");
  if (kp) {
    bindPicker(kp);
    kp.addEventListener("click", () => {
      const k = KINDS.find((x) => x.id === picked(kp));
      if (k) $(`#${prefix}Name`).placeholder = k.ph;
    });
  }
  $(`#${prefix}Create`) &&
    ($(`#${prefix}Create`).onsubmit = async (e) => {
      e.preventDefault();
      const kind = picked(kp) || "autre";
      const name = $(`#${prefix}Name`).value.trim() || $(`#${prefix}Name`).placeholder;
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const code = await S.store.createHousehold(name, kind);
        await refreshHouseholds();
        S.view = "list";
        await selectHousehold(code);
        if ($("#panel").open) $("#panel").close();
        openInvite(true);
      } catch (err) {
        $(`#${prefix}CErr`).textContent = errText(err);
        btn.disabled = false;
      }
    });
  $(`#${prefix}Join`) &&
    ($(`#${prefix}Join`).onsubmit = async (e) => {
      e.preventDefault();
      const code = $(`#${prefix}Code`).value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        $(`#${prefix}JErr`).textContent = "Le code fait 6 caractères (lettres et chiffres).";
        return;
      }
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      const ok = await joinCode(code, (m) => ($(`#${prefix}JErr`).textContent = m));
      btn.disabled = false;
      if (ok && $("#panel").open) $("#panel").close();
    });
}
async function joinCode(code, onErr) {
  try {
    const h = await S.store.join(code);
    if (!h) {
      onErr("Aucune liste ne correspond à ce code.");
      return false;
    }
    await refreshHouseholds();
    await selectHousehold(h.id);
    toast(`Bienvenue dans « ${h.name} » !`);
    return true;
  } catch (err) {
    onErr(errText(err));
    return false;
  }
}

function renderHouseholdSetup(app) {
  const mode = S.onb.mode;
  let body;
  if (mode === "join")
    body = `${joinForm("s")}<p class="or"><button class="link" id="sSwap">Créer une nouvelle liste à la place</button></p>`;
  else if (mode === "create")
    body = `${createForm("s", S.onb.kind)}<p class="or"><button class="link" id="sSwap">J'ai plutôt un code d'invitation</button></p>`;
  else body = `${createForm("s", "famille")}<p class="or">ou</p>${joinForm("s")}`;
  app.innerHTML = `<div class="intro">
    <p class="hello"><span class="av lg">${esc(S.me?.emoji || "🙂")}</span></p>
    <h1>Salut ${esc(S.me?.name || "")}&nbsp;!</h1>
    <p class="lead">${mode === "join" ? "Plus qu'une étape pour rejoindre la liste partagée." : "Donne un nom à ta liste, puis invite les autres."}</p>
    ${body}
    <p class="or"><button class="link" id="editMe">Modifier mon profil</button></p>
  </div>`;
  bindHouseholdForms("s");
  $("#sSwap") &&
    ($("#sSwap").onclick = () => {
      S.onb = mode === "join" ? { kind: "famille", mode: "create" } : { kind: S.onb.kind, mode: "join" };
      render();
    });
}

// ---------- écran principal : liste de courses / dans notre cuisine ----------
function renderMain(app) {
  const h = household();
  const items = viewItems();
  const todo = items.filter((i) => !i.done),
    stock = items.filter((i) => i.done);
  const others = S.members.filter((m) => m.uid !== S.uid);
  const pending = S.queue.filter((o) => o.hid === S.hid).length;
  const lowCount = stock.filter((i) => i.low).length;

  let status = "";
  if (!S.store || !navigator.onLine) status = `Hors ligne${pending ? ` · ${pending} changement${pending > 1 ? "s" : ""} en attente` : ""} : tout sera envoyé au retour du réseau.`;
  else if (pending) status = `Envoi de ${pending} changement${pending > 1 ? "s" : ""}…`;

  // On garde la saisie en cours quand l'écran se redessine (changement reçu d'un autre membre).
  const prevInput = $("#quickName");
  const keep = prevInput ? { v: prevInput.value, f: document.activeElement === prevInput, view: prevInput.dataset.view } : null;

  const top = `
    <div class="top">
      <button class="switch" id="hhBtn" aria-label="Changer de liste ou gérer le foyer">${kindIll(h?.kind, "ill xs")}<span>${esc(h?.name || "")}</span> ▾</button>
      <span class="grow"></span>
      <button class="faces" id="facesBtn" aria-label="${others.length ? "Membres de la liste" : "Inviter quelqu'un"}">${others
        .slice(0, 4)
        .map((m) => `<span class="av" title="${esc(m.name)}">${esc(m.emoji || "🙂")}</span>`)
        .join("")}${others.length ? "" : `<span class="av add" aria-hidden="true">+</span>`}</button>
      <button class="meBtn" id="meBtn" aria-label="Mon profil"><span class="av me">${esc(S.me?.emoji || "🙂")}</span></button>
    </div>`;

  const body = S.view === "kitchen" ? kitchenHtml(stock, todo) : listHtml(todo, stock, others);
  const nav = `<nav class="nav" aria-label="Pages">
      <button data-view="list" aria-current="${S.view === "list" ? "page" : "false"}">${ill("liste", "ill nav-ill")}<span>Liste de courses</span>${
        todo.length ? `<b class="badge">${todo.length}</b>` : ""
      }</button>
      <button data-view="kitchen" aria-current="${S.view === "kitchen" ? "page" : "false"}">${ill("cuisine", "ill nav-ill")}<span>Dans notre cuisine</span>${
        lowCount ? `<b class="badge warn" title="presque finis">${lowCount}</b>` : ""
      }</button>
    </nav>`;

  app.innerHTML = top + (status ? `<div class="sync">${esc(status)}</div>` : "") + body + nav;

  if (keep && keep.view === S.view) {
    $("#quickName").value = keep.v;
    if (keep.f) $("#quickName").focus();
  }
  if (S.flashId) {
    const li = document.querySelector(`li[data-id="${CSS.escape(S.flashId)}"]`);
    if (li) {
      li.classList.add("flash");
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    S.flashId = null;
  }
}

function quickForm(view, placeholder) {
  return `<form class="add" id="quick" autocomplete="off">
      <input id="quickName" data-view="${view}" list="suggest" maxlength="80" placeholder="${esc(placeholder)}" aria-label="Article à ajouter" enterkeyhint="done">
      <button type="button" class="more" id="moreBtn" aria-label="Ajouter avec détails">⋯</button>
      <button class="btn" type="submit">Ajouter</button>
    </form>
    <datalist id="suggest">${suggestions().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;
}

function listHtml(todo, stock, others) {
  const urgent = todo.filter((i) => i.prio === "urgent").length;
  // Filtre par magasin : seulement les magasins présents dans la liste.
  const shops = SHOPS.filter((s) => s.id && todo.some((i) => i.shop === s.id));
  if (S.shop && !shops.some((s) => s.id === S.shop)) S.shop = "";
  const shown = todo.filter((i) => !S.shop || i.shop === S.shop || !i.shop);
  // Presque fini à la maison et pas encore sur la liste : un toucher pour l'ajouter.
  const low = stock.filter((i) => i.low);
  let html = `<h1>Liste de courses</h1>
    <p class="count">${
      todo.length
        ? `<b>${todo.length}</b> article${todo.length > 1 ? "s" : ""} à acheter${urgent ? ` dont <b>${urgent}</b> urgent${urgent > 1 ? "s" : ""}` : ""}`
        : "Rien ne manque pour l'instant."
    }</p>
    ${quickForm("list", "Il manque quoi ?")}`;
  if (shops.length)
    html += `<div class="bar" role="group" aria-label="Filtrer par magasin"><button class="fchip" data-shop="" aria-pressed="${!S.shop}">Partout</button>${shops
      .map((s) => `<button class="fchip" data-shop="${s.id}" aria-pressed="${S.shop === s.id}">${esc(s.l)}</button>`)
      .join("")}</div>`;
  if (low.length)
    html += `<section class="lowcard"><h3>${ill("cuisine", "ill sm")} Presque fini à la maison</h3><div class="chips">${low
      .map((i) => `<button class="chip addlow" data-finish="${esc(i.id)}">+ ${esc(i.name)}</button>`)
      .join("")}</div></section>`;
  if (!others.length)
    html += `<button class="invite-hint" id="inviteHint">${ill("invite", "ill md")}<span><b>Invite les autres</b><span>Envoie le lien à ta famille, ta coloc, ta moitié ou tes amis pour partager cette liste.</span></span></button>`;
  html += `<main id="list">`;
  if (!shown.length)
    html += S.shop
      ? `<div class="empty">${ill("ok", "ill xl")}<p>Rien de plus à prendre ici.</p></div>`
      : `<div class="empty">${ill("ok", "ill xl")}<p>Tout est acheté&nbsp;! Ajoute un article dès que quelque chose se termine.</p></div>`;
  for (const c of CATS) {
    const group = shown
      .filter((i) => (CATS.some((x) => x.id === i.cat) ? i.cat : "autre") === c.id)
      .sort((a, b) => (PRANK[a.prio] ?? 1) - (PRANK[b.prio] ?? 1) || String(a.created_at).localeCompare(String(b.created_at)));
    if (!group.length) continue;
    html += aisleHead(c, group.length) + `<ul class="items">${group.map(listItemHtml).join("")}</ul></section>`;
  }
  html += `</main>` + emailHint();
  return html;
}

function aisleHead(c, n) {
  return `<section class="aisle"><h2>${catIll(c.id, "ill cat")}<span>${esc(c.l)}</span><small>${n}</small></h2>`;
}

function listItemHtml(it) {
  const prio = PRIOS.find((p) => p.id === it.prio);
  const shop = SHOPS.find((s) => s.id && s.id === it.shop);
  const who = S.members.length > 1 && it.added_by ? `ajouté par ${esc(memberName(it.added_by))}` : "";
  return `<li data-id="${esc(it.id)}">
    <button class="check" data-toggle="${esc(it.id)}" aria-label="Acheté : ${esc(it.name)}">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>
    </button>
    <button class="body" data-edit="${esc(it.id)}">
      <div class="name">${esc(it.name)}${it.qty ? ` <span class="qty">· ${esc(it.qty)}</span>` : ""}</div>
      ${it.quality ? `<div class="quality">${esc(it.quality)}</div>` : ""}
      <div class="meta">${prio && it.prio !== "plustard" ? `<span class="pill ${it.prio}">${esc(prio.l)}</span>` : ""}${shop ? `<span class="pill">${esc(shop.l)}</span>` : ""}${
        who ? `<span>${who}</span>` : ""
      }${it._pending ? `<span class="pending">en attente d'envoi</span>` : ""}</div>
    </button>
  </li>`;
}

function kitchenHtml(stock, todo) {
  const low = stock.filter((i) => i.low).length;
  if (S.kfilter === "low" && !low) S.kfilter = "all";
  const shown = stock.filter((i) => S.kfilter !== "low" || i.low);
  let html = `<h1>Dans notre cuisine</h1>
    <p class="count">${
      stock.length
        ? `<b>${stock.length}</b> produit${stock.length > 1 ? "s" : ""} à la maison${low ? ` dont <b>${low}</b> presque fini${low > 1 ? "s" : ""}` : ""}`
        : "Ce que vous avez déjà à la maison."
    }</p>
    ${quickForm("kitchen", "On a quoi ?")}`;
  if (low)
    html += `<div class="bar" role="group" aria-label="Filtre"><button class="fchip" data-kf="all" aria-pressed="${S.kfilter === "all"}">Tout</button><button class="fchip" data-kf="low" aria-pressed="${
      S.kfilter === "low"
    }">Presque fini · ${low}</button></div>`;
  html += `<main id="list">`;
  if (!stock.length)
    html += `<div class="empty">${ill("cuisine", "ill xl")}<p>La cuisine est vide pour l'instant.</p><p class="hint">Quand tu coches un article sur la liste de courses, il arrive ici. Tu peux aussi ajouter ce que vous avez déjà&nbsp;: quand un produit est fini, un toucher le remet sur la liste.</p></div>`;
  for (const c of CATS) {
    const group = shown
      .filter((i) => (CATS.some((x) => x.id === i.cat) ? i.cat : "autre") === c.id)
      .sort((a, b) => (b.low ? 1 : 0) - (a.low ? 1 : 0) || a.name.localeCompare(b.name, "fr"));
    if (!group.length) continue;
    html += aisleHead(c, group.length) + `<ul class="items">${group.map(kitchenItemHtml).join("")}</ul></section>`;
  }
  html += `</main>`;
  return html;
}

function kitchenItemHtml(it) {
  const by = it.done_by ? `${S.members.length > 1 ? `acheté par ${esc(memberName(it.done_by))} ` : "acheté "}${esc(ago(it.done_at))}` : "";
  return `<li class="krow${it.low ? " low" : ""}" data-id="${esc(it.id)}">
    <div class="kmain">
      <button class="body" data-edit="${esc(it.id)}">
        <div class="name">${esc(it.name)}${it.qty ? ` <span class="qty">· ${esc(it.qty)}</span>` : ""}</div>
        ${it.quality ? `<div class="quality">${esc(it.quality)}</div>` : ""}
      </button>
      <div class="meta">
        <button class="lowbtn" data-low="${esc(it.id)}" aria-pressed="${!!it.low}">${it.low ? "Presque fini" : "Il en reste"}</button>
        ${by ? `<span>${by}</span>` : ""}${it._pending ? `<span class="pending">en attente d'envoi</span>` : ""}
      </div>
    </div>
    <button class="finbtn" data-finish="${esc(it.id)}" aria-label="Fini : remettre ${esc(it.name)} sur la liste de courses">Fini<small>→ liste</small></button>
  </li>`;
}

function emailHint() {
  if (!S.store?.account || S.email.email || loadJSON("courses:emailHintOff", false)) return "";
  return `<section class="card hintcard">${ill("cle", "ill md")}<div><b>Protège ton compte</b>
    <p>Ajoute ton e-mail&nbsp;: si tu changes de téléphone, tu recevras un code pour retrouver tes listes.</p>
    <div class="row"><button class="btn small" id="hintEmail">Ajouter mon e-mail</button><button class="link" id="hintOff">Plus tard</button></div></div></section>`;
}

function suggestions() {
  const onList = new Set(viewItems().map((i) => norm(i.name)));
  const memo = loadJSON("courses:memo", {});
  return Object.entries(memo)
    .filter(([k]) => !onList.has(k))
    .sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at)
    .slice(0, 60)
    .map(([, v]) => v.name);
}

// ---------- feuille article ----------
function chips(el, opts, val, htmlFn) {
  el.innerHTML = opts.map((o) => `<button type="button" class="chip" data-v="${o.id}" aria-pressed="${o.id === val}">${htmlFn ? htmlFn(o) : esc(o.l)}</button>`).join("");
  el.onclick = (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    el.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
  };
}
function openSheet(it, presetName) {
  S.editingId = it ? it.id : null;
  S.sheetPlace = it ? (it.done ? "kitchen" : "list") : S.view;
  const kitchen = S.sheetPlace === "kitchen";
  $("#sheetTitle").textContent = it ? "Modifier l'article" : kitchen ? "Ajouter à la cuisine" : "Nouvel article";
  $("#saveBtn").textContent = it ? "Enregistrer" : "Ajouter";
  $("#delBtn").hidden = !it;
  $("#delBtn").textContent = kitchen ? "Retirer" : "Supprimer";
  // Priorité et magasin n'ont de sens que pour ce qu'il reste à acheter.
  $("#fPrioField").hidden = $("#fShopField").hidden = kitchen;
  const parsed = presetName ? parseQuick(presetName) : { name: "", qty: "" };
  const name = it ? it.name : parsed.name;
  const memo = !it && name ? loadJSON("courses:memo", {})[norm(name)] : null;
  $("#fName").value = name;
  $("#fQty").value = it ? it.qty || "" : parsed.qty;
  $("#fQuality").value = it ? it.quality || "" : memo?.quality || "";
  chips($("#fCat"), CATS, it?.cat || (name ? guessCat(name) : "autre"), (c) => `${catIll(c.id, "ill xs")} ${esc(c.l)}`);
  chips($("#fPrio"), PRIOS, it?.prio || "bientot");
  chips($("#fShop"), SHOPS, it ? it.shop || "" : memo?.shop || "");
  const by = $("#fBy");
  by.hidden = !it || !it.added_by;
  if (it && it.added_by) by.textContent = `Ajouté par ${memberName(it.added_by)} ${ago(it.created_at)}`;
  $("#sheet").showModal();
  if (!it) setTimeout(() => $("#fName").focus(), 50);
}
$("#fName").addEventListener("input", () => {
  if (S.editingId) return;
  const g = guessCat($("#fName").value);
  if (g !== "autre") $("#fCat").querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === g));
});
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#fName").value.trim();
  if (!name) return;
  const chosen = (el) => el.querySelector('[aria-pressed="true"]')?.dataset.v || "";
  const data = {
    name,
    qty: $("#fQty").value.trim(),
    quality: $("#fQuality").value.trim(),
    cat: chosen($("#fCat")) || "autre",
  };
  if (S.sheetPlace === "list") Object.assign(data, { prio: chosen($("#fPrio")) || "bientot", shop: chosen($("#fShop")) });
  const id = S.editingId;
  $("#sheet").close();
  if (id) {
    remember(data);
    enqueue({ t: "patch", id, patch: data });
  } else addItem(data, S.sheetPlace);
});
$("#cancelBtn").onclick = () => $("#sheet").close();
$("#delBtn").onclick = () => {
  const it = viewItems().find((i) => i.id === S.editingId);
  $("#sheet").close();
  if (it) removeItems([it], it.done ? `« ${it.name} » retiré de la cuisine` : `« ${it.name} » supprimé`);
};
for (const d of ["#sheet", "#panel"]) $(d).addEventListener("click", (e) => e.target === $(d) && $(d).close());

// ---------- panneaux : foyer, invitations, profil, e-mail ----------
function openPanel(html, bind) {
  $("#panelBody").innerHTML = html;
  bind && bind();
  if (!$("#panel").open) $("#panel").showModal();
  $("#panelBody").querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => $("#panel").close()));
}
const inviteUrl = (code) => `${location.origin}${location.pathname}#rejoindre=${code}`;

function openInvite(fresh) {
  const h = household();
  if (!h) return;
  const url = inviteUrl(h.id);
  openPanel(
    `<div class="phead">${ill(fresh ? "fete" : "invite", "ill lg")}<h3>${fresh ? "Ta liste est prête&nbsp;!" : "Inviter quelqu'un"}</h3></div>
    <p class="hint">Envoie ce lien à ${esc(kindOf(h.kind).pour === "vous deux" ? "ta moitié" : "ceux avec qui tu fais les courses")}. En l'ouvrant, ils créent leur profil et rejoignent « ${esc(
      h.name,
    )} ». Ils peuvent aussi taper le code dans l'app.</p>
    <div class="bigcode" aria-label="Code de la liste">${esc(h.id)}</div>
    <div class="stack">
      <button class="btn wide" id="iShare">Envoyer le lien d'invitation</button>
      <button class="btn ghost wide" id="iCopy">Copier le lien</button>
      <button class="link" data-close>${fresh ? "Plus tard" : "Fermer"}</button>
    </div>`,
    () => {
      $("#iShare").onclick = async () => {
        const text = `Rejoins notre liste de courses « ${h.name} » : ${url}`;
        if (navigator.share) {
          try {
            await navigator.share({ title: "Courses", text: `Rejoins notre liste de courses « ${h.name} »`, url });
            return;
          } catch (e) {
            if (e && e.name === "AbortError") return;
          }
        }
        copy(text, "Lien copié : colle-le dans un message");
      };
      $("#iCopy").onclick = () => copy(url, "Lien copié");
    },
  );
}
async function copy(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    prompt("Copie ce texte :", text);
  }
}

function openHousehold() {
  const h = household();
  const todo = viewItems().filter((i) => !i.done);
  openPanel(
    `<div class="phead">${kindIll(h?.kind, "ill lg")}<h3>${esc(h?.name || "")}</h3></div>
    <h4>Membres</h4>
    <ul class="people">${S.members
      .map(
        (m) =>
          `<li><span class="av lg">${esc(m.emoji || "🙂")}</span><span><b>${esc(m.name || "Sans nom")}${m.uid === S.uid ? " (toi)" : ""}</b><br><small>${
            m.uid === h?.created_by ? "a créé la liste" : "membre"
          }</small></span></li>`,
      )
      .join("")}</ul>
    <div class="stack" style="margin-top:10px">
      <button class="btn wide" id="hInvite">Inviter quelqu'un</button>
      <button class="btn ghost wide" id="hText" ${todo.length ? "" : "disabled"}>Envoyer la liste de courses par message</button>
    </div>
    <h4>Mes listes</h4>
    ${S.households
      .map((x) => `<button class="hh" data-hh="${esc(x.id)}" aria-current="${x.id === S.hid}">${kindIll(x.kind, "ill md")}<span><b>${esc(x.name)}</b><small>${esc(kindOf(x.kind).l)}</small></span></button>`)
      .join("")}
    <button class="btn ghost wide" id="hNew">+ Créer ou rejoindre une autre liste</button>
    <h4>Réglages de la liste</h4>
    <form class="field" id="hRename" autocomplete="off"><label for="hName">Nom</label>
      <div class="inline"><input id="hName" maxlength="40" value="${esc(h?.name || "")}"><button class="btn" type="submit">OK</button></div></form>
    <button class="btn danger wide" id="hLeave">Quitter cette liste</button>
    <p class="hint" style="margin-top:8px">${S.members.length <= 1 ? "Tu es seul·e sur cette liste : en la quittant, elle sera supprimée." : "Les autres membres gardent la liste."}</p>
    <button class="link" data-close>Fermer</button>`,
    () => {
      $("#hInvite").onclick = () => openInvite(false);
      $("#hText").onclick = () => shareAsText(todo);
      $("#panelBody").querySelectorAll("[data-hh]").forEach(
        (b) =>
          (b.onclick = async () => {
            $("#panel").close();
            await selectHousehold(b.dataset.hh);
          }),
      );
      $("#hNew").onclick = () =>
        openPanel(`<h3>Une autre liste</h3>${createForm("n", "famille")}<p class="or">ou</p>${joinForm("n")}<button class="link" data-close>Annuler</button>`, () => bindHouseholdForms("n"));
      $("#hRename").onsubmit = async (e) => {
        e.preventDefault();
        const name = $("#hName").value.trim();
        if (!name || name === h.name) return;
        try {
          await S.store.rename(h.id, name);
          h.name = name;
          saveJSON("courses:households", S.households);
          render();
          toast("Liste renommée");
        } catch (err) {
          toast(errText(err));
        }
      };
      $("#hLeave").onclick = async () => {
        if (!confirm(S.members.length <= 1 ? `Supprimer « ${h.name} » et tous ses articles ?` : `Quitter « ${h.name} » ?`)) return;
        try {
          await S.store.leave(h.id);
          localStorage.removeItem("courses:cache:" + h.id);
          S.queue = S.queue.filter((o) => o.hid !== h.id);
          saveJSON("courses:queue", S.queue);
          $("#panel").close();
          await refreshHouseholds();
          S.onb = { kind: null, mode: null };
          await selectHousehold(S.households[0]?.id || null);
          toast("Tu as quitté la liste");
        } catch (err) {
          toast(errText(err));
        }
      };
    },
  );
}

async function shareAsText(items) {
  const h = household();
  let text = `🛒 ${h?.name || "Courses"}\n`;
  for (const c of CATS) {
    const g = items.filter((i) => (i.cat || "autre") === c.id);
    if (!g.length) continue;
    text += `\n${c.e} ${c.l}\n` + g.map((i) => `• ${i.name}${i.qty ? " (" + i.qty + ")" : ""}${i.quality ? " – " + i.quality : ""}${i.prio === "urgent" ? " 🔥" : ""}`).join("\n") + "\n";
  }
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  copy(text, "Liste copiée");
}

function openMe() {
  const me = S.me || { name: "", emoji: "🙂" };
  const acc = S.store?.account;
  openPanel(
    `<h3>Mon profil</h3>
    <form id="mForm" autocomplete="off">
      <div class="field"><label for="mName">Prénom</label><input id="mName" maxlength="30" required value="${esc(me.name)}"></div>
      <div class="field"><span>Emoji</span>${emojiPicker(me.emoji)}</div>
      <p class="err" id="mErr"></p>
      <button class="btn wide" type="submit">Enregistrer</button>
    </form>
    ${
      acc
        ? `<h4>Mon e-mail</h4>
    ${
      S.email.email
        ? `<div class="okline">${ill("ok", "ill sm")}<span>Compte protégé par <b>${esc(S.email.email)}</b>. Sur un autre téléphone, choisis « J'ai déjà un compte » et entre cette adresse.</span></div>
           <button class="link" id="mEmail">Changer d'adresse</button>`
        : `<p class="hint">Ajoute ton e-mail pour retrouver ton compte et tes listes sur un autre téléphone : on t'y enverra un code.</p>
           <button class="btn ghost wide" id="mEmail">${ill("email", "ill xs")} Protéger mon compte avec mon e-mail</button>`
    }
    <button class="link" id="mLogin">Ouvrir un autre compte sur cet appareil</button>`
        : ""
    }
    ${S.store?.mode === "demo" ? `<p class="hint">Mode démonstration : les données restent dans ce navigateur (le code reçu « par e-mail » est 123456).</p>` : ""}
    <button class="link" data-close>Fermer</button>`,
    () => {
      bindPicker($("#emojiPick"));
      $("#mForm").onsubmit = async (e) => {
        e.preventDefault();
        const p = { name: $("#mName").value.trim(), emoji: picked($("#emojiPick")) || me.emoji };
        if (!p.name) return;
        try {
          await S.store.saveProfile(p);
          S.me = p;
          saveJSON("courses:me", p);
          await loadMembers();
          $("#panel").close();
          toast("Profil mis à jour");
        } catch (err) {
          $("#mErr").textContent = errText(err);
        }
      };
      $("#mEmail") && ($("#mEmail").onclick = () => openEmailLink(!!S.email.email));
      $("#mLogin") && ($("#mLogin").onclick = openRecover);
    },
  );
}

// Formulaire en deux temps : l'adresse, puis le code reçu par e-mail.
function codeStep({ email, title, intro, onVerify, onResend, onBack, done }) {
  openPanel(
    `<div class="phead">${ill("email", "ill lg")}<h3>${title}</h3></div>
    <p class="hint">${intro} <b>${esc(email)}</b>. Il peut mettre une minute à arriver&nbsp;: pense à regarder dans les spams.</p>
    <form id="cForm" autocomplete="off"><div class="field"><label for="cCode">Code reçu par e-mail</label>
      <input id="cCode" class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"></div>
      <p class="err" id="cErr"></p>
      <button class="btn wide" type="submit">Valider</button></form>
    <div class="row spread"><button class="link" id="cBack">Changer d'adresse</button><button class="link" id="cResend">Renvoyer le code</button></div>`,
    () => {
      setTimeout(() => $("#cCode")?.focus(), 50);
      $("#cBack").onclick = onBack;
      $("#cResend").onclick = async () => {
        try {
          await onResend();
          toast("Nouveau code envoyé");
        } catch (err) {
          $("#cErr").textContent = errText(err);
        }
      };
      $("#cForm").onsubmit = async (e) => {
        e.preventDefault();
        const code = $("#cCode").value.replace(/\D/g, "");
        if (code.length < 6) {
          $("#cErr").textContent = "Le code fait au moins 6 chiffres.";
          return;
        }
        const btn = $("#cForm button[type=submit]");
        btn.disabled = true;
        try {
          await onVerify(code);
          done();
        } catch (err) {
          $("#cErr").textContent = errText(err);
          btn.disabled = false;
        }
      };
    },
  );
}
function emailStep({ title, intro, cta, value, note, onSend }) {
  openPanel(
    `<div class="phead">${ill("cle", "ill lg")}<h3>${title}</h3></div>
    <p class="hint">${intro}</p>
    <form id="eForm" autocomplete="off"><div class="field"><label for="eMail">Adresse e-mail</label>
      <input id="eMail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" value="${esc(value || "")}" placeholder="toi@exemple.fr"></div>
      ${note ? `<p class="note">${note}</p>` : ""}
      <p class="err" id="eErr"></p>
      <button class="btn wide" type="submit">${cta}</button></form>
    <button class="link" data-close>Annuler</button>`,
    () => {
      setTimeout(() => $("#eMail")?.focus(), 50);
      $("#eForm").onsubmit = async (e) => {
        e.preventDefault();
        const email = $("#eMail").value.trim().toLowerCase();
        if (!isEmail(email)) {
          $("#eErr").textContent = "Cette adresse e-mail n'a pas l'air valide.";
          return;
        }
        const btn = $("#eForm button[type=submit]");
        btn.disabled = true;
        try {
          await onSend(email);
        } catch (err) {
          $("#eErr").textContent = errText(err);
          btn.disabled = false;
        }
      };
    },
  );
}

// Lier une adresse au compte de cet appareil.
function openEmailLink(change) {
  const acc = S.store.account;
  const step2 = (email) =>
    codeStep({
      email,
      title: "Vérifie ton e-mail",
      intro: "On vient d'envoyer un code à",
      onVerify: (code) => acc.confirmEmail(email, code),
      onResend: () => acc.linkEmail(email),
      onBack: () => openEmailLink(change),
      done: () => {
        S.email = { email, pending: "" };
        $("#panel").close();
        render();
        toast("C'est fait : ton compte est protégé");
      },
    });
  // Un code déjà demandé et pas encore confirmé : on reprend là.
  if (S.email.pending && !change) return step2(S.email.pending);
  emailStep({
    title: change ? "Changer d'adresse" : "Protéger mon compte",
    intro: "Ton compte est lié à ce téléphone. Avec ton e-mail, tu pourras le retrouver sur un autre appareil (et dans Déclic) en recevant un code.",
    cta: "Recevoir un code",
    value: change ? "" : S.email.pending,
    onSend: async (email) => {
      await acc.linkEmail(email);
      S.email.pending = email;
      step2(email);
    },
  });
}

// Se connecter à un compte existant grâce au code envoyé par e-mail.
function openRecover() {
  const acc = S.store?.account;
  if (!acc) return;
  const risky = S.households.length && !S.email.email;
  const step2 = (email) =>
    codeStep({
      email,
      title: "Entre le code",
      intro: "On vient d'envoyer un code de connexion à",
      onVerify: (code) => acc.loginWithCode(email, code),
      onResend: () => acc.sendLoginCode(email),
      onBack: openRecover,
      done: () => {
        // Nouveau compte sur cet appareil : on repart de zéro (ce qui était gardé appartenait à l'ancien).
        for (const k of Object.keys(localStorage)) if (k.startsWith("courses:") && k !== "courses:memo" && k !== "courses:join") localStorage.removeItem(k);
        toast("Compte retrouvé !");
        setTimeout(() => location.reload(), 600);
      },
    });
  emailStep({
    title: "Retrouver mon compte",
    intro: "Entre l'adresse e-mail liée à ton compte : on t'envoie un code pour l'ouvrir sur cet appareil.",
    cta: "Recevoir un code",
    note: risky ? "Attention : le compte actuel de cet appareil n'a pas d'e-mail. Ses listes resteront accessibles aux autres membres, mais plus à toi." : "",
    onSend: async (email) => {
      await acc.sendLoginCode(email);
      step2(email);
    },
  });
}

// ---------- événements ----------
$("#app").addEventListener("submit", (e) => {
  if (e.target.id !== "quick") return;
  e.preventDefault();
  const input = $("#quickName");
  const raw = input.value.trim();
  if (!raw) return;
  input.value = "";
  const { name, qty } = parseQuick(raw);
  const memo = loadJSON("courses:memo", {})[norm(name)];
  addItem({ name, qty, quality: memo?.quality || "", cat: guessCat(name), prio: "bientot", shop: memo?.shop || "" }, S.view);
  $("#quickName")?.focus();
});
$("#app").addEventListener("click", (e) => {
  const t = (s) => e.target.closest(s);
  const byId = (id) => viewItems().find((i) => i.id === id);
  if (t("#moreBtn")) {
    const n = $("#quickName").value.trim();
    $("#quickName").value = "";
    openSheet(null, n);
  } else if (t("[data-view]")) {
    const v = t("[data-view]").dataset.view;
    if (v === S.view) return window.scrollTo({ top: 0, behavior: "smooth" });
    S.view = v;
    saveJSON("courses:view", v);
    render();
    window.scrollTo(0, 0);
  } else if (t("[data-shop]")) {
    S.shop = t("[data-shop]").dataset.shop;
    render();
  } else if (t("[data-kf]")) {
    S.kfilter = t("[data-kf]").dataset.kf;
    render();
  } else if (t("[data-toggle]")) {
    const it = byId(t("[data-toggle]").dataset.toggle);
    if (it) bought(it);
  } else if (t("[data-finish]")) {
    const it = byId(t("[data-finish]").dataset.finish);
    if (it) finished(it);
  } else if (t("[data-low]")) {
    const it = byId(t("[data-low]").dataset.low);
    if (it) enqueue({ t: "patch", id: it.id, patch: { low: !it.low } });
  } else if (t("[data-edit]")) {
    const it = byId(t("[data-edit]").dataset.edit);
    if (it) openSheet(it);
  } else if (t("#hhBtn")) openHousehold();
  else if (t("#facesBtn") || t("#inviteHint")) S.members.length > 1 ? openHousehold() : openInvite(false);
  else if (t("#meBtn") || t("#editMe")) openMe();
  else if (t("#hintEmail")) openEmailLink(false);
  else if (t("#hintOff")) {
    saveJSON("courses:emailHintOff", true);
    render();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && S.screen === "main" && document.activeElement?.tagName !== "INPUT" && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    $("#quickName")?.focus();
  }
});

// ---------- chargement ----------
async function refreshHouseholds() {
  S.households = await S.store.households();
  saveJSON("courses:households", S.households);
}
async function loadMembers() {
  if (!S.store || !S.hid) return;
  try {
    S.members = await S.store.members(S.hid);
    cacheHousehold();
    render();
  } catch {}
}
async function loadItems() {
  if (!S.store || !S.hid) return;
  try {
    const rows = await S.store.items(S.hid);
    S.server = new Map(rows.map((r) => [r.id, r]));
    // Les articles ajoutés par les autres enrichissent aussi les suggestions de cet appareil.
    const memo = loadJSON("courses:memo", {});
    for (const r of rows) if (!memo[norm(r.name)]) remember(r);
    cacheHousehold();
    render();
  } catch (e) {
    if (e.code !== "network") toast(errText(e));
  }
}
async function loadEmail() {
  if (!S.store?.account) return;
  try {
    S.email = await S.store.account.email();
    render();
  } catch {}
}
async function selectHousehold(hid) {
  if (S.unsub) S.unsub();
  S.unsub = null;
  S.hid = hid;
  saveJSON("courses:hid", hid);
  S.shop = "";
  S.kfilter = "all";
  S.live = null;
  if (!hid) {
    S.screen = "setup";
    render();
    return;
  }
  restoreHousehold();
  S.screen = "main";
  render();
  if (!S.store) return;
  S.unsub = S.store.subscribe(hid, {
    onItem(type, row) {
      if (type === "DELETE") S.server.delete(row.id);
      else if (row.household === S.hid) S.server.set(row.id, row);
      cacheHousehold();
      render();
    },
    onMembers: debounce(loadMembers, 300),
    onHousehold(h) {
      const mine = household();
      if (mine && h && h.name) {
        mine.name = h.name;
        saveJSON("courses:households", S.households);
        render();
      }
    },
    onStatus(ok) {
      // Après une coupure du temps réel, on relit tout pour ne rien rater.
      if (ok && S.live === false) loadItems();
      S.live = ok;
    },
  });
  await Promise.all([loadItems(), loadMembers()]);
  flush();
}
function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

async function afterProfile() {
  const pending = loadJSON("courses:join", null);
  await refreshHouseholds();
  if (pending) {
    localStorage.removeItem("courses:join");
    if (S.households.some((h) => h.id === pending)) {
      await selectHousehold(pending);
      return;
    }
    S.screen = "loading";
    render();
    if (await joinCode(pending, (m) => toast(m))) return;
    S.onb = { kind: null, mode: "join" };
  }
  const keep = S.households.find((h) => h.id === S.hid);
  await selectHousehold(keep ? keep.id : S.households[0]?.id || null);
}

const forgetLocal = () => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("courses:") && k !== "courses:memo" && k !== "courses:join") localStorage.removeItem(k);
};

async function connect() {
  if (S.connecting) return;
  S.connecting = true;
  try {
    await connectOnce();
  } finally {
    S.connecting = false;
  }
}
async function connectOnce() {
  try {
    S.store = await openStore();
  } catch (e) {
    // Sans réseau, même le chargement de la bibliothèque Supabase peut échouer.
    if (!e.code && (!navigator.onLine || /fetch|import|network|load/i.test(e.message || ""))) e.code = "network";
    S.bootError = e;
    // Hors ligne mais déjà installé : on affiche ce qui est gardé sur l'appareil, et on réessaiera.
    if (e.code === "network" && S.me && S.hid) {
      S.screen = "main";
      render();
      return;
    }
    S.screen = "error";
    render();
    return;
  }
  if (S.uid && S.uid !== S.store.uid) {
    // Autre compte que la dernière fois : on oublie ce qui était gardé pour l'ancien.
    forgetLocal();
    Object.assign(S, { me: null, households: [], hid: null, queue: [], server: new Map(), members: [] });
  }
  S.uid = S.store.uid;
  saveJSON("courses:uid", S.uid);
  loadEmail();
  try {
    const p = await S.store.getProfile();
    if (!p) {
      // Première ouverture : « C'est pour qui ? », sauf si on arrive par un lien d'invitation.
      S.screen = loadJSON("courses:join", null) ? "profile" : "welcome";
      render();
      return;
    }
    S.me = { name: p.name, emoji: p.emoji };
    saveJSON("courses:me", S.me);
    await afterProfile();
  } catch (e) {
    if (e.code === "network" && S.me && S.hid) {
      S.screen = "main";
      render();
      return;
    }
    S.bootError = e;
    S.screen = "error";
    render();
  }
}

(function boot() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const code = (hash.get("rejoindre") || "").toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(code)) {
    saveJSON("courses:join", code);
    history.replaceState(null, "", location.pathname + location.search);
  }
  if (S.view !== "list" && S.view !== "kitchen") S.view = "list";
  // Affichage immédiat de la dernière liste connue, avant même d'avoir le réseau.
  if (S.me && S.hid && !loadJSON("courses:join", null)) {
    restoreHousehold();
    S.screen = "main";
  }
  render();
  connect();
  const resync = () => {
    if (!S.store) {
      if (S.screen === "main" || S.screen === "error") connect();
      return;
    }
    flush();
    loadItems();
    loadMembers();
  };
  addEventListener("online", resync);
  addEventListener("offline", render);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && resync());
  // Les « il y a 3 min » restent à jour.
  setInterval(() => S.screen === "main" && !document.querySelector("dialog[open]") && document.activeElement?.id !== "quickName" && render(), 60000);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
