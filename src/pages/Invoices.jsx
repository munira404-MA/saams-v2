import { useMemo, useState } from 'react';

const data = [
  {
    id: 'INV-2026-134',
    nurseryAr: 'الرحمانية الجديدة',
    nurseryEn: 'New Al Rahmaniya',
    advanceAr: 'فواتير أغسطس 2026',
    advanceEn: 'August 2026 Invoices',
    supplierAr: 'مكتبة دبي للتوزيع',
    supplierEn: 'Dubai Distribution Library',
    date: '03/08/2026',
    total: 315.00,
    vat: 15.00,
    payment: 'card',
    status: 'review',
    pages: 2,
    trn: '100312456700003',
  },
  {
    id: 'INV-2026-133',
    nurseryAr: 'اللؤلؤية',
    nurseryEn: 'Al Luluyah',
    advanceAr: 'فواتير أغسطس 2026',
    advanceEn: 'August 2026 Invoices',
    supplierAr: 'مركز الإمارات للقرطاسية',
    supplierEn: 'Emirates Stationery Centre',
    date: '02/08/2026',
    total: 504.00,
    vat: 24.00,
    payment: 'cash',
    status: 'approved',
    pages: 1,
    trn: '100288145600003',
  },
  {
    id: 'INV-2026-132',
    nurseryAr: 'واسط 2',
    nurseryEn: 'Wasit 2',
    advanceAr: 'فواتير يوليو 2026',
    advanceEn: 'July 2026 Invoices',
    supplierAr: 'سوبرماركت المدينة',
    supplierEn: 'Al Madina Supermarket',
    date: '31/07/2026',
    total: 126.50,
    vat: 6.02,
    payment: 'card',
    status: 'returned',
    pages: 2,
    trn: '100221145600003',
  },
  {
    id: 'INV-2026-131',
    nurseryAr: 'البديع',
    nurseryEn: 'Al Badie',
    advanceAr: 'سلفة نشاط التخرج 2026',
    advanceEn: 'Graduation Event Advance 2026',
    supplierAr: 'زهور الشارقة',
    supplierEn: 'Sharjah Flowers',
    date: '28/07/2026',
    total: 850.00,
    vat: 40.48,
    payment: 'cash',
    status: 'approved',
    pages: 1,
    trn: '100144445600003',
  },
  {
    id: 'INV-2026-130',
    nurseryAr: 'القليعة',
    nurseryEn: 'Al Qulaya',
    advanceAr: 'فواتير يوليو 2026',
    advanceEn: 'July 2026 Invoices',
    supplierAr: 'الخليج للتنظيف',
    supplierEn: 'Gulf Cleaning',
    date: '25/07/2026',
    total: 220.00,
    vat: 10.48,
    payment: 'card',
    status: 'late',
    pages: 3,
    trn: '100392445600003',
  },
  {
    id: 'INV-2026-129',
    nurseryAr: 'السيوح',
    nurseryEn: 'Al Suyoh',
    advanceAr: 'فواتير يوليو 2026',
    advanceEn: 'July 2026 Invoices',
    supplierAr: 'مطابع الاتحاد',
    supplierEn: 'Al Ittihad Printing',
    date: '22/07/2026',
    total: 410.75,
    vat: 19.56,
    payment: 'cash',
    status: 'review',
    pages: 1,
    trn: '100777145600003',
  },
];

