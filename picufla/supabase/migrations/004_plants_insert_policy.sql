-- Allow authenticated users to insert new plants into the catalog
create policy "Authenticated users can insert plants"
  on public.plants for insert
  to authenticated
  with check (true);
