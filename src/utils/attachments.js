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

// Phone photos are 2–5 MB; the browser's local storage holds only ~5 MB in total.
// The real file is already saved in Supabase Storage, so large files are cached here
// WITHOUT their data, and a full storage NEVER interrupts a save (it used to throw after
// the invoice was saved, so users pressed «حفظ» again and got «الفاتورة موجودة مسبقًا»).
const MAX_CACHED_DATA_URL = 350 * 1024;

function writeAttachments(rows) {
  try {
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(rows));
    return true;
  } catch {
    try {
      const light = rows.map(({ dataUrl, ...rest }) => ({ ...rest, dataUrl: '', storedRemotely: true })).slice(0, 200);
      localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(light));
      return true;
    } catch {
      try { localStorage.removeItem(ATTACHMENTS_KEY); } catch { /* ignore */ }
      return false;
    }
  }
}

export function registerAttachment(item) {
  try {
    if (!item?.dataUrl) return;
    const rows = loadAttachments();
    const key = `${item.entityType}-${item.entityId}-${item.kind}-${item.name}`;
    const tooLarge = String(item.dataUrl).length > MAX_CACHED_DATA_URL;
    const next = {
      id: key,
      createdAt: new Date().toISOString(),
      ...item,
      ...(tooLarge ? { dataUrl: '', storedRemotely: true } : {}),
    };
    const filtered = rows.filter((row) => row.id !== key);
    writeAttachments([next, ...filtered].slice(0, 400));
    window.dispatchEvent(new CustomEvent('saams:attachments-updated'));
    window.dispatchEvent(new CustomEvent('saams:data-updated', { detail: { table: 'attachments' } }));
  } catch (error) {
    console.warn('Local attachment cache skipped', error);
  }
}
