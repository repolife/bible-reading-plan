-- Migrate renamed/removed servant roles for all existing profiles
UPDATE public.profiles
SET servant_roles = (
  SELECT array_agg(
    CASE r
      WHEN 'Needs'                    THEN 'Care & Support'
      WHEN 'Schedule Coordination'    THEN 'Shabbat Schedule Coordination'
      WHEN 'Planning / Coordination'  THEN 'Outreach Planning'
      WHEN 'Planning & Implementation' THEN 'Feast Planning'
      ELSE r
    END
  )
  FROM unnest(servant_roles) AS r
  WHERE r != 'Outreach'
)
WHERE servant_roles IS NOT NULL AND array_length(servant_roles, 1) > 0;
