BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a3', 'member3@test.local')
ON CONFLICT (id) DO NOTHING;
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a3';
INSERT INTO public.profiles (id, name) VALUES ('00000000-0000-0000-0000-0000000000a3', 'Member');

-- As postgres (stands in for the service role)
INSERT INTO public.calendar_feed_tokens (profile_id, token_hash)
  VALUES ('00000000-0000-0000-0000-0000000000a3', repeat('a', 64));

SELECT throws_ok(
  $$ INSERT INTO public.calendar_feed_tokens (profile_id, token_hash)
     VALUES ('00000000-0000-0000-0000-0000000000a3', repeat('b', 64)) $$,
  '23505', NULL, 'one subscription link per member');
SELECT throws_ok(
  $$ UPDATE public.calendar_feed_tokens SET token_hash = 'not-a-hash' $$,
  '23514', NULL, 'only SHA-256 hex hashes are stored');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a3', 'role', 'authenticated')::text, true);
SELECT throws_ok($$ SELECT 1 FROM public.calendar_feed_tokens $$, '42501', NULL,
  'members cannot read tokens, even their own');
SELECT throws_ok(
  $$ INSERT INTO public.calendar_feed_tokens (profile_id, token_hash)
     VALUES ('00000000-0000-0000-0000-0000000000a3', repeat('c', 64)) $$,
  '42501', NULL, 'members cannot write tokens directly');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
SELECT throws_ok($$ SELECT 1 FROM public.calendar_feed_tokens $$, '42501', NULL,
  'anonymous users cannot read tokens');

RESET ROLE;
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a3';
SELECT is((SELECT count(*)::int FROM public.calendar_feed_tokens
           WHERE profile_id = '00000000-0000-0000-0000-0000000000a3'), 0,
  'deleting a member removes their link');

SELECT * FROM finish();
ROLLBACK;
