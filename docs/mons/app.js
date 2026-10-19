// Mons en fête : l'app du comité des fêtes de Mons.
// Admins : calendrier, planning, publications Insta, échéances, événements et profils des bénévoles.
// Bénévoles (connectés avec le code que leur donne un admin) : calendrier, planning (inscriptions aux créneaux) et présence.
import { openStore } from "./store.js";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayISO = () => iso(new Date());
const S = {
  events: [], tasks: [], posts: [], planning: [], presence: [], profils: [], inscriptions: [],
  ready: false, error: null, open: new Set(), tab: "cal", fmt: "Tous", show: "Tout",
  month: todayISO().slice(0, 7), sel: todayISO(), me: null, admin: false, setup: false, planEv: null, instaPast: false, loginErr: "",
};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const days = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const fr = (s, o) => parse(s).toLocaleDateString("fr-FR", o);
const short = (s) => fr(s, { weekday: "short", day: "numeric", month: "short" });
const long = (s) => fr(s, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const A = (h) => (S.admin ? h : "");
const FORMATS = ["Post", "Reel", "Story", "Carrousel"];
const FCOL = { Post: "var(--c-post)", Reel: "var(--c-reel)", Story: "var(--c-story)", Carrousel: "var(--c-carrousel)" };
const STATUTS = { confirme: "Confirmé", a_definir: "À définir", date_a_confirmer: "Date à confirmer", annule: "Annulé" };
const TILES = ["linear-gradient(150deg,#c0392b,#8e1f1f)", "linear-gradient(150deg,#ff9a3d,#f06a1d)", "linear-gradient(150deg,#b07cf0,#7b4fd6)", "linear-gradient(150deg,#4aa3ff,#2a6fe0)", "linear-gradient(150deg,#e9a10a,#c98200)", "linear-gradient(150deg,#ff7aa8,#d9407a)"];
const AVC = ["#a62a2a", "#f06a1d", "#7b4fd6", "#2a6fe0", "#c98200", "#d9407a", "#1f9d55"];
const sortedEvents = () => [...S.events].sort((a, b) => a.date.localeCompare(b.date));
const tileFor = (e) => TILES[Math.max(0, sortedEvents().findIndex((x) => x.id === e.id)) % TILES.length];
const evById = (id) => S.events.find((e) => e.id === id);
const PANES = ["cal", "plan", "todo", "events", "insta", "team"];
let store = null;

const ICONS = {
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.2c2.9.3 5 2.6 5 5.8"/></svg>',
  insta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8M15 9h3M15 13h3"/></svg>',
  events: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
};
const TABS = () =>
  S.admin
    ? [["cal", "Calendrier"], ["plan", "Planning"], ["insta", "Publications"], ["todo", "À faire"], ["events", "Événements"], ["team", "Profils"]]
    : [["cal", "Calendrier"], ["plan", "Planning"], ["events", "Événements"]];
const locked = () => !S.me;
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";
const uid = () => Math.random().toString(36).slice(2, 7);
const nomOf = (pid) => S.profils.find((p) => p.id === pid)?.nom || "Profil supprimé";

function errMsg(e) {
  const c = e?.code;
  if (c === "network") return "Pas de connexion, réessaie";
  if (c === "denied") return "Seuls les admins peuvent modifier";
  if (c === "full") return "Ce créneau est complet";
  if (c === "setup") return "La base n'est pas installée (supabase/mons.sql)";
  return "Pas enregistré : " + (e?.message || "erreur");
}

/* ---- Connexion ---- */
function renderLogin() {
  const el = $("#p-login");
  if (!locked() || !S.ready) return (el.hidden = true);
  el.hidden = false;
  if (S.setup) {
    el.innerHTML = `<form class="login" id="setup-form"><div class="round light" style="margin:0 auto"><div class="logo"></div></div>
      <h2>Premier lancement</h2><p>Crée ton profil d'admin. Tu pourras ensuite créer ceux des autres admins et des bénévoles.</p>
      <input id="setup-nom" required maxlength="60" placeholder="Prénom et nom" aria-label="Prénom et nom">
      ${S.loginErr ? `<div class="err">${esc(S.loginErr)}</div>` : ""}
      <button class="btn" type="submit">Créer mon profil admin</button>
      <button class="edit" type="button" data-havecode="1">J'ai déjà un code</button></form>`;
    $("#setup-form").onsubmit = async (ev) => {
      ev.preventDefault();
      const nom = $("#setup-nom").value.trim();
      if (!nom) return;
      try {
        const id = slug(nom) + "-" + uid();
        const code = await store.setup(id, nom);
        S.loginErr = "";
        await refreshMe();
        showCode(nom, code, true);
      } catch (e) {
        if (e.code === "already") {
          S.setup = false;
          S.loginErr = "Un admin existe déjà : demande-lui ton code.";
        } else S.loginErr = errMsg(e);
        renderLogin();
      }
    };
    return;
  }
  el.innerHTML = `<form class="login" id="login-form"><div class="round light" style="margin:0 auto"><div class="logo"></div></div>
    <h2>Ton code bénévole</h2><p>Entre le code que le comité t'a donné pour voir le calendrier et t'inscrire aux créneaux.</p>
    <input id="login-code" class="code-input" maxlength="8" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="••••••" aria-label="Code">
    ${S.loginErr ? `<div class="err">${esc(S.loginErr)}</div>` : ""}
    <button class="btn" type="submit" id="login-btn">Entrer</button>
    ${store?.mode === "demo" ? `<div class="hint">Démo : <b>DEMO26</b> (admin) ou <b>BENE26</b> (bénévole)</div>` : ""}</form>`;
  $("#login-form").onsubmit = async (ev) => {
    ev.preventDefault();
    const c = $("#login-code").value;
    if (!c.trim()) return;
    $("#login-btn").disabled = true;
    try {
      const p = await store.login(c);
      S.loginErr = "";
      await refreshMe();
      toast("Bienvenue " + p.nom);
    } catch (e) {
      S.loginErr = e.code === "bad_code" ? "Code inconnu. Vérifie-le avec le comité." : errMsg(e);
      renderLogin();
    }
  };
}
function showCode(nom, code, mine) {
  const f = $("#dlg-form");
  f.innerHTML = `<h2>${mine ? "Ton code" : "Code de " + esc(nom)}</h2>
    <div class="newcode">${esc(code)}</div>
    <p style="margin:0;color:var(--muted);font-size:13.5px">${mine ? "Note-le : il te permet de te reconnecter sur un autre téléphone. Tu le retrouves dans l'onglet Profils." : "Donne-le à " + esc(nom) + " : il ou elle l'entre dans l'app pour se connecter. Tu le retrouves dans l'onglet Profils."}</p>
    <div class="dlg-foot"><div></div><div class="actions">${navigator.share ? `<button type="button" class="btn white" id="f-share">Envoyer</button>` : ""}<button class="btn">OK</button></div></div>`;
  f.onsubmit = null;
  const sh = $("#f-share");
  if (sh)
    sh.onclick = () =>
      navigator.share({ title: "Mons en fête", text: `Ton code pour l'app du comité des fêtes de Mons : ${code}\n${location.origin + location.pathname}` }).catch(() => {});
  $("#dlg").showModal();
}

function renderTabbar() {
  $("#tabbar").innerHTML = TABS().map(([k, l]) => `<button role="tab" id="tab-${k}" aria-selected="${S.tab === k}" data-tab="${k}">${ICONS[k]}<span>${l}</span></button>`).join("");
}

function rel(s) {
  const n = days(todayISO(), s);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  return n > 0 ? `dans ${n} j` : `il y a ${-n} j`;
}
const initials = (n) => (n || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const avColor = (n) => {
  let h = 0;
  for (const c of n || "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVC[h % AVC.length];
};
const personChip = (n) => `<span class="person"><span class="av" style="background:${avColor(n)}">${esc(initials(n))}</span>${esc(n)}</span>`;

function rowHTML(kind, it, showEv = true) {
  const date = kind === "task" ? it.due : it.date;
  const late = !it.done && date < todayISO();
  const ev = evById(it.eventId);
  const label = kind === "task" ? esc(it.label) : esc(it.idea);
  return `<div class="row ${late ? "late" : ""} ${it.done ? "isdone" : ""}">
    <input type="checkbox" class="check" id="cb-${kind}-${esc(it.id)}" data-kind="${kind}" data-id="${esc(it.id)}" ${it.done ? "checked" : ""} aria-label="Marquer comme fait">
    <div class="txt">
      <div class="what">${kind === "post" ? `<span class="chip f-${esc(it.format)}">${esc(it.format)}</span>` : `<span class="chip f-task">Échéance</span>`}${label}</div>
      <div class="meta"><span class="when">${short(date)}</span><span class="rel">${late ? "en retard" : rel(date)}</span>
        ${showEv && ev ? `<span>${esc(ev.title)}</span>` : ""}
        <button class="edit" data-edit="${kind}" data-id="${esc(it.id)}">modifier</button></div>
    </div></div>`;
}

/* ---- Présence ---- */
const myPres = (evId) => S.presence.find((p) => p.profil_id === S.me?.id && p.event_id === evId)?.valeur;
function presSeg(evId) {
  if (!S.me) return "";
  const v = myPres(evId);
  return `<div class="mypres"><small>Ma présence</small><div class="seg">
    <button class="yes" data-pres="oui" data-ev="${esc(evId)}" aria-pressed="${v === "oui"}">Je suis là</button>
    <button class="no" data-pres="non" data-ev="${esc(evId)}" aria-pressed="${v === "non"}">Pas là</button></div></div>`;
}
function presBox(evId) {
  if (!S.admin) return "";
  const rows = S.presence.filter((p) => p.event_id === evId);
  const yes = rows.filter((p) => p.valeur === "oui").map((p) => nomOf(p.profil_id));
  const no = rows.filter((p) => p.valeur === "non").map((p) => nomOf(p.profil_id));
  return `<div class="pres-box"><div><small>Présents</small><b>${yes.length}</b><div class="people">${yes.map(personChip).join("") || '<span style="color:var(--muted);font-size:13px">Personne encore</span>'}</div></div>
    <div><small>Pas là</small><b>${no.length}</b><div class="people">${no.map(personChip).join("") || '<span style="color:var(--muted);font-size:13px">Personne</span>'}</div></div></div>`;
}
async function setPres(evId, val) {
  if (!S.me) return;
  const next = myPres(evId) === val ? null : val;
  try {
    await store.setPresence(S.me.id, evId, next);
    toast(next === "oui" ? "Noté : tu es là" : next === "non" ? "Noté : pas là" : "Réponse retirée");
    await reload();
  } catch (e) {
    toast(errMsg(e));
  }
}
async function toggleInscr(slotId) {
  if (!S.me) return;
  const has = S.inscriptions.some((x) => x.slot_id === slotId && x.profil_id === S.me.id);
  const slot = S.planning.find((x) => x.id === slotId);
  if (!has && slot?.places && S.inscriptions.filter((x) => x.slot_id === slotId).length >= slot.places) return toast("Ce créneau est complet");
  try {
    if (has) {
      await store.desinscrire(slotId, S.me.id);
      toast("Désinscrit");
    } else {
      await store.inscrire(slotId, S.me.id, slot?.eventId || "");
      toast("Inscrit ✓");
    }
    await reload();
  } catch (e) {
    toast(errMsg(e));
  }
}

function renderTop() {
  const t = todayISO();
  const el = $("#count");
  if (!S.me) {
    el.hidden = true;
  } else if (S.admin) {
    el.hidden = false;
    const open = [...S.tasks, ...S.posts].filter((x) => !x.done);
    const late = S.tasks.filter((x) => !x.done && x.due < t).length + S.posts.filter((x) => !x.done && x.date < t).length;
    el.innerHTML = `<i>${late ? "!" : "✓"}</i><span>${esc(S.me.nom)} <span class="admin-tag">admin</span> · ${late ? late + " en retard" : open.length + " à faire"}</span>`;
  } else {
    el.hidden = false;
    el.innerHTML = `<i>★</i><span>${esc(S.me.nom)} · changer</span>`;
  }
  $("#addtop").hidden = !S.admin;
  const foot = $("#foot");
  foot.innerHTML = S.me
    ? `${store?.mode === "demo" ? `Démo : données gardées dans ce navigateur · <button data-resetdemo="1">tout remettre à zéro</button> · ` : ""}<button data-logout="1">Se déconnecter</button>`
    : store?.mode === "demo"
      ? "Démo : données gardées dans ce navigateur"
      : "";
  const up = S.events.filter((e) => (e.endDate || e.date) >= t && e.statut !== "annule").sort((a, b) => a.date.localeCompare(b.date))[0];
  const nx = $("#next");
  if (!up || locked()) return (nx.hidden = true);
  const n = days(t, up.date);
  nx.hidden = false;
  nx.dataset.goto = up.date;
  nx.innerHTML = `<div><small>Prochain événement</small><div class="t">${esc(up.title)}</div><small>${cap(long(up.date))}${up.heure ? " · " + esc(up.heure) : ""}</small></div><div class="big">${n <= 0 ? "Jour J" : "J-" + n}</div>`;
}

function stateMsg() {
  if (S.error) return `<div class="empty">${esc(S.error)}<br><button class="btn small" style="margin-top:12px" data-retry="1">Réessayer</button></div>`;
  if (!S.ready) return `<div class="empty">Chargement…</div>`;
  return null;
}

/* ---- Calendrier ---- */
function itemsOn(d) {
  return {
    ev: S.events.filter((e) => d >= e.date && d <= (e.endDate || e.date)),
    alt: S.events.filter((e) => e.dateAlt === d),
    tk: S.tasks.filter((x) => x.due === d),
    ps: S.posts.filter((x) => x.date === d),
  };
}
function renderCal() {
  const [y, m] = S.month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(y, m - 1, 1 - lead);
  const t = todayISO();
  const lbl = first.toLocaleDateString("fr-FR", { month: "long" });
  const show = S.admin ? S.show : "Événements";
  const showEv = show === "Tout" || show === "Événements",
    showTk = show === "Tout" || show === "Échéances",
    showPs = show === "Tout" || show === "Posts";
  let cells = "";
  const weeks = Math.ceil((lead + new Date(y, m, 0).getDate()) / 7);
  for (let i = 0; i < weeks * 7; i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const d = iso(dt);
    const out = dt.getMonth() !== m - 1;
    const { ev, alt, tk, ps } = S.ready ? itemsOn(d) : { ev: [], alt: [], tk: [], ps: [] };
    const dots = [];
    if (showEv) {
      ev.forEach(() => dots.push(`<span class="dot" style="background:var(--brand)"></span>`));
      alt.forEach(() => dots.push(`<span class="dot" style="box-shadow:inset 0 0 0 1.5px var(--brand)"></span>`));
    }
    if (showPs) ps.forEach((p) => dots.push(`<span class="dot" style="background:${FCOL[p.format] || "var(--brand)"};${p.done ? "opacity:.35" : ""}"></span>`));
    if (showTk) tk.forEach((x) => dots.push(`<span class="dot" style="background:var(--c-task);${x.done ? "opacity:.35" : ""}"></span>`));
    cells += `<button class="day ${out ? "out" : ""} ${d === t ? "today" : ""} ${d === S.sel ? "sel" : ""} ${showEv && ev.length ? "has-ev" : ""}" data-day="${d}" aria-label="${long(d)}">
      <span class="n">${dt.getDate()}</span>
      <span class="dots">${dots.slice(0, 6).join("")}</span></button>`;
  }
  const inMonth = (s) => s && s.slice(0, 7) === S.month;
  const nEv = S.events.filter((e) => inMonth(e.date) || inMonth(e.endDate)).length;
  const nPs = S.posts.filter((p) => inMonth(p.date)).length;
  const nTk = S.tasks.filter((x) => inMonth(x.due)).length;

  const sel = S.sel;
  const it = itemsOn(sel);
  const evCards = [...it.ev.map((e) => [e, false]), ...it.alt.map((e) => [e, true])]
    .map(
      ([e, a]) =>
        `<button class="evcard" data-plan="${esc(e.id)}" style="background:${tileFor(e)}"><b>${esc(e.title)}</b><small>${a ? "Date possible, pas encore tranchée" : (e.heure ? esc(e.heure) + " · " : "") + (esc(e.lieu) || "Lieu à préciser")}${!a && e.prix ? " · " + esc(e.prix) : ""}</small><small style="margin-top:6px;text-decoration:underline">Voir le planning</small></button>${a ? "" : presSeg(e.id)}`,
    )
    .join("");
  const rows = S.admin ? [...it.tk.map((x) => rowHTML("task", x)), ...it.ps.map((x) => rowHTML("post", x))].join("") : "";
  const panel = `<aside class="panel">
    <div class="ph"><small>${sel === t ? "Aujourd'hui" : cap(rel(sel))}</small><b>${cap(fr(sel, { weekday: "long", day: "numeric", month: "long" }))}</b></div>
    ${S.ready && !S.error ? (evCards || rows ? evCards + `<div class="list">${rows}</div>` : `<div class="empty">Rien de prévu ce jour-là.</div>`) : stateMsg()}
    ${A(`<div class="add"><button class="btn small" data-add="post" data-date="${sel}">+ Post</button><button class="btn white small" data-add="task" data-date="${sel}">+ Échéance</button><button class="btn black small" data-add="event" data-date="${sel}">+ Événement</button></div>
    <div class="month-sum"><div><b>${nEv}</b><small>événement${nEv > 1 ? "s" : ""}</small></div><div><b>${nPs}</b><small>post${nPs > 1 ? "s" : ""}</small></div><div><b>${nTk}</b><small>échéance${nTk > 1 ? "s" : ""}</small></div></div>`)}
  </aside>`;

  $("#p-cal").innerHTML = `
    <div class="sec-title"><h2>Calendrier</h2>
      ${A(`<div class="chips">${["Tout", "Événements", "Posts", "Échéances"].map((f) => `<button data-show="${f}" aria-pressed="${S.show === f}">${f}</button>`).join("")}</div>`)}</div>
    <div class="cal-layout">
      <div class="cal-card">
        <div class="cal-nav"><div class="m">${cap(lbl)} <span>${y}</span></div>
          <div class="ctrl"><button class="today-btn" data-month="today">Aujourd'hui</button>
            <button class="round sm" data-month="-1" aria-label="Mois précédent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
            <button class="round sm" data-month="1" aria-label="Mois suivant"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button></div></div>
        <div class="dow">${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((x) => `<div>${x}</div>`).join("")}</div>
        <div class="grid">${cells}</div>
        ${A(`<div class="legend"><span><i class="dot" style="background:var(--brand)"></i>Événement</span>${FORMATS.map((f) => `<span><i class="dot" style="background:${FCOL[f]}"></i>${f}</span>`).join("")}<span><i class="dot" style="background:var(--c-task)"></i>Échéance</span></div>`)}
      </div>
      ${panel}
    </div>`;
}
function shiftMonth(n) {
  const [y, m] = S.month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  S.month = iso(d).slice(0, 7);
  if (S.sel.slice(0, 7) !== S.month) S.sel = S.month === todayISO().slice(0, 7) ? todayISO() : S.month + "-01";
  renderCal();
}

/* ---- Planning événement ---- */
function renderPlan() {
  const head = `<div class="sec-title"><h2>Planning <span class="g">événement</span></h2>${A(`<div class="actions"><button class="btn white small" data-export="1">Exporter Excel</button><button class="btn small" data-add="slot" data-ev="${esc(S.planEv || "")}">+ Créneau</button></div>`)}</div>`;
  const msg = stateMsg();
  if (msg) return ($("#p-plan").innerHTML = head + msg);
  const evs = sortedEvents();
  if (!evs.length) return ($("#p-plan").innerHTML = head + `<div class="empty">Aucun événement.</div>`);
  const t = todayISO();
  if (!S.planEv || !evById(S.planEv)) S.planEv = (evs.find((e) => (e.endDate || e.date) >= t) || evs[0]).id;
  const e = evById(S.planEv);
  const slots = S.planning.filter((p) => p.eventId === e.id).sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99) || String(a.heure).localeCompare(String(b.heure)));
  const pick = `<div class="evpick">${evs.map((x) => `<button data-planev="${esc(x.id)}" aria-pressed="${x.id === e.id}" style="${x.id === e.id ? `background:${tileFor(x)}` : ""}">${esc(x.title)}<small>${short(x.date)}</small></button>`).join("")}</div>`;
  const when = e.endDate ? `Du ${fr(e.date, { weekday: "long", day: "numeric" })} au ${long(e.endDate)}` : cap(long(e.date));
  const peopleOf = (s) => {
    const ins = S.inscriptions.filter((x) => x.slot_id === s.id).map((x) => nomOf(x.profil_id));
    return { ins, ppl: [...new Set([...(s.personnes || "").split(",").map((x) => x.trim()).filter(Boolean), ...ins])] };
  };
  const filled = slots.filter((s) => peopleOf(s).ppl.length).length;
  const list = slots.length
    ? slots
        .map((s) => {
          const { ins, ppl } = peopleOf(s);
          const meIn = S.inscriptions.some((x) => x.slot_id === s.id && x.profil_id === S.me?.id);
          const full = s.places && ins.length >= s.places;
          return `<div class="slot"><div class="h">${esc(s.heure) || "—"}</div><div style="min-width:0">
      <div class="role">${esc(s.role)}</div>${s.notes ? `<div class="nt">${esc(s.notes)}</div>` : ""}
      <div class="people">${ppl.map(personChip).join("") || `<span class="person todo">À pourvoir</span>`}</div>
      <div class="slot-foot">${S.me ? (meIn ? `<button class="btn ok small" data-inscr="${esc(s.id)}">Inscrit ✓ · me retirer</button>` : full ? `<span class="places full">Complet</span>` : `<button class="btn small" data-inscr="${esc(s.id)}">Je m'inscris</button>`) : ""}
        ${s.places ? `<span class="places ${full ? "full" : ""}">${ins.length}/${s.places} place${s.places > 1 ? "s" : ""}</span>` : ""}
        ${A(`<button class="edit" data-edit="slot" data-id="${esc(s.id)}">modifier</button>`)}</div></div></div>`;
        })
        .join("")
    : `<div class="empty">Pas encore de répartition pour cet événement.${S.admin ? " Ajoute un créneau." : ""}</div>`;
  $("#p-plan").innerHTML =
    head +
    pick +
    `
    <div class="plan-head" style="background:${tileFor(e)}"><b>${esc(e.title)}</b><small>${when}${e.heure ? " · " + esc(e.heure) : ""}${e.lieu ? " · " + esc(e.lieu) : ""}</small>
      <small>${slots.length} poste${slots.length > 1 ? "s" : ""} · ${filled} pourvu${filled > 1 ? "s" : ""}</small></div>
    <div class="plan-cols"><div class="list">${list}</div>
      <aside class="panel">${presSeg(e.id)}${presBox(e.id)}
        ${S.admin ? `<p style="margin:0;font-size:12.5px;color:var(--muted)">Seuls les admins voient qui est là ou pas.</p>` : `<p style="margin:0;font-size:12.5px;color:var(--muted)">Ta réponse n'est vue que par les admins du comité.</p>`}</aside></div>`;
}

/* ---- Export Excel (admins) : qui fait quoi, par événement et par bénévole, et les présences ---- */
async function exportExcel() {
  if (!S.admin) return;
  toast("Préparation du fichier…");
  let XLSX;
  try {
    XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  } catch (e) {
    return toast("Pas de connexion, réessaie");
  }
  const evs = sortedEvents();
  const dateFr = (s) => (s ? fr(s, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "");
  const quand = (e) => (e.endDate ? `${dateFr(e.date)} → ${dateFr(e.endDate)}` : dateFr(e.date));
  const slotsOf = (e) => S.planning.filter((p) => p.eventId === e.id).sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99) || String(a.heure).localeCompare(String(b.heure)));
  const attribues = (s) => (s.personnes || "").split(",").map((x) => x.trim()).filter(Boolean);
  const inscrits = (s) => S.inscriptions.filter((x) => x.slot_id === s.id).map((x) => nomOf(x.profil_id));

  const planning = [["Événement", "Date", "Heure", "Poste / mission", "Qui", "Nb de personnes", "Places", "Reste à pourvoir", "Notes"]];
  const parPersonne = [];
  for (const e of evs)
    for (const s of slotsOf(e)) {
      const ppl = [...new Set([...attribues(s), ...inscrits(s)])];
      const reste = s.places ? Math.max(0, s.places - ppl.length) : ppl.length ? "" : "À pourvoir";
      planning.push([e.title, quand(e), s.heure || e.heure || "", s.role || "", ppl.join(", "), ppl.length, s.places || "illimité", reste, s.notes || ""]);
      for (const n of ppl) parPersonne.push([n, e.title, quand(e), s.heure || e.heure || "", s.role || "", attribues(s).includes(n) ? "Attribué par le comité" : "Inscrit dans l'app"]);
    }
  parPersonne.sort((a, b) => a[0].localeCompare(b[0], "fr") || (evs.findIndex((e) => e.title === a[1]) - evs.findIndex((e) => e.title === b[1])));
  parPersonne.unshift(["Bénévole", "Événement", "Date", "Heure", "Poste / mission", "Comment"]);

  const presences = [["Événement", "Date", "Bénévole", "Réponse"]];
  for (const e of evs)
    S.presence
      .filter((p) => p.event_id === e.id)
      .map((p) => [e.title, quand(e), nomOf(p.profil_id), p.valeur === "oui" ? "Là" : "Pas là"])
      .sort((a, b) => a[3].localeCompare(b[3]) || a[2].localeCompare(b[2], "fr"))
      .forEach((r) => presences.push(r));

  const wb = XLSX.utils.book_new();
  const add = (rows, name, widths) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = widths.map((w) => ({ wch: w }));
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, rows.length - 1), c: rows[0].length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  add(planning, "Planning", [24, 30, 8, 34, 34, 10, 9, 14, 40]);
  add(parPersonne, "Par bénévole", [20, 24, 30, 8, 34, 22]);
  add(presences, "Présences", [24, 30, 20, 10]);
  const name = `Planning Mons en fête ${todayISO()}.xlsx`;
  const blob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const file = new File([blob], name, { type: blob.type });
  // Sur iPhone / iPad : la feuille de partage (Enregistrer dans Fichiers, Excel, mail…). Ailleurs : téléchargement.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      return await navigator.share({ files: [file], title: name });
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---- Publications Insta ---- */
function renderInsta() {
  if (!S.admin) return ($("#p-insta").innerHTML = "");
  const head = `<div class="sec-title"><h2>Publications <span class="g">à venir</span></h2><button class="btn small" data-add="post">+ Post</button></div>
    <div class="chips" style="margin-bottom:14px">${["Tous", ...FORMATS].map((f) => `<button data-fmt="${f}" aria-pressed="${S.fmt === f}">${f !== "Tous" ? `<i class="dot" style="background:${FCOL[f]}"></i>` : ""}${f}</button>`).join("")}
    <button data-past="1" aria-pressed="${S.instaPast}">Voir aussi passées</button></div>`;
  const msg = stateMsg();
  if (msg) return ($("#p-insta").innerHTML = head + msg);
  const t = todayISO();
  // Sans « passées » : tout ce qui n'est pas encore fait (y compris en retard).
  const ps = S.posts.filter((p) => (S.fmt === "Tous" || p.format === S.fmt) && (S.instaPast || !p.done)).sort((a, b) => a.date.localeCompare(b.date));
  const nxt = S.posts.filter((p) => !p.done && p.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0];
  const top = nxt
    ? `<div class="next-post"><small>Prochaine publication · ${short(nxt.date)} · ${rel(nxt.date)}</small><b><span class="chip f-${esc(nxt.format)}">${esc(nxt.format)}</span>${esc(nxt.idea)}</b><span style="opacity:.7;font-size:13px">${esc(evById(nxt.eventId)?.title || "")}</span></div>`
    : "";
  if (!ps.length) return ($("#p-insta").innerHTML = head + top + `<div class="empty">Aucune publication à venir${S.fmt !== "Tous" ? " dans ce format" : ""}.</div>`);
  const groups = {};
  ps.forEach((p) => {
    const k = p.date.slice(0, 7);
    (groups[k] = groups[k] || []).push(p);
  });
  $("#p-insta").innerHTML =
    head +
    top +
    Object.entries(groups)
      .map(([k, arr]) => {
        const lbl = fr(k + "-01", { month: "long", year: "numeric" });
        return `<div class="group-h">${lbl} · ${arr.length} publication${arr.length > 1 ? "s" : ""}</div><div class="list">${arr.map((p) => rowHTML("post", p)).join("")}</div>`;
      })
      .join("");
}

/* ---- Profils ---- */
function renderTeam() {
  const el = $("#p-team");
  if (!S.admin) return (el.innerHTML = "");
  const head = `<div class="sec-title"><h2>Profils <span class="g">bénévoles</span></h2><button class="btn small" data-newprof="1">+ Profil</button></div>
    <p style="margin:-4px 0 14px;color:var(--muted);font-size:13.5px">Crée un profil, donne le code à la personne : elle l'entre dans l'app pour voir le calendrier, le planning et s'inscrire aux créneaux. Les admins voient et modifient tout.</p>`;
  const msg = stateMsg();
  if (msg) return (el.innerHTML = head + msg);
  const ps = [...S.profils].sort((a, b) => (b.is_admin - a.is_admin) || a.nom.localeCompare(b.nom, "fr"));
  el.innerHTML =
    head +
    `<div class="team">${ps
      .map((p) => {
        const n = S.inscriptions.filter((x) => x.profil_id === p.id).length;
        const me = p.id === S.me.id;
        return `<div class="member"><span class="av" style="background:${avColor(p.nom)}">${esc(initials(p.nom))}</span><div style="min-width:0"><b>${esc(p.nom)}${me ? ' <span class="admin-tag">toi</span>' : ""}${p.is_admin ? ' <span class="admin-tag">admin</span>' : ""}</b><small>${n} créneau${n > 1 ? "x" : ""} · code</small> <span class="codebox">${esc(p.code || "—")}</span></div>
      <div class="actions" style="justify-content:flex-end;flex-direction:column;align-items:flex-end">${me ? "" : `<button class="edit" data-admin="${esc(p.id)}">${p.is_admin ? "retirer admin" : "rendre admin"}</button><button class="edit" data-delprof="${esc(p.id)}">supprimer</button>`}</div></div>`;
      })
      .join("")}</div>`;
}
function createProfile() {
  const f = $("#dlg-form");
  f.innerHTML = `<h2>Nouveau profil</h2><label>Prénom et nom<input id="f-nom" name="nom" required maxlength="60" placeholder="Maxime"></label>
    <label style="flex-direction:row;align-items:center;gap:10px;color:var(--ink)"><input id="f-isadmin" class="check" type="checkbox"> Admin (voit et modifie tout)</label>
    <p style="margin:0;color:var(--muted);font-size:13.5px">Un code à 6 caractères sera créé. Tu pourras le retrouver ici dans l'onglet Profils.</p>
    <div class="dlg-foot"><div></div><div class="actions"><button type="button" class="btn white" id="f-cancel">Annuler</button><button class="btn">Créer</button></div></div>`;
  const dlg = $("#dlg");
  $("#f-cancel").onclick = () => dlg.close();
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const nom = $("#f-nom").value.trim();
    if (!nom) return;
    try {
      const code = await store.createProfil(slug(nom) + "-" + uid(), nom, $("#f-isadmin").checked);
      dlg.close();
      await reload();
      showCode(nom, code, false);
    } catch (e) {
      toast(errMsg(e));
    }
  };
  dlg.showModal();
}
function deleteProfile(pid) {
  const f = $("#dlg-form");
  const p = S.profils.find((x) => x.id === pid);
  if (!p) return;
  f.innerHTML = `<h2>Supprimer ${esc(p.nom)} ?</h2><p style="margin:0;color:var(--muted)">Son code ne marchera plus, ses inscriptions aux créneaux et ses réponses de présence seront retirées.</p>
    <div class="dlg-foot"><div></div><div class="actions"><button type="button" class="btn white" id="f-cancel">Annuler</button><button class="btn danger">Supprimer</button></div></div>`;
  const dlg = $("#dlg");
  $("#f-cancel").onclick = () => dlg.close();
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      await store.deleteProfil(pid);
      dlg.close();
      toast("Profil supprimé");
      await reload();
    } catch (e) {
      toast(errMsg(e));
    }
  };
  dlg.showModal();
}
async function toggleAdmin(pid) {
  const p = S.profils.find((x) => x.id === pid);
  if (!p) return;
  try {
    await store.updateProfil(pid, { is_admin: !p.is_admin });
    toast(p.is_admin ? p.nom + " n'est plus admin" : p.nom + " est admin");
    await reload();
  } catch (e) {
    toast(errMsg(e));
  }
}

