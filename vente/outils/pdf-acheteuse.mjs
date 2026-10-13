// PDF livré par Etsy après l'achat : lien de l'app, code d'accès, installation et conditions.
// Usage : node vente/outils/pdf-acheteuse.mjs <lien de l'app> <code d'accès> <fichier.pdf>
// Le PDF contient le code : ne le mets jamais dans le dépôt (le dossier vente/prive/ est ignoré par Git).
// QR code : facultatif, avec le paquet npm « qrcode-generator » (npm i qrcode-generator).
import { createRequire } from "module";
import path from "path";
const require = createRequire(import.meta.url);
const pw = (() => { try { return require("playwright"); } catch (e) { return require("/opt/node22/lib/node_modules/playwright"); } })();
const [URL_APP, CODE, OUT] = process.argv.slice(2);
if (!URL_APP || !CODE || !OUT) { console.error("Usage : node vente/outils/pdf-acheteuse.mjs <lien> <code> <fichier.pdf>"); process.exit(1); }

let qrSvg = "";
try {
  const qrcode = require("qrcode-generator");
  const q = qrcode(0, "M"); q.addData(URL_APP); q.make();
  qrSvg = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
} catch (e) { console.warn("QR code ignoré (qrcode-generator absent)."); }

const LOGO = "file://" + path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../docs/phase/icons/icon-512.png");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@import url("https://fonts.googleapis.com/css2?family=Doto:wght@700;900&family=Geist:wght@300..600&display=swap");
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Geist,system-ui,sans-serif;color:#121214;-webkit-font-smoothing:antialiased}
.page{width:210mm;height:297mm;padding:18mm 18mm 16mm;position:relative;overflow:hidden;page-break-after:always;background:#F7F5F1}
.page:last-child{page-break-after:auto}
.glow{position:absolute;inset:0;background:radial-gradient(60% 40% at 90% 0%,rgba(227,25,124,.18),transparent 70%),radial-gradient(50% 35% at 0% 100%,rgba(61,88,224,.12),transparent 70%);z-index:0}
.in{position:relative;z-index:1;display:flex;flex-direction:column;gap:7mm;height:100%}
.head{display:flex;align-items:center;gap:5mm}
.head img{width:16mm;height:16mm;border-radius:4.5mm}
.head b{font-size:20pt;font-weight:500;letter-spacing:-.02em}
h1{font-size:30pt;line-height:1.05;font-weight:500;letter-spacing:-.03em}
h2{font-size:17pt;font-weight:500;letter-spacing:-.02em}
p,li{font-size:11pt;line-height:1.45}
.muted{color:#5d5d63}
.card{background:#fff;border-radius:6mm;padding:7mm;box-shadow:0 1mm 5mm rgba(17,17,20,.07);display:flex;flex-direction:column;gap:3.5mm}
.dark{background:#0b0b0c;color:#F4F3F0}
.dark .muted{color:rgba(244,243,240,.7)}
.label{font-size:9pt;letter-spacing:.12em;text-transform:uppercase;color:#8a8a90}
.dark .label{color:rgba(244,243,240,.6)}
.link{font-size:14pt;font-weight:500;word-break:break-all;color:#C2186E;text-decoration:none}
.code{font-family:Doto,ui-monospace,monospace;font-weight:900;font-size:30pt;letter-spacing:.06em;color:#E4F25C}
.row{display:flex;gap:7mm;align-items:center}
.qr{width:38mm;height:38mm;flex:none;background:#fff;border-radius:3mm;padding:1.5mm}
.qr svg{width:100%;height:100%}
ol{padding-left:6mm;display:flex;flex-direction:column;gap:2mm}
.two{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.n{font-family:Doto,monospace;font-weight:900;font-size:22pt;color:#E3197C;line-height:1}
.warn{border-left:1mm solid #E3197C;padding-left:4mm}
.foot{margin-top:auto;font-size:8.5pt;color:#8a8a90}
</style></head><body>

<section class="page"><div class="glow"></div><div class="in">
  <div class="head"><img src="${LOGO}"><b>Phase Gym</b></div>
  <h1>Merci pour ton achat&nbsp;!</h1>
  <p class="muted">Phase Gym est une app qui s'ouvre dans le navigateur de ton téléphone et s'installe sur l'écran d'accueil, comme une vraie app. Tout ce qu'il te faut est sur cette page.</p>
  <div class="card"><span class="label">1 · Ton lien</span>
    <div class="row">${qrSvg ? `<div class="qr">${qrSvg}</div>` : ""}<div style="display:flex;flex-direction:column;gap:2mm">
      <a class="link" href="${esc(URL_APP)}">${esc(URL_APP)}</a>
      <p class="muted">${qrSvg ? "Scanne ce code avec l'appareil photo de ton téléphone, ou touche le lien si tu lis ce PDF sur ton téléphone." : "Touche le lien si tu lis ce PDF sur ton téléphone, ou recopie-le dans Safari ou Chrome."}</p></div></div></div>
  <div class="card dark"><span class="label">2 · Ton code d'accès</span>
    <span class="code">${esc(CODE)}</span>
    <p class="muted">À entrer une seule fois par appareil, à la première ouverture. Les tirets et les majuscules n'ont pas d'importance.</p></div>
  <div class="card"><span class="label">3 · Installe-la (page suivante)</span>
    <p>Sur iPhone : ajoute d'abord l'app à l'écran d'accueil, <b>puis</b> ouvre-la depuis son icône et entre ton code. (L'iPhone sépare Safari et les apps de l'écran d'accueil : un code entré dans Safari ne suit pas.)</p></div>
  <p class="foot">Ce lien et ce code sont à toi : usage personnel uniquement, merci de ne pas les partager ni les revendre.</p>
</div></section>

<section class="page"><div class="glow"></div><div class="in">
  <h1>Installer l'app</h1>
  <div class="two">
    <div class="card"><h2>iPhone / iPad</h2><ol>
      <li>Ouvre le lien dans <b>Safari</b> (pas dans l'app Etsy ou Instagram).</li>
      <li>Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li>
      <li>Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</li>
      <li>Ouvre Phase Gym depuis sa nouvelle icône et entre ton code.</li></ol></div>
    <div class="card"><h2>Android</h2><ol>
      <li>Ouvre le lien dans <b>Chrome</b>.</li>
      <li>Touche le menu <b>⋮</b> en haut à droite.</li>
      <li>Choisis <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</li>
      <li>Ouvre Phase Gym depuis son icône et entre ton code.</li></ol></div>
  </div>
  <div class="card"><h2>Sur ordinateur</h2><p>Ouvre le lien dans Chrome, Edge ou Safari et entre ton code. Avec Chrome ou Edge, l'icône d'installation dans la barre d'adresse la transforme en fenêtre d'app.</p></div>
  <div class="card"><h2>Premiers pas</h2><ol>
    <li><b>Ton profil</b> : quelques questions à la première ouverture (2 minutes).</li>
    <li><b>Chaque jour</b> : réponds aux 10 questions, construis ta séance toi-même, ou tire-la au sort.</li>
    <li><b>Ton cycle</b> : dans l'onglet Cycle, touche « Mes règles ont commencé aujourd'hui » à chaque début de règles.</li>
    <li><b>Ta salle</b> : dans Profil, coche les machines de ta salle et retire les exercices que tu n'aimes pas.</li></ol></div>
  <p class="foot">Réglages (thème clair ou sombre, couleurs, sauvegarde) : bouton en haut à gauche de l'app.</p>
</div></section>

<section class="page"><div class="glow"></div><div class="in">
  <h1>Bon à savoir</h1>
  <div class="card"><h2>Tes données</h2><p>Tout reste sur ton téléphone : pas de compte, pas de publicité, rien n'est envoyé sur un serveur. L'app marche aussi sans réseau, au fond de la salle.</p>
    <p><b>Changer de téléphone :</b> dans l'app, Réglages › « Télécharger une sauvegarde », puis sur le nouveau téléphone, ouvre ton lien, entre ton code et choisis Réglages › « Restaurer une sauvegarde ».</p>
    <p class="muted">Attention : effacer les données du navigateur ou désinstaller l'app efface aussi tes séances. Fais une sauvegarde de temps en temps.</p></div>
  <div class="card"><h2>Mises à jour</h2><p>Les nouveautés arrivent toutes seules, au même lien, sans rien racheter.</p></div>
  <div class="card"><h2>Une question, un souci ?</h2><p>Écris-moi par la messagerie Etsy (Achats et avis › contacter la boutique). Dis-moi ton modèle de téléphone, je te réponds vite.</p></div>
  <div class="card warn"><h2>Santé</h2><p>Les séances et les explications sur le cycle sont des conseils généraux. Phase Gym n'est ni un dispositif médical ni une méthode de contraception : les dates d'ovulation sont des estimations. Douleurs, règles très douloureuses ou humeur qui pèse vraiment : parles-en à un·e médecin ou une sage-femme. Arrête un exercice qui fait mal.</p></div>
  <p class="foot">Phase Gym · usage personnel · le lien et le code ne doivent pas être partagés, revendus ou publiés. Les noms de salles de sport cités dans l'app servent à pré-remplir l'équipement ; Phase Gym n'est liée à aucune de ces enseignes.</p>
</div></section>
</body></html>`;

const b = await pw.chromium.launch();
const p = await b.newPage();
const fs = await import("fs");
const tmp = path.resolve(path.dirname(OUT), "_pdf.html"); fs.writeFileSync(tmp, html);
await p.goto("file://" + tmp); await p.waitForTimeout(1200);
await p.pdf({ path: OUT, format: "A4", printBackground: true, preferCSSPageSize: true });
fs.unlinkSync(tmp);
await b.close();
console.log("PDF prêt :", OUT);
