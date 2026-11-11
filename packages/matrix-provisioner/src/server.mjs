import { randomInt, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { verifyRequest } from './auth.mjs';
import { SynapseError } from './synapse.mjs';
import { checkLocalpart, isUuid, localpartOf } from './validate.mjs';

const MAX_BODY_BYTES = 16 * 1024;
// Tolerance when deciding whether an account found during recovery was the
// one this service started creating (clock rounding between us and Synapse).
const RECOVERY_SLACK_MS = 60_000;
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const MAX_ANNOUNCEMENT_LENGTH = 2000;
// Control characters other than newline.
const CONTROL_CHARS = /[\u0000-\u0009\u000b-\u001f\u007f]/;

class ApiError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/** ~105 bits, grouped for typing: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx */
export function generatePassword() {
  const chars = Array.from({ length: 24 }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]);
  return chars.join('').match(/.{4}/g).join('-');
}

const toMillis = (ts) => (ts === null ? null : ts < 1e12 ? ts * 1000 : ts);

export function createProvisioner({ config, store, synapse, now = () => Date.now(), log = console.log }) {
  const { state } = store;
  const userIdFor = (localpart) => `@${localpart}:${config.serverName}`;
  const synapseFailure = (error) => {
    if (error instanceof SynapseError) return new ApiError(502, error.code);
    throw error;
  };

  // Settles a 'pending' record left by a crash or lost response: if Synapse
  // has the account and it was created after we started, it is ours.
  async function resolvePending(localpart, record) {
    const user = await synapse.getUser(userIdFor(localpart)).catch(synapseFailure);
    if (user instanceof ApiError) throw user;
    if (!user.exists) return 'absent';
    const created = toMillis(user.creationTs);
    if (created !== null && created >= record.started_at - RECOVERY_SLACK_MS) {
      record.state = 'created';
      record.created_at = created;
      await store.persist();
      return 'ours';
    }
    delete state.accounts[localpart];
    await store.persist();
    return 'foreign';
  }

  async function createAccount(body) {
    const { profile_id: profileId, localpart, idempotency_key: idempotencyKey } = body;
    if (!isUuid(profileId) || !isUuid(idempotencyKey)) throw new ApiError(400, 'invalid_request');
    const invalid = checkLocalpart(localpart);
    if (invalid) throw new ApiError(400, invalid);
    const userId = userIdFor(localpart);

    // One account per website profile, ever.
    for (const [otherLocalpart, other] of Object.entries(state.accounts)) {
      if (other.profile_id !== profileId || otherLocalpart === localpart) continue;
      const outcome = other.state === 'created' ? 'ours' : await resolvePending(otherLocalpart, other);
      if (outcome === 'ours') throw new ApiError(409, 'profile_has_account', { user_id: userIdFor(otherLocalpart) });
      if (outcome === 'absent') {
        delete state.accounts[otherLocalpart];
        await store.persist();
      }
    }

    let record = state.accounts[localpart];
    if (record && record.profile_id !== profileId) throw new ApiError(409, 'username_taken');
    if (record?.state === 'created') return { status: 200, body: { user_id: userId } };

    if (record) {
      const outcome = await resolvePending(localpart, record);
      if (outcome === 'ours') return { status: 200, body: { user_id: userId } };
      if (outcome === 'foreign') throw new ApiError(409, 'username_taken');
    } else {
      const user = await synapse.getUser(userId).catch(synapseFailure);
      if (user instanceof ApiError) throw user;
      if (user.exists) throw new ApiError(409, 'username_taken');
      record = { profile_id: profileId, idempotency_key: idempotencyKey, state: 'pending', started_at: now() };
      state.accounts[localpart] = record;
      // Persist intent before touching Synapse so a crash can be recovered.
      await store.persist();
    }

    let registered;
    try {
      // Throwaway initial password: the member gets a fresh one on claim.
      registered = await synapse.registerUser(localpart, generatePassword());
    } catch (error) {
      if (error instanceof SynapseError && error.code === 'user_in_use') {
        delete state.accounts[localpart];
        await store.persist();
        throw new ApiError(409, 'username_taken');
      }
      throw synapseFailure(error);
    }
    if (registered.userId !== userId) throw new ApiError(502, 'synapse_unexpected_user');

    record.state = 'created';
    record.created_at = now();
    await store.persist();
    await synapse.logout(registered.accessToken);
    return { status: 201, body: { user_id: userId } };
  }

  async function issuePassword(body) {
    const { profile_id: profileId, user_id: userId } = body;
    const localpart = localpartOf(userId, config.serverName);
    if (!isUuid(profileId) || !localpart) throw new ApiError(400, 'invalid_request');
    const record = state.accounts[localpart];
    // Only accounts this service created, for this exact profile.
    if (record?.state !== 'created' || record.profile_id !== profileId) throw new ApiError(403, 'not_managed');

    const password = generatePassword();
    await synapse.resetPassword(userId, password).catch((error) => {
      throw synapseFailure(error);
    });
    return { status: 200, body: { password } };
  }

  async function sendLinkCode(body) {
    const { user_id: userId, code } = body;
    if (!localpartOf(userId, config.serverName) || typeof code !== 'string' || !/^[A-Z0-9]{8}$/.test(code)) {
      throw new ApiError(400, 'invalid_request');
    }
    const user = await synapse.getUser(userId).catch(synapseFailure);
    if (user instanceof ApiError) throw user;
    if (!user.exists || user.deactivated) throw new ApiError(404, 'user_not_found');

    const message =
      `Your Ozark Fellowship website link code is ${code.slice(0, 4)}-${code.slice(4)}. ` +
      'Enter it on the website under Account → Chat within 15 minutes. ' +
      'If you did not expect this message, ignore it and tell an admin.';
    try {
      let roomId = state.linkRooms[userId];
      if (!roomId || !(await synapse.sendNotice(roomId, message, randomUUID()))) {
        roomId = await synapse.createDirectRoom(userId);
        state.linkRooms[userId] = roomId;
        await store.persist();
        if (!(await synapse.sendNotice(roomId, message, randomUUID()))) throw new ApiError(502, 'synapse_rejected');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw synapseFailure(error);
    }
    return { status: 202, body: { ok: true } };
  }

  // Posts to the one room named in the service's own config; callers cannot
  // choose a room, so this endpoint can only ever reach that room.
  async function announce(body) {
    const { text, idempotency_key: idempotencyKey } = body;
    if (
      !isUuid(idempotencyKey) ||
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > MAX_ANNOUNCEMENT_LENGTH ||
      CONTROL_CHARS.test(text)
    ) {
      throw new ApiError(400, 'invalid_request');
    }
    if (!config.announcementsRoomId) throw new ApiError(503, 'announcements_not_configured');

    const sent = await synapse.sendText(config.announcementsRoomId, text, idempotencyKey).catch((error) => {
      throw synapseFailure(error);
    });
    if (!sent) throw new ApiError(502, 'announcements_room_unavailable');
    return { status: 202, body: { ok: true } };
  }

  const routes = {
    'POST /v1/accounts': createAccount,
    'POST /v1/accounts/password': issuePassword,
    'POST /v1/link-codes': sendLinkCode,
    'POST /v1/announcements': announce,
  };
  // Routes that never read or write state run outside the lock, so a slow
  // Synapse send cannot hold up account operations.
  const statelessRoutes = new Set([announce]);

  async function handle(req) {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/healthz') return { status: 200, body: { ok: true } };
    const route = routes[`${req.method} ${path}`];
    if (!route) throw new ApiError(404, 'not_found');

    const raw = await readBody(req);
    const authError = verifyRequest({
      secret: config.hmacSecret,
      headers: req.headers,
      method: req.method,
      path,
      body: raw,
      nowSeconds: Math.floor(now() / 1000),
      rememberNonce: (nonce, expiresAt) => store.rememberNonce(nonce, expiresAt, Math.floor(now() / 1000)),
    });
    if (authError) throw new ApiError(401, authError);

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ApiError(400, 'invalid_json');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'invalid_json');
    if (statelessRoutes.has(route)) {
      await store.withLock(() => store.persist()); // records the nonce
      return route(body);
    }
    // Serialize everything that reads or writes state.
    return store.withLock(async () => {
      await store.persist(); // records the nonce
      return route(body);
    });
  }

  return createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    let result;
    try {
      result = await handle(req);
    } catch (error) {
      if (error instanceof ApiError) {
        result = { status: error.status, body: { error: error.code, ...error.extra } };
      } else {
        result = { status: 500, body: { error: 'internal_error' } };
        log(`error ${error?.name ?? typeof error}`);
      }
    }
    // Method, path, status and error code only. Never bodies.
    log(`${req.method} ${path} ${result.status}${result.body.error ? ` ${result.body.error}` : ''}`);
    res.writeHead(result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(result.body));
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    // Past the limit, keep draining but stop buffering so the 413 can be sent.
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) tooLarge = true;
      if (size > 64 * MAX_BODY_BYTES) req.destroy();
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () =>
      tooLarge ? reject(new ApiError(413, 'body_too_large')) : resolve(Buffer.concat(chunks).toString('utf8')),
    );
    req.on('error', () => reject(new ApiError(400, 'bad_request')));
  });
}
