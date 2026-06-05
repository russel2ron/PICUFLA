-- Create the plant-images storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-images',
  'plant-images',
  false,
  5242880,   -- 5MB max
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Users can upload to their own folder only
create policy "Users can upload own plant images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'plant-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Users can view their own images only
create policy "Users can view own plant images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'plant-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Users can delete their own images
create policy "Users can delete own plant images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'plant-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
