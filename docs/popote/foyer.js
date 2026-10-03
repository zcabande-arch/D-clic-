// Popote à plusieurs : profils, foyer partagé, synchronisation en direct, et recettes ajoutées en photo.
// Les foyers et les profils sont ceux de Take Out (supabase/courses.sql) : un foyer Popote est aussi une liste Take Out.
// Sans foyer ou sans réseau, Popote marche seul dans ce navigateur, comme avant.
// Ce module s'appuie sur app.js (st, save, renderAll, applyShared, setCustomRecipes…), chargé avant lui.
import { SUPABASE_URL, SUPABASE_ANON_KEY, NOTIFY_URL, RECETTE_URL } from "../config.js";

const FOYER_KEY = "popote-foyer"; // code du foyer utilisé sur ce téléphone
const SOLO_KEY = "popote-solo"; // le semainier d'avant le foyer, rendu si on le quitte
const DIRTY_KEY = "popote-dirty"; // des changements faits hors ligne restent à envoyer
const ME_KEY = "popote-moi"; // prénom et emoji, pour l'affichage sans réseau
const EMOJIS = ["🙂", "😋", "🧑‍🍳", "🐻", "🦊", "🐱", "🌻", "🍓", "🥑", "🌶️"];
const CID = Math.random().toString(36).slice(2, 10); // cet onglet, pour ignorer l'écho de ses propres envois
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lsGet = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch (e) {
    return d;
  }
};
const lsSet = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};

let sb = null;
let uid = null;
let connecting = null;
let me = lsGet(ME_KEY, { name: "", emoji: "🙂" });
let pick = me.emoji; // emoji choisi dans le formulaire, pas encore enregistré
let hid = lsGet(FOYER_KEY, "");
let foyer = null;
let members = [];
let households = [];
let channel = null;
let dirty = lsGet(DIRTY_KEY, "") === hid && !!hid;
let pushTimer = null;
let recipesTimer = null;
let live = false;
let draft = null; // recette lue sur une photo, en attente de validation

// ---------- erreurs ----------

function fail(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}
function mapError(err) {
  if (!err) return fail("internal");
  if (err.code && /^(network|setup|denied|limit|auth)$/.test(err.code)) return err;
  const m = err.message || "";
  if (!navigator.onLine || /fetch|network|load failed|timed? ?out/i.test(m)) return fail("network", m);
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "PGRST202" || /does not exist|could not find/i.test(m)) return fail("setup", m);
  if (err.code === "42501" || /row-level security|not a member/i.test(m)) return fail("denied", m);
  return fail(err.code || "internal", m);
}
const must = ({ data, error }) => {
  if (error) throw mapError(error);
  return data;
};
function errText(e) {
  switch (e && e.code) {
    case "network":
      return "Pas de réseau pour l'instant. Réessaie dès que tu es connecté.";
    case "setup":
      return "Le partage n'est pas encore installé sur le serveur (supabase/popote.sql, voir le README).";
    case "denied":
      return "Tu ne fais plus partie de ce foyer.";
    default:
      return "Ça n'a pas marché. Réessaie dans un instant.";
  }
}

// ---------- connexion ----------

function connect() {
  if (sb) return Promise.resolve();
  if (!connecting)
    connecting = (async () => {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm");
      // Même projet et même adresse que Déclic et Take Out : le compte est commun aux trois applications.
      const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      let session = (await c.auth.getSession()).data.session;
      if (!session) {
        const r = await c.auth.signInAnonymously();
        if (r.error) throw mapError(r.error);
        session = r.data.session;
      }
      sb = c;
      uid = session.user.id;
      const p = await sb.from("courses_profiles").select("name,emoji").eq("uid", uid).maybeSingle();
      if (p.data) setMe(p.data);
      await loadHouseholds().catch(() => {});
    })().catch((e) => {
      connecting = null;
      throw mapError(e);
    });
  return connecting;
}
function setMe(p) {
  me = { name: p.name || "", emoji: p.emoji || "🙂" };
  pick = me.emoji;
  lsSet(ME_KEY, me);
  header();
}
async function loadHouseholds() {
  const rows = must(await sb.from("courses_members").select("household,courses_households(id,name,kind)").eq("uid", uid));
  households = rows.map((r) => r.courses_households).filter(Boolean);
}
async function saveProfile(name, emoji) {
  must(await sb.from("courses_profiles").upsert({ uid, name, emoji, updated_at: new Date().toISOString() }));
  setMe({ name, emoji });
}

