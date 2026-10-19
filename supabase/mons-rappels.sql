-- Mons en fête : rappels par notification (« Tu seras là ? », « Il reste des postes à pourvoir »).
-- À lancer dans Supabase › SQL Editor APRÈS supabase/mons.sql, et après avoir créé la fonction Edge
-- « mons-rappels » (code : supabase/functions/mons-rappels/index.ts). Peut être relancé sans risque.
-- Les clés d'envoi sont celles de Déclic (table push_config) : rien à configurer en plus.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Appareils abonnés aux rappels de Mons en fête (séparés de ceux de Déclic).
create table if not exists public.mons_push (
  endpoint   text        primary key,
  uid        uuid        not null references auth.users (id) on delete cascade,
  sub        jsonb       not null,
  created_at timestamptz not null default now()
);
create index if not exists mons_push_uid_idx on public.mons_push (uid);
alter table public.mons_push enable row level security;
drop policy if exists mons_push_own on public.mons_push;
create policy mons_push_own on public.mons_push for all to authenticated
  using (uid = auth.uid()) with check (uid = auth.uid() and public.mons_me() is not null);
grant select, insert, update, delete on public.mons_push to authenticated;

-- Mêmes tables que Déclic pour les clés et les envois déjà faits (créées ici si Déclic ne les a pas encore).
create table if not exists public.push_config (
  id          int primary key check (id = 1),
  public_key  text not null,
  private_key text not null
);
alter table public.push_config enable row level security;
create table if not exists public.push_sent (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table public.push_sent enable row level security;

-- La fonction Edge travaille avec le rôle service_role.
grant select, insert, update, delete on public.push_config, public.push_sent, public.mons_push to service_role;
grant select on public.mons_docs, public.mons_profils, public.mons_sessions, public.mons_inscriptions, public.mons_presence to service_role;

-- Pour les admins : combien d'appareils de chaque profil reçoivent les rappels.
create or replace function public.mons_notif_status() returns table (profil_id text, devices int)
language sql stable security definer set search_path = public as $$
  select s.profil_id, count(p.endpoint)::int
  from mons_sessions s join mons_push p on p.uid = s.uid
  where public.mons_is_admin()
  group by s.profil_id;
$$;
revoke all on function public.mons_notif_status() from public, anon;
grant execute on function public.mons_notif_status() to authenticated;

-- Tous les jours vers 18h (heure de Paris en hiver, 19h en été) : rappels à J-14, J-7 et J-2.
select cron.unschedule(jobid) from cron.job where jobname = 'mons-rappels';
select cron.schedule('mons-rappels', '0 17 * * *', $$
  select net.http_post(
    url     := 'https://alxensbjhfpktfnobvix.supabase.co/functions/v1/mons-rappels',
    body    := '{"type": "tick"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb);
$$);
