BEGIN;
SELECT plan(9);

-- Never let the legacy webhook post test rows to production (rolled back below).
ALTER TABLE public.family_calendar DISABLE TRIGGER "FMC Alert";

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'host@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'guest@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.family_groups (id, family_last_name, address) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'Cancel Host Test', '1 Host St'),
  ('00000000-0000-0000-0000-0000000000f2', 'Cancel Guest Test', '2 Guest St');
DELETE FROM public.profiles WHERE id IN ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
INSERT INTO public.profiles (id, name, family_id) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Host', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Guest', '00000000-0000-0000-0000-0000000000f2');

INSERT INTO public.family_calendar (id, event_title, event_description, event_start, event_end, all_day, family_id, sequence)
VALUES ('00000000-0000-0000-0000-0000000000e1', 'Shabbat', '', '2026-11-14T22:00:00Z', '2026-11-15T03:00:00Z', false,
        '00000000-0000-0000-0000-0000000000f1', 99);

SELECT is((SELECT sequence FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), 0,
  'new events start at sequence 0');
SELECT is((SELECT cancelled_at FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), NULL,
  'new events are not cancelled');

UPDATE public.family_calendar SET event_title = 'Shabbat dinner' WHERE id = '00000000-0000-0000-0000-0000000000e1';
SELECT is((SELECT sequence FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), 0,
  'renaming an event does not bump the sequence');

UPDATE public.family_calendar SET event_start = '2026-11-14T23:00:00Z' WHERE id = '00000000-0000-0000-0000-0000000000e1';
SELECT is((SELECT sequence FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), 1,
  'moving an event bumps the sequence');

UPDATE public.family_calendar SET location = '1 Host St' WHERE id = '00000000-0000-0000-0000-0000000000e1';
SELECT is((SELECT sequence FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), 2,
  'changing the place bumps the sequence');

UPDATE public.family_calendar SET sequence = 50 WHERE id = '00000000-0000-0000-0000-0000000000e1';
SELECT is((SELECT sequence FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), 2,
  'the sequence cannot be set directly');

-- Another family cannot cancel the event (RLS hides it from UPDATE).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000c2', 'role', 'authenticated')::text, true);
UPDATE public.family_calendar SET cancelled_at = now() WHERE id = '00000000-0000-0000-0000-0000000000e1';
RESET ROLE;
SELECT is((SELECT cancelled_at FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), NULL,
  'other families cannot cancel an event');

-- The host family can.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
UPDATE public.family_calendar SET cancelled_at = now() WHERE id = '00000000-0000-0000-0000-0000000000e1';
RESET ROLE;
SELECT isnt((SELECT cancelled_at FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), NULL,
  'the host family can cancel its event');
SELECT is((SELECT sequence FROM public.family_calendar WHERE id = '00000000-0000-0000-0000-0000000000e1'), 3,
  'cancelling bumps the sequence');

SELECT * FROM finish();
ROLLBACK;
