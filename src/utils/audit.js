export const AUDIT_STORAGE_KEY = 'saams-audit-log-v2';
const AUDIT_CLEANUP_KEY = 'saams-production-clean-audit-v1';

function runOneTimeProductionAuditCleanup() {
  try {
    if (localStorage.getItem(AUDIT_CLEANUP_KEY) === 'done') return;
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    localStorage.setItem(AUDIT_CLEANUP_KEY, 'done');
  } catch {
    // Ignore storage access errors; the audit log will simply render empty.
  }
}

export function loadAuditLog() {
  try {
    runOneTimeProductionAuditCleanup();
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function saveAuditLog(rows) {
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(rows.slice(0, 1000)));
  window.dispatchEvent(new CustomEvent('saams:audit-updated'));
}

export function recordAudit({
  profile,
  screen,
  action,
  actionType = 'update',
  entityType = '',
  entityId = '',
  nursery = '',
  details = '',
  reason = '',
  before = null,
  after = null,
  metadata = {},
}) {
  const now = new Date();
  const row = {
    id: `AUD-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now.toISOString(),
    date: now.toLocaleDateString('ar-AE'),
    time: now.toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' }),
    userId: profile?.id || 'preview-user',
    user: profile?.full_name || profile?.username || 'المستخدم',
    username: profile?.username || '',
    role: profile?.role || 'unknown',
    organization: profile?.role === 'nursery' ? (profile?.nursery || nursery || 'حضانة') : 'الإدارة',
    nursery: nursery || profile?.nursery || '',
    screen,
    action,
    actionType,
    entityType,
    entityId,
    details,
    reason,
    before,
    after,
    metadata,
  };

  const rows = [row, ...loadAuditLog()];
  saveAuditLog(rows);
  return row;
}

export function actionTone(type) {
  return {
    create: 'blue',
    approve: 'green',
    reject: 'red',
    return: 'orange',
    update: 'yellow',
    transfer: 'violet',
    surplus: 'orange',
    disposal: 'red',
    delete: 'dark',
    login: 'teal',
    export: 'blue',
  }[type] || 'gray';
}
