-- T5.2 Shared Grocery List Sync
-- Syncs grocery items across household (circle) members via Supabase Realtime.
--
-- Design notes:
-- - RLS uses the existing `is_circle_member` helper from the circles migration.
-- - Soft-delete via `deleted_at` mirrors the local SQLite pattern.
-- - `updated_at` is the conflict-resolution timestamp (last-write-wins for v1).
-- - Realtime is enabled so clients can subscribe to INSERT/UPDATE/DELETE events.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.grocery_items (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.circles(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 500),
  normalized_name text not null,
  quantity       text default '',
  unit           text default '',
  recipe_id      text,
  recipe_title   text,
  is_checked     boolean not null default false,
  created_by     uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- Index for fast household-scoped queries
create index if not exists grocery_items_household_idx
  on public.grocery_items (household_id)
  where deleted_at is null;

-- Index for conflict resolution ordering
create index if not exists grocery_items_updated_at_idx
  on public.grocery_items (updated_at);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.grocery_items enable row level security;

-- Revoke broad access; only policies below grant access.
revoke all on table public.grocery_items from anon, authenticated;
grant select, insert, update, delete on table public.grocery_items to authenticated;

-- SELECT: household members only
drop policy if exists grocery_items_select_members on public.grocery_items;
create policy grocery_items_select_members
  on public.grocery_items
  for select
  to authenticated
  using (public.is_circle_member(household_id, auth.uid()));

-- INSERT: household members only, must set created_by to self
drop policy if exists grocery_items_insert_members on public.grocery_items;
create policy grocery_items_insert_members
  on public.grocery_items
  for insert
  to authenticated
  with check (
    public.is_circle_member(household_id, auth.uid())
    and created_by = auth.uid()
  );

-- UPDATE: household members only
drop policy if exists grocery_items_update_members on public.grocery_items;
create policy grocery_items_update_members
  on public.grocery_items
  for update
  to authenticated
  using (public.is_circle_member(household_id, auth.uid()))
  with check (public.is_circle_member(household_id, auth.uid()));

-- DELETE: household members only (hard delete as a fallback; prefer soft-delete via updated_at)
drop policy if exists grocery_items_delete_members on public.grocery_items;
create policy grocery_items_delete_members
  on public.grocery_items
  for delete
  to authenticated
  using (public.is_circle_member(household_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Enable Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.grocery_items;
