alter table public.profiles
  add column bio            text check (char_length(bio) <= 150),
  add column setup_complete boolean not null default false;
