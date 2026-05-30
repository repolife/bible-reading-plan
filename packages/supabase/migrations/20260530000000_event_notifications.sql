-- In-app event notifications: let a host family know when someone RSVPs to their event.
-- A generic "notifications" table already exists (abandoned stub, world-readable RLS),
-- so this uses a dedicated, privacy-scoped table instead.
-- Backed by a SECURITY DEFINER trigger on event_attendees, surfaced live in the PWA
-- via Supabase Realtime.

-- 1. Table (denormalized actor name + event title so Realtime INSERT payloads
--    render in the UI without extra joins)
CREATE TABLE IF NOT EXISTS "public"."event_notifications" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "recipient_family_id" "uuid" NOT NULL,
  "actor_family_id" "uuid",
  "event_id" "uuid",
  "type" "text" NOT NULL DEFAULT 'rsvp',
  "rsvp_status" "text",
  "actor_family_name" "text",
  "event_title" "text",
  "is_read" boolean NOT NULL DEFAULT false,
  CONSTRAINT "event_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_notifications_recipient_family_id_fkey"
    FOREIGN KEY ("recipient_family_id") REFERENCES "public"."family_groups"("id") ON DELETE CASCADE,
  CONSTRAINT "event_notifications_actor_family_id_fkey"
    FOREIGN KEY ("actor_family_id") REFERENCES "public"."family_groups"("id") ON DELETE SET NULL,
  CONSTRAINT "event_notifications_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "public"."family_calendar"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_event_notifications_recipient"
  ON "public"."event_notifications" USING "btree" ("recipient_family_id", "is_read", "created_at" DESC);

-- 2. RLS: a family reads/updates only its own notifications.
--    No INSERT policy — rows are created exclusively by the trigger below.
ALTER TABLE "public"."event_notifications" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Family can read its event notifications' AND tablename = 'event_notifications'
  ) THEN
    CREATE POLICY "Family can read its event notifications"
      ON "public"."event_notifications" FOR SELECT TO "authenticated"
      USING ("recipient_family_id" = ( SELECT "profiles"."family_id"
        FROM "public"."profiles" WHERE ("profiles"."id" = "auth"."uid"())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Family can update its event notifications' AND tablename = 'event_notifications'
  ) THEN
    CREATE POLICY "Family can update its event notifications"
      ON "public"."event_notifications" FOR UPDATE TO "authenticated"
      USING ("recipient_family_id" = ( SELECT "profiles"."family_id"
        FROM "public"."profiles" WHERE ("profiles"."id" = "auth"."uid"())))
      WITH CHECK ("recipient_family_id" = ( SELECT "profiles"."family_id"
        FROM "public"."profiles" WHERE ("profiles"."id" = "auth"."uid"())));
  END IF;
END $$;

-- 3. Trigger: on RSVP insert/update, notify the event's host family.
CREATE OR REPLACE FUNCTION "public"."notify_host_on_rsvp"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_host_family_id uuid;
  v_event_title text;
  v_actor_name text;
BEGIN
  -- On UPDATE, only fire when the choice actually changed.
  IF (TG_OP = 'UPDATE' AND NEW.rsvp_status IS NOT DISTINCT FROM OLD.rsvp_status) THEN
    RETURN NEW;
  END IF;

  SELECT family_id, event_title
    INTO v_host_family_id, v_event_title
    FROM public.family_calendar
   WHERE id = NEW.event_id;

  -- No host on the event, or the host family is the one RSVPing -> skip.
  IF v_host_family_id IS NULL OR v_host_family_id = NEW.family_id THEN
    RETURN NEW;
  END IF;

  SELECT family_last_name INTO v_actor_name
    FROM public.family_groups WHERE id = NEW.family_id;

  INSERT INTO public.event_notifications (
    recipient_family_id, actor_family_id, event_id,
    type, rsvp_status, actor_family_name, event_title
  ) VALUES (
    v_host_family_id, NEW.family_id, NEW.event_id,
    'rsvp', NEW.rsvp_status, COALESCE(v_actor_name, 'A family'), v_event_title
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_notify_host_on_rsvp" ON "public"."event_attendees";
CREATE TRIGGER "trg_notify_host_on_rsvp"
  AFTER INSERT OR UPDATE ON "public"."event_attendees"
  FOR EACH ROW EXECUTE FUNCTION "public"."notify_host_on_rsvp"();

-- 4. Stream new notifications to the PWA in real time.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'event_notifications'
  ) THEN
    ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."event_notifications";
  END IF;
END $$;
