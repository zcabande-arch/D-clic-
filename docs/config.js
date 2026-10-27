// Réglages Supabase de Déclic (Supabase › Project Settings › API).
// Ces deux valeurs sont publiques par nature : la sécurité repose sur les règles de supabase/schema.sql.
export const SUPABASE_URL = "https://alxensbjhfpktfnobvix.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_9nKf0FeovnRuD1gbrEnMZw_PTsRivaF";
// Adresse de la fonction Edge qui envoie les notifications (supabase/functions/notify).
export const NOTIFY_URL = "https://alxensbjhfpktfnobvix.supabase.co/functions/v1/super-responder";
// Fonction Edge des rappels de Mons en fête (supabase/functions/mons-rappels).
export const MONS_NOTIFY_URL = "https://alxensbjhfpktfnobvix.supabase.co/functions/v1/mons-rappels";
// Fonction Edge du calendrier à s'abonner de Mons en fête (supabase/functions/mons-calendrier).
export const MONS_CAL_URL = "https://alxensbjhfpktfnobvix.supabase.co/functions/v1/mons-calendrier";
// Fonction Edge de Mes Exos, qui fait générer les exercices par Claude (supabase/functions/exos).
export const EXOS_URL = "https://alxensbjhfpktfnobvix.supabase.co/functions/v1/exos";
