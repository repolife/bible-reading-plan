-- Add RSVP status (yes/no/maybe) to event_attendees

-- 1. Add the column (existing rows default to 'yes' = currently attending)
ALTER TABLE "public"."event_attendees"
  ADD COLUMN IF NOT EXISTS "rsvp_status" "text" NOT NULL DEFAULT 'yes';

-- 2. Constrain to the three valid choices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_attendees_rsvp_status_check'
  ) THEN
    ALTER TABLE "public"."event_attendees"
      ADD CONSTRAINT "event_attendees_rsvp_status_check"
      CHECK ("rsvp_status" IN ('yes', 'no', 'maybe'));
  END IF;
END $$;

-- 3. Dedupe so one family has at most one row per event, then enforce it
--    (keeps the most recent RSVP per event/family)
DELETE FROM "public"."event_attendees" a
USING "public"."event_attendees" b
WHERE a.event_id = b.event_id
  AND a.family_id = b.family_id
  AND a.id < b.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_attendees_event_family_unique'
  ) THEN
    ALTER TABLE "public"."event_attendees"
      ADD CONSTRAINT "event_attendees_event_family_unique"
      UNIQUE ("event_id", "family_id");
  END IF;
END $$;

-- 4. Allow a family to update its own RSVP (needed for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Enable update for users based on family_id'
      AND tablename = 'event_attendees'
  ) THEN
    CREATE POLICY "Enable update for users based on family_id"
      ON "public"."event_attendees" FOR UPDATE TO "authenticated"
      USING (("family_id" = ( SELECT "profiles"."family_id"
         FROM "public"."profiles"
        WHERE ("profiles"."id" = "auth"."uid"()))));
  END IF;
END $$;
