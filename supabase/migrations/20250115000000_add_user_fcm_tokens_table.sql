-- Create user_fcm_tokens table for multi-device support
CREATE TABLE IF NOT EXISTS "public"."user_fcm_tokens" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "fcm_token" text NOT NULL,
    "device_info" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "last_used" timestamptz DEFAULT now() NOT NULL,
    "is_active" bool DEFAULT true NOT NULL
);

-- Set table owner
ALTER TABLE "public"."user_fcm_tokens" OWNER TO "postgres";

-- Add primary key
ALTER TABLE ONLY "public"."user_fcm_tokens"
    ADD CONSTRAINT "user_fcm_tokens_pkey" PRIMARY KEY ("id");

-- Add foreign key constraint
ALTER TABLE ONLY "public"."user_fcm_tokens"
    ADD CONSTRAINT "user_fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Add unique constraint on fcm_token
ALTER TABLE ONLY "public"."user_fcm_tokens"
    ADD CONSTRAINT "user_fcm_tokens_fcm_token_key" UNIQUE ("fcm_token");

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS "idx_user_fcm_tokens_user_id" ON "public"."user_fcm_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_fcm_tokens_active" ON "public"."user_fcm_tokens" ("user_id", "is_active");

-- Enable RLS
ALTER TABLE "public"."user_fcm_tokens" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own FCM tokens" ON "public"."user_fcm_tokens"
    FOR ALL TO "authenticated" 
    USING (("user_id" = "auth"."uid"()));

-- Grant permissions
GRANT ALL ON TABLE "public"."user_fcm_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_fcm_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_fcm_tokens" TO "service_role";

-- Add to realtime publication
ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."user_fcm_tokens";

-- Function to clean up old/inactive tokens
CREATE OR REPLACE FUNCTION "public"."cleanup_old_fcm_tokens"()
    RETURNS "void"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET "search_path" = 'public'
AS $$
BEGIN
    -- Delete tokens that haven't been used in 30 days
    DELETE FROM "public"."user_fcm_tokens" 
    WHERE "last_used" < NOW() - INTERVAL '30 days';
    
    -- Mark tokens as inactive if they haven't been used in 7 days
    UPDATE "public"."user_fcm_tokens" 
    SET "is_active" = false 
    WHERE "last_used" < NOW() - INTERVAL '7 days' 
    AND "is_active" = true;
END;
$$;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION "public"."cleanup_old_fcm_tokens"() TO "service_role";
