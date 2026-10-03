// Lecture d'une recette, gratuite et sur le téléphone :
// 1. lireImages() reconnaît le texte des photos avec Tesseract (bibliothèque libre, exécutée dans le navigateur) ;
// 2. lireTexte() découpe ce texte (ou un texte collé) en nom, personnes, temps, ingrédients et étapes,
//    et relie chaque ingrédient aux aliments que Popote connaît déjà.
// Rien n'est envoyé à un serveur, et il n'y a aucune clé ni aucun compte à créer.

const TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js";

// ---------- texte des photos ----------

let workerP = null;
let onProgress = null;
function worker() {
  if (!workerP)
    workerP = (async () => {
      const { default: T } = await import(TESSERACT);
      return T.createWorker("fra", 1, { logger: (m) => onProgress && onProgress(m) });
    })().catch((e) => {
      workerP = null;
      throw e;
    });
  return workerP;
}
// Photo agrandie ou réduite à une taille que Tesseract lit bien, en niveaux de gris.
function prepare(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const big = Math.max(img.naturalWidth, img.naturalHeight);
      const k = big > 2400 ? 2400 / big : big < 1200 ? 1200 / big : 1;
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext("2d");
      g.filter = "grayscale(1) contrast(1.25)";
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Object.assign(new Error("image"), { code: "image" }));
    };
    img.src = url;
  });
}
// progress(étape, fraction) : « load » pendant le premier téléchargement, puis « read » photo par photo.
export async function lireImages(files, progress) {
  const list = [...files];
  let i = 0;
  onProgress = (m) => {
    if (!progress) return;
    if (m.status === "recognizing text") progress("read", (i + (m.progress || 0)) / list.length);
    else if (/load|initializ/i.test(m.status || "")) progress("load", m.progress || 0);
  };
  const w = await worker();
  const texts = [];
  for (; i < list.length; i++) {
    const canvas = await prepare(list[i]);
    const { data } = await w.recognize(canvas);
    texts.push(data.text || "");
  }
  onProgress = null;
  return texts.join("\n");
}

// ---------- texte → recette ----------

export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const STOP = new Set(
  "de du des la le les l d un une et en au aux a pour ou avec sans boite boites conserve frais fraiche fraiches fraichement surgele surgeles bouquet pot paquet piece pieces brin brins botte gousse gousses tranche tranches cuite cuites cuit cuits environ gros grosse grosses moyen moyens moyenne moyennes beau belle belles bien bon bonne extra fin fine fines finement hache hachee hachees emince emincee emincees coupe coupee coupes coupees rape rapee rapes rapees bio entier entiere entiers entieres sec seche seches nature demi ecreme ecremee filet filets pave paves dos fume fumee fumes fumees".split(
    " ",
  ),
);
// Mots du nom qui comptent pour reconnaître un aliment (au singulier, sans accents ni mots outils).
function words(s, keepStop) {
  return norm(s)
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !/^\d+$/.test(w) && (keepStop || !STOP.has(w)))
    .map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w));
}

