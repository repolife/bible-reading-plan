-- Harden privileged profile fields before relying on is_admin server-side.
--
-- Fixes:
--   * restrict_admin_fields only ran BEFORE UPDATE, so a user without a profile
--     row could INSERT one with is_admin = true via the self-insert policy.
--   * current_user_is_admin had no pinned search_path and returned NULL (not
--     false) for callers without a profile row.
--   * Any admin could grant is_admin through the client API. Admin status is now
--     changed only by trusted server roles (service_role / direct SQL).
--
-- Rollback: re-run 20260511000002_admin_roles.sql's function and trigger
-- definitions and drop restrict_admin_fields_insert_trigger.

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  )
$$;

-- True for requests made with an end-user JWT (anon or authenticated). Server
-- roles (service_role key, postgres, dashboard SQL) carry no such claim.
CREATE OR REPLACE FUNCTION public.is_client_request()
RETURNS boolean LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.role(), '') IN ('anon', 'authenticated')
$$;

CREATE OR REPLACE FUNCTION public.restrict_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_client_request() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_admin, false) THEN
      RAISE EXCEPTION 'Only trusted server roles can change admin status';
    END IF;
    IF COALESCE(array_length(NEW.servant_roles, 1), 0) > 0 THEN
      RAISE EXCEPTION 'Only admins can update servant roles';
    END IF;
    IF COALESCE(NEW.hidden_from_directory, false) THEN
      RAISE EXCEPTION 'Only admins can change directory visibility';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Only trusted server roles can change admin status';
  END IF;

  IF NOT public.current_user_is_admin() THEN
    IF NEW.servant_roles IS DISTINCT FROM OLD.servant_roles THEN
      RAISE EXCEPTION 'Only admins can update servant roles';
    END IF;
    IF NEW.hidden_from_directory IS DISTINCT FROM OLD.hidden_from_directory THEN
      RAISE EXCEPTION 'Only admins can change directory visibility';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_admin_fields_insert_trigger ON public.profiles;
CREATE TRIGGER restrict_admin_fields_insert_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.restrict_admin_fields();
