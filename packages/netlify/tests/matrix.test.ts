import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMatrix, LINK_CODE_TTL_MS } from '../lib/handlers/adminMatrix';
import { getMemberMatrix, memberMatrixAction } from '../lib/handlers/memberMatrix';
import { auditRows, call, cleanupUsers, createTestUser, db, FakeProvisioner, makeDeps, type TestUser } from './helpers';

let admin: TestUser;
let member: TestUser;
let provisioner: FakeProvisioner;
let deps: ReturnType<typeof makeDeps>;
let logged: string[];

const uniq = () => `t${Math.random().toString(36).slice(2, 10)}`;
const mx = (localpart: string) => `@${localpart}:ozark-fellowship.netlify.app`;
const provision = (localpart: string, profileId = member.id) =>
  call(adminMatrix, deps, { token: admin.token, body: { action: 'provision', profileId, localpart } });
const startLink = (matrixUserId: string, profileId = member.id) =>
  call(adminMatrix, deps, { token: admin.token, body: { action: 'start-link', profileId, matrixUserId } });
const accountRow = async (profileId = member.id) =>
  (await db.from('matrix_accounts').select('*').eq('profile_id', profileId).maybeSingle()).data;

beforeEach(async () => {
  admin = await createTestUser({ admin: true });
  member = await createTestUser();
  provisioner = new FakeProvisioner();
  deps = makeDeps(provisioner);
  logged = [];
  for (const method of ['log', 'warn', 'error', 'info'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
  }
});
afterEach(() => vi.restoreAllMocks());
afterAll(cleanupUsers);

describe('username validation', () => {
  it.each([
    ['Uppercase', 'invalid_username'],
    ['ab', 'invalid_username'],
    ['.leading', 'invalid_username'],
    ['trailing-', 'invalid_username'],
    ['double..dot', 'invalid_username'],
    ['has space', 'invalid_username'],
    ['admin', 'reserved_username'],
    ['provisioner', 'reserved_username'],
    ['jared.duel', 'blocked_username'],
  ])('rejects %s', async (localpart, error) => {
    const res = await provision(localpart);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(error);
    expect(provisioner.createCalls).toBe(0);
  });

  it('rejects provisioning for a member without a profile', async () => {
    const res = await provision(uniq(), '00000000-0000-0000-0000-00000000dead');
    expect(res.status).toBe(404);
  });
});

describe('provisioning', () => {
  it('creates an ordinary account, marks it active and allows one password claim', async () => {
    const localpart = uniq();
    const res = await provision(localpart);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'active', matrixUserId: mx(localpart) });
    expect(await accountRow()).toMatchObject({ status: 'active', origin: 'provisioned', password_claim_allowed: true });
    const audit = await auditRows(member.id);
    expect(audit.at(-1)).toMatchObject({ action: 'matrix.provision', outcome: 'success', actor_id: admin.id });
  });

  it('treats a repeated request after success as a no-op', async () => {
    const localpart = uniq();
    await provision(localpart);
    const again = await provision(localpart);
    expect(again.status).toBe(200);
    expect(again.body.alreadyActive).toBe(true);
    expect(provisioner.createCalls).toBe(1);
  });

  it('concurrent duplicate requests create exactly one account', async () => {
    const localpart = uniq();
    const results = await Promise.all([provision(localpart), provision(localpart), provision(localpart)]);
    for (const r of results) expect([200, 201]).toContain(r.status);
    expect([...provisioner.accounts.values()].filter((a) => a.profileId === member.id)).toHaveLength(1);
    expect(new Set(provisioner.idempotencyKeys).size).toBe(1);
    expect((await accountRow())!.status).toBe('active');
  });

  it('concurrent requests with different usernames never create two accounts', async () => {
    const results = await Promise.all([provision(uniq()), provision(uniq())]);
    expect([...provisioner.accounts.values()].filter((a) => a.profileId === member.id)).toHaveLength(1);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('recovers from a partial failure (account created, response lost) without a duplicate', async () => {
    const localpart = uniq();
    provisioner.failNextCreate = 'after';
    const first = await provision(localpart);
    expect(first.status).toBe(502);
    expect(first.body).toMatchObject({ error: 'provisioner_unavailable', retryable: true });
    expect(await accountRow()).toMatchObject({ status: 'failed', last_error_code: 'provisioner_unavailable' });

    const retry = await provision(localpart);
    expect(retry.status).toBe(200);
    expect(await accountRow()).toMatchObject({ status: 'active', attempts: 2 });
    expect(provisioner.accounts.size).toBe(1);
    expect(new Set(provisioner.idempotencyKeys).size).toBe(1);
  });

  it('recovers from a failure before creation', async () => {
    const localpart = uniq();
    provisioner.failNextCreate = 'before';
    expect((await provision(localpart)).status).toBe(502);
    expect((await provision(localpart)).status).toBe(201);
  });

  it('requires a retry to reuse the original username', async () => {
    provisioner.failNextCreate = 'before';
    const original = uniq();
    await provision(original);
    const res = await provision(uniq());
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'retry_must_use_same_username', matrixUserId: mx(original) });
  });

  it('lets an admin discard a failed attempt and choose a new name', async () => {
    provisioner.failNextCreate = 'before';
    await provision(uniq());
    const discard = await call(adminMatrix, deps, { token: admin.token, body: { action: 'discard', profileId: member.id } });
    expect(discard.status).toBe(200);
    expect((await provision(uniq())).status).toBe(201);
  });

  it('never discards an active account', async () => {
    await provision(uniq());
    const res = await call(adminMatrix, deps, { token: admin.token, body: { action: 'discard', profileId: member.id } });
    expect(res.status).toBe(409);
  });

  it('returns username_taken for an existing Matrix account and does not link it', async () => {
    const taken = uniq();
    provisioner.seedExisting(taken);
    const res = await provision(taken);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('username_taken');
    expect(await accountRow()).toBeNull();
    expect((await auditRows(member.id)).at(-1)).toMatchObject({ outcome: 'conflict' });
  });

  it('refuses a Matrix ID already linked to another member', async () => {
    const localpart = uniq();
    await provision(localpart);
    const other = await createTestUser();
    const res = await provision(localpart, other.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('matrix_id_in_use');
  });

  it('surfaces profile_has_account from the provisioner without adopting it', async () => {
    const first = uniq();
    await provision(first);
    await db.from('matrix_accounts').delete().eq('profile_id', member.id); // simulate lost local record
    const res = await provision(uniq());
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'profile_has_account', matrixUserId: mx(first) });
    expect(await accountRow()).toBeNull();
  });

  it('reports an unconfigured provisioner as a retryable failure', async () => {
    const { createHttpProvisioner } = await import('../lib/provisioner');
    deps = makeDeps(createHttpProvisioner({}));
    const res = await provision(uniq());
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('provisioner_not_configured');
  });
});

