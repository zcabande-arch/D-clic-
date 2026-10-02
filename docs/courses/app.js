// Take Out : la liste de courses partagée du foyer (famille, coloc, couple, amis), ce qu'il y a déjà dans la cuisine,
// et ce que l'on dépense, par rayon.
// Un article est soit sur la liste de courses (done = false), soit acheté et « dans notre cuisine » (done = true).
// Chaque achat avec un prix devient une ligne de « purchases », qui alimente l'onglet Dépenses.
// Les changements s'affichent tout de suite et partent dans une file d'attente : sans réseau (au fond du magasin),
// tout reste utilisable et se synchronise dès que la connexion revient.
import { openStore } from "./store.js";

// tint : fond pastel de la carte du rayon ; tone : couleur du rayon dans le graphique.
const CATS = [
  { id: "fruits", e: "🥦", l: "Fruits & légumes", tint: "#DCEAC8", tone: "#A3C77F" },
  { id: "viande", e: "🥩", l: "Viande & poisson", tint: "#F8D3E3", tone: "#EC96C0" },
  { id: "frais", e: "🧀", l: "Frais & laitiers", tint: "#F7EAB4", tone: "#EACB55" },
  { id: "epicerie", e: "🍝", l: "Épicerie", tint: "#F9DEC6", tone: "#EFAB72" },
  { id: "conserves", e: "🥫", l: "Conserves & sauces", tint: "#F6CFCB", tone: "#E58A82" },
  { id: "epices", e: "🧂", l: "Épices & condiments", tint: "#E6DDF6", tone: "#B3A0E6" },
  { id: "pain", e: "🥖", l: "Boulangerie", tint: "#F3E2C3", tone: "#D9AF6C" },
  { id: "surgeles", e: "🧊", l: "Surgelés", tint: "#D3E2F6", tone: "#93B4EA" },
  { id: "boissons", e: "🥤", l: "Boissons", tint: "#CFEDEF", tone: "#76C8D0" },
  { id: "snacks", e: "🍫", l: "Snacks", tint: "#F1D3EE", tone: "#D492CC" },
  { id: "hygiene", e: "🧴", l: "Hygiène & beauté", tint: "#E2DBF7", tone: "#A293E3" },
  { id: "maison", e: "🧽", l: "Maison & entretien", tint: "#D3EFDF", tone: "#7FCB9F" },
  { id: "bebe", e: "🍼", l: "Bébé & animaux", tint: "#DCE6F8", tone: "#A2BAEC" },
  { id: "autre", e: "🧺", l: "Autre", tint: "#ECE6D8", tone: "#BBB098" },
];
const catOf = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
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
  { id: "famille", l: "Famille", d: "Toute la maisonnée", pour: "la famille", ph: "La famille", tint: "#F7EAB4" },
  { id: "coloc", l: "Coloc", d: "Entre colocataires", pour: "la coloc", ph: "L'appart", tint: "#D3E2F6" },
  { id: "couple", l: "Couple", d: "À deux", pour: "vous deux", ph: "Chez nous", tint: "#F8D3E3" },
  { id: "amis", l: "Amis", d: "Vacances, week-ends, soirées", pour: "la bande", ph: "Le week-end entre potes", tint: "#DCEAC8" },
];
const KIND_OTHER = { id: "autre", l: "Autre", d: "", pour: "vous", ph: "Notre liste", tint: "#ECE6D8" };
const kindOf = (id) => KINDS.find((k) => k.id === id) || KIND_OTHER;
const EMOJIS = ["🦊", "🐻", "🐼", "🐨", "🐸", "🐙", "🦄", "🐝", "🐱", "🐶", "🌻", "🍓", "🥑", "🍕", "⭐", "🌙"];
const PRANK = { urgent: 0, bientot: 1, plustard: 2 };
const VIEWS = ["list", "kitchen", "spend", "us"];

// Illustrations au trait (voir illus/LICENCE.txt) : dessins découpés (.webp) ou redessinés dans le même style (.svg).
const SVG_ILLS = new Set(["pain", "surgeles", "snacks", "hygiene", "maison", "bebe", "autre", "liste", "famille", "coloc", "couple", "amis", "invite", "email", "cle", "ok", "fete"]);
const ill = (name, cls = "ill") => `<img class="${cls}" src="illus/${name}.${SVG_ILLS.has(name) ? "svg" : "webp"}" alt="" aria-hidden="true" draggable="false">`;
// Petite frise de dessins pour les écrans vides.
const doodles = (...names) => `<div class="doodles" aria-hidden="true">${names.map((n, i) => ill(n, `ill d${i}`)).join("")}</div>`;
const catIll = (id, cls) => ill(catOf(id).id, cls);
const logo = (cls = "logo") => `<img class="${cls}" src="icons/logo.png" alt="Take Out" draggable="false">`;
const kindIll = (id, cls) => ill(KINDS.some((k) => k.id === id) ? id : "autre", cls);
// Étoile décorative des cartes (comme les formes du design de référence).
const STAR = `<svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4l9 25 24-12-12 24 25 9-25 9 12 24-24-12-9 25-9-25-24 12 12-24-25-9 25-9-12-24 24 12z"/></svg>`;
// Icônes au trait de la barre du bas.
const ICONS = {
  list: `<svg viewBox="0 0 24 24"><path d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 9H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>`,
  kitchen: `<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M5 10h14M9 6v1.5M9 13v3"/></svg>`,
  spend: `<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>`,
  us: `<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.3c2.4.2 4 1.9 4.5 4.7"/></svg>`,
};

// ---------- montants ----------
const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (n) => EUR.format(n || 0);
// « 2,50 », « 2.5 », « 2,50 € » → 2.5 ; vide → null ; incorrect → NaN.
function parseMoney(s) {
  const t = String(s || "").replace(/[€\s]/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) / 100 : NaN;
}
const pct = (x) => `${Math.round(x * 100)} %`;

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
    .replace(/[\u0300-\u036f]/g, "")
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
const today = () => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());

// Notification en bas d'écran, avec jusqu'à deux actions : [["Annuler", fn], …].
let toastTimer;
function toast(text, actions = []) {
  $("#toastText").textContent = text;
  const box = $("#toastActions");
  box.replaceChildren(
    ...actions.map(([label, fn]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.onclick = () => {
        $("#toast").classList.remove("show");
        fn();
      };
      return b;
    }),
  );
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), actions.length ? 5500 : 2600);
}
function errText(e) {
  if (!e) return "Une erreur est survenue.";
  if (e.code === "network") return "Pas de connexion. Réessaie quand le réseau revient.";
  if (e.code === "setup") return "La base n'est pas prête : il faut lancer supabase/courses.sql dans Supabase (voir le README).";
  if (e.code === "denied") return "Tu n'as pas accès à cette liste.";
  if (e.code === "bad_code") return "Ce code ne correspond à aucun compte. Vérifie les lettres et les chiffres.";
  if (e.code === "short_code") return "Le code fait 16 caractères, par exemple ABCD-EFGH-JKLM-NPQR.";
  return "Une erreur est survenue, réessaie.";
}

