// Déclic : une photo toutes les heures, de 8h à 20h, partagée avec tes proches.
import { openDb } from "./db.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

  const FIRST=8, LAST=20, ON_TIME=10;
  const EMOJIS=["❤️","😂","😮","😍","🔥","👏","😢"];
  const $=s=>document.querySelector(s);
  const app=$("#app"), barHost=$("#barHost");
  const S={db:null,user:null,uid:null,groups:[],profiles:{},profilesLoaded:false,current:null,day:null,
    photos:[],reacts:[],replies:[],subs:[],picker:null,open:{},editProfile:false,panelOpen:false,
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
  async function compress(file,max=1000,limit=190000){
    const img=await loadImage(file);let q=.8,out="";
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
      else if(S.fileTarget==="reply"){S.pendingReplyImg=await compress(f,800,150000);const p=$("#rPrev");p.src=S.pendingReplyImg;p.style.display="block";}
    }catch(err){toast("Cette image n’a pas pu être lue.");}
  });

  // ---------- render ----------
  function render(){
    if(!S.db)return;
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
      try{await S.db.doc("profiles/"+S.uid).set({name:n,avatar:avatar||"",updatedAt:Date.now()});S.editProfile=false;S.draftAvatar=undefined;toast(first?"Profil créé":"Profil mis à jour");}
      catch(e){err.textContent="L’enregistrement a échoué. Réessaie.";save.disabled=false;}
    }},first?"Créer mon profil":"Enregistrer");
    const card=el("section",{class:"profile"},
      el("h2",{text:first?"Bienvenue sur Déclic":"Ton profil"}),
      el("p",{text:first?"Choisis ton nom et une photo pour que tes proches te reconnaissent.":"C’est ce que voient les membres de tes groupes."}),
      el("button",{class:"avpick","aria-label":"Choisir une photo de profil",onclick:()=>pickFile("avatar")},
        avatar?el("img",{class:"av",src:avatar,alt:"",style:"width:112px;height:112px"}):el("span",{class:"av",style:"width:112px;height:112px;background:var(--line);color:var(--muted);font-size:40px",text:"☺"}),
        el("span",{class:"plus","aria-hidden":"true",text:"+"})),
      el("label",{for:"pName",text:"Nom"}),nameIn,err,save,
      !first?el("button",{class:"btn ghost",style:"width:100%;margin-top:10px",onclick:()=>{S.editProfile=false;S.draftAvatar=undefined;render();}},"Annuler"):null);
    app.replaceChildren(el("header",{class:"top"},el("h1",{class:"brand"},el("span",{class:"shutter","aria-hidden":"true"}),el("span",{class:"t",text:"Déclic"}))),card);
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
    for(const c of [installCard()])if(c)app.append(c);
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
    const ul=el("ul",{class:"members"});g.members.forEach(m=>ul.append(el("li",{},avEl(m,30),el("span",{text:pName(m)+(m===S.uid?" (toi)":"")}))));
    panel.append(el("p",{text:"Code à partager :"}),el("div",{class:"code",text:g.id}),
      el("p",{text:"Envoie le lien d’invitation : tes proches ouvrent Déclic, créent leur profil et rejoignent le groupe directement."}),ul,
      el("div",{class:"row"},el("button",{class:"btn small",onclick:()=>invite(g)},"Inviter des proches"),el("button",{class:"btn ghost small",onclick:()=>copy(g.id)},"Copier le code"),el("button",{class:"btn ghost small",style:"color:var(--late)",onclick:()=>leave(g)},"Quitter le groupe")));

    // conversation
    const byHour={};for(const p of S.photos)(byHour[p.hour]=byHour[p.hour]||[]).push(p);
    const hours=Object.keys(byHour).map(Number);if(curHour!=null&&!hours.includes(curHour))hours.push(curHour);hours.sort((a,b)=>a-b);
    const convo=el("div");
    if(!hours.length) convo.append(el("div",{class:"empty",text:isToday?(sl.phase==="before"?"La conversation commence à 8h.":"Aucune photo aujourd’hui."):"Aucune photo ce jour-là."}));
    for(const h of hours){
      const list=(byHour[h]||[]).sort((a,b)=>a.ts-b.ts);
      const veil=h===curHour&&!mineNow;
      const sec=el("section",{class:"slot"},el("div",{class:"slothead"},el("b",{text:h+"h"}),el("span",{text:list.length?`${list.length}/${g.members.length} photo${list.length>1?"s":""}`:"en attente"})));
      for(const p of list)sec.append(photoMsg(p,veil));
      if(h===curHour){const miss=g.members.filter(m=>!list.some(p=>p.uid===m)&&m!==S.uid);if(miss.length)sec.append(el("p",{class:"pending",style:"margin-left:0",text:"Pas encore : "+miss.map(pName).join(", ")}));}
      convo.append(sec);
    }
    app.replaceChildren(head,renderScore(g,sl,isToday),panel,nav,convo);

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
    board.append(tabs,ol,el("p",{class:"legend",style:"margin:0 0 6px",text:"Comment gagner des points"}),rules);
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
    unsubAll();S.photos=[];S.reacts=[];S.replies=[];S.picker=null;
    const base=S.db.doc("groups/"+S.current);
    const err=()=>toast("Connexion perdue, nouvelle tentative…");
    S.subs.push(base.collection("photos").where("date","==",S.day).onSnapshot(s=>{S.photos=s.docs.map(d=>({id:d.id,...d.data()})).filter(p=>typeof p.hour==="number");backfill();render();S.scrollBottom=false;},err));
    S.subs.push(base.collection("reactions").where("date","==",S.day).onSnapshot(s=>{S.reacts=s.docs.map(d=>d.data());render();},err));
    S.subs.push(base.collection("replies").where("date","==",S.day).onSnapshot(s=>{S.replies=s.docs.map(d=>({id:d.id,...d.data()}));render();},err));
  }
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
  function openGroup(id){S.daysLoaded=false;S.current=id;S.boardOpen=false;subscribeDays();S.day=todayKey();S.panelOpen=false;S.scrollBottom=true;subscribeDay();render();}
  function setDay(d){S.day=d;S.scrollBottom=true;subscribeDay();render();}
  function closeGroup(){S.current=null;unsubAll();if(S.daySub){S.daySub();S.daySub=null;}render();window.scrollTo(0,0);}

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
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();S.installEvt=e;render();});
  addEventListener("appinstalled",()=>{S.installEvt=null;render();});

  // ---------- boot ----------
  (async()=>{
    const hash=new URLSearchParams(location.hash.slice(1)),code=(hash.get("rejoindre")||"").toUpperCase();
    if(/^[A-Z0-9]{6}$/.test(code)){S.pendingJoin=code;history.replaceState(null,"",location.pathname+location.search);}
    if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY){app.replaceChildren(el("p",{class:"notice",text:"Déclic n’est pas encore relié à sa base de données : il reste à remplir docs/config.js (voir le README)."}));return;}
    let opened;
    try{opened=await openDb(SUPABASE_URL,SUPABASE_ANON_KEY);}
    catch(e){app.replaceChildren(el("p",{class:"notice",text:"Impossible de se connecter à Déclic. Vérifie ta connexion internet."}),el("div",{class:"row",style:"margin-top:12px"},el("button",{class:"btn",onclick:()=>location.reload()},"Réessayer")));return;}
    const {db,uid}=opened;
    S.db=db;S.uid=uid;S.prefillName="";
    db.collection("profiles").limit(1000).onSnapshot(s=>{const m={};s.docs.forEach(d=>m[d.id]=d.data());S.profiles=m;S.profilesLoaded=true;render();},e=>{if(e.code==="unavailable")toast("Connexion perdue, nouvelle tentative…");S.profilesLoaded=true;render();});
    db.collection("groups").where("members","array-contains",uid).onSnapshot(s=>{S.groups=s.docs.map(d=>({id:d.id,...d.data()}));S.groupsLoaded=true;render();},e=>{if(e.code!=="unavailable")toast("Impossible de charger tes groupes.");});
  })();