// ---------- foyer et synchronisation ----------

async function useFoyer(code, { fresh = false } = {}) {
  if (!hid) lsSet(SOLO_KEY, sharedState()); // le semainier perso, rendu si on quitte le foyer
  stopLive();
  hid = code;
  lsSet(FOYER_KEY, hid);
  dirty = false;
  lsSet(DIRTY_KEY, null);
  // Les recettes ajoutées seul sont apportées au foyer.
  const mine = customRecipes();
  if (mine.length)
    must(
      await sb
        .from("popote_recipes")
        .upsert(mine.map((r) => ({ id: r.id, household: hid, data: r, created_by: uid })), { onConflict: "id", ignoreDuplicates: true }),
    );
  if (fresh) await push(true);
  await startFoyer();
}
async function startFoyer() {
  await Promise.all([loadFoyer(), loadMembers(), loadRecipes()]);
  await pull();
  goLive();
  header();
}
async function loadFoyer() {
  const r = await sb.from("courses_households").select("id,name,kind").eq("id", hid).maybeSingle();
  if (r.error) throw mapError(r.error);
  if (!r.data) throw fail("denied");
  foyer = r.data;
}
async function loadMembers() {
  const rows = must(await sb.from("courses_members").select("uid,joined_at").eq("household", hid).order("joined_at"));
  const ids = rows.map((r) => r.uid);
  const ps = ids.length ? must(await sb.from("courses_profiles").select("uid,name,emoji").in("uid", ids)) : [];
  const by = Object.fromEntries(ps.map((p) => [p.uid, p]));
  members = rows.map((r) => ({ uid: r.uid, name: by[r.uid]?.name || "Quelqu'un", emoji: by[r.uid]?.emoji || "🙂" }));
  header();
}
async function loadRecipes() {
  const rows = must(await sb.from("popote_recipes").select("id,data").eq("household", hid).order("created_at"));
  setCustomRecipes(rows.map((r) => ({ ...r.data, id: r.id })));
  quietly(() => {
    fixState();
    renderAll();
  });
}
// Rendu sans renvoyer l'état au foyer (ce n'est pas un changement fait ici).
function quietly(fn) {
  window.popoteApplying = true;
  try {
    fn();
  } finally {
    window.popoteApplying = false;
  }
}
async function pull() {
  const r = await sb.from("popote_state").select("data").eq("household", hid).maybeSingle();
  if (r.error) throw mapError(r.error);
  if (!r.data || dirty) return push(true); // premier téléphone du foyer, ou changements faits hors ligne
  await applyRemote(r.data.data);
}
async function applyRemote(data) {
  // Un plat prévu avec une recette qu'on n'a pas encore reçue : on recharge d'abord les recettes.
  const ids = new Set();
  for (const k in data.byDate || {}) for (const m in data.byDate[k]) ids.add(data.byDate[k][m].r);
  (data.plan || []).forEach((x) => x && x.r && ids.add(x.r));
  if ([...ids].some((id) => id && !RBYID[id])) await loadRecipes().catch(() => {});
  applyShared(data);
}
async function push(now) {
  clearTimeout(pushTimer);
  if (!now) {
    pushTimer = setTimeout(() => push(true).catch(() => {}), 600);
    return;
  }
  if (!sb || !hid) return;
  const row = { household: hid, data: sharedState(), client: CID, updated_by: uid, updated_at: new Date().toISOString() };
  try {
    must(await sb.from("popote_state").upsert(row));
    dirty = false;
    lsSet(DIRTY_KEY, null);
  } catch (e) {
    if (e.code === "denied") return forget();
    throw e;
  } finally {
    header();
  }
}
// Appelé par save() dans app.js à chaque changement.
window.popoteSync = () => {
  if (!hid || window.popoteApplying) return;
  dirty = true;
  lsSet(DIRTY_KEY, hid);
  header();
  if (sb) push(false);
};

