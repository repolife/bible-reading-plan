import { createHash, randomUUID } from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';
import { audit } from '../audit';
import { requireAdmin, type SessionUser } from '../auth';
import type { Deps } from '../deps';
import { HttpError, json, parseJsonBody, requireUuid } from '../http';
import { parseMatrixUserId, toMatrixUserId, validateLocalpart } from '../matrix';
import { ProvisionerError } from '../provisioner';

export const LINK_CODE_TTL_MS = 15 * 60 * 1000;

export const hashLinkCode = (challengeId: string, code: string) =>
  createHash('sha256').update(`${challengeId}:${code}`).digest('hex');

interface MatrixAccountRow {
  id: string;
  profile_id: string;
  matrix_user_id: string;
  origin: 'provisioned' | 'linked';
  status: 'provisioning' | 'active' | 'failed' | 'link_pending';
  request_id: string;
  attempts: number;
  password_claimed_at: string | null;
}

async function getAccountForProfile(deps: Deps, profileId: string): Promise<MatrixAccountRow | null> {
  const { data, error } = await deps.db.from('matrix_accounts').select('*').eq('profile_id', profileId).maybeSingle();
  if (error) throw new HttpError(502, 'db_read_failed', 'Could not load Matrix status');
  return data;
}

async function requireProfile(deps: Deps, profileId: string) {
  const { data, error } = await deps.db.from('profiles').select('id').eq('id', profileId).maybeSingle();
  if (error) throw new HttpError(502, 'db_read_failed', 'Could not load member');
  if (!data) throw new HttpError(404, 'profile_not_found', 'Member not found. They may need to accept their invitation first.');
}

async function closeOpenChallenges(deps: Deps, profileId: string) {
  await deps.db
    .from('matrix_link_challenges')
    .update({ consumed_at: deps.now().toISOString() })
    .eq('profile_id', profileId)
    .is('consumed_at', null);
}

