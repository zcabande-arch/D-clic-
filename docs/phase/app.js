(function(){
"use strict";
/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const iso = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const todayISO = () => iso(new Date());
const parse = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
function ymd(s){ const [y,m,d]=s.split("-").map(Number); return [y,m-1,d]; }
const dayDiff = (a,b) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a)))/864e5);
const addDays = (s,n) => { const d=parse(s); d.setDate(d.getDate()+n); return iso(d); };
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const fr = n => String(n).replace(".",",");
const MONTHS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const DAYS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const fmtShort = s => { const d=parse(s); return d.getDate()+" "+MONTHS[d.getMonth()]; };
const fmtLong = s => { const d=parse(s); return DAYS[d.getDay()]+" "+d.getDate()+" "+MONTHS[d.getMonth()]; };
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const hash = s => { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))|0; return h; };
const PLUS = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>';
const ARROW_R = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7h10M8 3l4 4-4 4"/></svg>';
const ARROW_L = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 9H3M7 5L3 9l4 4"/></svg>';
const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

/* ---------- phases ---------- */
const PHASES = {
  mens:{name:"Menstruelle", c:"--p-mens", g:"g-pink",
    feel:"Énergie souvent plus basse les 1–2 premiers jours. Bouger en douceur aide souvent les crampes.",
    train:"Séance plus douce si tu as mal. Si tu te sens bien, rien ne t'empêche de pousser."},
  foll:{name:"Folliculaire", c:"--p-foll", g:"g-sage",
    feel:"Les œstrogènes montent : beaucoup de femmes ont plus d'énergie et récupèrent bien.",
    train:"Bon moment pour monter les charges, tenter des records et apprendre des mouvements techniques."},
  ovu:{name:"Ovulatoire", c:"--p-ovu", g:"g-orange",
    feel:"Souvent le pic d'énergie et de motivation du cycle.",
    train:"Fonce sur l'intense, mais soigne l'échauffement des genoux et des hanches : certaines études montrent des ligaments un peu plus souples à ce moment."},
  lut:{name:"Lutéale", c:"--p-lut", g:"g-blue",
    feel:"La progestérone et la température du corps montent : on a plus chaud et on s'essouffle plus vite. En fin de phase, le SPM peut peser sur l'humeur.",
    train:"La force reste bonne au début. Plus de repos entre les séries, bois davantage, et allège en fin de phase si le SPM se fait sentir."}
};
function cycleInfo(cycle, dateStr){
  if (!cycle || !cycle.lastStart) return null;
  const L = clamp(+cycle.length||28,20,45), P = clamp(+cycle.periodLen||5,2,10);
  let diff = dayDiff(cycle.lastStart, dateStr);
  const raw = diff;
  if (diff < 0) diff = ((diff % L) + L) % L;
  const day = (diff % L) + 1, ov = L - 14;
  let key;
  if (day <= P) key = "mens"; else if (day < ov - 1) key = "foll"; else if (day <= ov + 1) key = "ovu"; else key = "lut";
  const curStart = addDays(cycle.lastStart, Math.floor(diff / L)*L);
  return { day, L, P, ov, key, late: key==="lut" && day > L-5, nextStart: addDays(curStart, L), ovDate: addDays(curStart, ov-1), overdue: raw >= L + 3 };
}

/* ---------- pourquoi je ressens ça : hormones et humeur, phase par phase ----------
   Sources dans SOURCES plus bas. Les effets sont des tendances moyennes : beaucoup de femmes ne ressentent presque rien, d'autres beaucoup. */
const SCIENCE = {
  mens:{
    hormones:"Œstrogènes et progestérone sont au plus bas. C'est justement la chute de la progestérone qui déclenche les règles.",
    items:[
      {t:"Fatigue, coup de mou", d:"Pour se détacher, la muqueuse de l'utérus libère des prostaglandines. Elles font contracter l'utérus (les crampes) et ont un effet inflammatoire dans tout le corps : fatigue, maux de tête, parfois nausées. Des règles abondantes font aussi perdre du fer, ce qui fatigue."},
      {t:"Humeur sensible", d:"Les œstrogènes soutiennent la sérotonine, une molécule du cerveau qui stabilise l'humeur. Ils sont au plus bas en début de règles : on peut se sentir plus à fleur de peau ou plus sensible à la douleur."},
      {t:"Soulagement", d:"Beaucoup de femmes se sentent mieux dès le 2e ou 3e jour : la tension d'avant les règles retombe, et les œstrogènes recommencent déjà à monter."},
      {t:"Bouger aide", d:"Une activité douce augmente la circulation dans le bassin et libère des endorphines, des antidouleurs naturels. Ça peut soulager les crampes."}
    ]},
  foll:{
    hormones:"Les œstrogènes montent jour après jour, alors que la progestérone reste basse.",
    items:[
      {t:"Plus d'énergie, meilleur moral", d:"Les œstrogènes augmentent la production de sérotonine (humeur) et de dopamine (motivation, plaisir, envie de nouveauté). Beaucoup de femmes se sentent plus légères et plus optimistes."},
      {t:"Envie de sortir, de voir du monde", d:"La dopamine pousse vers la nouveauté et les autres. On a souvent plus envie de tenter des choses, de se lancer des défis."},
      {t:"Douleur mieux supportée", d:"Avec plus de sérotonine et moins de prostaglandines, on tolère généralement mieux l'effort et l'inconfort."},
      {t:"Corps qui récupère vite", d:"Les œstrogènes aident à reconstruire le muscle après l'effort. C'est la phase où les grosses séances passent le mieux pour beaucoup de femmes."}
    ]},
  ovu:{
    hormones:"Pic d'œstrogènes, puis pic de LH qui déclenche l'ovulation. La testostérone monte aussi un peu.",
    items:[
      {t:"Confiance et libido au plus haut", d:"Œstrogènes au maximum et petite hausse de testostérone : c'est souvent le moment où on se sent la plus sûre de soi, la plus sociable, avec le plus de désir."},
      {t:"Pic d'énergie", d:"Pour beaucoup, c'est le haut du cycle en motivation et en force ressentie."},
      {t:"Petit creux juste après", d:"Juste après l'ovulation, les œstrogènes chutent un peu pendant 1 ou 2 jours. Certaines femmes ont alors un léger coup de mou ou une irritabilité passagère."},
      {t:"Pincement d'un côté", d:"Une petite douleur d'un côté du bas-ventre est possible au moment où l'ovule est libéré. C'est fréquent et sans gravité."}
    ]},
  lut:{
    hormones:"La progestérone domine. Les œstrogènes remontent un peu au milieu de la phase, puis les deux hormones chutent avant les règles.",
    items:[
      {t:"Calme, envie de cocon", d:"Le corps transforme la progestérone en alloprégnanolone. Cette molécule agit sur les récepteurs GABA du cerveau, comme un calmant naturel : on est plus posée, parfois somnolente."},
      {t:"Plus chaud, souffle plus court", d:"La progestérone fait monter la température du corps d'environ 0,3 à 0,5 °C et accélère un peu la respiration. On a plus chaud à l'effort et on s'essouffle plus vite."},
      {t:"Plus faim", d:"Le corps dépense un peu plus d'énergie au repos, et l'appétit suit, surtout pour le sucré. C'est normal."},
      {t:"À cran ou triste avant les règles", d:"En fin de phase, œstrogènes et progestérone chutent. La sérotonine baisse, et l'effet calmant de l'alloprégnanolone disparaît d'un coup : irritabilité, anxiété, larmes faciles, sommeil moins bon. C'est le SPM."},
      {t:"Pourquoi certaines plus que d'autres", d:"Les femmes qui ont un SPM fort n'ont pas plus d'hormones que les autres : leur cerveau est plus sensible aux variations normales (études du NIH). Ça n'est pas « dans la tête », c'est biologique."}
    ]}
};
const SCIENCE_HORMONAL = {
  hormones:"Avec une contraception hormonale qui bloque l'ovulation (pilule, implant, anneau, patch, injection…), les hormones restent à peu près stables tout le mois.",
  items:[
    {t:"Moins de hauts et de bas", d:"Les variations naturelles des œstrogènes et de la progestérone sont aplaties. Les phases décrites ici ne s'appliquent donc pas vraiment."},
    {t:"Ton ressenti d'abord", d:"C'est pour ça que l'app se base surtout sur tes réponses du jour. Si ton humeur a changé depuis que tu as commencé une contraception, parles-en à ton médecin ou ta sage-femme."}
  ]
};
/* Modes de contraception. h : 1 = hormones de synthèse qui aplatissent le cycle, 0 = cycle naturel,
   "?" = stérilet hormonal (agit surtout dans l'utérus : selon les femmes, l'ovulation continue ou non). */
const CONTRA = {
  aucune:{t:"Aucune", d:"Cycle naturel", h:0},
  barriere:{t:"Préservatif ou méthode barrière", d:"Préservatif, diaphragme, cape…", h:0},
  naturelle:{t:"Méthode naturelle", d:"Symptothermie, suivi des signes du cycle…", h:0},
  cuivre:{t:"Stérilet au cuivre", d:"Sans hormones", h:0},
  pilule:{t:"Pilule combinée", d:"Œstrogène + progestatif (avec ou sans pause)", h:1},
  micro:{t:"Pilule progestative", d:"Progestatif seul, en continu (ex. désogestrel)", h:1},
  anneau:{t:"Anneau ou patch", d:"Œstrogène + progestatif", h:1},
  implant:{t:"Implant", d:"Progestatif, dans le bras", h:1},
  diu:{t:"Stérilet hormonal", d:"Progestatif, dans l'utérus", h:"?"},
  injection:{t:"Injection", d:"Progestatif tous les 3 mois", h:1},
  autre:{t:"Autre méthode hormonale", d:"Ou je ne sais pas exactement", h:1}
};
function isHormonal(contra, diuCycle){ const c = CONTRA[contra]; if (!c) return false; return c.h==="?" ? !diuCycle : !!c.h; }
function contraOf(p){ return p.contra && CONTRA[p.contra] ? p.contra : (p.hormonal ? "autre" : "aucune"); }
/* Ce que change chaque méthode, affiché dans l'onglet Cycle. */
const CONTRA_INFO = {
  pilule:[{t:"Pas d'ovulation", d:"Les hormones de synthèse bloquent l'ovulation : pas de pic d'œstrogènes ni de vraie phase lutéale. La forme est en général assez stable tout le mois."},
    {t:"La semaine de pause", d:"Si tu fais une pause, les saignements viennent de l'arrêt des hormones (ce ne sont pas de « vraies » règles). Fatigue, maux de tête ou petite baisse de moral sont possibles ces jours-là : tu peux le dire dans le questionnaire du jour."}],
  anneau:[{t:"Comme la pilule combinée", d:"Mêmes hormones, diffusées en continu par la peau ou le vagin : l'ovulation est bloquée et les hormones restent stables."},
    {t:"La semaine sans", d:"Pendant la semaine sans anneau ou sans patch, les saignements viennent de l'arrêt des hormones. Un petit coup de fatigue est possible."}],
  micro:[{t:"Progestatif seul", d:"Selon la pilule, l'ovulation est bloquée (c'est le cas le plus souvent avec le désogestrel) ou pas à chaque fois."},
    {t:"Saignements imprévisibles", d:"Des saignements irréguliers, rares ou absents sont fréquents et ne sont pas un signe de problème. Le calendrier des phases ne s'applique donc pas."}],
  implant:[{t:"Ovulation bloquée", d:"L'implant libère un progestatif en continu : il n'y a plus de cycle hormonal classique."},
    {t:"Saignements variables", d:"Absents, rares, ou au contraire prolongés : c'est très variable d'une femme à l'autre. Si l'humeur, la peau ou les saignements te pèsent, parles-en à ton médecin ou ta sage-femme."}],
  injection:[{t:"Ovulation bloquée", d:"L'injection libère un progestatif pendant 3 mois : plus de cycle hormonal classique, souvent plus de règles du tout."},
    {t:"Les os aiment la muscu", d:"En usage long, cette méthode peut baisser un peu la densité des os. Les exercices avec charge sont justement parmi les meilleurs pour les garder solides."}],
  diu:[{t:"Il agit surtout dans l'utérus", d:"Le stérilet hormonal libère un progestatif à petite dose, surtout sur place. Selon le modèle et l'ancienneté, l'ovulation est bloquée ou continue : beaucoup de femmes gardent un cycle, surtout après la première année."},
    {t:"Tu as encore des règles ?", d:"Si oui (même légères), ton cycle tourne sans doute encore : l'app suit tes phases. Si tu n'as plus de règles, elle se base sur ton ressenti du jour. Tu peux changer ce choix dans ton profil."}],
  cuivre:[{t:"Aucune hormone", d:"Ton cycle reste entièrement naturel : les phases et les explications s'appliquent."},
    {t:"Règles plus fortes", d:"Le stérilet au cuivre rend souvent les règles plus abondantes et plus douloureuses, surtout les premiers mois. Pense au fer (la fatigue peut venir de là) et n'hésite pas à choisir une séance plus douce ces jours-là."}],
  naturelle:[{t:"Un calendrier indicatif", d:"Les phases de l'app sont calculées sur une durée moyenne de cycle. Elles ne remplacent pas ta méthode et ne doivent jamais servir à savoir si tu es fertile."}],
  autre:[{t:"Ton ressenti d'abord", d:"Avec des hormones de synthèse, les phases du cycle naturel ne s'appliquent pas vraiment : l'app se base surtout sur ton questionnaire du jour."}]
};
function contraInfoCard(p){
  const k = contraOf(p), info = CONTRA_INFO[k]; if (!info) return "";
  return `<div class="card"><div class="row between"><span class="label">Ta contraception</span><button class="linkbtn" data-act="go-profile">Changer</button></div><h3>${esc(CONTRA[k].t)}</h3><ul class="sci">${info.map(x=>`<li><b>${x.t}</b><span>${x.d}</span></li>`).join("")}</ul></div>`;
}
/* Liste des méthodes, partagée par les questions de profil (act "onb") et la page Profil (act "pf"). */
function contraField(d, act){
  const k = contraOf(d), set = d.contra!=null;
  let h = `<div class="opts">${Object.entries(CONTRA).map(([c,v])=>`<button class="opt" data-act="${act}" data-k="contra" data-v="${c}" ${c==="diu"?'data-stay="1"':""} aria-pressed="${set && k===c}"><b>${v.t}</b><span>${v.d}</span></button>`).join("")}</div>`;
  if (set && k==="diu") h += `<span class="label">Tu as encore des règles, même légères ?</span><div class="chips">${[["1","Oui, à peu près chaque mois"],["0","Non, ou presque jamais"]].map(([v,t])=>`<button class="chip" data-act="${act}" data-k="diuCycle" data-bool="1" data-v="${v}" aria-pressed="${d.diuCycle!=null && !!d.diuCycle===(v==="1")}">${t}</button>`).join("")}</div>`;
  return h;
}

/* Explication courte de l'humeur choisie dans le questionnaire du jour, selon la phase. */
const MOOD_GROUP = {top:"pos", bien:"pos", bof:"bof", plat:"plat", irritable:"irritable", triste:"triste"};
const MOOD_WHY = {
  mens:{pos:"Rien d'étonnant : la tension d'avant les règles est retombée, et les œstrogènes recommencent déjà à monter.",
    bof:"Les hormones sont au plus bas et le corps travaille (les crampes viennent des prostaglandines, qui fatiguent aussi). Un « bof » est très courant ces jours-ci.",
    plat:"Prostaglandines (effet inflammatoire) et perte de fer fatiguent pendant les règles. Ça passe souvent dès le 2e ou 3e jour.",
    irritable:"Douleurs et fatigue rendent moins patiente. Bouger doucement libère des endorphines qui peuvent aider.",
    triste:"Les œstrogènes, qui soutiennent la sérotonine (l'humeur), sont au plus bas en début de règles. Être plus sensible est normal et passager."},
  foll:{pos:"Les œstrogènes montent et boostent sérotonine et dopamine : humeur, motivation et envie de nouveauté. Profite-en !",
    bof:"La phase folliculaire n'est pas magique pour tout le monde. Le sommeil, le stress et la journée comptent souvent plus que les hormones.",
    plat:"Ici les hormones devraient plutôt te porter : regarde du côté du sommeil, de l'alimentation ou d'un virus qui traîne.",
    irritable:"Les œstrogènes devraient plutôt t'aider. C'est sans doute ta journée ou ta fatigue qui parlent : la séance peut servir de soupape.",
    triste:"À ce moment du cycle, les hormones ne l'expliquent pas vraiment. Si ça dure, parles-en à quelqu'un de confiance."},
  ovu:{pos:"Pic d'œstrogènes et petite hausse de testostérone : c'est souvent le sommet du cycle en énergie et en confiance.",
    bof:"Juste après l'ovulation, les œstrogènes chutent brièvement : ça peut donner un petit creux d'un ou deux jours.",
    plat:"Le petit creux d'œstrogènes juste après l'ovulation fatigue certaines femmes. Le sommeil compte aussi beaucoup.",
    irritable:"La baisse brève des œstrogènes après l'ovulation peut rendre plus irritable pendant un jour ou deux.",
    triste:"Ce n'est pas typique de cette phase : regarde du côté du sommeil et du stress. Si ça dure, parles-en."},
  lut:{pos:"La progestérone a un effet apaisant (via l'alloprégnanolone, qui calme le cerveau). Beaucoup se sentent bien en début de phase lutéale.",
    bof:"La progestérone rend plus calme, parfois un peu ramollie, et fait monter la température du corps : on a vite chaud et on s'essouffle plus.",
    plat:"Progestérone haute = corps plus chaud, sommeil parfois moins profond, besoin de plus d'énergie. La fatigue est fréquente en phase lutéale.",
    irritable:"En fin de cycle, la chute de la progestérone retire son effet calmant, et la sérotonine baisse : être à cran est un classique du SPM.",
    triste:"Avant les règles, œstrogènes et progestérone chutent et la sérotonine baisse : les larmes viennent plus facilement. Ça passe en général avec les règles."}
};
const SOURCES = [
  ["Schmidt et al., NEJM 1998, et NIH 2017 : le SPM fort vient d'une sensibilité aux variations hormonales normales","https://www.nih.gov/news-events/news-releases/sex-hormone-sensitive-gene-complex-linked-premenstrual-mood-disorder"],
  ["Frontiers in Pharmacology 2025 : hormones du cycle, sérotonine, GABA et alloprégnanolone","https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2025.1528544/pdf"],
  ["Romans et al., Gender Medicine 2012 : revue de 47 études sur l'humeur au fil du cycle","https://cihr-irsc.gc.ca/e/documents/igh_mythbuster_pms-en.pdf"],
  ["Weill Cornell : alloprégnanolone et psychiatrie de la reproduction","https://vivo.weill.cornell.edu/display/pubid30701996"],
  ["IAPMD : progestérone et TDPM (trouble dysphorique prémenstruel)","https://iapmd.org/progesterone"]
];
/* Courbes indicatives (forme moyenne d'un cycle), de 0 à 1. */
function hormoneCurves(L){
  const ov = L - 14, g = (x, m, s) => Math.exp(-((x-m)*(x-m))/(2*s*s));
  const E = [], P = [];
  for (let d=1; d<=L; d++){
    const e1 = d <= ov-1 ? g(d, ov-1, Math.max(3, (ov-1)/2.6)) : g(d, ov-1, 1.3);
    E.push(.12 + .82*e1 + .42*g(d, ov+7, 3.2));
    P.push(.05 + .9*g(d, ov+7, 3.3));
  }
  return {E, P};
}

/* ---------- options ---------- */
const PERSONAS = {
  competitrice:{t:"La compétitrice", d:"Records, défis, chiffres qui montent."},
  zen:{t:"La zen", d:"Bouger pour se sentir bien, sans pression."},
  fun:{t:"La fun", d:"Il faut que ça bouge et que ça change."},
  methodique:{t:"La méthodique", d:"Un plan clair, des charges précises."},
  aventuriere:{t:"L'aventurière", d:"Toujours envie de tester des exos nouveaux."}
};
const GOALS = {force:"Devenir plus forte", tonus:"Tonifier / dessiner", seche:"Perdre du gras", cardio:"Cardio & endurance", bienetre:"Bien-être & régularité"};
const LEVELS = {debutante:"Débutante (moins de 6 mois)", inter:"Intermédiaire (6 mois – 2 ans)", confirmee:"Confirmée (2 ans et plus)"};
const ZONES = {fessiers:"Fessiers", jambes:"Jambes", dos:"Dos", bras:"Bras", epaules:"Épaules", abdos:"Abdos"};
const MOODS = [{k:"top",t:"Au top",v:1},{k:"bien",t:"Bien",v:.5},{k:"bof",t:"Bof",v:0},{k:"plat",t:"À plat",v:-.6},{k:"irritable",t:"À cran",v:-.4},{k:"triste",t:"Triste / sensible",v:-.5}];
const SYMPTOMS = {crampes:"Crampes", ventre:"Ventre gonflé", tete:"Mal de tête", dos:"Mal de dos", seins:"Poitrine sensible", fatigue:"Fatigue lourde", rien:"Rien de spécial"};
const PREFS = {libre:{t:"Poids libres", d:"Barres, haltères, disques"}, machine:{t:"Machines", d:"Guidé, rassurant, réglable"}, mix:{t:"Un mélange", d:"Le meilleur des deux"}};
const EQUIP = {rack:"Barres olympiques et disques (rack)", smith:"Smith machine (barre guidée)", hipm:"Machine à hip thrust", presse:"Presse à cuisses", poulie:"Poulies / vis-à-vis", machines:"Machines guidées (leg curl, abduction…)", halt:"Haltères"};
/* Équipement habituel par type de salle : ça varie d'un club à l'autre, la personne coche ce qu'il y a vraiment. */
const GYMS = {
  basicfit:{t:"Basic-Fit", e:{rack:1,smith:1,hipm:0,presse:1,poulie:1,machines:1,halt:1}, max:40},
  fitnesspark:{t:"Fitness Park", e:{rack:1,smith:1,hipm:1,presse:1,poulie:1,machines:1,halt:1}, max:50},
  onair:{t:"On Air", e:{rack:1,smith:1,hipm:1,presse:1,poulie:1,machines:1,halt:1}, max:50},
  neoness:{t:"Neoness", e:{rack:1,smith:1,hipm:0,presse:1,poulie:1,machines:1,halt:1}, max:40},
  keepcool:{t:"Keep Cool", e:{rack:0,smith:1,hipm:0,presse:1,poulie:1,machines:1,halt:1}, max:30},
  orangebleue:{t:"L'Orange Bleue", e:{rack:0,smith:1,hipm:0,presse:1,poulie:1,machines:1,halt:1}, max:30},
  autre:{t:"Autre chaîne", e:{rack:1,smith:1,hipm:0,presse:1,poulie:1,machines:1,halt:1}, max:40},
  indep:{t:"Salle indépendante", e:{rack:1,smith:0,hipm:0,presse:1,poulie:1,machines:1,halt:1}, max:40}
};

