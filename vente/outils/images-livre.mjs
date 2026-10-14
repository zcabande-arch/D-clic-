// Images Etsy (3000 × 2250) pour vendre le livre PDF seul, à partir de ses pages.
// Usage : node vente/outils/images-livre.mjs <livre.pdf> <dossier de sortie>
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
const require = createRequire(import.meta.url);
const pw = (() => { try { return require("playwright"); } catch (e) { return require("/opt/node22/lib/node_modules/playwright"); } })();
const [LIVRE, OUT] = process.argv.slice(2);
if (!LIVRE || !OUT) { console.error("Usage : node vente/outils/images-livre.mjs <livre.pdf> <dossier>"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

/* Pages du livre en images. Repère les pages par leur texte, pour rester juste si le livre change. */
const TMP = path.resolve(OUT, "_pages"); fs.mkdirSync(TMP, { recursive: true });
execFileSync("pdftoppm", ["-r", "110", "-png", LIVRE, path.join(TMP, "p")]);
const files = fs.readdirSync(TMP).filter((f) => f.endsWith(".png")).sort();
const N = files.length;
const pg = (n) => "file://" + path.join(TMP, files[n - 1]);
const text = (n) => execFileSync("pdftotext", ["-f", String(n), "-l", String(n), LIVRE, "-"]).toString();
const find = (re, from = 1) => { for (let n = from; n <= N; n++) if (re.test(text(n))) return n; return 1; };
const P = {
  cover: 1, lire: find(/Fonce, c.est le bon moment/), vue: find(/Un cycle, deux hormones/), mens: find(/Phase menstruelle/, 6), foll: find(/Phase folliculaire/, 6), ovu: find(/Phase ovulatoire/, 6), lut: find(/Phase lutéale/, 6),
  mood1: find(/Énergie à bloc\s*Pourquoi/), mood2: find(/Triste, sensible\s*Pourquoi/), fess: find(/01\s*Fessiers/), pecs: find(/04\s*Pectoraux/), jambes: find(/02\s*Jambes/), abdos: find(/07\s*Abdos/),
  recap: find(/Le récap en un coup d.œil/, 4), suivi: find(/Mon suivi du mois/, 4), sante: find(/Bon à savoir\s+Santé/, 4),
};

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Doto:wght@700;900&family=Geist:wght@300..600&display=swap");
*{box-sizing:border-box;margin:0;padding:0}
body{width:1500px;height:1125px;overflow:hidden;font-family:Geist,system-ui,sans-serif;color:#151517;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:radial-gradient(45% 55% at 80% 30%,rgba(227,25,124,.22),transparent 70%),radial-gradient(40% 50% at 15% 95%,rgba(61,88,224,.18),transparent 70%),radial-gradient(35% 40% at 65% 100%,rgba(226,104,58,.16),transparent 70%),#F4F1EC}
.bg.dark{background:radial-gradient(40% 50% at 78% 40%,rgba(227,25,124,.55),transparent 70%),radial-gradient(35% 45% at 20% 85%,rgba(61,88,224,.45),transparent 70%),#050506}
.wrap{position:absolute;inset:0;padding:90px 100px;display:flex;gap:50px;align-items:center}
.dark ~ .wrap{color:#F4F3F0}
.txt{flex:0 0 560px;display:flex;flex-direction:column;gap:24px}
.kick{font-size:22px;letter-spacing:.14em;text-transform:uppercase;opacity:.65}
h1{font-size:86px;line-height:.98;font-weight:500;letter-spacing:-.035em}
h2{font-size:62px;line-height:1.02;font-weight:500;letter-spacing:-.03em}
.lead{font-size:28px;line-height:1.35;opacity:.82}
ul{list-style:none;display:flex;flex-direction:column;gap:15px}
li{display:grid;grid-template-columns:22px 1fr;gap:16px;font-size:25px;line-height:1.3}
li::before{content:"";width:14px;height:14px;border-radius:50%;background:var(--c,#E3197C);margin-top:8px}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.chip{border:1.5px solid currentColor;border-radius:999px;padding:10px 20px;font-size:21px;opacity:.85}
.badge{display:inline-flex;align-items:center;gap:10px;background:#151517;color:#fff;border-radius:999px;padding:12px 24px;font-size:23px;font-weight:500;align-self:flex-start}
.dark ~ .wrap .badge{background:#E4F25C;color:#0b0b0c}
.pages{flex:1;position:relative;height:100%;transform:scale(.86);transform-origin:15% 50%}
.book{position:absolute;width:var(--w,320px);aspect-ratio:210/297;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 30px 60px -18px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.06)}
.book img{width:100%;height:100%;display:block;object-fit:cover;object-position:top}
.bar{display:flex;height:12px;border-radius:6px;overflow:hidden;width:320px}.bar i{flex:1}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.grid .book{position:relative;width:100%}
.big{font-family:Doto,monospace;font-weight:900;font-size:120px;line-height:.9;color:#E3197C}
`;
const BAR = `<div class="bar"><i style="background:#E3197C"></i><i style="background:#5E9B6E"></i><i style="background:#E2683A"></i><i style="background:#3D58E0"></i></div>`;
const book = (n, x, y, w = 320, rot = 0, z = 1, extra = "") => `<div class="book" style="--w:${w}px;left:${x}px;top:${y}px;transform:rotate(${rot}deg);z-index:${z};${extra}"><img src="${pg(n)}"></div>`;

const slides = {
  "01-couverture": `<div class="bg dark"></div><div class="wrap"><div class="txt">
    <span class="badge">Guide PDF · ${N} pages</span><h1>Bouge avec ton cycle</h1>
    <p class="lead">Le guide muscu qui suit ton cycle et ton humeur : quoi faire à la salle, et pourquoi tu te sens comme ça.</p>${BAR}
    <div class="chips"><span class="chip">49 exercices illustrés</span><span class="chip">Code couleur cycle et humeur</span><span class="chip">Ton cycle expliqué</span><span class="chip">Suivi du mois à imprimer</span></div>
    </div><div class="pages">${book(P.foll, 20, 220, 300, -9, 1)}${book(P.fess, 470, 220, 300, 8, 1)}${book(P.cover, 170, 70, 400, 0, 3)}</div></div>`,
  "02-code-couleur": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">Le principe</span><h2>Un code couleur pour chaque exercice</h2>
    <p class="lead">4 pastilles, une par phase du cycle : pleine = idéal, à moitié = en douceur, vide = à éviter si tu as mal. Plus des étiquettes d'humeur.</p>
    <ul><li style="--c:#E3197C">Règles</li><li style="--c:#5E9B6E">Folliculaire</li><li style="--c:#E2683A">Ovulation</li><li style="--c:#3D58E0">Lutéale</li></ul>
    </div><div class="pages">${book(P.lire, 0, 110, 380, -4, 1)}${book(P.recap, 380, 150, 380, 4, 2)}</div></div>`,
  "03-phases": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">Partie 1</span><h2>Ton cycle, phase par phase</h2>
    <p class="lead">Pour chaque phase : ce que font tes hormones, ce que tu ressens, ce qu'on fait à la salle, une séance type et les exercices stars.</p>
    </div><div class="pages">${book(P.mens, 0, 90, 290, -10, 1)}${book(P.foll, 170, 130, 290, -3, 2)}${book(P.ovu, 340, 170, 290, 4, 3)}${book(P.lut, 500, 210, 290, 10, 4)}</div></div>`,
  "04-pourquoi": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">Enfin compris</span><h2>Pourquoi tu te sens comme ça ?</h2>
    <p class="lead">Fatigue des règles, pic d'énergie avant l'ovulation, chaleur et SPM en fin de cycle : tout est expliqué simplement, sources à l'appui.</p>
    <ul><li style="--c:#E3197C">Œstrogènes, progestérone, sérotonine</li><li style="--c:#3D58E0">SPM et TDPM, contraception</li><li style="--c:#5E9B6E">« Tout le monde n'est pas pareil »</li></ul>
    </div><div class="pages">${book(P.vue, 10, 100, 380, -4, 1)}${book(P.lut, 390, 140, 380, 4, 2)}</div></div>`,
  "05-humeurs": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">Partie 2</span><h2>Que faire selon ton humeur</h2>
    <p class="lead">À plat, à cran, triste, des crampes, trop chaud ou à bloc : la séance qui fait du bien, ce qu'il vaut mieux éviter, et les exercices à choisir.</p>
    </div><div class="pages">${book(P.mood1, 10, 100, 380, -4, 1)}${book(P.mood2, 390, 140, 380, 4, 2)}</div></div>`,
  "06-exercices": `<div class="bg dark"></div><div class="wrap"><div class="txt">
    <span class="kick">Partie 3</span><h2>49 exercices illustrés, pas à pas</h2>
    <p class="lead">Machines, poulies, haltères, barres, kettlebells, poids du corps et cardio.</p>
    <ul><li style="--c:#E4F25C">Les muscles travaillés et les variantes</li><li style="--c:#E4F25C">L'exécution en 3 étapes</li><li style="--c:#E4F25C">L'erreur fréquente à éviter</li><li style="--c:#E4F25C">Quand le faire selon ton cycle</li></ul>
    </div><div class="pages">${book(P.jambes, 0, 110, 330, -7, 1)}${book(P.abdos, 450, 110, 330, 7, 1)}${book(P.fess, 200, 60, 370, 0, 3)}</div></div>`,
  "07-suivi": `<div class="bg"></div><div class="wrap"><div class="txt">
    <span class="kick">En bonus</span><h2>Ton suivi du mois et le récap</h2>
    <p class="lead">Un tableau à imprimer pour noter ta phase, ton humeur, ton énergie et ta séance chaque jour. Et tous les exercices en un coup d'œil, pour choisir vite à la salle.</p>
    </div><div class="pages">${book(P.recap, 0, 110, 380, -4, 1)}${book(P.suivi, 390, 140, 380, 4, 2)}</div></div>`,
  "08-ce-que-tu-recois": `<div class="bg"></div><div class="wrap"><div class="txt" style="flex-basis:520px">
    <span class="kick">Ce que tu reçois</span><span class="big">${N}</span><h2 style="margin-top:-10px">pages en PDF</h2>
    <ul><li>Téléchargement immédiat après l'achat</li><li>À lire sur téléphone ou tablette, ou à imprimer (A4)</li><li>En français</li><li>Rien n'est envoyé par la poste</li></ul>
    </div><div style="flex:1"><div class="grid">${[P.cover, P.lire, P.vue, P.foll, P.mood1, P.fess, P.recap, P.suivi].map((n) => `<div class="book"><img src="${pg(n)}"></div>`).join("")}</div></div></div>`,
};

const b = await pw.chromium.launch();
const page = await b.newPage({ viewport: { width: 1500, height: 1125 }, deviceScaleFactor: 2 });
for (const [name, body] of Object.entries(slides)) {
  const f = path.resolve(OUT, "_" + name + ".html");
  fs.writeFileSync(f, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`);
  await page.goto("file://" + f); await page.waitForTimeout(900);
  await page.screenshot({ path: path.resolve(OUT, name + ".png") }); fs.unlinkSync(f);
}
await b.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log("Images du livre prêtes dans", OUT, JSON.stringify(P));