describe('password onboarding', () => {
  const claim = (user: TestUser) => call(memberMatrixAction, deps, { token: user.token, body: { action: 'claim-password' } });

  it('gives the member a one-time password, never stores or logs it', async () => {
    await provision(uniq());
    const res = await claim(member);
    expect(res.status).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');
    const password = res.body.password;
    expect(password).toBe(provisioner.passwords[0]);

    const row = await accountRow();
    expect(row).toMatchObject({ password_claim_allowed: false });
    expect(row!.password_claimed_at).not.toBeNull();
    expect(JSON.stringify(row)).not.toContain(password);
    expect(JSON.stringify(await auditRows(member.id))).not.toContain(password);
    expect(logged.join('\n')).not.toContain(password);
  });

  it('allows only one claim until an admin re-enables it', async () => {
    await provision(uniq());
    expect((await claim(member)).status).toBe(200);
    expect((await claim(member)).status).toBe(409);

    const allow = await call(adminMatrix, deps, { token: admin.token, body: { action: 'allow-password-claim', profileId: member.id } });
    expect(allow.status).toBe(200);
    expect((await claim(member)).status).toBe(200);
    expect(provisioner.passwords).toHaveLength(2);
  });

  it('concurrent claims issue only one password', async () => {
    await provision(uniq());
    const results = await Promise.all([claim(member), claim(member), claim(member)]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(provisioner.passwords).toHaveLength(1);
  });

  it('restores the claim when the provisioner fails', async () => {
    await provision(uniq());
    provisioner.failNextPassword = true;
    expect((await claim(member)).status).toBe(502);
    expect(await accountRow()).toMatchObject({ password_claim_allowed: true, password_claimed_at: null });
    expect((await claim(member)).status).toBe(200);
  });

  it('never lets one member claim another member\'s password', async () => {
    await provision(uniq());
    const other = await createTestUser();
    expect((await claim(other)).status).toBe(409);
    expect(provisioner.passwords).toHaveLength(0);
  });

  it('does not issue passwords for linked (pre-existing) accounts', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    await startLink(mx(existing));
    const code = provisioner.linkCodes.at(-1)!.code;
    await call(memberMatrixAction, deps, { token: member.token, body: { action: 'confirm-link', code } });
    expect((await claim(member)).status).toBe(409);
    const allow = await call(adminMatrix, deps, { token: admin.token, body: { action: 'allow-password-claim', profileId: member.id } });
    expect(allow.status).toBe(409);
  });
});

