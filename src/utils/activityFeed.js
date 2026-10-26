import { listAuditLogs } from '../data/supabaseData';
import { loadAuditLog } from './audit';

// One activity source for the dashboard and the header bell.
// Central audit_logs is shared across devices; Supabase RLS already limits a nursery
// to rows tagged with its own nursery (its own actions + administration actions about it).
// Falls back to this browser's local log only when the central log cannot be read.
export async function loadActivityFeed(profile, { limit = 80 } = {}) {
  const isNursery = profile?.role === 'nursery';
  try {
    if (isNursery && !profile?.nursery_id) throw new Error('NO_NURSERY');
    const rows = await listAuditLogs({ nurseryId: isNursery ? profile.nursery_id : null, limit });
    return { rows, central: true };
  } catch {
    const local = loadAuditLog();
    const rows = isNursery && profile?.nursery ? local.filter((x) => x.nursery === profile.nursery) : local;
    return { rows: rows.slice(0, limit), central: false };
  }
}

export function isToday(row) {
  const value = row?.createdAt;
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// Who did it, as the nursery should read it. A nursery cannot read administration
// profiles, so anything not done by the nursery's own account is labelled «الإدارة».
export function activityActor(row, profile, ar) {
  if (!row) return '—';
  if (row.userId && profile?.id && row.userId === profile.id) return profile.full_name || row.user || '—';
  if (profile?.role === 'nursery') {
    if (row.entityType === 'asset_request_incoming' && row.actionType === 'transfer') {
      return row.after?.from || (ar ? 'حضانة أخرى' : 'Another nursery');
    }
    return ar ? 'الإدارة' : 'Administration';
  }
  return row.user || '—';
}

export function activityTime(row, ar) {
  if (row?.createdAt) {
    try {
      return new Intl.DateTimeFormat(ar ? 'ar-AE' : 'en-AE', { hour: '2-digit', minute: '2-digit' }).format(new Date(row.createdAt));
    } catch { /* fall through */ }
  }
  return row?.time || '—';
}
