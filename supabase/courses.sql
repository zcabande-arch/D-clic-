-- Courses : listes de courses partagées (couple, coloc, famille), dans le même projet Supabase que Déclic.
-- À coller une seule fois dans Supabase › SQL Editor › New query, puis « Run ».
-- Le script peut être relancé sans risque. Il ne touche pas aux tables de Déclic.
--
--   courses_profiles   : un profil par personne (prénom + emoji)
--   courses_households : une liste partagée (« foyer »), identifiée par un code de 6 caractères
--   courses_members    : qui fait partie de quel foyer
--   courses_items      : les articles, sur la liste de courses (done = false) ou dans la cuisine (done = true)
--   courses_purchases  : les achats (prix payé, par qui), pour le graphique des dépenses

create table if not exists public.courses_profiles (
  uid        uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null check (char_length(name) between 1 and 30),
  emoji      text        not null default '🙂' check (char_length(emoji) between 1 and 16),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses_households (
  id         text        primary key check (id ~ '^[A-Z0-9]{6}$'),
  name       text        not null check (char_length(name) between 1 and 40),
  kind       text        not null default 'autre',
  created_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Type de liste (relancer le script après une mise à jour suffit à appliquer la nouvelle règle).
alter table public.courses_households drop constraint if exists courses_households_kind_check;
alter table public.courses_households add constraint courses_households_kind_check
  check (kind in ('couple', 'coloc', 'famille', 'amis', 'autre'));

create table if not exists public.courses_members (
  household text        not null references public.courses_households (id) on delete cascade,
  uid       uuid        not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household, uid)
);
create index if not exists courses_members_uid_idx on public.courses_members (uid);

create table if not exists public.courses_items (
  id         uuid        primary key default gen_random_uuid(),
  household  text        not null references public.courses_households (id) on delete cascade,
  name       text        not null check (char_length(name) between 1 and 80),
  qty        text        not null default '' check (char_length(qty) <= 40),
  quality    text        not null default '' check (char_length(quality) <= 80),
  cat        text        not null default 'autre' check (cat ~ '^[a-z]{1,20}$'),
  prio       text        not null default 'bientot' check (prio in ('urgent', 'bientot', 'plustard')),
  shop       text        not null default '' check (shop ~ '^[a-z]{0,20}$'),
  done       boolean     not null default false,
  added_by   uuid        references auth.users (id) on delete set null,
  done_by    uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  done_at    timestamptz,
  updated_at timestamptz not null default now()
);
-- done = false : sur la liste de courses ; done = true : acheté, donc « dans notre cuisine ».
-- low = presque fini (seulement pour ce qui est dans la cuisine).
alter table public.courses_items add column if not exists low boolean not null default false;
-- Dernier prix payé, proposé automatiquement au prochain achat.
alter table public.courses_items add column if not exists price numeric(10, 2) check (price is null or (price >= 0 and price < 100000));
create index if not exists courses_items_household_idx on public.courses_items (household);

-- Un achat : une ligne par article acheté (ou par dépense ajoutée à la main, item_id vide).
-- Ils restent même si l'article est ensuite retiré de la cuisine.
create table if not exists public.courses_purchases (
  id         uuid        primary key default gen_random_uuid(),
  household  text        not null references public.courses_households (id) on delete cascade,
  item_id    uuid,
  name       text        not null check (char_length(name) between 1 and 80),
  cat        text        not null default 'autre' check (cat ~ '^[a-z]{1,20}$'),
  amount     numeric(10, 2) not null check (amount >= 0 and amount < 100000),
  paid_by    uuid        references auth.users (id) on delete set null,
  created_by uuid        references auth.users (id) on delete set null,
  bought_at  timestamptz not null default now()
);
create index if not exists courses_purchases_household_idx on public.courses_purchases (household, bought_at);

create or replace function public.courses_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists courses_items_touch on public.courses_items;
create trigger courses_items_touch before update on public.courses_items
  for each row execute function public.courses_touch();

-- ---------- fonctions d'aide (security definer : évitent la récursion des règles) ----------

create or replace function public.courses_is_member(h text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses_members where household = h and uid = auth.uid());
$$;

create or replace function public.courses_shares(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select other = auth.uid() or exists (
    select 1 from courses_members a join courses_members b on a.household = b.household
    where a.uid = auth.uid() and b.uid = other);
$$;

-- ---------- règles d'accès ----------

alter table public.courses_profiles   enable row level security;
alter table public.courses_households enable row level security;
alter table public.courses_members    enable row level security;
alter table public.courses_items      enable row level security;
alter table public.courses_purchases  enable row level security;

-- Profils : chacun écrit le sien, et voit celui des personnes avec qui il partage une liste.
drop policy if exists courses_profiles_select on public.courses_profiles;
create policy courses_profiles_select on public.courses_profiles for select to authenticated
  using (courses_shares(uid));
drop policy if exists courses_profiles_insert on public.courses_profiles;
create policy courses_profiles_insert on public.courses_profiles for insert to authenticated
  with check (uid = auth.uid());
drop policy if exists courses_profiles_update on public.courses_profiles;
create policy courses_profiles_update on public.courses_profiles for update to authenticated
  using (uid = auth.uid()) with check (uid = auth.uid());

-- Foyers et membres : lecture pour les membres ; les modifications passent par les fonctions plus bas.
drop policy if exists courses_households_select on public.courses_households;
create policy courses_households_select on public.courses_households for select to authenticated
  using (courses_is_member(id));
drop policy if exists courses_members_select on public.courses_members;
create policy courses_members_select on public.courses_members for select to authenticated
  using (courses_is_member(household));

-- Articles : tous les membres du foyer peuvent ajouter, cocher, modifier et retirer.
drop policy if exists courses_items_select on public.courses_items;
create policy courses_items_select on public.courses_items for select to authenticated
  using (courses_is_member(household));
drop policy if exists courses_items_insert on public.courses_items;
create policy courses_items_insert on public.courses_items for insert to authenticated
  -- « added_by » doit être un membre du foyer (soi-même, ou l'auteur d'origine quand on annule une suppression).
  with check (courses_is_member(household) and exists (
    select 1 from courses_members m where m.household = courses_items.household and m.uid = courses_items.added_by));
drop policy if exists courses_items_update on public.courses_items;
create policy courses_items_update on public.courses_items for update to authenticated
  using (courses_is_member(household)) with check (courses_is_member(household));
drop policy if exists courses_items_delete on public.courses_items;
create policy courses_items_delete on public.courses_items for delete to authenticated
  using (courses_is_member(household));

-- Achats : visibles et modifiables par les membres ; celui qui paie doit être membre du foyer.
drop policy if exists courses_purchases_select on public.courses_purchases;
create policy courses_purchases_select on public.courses_purchases for select to authenticated
  using (courses_is_member(household));
drop policy if exists courses_purchases_insert on public.courses_purchases;
create policy courses_purchases_insert on public.courses_purchases for insert to authenticated
  with check (courses_is_member(household) and exists (
    select 1 from courses_members m where m.household = courses_purchases.household and m.uid = courses_purchases.paid_by));
drop policy if exists courses_purchases_update on public.courses_purchases;
create policy courses_purchases_update on public.courses_purchases for update to authenticated
  using (courses_is_member(household))
  with check (courses_is_member(household) and exists (
    select 1 from courses_members m where m.household = courses_purchases.household and m.uid = courses_purchases.paid_by));
drop policy if exists courses_purchases_delete on public.courses_purchases;
create policy courses_purchases_delete on public.courses_purchases for delete to authenticated
  using (courses_is_member(household));

grant select, insert, update, delete on public.courses_profiles, public.courses_items, public.courses_purchases to authenticated;
grant select on public.courses_households, public.courses_members to authenticated;

-- ---------- créer, rejoindre, renommer, quitter un foyer ----------

create or replace function public.courses_create_household(hname text, hkind text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if (select count(*) from courses_members where uid = me) >= 20 then raise exception 'too many households'; end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alpha, 1 + floor(random() * length(alpha))::int, 1);
    end loop;
    exit when not exists (select 1 from courses_households where id = code);
  end loop;
  insert into courses_households (id, name, kind, created_by)
    values (code, btrim(hname), coalesce(nullif(hkind, ''), 'autre'), me);
  insert into courses_members (household, uid) values (code, me);
  return code;
end;
$$;

-- Renvoie le foyer rejoint, ou null si le code n'existe pas.
create or replace function public.courses_join(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  h jsonb;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select to_jsonb(x) into h from courses_households x where id = upper(btrim(code));
  if h is null then return null; end if;
  if (select count(*) from courses_members where household = h->>'id') >= 30 then raise exception 'household full'; end if;
  insert into courses_members (household, uid) values (h->>'id', me) on conflict do nothing;
  return h;
end;
$$;

create or replace function public.courses_rename(code text, hname text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not courses_is_member(code) then raise exception 'not a member'; end if;
  update courses_households set name = btrim(hname) where id = code;
end;
$$;

-- Le dernier membre qui part supprime le foyer et sa liste.
create or replace function public.courses_leave(code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from courses_members where household = code and uid = auth.uid();
  delete from courses_households h where h.id = code
    and not exists (select 1 from courses_members m where m.household = code);
end;
$$;

revoke all on function public.courses_create_household(text, text), public.courses_join(text),
  public.courses_rename(text, text), public.courses_leave(text) from public, anon;
grant execute on function public.courses_create_household(text, text), public.courses_join(text),
  public.courses_rename(text, text), public.courses_leave(text) to authenticated;

-- ---------- temps réel ----------

do $$
declare t text;
begin
  foreach t in array array['courses_profiles', 'courses_households', 'courses_members', 'courses_items', 'courses_purchases'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
