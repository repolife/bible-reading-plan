BEGIN;
SELECT plan(12);

-- Fixtures (as postgres): one admin and two regular members.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000001a1', 'files-admin@test.local'),
  ('00000000-0000-0000-0000-0000000001b1', 'files-owner@test.local'),
  ('00000000-0000-0000-0000-0000000001c1', 'files-other@test.local')
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.profiles WHERE id IN (
  '00000000-0000-0000-0000-0000000001a1',
  '00000000-0000-0000-0000-0000000001b1',
  '00000000-0000-0000-0000-0000000001c1'
);

INSERT INTO public.profiles (id, name, is_admin) VALUES
  ('00000000-0000-0000-0000-0000000001a1', 'Files Admin', true),
  ('00000000-0000-0000-0000-0000000001b1', 'Files Owner', false),
  ('00000000-0000-0000-0000-0000000001c1', 'Files Other', false);

CREATE FUNCTION pg_temp.act_as(uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- 1. Member can create a root folder without RLS infinite recursion
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000001b1');
SELECT lives_ok(
  $$ INSERT INTO public.file_folders (id, name, parent_id, created_by)
     VALUES ('10000000-0000-0000-0000-000000000001', 'Books_References', NULL, '00000000-0000-0000-0000-0000000001b1') $$,
  'member can create root folder without infinite recursion'
);

-- 2. Owner can create a subfolder inside their own folder
SELECT lives_ok(
  $$ INSERT INTO public.file_folders (id, name, parent_id, created_by)
     VALUES ('10000000-0000-0000-0000-000000000002', 'Subfolder', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000001b1') $$,
  'folder owner can create subfolder'
);

-- 3. Owner can upload a file into their own folder
SELECT lives_ok(
  $$ INSERT INTO public.file_uploads (id, name, folder_id, storage_path, size, mime_type, created_by)
     VALUES ('20000000-0000-0000-0000-000000000001', 'notes.pdf', '10000000-0000-0000-0000-000000000001', 'owner/notes.pdf', 123, 'application/pdf', '00000000-0000-0000-0000-0000000001b1') $$,
  'folder owner can upload file into own folder'
);

-- 4. Another non-admin without edit permission cannot create a subfolder or upload into it
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000001c1');
SELECT throws_ok(
  $$ INSERT INTO public.file_folders (name, parent_id, created_by)
     VALUES ('Unauthorized Sub', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000001c1') $$,
  '42501',
  NULL,
  'other member without edit grant cannot create subfolder'
);
SELECT throws_ok(
  $$ INSERT INTO public.file_uploads (name, folder_id, storage_path, created_by)
     VALUES ('unauth.pdf', '10000000-0000-0000-0000-000000000001', 'other/unauth.pdf', '00000000-0000-0000-0000-0000000001c1') $$,
  '42501',
  NULL,
  'other member without edit grant cannot upload file into folder'
);

-- 5. Admin restricts folder and grants view+edit to other member
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000001a1');
SELECT lives_ok(
  $$ UPDATE public.file_folders SET visibility = 'restricted' WHERE id = '10000000-0000-0000-0000-000000000001' $$,
  'admin can restrict folder visibility'
);
SELECT lives_ok(
  $$ INSERT INTO public.file_permissions (resource_type, resource_id, user_id, can_view, can_edit, granted_by)
     VALUES ('folder', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000001c1', true, true, '00000000-0000-0000-0000-0000000001a1') $$,
  'admin can grant folder view+edit permission'
);

-- 6. Granted member can now see the restricted folder, create a subfolder, and upload a file
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000001c1');
SELECT is(
  (SELECT count(*)::int FROM public.file_folders WHERE id = '10000000-0000-0000-0000-000000000001'),
  1,
  'member with can_view grant can see restricted folder'
);
SELECT lives_ok(
  $$ INSERT INTO public.file_folders (name, parent_id, created_by)
     VALUES ('Shared Sub', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000001c1') $$,
  'member with can_edit grant can create subfolder'
);
SELECT lives_ok(
  $$ INSERT INTO public.file_uploads (name, folder_id, storage_path, created_by)
     VALUES ('shared.pdf', '10000000-0000-0000-0000-000000000001', 'other/shared.pdf', '00000000-0000-0000-0000-0000000001c1') $$,
  'member with can_edit grant can upload file into folder'
);

-- 7. Member can still only see their own permission rows, and cannot modify permissions
SELECT is(
  (SELECT count(*)::int FROM public.file_permissions WHERE user_id = '00000000-0000-0000-0000-0000000001c1'),
  1,
  'member can see own file_permissions row'
);
SELECT throws_ok(
  $$ INSERT INTO public.file_permissions (resource_type, resource_id, user_id, can_view, can_edit)
     VALUES ('folder', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000001c1', true, true) $$,
  '42501',
  NULL,
  'non-admin cannot insert file_permissions'
);

SELECT * FROM finish();
ROLLBACK;
