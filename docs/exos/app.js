// Mes Exos : photos d'un cours → fiche d'exercices (indice + corrigé), générée par Claude via la fonction Edge
// supabase/functions/exos. Le compte est un compte anonyme Supabase, le même que pour les autres apps du projet.
import { SUPABASE_URL, SUPABASE_ANON_KEY, EXOS_URL } from "../config.js";

const $ = s => document.querySelector(s);
const files = [];
const maxImgs = 5;
let level = "mixte", ctl = null;

const EXAMPLE = {
  exemple:true, matiere:"Mathématiques", titre:"Le second degré",
  resume:"Fiche générée à partir d'un cours sur les polynômes du second degré : discriminant, racines, forme canonique.",
  notions:["Discriminant Δ","Racines","Forme canonique","Signe d'un trinôme"],
  exercices:[
    {difficulte:1, enonce:"Calcule le discriminant de f(x) = 2x² − 3x − 2 et donne le nombre de racines réelles.", indice:"Δ = b² − 4ac avec a = 2, b = −3, c = −2.", corrige:"Δ = (−3)² − 4 × 2 × (−2) = 9 + 16 = 25.\nΔ > 0 donc f a deux racines réelles distinctes."},
    {difficulte:2, enonce:"Résous dans ℝ l'équation 2x² − 3x − 2 = 0.", indice:"Réutilise Δ = 25 et la formule x = (−b ± √Δ) / 2a.", corrige:"√Δ = 5.\nx₁ = (3 − 5) / 4 = −1/2\nx₂ = (3 + 5) / 4 = 2\nS = { −1/2 ; 2 }"},
    {difficulte:3, enonce:"Écris g(x) = x² + 6x + 5 sous forme canonique, puis donne les coordonnées du sommet de la parabole.", indice:"x² + 6x est le début de (x + 3)².", corrige:"x² + 6x = (x + 3)² − 9\ndonc g(x) = (x + 3)² − 9 + 5 = (x + 3)² − 4.\nLe sommet est S(−3 ; −4)."}
  ]
};

function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function load(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}

function renderThumbs(){
  const t=$("#thumbs"); t.innerHTML="";
  files.forEach((f,i)=>{
    const d=document.createElement("div"); d.className="thumb";
    const img=document.createElement("img"); img.alt="Page "+(i+1); img.src=URL.createObjectURL(f);
    const b=document.createElement("button"); b.type="button"; b.textContent="×"; b.setAttribute("aria-label","Retirer la page "+(i+1));
    b.onclick=()=>{files.splice(i,1); renderThumbs();};
    d.append(img,b); t.append(d);
  });
  updateState();
}
function addFiles(list){
  for(const f of list){ if(f.type.startsWith("image/") && files.length<maxImgs) files.push(f); }
  renderThumbs();
  if([...list].length && files.length>=maxImgs) setStatus("Maximum "+maxImgs+" pages par fiche.");
}
function setStatus(html,isErr){const s=$("#status"); s.className="status"+(isErr?" err":""); s.innerHTML=html;}
function updateState(){
  const busy=!!ctl;
  $("#gen").disabled = busy || !files.length;
  if(!busy){
    if(!files.length) setStatus("Ajoute au moins une photo.");
    else setStatus(files.length+" page"+(files.length>1?"s":"")+" prête"+(files.length>1?"s":"")+".");
  }
}

$("#camBtn").onclick=e=>{e.stopPropagation();$("#cam").click()};
$("#galBtn").onclick=e=>{e.stopPropagation();$("#gal").click()};
$("#drop").onclick=()=>$("#gal").click();
$("#drop").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("#gal").click()}};
$("#cam").onchange=e=>{addFiles(e.target.files); e.target.value=""};
$("#gal").onchange=e=>{addFiles(e.target.files); e.target.value=""};
const drop=$("#drop");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>addFiles(e.dataTransfer.files));
document.addEventListener("paste",e=>{const it=[...(e.clipboardData?.files||[])]; if(it.length) addFiles(it);});
$("#lvl").onclick=e=>{const b=e.target.closest("button"); if(!b) return; level=b.dataset.v; [...$("#lvl").children].forEach(x=>x.setAttribute("aria-pressed",x===b))};

