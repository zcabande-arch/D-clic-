-- Mons en fête : l'app du comité des fêtes de Mons, dans le même projet Supabase que Déclic.
-- À coller une seule fois dans Supabase › SQL Editor › New query, puis « Run ».
-- Le script peut être relancé sans risque. Il ne touche pas aux tables des autres applications.
--
--   mons_profils      : un profil par bénévole (nom, code d'accès à 6 caractères, admin ou non)
--   mons_sessions     : quel appareil (compte anonyme Supabase) est connecté à quel profil
--   mons_docs         : événements, créneaux du planning, échéances et publications Insta (données en JSON)
--   mons_inscriptions : qui s'est inscrit à quel créneau
--   mons_presence     : « je suis là » / « pas là » de chaque bénévole pour chaque événement
--
-- Personne ne voit rien sans avoir entré un code. Les admins voient et modifient tout ;
-- les bénévoles voient les événements et le planning, s'inscrivent aux créneaux et donnent leur présence.

create table if not exists public.mons_profils (
  id         text        primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  nom        text        not null check (char_length(nom) between 1 and 60),
  code       text        not null unique check (code ~ '^[A-Z0-9]{6}$'),
  is_admin   boolean     not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mons_sessions (
  uid       uuid        primary key references auth.users (id) on delete cascade,
  profil_id text        not null references public.mons_profils (id) on delete cascade,
  linked_at timestamptz not null default now()
);
create index if not exists mons_sessions_profil_idx on public.mons_sessions (profil_id);

create table if not exists public.mons_docs (
  coll       text        not null check (coll in ('events', 'planning', 'tasks', 'posts')),
  id         text        not null check (char_length(id) between 1 and 120),
  data       jsonb       not null default '{}'::jsonb check (pg_column_size(data) < 20000),
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);

create table if not exists public.mons_inscriptions (
  slot_id    text        not null,
  profil_id  text        not null references public.mons_profils (id) on delete cascade,
  event_id   text        not null default '',
  created_at timestamptz not null default now(),
  primary key (slot_id, profil_id)
);

create table if not exists public.mons_presence (
  profil_id text        not null references public.mons_profils (id) on delete cascade,
  event_id  text        not null,
  valeur    text        not null check (valeur in ('oui', 'non')),
  updated_at timestamptz not null default now(),
  primary key (profil_id, event_id)
);

-- ---------- fonctions d'aide (security definer : évitent la récursion des règles) ----------

create or replace function public.mons_me() returns text
language sql stable security definer set search_path = public as $$
  select profil_id from mons_sessions where uid = auth.uid();
$$;

create or replace function public.mons_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mons_sessions s join mons_profils p on p.id = s.profil_id
                 where s.uid = auth.uid() and p.is_admin);
$$;

create or replace function public.mons_new_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  a constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(a, 1 + floor(random() * length(a))::int, 1);
    end loop;
    exit when not exists (select 1 from mons_profils where code = c);
  end loop;
  return c;
end $$;

alter table public.mons_profils alter column code set default public.mons_new_code();

-- ---------- règles d'accès ----------

alter table public.mons_profils      enable row level security;
alter table public.mons_sessions     enable row level security;
alter table public.mons_docs         enable row level security;
alter table public.mons_inscriptions enable row level security;
alter table public.mons_presence     enable row level security;

drop policy if exists mons_profils_admin on public.mons_profils;
create policy mons_profils_admin on public.mons_profils for all to authenticated
  using (public.mons_is_admin()) with check (public.mons_is_admin());

drop policy if exists mons_sessions_select on public.mons_sessions;
create policy mons_sessions_select on public.mons_sessions for select to authenticated
  using (uid = auth.uid());

-- Bénévoles : événements et planning. Admins : tout, en lecture et en écriture.
drop policy if exists mons_docs_select on public.mons_docs;
create policy mons_docs_select on public.mons_docs for select to authenticated
  using (public.mons_is_admin() or (public.mons_me() is not null and coll in ('events', 'planning')));
drop policy if exists mons_docs_write on public.mons_docs;
create policy mons_docs_write on public.mons_docs for all to authenticated
  using (public.mons_is_admin()) with check (public.mons_is_admin());

drop policy if exists mons_inscriptions_select on public.mons_inscriptions;
create policy mons_inscriptions_select on public.mons_inscriptions for select to authenticated
  using (public.mons_me() is not null);
drop policy if exists mons_inscriptions_insert on public.mons_inscriptions;
create policy mons_inscriptions_insert on public.mons_inscriptions for insert to authenticated
  with check (profil_id = public.mons_me() or public.mons_is_admin());
drop policy if exists mons_inscriptions_delete on public.mons_inscriptions;
create policy mons_inscriptions_delete on public.mons_inscriptions for delete to authenticated
  using (profil_id = public.mons_me() or public.mons_is_admin());

-- Chacun voit et donne sa propre présence ; seuls les admins voient celle des autres.
drop policy if exists mons_presence_select on public.mons_presence;
create policy mons_presence_select on public.mons_presence for select to authenticated
  using (profil_id = public.mons_me() or public.mons_is_admin());
drop policy if exists mons_presence_insert on public.mons_presence;
create policy mons_presence_insert on public.mons_presence for insert to authenticated
  with check (profil_id = public.mons_me());
drop policy if exists mons_presence_update on public.mons_presence;
create policy mons_presence_update on public.mons_presence for update to authenticated
  using (profil_id = public.mons_me()) with check (profil_id = public.mons_me());
drop policy if exists mons_presence_delete on public.mons_presence;
create policy mons_presence_delete on public.mons_presence for delete to authenticated
  using (profil_id = public.mons_me());

grant select, insert, update, delete on public.mons_profils, public.mons_docs, public.mons_inscriptions, public.mons_presence to authenticated;
grant select on public.mons_sessions to authenticated;

-- ---------- règles métier ----------

-- Un créneau avec un nombre de places ne prend pas plus d'inscrits que prévu.
create or replace function public.mons_check_places() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n_places int;
  n_inscrits int;
begin
  select nullif(data->>'places', '')::int into n_places from mons_docs where coll = 'planning' and id = new.slot_id;
  if not found then
    raise exception 'unknown slot';
  end if;
  perform pg_advisory_xact_lock(hashtext('mons-slot:' || new.slot_id));
  select count(*) into n_inscrits from mons_inscriptions where slot_id = new.slot_id;
  if n_places is not null and n_inscrits >= n_places then
    raise exception 'slot full';
  end if;
  return new;
end $$;
drop trigger if exists mons_inscriptions_places on public.mons_inscriptions;
create trigger mons_inscriptions_places before insert on public.mons_inscriptions
  for each row execute function public.mons_check_places();

-- Supprimer un événement retire ses créneaux, échéances, publications, inscriptions et présences ;
-- supprimer un créneau retire ses inscriptions.
create or replace function public.mons_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.coll = 'events' then
    delete from mons_docs where coll in ('planning', 'tasks', 'posts') and data->>'eventId' = old.id;
    delete from mons_presence where event_id = old.id;
  elsif old.coll = 'planning' then
    delete from mons_inscriptions where slot_id = old.id;
  end if;
  return old;
end $$;
drop trigger if exists mons_docs_cleanup on public.mons_docs;
create trigger mons_docs_cleanup after delete on public.mons_docs
  for each row execute function public.mons_cleanup();

-- ---------- connexion par code ----------

-- Vrai tant qu'aucun admin n'existe : l'app propose alors de créer le premier.
create or replace function public.mons_needs_setup() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from mons_profils where is_admin);
$$;

