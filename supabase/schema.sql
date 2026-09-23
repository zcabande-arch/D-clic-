-- Déclic : schéma Supabase.
-- À coller une seule fois dans Supabase › SQL Editor › New query, puis « Run ».
-- Le script peut être relancé sans risque.
--
-- Chemins de documents utilisés par l'application :
--   profiles/{uid}
--   groups/{code}
--   groups/{code}/{photos|reactions|replies|days|messages}/{id}

create table if not exists public.docs (
  coll       text        not null,
  id         text        not null,
  data       jsonb       not null,
  grp        text generated always as (
               case when coll = 'groups' then id
                    when coll like 'groups/%' then split_part(coll, '/', 2) end) stored,
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists docs_grp_idx on public.docs (grp);
alter table public.docs enable row level security;

-- ---------- fonctions d'aide (security definer : évitent la récursion des règles) ----------

create or replace function public.is_member(g text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from docs
    where coll = 'groups' and id = g and data->'members' ? (auth.uid())::text);
$$;

create or replace function public.shares_group(other text) returns boolean
language sql stable security definer set search_path = public as $$
  select other = (auth.uid())::text or exists (
    select 1 from docs
    where coll = 'groups'
      and data->'members' ? (auth.uid())::text
      and data->'members' ? other);
$$;

-- Les images doivent venir du stockage Supabase de l'application.
create or replace function public.media_ok(d jsonb) returns boolean
language sql immutable as $$
  select (coalesce(d->>'img', '') = '' or (d->>'img') like '%/storage/v1/object/public/media/%')
     and (coalesce(d->>'avatar', '') = '' or (d->>'avatar') like '%/storage/v1/object/public/media/%');
$$;

create or replace function public.is_group_sub(c text) returns boolean
language sql immutable as $$
  select c ~ '^groups/[A-Z0-9]{6}/(photos|reactions|replies|days|messages)$';
$$;

-- ---------- règles d'accès ----------

drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs for select to authenticated using (
  case
    when coll = 'profiles' then shares_group(id)
    -- On lit la liste des membres sur la ligne elle-même : indispensable pour qu'un groupe
    -- puisse être créé par un « upsert » (Postgres vérifie la lecture de la nouvelle ligne).
    when coll = 'groups'   then data->'members' ? (auth.uid())::text
    when is_group_sub(coll) then is_member(grp)
    else false
  end);

drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs for insert to authenticated with check (
  pg_column_size(data) < 20000 and media_ok(data) and
  case
    when coll = 'profiles' then
      id = (auth.uid())::text
      and jsonb_typeof(data->'name') = 'string'
      and char_length(data->>'name') between 1 and 30
    when coll = 'groups' then
      id ~ '^[A-Z0-9]{6}$'
      and data->'members' = jsonb_build_array((auth.uid())::text)
      and data->>'createdBy' = (auth.uid())::text
      and char_length(data->>'name') between 1 and 40
    when is_group_sub(coll) then
      is_member(grp)
      and data->>'uid' = (auth.uid())::text
      and jsonb_typeof(data->'date') = 'string'
      and (coll like '%/replies' or coll like '%/messages' or right(id, 37) = '_' || (auth.uid())::text)
      and (coll not like '%/messages' or char_length(data->>'text') between 1 and 500)
    else false
  end);

-- Les groupes ne se modifient que par join_group / leave_group ci-dessous.
drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs for update to authenticated
using (
  case
    when coll = 'profiles'  then id = (auth.uid())::text
    when is_group_sub(coll) then is_member(grp) and data->>'uid' = (auth.uid())::text
    else false
  end)
with check (
  pg_column_size(data) < 20000 and media_ok(data) and
  case
    when coll = 'profiles' then
      id = (auth.uid())::text
      and jsonb_typeof(data->'name') = 'string'
      and char_length(data->>'name') between 1 and 30
    when is_group_sub(coll) then
      is_member(grp) and data->>'uid' = (auth.uid())::text
    else false
  end);

drop policy if exists docs_delete on public.docs;
create policy docs_delete on public.docs for delete to authenticated using (
  is_group_sub(coll) and is_member(grp) and data->>'uid' = (auth.uid())::text);

grant select, insert, update, delete on public.docs to authenticated, service_role;

-- ---------- rejoindre / quitter un groupe ----------

create or replace function public.join_group(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me text := (auth.uid())::text;
  g jsonb;
begin
  if me is null then raise exception 'not authenticated'; end if;
  update docs
     set data = jsonb_set(data, '{members}', (data->'members') || to_jsonb(me)), updated_at = now()
   where coll = 'groups' and id = upper(code) and not (data->'members' ? me);
  select data into g from docs where coll = 'groups' and id = upper(code);
  return g;  -- null si le code n'existe pas
end;
$$;

create or replace function public.leave_group(code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me text := (auth.uid())::text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  update docs
     set data = jsonb_set(data, '{members}',
           coalesce((select jsonb_agg(m) from jsonb_array_elements(data->'members') m where m <> to_jsonb(me)), '[]'::jsonb)),
         updated_at = now()
   where coll = 'groups' and id = upper(code);
end;
$$;

-- Thème d'un groupe : un thème prêt à l'emploi ({"preset": "rose-bleu"}) ou une photo de fond
-- ({"image": "<url du stockage media>"}) ; null revient au thème par défaut. Tout membre peut le changer.
create or replace function public.set_group_theme(code text, theme jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not is_member(upper(code)) then raise exception 'not a member'; end if;
  if theme is not null and not (
       (theme ?& array['preset'] and not theme ? 'image' and theme->>'preset' ~ '^[a-z-]{1,30}$')
    or (theme ?& array['image'] and not theme ? 'preset' and theme->>'image' like '%/storage/v1/object/public/media/%')
  ) then raise exception 'invalid theme'; end if;
  update docs
     set data = case when theme is null then data - 'theme' else jsonb_set(data, '{theme}', theme) end,
         updated_at = now()
   where coll = 'groups' and id = upper(code);
end;
$$;

revoke all on function public.join_group(text), public.leave_group(text), public.set_group_theme(text, jsonb) from public, anon;
grant execute on function public.join_group(text), public.leave_group(text), public.set_group_theme(text, jsonb) to authenticated;

-- ---------- temps réel ----------

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- ---------- stockage des photos ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 2000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'media' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated using (
  bucket_id = 'media' and (storage.foldername(name))[1] = (auth.uid())::text);
