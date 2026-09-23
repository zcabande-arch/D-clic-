-- Déclic : notifications push (nouvelle photo dans un groupe + rappel à chaque déclic).
-- À lancer une fois dans Supabase › SQL Editor, APRÈS schema.sql. Peut être relancé sans risque.
-- La fonction Edge « notify » (supabase/functions/notify/index.ts) doit aussi être créée.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Abonnements push des appareils : chacun ne gère que les siens.
create table if not exists public.push_subs (
  endpoint   text primary key,
  uid        text not null,
  sub        jsonb not null,
  tz         text not null,
  last       text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists push_subs_own on public.push_subs;
create policy push_subs_own on public.push_subs for all to authenticated
  using (uid = (auth.uid())::text) with check (uid = (auth.uid())::text);
grant select, insert, update, delete on public.push_subs to authenticated;

-- Clés d'envoi (générées par la fonction au premier appel) et photos déjà notifiées.
-- Aucune règle d'accès : seule la fonction (clé service) peut les lire.
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

-- Nouvelle photo → la fonction prévient les autres membres du groupe.
create or replace function public.notify_new_photo() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://alxensbjhfpktfnobvix.supabase.co/functions/v1/notify',
    body    := jsonb_build_object('type', 'photo', 'coll', new.coll, 'id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
end;
$$;

drop trigger if exists docs_new_photo on public.docs;
create trigger docs_new_photo after insert on public.docs
  for each row when (new.coll like 'groups/%/photos')
  execute function public.notify_new_photo();

-- Rappel à chaque déclic : la fonction regarde l'heure locale de chaque appareil.
select cron.unschedule(jobid) from cron.job where jobname = 'declic-rappels';
select cron.schedule('declic-rappels', '0,30 * * * *', $$
  select net.http_post(
    url     := 'https://alxensbjhfpktfnobvix.supabase.co/functions/v1/notify',
    body    := '{"type": "tick"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb);
$$);
