-- Mise à jour d'une base déjà installée : administrateur de groupe et « vu par ».
-- Peut être relancé sans risque.

create or replace function public.is_group_sub(c text) returns boolean
language sql immutable as $$
  select c ~ '^groups/[A-Z0-9]{6}/(photos|reactions|replies|days|messages|seen)$';
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
  -- Si l'administrateur part, le membre le plus ancien restant devient administrateur.
  update docs
     set data = jsonb_set(data, '{createdBy}', data->'members'->0)
   where coll = 'groups' and id = upper(code) and data->>'createdBy' = me
     and jsonb_array_length(data->'members') > 0;
end;
$$;

-- L'administrateur (créateur) du groupe peut en retirer un membre.
create or replace function public.remove_member(code text, member text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me text := (auth.uid())::text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if member = me then raise exception 'use leave_group'; end if;
  update docs
     set data = jsonb_set(data, '{members}',
           coalesce((select jsonb_agg(m) from jsonb_array_elements(data->'members') m where m <> to_jsonb(member)), '[]'::jsonb)),
         updated_at = now()
   where coll = 'groups' and id = upper(code) and data->>'createdBy' = me;
  if not found then raise exception 'not the group admin'; end if;
end;
$$;

revoke all on function public.remove_member(text, text) from public, anon;
grant execute on function public.remove_member(text, text) to authenticated;
