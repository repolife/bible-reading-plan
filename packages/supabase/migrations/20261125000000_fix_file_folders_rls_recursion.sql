-- Fix infinite recursion in file_folders INSERT RLS policy and allow non-admins
-- to read their own file_permissions grants.
--
-- Fixes:
--   * "Can create folder" on public.file_folders queried public.file_folders
--     directly inside its WITH CHECK clause, causing Postgres to raise
--     "infinite recursion detected in policy for relation \"file_folders\""
--     even when creating a root folder (parent_id IS NULL).
--   * public.file_permissions had RLS enabled with only an admin policy, so
--     non-admins could never match EXISTS (SELECT 1 FROM public.file_permissions)
--     in folder/file SELECT or INSERT policies.
--
-- Rollback: drop policy "Users can view own file permissions" on
-- public.file_permissions, restore "Can create folder" and "Can upload file"
-- from 20260512000001_file_permissions.sql, and drop public.can_edit_folder(uuid).

CREATE OR REPLACE FUNCTION public.can_edit_folder(target_folder_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.file_folders f
      WHERE f.id = target_folder_id
        AND f.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.file_permissions p
      WHERE p.resource_type = 'folder'
        AND p.resource_id = target_folder_id
        AND p.user_id = auth.uid()
        AND p.can_edit = true
    )
$$;

REVOKE ALL ON FUNCTION public.can_edit_folder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_folder(uuid) TO authenticated;

-- Allow non-admins to read their own permission grants so view/edit policies work.
DROP POLICY IF EXISTS "Users can view own file permissions" ON public.file_permissions;
CREATE POLICY "Users can view own file permissions"
  ON public.file_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Replace self-referencing INSERT policy on file_folders
DROP POLICY IF EXISTS "Can create folder" ON public.file_folders;
CREATE POLICY "Can create folder"
  ON public.file_folders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      parent_id IS NULL
      OR public.can_edit_folder(parent_id)
    )
  );

-- Use the same helper for file_uploads INSERT policy
DROP POLICY IF EXISTS "Can upload file" ON public.file_uploads;
CREATE POLICY "Can upload file"
  ON public.file_uploads FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      folder_id IS NULL
      OR public.can_edit_folder(folder_id)
    )
  );
