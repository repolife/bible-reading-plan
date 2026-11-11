import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProvisioner } from '../../matrix-provisioner/src/server.mjs';
import { openStore } from '../../matrix-provisioner/src/store.mjs';
import { createSynapseClient } from '../../matrix-provisioner/src/synapse.mjs';
import { startFakeSynapse } from '../../matrix-provisioner/test/fake-synapse.mjs';
import { createHttpProvisioner, type Provisioner } from '../lib/provisioner';

// Runs the real Netlify client against the real provisioning service (with a
// fake Synapse behind it) so the signed wire contract cannot drift.
const SERVER = 'ozark-fellowship.netlify.app';
const SECRET = 's'.repeat(40);

let fake: any;
let server: Server;
let dir: string;
let client: Provisioner;

beforeAll(async () => {
  fake = await startFakeSynapse({ sharedSecret: 'shared', adminToken: 'admin-token', serverName: SERVER });
  dir = await mkdtemp(join(tmpdir(), 'contract-'));
  server = createProvisioner({
    config: { serverName: SERVER, hmacSecret: SECRET },
    store: await openStore(join(dir, 'state.json')),
    synapse: createSynapseClient({ baseUrl: fake.url, registrationSharedSecret: 'shared', adminToken: 'admin-token' }),
    log: () => {},
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  client = createHttpProvisioner({ baseUrl: `http://127.0.0.1:${port}/`, secret: SECRET });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fake.close();
  await rm(dir, { recursive: true, force: true });
});

describe('Netlify client ↔ provisioning service contract', () => {
  const profileId = randomUUID();
  const key = randomUUID();

  it('creates, then reports existing, for the same profile', async () => {
    expect(await client.createAccount({ profileId, localpart: 'contract', idempotencyKey: key })).toEqual({
      kind: 'created',
      userId: `@contract:${SERVER}`,
    });
    expect(await client.createAccount({ profileId, localpart: 'contract', idempotencyKey: key })).toEqual({
      kind: 'existing',
      userId: `@contract:${SERVER}`,
    });
  });

  it('maps conflicts', async () => {
    expect(await client.createAccount({ profileId, localpart: 'other', idempotencyKey: randomUUID() })).toEqual({
      kind: 'profile_has_account',
      userId: `@contract:${SERVER}`,
    });
    fake.seed('david');
    expect(await client.createAccount({ profileId: randomUUID(), localpart: 'david', idempotencyKey: randomUUID() })).toEqual({
      kind: 'username_taken',
    });
  });

  it('issues passwords only for managed accounts', async () => {
    const { password } = await client.issuePassword({ profileId, userId: `@contract:${SERVER}` });
    expect(fake.users.get(`@contract:${SERVER}`).password).toBe(password);
    await expect(client.issuePassword({ profileId, userId: `@david:${SERVER}` })).rejects.toMatchObject({ code: 'not_managed' });
  });

  it('sends link codes and reports unknown users', async () => {
    await expect(client.sendLinkCode({ userId: `@david:${SERVER}`, code: 'ABCD2345' })).resolves.toBeUndefined();
    await expect(client.sendLinkCode({ userId: `@nobody:${SERVER}`, code: 'ABCD2345' })).rejects.toMatchObject({
      code: 'user_not_found',
    });
  });

  it('rejects a client with the wrong secret', async () => {
    const { port } = server.address() as { port: number };
    const wrong = createHttpProvisioner({ baseUrl: `http://127.0.0.1:${port}`, secret: 'x'.repeat(40) });
    await expect(wrong.sendLinkCode({ userId: `@david:${SERVER}`, code: 'ABCD2345' })).rejects.toMatchObject({
      code: 'bad_signature',
    });
  });
});