function goLive() {
  stopLive();
  const code = hid;
  channel = sb
    .channel("popote:" + code)
    .on("postgres_changes", { event: "*", schema: "public", table: "popote_state", filter: `household=eq.${code}` }, (p) => {
      if (code !== hid || !p.new || !p.new.data || p.new.client === CID || dirty) return;
      applyRemote(p.new.data);
      if (dlg.open && document.getElementById("fyLive")) openFoyer();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "popote_recipes" }, () => {
      clearTimeout(recipesTimer);
      recipesTimer = setTimeout(() => loadRecipes().catch(() => {}), 300);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "courses_members", filter: `household=eq.${code}` }, () => loadMembers().catch(() => {}))
    .on("postgres_changes", { event: "*", schema: "public", table: "courses_profiles" }, () => loadMembers().catch(() => {}))
    .subscribe((status) => {
      live = status === "SUBSCRIBED";
      header();
    });
}
function stopLive() {
  if (channel && sb) sb.removeChannel(channel);
  channel = null;
  live = false;
}
// Ce foyer n'est plus accessible (on l'a quitté ailleurs) : retour au semainier perso.
function forget() {
  stopLive();
  hid = "";
  foyer = null;
  members = [];
  dirty = false;
  lsSet(FOYER_KEY, null);
  lsSet(DIRTY_KEY, null);
  const solo = lsGet(SOLO_KEY, null);
  if (solo) applyShared(solo);
  lsSet(SOLO_KEY, null);
  header();
}
// Au retour du réseau ou de l'app au premier plan : on envoie ce qui attend et on se remet à jour.
function resync() {
  if (!hid || !navigator.onLine) return;
  connect()
    .then(() => (foyer ? pull().then(() => !channel && goLive()) : startFoyer()))
    .catch((e) => e.code === "denied" && forget());
}
window.addEventListener("online", resync);
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && resync());

// ---------- en-tête ----------

function header() {
  window.popoteName = me.name || "";
  const b = document.getElementById("foyerBtn");
  if (b) {
    b.textContent = hid ? me.emoji || "🙂" : "👥";
    b.setAttribute("aria-label", hid ? "Notre foyer" : "Cuisiner à plusieurs");
  }
  const t = document.getElementById("title");
  if (t) t.textContent = hid ? "Notre semaine" : "Ta semaine";
  const w = document.getElementById("with");
  if (w) {
    const others = members.filter((m) => m.uid !== uid);
    w.textContent = !hid ? "" : (others.length ? "Avec " + others.map((m) => m.name).join(", ") : "Invite quelqu'un à te rejoindre") + (dirty ? " · en attente de réseau" : "");
  }
  const h = document.getElementById("hello");
  const hr = new Date().getHours();
  if (h) h.textContent = (hr < 5 || hr >= 18 ? "Bonsoir" : "Bonjour") + (me.name ? " " + me.name : "") + " 👋";
  const s = document.getElementById("fyLive");
  if (s) s.textContent = dirty ? "⏳ Des changements attendent le réseau" : live ? "🟢 Synchronisé en direct" : "⚪ Connexion…";
}

// ---------- fenêtre « Cuisiner à plusieurs » ----------

const close = '<button class="close" data-close aria-label="Fermer">✕</button>';
const emojiChips = () =>
  EMOJIS.map((e) => `<button class="chip emo" data-fy="emoji" data-arg="${e}" aria-pressed="${e === pick}" aria-label="Choisir ${e}">${e}</button>`).join("");
