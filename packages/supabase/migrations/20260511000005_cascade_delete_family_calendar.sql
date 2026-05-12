ALTER TABLE public.family_calendar
  DROP CONSTRAINT family_calendar_family_id_fkey;

ALTER TABLE public.family_calendar
  ADD CONSTRAINT family_calendar_family_id_fkey
  FOREIGN KEY (family_id)
  REFERENCES public.family_groups(id)
  ON DELETE CASCADE;
