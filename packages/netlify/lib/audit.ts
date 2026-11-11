import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  outcome: 'success' | 'failure' | 'conflict' | 'denied';
  targetProfileId?: string | null;
  targetMatrixUserId?: string | null;
  // Never put passwords, link codes, or tokens in details.
  details?: Record<string, unknown>;
}

export async function audit(db: SupabaseClient, entry: AuditEntry): Promise<void> {
  const { error } = await db.from('admin_audit_log').insert({
    actor_id: entry.actorId,
    action: entry.action,
    outcome: entry.outcome,
    target_profile_id: entry.targetProfileId ?? null,
    target_matrix_user_id: entry.targetMatrixUserId ?? null,
    details: entry.details ?? {},
  });
  // The action itself already happened; record the gap instead of failing it.
  if (error) console.error('Audit write failed for action:', entry.action, error.code);
}