describe('linking existing accounts', () => {
  const confirm = (user: TestUser, code: string, d = deps) =>
    call(memberMatrixAction, d, { token: user.token, body: { action: 'confirm-link', code } });

  it('links only after the member proves control with the DM code', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    const start = await startLink(mx(existing));
    expect(start.status).toBe(200);
    expect(await accountRow()).toMatchObject({ status: 'link_pending', origin: 'linked' });

    const status = await call(getMemberMatrix, deps, { token: member.token });
    expect(status.body.pendingLink).toMatchObject({ matrixUserId: mx(existing) });

    const { code } = provisioner.linkCodes.at(-1)!;
    const { data: challenge } = await db.from('matrix_link_challenges').select('code_hash').eq('profile_id', member.id).single();
    expect(challenge!.code_hash).not.toContain(code);

    const res = await confirm(member, code.toLowerCase().replace(/(.{4})/, '$1-'));
    expect(res.status).toBe(200);
    expect(await accountRow()).toMatchObject({ status: 'active', matrix_user_id: mx(existing) });
    expect((await auditRows(member.id)).map((a) => [a.action, a.outcome])).toEqual([
      ['matrix.link_start', 'success'],
      ['matrix.link_confirm', 'success'],
    ]);
    expect(JSON.stringify(await auditRows(member.id))).not.toContain(code);
  });

  it('rejects wrong codes and locks after five attempts', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    await startLink(mx(existing));
    for (let i = 1; i <= 4; i++) {
      const res = await confirm(member, 'WRONG999');
      expect(res.status).toBe(400);
      expect(res.body.attemptsRemaining).toBe(5 - i);
    }
    expect((await confirm(member, 'WRONG999')).status).toBe(429);
    const realCode = provisioner.linkCodes.at(-1)!.code;
    expect((await confirm(member, realCode)).status).toBe(404);
    expect((await accountRow())!.status).toBe('link_pending');
  });

  it('a code cannot be used by a different website member', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    await startLink(mx(existing));
    const other = await createTestUser();
    const res = await confirm(other, provisioner.linkCodes.at(-1)!.code);
    expect(res.status).toBe(404);
    expect(await accountRow(other.id)).toBeNull();
  });

  it('expired codes are rejected', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    await startLink(mx(existing));
    const later = makeDeps(provisioner, { now: () => new Date(Date.now() + LINK_CODE_TTL_MS + 1000) });
    expect((await confirm(member, provisioner.linkCodes.at(-1)!.code, later)).status).toBe(410);
  });

  it('a cancelled link cannot be confirmed', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    await startLink(mx(existing));
    await call(adminMatrix, deps, { token: admin.token, body: { action: 'discard', profileId: member.id } });
    expect((await confirm(member, provisioner.linkCodes.at(-1)!.code)).status).toBe(404);
    expect(await accountRow()).toBeNull();
  });

  it('resending replaces the previous code', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    await startLink(mx(existing));
    const firstCode = provisioner.linkCodes.at(-1)!.code;
    expect((await startLink(mx(existing))).status).toBe(200);
    expect((await confirm(member, firstCode)).status).toBe(400);
    expect((await confirm(member, provisioner.linkCodes.at(-1)!.code)).status).toBe(200);
  });

  it('refuses the blocked @jared.duel account', async () => {
    const res = await startLink('@jared.duel:ozark-fellowship.netlify.app');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('blocked_username');
    expect(provisioner.linkCodes).toHaveLength(0);
  });

  it('refuses Matrix IDs from other servers', async () => {
    expect((await startLink('@david:matrix.org')).status).toBe(400);
  });

  it('reports a Matrix ID that does not exist and leaves nothing pending', async () => {
    const res = await startLink(mx(uniq()));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('matrix_user_not_found');
    expect(await accountRow()).toBeNull();
  });

  it('refuses to link an account already linked to someone else', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    await startLink(mx(existing));
    await confirm(member, provisioner.linkCodes.at(-1)!.code);
    const other = await createTestUser();
    const res = await startLink(mx(existing), other.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('matrix_id_in_use');
  });

  it('a provisioner outage while sending the code is retryable', async () => {
    const existing = uniq();
    provisioner.seedExisting(existing);
    provisioner.failNextLinkCode = 'provisioner_unavailable';
    const res = await startLink(mx(existing));
    expect(res.status).toBe(502);
    expect(res.body.retryable).toBe(true);
    expect((await startLink(mx(existing))).status).toBe(200);
  });
});
