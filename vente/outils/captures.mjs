// Captures haute définition de Phase Gym (mode exemple) pour les images Etsy.
// Usage : node vente/outils/captures.mjs <adresse de l'app> <dossier de sortie>
//   ex. : python3 -m http.server 8766 --directory docs   puis   node vente/outils/captures.mjs http://localhost:8766/phase/ /tmp/captures
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pw = (() => { try { return require("playwright"); } catch (e) { return require("/opt/node22/lib/node_modules/playwright"); } })();
const { chromium } = pw;
const [APP, out] = process.argv.slice(2);
const b = await chromium.launch();
const HIDE = `.top + .banner{display:none!important} .top .label{visibility:hidden} .float{display:none!important}`;
async function page(scheme, accent){
  const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:3, colorScheme:scheme});
  const p = await ctx.newPage(); p.on("pageerror", e=>console.log("ERR", e.message));
  await p.goto(APP+"?demo");
  if (accent) await p.evaluate(a=>{ localStorage.setItem("phase-gym-look", JSON.stringify({theme:"auto", accent:a})); }, accent);
  await p.goto(APP+"?demo"); await p.waitForTimeout(700);
  await p.addStyleTag({content:HIDE}); return p;
}
const W = (p,ms=350)=>p.waitForTimeout(ms);
const shot = async (p, name, y=0) => { await p.evaluate(y=>window.scrollTo(0,y), y); await W(p,250); await p.screenshot({path:`${out}/${name}.png`}); };
const scrollTo = (p, sel, off=10) => p.evaluate(([s,o])=>{ const el=[...document.querySelectorAll(s)][0]; if(el) window.scrollTo(0, el.getBoundingClientRect().top+window.scrollY-o); }, [sel, off]);
let p = await page("dark");
await shot(p, "d-today");
await scrollTo(p, ".card:has(.ex .ill)"); await W(p); await p.screenshot({path:`${out}/d-plan.png`});
await p.click("[data-v=cycle]"); await W(p); await shot(p, "d-cycle");
await scrollTo(p, ".hchart", 60); await W(p); await p.screenshot({path:`${out}/d-hormones.png`});
await scrollTo(p, ".card.glow .sci", 160); await W(p); await p.screenshot({path:`${out}/d-why.png`});
await p.click("[data-v=stats]"); await W(p); await shot(p, "d-stats");
await p.click("[data-v=today]"); await W(p);
await p.click("[data-act=b-drop]"); await W(p); await scrollTo(p, "[data-act=b-start-mode]", 120); await W(p); await p.screenshot({path:`${out}/d-choices.png`});
await p.click('[data-act=b-start-mode][data-v=random]'); await W(p); await p.click("[data-act=b-next]"); await W(p); await p.click('[data-act=b-dur][data-v="60"]'); await W(p,700); await shot(p, "d-random");
await p.click("[data-act=b-back]"); await W(p); await p.click("[data-act=b-back]"); await W(p); await p.click("[data-act=b-back]"); await W(p);
await p.click('[data-act=b-start-mode][data-v=steps]'); await W(p); for (const z of ["fessiers","jambes"]) await p.click(`[data-act=b-zone][data-v=${z}]`); await W(p); await shot(p, "d-steps-zones");
await p.click("[data-act=b-next]"); await p.click('[data-act=b-dur][data-v="45"]'); await W(p,600); await p.click('[data-act=b-style][data-v=muscle]'); await W(p,600);
for (const n of ["Hip thrust à la barre","Presse à cuisses","Leg extension","Adducteurs à la machine"]) { await p.click(`[data-act=b-toggle][data-v="${n}"]`); await W(p,120); }
await shot(p, "d-pick");
await p.click("[data-act=b-next]"); await W(p); await shot(p, "d-recap");
await p.close();
p = await page("light");
await shot(p, "l-today");
await p.click("[data-v=cycle]"); await W(p); await shot(p, "l-cycle");
await p.click("[data-v=stats]"); await W(p); await shot(p, "l-stats");
await p.click("[data-v=today]"); await W(p); await p.click("[data-act=log-start]"); await W(p); await shot(p, "l-log");
await p.close();
p = await page("dark","rose"); await shot(p, "d-today-rose"); await p.close();
p = await page("light","ciel"); await p.click("[data-v=cycle]"); await W(p); await shot(p, "l-cycle-ciel"); await p.close();
// onboarding question (unlocked context)
const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:3, colorScheme:"dark"}); p = await ctx.newPage();
await p.goto(APP); await p.evaluate(()=>localStorage.setItem("phase-gym-acces","1")); await p.reload(); await W(p,600);
await p.click("[data-act=onb-go]"); await p.fill("#o-name","Léa"); await p.keyboard.press("Enter"); await W(p); await p.click("[data-v=muscle]").catch(()=>{});
await shot(p, "d-onb-goal");
await p.goto(APP+"?x"); await p.evaluate(()=>{localStorage.removeItem("phase-gym-acces")}); await p.reload(); await W(p,500); await shot(p, "d-lock");
await b.close();
