// Matrix IDs are permanent: Synapse cannot rename a user once created.
export const MATRIX_SERVER_NAME = 'ozark-fellowship.netlify.app';
export const MATRIX_CLIENT_URL = 'https://172-238-169-102.sslip.io';

const RESERVED_LOCALPARTS = new Set([
  'abuse', 'admin', 'administrator', 'bot', 'help', 'matrix', 'mod', 'moderator',
  'noreply', 'notices', 'postmaster', 'provisioner', 'root', 'security', 'server',
  'support', 'synapse', 'system', 'webmaster',
]);

// Accounts this tool must never create or link. @jared.duel is a known
// misspelled duplicate of @jared.deuel that is intentionally left alone.
const BLOCKED_LOCALPARTS = new Set(['jared.duel']);

// 3–32 chars of [a-z0-9._-], starting and ending with a letter or digit, no
// repeated punctuation. Stricter than the Matrix spec on purpose.
const LOCALPART_RE = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;

export type LocalpartCheck = { ok: true; localpart: string } | { ok: false; reason: string; message: string };

export function validateLocalpart(raw: unknown): LocalpartCheck {
  if (typeof raw !== 'string') return { ok: false, reason: 'invalid_username', message: 'Username is required' };
  const localpart = raw.trim();
  if (localpart !== localpart.toLowerCase()) {
    return { ok: false, reason: 'invalid_username', message: 'Username must be lowercase' };
  }
  if (!LOCALPART_RE.test(localpart) || /[._-]{2}/.test(localpart)) {
    return {
      ok: false,
      reason: 'invalid_username',
      message: 'Use 3–32 lowercase letters, digits, dots, dashes or underscores, starting and ending with a letter or digit',
    };
  }
  if (BLOCKED_LOCALPARTS.has(localpart)) {
    return { ok: false, reason: 'blocked_username', message: 'This Matrix account is blocked from provisioning and linking' };
  }
  if (RESERVED_LOCALPARTS.has(localpart)) {
    return { ok: false, reason: 'reserved_username', message: 'This username is reserved' };
  }
  return { ok: true, localpart };
}

export const toMatrixUserId = (localpart: string) => `@${localpart}:${MATRIX_SERVER_NAME}`;

export function parseMatrixUserId(raw: unknown): LocalpartCheck {
  if (typeof raw !== 'string') return { ok: false, reason: 'invalid_matrix_id', message: 'Matrix ID is required' };
  const suffix = `:${MATRIX_SERVER_NAME}`;
  const value = raw.trim();
  if (!value.startsWith('@') || !value.endsWith(suffix)) {
    return { ok: false, reason: 'invalid_matrix_id', message: `Matrix ID must look like @name${suffix}` };
  }
  return validateLocalpart(value.slice(1, -suffix.length));
}
