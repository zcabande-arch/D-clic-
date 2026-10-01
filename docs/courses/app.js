// Courses : la liste de courses partagée du foyer (couple, coloc, famille).
// Les changements s'affichent tout de suite et partent dans une file d'attente : sans réseau (au fond du magasin),
// la liste reste utilisable et se synchronise dès que la connexion revient.
import { openStore } from "./store.js";

const CATS = [
  { id: "fruits", e: "🥦", l: "Fruits & légumes" },
  { id: "viande", e: "🥩", l: "Viande & poisson" },
  { id: "frais", e: "🧀", l: "Frais & laitiers" },
  { id: "epicerie", e: "🍝", l: "Épicerie" },
  { id: "conserves", e: "🥫", l: "Conserves & sauces" },
  { id: "epices", e: "🧂", l: "Épices & condiments" },
  { id: "pain", e: "🍞", l: "Boulangerie" },
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
const KINDS = [
  { id: "couple", e: "💑", l: "En couple", ph: "Chez nous" },
  { id: "coloc", e: "🏠", l: "Coloc", ph: "L'appart" },
  { id: "famille", e: "👨‍👩‍👧", l: "Famille", ph: "La famille" },
  { id: "autre", e: "🧺", l: "Autre", ph: "Le chalet" },
];
const EMOJIS = ["🦊", "🐻", "🐼", "🐨", "🐸", "🐙", "🦄", "🐝", "🐱", "🐶", "🌻", "🍓", "🥑", "🍕", "⭐", "🌙"];
const PRANK = { urgent: 0, bientot: 1, plustard: 2 };

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
  if (e.code === "bad_code") return "Ce code ne correspond à aucun compte.";
  return "Une erreur est survenue, réessaie.";
}

// ---------- état ----------
const S = {
  store: null,
  uid: loadJSON("courses:uid", null),
  me: loadJSON("courses:me", null),
  households: loadJSON("courses:households", []),
  hid: loadJSON("courses:hid", null),
  members: [],
  server: new Map(), // articles tels que la base les connaît
  queue: loadJSON("courses:queue", []), // changements pas encore envoyés
  tab: "todo",
  shop: "",
  screen: "loading",
  live: false,
  flushing: false,
  unsub: null,
  editingId: null,
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

// La liste affichée = ce que la base connaît + les changements en attente.
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
function addItem(data) {
  const items = viewItems();
  const same = items.find((i) => norm(i.name) === norm(data.name));
  if (same && !same.done) {
    if (data.qty && data.qty !== same.qty) {
      enqueue({ t: "patch", id: same.id, patch: { qty: data.qty } });
      toast(`« ${same.name} » était déjà dans la liste : quantité mise à jour`);
    } else toast(`« ${same.name} » est déjà dans la liste`);
    S.flashId = same.id;
    S.tab = "todo";
    render();
    return;
  }
  if (same && same.done) {
    // Déjà acheté une fois : on le remet dans la liste au lieu de créer un doublon.
    enqueue({ t: "patch", id: same.id, patch: { ...data, done: false, done_by: null, done_at: null, added_by: S.uid, created_at: new Date().toISOString() } });
    remember({ ...same, ...data });
    S.flashId = same.id;
    toast(`« ${same.name} » remis dans la liste`);
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
    done: false,
    added_by: S.uid,
    done_by: null,
    created_at: new Date().toISOString(),
    done_at: null,
  };
  remember(row);
  S.flashId = row.id;
  enqueue({ t: "insert", rows: [row] });
}
function toggle(it) {
  const done = !it.done;
  enqueue({ t: "patch", id: it.id, patch: done ? { done, done_by: S.uid, done_at: new Date().toISOString() } : { done, done_by: null, done_at: null } });
  if (done)
    toast(`« ${it.name} » acheté`, "Annuler", () => enqueue({ t: "patch", id: it.id, patch: { done: false, done_by: null, done_at: null } }));
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
  if (S.screen === "loading") app.innerHTML = `<p class="loading">Chargement…</p>`;
  else if (S.screen === "error") renderError(app);
  else if (S.screen === "profile") renderProfileSetup(app);
  else if (S.screen === "setup") renderHouseholdSetup(app);
  else renderList(app);
}

function renderError(app) {
  app.innerHTML = `<div class="intro"><p class="logo">🧺</p><h1>Courses</h1>
    <p class="lead">${esc(errText(S.bootError))}</p>
    <button class="btn wide" id="retry">Réessayer</button></div>`;
  $("#retry").onclick = () => location.reload();
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
  const joining = loadJSON("courses:join", null);
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  app.innerHTML = `<div class="intro">
    <p class="logo">🧺</p><h1>Courses</h1>
    <p class="lead">${joining ? "Tu as été invité·e sur une liste de courses partagée. Crée ton profil pour la rejoindre." : "La liste de courses partagée avec ta moitié, ta coloc ou ta famille. Tout le monde voit les ajouts en direct."}</p>
    <form class="card" id="pForm" autocomplete="off">
      <h2>Ton profil</h2>
      <div class="field"><label for="pName">Ton prénom</label><input id="pName" maxlength="30" required placeholder="ex : Camille" autocomplete="given-name"></div>
      <div class="field"><span>Ton emoji</span>${emojiPicker(emoji)}</div>
      <p class="err" id="pErr"></p>
      <button class="btn wide" type="submit">C'est parti</button>
    </form>
    ${S.store?.account ? `<p class="or">Tu as déjà un compte (ici ou dans Déclic) ? <button class="link" id="pRecover">Retrouver mon compte</button></p>` : ""}
  </div>`;
  bindPicker($("#emojiPick"));
  $("#pRecover") && ($("#pRecover").onclick = openRecover);
  $("#pForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#pName").value.trim();
    if (!name) return;
    const btn = e.submitter || $("#pForm button[type=submit]");
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
    if (n && !$("#pName")?.value) $("#pName").value = n;
  }
}

