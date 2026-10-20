-- Mons en fête : abonnement au calendrier (Calendrier d'Apple, Google Agenda…).
-- À lancer dans Supabase › SQL Editor APRÈS supabase/mons.sql, avec la fonction Edge « mons-calendrier »
-- (code : supabase/functions/mons-calendrier/index.ts, « Verify JWT » désactivé). Peut être relancé sans risque.
--
-- Chaque profil a un lien secret (cal_token) : l'app de calendrier le relit régulièrement, sans se connecter.
-- Il donne les événements, les créneaux de la personne et, pour les admins, les échéances et les posts.

alter table public.mons_profils add column if not exists cal_token text unique
  default replace(gen_random_uuid()::text, '-', '');
update public.mons_profils set cal_token = replace(gen_random_uuid()::text, '-', '') where cal_token is null;

-- Le lien de la personne connectée sur cet appareil ; « nouveau » en crée un autre (l'ancien cesse de marcher).
create or replace function public.mons_cal_token(nouveau boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  if public.mons_me() is null then
    raise exception 'not signed in';
  end if;
  if nouveau then
    update mons_profils set cal_token = replace(gen_random_uuid()::text, '-', '') where id = public.mons_me();
  end if;
  select cal_token into t from mons_profils where id = public.mons_me();
  return t;
end $$;
revoke all on function public.mons_cal_token(boolean) from public, anon;
grant execute on function public.mons_cal_token(boolean) to authenticated;

-- La fonction Edge travaille avec le rôle service_role.
grant select on public.mons_docs, public.mons_profils, public.mons_inscriptions, public.mons_presence to service_role;