/* ---------- exercise library ----------
   Each exercise has variants; the engine picks one the gym has, ordered by preference.
   eq: barre (total, barre 20 kg comprise) · smith (disques, barre guidée non comptée) · halt (par main) · halt1 (un haltère) · machine · presse · poulie · pdc
   r: starting load as a fraction of body weight for ~10 reps [débutante, intermédiaire, confirmée]. ill: drawing [pose, gear]. */
const V = (k,n,eq,need,r,ill,easy) => ({k,n,eq,need,r,ill,easy});
const LIB = {
  hip:{z:["fessiers"], v:[V("libre","Hip thrust à la barre","barre","rack",[.5,.9,1.3],["hip","plate"]), V("machine","Hip thrust à la machine","machine","hipm",[.6,.9,1.2],["hip","pad"],1), V("machine","Hip thrust à la Smith machine","smith","smith",[.4,.75,1.1],["hip","smith"]), V("libre","Hip thrust haltère au banc","halt1","halt",[.2,.3,.4],["hip","db"],1)]},
  squat:{z:["jambes","fessiers"], v:[V("libre","Squat à la barre","barre","rack",[.4,.6,.9],["backsquat","plate"]), V("machine","Squat à la Smith machine","smith","smith",[.3,.5,.75],["backsquat","smith"]), V("libre","Goblet squat (haltère)","halt1","halt",[.15,.22,.3],["squat","goblet"],1)]},
  rdl:{z:["fessiers","jambes"], v:[V("libre","Soulevé de terre roumain (barre)","barre","rack",[.35,.6,.85],["hinge","plate"]), V("libre","Soulevé de terre roumain haltères","halt","halt",[.12,.2,.28],["hinge","db"],1), V("machine","Pull-through à la poulie","poulie","poulie",[.15,.25,.35],["pullthrough","cable"])]},
  bulg:{z:["fessiers","jambes"], v:[V("libre","Fentes bulgares haltères","halt","halt",[.05,.1,.15],["bulg","db"]), V("machine","Fentes bulgares à la Smith machine","smith","smith",[.15,.3,.45],["bulg","smith"])]},
  presse:{z:["jambes"], v:[V("machine","Presse à cuisses","presse","presse",[.8,1.3,2],["press","plate"],1), V("libre","Fentes marchées haltères","halt","halt",[.05,.08,.12],["lunge","db"])]},
  abd:{z:["fessiers"], v:[V("machine","Abduction à la machine","machine","machines",[.4,.6,.8],["abd","pad"],1), V("machine","Abduction à la poulie basse","poulie","poulie",[.04,.07,.1],["kick","cable"]), V("libre","Marche latérale avec élastique","pdc",null,null,["walk","band"])]},
  legcurl:{z:["jambes"], v:[V("machine","Leg curl allongé","machine","machines",[.2,.3,.4],["curlprone","pad"],1), V("libre","Leg curl haltère allongée","halt1","halt",[.05,.08,.12],["curlprone","db"]), V("libre","Pont fessier une jambe, pieds sur banc","pdc",null,null,["bridge","bench"])]},
  kick:{z:["fessiers"], v:[V("machine","Kickback à la poulie","poulie","poulie",[.05,.1,.15],["kick","cable"],1), V("libre","Kickback au sol avec élastique","pdc",null,null,["kickfloor","band"])]},
  tirage:{z:["dos"], v:[V("machine","Tirage vertical","poulie","poulie",[.35,.5,.65],["pulldown","cable"],1), V("libre","Rowing haltère un bras","halt1","halt",[.1,.16,.22],["row1","db"])]},
  row:{z:["dos"], v:[V("machine","Rowing assis à la poulie","poulie","poulie",[.3,.45,.6],["seatrow","cable"],1), V("libre","Rowing barre buste penché","barre","rack",[.3,.45,.6],["bentrow","plate"]), V("libre","Rowing haltères buste penché","halt","halt",[.06,.1,.14],["bentrow","db"])]},
  bench:{z:["epaules","bras"], v:[V("libre","Développé couché haltères","halt","halt",[.08,.13,.2],["benchpress","db"]), V("machine","Développé couché à la machine","machine","machines",[.25,.4,.55],["chestpress","pad"],1), V("libre","Développé couché barre","barre","rack",[.35,.5,.7],["benchpress","plate"])]},
  ohp:{z:["epaules"], v:[V("libre","Développé militaire haltères","halt","halt",[.06,.1,.14],["ohp","db"]), V("machine","Développé épaules à la machine","machine","machines",[.2,.3,.4],["ohpseat","pad"],1)]},
  lat:{z:["epaules"], v:[V("libre","Élévations latérales haltères","halt","halt",[.03,.045,.06],["latraise","db"],1), V("machine","Élévations latérales à la poulie","poulie","poulie",[.025,.04,.05],["latraise","cable"])]},
  face:{z:["dos","epaules"], v:[V("machine","Face pull à la poulie","poulie","poulie",[.12,.18,.25],["facepull","cable"],1), V("libre","Oiseau haltères buste penché","halt","halt",[.03,.045,.06],["revfly","db"])]},
  curl:{z:["bras"], v:[V("libre","Curl biceps haltères","halt","halt",[.06,.09,.12],["curl","db"],1), V("machine","Curl biceps à la poulie","poulie","poulie",[.1,.15,.2],["curl","cable"])]},
  tri:{z:["bras"], v:[V("machine","Extension triceps à la poulie","poulie","poulie",[.12,.18,.25],["pushdown","cable"],1), V("libre","Extension triceps haltère au-dessus de la tête","halt1","halt",[.08,.12,.16],["triover","db"])]},
  pompes:{z:["bras","epaules"], v:[V("libre","Pompes (sur un banc si besoin)","pdc",null,null,["pushup",""])]},
  planche:{z:["abdos"], timed:1, v:[V("libre","Planche sur les avant-bras","pdc",null,null,["plank",""])]},
  deadbug:{z:["abdos"], timed:1, v:[V("libre","Dead bug","pdc",null,null,["deadbug",""])]},
  sideplank:{z:["abdos"], timed:1, v:[V("libre","Gainage latéral","pdc",null,null,["sideplank",""])]},
  pallof:{z:["abdos"], v:[V("machine","Pallof press à la poulie","poulie","poulie",[.08,.12,.15],["pallof","cable"],1), V("libre","Pallof press à l'élastique","pdc",null,null,["pallof","band"])]}
};
/* Toutes les versions d'exercices, rangées par matériel, pour pouvoir exclure celles qu'on n'aime pas. */
const BAN_GROUPS = [["Machines guidées", v=>["machine","presse","smith"].includes(v.eq)],["Poulies", v=>v.eq==="poulie"],["Barre", v=>v.eq==="barre"],["Haltères", v=>v.eq==="halt"||v.eq==="halt1"],["Poids du corps et élastique", v=>v.eq==="pdc"]];
function allVariants(){ const seen = new Set(), out = []; Object.values(LIB).forEach(L=>L.v.forEach(v=>{ if (!seen.has(v.n)) { seen.add(v.n); out.push(v); } })); return out; }
const TIMED_DETAIL = {planche:"3 × 30–40 s", deadbug:"3 × 8 par côté, lentement", sideplank:"2 × 25–30 s par côté"};
const SPLITS = {
  bas:{main:["hip","squat","rdl"], acc:["bulg","presse","abd","legcurl","kick"], core:["deadbug","sideplank"]},
  haut:{main:["tirage","bench","row"], acc:["ohp","lat","face","curl","tri"], core:["planche","pallof"]},
  full:{main:["squat","hip","tirage","bench"], acc:["row","rdl","pompes","bulg","face"], core:["planche","deadbug"]}
};
const LVL = {debutante:0, inter:1, confirmee:2};

/* ---------- loads & progression ---------- */
function roundLoad(kg, eq){
  if (eq==="barre") return Math.max(20, Math.round(kg/2.5)*2.5);
  if (eq==="halt"||eq==="halt1") return kg<10 ? Math.max(1, Math.round(kg)) : Math.round(kg/2)*2;
  if (eq==="presse") return Math.max(20, Math.round(kg/5)*5);
  if (eq==="smith") return Math.max(0, Math.round(kg/2.5)*2.5);
  return Math.max(2.5, Math.round(kg/2.5)*2.5);
}
function stepOf(kg, eq){ return eq==="presse" ? 5 : (eq==="halt"||eq==="halt1") ? (kg<10?1:2) : 2.5; }
function repFactor(lo,hi){ return 1 + (10 - (lo+hi)/2)*0.03; }
function loadLabel(eq){
  return {barre:"au total, barre de 20 kg comprise", smith:"de disques, barre guidée non comptée", halt:"par main, un haltère dans chaque main", halt1:"un seul haltère", presse:"de disques, sans le chariot", poulie:"sur la poulie", machine:"sur la machine"}[eq] || "";
}
function getLift(name){
  const v = S.lifts[name]; if (v==null) return null;
  return typeof v==="number" ? {kg:v, lo:8, hi:10, sets:[], hist:[]} : v;
}
/* Double progression: keep the load until every set reaches the top of the rep range, then go up one step. */
function recommend(it, ctx){
  const last = getLift(it.name), f = repFactor(it.lo, it.hi);
  if (!last) {
    const kg = roundLoad((ctx.bw||60) * (it.r||0) * f * (it.tagNew&&ctx.lvl>0?0.85:1) * (ctx.tier===2?0.9:1), it.eq);
    return {kg, first:true, reason:"Première fois : charge estimée selon ton niveau et ton poids. Fais une série d'essai de "+it.lo+" reps. Trop facile : monte d'un cran. Trop dur : descends."};
  }
  const sets = last.sets||[], lo0 = last.lo||8, hi0 = last.hi||10, lastF = repFactor(lo0, hi0);
  const sameRange = Math.abs((lo0+hi0)/2 - (it.lo+it.hi)/2) <= 2;
  const step = stepOf(last.kg, it.eq);
  if (!sameRange || !sets.length) {
    const kg = roundLoad(last.kg * f/lastF, it.eq);
    return {kg, reason: sameRange ? "Même charge que la dernière fois. Note tes reps à chaque série : c'est ce qui me dit quand monter." : "Charge recalculée pour faire "+it.lo+"–"+it.hi+" reps (dernière fois : "+fr(last.kg)+" kg en "+lo0+"–"+hi0+")."};
  }
  const reps = sets.map(s=>+s.reps||0), avg = reps.reduce((a,b)=>a+b,0)/reps.length;
  const hitTop = reps.every(r=>r >= hi0), miss = reps.some(r=>r < lo0), bad = avg < lo0 - 2;
  const base = roundLoad(last.kg * f/lastF, it.eq);
  if (hitTop && ctx.allowUp) return {kg: roundLoad(base + step, it.eq), up:true, reason:"Dernière fois : "+reps.join(" / ")+" reps, le haut de la fourchette partout. On monte de "+fr(step)+" kg."};
  if (hitTop) return {kg:base, reason:"Tu étais prête à monter, mais vu ta forme du jour on garde la charge. On montera à la prochaine."};
  if (bad) return {kg: roundLoad(base*0.9, it.eq), reason:"Dernière fois c'était trop lourd ("+reps.join(" / ")+" reps). On baisse d'environ 10 % pour bien faire le mouvement."};
  if (miss) return {kg:base, reason:"Même charge. Objectif : au moins "+it.lo+" reps à chaque série (dernière fois "+reps.join(" / ")+")."};
  return {kg:base, reason:"Même charge. Ajoute 1 rep par série (dernière fois "+reps.join(" / ")+"). Quand tu fais "+it.hi+" partout, on monte."};
}
function gymOf(p){
  const g = p.gym || {}; const d = GYMS[g.chain||"basicfit"] || GYMS.basicfit;
  return {chain:g.chain||"basicfit", equip:Object.assign({}, d.e, g.equip||{}), max:+g.max||d.max, pref:g.pref||"mix"};
}
function chooseVariant(id, ctx, useAlt){
  const L = LIB[id], eqp = ctx.gym.equip;
  const avail = L.v.map((v,i)=>({v,i})).filter(o=>(!o.v.need || eqp[o.v.need]) && !(ctx.banned && ctx.banned.has(o.v.n)));
  if (!avail.length) return null;
  const score = o => {
    let s = o.i*0.01;
    if (ctx.gym.pref==="libre" && o.v.k!=="libre") s += 1;
    if (ctx.gym.pref==="machine" && o.v.k!=="machine") s += 1;
    if (ctx.deb && o.v.easy) s -= .6;
    if (o.v.eq==="pdc" && avail.length>1) s += 1.5;
    if (ctx.crowded && (o.v.need==="halt" || !o.v.need)) s -= 1.2;
    return s;
  };
  avail.sort((a,b)=>score(a)-score(b));
  let chosen = avail[0].v, isNew = false;
  if (useAlt) { const o = avail.slice(1).find(o=>o.v.eq!=="pdc" && !S.lifts[o.v.n]) || avail.slice(1).find(o=>!S.lifts[o.v.n]); if (o) { chosen = o.v; isNew = true; } }
  return {v:chosen, isNew};
}

/* ---------- illustrations ----------
   Line drawings: white skin, black top and shorts, outlined sneakers, halftone-dot weights. Poses are joint maps on a 200×160 board. */