const profileFields = () => `<label class="f" for="fyName">Ton prénom</label>
  <input class="field" id="fyName" maxlength="30" autocomplete="given-name" value="${esc(me.name)}" placeholder="ex : Léa">
  <div class="chips" style="margin-top:10px">${emojiChips()}</div>`;
function show(html) {
  $("#dlgBody").innerHTML = html;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
function setErr(msg) {
  const el = document.getElementById("fyErr");
  if (el) el.textContent = msg || "";
}
function busy(btn, on, label) {
  if (!btn) return;
  if (on) {
    btn.dataset.label = btn.textContent;
    btn.textContent = label || "Un instant…";
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.label || btn.textContent;
    btn.disabled = false;
  }
}

async function openFoyer(opts = {}) {
  if (!sb) {
    show(`<div class="hd plain" style="margin:0"><div><h2>Cuisiner à plusieurs</h2></div>${close}</div><p class="hint" style="margin:18px 6px">Connexion…</p>`);
    try {
      await connect();
      if (hid && !foyer) await startFoyer();
    } catch (e) {
      if (e.code === "denied") forget();
      else
        return show(
          `<div class="hd plain" style="margin:0"><div><h2>Cuisiner à plusieurs</h2></div>${close}</div><p class="hint bad" style="margin:18px 6px">${esc(errText(e))}</p>`,
        );
    }
  }
  if (hid && foyer) return viewFoyer();
  viewStart(opts.code || "");
}

function viewStart(code) {
  const others = households.filter((h) => h.id !== hid);
  show(`<div class="hd plain" style="margin:0"><div><h2>Cuisiner à plusieurs</h2>
      <div style="color:var(--soft)">Partage Popote avec ta moitié, ta coloc ou ta famille : les mêmes repas, la même liste de courses et vos recettes, en direct sur chaque téléphone.</div></div>${close}</div>
    <div class="section">${profileFields()}</div>
    ${
      code
        ? `<button class="go" data-fy="join" data-arg="${esc(code)}" style="margin-top:20px">Rejoindre la Popote (code ${esc(code)})</button>`
        : `<button class="go" data-fy="create" style="margin-top:20px">Créer notre Popote</button>
    <h3>Rejoindre quelqu'un</h3>
    <div class="joinrow"><input class="field" id="fyCode" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="Code à 6 caractères"><button class="ghost" data-fy="join">Rejoindre</button></div>`
    }
    ${
      others.length
        ? `<h3>Ou reprendre un foyer</h3><p class="hint" style="margin:-4px 0 10px">Les mêmes foyers que tes listes Take Out.</p><div class="srows">${others
            .map((h) => `<button class="srow" data-fy="use" data-arg="${esc(h.id)}"><span class="av">🏠</span><span class="sn">${esc(h.name)}<small>Code ${esc(h.id)}</small></span><span></span></button>`)
            .join("")}</div>`
        : ""
    }
    <p class="err" id="fyErr"></p>
    <button class="linkbtn" data-fy="login" style="margin-top:18px">J'ai déjà un compte (code de sauvegarde)</button>`);
}

function viewFoyer() {
  const others = households.filter((h) => h.id !== hid);
  show(`<div class="hd plain" style="margin:0"><div><h2>${esc(foyer.name)}</h2>
      <div style="color:var(--soft)">Code d'invitation : <b style="letter-spacing:.08em;color:var(--ink)">${esc(hid)}</b></div>
      <div class="hint" id="fyLive" style="margin-top:4px"></div></div>${close}</div>
    <div class="srows" style="margin-top:16px">${members
      .map((m) => `<div class="srow"><span class="av">${esc(m.emoji)}</span><span class="sn">${esc(m.name)}${m.uid === uid ? "<small>toi</small>" : ""}</span><span></span></div>`)
      .join("")}</div>
    <button class="go" data-fy="invite" style="margin-top:14px">Inviter quelqu'un</button>
    <p class="hint" style="margin-top:8px">Le foyer est aussi une liste de courses dans Take Out, avec les mêmes personnes.</p>
    <h3>Mon profil</h3>${profileFields()}
    <button class="soft-btn" data-fy="saveprofile" style="background:var(--card)">Enregistrer mon profil</button>
    <h3>Garder mon compte</h3>
    <p class="hint" style="margin:-4px 0 10px">Un code de sauvegarde te permet de retrouver ce compte sur un autre téléphone. C'est le même que dans Take Out et Déclic.</p>
    <div id="fyBackup"><button class="soft-btn" data-fy="backup" style="background:var(--card);margin-top:0">Créer mon code de sauvegarde</button></div>
    ${
      others.length
        ? `<h3>Mes autres foyers</h3><div class="srows">${others
            .map((h) => `<button class="srow" data-fy="use" data-arg="${esc(h.id)}"><span class="av">🏠</span><span class="sn">${esc(h.name)}<small>Code ${esc(h.id)}</small></span><span></span></button>`)
            .join("")}</div>`
        : ""
    }
    <p class="err" id="fyErr"></p>
    <button class="banbtn" data-fy="leave">Quitter ce foyer</button>`);
  header();
}

function viewLogin() {
  show(`<div class="hd plain" style="margin:0"><div><h2>J'ai déjà un compte</h2>
      <div style="color:var(--soft)">Tape le code de sauvegarde créé sur ton autre téléphone (dans Popote, Take Out ou Déclic).</div></div>${close}</div>
    <input class="field" id="fyRecov" style="margin-top:16px;letter-spacing:.08em;text-transform:uppercase" autocapitalize="characters" autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX">
    <p class="err" id="fyErr"></p>
    <button class="go" data-fy="dologin" style="margin-top:12px">Retrouver mon compte</button>`);
}

// Prénom et emoji du formulaire, enregistrés s'ils ont changé.
async function profileFromForm() {
  const name = ((document.getElementById("fyName") || {}).value || "").replace(/[<>"`]/g, "").trim().slice(0, 30);
  if (!name) {
    setErr("Écris ton prénom pour que les autres te reconnaissent.");
    document.getElementById("fyName")?.focus();
    return false;
  }
  if (name !== me.name || pick !== me.emoji) await saveProfile(name, pick);
  return true;
}

// Code de sauvegarde, comme dans Take Out : 16 caractères qui servent de mot de passe.
const RECOVERY_DOMAIN = "@declic-recup.invalid";
const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function recoveryEmail(norm) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("declic:" + norm)));
  return `r-${Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("")}${RECOVERY_DOMAIN}`;
}

