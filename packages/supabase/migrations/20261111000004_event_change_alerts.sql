-- Queue of last-minute event changes for the "Calendar alerts" Matrix room.
--
-- A trigger records each change to an event's time, place or cancellation
-- (the changes that bump family_calendar.sequence) when the event starts in
-- the next 48 hours. The scheduled Netlify function event-change-alerts reads
-- the queue with the service role, posts one message per event through the
-- Matrix provisioner, and marks rows sent. The database never makes HTTP
-- calls, so local and CI databases cannot post anything.
--
-- Rollback:
--   DROP TRIGGER queue_event_change_alert ON public.family_calendar;
--   DROP FUNCTION public.queue_event_change_alert();
--   DROP TABLE public.event_change_alerts;

CREATE TABLE IF NOT EXISTS public.event_change_alerts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES public.family_calendar(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- The event's sequence after the change. Orders an event's changes even
  -- within one transaction, where now() is the same for every row.
  sequence    integer     NOT NULL,
  -- The event's start, end, all_day, location and cancelled_at before the change.
  before      jsonb       NOT NULL,
  sent_at     timestamptz,
  attempts    integer     NOT NULL DEFAULT 0,
  last_error  text
);

CREATE INDEX IF NOT EXISTS event_change_alerts_unsent
  ON public.event_change_alerts (created_at) WHERE sent_at IS NULL;

ALTER TABLE public.event_change_alerts ENABLE ROW LEVEL SECURITY;

-- No client policies or grants: only server functions (service role) use it.
REVOKE ALL ON public.event_change_alerts FROM anon, authenticated;

-- SECURITY DEFINER so members editing their own events can queue alerts in a
-- table they cannot otherwise read or write.
CREATE OR REPLACE FUNCTION public.queue_event_change_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.event_start > now() AND OLD.event_start <= now() + interval '48 hours')
     OR (NEW.event_start > now() AND NEW.event_start <= now() + interval '48 hours') THEN
    INSERT INTO public.event_change_alerts (event_id, sequence, before)
    VALUES (OLD.id, NEW.sequence, jsonb_build_object(
      'event_start', OLD.event_start,
      'event_end', OLD.event_end,
      'all_day', OLD.all_day,
      'location', OLD.location,
      'cancelled_at', OLD.cancelled_at
    ));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_event_change_alert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS queue_event_change_alert ON public.family_calendar;
-- sequence goes up exactly when the time, place or cancellation changes
-- (see 20261111000003_family_calendar_cancellation.sql).
CREATE TRIGGER queue_event_change_alert
  AFTER UPDATE ON public.family_calendar
  FOR EACH ROW
  WHEN (NEW.sequence > OLD.sequence)
  EXECUTE FUNCTION public.queue_event_change_alert();
