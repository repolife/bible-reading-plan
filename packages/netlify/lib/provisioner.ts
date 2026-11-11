import { createHmac, randomBytes } from 'node:crypto';

export class ProvisionerError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = 'ProvisionerError';
  }
}

export type CreateAccountResult =
  | { kind: 'created' | 'existing'; userId: string }
  | { kind: 'username_taken' }
  | { kind: 'profile_has_account'; userId: string };

export interface Provisioner {
  createAccount(input: { profileId: string; localpart: string; idempotencyKey: string }): Promise<CreateAccountResult>;
  issuePassword(input: { profileId: string; userId: string }): Promise<{ password: string }>;
  sendLinkCode(input: { userId: string; code: string }): Promise<void>;
}

// Canonical string signed by both sides. Keep in sync with
// packages/matrix-provisioner/src/auth.mjs.
export const signatureBase = (timestamp: string, nonce: string, method: string, path: string, body: string) =>
  `${timestamp}\n${nonce}\n${method}\n${path}\n${body}`;

export function signRequest(secret: string, method: string, path: string, body: string, nowMs = Date.now()) {
  const timestamp = Math.floor(nowMs / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', secret).update(signatureBase(timestamp, nonce, method, path, body)).digest('hex');
  return {
    'X-Provisioner-Timestamp': timestamp,
    'X-Provisioner-Nonce': nonce,
    'X-Provisioner-Signature': signature,
  };
}

type FetchLike = typeof fetch;

export function createHttpProvisioner(options: { baseUrl?: string; secret?: string; fetchImpl?: FetchLike }): Provisioner {
  const { baseUrl, secret, fetchImpl = fetch } = options;

  async function request(path: string, payload: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
    if (!baseUrl || !secret) throw new ProvisionerError('provisioner_not_configured');
    const body = JSON.stringify(payload);
    let response: Response;
    try {
      // Plain concatenation keeps a reverse-proxy prefix such as /provision.
      response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signRequest(secret, 'POST', path, body) },
        body,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ProvisionerError('provisioner_unavailable');
    }
    // Never surface parse errors: they can quote the body, which may hold a password.
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new ProvisionerError(response.status >= 500 ? 'provisioner_unavailable' : 'provisioner_bad_response');
    }
    if (!parsed || typeof parsed !== 'object') throw new ProvisionerError('provisioner_bad_response');
    return { status: response.status, body: parsed as Record<string, unknown> };
  }

  const errorCode = (body: Record<string, unknown>, fallback: string) =>
    typeof body.error === 'string' ? body.error : fallback;

  return {
    async createAccount({ profileId, localpart, idempotencyKey }) {
      const { status, body } = await request('/v1/accounts', {
        profile_id: profileId,
        localpart,
        idempotency_key: idempotencyKey,
      });
      if ((status === 201 || status === 200) && typeof body.user_id === 'string') {
        return { kind: status === 201 ? 'created' : 'existing', userId: body.user_id };
      }
      if (status === 409 && body.error === 'username_taken') return { kind: 'username_taken' };
      if (status === 409 && body.error === 'profile_has_account' && typeof body.user_id === 'string') {
        return { kind: 'profile_has_account', userId: body.user_id };
      }
      throw new ProvisionerError(status >= 500 ? 'provisioner_unavailable' : errorCode(body, 'provisioner_rejected'));
    },

    async issuePassword({ profileId, userId }) {
      const { status, body } = await request('/v1/accounts/password', { profile_id: profileId, user_id: userId });
      if (status === 200 && typeof body.password === 'string') return { password: body.password };
      throw new ProvisionerError(status >= 500 ? 'provisioner_unavailable' : errorCode(body, 'provisioner_rejected'));
    },

    async sendLinkCode({ userId, code }) {
      const { status, body } = await request('/v1/link-codes', { user_id: userId, code });
      if (status === 202 || status === 200) return;
      throw new ProvisionerError(status >= 500 ? 'provisioner_unavailable' : errorCode(body, 'provisioner_rejected'));
    },
  };
}