function el(tag,cls,text){const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e;}

function renderSheet(data){
  currentSheet=data;
  const s=$("#sheet"); s.innerHTML="";
  const head=el("div","sheet-head");
  head.insertAdjacentHTML("afterbegin",'<svg viewBox="0 0 72 72" aria-hidden="true"><rect x="4" y="8" width="64" height="60" rx="22" fill="var(--yellow)"/><circle cx="26" cy="36" r="5" fill="var(--face)"/><circle cx="46" cy="36" r="5" fill="var(--face)"/><path d="M29 48 q7 6 14 0" stroke="var(--face)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M36 2 l3 7 7 1 -5 5 1 7 -6-3 -6 3 1-7 -5-5 7-1z" fill="var(--violet)"/></svg>');
  const txt=el("div","txt");
  txt.append(el("span","tag",data.exemple?"Exemple : ajoute ton cours pour avoir le tien":(data.matiere||"Fiche d'exercices")));
  txt.append(el("h2",null,data.titre||"Exercices"));
  if(data.resume) txt.append(el("p","resume",data.resume));
  if(Array.isArray(data.notions)&&data.notions.length){const n=el("div","notions"); data.notions.forEach(x=>n.append(el("span",null,String(x)))); txt.append(n);}
  head.append(txt); s.append(head);
  (data.exercices||[]).forEach((ex,i)=>{
    const c=el("article","ex");
    const top=el("div","ex-top");
    const h3=el("h3"); h3.append(el("span","num",String(i+1)),"Exercice "+(i+1)); top.append(h3);
    const d=Math.max(1,Math.min(3,Number(ex.difficulte)||2));
    const lv=el("span","lvl",["Facile","Moyen","Difficile"][d-1]);
    top.append(lv); c.append(top);
    c.append(el("p","enonce",String(ex.enonce||"")));
    const ta=document.createElement("textarea"); ta.id="rep-"+i; ta.placeholder="Ta réponse (brouillon)…"; ta.setAttribute("aria-label","Ta réponse à l'exercice "+(i+1)); c.append(ta);
    if(ex.indice){const h=el("details","hint"); h.append(el("summary",null,"Un indice ?"), el("p","body",String(ex.indice))); c.append(h);}
    const k=el("details","corr"); k.append(el("summary",null,"Voir le corrigé"), el("div","body",String(ex.corrige||""))); c.append(k);
    s.append(c);
  });
  const act=el("div","sheet-actions");
  const all=el("button","btn",null); all.type="button"; all.textContent="Afficher tous les corrigés";
  all.onclick=()=>{const open=all.dataset.o!=="1"; s.querySelectorAll("details.corr").forEach(d=>d.open=open); all.dataset.o=open?"1":"0"; all.textContent=open?"Masquer les corrigés":"Afficher tous les corrigés";};
  act.append(all);
  const pb=el("button","btn",null); pb.type="button"; pb.textContent="Exporter en PDF";
  act.append(pb);
  if(!data.exemple && files.length){
    const again=el("button","btn",null); again.type="button"; again.textContent="Autres exercices sur ce cours";
    again.onclick=()=>generate(true); act.append(again);
  }
  s.append(act);
  const box=el("div","pdfbox"); box.hidden=true;
  box.innerHTML=`<h3>Exporter pour imprimer</h3>
    <label class="chk"><input type="checkbox" id="pdfCorr" checked> Ajouter les corrigés (sur des pages à part, à la fin)</label>
    <label class="chk"><input type="checkbox" id="pdfLines" checked> Lignes pour écrire les réponses</label>
    <label class="chk"><input type="checkbox" id="pdfHint"> Ajouter les indices sous les énoncés</label>
    <div class="row"><button class="btn primary" type="button" id="pdfGo" style="width:auto">Créer le PDF</button><span class="status" id="pdfStatus" aria-live="polite"></span></div>`;
  s.append(box);
  pb.onclick=()=>{box.hidden=!box.hidden; if(!box.hidden) box.scrollIntoView({behavior:"smooth",block:"nearest"});};
  box.querySelector("#pdfGo").onclick=()=>exportPdf(data,{corr:box.querySelector("#pdfCorr").checked,lines:box.querySelector("#pdfLines").checked,hint:box.querySelector("#pdfHint").checked},box.querySelector("#pdfStatus"),box.querySelector("#pdfGo"));
}

