import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { sign } from '../src/auth.mjs';
import { createProvisioner } from '../src/server.mjs';
import { openStore } from '../src/store.mjs';
import { createSynapseClient } from '../src/synapse.mjs';
import { startFakeSynapse } from './fake-synapse.mjs';

const SERVER = 'ozark-fellowship.netlify.app';
const HMAC_SECRET = 'h'.repeat(40);
const SHARED_SECRET = 'registration-shared-secret';
const ADMIN_TOKEN = 'bot-admin-token';
const ANNOUNCEMENTS_ROOM = `!alerts:${SERVER}`;

let fake, dir, stateFile, server, baseUrl, logs;

async function startService(config = {}) {
  const store = await openStore(stateFile);
  const synapse = createSynapseClient({ baseUrl: fake.url, registrationSharedSecret: SHARED_SECRET, adminToken: ADMIN_TOKEN });
  server = createProvisioner({
    config: { serverName: SERVER, hmacSecret: HMAC_SECRET, announcementsRoomId: ANNOUNCEMENTS_ROOM, ...config },
    store,
    synapse,
    log: (line) => logs.push(line),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}
const stopService = () => new Promise((resolve) => server.close(resolve));

beforeEach(async () => {
  logs = [];
  fake = await startFakeSynapse({ sharedSecret: SHARED_SECRET, adminToken: ADMIN_TOKEN, serverName: SERVER });
  dir = await mkdtemp(join(tmpdir(), 'provisioner-test-'));
  stateFile = join(dir, 'state.json');
  await startService();
});
afterEach(async () => {
  await stopService();
  await fake.close();
  await rm(dir, { recursive: true, force: true });
});

async function post(path, body, overrides = {}) {
  const raw = JSON.stringify(body);
  const timestamp = overrides.timestamp ?? Math.floor(Date.now() / 1000).toString();
  const nonce = overrides.nonce ?? randomBytes(16).toString('hex');
  const signature = overrides.signature ?? sign(overrides.secret ?? HMAC_SECRET, timestamp, nonce, 'POST', path, raw);
  const headers = { 'Content-Type': 'application/json' };
  if (!overrides.unsigned) {
    headers['X-Provisioner-Timestamp'] = timestamp;
    headers['X-Provisioner-Nonce'] = nonce;
    headers['X-Provisioner-Signature'] = signature;
  }
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: overrides.rawBody ?? raw });
  return { status: res.status, body: await res.json() };
}

const profileA = randomUUID();
const profileB = randomUUID();
const createAccount = (localpart, profileId = profileA) =>
  post('/v1/accounts', { profile_id: profileId, localpart, idempotency_key: randomUUID() });

describe('request authentication', () => {
  it('serves an unauthenticated health check that reveals nothing', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });

  it('rejects unsigned requests', async () => {
    const res = await post('/v1/accounts', {}, { unsigned: true });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'missing_signature');
  });

  it('rejects a wrong secret', async () => {
    const res = await createAccountWith({ secret: 'wrong-secret-wrong-secret-wrong-secret' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'bad_signature');
  });

  it('rejects a tampered body', async () => {
    const body = { profile_id: profileA, localpart: 'alice', idempotency_key: randomUUID() };
    const res = await post('/v1/accounts', body, { rawBody: JSON.stringify({ ...body, localpart: 'mallory' }) });
    assert.equal(res.status, 401);
    assert.equal(fake.registrations.length, 0);
  });

  it('rejects stale timestamps', async () => {
    const res = await createAccountWith({ timestamp: String(Math.floor(Date.now() / 1000) - 3600) });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'stale_request');
  });

  it('rejects replayed requests, even after a restart', async () => {
    const nonce = randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = { user_id: `@nobody:${SERVER}`, code: 'ABCD2345' };
    const first = await post('/v1/link-codes', body, { nonce, timestamp });
    assert.equal(first.status, 404);
    await stopService();
    await startService();
    const replay = await post('/v1/link-codes', body, { nonce, timestamp });
    assert.equal(replay.status, 401);
    assert.equal(replay.body.error, 'replayed_request');
  });

  it('does not expose any other route, including the Synapse admin API', async () => {
    const res = await post('/_synapse/admin/v1/deactivate/x', {});
    assert.equal(res.status, 404);
  });

  it('rejects oversized bodies', async () => {
    const res = await post('/v1/accounts', { pad: 'x'.repeat(20_000) });
    assert.equal(res.status, 413);
  });

  function createAccountWith(overrides) {
    return post('/v1/accounts', { profile_id: profileA, localpart: 'alice', idempotency_key: randomUUID() }, overrides);
  }
});

