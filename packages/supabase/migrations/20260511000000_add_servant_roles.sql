ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "servant_roles" "text"[] DEFAULT '{}'::"text"[];
