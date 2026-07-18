-- Run this once in the Supabase SQL editor for the Food Log project.
-- It creates a public Storage bucket that the authenticated Food Log app can update.
-- The public JSON file can then be read by any chat or tool that can open a URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-log-public',
  'food-log-public',
  true,
  1048576,
  array['application/json']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = 1048576,
    allowed_mime_types = array['application/json']::text[];

alter table storage.objects enable row level security;

drop policy if exists "Food Log public database insert" on storage.objects;
drop policy if exists "Food Log public database update" on storage.objects;
drop policy if exists "Food Log public database delete" on storage.objects;

create policy "Food Log public database insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'food-log-public');

create policy "Food Log public database update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'food-log-public'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'food-log-public'
  and owner_id = auth.uid()::text
);

create policy "Food Log public database delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'food-log-public'
  and owner_id = auth.uid()::text
);