const OUT = 2.4, INK = "#111", SKIN = "#fff";
const L2 = (a,b,t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
function cap(a,b,w,fill){
  const s = `x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-linecap="round"`;
  return fill===INK ? `<line ${s} stroke="${INK}" stroke-width="${w+OUT}"/>` : `<line ${s} stroke="${INK}" stroke-width="${w+OUT*2}"/><line ${s} stroke="${fill}" stroke-width="${w}"/>`;
}
function shoe(ank, dir){
  const len = Math.hypot(dir[0],dir[1])||1, ux=dir[0]/len, uy=dir[1]/len;
  const a = [ank[0]-ux*3, ank[1]-uy*3+2], b = [ank[0]+ux*13, ank[1]+uy*13+2];
  const m = L2(a,b,.45);
  return cap(a,b,9,SKIN) + `<path d="M${m[0]-uy*3} ${m[1]+ux*3-3} l${ux*4} ${uy*4-2} M${m[0]+ux*3-uy*3} ${m[1]+uy*3+ux*3-3} l${ux*3} ${uy*3-2}" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
}
function head(h, f, rot){
  const [x,y] = h; let g = `<g transform="rotate(${rot||0} ${x} ${y})">`;
  g += `<circle cx="${x}" cy="${y}" r="10" fill="${SKIN}" stroke="${INK}" stroke-width="${OUT}"/>`;
  if (f===0) {
    g += `<path d="M${x-10} ${y-1} Q${x-9} ${y-13} ${x} ${y-12} Q${x+9} ${y-13} ${x+10} ${y-1}" fill="none" stroke="${INK}" stroke-width="2"/>`;
    g += `<circle cx="${x-3.5}" cy="${y+1}" r="1.1" fill="${INK}"/><circle cx="${x+3.5}" cy="${y+1}" r="1.1" fill="${INK}"/><path d="M${x-2} ${y+5.5}h4" stroke="${INK}" stroke-width="1.3"/>`;
  } else {
    g += `<path d="M${x+7*f} ${y-7} Q${x-2*f} ${y-14} ${x-10*f} ${y-4} Q${x-12*f} ${y+4} ${x-9*f} ${y+9}" fill="none" stroke="${INK}" stroke-width="2"/>`;
    g += `<path d="M${x-10*f} ${y-3} q${-6*f} 3 ${-5*f} 12" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
    g += `<circle cx="${x+5*f}" cy="${y}" r="1.1" fill="${INK}"/><path d="M${x+9.5*f} ${y+1} l${-1.5*f} 3" stroke="${INK}" stroke-width="1.3" fill="none"/>`;
  }
  return g + `</g>`;
}
function arm(a){ const [s,e,h] = a; return cap(s,e,9,SKIN)+cap(s,L2(s,e,.42),12,INK)+cap(e,h,8,SKIN)+`<circle cx="${h[0]}" cy="${h[1]}" r="4.4" fill="${SKIN}" stroke="${INK}" stroke-width="${OUT}"/>`; }
function leg(l){ const [s,k,a,t] = l; return cap(s,k,14,SKIN)+cap(k,a,10.5,SKIN)+shoe(a,t||[1,0])+cap(s,L2(s,k,.4),17,INK); }
function torso(P){
  const w = P.tw||22, sh = P.sh, hip = P.hip;
  return cap(sh, L2(sh,hip,.5), 8, SKIN) /* neck base hidden by shirt */
    + cap(L2(sh,hip,.5), hip, w-2, SKIN)
    + cap(sh, L2(sh,hip,.6), w, INK)
    + `<circle cx="${hip[0]}" cy="${hip[1]}" r="${w/2+2}" fill="${INK}"/>`;
}
function neck(P){ return cap(P.sh, L2(P.sh, P.head, .7), 7.5, SKIN); }
/* gear */
function db(c, ang, s){
  s = s||1; const [x,y] = c;
  return `<g transform="translate(${x} ${y}) rotate(${ang||0}) scale(${s})"><rect x="-8" y="-2" width="16" height="4" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/><rect x="5" y="-8" width="8" height="16" rx="2" fill="url(#ht)" stroke="${INK}" stroke-width="2"/><rect x="-13" y="-8" width="8" height="16" rx="2" fill="url(#ht)" stroke="${INK}" stroke-width="2"/></g>`;
}
function plate(c, r){
  const [x,y] = c;
  return `<circle cx="${x-5}" cy="${y-2}" r="${r}" fill="url(#ht)" stroke="${INK}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#ht)" stroke="${INK}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="3.6" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/>`;
}
function bench(x1,x2,y){ return `<rect x="${x1+6}" y="${y+6}" width="5" height="${148-y-6}" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/><rect x="${x2-11}" y="${y+6}" width="5" height="${148-y-6}" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/><rect x="${x1}" y="${y}" width="${x2-x1}" height="7" rx="3" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`; }
function column(x){ return `<rect x="${x}" y="8" width="13" height="140" rx="2" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/><rect x="${x+2}" y="112" width="9" height="30" fill="url(#ht)" stroke="${INK}" stroke-width="1.4"/>`; }
function cable(a,b){ return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${INK}" stroke-width="1.5"/>`; }
function padR(x,y,w,h){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#ht)" stroke="${INK}" stroke-width="2"/>`; }
function band(a,b){ return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${INK}" stroke-width="3.5" stroke-dasharray="2.5 2.5"/>`; }
function rails(x){ return `<line x1="${x-14}" y1="6" x2="${x-14}" y2="148" stroke="${INK}" stroke-width="1.6"/><line x1="${x+14}" y1="6" x2="${x+14}" y2="148" stroke="${INK}" stroke-width="1.6"/>`; }
const STAND = (x) => ({hip:[x,94], sh:[x,55], head:[x+3,37], legs:[[[x-2,94],[x-3,119],[x-3,142],[-12,0]].map((p,i)=>i===3?p:p), [[x+1,94],[x+2,119],[x+2,142],[13,0]]]});
const POSES = {
  squat:g=>({f:1, hip:[86,104], sh:[98,66], head:[103,48],
    legs:[[[86,104],[112,101],[106,139],[14,0]], [[88,106],[117,104],[111,141],[14,0]]],
    arms:[[[98,66],[108,88],[114,72]], [[100,67],[112,90],[118,72]]], mid:db([118,74],90,1.25)}),
  backsquat:g=>({f:1, hip:[82,104], sh:[100,68], head:[108,52],
    legs:[[[82,104],[108,101],[102,139],[14,0]], [[84,106],[113,104],[107,141],[14,0]]],
    arms:[[[100,68],[88,74],[96,60]], [[101,69],[90,77],[99,61]]], back:(g==="smith"?rails(96):"")+plate([94,64],g==="smith"?16:19)}),
  hip:g=>({f:1, hip:[100,104], sh:[60,100], head:[46,93], rot:-20,
    legs:[[[100,104],[128,102],[130,140],[13,0]], [[102,106],[132,104],[135,141],[13,0]]],
    arms:[[[60,100],[78,112],[96,100]], [[62,101],[80,114],[99,102]]],
    back:bench(18,72,108)+(g==="smith"?rails(100):""),
    front: g==="pad" ? padR(82,90,36,11)+`<line x1="100" y1="101" x2="100" y2="148" stroke="${INK}" stroke-width="3"/>` : g==="db" ? db([100,97],0,1.15) : plate([100,98], g==="smith"?17:21)}),
  hinge:g=>({f:1, hip:[84,84], sh:[120,64], head:[135,56],
    legs:[[[84,84],[90,113],[88,141],[14,0]], [[86,86],[94,114],[93,142],[14,0]]],
    arms:[[[120,64],[118,86],[117,106]], [[121,65],[121,87],[121,107]]],
    front: g==="db" ? db([120,108],0,.9) : plate([120,110],18)}),
  pullthrough:g=>({f:1, hip:[94,88], sh:[128,72], head:[143,66],
    legs:[[[94,88],[96,116],[92,142],[14,0]], [[96,90],[104,117],[104,142],[14,0]]],
    arms:[[[128,72],[116,92],[100,116]], [[129,73],[118,94],[103,117]]],
    back:column(8)+cable([20,140],[100,116])}),
  bulg:g=>({f:1, hip:[86,96], sh:[90,57], head:[94,39],
    legs:[[[86,96],[76,124],[50,108],[-12,-3]], [[88,98],[114,110],[112,141],[14,0]]],
    arms:[[[90,57],[90,80],[91,100]], [[92,58],[93,81],[95,101]]],
    back:bench(20,62,112)+(g==="smith"?rails(90):""),
    front: g==="smith" ? plate([90,56],15) : db([93,103],0,.9)}),
  lunge:g=>({f:1, hip:[86,98], sh:[90,59], head:[94,41],
    legs:[[[86,98],[74,128],[52,140],[-6,-6]], [[88,100],[114,112],[112,142],[14,0]]],
    arms:[[[90,59],[90,82],[91,102]], [[92,60],[93,83],[95,103]]], front:db([93,105],0,.9)}),
  press:g=>({f:1, hip:[76,120], sh:[58,84], head:[51,66], rot:-15,
    legs:[[[76,120],[98,96],[126,84],[2,-14]], [[78,122],[102,99],[130,87],[2,-14]]],
    arms:[[[58,84],[70,104],[82,120]], [[60,85],[72,106],[84,121]]],
    back:cap([44,130],[62,70],12,SKIN)+padR(46,124,40,10)+`<line x1="40" y1="134" x2="40" y2="148" stroke="${INK}" stroke-width="3"/>`,
    front:padR(136,56,10,48)+plate([164,76],14)}),
  abd:g=>({f:0, tw:28, hip:[100,106], sh:[100,68], head:[100,48],
    legs:[[[92,108],[70,118],[72,145],[-6,1]], [[108,108],[130,118],[128,145],[6,1]]],
    arms:[[[88,70],[80,94],[84,110]], [[112,70],[120,94],[116,110]]],
    back:padR(78,112,44,9), front:padR(54,106,10,24)+padR(136,106,10,24)}),
  curlprone:g=>({f:-1, hip:[110,100], sh:[64,100], head:[46,98], rot:-80,
    legs:[[[110,100],[140,99],[146,70],[10,-2]], [[112,102],[143,101],[150,73],[10,-2]]],
    arms:[[[64,100],[56,114],[46,118]], [[66,101],[58,116],[48,120]]],
    back:bench(40,165,108), front: g==="db" ? db([150,62],90,.9) : `<circle cx="152" cy="66" r="6" fill="url(#ht)" stroke="${INK}" stroke-width="2"/>`}),
  bridge:g=>({f:1, hip:[94,116], sh:[52,134], head:[36,132], rot:-75,
    legs:[[[94,116],[122,104],[140,116],[12,-1]], [[96,118],[118,90],[146,74],[10,-6]]],
    arms:[[[52,134],[66,144],[86,145]], [[54,135],[68,146],[88,146]]], back:bench(132,182,118)}),
  kick:g=>({f:-1, hip:[100,90], sh:[72,62], head:[62,47],
    legs:[[[100,90],[100,117],[98,142],[-13,0]], [[102,92],[124,104],[150,98],[4,10]]],
    arms:[[[72,62],[54,76],[36,80]], [[74,64],[56,79],[37,85]]],
    back:column(12)+cable([24,138],[150,100])}),
  kickfloor:g=>({f:-1, hip:[112,104], sh:[66,106], head:[52,98],
    legs:[[[112,104],[114,138],[140,142],[4,-6]], [[114,106],[138,94],[164,80],[8,-6]]],
    arms:[[[66,106],[66,124],[66,142]], [[68,107],[70,125],[71,143]]], front:band([116,136],[160,82])}),
  pulldown:g=>({f:1, hip:[88,112], sh:[92,72], head:[96,54],
    legs:[[[88,112],[116,110],[117,142],[14,0]], [[90,114],[120,112],[121,143],[14,0]]],
    arms:[[[92,72],[96,50],[100,30]], [[94,73],[99,51],[104,31]]],
    back:padR(60,116,48,8)+`<line x1="84" y1="124" x2="84" y2="148" stroke="${INK}" stroke-width="3"/>`+cable([102,30],[102,4]),
    front:`<line x1="74" y1="30" x2="132" y2="30" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`+padR(108,98,22,8)}),
  row1:g=>({f:1, hip:[76,84], sh:[118,80], head:[134,74],
    legs:[[[76,84],[72,112],[68,142],[14,0]], [[78,86],[88,113],[92,142],[14,0]]],
    arms:[[[118,80],[124,98],[130,116]], [[116,80],[104,70],[110,90]]],
    back:bench(120,180,118), front:db([110,94],0,.9)}),
  bentrow:g=>({f:1, hip:[82,86], sh:[120,70], head:[136,64],
    legs:[[[82,86],[88,114],[86,142],[14,0]], [[84,88],[92,115],[91,142],[14,0]]],
    arms:[[[120,70],[110,82],[118,98]], [[121,71],[112,84],[121,99]]],
    front: g==="db" ? db([120,100],0,.9) : plate([120,100],17)}),
  seatrow:g=>({f:1, hip:[70,122], sh:[74,84], head:[78,66],
    legs:[[[70,122],[98,108],[124,120],[2,-12]], [[72,124],[101,111],[127,123],[2,-12]]],
    arms:[[[74,84],[62,100],[84,102]], [[76,85],[64,102],[86,104]]],
    back:padR(36,128,64,8)+`<line x1="60" y1="136" x2="60" y2="148" stroke="${INK}" stroke-width="3"/>`,
    front:padR(130,98,8,30)+cable([86,103],[176,103])+column(176)}),
  benchpress:g=>({f:1, hip:[112,108], sh:[64,106], head:[46,104], rot:-85,
    legs:[[[112,108],[136,104],[140,142],[13,0]], [[114,110],[132,107],[134,143],[13,0]]],
    arms:[[[64,106],[60,86],[64,64]], [[66,107],[64,87],[68,65]]],
    back:bench(34,150,114), front: g==="db" ? db([66,62],0,.95) : plate([66,62],16)}),
  chestpress:g=>({f:1, hip:[76,116], sh:[74,76], head:[78,58],
    legs:[[[76,116],[104,114],[104,142],[14,0]], [[78,118],[108,116],[108,143],[14,0]]],
    arms:[[[74,76],[94,84],[116,80]], [[76,77],[96,86],[118,82]]],
    back:cap([58,120],[60,66],12,SKIN)+padR(52,118,44,9), front:padR(116,70,7,20)}),
  ohp:g=>Object.assign(STAND(100), {f:1, arms:[[[100,55],[104,35],[106,15]], [[98,56],[100,36],[101,16]]], front:db([104,13],0,.9)}),
  ohpseat:g=>({f:1, hip:[88,112], sh:[90,72], head:[94,54],
    legs:[[[88,112],[116,110],[116,142],[14,0]], [[90,114],[120,112],[120,143],[14,0]]],
    arms:[[[90,72],[96,52],[98,32]], [[92,73],[99,53],[102,33]]],
    back:cap([74,118],[76,58],12,SKIN)+padR(68,114,44,9), front:padR(94,22,10,12)}),
  latraise:g=>({f:0, tw:28, hip:[100,94], sh:[100,56], head:[100,36],
    legs:[[[94,96],[93,120],[92,144],[-7,1]], [[106,96],[107,120],[108,144],[7,1]]],
    arms:[[[88,58],[70,62],[52,64]], [[112,58],[130,62],[148,64]]],
    front: g==="cable" ? cable([148,64],[176,146])+column(176) : db([50,64],90,.75)+db([150,64],90,.75)}),
  facepull:g=>Object.assign(STAND(104), {f:-1, arms:[[[104,55],[114,44],[94,38]], [[106,56],[116,46],[96,40]]], back:column(10)+cable([22,38],[94,38])}),
  revfly:g=>({f:1, hip:[82,86], sh:[120,70], head:[136,64],
    legs:[[[82,86],[88,114],[86,142],[14,0]], [[84,88],[92,115],[91,142],[14,0]]],
    arms:[[[120,70],[126,80],[124,92]], [[121,71],[114,64],[110,58]]], front:db([124,94],0,.8)}),
  curl:g=>Object.assign(STAND(98), {f:1, arms:[[[98,55],[98,78],[96,99]], [[99,56],[100,78],[116,66]]],
    front: g==="cable" ? cable([116,66],[168,140])+column(170) : db([116,66],0,.9)+db([96,101],0,.9)}),
  pushdown:g=>Object.assign(STAND(92), {f:1, sh:[95,56], head:[99,38], arms:[[[95,56],[98,78],[114,94]], [[96,57],[100,79],[117,95]]], back:column(170)+cable([168,14],[116,94])}),
  triover:g=>Object.assign(STAND(98), {f:1, arms:[[[98,55],[104,34],[90,42]], [[100,56],[106,35],[92,43]]], mid:db([90,46],90,.95)}),
  pushup:g=>({f:1, hip:[88,114], sh:[136,106], head:[150,100],
    legs:[[[88,114],[62,126],[36,138],[6,4]], [[90,116],[64,128],[38,140],[6,4]]],
    arms:[[[136,106],[137,124],[139,142]], [[138,107],[140,125],[142,143]]]}),
  plank:g=>({f:1, hip:[88,120], sh:[136,118], head:[151,110],
    legs:[[[88,120],[62,130],[36,140],[6,4]], [[90,122],[64,132],[38,141],[6,4]]],
    arms:[[[136,118],[136,142],[156,142]], [[138,119],[139,143],[158,143]]]}),
  deadbug:g=>({f:1, hip:[108,132], sh:[62,130], head:[44,128], rot:-85,
    legs:[[[108,132],[134,132],[162,136],[6,-8]], [[110,130],[124,106],[148,108],[8,-3]]],
    arms:[[[62,130],[48,124],[30,130]], [[64,129],[66,108],[68,86]]]}),
  sideplank:g=>({f:0, tw:24, hip:[104,124], sh:[56,116], head:[42,106], rot:-15,
    legs:[[[104,124],[132,132],[162,141],[5,3]], [[106,126],[134,134],[164,143],[5,3]]],
    arms:[[[56,116],[52,142],[72,143]], [[58,115],[78,106],[100,120]]]}),
  pallof:g=>Object.assign(STAND(98), {f:1, arms:[[[98,55],[114,68],[134,70]], [[99,56],[116,70],[136,72]]],
    back: g==="band" ? band([28,70],[134,70]) : column(10)+cable([22,70],[134,70])}),
  walk:g=>({f:0, tw:28, hip:[100,96], sh:[100,58], head:[100,38],
    legs:[[[93,98],[82,120],[78,144],[-7,1]], [[107,98],[118,120],[122,144],[7,1]]],
    arms:[[[88,60],[80,80],[90,94]], [[112,60],[120,80],[110,94]]], front:band([84,124],[116,124])})
};
const illCache = {};
function illustration(ill){
  if (!ill) return "";
  const key = ill.join("|"); if (illCache[key]) return illCache[key];
  const fn = POSES[ill[0]]; if (!fn) return "";
  const P = fn(ill[1]||"");
  const legs = P.legs||[], arms = P.arms||[];
  let s = `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><g fill="none">`;
  s += P.back||"";
  if (legs[0]) s += leg(legs[0]);
  if (arms[0] && P.f!==0) s += arm(arms[0]);
  s += neck(P) + torso(P);
  if (P.f===0 && arms[0]) s += arm(arms[0]);
  if (legs[1]) s += leg(legs[1]);
  s += P.mid||"";
  s += head(P.head, P.f, P.rot);
  if (arms[1]) s += arm(arms[1]);
  s += P.front||"";
  s += `</g></svg>`;
  return illCache[key] = s;
}

/* ---------- questionnaire ---------- */
const STEPS = [
  {k:"time", q:"À quelle heure tu vas à la salle ?"},
  {k:"duration", q:"Tu as combien de temps sur place ?"},
  {k:"mood", q:"Comment tu te sens aujourd'hui ?"},
  {k:"energy", q:"Ton niveau d'énergie, là tout de suite ?"},
  {k:"sleep", q:"Tu as dormi comment ?"},
  {k:"symptoms", q:"Ton corps te dit quelque chose ?"},
  {k:"stress", q:"Ta journée est stressante ?"},
  {k:"want", q:"Tu as envie de travailler quoi ?"},
  {k:"crowd", q:"La salle sera comment à cette heure-là ?"},
  {k:"food", q:"Tu auras mangé quoi avant ?"}
];
function defaultAnswers(p){ return {time:"18:30", duration:p?.duration||45, mood:null, energy:null, sleep:null, symptoms:[], pain:"aucune", stress:null, want:"auto", crowd:null, food:null}; }

/* ---------- plan engine ---------- */
function slotOf(time){ const h = +String(time||"18:00").split(":")[0]; return h<10?"matin":h<14?"midi":h<18?"aprem":h<21?"soir":"tard"; }
function fmtRest(sec){ return sec>=60 ? (Math.floor(sec/60)+" min"+(sec%60?" "+(sec%60):"")) : sec+" s"; }
function buildPlan(st, date, override){
  const p = st.profile, a = st.checkins[date];
  const ci = cycleInfo(st.cycle, date);
  const why = [];
  let base = 3.6;
  if (p.hormonal) why.push(CONTRA[contraOf(p)].t+" : on se fie surtout à ton ressenti du jour.");
  else if (ci) { base = ci.key==="mens" ? (ci.day<=2?2.6:3.3) : ci.key==="foll" ? 4.3 : ci.key==="ovu" ? 4.6 : (ci.late?2.9:3.6); why.push("J"+ci.day+" de ton cycle, phase "+PHASES[ci.key].name.toLowerCase()+(ci.late?" (fin de cycle)":"")+"."); }
  let s = base;
  const e = a.energy||3; s += (e-3)*0.6; why.push("Énergie "+e+"/5.");
  const m = MOODS.find(x=>x.k===a.mood); if (m) s += m.v*0.5;
  if (a.sleep==="mal") { s -= .7; why.push("Nuit difficile : on baisse un peu."); } else if (a.sleep==="bien") s += .2;
  if (a.pain==="fortes") { s -= 1.5; why.push("Douleurs fortes : séance douce."); } else if (a.pain==="legeres") s -= .4;
  if ((a.symptoms||[]).includes("fatigue")) s -= .5;
  if (a.stress==="eleve") { s -= .4; why.push("Grosse journée : pas besoin d'en rajouter."); }
  if (slotOf(a.time)==="tard") s -= .3;
  if (p.goal==="bienetre") s = Math.min(s, 3.9);
  s = clamp(s + (override||0), 1, 5);
  const tier = s>=4.2 ? 4 : s>=3.2 ? 3 : s>=2.3 ? 2 : 1;

  let focus = a.want;
  if (focus==="auto" || !focus) {
    const last = st.sessions.find(x=>x.focus && x.date<date && ["bas","haut","full"].includes(x.focus));
    if ((p.perWeek||3) <= 2) focus = "full";
    else focus = last?.focus==="bas" ? "haut" : last?.focus==="haut" ? "bas" : ((p.focus||[]).some(z=>["fessiers","jambes"].includes(z)) ? "bas" : "full");
    if (tier===2 && p.goal!=="force") focus = "full";
    if (p.goal==="cardio" && tier>=2) focus = "cardio";
  }
  if (tier===1) focus = "mobilite";

  const lvl = LVL[p.level]??1, deb = lvl===0;
  const lut = !p.hormonal && ci?.key==="lut";
  const gym = gymOf(p);
  const persona = p.persona||"methodique";
  const dur = +a.duration || 45, slot = slotOf(a.time);
  const seed = hash(date + focus);
  const ctx = {gym, banned:new Set(p.banned||[]), deb, lvl, crowded:a.crowd==="bondee", bw:+p.bw||60, tier, allowUp: tier>=3 && !(lut && ci.late) && a.pain!=="fortes" && a.sleep!=="mal"};
  const sections = [];
  let title, challenge = null;

  const wuMin = slot==="matin" ? 10 : dur<=30 ? 5 : 7;
  const wu = [{name:"Cardio léger (vélo ou rameur)", detail:wuMin+" min, tu dois pouvoir parler"}];
  if (focus==="bas"||focus==="full") wu.push({name:"Mobilité hanches 90/90 + squats au poids du corps", detail:"2 tours × 8"});
  if (focus==="haut"||focus==="full") wu.push({name:"Rotations d'épaules à l'élastique", detail:"2 × 12"});
  if (!p.hormonal && ci?.key==="ovu") wu.push({name:"Activation genoux : fentes lentes", detail:"2 × 6, contrôle la descente"});
  wu.push({name:"Séries de montée en charge", detail:"Sur le 1er exercice : 2 séries légères (50 % puis 75 % de ta charge)"});

  const restAdd = lut ? 30 : 0;
  const nEx = dur<=20 ? 2 : dur<=30 ? 3 : dur<=45 ? 4 : dur<=60 ? 5 : 6;
  const mk = (id, sc, rest, alt) => {
    const ch = chooseVariant(id, ctx, alt); if (!ch) return null;
    const v = ch.v, L = LIB[id];
    if (L.timed) return {id, name:v.n, ill:v.ill, timed:true, detail:TIMED_DETAIL[id]};
    const it = {id, name:v.n, eq:v.eq, ill:v.ill, w:v.eq!=="pdc", r:v.r?v.r[lvl]:0, sets:sc.sets, lo:sc.lo, hi:sc.hi, rest, tagNew:ch.isNew};
    if (it.w) {
      const rec = recommend(it, ctx);
      Object.assign(it, {kg:rec.kg, reason:rec.reason, up:!!rec.up, first:!!rec.first});
      if ((v.eq==="halt"||v.eq==="halt1") && it.kg > gym.max) { it.kg = gym.max; it.reason = "Ta salle monte jusqu'à "+gym.max+" kg en haltères : fais le haut de la fourchette, puis passe à une version barre ou machine."; }
    } else it.reason = "Poids du corps. Quand tu fais "+sc.hi+" reps partout, ralentis la descente (3 s) pour corser.";
    if (persona==="zen" && it.w) it.note = "Tempo lent : 3 s en descente, souffle à l'effort.";
    return it;
  };
  const sch = (sets,lo,hi) => ({sets,lo,hi});

  if (focus==="mobilite") {
    title = "Récup active & mobilité";
    sections.push({name:"Échauffement doux", items:[{name:"Marche inclinée sur tapis", detail:Math.min(20, Math.round(dur*0.4))+" min, rythme tranquille"}]});
    sections.push({name:"Mobilité", items:[{name:"Chat-vache", detail:"10 respirations lentes"},{name:"World's greatest stretch", detail:"5 par côté"},{name:"Posture du pigeon", detail:"1 min par côté"},{name:"Étirement des ischios à la sangle", detail:"45 s par côté"},mk("deadbug")].filter(Boolean).slice(0, dur<=30?4:5)});
    sections.push({name:"Retour au calme", items:[{name:"Respiration ventrale allongée", detail:"3 min : inspire 4 s, expire 6 s"}]});
  } else if (focus==="cardio") {
    title = tier>=4 ? "Cardio intervalles + gainage" : tier===3 ? "Circuit cardio-muscu" : "Cardio zone 2 + gainage";
    sections.push({name:"Échauffement", items:wu.slice(0,1)});
    if (tier>=4 && slot!=="tard") sections.push({name:"Intervalles", items:[{name:"Rameur ou vélo", detail:(deb?6:8)+" × 30 s fort / 90 s facile. Fort = tu ne peux plus parler."}]});
    else if (tier>=3) sections.push({name:"Circuit, 3 tours", note:"Enchaîne, puis 60 s de repos entre les tours.", items:[{name:"Rameur", detail:"300 m"}, mk("squat",sch(3,12,15),60), mk("tirage",sch(3,12,15),60), {name:"Montées de genoux", detail:"30 s"}].filter(Boolean)});
    else sections.push({name:"Endurance", items:[{name:"Tapis incliné, vélo ou elliptique", detail:Math.round(dur*0.5)+" min en zone 2 (tu peux parler en phrases)"}]});
    sections.push({name:"Gainage", items:[mk("planche"), mk("sideplank")].filter(Boolean)});
  } else {
    const sp = SPLITS[focus], z = p.focus||[];
    const pri = id => LIB[id].z.some(t=>z.includes(t)) ? 1 : 0;
    /* Exercices dont il reste au moins une version faisable (équipement de la salle, et pas exclue). */
    const okId = id => !!chooseVariant(id, ctx);
    const mains = sp.main.filter(okId).sort((x,y)=>pri(y)-pri(x)), accs = sp.acc.filter(okId).sort((x,y)=>pri(y)-pri(x));
    const nMain = tier>=3 ? Math.min(nEx>=4?2:1, mains.length) : 1;
    const ids = mains.slice(0,nMain).concat(accs).slice(0, Math.max(1,nEx-1));
    let mainS, accS, rpe;
    if (tier===4) { mainS = deb ? sch(3,6,8) : (p.goal==="force" ? sch(4,4,6) : sch(4,6,8)); accS = sch(3,8,10); rpe = deb?7:8; }
    else if (tier===3) { mainS = deb ? sch(3,10,12) : sch(4,8,10); accS = sch(3,10,12); rpe = 7; }
    else { mainS = sch(3,12,15); accS = sch(3,12,15); rpe = 6; }
    const restMain = (tier===4?150:tier===3?90:45)+restAdd, restAcc = (tier===4?90:tier===3?75:30)+restAdd;
    const altIdx = persona==="aventuriere" ? Math.abs(seed) % ids.length : -1;
    const items = ids.map((id,i)=>mk(id, i<nMain?mainS:accS, i<nMain?restMain:restAcc, i===altIdx)).filter(Boolean);
    items.forEach(it=>it.rpe = rpe);
    const core = mk(pick(sp.core, seed), sch(3,10,12), 45); if (core) items.push(core);
    const labels = {bas:"Bas du corps", haut:"Haut du corps", full:"Full body"}, kinds = {4:"Force", 3:"Renfo", 2:"Circuit tonus"};
    title = labels[focus]+" · "+kinds[tier];
    sections.push({name:"Échauffement", items:wu});
    if (tier===2) sections.push({name:"Circuit, 3 tours", note:"Enchaîne les exercices, 90 s de repos entre les tours.", items});
    else if (persona==="fun") { items.forEach((it,i)=>{ if (i<items.length-1) it.prefix = String.fromCharCode(65+Math.floor(i/2))+(i%2+1); }); sections.push({name:"Supersets", note:"Enchaîne A1 puis A2, puis repos. Ça va vite, ça change tout le temps.", items}); }
    else sections.push({name:"Bloc principal", items});
    if (persona==="competitrice" && tier>=3 && items[0]?.w) challenge = "Défi du jour : dernière série de « "+items[0].name+" » en max de reps propres. Note ton score, on le bat la prochaine fois.";
    const fin = [];
    if (p.goal==="seche" && tier>=3 && slot!=="tard" && dur>=45) fin.push({name:"Finisher StairMaster ou corde à sauter", detail:"8 min, 40 s vite / 20 s cool"});
    fin.push(persona==="zen" || slot==="tard" ? {name:"Respiration + étirements", detail:"4 min, expire long pour redescendre"} : {name:"Étirements des zones travaillées", detail:"3–4 min"});
    sections.push({name:"Fin de séance", items:fin});
  }

  const tips = [];
  if (lut) tips.push("Phase lutéale : bois une gourde de plus et garde ces 30 s de repos supplémentaires.");
  if (a.food==="jeun" && tier>=3) tips.push("À jeun + séance costaude : une banane ou une compote 30 min avant, ça aide vraiment.");
  if (slot==="matin") tips.push("Le matin, le corps est plus raide : prends le temps de l'échauffement.");
  if (slot==="tard") tips.push("Séance tard : pas de cardio très intense, pour ne pas gâcher ton sommeil.");
  if (slot==="midi" && dur<=45) tips.push("Pause déj : vestiaire compris, garde 10 min de marge.");
  if (ctx.crowded) tips.push("Salle bondée : priorité aux haltères et au poids du corps, pour ne pas attendre les machines.");
  if ((a.symptoms||[]).includes("crampes") && a.pain!=="fortes") tips.push("Crampes : la marche et la mobilité du bassin soulagent souvent. Bouillotte après si besoin.");
  if ((a.symptoms||[]).includes("dos")) tips.push("Mal de dos : charges modérées sur le soulevé de terre, ou remplace-le par un hip thrust.");
  if ((a.symptoms||[]).includes("tete")) tips.push("Mal de tête : hydrate-toi bien et arrête si ça cogne pendant l'effort.");
  if (p.injuries) tips.push("Pense à ta contrainte : « "+p.injuries+" ». Adapte ou remplace ce qui gêne.");

  return {date, title, tier, score:+s.toFixed(1), focus, why, sections, tips, challenge, message:coachLine(persona, tier, a, seed), phase:(!p.hormonal && ci)?ci.key:null, cycleDay:ci?.day||null, time:a.time, duration:dur};
}
function coachLine(persona, tier, a, seed){
  const L = {
    competitrice:{4:["Grosse journée : c'est le moment d'aller chercher un record.","Tout est aligné. On charge la barre et on bat la dernière fois."],3:["Bonne forme. Séance solide, chaque rep compte.","Pas de record forcé aujourd'hui, mais du volume propre qui paiera."],2:["Aujourd'hui on gagne en étant régulière. La séance compte quand même."],1:["Les championnes récupèrent aussi. C'est une séance d'entretien, pas une pause."]},
    zen:{4:["Tu te sens forte : profite-en, à ton rythme.","Belle énergie aujourd'hui. Respire, contrôle, savoure."],3:["Une séance posée, mouvement par mouvement."],2:["Doux mais efficace. Aucun besoin de forcer."],1:["Aujourd'hui on prend soin de soi. Mobilité, souffle, détente."]},
    fun:{4:["Énergie au max : mets la playlist qui bouge et envoie.","Journée parfaite pour une séance qui dépote."],3:["Supersets au programme : ça va vite, tu ne vas pas t'ennuyer."],2:["Circuit léger, rythme sympa, zéro prise de tête."],1:["Séance chill : podcast dans les oreilles et on bouge tranquille."]},
    methodique:{4:["Conditions idéales pour progresser. Suis les charges indiquées.","Charges en hausse là où tu as validé. Suis le plan."],3:["Séance de consolidation. Note bien tes reps à chaque série."],2:["Volume léger aujourd'hui, la progression reprend à la prochaine."],1:["Jour de récup programmé. Ça fait partie du plan."]},
    aventuriere:{4:["Grosse forme : un exo nouveau s'est glissé dans la séance, à toi de le dompter."],3:["Une variante inédite au programme aujourd'hui. Curieuse ?"],2:["Circuit léger avec une petite surprise dedans."],1:["Explore ta mobilité aujourd'hui : des postures que tu ne fais jamais."]}
  };
  let line = pick(L[persona][tier], seed);
  if (a.mood==="plat" || a.mood==="triste") line += " Et si c'est dur aujourd'hui : venir, c'est déjà gagner.";
  if (a.mood==="irritable") line += " Ça tombe bien, la salle est un super endroit pour évacuer.";
  return line;
}
function allItems(plan){ const out=[]; plan.sections.forEach((sec,si)=>sec.items.forEach((it,ii)=>out.push([si+"-"+ii, it]))); return out; }
function itemByKey(k){ const [si,ii] = k.split("-").map(Number); return S.today.plan.sections[si]?.items[ii]; }

/* ---------- state & storage ---------- */
let S = null, demo = false;
let ui = {tab:"today", wiz:null, wizStep:0, override:0, finishing:false, rpe:null};
const LS_KEY = "phase-gym-v1", LOOK_KEY = "phase-gym-look";
let saveTimer = null;
function blank(){ return {v:2, profile:null, cycle:{lastStart:null,length:28,periodLen:5,starts:[]}, checkins:{}, sessions:[], lifts:{}, today:null}; }
function makeDemo(){
  const t = todayISO(), st = blank();
  st.profile = {name:"Inès", level:"inter", goal:"tonus", persona:"competitrice", perWeek:3, duration:60, focus:["fessiers","dos"], injuries:"", hormonal:false, bw:60, gym:{chain:"basicfit", pref:"mix"}};
  const c0 = {lastStart:addDays(t,-38), length:29, periodLen:5};
  st.cycle = {lastStart:addDays(t,-9), length:29, periodLen:5, starts:[addDays(t,-38), addDays(t,-9)]};
  const moodBy = {mens:["bof","plat","bien"], foll:["top","bien","top"], ovu:["top","top","bien"], lut:["bien","bof","irritable"]};
  for (let i=27;i>=1;i--){
    const d = addDays(t,-i), ci = cycleInfo(c0, d);
    if (i%2===0 || i%5===0) { const b = {mens:2.4, foll:4, ovu:4.4, lut:3.1}[ci.key];
      st.checkins[d] = {time:"18:30", duration:60, mood:pick(moodBy[ci.key], i), energy:clamp(Math.round(b + ((i*7)%3-1)*0.6),1,5), sleep:pick(["bien","moyen","bien","mal"],i), symptoms:[], pain:"aucune", stress:pick(["bas","moyen","eleve"],i), want:"auto", crowd:"calme", food:"leger"}; }
  }
  const plan = [[-26,"Bas du corps · Renfo","bas",7],[-24,"Haut du corps · Renfo","haut",7],[-21,"Bas du corps · Force","bas",8],[-19,"Haut du corps · Force","haut",8],[-16,"Bas du corps · Force","bas",9],[-12,"Haut du corps · Renfo","haut",7],[-9,"Récup active & mobilité","mobilite",4],[-6,"Bas du corps · Renfo","bas",7],[-3,"Haut du corps · Force","haut",8]];
  st.sessions = plan.map(([o,ti,f,r],i)=>{ const d=addDays(t,o), ci=cycleInfo(c0,d); return {id:"demo"+i, date:d, title:ti, focus:f, phase:ci.key, cycleDay:ci.day, rpe:r, note:"", done:5, total:6}; }).reverse();
  const H = (pairs) => pairs.map(([o,kg])=>({d:addDays(t,o), kg}));
  const S4 = (kg, reps) => reps.map(r=>({kg, reps:r}));
  st.lifts = {
    "Hip thrust à la barre":{kg:70, eq:"barre", lo:8, hi:10, sets:S4(70,[10,10,10,10]), hist:H([[-26,60],[-21,62.5],[-16,65],[-6,70]])},
    "Squat à la barre":{kg:42.5, eq:"barre", lo:8, hi:10, sets:S4(42.5,[10,9,8,8]), hist:H([[-26,37.5],[-16,40],[-6,42.5]])},
    "Soulevé de terre roumain (barre)":{kg:40, eq:"barre", lo:8, hi:10, sets:S4(40,[8,7,7]), hist:H([[-21,35],[-6,40]])},
    "Fentes bulgares haltères":{kg:10, eq:"halt", lo:10, hi:12, sets:S4(10,[12,12,12]), hist:H([[-21,8],[-6,10]])},
    "Abduction à la machine":{kg:35, eq:"machine", lo:10, hi:12, sets:S4(35,[12,11,10]), hist:H([[-16,30],[-6,35]])},
    "Tirage vertical":{kg:35, eq:"poulie", lo:8, hi:10, sets:S4(35,[10,9,9,8]), hist:H([[-24,30],[-12,32.5],[-3,35]])},
    "Rowing assis à la poulie":{kg:32.5, eq:"poulie", lo:10, hi:12, sets:S4(32.5,[12,12,12]), hist:H([[-24,27.5],[-3,32.5]])},
    "Développé couché haltères":{kg:12, eq:"halt", lo:8, hi:10, sets:S4(12,[9,8,8,7]), hist:H([[-19,10],[-3,12]])}
  };
  return st;
}
function trim(st){ st.sessions = st.sessions.slice(0,150); const keys = Object.keys(st.checkins).sort(); if (keys.length>200) keys.slice(0,keys.length-200).forEach(k=>delete st.checkins[k]); return st; }
function save(){
  if (demo) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 400);
}
function flush(){
  clearTimeout(saveTimer); saveTimer = null;
  if (demo || !S || !S.profile) return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(trim(S))); } catch(e){ toast("Stockage plein : efface d'anciennes séances."); }
}
/* Les changements en attente partent avant que l'app passe en arrière-plan ou se ferme. */
addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState==="hidden") flush(); });
function demoToday(){
  const t = todayISO();
  S.checkins[t] = {time:"18:30", duration:60, mood:"top", energy:4, sleep:"bien", symptoms:["rien"], pain:"aucune", stress:"moyen", want:"auto", crowd:"moyen", food:"leger"};
  S.today = {date:t, override:0, plan:buildPlan(S,t,0), log:{}, finished:false};
  S.today.log["0-0"] = {done:true};
  const first = S.today.plan.sections[1]?.items[0];
  if (first && first.w) S.today.log["1-0"] = {sets:[{kg:first.kg, reps:first.lo, ok:true}]};
}
function boot(){
  let loaded = null;
  try { const raw = localStorage.getItem(LS_KEY); if (raw) loaded = JSON.parse(raw); } catch(e){}
  if (loaded && loaded.profile) { S = Object.assign(blank(), loaded); demo = false; }
  else if (/[?&]demo\b/.test(location.search)) startDemo();
  else { S = blank(); demo = false; ui.onb = {step:-1, d:onbDefaults()}; }
  /* Demande au navigateur de ne pas effacer les données de l'app quand le téléphone manque de place. */
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){}
  render();
}
function startDemo(){ S = makeDemo(); demo = true; demoToday(); ui.onb = null; ui.tab = "today"; }

