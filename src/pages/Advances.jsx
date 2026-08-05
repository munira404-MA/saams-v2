import { recordAudit } from '../utils/audit';
import { useEffect, useMemo, useState } from 'react';
import {
  createAdvance as createAdvanceDb,
  listAdvances as listAdvancesDb,
  listNurseries,
  toggleAdvanceStatus,
} from '../data/supabaseData';

const NURSERIES = [
  { ar: 'الرحمانية الجديدة', en: 'New Al Rahmaniya' },
  { ar: 'اللؤلؤية', en: 'Al Luluyah' },
  { ar: 'واسط 2', en: 'Wasit 2' },
  { ar: 'السيوح', en: 'Al Suyoh' },
  { ar: 'القليعة', en: 'Al Qulaya' },
  { ar: 'البديع', en: 'Al Badie' },
  { ar: 'الرحمانية', en: 'Al Rahmaniya' },
  { ar: 'البستان', en: 'Al Bustan' },
];

const COPY = {
  ar: {
    title: 'إدارة السلف',
    sub: 'إنشاء السلف الشهرية وسلف الفعاليات، ومتابعة المصروف والمتبقي لكل حضانة تلقائيًا.',
    admin: 'الإدارة', nursery: 'الحضانة', create: 'إدراج سلفة جديدة', allAdvances: 'جميع السلف', myAdvances: 'سلف الحضانة',
    totalAllocated: 'إجمالي السلف المدرجة', totalSpent: 'إجمالي المصروف', totalRemaining: 'إجمالي المتبقي', openAdvances: 'السلف المفتوحة',
    monthly: 'سلفة شهرية', event: 'سلفة فعالية', all: 'الكل', open: 'مفتوحة', closed: 'مغلقة', draft: 'مسودة',
    advanceName: 'اسم السلفة', type: 'نوع السلفة', period: 'الفترة', nurseries: 'الحضانات', allocated: 'المبلغ المخصص', spent: 'المصروف', remaining: 'المتبقي', status: 'الحالة', actions: 'الإجراءات',
    view: 'عرض التفاصيل', manage: 'إدارة السلفة', close: 'إغلاق السلفة', reopen: 'إعادة فتح السلفة', uploadOpen: 'رفع الفواتير متاح', uploadClosed: 'رفع الفواتير مغلق',
    createTitle: 'إدراج سلفة جديدة', customName: 'اسم السلفة كما سيظهر للحضانات', customNameHint: 'مثال: سلفة أغسطس وسبتمبر 2026 أو سلفة اليوم الوطني',
    fromDate: 'من تاريخ', toDate: 'إلى تاريخ', chooseNurseries: 'تحديد الحضانات والمبالغ', selectAll: 'اختيار الكل', clearAll: 'إلغاء الكل', amount: 'المبلغ',
    sameAmount: 'تطبيق مبلغ موحد', apply: 'تطبيق', save: 'حفظ وفتح السلفة', saveDraft: 'حفظ كمسودة', cancel: 'إلغاء',
    details: 'تفاصيل السلفة', invoices: 'الفواتير المرتبطة', invoiceNo: 'رقم الفاتورة', supplier: 'المورد', date: 'التاريخ', invoiceAmount: 'قيمة الفاتورة', noInvoices: 'لا توجد فواتير مرتبطة حتى الآن.',
    nurseryBalance: 'رصيد الحضانة', usage: 'نسبة الاستخدام', invoicesCount: 'عدد الفواتير', addInvoiceDemo: 'محاكاة إضافة فاتورة', invoiceDeductionNote: 'عند اعتماد أي فاتورة مرتبطة بهذه السلفة، يُخصم إجماليها تلقائيًا من رصيد الحضانة.',
    created: 'تم إدراج السلفة بنجاح', closedMsg: 'تم إغلاق السلفة', reopenedMsg: 'تمت إعادة فتح السلفة', invalid: 'اختاري حضانة واحدة على الأقل وحددي مبلغًا أكبر من صفر.',
    search: 'بحث باسم السلفة أو الحضانة...', previewNursery: 'معاينة شاشة الحضانة', backAdmin: 'العودة لوضع الإدارة',
  },
  en: {
    title: 'Advance Management',
    sub: 'Create monthly and event advances and automatically track allocated, spent, and remaining balances by nursery.',
    admin: 'Administration', nursery: 'Nursery', create: 'Create New Advance', allAdvances: 'All Advances', myAdvances: 'Nursery Advances',
    totalAllocated: 'Total Allocated', totalSpent: 'Total Spent', totalRemaining: 'Total Remaining', openAdvances: 'Open Advances',
    monthly: 'Monthly Advance', event: 'Event Advance', all: 'All', open: 'Open', closed: 'Closed', draft: 'Draft',
    advanceName: 'Advance Name', type: 'Advance Type', period: 'Period', nurseries: 'Nurseries', allocated: 'Allocated', spent: 'Spent', remaining: 'Remaining', status: 'Status', actions: 'Actions',
    view: 'View Details', manage: 'Manage Advance', close: 'Close Advance', reopen: 'Reopen Advance', uploadOpen: 'Invoice upload open', uploadClosed: 'Invoice upload closed',
    createTitle: 'Create New Advance', customName: 'Advance name shown to nurseries', customNameHint: 'Example: August & September 2026 Advance or National Day Advance',
    fromDate: 'From Date', toDate: 'To Date', chooseNurseries: 'Choose nurseries and amounts', selectAll: 'Select All', clearAll: 'Clear All', amount: 'Amount',
    sameAmount: 'Apply same amount', apply: 'Apply', save: 'Save and Open', saveDraft: 'Save Draft', cancel: 'Cancel',
    details: 'Advance Details', invoices: 'Linked Invoices', invoiceNo: 'Invoice No.', supplier: 'Supplier', date: 'Date', invoiceAmount: 'Invoice Amount', noInvoices: 'No linked invoices yet.',
    nurseryBalance: 'Nursery Balance', usage: 'Usage', invoicesCount: 'Invoice Count', addInvoiceDemo: 'Simulate Invoice', invoiceDeductionNote: 'Once a linked invoice is approved, its total is automatically deducted from the nursery balance.',
    created: 'Advance created successfully', closedMsg: 'Advance closed', reopenedMsg: 'Advance reopened', invalid: 'Select at least one nursery and enter an amount greater than zero.',
    search: 'Search advance or nursery...', previewNursery: 'Preview Nursery View', backAdmin: 'Back to Admin View',
  }
};

