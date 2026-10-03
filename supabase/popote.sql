-- Popote : les repas de la semaine partagés à plusieurs, dans le même projet Supabase que Déclic et Take Out.
-- À coller dans Supabase › SQL Editor › New query, puis « Run » (après supabase/courses.sql).
-- Le script peut être relancé sans risque.
--
-- Popote utilise les foyers de Take Out (courses_households, courses_members) et ses profils (courses_profiles) :
-- un foyer Popote est aussi une liste Take Out, avec les mêmes personnes et le même code d'invitation.
--
--   popote_state   : le semainier du foyer (réglages, repas prévus, cases cochées, prix modifiés), en un seul document
--   popote_recipes : les recettes ajoutées par le foyer (lues sur une photo ou collées)

create table if not exists public.popote_state (
  household  text        primary key references public.courses_households (id) on delete cascade,
  data       jsonb       not null check (octet_length(data::text) < 500000),
  client     text        not null default '' check (char_length(client) <= 40),
  updated_by uuid        references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.popote_recipes (
  id         text        primary key check (id ~ '^u[a-z0-9-]{3,40}$'),
  household  text        not null references public.courses_households (id) on delete cascade,
  data       jsonb       not null check (octet_length(data::text) < 40000),
  created_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists popote_recipes_household_idx on public.popote_recipes (household);

-- ---------- règles d'accès : seuls les membres du foyer lisent et écrivent ----------

alter table public.popote_state   enable row level security;
alter table public.popote_recipes enable row level security;

drop policy if exists popote_state_select on public.popote_state;
create policy popote_state_select on public.popote_state for select to authenticated
  using (courses_is_member(household));
drop policy if exists popote_state_insert on public.popote_state;
create policy popote_state_insert on public.popote_state for insert to authenticated
  with check (courses_is_member(household) and updated_by = auth.uid());
drop policy if exists popote_state_update on public.popote_state;
create policy popote_state_update on public.popote_state for update to authenticated
  using (courses_is_member(household)) with check (courses_is_member(household) and updated_by = auth.uid());

drop policy if exists popote_recipes_select on public.popote_recipes;
create policy popote_recipes_select on public.popote_recipes for select to authenticated
  using (courses_is_member(household));
drop policy if exists popote_recipes_insert on public.popote_recipes;
create policy popote_recipes_insert on public.popote_recipes for insert to authenticated
  with check (courses_is_member(household) and created_by = auth.uid());
drop policy if exists popote_recipes_update on public.popote_recipes;
create policy popote_recipes_update on public.popote_recipes for update to authenticated
  using (courses_is_member(household)) with check (courses_is_member(household));
drop policy if exists popote_recipes_delete on public.popote_recipes;
create policy popote_recipes_delete on public.popote_recipes for delete to authenticated
  using (courses_is_member(household));

grant select, insert, update on public.popote_state to authenticated;
grant select, insert, update, delete on public.popote_recipes to authenticated;

-- ---------- temps réel ----------

do $$
declare t text;
begin
  foreach t in array array['popote_state', 'popote_recipes'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
