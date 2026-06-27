alter table public.profiles
  drop column if exists bio,
  add column birthdate date;