const actions = {
  emoji(arg) {
    pick = arg;
    document.querySelectorAll('[data-fy="emoji"]').forEach((b) => b.setAttribute("aria-pressed", b.dataset.arg === pick));
  },
  async create() {
    if (!(await profileFromForm())) return;
    const code = must(await sb.rpc("courses_create_household", { hname: "Chez " + me.name, hkind: "autre" }));
    await loadHouseholds();
    await useFoyer(code, { fresh: true });
    viewFoyer();
    toast("Popote créée : invite quelqu'un !");
  },
  async join(arg) {
    const code = normCode(arg || (document.getElementById("fyCode") || {}).value).slice(0, 6);
    if (code.length !== 6) return setErr("Le code a 6 caractères (lettres et chiffres).");
    if (!(await profileFromForm())) return;
    const h = must(await sb.rpc("courses_join", { code }));
    if (!h) return setErr("Ce code ne correspond à aucun foyer. Vérifie-le avec la personne qui t'invite.");
    await loadHouseholds();
    await useFoyer(h.id);
    viewFoyer();
    toast("Bienvenue dans « " + h.name + " »");
  },
  async use(arg) {
    if (!(await profileFromForm().catch(() => true))) return;
    await useFoyer(arg);
    viewFoyer();
    toast("Foyer : " + foyer.name);
  },
  async invite() {
    const url = location.origin + location.pathname + "?rejoindre=" + hid;
    const text = `Rejoins-moi sur Popote pour prévoir nos repas de la semaine ensemble : ${url} (code ${hid})`;
    if (navigator.share) return navigator.share({ title: "Popote", text }).catch(() => {});
    try {
      await navigator.clipboard.writeText(text);
      toast("Lien d'invitation copié");
    } catch (e) {
      setErr(text);
    }
  },
  async saveprofile() {
    if (await profileFromForm()) {
      await loadMembers();
      viewFoyer();
      toast("Profil enregistré");
    }
  },
  async backup(arg, btn) {
    const { data } = await sb.auth.getSession();
    let r;
    try {
      r = await fetch(NOTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (data?.session?.access_token || "") },
        body: JSON.stringify({ type: "recovery-create" }),
      });
    } catch (e) {
      throw fail("network");
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.code) throw fail("internal");
    document.getElementById("fyBackup").innerHTML = `<div class="duo"><b style="font-size:1.25rem;letter-spacing:.08em">${esc(j.code)}</b>
      <p>Garde ce code précieusement (note-le ou envoie-le-toi). Il remplace l'ancien s'il y en avait un.</p></div>`;
  },
  login() {
    viewLogin();
  },
  async dologin() {
    const norm = normCode(document.getElementById("fyRecov").value);
    if (norm.length !== 16) return setErr("Le code a 16 caractères.");
    const { error } = await sb.auth.signInWithPassword({ email: await recoveryEmail(norm), password: norm });
    if (error) return setErr(/invalid/i.test(error.message) ? "Ce code ne marche pas. Vérifie-le." : errText(fail("network")));
    // Autre compte : on repart de zéro sur ce téléphone, puis on choisit le foyer.
    lsSet(FOYER_KEY, null);
    lsSet(DIRTY_KEY, null);
    lsSet(ME_KEY, null);
    location.replace(location.pathname + "?foyer");
  },
  async leave(arg, btn) {
    if (!btn.dataset.sure) {
      btn.dataset.sure = "1";
      btn.textContent = "Sûr ? Tu quittes aussi la liste Take Out. Toucher encore";
      return;
    }
    must(await sb.rpc("courses_leave", { code: hid }));
    await loadHouseholds();
    forget();
    dlg.close();
    toast("Tu as quitté le foyer");
  },
  async scan() {
    document.getElementById("scanIn").click();
  },
  rvkind(arg) {
    draft.m = arg;
    document.querySelectorAll('[data-fy="rvkind"]').forEach((b) => b.setAttribute("aria-pressed", b.dataset.arg === arg));
  },
  rvdel(arg) {
    delete draft.i[arg];
    viewDraft();
  },
  async rvsave() {
    readDraft();
    const data = { ...draft, id: "u" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6), by: me.name || "" };
    delete data.servings;
    const r = checkRecipe(data);
    if (!r) return setErr("Il faut au moins un ingrédient.");
    if (hid) {
      await connect();
      must(await sb.from("popote_recipes").insert({ id: data.id, household: hid, data, created_by: uid }));
      await loadRecipes();
    } else {
      setCustomRecipes(customRecipes().concat(data));
      quietly(renderAll);
    }
    draft = null;
    toast(r.n + " ajoutée aux recettes");
    openRecipe(data.id, null);
  },
  async delrecipe(arg, btn) {
    if (!btn.dataset.sure) {
      btn.dataset.sure = "1";
      btn.textContent = "Sûr ? Toucher encore pour supprimer";
      return;
    }
    if (hid) {
      await connect();
      must(await sb.from("popote_recipes").delete().eq("id", arg));
      await loadRecipes();
    } else {
      setCustomRecipes(customRecipes().filter((r) => r.id !== arg));
    }
    fixState();
    save();
    renderAll();
    dlg.close();
    toast("Recette supprimée");
  },
};

