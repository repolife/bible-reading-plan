import { randomInt } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http';
import { createHttpProvisioner, type Provisioner } from './provisioner';

export interface Deps {
  db: SupabaseClient;
  provisioner: Provisioner;
  siteUrl: string;
  now: () => Date;
  randomCode: () => string;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const randomLinkCode = () =>
  Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

export function createServiceClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

let cached: Deps | null = null;

// Server-only configuration. Deliberately no fallback to VITE_* or anon keys:
// without the service role these functions must fail closed.
export function loadDeps(): Deps {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    throw new HttpError(500, 'server_misconfigured', 'Server is not configured');
  }
  cached = {
    db: createServiceClient(url, serviceRoleKey),
    provisioner: createHttpProvisioner({
      baseUrl: process.env.MATRIX_PROVISIONER_URL,
      secret: process.env.MATRIX_PROVISIONER_SECRET,
    }),
    siteUrl: process.env.SITE_URL || 'https://ozark-fellowship.netlify.app',
    now: () => new Date(),
    randomCode: randomLinkCode,
  };
  return cached;
}