/* ---------- thème ---------- */
function getLook(){ try { return Object.assign({theme:"auto", accent:"lime"}, JSON.parse(localStorage.getItem(LOOK_KEY)||"{}")); } catch(e){ return {theme:"auto", accent:"lime"}; } }
function applyLook(){
  const l = getLook(), r = document.documentElement;
  const dark = l.theme==="dark" || (l.theme==="auto" && !(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches));
  r.dataset.theme = dark ? "dark" : "light"; r.dataset.accent = l.accent;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? "#000000" : "#F2F0EB";
}
function setLook(patch){ const l = Object.assign(getLook(), patch); try { localStorage.setItem(LOOK_KEY, JSON.stringify(l)); } catch(e){} applyLook(); }
try { matchMedia("(prefers-color-scheme: light)").addEventListener("change", ()=>{ if (getLook().theme==="auto") applyLook(); }); } catch(e){}
const THEMES = [["auto","Auto",'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>'],["dark","Sombre",'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/></svg>'],["light","Clair",'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>']];
const ACCENTS = [["lime","Citron","#E4F25C"],["rose","Rose","#FF6FB1"],["ciel","Ciel","#6CC8FF"],["mandarine","Mandarine","#FF9F55"]];

/* ---------- floating: toast + rest timer ---------- */
let tt, timer = null, tInt = null;
function renderFloat(msg){
  const el = $("#float");
  if (msg) { el.innerHTML = `<div class="toast">${esc(msg)}</div>`; return; }
  if (timer) { const left = Math.max(0, Math.ceil((timer.end - Date.now())/1000)); el.innerHTML = `<div class="timer"><span class="small">Repos</span><span class="dotnum" id="tleft">${pad(Math.floor(left/60))}:${pad(left%60)}</span><button class="ob" data-act="timer-stop">Passer</button></div>`; }
  else el.innerHTML = "";
}
let toastOn = false;
function toast(msg){ toastOn = true; renderFloat(msg); clearTimeout(tt); tt = setTimeout(()=>{ toastOn = false; renderFloat(); }, 2400); }
function startTimer(sec){
  timer = {end: Date.now()+sec*1000}; renderFloat(); clearInterval(tInt);
  tInt = setInterval(()=>{
    const left = Math.ceil((timer.end - Date.now())/1000);
    if (left <= 0) { clearInterval(tInt); timer = null; toast("Repos terminé, série suivante !"); try { navigator.vibrate && navigator.vibrate(200); } catch(e){} return; }
    const el = $("#tleft"); if (el) el.textContent = pad(Math.floor(left/60))+":"+pad(left%60); else if (!toastOn) renderFloat();
  }, 500);
}

/* ---------- rendering ---------- */
const ICONS = {
  today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12h3M18 12h3M6 8v8M18 8v8M9 10v4M15 10v4M9 12h6"/></svg>',
  cycle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="2" fill="currentColor"/></svg>',
  stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>',
  profile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6" stroke-linecap="round"/></svg>'
};
function renderTabs(){
  const t = [["today","Séance"],["cycle","Cycle"],["stats","Bilan"],["profile","Profil"]];
  $("#tabs").innerHTML = t.map(([k,l])=>`<button data-act="tab" data-v="${k}" ${ui.tab===k?'aria-current="page"':''}>${ICONS[k]}${l}</button>`).join("");
}
const MENU_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h10M4 17h16"/></svg>';
function render(){
  if (ui.onb) {
    $("#nav").hidden = true;
    $("#app").innerHTML = ui.onb.step < 0 ? viewWelcome() : viewOnboarding();
    renderFloat(); return;
  }
  $("#nav").hidden = false;
  renderTabs();
  if (ui.logging && !S.logDraft) ui.logging = false;
  const v = ui.tab==="today" ? (ui.logging ? viewLog() : ui.wiz ? viewWizard() : viewToday()) : ui.tab==="cycle" ? viewCycle() : ui.tab==="stats" ? viewStats() : viewProfile();
  const top = ui.wiz || (ui.logging && ui.tab==="today") ? "" : `<div class="top"><button class="iconbtn" data-act="menu" aria-label="Réglages" aria-expanded="${!!ui.menu}">${MENU_ICON}</button>${demo?`<span class="label">Mode exemple</span>`:""}</div>`;
  const banner = demo && !ui.wiz && !ui.logging ? `<div class="banner"><p><b>Exemple</b> : profil d'Inès, données inventées. Crée ton profil pour que tout soit à toi.</p><button class="ob" data-act="start">Créer mon profil</button></div>` : "";
  $("#app").innerHTML = `<div class="stack">${top}${banner}${v}</div>`;
  if (!toastOn) renderFloat();
  renderDrawer();
}

/* ---------- tiroir des réglages (à gauche) ---------- */
function renderDrawer(){
  const d = $("#drawer"), l = getLook();
  d.classList.toggle("on", !!ui.menu); $("#scrim").classList.toggle("on", !!ui.menu);
  d.setAttribute("aria-hidden", ui.menu ? "false" : "true");
  if ("inert" in d) d.inert = !ui.menu;
  if (!ui.menu) return;
  const CHEV = '<span class="chev">›</span>';
  d.innerHTML = `<div class="stack">
    <div class="row between"><h2>Réglages</h2><button class="iconbtn" data-act="menu-close" aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="card"><span class="label">Thème</span>
      <div class="seg" role="group" aria-label="Thème">${THEMES.map(([k,t,ic])=>`<button data-act="theme" data-v="${k}" aria-pressed="${l.theme===k}">${ic}${t}</button>`).join("")}</div>
      <p class="note">Auto suit le réglage clair ou sombre de ton téléphone.</p>
      <span class="label">Couleur d'accent</span>
      <div class="swatches">${ACCENTS.map(([k,t,c])=>`<button class="sw" style="--c:${c}" data-act="accent" data-v="${k}" aria-pressed="${l.accent===k}" aria-label="${t}" title="${t}"></button>`).join("")}</div></div>
    <div class="card"><div class="menu">
      ${demo ? `<button data-act="start"><span>Créer mon profil</span>${CHEV}</button>` : `<button data-act="go-profile"><span>Modifier mon profil</span>${CHEV}</button><button data-act="onb-redo"><span>Refaire les questions de profil</span>${CHEV}</button>`}
      <button data-act="go-cycle"><span>Mon cycle et mes humeurs</span>${CHEV}</button>
    </div></div>
    ${demo ? "" : `<div class="card"><span class="label">Mes données</span><p class="note">Tout reste sur ce téléphone, sans compte. Fais une sauvegarde de temps en temps, ou pour passer sur un autre téléphone.</p><div class="menu">
      <button data-act="export"><span>Télécharger une sauvegarde</span>${CHEV}</button>
      <button data-act="import"><span>Restaurer une sauvegarde</span>${CHEV}</button>
      <button data-act="reset" style="color:#E5484D"><span>Tout effacer</span>${CHEV}</button></div>
      ${ui.confirmReset?`<div class="banner"><p>Effacer profil, cycle, charges et historique ? C'est définitif.</p><button class="ob danger" data-act="reset-yes">Oui, tout effacer</button></div>`:""}</div>`}
    <p class="note">Phase Gym n'est ni un outil médical ni une méthode de contraception. Règles très douloureuses, cycles très irréguliers ou humeur qui pèse vraiment avant les règles : parles-en à un·e médecin ou une sage-femme.</p>
  </div>`;
}