document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-fy]");
  if (!t) return;
  const fn = actions[t.dataset.fy];
  if (!fn) return;
  e.stopPropagation();
  setErr("");
  const needsServer = !["emoji", "scan", "rvkind", "rvdel", "login", "invite"].includes(t.dataset.fy);
  try {
    if (needsServer && t.dataset.fy !== "rvsave" && t.dataset.fy !== "delrecipe") await connect();
    if (needsServer && !t.dataset.sure) busy(t, true);
    await fn(t.dataset.arg, t);
  } catch (err) {
    setErr(errText(mapError(err)));
    if (!document.getElementById("fyErr")) toast(errText(mapError(err)));
  } finally {
    if (t.isConnected && t.disabled) busy(t, false);
  }
});
document.getElementById("foyerBtn").addEventListener("click", () => openFoyer());

// ---------- recette en photo ----------

// Photo réduite (1600 px au plus), en JPEG, sans l'en-tête « data: ».
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(fail("image"));
    };
    img.src = url;
  });
}
const SCAN_ERRORS = {
  network: "Il faut du réseau pour lire une photo.",
  image: "Cette photo ne s'ouvre pas. Essaie une capture d'écran ou une photo JPEG.",
  limit: "Tu as déjà lu beaucoup de recettes aujourd'hui. Réessaie demain !",
  limit_all: "Trop de recettes lues aujourd'hui sur Popote. Réessaie demain !",
  busy: "Le service de lecture est occupé. Réessaie dans une minute.",
  setup: "La lecture des photos n'est pas encore installée (fonction popote-recette, voir le README).",
  too_long: "Cette recette est trop longue à lire d'un coup. Essaie avec moins de photos.",
  unreadable: "Je n'arrive pas à lire cette recette. Essaie une photo plus nette, bien droite et éclairée.",
};

