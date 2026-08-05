export const ATTACHMENTS_KEY = 'saams-attachment-center-v1';

export function loadAttachments() {
  try {
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
