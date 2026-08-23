export const ATTACHMENTS_KEY = 'saams-attachment-center-v1';
const ATTACHMENTS_CLEANUP_KEY = 'saams-production-clean-attachments-v1';

function runOneTimeProductionCleanup() {
  try {
    if (localStorage.getItem(ATTACHMENTS_CLEANUP_KEY) === 'done') return;
    localStorage.removeItem(ATTACHMENTS_KEY);
    localStorage.setItem(ATTACHMENTS_CLEANUP_KEY, 'done');
  } catch {
    // Ignore storage access errors; the attachment center will simply render empty.
  }
}

export function loadAttachments() {
  try {
    runOneTimeProductionCleanup();
    const saved = localStorage.getItem(ATTACHMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function registerAttachment(item) {
  if (!item?.dataUrl) return;
  const rows = loadAttachments();
  const key = `${item.entityType}-${item.entityId}-${item.kind}-${item.name}`;
  const next = {
    id: key,
    createdAt: new Date().toISOString(),
    ...item,
  };
  const filtered = rows.filter((row) => row.id !== key);
  localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify([next, ...filtered].slice(0, 400)));
  window.dispatchEvent(new CustomEvent('saams:attachments-updated'));
}
