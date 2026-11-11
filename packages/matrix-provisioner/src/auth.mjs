import { createHmac, timingSafeEqual } from 'node:crypto';

export const MAX_CLOCK_SKEW_SECONDS = 300;

// Must match signatureBase in packages/netlify/lib/provisioner.ts.
export const signatureBase = (timestamp, nonce, method, path, body) =>
  `${timestamp}\n${nonce}\n${method}\n${path}\n${body}`;

export const sign = (secret, timestamp, nonce, method, path, body) =>
  createHmac('sha256', secret).update(signatureBase(timestamp, nonce, method, path, body)).digest('hex');

/**
 * Verifies an HMAC-signed request. Returns null when valid, otherwise an error
 * code. Nonces are recorded through `rememberNonce`, which returns false when
 * the nonce was already seen inside the replay window.
 */
export function verifyRequest({ secret, headers, method, path, body, nowSeconds, rememberNonce }) {
  const timestamp = headers['x-provisioner-timestamp'];
  const nonce = headers['x-provisioner-nonce'];
  const signature = headers['x-provisioner-signature'];
  if (typeof timestamp !== 'string' || typeof nonce !== 'string' || typeof signature !== 'string') {
    return 'missing_signature';
  }
  if (!/^\d{1,12}$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) {
    return 'stale_request';
  }
  if (!/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) return 'bad_signature';

  const expected = Buffer.from(sign(secret, timestamp, nonce, method, path, body), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return 'bad_signature';

  // Only remember nonces of correctly signed requests, so junk cannot fill memory.
  if (!rememberNonce(nonce, Number(timestamp) + MAX_CLOCK_SKEW_SECONDS)) return 'replayed_request';
  return null;
}
