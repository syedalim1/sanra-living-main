-- Project deletion goes through the staff-guarded server action.
-- The original media migration keeps RLS enabled and grants no client access.
GRANT DELETE ON TABLE public.supply_projects TO service_role;
