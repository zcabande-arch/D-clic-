// Livre PDF « Bouge avec ton cycle : le guide des exercices Phase Gym ».
// Usage : node vente/outils/livre.mjs <adresse de l'app> <fichier.pdf>
//   ex. : python3 -m http.server 8766 --directory docs   puis   node vente/outils/livre.mjs http://localhost:8766/phase/ vente/prive/livre.pdf
// Les dessins sont repris de l'app ; la couverture et le corps sont assemblés avec pypdf (python3 -m pip install pypdf).
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { PHASES, MOODS, CYCLE, MOOD_GUIDE, ZONES, EXOS, SOURCES } from "./livre-donnees.mjs";
const require = createRequire(import.meta.url);
const pw = (() => { try { return require("playwright"); } catch (e) { return require("/opt/node22/lib/node_modules/playwright"); } })();
const [APP, OUT] = process.argv.slice(2);
if (!APP || !OUT) { console.error("Usage : node vente/outils/livre.mjs <adresse de l'app> <fichier.pdf>"); process.exit(1); }
const HERE = path.dirname(new URL(import.meta.url).pathname);
const EXDIR = path.resolve(HERE, "../../docs/phase/ex");
const LOGO = "file://" + path.resolve(HERE, "../../docs/phase/icons/icon-512.png");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const b = await pw.chromium.launch();

