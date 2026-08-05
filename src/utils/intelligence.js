import { loadAuditLog } from './audit';

export const INTELLIGENCE_KEY = 'saams-intelligence-state-v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getInvoiceRows() {
  const possibleKeys = [
    'saams-invoices-v1',
    'saams-invoices-v2',
    'saams_invoice_rows',
    'saams-preview-invoices',
  ];
  for (const key of possibleKeys) {
    const rows = readJson(key, null);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

export function getAdvanceRows() {
  const possibleKeys = [
    'saams-advances-v1',
    'saams-advances-v2',
    'saams_preview_advances',
  ];
  for (const key of possibleKeys) {
    const rows = readJson(key, null);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

export function getAssetRows() {
  const possibleKeys = [
    'saams-assets-v1',
    'saams-assets-v2',
    'saams_preview_assets',
  ];
  for (const key of possibleKeys) {
    const rows = readJson(key, null);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

export function detectPotentialDuplicates(rows = getInvoiceRows()) {
  const candidates = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      const supplierA = String(a.supplierAr || a.supplierEn || a.supplier || '').trim().toLowerCase();
      const supplierB = String(b.supplierAr || b.supplierEn || b.supplier || '').trim().toLowerCase();
      const totalA = Number(a.total || a.amount || 0);
      const totalB = Number(b.total || b.amount || 0);
      const dateA = String(a.date || a.invoiceDate || '').trim();
      const dateB = String(b.date || b.invoiceDate || '').trim();
      const numberA = String(a.invoiceNumber || a.number || a.id || '').trim().toLowerCase();
      const numberB = String(b.invoiceNumber || b.number || b.id || '').trim().toLowerCase();

      let score = 0;
      const reasons = [];
      if (supplierA && supplierA === supplierB) { score += 35; reasons.push('نفس المورد'); }
      if (totalA > 0 && totalA === totalB) { score += 35; reasons.push('نفس المبلغ'); }
      if (dateA && dateA === dateB) { score += 20; reasons.push('نفس التاريخ'); }
      if (numberA && numberA === numberB) { score += 50; reasons.push('نفس رقم الفاتورة'); }

      if (score >= 70) {
        candidates.push({
          id: `${a.id || i}-${b.id || j}`,
          first: a,
          second: b,
          score: Math.min(score, 100),
          reasons,
        });
      }
    }
  }
  return candidates;
}

export function buildRecommendations({
  invoices = getInvoiceRows(),
  advances = getAdvanceRows(),
  assets = getAssetRows(),
  logs = loadAuditLog(),
} = {}) {
  const recommendations = [];

  const duplicateCandidates = detectPotentialDuplicates(invoices);
  if (duplicateCandidates.length) {
    recommendations.push({
      id: 'duplicate-invoices',
      severity: 'high',
      icon: '⚠',
      titleAr: 'فواتير محتمل أن تكون مكررة',
      titleEn: 'Potential Duplicate Invoices',
      textAr: `تم العثور على ${duplicateCandidates.length} حالة متشابهة في المورد والمبلغ أو التاريخ.`,
      textEn: `${duplicateCandidates.length} invoice pair(s) share supplier, amount, date, or invoice number.`,
      target: 'invoices',
      meta: duplicateCandidates,
    });
  }

  const returned = logs.filter((x) => ['reject', 'return'].includes(x.actionType));
  if (returned.length) {
    const reasonCounts = returned.reduce((acc, row) => {
      const reason = (row.reason || 'بدون سبب مسجل').trim();
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});
    const [topReason, count] = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0] || [];
    recommendations.push({
      id: 'top-rejection-reason',
      severity: count >= 3 ? 'high' : 'medium',
      icon: '↺',
      titleAr: 'أكثر أسباب الإرجاع تكرارًا',
      titleEn: 'Most Common Return Reason',
      textAr: topReason ? `${topReason} — تكرر ${count} مرة.` : `يوجد ${returned.length} عملية رفض أو إرجاع.`,
      textEn: topReason ? `${topReason} — repeated ${count} time(s).` : `${returned.length} rejected or returned action(s).`,
      target: 'settings',
    });
  }

  const pendingAssetRequests = logs.filter(
    (x) => x.screen === 'الأصول' && ['transfer', 'surplus', 'disposal'].includes(x.actionType)
  ).length - logs.filter(
    (x) => x.screen === 'الأصول' && ['approve', 'reject'].includes(x.actionType)
  ).length;
  if (pendingAssetRequests > 0) {
    recommendations.push({
      id: 'pending-assets',
      severity: pendingAssetRequests >= 10 ? 'high' : 'medium',
      icon: '◇',
      titleAr: 'طلبات أصول بانتظار الإجراء',
      titleEn: 'Pending Asset Requests',
      textAr: `يوجد تقريبًا ${pendingAssetRequests} طلب نقل أو فائض أو إسقاط لم يُحسم بعد.`,
      textEn: `Approximately ${pendingAssetRequests} transfer, surplus, or disposal request(s) remain unresolved.`,
      target: 'assets',
    });
  }

  const advanceAllocations = advances.flatMap((advance) =>
    Array.isArray(advance.allocations)
      ? advance.allocations.map((allocation) => ({
          advanceName: advance.nameAr || advance.nameEn || advance.id,
          ...allocation,
        }))
      : []
  );

  advanceAllocations.forEach((allocation) => {
    const allocated = Number(allocation.amount || allocation.allocated || 0);
    const spent = Number(allocation.spent || 0);
    if (allocated > 0) {
      const ratio = spent / allocated;
      if (ratio >= 0.85) {
        recommendations.push({
          id: `advance-${allocation.nursery || allocation.nurseryAr}-${allocation.advanceName}`,
          severity: ratio >= 0.95 ? 'high' : 'medium',
          icon: '▣',
          titleAr: 'سلفة قاربت على الانتهاء',
          titleEn: 'Advance Balance Running Low',
          textAr: `${allocation.nursery || allocation.nurseryAr || 'حضانة'} صرفت ${(ratio * 100).toFixed(0)}% من ${allocation.advanceName}.`,
          textEn: `${allocation.nursery || allocation.nurseryAr || 'Nursery'} used ${(ratio * 100).toFixed(0)}% of ${allocation.advanceName}.`,
          target: 'advances',
        });
      }
    }
  });

  const oldInvoiceThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const oldPending = invoices.filter((invoice) => {
    const status = String(invoice.status || '').toLowerCase();
    const dateValue = new Date(invoice.createdAt || invoice.date || invoice.invoiceDate || 0).getTime();
    return ['pending', 'under_review', 'قيد الاعتماد', 'قيد المراجعة'].includes(status) && dateValue && dateValue < oldInvoiceThreshold;
  });

  if (oldPending.length) {
    recommendations.push({
      id: 'old-pending-invoices',
      severity: 'high',
      icon: '◷',
      titleAr: 'فواتير معلقة منذ فترة',
      titleEn: 'Long-Pending Invoices',
      textAr: `يوجد ${oldPending.length} فاتورة قيد المراجعة منذ أكثر من 14 يومًا.`,
      textEn: `${oldPending.length} invoice(s) have been pending for more than 14 days.`,
      target: 'invoices',
    });
  }

  const transferCounts = logs
    .filter((x) => x.actionType === 'transfer' && x.entityId)
    .reduce((acc, row) => {
      const barcode = row.entityId || row.details;
      acc[barcode] = (acc[barcode] || 0) + 1;
      return acc;
    }, {});

  const heavilyMoved = Object.entries(transferCounts).filter(([, count]) => count >= 3);
  if (heavilyMoved.length) {
    recommendations.push({
      id: 'frequently-transferred-assets',
      severity: 'medium',
      icon: '⇄',
      titleAr: 'أصول كثيرة النقل',
      titleEn: 'Frequently Transferred Assets',
      textAr: `يوجد ${heavilyMoved.length} أصل تم نقله 3 مرات أو أكثر، ويستحسن مراجعة موقعه الأنسب.`,
      textEn: `${heavilyMoved.length} asset(s) were transferred 3 or more times.`,
      target: 'assets',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: 'all-clear',
      severity: 'low',
      icon: '✓',
      titleAr: 'لا توجد ملاحظات حرجة حاليًا',
      titleEn: 'No Critical Issues Detected',
      textAr: 'لم يكتشف النظام حالات تكرار أو تأخير أو استهلاك مرتفع ضمن بيانات المعاينة الحالية.',
      textEn: 'No duplicate, overdue, or high-usage cases were detected in the current preview data.',
      target: 'executive',
    });
  }

  return recommendations.slice(0, 8);
}

export function answerSystemQuestion(question, { profile } = {}) {
  const q = String(question || '').trim().toLowerCase();
  const invoices = getInvoiceRows();
  const advances = getAdvanceRows();
  const assets = getAssetRows();
  const logs = loadAuditLog();
  const duplicates = detectPotentialDuplicates(invoices);
  const recommendations = buildRecommendations({ invoices, advances, assets, logs });

  const nurseryScope = profile?.role === 'nursery' ? profile.nursery : '';
  const scopedInvoices = nurseryScope
    ? invoices.filter((x) => [x.nurseryAr, x.nurseryEn, x.nursery].includes(nurseryScope))
    : invoices;

  if (q.includes('كم باقي') && q.includes('سلف')) {
    const rows = advances.flatMap((advance) =>
      Array.isArray(advance.allocations)
        ? advance.allocations.map((allocation) => ({ ...allocation, advanceName: advance.nameAr || advance.id }))
        : []
    );
    const scoped = nurseryScope
      ? rows.filter((x) => [x.nursery, x.nurseryAr].includes(nurseryScope))
      : rows;
    const remaining = scoped.reduce((sum, row) => {
      const allocated = Number(row.amount || row.allocated || 0);
      const spent = Number(row.spent || 0);
      return sum + Math.max(0, allocated - spent);
    }, 0);
    return `إجمالي المتبقي في السلف الظاهرة هو ${remaining.toLocaleString()} درهم.`;
  }

  if (q.includes('فواتير') && (q.includes('مرفوض') || q.includes('معاد'))) {
    const count = logs.filter((x) => ['reject', 'return'].includes(x.actionType) && x.screen === 'الفواتير').length;
    return `عدد عمليات رفض أو إرجاع الفواتير المسجلة هو ${count}.`;
  }

  if (q.includes('طلبات النقل') || (q.includes('نقل') && q.includes('معلق'))) {
    const created = logs.filter((x) => x.screen === 'الأصول' && x.actionType === 'transfer').length;
    const decisions = logs.filter((x) => x.screen === 'الأصول' && ['approve', 'reject'].includes(x.actionType)).length;
    return `يوجد تقريبًا ${Math.max(0, created - decisions)} طلب نقل بانتظار الإجراء.`;
  }

  if (q.includes('فائض')) {
    const count = logs.filter((x) => x.actionType === 'surplus').length;
    return `عدد طلبات الفائض المسجلة هو ${count}.`;
  }

  if (q.includes('إسقاط') || q.includes('اسقاط')) {
    const count = logs.filter((x) => x.actionType === 'disposal').length;
    return `عدد طلبات الإسقاط المسجلة هو ${count}.`;
  }

  if (q.includes('مكرر') || q.includes('تكرار')) {
    return duplicates.length
      ? `تم العثور على ${duplicates.length} حالة فواتير محتمل تكرارها. افتحي شاشة الفواتير لمراجعتها.`
      : 'لم يتم العثور على فواتير محتمل تكرارها ضمن البيانات الحالية.';
  }

  if (q.includes('توصيات') || q.includes('ملاحظات')) {
    return recommendations.map((item, index) => `${index + 1}. ${item.titleAr}: ${item.textAr}`).join('\n');
  }

  if (q.includes('كم فاتورة')) {
    return `عدد الفواتير الظاهرة ضمن نطاق حسابك هو ${scopedInvoices.length}.`;
  }

  return 'أقدر أجاوب عن: المتبقي من السلف، الفواتير المرفوضة، طلبات النقل المعلقة، الفائض، الإسقاط، الفواتير المكررة، وتوصيات النظام.';
}