const INITIAL_ADVANCES = [
  {
    id: 'ADV-2026-008', nameAr: 'سلفة أغسطس وسبتمبر 2026', nameEn: 'August & September 2026 Advance', type: 'monthly', from: '2026-08-01', to: '2026-09-30', status: 'open',
    allocations: [
      { nurseryAr: 'الرحمانية الجديدة', nurseryEn: 'New Al Rahmaniya', allocated: 2500, invoices: [{ no: 'INV-2026-134', supplierAr: 'مكتبة دبي للتوزيع', supplierEn: 'Dubai Distribution Library', date: '03/08/2026', amount: 315 }, { no: 'INV-2026-141', supplierAr: 'جمعية الشارقة', supplierEn: 'Sharjah Coop', date: '04/08/2026', amount: 428.5 }] },
      { nurseryAr: 'اللؤلؤية', nurseryEn: 'Al Luluyah', allocated: 2200, invoices: [{ no: 'INV-2026-133', supplierAr: 'مركز الإمارات للقرطاسية', supplierEn: 'Emirates Stationery Centre', date: '02/08/2026', amount: 504 }] },
      { nurseryAr: 'واسط 2', nurseryEn: 'Wasit 2', allocated: 2400, invoices: [{ no: 'INV-2026-140', supplierAr: 'سوبرماركت المدينة', supplierEn: 'Al Madina Supermarket', date: '03/08/2026', amount: 126.5 }] },
    ]
  },
  {
    id: 'ADV-2026-007', nameAr: 'سلفة نشاط التخرج 2026', nameEn: 'Graduation Event Advance 2026', type: 'event', from: '2026-06-01', to: '2026-06-30', status: 'closed',
    allocations: [
      { nurseryAr: 'البديع', nurseryEn: 'Al Badie', allocated: 1500, invoices: [{ no: 'INV-2026-131', supplierAr: 'زهور الشارقة', supplierEn: 'Sharjah Flowers', date: '28/06/2026', amount: 850 }, { no: 'INV-2026-128', supplierAr: 'مطبعة الإمارات', supplierEn: 'Emirates Printing', date: '25/06/2026', amount: 300 }] },
      { nurseryAr: 'القليعة', nurseryEn: 'Al Qulaya', allocated: 1500, invoices: [{ no: 'INV-2026-125', supplierAr: 'مركز الحفلات', supplierEn: 'Events Centre', date: '24/06/2026', amount: 1120 }] },
    ]
  },
  {
    id: 'ADV-2026-006', nameAr: 'سلفة يوليو 2026', nameEn: 'July 2026 Advance', type: 'monthly', from: '2026-07-01', to: '2026-07-31', status: 'closed',
    allocations: [
      { nurseryAr: 'السيوح', nurseryEn: 'Al Suyoh', allocated: 1800, invoices: [{ no: 'INV-2026-129', supplierAr: 'مطابع الاتحاد', supplierEn: 'Al Ittihad Printing', date: '22/07/2026', amount: 410.75 }] },
      { nurseryAr: 'البستان', nurseryEn: 'Al Bustan', allocated: 1800, invoices: [{ no: 'INV-2026-122', supplierAr: 'الخليج للتنظيف', supplierEn: 'Gulf Cleaning', date: '18/07/2026', amount: 620 }] },
    ]
  }
];

