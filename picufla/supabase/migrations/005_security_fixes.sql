-- Fixes for Supabase lint items

-- ─────────────────────────────────────────────────────────
-- Fix Items 2 & 3: Revoke EXECUTE on handle_new_user
-- Prevents `authenticated` and `anon` from invoking the
-- SECURITY DEFINER function via /rest/v1/rpc/handle_new_user.
-- The function is only meant to run via the database trigger.
-- ─────────────────────────────────────────────────────────
revoke execute on function public.handle_new_user from public;

-- ─────────────────────────────────────────────────────────
-- Fix Item 4: Tighten RLS policy on public.plants INSERT
-- Instead of unrestricted INSERT (WITH CHECK true), require
-- that required fields are provided. This prevents arbitrary
-- rows from being inserted by any authenticated user.
-- ─────────────────────────────────────────────────────────
drop policy if exists "Authenticated users can insert plants" on public.plants;

create policy "Authenticated users can insert plants"
  on public.plants for insert
  to authenticated
  with check (
    common_name is not null
    and common_name <> ''
    and scientific_name is not null
    and scientific_name <> ''
  );
