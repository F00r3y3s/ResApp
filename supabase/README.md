# Supabase project for Family AI Kitchen

This folder holds the Postgres schema, RLS policies, and pgTAP tests that back
features which sync to a real database.

## T10.1 Private Household Circle

The first migration here, `20260601000000_circles.sql`, introduces:

- `public.circles` — circle row with `name`, `privacy` (`'private'` only in v1),
  `invite_code`, `created_by`, timestamps.
- `public.circle_members` — `(circle_id, user_id, role)` composite primary key.
- `public.is_circle_member(uuid, uuid)` — `SECURITY DEFINER` predicate used
  inside RLS policies to avoid recursion.
- `public.create_circle(text)` — `SECURITY DEFINER` RPC: inserts the circle row
  and the owner's `circle_members` row in the same transaction. Pinned to
  `auth.uid()` so a caller can only create circles for themselves.
- `public.join_circle_by_code(text)` — `SECURITY DEFINER` RPC: looks up an
  invite code and inserts the caller as a `member`. Pinned to `auth.uid()` so
  a caller can only enroll themselves.

RLS is enabled on both tables. Direct INSERT into `circles` and `circle_members`
is denied — clients must go through the RPCs. SELECT is gated by the
`is_circle_member` predicate. DELETE on `circle_members` is allowed for the
caller's own row or for any row in a circle they own.

## Running the RLS tests locally

You need Docker (or OrbStack) running to bring up the local Supabase stack.

```bash
# 1. Start the local stack (Postgres + Auth + PostgREST + Storage + Studio).
#    First run will pull the Docker images.
npx supabase start

# 2. Reset the local DB so all migrations in supabase/migrations are applied
#    against a clean schema.
npx supabase db reset

# 3. Run the pgTAP tests in supabase/tests.
npx supabase test db
```

Expected output: `# Looks like all tests succeeded` with 14 passing assertions
covering positive + negative RLS for create, join, leave, and direct INSERT
attempts.

If the tests fail, common causes:

- pgTAP missing — `npx supabase db reset` reinstalls it.
- Old containers — `npx supabase stop --no-backup && npx supabase start`.
- Migrations not picked up — confirm filenames in `supabase/migrations/` start
  with a sortable timestamp.

## Running against a remote project

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # apply migrations to the remote DB
npx supabase test db --linked # run the pgTAP suite against it
```

Never commit service-role keys, database passwords, or
`SUPABASE_DB_URL` values — see `docs/security/privacy-contract.md`.
