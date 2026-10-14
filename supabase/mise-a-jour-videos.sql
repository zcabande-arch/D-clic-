-- Déclic : autoriser les vidéos courtes à la place des photos.
-- À coller une fois dans Supabase › SQL Editor › New query, puis « Run ».

-- 1) Le stockage accepte aussi les vidéos (25 Mo maximum par fichier).
update storage.buckets
set file_size_limit = 25000000,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'media';

-- 2) Le lien de la vidéo doit, comme les images, venir du stockage de l'application.
create or replace function public.media_ok(d jsonb) returns boolean
language sql immutable as $$
  select (coalesce(d->>'img', '') = '' or (d->>'img') like '%/storage/v1/object/public/media/%')
     and (coalesce(d->>'avatar', '') = '' or (d->>'avatar') like '%/storage/v1/object/public/media/%')
     and (coalesce(d->>'video', '') = '' or (d->>'video') like '%/storage/v1/object/public/media/%');
$$;
