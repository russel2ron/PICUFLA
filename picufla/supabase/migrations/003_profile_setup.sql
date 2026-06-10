alter table public.profiles
  add column gender         text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  add column bio            text check (char_length(bio) <= 150),
  add column setup_complete boolean not null default false;