-- Le profil connecté sur cet appareil (ou rien).
create or replace function public.mons_whoami() returns table (id text, nom text, is_admin boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nom, p.is_admin from mons_sessions s join mons_profils p on p.id = s.profil_id where s.uid = auth.uid();
$$;

create or replace function public.mons_login(p_code text) returns table (id text, nom text, is_admin boolean)
language plpgsql security definer set search_path = public as $$
declare
  pid text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select p.id into pid from mons_profils p where p.code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  if pid is null then
    perform pg_sleep(1); -- freine qui essaierait les codes un par un
    raise exception 'unknown code';
  end if;
  insert into mons_sessions (uid, profil_id) values (auth.uid(), pid)
    on conflict (uid) do update set profil_id = excluded.profil_id, linked_at = now();
  return query select p.id, p.nom, p.is_admin from mons_profils p where p.id = pid;
end $$;

create or replace function public.mons_logout() returns void
language sql security definer set search_path = public as $$
  delete from mons_sessions where uid = auth.uid();
$$;

-- Premier lancement : crée le premier admin et le connecte. Ne marche plus dès qu'un admin existe.
create or replace function public.mons_setup(p_id text, p_nom text) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  perform pg_advisory_xact_lock(hashtext('mons-setup'));
  if exists (select 1 from mons_profils where is_admin) then
    raise exception 'already set up';
  end if;
  insert into mons_profils (id, nom, is_admin) values (p_id, p_nom, true) returning code into c;
  insert into mons_sessions (uid, profil_id) values (auth.uid(), p_id)
    on conflict (uid) do update set profil_id = excluded.profil_id, linked_at = now();
  return c;
end $$;

-- Les noms des bénévoles (sans les codes), pour afficher qui tient quel créneau.
create or replace function public.mons_noms() returns table (id text, nom text, is_admin boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nom, p.is_admin from mons_profils p where public.mons_me() is not null;
$$;

revoke all on function public.mons_needs_setup(), public.mons_whoami(), public.mons_login(text), public.mons_logout(),
  public.mons_setup(text, text), public.mons_noms() from public, anon;
grant execute on function public.mons_needs_setup(), public.mons_whoami(), public.mons_login(text), public.mons_logout(),
  public.mons_setup(text, text), public.mons_noms() to authenticated;

-- ---------- temps réel ----------

do $$
declare t text;
begin
  foreach t in array array['mons_profils', 'mons_docs', 'mons_inscriptions', 'mons_presence'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
