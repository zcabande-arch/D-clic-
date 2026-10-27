-- Mes Exos : compteur des générations, pour limiter chaque compte à 20 fiches par 24 h (supabase/functions/exos).
-- À coller dans Supabase › SQL Editor › New query, puis « Run ». Le script peut être relancé sans risque.
-- Seule la fonction Edge (clé service) lit et écrit cette table : aucune règle d'accès n'est ouverte aux applications.

create table if not exists public.exos_usage (
  id  bigint      generated always as identity primary key,
  uid uuid        not null references auth.users (id) on delete cascade,
  at  timestamptz not null default now()
);
create index if not exists exos_usage_uid_at_idx on public.exos_usage (uid, at);

alter table public.exos_usage enable row level security;

-- Ménage : on ne garde que les 2 derniers jours (lancé par la fonction pg_cron si elle est active, sinon sans effet).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('exos-menage', '23 4 * * *', $c$delete from public.exos_usage where at < now() - interval '2 days'$c$);
  end if;
end $$;
