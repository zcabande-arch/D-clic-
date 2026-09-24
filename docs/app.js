// Déclic : une photo toutes les heures, de 8h à 20h, partagée avec tes proches.
import { openDb } from "./db.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, NOTIFY_URL } from "./config.js";

  const FIRST=8, LAST=20, ON_TIME=10;
  const EMOJIS=["❤️","😂","😮","😍","🔥","👏","😢"];
  const $=s=>document.querySelector(s);
  const app=$("#app"), barHost=$("#barHost"), composer=$("#composer");
  const S={db:null,user:null,uid:null,groups:[],profiles:{},profilesLoaded:false,current:null,day:null,
    photos:[],reacts:[],replies:[],messages:[],seen:{},typing:{},subs:[],picker:null,open:{},editProfile:false,panelOpen:false,
    fileTarget:null,days:[],daySub:null,period:"week",backfilled:{},pendingShot:null,pendingReplyImg:null,replyTo:null,draftAvatar:undefined,scrollBottom:false};

  // ---------- helpers ----------
  const pad=n=>String(n).padStart(2,"0");
  const dayKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const todayKey=()=>dayKey(new Date());
  function shiftDay(key,n){const[a,b,c]=key.split("-").map(Number);return dayKey(new Date(a,b-1,c+n));}
  function at(h,plusDays=0){const d=new Date();d.setDate(d.getDate()+plusDays);d.setHours(h,0,0,0);return d;}
  function slotNow(){
    const now=new Date(),h=now.getHours();
    if(h<FIRST) return {phase:"before",next:at(FIRST)};
    if(h>LAST) return {phase:"after",next:at(FIRST,1)};
    const open=at(h);
    return {phase:"open",hour:h,open,sinceMin:Math.floor((now-open)/60000),next:h<LAST?at(h+1):at(FIRST,1)};
  }
  function fmtDur(ms){const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${pad(m)}:${pad(x)}`:`${pad(m)}:${pad(x)}`;}
  function fmtDay(key){
    if(key===todayKey())return"Aujourd’hui"; if(key===shiftDay(todayKey(),-1))return"Hier";
    const[a,b,c]=key.split("-").map(Number);
    return new Date(a,b-1,c).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}).replace(/^./,x=>x.toUpperCase());
  }
  const hm=ts=>new Date(ts).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  function el(tag,attrs={},...kids){
    const e=document.createElement(tag);
    for(const[k,v]of Object.entries(attrs)){
      if(k==="class")e.className=v; else if(k==="text")e.textContent=v; else if(k==="style")e.style.cssText=v;
      else if(k.startsWith("on"))e.addEventListener(k.slice(2),v); else if(v===true)e.setAttribute(k,""); else if(v!==false&&v!=null)e.setAttribute(k,v);
    }
    for(const k of kids)if(k!=null&&k!==false)e.append(k);
    return e;
  }
  function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),2600);}
  const pName=id=>(S.profiles[id]&&S.profiles[id].name)||"Quelqu’un";
  const COLORS=["#4F6BD8","#D2573A","#2F8F6B","#9A4FD8","#D89A1F","#1F8FB0","#C2417A"];
  function avEl(id,size=32,src){
    const p=S.profiles[id]; const img=src!==undefined?src:(p&&p.avatar);
    if(img) return el("img",{class:"av",src:img,alt:"",style:`width:${size}px;height:${size}px`});
    let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;
    const n=(p&&p.name)||"?";
    return el("span",{class:"av","aria-hidden":"true",style:`width:${size}px;height:${size}px;background:${COLORS[h%COLORS.length]};font-size:${Math.round(size*.42)}px`,text:n.trim()[0]?.toUpperCase()||"?"});
  }
  function genCode(){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(const b of crypto.getRandomValues(new Uint8Array(6)))s+=a[b%a.length];return s;}
  function openDlg(sel){const d=$(sel);d.querySelectorAll(".err").forEach(e=>e.textContent="");d.showModal();}
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>b.closest("dialog").close()));
  $("#dlgLb").addEventListener("click",()=>$("#dlgLb").close());
  function zoom(src){$("#lbImg").src=src;$("#dlgLb").showModal();}

  // ---------- points ----------
  const PTS={onTime:10,late:3,comboStep:2,comboMax:10,fullDay:50,streakStep:5,streakMax:30,together:5};
  const HOURS=LAST-FIRST+1;
  function dayDocs(date){return S.days.filter(d=>d.date===date);}
  function slotsOf(uid,date){const d=S.days.find(x=>x.uid===uid&&x.date===date);return (d&&d.slots)||{};}
  function streakAt(uid,date){let k=0,d=date;while(Object.keys(slotsOf(uid,d)).length){k++;d=shiftDay(d,-1);if(k>60)break;}return k;}
  function currentStreak(uid){const t=todayKey();return Object.keys(slotsOf(uid,t)).length?streakAt(uid,t):streakAt(uid,shiftDay(t,-1));}
  function scoreDay(uid,date,g,slotsOverride){
    const slots=slotsOverride||slotsOf(uid,date);const hrs=Object.keys(slots).map(Number).sort((a,b)=>a-b);
    if(!hrs.length)return{pts:0,onTime:0,late:0,bestCombo:0};
    let pts=0,onTime=0,late=0,combo=0,best=0,prev=null;
    for(const h of hrs){
      if(slots[h]<=ON_TIME){onTime++;pts+=PTS.onTime;combo=(prev===h-1&&combo>0)?combo+1:1;pts+=Math.min(PTS.comboStep*(combo-1),PTS.comboMax);best=Math.max(best,combo);}
      else{late++;pts+=PTS.late;combo=0;}
      prev=h;
      if(slots[h]<=ON_TIME&&g&&g.members.length>1&&g.members.every(m=>{const s=m===uid?slots:slotsOf(m,date);return s[h]!=null&&s[h]<=ON_TIME;}))pts+=PTS.together;
    }
    if(hrs.length>=HOURS)pts+=PTS.fullDay;
    const k=slotsOverride?(streakAt(uid,shiftDay(date,-1))+1):streakAt(uid,date);
    pts+=Math.min(PTS.streakStep*(k-1),PTS.streakMax);
    return{pts,onTime,late,bestCombo:best};
  }
  function periodPoints(uid,g,period){
    const n=period==="today"?1:period==="week"?7:30;let t=0,d=todayKey();
    for(let i=0;i<n;i++){t+=scoreDay(uid,d,g).pts;d=shiftDay(d,-1);}return t;
  }
  function currentCombo(uid){
    const sl=slotNow(),slots=slotsOf(uid,todayKey());let h=sl.phase==="open"?sl.hour:(sl.phase==="after"?LAST:FIRST-1);
    if(slots[h]==null)h--;let c=0;while(h>=FIRST&&slots[h]!=null&&slots[h]<=ON_TIME){c++;h--;}return c;
  }
  async function recordSlot(date,hour,lateMin){
    const ref=S.db.doc("groups/"+S.current).collection("days").doc(date+"_"+S.uid);
    const existing=S.days.find(d=>d.uid===S.uid&&d.date===date);
    if(existing)await ref.update({slots:{[hour]:lateMin}});
    else await ref.set({uid:S.uid,date,slots:{[hour]:lateMin}});
  }

  // ---------- images ----------
  function loadImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=rej;i.src=u;});}
  // limit = longueur maximale de la data URL (≈ 1,37 × le poids réel) : ~60 à 70 Ko par photo, ~40 Ko par photo de réponse.
  async function compress(file,max=900,limit=100000){
    const img=await loadImage(file);let q=.72,out="";
    for(let t=0;t<8;t++){
      const sc=Math.min(1,max/Math.max(img.width,img.height));
      const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      out=c.toDataURL("image/jpeg",q); if(out.length<limit)return out;
      if(q>.55)q-=.1;else max=Math.round(max*.8);
    }
    return out;
  }
  async function squareAvatar(file){
    const img=await loadImage(file),s=Math.min(img.width,img.height),c=document.createElement("canvas");
    c.width=c.height=200;c.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,200,200);
    return c.toDataURL("image/jpeg",.8);
  }
  function pickFile(target,camera){
    S.fileTarget=target;const f=$("#fileIn");
    if(camera)f.setAttribute("capture",camera);else f.removeAttribute("capture");
    f.click();
  }
  $("#fileIn").addEventListener("change",async e=>{
    const f=e.target.files[0];e.target.value="";if(!f)return;
    try{
      if(S.fileTarget==="avatar"){S.draftAvatar=await squareAvatar(f);render();}
      else if(S.fileTarget==="shot"){S.pendingShot=await compress(f);$("#sPrev").src=S.pendingShot;$("#sCap").value="";const sl=slotNow();$("#sTitle").textContent=sl.phase==="open"?`Ta photo de ${sl.hour}h`:"Ta photo";openDlg("#dlgShot");}
      else if(S.fileTarget==="theme"){const g=S.groups.find(x=>x.id===S.current);if(!g)return;toast("Envoi de la photo…");const url=await S.db.uploadImage(await compress(f,1400,280000));await setTheme(g,{image:url});}
      else if(S.fileTarget==="apptheme"){toast("Envoi de la photo…");const url=await S.db.uploadImage(await compress(f,1400,280000));await setAppTheme({image:url});}
      else if(S.fileTarget==="reply"){S.pendingReplyImg=await compress(f,700,60000);const p=$("#rPrev");p.src=S.pendingReplyImg;p.style.display="block";}
    }catch(err){toast("Cette image n’a pas pu être lue.");}
  });

  // ---------- render ----------
  function render(){
    if(!S.db)return;
    const cg=S.current&&!S.editProfile?S.groups.find(x=>x.id===S.current):null;
    const mine=S.profiles[S.uid];
    applyTheme((cg&&cg.theme)||(mine&&mine.theme)||null);
    const showComposer=!!(cg&&S.profilesLoaded&&S.profiles[S.uid]&&S.day===todayKey());
    if(composer.hidden===showComposer){composer.hidden=!showComposer;document.body.classList.toggle("has-composer",showComposer);}
    if(!S.profilesLoaded){app.replaceChildren(el("p",{class:"notice",text:"Chargement…"}));barHost.replaceChildren();return;}
    if(!S.profiles[S.uid]||S.editProfile)return renderProfile();
    S.current?renderGroup():renderHome();
    if(S.pendingJoin&&!S.current){
      const code=S.pendingJoin;S.pendingJoin=null;
      if(S.groups.some(g=>g.id===code))openGroup(code);
      else{$("#jCode").value=code;openDlg("#dlgJoin");}
    }
  }

  function renderProfile(){
    barHost.replaceChildren();app.className="wrap";
    const mine=S.profiles[S.uid];const first=!mine;
    const avatar=S.draftAvatar!==undefined?S.draftAvatar:(mine&&mine.avatar)||"";
    const nameIn=el("input",{type:"text",id:"pName",maxlength:"30",placeholder:"Ton prénom",value:(mine&&mine.name)||S.prefillName||""});
    const err=el("p",{class:"err"});
    const save=el("button",{class:"btn flash",style:"width:100%;margin-top:16px",onclick:async()=>{
      const n=nameIn.value.trim(); if(!n){err.textContent="Entre ton nom.";return;}
      save.disabled=true;
      try{await S.db.doc("profiles/"+S.uid).set({name:n,avatar:avatar||"",updatedAt:Date.now(),...(mine&&mine.theme?{theme:mine.theme}:{})});S.editProfile=false;S.draftAvatar=undefined;toast(first?"Profil créé":"Profil mis à jour");}
      catch(e){err.textContent="L’enregistrement a échoué. Réessaie.";save.disabled=false;}
    }},first?"Créer mon profil":"Enregistrer");
    const card=el("section",{class:"profile"},
      el("h2",{text:first?"Bienvenue sur Déclic":"Ton profil"}),
      el("p",{text:first?"Choisis ton nom et une photo pour que tes proches te reconnaissent.":"C’est ce que voient les membres de tes groupes."}),
      el("button",{class:"avpick","aria-label":"Choisir une photo de profil",onclick:()=>pickFile("avatar")},
        avatar?el("img",{class:"av",src:avatar,alt:"",style:"width:112px;height:112px"}):el("span",{class:"av",style:"width:112px;height:112px;background:var(--line);color:var(--muted);font-size:40px",text:"☺"}),
        el("span",{class:"plus","aria-hidden":"true",text:"+"})),
      el("label",{for:"pName",text:"Nom"}),nameIn,err,save,
      !first?el("button",{class:"btn ghost",style:"width:100%;margin-top:10px",onclick:()=>{S.editProfile=false;S.draftAvatar=undefined;render();}},"Annuler")
        :el("button",{class:"btn ghost",style:"width:100%;margin-top:10px",onclick:openAccount},"J’ai déjà un compte"));
    app.replaceChildren(el("header",{class:"top"},el("h1",{class:"brand"},el("span",{class:"shutter","aria-hidden":"true"}),el("span",{class:"t",text:"Déclic"}))),...[card,first?null:settingsCard()].filter(Boolean));
  }

  function renderHome(){
    barHost.replaceChildren();app.className="wrap";
    const sl=slotNow();
    const now=el("section",{class:"now"+(sl.phase==="open"&&sl.sinceMin<ON_TIME?" open":"")});
    const bars=el("div",{class:"hours","aria-hidden":"true"});
    for(let h=FIRST;h<=LAST;h++){const cur=sl.phase==="open"&&sl.hour===h;const done=(sl.phase==="after")||(sl.phase==="open"&&h<sl.hour);bars.append(el("i",{class:cur?"cur":done?"done":""}));}
    if(sl.phase==="open"&&sl.sinceMin<ON_TIME) now.append(el("h2",{text:`Déclic de ${sl.hour}h : c’est maintenant`}),el("div",{class:"big","data-home":"1"}),el("p",{text:"pour être à l’heure. Ouvre un groupe pour prendre ta photo."}),bars);
    else now.append(el("h2",{text:sl.phase==="open"&&sl.hour<LAST?`Prochain déclic à ${sl.hour+1}h`:"Prochain déclic demain à 8h"}),el("div",{class:"big","data-home":"1"}),el("p",{text:`Une photo toutes les heures, de ${FIRST}h à ${LAST}h.`}),bars);
    const me=S.profiles[S.uid];
    app.replaceChildren(
      el("header",{class:"top"},el("h1",{class:"brand"},el("span",{class:"shutter","aria-hidden":"true"}),el("span",{class:"t",text:"Déclic"})),
        el("button",{class:"me",onclick:()=>{S.editProfile=true;render();},"aria-label":"Modifier mon profil"},el("span",{text:me.name}),avEl(S.uid,36))),
      now);
    for(const c of [pushCard(),installCard()])if(c)app.append(c);
    if(!S.groups.length) app.append(el("div",{class:"empty",text:"Tu n’as pas encore de groupe. Crée-en un et partage son code, ou entre le code qu’on t’a donné."}));
    else{
      const ul=el("ul",{class:"groups"});
      for(const g of[...S.groups].sort((a,b)=>(a.name||"").localeCompare(b.name||""))){
        const stack=el("span",{class:"stack"});g.members.slice(0,4).forEach(m=>stack.append(avEl(m,28)));
        ul.append(el("li",{},el("button",{class:"gitem",onclick:()=>openGroup(g.id)},
          el("span",{},el("span",{class:"gname",text:g.name}),el("span",{class:"gsub",text:g.members.length+(g.members.length>1?" membres":" membre")})),stack)));
      }
      app.append(ul);
    }
    app.append(el("div",{class:"row"},el("button",{class:"btn",onclick:()=>{$("#cName").value="";openDlg("#dlgCreate");}},"Créer un groupe"),el("button",{class:"btn ghost",onclick:()=>{$("#jCode").value="";openDlg("#dlgJoin");}},"Rejoindre avec un code")));
    tick();
  }

  function renderGroup(){
    const g=S.groups.find(x=>x.id===S.current);if(!g){closeGroup();return;}
    const sl=slotNow(),isToday=S.day===todayKey();
    const curHour=isToday&&sl.phase==="open"?sl.hour:null;
    const mineNow=curHour!=null&&S.photos.some(p=>p.uid===S.uid&&p.hour===curHour);
    const nearBottom=innerHeight+scrollY>=document.documentElement.scrollHeight-120, prevY=scrollY;
    app.className="wrap chat";

    const head=el("header",{class:"top"},el("button",{class:"back",onclick:closeGroup},"‹ Groupes"),el("span",{class:"brand",style:"font-size:20px"},el("span",{class:"t",text:g.name})));
    const nav=el("div",{class:"daynav"},
      el("button",{onclick:()=>setDay(shiftDay(S.day,-1))},"‹ Veille"),
      el("strong",{text:fmtDay(S.day)}),
      el("button",{disabled:isToday,onclick:()=>setDay(shiftDay(S.day,1))},"Lendemain ›"));

    // panel
    const panel=el("details",{class:"panel",open:S.panelOpen,ontoggle:e=>S.panelOpen=e.target.open},el("summary",{text:`Membres et invitation (${g.members.length})`}));
    const isAdmin=g.createdBy===S.uid;
    const ul=el("ul",{class:"members"});g.members.forEach(m=>ul.append(el("li",{},avEl(m,30),
      el("span",{class:"mname",text:pName(m)+(m===S.uid?" (toi)":"")}),
      m===g.createdBy?el("span",{class:"admin",text:"👑 admin"}):null,
      isAdmin&&m!==S.uid?el("button",{class:"btn ghost small",style:"margin-left:auto;color:var(--late)",onclick:()=>removeMember(g,m)},"Retirer"):null)));
    const muted=((S.profiles[S.uid]||{}).notif||{}).muted||[];
    const muteBox=el("label",{class:"switch"},el("input",{type:"checkbox",checked:muted.includes(g.id),onchange:e=>toggleMute(g,e.target.checked)}),el("span",{text:"🔕 Couper les notifications de ce groupe"}));
    panel.append(el("p",{text:"Code à partager :"}),el("div",{class:"code",text:g.id}),
      el("p",{text:"Envoie le lien d’invitation : tes proches ouvrent Déclic, créent leur profil et rejoignent le groupe directement."}),ul,
      el("div",{class:"row"},el("button",{class:"btn small",onclick:()=>invite(g)},"Inviter des proches"),el("button",{class:"btn ghost small",onclick:()=>copy(g.id)},"Copier le code"),el("button",{class:"btn ghost small",style:"color:var(--late)",onclick:()=>leave(g)},"Quitter le groupe")),muteBox);

    // conversation
    const byHour={};for(const p of S.photos)(byHour[p.hour]=byHour[p.hour]||[]).push(p);
    const msgByHour={};for(const m of S.messages){const h=new Date(m.ts).getHours();(msgByHour[h]=msgByHour[h]||[]).push(m);}
    const hours=[...new Set([...Object.keys(byHour),...Object.keys(msgByHour)].map(Number))];if(curHour!=null&&!hours.includes(curHour))hours.push(curHour);hours.sort((a,b)=>a-b);
    const convo=el("div");
    if(!hours.length) convo.append(el("div",{class:"empty",text:isToday?(sl.phase==="before"?"Les photos commencent à 8h. Tu peux déjà écrire un message.":"Aucune photo aujourd’hui. Écris un message à ton groupe !"):"Aucune photo ce jour-là."}));
    for(const h of hours){
      const list=(byHour[h]||[]).sort((a,b)=>a.ts-b.ts);
      const veil=h===curHour&&!mineNow;
      const isSlot=h>=FIRST&&h<=LAST;
      const sec=el("section",{class:"slot"},el("div",{class:"slothead"},el("b",{text:h+"h"}),el("span",{text:list.length?`${list.length}/${g.members.length} photo${list.length>1?"s":""}`:(h===curHour?"en attente":isSlot?"":"")})));
      const items=[...list.map(p=>({ts:p.ts,node:()=>photoMsg(p,veil)})),...(msgByHour[h]||[]).map(m=>({ts:m.ts,node:()=>textMsg(m)}))].sort((a,b)=>a.ts-b.ts);
      for(const it of items)sec.append(it.node());
      if(h===curHour){const miss=g.members.filter(m=>!list.some(p=>p.uid===m)&&m!==S.uid);if(miss.length)sec.append(el("p",{class:"pending",style:"margin-left:0",text:"Pas encore : "+miss.map(pName).join(", ")}));}
      convo.append(sec);
    }
    if(S.photos.length)convo.append(el("div",{class:"row",style:"justify-content:center;margin:4px 0 18px"},el("button",{class:"btn ghost small",onclick:()=>showMosaic(g)},"🧩 Résumé de la journée")));
    if(isToday){
      const last=lastItem();
      if(last){
        const viewers=g.members.filter(m=>m!==S.uid&&m!==last.uid&&(S.seen[m]||0)>=last.ts);
        if(viewers.length)convo.append(el("p",{class:"seenby",text:"Vu par "+viewers.map(pName).join(", ")}));
      }
      const typers=Object.entries(S.typing).filter(([u,t])=>u!==S.uid&&Date.now()-t<4000&&g.members.includes(u)).map(([u])=>pName(u));
      S.typingShown=typers.length>0;
      if(typers.length)convo.append(el("p",{class:"typing",text:typers.join(", ")+(typers.length>1?" écrivent":" écrit")},el("span",{class:"dots","aria-hidden":"true"},el("i"),el("i"),el("i"))));
      markSeen(last);
    }
    const defi=isToday?el("div",{class:"defi"},el("b",{text:"🎯 Défi du jour"}),el("span",{text:defiDuJour()})):null;
    app.replaceChildren(...[head,renderScore(g,sl,isToday),panel,themePanel(g),defi,nav,convo].filter(Boolean));

    // bottom bar
    barHost.replaceChildren(renderBar(sl,isToday,mineNow));
    if(S.scrollBottom||nearBottom)requestAnimationFrame(()=>window.scrollTo(0,document.documentElement.scrollHeight));else window.scrollTo(0,prevY);
    tick();
  }

  function renderScore(g,sl,isToday){
    const me=scoreDay(S.uid,todayKey(),g),streak=currentStreak(S.uid),combo=currentCombo(S.uid);
    const slots=slotsOf(S.uid,todayKey());
    const track=el("div",{class:"track","aria-label":"Tes déclics du jour"});
    for(let h=FIRST;h<=LAST;h++){const v=slots[h];track.append(el("i",{class:(v==null?"":v<=ON_TIME?"ok":"late")+(sl.phase==="open"&&sl.hour===h?" cur":""),title:h+"h",text:h}));}
    const card=el("section",{class:"score"},
      el("div",{class:"top3"},
        el("div",{class:"stat"},el("b",{text:me.pts}),el("span",{text:"points aujourd’hui"})),
        el("div",{class:"stat"},el("b",{text:combo?"×"+combo:"–"}),el("span",{text:"combo d’heures"})),
        el("div",{class:"stat"},el("b",{text:streak?"🔥"+streak:"–"}),el("span",{text:streak>1?"jours de suite":"jour de série"}))),
      track,el("p",{class:"legend",text:"Vert : à l’heure. Rouge : en retard. Vide : manqué."}));
    const board=el("details",{class:"panel",open:S.boardOpen,ontoggle:e=>S.boardOpen=e.target.open},el("summary",{text:"🏆 Classement"}));
    const tabs=el("div",{class:"tabs"});
    [["today","Aujourd’hui"],["week","7 jours"],["month","30 jours"]].forEach(([k,l])=>tabs.append(el("button",{class:S.period===k?"on":"",onclick:()=>{S.period=k;render();}},l)));
    const rows=g.members.map(m=>({m,pts:periodPoints(m,g,S.period),streak:currentStreak(m)})).sort((a,b)=>b.pts-a.pts);
    const ol=el("ol",{class:"board"});
    rows.forEach((r,i)=>ol.append(el("li",{class:i===0&&r.pts>0?"first":""},el("span",{class:"rk",text:i===0&&r.pts>0?"👑":i+1}),avEl(r.m,30),el("span",{class:"nm",text:r.m===S.uid?"Toi":pName(r.m)}),r.streak>1?el("span",{class:"st",text:"🔥"+r.streak}):null,el("span",{class:"pts",text:r.pts+" pts"}))));
    const rules=el("ul",{class:"rules"},
      el("li",{text:`Photo à l’heure (moins de ${ON_TIME} min) : +${PTS.onTime}. En retard : +${PTS.late}.`}),
      el("li",{text:`Combo : chaque heure à l’heure enchaînée rapporte +${PTS.comboStep} de plus (jusqu’à +${PTS.comboMax}).`}),
      el("li",{text:`Tout le groupe à l’heure sur un même déclic : +${PTS.together} chacun.`}),
      el("li",{text:`Série de jours : +${PTS.streakStep} par jour de suite avec au moins une photo (jusqu’à +${PTS.streakMax} par jour).`}),
      el("li",{text:`Journée parfaite, les ${HOURS} déclics de 8h à 20h : +${PTS.fullDay}.`}));
    const bl=el("ul",{class:"badges"});
    for(const m of g.members){const got=badgesOf(m);bl.append(el("li",{},avEl(m,26),el("span",{class:"nm",text:m===S.uid?"Toi":pName(m)}),
      el("span",{class:"icons",text:got.length?got.map(b=>b.icon).join(" "):"—",title:got.map(b=>b.name).join(", ")})));}
    const guide=el("ul",{class:"rules"});const mineB=new Set(badgesOf(S.uid).map(b=>b.id));
    for(const b of BADGES)guide.append(el("li",{class:mineB.has(b.id)?"got":"",text:`${b.icon} ${b.name} : ${b.desc}`}));
    announceBadges(g);
    board.append(tabs,ol,el("p",{class:"legend",style:"margin:0 0 6px",text:"Comment gagner des points"}),rules,
      el("p",{class:"legend",style:"margin:10px 0 6px",text:"🏅 Badges (30 derniers jours)"}),bl,guide);
    const f=document.createDocumentFragment();f.append(card,board);return f;
  }

  function photoMsg(p,veil){
    const mine=p.uid===S.uid;
    const late=p.lateMin>ON_TIME;
    const bubble=el("div",{class:"bubble"},
      el("div",{class:"meta"},el("span",{class:"who",text:mine?"Toi":pName(p.uid)}),el("time",{text:hm(p.ts)}),late?el("span",{class:"late",text:`+${p.lateMin} min`}):null),
      el("button",{class:"pic"+(veil?" veiled":""),"aria-label":veil?"Photo masquée":"Agrandir la photo de "+pName(p.uid),onclick:()=>{if(!veil)zoom(p.img);}},el("img",{src:p.img,alt:"",loading:"lazy"})));
    if(veil){bubble.append(el("p",{class:"veilnote",text:"Envoie ta photo pour la voir."}));return el("div",{class:"msg"},avEl(p.uid,32),bubble);}
    if(p.caption)bubble.append(el("p",{class:"caption",text:p.caption}));
    // reactions
    const rs=S.reacts.filter(r=>r.photoId===p.id);
    if(rs.length){
      const counts={};rs.forEach(r=>{(counts[r.emoji]=counts[r.emoji]||[]).push(r.uid);});
      const row=el("div",{class:"reacts"});
      for(const[e,us]of Object.entries(counts))row.append(el("button",{class:"chip"+(us.includes(S.uid)?" me":""),title:us.map(pName).join(", "),onclick:()=>react(p,e)},`${e} ${us.length}`));
      bubble.append(row);
    }
    // replies
    const reps=S.replies.filter(r=>r.photoId===p.id).sort((a,b)=>a.ts-b.ts);
    if(reps.length){
      const box=el("div",{class:"replies"});
      for(const r of reps)box.append(el("div",{class:"reply"},avEl(r.uid,24),el("div",{class:"body"},el("span",{class:"who",text:r.uid===S.uid?"Toi":pName(r.uid)}),r.text?el("p",{text:r.text}):null,
        r.img?el("button",{class:"rimg","aria-label":"Agrandir",onclick:()=>zoom(r.img)},el("img",{src:r.img,alt:""})):null)));
      bubble.append(box);
    }
    const myR=rs.find(r=>r.uid===S.uid);
    bubble.append(el("div",{class:"acts"},
      el("button",{onclick:()=>{S.picker=S.picker===p.id?null:p.id;render();}},myR?myR.emoji+" Réaction":"☺ Réagir"),
      el("button",{onclick:()=>openReply(p)},"↩ Répondre")));
    if(S.picker===p.id){const pk=el("div",{class:"picker"});EMOJIS.forEach(e=>pk.append(el("button",{class:myR&&myR.emoji===e?"me":"","aria-label":"Réagir "+e,onclick:()=>react(p,e)},e)));bubble.append(pk);}
    return el("div",{class:"msg"+(mine?" mine":"")},mine?null:avEl(p.uid,32),bubble);
  }

  function textMsg(m){
    const mine=m.uid===S.uid;
    const bubble=el("div",{class:"bubble text"},
      el("div",{class:"meta"},el("span",{class:"who",text:mine?"Toi":pName(m.uid)}),el("time",{text:hm(m.ts)})),
      el("p",{class:"caption",text:m.text}));
    if(mine)bubble.append(el("div",{class:"acts"},el("button",{onclick:()=>deleteMessage(m)},"Supprimer")));
    return el("div",{class:"msg"+(mine?" mine":"")},mine?null:avEl(m.uid,32),bubble);
  }
  async function deleteMessage(m){
    if(!confirm("Supprimer ce message ?"))return;
    try{await S.db.doc("groups/"+S.current).collection("messages").doc(m.id).delete();}catch(e){toast("Le message n’a pas pu être supprimé.");}
  }

  function renderBar(sl,isToday,mineNow){
    const txt=el("div",{class:"txt"}),bar=el("div",{class:"bar"},el("div",{class:"in"},txt));
    const inner=bar.firstChild;
    if(!isToday){txt.append(el("div",{class:"l1",text:"Tu regardes "+fmtDay(S.day).toLowerCase()}),el("div",{class:"l2",text:"Archives"}));inner.append(el("button",{class:"btn",onclick:()=>setDay(todayKey())},"Aujourd’hui"));return bar;}
    if(sl.phase==="open"&&!mineNow){
      bar.classList.add("open");
      txt.append(el("div",{class:"l1","data-l1":"1"}),el("div",{class:"l2","data-clock":"1"}));
      inner.append(el("button",{class:"btn",onclick:()=>pickFile("shot","environment")},"📷 Ma photo de "+sl.hour+"h"));
    }else{
      txt.append(el("div",{class:"l1",text:sl.phase==="open"?`Photo de ${sl.hour}h envoyée. Prochain déclic ${sl.hour<LAST?"à "+(sl.hour+1)+"h":"demain à 8h"}`:`Prochain déclic ${sl.phase==="before"?"à 8h":"demain à 8h"}`}),el("div",{class:"l2","data-clock":"1"}));
    }
    return bar;
  }

  let lastKey="";
  function tick(){
    const sl=slotNow(),key=sl.phase+(sl.hour??"")+todayKey()+(sl.phase==="open"&&sl.sinceMin<ON_TIME);
    if(lastKey&&key!==lastKey){lastKey=key;if(S.current&&S.day!==todayKey()&&S.day===shiftDay(todayKey(),-1)){} render();return;}
    lastKey=key;const now=Date.now();
    if(S.typingShown&&!Object.values(S.typing).some(t=>now-t<4000)){render();return;}
    const h=document.querySelector("[data-home]");
    if(h)h.textContent=sl.phase==="open"&&sl.sinceMin<ON_TIME?fmtDur(sl.open.getTime()+ON_TIME*60000-now):fmtDur(sl.next-now);
    const c=document.querySelector("[data-clock]");
    if(c){
      const l1=document.querySelector("[data-l1]");
      if(l1){const left=sl.open.getTime()+ON_TIME*60000-now;
        if(left>0){l1.textContent=`Déclic de ${sl.hour}h : à l’heure encore`;c.textContent=fmtDur(left);}
        else{l1.textContent=`En retard pour ${sl.hour}h, envoie quand même`;c.textContent="+"+fmtDur(-left);}
      }else c.textContent=fmtDur(sl.next-now);
    }
  }
  setInterval(tick,1000);

  // ---------- data ----------
  function unsubAll(){S.subs.forEach(u=>{try{u()}catch(e){}});S.subs=[];}
  function subscribeDay(){
    unsubAll();S.photos=[];S.reacts=[];S.replies=[];S.messages=[];S.picker=null;
    const base=S.db.doc("groups/"+S.current);
    const err=()=>toast("Connexion perdue, nouvelle tentative…");
    S.subs.push(base.collection("photos").where("date","==",S.day).onSnapshot(s=>{S.photos=s.docs.map(d=>({id:d.id,...d.data()})).filter(p=>typeof p.hour==="number");backfill();render();S.scrollBottom=false;},err));
    S.subs.push(base.collection("reactions").where("date","==",S.day).onSnapshot(s=>{S.reacts=s.docs.map(d=>d.data());render();},err));
    S.subs.push(base.collection("replies").where("date","==",S.day).onSnapshot(s=>{S.replies=s.docs.map(d=>({id:d.id,...d.data()}));render();},err));
    S.subs.push(base.collection("messages").where("date","==",S.day).onSnapshot(s=>{S.messages=s.docs.map(d=>({id:d.id,...d.data()})).filter(m=>typeof m.text==="string"&&typeof m.ts==="number");render();},err));
  }
  // « Vu par » (collection seen) et « … écrit » (canal temps réel) pour le groupe ouvert.
  function subscribeLive(id){
    closeLive();S.seen={};S.typing={};
    S.seenSub=S.db.doc("groups/"+id).collection("seen").onSnapshot(s=>{const m={};s.docs.forEach(d=>{const x=d.data();m[x.uid]=x.ts;});S.seen=m;render();},()=>{});
    S.typingCh=S.db.typing(id,uid=>{S.typing[uid]=Date.now();render();});
  }
  function closeLive(){if(S.seenSub){S.seenSub();S.seenSub=null;}if(S.typingCh){S.typingCh.close();S.typingCh=null;}S.typing={};}
  function lastItem(){
    let last=null;
    for(const x of [...S.photos,...S.messages])if(typeof x.ts==="number"&&(!last||x.ts>last.ts))last=x;
    return last;
  }
  let seenWriting=false;
  function markSeen(last){
    if(!last||document.visibilityState!=="visible"||seenWriting||(S.seen[S.uid]||0)>=last.ts)return;
    seenWriting=true;const ts=last.ts;S.seen[S.uid]=ts;
    S.db.doc("groups/"+S.current).collection("seen").doc("s_"+S.uid).set({uid:S.uid,date:todayKey(),ts})
      .catch(()=>{}).finally(()=>{seenWriting=false;});
  }
  let lastTypingSent=0;
  $("#mText").addEventListener("input",e=>{
    if(!S.typingCh||!e.target.value.trim()||Date.now()-lastTypingSent<2500)return;
    lastTypingSent=Date.now();S.typingCh.send();
  });

  function subscribeDays(){
    if(S.daySub){S.daySub();S.daySub=null;}S.days=[];
    S.daySub=S.db.doc("groups/"+S.current).collection("days").where("date",">=",shiftDay(todayKey(),-40)).onSnapshot(s=>{S.days=s.docs.map(d=>d.data());S.daysLoaded=true;backfill();render();},()=>{});
  }
  function backfill(){
    if(!S.daysLoaded)return;
    for(const p of S.photos){
      if(p.uid!==S.uid)continue;const k=p.id;if(S.backfilled[k])continue;
      if(slotsOf(S.uid,p.date)[p.hour]!=null){S.backfilled[k]=1;continue;}
      S.backfilled[k]=1;recordSlot(p.date,p.hour,p.lateMin||0).catch(()=>{});return; // one write at a time
    }
  }
  function openGroup(id){S.daysLoaded=false;S.current=id;S.boardOpen=false;subscribeDays();subscribeLive(id);S.day=todayKey();S.panelOpen=false;S.scrollBottom=true;subscribeDay();render();}
  function setDay(d){S.day=d;S.scrollBottom=true;subscribeDay();render();}
  function closeGroup(){S.current=null;unsubAll();if(S.daySub){S.daySub();S.daySub=null;}closeLive();render();window.scrollTo(0,0);}

  async function react(p,emoji){
    S.picker=null;
    const ref=S.db.doc("groups/"+S.current).collection("reactions").doc(p.id+"_"+S.uid);
    const mine=S.reacts.find(r=>r.photoId===p.id&&r.uid===S.uid);
    try{ if(mine&&mine.emoji===emoji)await ref.delete(); else await ref.set({photoId:p.id,uid:S.uid,emoji,date:p.date,ts:Date.now()}); }
    catch(e){toast(e&&e.code==="quota_exceeded"?"Espace plein pour ce groupe.":"Réaction non envoyée.");}
    render();
  }
  function openReply(p){
    S.replyTo=p;S.pendingReplyImg=null;$("#rText").value="";$("#rPrev").style.display="none";
    $("#rThumb").replaceChildren(el("img",{src:p.img,alt:""}),el("span",{text:"Réponse à "+(p.uid===S.uid?"ta photo":pName(p.uid))}));
    openDlg("#dlgReply");setTimeout(()=>$("#rText").focus(),50);
  }
  $("#rPhoto").addEventListener("click",()=>pickFile("reply"));
  $("#rGo").addEventListener("click",async()=>{
    const t=$("#rText").value.trim(),p=S.replyTo;if(!p)return;
    if(!t&&!S.pendingReplyImg){$("#rErr").textContent="Écris un message ou joins une photo.";return;}
    const b=$("#rGo");b.disabled=true;
    try{await S.db.doc("groups/"+S.current).collection("replies").add({photoId:p.id,uid:S.uid,text:t.slice(0,200),img:S.pendingReplyImg||"",date:p.date,ts:Date.now()});$("#dlgReply").close();S.pendingReplyImg=null;}
    catch(e){$("#rErr").textContent=e&&e.code==="quota_exceeded"?"Espace plein pour ce groupe.":"Réponse non envoyée. Réessaie.";}
    b.disabled=false;
  });

  // Envoi d'un message texte dans la conversation du groupe (le champ n'est jamais redessiné : le texte tapé est conservé).
  composer.addEventListener("submit",async e=>{
    e.preventDefault();
    const input=$("#mText"),text=input.value.trim();if(!text||!S.current)return;
    const btn=$("#mSend");btn.disabled=true;
    try{
      await S.db.doc("groups/"+S.current).collection("messages").add({uid:S.uid,date:todayKey(),ts:Date.now(),text:text.slice(0,500)});
      input.value="";S.scrollBottom=true;render();S.scrollBottom=false;
    }catch(err){toast(err&&err.code==="quota_exceeded"?"Message trop long.":"Message non envoyé. Réessaie.");}
    btn.disabled=false;input.focus();
  });

  $("#sRetake").addEventListener("click",()=>{$("#dlgShot").close();setTimeout(()=>pickFile("shot","environment"),50);});
  $("#sGo").addEventListener("click",async()=>{
    const sl=slotNow();if(!S.pendingShot||!S.current)return;
    if(sl.phase!=="open"){$("#sErr").textContent="Aucun déclic en cours (de 8h à 20h).";return;}
    const d=todayKey(),b=$("#sGo");b.disabled=true;
    try{
      await S.db.doc("groups/"+S.current).collection("photos").doc(`${d}_${pad(sl.hour)}_${S.uid}`).set({uid:S.uid,date:d,hour:sl.hour,ts:Date.now(),lateMin:sl.sinceMin,img:S.pendingShot,caption:$("#sCap").value.trim().slice(0,80)});
      const g=S.groups.find(x=>x.id===S.current);
      const before=scoreDay(S.uid,d,g).pts;
      const after=scoreDay(S.uid,d,g,{...slotsOf(S.uid,d),[sl.hour]:sl.sinceMin}).pts;
      S.backfilled[`${d}_${pad(sl.hour)}_${S.uid}`]=1;
      recordSlot(d,sl.hour,sl.sinceMin).catch(()=>{});
      S.pendingShot=null;$("#dlgShot").close();S.scrollBottom=true;if(S.day!==d)setDay(d);
      toast(`Photo envoyée : +${after-before} pts`+(sl.sinceMin<=ON_TIME?" (à l’heure)":" (en retard)"));
    }catch(e){$("#sErr").textContent=e&&e.code==="quota_exceeded"?"Espace plein pour ce groupe.":"L’envoi a échoué. Réessaie.";}
    b.disabled=false;
  });

  $("#cGo").addEventListener("click",async()=>{
    const n=$("#cName").value.trim();if(!n){$("#cErr").textContent="Donne un nom au groupe.";return;}
    const b=$("#cGo");b.disabled=true;
    try{
      let code;
      for(let i=0;;i++){code=genCode();try{await S.db.doc("groups/"+code).set({name:n,members:[S.uid],createdBy:S.uid,createdAt:Date.now()});break;}catch(e){if(e.code!=="permission_denied"||i>=3)throw e;}}
      $("#dlgCreate").close();toast("Groupe créé. Code : "+code);openGroup(code);S.panelOpen=true;render();
    }catch(e){$("#cErr").textContent="La création a échoué. Réessaie.";}
    b.disabled=false;
  });
  $("#jGo").addEventListener("click",async()=>{
    const code=$("#jCode").value.trim().toUpperCase();
    if(!/^[A-Z0-9]{6}$/.test(code)){$("#jErr").textContent="Le code fait 6 caractères.";return;}
    const b=$("#jGo");b.disabled=true;
    try{
      const g=await S.db.rpc("join_group",{code});
      if(!g){$("#jErr").textContent="Aucun groupe avec ce code.";b.disabled=false;return;}
      $("#dlgJoin").close();toast("Tu as rejoint « "+g.name+" »");openGroup(code);
    }catch(e){$("#jErr").textContent="Impossible de rejoindre. Réessaie.";}
    b.disabled=false;
  });
  async function invite(g){
    const url=location.origin+location.pathname+"#rejoindre="+g.id;
    const text=`Rejoins « ${g.name} » sur Déclic : une photo toutes les heures, de 8h à 20h. Code du groupe : ${g.id}`;
    if(navigator.share){try{await navigator.share({title:"Déclic",text,url});return;}catch(e){if(e&&e.name==="AbortError")return;}}
    try{await navigator.clipboard.writeText(text+"\n"+url);toast("Invitation copiée");}catch(e){prompt("Lien d’invitation :",url);}
  }
  async function copy(code){try{await navigator.clipboard.writeText(code);toast("Code copié");}catch(e){toast("Code : "+code);}}
  async function leave(g){
    if(!confirm("Quitter « "+g.name+" » ?"))return;
    try{await S.db.rpc("leave_group",{code:g.id});closeGroup();toast("Groupe quitté");}catch(e){toast("Impossible de quitter le groupe.");}
  }

  // ---------- thèmes de groupe ----------
  // Chaque thème associe deux couleurs (a et b) : un fond en dégradé et des couleurs d'accent assorties.
  const THEMES={
    "rose-bleu":{name:"Rose & bleu",a:"#FF6FA8",b:"#4C7BFF",bg:"#F3E6F4",page:"linear-gradient(160deg,#FFD3E6 0%,#D3E1FF 100%)",surface:"#FFFFFF",ink:"#23204A",muted:"#686491",line:"#E4D7EC",chip:"#F4EDF8",mine:"#3E63E0",mineInk:"#FFFFFF",flash:"#FF6FA8",flashInk:"#23204A"},
    "vert-orange":{name:"Vert & orange",a:"#2EA866",b:"#FF8A3D",bg:"#EAF3E4",page:"linear-gradient(160deg,#CDEFD9 0%,#FFE0C4 100%)",surface:"#FFFFFF",ink:"#1C2B22",muted:"#5E7266",line:"#D8E6D6",chip:"#EFF6EE",mine:"#1E7A4C",mineInk:"#FFFFFF",flash:"#FF8A3D",flashInk:"#1C2B22"},
    "jaune-bleu":{name:"Jaune & bleu",a:"#FFD23F",b:"#2F6BFF",bg:"#F1F0E0",page:"linear-gradient(160deg,#FFF0A3 0%,#CCDEFF 100%)",surface:"#FFFFFF",ink:"#16233F",muted:"#5D6784",line:"#E0E2D6",chip:"#F2F4F0",mine:"#1D4FB8",mineInk:"#FFFFFF",flash:"#FFD23F",flashInk:"#16233F"},
    "violet-menthe":{name:"Violet & menthe",a:"#7B5CFF",b:"#35D6A6",bg:"#ECE8F7",page:"linear-gradient(160deg,#E2D6FF 0%,#CBF5E8 100%)",surface:"#FFFFFF",ink:"#231A45",muted:"#675F88",line:"#DDD6EE",chip:"#F2EFFA",mine:"#5B3FD1",mineInk:"#FFFFFF",flash:"#35D6A6",flashInk:"#231A45"},
    "corail-turquoise":{name:"Corail & turquoise",a:"#FF7A5C",b:"#16A7B2",bg:"#F3EAE6",page:"linear-gradient(160deg,#FFD5CA 0%,#C6EFEE 100%)",surface:"#FFFFFF",ink:"#2A1E1B",muted:"#76625D",line:"#EADAD4",chip:"#F8F0ED",mine:"#0E7C86",mineInk:"#FFFFFF",flash:"#FF7A5C",flashInk:"#2A1E1B"},
    "nuit-rose":{name:"Nuit & rose",a:"#2A1B55",b:"#FF5FA2",bg:"#1A1033",page:"linear-gradient(160deg,#150D2E 0%,#3D1443 100%)",surface:"#261B40",ink:"#F4EEFF",muted:"#B6A9D6",line:"#3B2E5C",chip:"#33275A",mine:"#7B5CFF",mineInk:"#FFFFFF",flash:"#FF5FA2",flashInk:"#1A1033"},
  };
  const THEME_VARS={bg:"--bg",surface:"--surface",ink:"--ink",muted:"--muted",line:"--line",chip:"--chip",mine:"--mine",mineInk:"--mine-ink",flash:"--flash",flashInk:"--flash-ink"};
  const MEDIA_URL=/^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/media\/[A-Za-z0-9\/_.-]+$/;
  let appliedTheme="";
  function applyTheme(theme){
    const key=JSON.stringify(theme||null);if(key===appliedTheme)return;appliedTheme=key;
    const root=document.documentElement,body=document.body;
    for(const v of Object.values(THEME_VARS))root.style.removeProperty(v);
    root.style.removeProperty("--page-bg");body.classList.remove("gtheme","gimg");
    const t=theme&&theme.preset&&THEMES[theme.preset];
    if(t){
      for(const[k,v]of Object.entries(THEME_VARS))root.style.setProperty(v,t[k]);
      root.style.setProperty("--page-bg",t.page);body.classList.add("gtheme");
    }else if(theme&&typeof theme.image==="string"&&MEDIA_URL.test(theme.image)){
      root.style.setProperty("--page-bg",`linear-gradient(var(--veil),var(--veil)),url("${theme.image}") center/cover no-repeat`);
      body.classList.add("gtheme","gimg");
    }
    const meta=document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(m=>{if(!m.dataset.orig)m.dataset.orig=m.content;m.content=t?t.bg:m.dataset.orig;});
  }
  async function setTheme(g,theme){
    try{await S.db.rpc("set_group_theme",{code:g.id,theme});toast("Thème du groupe mis à jour");}
    catch(e){toast("Le thème n’a pas pu être changé.");}
  }
  // Grille de choix : « Par défaut », les thèmes prêts à l'emploi et « Ma photo ».
  function themeGrid(theme,onPick,fileTarget){
    const cur=theme||{};
    const grid=el("div",{class:"themes"});
    const opt=(label,sw,on,onclick)=>el("button",{class:"theme-opt"+(on?" on":""),"aria-pressed":on?"true":"false",onclick},el("span",{class:"sw",style:sw}),el("span",{text:label}));
    grid.append(opt("Par défaut","background:linear-gradient(135deg,#1B2340 50%,#FFC83D 50%)",!cur.preset&&!cur.image,()=>onPick(null)));
    for(const[k,t]of Object.entries(THEMES))grid.append(opt(t.name,`background:linear-gradient(135deg,${t.a} 50%,${t.b} 50%)`,cur.preset===k,()=>onPick({preset:k})));
    grid.append(opt("Ma photo",cur.image&&MEDIA_URL.test(cur.image)?`background:url("${cur.image}") center/cover`:"background:var(--line)",!!cur.image,()=>pickFile(fileTarget)));
    return grid;
  }
  function themePanel(g){
    const box=el("details",{class:"panel",open:S.themeOpen,ontoggle:e=>S.themeOpen=e.target.open},el("summary",{text:"🎨 Thème du groupe"}));
    box.append(el("p",{text:"Le thème s’applique pour tous les membres du groupe."}),themeGrid(g.theme,t=>setTheme(g,t),"theme"));
    return box;
  }
  // Thème personnel de l'application, enregistré dans le profil (il suit l'utilisateur sur ses appareils).
  async function setAppTheme(theme){
    const me=S.profiles[S.uid];if(!me)return;
    const next={...me,updatedAt:Date.now()};if(theme)next.theme=theme;else delete next.theme;
    try{await S.db.doc("profiles/"+S.uid).set(next);toast("Thème de l’application mis à jour");}
    catch(e){toast("Le thème n’a pas pu être changé.");}
  }

  // ---------- profil : préférences ----------
  async function saveProfile(patch){
    const me=S.profiles[S.uid];if(!me)return false;
    const next={...me,...patch,updatedAt:Date.now()};
    for(const[k,v]of Object.entries(patch))if(v==null)delete next[k];
    try{await S.db.doc("profiles/"+S.uid).set(next);return true;}catch(e){toast("L’enregistrement a échoué.");return false;}
  }
  const NOTIF_TYPES=[["photo","Nouvelles photos"],["reaction","Réactions et réponses à mes photos"],["message","Messages"],["join","Nouveaux membres"],["reminder","Rappel à chaque déclic"],["summary","Résumé de la journée (21h)"]];
  function notifPrefs(){return {...((S.profiles[S.uid]||{}).notif||{})};}
  async function setNotif(kind,on){const n=notifPrefs();if(on)delete n[kind];else n[kind]=false;await saveProfile({notif:n});}
  async function toggleMute(g,on){
    const n=notifPrefs();const m=new Set(n.muted||[]);on?m.add(g.id):m.delete(g.id);n.muted=[...m];
    if(await saveProfile({notif:n}))toast(on?"Notifications de ce groupe coupées":"Notifications de ce groupe réactivées");
  }

  // ---------- administration du groupe ----------
  async function removeMember(g,m){
    if(!confirm(`Retirer ${pName(m)} du groupe « ${g.name} » ?`))return;
    try{await S.db.rpc("remove_member",{code:g.id,member:m});toast(pName(m)+" a été retiré du groupe");}
    catch(e){toast("Impossible de retirer ce membre.");}
  }

  // ---------- défi du jour ----------
  const DEFIS=["Montre ce que tu manges","Ta vue en ce moment","Un selfie avec la personne la plus proche","Quelque chose de rouge","Tes chaussures du jour","Le ciel au-dessus de toi","Un objet qui te fait sourire","Ton coin préféré de la maison","Un animal (ou une peluche)","Ta boisson du moment","Quelque chose qui commence par la lettre D","Ton plus beau sourire","Une ombre intéressante","Ce que tu lis ou regardes","Ta tenue du jour","Quelque chose de rond","Une photo prise d’en haut","Un détail que personne ne remarque","Tes mains en action","Quelque chose de vieux","Un reflet","Ton moyen de transport","Une couleur pastel","Ce qui est sur ton bureau","Un endroit où tu n’étais jamais allé","Ta grimace la plus drôle","Un truc qui brille","Quelque chose de vert","Une photo en noir et blanc","La meilleure chose de ta journée"];
  function defiDuJour(){const[a,b,c]=todayKey().split("-").map(Number);const n=Math.floor(Date.UTC(a,b-1,c)/864e5);return DEFIS[n%DEFIS.length];}

  // ---------- badges (calculés sur les 30 derniers jours du groupe) ----------
  const BADGES=[
    {id:"serie3",icon:"🔥",name:"Série de 3",desc:"poster 3 jours de suite",test:x=>x.best>=3},
    {id:"serie7",icon:"☄️",name:"Série de 7",desc:"poster 7 jours de suite",test:x=>x.best>=7},
    {id:"parfait",icon:"💯",name:"Journée parfaite",desc:`les ${HOURS} déclics d’une même journée`,test:x=>x.perfect},
    {id:"combo5",icon:"⚡",name:"Combo ×5",desc:"5 déclics à l’heure d’affilée",test:x=>x.combo>=5},
    {id:"ponctuel",icon:"⏱️",name:"Ponctuel",desc:"20 déclics à l’heure",test:x=>x.onTime>=20},
    {id:"matin",icon:"🌅",name:"Lève-tôt",desc:"5 photos de 8h à l’heure",test:x=>x.early>=5},
    {id:"soir",icon:"🌙",name:"Oiseau de nuit",desc:"5 photos de 20h",test:x=>x.night>=5},
    {id:"cinquante",icon:"📸",name:"50 déclics",desc:"50 photos envoyées",test:x=>x.total>=50},
  ];
  function badgesOf(uid){
    const since=shiftDay(todayKey(),-30);
    const docs=S.days.filter(d=>d.uid===uid&&d.date>=since).sort((a,b)=>a.date<b.date?-1:1);
    const x={best:0,perfect:false,combo:0,onTime:0,early:0,night:0,total:0};let run=0,prev=null;
    for(const d of docs){
      const hrs=Object.keys(d.slots||{}).map(Number).sort((a,b)=>a-b);if(!hrs.length)continue;
      run=prev&&shiftDay(prev,1)===d.date?run+1:1;prev=d.date;x.best=Math.max(x.best,run);
      if(hrs.length>=HOURS)x.perfect=true;
      let c=0,ph=null;
      for(const h of hrs){const v=d.slots[h];x.total++;
        if(v<=ON_TIME){x.onTime++;c=ph===h-1&&c>0?c+1:1;x.combo=Math.max(x.combo,c);if(h===FIRST)x.early++;}else c=0;
        if(h===LAST)x.night++;ph=h;}
    }
    return BADGES.filter(b=>b.test(x));
  }
  function announceBadges(g){
    if(!S.daysLoaded)return;
    const key="declic.badges."+g.id,got=badgesOf(S.uid).map(b=>b.id);
    let seen=null;try{seen=JSON.parse(localStorage.getItem(key)||"null");}catch(e){}
    try{localStorage.setItem(key,JSON.stringify(got));}catch(e){}
    if(!seen)return; // première visite : pas d'annonce
    const fresh=BADGES.filter(b=>got.includes(b.id)&&!seen.includes(b.id));
    if(fresh.length)toast("Nouveau badge : "+fresh.map(b=>b.icon+" "+b.name).join(", ")+" !");
  }

  // ---------- résumé de la journée (mosaïque) ----------
  function loadForCanvas(src){
    return new Promise((res,rej)=>{const i=new Image();if(!src.startsWith("data:")){i.crossOrigin="anonymous";src+=(src.includes("?")?"&":"?")+"mosaic=1";}
      i.onload=()=>res(i);i.onerror=rej;i.src=src;});
  }
  async function buildMosaic(g){
    const photos=[...S.photos].sort((a,b)=>a.hour-b.hour||a.ts-b.ts);const n=photos.length;
    const cols=n<=1?1:n<=4?2:n<=9?3:4,rows=Math.ceil(n/cols),W=300,H=400,gap=10,pad=28,top=150,foot=60;
    const c=document.createElement("canvas");c.width=pad*2+cols*W+(cols-1)*gap;c.height=top+rows*H+(rows-1)*gap+foot;
    const x=c.getContext("2d"),css=getComputedStyle(document.documentElement),v=k=>css.getPropertyValue(k).trim();
    const disp='"Bricolage Grotesque","Avenir Next",system-ui,sans-serif',body='"Figtree",system-ui,sans-serif';
    x.fillStyle=v("--bg")||"#E4EAF4";x.fillRect(0,0,c.width,c.height);
    x.fillStyle=v("--ink")||"#1B2340";x.font=`800 44px ${disp}`;x.fillText(g.name,pad,pad+44);
    x.font=`600 24px ${body}`;x.fillStyle=v("--muted")||"#5E6785";x.fillText(`${fmtDay(S.day)} · ${n} déclic${n>1?"s":""}`,pad,pad+86);
    const imgs=await Promise.all(photos.map(p=>loadForCanvas(p.img).catch(()=>null)));
    photos.forEach((p,i)=>{
      const cx=pad+(i%cols)*(W+gap),cy=top+Math.floor(i/cols)*(H+gap),img=imgs[i];
      x.save();x.beginPath();if(x.roundRect)x.roundRect(cx,cy,W,H,18);else x.rect(cx,cy,W,H);x.clip();
      x.fillStyle=v("--line")||"#C9D2E3";x.fillRect(cx,cy,W,H);
      if(img){const s=Math.max(W/img.width,H/img.height),w=img.width*s,h=img.height*s;x.drawImage(img,cx+(W-w)/2,cy+(H-h)/2,w,h);}
      const label=`${p.hour}h · ${p.uid===S.uid?"Moi":pName(p.uid)}`;x.font=`700 20px ${body}`;const tw=x.measureText(label).width;
      x.fillStyle="rgba(0,0,0,.55)";if(x.roundRect){x.beginPath();x.roundRect(cx+10,cy+H-44,tw+24,34,17);x.fill();}else x.fillRect(cx+10,cy+H-44,tw+24,34);
      x.fillStyle="#fff";x.fillText(label,cx+22,cy+H-20);x.restore();
    });
    x.fillStyle=v("--muted")||"#5E6785";x.font=`800 22px ${disp}`;x.fillText("Déclic",pad,c.height-24);
    return new Promise((res,rej)=>{try{c.toBlob(b=>b?res(b):rej(new Error("blob")),"image/jpeg",.88);}catch(e){rej(e);}});
  }
  let mosaicBlob=null;
  async function showMosaic(g){
    $("#mImg").removeAttribute("src");openDlg("#dlgMosaic");$("#mErr").textContent="Préparation de la mosaïque…";
    try{mosaicBlob=await buildMosaic(g);$("#mImg").src=URL.createObjectURL(mosaicBlob);$("#mErr").textContent="";}
    catch(e){mosaicBlob=null;$("#mErr").textContent="La mosaïque n’a pas pu être créée.";}
    S.mosaicName=`declic-${g.name.replace(/[^\p{L}\p{N}]+/gu,"-")}-${S.day}.jpg`;
  }
  $("#mShare").addEventListener("click",async()=>{
    if(!mosaicBlob)return;const file=new File([mosaicBlob],S.mosaicName||"declic.jpg",{type:"image/jpeg"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"Résumé Déclic"});}catch(e){}return;}
    const a=el("a",{href:URL.createObjectURL(mosaicBlob),download:file.name});document.body.append(a);a.click();a.remove();
  });

  // ---------- code de récupération (sans e-mail) ----------
  function openAccount(){$("#aCode").value="";openDlg("#dlgAccount");setTimeout(()=>$("#aCode").focus(),50);}
  $("#aGo").addEventListener("click",async()=>{
    const b=$("#aGo");b.disabled=true;$("#aErr").textContent="";
    try{await S.account.login($("#aCode").value);toast("Compte retrouvé !");setTimeout(()=>location.reload(),600);return;}
    catch(e){$("#aErr").textContent=e.code==="invalid_argument"?"Le code fait 16 caractères (4 groupes de 4).":e.code==="bad_code"?"Code incorrect. Vérifie-le et réessaie.":"Ça n’a pas marché. Vérifie ta connexion et réessaie.";}
    b.disabled=false;
  });
  async function createRecoveryCode(){
    const me=S.profiles[S.uid]||{};
    if(me.recoveryAt&&!confirm("Créer un nouveau code ? L’ancien ne marchera plus."))return;
    try{
      const code=await S.account.createCode();
      $("#rcCode").textContent=code;openDlg("#dlgCode");
      await saveProfile({recoveryAt:Date.now()});
    }catch(e){toast("Le code n’a pas pu être créé. Réessaie.");}
  }
  $("#rcCopy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#rcCode").textContent);toast("Code copié");}catch(e){toast("Sélectionne le code pour le copier.");}});

  // ---------- installation ----------
  const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const HIDE_KEY="declic.installHidden";
  function installHidden(){try{return !!localStorage.getItem(HIDE_KEY);}catch(e){return false;}}
  function hideInstall(){try{localStorage.setItem(HIDE_KEY,"1");}catch(e){}render();}
  function installCard(){
    if(standalone()||installHidden())return null;
    if(S.installEvt)return el("div",{class:"empty invite"},el("p",{text:"Installe Déclic sur ton écran d’accueil pour l’ouvrir comme une vraie app."}),
      el("div",{class:"row"},el("button",{class:"btn small",onclick:async()=>{const e=S.installEvt;S.installEvt=null;e.prompt();try{await e.userChoice;}catch(x){}render();}},"Installer l’app"),
        el("button",{class:"btn ghost small",onclick:hideInstall},"Plus tard")));
    if(isIOS)return el("div",{class:"empty invite"},el("p",{text:"Pour avoir Déclic comme une vraie app : touche le bouton Partager de Safari, puis « Sur l’écran d’accueil »."}),
      el("div",{class:"row"},el("button",{class:"btn ghost small",onclick:hideInstall},"Compris")));
    return null;
  }
  // ---------- notifications ----------
  const ASK_KEY="declic.pushAsked";
  const pushSupported=()=>"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window;
  function b64ToU8(s){const p="=".repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0));}
  async function swReg(){try{return await navigator.serviceWorker.getRegistration();}catch(e){return null;}}
  async function pushState(){
    if(!pushSupported())return"unsupported";
    if(Notification.permission==="denied")return"denied";
    const reg=await swReg();if(!reg)return"off";
    try{return (await reg.pushManager.getSubscription())?"on":"off";}catch(e){return"off";}
  }
  const tz=()=>Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function enablePush(){
    try{
      if(await Notification.requestPermission()!=="granted"){toast("Notifications refusées.");S.push=await pushState();render();return;}
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub){const {publicKey}=await (await fetch(NOTIFY_URL)).json();sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(publicKey)});}
      await S.db.savePush(sub.toJSON(),tz());
      toast("Notifications activées");
    }catch(e){toast("Impossible d’activer les notifications.");}
    S.push=await pushState();render();
  }
  async function disablePush(){
    try{const reg=await swReg(),sub=reg&&await reg.pushManager.getSubscription();
      if(sub){await S.db.removePush(sub.endpoint).catch(()=>{});await sub.unsubscribe();}
      toast("Notifications désactivées");
    }catch(e){toast("Impossible de désactiver les notifications.");}
    S.push=await pushState();render();
  }
  function pushAsked(){try{return !!localStorage.getItem(ASK_KEY);}catch(e){return false;}}
  function markPushAsked(){try{localStorage.setItem(ASK_KEY,"1");}catch(e){}}
  function pushCard(){
    if(S.push!=="off"||pushAsked())return null;
    return el("div",{class:"empty invite"},
      el("p",{text:"Active les notifications : tu sauras quand tes proches publient, et tu seras prévenu à chaque déclic."}),
      el("div",{class:"row"},el("button",{class:"btn flash small",onclick:()=>{markPushAsked();enablePush();}},"Activer les notifications"),
        el("button",{class:"btn ghost small",onclick:()=>{markPushAsked();render();}},"Plus tard")));
  }
  function settingsCard(){
    const st=S.push;
    const ctl=st==="on"?el("button",{class:"btn ghost small",onclick:disablePush},"Désactiver"):st==="off"?el("button",{class:"btn flash small",onclick:enablePush},"Activer"):null;
    const txt=st==="on"?"Activées sur cet appareil : nouvelles photos de tes groupes et rappel à chaque déclic."
      :st==="denied"?"Bloquées : autorise les notifications de Déclic dans les réglages de l’appareil."
      :st==="unsupported"?(isIOS?"Ajoute d’abord Déclic à l’écran d’accueil (Partager › Sur l’écran d’accueil), puis ouvre-le depuis l’icône.":"Ce navigateur ne gère pas les notifications.")
      :"Nouvelles photos de tes groupes et rappel à chaque déclic, de 8h à 20h.";
    const me=S.profiles[S.uid]||{};
    const prefs=me.notif||{};
    const choices=el("div",{class:"choices"},...NOTIF_TYPES.map(([k,label])=>el("label",{class:"switch"},
      el("input",{type:"checkbox",checked:prefs[k]!==false,onchange:e=>setNotif(k,e.target.checked)}),el("span",{text:label}))));
    const rAt=me.recoveryAt?new Date(me.recoveryAt).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):null;
    const account=el("div",{class:"setrow"},el("div",{},el("b",{text:"Code de récupération"}),
        el("p",{text:rAt?`Créé le ${rAt}. Garde-le précieusement : sur un autre téléphone, choisis « J’ai déjà un compte » et tape ce code.`:"Crée un code pour retrouver ton compte (profil, groupes, points) si tu changes de téléphone. Pas d’e-mail, pas de mot de passe."})),
      el("button",{class:rAt?"btn ghost small":"btn flash small",onclick:createRecoveryCode},rAt?"Nouveau code":"Créer mon code"));
    return el("section",{class:"profile settings"},el("h2",{text:"Réglages"}),
      account,
      el("div",{class:"setrow setcol"},el("div",{class:"setline"},el("div",{},el("b",{text:"Notifications"}),el("p",{text:txt})),ctl),choices),
      el("div",{class:"setrow setcol"},el("div",{},el("b",{text:"Thème de l’application"}),
        el("p",{text:"Rien que pour toi. Dans un groupe qui a son propre thème, c’est celui du groupe qui s’affiche."})),
        themeGrid(me.theme,setAppTheme,"apptheme")));
  }

  addEventListener("beforeinstallprompt",e=>{e.preventDefault();S.installEvt=e;render();});
  addEventListener("appinstalled",()=>{S.installEvt=null;render();});

  // ---------- boot ----------
  (async()=>{
    const hash=new URLSearchParams(location.hash.slice(1)),code=(hash.get("rejoindre")||"").toUpperCase();
    if(/^[A-Z0-9]{6}$/.test(code)){S.pendingJoin=code;history.replaceState(null,"",location.pathname+location.search);}
    if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY){app.replaceChildren(el("p",{class:"notice",text:"Déclic n’est pas encore relié à sa base de données : il reste à remplir docs/config.js (voir le README)."}));return;}
    let opened;
    try{opened=await openDb(SUPABASE_URL,SUPABASE_ANON_KEY,NOTIFY_URL);}
    catch(e){app.replaceChildren(el("p",{class:"notice",text:"Impossible de se connecter à Déclic. Vérifie ta connexion internet."}),el("div",{class:"row",style:"margin-top:12px"},el("button",{class:"btn",onclick:()=>location.reload()},"Réessayer")));return;}
    const {db,uid,account}=opened;
    S.db=db;S.uid=uid;S.account=account;S.prefillName="";
    db.collection("profiles").limit(1000).onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]=d.data());S.profiles=m;S.profilesLoaded=true;render();},e=>{if(e.code==="unavailable")toast("Connexion perdue, nouvelle tentative…");S.profilesLoaded=true;render();});
    db.collection("groups").where("members","array-contains",uid).onSnapshot(s=>{S.groups=s.docs.map(d=>({id:d.id,...d.data()}));S.groupsLoaded=true;render();},e=>{if(e.code!=="unavailable")toast("Impossible de charger tes groupes.");});
    S.push=await pushState();
    if(S.push==="on"){try{const sub=await (await swReg()).pushManager.getSubscription();await db.savePush(sub.toJSON(),tz());}catch(e){}}
    render();
  })();
