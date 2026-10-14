// Vidéos promo de Phase Gym, image par image (Playwright) puis assemblées avec ffmpeg.
// Usage : node vente/outils/video.mjs <dossier des médias> <sortie.mp4> <format : vertical|carre> <durée : 30|15>
// Le dossier des médias contient : today-full.png, cycle-full.png (captures pleine page, 2x), livre-1/7/15/31.png,
// et un sous-dossier ex/ (dessins des exercices). Pas de son : Etsy n'en accepte pas, et sur TikTok on ajoute la musique dans l'app.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
const require = createRequire(import.meta.url);
const pw = (() => { try { return require("playwright"); } catch (e) { return require("/opt/node22/lib/node_modules/playwright"); } })();
const [MEDIA, OUT, FORMAT = "vertical", DUREE = "30"] = process.argv.slice(2);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const LOGO = "file://" + path.resolve(HERE, "../../docs/phase/icons/icon-512.png");
const M = (f) => "file://" + path.resolve(MEDIA, f);
const W = 540, H = FORMAT === "carre" ? 540 : 960, FPS = 30;
// Positions (px CSS, largeur 390) relevées dans l'app : début du bloc d'exercices, courbe des hormones, explication de la phase.
const POS = { todayEx: 1311, cycleChart: 699, cycleWhy: 1114 };

/* Scènes et durées (s). La version 15 s garde l'essentiel pour Etsy. */
const SCENES = DUREE === "15"
  ? [["hook", 2.4], ["seance", 3.6], ["pourquoi", 3], ["exos", 2.6], ["fin", 3.4]]
  : [["hook", 3.4], ["cycle", 3.6], ["seance", 5], ["charges", 4], ["pourquoi", 4], ["exos", 4], ["livre", 3], ["fin", 3]];
const TOTAL = SCENES.reduce((a, s) => a + s[1], 0);

