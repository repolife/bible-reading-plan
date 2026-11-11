// Keep these rules in sync with packages/netlify/lib/matrix.ts. The service
// re-checks everything itself instead of trusting the caller.

const RESERVED_LOCALPARTS = new Set([
  'abuse', 'admin', 'administrator', 'bot', 'help', 'matrix', 'mod', 'moderator',
  'noreply', 'notices', 'postmaster', 'provisioner', 'root', 'security', 'server',
  'support', 'synapse', 'system', 'webmaster',
]);

// Never create, reset, or message these. @jared.duel is a known misspelled
// duplicate that is intentionally left alone.
const BLOCKED_LOCALPARTS = new Set(['jared.duel']);

const LOCALPART_RE = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/** Returns an error code, or null when the localpart may be provisioned. */
export function checkLocalpart(localpart) {
  if (typeof localpart !== 'string' || !LOCALPART_RE.test(localpart) || /[._-]{2}/.test(localpart)) {
    return 'invalid_username';
  }
  if (BLOCKED_LOCALPARTS.has(localpart)) return 'blocked_username';
  if (RESERVED_LOCALPARTS.has(localpart)) return 'reserved_username';
  return null;
}

/** Parses @localpart:server for this homeserver. Returns the localpart or null. */
export function localpartOf(userId, serverName) {
  if (typeof userId !== 'string') return null;
  const suffix = `:${serverName}`;
  if (!userId.startsWith('@') || !userId.endsWith(suffix)) return null;
  const localpart = userId.slice(1, -suffix.length);
  // Linking targets existing accounts, so only the character rules and the
  // blocklist apply here; reserved names are not provisioned but may exist.
  if (!LOCALPART_RE.test(localpart) || BLOCKED_LOCALPARTS.has(localpart)) return null;
  return localpart;
}