/* ---- À faire ---- */
function renderTodo() {
  if (!S.admin) return ($("#p-todo").innerHTML = "");
  const head = `<div class="sec-title"><h2>À faire</h2><div class="actions"><button class="btn white small" data-add="task">+ Échéance</button><button class="btn small" data-add="post">+ Post</button></div></div>`;
  const msg = stateMsg();
  if (msg) return ($("#p-todo").innerHTML = head + msg);
  const t = todayISO();
  const items = [...S.tasks.map((x) => ({ k: "task", x, d: x.due })), ...S.posts.map((x) => ({ k: "post", x, d: x.date }))].filter((i) => !i.x.done);
  const by = (a, b) => a.d.localeCompare(b.d);
  const late = items.filter((i) => i.d < t).sort(by);
  const soon = items.filter((i) => i.d >= t && days(t, i.d) <= 14).sort(by);
  const later = items.filter((i) => days(t, i.d) > 14 && days(t, i.d) <= 45).sort(by);
  const block = (h, arr) => (arr.length ? `<div class="group-h">${h} · ${arr.length}</div><div class="list">${arr.map((i) => rowHTML(i.k, i.x)).join("")}</div>` : "");
  const html = block("En retard", late) + block("Les 2 prochaines semaines", soon) + block("Ensuite, jusqu'à 45 jours", later);
  $("#p-todo").innerHTML = head + (html || `<div class="empty">Rien à faire dans les 45 prochains jours. Profites-en !</div>`);
}

