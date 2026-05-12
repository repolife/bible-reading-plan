-- Folders (nested hierarchy via parent_id self-reference)
CREATE TABLE IF NOT EXISTS public.file_folders (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  parent_id  uuid        REFERENCES public.file_folders(id) ON DELETE CASCADE,
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view folders"
  ON public.file_folders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create folders"
  ON public.file_folders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or admin can delete folders"
  ON public.file_folders FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Files (metadata only; actual bytes live in storage)
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text        NOT NULL,
  folder_id    uuid        REFERENCES public.file_folders(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  size         bigint,
  mime_type    text,
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view files"
  ON public.file_uploads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload files"
  ON public.file_uploads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or admin can delete files"
  ON public.file_uploads FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Storage bucket (private — authenticated access only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('church-files', 'church-files', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Authenticated users can upload church files'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload church files"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'church-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Authenticated users can view church files'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can view church files"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'church-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Uploader can delete own church files'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Uploader can delete own church files"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'church-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
