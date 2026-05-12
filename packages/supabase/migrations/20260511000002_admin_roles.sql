-- Add admin flag and directory visibility to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_from_directory boolean DEFAULT false;

-- Security definer function — bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()
$$;

-- Drop old single-user update policy
DROP POLICY IF EXISTS "authenticated_update_profile" ON public.profiles;

-- Admins can update any profile row; users can update their own
CREATE POLICY "authenticated_update_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.current_user_is_admin());

-- Trigger: non-admins cannot modify servant_roles, is_admin, or hidden_from_directory
CREATE OR REPLACE FUNCTION public.restrict_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    IF NEW.servant_roles IS DISTINCT FROM OLD.servant_roles THEN
      RAISE EXCEPTION 'Only admins can update servant roles';
    END IF;
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Only admins can change admin status';
    END IF;
    IF NEW.hidden_from_directory IS DISTINCT FROM OLD.hidden_from_directory THEN
      RAISE EXCEPTION 'Only admins can change directory visibility';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_admin_fields_trigger ON public.profiles;
CREATE TRIGGER restrict_admin_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.restrict_admin_fields();