/* ---------- accueil + questions de profil ---------- */
function onbDefaults(p){
  const base = {name:"", goal:null, level:null, persona:null, perWeek:3, duration:45, focus:[], gym:{chain:"basicfit", pref:"mix"}, hormonal:null, contra:null, diuCycle:null, lastStart:"", cycleLen:28, periodLen:5, bw:"", injuries:""};
  if (!p) return base;
  return Object.assign(base, JSON.parse(JSON.stringify(p)), {contra:contraOf(p), lastStart:S.cycle.lastStart||"", cycleLen:S.cycle.length||28, periodLen:S.cycle.periodLen||5, bw:p.bw||""});
}
const OSTEPS = [
  {k:"name", q:"Comment tu t'appelles ?", sub:"Juste ton prénom, pour que le coach te parle."},
  {k:"goal", q:"Ton objectif principal ?"},
  {k:"level", q:"Tu fais de la muscu depuis combien de temps ?"},
  {k:"persona", q:"À la salle, tu es plutôt…", sub:"Ça change le ton du coach et le format des séances."},
  {k:"perWeek", q:"Combien de séances par semaine ?", sub:"Ce que tu peux tenir sur la durée, pas ce que tu rêves de faire."},
  {k:"duration", q:"Une séance dure combien de temps, d'habitude ?"},
  {k:"focus", q:"Des zones à travailler en priorité ?", sub:"Plusieurs réponses possibles, ou aucune."},
  {k:"gym", q:"Tu t'entraînes où ?"},
  {k:"equip", q:"Qu'est-ce qu'il y a dans ta salle ?", sub:"Pré-rempli avec l'équipement habituel. Ça varie d'un club à l'autre : coche ce qu'il y a vraiment. Une machine que tu n'aimes pas ? Décoche-la."},
  {k:"contra", q:"Quelle contraception tu utilises ?", sub:"Les hormones de synthèse changent la façon dont ton cycle est pris en compte. Ça reste sur ton téléphone."},
  {k:"cycle", q:"Parle-moi de ton cycle", sub:"Pour savoir dans quelle phase tu es chaque jour. Une date approximative suffit."},
  {k:"body", q:"Deux dernières infos", sub:"Facultatif, mais ça aide à viser juste dès la première séance."},
  {k:"look", q:"Choisis ton ambiance", sub:"Tu pourras changer à tout moment dans les réglages, en haut à gauche."}
];
function onbSteps(){ const d = ui.onb.d; return OSTEPS.filter(s=>!(s.k==="cycle" && d.contra && isHormonal(d.contra, d.diuCycle))); }
function viewWelcome(){
  const redo = !!S.profile;
  return `<div class="welcome"><div class="card glow g-pink">
    <div class="stack" style="gap:14px"><img class="logo" src="icons/icon-192.png" alt=""><p class="big">Phase Gym</p>
    <p style="font-size:1.05rem">Des séances de salle qui suivent ton cycle, ton énergie et ta forme du jour.</p></div>
    <ul class="feat"><li>Une séance construite chaque jour avec 10 petites questions.</li><li>Les charges qui montent toutes seules quand tu es prête.</li><li>Ton cycle expliqué : pourquoi tu te sens comme ça, phase par phase.</li><li>Tout reste sur ton téléphone. Pas de compte, pas de pub.</li></ul>
    <div class="stack" style="gap:10px"><p class="small" style="color:rgba(255,255,255,.85)">D'abord, quelques questions pour faire ton profil. Ça prend 2 minutes.</p>
    <button class="pill block" data-act="onb-go"><span>${redo?"Reprendre les questions":"C'est parti"}</span><span class="plus">${ARROW_R}</span></button></div></div>
    ${redo?`<button class="ob" data-act="onb-cancel">Annuler</button>`:`<button class="ob" style="align-self:center" data-act="demo">Voir un exemple d'abord</button>`}
  </div>`;
}
function viewOnboarding(){
  const steps = onbSteps(), i = clamp(ui.onb.step, 0, steps.length-1), step = steps[i], d = ui.onb.d, n = steps.length;
  const cur = k => d[k];
  const opts = (k, list, num) => `<div class="opts">${list.map(([v,t,s])=>`<button class="opt" data-act="onb" data-k="${k}" data-v="${v}" ${num?'data-num="1"':""} aria-pressed="${cur(k)!=null && String(cur(k))===String(v)}"><b>${t}</b>${s?`<span>${s}</span>`:""}</button>`).join("")}</div>`;
  const gym = gymOf(d);
  let body = "", ok = true;
  switch(step.k){
    case "name": body = `<div class="field"><label class="visually-hidden" for="o-name">Ton prénom</label><input id="o-name" value="${esc(d.name)}" placeholder="Ton prénom" autocomplete="given-name" enterkeyhint="next" maxlength="30" data-onb="name"></div>`; ok = !!d.name.trim(); break;
    case "goal": body = opts("goal", Object.entries(GOALS).map(([k,v])=>[k,v])); ok = !!d.goal; break;
    case "level": body = opts("level", [["debutante","Moins de 6 mois","Débutante : on apprend les mouvements"],["inter","6 mois à 2 ans","Intermédiaire : les bases sont là"],["confirmee","Plus de 2 ans","Confirmée : on vise la performance"]]); ok = !!d.level; break;
    case "persona": body = opts("persona", Object.entries(PERSONAS).map(([k,v])=>[k,v.t,v.d])); ok = !!d.persona; break;
    case "perWeek": body = `<div class="bignum"><span class="dotnum">${d.perWeek}</span><span>par semaine</span></div><div class="scale s6">${[1,2,3,4,5,6].map(v=>`<button data-act="onb" data-k="perWeek" data-v="${v}" data-num="1" data-stay="1" aria-pressed="${+d.perWeek===v}"><b>${v}</b></button>`).join("")}</div>
      <p class="hint">${{1:"1 séance : on fera du full body.",2:"2 séances : deux full body bien espacés.",3:"3 séances : le bon équilibre pour progresser.",4:"4 séances : bas et haut du corps en alternance.",5:"5 séances : avec une séance cardio ou mobilité.",6:"6 séances : écoute bien ta fatigue, le repos fait aussi progresser."}[d.perWeek]}</p>`; break;
    case "duration": body = opts("duration", [[30,"30 min","Court et efficace"],[45,"45 min","Le classique"],[60,"1 h","Séance complète"],[75,"1 h 15","J'ai tout mon temps"]], 1); break;
    case "focus": body = `<div class="chips">${Object.entries(ZONES).map(([k,v])=>`<button class="chip" data-act="onb-zone" data-v="${k}" aria-pressed="${(d.focus||[]).includes(k)}">${v}</button>`).join("")}</div>`; break;
    case "gym": body = `<div class="chips">${Object.entries(GYMS).map(([k,v])=>`<button class="chip" data-act="onb-gym" data-v="${k}" aria-pressed="${gym.chain===k}">${v.t}</button>`).join("")}</div>
      <span class="label">Tu préfères</span><div class="opts">${Object.entries(PREFS).map(([k,v])=>`<button class="opt" data-act="onb-pref" data-v="${k}" aria-pressed="${gym.pref===k}"><b>${v.t}</b><span>${v.d}</span></button>`).join("")}</div>`; break;
    case "equip": body = `<div class="chips">${Object.entries(EQUIP).map(([k,v])=>`<button class="chip" data-act="onb-equip" data-v="${k}" aria-pressed="${!!gym.equip[k]}">${v}</button>`).join("")}</div>
      <div class="field"><label class="label" for="o-max">Haltère le plus lourd (kg)</label><input id="o-max" type="number" inputmode="numeric" min="5" max="80" value="${gym.max}" data-onb-gmax></div>
      <p class="hint">Plus tard, tu pourras aussi retirer un exercice précis : bouton « Je n'aime pas » pendant la séance, ou dans ton profil.</p>`; break;
    case "contra": body = contraField(d, "onb"); ok = !!d.contra && (d.contra!=="diu" || d.diuCycle!=null); break;
    case "cycle": body = `<div class="field"><label class="label" for="o-start">Premier jour de tes dernières règles</label><input id="o-start" type="date" max="${todayISO()}" min="${addDays(todayISO(),-120)}" value="${esc(d.lastStart||"")}" data-onb="lastStart"></div>
      <div class="grid2"><div class="field"><label class="label" for="o-len">Durée du cycle (jours)</label><input id="o-len" type="number" inputmode="numeric" min="20" max="45" value="${esc(d.cycleLen)}" data-onb="cycleLen"></div>
      <div class="field"><label class="label" for="o-per">Durée des règles (jours)</label><input id="o-per" type="number" inputmode="numeric" min="2" max="10" value="${esc(d.periodLen)}" data-onb="periodLen"></div></div>
      <p class="hint">Tu ne sais pas ? Laisse 28 et 5, c'est la moyenne. L'app recalcule ta vraie durée au fil des mois, à chaque fois que tu notes le début de tes règles.</p>`; break;
    case "body": body = `<div class="field"><label class="label" for="o-bw">Ton poids en kg</label><input id="o-bw" type="number" inputmode="decimal" min="35" max="160" value="${esc(d.bw)}" placeholder="Sert seulement à estimer tes premières charges" data-onb="bw"></div>
      <div class="field"><label class="label" for="o-inj">Une blessure ou une gêne ?</label><input id="o-inj" value="${esc(d.injuries)}" placeholder="Ex : genou droit sensible" data-onb="injuries"></div>`; break;
    case "look": { const l = getLook(); body = `<div class="opts">${THEMES.map(([k,t])=>`<button class="opt" data-act="theme" data-v="${k}" aria-pressed="${l.theme===k}"><b>${t}</b><span>${{auto:"Suit ton téléphone (clair le jour, sombre le soir si c'est réglé ainsi)",dark:"Fond noir, couleurs qui ressortent",light:"Fond clair, plus doux en plein jour"}[k]}</span></button>`).join("")}</div>
      <span class="label">Couleur d'accent</span><div class="swatches">${ACCENTS.map(([k,t,c])=>`<button class="sw" style="--c:${c}" data-act="accent" data-v="${k}" aria-pressed="${l.accent===k}" aria-label="${t}" title="${t}"></button>`).join("")}</div>`; break; }
  }
  const last = i===n-1;
  return `<div class="wiz"><div class="row between"><button class="circ plain" data-act="onb-back" aria-label="Retour">${ARROW_L}</button><span>${i+1} / ${n}</span>${step.k==="body"||step.k==="focus"?`<button class="linkbtn" data-act="onb-next">Passer</button>`:`<span style="width:46px"></span>`}</div>
    <div class="card glow g-mauve" style="gap:18px"><div class="pbar"><i style="width:${Math.round((i+1)/n*100)}%"></i></div>
    <div class="stack" style="gap:6px"><p class="q">${step.q}</p>${step.sub?`<p class="small" style="color:rgba(255,255,255,.85)">${step.sub}</p>`:""}</div>${body}
    <div class="wiz-nav"><button class="pill" data-act="onb-next" ${ok?"":"disabled"}><span>${last?"Créer mon profil":"Suivant"}</span><span class="plus">${last?CHECK:ARROW_R}</span></button></div></div></div>`;
}
function finishOnboarding(){
  const d = ui.onb.d, g = gymOf(d), wasDemo = demo, had = !!S.profile;
  if (wasDemo || !had) { S = blank(); demo = false; }
  S.profile = {name:d.name.trim(), level:d.level||"debutante", goal:d.goal||"tonus", persona:d.persona||"methodique", perWeek:+d.perWeek||3, duration:+d.duration||45, focus:d.focus||[], banned:d.banned||[], injuries:(d.injuries||"").trim(), contra:contraOf(d), diuCycle:contraOf(d)==="diu" ? !!d.diuCycle : null, hormonal:isHormonal(contraOf(d), d.diuCycle), bw:(+d.bw>=35 && +d.bw<=160)?+d.bw:null, gym:{chain:g.chain, pref:g.pref, equip:g.equip, max:g.max}};
  if (d.lastStart) { S.cycle.lastStart = d.lastStart; S.cycle.starts = (S.cycle.starts||[]).filter(x=>x!==d.lastStart).concat([d.lastStart]).sort(); }
  if (+d.cycleLen>=20 && +d.cycleLen<=45) S.cycle.length = +d.cycleLen;
  if (+d.periodLen>=2 && +d.periodLen<=10) S.cycle.periodLen = +d.periodLen;
  if (S.today && !S.today.finished && S.checkins[todayISO()]) { S.today.plan = buildPlan(S, todayISO(), ui.override); S.today.log = {}; }
  ui.onb = null; ui.tab = "today"; ui.draft = null; ui.menu = false;
  save(); flush(); window.scrollTo(0,0);
  toast(had && !wasDemo ? "Profil mis à jour" : "Profil créé. À toi de jouer, "+S.profile.name+" !");
}
function phaseChip(ci, hormonal){
  if (hormonal) return `<span class="phase-chip"><span class="dot" style="--c:var(--muted)"></span>${esc(CONTRA[contraOf(S.profile)].t)}</span>`;
  if (!ci) return `<span class="phase-chip"><span class="dot" style="--c:var(--muted)"></span>Cycle non renseigné</span>`;
  return `<span class="phase-chip"><span class="dot" style="--c:var(${PHASES[ci.key].c})"></span>J${ci.day} · ${PHASES[ci.key].name}</span>`;
}
const ruler = (pct) => `<div class="ruler"><div class="ticks"></div><div class="mk" style="left:${clamp(pct,4,96)}%"></div></div>`;
function weekCard(){
  const t = todayISO(), mon = addDays(t, -((parse(t).getDay()+6)%7));
  const done = new Set(S.sessions.map(x=>x.date));
  const n = S.profile.perWeek||3, cnt = [0,1,2,3,4,5,6].filter(i=>done.has(addDays(mon,i))).length;
  const plan = {1:"1 full body par semaine. Pour progresser plus vite, 2 c'est l'idéal.", 2:"2 full body, avec 2 jours entre les deux (ex. lundi et jeudi).", 3:"Bas · Haut · Bas (ou full), un jour de repos entre chaque (ex. lun, mer, ven).", 4:"Bas · Haut · repos · Bas · Haut (ex. lun, mar, jeu, ven).", 5:"4 séances muscu + 1 cardio ou mobilité, et au moins 1 vrai jour off.", 6:"5 muscu + 1 récup. Écoute bien ta fatigue, le repos fait aussi progresser."}[clamp(n,1,6)];
  return `<div class="card"><div class="row between"><span class="label">Ta semaine</span><span class="small"><span class="dotnum" style="font-size:1.2rem">${cnt}/${n}</span> séances</span></div>
    <div class="week">${["L","M","M","J","V","S","D"].map((d,i)=>{ const ds=addDays(mon,i); return `<div class="day ${done.has(ds)?"done":""} ${ds===t?"today":""}">${d}</div>`; }).join("")}</div>
    <p class="small muted">${plan} Laisse 48 h avant de retravailler le même groupe musculaire.</p></div>`;
}
function viewToday(){
  const t = todayISO(), p = S.profile, ci = cycleInfo(S.cycle, t);
  const hour = new Date().getHours();
  let h = `<div class="stack" style="gap:8px"><span class="label">${esc(fmtLong(t))}</span><h1>${hour<5||hour>=18?"Bonsoir":"Salut"} ${esc(p.name)}</h1><div class="row">${phaseChip(ci,p.hormonal)}</div></div>`;
  if (S.today && S.today.date!==t) S.today = null;
  const ans = S.checkins[t], doneToday = S.today && S.today.date===t && S.today.finished;
  if ((!ans || !S.today) && !doneToday) {
    h += `<div class="card glow g-pink" style="min-height:330px;justify-content:space-between"><div><span class="label">Avant ta séance</span><h2 style="margin-top:4px">On construit ta séance du jour</h2></div>
      <div class="bignum"><span class="dotnum">10</span><span>questions</span></div>
      <p class="small" style="color:rgba(255,255,255,.85)">Heure, temps dispo, humeur, énergie, sommeil, corps, stress, envie, affluence, repas. Ta séance s'adapte aux réponses et à ton cycle.</p>
      <button class="pill block" data-act="wiz"><span>Commencer</span><span class="plus">${PLUS}</span></button></div>`;
    h += logCard();
    h += weekCard();
    if (ci && !p.hormonal) h += `<div class="card glow ${PHASES[ci.key].g}"><span class="label">Ta phase en ce moment</span><h3>${PHASES[ci.key].name}${ci.late?" (fin de cycle)":""}</h3><p class="small">${PHASES[ci.key].feel}</p><button class="ob" style="align-self:flex-start" data-act="go-cycle">Pourquoi je me sens comme ça ?</button></div>`;
    return h;
  }
  const plan = S.today.plan;
  if (S.today.finished) {
    h += `<div class="card glow g-sage" style="min-height:260px;justify-content:space-between"><span class="label">Séance terminée</span><div class="bignum"><span class="dotnum">${S.today.rpe}</span><span>effort ressenti /10</span></div><p>${esc(plan.title)} · ${S.today.doneCount} exercice${S.today.doneCount>1?"s":""}. Tes charges sont enregistrées pour la prochaine fois.</p>${S.today.manual?"":`<button class="pill block" data-act="redo"><span>Refaire le questionnaire</span><span class="plus">${ARROW_R}</span></button>`}</div>`;
    return h + logCard(true) + weekCard();
  }
  const g = plan.phase ? PHASES[plan.phase].g : "g-mauve";
  h += `<div class="card glow ${g}"><div class="row between"><span class="label">Ta séance${plan.time?" de "+esc(plan.time.replace(":","h")):""}</span><span class="label">Intensité</span></div>
    <h2>${esc(plan.title)}</h2>
    <div class="row between" style="align-items:flex-end"><div class="hero-num"><span class="dotnum">${plan.duration}</span><span style="padding-bottom:6px">min</span></div><span class="dotnum" style="font-size:1.6rem;padding-bottom:6px">${plan.tier}/4</span></div>
    ${ruler(plan.tier*25-10)}
    <p class="coach">${esc(plan.message)}</p>
    <ul class="why">${plan.why.map(w=>`<li>${esc(w)}</li>`).join("")}</ul>
    <div class="row"><button class="ob" data-act="ovr" data-v="-1" ${plan.tier<=1?"disabled":""}>Plus doux</button><button class="ob" data-act="ovr" data-v="1" ${plan.tier>=4?"disabled":""}>Plus intense</button><button class="ob" data-act="redo">Modifier mes réponses</button></div></div>`;
  if (plan.challenge) h += `<div class="banner"><p>${esc(plan.challenge)}</p></div>`;
  h += moodCard(ans, plan.phase, p.hormonal);
  plan.sections.forEach((sec,si)=>{
    h += `<div class="card"><div class="row between"><h3>${esc(sec.name)}</h3></div>${sec.note?`<p class="sec-note">${esc(sec.note)}</p>`:""}<div>`;
    sec.items.forEach((it,ii)=>{ h += exItem(si+"-"+ii, it); });
    h += `</div></div>`;
  });
  h += `<details class="help"><summary>Comment je choisis tes charges</summary><ul>
    <li>Première fois sur un exo : charge estimée selon ton niveau et ton poids, puis une série d'essai pour ajuster.</li>
    <li>La bonne charge : les 2 dernières reps sont dures mais propres. Il t'en reste 1 ou 2 « en réserve ».</li>
    <li>Tu gardes la même charge jusqu'à faire le haut de la fourchette (ex. 10 reps sur 8–10) à toutes les séries. Ensuite, on monte d'un cran : +1 à 2 kg en haltères, +2,5 kg en barre ou machine, +5 kg à la presse.</li>
    <li>Fatigue, mauvaise nuit ou fin de cycle : on garde la charge au lieu de monter.</li>
    <li>Toutes les 6 à 8 semaines, fais une semaine plus légère (environ −30 %) pour continuer à progresser.</li></ul></details>`;
  if (plan.tips.length) h += `<div class="card"><span class="label">Conseils pour aujourd'hui</span><ul class="why">${plan.tips.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
  if (!ui.finishing) h += `<button class="pill block" data-act="finish"><span>Terminer la séance</span><span class="plus">${CHECK}</span></button>
    <button class="ob" style="align-self:center" data-act="log-start" data-v="plan">${S.logDraft?"Reprendre ma séance notée":"J'ai fait autrement : noter ma séance"}</button>`;
  else h += `<div class="card glow g-mauve"><h3>C'était comment ?</h3><span class="label">Effort ressenti, de 1 (facile) à 10 (à fond)</span>
    <div class="chips">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="chip" data-act="rpe" data-v="${n}" aria-pressed="${ui.rpe===n}">${n}</button>`).join("")}</div>
    <div class="field"><label for="note" class="label">Une note pour la prochaine fois ?</label><textarea id="note" placeholder="Ex : hip thrust facile, monter à 75 kg">${esc(ui.noteDraft||"")}</textarea></div>
    <button class="pill block" data-act="save-session" ${ui.rpe?"":"disabled"}><span>Enregistrer la séance</span><span class="plus">${CHECK}</span></button></div>`;
  return h;
}
/* ---------- noter sa séance soi-même ----------
   On choisit ses exercices (bibliothèque, exos déjà faits, ou un nom libre), on note les séries, et la séance
   rejoint l'historique et la progression des charges, comme une séance proposée par l'app. Le brouillon est
   gardé dans S.logDraft : on peut quitter l'app au milieu et reprendre. */
