import { createHmac } from 'node:crypto';

export class SynapseError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'SynapseError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Minimal client for the local Synapse, reached only over loopback. Uses:
 *   - shared-secret registration (always admin: false)
 *   - admin user lookup and password reset (provisioner bot token)
 *   - client API to send a DM notice or a room message (provisioner bot token)
 * Request and response bodies are never logged.
 */
export function createSynapseClient({ baseUrl, registrationSharedSecret, adminToken, fetchImpl = fetch }) {
  const base = baseUrl.replace(/\/+$/, '');

  async function call(method, path, { token, body } = {}) {
    let response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new SynapseError('synapse_unavailable', 0);
    }
    let parsed = {};
    try {
      parsed = await response.json();
    } catch {
      // Empty or non-JSON body; status code is what matters.
    }
    return { status: response.status, body: parsed ?? {} };
  }

  // A repeated txnId returns the original event, so retries do not double-post.
  async function sendMessage(roomId, msgtype, body, txnId) {
    const res = await call(
      'PUT',
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${encodeURIComponent(txnId)}`,
      { token: adminToken, body: { msgtype, body } },
    );
    if (res.status === 200) return true;
    if (res.status === 403 || res.status === 404) return false;
    throw new SynapseError(res.status >= 500 ? 'synapse_unavailable' : 'synapse_rejected', res.status);
  }

  return {
    /** Registers an ordinary user. Returns { userId, accessToken } or throws. */
    async registerUser(localpart, password) {
      const nonceRes = await call('GET', '/_synapse/admin/v1/register');
      if (nonceRes.status !== 200 || typeof nonceRes.body.nonce !== 'string') {
        throw new SynapseError('synapse_unavailable', nonceRes.status);
      }
      const { nonce } = nonceRes.body;
      // Synapse's documented MAC: nonce, user, password, "notadmin", NUL-separated.
      const mac = createHmac('sha1', registrationSharedSecret)
        .update(`${nonce}\0${localpart}\0${password}\0notadmin`)
        .digest('hex');
      const res = await call('POST', '/_synapse/admin/v1/register', {
        body: { nonce, username: localpart, password, admin: false, mac },
      });
      if (res.status === 200 && typeof res.body.user_id === 'string') {
        return { userId: res.body.user_id, accessToken: res.body.access_token };
      }
      if (res.body.errcode === 'M_USER_IN_USE') throw new SynapseError('user_in_use', res.status);
      throw new SynapseError(res.status >= 500 ? 'synapse_unavailable' : 'synapse_rejected', res.status);
    },

    /** Ends the session that registration created. Best effort. */
    async logout(accessToken) {
      if (accessToken) await call('POST', '/_matrix/client/v3/logout', { token: accessToken, body: {} }).catch(() => {});
    },

    /** Returns { exists, deactivated, admin, creationTs } for a user. */
    async getUser(userId) {
      const res = await call('GET', `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, { token: adminToken });
      if (res.status === 404) return { exists: false };
      if (res.status !== 200) throw new SynapseError(res.status >= 500 ? 'synapse_unavailable' : 'synapse_rejected', res.status);
      return {
        exists: true,
        deactivated: res.body.deactivated === true || res.body.deactivated === 1,
        admin: res.body.admin === true || res.body.admin === 1,
        creationTs: typeof res.body.creation_ts === 'number' ? res.body.creation_ts : null,
      };
    },

    async resetPassword(userId, newPassword) {
      const res = await call('POST', `/_synapse/admin/v1/reset_password/${encodeURIComponent(userId)}`, {
        token: adminToken,
        body: { new_password: newPassword, logout_devices: true },
      });
      if (res.status !== 200) throw new SynapseError(res.status >= 500 ? 'synapse_unavailable' : 'synapse_rejected', res.status);
    },

    /** Creates a direct-message room with the user and returns its ID. */
    async createDirectRoom(userId) {
      const res = await call('POST', '/_matrix/client/v3/createRoom', {
        token: adminToken,
        body: {
          preset: 'trusted_private_chat',
          is_direct: true,
          invite: [userId],
          name: 'Ozark Fellowship account link',
        },
      });
      if (res.status !== 200 || typeof res.body.room_id !== 'string') {
        throw new SynapseError(res.status >= 500 ? 'synapse_unavailable' : 'synapse_rejected', res.status);
      }
      return res.body.room_id;
    },

    /** Sends an m.notice. Returns false if the bot can no longer post there. */
    sendNotice(roomId, body, txnId) {
      return sendMessage(roomId, 'm.notice', body, txnId);
    },

    /**
     * Sends an m.text, which notifies members (clients mute notices by
     * default). Returns false if the bot can no longer post there.
     */
    sendText(roomId, body, txnId) {
      return sendMessage(roomId, 'm.text', body, txnId);
    },
  };
}
