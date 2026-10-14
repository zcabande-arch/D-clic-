// Images de l'annonce Etsy (3000 × 2250 px, format 4:3 conseillé par Etsy), à partir des captures de captures.mjs.
// Usage : node vente/outils/images-etsy.mjs <adresse de l'app> <dossier des captures> <dossier de sortie> [livre.pdf]
// Avec le livre PDF, l'image 07 le présente (pages rendues avec pdftoppm) ; fait aussi le logo et la bannière de la boutique.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const pw = (() => { try { return require("playwright"); } catch (e) { return require("/opt/node22/lib/node_modules/playwright"); } })();
const [APP, CAPS, OUT, LIVRE] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
import { execFileSync } from "child_process";
/* Pages du livre, pour l'image « livre offert ». */
const LP = path.resolve(OUT, "_livre"); let livrePages = [];
if (LIVRE && fs.existsSync(LIVRE)) {
  fs.mkdirSync(LP, { recursive: true });
  for (const n of [1, 6, 15, 21]) execFileSync("pdftoppm", ["-r", "90", "-png", "-f", String(n), "-l", String(n), "-singlefile", LIVRE, path.join(LP, "p" + n)]);
  livrePages = [1, 6, 15, 21].map((n) => "file://" + path.join(LP, "p" + n + ".png"));
}
const img = (n) => "file://" + path.resolve(CAPS, n + ".png");

const b = await pw.chromium.launch();