const CARDIO = ["Tapis de course","Tapis incliné (marche)","Vélo","Rameur","Elliptique","StairMaster","Corde à sauter","Cours collectif"];
const ZONE_FILTERS = [["all","Tout"],["mine","Mes exos"],["fessiers","Fessiers"],["jambes","Jambes"],["dos","Dos"],["epaules","Épaules"],["bras","Bras"],["abdos","Abdos"],["cardio","Cardio"]];
function variantInfo(name){
  for (const [id,L] of Object.entries(LIB)) { const v = L.v.find(x=>x.n===name); if (v) return {id, v, z:L.z, timed:!!L.timed}; }
  return null;
}
function newLogItem(name, kind){
  if (kind==="cardio") return {name, cardio:true, min:"", note:""};
  const inf = variantInfo(name), last = getLift(name);
  const w = inf ? inf.v.eq!=="pdc" : !(last===null && kind==="pdc");
  const timed = !!inf?.timed;
  const n = last?.sets?.length || 3, reps = last?.sets?.[0]?.reps ?? "";
  const kg = last ? last.kg : (inf && w && inf.v.r ? recommend({name, eq:inf.v.eq, r:inf.v.r[LVL[S.profile.level]??1], lo:8, hi:10}, {bw:+S.profile.bw||60, lvl:LVL[S.profile.level]??1, tier:3}).kg : "");
  return {name, eq:inf ? inf.v.eq : (last?.eq||"libre"), ill:inf?.v.ill||null, w, timed, sets:Array.from({length:Math.min(n,6)}, ()=>({kg:w?kg:"", reps:timed?"":reps}))};
}
function startLog(fromPlan){
  if (!S.logDraft) {
    const d = {date:todayISO(), title:"", items:[], rpe:null, note:""};
    if (fromPlan && S.today?.plan) {
      allItems(S.today.plan).forEach(([k,it])=>{
        if (!it.id && !it.sets) return;
        const lg = S.today.log[k]||{}, item = newLogItem(it.name);
        if (it.sets && !it.timed) item.sets = Array.from({length:it.sets}, (_,i)=>({kg: it.w ? (lg.sets?.[i]?.kg ?? it.kg) : "", reps: lg.sets?.[i]?.reps ?? ""}));
        d.items.push(item);
      });
      d.title = S.today.plan.title;
    }
    S.logDraft = d;
  }
  ui.logging = true; ui.logPick = false; ui.wiz = null; ui.tab = "today"; save(); window.scrollTo(0,0);
}
function logFocus(items){
  const zs = new Set(); let cardio = 0, any = 0;
  items.forEach(it=>{ if (it.cardio) { cardio++; return; } any++; (variantInfo(it.name)?.z||[]).forEach(z=>zs.add(z)); });
  const low = ["fessiers","jambes"].some(z=>zs.has(z)), up = ["dos","epaules","bras"].some(z=>zs.has(z));
  if (!any && cardio) return "cardio";
  if (low && up) return "full"; if (low) return "bas"; if (up) return "haut";
  if (zs.has("abdos") && zs.size===1) return "mobilite";
  return "libre";
}
const FOCUS_TITLES = {bas:"Bas du corps", haut:"Haut du corps", full:"Full body", cardio:"Cardio", mobilite:"Gainage & mobilité", libre:"Séance libre"};
function viewLog(){
  const d = S.logDraft, t = todayISO();
  if (ui.logPick) return viewLogPicker();
  const ci = cycleInfo(S.cycle, d.date), auto = FOCUS_TITLES[logFocus(d.items)];
  let h = `<div class="row between"><button class="circ plain" data-act="log-close" aria-label="Retour">${ARROW_L}</button><span class="label">Brouillon gardé automatiquement</span></div>
    <h1>Noter ma séance</h1>
    <div class="card"><div class="grid2"><div class="field"><label class="label" for="lg-date">Jour</label><input id="lg-date" type="date" max="${t}" value="${esc(d.date)}" data-lgf="date"></div>
    <div class="field"><label class="label" for="lg-title">Nom (facultatif)</label><input id="lg-title" value="${esc(d.title)}" placeholder="${esc(auto)}" data-lgf="title" maxlength="60"></div></div>
    ${ci && !S.profile.hormonal ? `<div class="row">${phaseChip(ci,false)}</div>` : ""}</div>`;
  if (!d.items.length) h += `<div class="card"><p class="muted small">Ajoute les exercices que tu as faits : dans la liste de l'app, parmi ceux que tu fais d'habitude, ou avec un nom à toi. Pour chacun, note tes séries (charge et répétitions).</p></div>`;
  d.items.forEach((it,i)=>{
    const img = it.ill ? illustration(it.ill) : "";
    h += `<div class="card" style="gap:12px"><div class="ex-head ${img?"":"noimg"}" style="${img?"":"grid-template-columns:minmax(0,1fr)"}">${img?`<div class="ill">${img}</div>`:""}<div class="stack" style="gap:4px;min-width:0"><div class="name" style="font-weight:500">${esc(it.name)}</div>
      <div class="detail note">${it.cardio?"Cardio":it.timed?"Gainage : durée en secondes":it.w?"kg "+esc(loadLabel(it.eq)||"de charge"):"Poids du corps"}</div>
      <div class="row" style="gap:6px">${i>0?`<button class="linkbtn" data-act="log-up" data-v="${i}">Monter</button>`:""}<button class="linkbtn" data-act="log-del" data-v="${i}" style="color:#E5484D">Retirer</button></div></div></div>`;
    if (it.cardio) {
      h += `<div class="grid2"><div class="field"><label class="label" for="lc-${i}">Durée (min)</label><input id="lc-${i}" type="number" inputmode="numeric" min="1" max="300" value="${esc(it.min)}" data-lg="${i}|min"></div>
        <div class="field"><label class="label" for="ln-${i}">Détail (facultatif)</label><input id="ln-${i}" value="${esc(it.note)}" placeholder="Ex : 5 km, 10 % de pente" data-lg="${i}|note"></div></div>`;
    } else {
      h += `<div class="sets">${it.sets.map((st,j)=>`<div class="set ${it.w?"":"noload"}"><span class="n">${j+1}</span>
        ${it.w?`<input type="number" inputmode="decimal" step="0.5" min="0" value="${esc(st.kg)}" placeholder="kg" data-lg="${i}|${j}|kg" aria-label="Charge série ${j+1}"><span class="x">kg ×</span>`:""}
        <input type="number" inputmode="numeric" min="0" value="${esc(st.reps)}" placeholder="${it.timed?"s":"reps"}" data-lg="${i}|${j}|reps" aria-label="${it.timed?"Secondes":"Reps"} série ${j+1}">
        <button class="chk" data-act="log-delset" data-v="${i}|${j}" aria-label="Supprimer la série ${j+1}" style="color:var(--muted)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:1"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>`).join("")}</div>
        <div class="row"><button class="ob" data-act="log-addset" data-v="${i}">+ Série</button>${!it.timed?`<button class="linkbtn" data-act="log-togglew" data-v="${i}">${it.w?"Sans charge (poids du corps)":"Avec une charge"}</button>`:""}</div>`;
    }
    h += `</div>`;
  });
  h += `<button class="pill block" data-act="log-pick"><span>Ajouter un exercice</span><span class="plus">${PLUS}</span></button>`;
  if (d.items.length) h += `<div class="card glow g-mauve"><h3>C'était comment ?</h3><span class="label">Effort ressenti, de 1 (facile) à 10 (à fond)</span>
    <div class="chips">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="chip" data-act="log-rpe" data-v="${n}" aria-pressed="${d.rpe===n}">${n}</button>`).join("")}</div>
    <div class="field"><label for="lg-note" class="label">Une note pour la prochaine fois ?</label><textarea id="lg-note" data-lgf="note" placeholder="Ex : épaule un peu raide, garder 30 kg">${esc(d.note)}</textarea></div>
    <button class="pill block" data-act="log-save"><span>Enregistrer la séance</span><span class="plus">${CHECK}</span></button></div>`;
  h += `<button class="ob danger" style="align-self:center" data-act="log-discard">${ui.confirmDiscard?"Sûre ? Touche encore pour tout jeter":"Jeter ce brouillon"}</button>`;
  return h;
}
function viewLogPicker(){
  const f = ui.logFilter||"all";
  return `<div class="row between"><button class="circ plain" data-act="log-pick-close" aria-label="Retour">${ARROW_L}</button><span class="label">${S.logDraft.items.length} exercice${S.logDraft.items.length>1?"s":""} dans ta séance</span></div>
    <h1>Ajouter un exercice</h1>
    <div class="field"><label class="visually-hidden" for="lg-q">Chercher</label><input id="lg-q" type="search" value="${esc(ui.logQ||"")}" placeholder="Chercher, ou taper le nom d'un exo à toi" data-logq autocomplete="off" enterkeyhint="search"></div>
    <div class="chips hscroll">${ZONE_FILTERS.map(([k,t])=>`<button class="chip" style="flex:none" data-act="log-filter" data-v="${k}" aria-pressed="${f===k}">${t}</button>`).join("")}</div>
    <div class="stack" id="lg-res">${pickerResults()}</div>`;
}
function pickerResults(){
  const q = (ui.logQ||"").trim().toLowerCase(), f = q ? "all" : (ui.logFilter||"all"), banned = new Set(S.profile.banned||[]);
  const norm = x => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const nq = norm(q), inDraft = new Set(S.logDraft.items.map(x=>x.name));
  let list = [];
  if (f==="cardio") list = CARDIO.map(n=>({n, kind:"cardio"}));
  else if (f==="mine") list = Object.keys(S.lifts).map(n=>({n, inf:variantInfo(n)}));
  else {
    list = allVariants().filter(v=>!banned.has(v.n)).map(v=>({n:v.n, inf:variantInfo(v.n)})).filter(o=>f==="all" || o.inf.z.includes(f));
    if (f==="all") Object.keys(S.lifts).forEach(n=>{ if (!variantInfo(n)) list.unshift({n, inf:null}); });
    if (f==="all") list = list.concat(CARDIO.map(n=>({n, kind:"cardio"})));
  }
  if (nq) list = list.filter(o=>norm(o.n).includes(nq));
  const zl = o => o.kind==="cardio" ? "Cardio" : o.inf ? o.inf.z.map(z=>ZONES[z]).join(", ") : "Ton exercice";
  let h = "";
  if (q) h += `<button class="pill block" data-act="log-add-custom"><span>Ajouter « ${esc(ui.logQ.trim())} »</span><span class="plus">${PLUS}</span></button>`;
  h += `<div class="card" style="padding:6px 20px">`;
  h += list.length ? list.map(o=>{ const img = o.inf ? illustration(o.inf.v.ill) : "", has = inDraft.has(o.n);
      return `<button class="pickrow" data-act="log-add" data-v="${esc(o.n)}" data-kind="${o.kind||""}" ${has?'aria-pressed="true"':""}>${img?`<span class="ill sm">${img}</span>`:`<span class="ill sm noimg">${o.kind==="cardio"?"♥":"+"}</span>`}<span class="pk"><b>${esc(o.n)}</b><span>${esc(zl(o))}${has?" · déjà ajouté":""}</span></span><span class="plusc">${has?CHECK:PLUS}</span></button>`; }).join("")
    : `<p class="muted small" style="padding:14px 0">${f==="mine"?"Tu n'as pas encore d'exercice enregistré.":"Rien ne correspond."}</p>`;
  h += `</div>`;
  if (q) h += `<p class="note">Un exercice qui n'est pas dans la liste ? Ajoute-le avec ton nom : il sera gardé dans « Mes exos » avec ta progression.</p>`;
  return h;
}
function saveLog(){
  const d = S.logDraft, items = [];
  d.items.forEach(it=>{
    if (it.cardio) { if (+it.min>0) items.push({name:it.name, cardio:true, min:+it.min, note:(it.note||"").trim()}); return; }
    const sets = it.sets.filter(x=>+x.reps>0).map(x=>({kg:it.w ? (+String(x.kg).replace(",",".")||0) : 0, reps:+x.reps}));
    if (sets.length) items.push({name:it.name, eq:it.eq, w:it.w, timed:it.timed, sets});
  });
  if (!items.length) { toast("Note au moins une série (ou une durée de cardio)"); return false; }
  if (!d.rpe) { toast("Choisis ton effort ressenti, de 1 à 10"); return false; }
  const date = d.date && d.date<=todayISO() ? d.date : todayISO(), ci = cycleInfo(S.cycle, date), focus = logFocus(items);
  /* Charges : même règle que les séances proposées. La plus lourde série devient la référence, la fourchette de reps est déduite. */
  items.filter(x=>x.w && !x.timed && x.sets.some(s=>s.kg>0)).forEach(x=>{
    const prev = getLift(x.name);
    if (prev && prev.date && prev.date > date) return; // une séance plus récente fait déjà foi
    const kg = Math.max(...x.sets.map(s=>s.kg)), top = x.sets.filter(s=>s.kg===kg), reps = top.map(s=>s.reps);
    const lo = prev?.lo || clamp(Math.min(...reps), 3, 20), hi = prev?.hi || Math.max(lo+2, Math.max(...reps));
    S.lifts[x.name] = {kg, eq:x.eq, lo, hi, sets:top, date, hist:((prev&&prev.hist)||[]).filter(h=>h.d!==date).concat([{d:date, kg}]).sort((a,b)=>a.d<b.d?-1:1).slice(-20)};
  });
  const sess = {id:Date.now().toString(36), date, title:(d.title||"").trim()||FOCUS_TITLES[focus], focus, phase:(!S.profile.hormonal && ci)?ci.key:null, cycleDay:ci?.day||null, rpe:d.rpe, note:(d.note||"").trim(), done:items.length, total:items.length, manual:true, ex:items};
  S.sessions.push(sess); S.sessions.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
  if (date===todayISO()) {
    if (S.today && !S.today.finished) S.today = null; // la séance proposée n'a pas été faite, c'est celle-ci qui compte
    S.today = S.today || {date, override:0, plan:{title:sess.title, focus, sections:[], tips:[], why:[]}, log:{}, finished:true, rpe:d.rpe, doneCount:items.length, manual:true};
  }
  S.logDraft = null; ui.logging = false; ui.logPick = false; ui.confirmDiscard = false;
  save(); window.scrollTo(0,0); toast("Séance enregistrée");
  return true;
}

/* « Pourquoi je me sens comme ça » : l'humeur du questionnaire, expliquée par la phase du jour. */
function moodCard(a, phase, hormonal){
  const m = MOODS.find(x=>x.k===a?.mood); if (!m) return "";
  let txt;
  if (hormonal) txt = "Avec une contraception hormonale, tes hormones restent assez stables : ton humeur dépend surtout de ton sommeil, de ton stress et de ta journée.";
  else if (!phase) txt = "Note la date de tes dernières règles dans l'onglet Cycle : je pourrai t'expliquer le lien entre ton humeur et ta phase.";
  else txt = MOOD_WHY[phase][MOOD_GROUP[m.k]];
  const extra = [];
  if (a.sleep==="mal") extra.push("ta nuit difficile");
  if (a.stress==="eleve") extra.push("ta grosse journée");
  if ((a.symptoms||[]).some(x=>x!=="rien")) extra.push("ce que ton corps te dit aujourd'hui");
  return `<div class="card"><div class="row between"><span class="label">Ton humeur du jour</span>${phase&&!hormonal?`<span class="phase-chip"><span class="dot" style="--c:var(${PHASES[phase].c})"></span>${PHASES[phase].name}</span>`:""}</div>
    <h3>${esc(m.t)} : pourquoi ?</h3><p class="small hormone-line">${esc(txt)}</p>
    ${extra.length?`<p class="note">Et ${extra.join(", ").replace(/, ([^,]*)$/," et $1")} jouent sans doute autant que les hormones.</p>`:""}
    ${phase&&!hormonal?`<button class="linkbtn" style="align-self:flex-start" data-act="go-cycle">Tout comprendre sur ta phase</button>`:""}</div>`;
}
function logCard(after){
  if (S.logDraft) return `<div class="banner"><p><b>Séance en cours de saisie</b> : ${S.logDraft.items.length} exercice${S.logDraft.items.length>1?"s":""} noté${S.logDraft.items.length>1?"s":""}.</p><button class="ob" data-act="log-start">Reprendre</button></div>`;
  return `<div class="card"><div class="row between" style="flex-wrap:nowrap"><div style="min-width:0"><h3>${after?"Une autre séance ?":"Tu as fait ta propre séance ?"}</h3><p class="small muted">Choisis tes exos, note tes séries : tout rejoint ton bilan et ta progression.</p></div>
    <button class="circ plain" data-act="log-start" aria-label="Noter ma séance">${PLUS}</button></div></div>`;
}
function exDone(k, it){
  const lg = S.today.log[k]||{};
  if (it.sets && !it.timed) { const ss = lg.sets||[]; let n=0; for (let i=0;i<it.sets;i++) if (ss[i]?.ok) n++; return n===it.sets; }
  return !!lg.done;
}
function banBtn(k, it){
  if (!it.id || demo) return "";
  return `<button class="linkbtn ban-btn" data-act="ban" data-v="${k}">Je n'aime pas cet exercice</button>`;
}
function exItem(k, it){
  const lg = S.today.log[k]||{}, done = exDone(k, it), img = illustration(it.ill);
  const name = (it.prefix?`<span class="muted">${it.prefix} · </span>`:"")+esc(it.name)+(it.tagNew?'<span class="tag">Nouveau</span>':"")+(it.up?'<span class="tag">Charge en hausse</span>':"");
  let h = `<div class="ex ${done?"done":""}">`;
  const detail = it.sets && !it.timed ? `${it.sets} séries × ${it.lo}–${it.hi} reps${it.rest?` · repos ${fmtRest(it.rest)}`:""}${it.rpe?` · RPE ${it.rpe}`:""}` : esc(it.detail||"");
  if (!(it.sets && !it.timed)) {
    const inner = `<div class="simple"><div style="min-width:0"><div class="name">${name}</div><div class="detail">${detail}</div>${banBtn(k, it)}</div><button class="chk" data-act="done" data-v="${k}" aria-pressed="${!!lg.done}" aria-label="Marquer comme fait">${CHECK}</button></div>`;
    return h + (img ? `<div class="ex-head"><div class="ill">${img}</div>${inner}</div>` : inner) + `</div>`;
  }
  h += `<div class="ex-head ${img?"":"noimg"}">${img?`<div class="ill">${img}</div>`:""}<div class="stack" style="gap:6px;min-width:0"><div class="name">${name}</div><div class="detail">${detail}</div>`;
  if (it.w) h += `<div class="load"><span class="dotnum">${fr(it.kg)}</span><span class="u">kg ${loadLabel(it.eq)}</span></div>`;
  h += `</div></div>`;
  if (it.reason) h += `<p class="reason ${it.up?"up":""}">${esc(it.reason)}</p>`;
  h += banBtn(k, it);
  if (it.note) h += `<p class="reason">${esc(it.note)}</p>`;
  const ss = lg.sets||[];
  h += `<div class="sets">`;
  for (let i=0;i<it.sets;i++){
    const st = ss[i]||{};
    h += `<div class="set ${it.w?"":"noload"}"><span class="n">${i+1}</span>`;
    if (it.w) h += `<input id="kg-${k}-${i}" type="number" inputmode="decimal" step="0.5" min="0" value="${st.kg??it.kg}" data-set="${k}|${i}|kg" aria-label="Charge série ${i+1}"><span class="x">kg ×</span>`;
    h += `<input id="rp-${k}-${i}" type="number" inputmode="numeric" min="0" placeholder="${it.lo}–${it.hi}" value="${st.reps??""}" data-set="${k}|${i}|reps" aria-label="Reps série ${i+1}">`;
    h += `<button class="chk" data-act="set" data-v="${k}|${i}" aria-pressed="${!!st.ok}" aria-label="Série ${i+1} faite">${CHECK}</button></div>`;
  }
  return h + `</div></div>`;
}

/* wizard */
function viewWizard(){
  const step = STEPS[ui.wizStep], a = ui.wiz, n = STEPS.length;
  const pr = (k,v) => `aria-pressed="${a[k]===v}"`;
  const opt = (k,list,num) => `<div class="opts">${list.map(([v,t,d])=>`<button class="opt" data-act="ans" data-k="${k}" data-v="${v}" ${num?'data-num="1"':""} ${pr(k,num?+v:v)}><b>${t}</b>${d?`<span>${d}</span>`:""}</button>`).join("")}</div>`;
  let body = "";
  switch(step.k){
    case "time": {
      const [hh,mm] = String(a.time||"18:30").split(":"); const mins = (+hh)*60+(+mm);
      body = `<div class="bignum"><span class="dotnum">${esc(hh)}:${esc(mm)}</span></div>${ruler(clamp((mins-360)/(1380-360)*100,0,100))}
      <div class="chips">${["07:00","12:30","17:30","18:30","20:00","21:30"].map(t=>`<button class="chip" data-act="ans" data-k="time" data-v="${t}" ${pr("time",t)}>${t.replace(":","h")}</button>`).join("")}</div>
      <div class="field"><label class="label" for="time-in">Ou une heure précise</label><input id="time-in" type="time" value="${esc(a.time)}" data-time></div>
      <p class="small">${{matin:"Le matin, on rallonge l'échauffement : le corps est plus raide.",midi:"Le midi, on fait court et efficace.",aprem:"L'après-midi, c'est souvent le moment où on est la plus forte.",soir:"Le soir, créneau classique : on adapte si la salle est pleine.",tard:"Tard le soir, on évite le très intense pour bien dormir."}[slotOf(a.time)]}</p>`; break; }
    case "duration": body = `<div class="bignum"><span class="dotnum">${a.duration||"--"}</span><span>minutes</span></div>${opt("duration",[[20,"20 min","Express"],[30,"30 min","Court et efficace"],[45,"45 min","Le classique"],[60,"1 h","Séance complète"],[75,"1 h 15","J'ai tout mon temps"]],1)}`; break;
    case "mood": body = `<div class="chips">${MOODS.map(m=>`<button class="chip" data-act="ans" data-k="mood" data-v="${m.k}" ${pr("mood",m.k)}>${m.t}</button>`).join("")}</div>`; break;
    case "energy": body = `<div class="bignum"><span class="dotnum">${a.energy||"-"}</span><span>sur 5</span></div><div class="scale">${[[1,"vide"],[2,"faible"],[3,"moyenne"],[4,"bonne"],[5,"à bloc"]].map(([v,l])=>`<button data-act="ans" data-k="energy" data-v="${v}" data-num="1" ${pr("energy",v)}><b>${v}</b><span>${l}</span></button>`).join("")}</div>`; break;
    case "sleep": body = opt("sleep",[["mal","Mal","Moins de 6 h ou nuit agitée"],["moyen","Moyen","Ça ira"],["bien","Bien","Reposée"]]); break;
    case "symptoms": body = `<p class="small">Plusieurs réponses possibles.</p><div class="chips">${Object.entries(SYMPTOMS).map(([k,t])=>`<button class="chip" data-act="sym" data-v="${k}" aria-pressed="${a.symptoms.includes(k)}">${t}</button>`).join("")}</div>
      <span class="label">Douleurs (règles, ventre, autre)</span><div class="chips">${[["aucune","Aucune"],["legeres","Légères"],["fortes","Fortes"]].map(([v,t])=>`<button class="chip" data-act="ans" data-k="pain" data-v="${v}" data-stay="1" ${pr("pain",v)}>${t}</button>`).join("")}</div>`; break;
    case "stress": body = opt("stress",[["bas","Tranquille","Journée calme"],["moyen","Normal","Le stress habituel"],["eleve","Grosse pression","Journée chargée, tête pleine"]]); break;
    case "want": body = opt("want",[["auto","Choisis pour moi","Selon ton cycle, ta dernière séance et tes objectifs"],["bas","Bas du corps","Fessiers, jambes"],["haut","Haut du corps","Dos, bras, épaules"],["full","Full body","Un peu de tout"],["cardio","Cardio","Transpirer, souffle"],["mobilite","Mobilité & récup","Douceur, étirements"]]); break;
    case "crowd": body = opt("crowd",[["calme","Plutôt calme","Machines et racks dispo"],["moyen","Normal","Un peu d'attente parfois"],["bondee","Bondée","Je veux éviter d'attendre les machines"]]); break;
    case "food": body = opt("food",[["jeun","À jeun","Rien depuis plusieurs heures"],["leger","Un en-cas","Fruit, yaourt, barre…"],["repas","Un vrai repas","Il y a 1 à 3 h"]]); break;
  }
  const answered = step.k==="symptoms" ? true : a[step.k]!=null;
  const last = ui.wizStep===n-1;
  return `<div class="wiz"><div class="row between"><button class="circ plain" data-act="wiz-cancel" aria-label="Annuler">${ARROW_L}</button><span>Question ${ui.wizStep+1} / ${n}</span><span style="width:46px"></span></div>
    <div class="card glow g-pink" style="gap:18px"><div class="pdots">${STEPS.map((_,i)=>`<i class="${i===ui.wizStep?"on":""}"></i>`).join("")}</div>
    <p class="q">${step.q}</p>${body}
    <div class="wiz-nav"><button class="circ" data-act="wiz-prev" ${ui.wizStep===0?"disabled":""} aria-label="Question précédente">${ARROW_L}</button><button class="pill" data-act="wiz-next" ${answered?"":"disabled"}><span>${last?"Construire ma séance":"Suivant"}</span><span class="plus">${last?PLUS:ARROW_R}</span></button></div></div></div>`;
}