/* 1. Dessins : on les prend dans la liste « Noter ma séance » de l'app (mode exemple). */
const p0 = await b.newPage({ viewport: { width: 390, height: 844 } });
await p0.goto(APP + "?demo"); await p0.waitForTimeout(600);
await p0.click("[data-act=log-start]"); await p0.click("[data-act=log-pick]"); await p0.waitForTimeout(400);
const ILL = Object.fromEntries((await p0.$$eval(".pickrow", (rows) => rows.map((r) => [r.querySelector("b").textContent, r.querySelector(".ill:not(.noimg)")?.innerHTML || ""])))
  .map(([n, h]) => [n, h.replace(/src="ex\/([^"]+)"/g, (m, f) => `src="file://${EXDIR}/${f}"`).replace(/ loading="lazy"/g, "")]));
await p0.close();
const ill = (name) => ILL[name] || "";
const missing = EXOS.filter((e) => !ILL[e.v]).map((e) => e.v);
if (missing.length) console.warn("Sans dessin :", missing.join(", "));

/* 2. Petits éléments graphiques */
const LEVEL = ["À éviter si inconfort", "En douceur", "Idéal"];
const dots = (p, big) => `<div class="dots${big ? " big" : ""}">${PHASES.map((ph, i) => `<span class="d l${p[i]}" style="--c:${ph.c}" title="${ph.n}"><i></i>${big ? `<b>${ph.n}</b><em>${LEVEL[p[i]]}</em>` : ""}</span>`).join("")}</div>`;
const moodChip = (k) => `<span class="mood" style="--c:${MOODS[k].c}">${MOODS[k].e} ${MOODS[k].n}</span>`;
function hormoneChart(L = 28, day = null) {
  const ov = L - 14, g = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  const E = [], P = [];
  for (let d = 1; d <= L; d++) { E.push(.12 + .82 * (d <= ov - 1 ? g(d, ov - 1, Math.max(3, (ov - 1) / 2.6)) : g(d, ov - 1, 1.3)) + .42 * g(d, ov + 7, 3.2)); P.push(.05 + .9 * g(d, ov + 7, 3.3)); }
  const W = 640, top = 16, bot = 190, x = (d) => 20 + (d - 1) * (W - 40) / (L - 1), y = (v) => bot - v * (bot - top);
  const path = (a) => a.map((v, i) => (i ? "L" : "M") + x(i + 1).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const key = (d) => (d <= 5 ? 0 : d < ov - 1 ? 1 : d <= ov + 1 ? 2 : 3);
  let bands = ""; for (let d = 1; d <= L; d++) { const w = (W - 40) / (L - 1); bands += `<rect x="${(x(d) - w / 2).toFixed(1)}" y="200" width="${(w + .5).toFixed(1)}" height="12" fill="${PHASES[key(d)].c}"/>`; }
  return `<svg viewBox="0 0 ${W} 240" class="chart"><line x1="20" y1="${bot}" x2="${W - 20}" y2="${bot}" stroke="#ccc"/>
    <path d="${path(E)}" fill="none" stroke="#E3197C" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="${path(P)}" fill="none" stroke="#3D58E0" stroke-width="3.2" stroke-dasharray="8 6" stroke-linejoin="round"/>${bands}
    <text x="20" y="232">J1</text><text x="${x(5)}" y="232" text-anchor="middle">J5</text><text x="${x(ov)}" y="232" text-anchor="middle">ovulation (J${ov})</text><text x="${W - 20}" y="232" text-anchor="end">J${L}</text></svg>
    <div class="legend"><span><i style="background:#E3197C"></i>Œstrogènes</span><span><i style="background:repeating-linear-gradient(90deg,#3D58E0 0 6px,transparent 6px 10px)"></i>Progestérone</span><span class="muted">Courbe moyenne d'un cycle de ${L} jours</span></div>`;
}

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Doto:wght@700;900&family=Geist:wght@300..600&display=swap");
@page{size:A4;margin:16mm 15mm 18mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Geist,system-ui,sans-serif;color:#151517;font-size:10.5pt;line-height:1.45;-webkit-font-smoothing:antialiased}
h1{font-size:30pt;line-height:1.02;font-weight:500;letter-spacing:-.03em}
h2{font-size:19pt;line-height:1.1;font-weight:500;letter-spacing:-.02em}
h3{font-size:13pt;font-weight:500;letter-spacing:-.01em}
.muted{color:#6b6b72}
.kick{font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:#8a8a90}
.dot9{font-family:Doto,monospace;font-weight:900}
section{break-before:page}
.part{height:255mm;display:flex;flex-direction:column;justify-content:flex-end;gap:5mm;padding:12mm;border-radius:8mm;color:#fff;background:radial-gradient(60% 50% at 80% 25%,rgba(227,25,124,.75),transparent 70%),radial-gradient(50% 45% at 15% 85%,rgba(61,88,224,.6),transparent 70%),#0b0b0c}
.part .n{font-family:Doto,monospace;font-weight:900;font-size:64pt;line-height:.9;color:#E4F25C}
.part p{font-size:12pt;max-width:140mm;color:rgba(255,255,255,.85)}
.box{border-radius:5mm;padding:5mm 6mm;background:#f5f3ef;break-inside:avoid}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
.stack{display:flex;flex-direction:column;gap:4mm}
ul.plain{list-style:none;display:flex;flex-direction:column;gap:2.2mm}
ol{padding-left:5mm;display:flex;flex-direction:column;gap:1.4mm}
/* pastilles de phase : pleine = idéal, moitié = en douceur, vide = à éviter si inconfort */
.dots{display:flex;gap:2mm;align-items:center}
.d{display:inline-flex;align-items:center;gap:1.6mm}
.d i{width:4.2mm;height:4.2mm;border-radius:50%;border:.5mm solid var(--c);display:inline-block}
.d.l2 i{background:var(--c)}
.d.l1 i{background:linear-gradient(90deg,var(--c) 50%,transparent 50%)}
.dots.big{gap:4mm;flex-wrap:wrap}
.dots.big .d{flex-direction:column;align-items:flex-start;gap:.6mm;min-width:36mm}
.dots.big .d i{width:6mm;height:6mm}
.dots.big b{font-weight:500;font-size:9.5pt;color:var(--c)}
.dots.big em{font-style:normal;font-size:8.5pt;color:#555}
.mood{display:inline-flex;align-items:center;gap:1mm;border:.35mm solid var(--c);color:var(--c);border-radius:99px;padding:.6mm 2.4mm;font-size:8.3pt;white-space:nowrap}
.moods{display:flex;flex-wrap:wrap;gap:1.5mm}
/* fiches d'exercice */
.zone{display:flex;align-items:center;gap:4mm;padding:5mm 6mm;border-radius:5mm;background:#0b0b0c;color:#fff;margin-bottom:5mm;break-after:avoid}
.zone .dot9{font-size:22pt;color:#E4F25C}
.ex{display:grid;grid-template-columns:52mm 1fr;gap:5mm;padding:5mm 0;border-top:.3mm solid #e2dfd8;break-inside:avoid}
.ex:first-of-type{border-top:0}
.pic{width:52mm;aspect-ratio:5/4;border-radius:4mm;overflow:hidden;background:#F2F0EB}
.pic img,.pic svg{width:100%;height:100%;display:block;object-fit:cover}
.pic.dark{background:#1b191b}
.pic.none{display:grid;place-items:center;font-size:24pt;color:#bbb}
.ex h3{margin-bottom:.6mm}
.ex .meta{font-size:8.8pt;color:#6b6b72;margin-bottom:2mm}
.ex ol{font-size:9.4pt}
.ex .tip{font-size:8.8pt;margin-top:1.6mm}
.ex .tip b{font-weight:500}
.ex .foot{display:flex;flex-wrap:wrap;gap:2.5mm 4mm;align-items:center;margin-top:2.4mm}
/* phases */
.phead{border-radius:6mm;padding:7mm;color:#fff;display:flex;flex-direction:column;gap:2mm}
.phead .j{opacity:.85;font-size:10pt}
.hl{border-left:1mm solid var(--c);padding-left:4mm}
table{width:100%;border-collapse:collapse;font-size:9pt}
th,td{padding:1.6mm 2mm;border-bottom:.25mm solid #e2dfd8;text-align:left;vertical-align:middle}
th{font-weight:500;font-size:8.3pt;color:#6b6b72}
tr{break-inside:avoid}
.chart{width:100%;height:auto}
.chart text{font-size:12px;fill:#777;font-family:Geist,sans-serif}
.legend{display:flex;gap:6mm;font-size:8.8pt;margin-top:1mm}
.legend span{display:inline-flex;align-items:center;gap:2mm}
.legend i{width:8mm;height:1.2mm;border-radius:1mm;display:inline-block}
.toc li{display:flex;justify-content:space-between;border-bottom:.25mm dotted #ccc;padding:2mm 0;font-size:11pt}
`;

/* 3. Pages */
const parts = [];
// Sommaire + mode d'emploi
parts.push(`<section style="break-before:auto"><div class="stack" style="gap:7mm">
  <h1>Sommaire</h1>
  <ul class="plain toc"><li><span>Comment lire ce livre</span><span>le code couleur</span></li>
  <li><span>1. Ton cycle, phase par phase</span><span>hormones, ressenti, salle</span></li>
  <li><span>2. Que faire selon ton humeur</span><span>6 humeurs</span></li>
  <li><span>3. Les exercices</span><span>${EXOS.length} fiches illustrées</span></li>
  <li><span>4. Le récap en un coup d'œil</span><span>tableau couleur</span></li>
  <li><span>Bon à savoir</span><span>santé, sources</span></li></ul>
  <h2 style="margin-top:6mm">Comment lire ce livre</h2>
  <p>Chaque exercice porte quatre pastilles, une par phase du cycle, et des étiquettes d'humeur. Elles te disent d'un coup d'œil s'il est fait pour toi aujourd'hui.</p>
  <div class="box stack"><span class="kick">Les 4 phases</span>
    <div class="grid2">${PHASES.map((ph) => `<div class="hl" style="--c:${ph.c}"><b style="color:${ph.c};font-weight:500">${ph.long}</b><br><span class="muted">${ph.j}</span></div>`).join("")}</div></div>
  <div class="box stack"><span class="kick">Les pastilles</span>
    <div class="dots big">${[2, 1, 0].map((l) => `<span class="d l${l}" style="--c:#151517;min-width:50mm"><i></i><b style="color:#151517">${LEVEL[l]}</b><em>${["Fonce, c'est le bon moment.", "Possible : charges plus légères, plus de repos, écoute-toi.", "Si tu as mal ou si tu es épuisée, choisis un autre exercice."][2 - l]}</em></span>`).join("")}</div>
    <p class="muted" style="font-size:9pt">Exemple : ${dots([1, 2, 2, 1])} = en douceur pendant les règles, idéal en folliculaire et à l'ovulation, en douceur en phase lutéale.</p></div>
  <div class="box stack"><span class="kick">Les humeurs</span><div class="moods">${Object.keys(MOODS).map(moodChip).join("")}</div>
    <p class="muted" style="font-size:9pt">Une étiquette d'humeur sur un exercice veut dire : « c'est un bon choix quand tu te sens comme ça ».</p></div>
  <p class="muted" style="font-size:9pt">Ton ressenti du jour passe toujours avant le calendrier : les phases sont des tendances moyennes, pas des règles.</p>
</div></section>`);

// Partie 1
parts.push(`<section><div class="part"><span class="n">01</span><h1>Ton cycle,<br>phase par phase</h1><p>Ce que font tes hormones, pourquoi tu te sens comme ça, et comment en tirer parti à la salle.</p></div></section>`);
parts.push(`<section><div class="stack" style="gap:6mm"><span class="kick">Vue d'ensemble</span><h2>Un cycle, deux hormones, quatre phases</h2>
  <p>Un cycle dure en moyenne 28 jours (de 21 à 35 jours, c'est normal). Deux hormones mènent la danse : les <b style="color:#E3197C;font-weight:500">œstrogènes</b>, qui montent avant l'ovulation et donnent de l'énergie, et la <b style="color:#3D58E0;font-weight:500">progestérone</b>, qui domine après l'ovulation et calme le jeu.</p>
  <div class="box">${hormoneChart(28)}</div>
  <div class="grid2">${PHASES.map((ph) => `<div class="box hl" style="--c:${ph.c};background:${ph.soft}"><b style="color:${ph.c};font-weight:500">${ph.long}</b><p style="font-size:9.5pt;margin-top:1mm">${CYCLE[ph.k].intensite}.</p></div>`).join("")}</div>
  <p class="muted" style="font-size:9pt">Le jour 1 du cycle est le premier jour des règles. L'ovulation a lieu environ 14 jours avant les règles suivantes : avec un cycle de 32 jours, elle tombe vers J18.</p></div></section>`);
for (const ph of PHASES) {
  const c = CYCLE[ph.k], i = PHASES.indexOf(ph);
  const stars = EXOS.filter((e) => e.p[i] === 2 && (ph.k === "mens" ? true : ph.k === "lut" ? e.m.includes("chaud") || e.z === "Cardio" : e.m.includes("top"))).slice(0, 10);
  parts.push(`<section><div class="stack" style="gap:5mm">
    <div class="phead" style="background:${ph.c}"><span class="kick" style="color:rgba(255,255,255,.8)">${ph.j}</span><h1>${ph.long}</h1><span class="j">Intensité conseillée : ${c.intensite.toLowerCase()}</span></div>
    <p class="hl" style="--c:${ph.c};font-size:11pt">${c.hormones}</p>
    <h3>Ce que tu ressens, et pourquoi</h3>
    <div class="stack" style="gap:3mm">${c.ressenti.map(([t, d]) => `<div><b style="font-weight:500">${t}</b><br><span>${d}</span></div>`).join("")}</div>
    <div class="box" style="background:${ph.soft}"><h3 style="color:${ph.c}">À la salle</h3><p style="margin-top:1.5mm">${c.salle}</p></div>
    <div class="grid2"><div class="box"><span class="kick">Séance type</span><ol style="margin-top:2mm">${c.seance.map((s) => `<li>${s}</li>`).join("")}</ol></div>
    <div class="box"><span class="kick">Exercices stars de la phase</span><ul class="plain" style="margin-top:2mm;gap:1.4mm">${stars.map((e) => `<li>● ${e.n}</li>`).join("")}</ul></div></div>
  </div></section>`);
}
parts.push(`<section><div class="stack" style="gap:5mm"><h2>Contraception hormonale</h2>
  <p>Avec une pilule, un implant, un anneau, un patch ou une injection qui bloquent l'ovulation, les hormones restent à peu près stables tout le mois : les phases de ce livre ne s'appliquent pas vraiment. Fie-toi aux humeurs (partie 2) et à ton énergie du jour. Pendant la semaine de pause d'une pilule, les saignements viennent de l'arrêt des hormones : un peu de fatigue est possible.</p>
  <p>Le stérilet hormonal agit surtout dans l'utérus : beaucoup de femmes continuent d'ovuler. Si tu as encore des règles à peu près régulières, suis les phases. Le stérilet au cuivre ne contient pas d'hormones : ton cycle reste naturel (règles souvent plus abondantes : pense au fer).</p>
  <h2 style="margin-top:4mm">Tout le monde n'est pas pareil</h2>
  <p>En moyenne, les hormones jouent sur l'humeur et l'énergie, mais beaucoup moins qu'on le croit pour la plupart des femmes : une revue de 47 études a trouvé que le sommeil, le stress, la santé et le soutien des proches pèsent souvent plus que la phase.</p>
  <p>À l'inverse, certaines femmes sont très sensibles aux variations hormonales, même avec des taux normaux. Environ 3 à 8 % ont un trouble dysphorique prémenstruel (TDPM) : tristesse, anxiété ou colère fortes chaque mois avant les règles. Ça se soigne : parles-en à un·e médecin ou une sage-femme.</p>
  <div class="box"><span class="kick">L'astuce</span><p style="margin-top:1.5mm">Note pendant 2 ou 3 mois ton énergie et ton humeur avant chaque séance (l'app Phase Gym le fait pour toi). Tu verras tes propres tendances, qui comptent plus que n'importe quelle moyenne.</p></div></div></section>`);

// Partie 2
parts.push(`<section><div class="part"><span class="n">02</span><h1>Que faire selon<br>ton humeur</h1><p>Six humeurs, ce qui les explique souvent, le genre de séance qui fait du bien et les exercices à choisir.</p></div></section>`);
parts.push(`<section style="break-before:page"><div class="stack" style="gap:5mm">${Object.entries(MOOD_GUIDE).map(([k, g]) => {
  const ex = EXOS.filter((e) => e.m.includes(k)).map((e) => e.n);
  return `<div class="box hl" style="--c:${MOODS[k].c}"><h3 style="color:${MOODS[k].c}">${MOODS[k].e} ${MOODS[k].n}</h3>
    <p style="margin-top:1.5mm"><b style="font-weight:500">Pourquoi :</b> ${g.pourquoi}</p>
    <p><b style="font-weight:500">Ce qui fait du bien :</b> ${g.faire}</p>
    <p><b style="font-weight:500">À éviter :</b> ${g.eviter}</p>
    <p class="muted" style="font-size:9pt;margin-top:1.5mm"><b style="font-weight:500;color:#151517">Exercices conseillés :</b> ${ex.join(" · ")}</p></div>`;
}).join("")}</div></section>`);

// Partie 3
parts.push(`<section><div class="part"><span class="n">03</span><h1>Les exercices</h1><p>${EXOS.length} fiches : comment bien faire le mouvement, l'erreur à éviter, et quand le choisir selon ta phase et ton humeur.</p></div></section>`);
for (const z of ZONES) {
  const list = EXOS.filter((e) => e.z === z);
  parts.push(`<section><div class="zone"><span class="dot9">${String(ZONES.indexOf(z) + 1).padStart(2, "0")}</span><h2>${z}</h2></div>
  ${list.map((e) => { const h = ill(e.v), isImg = h.startsWith("<img");
    return `<article class="ex"><div class="pic ${h ? (isImg ? "dark" : "") : "none"}">${h || "♥"}</div><div>
      <h3>${esc(e.n)}</h3><p class="meta">${esc(e.mus)} · <span>${esc(e.vars)}</span></p>
      <ol>${e.pas.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <p class="tip"><b>Erreur fréquente :</b> ${esc(e.erreur)}</p>
      <p class="tip"><b>Selon ton cycle :</b> ${esc(e.astuce)}</p>
      <div class="foot">${dots(e.p)}<div class="moods">${e.m.map(moodChip).join("")}</div></div></div></article>`; }).join("")}</section>`);
}

// Partie 4 : récap
parts.push(`<section><div class="stack" style="gap:4mm"><span class="kick">Partie 4</span><h2>Le récap en un coup d'œil</h2>
  <table><thead><tr><th>Exercice</th>${PHASES.map((ph) => `<th style="color:${ph.c};text-align:center">${ph.n}</th>`).join("")}<th>Humeurs</th></tr></thead><tbody>
  ${EXOS.map((e) => `<tr><td>${esc(e.n)} <span class="muted" style="font-size:7.8pt">· ${e.z}</span></td>${PHASES.map((ph, i) => `<td style="text-align:center"><span class="d l${e.p[i]}" style="--c:${ph.c}"><i></i></span></td>`).join("")}<td style="font-size:9pt">${e.m.map((k) => `<span style="color:${MOODS[k].c}" title="${MOODS[k].n}">${MOODS[k].e}</span>`).join(" ")}</td></tr>`).join("")}
  </tbody></table>
  <p class="muted" style="font-size:8.5pt">${Object.keys(MOODS).map((k) => `${MOODS[k].e} ${MOODS[k].n}`).join(" · ")}</p></div></section>`);

// Bon à savoir
parts.push(`<section><div class="stack" style="gap:5mm"><h2>Bon à savoir</h2>
  <div class="box hl" style="--c:#E3197C"><h3>Santé</h3><p style="margin-top:1.5mm">Ce livre donne des conseils généraux d'entraînement. Il ne remplace pas l'avis d'un·e professionnel·le de santé ou d'un·e coach. Arrête un exercice qui fait mal. Règles très douloureuses, cycles très irréguliers ou humeur qui pèse vraiment avant les règles : parles-en à un·e médecin ou une sage-femme. Ni ce livre ni l'app ne sont une méthode de contraception.</p></div>
  <div class="box"><h3>Les bases qui comptent plus que tout</h3><ul class="plain" style="margin-top:2mm"><li>● Échauffe-toi 5 à 10 minutes avant chaque séance.</li><li>● La bonne charge : les 2 dernières répétitions sont dures mais propres.</li><li>● Monte la charge quand tu fais le haut de la fourchette de répétitions à toutes les séries.</li><li>● Laisse 48 h avant de retravailler le même muscle.</li><li>● Dors, mange assez de protéines, bois : c'est là que tu progresses.</li></ul></div>
  <div class="box"><h3>Sources</h3><ul class="plain muted" style="margin-top:2mm;font-size:9pt">${SOURCES.map((s) => `<li>${s}</li>`).join("")}</ul></div>
  <p class="muted" style="font-size:8.5pt">Phase Gym · usage personnel · ne pas partager ni revendre. Les illustrations en couleur ont été créées avec l'aide d'une IA.</p></div></section>`);

const HT = `<svg width="0" height="0" style="position:absolute"><defs><pattern id="ht" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><rect width="3.2" height="3.2" fill="#fff"/><circle cx="1.6" cy="1.6" r=".85" fill="#111"/></pattern></defs></svg>`;
const bodyHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${HT}${parts.join("\n")}</body></html>`;

/* Couverture (pleine page, sans marges) */
const coverPics = ["Hip thrust à la barre", "Squat à la barre", "Tirage vertical", "Fentes bulgares haltères", "Pec deck (butterfly)", "Kettlebell swing", "Élévations latérales haltères", "Rowing assis à la poulie", "Step-up sur box haltères"].map(ill).filter((h) => h.startsWith("<img"));
const coverHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@import url("https://fonts.googleapis.com/css2?family=Doto:wght@700;900&family=Geist:wght@300..600&display=swap");
@page{size:A4;margin:0}*{box-sizing:border-box;margin:0}
body{width:210mm;height:297mm;overflow:hidden;font-family:Geist,sans-serif;color:#fff;background:radial-gradient(55% 40% at 85% 12%,rgba(227,25,124,.8),transparent 70%),radial-gradient(50% 40% at 10% 95%,rgba(61,88,224,.7),transparent 70%),radial-gradient(40% 30% at 70% 90%,rgba(226,104,58,.5),transparent 70%),#050506;padding:20mm 18mm;display:flex;flex-direction:column;gap:9mm}
.logo{width:20mm;height:20mm;border-radius:6mm}
h1{font-size:46pt;line-height:.98;font-weight:500;letter-spacing:-.035em}
p{font-size:14pt;color:rgba(255,255,255,.85);max-width:150mm}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:auto}
.g div{aspect-ratio:5/4;border-radius:5mm;overflow:hidden;background:#1b191b}.g img{width:100%;height:100%;object-fit:cover;display:block}
.bar{display:flex;gap:0;height:4mm;border-radius:2mm;overflow:hidden}.bar i{flex:1}
.k{font-size:10pt;letter-spacing:.16em;text-transform:uppercase;opacity:.75}
</style></head><body><img class="logo" src="${LOGO}"><span class="k">Phase Gym · le guide</span>
<h1>Bouge avec<br>ton cycle</h1><p>${EXOS.length} exercices expliqués et illustrés, avec un code couleur selon ta phase et ton humeur, et ton cycle expliqué simplement.</p>
<div class="bar">${PHASES.map((ph) => `<i style="background:${ph.c}"></i>`).join("")}</div>
<div class="g">${coverPics.map((h) => `<div>${h}</div>`).join("")}</div></body></html>`;

const tmp = path.resolve(path.dirname(OUT), "_livre"); fs.mkdirSync(tmp, { recursive: true });
const page = await b.newPage();
const render = async (html, file, opts) => { const f = path.join(tmp, file + ".html"); fs.writeFileSync(f, html); await page.goto("file://" + f); await page.waitForTimeout(1500); await page.pdf({ path: path.join(tmp, file + ".pdf"), format: "A4", printBackground: true, preferCSSPageSize: true, ...opts }); };
await render(coverHtml, "cover", {});
await render(bodyHtml, "body", { displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: `<div style="width:100%;font-family:sans-serif;font-size:7.5pt;color:#9a9aa0;padding:0 15mm;display:flex;justify-content:space-between"><span>Phase Gym · Bouge avec ton cycle</span><span class="pageNumber"></span></div>` });
await b.close();
execFileSync("python3", ["-c", `
import sys
from pypdf import PdfReader, PdfWriter
w = PdfWriter()
for f in sys.argv[1:3]:
    for p in PdfReader(f).pages: w.add_page(p)
w.add_metadata({"/Title": "Bouge avec ton cycle - le guide des exercices Phase Gym", "/Author": "Phase Gym"})
with open(sys.argv[3], "wb") as o: w.write(o)
`, path.join(tmp, "cover.pdf"), path.join(tmp, "body.pdf"), OUT]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log("Livre prêt :", OUT);
