-- Add fcm_tokens array to profiles table for multi-device support
-- This is a simpler approach that doesn't require a new table

-- Add fcm_tokens column as JSONB array
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "fcm_tokens" jsonb DEFAULT '[]'::jsonb;

-- Add device_info column for storing device metadata
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "device_info" jsonb DEFAULT '{}'::jsonb;

-- Create index for efficient queries on fcm_tokens array
CREATE INDEX IF NOT EXISTS "idx_profiles_fcm_tokens" ON "public"."profiles" USING GIN ("fcm_tokens");

-- Create a function to add FCM token to user's token array
CREATE OR REPLACE FUNCTION "public"."add_fcm_token"(
    user_id uuid,
    fcm_token text,
    device_info jsonb DEFAULT '{}'::jsonb
)
RETURNS bool
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove token if it already exists (to update device info)
    UPDATE "public"."profiles" 
    SET "fcm_tokens" = (
        SELECT jsonb_agg(token_obj)
        FROM jsonb_array_elements("fcm_tokens") AS token_obj
        WHERE token_obj->>'token' != fcm_token
    )
    WHERE "id" = user_id;
    
    -- Add new token with device info
    UPDATE "public"."profiles" 
    SET "fcm_tokens" = "fcm_tokens" || jsonb_build_object(
        'token', fcm_token,
        'device_info', device_info,
        'created_at', now()::text,
        'last_used', now()::text,
        'is_active', true
    )::jsonb
    WHERE "id" = user_id;
    
    RETURN true;
END;
$$;

-- Create a function to remove FCM token from user's token array
CREATE OR REPLACE FUNCTION "public"."remove_fcm_token"(
    user_id uuid,
    fcm_token text
)
RETURNS bool
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE "public"."profiles" 
    SET "fcm_tokens" = (
        SELECT jsonb_agg(token_obj)
        FROM jsonb_array_elements("fcm_tokens") AS token_obj
        WHERE token_obj->>'token' != fcm_token
    )
    WHERE "id" = user_id;
    
    RETURN true;
END;
$$;

-- Create a function to get active FCM tokens for a user
CREATE OR REPLACE FUNCTION "public"."get_active_fcm_tokens"(user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tokens text[];
BEGIN
    SELECT array_agg(token_obj->>'token')
    INTO tokens
    FROM jsonb_array_elements(
        (SELECT "fcm_tokens" FROM "public"."profiles" WHERE "id" = user_id)
    ) AS token_obj
    WHERE token_obj->>'is_active' = 'true';
    
    RETURN COALESCE(tokens, ARRAY[]::text[]);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION "public"."add_fcm_token"(uuid, text, jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."remove_fcm_token"(uuid, text) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_active_fcm_tokens"(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."add_fcm_token"(uuid, text, jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."remove_fcm_token"(uuid, text) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."get_active_fcm_tokens"(uuid) TO "service_role";