describe('POST /v1/accounts', () => {
  it('creates an ordinary (non-admin) user and ends the registration session', async () => {
    const res = await createAccount('alice');
    assert.equal(res.status, 201);
    assert.deepEqual(res.body, { user_id: `@alice:${SERVER}` });
    assert.deepEqual(fake.registrations, [{ username: 'alice', admin: false }]);
    assert.equal(fake.users.get(`@alice:${SERVER}`).admin, false);
    assert.deepEqual(fake.logouts, ['Bearer tok-alice']);
  });

  it('never writes passwords to the state file or logs', async () => {
    await createAccount('alice');
    const password = fake.users.get(`@alice:${SERVER}`).password;
    assert.ok(!(await readFile(stateFile, 'utf8')).includes(password));
    assert.ok(!logs.join('\n').includes(password));
  });

  it('is idempotent for the same profile and username', async () => {
    await createAccount('alice');
    const again = await createAccount('alice');
    assert.equal(again.status, 200);
    assert.equal(fake.registrations.length, 1);
  });

  it('survives a restart without forgetting what it created', async () => {
    await createAccount('alice');
    await stopService();
    await startService();
    assert.equal((await createAccount('alice')).status, 200);
    assert.equal((await createAccount('bob')).status, 409);
  });

  it('refuses a second account for the same profile', async () => {
    await createAccount('alice');
    const res = await createAccount('alice2');
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: 'profile_has_account', user_id: `@alice:${SERVER}` });
    assert.equal(fake.registrations.length, 1);
  });

  it('refuses a username another profile owns', async () => {
    await createAccount('alice');
    const res = await createAccount('alice', profileB);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'username_taken');
  });

  it('refuses existing accounts it did not create, without touching them', async () => {
    fake.seed('david');
    const res = await createAccount('david');
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'username_taken');
    assert.equal(fake.registrations.length, 0);
    assert.equal(fake.users.get(`@david:${SERVER}`).password, 'existing');
  });

  for (const [localpart, error] of [
    ['Alice', 'invalid_username'],
    ['a', 'invalid_username'],
    ['admin', 'reserved_username'],
    ['jared.duel', 'blocked_username'],
  ]) {
    it(`rejects ${localpart}`, async () => {
      const res = await createAccount(localpart);
      assert.equal(res.status, 400);
      assert.equal(res.body.error, error);
    });
  }

  it('recovers when Synapse created the account but the response was lost', async () => {
    fake.failAfterCreate = true;
    const first = await createAccount('alice');
    assert.equal(first.status, 502);
    const retry = await createAccount('alice');
    assert.equal(retry.status, 200);
    assert.equal(fake.registrations.length, 1);
    assert.equal([...fake.users.keys()].length, 1);
  });

  it('recovers after a crash between recording intent and registering', async () => {
    fake.failAfterCreate = true;
    await createAccount('alice');
    await stopService();
    await startService();
    // A different username for the same profile must surface the first one.
    const res = await createAccount('alice2');
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: 'profile_has_account', user_id: `@alice:${SERVER}` });
  });

  it('retries cleanly when Synapse was down', async () => {
    fake.down = true;
    assert.equal((await createAccount('alice')).status, 502);
    fake.down = false;
    assert.equal((await createAccount('alice')).status, 201);
  });

  it('does not adopt an older account found while resolving a pending record', async () => {
    fake.failRegister = true;
    assert.equal((await createAccount('carol')).status, 502); // leaves a pending record
    assert.equal(JSON.parse(await readFile(stateFile, 'utf8')).accounts.carol.state, 'pending');
    fake.seed('carol'); // created a day earlier by someone else
    const res = await createAccount('carol');
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'username_taken');
    assert.equal(JSON.parse(await readFile(stateFile, 'utf8')).accounts.carol, undefined);
    assert.equal(fake.registrations.length, 0);
  });
});

describe('POST /v1/accounts/password', () => {
  it('resets the password of an account it created and returns it once', async () => {
    await createAccount('alice');
    const res = await post('/v1/accounts/password', { profile_id: profileA, user_id: `@alice:${SERVER}` });
    assert.equal(res.status, 200);
    assert.match(res.body.password, /^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){5}$/);
    assert.equal(fake.users.get(`@alice:${SERVER}`).password, res.body.password);
    assert.deepEqual(fake.resets, [{ userId: `@alice:${SERVER}`, logoutDevices: true }]);
    assert.ok(!logs.join('\n').includes(res.body.password));
    assert.ok(!(await readFile(stateFile, 'utf8')).includes(res.body.password));
  });

  it('refuses accounts it did not create', async () => {
    fake.seed('david', { admin: true });
    const res = await post('/v1/accounts/password', { profile_id: profileA, user_id: `@david:${SERVER}` });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'not_managed');
    assert.equal(fake.resets.length, 0);
  });

  it('refuses a different profile than the one the account was created for', async () => {
    await createAccount('alice');
    const res = await post('/v1/accounts/password', { profile_id: profileB, user_id: `@alice:${SERVER}` });
    assert.equal(res.status, 403);
  });

  it('refuses the blocked account and other servers', async () => {
    for (const userId of [`@jared.duel:${SERVER}`, '@alice:matrix.org']) {
      const res = await post('/v1/accounts/password', { profile_id: profileA, user_id: userId });
      assert.equal(res.status, 400);
    }
  });
});

