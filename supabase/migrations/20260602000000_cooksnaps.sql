-- T10.2 Share Cooksnap From Cooked Recipe
-- Table, indexes, RLS policies, and storage bucket for cooksnap sharing.
--
-- Design notes:
-- - Cooksnaps are `server-required` (privacy-contract.md): they need the circle
--   RLS boundary. No local-only fallback.
-- - Image upload requires internet. The image URI stays local until the user
--   explicitly taps "Share" (consent-before-upload pattern).
-- - RLS reuses the `is_circle_member` helper from the circles migration.
-- - Storage bucket `cooksnap-images` is scoped to circle membership.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.cooksnaps (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   text not null,
  circle_id   uuid not null references public.circles(id) on delete cascade,
  image_path  text not null,
  caption     text check (caption is null or char_length(caption) <= 200),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists cooksnaps_circle_created_idx
  on public.cooksnaps (circle_id, created_at desc);

create index if not exists cooksnaps_created_by_idx
  on public.cooksnaps (created_by);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.cooksnaps enable row level security;

-- Revoke broad privileges; only allow through policies.
revoke all on table public.cooksnaps from anon, authenticated;
grant select, insert on table public.cooksnaps to authenticated;

-- SELECT: only circle members can see cooksnaps in their circle.
drop policy if exists cooksnaps_select_circle_members on public.cooksnaps;
create policy cooksnaps_select_circle_members
  on public.cooksnaps
  for select
  to authenticated
  using (public.is_circle_member(circle_id, auth.uid()));

-- INSERT: only circle members can post cooksnaps to their circle.
-- The created_by must match the authenticated user (no impersonation).
drop policy if exists cooksnaps_insert_circle_members on public.cooksnaps;
create policy cooksnaps_insert_circle_members
  on public.cooksnaps
  for insert
  to authenticated
  with check (
    public.is_circle_member(circle_id, auth.uid())
    and created_by = auth.uid()
  );

-- No UPDATE or DELETE policies for v1. Cooksnaps are immutable once shared.

-- ---------------------------------------------------------------------------
-- Storage bucket: cooksnap-images
-- ---------------------------------------------------------------------------
-- Note: Supabase storage bucket creation is typically done via the dashboard
-- or supabase CLI. The policies below assume the bucket exists.
-- Bucket name: cooksnap-images
-- Public: false (images served through authenticated URLs)

-- Storage policy: authenticated users who are circle members can upload.
-- The upload path convention is: {user_id}/{timestamp}.{ext}
-- We validate that the path starts with the user's own ID.

insert into storage.buckets (id, name, public)
values ('cooksnap-images', 'cooksnap-images', false)
on conflict (id) do nothing;

-- Upload policy: user can only upload to their own folder.
drop policy if exists cooksnap_images_insert on storage.objects;
create policy cooksnap_images_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'cooksnap-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read policy: circle members can read images for cooksnaps in their circles.
-- We join through the cooksnaps table to verify circle membership.
drop policy if exists cooksnap_images_select on storage.objects;
create policy cooksnap_images_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'cooksnap-images'
    and exists (
      select 1
        from public.cooksnaps cs
       where cs.image_path = name
         and public.is_circle_member(cs.circle_id, auth.uid())
    )
  );
