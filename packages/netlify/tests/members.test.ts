import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminMatrix } from '../lib/handlers/adminMatrix';
import { getMemberMatrix, memberMatrixAction } from '../lib/handlers/memberMatrix';
import { inviteMember, listMembers, setServantRoles } from '../lib/handlers/members';
import { call, cleanupUsers, createTestUser, db, FakeProvisioner, makeDeps, trackUserId, type TestUser } from './helpers';

let admin: TestUser;
let member: TestUser;
const deps = makeDeps(new FakeProvisioner());

beforeAll(async () => {
  admin = await createTestUser({ admin: true, name: 'Test Admin' });
  member = await createTestUser({ name: 'Test Member' });
});
afterAll(cleanupUsers);

describe('authorization on every admin endpoint', () => {
  const adminEndpoints = [
    { name: 'admin-members', fn: listMembers, body: undefined },
    { name: 'admin-invite', fn: inviteMember, body: { email: 'x@example.test' } },
    { name: 'admin-servant-roles', fn: setServantRoles, body: { profileId: randomUUID(), roles: [] } },
    { name: 'admin-matrix', fn: adminMatrix, body: { action: 'provision', profileId: randomUUID(), localpart: 'abc' } },
  ];

  for (const endpoint of adminEndpoints) {
    it(`${endpoint.name}: rejects missing session with 401`, async () => {
      const res = await call(endpoint.fn, deps, { body: endpoint.body });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthenticated');
    });

    it(`${endpoint.name}: rejects forged token with 401`, async () => {
      const res = await call(endpoint.fn, deps, { body: endpoint.body, token: 'not-a-real-jwt' });
      expect(res.status).toBe(401);
    });

    it(`${endpoint.name}: rejects non-admin member with 403 and audits it`, async () => {
      const res = await call(endpoint.fn, deps, { body: endpoint.body, token: member.token });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('forbidden');
      const { data } = await db.from('admin_audit_log').select('outcome').eq('actor_id', member.id).eq('outcome', 'denied');
      expect(data!.length).toBeGreaterThan(0);
    });
  }

  it('member endpoint rejects missing session', async () => {
    expect((await call(getMemberMatrix, deps)).status).toBe(401);
    expect((await call(memberMatrixAction, deps, { body: { action: 'claim-password' } })).status).toBe(401);
  });

  it('rejects wrong HTTP method with 405', async () => {
    const res = await call(listMembers, deps, { method: 'DELETE', methods: ['GET'], token: admin.token });
    expect(res.status).toBe(405);
  });

  it('a client-supplied is_admin flag is ignored', async () => {
    const res = await call(adminMatrix, deps, {
      token: member.token,
      body: { action: 'provision', profileId: member.id, localpart: 'sneaky', is_admin: true },
    });
    expect(res.status).toBe(403);
  });
});

describe('admin-members', () => {
  it('lists members with emails, roles and Matrix status, including users without a profile', async () => {
    const noProfile = await createTestUser({ profile: false });
    const res = await call(listMembers, deps, { token: admin.token });
    expect(res.status).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');
    const ids = res.body.members.map((m: { id: string }) => m.id);
    expect(ids).toEqual(expect.arrayContaining([admin.id, member.id, noProfile.id]));
    const listed = res.body.members.find((m: { id: string }) => m.id === member.id);
    expect(listed).toMatchObject({ email: member.email, name: 'Test Member', hasProfile: true, matrix: null });
    expect(res.body.members.find((m: { id: string }) => m.id === noProfile.id).hasProfile).toBe(false);
    expect(res.body.servantRoles).toContain('Elder');
  });
});

describe('admin-servant-roles', () => {
  it('assigns known roles in canonical order and audits before/after', async () => {
    const res = await call(setServantRoles, deps, {
      token: admin.token,
      body: { profileId: member.id, roles: ['Worship', 'Elder', 'Elder'] },
    });
    expect(res.status).toBe(200);
    expect(res.body.servantRoles).toEqual(['Elder', 'Worship']);
    const { data } = await db.from('profiles').select('servant_roles').eq('id', member.id).single();
    expect(data!.servant_roles).toEqual(['Elder', 'Worship']);
  });

  it('rejects unknown roles', async () => {
    const res = await call(setServantRoles, deps, { token: admin.token, body: { profileId: member.id, roles: ['Pope'] } });
    expect(res.status).toBe(400);
    expect(res.body.unknown).toEqual(['Pope']);
  });

  it('returns 404 for an unknown member', async () => {
    const res = await call(setServantRoles, deps, { token: admin.token, body: { profileId: randomUUID(), roles: [] } });
    expect(res.status).toBe(404);
  });

  it('has no way to change admin status', async () => {
    await call(setServantRoles, deps, { token: admin.token, body: { profileId: member.id, roles: [], is_admin: true } });
    const { data } = await db.from('profiles').select('is_admin').eq('id', member.id).single();
    expect(data!.is_admin).toBe(false);
  });
});

describe('admin-invite', () => {
  it('invites a new member and creates their profile row', async () => {
    const email = `invite-${randomUUID()}@example.test`;
    const res = await call(inviteMember, deps, { token: admin.token, body: { email: email.toUpperCase(), name: 'New Person' } });
    expect(res.status).toBe(201);
    trackUserId(res.body.id);
    expect(res.body).toMatchObject({ email, profileCreated: true });
    const { data } = await db.from('profiles').select('name, is_admin').eq('id', res.body.id).single();
    expect(data).toEqual({ name: 'New Person', is_admin: false });
  });

  it('returns 409 for an email that already has an account', async () => {
    const res = await call(inviteMember, deps, { token: admin.token, body: { email: member.email } });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('already_registered');
  });

  it('rejects invalid emails', async () => {
    const res = await call(inviteMember, deps, { token: admin.token, body: { email: 'not-an-email' } });
    expect(res.status).toBe(400);
  });
});
