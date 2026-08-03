import { useMemo, useState } from 'react';

const initialData = [
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

const emptyOcr = {
  supplier_name: '',
  invoice_number: '',
  invoice_date: '',
  amount_before_vat: '',
  vat_amount: '',
  total_amount: '',
  trn: '',
  payment_method: 'unknown',
  card_receipt_detected: false,
  currency: 'AED',
  document_quality: 'clear',
  rejection_reasons: [],
  confidence: 0,
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

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
    analyze: 'قراءة الفاتورة بالذكاء الاصطناعي',
    analyzing: 'جاري قراءة الفاتورة...',
    selectFile: 'اختاري ملفًا أولًا.',
    fileTooLarge: 'حجم الملف كبير. الحد الحالي 3 ميجابايت.',
    readFailed: 'تعذر قراءة الفاتورة. راجعي الإعدادات أو جربي ملفًا أوضح.',
    extracted: 'البيانات المقروءة — راجعيها قبل الحفظ',
    confidence: 'درجة الثقة',
    quality: 'جودة المستند',
    currency: 'العملة',
    receiptFound: 'تم اكتشاف إيصال البطاقة',
    receiptMissing: 'لم يتم اكتشاف إيصال البطاقة',
    savePreview: 'حفظ الفاتورة تجريبيًا',
    unknown: 'غير محدد',
    clear: 'واضح',
    unclear: 'غير واضح',
    rejected: 'مرفوض',
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
    analyze: 'Read Invoice with AI',
    analyzing: 'Reading invoice...',
    selectFile: 'Choose a file first.',
    fileTooLarge: 'File is too large. Current limit is 3 MB.',
    readFailed: 'Invoice reading failed. Check setup or try a clearer file.',
    extracted: 'Extracted Data — Review Before Saving',
    confidence: 'Confidence',
    quality: 'Document Quality',
    currency: 'Currency',
    receiptFound: 'Card receipt detected',
    receiptMissing: 'Card receipt not detected',
    savePreview: 'Save Invoice in Preview',
    unknown: 'Unknown',
    clear: 'Clear',
    unclear: 'Unclear',
    rejected: 'Rejected',
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
  const [rows, setRows] = useState(initialData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reading, setReading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocr, setOcr] = useState(null);
  const [uploadNursery, setUploadNursery] = useState('');
  const [uploadAdvance, setUploadAdvance] = useState('');
  const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

  const nurseries = [...new Set(rows.map((item) => ar ? item.nurseryAr : item.nurseryEn))];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((item) => {
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
  }, [search, nursery, status, ar, rows]);

  const stats = [
    { label: t.total, value: rows.length, icon: '▤', tone: 'blue' },
    { label: t.pending, value: rows.filter((x) => x.status === 'review').length, icon: '◷', tone: 'orange' },
    { label: t.approvedCount, value: rows.filter((x) => x.status === 'approved').length, icon: '✓', tone: 'green' },
    { label: t.returnedCount, value: rows.filter((x) => x.status === 'returned').length, icon: '↩', tone: 'violet' },
    { label: t.amount, value: `${rows.reduce((sum, x) => sum + x.total, 0).toLocaleString(undefined, {minimumFractionDigits: 2})} AED`, icon: '◉', tone: 'teal' },
  ];

  async function analyzeInvoice() {
    setOcrError('');
    if (!selectedFile) {
      setOcrError(t.selectFile);
      return;
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setOcrError(t.fileTooLarge);
      return;
    }

    setReading(true);
    try {
      const fileData = await fileToDataUrl(selectedFile);
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          fileData,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || t.readFailed);
      setOcr({ ...emptyOcr, ...payload.data });
      console.info('SAAMS OCR request completed:', payload.requestId || '');
    } catch (error) {
      setOcrError(error.message || t.readFailed);
    } finally {
      setReading(false);
    }
  }

  function updateOcr(field, value) {
    setOcr((current) => ({ ...current, [field]: value }));
  }

  function resetUpload() {
    setShowUpload(false);
    setSelectedFile(null);
    setOcr(null);
    setOcrError('');
    setUploadNursery('');
    setUploadAdvance('');
  }

  function savePreviewInvoice() {
    if (!ocr) return;
    const nurseryName = uploadNursery || (ar ? 'غير محددة' : 'Not selected');
    const next = {
      id: ocr.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
      nurseryAr: ar ? nurseryName : 'حضانة مختارة',
      nurseryEn: ar ? 'Selected Nursery' : nurseryName,
      advanceAr: uploadAdvance || 'فواتير مرفوعة',
      advanceEn: uploadAdvance || 'Uploaded Invoices',
      supplierAr: ocr.supplier_name || 'مورد غير محدد',
      supplierEn: ocr.supplier_name || 'Unknown Supplier',
      date: ocr.invoice_date || new Date().toLocaleDateString('en-GB'),
      total: Number(ocr.total_amount) || 0,
      vat: Number(ocr.vat_amount) || 0,
      payment: ocr.payment_method === 'card' ? 'card' : 'cash',
      status: 'review',
      pages: 1,
      trn: ocr.trn || '',
    };
    setRows((current) => [next, ...current]);
    resetUpload();
  }

  return (
    <section className="invoice-page">
      <div className="module-heading">
        <div>
          <span className="eyebrow">SAAMS v3.2</span>
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
        <div className="invoice-overlay" onClick={resetUpload}>
          <div className="upload-modal ocr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div><small>SAAMS AI OCR</small><h2>{t.uploadTitle}</h2></div>
              <button type="button" onClick={resetUpload}>×</button>
            </div>
            <div className="upload-form-grid">
              <label><span>{t.chooseNursery}</span><select value={uploadNursery} onChange={(e) => setUploadNursery(e.target.value)}><option value="">{t.nursery}</option>{nurseries.map((name) => <option key={name}>{name}</option>)}</select></label>
              <label><span>{t.chooseAdvance}</span><select value={uploadAdvance} onChange={(e) => setUploadAdvance(e.target.value)}><option value="">{t.advance}</option><option>{ar ? 'فواتير أغسطس 2026' : 'August 2026 Invoices'}</option><option>{ar ? 'سلفة نشاط التخرج 2026' : 'Graduation Advance 2026'}</option></select></label>
            </div>
            <label className={`drop-zone ${selectedFile ? 'has-file' : ''}`}>
              <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setOcr(null); setOcrError(''); }} />
              <span className="drop-icon">{selectedFile ? '✓' : '⇧'}</span>
              <strong>{selectedFile ? selectedFile.name : t.drag}</strong>
              <small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, JPG, PNG, WEBP — Max 3 MB'}</small>
              <b>{t.browse}</b>
            </label>
            {ocrError && <div className="ocr-error">! {ocrError}</div>}
            {!ocr && <button className="primary-action upload-save" type="button" disabled={reading} onClick={analyzeInvoice}>{reading ? `◌ ${t.analyzing}` : `✦ ${t.analyze}`}</button>}

            {ocr && (
              <div className="ocr-results">
                <div className="ocr-results-head">
                  <div><small>AI OCR</small><h3>{t.extracted}</h3></div>
                  <span className={`quality-pill ${ocr.document_quality}`}>{t[ocr.document_quality] || ocr.document_quality}</span>
                </div>
                <div className="ocr-confidence"><span>{t.confidence}</span><div><i style={{ width: `${Math.round((Number(ocr.confidence) || 0) * 100)}%` }} /></div><b>{Math.round((Number(ocr.confidence) || 0) * 100)}%</b></div>
                <div className="ocr-form-grid">
                  <label><span>{t.supplier}</span><input value={ocr.supplier_name} onChange={(e) => updateOcr('supplier_name', e.target.value)} /></label>
                  <label><span>{t.invoiceNo}</span><input value={ocr.invoice_number} onChange={(e) => updateOcr('invoice_number', e.target.value)} /></label>
                  <label><span>{t.invoiceDate}</span><input value={ocr.invoice_date} onChange={(e) => updateOcr('invoice_date', e.target.value)} /></label>
                  <label><span>{t.trn}</span><input value={ocr.trn} onChange={(e) => updateOcr('trn', e.target.value)} /></label>
                  <label><span>{t.beforeVat}</span><input type="number" step="0.01" value={ocr.amount_before_vat} onChange={(e) => updateOcr('amount_before_vat', e.target.value)} /></label>
                  <label><span>{t.vat}</span><input type="number" step="0.01" value={ocr.vat_amount} onChange={(e) => updateOcr('vat_amount', e.target.value)} /></label>
                  <label><span>{t.totalAmount}</span><input type="number" step="0.01" value={ocr.total_amount} onChange={(e) => updateOcr('total_amount', e.target.value)} /></label>
                  <label><span>{t.payment}</span><select value={ocr.payment_method} onChange={(e) => updateOcr('payment_method', e.target.value)}><option value="unknown">{t.unknown}</option><option value="card">{t.card}</option><option value="cash">{t.cash}</option></select></label>
                </div>
                <div className={`receipt-check ${ocr.payment_method === 'card' && !ocr.card_receipt_detected ? 'receipt-warning' : ''}`}>{ocr.card_receipt_detected ? '✓' : '!'} {ocr.card_receipt_detected ? t.receiptFound : t.receiptMissing}</div>
                {!!ocr.rejection_reasons?.length && <div className="ocr-reasons">{ocr.rejection_reasons.map((reason) => <span key={reason}>! {reason}</span>)}</div>}
                <div className="ocr-actions">
                  <button className="secondary-action" type="button" onClick={analyzeInvoice}>↻ {t.analyze}</button>
                  <button className="primary-action" type="button" onClick={savePreviewInvoice}>✓ {t.savePreview}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
