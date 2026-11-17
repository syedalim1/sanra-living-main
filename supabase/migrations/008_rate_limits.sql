-- ==============================================================================
-- SANRA LIVING | Shared serverless-safe rate limits
-- Database Migration: 008_rate_limits.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INT NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies. Service-role/function access only.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_seconds INT,
  p_limit INT
)
RETURNS TABLE(allowed BOOLEAN, current_count INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Opportunistic cleanup: no cron required.
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 day'
    AND random() < 0.05;

  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
        THEN now()
      ELSE public.rate_limits.window_start
    END
  RETURNING public.rate_limits.count INTO v_count;

  RETURN QUERY SELECT v_count <= p_limit, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;
-- Content hardening: approved public material labels only.
UPDATE public.configurator_options
SET group_label = '100% Seasoned Grade-A Kerala Rubberwood'
WHERE option_group = 'TOP_MATERIAL'
  AND option_code LIKE 'RUBBER_%';

UPDATE public.configurator_options
SET group_label = '18mm Export-Grade Krishnagiri Granite'
WHERE option_group = 'TOP_MATERIAL'
  AND option_code LIKE 'GRANITE_%';