// Shared by the admin action and member self-setup. Callers must authorize
// the actor for this profile first.
export async function provisionAccount(deps: Deps, actorId: string, profileId: string, rawLocalpart: unknown, action: string) {
  const check = validateLocalpart(rawLocalpart);
  if (!check.ok) throw new HttpError(400, check.reason, check.message);
  const { localpart } = check;
  const matrixUserId = toMatrixUserId(localpart);
  await requireProfile(deps, profileId);

  const base = { actorId, action, targetProfileId: profileId, targetMatrixUserId: matrixUserId };

  // Reserve the (profile, Matrix ID) pair. Unique constraints make concurrent
  // or repeated requests converge on one row and one idempotency key.
  let row = await getAccountForProfile(deps, profileId);
  let inserted = false;
  if (!row) {
    const { data, error } = await deps.db
      .from('matrix_accounts')
      .insert({
        profile_id: profileId,
        matrix_user_id: matrixUserId,
        origin: 'provisioned',
        status: 'provisioning',
        request_id: randomUUID(),
        created_by: actorId,
      })
      .select('*')
      .single();
    if (error?.code === '23505') {
      // Lost a race, or the Matrix ID belongs to someone else.
      row = await getAccountForProfile(deps, profileId);
      if (!row) {
        await audit(deps.db, { ...base, outcome: 'conflict', details: { reason: 'matrix_id_in_use' } });
        throw new HttpError(409, 'matrix_id_in_use', 'That Matrix ID is already linked to another member');
      }
    } else if (error || !data) {
      throw new HttpError(502, 'db_write_failed', 'Could not start provisioning');
    } else {
      row = data as MatrixAccountRow;
      inserted = true;
    }
  }
  if (!inserted) {
    if (row.status === 'active') {
      if (row.matrix_user_id === matrixUserId) return json(200, { status: 'active', matrixUserId, alreadyActive: true });
      throw new HttpError(409, 'profile_has_account', 'This member already has a Matrix account', {
        matrixUserId: row.matrix_user_id,
      });
    }
    if (row.origin === 'linked') {
      throw new HttpError(409, 'link_in_progress', 'Cancel the pending link before creating a new account', {
        matrixUserId: row.matrix_user_id,
      });
    }
    if (row.matrix_user_id !== matrixUserId) {
      throw new HttpError(409, 'retry_must_use_same_username', 'Retry with the original username, or discard the failed attempt first', {
        matrixUserId: row.matrix_user_id,
      });
    }
    await deps.db
      .from('matrix_accounts')
      .update({ status: 'provisioning', attempts: row.attempts + 1, last_error_code: null, updated_at: deps.now().toISOString() })
      .eq('id', row.id);
  }

  let result;
  try {
    result = await deps.provisioner.createAccount({ profileId, localpart, idempotencyKey: row.request_id });
  } catch (error) {
    const code = error instanceof ProvisionerError ? error.code : 'provisioner_error';
    await deps.db
      .from('matrix_accounts')
      .update({ status: 'failed', last_error_code: code, updated_at: deps.now().toISOString() })
      .eq('id', row.id);
    await audit(deps.db, { ...base, outcome: 'failure', details: { reason: code } });
    throw new HttpError(502, code, 'Matrix provisioning failed. It is safe to retry.', { retryable: true, matrixUserId });
  }

  if (result.kind === 'username_taken' || result.kind === 'profile_has_account') {
    // Definitely not created for this request: release the reservation so the
    // admin can choose again. Never adopt an account we did not create here.
    await deps.db.from('matrix_accounts').delete().eq('id', row.id);
    await audit(deps.db, { ...base, outcome: 'conflict', details: { reason: result.kind } });
    if (result.kind === 'username_taken') {
      throw new HttpError(409, 'username_taken', 'That Matrix username already exists. Choose another, or link the existing account.');
    }
    throw new HttpError(409, 'profile_has_account', 'The provisioner already created a different Matrix account for this member', {
      matrixUserId: result.userId,
    });
  }

  if (result.userId !== matrixUserId) {
    await deps.db
      .from('matrix_accounts')
      .update({ status: 'failed', last_error_code: 'provisioner_mismatch', updated_at: deps.now().toISOString() })
      .eq('id', row.id);
    await audit(deps.db, { ...base, outcome: 'failure', details: { reason: 'provisioner_mismatch' } });
    throw new HttpError(502, 'provisioner_mismatch', 'The provisioner returned an unexpected account');
  }

  await deps.db
    .from('matrix_accounts')
    .update({
      status: 'active',
      last_error_code: null,
      password_claim_allowed: row.password_claimed_at === null,
      updated_at: deps.now().toISOString(),
    })
    .eq('id', row.id);
  await audit(deps.db, { ...base, outcome: 'success', details: { created: result.kind === 'created', attempt: row.attempts } });
  return json(result.kind === 'created' ? 201 : 200, { status: 'active', matrixUserId });
}

async function provision(deps: Deps, admin: SessionUser, body: Record<string, unknown>) {
  const profileId = requireUuid(body.profileId, 'profileId');
  return provisionAccount(deps, admin.id, profileId, body.localpart, 'matrix.provision');
}

