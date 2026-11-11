-- Cancel events instead of deleting them, so subscribed calendars can show
-- them as cancelled (iCalendar STATUS:CANCELLED) rather than silently
-- dropping them.
--
-- sequence is the iCalendar SEQUENCE: calendar apps only accept an update to
-- an event they already have when it goes up. The trigger owns it, bumping it
-- when the time, place, or cancellation changes; clients cannot set it.
--
-- No policy changes: cancelling is an UPDATE, which the existing
-- "Update only own family calendar" policy already limits to the host family.
--
-- Rollback:
--   DROP TRIGGER family_calendar_sequence ON public.family_calendar;
--   DROP FUNCTION public.family_calendar_sequence();
--   ALTER TABLE public.family_calendar DROP COLUMN cancelled_at, DROP COLUMN sequence;

ALTER TABLE public.family_calendar
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS sequence integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.family_calendar_sequence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.sequence := 0;
  ELSIF (NEW.event_start, NEW.event_end, NEW.all_day, NEW.location, NEW.cancelled_at)
        IS DISTINCT FROM (OLD.event_start, OLD.event_end, OLD.all_day, OLD.location, OLD.cancelled_at) THEN
    NEW.sequence := OLD.sequence + 1;
  ELSE
    NEW.sequence := OLD.sequence;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS family_calendar_sequence ON public.family_calendar;
CREATE TRIGGER family_calendar_sequence
  BEFORE INSERT OR UPDATE ON public.family_calendar
  FOR EACH ROW EXECUTE FUNCTION public.family_calendar_sequence();