function renderHist(){
  const h=load("cx-hist",[]); const box=$("#hist"); box.innerHTML="";
  if(!h.length){box.hidden=true;return}
  box.hidden=false; box.append(el("h3",null,"Tes fiches récentes"));
  h.forEach(item=>{
    const b=el("button",null,null); b.type="button";
    b.append(el("strong",null,item.data.titre||"Fiche"), el("span",null,(item.data.exercices||[]).length+" exos · "+new Date(item.at).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})));
    b.onclick=()=>{renderSheet(item.data); $("#sheet").scrollIntoView({behavior:"smooth"})};
    box.append(b);
  });
}

const ERR={
  network:"Pas de connexion. Vérifie ton réseau et réessaie.",
  unauthenticated:"Ta session a expiré. Recharge la page et réessaie.",
  quota:"Tu as fait beaucoup de fiches aujourd'hui. Reviens demain pour en générer d'autres.",
  rate_limited:"Trop de demandes d'un coup. Réessaie dans un moment.",
  image_rejected:"Une des images n'est pas lisible. Essaie une autre photo (JPG ou PNG).",
  too_many_images:"Maximum "+maxImgs+" pages par fiche.",
  invalid_json:"La réponse était mal formée. Clique à nouveau sur Générer.",
  too_long:"La fiche était trop longue. Essaie avec moins d'exercices.",
  refused:"Ce contenu n'a pas pu être traité. Essaie avec d'autres pages.",
  setup:"Le service n'est pas encore prêt (fonction exos à déployer). Réessaie plus tard."
};
function apiError(code){ const e=new Error(code); e.code=code; return e; }

/* ---------- Connexion : compte anonyme Supabase, jeton envoyé à la fonction Edge ---------- */
let sb=null, connecting=null;
function connect(){
  if(sb) return Promise.resolve(sb);
  if(!connecting)
    connecting=(async()=>{
      const { createClient }=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm");
      const c=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
      if(!(await c.auth.getSession()).data.session){
        const r=await c.auth.signInAnonymously();
        if(r.error) throw apiError(navigator.onLine?"unauthenticated":"network");
      }
      return (sb=c);
    })().catch(e=>{ connecting=null; throw e.code?e:apiError("network"); });
  return connecting;
}

// Pages réduites à 1568 px de côté (au-delà, Claude les réduit de toute façon) et envoyées en JPEG.
async function toJpeg(file){
  let src;
  try{ src=await createImageBitmap(file,{imageOrientation:"from-image"}); }
  catch(e){
    src=await new Promise((ok,ko)=>{ const im=new Image(); im.onload=()=>ok(im); im.onerror=()=>ko(apiError("image_rejected")); im.src=URL.createObjectURL(file); });
  }
  const w=src.width, h=src.height, k=Math.min(1,1568/Math.max(w,h));
  const cv=document.createElement("canvas"); cv.width=Math.round(w*k); cv.height=Math.round(h*k);
  const g=cv.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,cv.width,cv.height); g.drawImage(src,0,0,cv.width,cv.height);
  return {media_type:"image/jpeg", data:cv.toDataURL("image/jpeg",0.85).split(",")[1]};
}

async function callExos(body,signal){
  const c=await connect();
  const token=(await c.auth.getSession()).data.session?.access_token||"";
  let r;
  try{
    r=await fetch(EXOS_URL,{method:"POST",signal,headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+token},body:JSON.stringify(body)});
  }catch(e){ throw e.name==="AbortError"?apiError("cancelled"):apiError("network"); }
  const j=await r.json().catch(()=>({}));
  if(!r.ok){ if(r.status===404) throw apiError("setup"); throw apiError(j.error||"internal"); }
  return j;
}

