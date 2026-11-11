-- Private calendar subscription links (one per member).
--
-- Calendar apps fetch the feed without signing in, so the link itself is the
-- credential. Only a SHA-256 hash of the token is stored; resetting replaces
-- it and immediately disables the old link. All access goes through server
-- functions using the service role.
--
-- Rollback: DROP TABLE public.calendar_feed_tokens;

CREATE TABLE IF NOT EXISTS public.calendar_feed_tokens (
  profile_id   uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash   text        NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

-- No client policies or grants: browsers never read or write tokens directly.
REVOKE ALL ON public.calendar_feed_tokens FROM anon, authenticated;
