-- pgTAP RLS tests for T10.1 Private Household Circle.
--
-- Run via: npx supabase test db
--
-- Setup expectations:
--   * `npx supabase db reset` was run, so the migration in
--     supabase/migrations/20260601000000_circles.sql has been applied.
--   * pgTAP is installed (the supabase CLI installs it automatically into the
--     local stack on first run).

begin;

create extension if not exists pgtap;

-- We exercise auth.uid()/auth.role() by impersonating users via SET LOCAL.
-- This mirrors how the Supabase docs recommend testing RLS without spinning up
-- a full GoTrue session.

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

-- Users A and B are stable UUIDs so the test is deterministic.
insert into auth.users (id, instance_id, email, aud, role, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-000000000000',
   'user-a@test.local', 'authenticated', 'authenticated', now(), now()),
  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-000000000000',
   'user-b@test.local', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

-- Helper: become a specific authenticated user. Mirrors what PostgREST does
-- per request when serving a JWT.
create or replace function public.test_become(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text,
                     true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Plan
-- ---------------------------------------------------------------------------

select plan(14);

-- ---------------------------------------------------------------------------
-- 1. User A creates a circle via the RPC.
-- ---------------------------------------------------------------------------

select public.test_become('11111111-1111-1111-1111-111111111111');

select isnt(
  (select id from public.create_circle('Alpha Family')),
  null,
  'create_circle returns a circle row for the authenticated caller'
);

-- Capture the new circle for later assertions.
do $$
declare
  v_id uuid;
begin
  select id into v_id from public.circles where name = 'Alpha Family' limit 1;
  perform set_config('test.circle_id', v_id::text, false);
end;
$$;

select is(
  (select count(*)::int
     from public.circles
    where id = current_setting('test.circle_id')::uuid),
  1,
  'User A can SELECT the circle they just created'
);

select is(
  (select count(*)::int
     from public.circle_members
    where circle_id = current_setting('test.circle_id')::uuid
      and user_id   = '11111111-1111-1111-1111-111111111111'
      and role      = 'owner'),
  1,
  'create_circle wrote an owner row for User A'
);

select is(
  (select char_length(invite_code) between 6 and 16
     from public.circles
    where id = current_setting('test.circle_id')::uuid),
  true,
  'create_circle generated an invite code of acceptable length'
);

-- ---------------------------------------------------------------------------
-- 2. User B (not invited) cannot read User A's circle data.
-- ---------------------------------------------------------------------------

select public.test_become('22222222-2222-2222-2222-222222222222');

select is(
  (select count(*)::int
     from public.circles
    where id = current_setting('test.circle_id')::uuid),
  0,
  'Non-member User B sees zero rows when SELECTing User A''s circle'
);

select is(
  (select count(*)::int
     from public.circle_members
    where circle_id = current_setting('test.circle_id')::uuid),
  0,
  'Non-member User B sees zero rows on circle_members for User A''s circle'
);

-- ---------------------------------------------------------------------------
-- 3. User B cannot insert themselves directly into circle_members.
-- ---------------------------------------------------------------------------

select throws_ok(
  $$
    insert into public.circle_members (circle_id, user_id, role)
    values (
      current_setting('test.circle_id')::uuid,
      '22222222-2222-2222-2222-222222222222',
      'member'
    )
  $$,
  '42501',
  null,
  'Direct INSERT into circle_members is denied for non-members'
);

-- ---------------------------------------------------------------------------
-- 4. Direct INSERT into circles is denied (no INSERT policy).
-- ---------------------------------------------------------------------------

select throws_ok(
  $$
    insert into public.circles (name, invite_code, created_by)
    values ('Sneaky', 'ZZZZZZZZ', '22222222-2222-2222-2222-222222222222')
  $$,
  '42501',
  null,
  'Direct INSERT into circles is denied'
);

-- ---------------------------------------------------------------------------
-- 5. join_circle_by_code with a wrong code does not add a membership.
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.join_circle_by_code('NOTREAL1') $$,
  'P0002',
  null,
  'join_circle_by_code raises invite_code_not_found for an unknown code'
);

select is(
  (select count(*)::int
     from public.circle_members
    where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'No membership row was inserted for User B after the bad code attempt'
);

-- ---------------------------------------------------------------------------
-- 6. join_circle_by_code with the right code lets User B in.
-- ---------------------------------------------------------------------------

-- Read the invite code as User A (who is allowed to read the row).
select public.test_become('11111111-1111-1111-1111-111111111111');

do $$
declare
  v_code text;
begin
  select invite_code into v_code
    from public.circles
   where id = current_setting('test.circle_id')::uuid;
  perform set_config('test.invite_code', v_code, false);
end;
$$;

select public.test_become('22222222-2222-2222-2222-222222222222');

select isnt(
  (select id from public.join_circle_by_code(current_setting('test.invite_code'))),
  null,
  'join_circle_by_code with the correct code returns the circle for User B'
);

select is(
  (select count(*)::int
     from public.circles
    where id = current_setting('test.circle_id')::uuid),
  1,
  'After joining, User B can SELECT the circle row'
);

-- User B should now see both members.
select is(
  (select count(*)::int
     from public.circle_members
    where circle_id = current_setting('test.circle_id')::uuid),
  2,
  'After joining, User B can SELECT both member rows'
);

-- ---------------------------------------------------------------------------
-- 7. User B leaves and loses visibility again.
-- ---------------------------------------------------------------------------

delete from public.circle_members
 where circle_id = current_setting('test.circle_id')::uuid
   and user_id   = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int
     from public.circles
    where id = current_setting('test.circle_id')::uuid),
  0,
  'After leaving, User B can no longer SELECT User A''s circle'
);

select * from finish();

rollback;