function viewCycle(){
  const t = todayISO(), p = S.profile, c = S.cycle, ci = cycleInfo(c, t);
  let h = `<h1>Ton cycle</h1>`;
  if (p.hormonal) h += `<div class="card"><p>Avec ta contraception (${esc(CONTRA[contraOf(p)].t.toLowerCase())}), tes hormones restent plutôt stables : tes séances se basent surtout sur ton questionnaire du jour. Tu peux quand même noter tes saignements ici.</p></div>`;
  if (ci && !p.hormonal) {
    const L = ci.L, cx=140, cy=140, r=104, parts=[];
    for (let d=1; d<=L; d++){
      const k = cycleInfo({lastStart:"2000-01-01",length:L,periodLen:ci.P}, addDays("2000-01-01", d-1)).key;
      const a0 = (-90 + (d-1)*360/L + 1.6)*Math.PI/180, a1 = (-90 + d*360/L - 1.6)*Math.PI/180;
      const P = (rr,a)=>[(cx+rr*Math.cos(a)).toFixed(1),(cy+rr*Math.sin(a)).toFixed(1)];
      const [x0,y0]=P(r,a0),[x1,y1]=P(r,a1);
      parts.push(`<path d="M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}" style="stroke:var(${PHASES[k].c})" stroke-width="${d===ci.day?16:9}" fill="none" opacity="${d<=ci.day?1:.4}"/>`);
      const am = (-90 + (d-.5)*360/L)*Math.PI/180, [tx0,ty0]=P(122,am), [tx1,ty1]=P(d===ci.day?136:128,am);
      parts.push(`<line class="${d===ci.day?"now":"tk2"}" x1="${tx0}" y1="${ty0}" x2="${tx1}" y2="${ty1}" stroke-width="${d===ci.day?2.5:1}"/>`);
    }
    for (let i=0;i<72;i++){ const a=i*5*Math.PI/180; parts.push(`<line class="tk" x1="${(cx+80*Math.cos(a)).toFixed(1)}" y1="${(cy+80*Math.sin(a)).toFixed(1)}" x2="${(cx+(i%6?84:88)*Math.cos(a)).toFixed(1)}" y2="${(cy+(i%6?84:88)*Math.sin(a)).toFixed(1)}" stroke-width="1"/>`); }
    const toNext = dayDiff(t, ci.nextStart), toOv = dayDiff(t, ci.ovDate);
    h += `<div class="card" style="background:var(--dial-bg)"><svg class="dial" viewBox="0 0 280 280" role="img" aria-label="Jour ${ci.day} sur ${L}">${parts.join("")}
      <circle cx="140" cy="140" r="58" fill="#F4F3F0" stroke="rgba(0,0,0,.08)"/>
      <text x="140" y="146" text-anchor="middle" font-family="Doto, monospace" font-weight="900" font-size="46" fill="#0B0B0C">${ci.day}</text>
      <text x="140" y="170" text-anchor="middle" font-family="Geist, sans-serif" font-size="12" fill="#0B0B0C">jour sur ${L}</text></svg>
      <div class="legend">${Object.values(PHASES).map(ph=>`<div><span class="dot" style="--c:var(${ph.c})"></span>${ph.name}</div>`).join("")}</div></div>
      <div class="tiles"><div class="tile g-tile-pink"><span class="label">Prochaines règles</span><div><div class="val"><span class="dotnum">${toNext}</span><span class="u">jour${toNext>1?"s":""}</span></div><p class="sub">${esc(fmtLong(ci.nextStart))}</p></div></div>
      <div class="tile g-tile-sage"><span class="label">Ovulation estimée</span><div><div class="val"><span class="dotnum">${parse(ci.ovDate).getDate()}</span><span class="u">${MONTHS[parse(ci.ovDate).getMonth()]}</span></div><p class="sub">${toOv>1?"dans "+toOv+" jours":toOv===1?"demain":toOv===0?"aujourd'hui":"passée ce cycle-ci"}</p></div></div></div>
      ${ci.overdue?`<p class="note">Tes règles semblent en retard par rapport à ton cycle habituel. Si elles ont commencé, note-le ci-dessous.</p>`:""}`;
    if (!p.hormonal) {
      h += hormoneCard(ci);
      const sc = SCIENCE[ci.key];
      h += `<div class="card glow ${PHASES[ci.key].g}"><span class="label">Phase actuelle · pourquoi tu ressens ça</span><h2>${PHASES[ci.key].name}${ci.late?" (fin de cycle)":""}</h2>
        <p class="small hormone-line">${sc.hormones}</p>
        <ul class="sci">${sc.items.map(x=>`<li><b>${x.t}</b><span>${x.d}</span></li>`).join("")}</ul>
        <p class="small"><b>À la salle :</b> ${PHASES[ci.key].train}</p></div>`;
    }
  } else if (!p.hormonal) h += `<div class="card"><p>Indique la date de tes dernières règles pour que les séances suivent ton cycle.</p></div>`;
  h += contraInfoCard(p);
  if (p.hormonal) h += `<div class="card"><span class="label">Pourquoi tu ressens ça</span><p class="small hormone-line">${SCIENCE_HORMONAL.hormones}</p><ul class="sci">${SCIENCE_HORMONAL.items.map(x=>`<li><b>${x.t}</b><span>${x.d}</span></li>`).join("")}</ul></div>`;
  h += `<div class="card"><h3>Mes règles</h3><button class="pill block" data-act="period-today"><span>Mes règles ont commencé aujourd'hui</span><span class="plus">${PLUS}</span></button>
    <div class="field"><label class="label" for="c-start">Début des dernières règles</label><input id="c-start" type="date" value="${esc(c.lastStart||"")}" max="${t}"></div>
    <div class="grid2"><div class="field"><label class="label" for="c-len">Durée du cycle (jours)</label><input id="c-len" type="number" inputmode="numeric" min="20" max="45" value="${c.length}"></div>
    <div class="field"><label class="label" for="c-per">Durée des règles (jours)</label><input id="c-per" type="number" inputmode="numeric" min="2" max="10" value="${c.periodLen}"></div></div>
    <button class="ob" style="align-self:flex-start" data-act="save-cycle">Enregistrer</button>
    ${(c.starts||[]).length>1?`<p class="note">Historique : ${c.starts.slice(-4).map(fmtShort).map(esc).join(" · ")}. La durée du cycle se recalcule toute seule.</p>`:""}</div>`;
  if (!p.hormonal) {
    h += moodByPhaseCard();
    const others = Object.keys(PHASES).filter(k=>!ci || k!==ci.key);
    h += `<div class="card"><span class="label">Les autres phases, expliquées</span>${others.map(k=>`<details class="ph"><summary><span class="dot" style="--c:var(${PHASES[k].c})"></span>${PHASES[k].name}</summary>
      <p class="small hormone-line" style="margin-top:12px">${SCIENCE[k].hormones}</p><ul class="sci">${SCIENCE[k].items.map(x=>`<li><b>${x.t}</b><span>${x.d}</span></li>`).join("")}</ul></details>`).join("")}</div>`;
  }
  h += `<div class="card"><span class="label">Tout le monde n'est pas pareil</span>
    <p class="small">En moyenne, les hormones jouent sur l'humeur, mais beaucoup moins qu'on le croit pour la plupart des femmes. Une revue de 47 études qui suivaient l'humeur jour après jour n'a trouvé une humeur plus basse spécifiquement avant les règles que dans une minorité d'entre elles. Le sommeil, le stress, la santé et le soutien des proches pesaient souvent plus lourd que la phase.</p>
    <p class="small">À l'inverse, environ 3 à 8 % des femmes ont un trouble dysphorique prémenstruel (TDPM) : tristesse, anxiété ou colère fortes chaque mois avant les règles, au point de gêner la vie de tous les jours. Ça se soigne : parles-en à un·e médecin ou une sage-femme.</p>
    <p class="note">C'est pour ça que Phase Gym compare avec <b>tes</b> réponses (la carte « Ton humeur selon ta phase ») et donne plus de poids à ton ressenti du jour qu'au calendrier. Ce n'est ni un outil médical ni une méthode de contraception.</p>
    <details class="ph"><summary>Sources</summary><ul class="src" style="margin-top:10px">${SOURCES.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul></details></div>`;
  return h;
}
function hormoneCard(ci){
  const L = ci.L, {E, P} = hormoneCurves(L), W = 320, H = 150, top = 12, bot = 112, x = d => 10 + (d-1)*(W-20)/(L-1), y = v => bot - v*(bot-top);
  const path = arr => arr.map((v,i)=>(i?"L":"M")+x(i+1).toFixed(1)+" "+y(v).toFixed(1)).join(" ");
  let bands = "";
  for (let d=1; d<=L; d++){ const k = cycleInfo({lastStart:"2000-01-01",length:L,periodLen:ci.P}, addDays("2000-01-01", d-1)).key; const w = (W-20)/(L-1); bands += `<rect x="${(x(d)-w/2).toFixed(1)}" y="122" width="${(w+.4).toFixed(1)}" height="6" style="fill:var(${PHASES[k].c})" opacity="${d<=ci.day?1:.45}"/>`; }
  const e = E[ci.day-1], pr = P[ci.day-1], eP = E[Math.max(0,ci.day-2)], pP = P[Math.max(0,ci.day-2)];
  const trend = (v, prev) => v > prev + .01 ? "montent" : v < prev - .01 ? "baissent" : "sont stables";
  const lvl = v => v > .7 ? "hauts" : v > .35 ? "moyens" : "bas";
  return `<div class="card"><span class="label">Tes hormones aujourd'hui (courbe moyenne)</span>
    <svg class="hchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Œstrogènes ${trend(e,eP)}, progestérone ${trend(pr,pP)}">
      <line class="grid" x1="10" y1="${bot}" x2="${W-10}" y2="${bot}"/>
      <path d="${path(E)}" fill="none" style="stroke:var(--h-e)" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="${path(P)}" fill="none" style="stroke:var(--h-p)" stroke-width="2.4" stroke-linejoin="round" stroke-dasharray="6 4"/>
      ${bands}
      <line x1="${x(ci.day)}" y1="4" x2="${x(ci.day)}" y2="130" style="stroke:var(--acc-fg)" stroke-width="2"/>
      <circle cx="${x(ci.day)}" cy="${y(e)}" r="4" style="fill:var(--h-e)"/><circle cx="${x(ci.day)}" cy="${y(pr)}" r="4" style="fill:var(--h-p)"/>
      <text x="10" y="${H-4}">J1</text><text x="${x(L-14)}" y="${H-4}" text-anchor="middle">ovulation</text><text x="${W-10}" y="${H-4}" text-anchor="end">J${L}</text>
    </svg>
    <div class="hlegend"><span><i style="--c:var(--h-e)"></i>Œstrogènes</span><span><i style="--c:var(--h-p);background:repeating-linear-gradient(90deg,var(--h-p) 0 5px,transparent 5px 8px)"></i>Progestérone</span></div>
    <p class="small">J${ci.day} : les œstrogènes ${trend(e,eP)} (niveau ${lvl(e)}), la progestérone ${trend(pr,pP)} (niveau ${lvl(pr)}).</p></div>`;
}
/* Ce que disent TES questionnaires : l'humeur la plus fréquente dans chaque phase. */
function moodByPhaseCard(){
  const by = {mens:{}, foll:{}, ovu:{}, lut:{}}, t = todayISO(); let total = 0;
  Object.entries(S.checkins).forEach(([d,a])=>{ const ci = cycleInfo(S.cycle, d); if (!ci || !a.mood || dayDiff(d,t) > 180 || dayDiff(d,t) < 0) return; by[ci.key][a.mood] = (by[ci.key][a.mood]||0)+1; total++; });
  let h = `<div class="card"><span class="label">Ton humeur selon ta phase</span>`;
  if (total < 3) return h + `<p class="muted small">Remplis le questionnaire avant tes séances : ici tu verras quelles humeurs reviennent dans chaque phase, chez toi.</p></div>`;
  h += `<div>${Object.keys(PHASES).map(k=>{ const e = Object.entries(by[k]).sort((a,b)=>b[1]-a[1]);
    return `<div class="moodrow"><div class="ph"><span class="dot" style="--c:var(${PHASES[k].c})"></span>${PHASES[k].name}</div><div class="mchips">${e.length?e.slice(0,3).map(([m,n],i)=>`<span class="${i===0?"top1":""}">${esc(MOODS.find(x=>x.k===m)?.t||m)} · ${n}</span>`).join(""):`<span class="muted" style="border:0;padding:0">pas encore de données</span>`}</div></div>`; }).join("")}</div>`;
  const neg = k => ["plat","irritable","triste"].reduce((s,m)=>s+(by[k][m]||0),0), cnt = k => Object.values(by[k]).reduce((a,b)=>a+b,0);
  const rates = Object.keys(PHASES).filter(k=>cnt(k)>=2).map(k=>[k, neg(k)/cnt(k)]).sort((a,b)=>b[1]-a[1]);
  if (rates.length>=2 && rates[0][1] > rates[rates.length-1][1] + .2) h += `<p class="note">Chez toi, les humeurs basses reviennent surtout en phase ${PHASES[rates[0][0]].name.toLowerCase()}. ${rates[0][0]==="lut"?"C'est le schéma classique du SPM, expliqué plus haut.":rates[0][0]==="mens"?"Fatigue et douleurs des règles y sont souvent pour beaucoup.":"Ce n'est pas le schéma le plus courant : ton sommeil et ton stress jouent peut-être davantage."}</p>`;
  else h += `<p class="note">Pas de grosse différence entre tes phases : comme beaucoup de femmes, ton humeur dépend sans doute plus de ta vie que de ton cycle.</p>`;
  return h + `</div>`;
}

function spark(hist){
  if (!hist || hist.length<2) return `<span class="note">–</span>`;
  const ks = hist.map(x=>x.kg), mn = Math.min(...ks), mx = Math.max(...ks), rg = (mx-mn)||1;
  const pts = ks.map((k,i)=>[4+i*(76/(ks.length-1)), 26-((k-mn)/rg)*20]);
  const d = pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const e = pts[pts.length-1];
  return `<svg viewBox="0 0 84 30" preserveAspectRatio="none"><path d="${d}" fill="none" style="stroke:var(--acc-fg)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="${e[0]}" cy="${e[1]}" r="3" style="fill:var(--acc-fg)"/></svg>`;
}
function viewStats(){
  const t = todayISO(), ss = S.sessions;
  const inMonth = ss.filter(x=>x.date.startsWith(t.slice(0,7))).length;
  const mon = addDays(t, -((parse(t).getDay()+6)%7));
  const inWeek = ss.filter(x=>x.date>=mon).length;
  const rpes = ss.slice(0,10).filter(x=>x.rpe).map(x=>x.rpe);
  const avgRpe = rpes.length ? fr((rpes.reduce((a,b)=>a+b,0)/rpes.length).toFixed(1)) : "–";
  const liftsArr = Object.entries(S.lifts).map(([n,v])=>[n, typeof v==="number"?{kg:v,hist:[]}:v]);
  const gain = liftsArr.reduce((acc,[,v])=>acc + ((v.hist&&v.hist.length>1)?(v.kg - v.hist[0].kg):0), 0);
  let h = `<h1>Ton bilan</h1><div class="tiles">
    <div class="tile g-mauve"><span class="label">Cette semaine</span><div><div class="val"><span class="dotnum">${inWeek}/${S.profile.perWeek}</span></div><p class="sub">séances</p></div></div>
    <div class="tile g-tile-sage"><span class="label">Ce mois-ci</span><div><div class="val"><span class="dotnum">${inMonth}</span></div><p class="sub">séance${inMonth>1?"s":""}</p></div></div>
    <div class="tile g-tile-pink"><span class="label">Effort moyen</span><div><div class="val"><span class="dotnum">${avgRpe}</span></div><p class="sub">sur 10, en moyenne</p></div></div>
    <div class="tile g-tile-blue"><span class="label">Kilos gagnés</span><div><div class="val"><span class="dotnum">+${fr(Math.round(gain))}</span><span class="u">kg</span></div><p class="sub">cumulés, tous exos</p></div></div></div>`;
  h += `<div class="card"><span class="label">Ta progression, exercice par exercice</span>${liftsArr.length?`<div>${liftsArr.slice(0,12).map(([n,v])=>{ const first = v.hist&&v.hist.length?v.hist[0].kg:v.kg; const dlt = Math.round((v.kg-first)*10)/10;
      return `<div class="prog"><div style="min-width:0"><div>${esc(n)}</div><p class="note">${v.sets&&v.sets.length?"Dernière fois : "+v.sets.map(s=>s.reps).join(" / ")+" reps":""}${dlt>0?` · +${fr(dlt)} kg depuis le début`:""}</p></div>${spark(v.hist)}<div class="kg"><span class="dotnum">${fr(v.kg)}</span><span class="note"> kg</span></div></div>`; }).join("")}</div>`:`<p class="muted small">Note tes charges pendant tes séances : ta progression apparaîtra ici.</p>`}</div>`;
  if (!S.profile.hormonal) {
    const byPhase = {mens:[],foll:[],ovu:[],lut:[]};
    Object.entries(S.checkins).forEach(([d,a])=>{ const ci=cycleInfo(S.cycle,d); if (ci && a.energy && dayDiff(d,t) < 120) byPhase[ci.key].push(a.energy); });
    const any = Object.values(byPhase).some(v=>v.length);
    h += `<div class="card"><span class="label">Ton énergie selon ta phase</span>`;
    if (any) {
      h += `<div class="bars">${Object.entries(byPhase).map(([k,v])=>{ const avg=v.length?v.reduce((a,b)=>a+b,0)/v.length:0; return `<div class="bar"><span>${PHASES[k].name}</span><span class="track"><i style="--c:var(${PHASES[k].c});width:${(avg/5)*100}%"></i></span><span class="dotnum" style="font-size:1rem;text-align:right;display:block">${v.length?fr(avg.toFixed(1)):"–"}</span></div>`; }).join("")}</div>`;
      const best = Object.entries(byPhase).filter(([,v])=>v.length>=2).map(([k,v])=>[k,v.reduce((a,b)=>a+b,0)/v.length]).sort((a,b)=>b[1]-a[1])[0];
      if (best) h += `<p class="note">C'est en phase ${PHASES[best[0]].name.toLowerCase()} que tu te sens le plus en forme (moyenne sur 5, questionnaires des 4 derniers mois).</p>`;
    } else h += `<p class="muted small">Remplis le questionnaire avant tes séances : ce graphique montrera comment ton énergie varie avec ton cycle.</p>`;
    h += `</div>`;
  }
  h += `<div class="card"><div class="row between"><span class="label">Historique</span><button class="ob" data-act="log-start">+ Noter une séance</button></div>${ss.length?`<div class="hist">${ss.slice(0,30).map(x=>`<div class="item"><span class="dot" style="--c:var(${x.phase?PHASES[x.phase].c:"--muted"})"></span><div style="min-width:0"><div>${esc(x.title)}</div><p class="note">${esc(fmtLong(x.date))}${x.cycleDay?" · J"+x.cycleDay:""}${x.note?" · "+esc(x.note):""}</p>${x.ex?`<p class="note">${x.ex.map(e=>esc(e.name)+(e.cardio?" "+e.min+" min":e.w&&e.sets.length?" "+fr(Math.max(...e.sets.map(s=>s.kg)))+" kg":"")).join(" · ")}</p>`:""}</div><span class="dotnum" style="font-size:1.1rem">${x.rpe||""}</span></div>`).join("")}</div>`:`<p class="muted small">Aucune séance enregistrée. Termine ta première séance pour la voir ici.</p>`}</div>`;
  return h;
}

