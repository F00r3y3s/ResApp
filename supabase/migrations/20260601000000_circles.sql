-- T10.1 Private Household Circle
-- Tables, indexes, RLS policies, and SECURITY DEFINER RPCs for circle membership.
--
-- Design notes:
-- - v1 only supports `private` circles. The `privacy` column is a check-constrained
--   text so future values (e.g. 'invite-only') can be added without a schema break.
-- - Joins go through `join_circle_by_code` so a non-member cannot insert their own
--   `circle_members` row. The function runs with elevated privileges to bypass RLS,
--   but the function body verifies the invite code and uses `auth.uid()` so the
--   caller can only enroll themselves, never another user.
-- - Creation goes through `create_circle` so the `circles` row and the owner's
--   `circle_members` row are written atomically. RLS on `circles` requires
--   membership for SELECT, which means the owner needs the membership row to read
--   what they just created. Doing both in one RPC keeps that invariant.
-- - All policies were written to satisfy the negative tests in
--   supabase/tests/circles.rls.test.sql.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.circles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 60),
  privacy      text not null default 'private' check (privacy in ('private')),
  invite_code  text not null unique check (char_length(invite_code) between 6 and 16),
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id  uuid not null references public.circles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index if not exists circle_members_user_idx on public.circle_members (user_id);

-- ---------------------------------------------------------------------------
-- Membership predicate helper
-- ---------------------------------------------------------------------------
-- A SECURITY DEFINER helper avoids the RLS recursion that happens when the
-- circle_members policy itself queries circle_members.

create or replace function public.is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.circle_members
     where circle_id = p_circle_id
       and user_id   = p_user_id
  );
$$;

revoke all on function public.is_circle_member(uuid, uuid) from public;
grant execute on function public.is_circle_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.circles         enable row level security;
alter table public.circle_members  enable row level security;

-- Defensive: revoke broad table privileges. We only want clients to touch these
-- tables through the policies + RPCs below.
revoke all on table public.circles        from anon, authenticated;
revoke all on table public.circle_members from anon, authenticated;

grant select on table public.circles        to authenticated;
grant select on table public.circle_members to authenticated;
-- DELETE is allowed on circle_members for the "leave" / "remove" flows; the
-- policy below restricts which rows can actually be deleted.
grant delete on table public.circle_members to authenticated;

-- circles ------------------------------------------------------------------
drop policy if exists circles_select_members on public.circles;
create policy circles_select_members
  on public.circles
  for select
  to authenticated
  using (public.is_circle_member(id, auth.uid()));

-- No INSERT / UPDATE / DELETE policies exist on `circles`. Creation goes
-- through public.create_circle (SECURITY DEFINER). This is intentional: a
-- direct insert from a client would skip the membership write and orphan the
-- circle.

-- circle_members -----------------------------------------------------------
drop policy if exists circle_members_select_same_circle on public.circle_members;
create policy circle_members_select_same_circle
  on public.circle_members
  for select
  to authenticated
  using (public.is_circle_member(circle_id, auth.uid()));

-- The only direct mutation a client may perform is removing their own
-- membership row (leaving) or — if they are the circle owner — removing
-- another member.
drop policy if exists circle_members_delete_self_or_owner on public.circle_members;
create policy circle_members_delete_self_or_owner
  on public.circle_members
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
        from public.circle_members me
       where me.circle_id = circle_members.circle_id
         and me.user_id   = auth.uid()
         and me.role      = 'owner'
    )
  );

-- INSERT path is intentionally only available through public.join_circle_by_code.

-- ---------------------------------------------------------------------------
-- Invite code generator
-- ---------------------------------------------------------------------------

create or replace function public.generate_circle_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- ambiguous chars dropped
  candidate text;
  attempts  int := 0;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    if not exists (select 1 from public.circles where invite_code = candidate) then
      return candidate;
    end if;

    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'could_not_generate_invite_code';
    end if;
  end loop;
end;
$$;

revoke all on function public.generate_circle_invite_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_circle: atomic circle + owner membership
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because:
--   * the circles INSERT path is otherwise closed to clients (no INSERT policy)
--   * we need to write the owner's circle_members row in the same transaction
--     so RLS-protected SELECT immediately returns the new circle.
-- The function uses auth.uid() and refuses null callers, so service-role / cron
-- accounts cannot create circles "on behalf of" anyone.

create or replace function public.create_circle(p_name text)
returns public.circles
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name    text := nullif(btrim(p_name), '');
  v_circle  public.circles;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if v_name is null then
    raise exception 'name_required' using errcode = '22023';
  end if;

  if char_length(v_name) > 60 then
    raise exception 'name_too_long' using errcode = '22023';
  end if;

  insert into public.circles (name, invite_code, created_by)
  values (v_name, public.generate_circle_invite_code(), v_user_id)
  returning * into v_circle;

  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle.id, v_user_id, 'owner');

  return v_circle;
end;
$$;

revoke all on function public.create_circle(text) from public, anon;
grant execute on function public.create_circle(text) to authenticated;

-- ---------------------------------------------------------------------------
-- join_circle_by_code: looks up an invite code and inserts the caller as member
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because:
--   * `circle_members` has no INSERT policy for clients (we don't want a user
--     adding themselves to arbitrary circles).
--   * The function gates the INSERT behind a successful invite_code lookup and
--     pins user_id to auth.uid(), so the caller can only enroll themselves.

create or replace function public.join_circle_by_code(p_invite_code text)
returns public.circles
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code    text := upper(btrim(coalesce(p_invite_code, '')));
  v_circle  public.circles;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if char_length(v_code) < 6 or char_length(v_code) > 16 then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  select * into v_circle
    from public.circles
   where invite_code = v_code
   limit 1;

  if not found then
    raise exception 'invite_code_not_found' using errcode = 'P0002';
  end if;

  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle.id, v_user_id, 'member')
  on conflict (circle_id, user_id) do nothing;

  return v_circle;
end;
$$;

revoke all on function public.join_circle_by_code(text) from public, anon;
grant execute on function public.join_circle_by_code(text) to authenticated;
