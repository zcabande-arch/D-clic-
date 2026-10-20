// Mons en fête : calendrier à s'abonner (format iCalendar, lu par le Calendrier d'Apple, Google Agenda, Outlook…).
// - GET ?t=<lien secret du profil>            → tous les événements, les créneaux de la personne,
//                                               et pour les admins les échéances et les publications à faire
// - GET ?t=<lien secret>&e=<id d'événement>   → ce seul événement (bouton « Ajouter à mon calendrier »)
// Le lien secret vient de mons_profils.cal_token (supabase/mons-calendrier.sql). La déployer avec « Verify JWT » désactivé.
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://zcabande-arch.github.io/D-clic-/mons/";
const TZ = "Europe/Paris";

// deno-lint-ignore no-explicit-any
type Doc = Record<string, any> & { id: string };
export type Data = {
  events: Doc[];
  planning: Doc[];
  tasks: Doc[];
  posts: Doc[];
  inscriptions: { slot_id: string; profil_id: string }[];
  presence: { profil_id: string; event_id: string; valeur: string }[];
};
export type Profil = { id: string; nom: string; is_admin: boolean };

// ---------- format iCalendar (RFC 5545) ----------
const esc = (s: unknown) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Lignes de 75 octets au plus, sans couper un caractère.
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}
const ymd = (s: string) => s.replace(/-/g, "");
const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};
// « 14h30 », « 14h », « 14:30 », « 9H00 » → [14, 30]
export function heure(s: unknown): [number, number] | null {
  const m = /^\s*(\d{1,2})\s*[hH:]\s*(\d{2})?\s*$/.exec(String(s ?? ""));
  if (!m) return null;
  const h = Number(m[1]), mn = Number(m[2] || 0);
  return h < 24 && mn < 60 ? [h, mn] : null;
}
const pad = (n: number) => String(n).padStart(2, "0");
const local = (date: string, [h, m]: [number, number]) => `${ymd(date)}T${pad(h)}${pad(m)}00`;
// Début + durée en heures, en heure locale de Paris (passer minuit avance la date).
function timed(date: string, hm: [number, number], hours: number) {
  const total = hm[0] * 60 + hm[1] + hours * 60;
  const endDate = addDays(date, Math.floor(total / 1440));
  const rest = total % 1440;
  return [`DTSTART;TZID=${TZ}:${local(date, hm)}`, `DTEND;TZID=${TZ}:${local(endDate, [Math.floor(rest / 60), rest % 60])}`];
}
const allDay = (from: string, to?: string) => [`DTSTART;VALUE=DATE:${ymd(from)}`, `DTEND;VALUE=DATE:${ymd(addDays(to && to > from ? to : from, 1))}`];

const VTIMEZONE = [
  "BEGIN:VTIMEZONE", `TZID:${TZ}`,
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const frDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
};

