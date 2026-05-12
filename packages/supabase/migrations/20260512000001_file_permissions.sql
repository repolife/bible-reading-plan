-- Add visibility to folders and files (default: everyone = current open behavior)
ALTER TABLE public.file_folders
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'everyone'
  CHECK (visibility IN ('everyone', 'restricted'));

ALTER TABLE public.file_uploads
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'everyone'
  CHECK (visibility IN ('everyone', 'restricted'));

-- Per-resource permission grants
CREATE TABLE IF NOT EXISTS public.file_permissions (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type text        NOT NULL CHECK (resource_type IN ('folder', 'file')),
  resource_id   uuid        NOT NULL,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view      boolean     NOT NULL DEFAULT true,
  can_edit      boolean     NOT NULL DEFAULT false,
  granted_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (resource_type, resource_id, user_id)
);

ALTER TABLE public.file_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can read and write all permissions
CREATE POLICY "Admins manage file permissions"
  ON public.file_permissions FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Drop old open SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view folders" ON public.file_folders;
DROP POLICY IF EXISTS "Authenticated users can view files"   ON public.file_uploads;

-- Folders: visible when public, or user is creator/admin, or has explicit view grant
CREATE POLICY "Can view folder"
  ON public.file_folders FOR SELECT TO authenticated
  USING (
    visibility = 'everyone'
    OR created_by = auth.uid()
    OR public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.file_permissions
      WHERE resource_type = 'folder'
        AND resource_id = file_folders.id
        AND user_id = auth.uid()
        AND can_view = true
    )
  );

-- Files: same logic
CREATE POLICY "Can view file"
  ON public.file_uploads FOR SELECT TO authenticated
  USING (
    visibility = 'everyone'
    OR created_by = auth.uid()
    OR public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.file_permissions
      WHERE resource_type = 'file'
        AND resource_id = file_uploads.id
        AND user_id = auth.uid()
        AND can_view = true
    )
  );

-- Drop old open INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create folders" ON public.file_folders;
DROP POLICY IF EXISTS "Authenticated users can upload files"   ON public.file_uploads;

-- Folders: can create in root, or in a folder you own/have edit access to
CREATE POLICY "Can create folder"
  ON public.file_folders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      parent_id IS NULL
      OR public.current_user_is_admin()
      OR EXISTS (
        SELECT 1 FROM public.file_folders f
        WHERE f.id = parent_id AND f.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.file_permissions
        WHERE resource_type = 'folder'
          AND resource_id = parent_id
          AND user_id = auth.uid()
          AND can_edit = true
      )
    )
  );

-- Files: can upload to root, or to a folder you own/have edit access to
CREATE POLICY "Can upload file"
  ON public.file_uploads FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      folder_id IS NULL
      OR public.current_user_is_admin()
      OR EXISTS (
        SELECT 1 FROM public.file_folders f
        WHERE f.id = folder_id AND f.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.file_permissions
        WHERE resource_type = 'folder'
          AND resource_id = folder_id
          AND user_id = auth.uid()
          AND can_edit = true
      )
    )
  );

-- Admin-only UPDATE to change visibility
CREATE POLICY "Admin update folder"
  ON public.file_folders FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Admin update file"
  ON public.file_uploads FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