async function scan(files) {
  const list = [...files].slice(0, 4);
  if (!list.length) return;
  show(`<div class="hd plain" style="margin:0"><div><h2>Lecture de la recette…</h2>
      <div style="color:var(--soft)">${list.length > 1 ? list.length + " photos" : "Une photo"} · ça prend souvent 20 à 40 secondes.</div></div>${close}</div>
    <div class="spin" aria-hidden="true"></div><p class="hint" style="text-align:center">Je repère les ingrédients, les quantités et les étapes.</p>`);
  const fin = (msg) =>
    show(`<div class="hd plain" style="margin:0"><div><h2>Pas de recette lue</h2></div>${close}</div>
      <p class="hint bad" style="margin:16px 6px">${esc(msg)}</p><button class="go" data-fy="scan" style="margin-top:8px">Essayer une autre photo</button>`);
  let res, j;
  try {
    const images = await Promise.all(list.map(shrink));
    await connect();
    const { data } = await sb.auth.getSession();
    const catalog = Object.keys(ING_DEFAULT)
      .filter((k) => !ING_DEFAULT[k].x)
      .map((k) => [k, ING_DEFAULT[k].n, ING_DEFAULT[k].u]);
    res = await fetch(RECETTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (data?.session?.access_token || "") },
      body: JSON.stringify({ images, catalog }),
    });
    j = await res.json().catch(() => ({}));
  } catch (e) {
    const m = mapError(e);
    return fin(SCAN_ERRORS[m.code] || SCAN_ERRORS[e.code] || SCAN_ERRORS.network);
  }
  if (!dlg.open) return; // fermé pendant la lecture
  if (res.status === 404) return fin(SCAN_ERRORS.setup);
  if (!res.ok || !j.recipe) return fin(j.error === "not_recipe" ? j.detail || "Je ne vois pas de recette sur cette photo." : SCAN_ERRORS[j.error] || SCAN_ERRORS.unreadable);
  draft = j.recipe;
  if (!["g", "p", "v"].includes(draft.m)) draft.m = "v";
  viewDraft();
}
document.getElementById("scanIn").addEventListener("change", (e) => {
  const files = e.target.files;
  scan(files).finally(() => (e.target.value = ""));
});