describe('POST /v1/link-codes', () => {
  it('DMs the code to an existing user', async () => {
    fake.seed('jared.deuel');
    const res = await post('/v1/link-codes', { user_id: `@jared.deuel:${SERVER}`, code: 'ABCD2345' });
    assert.equal(res.status, 202);
    const [room] = [...fake.rooms.values()];
    assert.deepEqual(room.invite, [`@jared.deuel:${SERVER}`]);
    assert.equal(room.isDirect, true);
    assert.equal(room.messages[0].msgtype, 'm.notice');
    assert.match(room.messages[0].body, /ABCD-2345/);
    assert.ok(!logs.join('\n').includes('ABCD'));
  });

  it('reuses the DM room, and replaces it if the bot was removed', async () => {
    fake.seed('kristine.vargas');
    const body = { user_id: `@kristine.vargas:${SERVER}`, code: 'ABCD2345' };
    await post('/v1/link-codes', body);
    await post('/v1/link-codes', body);
    assert.equal(fake.rooms.size, 1);
    [...fake.rooms.values()][0].forbidden = true;
    assert.equal((await post('/v1/link-codes', body)).status, 202);
    assert.equal(fake.rooms.size, 2);
  });

  it('returns 404 for unknown or deactivated users', async () => {
    fake.seed('gone', { deactivated: true });
    for (const localpart of ['nobody', 'gone']) {
      const res = await post('/v1/link-codes', { user_id: `@${localpart}:${SERVER}`, code: 'ABCD2345' });
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'user_not_found');
    }
    assert.equal(fake.rooms.size, 0);
  });

  it('never messages the blocked @jared.duel account', async () => {
    fake.seed('jared.duel');
    const res = await post('/v1/link-codes', { user_id: `@jared.duel:${SERVER}`, code: 'ABCD2345' });
    assert.equal(res.status, 400);
    assert.equal(fake.rooms.size, 0);
  });

  it('validates the code format', async () => {
    fake.seed('jared.deuel');
    const res = await post('/v1/link-codes', { user_id: `@jared.deuel:${SERVER}`, code: 'hi' });
    assert.equal(res.status, 400);
  });
});

describe('POST /v1/announcements', () => {
  const announce = (body) => post('/v1/announcements', { text: 'Shabbat moved to 6:00 PM', idempotency_key: randomUUID(), ...body });
  const alertsRoom = () => fake.rooms.get(ANNOUNCEMENTS_ROOM);

  beforeEach(() => {
    fake.rooms.set(ANNOUNCEMENTS_ROOM, { messages: [], forbidden: false });
  });

  it('posts the text to the configured room as a notifying message, without logging it', async () => {
    const res = await announce({});
    assert.equal(res.status, 202);
    assert.deepEqual(alertsRoom().messages.map(({ msgtype, body }) => ({ msgtype, body })), [
      { msgtype: 'm.text', body: 'Shabbat moved to 6:00 PM' },
    ]);
    assert.ok(!logs.join('\n').includes('Shabbat'));
  });

  it('only ever posts to the configured room', async () => {
    fake.rooms.set(`!other:${SERVER}`, { messages: [], forbidden: false });
    const res = await announce({ room_id: `!other:${SERVER}` });
    assert.equal(res.status, 202);
    assert.equal(fake.rooms.get(`!other:${SERVER}`).messages.length, 0);
    assert.equal(alertsRoom().messages.length, 1);
  });

  it('posts once when a request is retried with the same idempotency key', async () => {
    const idempotencyKey = randomUUID();
    assert.equal((await announce({ idempotency_key: idempotencyKey })).status, 202);
    assert.equal((await announce({ idempotency_key: idempotencyKey })).status, 202);
    assert.equal(alertsRoom().messages.length, 1);
  });

  it('validates the text and idempotency key', async () => {
    for (const body of [{ text: '' }, { text: 42 }, { text: 'x'.repeat(2001) }, { text: 'bad\u0000text' }, { idempotency_key: 'nope' }]) {
      const res = await announce(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error, 'invalid_request');
    }
    assert.equal(alertsRoom().messages.length, 0);
  });

  it('returns 503 when no announcements room is configured', async () => {
    await stopService();
    await startService({ announcementsRoomId: undefined });
    const res = await announce({});
    assert.equal(res.status, 503);
    assert.equal(res.body.error, 'announcements_not_configured');
  });

  it('returns 502 when the bot can no longer post in the room', async () => {
    alertsRoom().forbidden = true;
    const res = await announce({});
    assert.equal(res.status, 502);
    assert.equal(res.body.error, 'announcements_room_unavailable');
  });
});
