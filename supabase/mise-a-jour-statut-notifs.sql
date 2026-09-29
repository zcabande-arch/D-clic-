-- Mise à jour : afficher dans l'app qui reçoit les notifications. Peut être relancé sans risque.

-- Qui, dans un groupe, a activé les notifications (au moins un appareil abonné) ?
-- Réservé aux membres du groupe ; ne révèle que le nombre d'appareils, jamais les abonnements.
create or replace function public.group_notif_status(code text) returns table(uid text, devices int)
language sql stable security definer set search_path = public as $$
  select m, (select count(*)::int from push_subs s where s.uid = m)
  from docs g, jsonb_array_elements_text(g.data->'members') m
  where g.coll = 'groups' and g.id = upper(code) and g.data->'members' ? (auth.uid())::text;
$$;
revoke all on function public.group_notif_status(text) from public, anon;
grant execute on function public.group_notif_status(text) to authenticated;
