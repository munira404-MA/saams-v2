// Nurseries that are late in handing in invoices.
// Only open, fixed-amount advances count («سلفة مفتوحة» without amounts is for old/corrected/activity invoices, so it is excluded).
// A nursery is late on an advance when any of these is true:
//   ended      — the advance period ended and the nursery uploaded no invoice on it
//   idle       — no invoice uploaded for IDLE_DAYS days (counted from the last upload, or from the advance start)
//   noMonth    — from day MONTH_DAY of the month, no invoice uploaded this month
export const IDLE_DAYS = 14;
export const MONTH_DAY = 20;

const DAY = 24 * 60 * 60 * 1000;
function toDate(value) {
  if (!value) return null;
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function computeLateNurseries(advances, { now = new Date(), idleDays = IDLE_DAYS, monthDay = MONTH_DAY } = {}) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const byNursery = new Map();
  for (const advance of advances || []) {
    if (advance?.status !== 'open' || advance?.openAmount) continue;
    const start = toDate(advance.from);
    const end = toDate(advance.to);
    if (start && start > today) continue; // not started yet
    for (const allocation of advance.allocations || []) {
      const invoices = allocation.allInvoices || allocation.invoices || [];
      const uploads = invoices.map((x) => toDate(x.createdAt) || toDate(x.date)).filter(Boolean);
      const last = uploads.length ? new Date(Math.max(...uploads.map((d) => d.getTime()))) : null;
      const reasons = [];
      const ended = Boolean(end && end < today);
      if (ended && !invoices.length) reasons.push({ code: 'ended' });
      // The other two rules only apply while the advance period is still running.
      const since = last || start;
      if (!ended && since) {
        const days = Math.floor((today - new Date(since.getFullYear(), since.getMonth(), since.getDate())) / DAY);
        if (days >= idleDays) reasons.push({ code: 'idle', days, hasUploads: Boolean(last) });
      }
      if (!ended && today.getDate() >= monthDay) {
        const thisMonth = uploads.some((d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth());
        if (!thisMonth) reasons.push({ code: 'noMonth' });
      }
      if (!reasons.length) continue;
      const key = allocation.nurseryId || allocation.nurseryAr || allocation.nurseryEn;
      if (!byNursery.has(key)) byNursery.set(key, { nurseryId: allocation.nurseryId || null, nurseryAr: allocation.nurseryAr || allocation.nurseryEn || '', nurseryEn: allocation.nurseryEn || allocation.nurseryAr || '', items: [] });
      byNursery.get(key).items.push({
        advanceId: advance.id, advanceAr: advance.nameAr || advance.nameEn || advance.id, advanceEn: advance.nameEn || advance.nameAr || advance.id,
        from: advance.from || '', to: advance.to || '', invoices: invoices.length,
        lastUpload: last ? `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}` : '', reasons,
      });
    }
  }
  return [...byNursery.values()].sort((a, b) => a.nurseryAr.localeCompare(b.nurseryAr, 'ar'));
}

export function lateReasonText(reason, ar) {
  if (reason.code === 'ended') return ar ? 'انتهت فترة السلفة بدون أي فاتورة' : 'Advance period ended with no invoices';
  if (reason.code === 'idle') return ar
    ? (reason.hasUploads ? `آخر فاتورة قبل ${reason.days} يوم` : `لم ترفع أي فاتورة منذ بداية السلفة (${reason.days} يوم)`)
    : (reason.hasUploads ? `Last invoice ${reason.days} days ago` : `No invoice since the advance started (${reason.days} days)`);
  if (reason.code === 'noMonth') return ar ? 'لم ترفع فواتير هذا الشهر' : 'No invoices this month';
  return '';
}