async function startLink(deps: Deps, admin: SessionUser, body: Record<string, unknown>) {
  const profileId = requireUuid(body.profileId, 'profileId');
  const check = parseMatrixUserId(body.matrixUserId);
  if (!check.ok) throw new HttpError(400, check.reason, check.message);
  const matrixUserId = toMatrixUserId(check.localpart);
  await requireProfile(deps, profileId);
  const base = { actorId: admin.id, action: 'matrix.link_start', targetProfileId: profileId, targetMatrixUserId: matrixUserId };

  const existing = await getAccountForProfile(deps, profileId);
  if (existing && !(existing.status === 'link_pending' && existing.matrix_user_id === matrixUserId)) {
    const code = existing.status === 'active' ? 'profile_has_account' : existing.origin === 'linked' ? 'link_in_progress' : 'provisioning_in_progress';
    throw new HttpError(409, code, 'This member already has a Matrix account or a pending request', {
      matrixUserId: existing.matrix_user_id,
    });
  }
  if (!existing) {
    const { error } = await deps.db.from('matrix_accounts').insert({
      profile_id: profileId,
      matrix_user_id: matrixUserId,
      origin: 'linked',
      status: 'link_pending',
      request_id: randomUUID(),
      created_by: admin.id,
    });
    if (error?.code === '23505') {
      await audit(deps.db, { ...base, outcome: 'conflict', details: { reason: 'matrix_id_in_use' } });
      throw new HttpError(409, 'matrix_id_in_use', 'That Matrix ID is already linked to another member');
    }
    if (error) throw new HttpError(502, 'db_write_failed', 'Could not start linking');
  }

  await closeOpenChallenges(deps, profileId);
  const code = deps.randomCode();
  const challengeId = randomUUID();
  const expiresAt = new Date(deps.now().getTime() + LINK_CODE_TTL_MS).toISOString();
  const { error: challengeError } = await deps.db.from('matrix_link_challenges').insert({
    id: challengeId,
    profile_id: profileId,
    matrix_user_id: matrixUserId,
    code_hash: hashLinkCode(challengeId, code),
    expires_at: expiresAt,
    created_by: admin.id,
  });
  if (challengeError) throw new HttpError(502, 'db_write_failed', 'Could not start linking');

  try {
    await deps.provisioner.sendLinkCode({ userId: matrixUserId, code });
  } catch (error) {
    const reason = error instanceof ProvisionerError ? error.code : 'provisioner_error';
    await closeOpenChallenges(deps, profileId);
    if (reason === 'user_not_found') {
      await deps.db.from('matrix_accounts').delete().eq('profile_id', profileId).eq('status', 'link_pending');
      await audit(deps.db, { ...base, outcome: 'failure', details: { reason } });
      throw new HttpError(404, 'matrix_user_not_found', 'No Matrix account with that ID exists');
    }
    await deps.db.from('matrix_accounts').update({ last_error_code: reason, updated_at: deps.now().toISOString() }).eq('profile_id', profileId);
    await audit(deps.db, { ...base, outcome: 'failure', details: { reason } });
    throw new HttpError(502, reason, 'The link code could not be sent. It is safe to retry.', { retryable: true });
  }

  await deps.db.from('matrix_accounts').update({ last_error_code: null, updated_at: deps.now().toISOString() }).eq('profile_id', profileId);
  await audit(deps.db, { ...base, outcome: 'success' });
  return json(200, { status: 'link_pending', matrixUserId, expiresAt });
}

// Removes a failed provisioning attempt or a pending link. Active links are
// never removed here.
async function discard(deps: Deps, admin: SessionUser, body: Record<string, unknown>) {
  const profileId = requireUuid(body.profileId, 'profileId');
  const row = await getAccountForProfile(deps, profileId);
  if (!row) throw new HttpError(404, 'not_found', 'Nothing to discard');
  if (row.status !== 'failed' && row.status !== 'link_pending') {
    throw new HttpError(409, 'not_discardable', 'Only failed attempts or pending links can be discarded');
  }
  await closeOpenChallenges(deps, profileId);
  await deps.db.from('matrix_accounts').delete().eq('id', row.id).in('status', ['failed', 'link_pending']);
  await audit(deps.db, {
    actorId: admin.id,
    action: 'matrix.discard',
    outcome: 'success',
    targetProfileId: profileId,
    targetMatrixUserId: row.matrix_user_id,
    details: { previousStatus: row.status },
  });
  return json(200, { status: 'none' });
}

async function allowPasswordClaim(deps: Deps, admin: SessionUser, body: Record<string, unknown>) {
  const profileId = requireUuid(body.profileId, 'profileId');
  const row = await getAccountForProfile(deps, profileId);
  if (!row || row.status !== 'active' || row.origin !== 'provisioned') {
    throw new HttpError(409, 'not_claimable', 'Only active accounts created by this tool can receive a password');
  }
  await deps.db
    .from('matrix_accounts')
    .update({ password_claim_allowed: true, updated_at: deps.now().toISOString() })
    .eq('id', row.id);
  await audit(deps.db, {
    actorId: admin.id,
    action: 'matrix.allow_password_claim',
    outcome: 'success',
    targetProfileId: profileId,
    targetMatrixUserId: row.matrix_user_id,
  });
  return json(200, { status: 'active', passwordClaimAllowed: true });
}

const ACTIONS = {
  provision,
  'start-link': startLink,
  discard,
  'allow-password-claim': allowPasswordClaim,
} as const;

export async function adminMatrix(event: HandlerEvent, deps: Deps) {
  const admin = await requireAdmin(event, deps.db, 'matrix.admin');
  const body = parseJsonBody(event);
  const action = ACTIONS[body.action as keyof typeof ACTIONS];
  if (!action) throw new HttpError(400, 'unknown_action', 'Unknown action');
  return action(deps, admin, body);
}
