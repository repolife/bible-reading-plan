-- Matrix account links, link challenges, and an append-only admin audit log.
--
-- All writes go through Netlify Functions using the service role. End users
-- get read access only (admins: everything; members: their own Matrix link).
-- No plaintext passwords or link codes are ever stored here.
--
-- Rollback: DROP TABLE public.matrix_link_challenges, public.matrix_accounts,
-- public.admin_audit_log; DROP FUNCTION public.prevent_audit_log_changes().

CREATE TABLE IF NOT EXISTS public.matrix_accounts (
  id                     uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id             uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  matrix_user_id         text        NOT NULL UNIQUE
    CHECK (matrix_user_id ~ '^@[a-z0-9._-]+:ozark-fellowship\.netlify\.app$'),
  origin                 text        NOT NULL CHECK (origin IN ('provisioned', 'linked')),
  status                 text        NOT NULL
    CHECK (status IN ('provisioning', 'active', 'failed', 'link_pending')),
  request_id             uuid        NOT NULL,
  attempts               integer     NOT NULL DEFAULT 1 CHECK (attempts >= 0),
  last_error_code        text,
  password_claim_allowed boolean     NOT NULL DEFAULT false,
  password_claimed_at    timestamptz,
  created_by             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matrix_link_challenges (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matrix_user_id text        NOT NULL,
  code_hash      text        NOT NULL,
  attempts       integer     NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at     timestamptz NOT NULL,
  consumed_at    timestamptz,
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- At most one open challenge per profile.
CREATE UNIQUE INDEX IF NOT EXISTS matrix_link_challenges_one_open_per_profile
  ON public.matrix_link_challenges (profile_id)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id                    bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id              uuid,
  action                text        NOT NULL,
  target_profile_id     uuid,
  target_matrix_user_id text,
  outcome               text        NOT NULL CHECK (outcome IN ('success', 'failure', 'conflict', 'denied')),
  details               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_target_profile_idx
  ON public.admin_audit_log (target_profile_id, created_at DESC);

-- Audit rows are append-only, even for the service role.
CREATE OR REPLACE FUNCTION public.prevent_audit_log_changes()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_audit_log_append_only ON public.admin_audit_log;
CREATE TRIGGER admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_changes();

ALTER TABLE public.matrix_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_link_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log        ENABLE ROW LEVEL SECURITY;

-- Defense in depth: clients never write these tables directly.
REVOKE ALL ON public.matrix_accounts, public.matrix_link_challenges, public.admin_audit_log
  FROM anon, authenticated;
GRANT SELECT ON public.matrix_accounts, public.admin_audit_log TO authenticated;

CREATE POLICY "Admins read matrix accounts"
  ON public.matrix_accounts FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

CREATE POLICY "Members read own matrix account"
  ON public.matrix_accounts FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins read audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- matrix_link_challenges intentionally has no client policies or grants.