const money = value => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const spentOf = allocation => (allocation.invoices || []).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
const totalsOf = advance => advance.allocations.reduce((acc, allocation) => {
  const spent = spentOf(allocation);
  acc.allocated += Number(allocation.allocated || 0);
  acc.spent += spent;
  return acc;
}, { allocated: 0, spent: 0 });

export default function Advances({ lang, profile, databaseMode }) {
  const ar = lang === 'ar';
  const t = COPY[lang] || COPY.ar;
  const isAdmin = profile?.role !== 'nursery';
  const [previewNursery, setPreviewNursery] = useState(false);
  const nurseryMode = !isAdmin || previewNursery;
  const nurseryNameAr = profile?.nursery || 'الرحمانية الجديدة';
  const nurseryNameEn = profile?.nursery || 'New Al Rahmaniya';
  const [advances, setAdvances] = useState(INITIAL_ADVANCES);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState('');
  const [dbNurseries, setDbNurseries] = useState([]);
  const [dbLoading, setDbLoading] = useState(databaseMode);

  useEffect(() => {
    let active = true;
    async function loadDatabaseData() {
      if (!databaseMode) {
        setDbLoading(false);
        return;
      }
      try {
        const [advanceRows, nurseryRows] = await Promise.all([listAdvancesDb(), listNurseries()]);
        if (active) {
          setAdvances(advanceRows);
          setDbNurseries(nurseryRows);
        }
      } catch (error) {
        console.error('Advance database load failed:', error);
        if (active) notify(ar ? 'تعذر تحميل السلف من Supabase. تأكدي من تشغيل ملف SQL.' : 'Could not load advances from Supabase.');
      } finally {
        if (active) setDbLoading(false);
      }
    }
    loadDatabaseData();
    return () => { active = false; };
  }, [databaseMode]);

  function notify(message) { setToast(message); setTimeout(() => setToast(''), 2600); }
  function currentNurseryAllocation(advance) {
    const matched = advance.allocations.find(a => a.nurseryAr === nurseryNameAr || a.nurseryEn === nurseryNameEn);
    return matched || (previewNursery ? advance.allocations[0] : undefined);
  }
  const visibleAdvances = useMemo(() => advances.filter(advance => {
    if (nurseryMode && !currentNurseryAllocation(advance)) return false;
    if (filter !== 'all' && advance.type !== filter && advance.status !== filter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [advance.id, advance.nameAr, advance.nameEn, ...advance.allocations.flatMap(a => [a.nurseryAr, a.nurseryEn])].some(v => String(v).toLowerCase().includes(term));
  }), [advances, filter, search, nurseryMode]);

  const summary = visibleAdvances.reduce((acc, advance) => {
    const allocations = nurseryMode ? [currentNurseryAllocation(advance)].filter(Boolean) : advance.allocations;
    allocations.forEach(allocation => { acc.allocated += Number(allocation.allocated || 0); acc.spent += spentOf(allocation); });
    if (advance.status === 'open') acc.open += 1;
    return acc;
  }, { allocated: 0, spent: 0, open: 0 });

  async function createAdvance(form, status) {
    const allocations = form.rows.filter(row => row.selected && Number(row.amount) > 0).map(row => ({ nurseryAr: row.ar, nurseryEn: row.en, allocated: Number(row.amount), invoices: [] }));
    if (!allocations.length) { notify(t.invalid); return false; }
    const next = {
      id: `ADV-2026-${String(advances.length + 9).padStart(3, '0')}`,
      nameAr: form.name, nameEn: form.name,
      type: form.type, from: form.from, to: form.to, status,
      allocations: allocations.map((row) => {
        const match = dbNurseries.find((nursery) => nursery.name_ar === row.nurseryAr || nursery.name_en === row.nurseryEn);
        return { ...row, nurseryId: match?.id };
      }),
    };
    if (databaseMode) {
      if (next.allocations.some((row) => !row.nurseryId)) {
        notify(ar ? 'تعذر مطابقة إحدى الحضانات مع قاعدة البيانات.' : 'A nursery could not be matched.');
        return false;
      }
      try {
        next.dbId = await createAdvanceDb(next);
      } catch (error) {
        console.error(error);
        notify(ar ? 'تعذر حفظ السلفة في قاعدة البيانات.' : 'Could not save advance to database.');
        return false;
      }
    }
    setAdvances(current => [next, ...current]);
    setCreating(false); notify(t.created); return true;
  }
  async function toggleStatus(id) {
    const item = advances.find(a => a.id === id);
    const nextStatus = item?.status === 'open' ? 'closed' : 'open';
    if (databaseMode && item) {
      try {
        await toggleAdvanceStatus(item, nextStatus);
      } catch (error) {
        console.error(error);
        notify(ar ? 'تعذر تحديث حالة السلفة في قاعدة البيانات.' : 'Could not update advance status.');
        return;
      }
    }
    setAdvances(current => current.map(a => a.id === id ? { ...a, status: nextStatus } : a));
    notify(item?.status === 'open' ? t.closedMsg : t.reopenedMsg);
  }
  function addDemoInvoice(advanceId, nurseryAr) {
    const amount = 125;
    setAdvances(current => current.map(a => a.id !== advanceId ? a : { ...a, allocations: a.allocations.map(allocation => allocation.nurseryAr !== nurseryAr ? allocation : { ...allocation, invoices: [...allocation.invoices, { no: `INV-DEMO-${allocation.invoices.length + 1}`, supplierAr: 'مورد تجريبي', supplierEn: 'Demo Supplier', date: new Date().toLocaleDateString('en-GB'), amount }] }) }));
  }

  return <section className="advances-page">
    {databaseMode&&<div className="database-connected-banner">● {ar?'السلف مرتبطة بقاعدة البيانات، والمصروف يُحسب من الفواتير المعتمدة.':'Advances are connected to the database; spending is calculated from approved invoices.'}</div>}
    {dbLoading&&<div className="database-loading-banner">◷ {ar?'جاري تحميل السلف...':'Loading advances...'}</div>}
    <div className="module-heading advances-heading">
      <div><span className="eyebrow">SAAMS v2.2</span><h1>{t.title}</h1><p>{t.sub}</p></div>
      <div className="advances-heading-actions">
        {isAdmin && <button className="preview-nursery-btn" onClick={() => setPreviewNursery(v => !v)}>{previewNursery ? t.backAdmin : t.previewNursery}</button>}
        <div className="role-pill">{nurseryMode ? t.nursery : t.admin}</div>
        {!nurseryMode && <button className="primary-action" onClick={() => setCreating(true)}>＋ {t.create}</button>}
      </div>
    </div>

    <div className="advance-stat-grid">
      <article className="allocated"><span>▥</span><div><small>{t.totalAllocated}</small><strong>{money(summary.allocated)} <b>AED</b></strong></div></article>
      <article className="spent"><span>↘</span><div><small>{t.totalSpent}</small><strong>{money(summary.spent)} <b>AED</b></strong></div></article>
      <article className="remaining"><span>◉</span><div><small>{t.totalRemaining}</small><strong>{money(summary.allocated - summary.spent)} <b>AED</b></strong></div></article>
      <article className="opened"><span>▣</span><div><small>{t.openAdvances}</small><strong>{summary.open}</strong></div></article>
    </div>

    <div className="advance-toolbar">
      <div className="invoice-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} /></div>
      <div className="advance-filters">
        {['all','monthly','event','open','closed'].map(value => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{t[value]}</button>)}
      </div>
    </div>

    <div className="advance-card-list">
      {visibleAdvances.map(advance => {
        const totals = totalsOf(advance);
        const allocation = nurseryMode ? currentNurseryAllocation(advance) : null;
        const allocated = allocation ? allocation.allocated : totals.allocated;
        const spent = allocation ? spentOf(allocation) : totals.spent;
        const remaining = allocated - spent;
        const usage = allocated ? Math.min(100, (spent / allocated) * 100) : 0;
        return <article className="advance-card" key={advance.id}>
          <div className="advance-card-top">
            <div className={`advance-type-icon ${advance.type}`}>{advance.type === 'monthly' ? '▥' : '☆'}</div>
            <div className="advance-title"><div><span className={`advance-type-badge ${advance.type}`}>{t[advance.type]}</span><span className={`advance-status ${advance.status}`}>{t[advance.status]}</span></div><h3>{ar ? advance.nameAr : advance.nameEn}</h3><p>{advance.id} · {advance.from} — {advance.to}</p></div>
            <div className="advance-card-actions"><button onClick={() => setViewing({ advance, allocation })}>{t.view}</button>{!nurseryMode && <button className={advance.status === 'open' ? 'close-advance' : 'reopen-advance'} onClick={() => toggleStatus(advance.id)}>{advance.status === 'open' ? t.close : t.reopen}</button>}</div>
          </div>
          <div className="advance-balance-grid">
            <div><small>{t.allocated}</small><strong>{money(allocated)} AED</strong></div>
            <div><small>{t.spent}</small><strong>{money(spent)} AED</strong></div>
            <div><small>{t.remaining}</small><strong className={remaining < allocated * .2 ? 'low' : ''}>{money(remaining)} AED</strong></div>
            <div><small>{t.invoicesCount}</small><strong>{allocation ? allocation.invoices.length : advance.allocations.reduce((sum,a)=>sum+a.invoices.length,0)}</strong></div>
          </div>
          <div className="advance-progress"><div className="advance-progress-label"><span>{t.usage}</span><b>{usage.toFixed(0)}%</b></div><div className="advance-progress-track"><i style={{ width: `${usage}%` }} /></div></div>
          <div className="advance-card-footer"><span className={advance.status === 'open' ? 'upload-open' : 'upload-closed'}>{advance.status === 'open' ? '● ' + t.uploadOpen : '● ' + t.uploadClosed}</span><span>{nurseryMode ? `${ar ? allocation?.nurseryAr : allocation?.nurseryEn}` : `${advance.allocations.length} ${t.nurseries}`}</span></div>
        </article>;
      })}
    </div>

    {creating && <CreateAdvanceModal ar={ar} t={t} onClose={() => setCreating(false)} onSave={createAdvance} />}
    {viewing && <AdvanceDetails ar={ar} t={t} data={viewing} nurseryMode={nurseryMode} onClose={() => setViewing(null)} onToggle={() => { toggleStatus(viewing.advance.id); setViewing(null); }} onDemo={allocation => addDemoInvoice(viewing.advance.id, allocation.nurseryAr)} />}
    {toast && <div className="asset-toast">✓ {toast}</div>}
  </section>;
}

function CreateAdvanceModal({ ar, t, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'monthly', from: '2026-08-01', to: '2026-09-30', sameAmount: '', rows: NURSERIES.map(n => ({ ...n, selected: false, amount: '' })) });
  function setRows(fn) { setForm(current => ({ ...current, rows: fn(current.rows) })); }
  function applySame() { if (!Number(form.sameAmount)) return; setRows(rows => rows.map(row => row.selected ? { ...row, amount: form.sameAmount } : row)); }
  function submit(status) { if (!form.name.trim()) return; onSave(form, status); }
  return <div className="invoice-overlay" onClick={onClose}><div className="create-advance-modal" onClick={e => e.stopPropagation()}>
    <div className="drawer-header"><div><small>SAAMS Advances</small><h2>{t.createTitle}</h2></div><button onClick={onClose}>×</button></div>
    <div className="advance-form-grid">
      <label className="wide"><span>{t.customName}</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t.customNameHint} /></label>
      <label><span>{t.type}</span><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="monthly">{t.monthly}</option><option value="event">{t.event}</option></select></label>
      <label><span>{t.fromDate}</span><input type="date" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} /></label>
      <label><span>{t.toDate}</span><input type="date" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} /></label>
    </div>
    <div className="nursery-allocation-section">
      <div className="allocation-heading"><div><h3>{t.chooseNurseries}</h3><p>{ar ? 'يمكن تحديد مبلغ مختلف لكل حضانة حسب احتياجها.' : 'Each nursery can receive a different amount.'}</p></div><div><button onClick={() => setRows(rows => rows.map(r => ({ ...r, selected: true })))}>{t.selectAll}</button><button onClick={() => setRows(rows => rows.map(r => ({ ...r, selected: false })))}>{t.clearAll}</button></div></div>
      <div className="same-amount-row"><span>{t.sameAmount}</span><input type="number" min="0" step="0.01" value={form.sameAmount} onChange={e => setForm({ ...form, sameAmount: e.target.value })} placeholder="0.00" /><button onClick={applySame}>{t.apply}</button></div>
      <div className="nursery-allocation-list">{form.rows.map((row, index) => <label className={row.selected ? 'selected' : ''} key={row.ar}><input type="checkbox" checked={row.selected} onChange={e => setRows(rows => rows.map((r,i) => i === index ? { ...r, selected: e.target.checked } : r))} /><strong>{ar ? row.ar : row.en}</strong><div><span>{t.amount}</span><input type="number" min="0" step="0.01" disabled={!row.selected} value={row.amount} onChange={e => setRows(rows => rows.map((r,i) => i === index ? { ...r, amount: e.target.value } : r))} /><b>AED</b></div></label>)}</div>
    </div>
    <div className="create-advance-actions"><button className="secondary-action" onClick={onClose}>{t.cancel}</button><button className="draft-action" onClick={() => submit('draft')}>{t.saveDraft}</button><button className="primary-action" onClick={() => submit('open')}>{t.save}</button></div>
  </div></div>;
}

