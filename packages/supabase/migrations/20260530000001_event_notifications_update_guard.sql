-- Harden event_notifications updates: a family may only flip is_read, never
-- rewrite a notification's content. RLS WITH CHECK cannot compare OLD vs NEW,
-- so this is enforced with a column-level UPDATE privilege.
-- (anon is already blocked from updating by the "authenticated"-only RLS policy.)
REVOKE UPDATE ON "public"."event_notifications" FROM "authenticated";
GRANT UPDATE ("is_read") ON "public"."event_notifications" TO "authenticated";