const copy = {
  ar: {
    title: 'إدارة الفواتير',
    subtitle: 'رفع الفواتير، مراجعتها، اعتمادها، وإرجاعها للحضانة عند الحاجة.',
    upload: 'رفع فاتورة جديدة',
    export: 'تصدير Excel',
    all: 'الكل',
    search: 'بحث برقم الفاتورة أو المورد أو الحضانة...',
    nursery: 'كل الحضانات',
    advance: 'كل السلف',
    status: 'كل الحالات',
    approved: 'معتمدة',
    review: 'قيد المراجعة',
    returned: 'معادة للحضانة',
    late: 'متأخرة',
    total: 'إجمالي الفواتير',
    pending: 'بانتظار المراجعة',
    approvedCount: 'فواتير معتمدة',
    returnedCount: 'معادة للتعديل',
    amount: 'إجمالي المصروف',
    invoiceNo: 'رقم الفاتورة',
    supplier: 'المورد',
    invoiceDate: 'التاريخ',
    nurseryName: 'الحضانة',
    advanceName: 'السلفة',
    totalAmount: 'الإجمالي',
    payment: 'الدفع',
    actions: 'الإجراءات',
    card: 'بطاقة',
    cash: 'نقد',
    view: 'عرض',
    approve: 'اعتماد',
    return: 'إرجاع',
    details: 'تفاصيل الفاتورة',
    vat: 'الضريبة',
    beforeVat: 'قبل الضريبة',
    trn: 'الرقم الضريبي',
    pages: 'عدد الصفحات',
    close: 'إغلاق',
    uploadTitle: 'رفع فاتورة جديدة',
    chooseNursery: 'اختاري الحضانة',
    chooseAdvance: 'اختاري السلفة',
    drag: 'اسحبي ملف PDF أو صورة الفاتورة هنا',
    browse: 'اختيار ملف',
    save: 'رفع وحفظ الفاتورة',
    noResults: 'لا توجد فواتير مطابقة للفلاتر الحالية.',
    reason: 'سبب الإرجاع',
    bankReceipt: 'إيصال البطاقة مرفق',
    preview: 'معاينة المستند',
  },
  en: {
    title: 'Invoice Management',
    subtitle: 'Upload, review, approve, and return nursery invoices when required.',
    upload: 'Upload New Invoice',
    export: 'Export Excel',
    all: 'All',
    search: 'Search invoice number, supplier, or nursery...',
    nursery: 'All Nurseries',
    advance: 'All Advances',
    status: 'All Statuses',
    approved: 'Approved',
    review: 'Under Review',
    returned: 'Returned to Nursery',
    late: 'Late',
    total: 'Total Invoices',
    pending: 'Awaiting Review',
    approvedCount: 'Approved Invoices',
    returnedCount: 'Returned for Editing',
    amount: 'Total Spent',
    invoiceNo: 'Invoice No.',
    supplier: 'Supplier',
    invoiceDate: 'Date',
    nurseryName: 'Nursery',
    advanceName: 'Advance',
    totalAmount: 'Total',
    payment: 'Payment',
    actions: 'Actions',
    card: 'Card',
    cash: 'Cash',
    view: 'View',
    approve: 'Approve',
    return: 'Return',
    details: 'Invoice Details',
    vat: 'VAT',
    beforeVat: 'Before VAT',
    trn: 'TRN',
    pages: 'Pages',
    close: 'Close',
    uploadTitle: 'Upload New Invoice',
    chooseNursery: 'Choose Nursery',
    chooseAdvance: 'Choose Advance',
    drag: 'Drag a PDF or invoice image here',
    browse: 'Choose File',
    save: 'Upload and Save Invoice',
    noResults: 'No invoices match the current filters.',
    reason: 'Return Reason',
    bankReceipt: 'Card receipt attached',
    preview: 'Document Preview',
  },
};

function StatusBadge({ status, t }) {
  return <span className={`invoice-status ${status}`}>{t[status]}</span>;
}