function viewProfile(){
  const base = {name:"", level:"debutante", goal:"tonus", persona:"methodique", perWeek:3, duration:45, focus:[], banned:[], injuries:"", hormonal:false, contra:"aucune", diuCycle:null, bw:"", gym:{chain:"basicfit", pref:"mix"}};
  if (demo) return `<h1>Ton profil</h1><div class="card glow g-mauve"><h2>Ici, c'est le profil d'Inès</h2><p class="small">Réponds à quelques questions (2 minutes) pour créer le tien. Les données de l'exemple disparaîtront.</p><button class="pill block" data-act="start"><span>Créer mon profil</span><span class="plus">${ARROW_R}</span></button></div>`;
  if (!ui.draft) ui.draft = JSON.parse(JSON.stringify(Object.assign({}, base, S.profile)));
  const p = ui.draft; p.gym = p.gym||{chain:"basicfit",pref:"mix"};
  const gym = gymOf(p);
  const sel = (k,v) => `aria-pressed="${p[k]===v}"`;
  let h = `<h1>Ton profil</h1>
  <div class="card"><div class="field"><label class="label" for="p-name">Ton prénom</label><input id="p-name" value="${esc(p.name)}" placeholder="Ton prénom" data-pf="name"></div>
  <div class="field"><label class="label" for="p-bw">Ton poids en kg (facultatif)</label><input id="p-bw" type="number" inputmode="decimal" min="35" max="160" value="${esc(p.bw)}" placeholder="Sert seulement à estimer tes premières charges" data-pf="bw"></div></div>
  <div class="card glow g-mauve"><span class="label">Ton caractère à la salle</span><p class="small">Ça change le ton du coach et le format des séances.</p><div class="opts">${Object.entries(PERSONAS).map(([k,v])=>`<button class="opt" data-act="pf" data-k="persona" data-v="${k}" ${sel("persona",k)}><b>${v.t}</b><span>${v.d}</span></button>`).join("")}</div></div>
  <div class="card"><span class="label">Ton objectif principal</span><div class="chips">${Object.entries(GOALS).map(([k,v])=>`<button class="chip" data-act="pf" data-k="goal" data-v="${k}" ${sel("goal",k)}>${v}</button>`).join("")}</div>
  <span class="label">Ton niveau</span><div class="opts">${Object.entries(LEVELS).map(([k,v])=>`<button class="opt" data-act="pf" data-k="level" data-v="${k}" ${sel("level",k)}><b>${v}</b></button>`).join("")}</div></div>
  <div class="card"><span class="label">Ta salle</span><div class="chips">${Object.entries(GYMS).map(([k,v])=>`<button class="chip" data-act="gym" data-v="${k}" aria-pressed="${gym.chain===k}">${v.t}</button>`).join("")}</div>
  <span class="label">Tu préfères</span><div class="opts">${Object.entries(PREFS).map(([k,v])=>`<button class="opt" data-act="pref" data-v="${k}" aria-pressed="${gym.pref===k}"><b>${v.t}</b><span>${v.d}</span></button>`).join("")}</div>
  <span class="label">Ce qu'il y a dans ta salle</span><p class="note">Pré-rempli avec l'équipement habituel ${gym.chain==="indep"?"d'une salle indépendante":"de ce type de salle"}. Ça varie d'un club à l'autre : coche ce qu'il y a vraiment dans le tien.</p>
  <div class="chips">${Object.entries(EQUIP).map(([k,v])=>`<button class="chip" data-act="equip" data-v="${k}" aria-pressed="${!!gym.equip[k]}">${v}</button>`).join("")}</div>
  <div class="field"><label class="label" for="p-max">Haltère le plus lourd (kg)</label><input id="p-max" type="number" min="5" max="80" value="${gym.max}" data-gmax></div></div>
  <div class="card"><span class="label">Exercices et machines que tu n'aimes pas</span>
  ${(p.banned||[]).length ? `<p class="note">Jamais proposés : une autre version les remplace. Touche pour les remettre.</p><div class="chips">${p.banned.map(n=>`<button class="chip ban" data-act="pban" data-v="${esc(n)}" aria-pressed="true">${esc(n)}</button>`).join("")}</div>` : `<p class="note">Aucun pour l'instant. Tu peux aussi en retirer un pendant la séance avec « Je n'aime pas cet exercice ».</p>`}
  <button class="ob" style="align-self:flex-start" data-act="pban-open" aria-expanded="${!!ui.banOpen}">${ui.banOpen?"Fermer la liste":"Choisir dans la liste"}</button>
  ${ui.banOpen ? BAN_GROUPS.map(([g,f])=>{ const vs = allVariants().filter(f); return vs.length ? `<span class="label">${g}</span><div class="chips">${vs.map(v=>`<button class="chip ban" data-act="pban" data-v="${esc(v.n)}" aria-pressed="${(p.banned||[]).includes(v.n)}">${esc(v.n)}</button>`).join("")}</div>` : ""; }).join("") : ""}
  ${(p.banned||[]).length>1?`<button class="linkbtn" style="align-self:flex-start" data-act="pban-clear">Tout remettre</button>`:""}</div>
  <div class="card"><span class="label">Zones à travailler en priorité</span><div class="chips">${Object.entries(ZONES).map(([k,v])=>`<button class="chip" data-act="pzone" data-v="${k}" aria-pressed="${(p.focus||[]).includes(k)}">${v}</button>`).join("")}</div>
  <div class="grid2"><div class="field"><label class="label" for="p-week">Séances / semaine</label><select id="p-week" data-pf="perWeek">${[1,2,3,4,5,6].map(n=>`<option ${+p.perWeek===n?"selected":""}>${n}</option>`).join("")}</select></div>
  <div class="field"><label class="label" for="p-dur">Durée habituelle</label><select id="p-dur" data-pf="duration">${[[30,"30 min"],[45,"45 min"],[60,"1 h"],[75,"1 h 15"]].map(([n,l])=>`<option value="${n}" ${+p.duration===n?"selected":""}>${l}</option>`).join("")}</select></div></div>
  <div class="field"><label class="label" for="p-inj">Blessure ou gêne à prendre en compte</label><input id="p-inj" value="${esc(p.injuries)}" placeholder="Ex : genou droit sensible" data-pf="injuries"></div></div>
  <div class="card"><span class="label">Contraception</span><p class="small muted">Les hormones de synthèse changent la façon dont le cycle est pris en compte.</p>${contraField(Object.assign({}, p, {contra:contraOf(p)}), "pf")}</div>
  <button class="pill block" data-act="save-profile"><span>Enregistrer</span><span class="plus">${CHECK}</span></button>
  <p class="note">Tes données restent sur ce téléphone. Thème, sauvegarde et remise à zéro : menu en haut à gauche.</p>`;
  return h;
}

/* ---------- actions ---------- */
function generate(){ const t = todayISO(); S.today = {date:t, override:ui.override, plan:buildPlan(S, t, ui.override), log:{}, finished:false}; save(); }
function relearn(c){
  const s = c.starts.slice(-6), gaps = [];
  for (let i=1;i<s.length;i++){ const g = dayDiff(s[i-1], s[i]); if (g>=20 && g<=45) gaps.push(g); }
  if (gaps.length) c.length = Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, v = b.dataset.v, t = todayISO();
  switch(act){
    case "tab": if (v!=="today") { ui.logging = false; ui.logPick = false; } ui.tab = v; if (v!=="today") ui.wiz = null; if (v!=="profile") ui.draft = null; ui.confirmReset = false; window.scrollTo(0,0); break;
    case "start": ui.menu = false; ui.onb = {step:0, d:onbDefaults()}; window.scrollTo(0,0); break;
    case "demo": startDemo(); window.scrollTo(0,0); break;
    /* questions de profil */
    case "onb-go": ui.onb.step = 0; window.scrollTo(0,0); break;
    case "onb-cancel": ui.onb = null; break;
    case "onb-redo": ui.menu = false; ui.onb = {step:-1, d:onbDefaults(S.profile)}; window.scrollTo(0,0); break;
    case "onb-back": ui.onb.step--; if (ui.onb.step < 0 && demo) { ui.onb = null; } window.scrollTo(0,0); break;
    case "onb-next": {
      const steps = onbSteps(), st = steps[clamp(ui.onb.step,0,steps.length-1)];
      if (st.k==="name") { const el = $("#o-name"); if (el) ui.onb.d.name = el.value; if (!ui.onb.d.name.trim()) { toast("Indique ton prénom"); el && el.focus(); return; } }
      if (ui.onb.step >= steps.length-1) { finishOnboarding(); break; }
      ui.onb.step++; window.scrollTo(0,0); break; }
    case "onb": {
      const k = b.dataset.k; ui.onb.d[k] = b.dataset.bool ? v==="1" : b.dataset.num ? +v : v;
      if (k==="contra" && v!=="diu") ui.onb.d.diuCycle = null;
      if (!b.dataset.stay) { render(); setTimeout(()=>{ if (ui.onb) { ui.onb.step++; render(); window.scrollTo(0,0); } }, 200); return; }
      break; }
    case "onb-zone": { const f = ui.onb.d.focus = ui.onb.d.focus||[]; const i = f.indexOf(v); i>=0 ? f.splice(i,1) : f.push(v); break; }
    case "onb-gym": ui.onb.d.gym = {chain:v, pref:(ui.onb.d.gym||{}).pref||"mix"}; break;
    case "onb-pref": ui.onb.d.gym = Object.assign({}, ui.onb.d.gym, {pref:v}); break;
    case "onb-equip": { const g = gymOf(ui.onb.d); g.equip[v] = g.equip[v]?0:1; ui.onb.d.gym = Object.assign({}, ui.onb.d.gym, {equip:g.equip}); break; }
    /* réglages */
    case "menu": ui.menu = true; ui.confirmReset = false; render(); setTimeout(()=>$("#drawer [data-act=menu-close]")?.focus(), 50); return;
    case "menu-close": ui.menu = false; ui.confirmReset = false; render(); $("[data-act=menu]")?.focus(); return;
    case "theme": setLook({theme:v}); break;
    case "accent": setLook({accent:v}); break;
    case "go-profile": ui.menu = false; ui.tab = "profile"; ui.wiz = null; window.scrollTo(0,0); break;
    case "go-cycle": ui.menu = false; ui.tab = "cycle"; ui.wiz = null; ui.draft = null; window.scrollTo(0,0); break;
    case "export": exportData(); return;
    case "import": $("#import-file").value = ""; $("#import-file").click(); return;
    case "wiz": case "redo": ui.wiz = Object.assign(defaultAnswers(S.profile), JSON.parse(JSON.stringify(S.checkins[t]||{}))); ui.wizStep=0; ui.override=0; ui.finishing=false; ui.tab="today"; window.scrollTo(0,0); break;
    case "wiz-cancel": ui.wiz=null; break;
    case "ans":
      ui.wiz[b.dataset.k] = b.dataset.num ? +v : v;
      if (!b.dataset.stay && b.dataset.k!=="time" && ui.wizStep < STEPS.length-1) { render(); setTimeout(()=>{ ui.wizStep++; render(); }, 180); return; }
      break;
    case "sym": { const s = ui.wiz.symptoms, i = s.indexOf(v);
      if (v==="rien") ui.wiz.symptoms = i>=0 ? [] : ["rien"];
      else { if (i>=0) s.splice(i,1); else { s.push(v); const r=s.indexOf("rien"); if (r>=0) s.splice(r,1); } }
      break; }
    case "wiz-prev": ui.wizStep = Math.max(0, ui.wizStep-1); break;
    case "wiz-next":
      if (ui.wizStep < STEPS.length-1) ui.wizStep++;
      else { S.checkins[t] = Object.assign({}, ui.wiz); ui.wiz=null; generate(); window.scrollTo(0,0); }
      break;
    case "ovr": ui.override += +v; S.today.plan = buildPlan(S, t, ui.override); S.today.log = {}; save(); toast(+v>0?"Séance plus intense":"Séance plus douce"); break;
    case "done": { const lg = S.today.log[v] = S.today.log[v]||{}; lg.done = !lg.done; save(); break; }
    case "set": {
      const [k,i] = v.split("|"), it = itemByKey(k); if (!it) break;
      const lg = S.today.log[k] = S.today.log[k]||{}; lg.sets = lg.sets||[];
      const st = lg.sets[+i] = lg.sets[+i]||{};
      st.ok = !st.ok;
      if (st.ok) { if (st.reps==null || st.reps==="") st.reps = it.lo; if (it.w && (st.kg==null || st.kg==="")) st.kg = it.kg; if (+i < it.sets-1 && it.rest) startTimer(it.rest); }
      save(); break; }
    case "timer-stop": clearInterval(tInt); timer = null; break;
    case "finish": ui.finishing = true; ui.rpe = null; ui.noteDraft = ""; break;
    case "rpe": ui.rpe = +v; ui.noteDraft = $("#note")?.value||""; break;
    case "save-session": {
      const plan = S.today.plan; let doneCount = 0, total = 0;
      allItems(plan).forEach(([k,it])=>{
        total++; if (exDone(k,it)) doneCount++;
        const lg = S.today.log[k]||{};
        if (it.w && it.sets && !it.timed) {
          const doneSets = (lg.sets||[]).slice(0,it.sets).filter(s=>s && s.ok && +s.reps>0).map(s=>({kg:+s.kg||it.kg, reps:+s.reps}));
          if (doneSets.length) {
            const prev = getLift(it.name), kg = Math.max(...doneSets.map(s=>s.kg));
            S.lifts[it.name] = {kg, eq:it.eq, lo:it.lo, hi:it.hi, sets:doneSets, date:t, hist:((prev&&prev.hist)||[]).filter(x=>x.d!==t).concat([{d:t,kg}]).slice(-20)};
          }
        }
      });
      const note = ($("#note")?.value||"").trim();
      S.sessions = S.sessions.filter(x=>!(x.date===t && x.fromToday));
      S.sessions.unshift({id:Date.now().toString(36), date:t, title:plan.title, focus:plan.focus, phase:plan.phase, cycleDay:plan.cycleDay, rpe:ui.rpe, note, done:doneCount, total, time:plan.time, fromToday:true});
      Object.assign(S.today, {finished:true, rpe:ui.rpe, doneCount});
      ui.finishing=false; clearInterval(tInt); timer=null; save(); toast("Séance enregistrée"); window.scrollTo(0,0); break; }
    case "period-today": { const c = S.cycle; c.starts = (c.starts||[]).filter(x=>x!==t); c.starts.push(t); c.starts.sort(); c.lastStart = t; relearn(c); save(); toast("Noté : J1 aujourd'hui"); break; }
    case "save-cycle": {
      const c = S.cycle, st = $("#c-start").value, L = +$("#c-len").value, P = +$("#c-per").value;
      if (st) { c.lastStart = st; c.starts = (c.starts||[]).filter(x=>x!==st); c.starts.push(st); c.starts.sort(); }
      if (L>=20 && L<=45) c.length = L; if (P>=2 && P<=10) c.periodLen = P;
      save(); toast("Cycle enregistré"); break; }
    case "pf": { const k=b.dataset.k; ui.draft[k] = b.dataset.bool ? v==="1" : v; if (k==="contra" && v==="diu" && ui.draft.diuCycle==null) ui.draft.diuCycle = true; break; }
    case "log-start": startLog(v==="plan"); break;
    case "log-close": ui.logging = false; ui.confirmDiscard = false; window.scrollTo(0,0); break;
    case "log-pick": ui.logPick = true; ui.logQ = ""; ui.logFilter = "all"; window.scrollTo(0,0); render(); return;
    case "log-pick-close": ui.logPick = false; window.scrollTo(0,0); break;
    case "log-filter": ui.logFilter = v; break;
    case "log-add": case "log-add-custom": {
      const name = act==="log-add" ? v : (ui.logQ||"").trim().slice(0,60); if (!name) break;
      const d = S.logDraft;
      if (!d.items.some(x=>x.name===name)) d.items.push(newLogItem(name, b.dataset.kind || (act==="log-add-custom"?"custom":"")));
      ui.logPick = false; ui.logQ = ""; save(); render();
      setTimeout(()=>{ const c = document.querySelectorAll("#app .card"); const el = c[c.length-2]; el && el.scrollIntoView({block:"center"}); }, 30);
      toast("Ajouté : "+name); return; }
    case "log-del": S.logDraft.items.splice(+v,1); save(); break;
    case "log-up": { const i = +v, a = S.logDraft.items; [a[i-1], a[i]] = [a[i], a[i-1]]; save(); break; }
    case "log-addset": { const it = S.logDraft.items[+v], last = it.sets[it.sets.length-1]; it.sets.push(last ? {kg:last.kg, reps:last.reps} : {kg:"", reps:""}); save(); break; }
    case "log-delset": { const [i,j] = v.split("|").map(Number); S.logDraft.items[i].sets.splice(j,1); save(); break; }
    case "log-togglew": { const it = S.logDraft.items[+v]; it.w = !it.w; if (!it.w) it.sets.forEach(x=>x.kg=""); save(); break; }
    case "log-rpe": S.logDraft.rpe = +v; save(); break;
    case "log-save": if (!saveLog()) return; break;
    case "log-discard": if (!ui.confirmDiscard) { ui.confirmDiscard = true; break; } S.logDraft = null; ui.logging = false; ui.confirmDiscard = false; save(); toast("Brouillon jeté"); window.scrollTo(0,0); break;
    case "pban": { const bn = ui.draft.banned = ui.draft.banned||[]; const i = bn.indexOf(v); i>=0 ? bn.splice(i,1) : bn.push(v); break; }
    case "pban-clear": ui.draft.banned = []; break;
    case "pban-open": ui.banOpen = !ui.banOpen; break;
    case "ban": {
      const it = itemByKey(v); if (!it) break;
      const bn = S.profile.banned = S.profile.banned||[]; if (!bn.includes(it.name)) bn.push(it.name);
      /* On refait la séance sans cet exercice, en gardant ce qui est déjà noté sur les autres. */
      const old = S.today.plan, oldLog = S.today.log, byName = {};
      allItems(old).forEach(([k2,x])=>{ if (oldLog[k2] && x.name!==it.name) byName[x.name] = oldLog[k2]; });
      S.today.plan = buildPlan(S, t, ui.override); S.today.log = {};
      allItems(S.today.plan).forEach(([k2,x])=>{ if (byName[x.name]) S.today.log[k2] = byName[x.name]; });
      const repl = allItems(S.today.plan).map(([,x])=>x).find(x=>x.id===it.id);
      save(); toast(repl ? "Remplacé par : "+repl.name : "« "+it.name+" » retiré"); break; }
    case "pzone": { const f = ui.draft.focus = ui.draft.focus||[]; const i=f.indexOf(v); i>=0?f.splice(i,1):f.push(v); break; }
    case "gym": ui.draft.gym = {chain:v, pref:(ui.draft.gym||{}).pref||"mix"}; break;
    case "pref": ui.draft.gym = Object.assign({}, ui.draft.gym, {pref:v}); break;
    case "equip": { const g = gymOf(ui.draft); g.equip[v] = g.equip[v]?0:1; ui.draft.gym = Object.assign({}, ui.draft.gym, {equip:g.equip}); break; }
    case "save-profile": {
      const d = ui.draft;
      if (!d.name || !d.name.trim()) { toast("Indique ton prénom"); $("#p-name")?.focus(); return; }
      const g = gymOf(d);
      const prof = {name:d.name.trim(), level:d.level, goal:d.goal, persona:d.persona, perWeek:+d.perWeek||3, duration:+d.duration||45, focus:d.focus||[], banned:d.banned||[], injuries:(d.injuries||"").trim(), contra:contraOf(d), diuCycle:contraOf(d)==="diu" ? !!d.diuCycle : null, hormonal:isHormonal(contraOf(d), d.diuCycle), bw:(+d.bw>=35 && +d.bw<=160)?+d.bw:null, gym:{chain:g.chain, pref:g.pref, equip:g.equip, max:g.max}};
      { S.profile = prof; if (S.today && !S.today.finished && S.checkins[t]) { S.today.plan = buildPlan(S,t,ui.override); S.today.log = {}; } toast("Profil enregistré"); }
      ui.draft = null; save(); window.scrollTo(0,0); break; }
    case "reset": ui.confirmReset = true; break;
    case "reset-yes": {
      clearTimeout(saveTimer);
      try { localStorage.removeItem(LS_KEY); } catch(e){}
      S = blank(); demo = false; ui = {tab:"today", wiz:null, wizStep:0, override:0, onb:{step:-1, d:onbDefaults()}}; window.scrollTo(0,0); toast("Tout est effacé"); break; }
  }
  render();
});
document.addEventListener("input", e=>{
  const el = e.target;
  if (el.dataset.set) { const [k,i,f] = el.dataset.set.split("|"); const lg = S.today.log[k] = S.today.log[k]||{}; lg.sets = lg.sets||[]; const st = lg.sets[+i] = lg.sets[+i]||{}; st[f] = el.value; save(); }
  if (el.dataset.pf && ui.draft) ui.draft[el.dataset.pf] = el.value;
  if (el.dataset.gmax !== undefined && ui.draft) ui.draft.gym = Object.assign({}, ui.draft.gym, {max:+el.value||null});
  if (el.dataset.time !== undefined && ui.wiz) ui.wiz.time = el.value;
  if (el.dataset.lg && S.logDraft) { const [i,j,f] = el.dataset.lg.split("|"); const it = S.logDraft.items[+i]; if (it) { if (f) { if (it.sets[+j]) it.sets[+j][f] = el.value; } else it[j] = el.value; save(); } }
  if (el.dataset.lgf && S.logDraft) { S.logDraft[el.dataset.lgf] = el.value; save(); }
  if (el.dataset.logq !== undefined) { ui.logQ = el.value; const r = $("#lg-res"); if (r) r.innerHTML = pickerResults(); }
  if (el.dataset.onb && ui.onb) { ui.onb.d[el.dataset.onb] = el.value; if (el.dataset.onb==="name") { const nx = document.querySelector(".wiz-nav .pill"); if (nx) nx.disabled = !el.value.trim(); } }
  if (el.dataset.onbGmax !== undefined && ui.onb) ui.onb.d.gym = Object.assign({}, ui.onb.d.gym, {max:+el.value||null});
});
document.addEventListener("keydown", e=>{
  if (e.key==="Enter" && e.target.id==="lg-q" && e.target.value.trim()) { e.preventDefault(); const first = document.querySelector("#lg-res [data-act=log-add]"); (first && ui.logQ && first.querySelector("b")?.textContent.toLowerCase()===ui.logQ.trim().toLowerCase() ? first : document.querySelector("#lg-res [data-act=log-add-custom]"))?.click(); }
  if (e.key==="Enter" && e.target.id==="o-name") { e.preventDefault(); document.querySelector(".wiz-nav .pill")?.click(); }
  if (e.key==="Escape" && ui.menu) { ui.menu = false; render(); }
});
$("#import-file").addEventListener("change", e=>{ const f = e.target.files && e.target.files[0]; if (f) importData(f); });
/* Sauvegarde dans un fichier, et restauration (autre téléphone, changement de navigateur…). */
function exportData(){
  flush();
  const blob = new Blob([JSON.stringify({app:"phase-gym", exported:new Date().toISOString(), data:S}, null, 1)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "phase-gym-"+todayISO()+".json";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  toast("Sauvegarde téléchargée");
}
function importData(file){
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result), d = j && j.app==="phase-gym" ? j.data : j;
      if (!d || !d.profile || !d.profile.name) throw new Error("format");
      S = Object.assign(blank(), d); demo = false; ui = {tab:"today", wiz:null, wizStep:0, override:0};
      save(); flush(); render(); toast("Sauvegarde restaurée. Bon retour, "+S.profile.name+" !");
    } catch(err){ toast("Ce fichier n'est pas une sauvegarde Phase Gym"); }
  };
  rd.readAsText(file);
}
document.addEventListener("change", e=>{
  const el = e.target;
  if (el.dataset.time !== undefined && ui.wiz) { ui.wiz.time = el.value; render(); }
  if (el.dataset.lgf==="date" && S.logDraft) { S.logDraft.date = el.value; save(); render(); }
  if (el.dataset.pf && ui.draft) ui.draft[el.dataset.pf] = el.value;
});

applyLook();
boot();
})();