function kindChips(sel) {
  return `<div class="chips" id="kindPick">${KINDS.map((k) => `<button type="button" class="chip" data-v="${k.id}" aria-pressed="${k.id === sel}">${k.e} ${esc(k.l)}</button>`).join("")}</div>`;
}
function householdForms(prefix) {
  return `<form class="card" id="${prefix}Create" autocomplete="off">
      <h2>Créer une liste</h2>
      <div class="field"><span>Pour qui ?</span>${kindChips("couple")}</div>
      <div class="field"><label for="${prefix}Name">Nom de la liste</label><input id="${prefix}Name" maxlength="40" placeholder="${esc(KINDS[0].ph)}"></div>
      <p class="err" id="${prefix}CErr"></p>
      <button class="btn wide" type="submit">Créer et inviter</button>
    </form>
    <p class="or">ou</p>
    <form class="card" id="${prefix}Join" autocomplete="off">
      <h2>Rejoindre une liste</h2>
      <p class="hint">Demande le code (ou le lien d'invitation) à la personne qui a créé la liste.</p>
      <div class="field"><label for="${prefix}Code">Code</label><input id="${prefix}Code" class="code-in" maxlength="6" autocapitalize="characters" spellcheck="false" placeholder="ABC123"></div>
      <p class="err" id="${prefix}JErr"></p>
      <button class="btn ghost wide" type="submit">Rejoindre</button>
    </form>`;
}
function bindHouseholdForms(prefix) {
  const kp = $("#kindPick");
  bindPicker(kp);
  kp.addEventListener("click", () => {
    const k = KINDS.find((x) => x.id === picked(kp));
    if (k) $(`#${prefix}Name`).placeholder = k.ph;
  });
  $(`#${prefix}Create`).onsubmit = async (e) => {
    e.preventDefault();
    const kind = picked(kp) || "autre";
    const name = $(`#${prefix}Name`).value.trim() || $(`#${prefix}Name`).placeholder;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const code = await S.store.createHousehold(name, kind);
      await refreshHouseholds();
      await selectHousehold(code);
      if ($("#panel").open) $("#panel").close();
      openInvite(true);
    } catch (err) {
      $(`#${prefix}CErr`).textContent = errText(err);
      btn.disabled = false;
    }
  };
  $(`#${prefix}Join`).onsubmit = async (e) => {
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
  };
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
  app.innerHTML = `<div class="intro">
    <p class="logo">${esc(S.me?.emoji || "🧺")}</p><h1>Salut ${esc(S.me?.name || "")} !</h1>
    <p class="lead">Crée la liste de ton foyer et invite les autres, ou rejoins celle qu'on t'a partagée.</p>
    ${householdForms("s")}
    <p class="or"><button class="link" id="editMe">Modifier mon profil</button></p>
  </div>`;
  bindHouseholdForms("s");
}

