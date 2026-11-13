import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient, type Deps } from '../lib/deps';
import { createHandler } from '../lib/http';
import type { CreateAccountResult, Provisioner } from '../lib/provisioner';
import { ProvisionerError } from '../lib/provisioner';

// Integration tests run only against the local Supabase stack
// (`npx supabase start` in packages/supabase). Never point them at production.
function readLocalSupabaseEnv() {
  const cwd = fileURLToPath(new URL('../../supabase', import.meta.url));
  let output: string;
  try {
    output = execSync('npx --no-install supabase status -o env', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error('Local Supabase is not running. Start it with: cd packages/supabase && npx supabase start');
  }
  const env = Object.fromEntries(
    output
      .split('\n')
      .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim()))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
  const url = env.API_URL || 'http://127.0.0.1:54321';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error(`Refusing to run tests against ${url}`);
  return { url, serviceRoleKey: env.SERVICE_ROLE_KEY, anonKey: env.ANON_KEY };
}

export const local = readLocalSupabaseEnv();
export const db = createServiceClient(local.url, local.serviceRoleKey);

// The legacy "FMC Alert" trigger posts every family_calendar change to the
// PRODUCTION send-fcm function. Disable it in the local test database before
// inserting events, and refuse to continue if that cannot be confirmed.
export function disableProductionCalendarWebhook() {
  const container = 'supabase_db_mo-fellowship-edge';
  const sql = `ALTER TABLE public.family_calendar DISABLE TRIGGER "FMC Alert";
    SELECT tgenabled FROM pg_trigger WHERE tgname = 'FMC Alert' AND tgrelid = 'public.family_calendar'::regclass;`;
  const out = execSync(`docker exec -i ${container} psql -U postgres -t -A -q`, { input: sql, encoding: 'utf8' }).trim();
  if (out !== 'D') throw new Error('Could not confirm the production FMC Alert webhook is disabled locally');
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

const createdUserIds: string[] = [];

// `invited: true` creates the user the way an admin invitation does and signs
// in by accepting that invitation, so `invited_at` is set as in production.
export async function createTestUser(
  options: { admin?: boolean; profile?: boolean; name?: string; invited?: boolean } = {},
): Promise<TestUser> {
  const email = `test-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const invite = options.invited ? await db.auth.admin.generateLink({ type: 'invite', email }) : null;
  const { data, error } = invite ?? (await db.auth.admin.createUser({ email, password, email_confirm: true }));
  if (error || !data.user) throw error ?? new Error('createUser failed');
  createdUserIds.push(data.user.id);

  if (options.profile !== false) {
    const { error: profileError } = await db
      .from('profiles')
      .insert({ id: data.user.id, name: options.name ?? 'Test Member', is_admin: options.admin === true });
    if (profileError) throw profileError;
  }

  const anon = createClient(local.url, local.anonKey, { auth: { persistSession: false } });
  const { data: session, error: signInError } = invite?.data.properties
    ? await anon.auth.verifyOtp({ token_hash: invite.data.properties.hashed_token, type: 'invite' })
    : await anon.auth.signInWithPassword({ email, password });
  if (signInError || !session.session) throw signInError ?? new Error('sign-in failed');
  return { id: data.user.id, email, token: session.session.access_token };
}

export function trackUserId(id: string) {
  createdUserIds.push(id);
}

export async function cleanupUsers() {
  const ids = createdUserIds.splice(0);
  if (ids.length === 0) return;
  await db.from('profiles').delete().in('id', ids); // cascades matrix rows
  // Sequential: bursts of parallel deletes were silently failing.
  const failed: string[] = [];
  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error && error.status !== 404) failed.push(`${id}: ${error.message}`);
  }
  if (failed.length > 0) throw new Error(`Test user cleanup failed:\n${failed.join('\n')}`);
}

type Fn = (event: HandlerEvent, deps: Deps) => Promise<HandlerResponse>;

// Runs a handler through the same wrapper the deployed functions use.
export async function call(
  fn: Fn,
  deps: Deps,
  options: { method?: string; methods?: string[]; token?: string; body?: unknown } = {},
) {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const handler = createHandler(options.methods ?? [method], (event) => fn(event, deps));
  const event = {
    httpMethod: method,
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    body: options.body === undefined ? null : JSON.stringify(options.body),
    isBase64Encoded: false,
  } as unknown as HandlerEvent;
  const response = (await handler(event, {} as never)) as HandlerResponse;
  return { status: response.statusCode, body: JSON.parse(response.body ?? '{}'), headers: response.headers ?? {} };
}

// In-memory stand-in for packages/matrix-provisioner with the same contract.
export class FakeProvisioner implements Provisioner {
  accounts = new Map<string, { profileId: string | null; managed: boolean }>();
  passwords: string[] = [];
  linkCodes: { userId: string; code: string }[] = [];
  announcements: { text: string; idempotencyKey: string }[] = [];
  createCalls = 0;
  idempotencyKeys: string[] = [];
  // 'before' = fail without creating; 'after' = create, then lose the response.
  failNextCreate: 'before' | 'after' | null = null;
  failNextPassword = false;
  failNextLinkCode: string | null = null;
  failNextAnnounce: string | null = null;

  seedExisting(localpart: string) {
    this.accounts.set(localpart, { profileId: null, managed: false });
  }

  async createAccount({ profileId, localpart, idempotencyKey }: { profileId: string; localpart: string; idempotencyKey: string }) {
    this.createCalls++;
    this.idempotencyKeys.push(idempotencyKey);
    const userId = `@${localpart}:ozark-fellowship.netlify.app`;
    if (this.failNextCreate === 'before') {
      this.failNextCreate = null;
      throw new ProvisionerError('provisioner_unavailable');
    }
    const existing = this.accounts.get(localpart);
    let result: CreateAccountResult;
    if (existing) {
      result = existing.managed && existing.profileId === profileId ? { kind: 'existing', userId } : { kind: 'username_taken' };
    } else {
      const other = [...this.accounts.entries()].find(([, a]) => a.managed && a.profileId === profileId);
      if (other) {
        result = { kind: 'profile_has_account', userId: `@${other[0]}:ozark-fellowship.netlify.app` };
      } else {
        this.accounts.set(localpart, { profileId, managed: true });
        result = { kind: 'created', userId };
      }
    }
    if (this.failNextCreate === 'after') {
      this.failNextCreate = null;
      throw new ProvisionerError('provisioner_unavailable');
    }
    return result;
  }

  async issuePassword({ profileId, userId }: { profileId: string; userId: string }) {
    if (this.failNextPassword) {
      this.failNextPassword = false;
      throw new ProvisionerError('provisioner_unavailable');
    }
    const localpart = userId.slice(1, userId.indexOf(':'));
    const account = this.accounts.get(localpart);
    if (!account?.managed || account.profileId !== profileId) throw new ProvisionerError('not_managed');
    const password = `secret-${randomUUID()}`;
    this.passwords.push(password);
    return { password };
  }

  async sendLinkCode({ userId, code }: { userId: string; code: string }) {
    if (this.failNextLinkCode) {
      const reason = this.failNextLinkCode;
      this.failNextLinkCode = null;
      throw new ProvisionerError(reason);
    }
    const localpart = userId.slice(1, userId.indexOf(':'));
    if (!this.accounts.has(localpart)) throw new ProvisionerError('user_not_found');
    this.linkCodes.push({ userId, code });
  }

  async announce({ text, idempotencyKey }: { text: string; idempotencyKey: string }) {
    if (this.failNextAnnounce) {
      const reason = this.failNextAnnounce;
      this.failNextAnnounce = null;
      throw new ProvisionerError(reason);
    }
    // Like the real service, a repeated idempotency key posts only once.
    if (!this.announcements.some((a) => a.idempotencyKey === idempotencyKey)) this.announcements.push({ text, idempotencyKey });
  }
}

export function makeDeps(provisioner: Provisioner, overrides: Partial<Deps> = {}): Deps {
  let counter = 0;
  return {
    db,
    provisioner,
    siteUrl: 'http://localhost:5173',
    now: () => new Date(),
    randomCode: () => `CODE${String(++counter).padStart(4, '0')}`.slice(0, 8),
    ...overrides,
  };
}

export async function auditRows(targetProfileId: string) {
  const { data } = await db.from('admin_audit_log').select('*').eq('target_profile_id', targetProfileId).order('id');
  return data ?? [];
}
