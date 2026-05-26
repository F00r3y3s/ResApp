-- T7.2 AI Gateway Backend Slice
-- Creates tables for server-side entitlement verification and AI usage tracking.
--
-- Design notes:
-- - `user_entitlements` is populated by RevenueCat webhooks (T11.1).
--   The AI gateway reads this table to verify premium status.
-- - `ai_usage` tracks per-user daily request counts for free-tier rate limiting.
--   Server-side enforcement ensures clients cannot bypass limits.
-- - Both tables use RLS: only the owning user can read their own rows.
--   Service-role (Edge Functions) bypasses RLS for writes.

-- ---------------------------------------------------------------------------
-- user_entitlements — server-side entitlement state (fed by RevenueCat webhook)
-- ---------------------------------------------------------------------------

create table if not exists public.user_entitlements (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  entitlement_id  text not null default 'premium',
  status          text not null default 'none' check (status in ('active', 'expired', 'none')),
  product_id      text,
  expires_at      timestamptz,
  will_renew      boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- RLS: users can read their own entitlement; writes come from service-role (webhooks).
alter table public.user_entitlements enable row level security;

revoke all on table public.user_entitlements from anon, authenticated;
grant select on table public.user_entitlements to authenticated;

drop policy if exists user_entitlements_select_own on public.user_entitlements;
create policy user_entitlements_select_own
  on public.user_entitlements
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ai_usage — per-user daily AI request counter (server-side rate limiting)
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null default current_date,
  request_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint ai_usage_user_date_unique unique (user_id, usage_date)
);

-- Index for fast lookup by user + date
create index if not exists ai_usage_user_date_idx
  on public.ai_usage (user_id, usage_date);

-- RLS: users can read their own usage; writes come from service-role (Edge Function).
alter table public.ai_usage enable row level security;

revoke all on table public.ai_usage from anon, authenticated;
grant select on table public.ai_usage to authenticated;

drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own
  on public.ai_usage
  for select
  to authenticated
  using (user_id = auth.uid());
