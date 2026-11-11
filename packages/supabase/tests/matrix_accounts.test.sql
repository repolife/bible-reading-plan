BEGIN;
SELECT plan(16);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a2', 'admin2@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'member2@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'other2@test.local')
ON CONFLICT (id) DO NOTHING;
DELETE FROM public.profiles WHERE id IN (
  '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000b2',
  '00000000-0000-0000-0000-0000000000d2'
);
INSERT INTO public.profiles (id, name, is_admin) VALUES
  ('00000000-0000-0000-0000-0000000000a2', 'Admin', true),
  ('00000000-0000-0000-0000-0000000000b2', 'Member', false),
  ('00000000-0000-0000-0000-0000000000d2', 'Other', false);

-- Fixture rows written as postgres (stands in for the service role).
INSERT INTO public.matrix_accounts (profile_id, matrix_user_id, origin, status, request_id) VALUES
  ('00000000-0000-0000-0000-0000000000b2', '@member2:ozark-fellowship.netlify.app', 'provisioned', 'active', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000d2', '@other2:ozark-fellowship.netlify.app', 'linked', 'link_pending', gen_random_uuid());
INSERT INTO public.admin_audit_log (actor_id, action, target_profile_id, outcome)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'matrix.provision', '00000000-0000-0000-0000-0000000000b2', 'success');
INSERT INTO public.matrix_link_challenges (profile_id, matrix_user_id, code_hash, expires_at)
  VALUES ('00000000-0000-0000-0000-0000000000d2', '@other2:ozark-fellowship.netlify.app', 'hash', now() + interval '15 minutes');

-- Constraints (still as postgres)
SELECT throws_ok(
  $$ INSERT INTO public.matrix_accounts (profile_id, matrix_user_id, origin, status, request_id)
     VALUES ('00000000-0000-0000-0000-0000000000a2', '@member2:ozark-fellowship.netlify.app', 'linked', 'active', gen_random_uuid()) $$,
  '23505', NULL, 'a Matrix ID can be linked to only one profile');
SELECT throws_ok(
  $$ INSERT INTO public.matrix_accounts (profile_id, matrix_user_id, origin, status, request_id)
     VALUES ('00000000-0000-0000-0000-0000000000b2', '@second:ozark-fellowship.netlify.app', 'provisioned', 'active', gen_random_uuid()) $$,
  '23505', NULL, 'a profile can have only one Matrix account');
SELECT throws_ok(
  $$ INSERT INTO public.matrix_accounts (profile_id, matrix_user_id, origin, status, request_id)
     VALUES ('00000000-0000-0000-0000-0000000000a2', '@x:matrix.org', 'linked', 'active', gen_random_uuid()) $$,
  '23514', NULL, 'Matrix IDs on other servers are rejected');
SELECT throws_ok(
  $$ INSERT INTO public.matrix_link_challenges (profile_id, matrix_user_id, code_hash, expires_at)
     VALUES ('00000000-0000-0000-0000-0000000000d2', '@other2:ozark-fellowship.netlify.app', 'hash2', now()) $$,
  '23505', NULL, 'only one open link challenge per profile');
SELECT throws_ok(
  $$ UPDATE public.admin_audit_log SET outcome = 'failure' $$,
  'admin_audit_log is append-only', 'audit log rows cannot be updated');
SELECT throws_ok(
  $$ DELETE FROM public.admin_audit_log $$,
  'admin_audit_log is append-only', 'audit log rows cannot be deleted');

-- Member
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000b2', 'role', 'authenticated')::text, true);
SELECT results_eq(
  $$ SELECT matrix_user_id FROM public.matrix_accounts $$,
  ARRAY['@member2:ozark-fellowship.netlify.app'],
  'member sees only their own Matrix account');
SELECT is_empty($$ SELECT 1 FROM public.admin_audit_log $$, 'member cannot read the audit log');
SELECT throws_ok(
  $$ SELECT 1 FROM public.matrix_link_challenges $$,
  '42501', NULL, 'member cannot read link challenges');
SELECT throws_ok(
  $$ INSERT INTO public.matrix_accounts (profile_id, matrix_user_id, origin, status, request_id)
     VALUES ('00000000-0000-0000-0000-0000000000b2', '@mine:ozark-fellowship.netlify.app', 'linked', 'active', gen_random_uuid()) $$,
  '42501', NULL, 'member cannot create a Matrix link');
SELECT throws_ok(
  $$ UPDATE public.matrix_accounts SET status = 'active' $$,
  '42501', NULL, 'member cannot update Matrix links');
SELECT throws_ok(
  $$ INSERT INTO public.admin_audit_log (action, outcome) VALUES ('forged', 'success') $$,
  '42501', NULL, 'member cannot write the audit log');

-- Admin: reads everything, still cannot write directly
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.matrix_accounts WHERE profile_id IN (
    '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d2')),
  2, 'admin sees all Matrix accounts, including other members''');
SELECT is(
  (SELECT count(*)::int FROM public.admin_audit_log WHERE target_profile_id = '00000000-0000-0000-0000-0000000000b2'),
  1, 'admin reads the audit log');
SELECT throws_ok(
  $$ UPDATE public.matrix_accounts SET status = 'active' $$,
  '42501', NULL, 'admin cannot bypass the server functions to change links');

-- Anonymous
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
SELECT throws_ok(
  $$ SELECT 1 FROM public.matrix_accounts $$,
  '42501', NULL, 'anonymous users cannot read Matrix accounts');

SELECT * FROM finish();
ROLLBACK;