async function generate(fresh){
  if(!files.length||ctl) return;
  ctl=new AbortController(); updateState();
  $("#stop").hidden=false;
  setStatus('<span class="spinner"></span>Claude lit ton cours et prépare les exercices… (30 s à 1 min)');
  try{
    const images=await Promise.all(files.map(toJpeg));
    const data=await callExos({
      images, nb:Number($("#nb").value), level, niveau:profileText(profile), cycle:profile.cycle||"",
      extra:$("#extra").value.trim(),
      eviter: fresh&&currentSheet&&!currentSheet.exemple ? (currentSheet.exercices||[]).map(x=>String(x.enonce||"").slice(0,200)) : []
    },ctl.signal);
    if(!data||!Array.isArray(data.exercices)) throw apiError("invalid_json");
    if(!data.exercices.length){ setStatus(esc(data.resume||"Je n'ai pas réussi à lire un cours sur ces images. Essaie avec une photo plus nette."),true); return; }
    renderSheet(data);
    const h=load("cx-hist",[]); h.unshift({at:Date.now(),data}); save("cx-hist",h.slice(0,8)); renderHist();
    setStatus("Fiche prête : "+data.exercices.length+" exercices.");
    $("#sheet").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){
    if(e&&e.code==="cancelled") setStatus("Génération arrêtée.");
    else setStatus(ERR[e&&e.code]||"Un problème est survenu. Réessaie.",true);
  }finally{
    ctl=null; $("#stop").hidden=true;
    $("#gen").disabled=!files.length;
  }
}
$("#gen").onclick=()=>generate(false);
$("#stop").onclick=()=>ctl&&ctl.abort();