function renderList(app) {
  const h = household();
  const items = viewItems();
  const todo = items.filter((i) => !i.done),
    done = items.filter((i) => i.done);
  const urgent = todo.filter((i) => i.prio === "urgent").length;
  const pending = S.queue.filter((o) => o.hid === S.hid).length;
  // Filtre par magasin : seulement les magasins présents dans la liste à acheter.
  const shops = SHOPS.filter((s) => s.id && todo.some((i) => i.shop === s.id));
  if (S.shop && !shops.some((s) => s.id === S.shop)) S.shop = "";
  const filtered = (S.tab === "todo" ? todo : done).filter((i) => !S.shop || S.tab === "done" || i.shop === S.shop || !i.shop);
  const others = S.members.filter((m) => m.uid !== S.uid);
  const kind = KINDS.find((k) => k.id === h?.kind);

  let status = "";
  if (!S.store || !navigator.onLine) status = `Hors ligne${pending ? ` · ${pending} changement${pending > 1 ? "s" : ""} en attente` : ""} : tout sera envoyé au retour du réseau.`;
  else if (pending) status = `Envoi de ${pending} changement${pending > 1 ? "s" : ""}…`;

  const prevInput = $("#quickName");
  const keep = prevInput ? { v: prevInput.value, f: document.activeElement === prevInput } : null;

  app.innerHTML = `
    <div class="top">
      <button class="switch" id="hhBtn" aria-label="Changer de liste ou gérer le foyer"><span>${kind ? kind.e + " " : ""}${esc(h?.name || "")}</span> ▾</button>
      <span class="grow"></span>
      <button class="faces" id="facesBtn" aria-label="${others.length ? "Membres de la liste" : "Inviter quelqu'un"}">${(others.length ? others.slice(0, 4) : [])
        .map((m) => `<span class="av" title="${esc(m.name)}">${esc(m.emoji || "🙂")}</span>`)
        .join("")}${others.length ? "" : `<span class="av add" aria-hidden="true">+</span>`}</button>
      <button class="meBtn" id="meBtn" aria-label="Mon profil"><span class="av me">${esc(S.me?.emoji || "🙂")}</span></button>
    </div>
    <h1>${esc(h?.name || "Courses")}</h1>
    <p class="count">${
      todo.length
        ? `<b>${todo.length}</b> article${todo.length > 1 ? "s" : ""} à acheter${urgent ? ` dont <b>${urgent}</b> urgent${urgent > 1 ? "s" : ""}` : ""}`
        : "Rien ne manque pour l'instant."
    }</p>
    ${status ? `<div class="sync">${esc(status)}</div>` : ""}
    <form class="add" id="quick" autocomplete="off">
      <input id="quickName" list="suggest" maxlength="80" placeholder="Il manque quoi ?" aria-label="Article à ajouter" enterkeyhint="done">
      <button type="button" class="more" id="moreBtn" aria-label="Ajouter avec détails">⋯</button>
      <button class="btn" type="submit">Ajouter</button>
    </form>
    <datalist id="suggest">${suggestions(items).map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
    <div class="bar" role="group" aria-label="Filtres">
      <button class="tab" data-tab="todo" aria-pressed="${S.tab === "todo"}">À acheter</button>
      <button class="tab" data-tab="done" aria-pressed="${S.tab === "done"}">Achetés${done.length ? ` <small>${done.length}</small>` : ""}</button>
      ${
        S.tab === "todo" && shops.length
          ? `<span class="sep"></span><button class="fchip" data-shop="" aria-pressed="${!S.shop}">Partout</button>${shops
              .map((s) => `<button class="fchip" data-shop="${s.id}" aria-pressed="${S.shop === s.id}">${esc(s.l)}</button>`)
              .join("")}`
          : ""
      }
    </div>
    ${
      !others.length && S.tab === "todo"
        ? `<button class="invite-hint" id="inviteHint"><span class="av lg" aria-hidden="true">💌</span><span><b>Invite les autres</b><span>Envoie le lien à ta moitié, ta coloc ou ta famille pour partager cette liste.</span></span></button>`
        : ""
    }
    <main id="list">${listHtml(filtered, done.length)}</main>`;

  if (keep) {
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

function suggestions(items) {
  const onList = new Set(items.filter((i) => !i.done).map((i) => norm(i.name)));
  const memo = loadJSON("courses:memo", {});
  return Object.entries(memo)
    .filter(([k]) => !onList.has(k))
    .sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at)
    .slice(0, 60)
    .map(([, v]) => v.name);
}

function listHtml(list, doneCount) {
  if (!list.length) {
    if (S.tab === "done") return `<div class="empty"><p>✅</p><p>Les articles cochés apparaîtront ici.</p></div>`;
    if (S.shop) return `<div class="empty"><p>🛒</p><p>Rien de plus à prendre ici.</p></div>`;
    return `<div class="empty"><p>🧺</p><p>Le frigo est plein. Ajoute un article dès que quelque chose se termine.</p></div>`;
  }
  let html = "";
  if (S.tab === "done") {
    // Achetés : du plus récent au plus ancien, sans rayons.
    const sorted = [...list].sort((a, b) => String(b.done_at || "").localeCompare(String(a.done_at || "")));
    html += `<ul class="items">${sorted.map(itemHtml).join("")}</ul>`;
    html += `<button class="clear" id="clearDone">Retirer les ${doneCount} article${doneCount > 1 ? "s" : ""} acheté${doneCount > 1 ? "s" : ""}</button>`;
    return html;
  }
  for (const c of CATS) {
    const group = list
      .filter((i) => (CATS.some((x) => x.id === i.cat) ? i.cat : "autre") === c.id)
      .sort((a, b) => (PRANK[a.prio] ?? 1) - (PRANK[b.prio] ?? 1) || String(a.created_at).localeCompare(String(b.created_at)));
    if (!group.length) continue;
    html += `<section class="aisle"><h2><span class="emo" aria-hidden="true">${c.e}</span>${esc(c.l)}<small>${group.length}</small></h2><ul class="items">${group
      .map(itemHtml)
      .join("")}</ul></section>`;
  }
  return html;
}

function itemHtml(it) {
  const prio = PRIOS.find((p) => p.id === it.prio);
  const shop = SHOPS.find((s) => s.id && s.id === it.shop);
  const many = S.members.length > 1;
  let who = "";
  if (it.done && it.done_by) who = `acheté par ${esc(memberName(it.done_by))} ${esc(ago(it.done_at))}`;
  else if (it.done) who = `acheté ${esc(ago(it.done_at))}`;
  else if (many && it.added_by) who = `ajouté par ${esc(memberName(it.added_by))}`;
  return `<li class="${it.done ? "done" : ""}" data-id="${esc(it.id)}">
    <button class="check" data-toggle="${esc(it.id)}" aria-label="${it.done ? "Remettre dans la liste" : "Marquer comme acheté"} : ${esc(it.name)}">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--on-basil)"><path d="M3 8.5l3.2 3L13 4.5"/></svg>
    </button>
    <button class="body" data-edit="${esc(it.id)}">
      <div class="name">${esc(it.name)}${it.qty ? ` <span class="qty">· ${esc(it.qty)}</span>` : ""}</div>
      ${it.quality ? `<div class="quality">${esc(it.quality)}</div>` : ""}
      <div class="meta">${!it.done && prio && it.prio !== "plustard" ? `<span class="pill ${it.prio}">${esc(prio.l)}</span>` : ""}${
        shop ? `<span class="pill">${esc(shop.l)}</span>` : ""
      }${who ? `<span>${who}</span>` : ""}${it._pending ? `<span class="pending">en attente d'envoi</span>` : ""}</div>
    </button>
  </li>`;
}

// ---------- feuille article ----------
function chips(el, opts, val, labelFn) {
  el.innerHTML = opts.map((o) => `<button type="button" class="chip" data-v="${o.id}" aria-pressed="${o.id === val}">${esc(labelFn ? labelFn(o) : o.l)}</button>`).join("");
  el.onclick = (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    el.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
  };
}
function openSheet(it, presetName) {
  S.editingId = it ? it.id : null;
  $("#sheetTitle").textContent = it ? "Modifier l'article" : "Nouvel article";
  $("#saveBtn").textContent = it ? "Enregistrer" : "Ajouter";
  $("#delBtn").hidden = !it;
  const parsed = presetName ? parseQuick(presetName) : { name: "", qty: "" };
  const name = it ? it.name : parsed.name;
  const memo = !it && name ? loadJSON("courses:memo", {})[norm(name)] : null;
  $("#fName").value = name;
  $("#fQty").value = it ? it.qty || "" : parsed.qty;
  $("#fQuality").value = it ? it.quality || "" : memo?.quality || "";
  chips($("#fCat"), CATS, it?.cat || (name ? guessCat(name) : "autre"), (c) => c.e + " " + c.l);
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
    prio: chosen($("#fPrio")) || "bientot",
    shop: chosen($("#fShop")),
  };
  const id = S.editingId;
  $("#sheet").close();
  if (id) {
    remember(data);
    enqueue({ t: "patch", id, patch: data });
  } else addItem(data);
});
$("#cancelBtn").onclick = () => $("#sheet").close();
$("#delBtn").onclick = () => {
  const it = viewItems().find((i) => i.id === S.editingId);
  $("#sheet").close();
  if (it) removeItems([it], `« ${it.name} » supprimé`);
};
for (const d of ["#sheet", "#panel"]) $(d).addEventListener("click", (e) => e.target === $(d) && $(d).close());

// ---------- panneaux : foyer, invitations, profil ----------
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
    `<h3>${fresh ? "Ta liste est prête ! " : ""}Inviter quelqu'un</h3>
    <p class="hint">Envoie ce lien à ta moitié, ta coloc ou ta famille. En l'ouvrant, ils créent leur profil et rejoignent « ${esc(h.name)} ». Ils peuvent aussi taper le code dans l'app.</p>
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
  const items = viewItems().filter((i) => !i.done);
  openPanel(
    `<h3>${esc(h?.name || "")}</h3>
    <h4>Membres</h4>
    <ul class="people">${S.members
      .map((m) => `<li><span class="av lg">${esc(m.emoji || "🙂")}</span><span><b>${esc(m.name || "Sans nom")}${m.uid === S.uid ? " (toi)" : ""}</b><br><small>${m.uid === h?.created_by ? "a créé la liste" : "membre"}</small></span></li>`)
      .join("")}</ul>
    <div class="stack" style="margin-top:10px">
      <button class="btn wide" id="hInvite">Inviter quelqu'un</button>
      <button class="btn ghost wide" id="hText" ${items.length ? "" : "disabled"}>Envoyer la liste par message</button>
    </div>
    <h4>Mes listes</h4>
    ${S.households
      .map((x) => {
        const k = KINDS.find((y) => y.id === x.kind) || KINDS[3];
        return `<button class="hh" data-hh="${esc(x.id)}" aria-current="${x.id === S.hid}"><span class="k">${k.e}</span><span><b>${esc(x.name)}</b><small>${esc(k.l)}</small></span></button>`;
      })
      .join("")}
    <button class="btn ghost wide" id="hNew">+ Créer ou rejoindre une autre liste</button>
    <h4>Réglages de la liste</h4>
    <form class="field" id="hRename" autocomplete="off"><label for="hName">Nom</label>
      <div style="display:flex;gap:8px"><input id="hName" maxlength="40" value="${esc(h?.name || "")}"><button class="btn" type="submit">OK</button></div></form>
    <button class="btn danger wide" id="hLeave">Quitter cette liste</button>
    <p class="hint" style="margin-top:8px">${S.members.length <= 1 ? "Tu es seul·e sur cette liste : en la quittant, elle sera supprimée." : "Les autres membres gardent la liste."}</p>
    <button class="link" data-close>Fermer</button>`,
    () => {
      $("#hInvite").onclick = () => openInvite(false);
      $("#hText").onclick = () => shareAsText(items);
      $("#panelBody").querySelectorAll("[data-hh]").forEach(
        (b) =>
          (b.onclick = async () => {
            $("#panel").close();
            await selectHousehold(b.dataset.hh);
          }),
      );
      $("#hNew").onclick = () => openPanel(`<h3>Une autre liste</h3>${householdForms("n")}<button class="link" data-close>Annuler</button>`, () => bindHouseholdForms("n"));
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
  let text = `🧺 ${h?.name || "Courses"}\n`;
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
  openPanel(
    `<h3>Mon profil</h3>
    <form id="mForm" autocomplete="off">
      <div class="field"><label for="mName">Prénom</label><input id="mName" maxlength="30" required value="${esc(me.name)}"></div>
      <div class="field"><span>Emoji</span>${emojiPicker(me.emoji)}</div>
      <p class="err" id="mErr"></p>
      <button class="btn wide" type="submit">Enregistrer</button>
    </form>
    ${
      S.store?.account
        ? `<h4>Utiliser l'app sur un autre appareil</h4>
    <p class="hint">Ton compte est lié à ce navigateur. Crée un code de récupération pour le retrouver sur un autre téléphone (le même code marche aussi pour Déclic).</p>
    <div class="stack"><button class="btn ghost wide" id="mCode">Créer mon code de récupération</button>
    <button class="btn ghost wide" id="mLogin">J'ai déjà un code</button></div>`
        : ""
    }
    ${S.store?.mode === "demo" ? `<p class="hint">Mode démonstration : les données restent dans ce navigateur.</p>` : ""}
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
      $("#mCode") &&
        ($("#mCode").onclick = async () => {
          if (!confirm("Créer un code ? S'il en existait déjà un, l'ancien ne marchera plus.")) return;
          try {
            const code = await S.store.account.createCode();
            openPanel(
              `<h3>Ton code de récupération</h3><div class="bigcode" style="font-size:1.3rem">${esc(code)}</div>
              <p class="hint">Note-le ou fais une capture d'écran, et garde-le pour toi. Il ne sera plus affiché.</p>
              <div class="stack"><button class="btn ghost wide" id="cCopy">Copier</button><button class="btn wide" data-close>C'est noté</button></div>`,
              () => ($("#cCopy").onclick = () => copy(code, "Code copié")),
            );
          } catch (err) {
            toast(errText(err));
          }
        });
      $("#mLogin") && ($("#mLogin").onclick = openRecover);
    },
  );
}

function openRecover() {
  openPanel(
    `<h3>Retrouver mon compte</h3>
    <p class="hint">Entre le code de récupération créé dans ton profil (Courses ou Déclic) sur ton autre appareil.</p>
    <form id="rForm" autocomplete="off"><div class="field"><label for="rCode">Code de récupération</label>
      <input id="rCode" class="code-in" maxlength="24" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX"></div>
      <p class="err" id="rErr"></p>
      <button class="btn wide" type="submit">Retrouver mon compte</button></form>
    <button class="link" data-close>Annuler</button>`,
    () => {
      $("#rForm").onsubmit = async (e) => {
        e.preventDefault();
        try {
          await S.store.account.login($("#rCode").value);
          // Nouveau compte sur cet appareil : on repart de zéro (les changements en attente appartenaient à l'ancien).
          for (const k of Object.keys(localStorage)) if (k.startsWith("courses:") && k !== "courses:memo" && k !== "courses:join") localStorage.removeItem(k);
          toast("Compte retrouvé !");
          setTimeout(() => location.reload(), 600);
        } catch (err) {
          $("#rErr").textContent = errText(err);
        }
      };
    },
  );
}

// ---------- événements de la liste ----------
$("#app").addEventListener("submit", (e) => {
  if (e.target.id !== "quick") return;
  e.preventDefault();
  const input = $("#quickName");
  const raw = input.value.trim();
  if (!raw) return;
  input.value = "";
  const { name, qty } = parseQuick(raw);
  const memo = loadJSON("courses:memo", {})[norm(name)];
  S.tab = "todo";
  addItem({ name, qty, quality: memo?.quality || "", cat: guessCat(name), prio: "bientot", shop: memo?.shop || "" });
  input.focus();
});
$("#app").addEventListener("click", (e) => {
  const t = (s) => e.target.closest(s);
  if (t("#moreBtn")) {
    const n = $("#quickName").value.trim();
    $("#quickName").value = "";
    openSheet(null, n);
  } else if (t("[data-tab]")) {
    S.tab = t("[data-tab]").dataset.tab;
    render();
  } else if (t("[data-shop]")) {
    S.shop = t("[data-shop]").dataset.shop;
    render();
  } else if (t("[data-toggle]")) {
    const it = viewItems().find((i) => i.id === t("[data-toggle]").dataset.toggle);
    if (it) toggle(it);
  } else if (t("[data-edit]")) {
    const it = viewItems().find((i) => i.id === t("[data-edit]").dataset.edit);
    if (it) openSheet(it);
  } else if (t("#clearDone")) {
    const done = viewItems().filter((i) => i.done);
    removeItems(done, `${done.length} article${done.length > 1 ? "s" : ""} retiré${done.length > 1 ? "s" : ""}`);
  } else if (t("#hhBtn")) openHousehold();
  else if (t("#facesBtn") || t("#inviteHint")) S.members.length > 1 ? openHousehold() : openInvite(false);
  else if (t("#meBtn") || t("#editMe")) openMe();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && S.screen === "list" && document.activeElement?.tagName !== "INPUT" && !document.querySelector("dialog[open]")) {
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
async function selectHousehold(hid) {
  if (S.unsub) S.unsub();
  S.unsub = null;
  S.hid = hid;
  saveJSON("courses:hid", hid);
  S.shop = "";
  S.tab = "todo";
  S.live = null;
  if (!hid) {
    S.screen = "setup";
    render();
    return;
  }
  restoreHousehold();
  S.screen = "list";
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
      if (!ok && S.live) render();
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
    const ok = await joinCode(pending, (m) => toast(m));
    if (ok) return;
  }
  const keep = S.households.find((h) => h.id === S.hid);
  await selectHousehold(keep ? keep.id : S.households[0]?.id || null);
}

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
    // Hors ligne mais déjà installé : on affiche la liste gardée sur l'appareil, et on réessaiera.
    if (e.code === "network" && S.me && S.hid) {
      S.screen = "list";
      render();
      return;
    }
    S.screen = "error";
    render();
    return;
  }
  if (S.uid && S.uid !== S.store.uid) {
    // Autre compte que la dernière fois : on oublie ce qui était gardé pour l'ancien.
    for (const k of Object.keys(localStorage)) if (k.startsWith("courses:") && k !== "courses:memo" && k !== "courses:join") localStorage.removeItem(k);
    Object.assign(S, { me: null, households: [], hid: null, queue: [], server: new Map(), members: [] });
  }
  S.uid = S.store.uid;
  saveJSON("courses:uid", S.uid);
  try {
    const p = await S.store.getProfile();
    if (!p) {
      S.screen = "profile";
      render();
      return;
    }
    S.me = { name: p.name, emoji: p.emoji };
    saveJSON("courses:me", S.me);
    await afterProfile();
  } catch (e) {
    if (e.code === "network" && S.me && S.hid) {
      S.screen = "list";
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
  // Affichage immédiat de la dernière liste connue, avant même d'avoir le réseau.
  if (S.me && S.hid && !loadJSON("courses:join", null)) {
    restoreHousehold();
    S.screen = "list";
  }
  render();
  connect();
  const resync = () => {
    if (!S.store) {
      if (S.screen === "list" || S.screen === "error") connect();
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
  setInterval(() => S.screen === "list" && !document.querySelector("dialog[open]") && document.activeElement?.id !== "quickName" && render(), 60000);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();

