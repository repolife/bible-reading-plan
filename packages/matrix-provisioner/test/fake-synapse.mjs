import { createHmac, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

/**
 * In-process stand-in for the Synapse endpoints the provisioner uses. It
 * validates the shared-secret MAC the same way Synapse does, so a request for
 * an admin account (or a wrong MAC) is visible to tests.
 */
export async function startFakeSynapse({ sharedSecret, adminToken, serverName }) {
  const fake = {
    users: new Map(), // userId -> { admin, deactivated, creationTs, password }
    registrations: [],
    resets: [],
    logouts: [],
    rooms: new Map(), // roomId -> { invite, messages, forbidden }
    down: false,
    failAfterCreate: false,
    sendDelayMs: 0, // delays room messages, to simulate a slow Synapse
    nonces: new Set(),
    seed(localpart, extra = {}) {
      fake.users.set(`@${localpart}:${serverName}`, {
        admin: false,
        deactivated: false,
        creationTs: Math.floor(Date.now() / 1000) - 86_400,
        password: 'existing',
        ...extra,
      });
    },
  };

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (fake.down) return send(res, 503, { errcode: 'M_UNKNOWN' });
      const body = raw ? JSON.parse(raw) : {};
      const path = new URL(req.url, 'http://x').pathname;
      const authed = req.headers.authorization === `Bearer ${adminToken}`;

      if (path === '/_synapse/admin/v1/register' && req.method === 'GET') {
        const nonce = randomBytes(8).toString('hex');
        fake.nonces.add(nonce);
        return send(res, 200, { nonce });
      }
      if (path === '/_synapse/admin/v1/register' && req.method === 'POST') {
        if (fake.failRegister) {
          fake.failRegister = false;
          return send(res, 503, { errcode: 'M_UNKNOWN' });
        }
        if (!fake.nonces.delete(body.nonce)) return send(res, 400, { errcode: 'M_UNKNOWN', error: 'unrecognised nonce' });
        const mac = createHmac('sha1', sharedSecret)
          .update(`${body.nonce}\0${body.username}\0${body.password}\0${body.admin ? 'admin' : 'notadmin'}`)
          .digest('hex');
        if (mac !== body.mac) return send(res, 403, { errcode: 'M_FORBIDDEN', error: 'HMAC incorrect' });
        const userId = `@${body.username}:${serverName}`;
        fake.registrations.push({ username: body.username, admin: body.admin });
        if (fake.users.has(userId)) return send(res, 400, { errcode: 'M_USER_IN_USE' });
        fake.users.set(userId, {
          admin: Boolean(body.admin),
          deactivated: false,
          creationTs: Math.floor(Date.now() / 1000),
          password: body.password,
        });
        if (fake.failAfterCreate) {
          fake.failAfterCreate = false;
          return send(res, 500, { errcode: 'M_UNKNOWN' });
        }
        return send(res, 200, { user_id: userId, access_token: `tok-${body.username}`, device_id: 'DEV' });
      }
      if (path === '/_matrix/client/v3/logout') {
        fake.logouts.push(req.headers.authorization);
        return send(res, 200, {});
      }
      if (!authed) return send(res, 401, { errcode: 'M_UNKNOWN_TOKEN' });

      let match;
      if ((match = /^\/_synapse\/admin\/v2\/users\/(.+)$/.exec(path)) && req.method === 'GET') {
        const user = fake.users.get(decodeURIComponent(match[1]));
        if (!user) return send(res, 404, { errcode: 'M_NOT_FOUND' });
        return send(res, 200, { admin: user.admin, deactivated: user.deactivated, creation_ts: user.creationTs });
      }
      if ((match = /^\/_synapse\/admin\/v1\/reset_password\/(.+)$/.exec(path))) {
        const userId = decodeURIComponent(match[1]);
        const user = fake.users.get(userId);
        if (!user) return send(res, 404, { errcode: 'M_NOT_FOUND' });
        user.password = body.new_password;
        fake.resets.push({ userId, logoutDevices: body.logout_devices });
        return send(res, 200, {});
      }
      if (path === '/_matrix/client/v3/createRoom') {
        const roomId = `!room${fake.rooms.size + 1}:${serverName}`;
        fake.rooms.set(roomId, { invite: body.invite, isDirect: body.is_direct, messages: [], forbidden: false });
        return send(res, 200, { room_id: roomId });
      }
      if ((match = /^\/_matrix\/client\/v3\/rooms\/([^/]+)\/send\/m\.room\.message\/([^/]+)$/.exec(path))) {
        const room = fake.rooms.get(decodeURIComponent(match[1]));
        if (fake.sendDelayMs) {
          const delay = fake.sendDelayMs;
          fake.sendDelayMs = 0;
          setTimeout(() => {
            room.messages.push({ ...body, txnId: decodeURIComponent(match[2]) });
            send(res, 200, { event_id: '$slow' });
          }, delay);
          return;
        }
        if (!room || room.forbidden) return send(res, 403, { errcode: 'M_FORBIDDEN' });
        // Like Synapse, a repeated transaction ID returns the original event.
        const txnId = decodeURIComponent(match[2]);
        if (!room.messages.some((m) => m.txnId === txnId)) room.messages.push({ ...body, txnId });
        return send(res, 200, { event_id: `$${txnId}` });
      }
      return send(res, 404, { errcode: 'M_UNRECOGNIZED' });
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  fake.url = `http://127.0.0.1:${server.address().port}`;
  fake.close = () => new Promise((resolve) => server.close(resolve));
  return fake;
}
