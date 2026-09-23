-- Mise à jour d'une base déjà installée : thèmes de groupe, notifications de réactions,
-- réponses, nouveaux membres et messages. Peut être relancé sans risque.

-- 1. Thème d'un groupe
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
revoke all on function public.set_group_theme(text, jsonb) from public, anon;
grant execute on function public.set_group_theme(text, jsonb) to authenticated;

-- 2. Messages dans la conversation
create or replace function public.is_group_sub(c text) returns boolean
language sql immutable as $$
  select c ~ '^groups/[A-Z0-9]{6}/(photos|reactions|replies|days|messages)$';
$$;

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

-- 3. Notifications : réaction, réponse, message
create or replace function public.notify_reaction() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://alxensbjhfpktfnobvix.supabase.co/functions/v1/super-responder',
    body    := jsonb_build_object('type', case when new.coll like '%/reactions' then 'reaction' when new.coll like '%/messages' then 'message' else 'reply' end, 'coll', new.coll, 'id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
end;
$$;
drop trigger if exists docs_new_reaction on public.docs;
create trigger docs_new_reaction after insert on public.docs
  for each row when (new.coll like 'groups/%/reactions' or new.coll like 'groups/%/replies' or new.coll like 'groups/%/messages')
  execute function public.notify_reaction();

-- 4. Notifications : nouveau membre
create or replace function public.notify_join() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  m text;
begin
  for m in select jsonb_array_elements_text(new.data->'members')
           except select jsonb_array_elements_text(old.data->'members') loop
    perform net.http_post(
      url     := 'https://alxensbjhfpktfnobvix.supabase.co/functions/v1/super-responder',
      body    := jsonb_build_object('type', 'join', 'group', new.id, 'uid', m),
      headers := '{"Content-Type": "application/json"}'::jsonb);
  end loop;
  return new;
end;
$$;
drop trigger if exists docs_group_join on public.docs;
create trigger docs_group_join after update on public.docs
  for each row when (new.coll = 'groups' and new.data->'members' is distinct from old.data->'members')
  execute function public.notify_join();