/* ---------- Export PDF ---------- */
let currentSheet=null;
function pblk(html){const d=document.createElement("div"); d.className="blk"; d.innerHTML=html; return d;}
function esc(t){return String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
async function exportPdf(data,o,st,btn){
  if(!window.html2canvas||!window.jspdf){ st.className="status err"; st.textContent="Le module PDF n'a pas pu se charger. Recharge la page."; return; }
  btn.disabled=true; st.className="status"; st.innerHTML='<span class="spinner"></span>Mise en page…';
  const root=document.createElement("div"); root.id="print"; document.body.append(root);
  try{
    if(document.fonts&&document.fonts.ready) await document.fonts.ready;
    const exs=data.exercices||[], niv=profileText(profile);
    const date=new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
    const blocks=[];
    blocks.push({el:pblk(`<h1>${esc(data.titre||"Exercices")}</h1><div class="meta">${esc(data.matiere||"")}${niv?" · "+esc(niv):""} · ${date}</div><div class="nom"><span>Nom :</span><span>Date :</span></div>`)});
    exs.forEach((ex,i)=>{
      const d=Math.max(1,Math.min(3,Number(ex.difficulte)||2));
      let html=`<div class="ex-h"><span>Exercice ${i+1}</span><small>${["Facile","Moyen","Difficile"][d-1]}</small></div><div class="txt">${esc(ex.enonce)}</div>`;
      if(o.hint&&ex.indice) html+=`<div class="txt" style="color:#666;font-style:italic;margin-top:6px">Indice : ${esc(ex.indice)}</div>`;
      if(o.lines) html+=`<div class="lines">${"<div></div>".repeat(d===1?4:d===2?6:8)}</div>`;
      blocks.push({el:pblk(html)});
    });
    if(o.corr){
      blocks.push({el:pblk(`<div class="sec">Corrigés</div><div class="meta">${esc(data.titre||"")}</div>`),newPage:true});
      exs.forEach((ex,i)=>blocks.push({el:pblk(`<div class="ex-h"><span>Exercice ${i+1}</span></div><div class="txt corr">${esc(ex.corrige)}</div>`)}));
    }
    blocks.forEach(b=>root.append(b.el));
    const { jsPDF }=window.jspdf; const pdf=new jsPDF({unit:"mm",format:"a4"});
    const M=15, W=210-2*M, BOTTOM=297-M-8; let y=M, first=true;
    for(let bi=0;bi<blocks.length;bi++){
      st.innerHTML=`<span class="spinner"></span>Page en cours… (${bi+1}/${blocks.length})`;
      const b=blocks[bi];
      const cv=await html2canvas(b.el,{scale:2,backgroundColor:"#ffffff",logging:false});
      const pxPerMm=cv.width/W; let hmm=cv.height/pxPerMm;
      if(b.newPage||( y+hmm>BOTTOM && hmm<=BOTTOM-M && !first && y>M)){ pdf.addPage(); y=M; }
      let sy=0;
      while(sy<cv.height){
        const room=BOTTOM-y, slicePx=Math.min(cv.height-sy, Math.floor(room*pxPerMm));
        if(slicePx<40){ pdf.addPage(); y=M; continue; }
        const part=document.createElement("canvas"); part.width=cv.width; part.height=slicePx;
        part.getContext("2d").drawImage(cv,0,sy,cv.width,slicePx,0,0,cv.width,slicePx);
        pdf.addImage(part.toDataURL("image/jpeg",0.92),"JPEG",M,y,W,slicePx/pxPerMm);
        y+=slicePx/pxPerMm; sy+=slicePx; first=false;
        if(sy<cv.height){ pdf.addPage(); y=M; }
      }
      y+=5;
    }
    const n=pdf.getNumberOfPages();
    for(let p=1;p<=n;p++){ pdf.setPage(p); pdf.setFontSize(9); pdf.setTextColor(140); pdf.text(`${p} / ${n}`,105,297-8,{align:"center"}); }
    const blob=pdf.output("blob");
    const name=((data.titre||"exercices").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"exercices")+".pdf";
    // Le partage (iPhone, Android) demande un geste de la personne : un bouton, une fois le PDF prêt.
    st.className="status"; st.textContent=`PDF prêt (${n} page${n>1?"s":""}). `;
    const sv=el("button","btn",shareable(blob,name)?"Enregistrer ou imprimer":"Télécharger"); sv.type="button";
    sv.onclick=()=>savePdf(blob,name).catch(()=>{});
    st.append(sv);
  }catch(e){
    st.className="status err"; st.textContent="Le PDF n'a pas pu être créé. Réessaie.";
  }finally{ root.remove(); btn.disabled=false; }
}
function shareable(blob,name){
  try{ return matchMedia("(pointer:coarse)").matches && !!navigator.canShare && navigator.canShare({files:[new File([blob],name,{type:"application/pdf"})]}); }catch(e){ return false; }
}
async function savePdf(blob,name){
  if(shareable(blob,name)){
    try{ await navigator.share({files:[new File([blob],name,{type:"application/pdf"})],title:name}); return; }
    catch(e){ if(e.name==="AbortError") return; }
  }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000);
}

