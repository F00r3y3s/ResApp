-- T7.2 Atomic rate-limit increment RPC
-- Used by the ai-gateway Edge Function to atomically check + increment usage.
-- Prevents TOCTOU race conditions when multiple requests arrive simultaneously.

create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_date date,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  -- Upsert: insert with count=1 or increment existing
  insert into public.ai_usage (user_id, usage_date, request_count, updated_at)
  values (p_user_id, p_date, 1, now())
  on conflict (user_id, usage_date)
  do update set
    request_count = ai_usage.request_count + 1,
    updated_at = now()
  returning request_count into v_count;

  -- Check if the new count exceeds the limit
  if v_count > p_limit then
    -- Roll back the increment (we went over)
    update public.ai_usage
    set request_count = request_count - 1, updated_at = now()
    where user_id = p_user_id and usage_date = p_date;

    return jsonb_build_object('allowed', false, 'request_count', v_count - 1);
  end if;

  return jsonb_build_object('allowed', true, 'request_count', v_count);
end;
$$;

-- Only service-role can call this (Edge Functions use service-role key)
revoke execute on function public.increment_ai_usage from anon, authenticated;
