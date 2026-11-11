import { timingSafeEqual } from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';
import { audit } from '../audit';
import { requireUser, type SessionUser } from '../auth';
import type { Deps } from '../deps';
import { HttpError, json, parseJsonBody } from '../http';
import { MATRIX_CLIENT_URL } from '../matrix';
import { ProvisionerError } from '../provisioner';
import { hashLinkCode } from './adminMatrix';

export const MAX_LINK_ATTEMPTS = 5;

async function getOwnAccount(deps: Deps, user: SessionUser) {
  const { data, error } = await deps.db
    .from('matrix_accounts')
    .select('matrix_user_id, origin, status, password_claim_allowed, password_claimed_at')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (error) throw new HttpError(502, 'db_read_failed', 'Could not load chat status');
  return data;
}

export async function getMemberMatrix(event: HandlerEvent, deps: Deps) {
  const user = await requireUser(event, deps.db);
  const account = await getOwnAccount(deps, user);
  const { data: challenge } = await deps.db
    .from('matrix_link_challenges')
    .select('matrix_user_id, expires_at')
    .eq('profile_id', user.id)
    .is('consumed_at', null)
    .maybeSingle();
  return json(200, {
    homeserver: MATRIX_CLIENT_URL,
    account: account
      ? {
          matrixUserId: account.matrix_user_id,
          origin: account.origin,
          status: account.status,
          passwordClaimAllowed: account.password_claim_allowed,
          passwordClaimedAt: account.password_claimed_at,
        }
      : null,
    pendingLink:
      challenge && new Date(challenge.expires_at) > deps.now()
        ? { matrixUserId: challenge.matrix_user_id, expiresAt: challenge.expires_at }
        : null,
  });
}

async function claimPassword(deps: Deps, user: SessionUser) {
  const account = await getOwnAccount(deps, user);
  if (!account || account.status !== 'active' || account.origin !== 'provisioned') {
    throw new HttpError(409, 'not_claimable', 'There is no chat password to collect for this account');
  }
  const base = { actorId: user.id, action: 'matrix.password_claim', targetProfileId: user.id, targetMatrixUserId: account.matrix_user_id };

  // Consume the permission first so concurrent clicks cannot issue two passwords.
  const { data: claimed } = await deps.db
    .from('matrix_accounts')
    .update({ password_claim_allowed: false, password_claimed_at: deps.now().toISOString(), updated_at: deps.now().toISOString() })
    .eq('profile_id', user.id)
    .eq('password_claim_allowed', true)
    .select('id');
  if (!claimed || claimed.length === 0) {
    await audit(deps.db, { ...base, outcome: 'denied', details: { reason: 'claim_not_allowed' } });
    throw new HttpError(409, 'claim_not_allowed', 'Your chat password was already collected. Ask an admin to issue a new one.');
  }

  let password: string;
  try {
    ({ password } = await deps.provisioner.issuePassword({ profileId: user.id, userId: account.matrix_user_id }));
  } catch (error) {
    const reason = error instanceof ProvisionerError ? error.code : 'provisioner_error';
    await deps.db
      .from('matrix_accounts')
      .update({ password_claim_allowed: true, password_claimed_at: account.password_claimed_at, updated_at: deps.now().toISOString() })
      .eq('profile_id', user.id);
    await audit(deps.db, { ...base, outcome: 'failure', details: { reason } });
    throw new HttpError(502, reason, 'Could not create your chat password. Please try again.', { retryable: true });
  }

  await audit(deps.db, { ...base, outcome: 'success' });
  return json(200, { matrixUserId: account.matrix_user_id, homeserver: MATRIX_CLIENT_URL, password });
}

const normalizeCode = (raw: unknown) => (typeof raw === 'string' ? raw.toUpperCase().replace(/[\s-]/g, '') : '');

async function confirmLink(deps: Deps, user: SessionUser, body: Record<string, unknown>) {
  const code = normalizeCode(body.code);
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new HttpError(400, 'invalid_code', 'Enter the 8-character code from your Matrix message');

  const { data: challenge, error } = await deps.db
    .from('matrix_link_challenges')
    .select('id, matrix_user_id, code_hash, attempts, expires_at')
    .eq('profile_id', user.id)
    .is('consumed_at', null)
    .maybeSingle();
  if (error) throw new HttpError(502, 'db_read_failed', 'Could not check the code');
  if (!challenge) throw new HttpError(404, 'no_pending_link', 'There is no pending chat link for your account');

  const base = { actorId: user.id, action: 'matrix.link_confirm', targetProfileId: user.id, targetMatrixUserId: challenge.matrix_user_id };
  const consume = () =>
    deps.db.from('matrix_link_challenges').update({ consumed_at: deps.now().toISOString() }).eq('id', challenge.id).is('consumed_at', null).select('id');

  if (new Date(challenge.expires_at) <= deps.now()) {
    await consume();
    await audit(deps.db, { ...base, outcome: 'failure', details: { reason: 'code_expired' } });
    throw new HttpError(410, 'code_expired', 'This code has expired. Ask an admin to send a new one.');
  }

  const expected = Buffer.from(challenge.code_hash, 'hex');
  const actual = Buffer.from(hashLinkCode(challenge.id, code), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    const attempts = challenge.attempts + 1;
    await deps.db.from('matrix_link_challenges').update({ attempts }).eq('id', challenge.id);
    if (attempts >= MAX_LINK_ATTEMPTS) await consume();
    await audit(deps.db, { ...base, outcome: 'failure', details: { reason: 'invalid_code', attempts } });
    if (attempts >= MAX_LINK_ATTEMPTS) {
      throw new HttpError(429, 'too_many_attempts', 'Too many wrong codes. Ask an admin to send a new one.');
    }
    throw new HttpError(400, 'invalid_code', 'That code is not correct', { attemptsRemaining: MAX_LINK_ATTEMPTS - attempts });
  }

  const { data: consumed } = await consume();
  if (!consumed || consumed.length === 0) throw new HttpError(409, 'code_already_used', 'This code was already used');

  const { data: linked } = await deps.db
    .from('matrix_accounts')
    .update({ status: 'active', last_error_code: null, updated_at: deps.now().toISOString() })
    .eq('profile_id', user.id)
    .eq('matrix_user_id', challenge.matrix_user_id)
    .eq('status', 'link_pending')
    .select('id');
  if (!linked || linked.length === 0) {
    await audit(deps.db, { ...base, outcome: 'conflict', details: { reason: 'link_cancelled' } });
    throw new HttpError(409, 'link_cancelled', 'This link request was cancelled');
  }

  await audit(deps.db, { ...base, outcome: 'success' });
  return json(200, { status: 'active', matrixUserId: challenge.matrix_user_id });
}

export async function memberMatrixAction(event: HandlerEvent, deps: Deps) {
  const user = await requireUser(event, deps.db);
  const body = parseJsonBody(event);
  if (body.action === 'claim-password') return claimPassword(deps, user);
  if (body.action === 'confirm-link') return confirmLink(deps, user, body);
  throw new HttpError(400, 'unknown_action', 'Unknown action');
}
