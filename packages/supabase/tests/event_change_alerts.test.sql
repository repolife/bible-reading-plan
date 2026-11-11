BEGIN;
SELECT plan(11);

-- Never let the legacy webhook post test rows to production (rolled back below).
ALTER TABLE public.family_calendar DISABLE TRIGGER "FMC Alert";

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'alert-host@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.family_groups (id, family_last_name, address) VALUES
  ('00000000-0000-0000-0000-0000000000f3', 'Alert Host Test', '3 Host St');
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000d1';
INSERT INTO public.profiles (id, name, family_id) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'Host', '00000000-0000-0000-0000-0000000000f3');

-- soon: tomorrow. later: in 10 days. past: yesterday.
INSERT INTO public.family_calendar (id, event_title, event_description, event_start, event_end, all_day, location, family_id) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'Soon', '', now() + interval '1 day', now() + interval '1 day 3 hours', false, '1 Old St', '00000000-0000-0000-0000-0000000000f3'),
  ('00000000-0000-0000-0000-00000000a002', 'Later', '', now() + interval '10 days', NULL, false, NULL, '00000000-0000-0000-0000-0000000000f3'),
  ('00000000-0000-0000-0000-00000000a003', 'Past', '', now() - interval '1 day', NULL, false, NULL, '00000000-0000-0000-0000-0000000000f3'),
  ('00000000-0000-0000-0000-00000000a004', 'Pulled in', '', now() + interval '10 days', NULL, false, NULL, '00000000-0000-0000-0000-0000000000f3');

UPDATE public.family_calendar SET event_title = 'Soon, renamed', event_description = 'new' WHERE id = '00000000-0000-0000-0000-00000000a001';
SELECT is((SELECT count(*)::int FROM public.event_change_alerts), 0,
  'renames and description edits do not alert');

UPDATE public.family_calendar SET event_start = event_start + interval '1 hour', location = '2 New St'
  WHERE id = '00000000-0000-0000-0000-00000000a001';
SELECT is((SELECT count(*)::int FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a001'), 1,
  'moving an event within 48 hours queues one alert');
SELECT is((SELECT before->>'location' FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a001'), '1 Old St',
  'the alert records the event as it was before the change');

UPDATE public.family_calendar SET event_start = event_start - interval '1 day' WHERE id = '00000000-0000-0000-0000-00000000a002';
SELECT is((SELECT count(*)::int FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a002'), 0,
  'changes to events more than 48 hours away do not alert');

UPDATE public.family_calendar SET event_start = now() + interval '1 day' WHERE id = '00000000-0000-0000-0000-00000000a004';
SELECT is((SELECT count(*)::int FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a004'), 1,
  'moving an event into the next 48 hours alerts');

UPDATE public.family_calendar SET location = 'Elsewhere' WHERE id = '00000000-0000-0000-0000-00000000a003';
SELECT is((SELECT count(*)::int FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a003'), 0,
  'changes to past events do not alert');

-- The host family cancels through the API; the trigger still queues the alert.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
UPDATE public.family_calendar SET cancelled_at = now() WHERE id = '00000000-0000-0000-0000-00000000a001';
SELECT throws_ok($$ SELECT 1 FROM public.event_change_alerts $$, '42501', NULL,
  'members cannot read the alert queue');
SELECT throws_ok(
  $$ INSERT INTO public.event_change_alerts (event_id, sequence, before) VALUES ('00000000-0000-0000-0000-00000000a001', 1, '{}') $$,
  '42501', NULL, 'members cannot write to the alert queue');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a001'), 2,
  'a member cancelling an event queues an alert');
SELECT is((SELECT array_agg(sequence ORDER BY sequence) FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a001'),
  ARRAY[1, 2], 'alerts record the event sequence, ordering changes made in one transaction');

DELETE FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-00000000a001';
SELECT is((SELECT count(*)::int FROM public.event_change_alerts WHERE event_id = '00000000-0000-0000-0000-00000000a001'), 0,
  'deleting an event removes its queued alerts');

SELECT * FROM finish();
ROLLBACK;