const ingOf = (k) => (draft.ing && draft.ing[k]) || ING_DEFAULT[k];
function readDraft() {
  const v = (id) => (document.getElementById(id) || {}).value;
  if (v("rvName") != null) draft.n = v("rvName").trim() || draft.n;
  if (v("rvTime") != null) draft.t = Math.max(5, Math.min(600, Math.round(+v("rvTime") || draft.t)));
  document.querySelectorAll("[data-rvq]").forEach((inp) => {
    const q = parseFloat(String(inp.value).replace(",", "."));
    if (q > 0) draft.i[inp.dataset.rvq] = q;
  });
}
function viewDraft() {
  if (document.getElementById("rvName")) readDraft();
  const ks = Object.keys(draft.i).filter((k) => ingOf(k));
  const kinds = [
    ["g", "Végétarien"],
    ["p", "Poisson"],
    ["v", "Viande"],
  ];
  show(`<div class="hero k-${draft.m}"><button class="close" data-close aria-label="Fermer">✕</button><div class="bigem" aria-hidden="true">${esc(draft.e || "🍽️")}</div>
      <h2>Nouvelle recette</h2><div class="meta">Vérifie ce que j'ai lu avant de l'ajouter.</div></div>
    <div class="section"><label class="f" for="rvName">Nom</label><input class="field" id="rvName" maxlength="80" value="${esc(draft.n)}"></div>
    <div class="row" style="margin-top:16px"><div><label class="f" for="rvTime">Temps total (min)</label><input class="field" id="rvTime" type="number" min="5" max="600" inputmode="numeric" value="${esc(draft.t)}"></div>
      <div><span class="f">Type de plat</span><div class="chips">${kinds
        .map(([k, l]) => `<button class="chip" data-fy="rvkind" data-arg="${k}" aria-pressed="${draft.m === k}">${l}</button>`)
        .join("")}</div></div></div>
    <h3>Ingrédients pour 1 personne</h3>
    <p class="hint" style="margin:-4px 0 10px">${draft.servings > 1 ? `La recette d'origine était pour ${esc(draft.servings)} personnes : j'ai divisé les quantités. ` : ""}Popote les multiplie par le nombre de personnes de ta semaine.</p>
    <ul>${ks
      .map((k) => {
        const g = ingOf(k);
        return `<li class="rvli"><span>${esc(g.n)}${draft.ing && draft.ing[k] ? ' <span class="tag">nouveau</span>' : ""}</span>
          <span class="rvq"><input type="number" min="0" step="any" inputmode="decimal" data-rvq="${esc(k)}" value="${esc(draft.i[k])}" aria-label="Quantité de ${esc(g.n)}"> ${esc(g.u)}
          <button class="ib" data-fy="rvdel" data-arg="${esc(k)}" aria-label="Retirer ${esc(g.n)}">✕</button></span></li>`;
      })
      .join("")}</ul>
    ${
      Object.keys(draft.ing || {}).some((k) => draft.i[k])
        ? '<p class="hint">Les ingrédients « nouveau » rejoignent la liste des aliments avec un prix estimé, que tu peux corriger dans l\'onglet Aliments.</p>'
        : ""
    }
    <h3>Préparation</h3><ol>${(draft.s || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
    <p class="err" id="fyErr"></p>
    <div class="slotacts"><button class="go" data-fy="rvsave">${hid ? "Ajouter à nos recettes" : "Ajouter à mes recettes"}</button><button class="ghost" data-close>Annuler</button></div>`);
}

// ---------- démarrage ----------

header();
{
  const q = new URLSearchParams(location.search);
  const invite = normCode(q.get("rejoindre")).slice(0, 6);
  const wantFoyer = q.has("foyer");
  if (invite || wantFoyer) history.replaceState(null, "", location.pathname);
  if (invite && invite !== hid) setTimeout(() => openFoyer({ code: invite }), 400);
  else if (wantFoyer) setTimeout(() => openFoyer(), 400);
  else if (hid && navigator.onLine)
    connect()
      .then(startFoyer)
      .catch((e) => e.code === "denied" && forget());
}
