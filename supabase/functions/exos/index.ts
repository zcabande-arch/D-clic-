// Mes Exos : fonction Edge qui lit les photos d'un cours avec Claude et renvoie une fiche d'exercices.
// - POST { images: [{ media_type, data }], nb, level, niveau, cycle, extra, eviter } avec le jeton de session Supabase
//   (compte anonyme de l'app) → { matiere, titre, resume, notions, exercices: [{ difficulte, enonce, indice, corrige }] }
// La consigne est écrite ici, pas par l'app : la fonction ne sert qu'à générer des exercices.
// Quota par compte : supabase/exos.sql (table exos_usage). La clé Claude est le secret ANTHROPIC_API_KEY de la fonction.
// La déployer avec « Verify JWT » désactivé (le jeton est vérifié ici).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-opus-5-5";
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 3_500_000; // en base64, une page réduite par l'app pèse bien moins
const PER_DAY = 20;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const claude = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["matiere", "titre", "resume", "notions", "exercices"],
  properties: {
    matiere: { type: "string" },
    titre: { type: "string" },
    resume: { type: "string" },
    notions: { type: "array", items: { type: "string" } },
    exercices: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["difficulte", "enonce", "indice", "corrige"],
        properties: {
          difficulte: { type: "integer", enum: [1, 2, 3] },
          enonce: { type: "string" },
          indice: { type: "string" },
          corrige: { type: "string" },
        },
      },
    },
  },
};

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
Si les images ne sont pas un cours lisible, renvoie exercices: [] et explique pourquoi dans « resume ».`;
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

  let msg;
  try {
    const stream = claude.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((im: { media_type: string; data: string }) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: im.media_type, data: im.data },
            })),
            { type: "text" as const, text: consigne(b) },
          ],
        },
      ],
    // deno-lint-ignore no-explicit-any
    } as any);
    msg = await stream.finalMessage();
  } catch (e) {
    console.error(e);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (e instanceof Anthropic.BadRequestError) return json({ error: /image/i.test(e.message) ? "image_rejected" : "bad_request", detail: e.message }, 400);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "setup", detail: "ANTHROPIC_API_KEY" }, 500);
    if (e instanceof Anthropic.APIError) return json({ error: "claude", detail: e.message }, 502);
    throw e;
  }
  if (msg.stop_reason === "refusal") return json({ error: "refused" }, 422);
  if (msg.stop_reason === "max_tokens") return json({ error: "too_long" }, 502);
  const text = msg.content.map((c: { type: string; text?: string }) => (c.type === "text" ? c.text : "")).join("");
  try {
    return json(JSON.parse(text));
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