// ---------- état ----------
const S = {
  store: null,
  uid: loadJSON("courses:uid", null),
  me: loadJSON("courses:me", null),
  acct: { hasCode: false }, // un code de sauvegarde existe-t-il ?
  households: loadJSON("courses:households", []),
  hid: loadJSON("courses:hid", null),
  members: [],
  // Ce que la base connaît, par table.
  data: { items: new Map(), purchases: new Map() },
  queue: loadJSON("courses:queue", []), // changements pas encore envoyés
  view: loadJSON("courses:view", "list"),
  shop: "",
  kfilter: "all",
  period: "month",
  catMode: loadJSON("courses:catMode", "auto"), // « auto » : rayon deviné ; « ask » : on le choisit à chaque ajout
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
const member = (uid) => S.members.find((m) => m.uid === uid);
const memberName = (uid) => (uid === S.uid ? "toi" : member(uid)?.name || "quelqu'un");
// Avatar d'une personne : sa photo, sinon son emoji.
const face = (p, cls = "", style = "") =>
  `<span class="av${cls ? " " + cls : ""}"${style ? ` style="${style}"` : ""}>${p?.avatar ? `<img src="${esc(p.avatar)}" alt="" loading="lazy">` : esc(p?.emoji || "🙂")}</span>`;
const faceOf = (uid, cls) => face(uid === S.uid ? S.me : member(uid), cls);

function cacheHousehold() {
  if (!S.hid) return;
  saveJSON("courses:cache:" + S.hid, { items: [...S.data.items.values()], purchases: [...S.data.purchases.values()], members: S.members });
}
function restoreHousehold() {
  const c = loadJSON("courses:cache:" + S.hid, null);
  S.data.items = new Map((c?.items || []).map((r) => [r.id, r]));
  S.data.purchases = new Map((c?.purchases || []).map((r) => [r.id, r]));
  S.members = c?.members || [];
}

// Ce qui est affiché = ce que la base connaît + les changements en attente.
function rows(tbl) {
  const m = new Map([...S.data[tbl]].map(([k, v]) => [k, { ...v }]));
  for (const op of S.queue) {
    if (op.hid !== S.hid || (op.tbl || "items") !== tbl) continue;
    if (op.t === "insert") for (const r of op.rows) m.set(r.id, { ...r, _pending: true });
    else if (op.t === "patch") {
      const it = m.get(op.id);
      if (it) m.set(op.id, { ...it, ...op.patch, _pending: true });
    } else if (op.t === "delete") op.ids.forEach((id) => m.delete(id));
  }
  return [...m.values()];
}
const viewItems = () => rows("items");

// ---------- file d'attente des changements ----------
function enqueue(op) {
  op.hid = S.hid;
  op.tbl = op.tbl || "items";
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
      const tbl = op.tbl || "items";
      try {
        if (op.t === "insert") await S.store.insertRows(tbl, op.rows);
        else if (op.t === "patch") await S.store.patchRow(tbl, op.id, op.patch);
        else if (op.t === "delete") await S.store.deleteRows(tbl, op.ids);
        // Ce qui vient d'être envoyé fait désormais partie de l'état connu, même si le temps réel est coupé.
        if (op.hid === S.hid) applyToData(tbl, op);
      } catch (e) {
        if (e.code === "network") break; // on réessaiera au retour du réseau
        toast(op.t === "insert" ? "Ajout refusé : " + errText(e) : "Modification refusée : " + errText(e));
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
function applyToData(tbl, op) {
  const m = S.data[tbl];
  if (op.t === "insert") for (const r of op.rows) m.set(r.id, { ...r });
  else if (op.t === "patch") {
    const it = m.get(op.id);
    if (it) m.set(op.id, { ...it, ...op.patch });
  } else if (op.t === "delete") op.ids.forEach((id) => m.delete(id));
}

// ---------- actions sur les articles ----------
function remember(it) {
  const memo = loadJSON("courses:memo", {});
  const k = norm(it.name);
  if (!k) return;
  memo[k] = { name: it.name, cat: it.cat, quality: it.quality || "", shop: it.shop || "", price: it.price ?? memo[k]?.price ?? null, n: (memo[k]?.n || 0) + 1, at: Date.now() };
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
  if (data.price != null) extra.price = data.price;
  if (same) {
    S.flashId = same.id;
    if (place === "list" && !same.done) {
      if (Object.keys(extra).length && (extra.qty !== same.qty || extra.price !== same.price)) {
        enqueue({ t: "patch", id: same.id, patch: extra });
        toast(`« ${same.name} » était déjà sur la liste : mis à jour`);
      } else {
        toast(`« ${same.name} » est déjà sur la liste`);
        render();
      }
    } else if (place === "list") {
      // Il était dans la cuisine : on le remet sur la liste au lieu de créer un doublon.
      enqueue({ t: "patch", id: same.id, patch: { ...extra, ...TO_LIST() } });
      toast(`« ${same.name} » ajouté à la liste`);
    } else if (same.done) {
      if (same.low || Object.keys(extra).length) enqueue({ t: "patch", id: same.id, patch: { ...extra, low: false } });
      else render();
      toast(same.low ? `« ${same.name} » : stock refait` : `« ${same.name} » est déjà dans la cuisine`);
    } else bought(same);
    return;
  }
  const memo = loadJSON("courses:memo", {})[norm(data.name)];
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
    price: data.price ?? memo?.price ?? null,
    added_by: S.uid,
    done_by: place === "kitchen" ? S.uid : null,
    created_at: nowIso(),
    done_at: place === "kitchen" ? nowIso() : null,
  };
  remember(row);
  S.flashId = row.id;
  enqueue({ t: "insert", rows: [row] });
  return row.id;
}

// Ajout depuis la barre (texte tapé ou proposition) : le rayon est deviné, puis on peut le changer à la main.
function quickAdd(name, qty) {
  const memo = loadJSON("courses:memo", {})[norm(name)];
  const cat = guessCat(name);
  const id = addItem({ name, qty, quality: memo?.quality || "", cat, prio: "bientot", shop: memo?.shop || "" }, S.view === "kitchen" ? "kitchen" : "list");
  if (!id) return;
  if (S.catMode === "ask") openCatPicker(id, true);
  else toast(`« ${name} » → ${catOf(cat).l}`, [["Changer", () => openCatPicker(id)]]);
}

function openCatMode() {
  const opt = (v, title, sub) =>
    `<li><button class="growrow" data-catmode="${v}"><span class="gmain"><span class="gname">${title}</span><small>${sub}</small></span>${S.catMode === v ? `<b class="tag">choisi</b>` : ""}</button></li>`;
  openPanel(
    `${panelHead("Rayon des nouveaux articles")}
    <ul class="group">
      ${opt("auto", "Deviné automatiquement", "L'app range l'article ; un bouton « Changer » permet de corriger.")}
      ${opt("ask", "Je choisis à chaque fois", "Après chaque ajout, la grille des rayons s'ouvre.")}
    </ul>`,
    () =>
      $("#panelBody").querySelectorAll("[data-catmode]").forEach(
        (b) =>
          (b.onclick = () => {
            S.catMode = b.dataset.catmode;
            saveJSON("courses:catMode", S.catMode);
            $("#panel").close();
            render();
            toast(S.catMode === "ask" ? "Tu choisiras le rayon à chaque ajout" : "Le rayon sera deviné automatiquement");
          }),
      ),
  );
}

// Choisir le rayon d'un article à la main ; l'app le retient pour la prochaine fois.
function openCatPicker(id, fresh) {
  const it = viewItems().find((i) => i.id === id);
  if (!it) return;
  const cur = catOf(it.cat).id;
  openPanel(
    `${panelHead(fresh ? "Dans quel rayon&nbsp;?" : "Changer de rayon")}
    <p class="hint center"><b>${esc(it.name)}</b>${it.qty ? ` · ${esc(it.qty)}` : ""}</p>
    <div class="catgrid">${CATS.map(
      (c) => `<button type="button" class="catcell" data-pickcat="${c.id}" aria-pressed="${c.id === cur}"><span class="bubble" style="--tint:${c.tint}">${catIll(c.id, "ill sm")}</span><span>${esc(c.l)}</span></button>`,
    ).join("")}</div>
    ${fresh ? `<p class="hint center" style="margin-top:12px">Proposé : <b>${esc(catOf(cur).l)}</b>. Ce réglage se change dans Nous.</p>` : ""}`,
    () => {
      $("#panelBody").querySelectorAll("[data-pickcat]").forEach(
        (b) =>
          (b.onclick = () => {
            const cat = b.dataset.pickcat;
            $("#panel").close();
            if (cat !== cur) {
              S.flashId = id;
              enqueue({ t: "patch", id, patch: { cat } });
            }
            remember({ ...it, cat });
            toast(`« ${it.name} » rangé dans ${catOf(cat).l}`);
          }),
      );
    },
  );
}
const snapshot = (it) => ({ done: it.done, low: !!it.low, done_by: it.done_by, done_at: it.done_at, added_by: it.added_by, created_at: it.created_at, prio: it.prio });

// Coché sur la liste : il part dans la cuisine, et son prix (s'il est connu) compte dans les dépenses.
function bought(it) {
  const before = snapshot(it);
  enqueue({ t: "patch", id: it.id, patch: TO_KITCHEN() });
  // Chaque achat compte dans le bilan par type de nourriture, avec ou sans prix.
  const pid = uuid();
  enqueue({ tbl: "purchases", t: "insert", rows: [purchaseRow(it, it.price ?? null, S.uid, pid)] });
  const undo = () => {
    enqueue({ t: "patch", id: it.id, patch: before });
    enqueue({ tbl: "purchases", t: "delete", ids: [pid] });
  };
  if (it.price != null) toast(`« ${it.name} » acheté · ${money(it.price)}`, [["Modifier", () => openPrice(it, pid)], ["Annuler", undo]]);
  else toast(`« ${it.name} » rangé dans la cuisine`, [["Ajouter le prix", () => openPrice(it, pid)], ["Annuler", undo]]);
}
function purchaseRow(it, amount, paidBy, id = uuid()) {
  return { id, household: S.hid, item_id: it.id || null, name: it.name, cat: it.cat || "autre", amount, paid_by: paidBy, created_by: S.uid, bought_at: nowIso() };
}
// Fini dans la cuisine : il repart sur la liste de courses.
function finished(it) {
  const before = snapshot(it);
  enqueue({ t: "patch", id: it.id, patch: { ...TO_LIST(), prio: it.low ? "urgent" : "bientot" } });
  toast(`« ${it.name} » ajouté à la liste de courses`, [["Annuler", () => enqueue({ t: "patch", id: it.id, patch: before })]]);
}
function removeItems(list, msg) {
  if (!list.length) return;
  const rs = list.map(({ _pending, ...r }) => r);
  enqueue({ t: "delete", ids: rs.map((r) => r.id) });
  toast(msg, [["Annuler", () => enqueue({ t: "insert", rows: rs })]]);
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
  app.innerHTML = `<div class="intro">${logo()}<h1>Take Out</h1>
    <p class="lead">${esc(errText(S.bootError))}</p>
    <button class="btn wide" id="retry">Réessayer</button></div>`;
  $("#retry").onclick = () => location.reload();
}

// Première ouverture : « C'est pour qui ? »
function renderWelcome(app) {
  app.innerHTML = `<div class="intro">
    <div class="brand">${logo("logo sm")}<b>Take Out</b></div>
    <div class="hero">${ill("mains", "hero-ill")}</div>
    <h1 class="serif">Bienvenue&nbsp;!</h1>
    <p class="lead">La liste de courses partagée de ton foyer&nbsp;: ce qu'il faut acheter, ce qu'il y a déjà dans la cuisine, et ce que vous dépensez.</p>
    <h2 class="q">C'est pour qui&nbsp;?</h2>
    <div class="kinds">${KINDS.map(
      (k) => `<button class="kind" data-kind="${k.id}" style="--tint:${k.tint}">${STAR}${ill(k.id, "ill lg")}<b>${esc(k.l)}</b><small>${esc(k.d)}</small></button>`,
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

// ---------- photo de profil ----------
// Recadrée en carré et réduite avant l'envoi (une photo de téléphone pèse plusieurs Mo).
async function squarePhoto(file, size = 320) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    c.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
const photoPreview = (src) => (src ? `<img src="${esc(src)}" alt="">` : `<span aria-hidden="true">📷</span>`);
function photoField(cur) {
  if (!S.store?.canAvatar) return "";
  return `<div class="field"><span>Ta photo <small class="opt">(facultatif)</small></span>
    <div class="photo-row"><span class="av photo" id="phPrev">${photoPreview(cur)}</span>
      <span class="photo-btns"><button type="button" class="btn small ghost" id="phPick">${cur ? "Changer la photo" : "Choisir une photo"}</button>
      <button type="button" class="link" id="phDel" ${cur ? "" : "hidden"}>Retirer</button></span></div>
    <input type="file" id="phFile" accept="image/*" hidden></div>`;
}
// state.avatar : adresse de la photo actuelle, image choisie (data:…) en attente d'envoi, ou "" sans photo.
function bindPhoto(state) {
  if (!$("#phPick")) return;
  const show = () => {
    $("#phPrev").innerHTML = photoPreview(state.avatar);
    $("#phDel").hidden = !state.avatar;
    $("#phPick").textContent = state.avatar ? "Changer la photo" : "Choisir une photo";
  };
  $("#phPick").onclick = () => $("#phFile").click();
  $("#phFile").onchange = async () => {
    const f = $("#phFile").files[0];
    $("#phFile").value = "";
    if (!f) return;
    try {
      state.avatar = await squarePhoto(f);
      show();
    } catch {
      toast("Cette image n'a pas pu être lue, essaie une autre photo.");
    }
  };
  $("#phDel").onclick = () => {
    state.avatar = "";
    show();
  };
  state.show = show;
}
const finalAvatar = async (state) => (state.avatar && state.avatar.startsWith("data:") ? await S.store.uploadAvatar(state.avatar) : state.avatar || "");

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
    ${!invited ? `<button class="round dashed back" id="pBack" aria-label="Retour">←</button>` : ""}
    ${invited ? ill("invite", "ill xl") : k ? kindIll(k.id, "ill xl") : ill("mains", "ill xl")}
    <h1 class="serif">Ton profil</h1>
    <p class="lead">${lead}</p>
    <form class="card" id="pForm" autocomplete="off">
      <div class="field"><label for="pName">Ton prénom</label><input id="pName" maxlength="30" required placeholder="ex : Camille" autocomplete="given-name"></div>
      ${photoField("")}
      <div class="field"><span>Ton emoji <small class="opt">(si pas de photo)</small></span>${emojiPicker(emoji)}</div>
      <p class="err" id="pErr"></p>
      <button class="btn wide" type="submit">Continuer</button>
    </form>
    ${invited && S.store?.account ? `<p class="or">Tu as déjà un compte&nbsp;? <button class="link" id="pRecover">J'ai un code de sauvegarde</button></p>` : ""}
  </div>`;
  bindPicker($("#emojiPick"));
  const photo = { avatar: "" };
  bindPhoto(photo);
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
      const me = { name, emoji: picked($("#emojiPick")) || emoji, avatar: await finalAvatar(photo) };
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
    // Prénom et photo déjà choisis dans Déclic : on les propose.
    const sug = await S.store.suggested().catch(() => ({}));
    if (sug.name && $("#pName") && !$("#pName").value) $("#pName").value = sug.name;
    if (sug.avatar && !photo.avatar && photo.show) {
      photo.avatar = sug.avatar;
      photo.show();
    }
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
        setView("list");
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
  if (mode === "join") body = `${joinForm("s")}<p class="or"><button class="link" id="sSwap">Créer une nouvelle liste à la place</button></p>`;
  else if (mode === "create") body = `${createForm("s", S.onb.kind)}<p class="or"><button class="link" id="sSwap">J'ai plutôt un code d'invitation</button></p>`;
  else body = `${createForm("s", "famille")}<p class="or">ou</p>${joinForm("s")}`;
  app.innerHTML = `<div class="intro">
    <p class="hello">${face(S.me, "xl")}</p>
    <h1 class="serif">Salut ${esc(S.me?.name || "")}&nbsp;!</h1>
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

// ---------- écran principal ----------
function setView(v) {
  S.view = VIEWS.includes(v) ? v : "list";
  saveJSON("courses:view", S.view);
}

function renderMain(app) {
  const h = household();
  const items = viewItems();
  const todo = items.filter((i) => !i.done),
    stock = items.filter((i) => i.done);
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
      <button class="hhpill" id="hhBtn" aria-label="Changer de liste">${kindIll(h?.kind, "ill xs")}<span>${esc(h?.name || "")}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg></button>
      <span class="grow"></span>
      <button class="round" id="meBtn" aria-label="Nous : membres et profil">${face(S.me, "me")}</button>
    </div>`;

  let body;
  if (S.view === "kitchen") body = kitchenHtml(stock);
  else if (S.view === "spend") body = spendHtml();
  else if (S.view === "us") body = usHtml();
  else body = listHtml(todo, stock);

  const tab = (v, label, badge) =>
    `<button data-view="${v}" aria-current="${S.view === v ? "page" : "false"}" aria-label="${label}">${ICONS[v]}<span>${label}</span>${badge || ""}</button>`;
  const nav = `<nav class="nav" aria-label="Pages"><div class="navbar">
      ${tab("list", "Courses", todo.length ? `<b class="badge">${todo.length}</b>` : "")}
      ${tab("kitchen", "Cuisine", lowCount ? `<b class="badge warn">${lowCount}</b>` : "")}
      <button class="fab" id="fab" aria-label="${S.view === "us" ? "Inviter quelqu'un" : "Ajouter un article"}"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
      ${tab("spend", "Bilan")}
      ${tab("us", "Nous")}
    </div></nav>`;

  app.innerHTML = top + (status ? `<div class="sync">${esc(status)}</div>` : "") + body + nav;

  if (keep && keep.view === S.view && $("#quickName")) {
    $("#quickName").value = keep.v;
    if (keep.f) $("#quickName").focus();
    updateSuggest();
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
      <input id="quickName" data-view="${view}" maxlength="80" placeholder="${esc(placeholder)}" aria-label="Article à ajouter" enterkeyhint="done"
        autocomplete="off" autocorrect="off" spellcheck="false" role="combobox" aria-controls="sugg" aria-expanded="false">
      <button class="btn" type="submit">Ajouter</button>
      <div class="sugg" id="sugg" role="listbox" aria-label="Propositions" hidden></div>
    </form>`;
}

function aisle(c, n, inner) {
  return `<section class="aisle" style="--tint:${c.tint}"><h2>${STAR}<span class="bubble">${catIll(c.id, "ill cat")}</span><span>${esc(c.l)}</span><small>${n}</small></h2><ul class="items">${inner}</ul></section>`;
}
const groupByCat = (list) => CATS.map((c) => [c, list.filter((i) => catOf(i.cat).id === c.id)]).filter(([, g]) => g.length);

function listHtml(todo, stock) {
  // Filtre par magasin : seulement les magasins présents dans la liste.
  const shops = SHOPS.filter((s) => s.id && todo.some((i) => i.shop === s.id));
  if (S.shop && !shops.some((s) => s.id === S.shop)) S.shop = "";
  const shown = todo.filter((i) => !S.shop || i.shop === S.shop || !i.shop);
  const low = stock.filter((i) => i.low);
  const others = S.members.filter((m) => m.uid !== S.uid);
  let html = `<header class="head with-ill">${ill("mains", "head-ill")}<h1 class="serif">Liste de courses</h1><p class="date">${esc(today())}</p></header>
    ${quickForm("list", "Il manque quoi ?")}`;
  if (shops.length)
    html += `<div class="bar" role="group" aria-label="Filtrer par magasin"><button class="fchip" data-shop="" aria-pressed="${!S.shop}">Partout</button>${shops
      .map((s) => `<button class="fchip" data-shop="${s.id}" aria-pressed="${S.shop === s.id}">${esc(s.l)}</button>`)
      .join("")}</div>`;
  if (low.length)
    html += `<section class="note-card" style="--tint:#F7EAB4">${STAR}<h3>Presque fini à la maison</h3><div class="chips">${low
      .map((i) => `<button class="chip solid" data-finish="${esc(i.id)}">+ ${esc(i.name)}</button>`)
      .join("")}</div></section>`;
  if (!others.length)
    html += `<button class="note-card invite" id="inviteHint" style="--tint:#F8D3E3">${STAR}${ill("invite", "ill md")}<span><b>Invite les autres</b><span>Envoie le lien à ta famille, ta coloc, ta moitié ou tes amis pour partager cette liste.</span></span></button>`;
  html += `<main id="list">`;
  if (!shown.length)
    html += `<div class="empty">${S.shop ? ill("ok", "ill xl") : doodles("fraise", "olive", "fourchette", "couteau")}<p>${S.shop ? "Rien de plus à prendre ici." : "Tout est acheté&nbsp;! Ajoute un article dès que quelque chose se termine."}</p></div>`;
  for (const [c, g] of groupByCat(shown)) {
    g.sort((a, b) => (PRANK[a.prio] ?? 1) - (PRANK[b.prio] ?? 1) || String(a.created_at).localeCompare(String(b.created_at)));
    html += aisle(c, g.length, g.map(listItemHtml).join(""));
  }
  html += `</main>` + backupHint();
  return html;
}

function listItemHtml(it) {
  const prio = PRIOS.find((p) => p.id === it.prio);
  const shop = SHOPS.find((s) => s.id && s.id === it.shop);
  const who = S.members.length > 1 && it.added_by ? `ajouté par ${esc(memberName(it.added_by))}` : "";
  return `<li data-id="${esc(it.id)}">
    <button class="check" data-toggle="${esc(it.id)}" aria-label="Acheté : ${esc(it.name)}">
      <svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>
    </button>
    <button class="body" data-edit="${esc(it.id)}">
      <div class="name">${esc(it.name)}${it.qty ? ` <span class="qty">· ${esc(it.qty)}</span>` : ""}</div>
      ${it.quality ? `<div class="quality">${esc(it.quality)}</div>` : ""}
      <div class="meta">${prio && it.prio !== "plustard" ? `<span class="pill ${it.prio}">${esc(prio.l)}</span>` : ""}${shop ? `<span class="pill">${esc(shop.l)}</span>` : ""}${
        it.price != null ? `<span class="pill">≈ ${money(it.price)}</span>` : ""
      }${who ? `<span>${who}</span>` : ""}${it._pending ? `<span class="pending">en attente d'envoi</span>` : ""}</div>
    </button>
  </li>`;
}

function kitchenHtml(stock) {
  const low = stock.filter((i) => i.low).length;
  if (S.kfilter === "low" && !low) S.kfilter = "all";
  const shown = stock.filter((i) => S.kfilter !== "low" || i.low);
  let html = `<header class="head with-ill">${ill("cuisine", "head-ill")}<h1 class="serif">Dans notre cuisine</h1><p class="date">${
    stock.length ? `${stock.length} produit${stock.length > 1 ? "s" : ""} à la maison${low ? ` · ${low} presque fini${low > 1 ? "s" : ""}` : ""}` : "Ce que vous avez déjà à la maison"
  }</p></header>
    ${quickForm("kitchen", "On a quoi ?")}`;
  if (stock.length)
    html += `<div class="bar" role="group" aria-label="Filtre"><button class="fchip" data-kf="all" aria-pressed="${S.kfilter === "all"}">Tout</button><button class="fchip" data-kf="low" aria-pressed="${
      S.kfilter === "low"
    }" ${low ? "" : "disabled"}>Presque fini${low ? " · " + low : ""}</button></div>`;
  html += `<main id="list">`;
  if (!stock.length)
    html += `<div class="empty">${doodles("huile", "ail", "citron")}<p>La cuisine est vide pour l'instant.</p><p class="hint">Quand tu coches un article sur la liste de courses, il arrive ici. Tu peux aussi ajouter ce que vous avez déjà&nbsp;: quand un produit est fini, un toucher le remet sur la liste.</p></div>`;
  for (const [c, g] of groupByCat(shown)) {
    g.sort((a, b) => (b.low ? 1 : 0) - (a.low ? 1 : 0) || a.name.localeCompare(b.name, "fr"));
    html += aisle(c, g.length, g.map(kitchenItemHtml).join(""));
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

// ---------- dépenses ----------
const PERIODS = [
  { id: "month", l: "Ce mois-ci" },
  { id: "last", l: "Mois dernier" },
  { id: "3m", l: "3 mois" },
  { id: "year", l: "Cette année" },
];
// [début, fin, début de la période précédente comparable, fin de celle-ci, libellé]
function periodRange(p) {
  const n = new Date();
  const m0 = new Date(n.getFullYear(), n.getMonth(), 1);
  if (p === "last") {
    const a = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    return [a, m0, new Date(n.getFullYear(), n.getMonth() - 2, 1), a, "le mois dernier"];
  }
  if (p === "3m") {
    const a = new Date(n.getFullYear(), n.getMonth() - 2, 1);
    return [a, n, new Date(n.getFullYear(), n.getMonth() - 5, 1), new Date(n.getFullYear(), n.getMonth() - 3, n.getDate(), n.getHours()), "ces 3 mois"];
  }
  if (p === "year") {
    const a = new Date(n.getFullYear(), 0, 1);
    return [a, n, new Date(n.getFullYear() - 1, 0, 1), new Date(n.getFullYear() - 1, n.getMonth(), n.getDate(), n.getHours()), "cette année"];
  }
  // Ce mois-ci, comparé au même moment du mois dernier.
  const prevStart = new Date(n.getFullYear(), n.getMonth() - 1, 1);
  const prevEnd = new Date(n.getFullYear(), n.getMonth() - 1, Math.min(n.getDate(), new Date(n.getFullYear(), n.getMonth(), 0).getDate()), n.getHours(), n.getMinutes());
  return [m0, n, prevStart, prevEnd, n.toLocaleDateString("fr-FR", { month: "long" }).replace(/^/, "en ")];
}
const inRange = (p, a, b) => {
  const t = new Date(p.bought_at);
  return t >= a && t < b;
};

// Anneau en segments arrondis, avec l'illustration du rayon sur les plus gros.
function donut(parts, total, center) {
  const R = 84,
    W = 22,
    C = 2 * Math.PI * R,
    gap = W + 6;
  let acc = 0,
    arcs = "",
    pins = "";
  const many = parts.length > 1;
  for (const p of parts) {
    const frac = p.value / total;
    const len = Math.max(0.001, frac * C - (many ? gap : 0));
    const off = acc * C + (many ? gap / 2 : 0);
    arcs += `<circle r="${R}" cx="110" cy="110" fill="none" stroke="${p.color}" stroke-width="${W}" stroke-linecap="round" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-off}"><title>${esc(p.label)} : ${pct(frac)}</title></circle>`;
    if (frac >= 0.09) {
      const a = (acc + frac / 2) * 2 * Math.PI - Math.PI / 2;
      pins += `<span class="pin" style="left:${((110 + R * Math.cos(a)) / 220) * 100}%;top:${((110 + R * Math.sin(a)) / 220) * 100}%">${catIll(p.id, "ill xs")}</span>`;
    }
    acc += frac;
  }
  return `<div class="donut"><svg viewBox="0 0 220 220" role="img" aria-label="Répartition des dépenses par rayon"><g transform="rotate(-90 110 110)"><circle r="${R}" cx="110" cy="110" fill="none" stroke="var(--track)" stroke-width="${W}"/>${
    total ? arcs : ""
  }</g></svg>${pins}<div class="dcenter">${center}</div></div>`;
}

// Qui doit combien à qui pour que chacun ait payé la même part.
function settle(paid, uids) {
  const total = uids.reduce((s, u) => s + (paid[u] || 0), 0);
  const share = total / uids.length;
  const bal = uids.map((u) => ({ u, v: Math.round(((paid[u] || 0) - share) * 100) / 100 }));
  const debt = bal.filter((b) => b.v < -0.004).sort((a, b) => a.v - b.v);
  const cred = bal.filter((b) => b.v > 0.004).sort((a, b) => b.v - a.v);
  const out = [];
  let i = 0,
    j = 0;
  while (i < debt.length && j < cred.length) {
    const x = Math.min(-debt[i].v, cred[j].v);
    if (x >= 0.01) out.push({ from: debt[i].u, to: cred[j].u, amount: x });
    debt[i].v += x;
    cred[j].v -= x;
    if (debt[i].v > -0.004) i++;
    if (cred[j].v < 0.004) j++;
  }
  return out;
}

// Bilan : la part de chaque type de nourriture dans ce que vous achetez (en nombre d'articles),
// puis, plus bas, le budget quand des prix sont notés.
const nArt = (n) => `${n} article${n > 1 ? "s" : ""}`;
function spendHtml() {
  const all = rows("purchases");
  const [a, b, pa, pb, label] = periodRange(S.period);
  const list = all.filter((p) => inRange(p, a, b)).sort((x, y) => String(y.bought_at).localeCompare(String(x.bought_at)));
  const count = list.length;
  const prevList = all.filter((p) => inRange(p, pa, pb));
  const byCat = {};
  for (const p of list) byCat[catOf(p.cat).id] = (byCat[catOf(p.cat).id] || 0) + 1;
  const parts = Object.entries(byCat)
    .map(([id, value]) => ({ id, value, color: catOf(id).tone, label: catOf(id).l }))
    .sort((x, y) => y.value - x.value);

  let html = `<header class="head"><h1 class="serif">Ce qu'on achète</h1><p class="date">${esc(label.replace(/^./, (c) => c.toUpperCase()))}</p></header>
    <div class="bar seg" role="group" aria-label="Période">${PERIODS.map((p) => `<button class="fchip" data-period="${p.id}" aria-pressed="${S.period === p.id}">${p.l}</button>`).join("")}</div>`;

  if (!count) {
    return (
      html +
      `<div class="empty">${doodles("fruits", "epices", "viande")}${donut([], 0, `<b>0</b><span>article</span>`)}
      <p>${all.length ? "Aucun achat sur cette période." : "Coche les articles de la liste quand tu les achètes&nbsp;: la part de chaque type de nourriture s'affichera ici, en cercle."}</p></div>`
    );
  }

  html += `<section class="card chart">${donut(parts, count, `<b>${count}</b><span>${count > 1 ? "articles achetés" : "article acheté"}</span>`)}</section>`;

  // Le petit mot sur vos habitudes.
  const share = (id) => (byCat[id] || 0) / count;
  let insight = `Ce qui revient le plus&nbsp;: <b>${esc(parts[0].label)}</b>, ${pct(parts[0].value / count)} de vos courses.`;
  const fresh = share("fruits"),
    sweet = share("snacks");
  if (count >= 8 && sweet > fresh && sweet >= 0.15) insight += ` Un peu plus de snacks (${pct(sweet)}) que de fruits & légumes (${pct(fresh)}) 🍫`;
  else if (count >= 8 && fresh >= 0.25) insight += ` Bravo, ${pct(fresh)} de fruits & légumes 🥦`;
  if (prevList.length) {
    const d = (count - prevList.length) / prevList.length;
    if (Math.abs(d) >= 0.1) insight += `<br><small>${d > 0 ? "Plus" : "Moins"} d'articles que sur la période précédente (${prevList.length}).</small>`;
  }
  html += `<section class="note-card" style="--tint:#F8D3E3">${STAR}<p class="tiny">Vos habitudes</p><p>${insight}</p></section>`;

  html += `<h3 class="sect">Par type de nourriture</h3><ul class="group">${parts
    .map(
      (p) => `<li><span class="bubble" style="--tint:${catOf(p.id).tint}">${catIll(p.id, "ill sm")}</span>
        <span class="gmain"><span class="gname">${esc(p.label)}</span><span class="gbar"><i style="width:${(p.value / parts[0].value) * 100}%;background:${p.color}"></i></span></span>
        <span class="gval"><b class="tag">${pct(p.value / count)}</b><small>${nArt(p.value)}</small></span></li>`,
    )
    .join("")}</ul>`;

  // Côté budget : seulement ce qui a un prix.
  const priced = list.filter((p) => p.amount != null);
  const total = priced.reduce((s, p) => s + p.amount, 0);
  html += `<h3 class="sect">Côté budget</h3>`;
  if (priced.length) {
    html += `<section class="note-card budget" style="--tint:#D3E2F6">${STAR}<p class="tiny">${esc(label.replace(/^./, (c) => c.toUpperCase()))}</p><p class="big">${money(total)}</p><p><small>pour ${nArt(priced.length)} avec un prix${
      priced.length < count ? ` (sur ${count})` : ""
    }</small></p><button class="btn small" id="addExpense">Ajouter une dépense</button></section>`;
    // Qui a payé, et comment s'équilibrer (utile en coloc et entre amis).
    if (S.members.length > 1 && total) {
      const paid = {};
      for (const p of priced) paid[p.paid_by] = (paid[p.paid_by] || 0) + p.amount;
      const uids = S.members.map((m) => m.uid);
      const top = Math.max(...uids.map((u) => paid[u] || 0), 0.01);
      const moves = settle(paid, uids);
      html += `<ul class="group">${uids
        .map(
          (u) => `<li>${faceOf(u)}<span class="gmain"><span class="gname">${esc(u === S.uid ? (S.me?.name || "Toi") + " (toi)" : member(u)?.name || "Sans nom")}</span>
        <span class="gbar"><i style="width:${((paid[u] || 0) / top) * 100}%"></i></span></span><span class="gval"><b class="tag">${pct((paid[u] || 0) / total)}</b><small>${money(paid[u] || 0)}</small></span></li>`,
        )
        .join("")}</ul>
      <section class="note-card" style="--tint:#DCEAC8;margin-top:12px">${STAR}<p class="tiny">Pour partager à parts égales (${money(total / uids.length)} chacun)</p>${
        moves.length
          ? moves.map((m) => `<p class="settle">${faceOf(m.from, "sm")} ${esc(memberName(m.from) === "toi" ? "Tu dois" : memberName(m.from) + " doit")} <b>${money(m.amount)}</b> à ${faceOf(m.to, "sm")} ${esc(memberName(m.to))}</p>`).join("")
          : `<p>Vous êtes à égalité 🎉</p>`
      }</section>`;
    }
  } else
    html += `<section class="note-card budget" style="--tint:#D3E2F6">${STAR}<p>Note le prix quand tu coches un article (ou ajoute un ticket de caisse) pour suivre aussi votre budget.</p><button class="btn small" id="addExpense" style="margin-top:10px">Ajouter une dépense</button></section>`;

  html += `<h3 class="sect">Derniers achats</h3><ul class="group">${list
    .slice(0, 30)
    .map(
      (p) => `<li><button class="growrow" data-purchase="${esc(p.id)}"><span class="bubble" style="--tint:${catOf(p.cat).tint}">${catIll(p.cat, "ill sm")}</span>
        <span class="gmain"><span class="gname">${esc(p.name)}</span><small>${S.members.length > 1 ? `par ${esc(memberName(p.paid_by))} · ` : ""}${esc(ago(p.bought_at))}${p._pending ? " · en attente" : ""}</small></span>
        <span class="gval">${p.amount != null ? `<b>${money(p.amount)}</b>` : `<small>+ prix</small>`}</span></button></li>`,
    )
    .join("")}</ul>`;
  return html;
}

// ---------- « Nous » : le foyer et mon compte ----------
function row(id, icon, tint, label, extra = "", cls = "") {
  return `<li><button class="growrow ${cls}" id="${id}"><span class="bubble" style="--tint:${tint}">${icon}</span><span class="gmain"><span class="gname">${label}</span>${
    extra ? `<small>${extra}</small>` : ""
  }</span><svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3l3 3-3 3"/></svg></button></li>`;
}
function usHtml() {
  const h = household();
  const k = kindOf(h?.kind);
  const todo = viewItems().filter((i) => !i.done);
  return `<section class="profile">
      ${face(S.me, "huge", `--tint:${k.tint}`)}
      <div><h1 class="serif">${esc(S.me?.name || "")}</h1><p class="date">${esc(k.l)} · « ${esc(h?.name || "")} »</p></div>
    </section>
    <h3 class="sect">Notre liste</h3>
    <ul class="group">${S.members
      .map(
        (m) => `<li>${face(m)}<span class="gmain"><span class="gname">${esc(m.name || "Sans nom")}${m.uid === S.uid ? " (toi)" : ""}</span><small>${
          m.uid === h?.created_by ? "a créé la liste" : "membre"
        }</small></span></li>`,
      )
      .join("")}
      ${row("uInvite", ill("invite", "ill xs"), "#F8D3E3", "Inviter quelqu'un", `Code ${esc(h?.id || "")}`)}
      ${todo.length ? row("uText", ill("liste", "ill xs"), "#F7EAB4", "Envoyer la liste de courses par message") : ""}
    </ul>
    <h3 class="sect">Mes listes</h3>
    <ul class="group">${S.households
      .map(
        (x) => `<li><button class="growrow" data-hh="${esc(x.id)}"><span class="bubble" style="--tint:${kindOf(x.kind).tint}">${kindIll(x.kind, "ill xs")}</span><span class="gmain"><span class="gname">${esc(
          x.name,
        )}</span><small>${esc(kindOf(x.kind).l)}</small></span>${x.id === S.hid ? `<b class="tag">ouverte</b>` : `<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3l3 3-3 3"/></svg>`}</button></li>`,
      )
      .join("")}
      ${row("uNew", "+", "#DCEAC8", "Créer ou rejoindre une autre liste")}
    </ul>
    <h3 class="sect">Réglages de la liste</h3>
    <ul class="group">
      ${row("uRename", "✎", "#D3E2F6", "Renommer la liste", esc(h?.name || ""))}
      ${row("uLeave", "⎋", "#F6CFCB", "Quitter cette liste", S.members.length <= 1 ? "Tu es seul·e : elle sera supprimée" : "Les autres la gardent", "danger")}
    </ul>
    <h3 class="sect">Rayons</h3>
    <ul class="group">
      ${row("uCatMode", catIll("epicerie", "ill xs"), "#F9DEC6", "Rayon des nouveaux articles", S.catMode === "ask" ? "Je choisis à chaque fois" : "Deviné automatiquement (modifiable)")}
    </ul>
    <h3 class="sect">Mon compte</h3>
    <ul class="group">
      ${row("uMe", S.me?.avatar ? `<img class="bubimg" src="${esc(S.me.avatar)}" alt="">` : esc(S.me?.emoji || "🙂"), "#F7EAB4", "Modifier mon profil", "Prénom, photo et emoji")}
      ${
        S.store?.account
          ? row("uBackup", ill(S.acct.hasCode ? "ok" : "cle", "ill xs"), S.acct.hasCode ? "#DCEAC8" : "#F7EAB4", S.acct.hasCode ? "Compte sauvegardé" : "Sauvegarder mon compte", S.acct.hasCode ? "Créer un nouveau code ou lien" : "Pour le retrouver sur un autre téléphone") +
            row("uLogin", ill("invite", "ill xs"), "#ECE6D8", "J'ai déjà un compte", "Ouvrir un compte sauvegardé ici")
          : ""
      }
    </ul>
    ${S.store?.mode === "demo" ? `<p class="hint center">Mode démonstration : les données restent dans ce navigateur (code de sauvegarde : DEMO-2345-6789-ABCD).</p>` : ""}`;
}

function backupHint() {
  if (!S.store?.account || S.acct.hasCode || loadJSON("courses:backupHintOff", false)) return "";
  return `<section class="note-card hintcard" style="--tint:#F7EAB4">${STAR}${ill("cle", "ill md")}<div><b>Sauvegarde ton compte</b>
    <p>Crée ton code de sauvegarde&nbsp;: si tu changes de téléphone, tu retrouveras tes listes en un instant.</p>
    <div class="row"><button class="btn small" id="hintBackup">Sauvegarder</button><button class="link" id="hintOff">Plus tard</button></div></div></section>`;
}

// ---------- propositions pendant la saisie ----------
// Produits courants, proposés dès les premières lettres (en plus de ce que le foyer achète déjà).
const COMMON = `Pommes, Poires, Bananes, Oranges, Clémentines, Citrons, Fraises, Framboises, Myrtilles, Raisin, Kiwis, Mangue, Ananas, Melon, Pastèque, Pêches, Abricots, Cerises, Avocats,
Tomates, Tomates cerises, Salade, Roquette, Mâche, Carottes, Courgettes, Aubergines, Poivrons, Concombre, Oignons, Oignons rouges, Ail, Échalotes, Pommes de terre, Patates douces,
Champignons, Épinards, Brocoli, Chou-fleur, Poireaux, Haricots verts, Petits pois, Radis, Betteraves, Céleri, Fenouil, Potiron, Gingembre, Basilic, Persil, Coriandre, Menthe, Ciboulette,
Poulet, Blancs de poulet, Steak haché, Bœuf, Jambon, Jambon cru, Lardons, Saucisses, Merguez, Chipolatas, Dinde, Escalopes, Côtes de porc, Saumon, Cabillaud, Thon, Crevettes, Moules,
Lait, Lait d'avoine, Lait d'amande, Lait de soja, Beurre, Crème fraîche, Crème liquide, Œufs, Yaourts, Yaourts nature, Fromage blanc, Skyr, Petits suisses, Fromage râpé, Emmental,
Comté, Mozzarella, Burrata, Parmesan, Feta, Chèvre, Camembert, Raclette, Ricotta, Mascarpone, Tofu, Houmous, Pâte feuilletée, Pâte brisée, Pâte à pizza, Gnocchis,
Pâtes, Spaghetti, Penne, Coquillettes, Tagliatelles, Lasagnes, Riz, Riz basmati, Quinoa, Semoule, Boulgour, Lentilles, Pois chiches, Farine, Sucre, Sel, Poivre, Huile d'olive,
Huile de tournesol, Vinaigre, Vinaigre balsamique, Moutarde, Ketchup, Mayonnaise, Sauce soja, Sauce tomate, Pesto, Concentré de tomate, Bouillon cube, Épices, Curry, Paprika,
Cumin, Cannelle, Herbes de Provence, Levure, Maïzena, Café, Capsules de café, Thé, Tisane, Chocolat en poudre, Miel, Confiture, Pâte à tartiner, Beurre de cacahuète, Céréales,
Muesli, Flocons d'avoine, Biscottes, Pain, Baguette, Pain de mie, Brioche, Croissants, Tortillas, Wraps, Pain burger, Chocolat, Chocolat noir, Biscuits, Cookies, Gâteaux, Chips,
Cacahuètes, Amandes, Noix, Bonbons, Compotes, Crackers, Pop-corn, Glace, Frites surgelées, Pizza surgelée, Légumes surgelés, Poisson pané, Eau, Eau gazeuse, Jus d'orange,
Jus de pomme, Soda, Coca, Sirop, Bière, Vin rouge, Vin blanc, Rosé, Cidre, Papier toilette, Essuie-tout, Mouchoirs, Liquide vaisselle, Tablettes lave-vaisselle, Lessive,
Adoucissant, Éponges, Sacs poubelle, Nettoyant, Vinaigre blanc, Javel, Papier cuisson, Papier aluminium, Film alimentaire, Piles, Ampoules, Dentifrice, Brosses à dents,
Shampoing, Après-shampoing, Gel douche, Savon, Déodorant, Cotons, Coton-tiges, Rasoirs, Serviettes hygiéniques, Tampons, Crème solaire, Couches, Lingettes, Lait infantile,
Petits pots, Croquettes, Pâtée, Litière`
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

// Les meilleures propositions pour ce qui est tapé : d'abord ce que le foyer achète souvent, puis les produits courants.
function suggestFor(text) {
  const q = norm(parseQuick(text).name);
  if (!q) return [];
  const items = viewItems();
  const memo = loadJSON("courses:memo", {});
  const seen = new Map();
  const consider = (name, bonus) => {
    const k = norm(name);
    if (!k || k === q) return;
    let score;
    if (k.startsWith(q)) score = 30;
    else if (k.includes(" " + q) || k.includes("'" + q) || k.includes("-" + q)) score = 20;
    else if (q.length >= 3 && k.includes(q)) score = 8;
    else return;
    score += bonus - k.length / 100;
    if (!seen.has(k) || seen.get(k).score < score) seen.set(k, { name, score });
  };
  for (const v of Object.values(memo)) consider(v.name, 10 + Math.min(v.n || 1, 10));
  for (const it of items) consider(it.name, 5);
  for (const n of COMMON) consider(n, 0);
  return [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ name }) => {
      const it = items.find((i) => norm(i.name) === norm(name));
      return { name, state: it ? (it.done ? "kitchen" : "list") : "" };
    });
}

function updateSuggest() {
  const input = $("#quickName"),
    box = $("#sugg");
  if (!input || !box) return;
  const list = document.activeElement === input ? suggestFor(input.value) : [];
  box.hidden = !list.length;
  input.setAttribute("aria-expanded", String(!!list.length));
  const qty = parseQuick(input.value).qty;
  box.innerHTML = list
    .map(
      (s) => `<button type="button" class="sopt" role="option" data-sugg="${esc(s.name)}"><span class="dot" style="--tint:${catOf(guessCat(s.name)).tint}">${catIll(guessCat(s.name), "ill xs")}</span>
      <span class="sname">${esc(s.name)}${qty ? ` <small>· ${esc(qty)}</small>` : ""}</span>${
        s.state === "list" ? `<small class="sstate">déjà sur la liste</small>` : s.state === "kitchen" ? `<small class="sstate">dans la cuisine</small>` : ""
      }</button>`,
    )
    .join("");
}
function pickSuggestion(name) {
  const input = $("#quickName");
  const { qty } = parseQuick(input?.value || "");
  if (input) {
    input.value = "";
    // Produit choisi : on range le clavier (avant de redessiner l'écran, qui sinon redonnerait le focus).
    input.blur();
  }
  quickAdd(name, qty);
  updateSuggest();
}
$("#app").addEventListener("input", (e) => e.target.id === "quickName" && updateSuggest());
$("#app").addEventListener("focusin", (e) => e.target.id === "quickName" && updateSuggest());
$("#app").addEventListener("focusout", (e) => {
  // Laisse le temps au toucher sur une proposition d'être pris en compte.
  if (e.target.id === "quickName") setTimeout(updateSuggest, 150);
});
// Une proposition se choisit au premier toucher, sans fermer le clavier.
$("#app").addEventListener("pointerdown", (e) => {
  const b = e.target.closest && e.target.closest("[data-sugg]");
  if (!b) return;
  e.preventDefault();
  pickSuggestion(b.dataset.sugg);
});
$("#app").addEventListener("keydown", (e) => {
  if (e.target.id === "quickName" && e.key === "Escape") {
    e.target.blur();
  }
});

// ---------- feuille article ----------
function chips(el, opts, val, htmlFn) {
  el.innerHTML = opts.map((o) => `<button type="button" class="chip" data-v="${o.id}" aria-pressed="${o.id === val}">${htmlFn ? htmlFn(o) : esc(o.l)}</button>`).join("");
  el.onclick = (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    el.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
  };
}
const catChip = (c) => `<span class="dot" style="--tint:${c.tint}">${catIll(c.id, "ill xs")}</span>${esc(c.l)}`;
const priceStr = (n) => (n == null ? "" : String(n).replace(".", ","));
function openSheet(it, presetName) {
  S.editingId = it ? it.id : null;
  S.sheetPlace = it ? (it.done ? "kitchen" : "list") : S.view === "kitchen" ? "kitchen" : "list";
  const kitchen = S.sheetPlace === "kitchen";
  $("#sheetTitle").textContent = it ? "Modifier l'article" : kitchen ? "Ajouter à la cuisine" : "Nouvel article";
  $("#delBtn").hidden = !it;
  $("#delBtn").textContent = kitchen ? "Retirer de la cuisine" : "Supprimer l'article";
  // Priorité et magasin n'ont de sens que pour ce qu'il reste à acheter.
  $("#fPrioField").hidden = $("#fShopField").hidden = kitchen;
  const parsed = presetName ? parseQuick(presetName) : { name: "", qty: "" };
  const name = it ? it.name : parsed.name;
  const memo = !it && name ? loadJSON("courses:memo", {})[norm(name)] : null;
  $("#fName").value = name;
  $("#fQty").value = it ? it.qty || "" : parsed.qty;
  $("#fPrice").value = priceStr(it ? it.price : memo?.price);
  $("#fQuality").value = it ? it.quality || "" : memo?.quality || "";
  $("#fErr").textContent = "";
  chips($("#fCat"), CATS, it?.cat || (name ? guessCat(name) : "autre"), catChip);
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
  const price = parseMoney($("#fPrice").value);
  if (Number.isNaN(price)) {
    $("#fErr").textContent = "Le prix doit être un nombre, par exemple 2,50.";
    return;
  }
  const chosen = (el) => el.querySelector('[aria-pressed="true"]')?.dataset.v || "";
  const data = { name, qty: $("#fQty").value.trim(), quality: $("#fQuality").value.trim(), cat: chosen($("#fCat")) || "autre", price };
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

// ---------- panneaux ----------
function openPanel(html, bind) {
  $("#panelBody").innerHTML = html;
  bind && bind();
  if (!$("#panel").open) $("#panel").showModal();
  $("#panelBody").querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => $("#panel").close()));
}
const panelHead = (title, okId) =>
  `<div class="shead"><button type="button" class="round dashed" data-close aria-label="Fermer">✕</button><h3>${title}</h3>${
    okId ? `<button type="submit" class="round ok" ${okId === true ? "" : `id="${okId}"`} aria-label="Valider">✓</button>` : `<span class="round ghost"></span>`
  }</div>`;
const payerChips = (sel) =>
  `<div class="chips" id="payPick">${S.members.map((m) => `<button type="button" class="chip" data-v="${esc(m.uid)}" aria-pressed="${m.uid === sel}">${face(m, "xs")} ${esc(m.uid === S.uid ? "Moi" : m.name || "Sans nom")}</button>`).join("")}</div>`;

// Prix d'un article qu'on vient d'acheter (pid : achat déjà enregistré à modifier).
function openPrice(it, pid) {
  const existing = pid ? rows("purchases").find((p) => p.id === pid) : null;
  const many = S.members.length > 1;
  openPanel(
    `<form id="prForm" autocomplete="off">${panelHead("Combien ça a coûté&nbsp;?", true)}
      <div class="pricebox" style="--tint:${catOf(it.cat).tint}">${STAR}${catIll(it.cat, "ill md")}<b>${esc(it.name)}</b>${it.qty ? `<small>${esc(it.qty)}</small>` : ""}</div>
      <div class="field"><label for="prAmount">Prix payé</label><div class="money"><input id="prAmount" inputmode="decimal" placeholder="0,00" value="${esc(priceStr(existing?.amount ?? it.price))}"><span>€</span></div></div>
      ${many ? `<div class="field"><span>Payé par</span>${payerChips(existing?.paid_by || S.uid)}</div>` : ""}
      <label class="checkline"><input type="checkbox" id="prKeep" checked> Retenir ce prix pour la prochaine fois</label>
      <p class="err" id="prErr"></p>
      <button class="btn wide" type="submit">Enregistrer</button>
    </form>`,
    () => {
      if ($("#payPick")) bindPicker($("#payPick"));
      setTimeout(() => $("#prAmount")?.focus(), 60);
      $("#prForm").onsubmit = (e) => {
        e.preventDefault();
        const amount = parseMoney($("#prAmount").value);
        if (amount == null || Number.isNaN(amount)) {
          $("#prErr").textContent = "Indique un prix, par exemple 2,50.";
          return;
        }
        const paidBy = ($("#payPick") && picked($("#payPick"))) || S.uid;
        if (existing) enqueue({ tbl: "purchases", t: "patch", id: pid, patch: { amount, paid_by: paidBy } });
        else enqueue({ tbl: "purchases", t: "insert", rows: [purchaseRow(it, amount, paidBy)] });
        if ($("#prKeep").checked && viewItems().some((i) => i.id === it.id)) {
          enqueue({ t: "patch", id: it.id, patch: { price: amount } });
          remember({ ...it, price: amount });
        }
        $("#panel").close();
        toast(`${money(amount)} ajouté aux dépenses`);
      };
    },
  );
}

// Dépense ajoutée à la main (ticket de caisse, marché…) ou achat à modifier.
function openExpense(p) {
  const many = S.members.length > 1;
  const d = p ? new Date(p.bought_at) : new Date();
  const dateVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  openPanel(
    `<form id="exForm" autocomplete="off">${panelHead(p ? "Modifier l'achat" : "Nouvelle dépense", true)}
      <div class="field"><label for="exAmount">Montant</label><div class="money"><input id="exAmount" inputmode="decimal" placeholder="0,00" value="${esc(priceStr(p?.amount))}"><span>€</span></div></div>
      <div class="field"><label for="exName">Quoi&nbsp;?</label><input id="exName" maxlength="80" placeholder="ex : Courses au marché" value="${esc(p?.name || "")}"></div>
      <div class="field"><span>Rayon</span><div class="chips" id="exCat"></div></div>
      ${many ? `<div class="field"><span>Payé par</span>${payerChips(p?.paid_by || S.uid)}</div>` : ""}
      <div class="field"><label for="exDate">Date</label><input id="exDate" type="date" value="${dateVal}" max="${new Date().toISOString().slice(0, 10)}"></div>
      <p class="err" id="exErr"></p>
      <button class="btn wide" type="submit">${p ? "Enregistrer" : "Ajouter la dépense"}</button>
      ${p ? `<button type="button" class="btn danger wide" id="exDel" style="margin-top:10px">Supprimer cet achat</button>` : ""}
    </form>`,
    () => {
      chips($("#exCat"), CATS, p?.cat || "autre", catChip);
      $("#exName").addEventListener("input", () => {
        const g = guessCat($("#exName").value);
        if (g !== "autre") $("#exCat").querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === g));
      });
      if ($("#payPick")) bindPicker($("#payPick"));
      if (!p) setTimeout(() => $("#exAmount")?.focus(), 60);
      $("#exForm").onsubmit = (e) => {
        e.preventDefault();
        const amount = parseMoney($("#exAmount").value);
        // Un achat existant peut rester sans prix ; une dépense ajoutée à la main en a besoin.
        if (Number.isNaN(amount) || (amount == null && !p)) {
          $("#exErr").textContent = "Indique un montant, par exemple 24,90.";
          return;
        }
        const cat = picked($("#exCat")) || "autre";
        const name = $("#exName").value.trim() || catOf(cat).l;
        const paidBy = ($("#payPick") && picked($("#payPick"))) || S.uid;
        const [y, m, dd] = ($("#exDate").value || dateVal).split("-").map(Number);
        const when = new Date(y, m - 1, dd, ...(p ? [d.getHours(), d.getMinutes()] : [new Date().getHours(), new Date().getMinutes()])).toISOString();
        const patch = { amount, name, cat, paid_by: paidBy, bought_at: when };
        if (p) enqueue({ tbl: "purchases", t: "patch", id: p.id, patch });
        else enqueue({ tbl: "purchases", t: "insert", rows: [{ ...purchaseRow({ name, cat }, amount, paidBy), bought_at: when }] });
        $("#panel").close();
        toast(p ? "Achat modifié" : `${money(amount)} ajouté aux dépenses`);
      };
      $("#exDel") &&
        ($("#exDel").onclick = () => {
          const { _pending, ...row } = p;
          enqueue({ tbl: "purchases", t: "delete", ids: [p.id] });
          $("#panel").close();
          toast("Achat supprimé", [["Annuler", () => enqueue({ tbl: "purchases", t: "insert", rows: [row] })]]);
        });
    },
  );
}