export default function Invoices({ lang }) {
  const ar = lang === 'ar';
  const t = copy[lang] || copy.ar;
  const [search, setSearch] = useState('');
  const [nursery, setNursery] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const nurseries = [...new Set(data.map((item) => ar ? item.nurseryAr : item.nurseryEn))];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesText = !term || [
        item.id,
        item.supplierAr,
        item.supplierEn,
        item.nurseryAr,
        item.nurseryEn,
      ].some((value) => value.toLowerCase().includes(term));
      const currentNursery = ar ? item.nurseryAr : item.nurseryEn;
      const matchesNursery = nursery === 'all' || currentNursery === nursery;
      const matchesStatus = status === 'all' || item.status === status;
      return matchesText && matchesNursery && matchesStatus;
    });
  }, [search, nursery, status, ar]);

  const stats = [
    { label: t.total, value: data.length, icon: '▤', tone: 'blue' },
    { label: t.pending, value: data.filter((x) => x.status === 'review').length, icon: '◷', tone: 'orange' },
    { label: t.approvedCount, value: data.filter((x) => x.status === 'approved').length, icon: '✓', tone: 'green' },
    { label: t.returnedCount, value: data.filter((x) => x.status === 'returned').length, icon: '↩', tone: 'violet' },
    { label: t.amount, value: `${data.reduce((sum, x) => sum + x.total, 0).toLocaleString(undefined, {minimumFractionDigits: 2})} AED`, icon: '◉', tone: 'teal' },
  ];

  return (
    <section className="invoice-page">
      <div className="module-heading">
        <div>
          <span className="eyebrow">SAAMS v3.0</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="module-actions">
          <button className="secondary-action" type="button">⇩ {t.export}</button>
          <button className="primary-action" type="button" onClick={() => setShowUpload(true)}>＋ {t.upload}</button>
        </div>
      </div>

      <div className="invoice-stats">
        {stats.map((item) => (
          <article className={`invoice-stat ${item.tone}`} key={item.label}>
            <span className="invoice-stat-icon">{item.icon}</span>
            <div><small>{item.label}</small><strong>{item.value}</strong></div>
          </article>
        ))}
      </div>

      <div className="invoice-toolbar">
        <div className="invoice-search">
          <span>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} />
        </div>
        <select value={nursery} onChange={(e) => setNursery(e.target.value)}>
          <option value="all">{t.nursery}</option>
          {nurseries.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select>
          <option>{t.advance}</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">{t.status}</option>
          <option value="review">{t.review}</option>
          <option value="approved">{t.approved}</option>
          <option value="returned">{t.returned}</option>
          <option value="late">{t.late}</option>
        </select>
      </div>

      <div className="invoice-table-card">
        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>{t.invoiceNo}</th>
                <th>{t.supplier}</th>
                <th>{t.invoiceDate}</th>
                <th>{t.nurseryName}</th>
                <th>{t.advanceName}</th>
                <th>{t.totalAmount}</th>
                <th>{t.payment}</th>
                <th>{t.status}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><strong className="invoice-id">{item.id}</strong><small>{item.pages} {t.pages}</small></td>
                  <td><strong>{ar ? item.supplierAr : item.supplierEn}</strong><small>TRN {item.trn.slice(-6)}</small></td>
                  <td>{item.date}</td>
                  <td>{ar ? item.nurseryAr : item.nurseryEn}</td>
                  <td>{ar ? item.advanceAr : item.advanceEn}</td>
                  <td><strong>{item.total.toFixed(2)} AED</strong></td>
                  <td><span className={`payment-badge ${item.payment}`}>{item.payment === 'card' ? '▣' : '●'} {t[item.payment]}</span></td>
                  <td><StatusBadge status={item.status} t={t} /></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => setSelected(item)}>{t.view}</button>
                      {item.status === 'review' && <button className="approve-row" type="button">{t.approve}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="invoice-empty">▤<strong>{t.noResults}</strong></div>}
        </div>
      </div>

      {selected && (
        <div className="invoice-overlay" onClick={() => setSelected(null)}>
          <aside className="invoice-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div><small>{t.details}</small><h2>{selected.id}</h2></div>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="document-preview">
              <span>PDF</span>
              <strong>{t.preview}</strong>
              <small>{selected.pages} {t.pages}</small>
            </div>
            <div className="invoice-detail-grid">
              <div><small>{t.supplier}</small><strong>{ar ? selected.supplierAr : selected.supplierEn}</strong></div>
              <div><small>{t.nurseryName}</small><strong>{ar ? selected.nurseryAr : selected.nurseryEn}</strong></div>
              <div><small>{t.invoiceDate}</small><strong>{selected.date}</strong></div>
              <div><small>{t.payment}</small><strong>{t[selected.payment]}</strong></div>
              <div><small>{t.beforeVat}</small><strong>{(selected.total - selected.vat).toFixed(2)} AED</strong></div>
              <div><small>{t.vat}</small><strong>{selected.vat.toFixed(2)} AED</strong></div>
              <div className="detail-wide"><small>{t.totalAmount}</small><strong className="detail-total">{selected.total.toFixed(2)} AED</strong></div>
              <div className="detail-wide"><small>{t.trn}</small><strong>{selected.trn}</strong></div>
            </div>
            {selected.payment === 'card' && <div className="receipt-check">✓ {t.bankReceipt}</div>}
            <div className="drawer-actions">
              <button className="return-button" type="button">↩ {t.return}</button>
              <button className="primary-action" type="button">✓ {t.approve}</button>
            </div>
          </aside>
        </div>
      )}

      {showUpload && (
        <div className="invoice-overlay" onClick={() => setShowUpload(false)}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div><small>SAAMS</small><h2>{t.uploadTitle}</h2></div>
              <button type="button" onClick={() => setShowUpload(false)}>×</button>
            </div>
            <div className="upload-form-grid">
              <label><span>{t.chooseNursery}</span><select><option>{t.nursery}</option>{nurseries.map((name) => <option key={name}>{name}</option>)}</select></label>
              <label><span>{t.chooseAdvance}</span><select><option>{t.advance}</option></select></label>
            </div>
            <label className="drop-zone">
              <input type="file" accept=".pdf,image/*" />
              <span className="drop-icon">⇧</span>
              <strong>{t.drag}</strong>
              <small>PDF, JPG, PNG — Max 20 MB</small>
              <b>{t.browse}</b>
            </label>
            <button className="primary-action upload-save" type="button">✓ {t.save}</button>
          </div>
        </div>
      )}
    </section>
  );
}