const NUMWORDS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, demi: 0.5, demie: 0.5 };
const FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
// Unités : g ou ml équivalents, ou « count » (on compte des pièces), « box » (boîte), « pack » (paquet, sachet…).
const UNITS = [
  [/^(kilo(gramme)?s?|kg)\b\.?/, { g: 1000 }],
  [/^(grammes?|gr|g)\b\.?/, { g: 1 }],
  [/^mg\b/, { g: 0.001 }],
  [/^(litres?|l)\b\.?/, { ml: 1000 }],
  [/^dl\b/, { ml: 100 }],
  [/^cl\b/, { ml: 10 }],
  [/^ml\b/, { ml: 1 }],
  [/^([c€eé©](uill?(e|è)res?|uil|\.)?\.?\s*(a|à)\s*s(oupe)?\.?|c\.?a\.?s\.?|c\.?s\.?|càs)(?=\s|$|\b)/, { ml: 15, gs: 8, spoon: 1 }],
  [/^([c€eé©](uill?(e|è)res?|uil|\.)?\.?\s*(a|à)\s*c(af(e|é))?\.?|c\.?a\.?c\.?|c\.?c\.?|càc)(?=\s|$|\b)/, { ml: 5, gs: 3, spoon: 1 }],
  [/^pinc(e|é)es?\b/, { g: 1 }],
  [/^(verres?)\b/, { ml: 150 }],
  [/^(tasses?)\b/, { ml: 200 }],
  [/^(bols?)\b/, { ml: 300 }],
  [/^noix\b(?=\s+de\s+beurre)/, { g: 10 }],
  [/^(bo(i|î)tes?|conserves?)\b/, { box: 1 }],
  [/^(sachets?|paquets?|briques?|pots?|barquettes?|rouleaux?|pâtes?)\b(?=\s+(de|d'))/, { pack: 1 }],
  [/^(gousses?|tranches?|feuilles?|brins?|branches?|bouquets?|bottes?|poign(e|é)es?|morceaux?|cubes?|tiges?|t(e|ê)tes?|pav(e|é)s?|filets?|blancs?|escalopes?)\b/, { count: 1 }],
];
// Poids moyen d'une pièce, pour « 2 oignons » quand l'aliment se compte en grammes.
const PIECE_G = {
  oignon: 100, carotte: 100, courgette: 250, tomate: 120, pdt: 150, champi: 20, aubergine: 300, echalote: 30, poireau: 200, patdouce: 300,
  brocoli: 400, butternut: 1200, endive: 120, poulet: 150, saumon: 125, cabillaud: 150, saucisse: 100, merguez: 60, dinde: 130, porc: 150,
  boeuf: 125, steak: 125, betterave: 150, chou_fleur: 800, concombre: 300, gingembre: 20, tomcerise: 15,
};
const SKIP = /^(sel|poivre|sel et poivre|sel poivre|eau|de l'eau|eau froide|eau chaude|eau tiede|glacons?)$/;

const AISLE_WORDS = [
  ["Boucherie & poisson", "poulet boeuf porc veau agneau dinde canard lardon jambon saucisse saucisson chorizo merguez steak viande bacon lapin saumon cabillaud thon crevette poisson colin merlu moule truite maquereau sardine dorade escalope"],
  ["Crèmerie & frais", "lait creme beurre fromage yaourt oeuf mozzarella feta chevre parmesan ricotta mascarpone gruyere comte emmental tofu brisee feuilletee sablee reblochon raclette cheddar"],
  ["Surgelés", "surgele glace"],
  ["Boulangerie", "pain baguette brioche"],
  ["Fruits & légumes", "ail oignon echalote carotte courgette tomate poivron aubergine poireau salade epinard chou brocoli champignon pomme poire banane citron orange fraise framboise avocat concombre radis navet betterave celeri fenouil courge potiron patate haricot pois persil coriandre basilic menthe ciboulette thym laurier romarin gingembre mangue ananas kiwi raisin abricot peche prune cerise roquette mache endive butternut myrtille"],
];
const PANTRY = new Set("huile vinaigre epice sucre farine levure moutarde sauce bouillon cumin paprika curry cannelle muscade herbe origan vanille miel maizena fecule bicarbonate".split(" "));
const PRICE_KG = { "Fruits & légumes": 3, "Boucherie & poisson": 15, "Crèmerie & frais": 9, Épicerie: 5, Surgelés: 7, Boulangerie: 4 };
const PRICE_PC = { "Fruits & légumes": 1, "Boucherie & poisson": 4, "Crèmerie & frais": 2, Épicerie: 2, Surgelés: 3, Boulangerie: 1.5 };

const MEAT = /\b(poulet|boeuf|porc|veau|agneau|dinde|canard|lardons?|jambon|saucisses?|saucisson|chorizo|merguez|steak|viande|bacon|lapin|escalope|filet mignon)\b/;
const FISH = /\b(saumon|cabillaud|thon|crevettes?|poissons?|colin|merlu|moules?|truite|maquereau|sardines?|dorade|fruits de mer|calamars?|noix de saint-jacques)\b/;
const EMOJI = [
  [/soupe|veloute|potage|bouillon/, "🥣"], [/salade|taboule|bowl/, "🥗"], [/pates|spaghetti|lasagne|tagliatelle|penne|macaroni|gnocchi|ravioli/, "🍝"],
  [/risotto|riz|paella/, "🍚"], [/curry|dahl|dal\b|tajine|couscous/, "🍛"], [/tarte|quiche|tourte/, "🥧"], [/gateau|cake|moelleux|brownie|cookie|muffin/, "🍰"],
  [/pizza/, "🍕"], [/burger/, "🍔"], [/gratin|tartiflette|raclette|fondue/, "🧀"], [/crepe|galette|pancake/, "🥞"], [/omelette|oeuf/, "🍳"],
  [/poulet|dinde/, "🍗"], [/saumon|poisson|cabillaud|thon|sardine/, "🐟"], [/crevette/, "🍤"], [/boeuf|steak|porc|veau|agneau/, "🥩"],
  [/wrap|burrito|tacos|fajita|quesadilla/, "🌯"], [/nouilles|ramen|pad thai|wok/, "🍜"], [/chili|haricot/, "🌶️"], [/legume|ratatouille|poelee/, "🥘"],
];
const UTENSILS = [
  [/casserole/, "Casserole"], [/poele/, "Poêle"], [/saladier/, "Saladier"], [/plat a gratin|plat allant au four|plat/, "Plat à gratin"],
  [/cocotte/, "Cocotte"], [/faitout|marmite/, "Faitout"], [/moule/, "Moule"], [/wok/, "Wok"], [/sauteuse/, "Sauteuse"], [/plaque/, "Plaque à rôtir"],
];

const toNum = (s) => {
  if (s == null) return null;
  s = String(s).trim();
  if (FRAC[s] != null) return FRAC[s];
  const m = s.match(/^(\d+)\s*([½¼¾⅓⅔])$/);
  if (m) return +m[1] + FRAC[m[2]];
  if (/^\d+\s*\/\s*\d+$/.test(s)) {
    const [a, b] = s.split("/").map(Number);
    return b ? a / b : null;
  }
  if (NUMWORDS[norm(s)] != null) return NUMWORDS[norm(s)];
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : null;
};
const QTY = /^(\d+\s*[½¼¾⅓⅔]|\d+(?:[.,]\d+)?\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔]|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|demie?)(?=[\s\-a-zA-Zàâçéèêëîïôûùüÿœ'’(]|$)(?:\s*(?:à|a|-|–|ou)\s*\d+(?:[.,]\d+)?)?/i;

// Une ligne d'ingrédient → {raw, qty, unit, name}. unit : {g}|{ml}|{count}|{box}|{pack}|null.
export function parseLine(line) {
  let s = line
    .replace(/^[\s•·*▪●○◦‣⁃\-–—>+»«~=]+/, "")
    .replace(/[\s.;,]+$/, "")
    .trim();
  const raw = s;
  let qty = null;
  let unit = null;
  let m = s.match(QTY);
  if (m) {
    qty = toNum(m[1]);
    s = s.slice(m[0].length).trim();
  }
  // Quantité à la fin : « Oignons : 2 », « Lait (50 cl) », « Farine 200 g ».
  if (qty == null) {
    const e = s.match(/[\s:(–-]+(\d+(?:[.,]\d+)?)\s*(kg|g|gr|mg|cl|ml|dl|l)?\.?\)?$/i);
    if (e) {
      qty = toNum(e[1]);
      s = (s.slice(0, e.index) + (e[2] ? " " : "")).trim();
      if (e[2]) unit = UNITS.find(([re]) => re.test(e[2].toLowerCase()))?.[1] || null;
    }
  }
  if (!unit) {
    const low = s.toLowerCase();
    for (const [re, u] of UNITS) {
      const um = low.match(re);
      if (um) {
        unit = u;
        if (u.count) unit = { count: 1, word: norm(um[0]) };
        s = s.slice(um[0].length).trim();
        break;
      }
    }
  }
  // « 200 g de farine », « 2 c. à soupe d'huile » : on enlève le « de ».
  s = s.replace(/^(de\s+la\s+|de\s+l['’]\s*|de\s+|d['’]\s*|des\s+|du\s+)/i, "").trim();
  // Précisions entre parenthèses ou après une virgule : « tomates (bien mûres) », « beurre, mou ».
  const name = s.replace(/\([^)]*\)/g, " ").split(/,|;| pour | ou /)[0].replace(/\s+/g, " ").trim();
  return { raw, qty, unit, name };
}

// Aliment du catalogue le plus proche, ou null.
function match(name, catalog) {
  const iw = words(name);
  if (!iw.length) return null;
  const set = new Set(iw);
  let best = null;
  let bs = 0;
  let bh = 0;
  for (const c of catalog) {
    const cw = c.w || (c.w = words(c.n));
    if (!cw.length) continue;
    let got = 0;
    let tot = 0;
    let hits = 0;
    cw.forEach((w, j) => {
      const wt = j === 0 ? 2 : 1;
      tot += wt;
      if (set.has(w)) {
        got += wt;
        hits++;
      }
    });
    if (!hits) continue;
    const extra = iw.filter((w) => !cw.includes(w)).length;
    // « pois cassés » n'est pas « pois chiches » : des mots différents des deux côtés, ce n'est pas le même aliment.
    if (extra && hits < cw.length) continue;
    const sc = got / tot - 0.05 * extra;
    if (sc > bs + 1e-9 || (Math.abs(sc - bs) < 1e-9 && hits > bh)) {
      best = c;
      bs = sc;
      bh = hits;
    }
  }
  return bs >= 0.5 ? best : null;
}

const aisleOf = (name) => {
  const ws = new Set(words(name, true));
  for (const [a, list] of AISLE_WORDS) if (list.split(" ").some((w) => ws.has(w))) return a;
  return "Épicerie";
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const slug = (s) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36) || "aliment";
const round = (x) => (x >= 10 ? Math.round(x) : Math.round(x * 100) / 100);

// Une ligne lue → ingrédient de Popote : {raw, id, qty (pour toute la recette), u, n, isNew, ing}
export function toItem(line, catalog) {
  const p = parseLine(line);
  if (!p.name || SKIP.test(norm(p.name)) || !/[a-zà-ÿ]{2}/i.test(p.name)) return null;
  const c = match(p.name, catalog);
  const u = p.unit || {};
  if (c) {
    let q;
    if (c.u === "g" || c.u === "ml") {
      if (u.spoon) q = (p.qty ?? 1) * (c.u === "g" ? u.gs : u.ml);
      else if (u.g || u.ml) q = (p.qty ?? 1) * (u.g || u.ml);
      else if (u.box) q = (p.qty ?? 1) * (/bo(i|î)te/i.test(c.n) ? c.q : 400);
      else if (u.pack) q = (p.qty ?? 1) * c.q;
      else if (p.qty != null) q = p.qty * (PIECE_G[c.id] || 100);
      else q = c.pl ? 10 : 50;
    } else {
      // Aliment compté (pièce, gousse, tranche, cube) : « 2 gousses », « 1 boîte » → 2, 1.
      if (u.g || u.ml) q = u.spoon ? (p.qty ?? 1) * 0.5 : Math.max(0.25, ((p.qty ?? 1) * (u.g || u.ml)) / 100);
      else q = p.qty ?? 1;
    }
    return { raw: p.raw, id: c.id, qty: round(q), u: c.u, n: c.n, isNew: false };
  }
  // Aliment inconnu : ajouté au référentiel avec un conditionnement et un prix estimés.
  const a = aisleOf(p.name);
  const pl = words(p.name, true).some((w) => PANTRY.has(w));
  let unit;
  let q;
  if (u.g || u.spoon) {
    unit = "g";
    q = (p.qty ?? 1) * (u.g || u.gs);
  } else if (u.ml) {
    unit = "ml";
    q = (p.qty ?? 1) * u.ml;
  } else if (u.box) {
    unit = "g";
    q = (p.qty ?? 1) * 400;
  } else {
    unit = "pièce";
    q = p.qty ?? 1;
  }
  const pack = unit === "pièce" ? 1 : u.box ? 400 : 500;
  const price = unit === "pièce" ? PRICE_PC[a] : (PRICE_KG[a] * pack) / 1000;
  const n = cap(p.name.replace(/\s+/g, " ").slice(0, 50));
  const id = "x_" + slug(n);
  return { raw: p.raw, id, qty: round(q), u: unit, n, isNew: true, ing: { n, a, q: pack, u: unit, p: Math.round(price * 100) / 100, ...(pl ? { pl: 1 } : {}) } };
}

function minutes(s) {
  const t = norm(s);
  let total = 0;
  let found = false;
  const read = (frag) => {
    const h = frag.match(/(\d+)\s*h(?:eures?)?\s*(\d+)?/);
    if (h) return +h[1] * 60 + (+h[2] || 0);
    const m = frag.match(/(\d+)\s*(?:min|mn|minutes?)\b/);
    return m ? +m[1] : null;
  };
  const tot = t.match(/temps total\s*:?\s*([^\n]{0,20})/);
  if (tot && read(tot[1]) != null) return read(tot[1]);
  for (const k of ["(?:preparation|prep)", "cuisson"]) {
    const m = t.match(new RegExp(k + "\\s*:?\\s*([^\\n]{0,20})"));
    if (m && read(m[1]) != null) {
      total += read(m[1]);
      found = true;
    }
  }
  if (found) return total;
  const any = t.match(/(\d+)\s*(?:min|mn|minutes)\b/);
  return any ? +any[1] : null;
}

const ING_HEAD = /^\s*(les\s+)?ingr(e|é)dients?\b/i;
const STEP_HEAD = /^\s*(la\s+)?(pr(e|é)paration|(e|é)tapes?|instructions?|recette|d(e|é)roulement|m(e|é)thode|r(e|é)alisation|pr(e|é)parer)\s*:?\s*$/i;
const STEP_START = /^\s*(\d{1,2}\s*[.)\-–:]|(e|é)tape\s*\d+\s*[:.)–-]?|[•·*▪●\-–—])\s*/i;
const looksIngredient = (l) => l.length <= 70 && (QTY.test(l.replace(/^[\s•·*▪●\-–—»«]+/, "")) || /^[\s•·*▪●\-–—»«]/.test(l));
// Ligne courte sans point final juste après des ingrédients (« Parmesan ») : sans doute un ingrédient sans quantité.
const shortItem = (l) => l.length <= 40 && !/[.!?:]$/.test(l) && !STEP_HEAD.test(l) && !STEP_START.test(l);

// Texte complet → brouillon de recette (quantités pour toute la recette ; servings = nombre de personnes lu, ou null).
export function lireTexte(text, catalog) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && /[a-zà-ÿ0-9]/i.test(l));
  const all = lines.join("\n");
  const sm =
    norm(all).match(/pour\s+(\d+)\s*(?:a\s*\d+\s*)?(personnes?|pers\b|parts?|portions?|couverts?)/) ||
    norm(all).match(/(\d+)\s*(personnes|pers\b|parts|portions|couverts)/) ||
    norm(all).match(/(?:personnes|portions|parts|couverts)\s*:?\s*(\d+)/);
  const servings = sm ? Math.max(1, Math.min(20, +sm[1])) : null;
  const meta = (l) => /(\d+\s*(personnes|pers\b|parts|portions|couverts))|(pr(e|é)paration|cuisson|repos|temps)\s*:?\s*\d/i.test(norm(l));

  // Sections.
  let iStart = lines.findIndex((l) => ING_HEAD.test(l));
  let sStart = lines.findIndex((l, j) => j > iStart && STEP_HEAD.test(l));
  let ingLines;
  let stepLines;
  if (iStart >= 0) {
    const end = sStart > iStart ? sStart : lines.findIndex((l, j) => j > iStart && l.length > 70 && !looksIngredient(l));
    ingLines = lines.slice(iStart + 1, end > 0 ? end : lines.length).map((l) => l.replace(ING_HEAD, "").replace(/^\s*:\s*/, "")).filter(Boolean);
    stepLines = end > 0 ? lines.slice(sStart > iStart ? sStart + 1 : end) : [];
  } else {
    // Sans titre « Ingrédients » : le premier bloc de lignes courtes avec une quantité.
    const first = lines.findIndex((l) => looksIngredient(l) && !meta(l));
    let last = first;
    while (first >= 0 && last + 1 < lines.length && (looksIngredient(lines[last + 1]) || shortItem(lines[last + 1])) && !STEP_HEAD.test(lines[last + 1]) && !meta(lines[last + 1])) last++;
    ingLines = first >= 0 ? lines.slice(first, last + 1) : [];
    iStart = first;
    if (sStart < 0) sStart = lines.findIndex((l) => STEP_HEAD.test(l));
    stepLines = sStart >= 0 ? lines.slice(sStart + 1) : first >= 0 ? lines.slice(last + 1) : lines.slice(1);
  }
  stepLines = stepLines.filter((l) => !meta(l) && !ING_HEAD.test(l) && !STEP_HEAD.test(l));

  // Nom : la première ligne parlante avant les ingrédients.
  const before = lines.slice(0, iStart > 0 ? iStart : Math.min(3, lines.length));
  let n = before.find((l) => !meta(l) && /[a-zà-ÿ]{3}/i.test(l) && l.length <= 70 && !looksIngredient(l)) || "";
  if (n && n === n.toUpperCase()) n = n.toLowerCase();
  n = cap(n.replace(/[.:]+$/, ""));

  // Ingrédients (les doublons sont additionnés).
  const items = [];
  for (const l of ingLines) {
    if (/^\s*(pour\s+la|pour\s+le|pour\s+les)\b.*:\s*$/i.test(l)) continue; // « Pour la sauce : »
    const it = toItem(l, catalog);
    if (!it) continue;
    const prev = items.find((x) => x.id === it.id);
    if (prev) prev.qty = round(prev.qty + it.qty);
    else items.push(it);
  }

  // Étapes : une nouvelle étape commence par un numéro ou une puce ; les lignes coupées sont recollées.
  const steps = [];
  for (const l of stepLines) {
    const starts = STEP_START.test(l);
    const t = l.replace(STEP_START, "").trim();
    if (!t) continue;
    const prev = steps[steps.length - 1];
    if (!prev || starts || /[.!]$/.test(prev)) steps.push(t);
    else steps[steps.length - 1] = prev.endsWith("-") && /^[a-zà-ÿ]/.test(t) ? prev.slice(0, -1) + t : prev + " " + t;
  }
  const s = steps.map((x) => cap(x)).filter((x) => x.length > 3);

  const blob = norm(n + " " + items.map((x) => x.n + " " + x.raw).join(" "));
  const how = norm(s.join(" "));
  const eq = [];
  if (/\bfour\b|prechauff|enfourn|gratiner/.test(how)) eq.push(["four"]);
  if (/\bfeu\b|poele|casserole|cocotte|\b(faire|faites|fais) (revenir|dorer|cuire|fondre|bouillir|sauter|chauffer)|\bchauffez|bouillir|ebullition|mijoter|sauteuse|wok|faitout/.test(how)) eq.push(["plaques"]);
  if (/mixe|blender|robot/.test(how)) eq.push(["mixeur"]);
  if (/micro-?onde/.test(how) && !eq.length) eq.push(["microondes"]);
  return {
    n: n || "Recette maison",
    e: (EMOJI.find(([re]) => re.test(norm(n))) || EMOJI.find(([re]) => re.test(blob)) || [0, "🍽️"])[1],
    t: minutes(all) || 30,
    m: MEAT.test(blob) ? "v" : FISH.test(blob) ? "p" : "g",
    servings,
    items,
    s,
    eq,
    us: [...new Set(UTENSILS.filter(([re]) => re.test(how)).map(([, u]) => u))].slice(0, 5),
  };
}
