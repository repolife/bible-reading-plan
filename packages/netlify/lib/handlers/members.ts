import type { HandlerEvent } from '@netlify/functions';
import type { User } from '@supabase/supabase-js';
import { SERVANT_ROLES } from '../../../frontend/src/utils/servantRoles.js';
import { audit } from '../audit';
import { requireAdmin } from '../auth';
import type { Deps } from '../deps';
import { HttpError, json, parseJsonBody, requireUuid } from '../http';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listAllAuthUsers(deps: Deps): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await deps.db.auth.admin.listUsers({ page, perPage });
    if (error) throw new HttpError(502, 'auth_list_failed', 'Could not load members');
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
}

export async function listMembers(event: HandlerEvent, deps: Deps) {
  await requireAdmin(event, deps.db, 'members.list');

  const [authUsers, profilesResult, matrixResult] = await Promise.all([
    listAllAuthUsers(deps),
    deps.db
      .from('profiles')
      .select('id, name, avatar_url, servant_roles, is_admin, hidden_from_directory, has_password, family_id, created_at'),
    deps.db
      .from('matrix_accounts')
      .select('profile_id, matrix_user_id, origin, status, attempts, last_error_code, password_claim_allowed, password_claimed_at, updated_at'),
  ]);
  if (profilesResult.error || matrixResult.error) throw new HttpError(502, 'db_read_failed', 'Could not load members');

  const profiles = new Map(profilesResult.data.map((p) => [p.id, p]));
  const matrix = new Map(matrixResult.data.map((m) => [m.profile_id, m]));
  const users = new Map(authUsers.map((u) => [u.id, u]));
  const ids = new Set([...users.keys(), ...profiles.keys()]);

  const members = [...ids].map((id) => {
    const user = users.get(id);
    const profile = profiles.get(id);
    const link = matrix.get(id);
    return {
      id,
      email: user?.email ?? null,
      invitedAt: user?.invited_at ?? null,
      emailConfirmedAt: user?.email_confirmed_at ?? null,
      lastSignInAt: user?.last_sign_in_at ?? null,
      hasProfile: Boolean(profile),
      name: profile?.name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      servantRoles: profile?.servant_roles ?? [],
      isAdmin: profile?.is_admin === true,
      hiddenFromDirectory: profile?.hidden_from_directory === true,
      hasPassword: profile?.has_password === true,
      matrix: link
        ? {
            userId: link.matrix_user_id,
            origin: link.origin,
            status: link.status,
            attempts: link.attempts,
            lastErrorCode: link.last_error_code,
            passwordClaimAllowed: link.password_claim_allowed,
            passwordClaimedAt: link.password_claimed_at,
            updatedAt: link.updated_at,
          }
        : null,
    };
  });

  members.sort((a, b) => (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? ''));
  return json(200, { members, servantRoles: SERVANT_ROLES });
}

export async function inviteMember(event: HandlerEvent, deps: Deps) {
  const admin = await requireAdmin(event, deps.db, 'members.invite');
  const body = parseJsonBody(event);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'invalid_email', 'Enter a valid email address');
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';

  const { data, error } = await deps.db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${deps.siteUrl}/account`,
    data: name ? { name } : undefined,
  });
  if (error || !data.user) {
    const exists = error?.code === 'email_exists' || error?.status === 422;
    await audit(deps.db, {
      actorId: admin.id,
      action: 'members.invite',
      outcome: exists ? 'conflict' : 'failure',
      details: { reason: exists ? 'already_registered' : error?.code ?? 'unknown' },
    });
    if (exists) throw new HttpError(409, 'already_registered', 'That email already has a website account');
    throw new HttpError(502, 'invite_failed', 'The invitation could not be sent');
  }

  // No auth trigger creates profiles in this project, so create one now so
  // admins can assign roles and enable chat before the first sign-in.
  const { error: profileError } = await deps.db
    .from('profiles')
    .upsert({ id: data.user.id, ...(name ? { name } : {}) }, { onConflict: 'id', ignoreDuplicates: true });

  await audit(deps.db, {
    actorId: admin.id,
    action: 'members.invite',
    outcome: 'success',
    targetProfileId: data.user.id,
    details: { profileCreated: !profileError },
  });
  return json(201, { id: data.user.id, email, profileCreated: !profileError });
}

export async function setServantRoles(event: HandlerEvent, deps: Deps) {
  const admin = await requireAdmin(event, deps.db, 'members.servant_roles');
  const body = parseJsonBody(event);
  const profileId = requireUuid(body.profileId, 'profileId');

  if (!Array.isArray(body.roles) || body.roles.some((r) => typeof r !== 'string')) {
    throw new HttpError(400, 'invalid_roles', 'roles must be a list of role names');
  }
  const unknown = body.roles.filter((r) => !SERVANT_ROLES.includes(r as string));
  if (unknown.length > 0) throw new HttpError(400, 'invalid_roles', 'Unknown servant role', { unknown });
  // Canonical order, no duplicates.
  const roles = SERVANT_ROLES.filter((r) => (body.roles as string[]).includes(r));

  const { data: before } = await deps.db.from('profiles').select('servant_roles').eq('id', profileId).maybeSingle();
  if (!before) throw new HttpError(404, 'profile_not_found', 'Member not found');

  const { error } = await deps.db.from('profiles').update({ servant_roles: roles }).eq('id', profileId);
  if (error) throw new HttpError(502, 'db_write_failed', 'Could not save roles');

  await audit(deps.db, {
    actorId: admin.id,
    action: 'members.servant_roles',
    outcome: 'success',
    targetProfileId: profileId,
    details: { before: before.servant_roles ?? [], after: roles },
  });
  return json(200, { profileId, servantRoles: roles });
}