/* Dessins des exercices, repris de l'app (liste « Noter ma séance »). */
const p0 = await b.newPage({ viewport: { width: 390, height: 844 } });
await p0.goto(APP + "?demo"); await p0.waitForTimeout(600);
await p0.click("[data-act=log-start]"); await p0.click("[data-act=log-pick]"); await p0.waitForTimeout(400);
const ills = (await p0.$$eval(".pickrow", (rows) => rows.map((r) => ({ svg: r.querySelector(".ill:not(.noimg)")?.innerHTML || "", n: r.querySelector("b").textContent })).filter((x) => x.svg)))
  .map((x) => ({ ...x, svg: x.svg.replace(/src="ex\//g, `src="${APP}ex/`).replace(/ loading="lazy"/g, "") }));
await p0.close();
const pickIll = (names) => names.map((n) => ills.find((x) => x.n === n)).filter(Boolean);

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Doto:wght@700;900&family=Geist:wght@300..600&display=swap");
*{box-sizing:border-box;margin:0;padding:0}
body{width:1500px;height:1125px;overflow:hidden;font-family:Geist,system-ui,sans-serif;color:#F4F3F0;background:#000;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:
  radial-gradient(40% 50% at 78% 40%,rgba(227,25,124,.55),transparent 70%),
  radial-gradient(35% 45% at 20% 85%,rgba(61,88,224,.45),transparent 70%),
  radial-gradient(30% 40% at 60% 100%,rgba(226,104,58,.35),transparent 70%),#050506}
.bg.light{background:radial-gradient(45% 55% at 75% 35%,rgba(227,25,124,.22),transparent 70%),radial-gradient(40% 50% at 20% 90%,rgba(147,180,155,.4),transparent 70%),#F2F0EB;color:#121214}
.wrap{position:absolute;inset:0;padding:90px 100px;display:flex;gap:60px;align-items:center}
.txt{flex:0 0 560px;display:flex;flex-direction:column;gap:26px}
.kick{font-size:22px;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
h1{font-size:84px;line-height:.98;font-weight:500;letter-spacing:-.035em}
h2{font-size:64px;line-height:1.02;font-weight:500;letter-spacing:-.03em}
.lead{font-size:28px;line-height:1.35;opacity:.86}
ul{list-style:none;display:flex;flex-direction:column;gap:16px}
li{display:grid;grid-template-columns:22px 1fr;gap:16px;font-size:25px;line-height:1.3}
li::before{content:"";width:14px;height:14px;border-radius:50%;background:var(--c,#E4F25C);margin-top:8px}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.chip{border:1.5px solid currentColor;border-radius:999px;padding:10px 20px;font-size:21px;opacity:.9}
.dot{font-family:Doto,monospace;font-weight:900}
.phones{flex:1;position:relative;height:100%;transform:scale(.88);transform-origin:20% 50%}
.ph{position:absolute;width:var(--w,330px);aspect-ratio:390/844;border-radius:54px;background:#0b0b0c;padding:12px;box-shadow:0 40px 80px -20px rgba(0,0,0,.7),0 0 0 2px rgba(255,255,255,.08)}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:43px;display:block}
.ph::after{content:"";position:absolute;top:24px;left:50%;width:96px;height:28px;margin-left:-48px;border-radius:20px;background:#0b0b0c}
.logo{width:96px;height:96px;border-radius:26px}
.foot{position:absolute;left:100px;bottom:56px;font-size:20px;opacity:.6}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.cell{background:#1b191b;border-radius:22px;aspect-ratio:5/4;overflow:hidden}
.cell img{width:100%;height:100%;object-fit:cover;display:block}
.cell:has(img[src$=".webp"]){background:#F2F0EB}
.book{position:absolute;width:var(--w,300px);aspect-ratio:210/297;border-radius:10px;overflow:hidden;box-shadow:0 30px 60px -15px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.1);background:#fff}
.book img{width:100%;height:100%;display:block;object-fit:cover}
.badge{display:inline-flex;align-items:center;gap:10px;background:#E4F25C;color:#0b0b0c;border-radius:999px;padding:12px 24px;font-size:24px;font-weight:500;align-self:flex-start}
.cell svg{width:100%;height:100%;display:block}
.cap{font-size:15px;opacity:.75;margin-top:6px;line-height:1.2}
.steps{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.step{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:26px;display:flex;flex-direction:column;gap:10px}
.step .n{font-family:Doto,monospace;font-weight:900;font-size:56px;color:#E4F25C;line-height:.9}
.step b{font-size:27px;font-weight:500}
.step span{font-size:21px;opacity:.8;line-height:1.3}
`;
const phone = (src, x, y, w = 330, rot = 0, z = 1) => `<div class="ph" style="--w:${w}px;left:${x}px;top:${y}px;transform:rotate(${rot}deg);z-index:${z}"><img src="${img(src)}"></div>`;
const LOGO = "file://" + path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../docs/phase/icons/icon-512.png");
const HT = `<svg width="0" height="0" style="position:absolute"><defs><pattern id="ht" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><rect width="3.2" height="3.2" fill="#fff"/><circle cx="1.6" cy="1.6" r=".85" fill="#111"/></pattern></defs></svg>`;

const slides = {
  "01-couverture": `<div class="bg"></div><div class="wrap"><div class="txt">
    <img class="logo" src="${LOGO}"><h1>Phase Gym</h1>
    <p class="lead">L'app de muscu qui suit ton cycle, ton énergie et ta forme du jour.</p>
    <span class="badge">+ le livre PDF offert</span>
    <div class="chips"><span class="chip">Séance du jour sur mesure</span><span class="chip">110+ exercices</span><span class="chip">Sans abonnement</span><span class="chip">Sans compte</span><span class="chip">Marche hors ligne</span></div>
    </div><div class="phones">${phone("d-cycle", 10, 150, 300, -7, 1)}${phone("d-stats", 430, 150, 300, 7, 1)}${phone("d-today", 190, 70, 350, 0, 2)}</div></div>`,
  "02-pourquoi": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">Ton cycle, expliqué</span><h2>Pourquoi tu te sens comme ça ?</h2>
    <p class="lead">Chaque phase est expliquée simplement : hormones, énergie, humeur, et ce que ça change à la salle.</p>
    <ul><li style="--c:#E3197C">Règles : fatigue, crampes… et pourquoi ça passe</li><li style="--c:#93B49B">Folliculaire : l'énergie remonte</li><li style="--c:#E2683A">Ovulation : pic de forme et de confiance</li><li style="--c:#3D58E0">Lutéale : SPM, chaleur, envie de sucre</li></ul>
    </div><div class="phones">${phone("d-hormones", 40, 90, 330, -4, 1)}${phone("d-why", 380, 110, 330, 4, 2)}</div></div>`,
  "03-seance": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">Chaque jour</span><h2>Ta séance, construite pour toi</h2>
    <p class="lead">10 petites questions (énergie, sommeil, humeur, temps dispo…) et ta séance s'adapte, à ton cycle aussi.</p>
    <ul><li>Les charges calculées pour toi, qui montent quand tu es prête</li><li>Minuteur de repos intégré</li><li>Un exo ne te plaît pas ? Il est remplacé</li><li>Que l'équipement de ta salle</li></ul>
    </div><div class="phones">${phone("d-today", 40, 100, 330, -4, 1)}${phone("d-plan", 380, 120, 330, 4, 2)}</div></div>`,
  "04-a-ta-facon": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">À ta façon</span><h2>Construis-la toi-même… ou tire-la au sort</h2>
    <p class="lead">Choisis tes zones, ta durée, ton genre de séance et tes exos. Ou laisse le hasard décider, et relance si un exo ne te dit rien.</p>
    <div class="chips"><span class="chip">Force</span><span class="chip">Muscle</span><span class="chip">Tonus</span><span class="chip">Circuit</span><span class="chip">Aléatoire 🎲</span></div>
    </div><div class="phones">${phone("d-steps-zones", 0, 170, 280, -6, 1)}${phone("d-random", 470, 170, 280, 6, 1)}${phone("d-recap", 220, 80, 320, 0, 2)}</div></div>`,
  "05-exercices": () => {
    const sel = pickIll(["Hip thrust à la barre", "Presse à cuisses", "Leg extension", "Squat à la barre", "Tirage vertical", "Développé incliné haltères", "Développé épaules à la machine", "Fentes bulgares haltères", "Rowing assis à la poulie", "Oiseau à la machine (pec deck inversé)", "Élévations latérales haltères", "Curl barre EZ", "Kettlebell swing", "Gainage latéral", "Relevés de jambes à la chaise romaine", "Step-up sur box haltères"]);
    return `<div class="bg"></div>${HT}<div class="wrap"><div class="txt" style="flex-basis:500px">
    <span class="kick">La bibliothèque</span><h2><span class="dot">110+</span> exercices et machines</h2>
    <p class="lead">Tout ce qu'on trouve dans une grande salle de sport, avec un dessin pour chaque mouvement.</p>
    <ul><li>Machines guidées, presse, hack squat, Smith</li><li>Poulies, haltères, barres, kettlebells</li><li>Tractions et dips assistés, box, médecine-ball</li><li>Tu coches ce que ta salle a, tu retires ce que tu n'aimes pas</li></ul>
    </div><div style="flex:1"><div class="grid">${sel.map((x) => `<div><div class="cell">${x.svg}</div><p class="cap">${x.n}</p></div>`).join("")}</div></div></div>`;
  },
  "06-progres": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">Ton bilan</span><h2>Vois tes progrès, séance après séance</h2>
    <p class="lead">Kilos gagnés, régularité, effort ressenti, énergie selon ta phase… et tu peux noter une séance faite à ta façon.</p>
    <ul><li>Progression par exercice</li><li>Ton énergie et ton humeur selon ta phase</li><li>Historique complet</li></ul>
    </div><div class="phones">${phone("d-stats", 40, 100, 330, -4, 1)}${phone("l-log", 380, 120, 330, 4, 2)}</div></div>`,
  "07-livre": () => livrePages.length ? `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="badge">Offert avec l'app</span><h2>Le livre « Bouge avec ton cycle »</h2>
    <p class="lead">33 pages en PDF, à lire sur ton téléphone ou à imprimer.</p>
    <ul><li style="--c:#E3197C">Ton cycle expliqué phase par phase</li><li style="--c:#93B49B">Que faire selon ton humeur</li><li style="--c:#E2683A">49 exercices illustrés, pas à pas</li><li style="--c:#3D58E0">Un code couleur cycle et humeur</li></ul>
    </div><div class="phones">
      <div class="book" style="--w:270px;left:0;top:250px;transform:rotate(-8deg)"><img src="${livrePages[1]}"></div>
      <div class="book" style="--w:270px;left:470px;top:250px;transform:rotate(8deg)"><img src="${livrePages[3]}"></div>
      <div class="book" style="--w:300px;left:310px;top:330px;transform:rotate(3deg);z-index:2"><img src="${livrePages[2]}"></div>
      <div class="book" style="--w:330px;left:150px;top:90px;z-index:3"><img src="${livrePages[0]}"></div></div></div>` : "",
  "09-themes": `<div class="bg light"></div><div class="wrap" style="color:#121214"><div class="txt">
    <span class="kick">À ton goût</span><h2>Clair, sombre, à tes couleurs</h2>
    <p class="lead">Thème clair, sombre ou automatique, et 4 couleurs d'accent. Ton profil se règle en 2 minutes à la première ouverture.</p>
    </div><div class="phones">${phone("l-today", 0, 170, 280, -6, 1)}${phone("l-cycle-ciel", 470, 170, 280, 6, 1)}${phone("d-today-rose", 220, 80, 320, 0, 2)}</div></div>`,
  "08-comment": `<div class="bg"></div><div class="wrap"><div class="txt" style="flex-basis:720px">
    <span class="kick">Après l'achat</span><h2>Comment ça marche</h2>
    <div class="steps">
      <div class="step"><span class="n">1</span><b>Télécharge le PDF</b><span>Etsy › Achats et avis › Télécharger les fichiers</span></div>
      <div class="step"><span class="n">2</span><b>Ouvre ton lien</b><span>Dans Safari (iPhone) ou Chrome (Android)</span></div>
      <div class="step"><span class="n">3</span><b>Ajoute-la à l'écran d'accueil</b><span>Elle s'ouvre comme une vraie app</span></div>
      <div class="step"><span class="n">4</span><b>Entre ton code</b><span>Une seule fois, et c'est parti</span></div>
    </div>
    <p class="lead" style="font-size:21px">Fichier numérique, rien n'est envoyé par la poste. Tes données restent sur ton téléphone. Phase Gym n'est ni un outil médical ni une méthode de contraception.</p>
    </div><div class="phones">${phone("d-lock", 90, 90, 330, 3, 1)}</div></div>`,
};

const page = await b.newPage({ viewport: { width: 1500, height: 1125 }, deviceScaleFactor: 2 });
for (const [name, body] of Object.entries(slides)) {
  if (typeof body === "function" && !body()) continue;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${typeof body === "function" ? body() : body}</body></html>`;
  const file = path.resolve(OUT, "_" + name + ".html");
  fs.writeFileSync(file, html);
  await page.goto("file://" + file); await page.waitForTimeout(900);
  await page.screenshot({ path: path.resolve(OUT, name + ".png") });
  fs.unlinkSync(file);
}
/* Logo (500 × 500) et bannière (3360 × 840) de la boutique. */
const shop = await b.newPage({ viewport: { width: 1680, height: 420 }, deviceScaleFactor: 2 });
const strip = pickIll(["Hip thrust à la barre", "Squat à la barre", "Tirage vertical", "Développé incliné haltères", "Kettlebell swing", "Fentes bulgares haltères"]);
const banner = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
body{width:1680px;height:420px}.wrap{padding:0 90px;gap:50px}.strip{display:flex;gap:14px;margin-left:auto}
.strip div{width:150px;aspect-ratio:5/4;border-radius:16px;overflow:hidden;background:#1b191b}.strip div:has(img[src$=".webp"]){background:#F2F0EB}.strip img{width:100%;height:100%;object-fit:cover;display:block}</style></head>
<body><div class="bg"></div><div class="wrap"><img class="logo" src="${LOGO}" style="width:110px;height:110px;border-radius:30px"><div style="display:flex;flex-direction:column;gap:10px"><h1 style="font-size:64px">Phase Gym</h1><p class="lead" style="font-size:24px">La muscu qui suit ton cycle</p></div>
<div class="strip">${strip.map((x) => `<div>${x.svg}</div>`).join("")}</div></div></body></html>`;
fs.writeFileSync(path.resolve(OUT, "_b.html"), banner); await shop.goto("file://" + path.resolve(OUT, "_b.html")); await shop.waitForTimeout(900);
await shop.screenshot({ path: path.resolve(OUT, "boutique-banniere.png") }); fs.unlinkSync(path.resolve(OUT, "_b.html"));
await shop.setViewportSize({ width: 250, height: 250 });
fs.writeFileSync(path.resolve(OUT, "_l.html"), `<!doctype html><html><body style="margin:0;width:250px;height:250px;background:#000;display:grid;place-items:center"><img src="${LOGO}" style="width:230px;height:230px;border-radius:52px"></body></html>`);
await shop.goto("file://" + path.resolve(OUT, "_l.html")); await shop.waitForTimeout(300);
await shop.screenshot({ path: path.resolve(OUT, "boutique-logo.png") }); fs.unlinkSync(path.resolve(OUT, "_l.html"));
await b.close();
fs.rmSync(LP, { recursive: true, force: true });
console.log("Images prêtes dans", OUT);