/* ---- Événements ---- */
function renderEvents() {
  const head = `<div class="sec-title"><h2>Événements</h2>${A(`<button class="btn small" data-add="event">+ Événement</button>`)}</div>`;
  const msg = stateMsg();
  if (msg) return ($("#p-events").innerHTML = head + msg);
  const t = todayISO();
  const evs = sortedEvents();
  if (!evs.length) return ($("#p-events").innerHTML = head + `<div class="empty">Aucun événement pour l'instant.</div>`);
  $("#p-events").innerHTML =
    head +
    evs
      .map((e) => {
        const past = (e.endDate || e.date) < t;
        const tk = S.tasks.filter((x) => x.eventId === e.id).sort((a, b) => a.due.localeCompare(b.due));
        const ps = S.posts.filter((x) => x.eventId === e.id).sort((a, b) => a.date.localeCompare(b.date));
        const all = [...tk, ...ps];
        const done = all.filter((x) => x.done).length;
        const lateN = tk.filter((x) => !x.done && x.due < t).length + ps.filter((x) => !x.done && x.date < t).length;
        const open = S.open.has(e.id);
        const when = e.endDate ? `Du ${fr(e.date, { weekday: "long", day: "numeric" })} au ${long(e.endDate)}` : cap(long(e.date));
        const mine = myPres(e.id);
        return `<article class="ev ${past ? "past" : ""}" id="ev-${esc(e.id)}">
      <button class="ev-head" data-toggle="${esc(e.id)}" aria-expanded="${open}">
        <div class="tile" style="background:${tileFor(e)}"><div class="m">${fr(e.date, { month: "short" })}</div><div class="d">${parse(e.date).getDate()}${e.endDate ? "–" + parse(e.endDate).getDate() : ""}</div><div class="y">${parse(e.date).getFullYear()}</div></div>
        <div style="min-width:0"><h3>${esc(e.title)}</h3>
          <div class="ev-sub">${when}${e.heure ? " · " + esc(e.heure) : ""}${e.dateAlt ? ` · ou ${long(e.dateAlt)}` : ""}</div>
          <div class="badges">
            <span class="badge ${(e.statut || "confirme") === "confirme" ? "ok" : e.statut === "annule" ? "late" : ""}">${STATUTS[e.statut] || "Confirmé"}</span>
            ${A(`<span class="badge ${e.affiche ? "ok" : ""}">${e.affiche ? "Affiche reçue" : "Affiche à venir"}</span>`)}
            ${past ? `<span class="badge">Passé</span>` : `<span class="badge">${rel(e.date)}</span>`}
            ${mine ? `<span class="badge ${mine === "oui" ? "ok" : "late"}">${mine === "oui" ? "Je suis là" : "Pas là"}</span>` : ""}
            ${S.admin && lateN ? `<span class="badge late">${lateN} en retard</span>` : ""}
          </div>
          ${A(`<div class="progress" title="${done} sur ${all.length} fait"><span style="width:${all.length ? Math.round((done / all.length) * 100) : 0}%"></span></div>`)}
        </div>
      </button>
      <div class="ev-body" ${open ? "" : "hidden"}>
        <dl class="facts">
          <div><dt>Lieu</dt><dd>${esc(e.lieu) || "À préciser"}</dd></div>
          <div><dt>Prix</dt><dd>${esc(e.prix) || "À préciser"}</dd></div>
          ${A(`<div><dt>Avancement</dt><dd>${done} / ${all.length}</dd></div>`)}
          ${e.details ? `<div style="grid-column:1/-1"><dt>Infos</dt><dd>${esc(e.details)}</dd></div>` : ""}
        </dl>
        ${presSeg(e.id)}
        <div class="actions">${A(`<button class="btn black small" data-edit="event" data-id="${esc(e.id)}">Modifier l'événement</button>`)}<button class="btn white small" data-plan="${esc(e.id)}">Planning</button><button class="btn white small" data-goto="${e.date}">Calendrier</button></div>
        ${A(`<div class="subh"><h4>Échéances</h4><button class="btn white small" data-add="task" data-ev="${esc(e.id)}">+ Échéance</button></div>
        <div class="list">${tk.map((x) => rowHTML("task", x, false)).join("") || `<div class="empty">Aucune échéance.</div>`}</div>
        <div class="subh"><h4>Posts Insta</h4><button class="btn white small" data-add="post" data-ev="${esc(e.id)}">+ Post</button></div>
        <div class="list">${ps.map((x) => rowHTML("post", x, false)).join("") || `<div class="empty">Aucun post prévu.</div>`}</div>`)}
      </div></article>`;
      })
      .join("");
}

function render() {
  renderTabbar();
  renderTop();
  renderLogin();
  const lock = locked();
  $("#tabbar").hidden = lock;
  if (lock) {
    PANES.forEach((x) => ($("#p-" + x).hidden = true));
    if (!S.ready) {
      $("#p-cal").hidden = false;
      $("#p-cal").innerHTML = stateMsg() || "";
    }
    return;
  }
  renderCal();
  renderPlan();
  renderInsta();
  renderTodo();
  renderEvents();
  renderTeam();
  setTab(S.want || S.tab, true);
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (t.hidden = true), 2400);
}

function setTab(tab, quiet) {
  const ok = TABS().map((x) => x[0]);
  if (!ok.includes(tab)) tab = "cal";
  S.tab = tab;
  document.querySelectorAll(".tabbar button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
  PANES.forEach((x) => ($("#p-" + x).hidden = x !== tab));
  if (!quiet) {
    S.want = tab;
    try {
      localStorage.setItem("mons-tab", tab);
    } catch (e) {}
  }
}
function gotoDay(d) {
  S.sel = d;
  S.month = d.slice(0, 7);
  setTab("cal");
  renderCal();
  $("#p-cal").scrollIntoView({ behavior: "smooth", block: "start" });
}

function evOptions(sel, date) {
  let pick = sel;
  if (!pick && date) pick = sortedEvents().find((e) => (e.endDate || e.date) >= date)?.id;
  return sortedEvents().map((e) => `<option value="${esc(e.id)}" ${e.id === pick ? "selected" : ""}>${esc(e.title)} (${short(e.date)})</option>`).join("");
}

function openDialog(kind, id, evId, date) {
  const coll = { event: "events", task: "tasks", post: "posts", slot: "planning" }[kind];
  const it = id ? S[coll].find((x) => x.id === id) : null;
  const f = $("#dlg-form");
  const v = (k) => esc(it?.[k] ?? "");
  const dflt = date || todayISO();
  let body = "";
  if (kind === "event")
    body = `
    <h2>${it ? "Modifier l'événement" : "Nouvel événement"}</h2>
    <label>Nom<input id="f-title" name="title" required maxlength="100" value="${v("title")}"></label>
    <div class="two"><label>Date<input id="f-date" type="date" name="date" required value="${v("date") || date || ""}"></label>
    <label>Date de fin (si plusieurs jours)<input id="f-endDate" type="date" name="endDate" value="${v("endDate")}"></label></div>
    <div class="two"><label>Heure<input id="f-heure" name="heure" placeholder="20h00" value="${v("heure")}"></label>
    <label>Prix<input id="f-prix" name="prix" placeholder="10 €" value="${v("prix")}"></label></div>
    <label>Lieu<input id="f-lieu" name="lieu" value="${v("lieu")}"></label>
    <div class="two"><label>Statut<select id="f-statut" name="statut">${Object.entries(STATUTS).map(([k, l]) => `<option value="${k}" ${(it?.statut || "confirme") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label>Autre date possible<input id="f-dateAlt" type="date" name="dateAlt" value="${v("dateAlt")}"></label></div>
    <label style="flex-direction:row;align-items:center;gap:10px;color:var(--ink)"><input id="f-affiche" class="check" type="checkbox" name="affiche" ${it?.affiche ? "checked" : ""}> Affiche reçue</label>
    <label>Infos<textarea id="f-details" name="details">${v("details")}</textarea></label>`;
  else if (kind === "task")
    body = `
    <h2>${it ? "Modifier l'échéance" : "Nouvelle échéance"}</h2>
    <label>Événement<select id="f-eventId" name="eventId">${evOptions(it?.eventId || evId, date)}</select></label>
    <label>À faire<input id="f-label" name="label" required maxlength="200" value="${v("label")}"></label>
    <label>Pour le<input id="f-due" type="date" name="due" required value="${v("due") || dflt}"></label>`;
  else if (kind === "post")
    body = `
    <h2>${it ? "Modifier la publication" : "Nouvelle publication Insta"}</h2>
    <label>Événement<select id="f-eventId" name="eventId">${evOptions(it?.eventId || evId, date)}</select></label>
    <div class="two"><label>Date de publication<input id="f-date" type="date" name="date" required value="${v("date") || dflt}"></label>
    <label>Format<select id="f-format" name="format">${FORMATS.map((x) => `<option ${(it?.format || "Post") === x ? "selected" : ""}>${x}</option>`).join("")}</select></label></div>
    <label>Idée du post<textarea id="f-idea" name="idea" required>${v("idea")}</textarea></label>`;
  else
    body = `
    <h2>${it ? "Modifier le créneau" : "Nouveau créneau"}</h2>
    <label>Événement<select id="f-eventId" name="eventId">${evOptions(it?.eventId || evId || S.planEv)}</select></label>
    <div class="two"><label>Heure<input id="f-heure" name="heure" placeholder="14h00" value="${v("heure")}"></label>
    <label>Ordre d'affichage<input id="f-ordre" name="ordre" type="number" min="1" value="${it?.ordre && it.ordre !== 99 ? v("ordre") : ""}"></label></div>
    <label>Poste / mission<input id="f-role" name="role" required maxlength="100" placeholder="Buvette, entrée, installation…" value="${v("role")}"></label>
    <label>Nombre de places (vide = illimité)<input id="f-places" name="places" type="number" min="1" value="${v("places")}"></label>
    <label>Déjà attribué à (prénoms séparés par des virgules)<input id="f-personnes" name="personnes" placeholder="Zoé, Maxime" value="${v("personnes")}"></label>
    <label>Notes<textarea id="f-notes" name="notes">${v("notes")}</textarea></label>`;
  f.innerHTML =
    body +
    `<div id="f-confirm" hidden class="confirm">Supprimer définitivement ?${kind === "event" ? " Ses créneaux, échéances et posts partent avec." : ""} <button type="button" class="btn danger small" id="f-yes">Oui, supprimer</button></div>
    <div class="dlg-foot"><div>${it ? `<button type="button" class="btn white small" id="f-del">Supprimer</button>` : ""}</div>
    <div class="actions"><button type="button" class="btn white" id="f-cancel">Annuler</button><button class="btn" id="f-save">Enregistrer</button></div></div>`;
  const dlg = $("#dlg");
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const fd = new FormData(f);
    const data = {};
    for (const [k, val] of fd.entries()) data[k] = typeof val === "string" ? val.trim() : val;
    if (kind === "event") {
      data.affiche = !!fd.get("affiche");
      if (data.endDate && data.endDate <= data.date) data.endDate = "";
    }
    if (kind === "slot") {
      data.ordre = data.ordre ? Number(data.ordre) : 99;
      data.places = data.places ? Number(data.places) : null;
    }
    const newId = it ? it.id : kind === "event" ? slug(data.title) + "-" + (data.date || "").slice(0, 4) + "-" + uid() : (data.eventId || "x") + "--" + uid();
    const doc = { ...(it || {}), ...data };
    delete doc.id;
    if (kind === "event") {
      if (!data.endDate) delete doc.endDate;
      if (!data.dateAlt) delete doc.dateAlt;
    }
    if ((kind === "task" || kind === "post") && doc.done === undefined) doc.done = false;
    $("#f-save").disabled = true;
    try {
      await store.saveDoc(coll, newId, doc);
      dlg.close();
      toast("Enregistré");
      if (kind === "event") S.open.add(newId);
      if (kind === "slot") S.planEv = data.eventId;
      await reload();
    } catch (e) {
      $("#f-save").disabled = false;
      toast(errMsg(e));
    }
  };
  $("#f-cancel").onclick = () => dlg.close();
  const del = $("#f-del");
  if (del) del.onclick = () => ($("#f-confirm").hidden = false);
  const yes = $("#f-yes");
  if (yes)
    yes.onclick = async () => {
      try {
        await store.removeDoc(coll, it.id);
        dlg.close();
        toast("Supprimé");
        await reload();
      } catch (e) {
        toast(errMsg(e));
      }
    };
  dlg.showModal();
}

function confirmLogout() {
  const f = $("#dlg-form");
  f.innerHTML = `<h2>Se déconnecter ?</h2><p style="margin:0;color:var(--muted)">Sur ce téléphone, il faudra entrer à nouveau ton code${S.admin ? " (tu le retrouves dans l'onglet Profils)" : ""}.</p>
    <div class="dlg-foot"><div></div><div class="actions"><button type="button" class="btn white" id="f-cancel">Annuler</button><button class="btn black">Se déconnecter</button></div></div>`;
  const dlg = $("#dlg");
  $("#f-cancel").onclick = () => dlg.close();
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      await store.logout();
      dlg.close();
      await refreshMe();
    } catch (e) {
      toast(errMsg(e));
    }
  };
  dlg.showModal();
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.tab) return setTab(b.dataset.tab);
  if (b.dataset.day) {
    S.sel = b.dataset.day;
    if (S.sel.slice(0, 7) !== S.month) S.month = S.sel.slice(0, 7);
    return renderCal();
  }
  if (b.dataset.month) {
    if (b.dataset.month === "today") {
      S.month = todayISO().slice(0, 7);
      S.sel = todayISO();
      return renderCal();
    }
    return shiftMonth(+b.dataset.month);
  }
  if (b.dataset.show) {
    S.show = b.dataset.show;
    return renderCal();
  }
  if (b.dataset.goto) return gotoDay(b.dataset.goto);
  if (b.dataset.retry) return start();
  if (b.dataset.havecode) {
    S.setup = false;
    S.loginErr = "";
    return renderLogin();
  }
  if (b.dataset.export) return exportExcel();
  if (b.dataset.logout) return confirmLogout();
  if (b.dataset.resetdemo) {
    store.reset?.();
    return refreshMe();
  }
  if (b.dataset.pres) return setPres(b.dataset.ev, b.dataset.pres);
  if (b.dataset.inscr) return toggleInscr(b.dataset.inscr);
  if (b.dataset.who) {
    if (S.admin) return setTab("team");
    return confirmLogout();
  }
  if (b.dataset.newprof) return S.admin ? createProfile() : null;
  if (b.dataset.delprof) return S.admin ? deleteProfile(b.dataset.delprof) : null;
  if (b.dataset.admin) return S.admin ? toggleAdmin(b.dataset.admin) : null;
  if (b.dataset.plan) {
    S.planEv = b.dataset.plan;
    setTab("plan");
    renderPlan();
    $("#p-plan").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (b.dataset.planev) {
    S.planEv = b.dataset.planev;
    return renderPlan();
  }
  if (b.dataset.past) {
    S.instaPast = !S.instaPast;
    return renderInsta();
  }
  if (b.dataset.fmt) {
    S.fmt = b.dataset.fmt;
    return renderInsta();
  }
  if (b.dataset.toggle) {
    const id = b.dataset.toggle;
    S.open.has(id) ? S.open.delete(id) : S.open.add(id);
    return renderEvents();
  }
  if ((b.dataset.add || b.dataset.edit) && !S.admin) return toast("Seuls les admins peuvent modifier");
  if (b.dataset.add) {
    if (b.dataset.add !== "event" && !S.events.length) return toast("Ajoute d'abord un événement");
    return openDialog(b.dataset.add, null, b.dataset.ev, b.dataset.date);
  }
  if (b.dataset.edit) return openDialog(b.dataset.edit, b.dataset.id);
});
document.addEventListener("change", async (e) => {
  const cb = e.target;
  if (!cb.matches("input[type=checkbox][data-kind]")) return;
  if (!S.admin) {
    cb.checked = !cb.checked;
    return toast("Seuls les admins peuvent modifier");
  }
  const coll = cb.dataset.kind === "task" ? "tasks" : "posts";
  const it = S[coll].find((x) => x.id === cb.dataset.id);
  if (!it) return;
  const { id, ...doc } = it;
  try {
    await store.saveDoc(coll, id, { ...doc, done: cb.checked });
    if (cb.checked) toast("Fait ✓");
    await reload();
  } catch (err) {
    cb.checked = !cb.checked;
    toast(errMsg(err));
  }
});