const ex = fs.readdirSync(path.resolve(MEDIA, "ex")).filter((f) => /\.(jpg|webp)$/.test(f));
const pickEx = ["hipthrust.jpg", "s2-legext.webp", "squatbarre.jpg", "s3-hack.webp", "tirage.jpg", "s2-incline.webp", "fly.jpg", "s3-curlpoulie.webp", "kbswing.jpg", "s2-gainagelat.webp", "s3-elliptique.webp", "bulgare.jpg"].filter((f) => ex.includes(f));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@import url("https://fonts.googleapis.com/css2?family=Doto:wght@700;900&family=Geist:wght@300..600&display=swap");
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#050506;font-family:Geist,system-ui,sans-serif;color:#F4F3F0;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:-20%;background:radial-gradient(40% 30% at 75% 25%,rgba(227,25,124,.6),transparent 70%),radial-gradient(40% 30% at 20% 80%,rgba(61,88,224,.5),transparent 70%),radial-gradient(30% 25% at 70% 95%,rgba(226,104,58,.4),transparent 70%)}
.sc{position:absolute;inset:0;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${H > W ? 26 : 14}px;padding:0 34px;text-align:center}
.big{font-size:${H > W ? 44 : 34}px;line-height:1.05;font-weight:500;letter-spacing:-.03em}
.cap{font-size:${H > W ? 27 : 21}px;line-height:1.15;font-weight:500;letter-spacing:-.02em;max-width:470px}
.sub{font-size:${H > W ? 18 : 15}px;opacity:.75}
.bar{display:flex;height:8px;border-radius:4px;overflow:hidden;width:300px}.bar i{height:100%}
.phone{position:relative;width:${H > W ? 300 : 190}px;aspect-ratio:390/844;border-radius:${H > W ? 44 : 28}px;background:#0b0b0c;padding:${H > W ? 10 : 7}px;box-shadow:0 30px 70px -20px rgba(0,0,0,.8),0 0 0 2px rgba(255,255,255,.1)}
.scr{width:100%;height:100%;border-radius:${H > W ? 35 : 22}px;overflow:hidden;position:relative;background:#000}
.scr img{position:absolute;left:0;top:0;width:100%}
.grid{display:grid;grid-template-columns:repeat(${H > W ? 3 : 4},1fr);gap:10px;width:${H > W ? 450 : 470}px}
.t{aspect-ratio:5/4;border-radius:14px;overflow:hidden;background:#1b191b}
.t.light{background:#F2F0EB}
.t img{width:100%;height:100%;object-fit:cover;display:block}
.pages{position:relative;width:420px;height:${H > W ? 420 : 300}px}
.pg{position:absolute;width:${H > W ? 190 : 140}px;aspect-ratio:210/297;border-radius:6px;overflow:hidden;background:#fff;box-shadow:0 20px 40px -10px rgba(0,0,0,.6)}
.pg img{width:100%;height:100%;display:block}
.chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.chip{border:1.5px solid rgba(255,255,255,.5);border-radius:99px;padding:6px 14px;font-size:${H > W ? 16 : 13}px}
.dot{font-family:Doto,monospace;font-weight:900}
svg text{font-family:Geist,sans-serif}
</style></head><body><div class="bg"></div>

<div class="sc" id="hook"><p class="big" id="h1">Certains jours tu es à fond…</p><p class="big" id="h2" style="color:#FF6FB1">…et d'autres complètement à plat ?</p>
  <div class="bar" id="hbar"><i style="background:#E3197C;width:25%"></i><i style="background:#93B49B;width:25%"></i><i style="background:#E2683A;width:25%"></i><i style="background:#3D58E0;width:25%"></i></div></div>

<div class="sc" id="cycle"><p class="big">C'est ton cycle.</p>
  <svg viewBox="0 0 460 230" width="460"><path id="pe" d="" fill="none" stroke="#FF6FB1" stroke-width="5" stroke-linecap="round"/><path id="pp" d="" fill="none" stroke="#7D93FF" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 0"/>
  <g id="plabels">${["Règles", "Folliculaire", "Ovulation", "Lutéale"].map((n, i) => `<text x="${[40, 150, 260, 380][i]}" y="222" text-anchor="middle" font-size="16" fill="${["#FF6FB1", "#9FD0AB", "#FF9F55", "#8FA3FF"][i]}">${n}</text>`).join("")}</g></svg>
  <p class="sub">Œstrogènes · Progestérone</p></div>

<div class="sc" id="seance"><p class="cap" id="capS">Ta séance du jour, adaptée à ta phase et à ton énergie</p><div class="phone"><div class="scr"><img id="imgT" src="${M("today-full.png")}"></div></div></div>
<div class="sc" id="charges"><p class="cap">Les charges calculées pour toi, qui montent quand tu es prête</p><div class="phone"><div class="scr"><img id="imgC" src="${M("today-full.png")}"></div></div></div>
<div class="sc" id="pourquoi"><p class="cap">« Pourquoi je me sens comme ça ? » expliqué chaque jour</p><div class="phone"><div class="scr"><img id="imgY" src="${M("cycle-full.png")}"></div></div></div>

<div class="sc" id="exos"><p class="cap">110+ exercices illustrés<br><span class="sub">machines · poulies · haltères · cardio</span></p>
  <div class="grid">${pickEx.slice(0, H > W ? 12 : 8).map((f, i) => `<div class="t ${f.endsWith(".webp") ? "light" : ""}" id="t${i}"><img src="${M("ex/" + f)}"></div>`).join("")}</div></div>

<div class="sc" id="livre"><p class="cap">+ le livre PDF offert<br><span class="sub">« Bouge avec ton cycle » · 34 pages</span></p>
  <div class="pages">${[7, 15, 31, 1].map((n, i) => `<div class="pg" id="pg${i}"><img src="${M("livre-" + n + ".png")}"></div>`).join("")}</div></div>

<div class="sc" id="fin"><img src="${LOGO}" style="width:${H > W ? 110 : 80}px;height:${H > W ? 110 : 80}px;border-radius:28px" id="flogo"><p class="big">Phase Gym</p><p class="cap" style="opacity:.85">La muscu qui suit ton cycle</p>
  <div class="chips"><span class="chip">Sans abonnement</span><span class="chip">Sans compte</span><span class="chip">iPhone & Android</span></div>
  <p class="sub" style="margin-top:6px">Sur Etsy · <b style="font-weight:500">BougeAvecTonCycle</b></p></div>

<script>
const SCENES = ${JSON.stringify(SCENES)}, POS = ${JSON.stringify(POS)};
const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
const clamp = (x) => Math.max(0, Math.min(1, x));
// courbes hormonales
const L = 28, ov = 14, g = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s)), X = (d) => 20 + (d - 1) * 420 / 27, Y = (v) => 190 - v * 160;
let pe = "", pp = ""; for (let d = 1; d <= L; d++) { const e = .12 + .82 * (d <= ov - 1 ? g(d, ov - 1, 4.5) : g(d, ov - 1, 1.3)) + .42 * g(d, ov + 7, 3.2), p = .05 + .9 * g(d, ov + 7, 3.3); pe += (d > 1 ? "L" : "M") + X(d) + " " + Y(e); pp += (d > 1 ? "L" : "M") + X(d) + " " + Y(p); }
document.getElementById("pe").setAttribute("d", pe); document.getElementById("pp").setAttribute("d", pp);
const lenE = document.getElementById("pe").getTotalLength(), lenP = document.getElementById("pp").getTotalLength();
function scroll(id, from, to, u) { const img = document.getElementById(id), k = img.parentElement.clientWidth / 390; img.style.transform = "translateY(" + (-(from + (to - from) * u) * k) + "px)"; }
window.render = (t) => {
  let acc = 0;
  for (const [name, dur] of SCENES) {
    const el = document.getElementById(name), lt = t - acc, u = clamp(lt / dur);
    const fadeIn = clamp(lt / .35), fadeOut = clamp((dur - lt) / .35);
    el.style.opacity = lt < 0 || lt > dur ? 0 : Math.min(fadeIn, name === SCENES[SCENES.length - 1][0] ? 1 : fadeOut);
    if (lt >= -.1 && lt <= dur + .1) {
      if (name === "hook") { document.getElementById("h1").style.transform = "translateY(" + (1 - ease(lt / .6)) * 30 + "px)"; const h2 = document.getElementById("h2"); h2.style.opacity = clamp((lt - dur * .42) / .4); h2.style.transform = "translateY(" + (1 - ease((lt - dur * .42) / .6)) * 30 + "px)"; document.getElementById("hbar").style.width = 300 * ease(lt / dur) + "px"; }
      if (name === "cycle") { const a = ease(lt / (dur * .7)); const pe = document.getElementById("pe"), pp = document.getElementById("pp"); pe.style.strokeDasharray = lenE; pe.style.strokeDashoffset = lenE * (1 - a); pp.style.strokeDasharray = lenP; pp.style.strokeDashoffset = lenP * (1 - a); document.getElementById("plabels").style.opacity = clamp((lt - dur * .5) / .5); }
      if (name === "seance") { el.querySelector(".phone").style.transform = "translateY(" + (1 - ease(lt / .7)) * 300 + "px)"; scroll("imgT", 0, POS.todayEx * .55, ease(clamp((lt - 1.2) / (dur - 1.6)))); }
      if (name === "charges") scroll("imgC", POS.todayEx - 20, POS.todayEx + 900, ease(clamp((lt - .3) / (dur - .6))));
      if (name === "pourquoi") scroll("imgY", POS.cycleChart - 60, POS.cycleWhy - 40, ease(clamp((lt - .4) / (dur - .7))));
      if (name === "exos") document.querySelectorAll(".t").forEach((n, i) => { const k = ease(clamp((lt - .2 - i * .12) / .45)); n.style.opacity = k; n.style.transform = "scale(" + (.7 + .3 * k) + ")"; });
      if (name === "livre") { const base = [[-120, 40, -14], [-40, 20, -5], [40, 30, 6], [-10, -10, 0]]; document.querySelectorAll(".pg").forEach((n, i) => { const k = ease(clamp((lt - i * .18) / .6)); const [x, y, r] = base[i]; n.style.left = "50%"; n.style.top = "0"; n.style.transform = "translateX(" + (x - 95) + "px) translateY(" + (y + (1 - k) * 260) + "px) rotate(" + r * k + "deg)"; n.style.opacity = k; n.style.zIndex = i; }); }
      if (name === "fin") { const k = ease(lt / .8); document.getElementById("flogo").style.transform = "scale(" + (.6 + .4 * k) + ")"; }
    }
    acc += dur;
  }
};
</script></body></html>`;

const tmp = path.resolve(path.dirname(OUT), "_video_" + path.basename(OUT, ".mp4")); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
fs.writeFileSync(path.join(tmp, "v.html"), html);
const b = await pw.chromium.launch();
const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.goto("file://" + path.join(tmp, "v.html")); await page.waitForTimeout(1500);
/* Aperçu : PREVIEW=1,5.5,12 enregistre seulement ces instants (en PNG, à côté de la vidéo). */
if (process.env.PREVIEW) {
  for (const t of process.env.PREVIEW.split(",").map(Number)) { await page.evaluate((t) => window.render(t), t); await page.screenshot({ path: OUT.replace(/\.mp4$/, "") + "-apercu-" + t + "s.png" }); }
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0);
}
const frames = Math.round(TOTAL * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.render(t), i / FPS);
  await page.screenshot({ path: path.join(tmp, "f" + String(i).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 90 });
}
await b.close();
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(tmp, "f%04d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-crf", "20", "-movflags", "+faststart", OUT]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log("Vidéo prête :", OUT, TOTAL + " s", W * 2 + "×" + H * 2);