/* ---------- Questionnaire de niveau ---------- */
let profile = load("cx-profil", null) || {};
let draft = {}, stepIdx = 0;
const COLORS=["var(--pink)","var(--orange)","var(--teal)","var(--blue)","var(--yellow)"];
function mascot(i){
  const c=COLORS[i%COLORS.length];
  const shapes=[
    `<path d="M15 100 C10 50 35 15 60 15 C85 15 110 50 105 100Z" fill="${c}"/>`,
    `<rect x="12" y="20" width="96" height="86" rx="34" fill="${c}"/>`,
    `<circle cx="60" cy="62" r="46" fill="${c}"/>`,
    `<path d="M60 14 L104 46 L88 102 L32 102 L16 46Z" fill="${c}" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`];
  const eyes=[`<circle cx="45" cy="62" r="7" fill="var(--face)"/><circle cx="75" cy="62" r="7" fill="var(--face)"/><path d="M53 78 q7 6 14 0" stroke="var(--face)" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M38 62 q7-7 14 0 M68 62 q7-7 14 0" stroke="var(--face)" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="80" rx="7" ry="5" fill="var(--face)"/>`];
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${shapes[i%4]}${eyes[i%2]}<path d="M98 14 l3 7 7 1 -5 5 1 7 -6-3 -6 3 1-7 -5-5 7-1z" fill="var(--violet)"/></svg>`;
}
const SPECS=["Mathématiques","Physique-Chimie","SVT","SES","HGGSP","HLP","LLCER (langues)","NSI (informatique)","Sciences de l'ingénieur","Arts","Biologie-Écologie","LLCA (langues anciennes)","EPS (spécialité)"];
const SERIES=[["STMG","Management, gestion"],["STI2D","Industrie, développement durable"],["ST2S","Santé, social"],["STL","Laboratoire"],["STD2A","Design, arts appliqués"],["STHR","Hôtellerie, restauration"],["S2TMD","Théâtre, musique, danse"],["STAV","Agronomie, vivant"]];
const SUP=[["Licence","Université"],["BUT","IUT"],["BTS",""],["Prépa","CPGE"],["PASS / LAS","Études de santé"],["École d'ingénieurs",""],["École de commerce",""],["Master",""],["Autre","Formation, école…"]];

function steps(){
  const s=[{id:"cycle"}];
  if(draft.cycle==="college") s.push({id:"college"});
  if(draft.cycle==="lycee"){ s.push({id:"lclasse"},{id:"voie"});
    if(draft.voie==="generale" && draft.classe!=="Seconde") s.push({id:"specs"});
    if(draft.voie==="techno" && draft.classe!=="Seconde") s.push({id:"serie"});
    if(draft.voie==="pro") s.push({id:"filiere"}); }
  if(draft.cycle==="sup") s.push({id:"sup"},{id:"annee"},{id:"domaine"});
  return s;
}
function profileText(p){
  if(!p||!p.cycle) return "";
  if(p.cycle==="college") return p.classe+" (collège)";
  if(p.cycle==="lycee"){
    let t=p.classe;
    if(p.voie==="generale") t+= p.classe==="Seconde"?" générale et technologique":" générale";
    if(p.voie==="techno") t+= p.classe==="Seconde"?" générale et technologique":" technologique"+(p.serie?" "+p.serie:"");
    if(p.voie==="pro") t+=" bac pro"+(p.filiere?" "+p.filiere:"");
    if(p.voie==="generale"&&p.specs&&p.specs.length) t+=", spé "+p.specs.join(", ");
    return t;
  }
  let t=p.sup+(p.annee?", "+p.annee:""); if(p.domaine) t+=" en "+p.domaine; return t;
}
function choice(label,sub,pressed,onclick){
  const b=el("button","choice"); b.type="button"; b.setAttribute("aria-pressed",!!pressed);
  b.append(el("b",null,label)); if(sub) b.append(el("span",null,sub));
  b.onclick=onclick; return b;
}
function next(){ stepIdx++; if(stepIdx>=steps().length) finish(); else renderStep(); }
function finish(){ profile={...draft}; save("cx-profil",profile); $("#onb").hidden=true; renderProfile(); }
function textStep(key,ph){
  const inp=document.createElement("input"); inp.type="text"; inp.id="onb-"+key; inp.placeholder=ph; inp.value=draft[key]||"";
  inp.oninput=()=>draft[key]=inp.value.trim();
  inp.onkeydown=e=>{if(e.key==="Enter") next()};
  $("#onbChoices").append(inp);
}
function renderStep(){
  const st=steps(), cur=st[stepIdx];
  const ch=$("#onbChoices"), foot=$("#onbFoot"); ch.innerHTML=""; ch.className="choices"; foot.innerHTML="";
  $("#onbMascot").innerHTML=mascot(stepIdx);
  $("#onbBack").hidden = stepIdx===0;
  const dots=$("#onbDots"); dots.innerHTML=""; const total=draft.cycle?st.length:3;
  for(let i=0;i<total;i++){const d=document.createElement("i"); if(i===stepIdx) d.className="on"; dots.append(d);}
  let Q="",S="",cont=false;
  const pick=(key,val)=>{draft[key]=val; next();};
  switch(cur.id){
    case "cycle": Q="Tu es en quelle étape ?"; S="Les exercices seront adaptés à ton programme.";
      [["college","Collège","6e à 3e"],["lycee","Lycée","Seconde, Première, Terminale"],["sup","Études supérieures","Fac, BTS, BUT, prépa, école…"]]
      .forEach(([v,l,s])=>ch.append(choice(l,s,draft.cycle===v,()=>{ if(draft.cycle!==v) draft={cycle:v}; next(); }))); break;
    case "college": Q="Quelle classe ?"; ch.className="choices grid";
      ["6e","5e","4e","3e"].forEach(c=>ch.append(choice(c,c==="3e"?"Année du brevet":"",draft.classe===c,()=>pick("classe",c)))); break;
    case "lclasse": Q="Quelle classe ?";
      [["Seconde",""],["Première","Épreuve anticipée de français"],["Terminale","Année du bac"]].forEach(([c,s])=>ch.append(choice(c,s,draft.classe===c,()=>{ if(draft.classe!==c){draft.specs=[];} pick("classe",c);}))); break;
    case "voie": Q="Quelle voie ?";
      (draft.classe==="Seconde"?[["generale","Générale et technologique",""],["pro","Professionnelle","Bac pro"]]
       :[["generale","Bac général","Avec spécialités"],["techno","Bac technologique","STMG, STI2D, ST2S…"],["pro","Bac professionnel",""]])
      .forEach(([v,l,s])=>ch.append(choice(l,s,draft.voie===v,()=>pick("voie",v)))); break;
    case "specs": {
      const max=draft.classe==="Première"?3:2; draft.specs=draft.specs||[];
      Q="Tes spécialités ?"; S=`Choisis-en ${max}.`; ch.className="choices grid"; cont=true;
      SPECS.forEach(sp=>{ const b=choice(sp,"",draft.specs.includes(sp),()=>{
          const i=draft.specs.indexOf(sp);
          if(i>=0) draft.specs.splice(i,1); else { if(draft.specs.length>=max) draft.specs.shift(); draft.specs.push(sp); }
          renderStep(); }); ch.append(b); }); break; }
    case "serie": Q="Quelle série ?"; ch.className="choices grid";
      SERIES.forEach(([v,s])=>ch.append(choice(v,s,draft.serie===v,()=>pick("serie",v)))); break;
    case "filiere": Q="Quelle filière ?"; S="Optionnel"; cont=true; textStep("filiere","ex. commerce, électricité, cuisine"); break;
    case "sup": Q="Quelle formation ?"; ch.className="choices grid";
      SUP.forEach(([v,s])=>ch.append(choice(v,s,draft.sup===v,()=>pick("sup",v)))); break;
    case "annee": Q="En quelle année ?"; ch.className="choices grid";
      ["1re année","2e année","3e année","4e année","5e année et +"].forEach((a,i)=>ch.append(choice(a,"Bac+"+(i+1)+(i===4?" et plus":""),draft.annee===a,()=>pick("annee",a)))); break;
    case "domaine": Q="Dans quel domaine ?"; S="Optionnel"; cont=true; textStep("domaine","ex. droit, maths-info, biologie, éco-gestion"); break;
  }
  $("#onbQ").textContent=Q; $("#onbSub").textContent=S; $("#onbSub").hidden=!S;
  if(cont){
    const b=el("button","btn primary",stepIdx===st.length-1?"Terminer":"Continuer"); b.type="button";
    if(cur.id==="specs") b.disabled=!draft.specs.length;
    b.onclick=next; foot.append(b);
  }
  if(stepIdx===st.length-1 && draft.cycle) foot.append(el("p","note","Tu pourras changer ça à tout moment."));
  const f=ch.querySelector("input,button"); if(f) f.focus({preventScroll:true});
}
function openOnb(){ draft={...profile}; stepIdx=0; $("#onb").hidden=false; renderStep(); }
function renderProfile(){ const t=profileText(profile); $("#profTxt").textContent=t||"Pas encore renseigné"; $("#profEdit").textContent=t?"Modifier":"Choisir"; }
$("#onbBack").onclick=()=>{ if(stepIdx>0){stepIdx--; renderStep();} };
$("#onbSkip").onclick=()=>{ $("#onb").hidden=true; renderProfile(); };
$("#profEdit").onclick=openOnb;
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("#onb").hidden){ $("#onb").hidden=true; } });
renderProfile();
if(!profile.cycle) openOnb();

renderSheet(EXAMPLE);
renderHist();
updateState();

if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