function AdvanceDetails({ ar, t, data, nurseryMode, onClose, onToggle, onDemo }) {
  const { advance, allocation } = data;
  const [selected, setSelected] = useState(allocation || advance.allocations[0]);
  const spent = spentOf(selected), remaining = selected.allocated - spent, usage = selected.allocated ? (spent / selected.allocated) * 100 : 0;
  return <div className="invoice-overlay" onClick={onClose}><aside className="advance-details-drawer" onClick={e => e.stopPropagation()}>
    <div className="drawer-header"><div><small>{t.details}</small><h2>{ar ? advance.nameAr : advance.nameEn}</h2><p>{advance.id}</p></div><button onClick={onClose}>×</button></div>
    {!nurseryMode && <div className="advance-nursery-tabs">{advance.allocations.map(a => <button key={a.nurseryAr} className={selected.nurseryAr === a.nurseryAr ? 'active' : ''} onClick={() => setSelected(a)}>{ar ? a.nurseryAr : a.nurseryEn}</button>)}</div>}
    <div className="detail-balance-hero"><small>{t.nurseryBalance}</small><h3>{money(remaining)} AED</h3><div><span>{money(spent)} {t.spent}</span><span>{money(selected.allocated)} {t.allocated}</span></div><div className="advance-progress-track"><i style={{ width: `${Math.min(100, usage)}%` }} /></div></div>
    <div className="detail-mini-stats"><div><small>{t.allocated}</small><strong>{money(selected.allocated)} AED</strong></div><div><small>{t.spent}</small><strong>{money(spent)} AED</strong></div><div><small>{t.remaining}</small><strong>{money(remaining)} AED</strong></div><div><small>{t.invoicesCount}</small><strong>{selected.invoices.length}</strong></div></div>
    <div className="invoice-deduction-note">ⓘ {t.invoiceDeductionNote}</div>
    <div className="linked-invoices-heading"><h3>{t.invoices}</h3>{advance.status === 'open' && <button onClick={() => onDemo(selected)}>＋ {t.addInvoiceDemo}</button>}</div>
    <div className="linked-invoices-list">{selected.invoices.length ? selected.invoices.map(invoice => <article key={invoice.no}><div><strong>{invoice.no}</strong><span>{ar ? invoice.supplierAr : invoice.supplierEn}</span></div><div><b>{money(invoice.amount)} AED</b><small>{invoice.date}</small></div></article>) : <div className="advance-empty">▤<span>{t.noInvoices}</span></div>}</div>
    {!nurseryMode && <button className={advance.status === 'open' ? 'close-advance wide-action' : 'reopen-advance wide-action'} onClick={onToggle}>{advance.status === 'open' ? t.close : t.reopen}</button>}
  </aside></div>;
}
