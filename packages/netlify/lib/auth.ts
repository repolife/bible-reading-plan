import type { HandlerEvent } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { audit } from './audit';
import { HttpError } from './http';

export interface SessionUser {
  id: string;
  email: string | null;
}

// Validates the caller's Supabase access token with the auth server.
export async function requireUser(event: HandlerEvent, db: SupabaseClient): Promise<SessionUser> {
  const header = event.headers.authorization ?? event.headers.Authorization ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) throw new HttpError(401, 'unauthenticated', 'Sign in required');

  const { data, error } = await db.auth.getUser(match[1]);
  if (error || !data.user) throw new HttpError(401, 'unauthenticated', 'Sign in required');
  return { id: data.user.id, email: data.user.email ?? null };
}

// Admin status is read from the database with the service role on every
// request; nothing the client sends is trusted.
export async function requireAdmin(event: HandlerEvent, db: SupabaseClient, action: string): Promise<SessionUser> {
  const user = await requireUser(event, db);
  const { data, error } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (error) throw new HttpError(500, 'admin_check_failed', 'Could not verify permissions');
  if (data?.is_admin !== true) {
    await audit(db, { actorId: user.id, action, outcome: 'denied' });
    throw new HttpError(403, 'forbidden', 'Admin access required');
  }
  return user;
}