const inviteUrl = (code) => `${location.origin}${location.pathname}#rejoindre=${code}`;
function openInvite(fresh) {
  const h = household();
  if (!h) return;
  const url = inviteUrl(h.id);
  openPanel(
    `${panelHead(fresh ? "Ta liste est prête&nbsp;!" : "Inviter quelqu'un")}
    <div class="pricebox" style="--tint:#F8D3E3">${STAR}${ill(fresh ? "fete" : "invite", "ill lg")}<p>Envoie ce lien à ceux avec qui tu fais les courses. En l'ouvrant, ils créent leur profil et rejoignent « ${esc(
      h.name,
    )} ». Ils peuvent aussi taper le code dans l'app.</p></div>
    <div class="bigcode" aria-label="Code de la liste">${esc(h.id)}</div>
    <div class="stack">
      <button class="btn wide" id="iShare">Envoyer le lien d'invitation</button>
      <button class="btn ghost wide" id="iCopy">Copier le lien</button>
    </div>`,
    () => {
      $("#iShare").onclick = async () => {
        const text = `Rejoins notre liste de courses « ${h.name} » sur Take Out : ${url}`;
        if (navigator.share) {
          try {
            await navigator.share({ title: "Take Out", text: `Rejoins notre liste de courses « ${h.name} » sur Take Out`, url });
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

function openSwitch() {
  openPanel(
    `${panelHead("Mes listes")}
    <ul class="group">${S.households
      .map(
        (x) => `<li><button class="growrow" data-hh="${esc(x.id)}"><span class="bubble" style="--tint:${kindOf(x.kind).tint}">${kindIll(x.kind, "ill xs")}</span><span class="gmain"><span class="gname">${esc(
          x.name,
        )}</span><small>${esc(kindOf(x.kind).l)}</small></span>${x.id === S.hid ? `<b class="tag">ouverte</b>` : ""}</button></li>`,
      )
      .join("")}</ul>
    <button class="btn ghost wide" id="swNew" style="margin-top:12px">+ Créer ou rejoindre une autre liste</button>`,
    () => {
      $("#panelBody").querySelectorAll("[data-hh]").forEach(
        (b) =>
          (b.onclick = async () => {
            $("#panel").close();
            if (b.dataset.hh !== S.hid) await selectHousehold(b.dataset.hh);
          }),
      );
      $("#swNew").onclick = openNewHousehold;
    },
  );
}
function openNewHousehold() {
  openPanel(`${panelHead("Une autre liste")}${createForm("n", "famille")}<p class="or">ou</p>${joinForm("n")}`, () => bindHouseholdForms("n"));
}
function openRename() {
  const h = household();
  openPanel(
    `<form id="rnForm" autocomplete="off">${panelHead("Renommer la liste", true)}
    <div class="field"><label for="hName">Nom</label><input id="hName" maxlength="40" value="${esc(h?.name || "")}"></div>
    <button class="btn wide" type="submit">Enregistrer</button></form>`,
    () => {
      $("#rnForm").onsubmit = async (e) => {
        e.preventDefault();
        const name = $("#hName").value.trim();
        if (!name || name === h.name) return $("#panel").close();
        try {
          await S.store.rename(h.id, name);
          h.name = name;
          saveJSON("courses:households", S.households);
          $("#panel").close();
          render();
          toast("Liste renommée");
        } catch (err) {
          toast(errText(err));
        }
      };
    },
  );
}
async function leaveHousehold() {
  const h = household();
  if (!confirm(S.members.length <= 1 ? `Supprimer « ${h.name} » et tous ses articles ?` : `Quitter « ${h.name} » ?`)) return;
  try {
    await S.store.leave(h.id);
    localStorage.removeItem("courses:cache:" + h.id);
    S.queue = S.queue.filter((o) => o.hid !== h.id);
    saveJSON("courses:queue", S.queue);
    await refreshHouseholds();
    S.onb = { kind: null, mode: null };
    setView("list");
    await selectHousehold(S.households[0]?.id || null);
    toast("Tu as quitté la liste");
  } catch (err) {
    toast(errText(err));
  }
}

async function shareAsText(items) {
  const h = household();
  let text = `🛒 ${h?.name || "Take Out"}\n`;
  for (const [c, g] of groupByCat(items))
    text += `\n${c.e} ${c.l}\n` + g.map((i) => `• ${i.name}${i.qty ? " (" + i.qty + ")" : ""}${i.quality ? " – " + i.quality : ""}${i.prio === "urgent" ? " 🔥" : ""}`).join("\n") + "\n";
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
    `<form id="mForm" autocomplete="off">${panelHead("Mon profil", true)}
      <div class="field"><label for="mName">Prénom</label><input id="mName" maxlength="30" required value="${esc(me.name)}"></div>
      ${photoField(me.avatar)}
      <div class="field"><span>Emoji <small class="opt">(si pas de photo)</small></span>${emojiPicker(me.emoji)}</div>
      <p class="err" id="mErr"></p>
      <button class="btn wide" type="submit">Enregistrer</button>
    </form>`,
    () => {
      bindPicker($("#emojiPick"));
      const photo = { avatar: me.avatar || "" };
      bindPhoto(photo);
      $("#mForm").onsubmit = async (e) => {
        e.preventDefault();
        const name = $("#mName").value.trim();
        if (!name) return;
        const btn = $("#mForm button.btn[type=submit]");
        btn.disabled = true;
        try {
          const p = { name, emoji: picked($("#emojiPick")) || me.emoji, avatar: await finalAvatar(photo) };
          await S.store.saveProfile(p);
          S.me = p;
          saveJSON("courses:me", p);
          await loadMembers();
          $("#panel").close();
          render();
          toast("Profil mis à jour");
        } catch (err) {
          $("#mErr").textContent = errText(err);
          btn.disabled = false;
        }
      };
    },
  );
}

// ---------- sauvegarde du compte : un code et un lien personnel, sans e-mail ----------
const loginUrl = (code) => `${location.origin}${location.pathname}#compte=${String(code).replace(/[^A-Za-z0-9]/g, "")}`;

function openBackup() {
  const acc = S.store?.account;
  if (!acc) return;
  openPanel(
    `${panelHead("Sauvegarder mon compte")}
    <div class="pricebox" style="--tint:#F7EAB4">${STAR}${ill("cle", "ill lg")}<p>Ton compte est lié à ce téléphone. Crée un <b>code de sauvegarde</b>&nbsp;: avec lui (ou avec ton lien personnel), tu retrouves tes listes sur n'importe quel autre appareil. Il marche aussi pour Déclic.</p></div>
    ${S.acct.hasCode ? `<p class="note">Tu as déjà un code. En créer un nouveau désactive l'ancien et ton ancien lien.</p>` : ""}
    <p class="err" id="bkErr"></p>
    <button class="btn wide" id="bkGo">${S.acct.hasCode ? "Créer un nouveau code" : "Créer mon code"}</button>`,
    () => {
      $("#bkGo").onclick = async () => {
        $("#bkGo").disabled = true;
        try {
          const code = await acc.createCode();
          S.acct.hasCode = true;
          saveJSON("courses:backupHintOff", true);
          showCode(code);
          render();
        } catch (e) {
          $("#bkErr").textContent = errText(e);
          $("#bkGo").disabled = false;
        }
      };
    },
  );
}
function showCode(code) {
  const url = loginUrl(code);
  openPanel(
    `${panelHead("Ton code de sauvegarde")}
    <div class="bigcode small" aria-label="Code de sauvegarde">${esc(code)}</div>
    <p class="hint">Note-le, fais une capture d'écran, ou envoie-toi ton lien personnel (dans tes notes, par message…). Sur un autre téléphone, il suffit d'ouvrir le lien, ou de choisir « J'ai déjà un compte » et de taper le code.</p>
    <p class="note">Garde-les pour toi&nbsp;: avec ce code ou ce lien, n'importe qui peut ouvrir ton compte. Ils ne seront plus affichés.</p>
    <div class="stack">
      <button class="btn wide" id="cdShare">M'envoyer mon lien personnel</button>
      <button class="btn ghost wide" id="cdCopy">Copier le code</button>
      <button class="link" data-close>C'est noté</button>
    </div>`,
    () => {
      $("#cdCopy").onclick = () => copy(code, "Code copié");
      $("#cdShare").onclick = async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: "Mon compte Take Out", text: "Mon lien pour ouvrir mon compte Take Out (à garder pour moi)", url });
            return;
          } catch (e) {
            if (e && e.name === "AbortError") return;
          }
        }
        copy(url, "Lien copié : colle-le dans tes notes");
      };
    },
  );
}

// Ouvrir un compte sauvegardé sur cet appareil, avec son code.
function openRecover() {
  const acc = S.store?.account;
  if (!acc) return;
  const risky = S.households.length && !S.acct.hasCode;
  openPanel(
    `<form id="rcForm" autocomplete="off">${panelHead("J'ai déjà un compte", true)}
    <div class="pricebox" style="--tint:#DCEAC8">${STAR}${ill("cle", "ill lg")}<p>Tape ton code de sauvegarde. Tu peux aussi simplement ouvrir le lien personnel que tu t'es envoyé.</p></div>
    <div class="field"><label for="rcCode">Code de sauvegarde</label>
      <input id="rcCode" class="code-in" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="24" placeholder="XXXX-XXXX-XXXX-XXXX"></div>
    ${risky ? `<p class="note">Attention : le compte actuel de cet appareil n'est pas sauvegardé. Ses listes resteront aux autres membres, mais plus à toi.</p>` : ""}
    <p class="err" id="rcErr"></p>
    <button class="btn wide" type="submit">Ouvrir mon compte</button></form>`,
    () => {
      setTimeout(() => $("#rcCode")?.focus(), 60);
      $("#rcForm").onsubmit = async (e) => {
        e.preventDefault();
        const btn = $("#rcForm button.btn[type=submit]");
        btn.disabled = true;
        try {
          await acc.login($("#rcCode").value);
          forgetLocal();
          toast("Compte retrouvé !");
          setTimeout(() => location.reload(), 600);
        } catch (err) {
          $("#rcErr").textContent = errText(err);
          btn.disabled = false;
        }
      };
    },
  );
}

// ---------- événements ----------
$("#app").addEventListener("submit", (e) => {
  if (e.target.id !== "quick") return;
  e.preventDefault();
  const input = $("#quickName");
  const raw = input.value.trim();
  if (!raw) return;
  input.value = "";
  // Produit ajouté : le clavier se range.
  input.blur();
  const { name, qty } = parseQuick(raw);
  quickAdd(name, qty);
  updateSuggest();
});
$("#app").addEventListener("click", (e) => {
  const t = (s) => e.target.closest(s);
  const byId = (id) => viewItems().find((i) => i.id === id);
  if (t("#fab")) {
    if (S.view === "us") openInvite(false);
    else {
      const n = $("#quickName")?.value.trim() || "";
      if ($("#quickName")) $("#quickName").value = "";
      openSheet(null, n);
    }
  } else if (t("[data-view]")) {
    const v = t("[data-view]").dataset.view;
    if (v === S.view) return window.scrollTo({ top: 0, behavior: "smooth" });
    setView(v);
    render();
    window.scrollTo(0, 0);
  } else if (t("[data-shop]")) {
    S.shop = t("[data-shop]").dataset.shop;
    render();
  } else if (t("[data-kf]")) {
    S.kfilter = t("[data-kf]").dataset.kf;
    render();
  } else if (t("[data-period]")) {
    S.period = t("[data-period]").dataset.period;
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
  } else if (t("[data-purchase]")) {
    const p = rows("purchases").find((x) => x.id === t("[data-purchase]").dataset.purchase);
    if (p) openExpense(p);
  } else if (t("[data-hh]")) {
    const id = t("[data-hh]").dataset.hh;
    if (id !== S.hid) selectHousehold(id);
  } else if (t("#addExpense")) openExpense(null);
  else if (t("#hhBtn")) openSwitch();
  else if (t("#meBtn")) {
    setView("us");
    render();
    window.scrollTo(0, 0);
  } else if (t("#inviteHint") || t("#uInvite")) openInvite(false);
  else if (t("#uText")) shareAsText(viewItems().filter((i) => !i.done));
  else if (t("#uNew")) openNewHousehold();
  else if (t("#uRename")) openRename();
  else if (t("#uLeave")) leaveHousehold();
  else if (t("#uMe") || t("#editMe")) openMe();
  else if (t("#uBackup")) openBackup();
  else if (t("#uLogin")) openRecover();
  else if (t("#uCatMode")) openCatMode();
  else if (t("#hintBackup")) openBackup();
  else if (t("#hintOff")) {
    saveJSON("courses:backupHintOff", true);
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
    const [items, purchases] = await Promise.all([S.store.items(S.hid), S.store.purchases(S.hid)]);
    S.data.items = new Map(items.map((r) => [r.id, r]));
    S.data.purchases = new Map(purchases.map((r) => [r.id, r]));
    // Les articles ajoutés par les autres enrichissent aussi les suggestions de cet appareil.
    const memo = loadJSON("courses:memo", {});
    for (const r of items) if (!memo[norm(r.name)]) remember(r);
    cacheHousehold();
    render();
  } catch (e) {
    if (e.code !== "network") toast(errText(e));
  }
}
async function loadAccount() {
  if (!S.store?.account) return;
  try {
    S.acct = await S.store.account.status();
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
    onItem(tbl, type, row) {
      if (type === "DELETE") S.data[tbl].delete(row.id);
      else if (row.household === S.hid) S.data[tbl].set(row.id, row);
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
  for (const k of Object.keys(localStorage)) if (k.startsWith("courses:") && !["courses:memo", "courses:join", "courses:login"].includes(k)) localStorage.removeItem(k);
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
    Object.assign(S, { me: null, households: [], hid: null, queue: [], members: [] });
    S.data = { items: new Map(), purchases: new Map() };
  }
  S.uid = S.store.uid;
  saveJSON("courses:uid", S.uid);
  // Lien personnel ouvert (#compte=…) : on ouvre le compte sauvegardé sur cet appareil.
  const linkCode = loadJSON("courses:login", null);
  if (linkCode) {
    localStorage.removeItem("courses:login");
    if (!S.me || confirm("Ouvrir ton compte sauvegardé sur cet appareil ? Le compte actuel de cet appareil sera remplacé.")) {
      try {
        await S.store.account.login(linkCode);
        forgetLocal();
        location.replace(location.pathname + location.search);
        return;
      } catch (e) {
        toast(errText(e));
      }
    }
  }
  loadAccount();
  try {
    const p = await S.store.getProfile();
    if (!p) {
      // Première ouverture : « C'est pour qui ? », sauf si on arrive par un lien d'invitation.
      S.screen = loadJSON("courses:join", null) ? "profile" : "welcome";
      render();
      return;
    }
    S.me = { name: p.name, emoji: p.emoji, avatar: p.avatar || "" };
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
  const acct = (hash.get("compte") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (acct.length === 16) {
    saveJSON("courses:login", acct);
    history.replaceState(null, "", location.pathname + location.search);
  }
  setView(S.view);
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
