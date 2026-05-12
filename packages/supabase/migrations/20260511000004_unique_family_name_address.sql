-- For each duplicate (family_last_name, address) group, keep the oldest row.
-- Reassign all referencing rows to the survivor, then delete duplicates,
-- then add the unique constraint.

DO $$
DECLARE
  survivor_id uuid;
  dup_id uuid;
BEGIN
  FOR survivor_id, dup_id IN
    SELECT DISTINCT ON (dup.family_last_name, dup.address)
      keep.id AS survivor_id,
      dup.id  AS dup_id
    FROM public.family_groups dup
    JOIN public.family_groups keep
      ON keep.family_last_name = dup.family_last_name
     AND keep.address          = dup.address
     AND keep.id              <> dup.id
     AND keep.created_at      <= dup.created_at
    ORDER BY dup.family_last_name, dup.address, dup.created_at DESC
  LOOP
    UPDATE public.profiles
      SET family_id = survivor_id
      WHERE family_id = dup_id;

    UPDATE public.family_calendar
      SET family_id = survivor_id
      WHERE family_id = dup_id;

    UPDATE public.event_attendees
      SET family_id = survivor_id
      WHERE family_id = dup_id;

    DELETE FROM public.family_groups WHERE id = dup_id;
  END LOOP;
END $$;

ALTER TABLE public.family_groups
  ADD CONSTRAINT family_groups_name_address_key
  UNIQUE (family_last_name, address);
