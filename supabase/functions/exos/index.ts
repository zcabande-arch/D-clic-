// Mes Exos : fonction Edge qui lit les photos d'un cours avec Gemini (Google) et renvoie une fiche d'exercices.
// - POST { images: [{ media_type, data }], nb, level, niveau, cycle, extra, eviter } avec le jeton de session Supabase
//   (compte anonyme de l'app) → { matiere, titre, resume, notions, exercices: [{ difficulte, enonce, indice, corrige }] }
// La consigne est écrite ici, pas par l'app : la fonction ne sert qu'à générer des exercices.
// Quota par compte : supabase/exos.sql (table exos_usage). La clé Gemini (gratuite, aistudio.google.com) est le secret
// GEMINI_API_KEY de la fonction ; le secret facultatif GEMINI_MODEL change de modèle.
// La déployer avec « Verify JWT » désactivé (le jeton est vérifié ici).
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 3_500_000; // en base64, une page réduite par l'app pèse bien moins
const PER_DAY = 20;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const LEVELS: Record<string, string> = {
  facile: "plutôt faciles (application directe du cours)",
  mixte: "de difficulté progressive, du plus simple au plus exigeant",
  difficile: "plutôt difficiles (raisonnement, plusieurs étapes, type examen)",
};
const STYLE: Record<string, string> = {
  college: " (style brevet)",
  lycee: " (style bac / contrôles de lycée)",
  sup: " (style partiels / concours de cette formation)",
};
const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function consigne(b: Record<string, unknown>) {
  const nb = [3, 5, 8, 10].includes(Number(b.nb)) ? Number(b.nb) : 5;
  const lv = LEVELS[String(b.level)] || LEVELS.mixte;
  const niveau = clean(b.niveau, 200);
  const extra = clean(b.extra, 300);
  const eviter = Array.isArray(b.eviter) ? b.eviter.slice(0, 10).map((e) => clean(e, 200)).filter(Boolean) : [];
  return `Les images jointes sont des photos de pages d'un cours d'élève ou d'étudiant (manuscrit ou imprimé), dans l'ordre.
1. Lis attentivement le cours et identifie la matière, le chapitre et les notions clés.
2. Rédige exactement ${nb} exercices originaux ${lv}, qui portent UNIQUEMENT sur ce que le cours contient. Varie les types (calcul, question de cours, application, QCM, analyse de document… selon la matière).${
    niveau ? `\nNiveau de l'élève : ${niveau}. Adapte le vocabulaire, la difficulté et le format au programme officiel français de ce niveau${STYLE[String(b.cycle)] || ""}.` : ""
  }${extra ? `\nDemande de l'élève : ${extra}` : ""}${
    eviter.length ? `\nL'élève a déjà fait ces exercices sur ce cours, propose-en d'autres, différents :\n- ${eviter.join("\n- ")}` : ""
  }
3. Pour chaque exercice, donne un indice court qui aide sans donner la réponse, et un corrigé complet et rédigé, étape par étape, comme un professeur.

Écris en français (ou dans la langue du cours si c'est un cours de langue). N'utilise PAS de LaTeX ni de Markdown : écris les formules en texte avec des symboles Unicode (², √, π, Δ, ≤, →, ∫, x₁…). Utilise des retours à la ligne pour structurer.
« titre » est le chapitre, « resume » une ou deux phrases sur le cours, « notions » 3 à 6 notions clés, « difficulte » 1 (facile), 2 (moyen) ou 3 (difficile).
Si les images ne sont pas un cours lisible, renvoie exercices: [] et explique pourquoi dans « resume ».

Réponds uniquement avec un objet JSON de cette forme :
{"matiere": string, "titre": string, "resume": string, "notions": [string, ...], "exercices": [{"difficulte": 1|2|3, "enonce": string, "indice": string, "corrige": string}]}`;
}

async function onGenerate(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error } = await sb.auth.getUser(token);
  if (error || !u?.user) return json({ error: "unauthenticated" }, 401);
  const uid = u.user.id;

  const b = await req.json().catch(() => null);
  const images = Array.isArray(b?.images) ? b.images : [];
  if (!images.length) return json({ error: "no_images" }, 400);
  if (images.length > MAX_IMAGES) return json({ error: "too_many_images" }, 400);
  for (const im of images)
    if (!IMAGE_TYPES.includes(im?.media_type) || typeof im?.data !== "string" || im.data.length > MAX_IMAGE_BYTES)
      return json({ error: "image_rejected" }, 400);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const used = await sb.from("exos_usage").select("id", { count: "exact", head: true }).eq("uid", uid).gte("at", since);
  if (used.error) return json({ error: "setup", detail: used.error.message }, 500);
  if ((used.count ?? 0) >= PER_DAY) return json({ error: "quota" }, 429);
  await sb.from("exos_usage").insert({ uid });

  if (!GEMINI_KEY) return json({ error: "setup", detail: "GEMINI_API_KEY" }, 500);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            ...images.map((im: { media_type: string; data: string }) => ({ inline_data: { mime_type: im.media_type, data: im.data } })),
            { text: consigne(b) },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 32000 },
    }),
  });
  const g = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(r.status, JSON.stringify(g));
    const detail = g?.error?.message || String(r.status);
    if (r.status === 429) return json({ error: "rate_limited", detail }, 429);
    if (r.status === 401 || r.status === 403) return json({ error: "setup", detail }, 500);
    if (r.status === 404) return json({ error: "setup", detail: `modèle ${MODEL} : ${detail}` }, 500);
    if (r.status === 400) return json({ error: /image|inline/i.test(detail) ? "image_rejected" : "bad_request", detail }, 400);
    return json({ error: "gemini", detail }, 502);
  }
  if (g?.promptFeedback?.blockReason) return json({ error: "refused" }, 422);
  const cand = g?.candidates?.[0];
  if (cand?.finishReason === "SAFETY" || cand?.finishReason === "PROHIBITED_CONTENT") return json({ error: "refused" }, 422);
  if (cand?.finishReason === "MAX_TOKENS") return json({ error: "too_long" }, 502);
  const text = (cand?.content?.parts || []).map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text || "")).join("");
  try {
    return json(JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "")));
  } catch {
    return json({ error: "invalid_json" }, 502);
  }
}

if (typeof Deno !== "undefined" && Deno.serve)
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    try {
      return await onGenerate(req);
    } catch (e) {
      console.error(e);
      return json({ error: "internal", detail: (e as Error).message }, 500);
    }
  });
