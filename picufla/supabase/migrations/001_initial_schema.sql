-- ─────────────────────────────────────────────────────────
-- Enable required extensions
-- ─────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────
-- TABLE: profiles (extends auth.users)
-- ─────────────────────────────────────────────────────────
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  display_name          text not null default '',
  photo_url             text,
  auth_provider         text not null check (auth_provider in ('google', 'email')),
  created_at            timestamptz not null default now(),
  last_login_at         timestamptz not null default now(),
  notifications_enabled boolean not null default true,
  is_deleted            boolean not null default false,
  deleted_at            timestamptz
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Profile is created automatically on signup via trigger (see below)

-- ─────────────────────────────────────────────────────────
-- TABLE: plants (master catalog — shared, read-only for users)
-- ─────────────────────────────────────────────────────────
create table public.plants (
  id              uuid primary key default uuid_generate_v4(),
  common_name     text not null,
  scientific_name text not null unique,
  description     text not null default '',
  origin          text not null default '',
  care_watering   text not null default '',
  care_sunlight   text not null default '',
  care_soil       text not null default '',
  uses            text not null default '',
  image_url       text not null default '',
  created_at      timestamptz not null default now()
);

alter table public.plants enable row level security;

-- Authenticated users can read the master catalog
create policy "Authenticated users can read plants catalog"
  on public.plants for select
  to authenticated
  using (true);

-- Only service role (Edge Functions) can insert/update plants
-- No insert/update/delete policy for authenticated role = denied

-- ─────────────────────────────────────────────────────────
-- TABLE: user_plants
-- ─────────────────────────────────────────────────────────
create table public.user_plants (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  plant_id            uuid not null references public.plants(id),
  discovered_at       timestamptz not null default now(),
  location_lat        double precision,
  location_lng        double precision,
  location_label      text,
  confidence_score    double precision not null check (confidence_score between 0 and 1),
  captured_image_url  text not null,
  notes               text check (char_length(notes) <= 500),
  notes_updated_at    timestamptz,
  is_favorite         boolean not null default false,
  tags                text[] not null default '{}',
  is_deleted          boolean not null default false
);

create index idx_user_plants_user_id on public.user_plants(user_id);
create index idx_user_plants_scientific on public.plants(scientific_name);

alter table public.user_plants enable row level security;

create policy "Users can view own user_plants"
  on public.user_plants for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own user_plants"
  on public.user_plants for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own user_plants"
  on public.user_plants for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No hard delete policy — deletions are soft (is_deleted = true)

-- ─────────────────────────────────────────────────────────
-- TABLE: reminders
-- ─────────────────────────────────────────────────────────
create table public.reminders (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  user_plant_id       uuid not null references public.user_plants(id) on delete cascade,
  care_type           text not null check (care_type in ('water', 'fertilize', 'repot', 'custom')),
  custom_label        text,
  scheduled_at        timestamptz not null,
  is_recurring        boolean not null default false,
  recurring_interval  text check (recurring_interval in ('daily', 'weekly', 'monthly')),
  expo_push_token     text not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create index idx_reminders_user_id on public.reminders(user_id);

alter table public.reminders enable row level security;

create policy "Users can view own reminders"
  on public.reminders for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own reminders"
  on public.reminders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own reminders"
  on public.reminders for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own reminders"
  on public.reminders for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────
-- TABLE: identification_logs (written by Edge Function only)
-- ─────────────────────────────────────────────────────────
create table public.identification_logs (
  id                                  uuid primary key default uuid_generate_v4(),
  user_id                             uuid not null references auth.users(id) on delete cascade,
  image_storage_path                  text not null,
  identified_plant_scientific_name    text,
  confidence_score                    double precision check (confidence_score between 0 and 1),
  alternatives                        jsonb,
  was_accepted                        boolean not null default false,
  created_at                          timestamptz not null default now()
);

create index idx_id_logs_user_id on public.identification_logs(user_id);

alter table public.identification_logs enable row level security;

-- Users can read their own logs
create policy "Users can view own identification_logs"
  on public.identification_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users CANNOT insert directly — only the Edge Function (service role) inserts
-- No insert policy for authenticated role

-- ─────────────────────────────────────────────────────────
-- TABLE: rate_limits (managed by Edge Function)
-- ─────────────────────────────────────────────────────────
create table public.rate_limits (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  call_count  integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No user-accessible policies — only service role via Edge Function

-- ─────────────────────────────────────────────────────────
-- TABLE: deletion_audit_log (admin-only, no user policies)
-- ─────────────────────────────────────────────────────────
create table public.deletion_audit_log (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null,
  deletion_type text not null check (deletion_type in ('account', 'plant_data')),
  requested_at  timestamptz not null default now(),
  purge_after   timestamptz not null
);

alter table public.deletion_audit_log enable row level security;
-- No user-accessible policies — only service role

-- ─────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on auth.users signup
-- ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, photo_url, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'provider', 'email')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
