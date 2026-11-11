BEGIN;
SELECT plan(14);

-- Fixtures (as postgres): one admin, one member, one user without a profile row.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'member@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'noprofile@test.local')
ON CONFLICT (id) DO NOTHING;
DELETE FROM public.profiles WHERE id IN (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000c1'
);
INSERT INTO public.profiles (id, name, is_admin) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', true),
  ('00000000-0000-0000-0000-0000000000b1', 'Member', false);

CREATE FUNCTION pg_temp.act_as(uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- current_user_is_admin
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
SELECT is(public.current_user_is_admin(), false, 'no profile row => false, not NULL');
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
SELECT is(public.current_user_is_admin(), true, 'admin => true');

-- Non-admin member
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
SELECT throws_ok(
  $$ UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-0000-0000-0000000000b1' $$,
  'Only trusted server roles can change admin status',
  'member cannot self-promote via UPDATE');
SELECT throws_ok(
  $$ UPDATE public.profiles SET servant_roles = ARRAY['Elder'] WHERE id = '00000000-0000-0000-0000-0000000000b1' $$,
  'Only admins can update servant roles',
  'member cannot set own servant roles');
SELECT throws_ok(
  $$ UPDATE public.profiles SET hidden_from_directory = true WHERE id = '00000000-0000-0000-0000-0000000000b1' $$,
  'Only admins can change directory visibility',
  'member cannot change directory visibility');
SELECT lives_ok(
  $$ UPDATE public.profiles SET name = 'Member Renamed' WHERE id = '00000000-0000-0000-0000-0000000000b1' $$,
  'member can still edit ordinary profile fields');
SELECT lives_ok(
  $$ INSERT INTO public.profiles (id, has_password) VALUES ('00000000-0000-0000-0000-0000000000b1', true)
     ON CONFLICT (id) DO UPDATE SET has_password = excluded.has_password $$,
  'password-set upsert (Password.jsx) still works');

-- User without a profile row tries to insert a privileged one
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
SELECT throws_ok(
  $$ INSERT INTO public.profiles (id, is_admin) VALUES ('00000000-0000-0000-0000-0000000000c1', true) $$,
  'Only trusted server roles can change admin status',
  'self-insert with is_admin = true is rejected');
SELECT throws_ok(
  $$ INSERT INTO public.profiles (id, servant_roles) VALUES ('00000000-0000-0000-0000-0000000000c1', ARRAY['Elder']) $$,
  'Only admins can update servant roles',
  'self-insert with servant roles is rejected');
SELECT lives_ok(
  $$ INSERT INTO public.profiles (id) VALUES ('00000000-0000-0000-0000-0000000000c1') $$,
  'plain self-insert still works');

-- Admin
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
SELECT lives_ok(
  $$ UPDATE public.profiles SET servant_roles = ARRAY['Elder'] WHERE id = '00000000-0000-0000-0000-0000000000b1' $$,
  'admin can assign servant roles');
SELECT throws_ok(
  $$ UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-0000-0000-0000000000b1' $$,
  'Only trusted server roles can change admin status',
  'admin cannot promote another member through the client API');

-- Trusted server role
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
SELECT lives_ok(
  $$ UPDATE public.profiles SET is_admin = true WHERE id = '00000000-0000-0000-0000-0000000000b1' $$,
  'service_role can change admin status');
SELECT is(
  (SELECT is_admin FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000b1'),
  true, 'service_role change persisted');

SELECT * FROM finish();
ROLLBACK;