/* ---- Chargement ---- */
let unsub = null;
let reloadTimer = null;
async function reload() {
  if (!store || !S.me) return;
  try {
    const d = await store.loadAll(S.admin);
    Object.assign(S, d);
    S.error = null;
    S.ready = true;
  } catch (e) {
    if (e.code === "network" && S.ready) $("#offline").hidden = false;
    else S.error = e.code === "setup" ? "La base n'est pas encore installée : lance supabase/mons.sql dans Supabase." : "Impossible de charger les données. Vérifie ta connexion.";
  }
  render();
}
function reloadSoon() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(reload, 250);
}
async function refreshMe() {
  S.me = await store.whoami();
  S.admin = !!S.me?.is_admin;
  S.setup = S.me ? false : await store.needsSetup();
  if (!S.me) {
    Object.assign(S, { events: [], tasks: [], posts: [], planning: [], presence: [], profils: [], inscriptions: [] });
    S.ready = true;
    return render();
  }
  await reload();
}
async function start() {
  S.error = null;
  S.ready = false;
  render();
  try {
    store = store || (await openStore());
    await refreshMe();
    if (!unsub) unsub = store.subscribe(reloadSoon);
  } catch (e) {
    S.ready = false;
    S.error = e.code === "setup" ? "La base n'est pas encore installée : lance supabase/mons.sql dans Supabase." : "Impossible de se connecter. Vérifie ta connexion.";
    renderStartError();
  }
}
function renderStartError() {
  PANES.forEach((x) => ($("#p-" + x).hidden = true));
  $("#p-login").hidden = true;
  $("#tabbar").hidden = true;
  $("#p-cal").hidden = false;
  $("#p-cal").innerHTML = stateMsg();
}

window.addEventListener("online", () => {
  $("#offline").hidden = true;
  reload();
});
window.addEventListener("offline", () => ($("#offline").hidden = false));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") reloadSoon();
});

try {
  const t = localStorage.getItem("mons-tab");
  if (t) S.want = t;
} catch (e) {}
start();

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
