import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createHttpProvisioner, ProvisionerError, signatureBase } from '../lib/provisioner';

const SECRET = 'test-secret';

function fakeFetch(status: number, body: unknown | string) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );
}

describe('provisioner HTTP client', () => {
  it('signs requests with HMAC over timestamp, nonce, method, path and body', async () => {
    const fetchImpl = fakeFetch(201, { user_id: '@abc:ozark-fellowship.netlify.app' });
    const client = createHttpProvisioner({ baseUrl: 'https://prov.example/', secret: SECRET, fetchImpl });
    await client.createAccount({ profileId: 'p1', localpart: 'abc', idempotencyKey: 'k1' });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://prov.example/v1/accounts');
    const headers = init!.headers as Record<string, string>;
    const expected = createHmac('sha256', SECRET)
      .update(signatureBase(headers['X-Provisioner-Timestamp'], headers['X-Provisioner-Nonce'], 'POST', '/v1/accounts', init!.body as string))
      .digest('hex');
    expect(headers['X-Provisioner-Signature']).toBe(expected);
    expect(JSON.parse(init!.body as string)).toEqual({ profile_id: 'p1', localpart: 'abc', idempotency_key: 'k1' });
  });

  it('keeps a reverse-proxy path prefix but signs the service path', async () => {
    const fetchImpl = fakeFetch(202, { ok: true });
    const client = createHttpProvisioner({ baseUrl: 'https://host.example/provision/', secret: SECRET, fetchImpl });
    await client.sendLinkCode({ userId: '@a:x', code: 'ABCD2345' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://host.example/provision/v1/link-codes');
    const headers = init!.headers as Record<string, string>;
    const expected = createHmac('sha256', SECRET)
      .update(signatureBase(headers['X-Provisioner-Timestamp'], headers['X-Provisioner-Nonce'], 'POST', '/v1/link-codes', init!.body as string))
      .digest('hex');
    expect(headers['X-Provisioner-Signature']).toBe(expected);
  });

  it('maps the account contract', async () => {
    const make = (status: number, body: unknown) =>
      createHttpProvisioner({ baseUrl: 'https://p/', secret: SECRET, fetchImpl: fakeFetch(status, body) });
    const input = { profileId: 'p', localpart: 'a', idempotencyKey: 'k' };
    await expect(make(201, { user_id: '@a:x' }).createAccount(input)).resolves.toEqual({ kind: 'created', userId: '@a:x' });
    await expect(make(200, { user_id: '@a:x' }).createAccount(input)).resolves.toEqual({ kind: 'existing', userId: '@a:x' });
    await expect(make(409, { error: 'username_taken' }).createAccount(input)).resolves.toEqual({ kind: 'username_taken' });
    await expect(make(503, { error: 'down' }).createAccount(input)).rejects.toMatchObject({ code: 'provisioner_unavailable' });
  });

  it('turns network failures into provisioner_unavailable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const client = createHttpProvisioner({ baseUrl: 'https://p/', secret: SECRET, fetchImpl });
    await expect(client.sendLinkCode({ userId: '@a:x', code: 'C' })).rejects.toBeInstanceOf(ProvisionerError);
  });

  it('never echoes an unparseable response body (it may contain a password)', async () => {
    const client = createHttpProvisioner({ baseUrl: 'https://p/', secret: SECRET, fetchImpl: fakeFetch(200, 'password=hunter2 oops') });
    const error = await client.issuePassword({ profileId: 'p', userId: '@a:x' }).catch((e) => e);
    expect(error).toBeInstanceOf(ProvisionerError);
    expect(String(error.message)).not.toContain('hunter2');
  });

  it('fails closed when not configured', async () => {
    const client = createHttpProvisioner({});
    await expect(client.createAccount({ profileId: 'p', localpart: 'a', idempotencyKey: 'k' })).rejects.toMatchObject({
      code: 'provisioner_not_configured',
    });
  });
});