export function buildIcs(d: Data, me: Profil, onlyEvent?: string, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Comite des fetes de Mons//Mons en fete//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Mons en fête", `X-WR-TIMEZONE:${TZ}`, "X-WR-CALDESC:Événements du comité des fêtes de Mons",
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H", "X-PUBLISHED-TTL:PT4H",
    ...VTIMEZONE,
  ];
  const vevent = (uid: string, when: string[], props: Record<string, string | undefined>, extra: string[] = []) => {
    lines.push("BEGIN:VEVENT", `UID:${uid}@mons-en-fete`, `DTSTAMP:${stamp}`, ...when);
    for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== "") lines.push(`${k}:${v}`);
    lines.push(...extra, "END:VEVENT");
  };
  const link = (evId: string) => `${APP_URL}?tab=plan&ev=${encodeURIComponent(evId)}`;
  const events = d.events.filter((e) => e.date && (!onlyEvent || e.id === onlyEvent));

  for (const e of events) {
    const slots = d.planning.filter((s) => s.eventId === e.id);
    const mine = slots.filter(
      (s) => d.inscriptions.some((x) => x.slot_id === s.id && x.profil_id === me.id) || String(s.personnes || "").split(",").map(norm).includes(norm(me.nom)),
    );
    const pres = d.presence.find((x) => x.profil_id === me.id && x.event_id === e.id)?.valeur;
    const hm = heure(e.heure);
    const cancelled = e.statut === "annule";
    const desc = [
      e.details,
      e.prix ? `Prix : ${e.prix}` : "",
      e.dateAlt ? `Autre date possible : ${frDate(e.dateAlt)}` : "",
      mine.length ? `Tes postes : ${mine.map((s) => (s.heure ? `${s.role} (${s.heure})` : s.role)).join(", ")}` : "",
      cancelled ? "" : pres === "oui" ? "Ta réponse : je suis là ✓" : pres === "non" ? "Ta réponse : pas là" : "Tu n'as pas encore dit si tu es là : réponds dans l'app.",
      `Planning et inscriptions : ${link(e.id)}`,
    ].filter(Boolean).join("\n");
    const tag = cancelled ? "Annulé · " : "";
    const doute = e.statut === "date_a_confirmer" ? " (date à confirmer)" : e.statut === "a_definir" ? " (à définir)" : "";
    vevent(`event-${e.id}`, e.endDate || !hm ? allDay(e.date, e.endDate) : timed(e.date, hm, 4), {
      SUMMARY: esc(`${tag}🎉 ${e.title}${doute}`),
      LOCATION: e.lieu ? esc(e.lieu) : undefined,
      DESCRIPTION: esc(desc),
      URL: link(e.id),
      STATUS: cancelled ? "CANCELLED" : e.statut === "confirme" || !e.statut ? "CONFIRMED" : "TENTATIVE",
      TRANSP: "TRANSPARENT",
    });
    // Les postes de la personne, à leur heure (ou toute la journée si l'heure n'est pas donnée).
    if (cancelled) continue;
    for (const s of mine) {
      const sh = heure(s.heure);
      vevent(`slot-${s.id}-${me.id}`, sh ? timed(e.date, sh, 2) : allDay(e.date), {
        SUMMARY: esc(`🙋 ${s.role} · ${e.title}`),
        LOCATION: e.lieu ? esc(e.lieu) : undefined,
        DESCRIPTION: esc([s.notes, `Planning : ${link(e.id)}`].filter(Boolean).join("\n")),
        URL: link(e.id),
        TRANSP: "OPAQUE",
      }, sh ? ["BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT2H", `DESCRIPTION:${esc(`${s.role} · ${e.title}`)}`, "END:VALARM"] : []);
    }
  }
  // Admins : ce qu'il reste à faire, chaque élément le jour prévu.
  if (me.is_admin && !onlyEvent) {
    const title = (id: string) => d.events.find((e) => e.id === id)?.title || "";
    for (const t of d.tasks.filter((x) => !x.done && x.due))
      vevent(`task-${t.id}`, allDay(t.due), { SUMMARY: esc(`✅ ${t.label}`), DESCRIPTION: esc(`À faire · ${title(t.eventId)}\n${APP_URL}?tab=todo`), TRANSP: "TRANSPARENT" });
    for (const p of d.posts.filter((x) => !x.done && x.date))
      vevent(`post-${p.id}`, allDay(p.date), {
        SUMMARY: esc(`📸 ${p.format || "Post"} · ${title(p.eventId)}`),
        DESCRIPTION: esc(`${p.idea || ""}\n${APP_URL}?tab=insta`),
        TRANSP: "TRANSPARENT",
      });
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// ---------- serveur ----------
if (typeof Deno !== "undefined" && Deno.serve) {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const text = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  Deno.serve(async (req) => {
    try {
      const url = new URL(req.url);
      const t = url.searchParams.get("t") || "";
      if (!/^[a-f0-9]{32}$/.test(t)) return text("Lien de calendrier invalide.", 404);
      const { data: me, error } = await sb.from("mons_profils").select("id,nom,is_admin").eq("cal_token", t).maybeSingle();
      if (error) throw error;
      if (!me) return text("Ce lien de calendrier n'existe plus : demande un nouveau lien dans l'app.", 404);
      const [docs, ins, pres] = await Promise.all([
        sb.from("mons_docs").select("coll,id,data").in("coll", me.is_admin ? ["events", "planning", "tasks", "posts"] : ["events", "planning"]),
        sb.from("mons_inscriptions").select("slot_id,profil_id").eq("profil_id", me.id),
        sb.from("mons_presence").select("profil_id,event_id,valeur").eq("profil_id", me.id),
      ]);
      for (const r of [docs, ins, pres]) if (r.error) throw r.error;
      const rows = (docs.data || []) as { coll: string; id: string; data: Doc }[];
      const of = (c: string) => rows.filter((r) => r.coll === c).map((r) => ({ ...r.data, id: r.id }));
      const d: Data = { events: of("events"), planning: of("planning"), tasks: of("tasks"), posts: of("posts"), inscriptions: ins.data || [], presence: pres.data || [] };
      const one = url.searchParams.get("e") || undefined;
      return new Response(buildIcs(d, me as Profil, one), {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `${one ? "attachment" : "inline"}; filename="${one ? "evenement" : "mons-en-fete"}.ics"`,
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      console.error(e);
      return text("Calendrier momentanément indisponible.", 500);
    }
  });
}
