import { recordAudit, loadAuditLog } from '../utils/audit';
import { registerAttachment } from '../utils/attachments';
import { detectPotentialDuplicates } from '../utils/intelligence';
import {
  createInvoice as createInvoiceDb,
  findNurseryByName,
  listInvoices as listInvoicesDb,
  listOpenAdvanceAllocations,
  updateInvoiceStatus,
} from '../data/supabaseData';
import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { supabase } from '../supabase';

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
  bank_receipt_over_invoice: false,
  multiple_documents_same_page: false,
  invoice_cropped: false,
  important_fields_obscured: false,
  can_save: false,
  currency: 'AED',
  document_quality: 'clear',
  missing_fields: [],
  rejection_reasons: [],
  confidence: 0,
  sequence_mark: '',
  payment_proof_pages: [],
  payment_proof_types: [],
  needs_review: false,
  review_message: '',
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error('الملف المحدد غير صالح. يرجى اختيار الفاتورة أو تصويرها مرة أخرى.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('تعذر قراءة الملف. يرجى المحاولة مرة أخرى.'));
    reader.readAsDataURL(file);
  });
}

const copy = {
  ar: {
    title: 'إدارة الفواتير',
    subtitle: 'رفع الفواتير، مراجعتها، اعتمادها، وإرجاعها للحضانة عند الحاجة.',
    upload: 'رفع فاتورة جديدة',
    export: 'تصدير Excel',
    downloadInvoices: 'تنزيل الفواتير',
    noAttachmentsToDownload: 'لا توجد مرفقات فعلية ضمن النتائج الحالية لتنزيلها.',
    originalFullScreen: 'عرض بالحجم الكامل',
    downloadFile: 'تنزيل الملف',
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
    view: 'تفاصيل',
    viewInvoice: 'عرض الفاتورة',
    approve: 'اعتماد',
    return: 'إرجاع',
    details: 'تفاصيل الفاتورة',
    vat: 'الضريبة',
    beforeVat: 'قبل الضريبة',
    trn: 'الرقم الضريبي',
    pages: 'عدد الصفحات',
    close: 'إغلاق',
    uploadTitle: 'رفع فواتير جديدة',
    batchHint: 'يمكنك اختيار عدة فواتير دفعة واحدة، ثم مراجعتها وحفظها بالترتيب.',
    selectedInvoices: 'الفواتير المختارة',
    detectedInvoices: 'جدول مراجعة الملف الكامل',
    detectedPages: 'صفحة الفاتورة',
    linkedReceiptPages: 'صفحات إثبات الخصم',
    pageTypeInvoice: 'فاتورة',
    pageTypeReceipt: 'إيصال بطاقة',
    pageTypeBankMessage: 'رسالة خصم بنكية',
    pageTypeBankApp: 'إثبات من تطبيق البنك',
    pageTypeOrderSummary: 'ملخص طلب',
    pageTypeOther: 'صفحة أخرى',
    sequence: 'المتسلسل',
    proof: 'إثبات الخصم',
    reviewStatus: 'حالة المراجعة',
    ready: 'جاهزة',
    select: 'مراجعة',
    missingProof: 'غير مرفق',
    invoiceOf: 'فاتورة',
    nextInvoice: 'الانتقال للفاتورة التالية',
    chooseNursery: 'اختاري الحضانة',
    chooseAdvance: 'اختاري السلفة',
    drag: 'اسحبي ملف PDF أو صورة الفاتورة هنا',
    browse: 'اختيار ملف',
    uploadFromDevice: 'رفع ملف',
    uploadFromDeviceHint: 'PDF أو صورة من الجهاز',
    takeInvoicePhoto: 'تصوير الفاتورة',
    takeInvoicePhotoHint: 'فتح الكاميرا والتقاط الفاتورة مباشرة',
    takeAnotherPage: 'تصوير صفحة أخرى',
    cameraAutoRead: 'ستبدأ قراءة الفاتورة تلقائيًا بعد التصوير.',
    photographReceipt: 'تصوير إثبات الخصم',
    uploadReceipt: 'رفع إثبات الخصم',
    save: 'رفع وحفظ الفاتورة',
    noResults: 'لا توجد فواتير مطابقة للفلاتر الحالية.',
    reason: 'سبب الإرجاع',
    bankReceipt: 'إثبات الخصم مرفق',
    preview: 'معاينة المستند',
    viewOriginal: 'عرض الفاتورة الأصلية',
    originalInvoice: 'الفاتورة الأصلية',
    noOriginalAttachment: 'لا يوجد مرفق أصلي لهذه الفاتورة التجريبية.',
    openOriginal: 'فتح الفاتورة بالحجم الكامل',
    attachmentPreview: 'المرفق المختار',
    noAttachment: 'لم يتم اختيار مرفق بعد',
    removeAttachment: 'حذف المرفق',
    openFull: 'فتح بالحجم الكامل',
    fileName: 'اسم الملف',
    fileSize: 'حجم الملف',
    fileType: 'نوع الملف',
    analyze: 'قراءة الفاتورة بالذكاء الاصطناعي',
    analyzing: 'جاري قراءة الفاتورة...',
    selectFile: 'اختاري ملفًا أولًا.',
    fileTooLarge: 'حجم الملف كبير. الحد الحالي 3 ميجابايت.',
    readFailed: 'تعذر قراءة الفاتورة. راجعي الإعدادات أو جربي ملفًا أوضح.',
    extracted: 'البيانات المقروءة — راجعيها قبل الحفظ',
    confidence: 'درجة الثقة',
    quality: 'جودة المستند',
    currency: 'العملة',
    receiptFound: 'تم اكتشاف إثبات الخصم',
    receiptMissing: 'لم يتم إرفاق إثبات الخصم',
    savePreview: 'حفظ الفاتورة تجريبيًا',
    unknown: 'غير محدد',
    clear: 'واضح',
    needs_review: 'تحتاج مراجعة',
    rejected: 'مرفوض',
    uploadRejected: 'تم رفض المرفق',
    reviewNeeded: 'الفاتورة واضحة، لكن بعض البيانات تحتاج مراجعة أو إدخالًا يدويًا.',
    blockedSave: 'لا يمكن حفظ الفاتورة قبل استكمال الحقول المطلوبة أو إرفاق أحد إثباتات الخصم المقبولة عند الدفع بالبطاقة.',
    manualInvoice: 'فاتورة يدوية / غير ضريبية',
    manualInvoiceHint: 'فعّلي هذا الخيار للفواتير اليدوية التي لا تحتوي رقمًا ضريبيًا. يجب إدخال البيانات الأساسية يدويًا.',
    receiptAttachment: 'إرفاق إثبات الخصم',
    receiptHint: 'يُقبل أحد الخيارات التالية: إيصال الخصم، رسالة الخصم من البنك، أو لقطة شاشة لعملية الخصم من تطبيق البنك. يجب أن يكون الإثبات واضحًا ومنفصلًا عن الفاتورة.',
    chooseReceipt: 'اختيار إيصال',
    removeReceipt: 'حذف الإيصال',
    receiptAttached: 'تم إرفاق إثبات الخصم',
  },
  en: {
    title: 'Invoice Management',
    subtitle: 'Upload, review, approve, and return nursery invoices when required.',
    upload: 'Upload New Invoice',
    export: 'Export Excel',
    downloadInvoices: 'Download Invoices',
    noAttachmentsToDownload: 'There are no actual attachments in the current results to download.',
    originalFullScreen: 'Full Screen View',
    downloadFile: 'Download File',
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
    view: 'Details',
    viewInvoice: 'View Invoice',
    approve: 'Approve',
    return: 'Return',
    details: 'Invoice Details',
    vat: 'VAT',
    beforeVat: 'Before VAT',
    trn: 'TRN',
    pages: 'Pages',
    close: 'Close',
    uploadTitle: 'Upload New Invoices',
    batchHint: 'Select multiple invoices at once, then review and save them in order.',
    selectedInvoices: 'Selected Invoices',
    detectedInvoices: 'Full File Review Table',
    detectedPages: 'Invoice Page',
    linkedReceiptPages: 'Payment Proof Pages',
    pageTypeInvoice: 'Invoice',
    pageTypeReceipt: 'Card Receipt',
    pageTypeBankMessage: 'Bank Debit Message',
    pageTypeBankApp: 'Banking App Proof',
    pageTypeOrderSummary: 'Order Summary',
    pageTypeOther: 'Other Page',
    sequence: 'Sequence',
    proof: 'Payment Proof',
    reviewStatus: 'Review Status',
    ready: 'Ready',
    select: 'Review',
    missingProof: 'Missing',
    invoiceOf: 'Invoice',
    nextInvoice: 'Move to Next Invoice',
    chooseNursery: 'Choose Nursery',
    chooseAdvance: 'Choose Advance',
    drag: 'Drag a PDF or invoice image here',
    browse: 'Choose File',
    uploadFromDevice: 'Upload File',
    uploadFromDeviceHint: 'PDF or image from your device',
    takeInvoicePhoto: 'Take Invoice Photo',
    takeInvoicePhotoHint: 'Open the camera and capture the invoice directly',
    takeAnotherPage: 'Take Another Page',
    cameraAutoRead: 'Invoice reading will start automatically after capture.',
    photographReceipt: 'Photograph Payment Proof',
    uploadReceipt: 'Upload Payment Proof',
    save: 'Upload and Save Invoice',
    noResults: 'No invoices match the current filters.',
    reason: 'Return Reason',
    bankReceipt: 'Payment proof attached',
    preview: 'Document Preview',
    viewOriginal: 'View Original Invoice',
    originalInvoice: 'Original Invoice',
    noOriginalAttachment: 'No original attachment is available for this sample invoice.',
    openOriginal: 'Open Full-Size Invoice',
    attachmentPreview: 'Selected Attachment',
    noAttachment: 'No attachment selected yet',
    removeAttachment: 'Remove Attachment',
    openFull: 'Open Full Size',
    fileName: 'File Name',
    fileSize: 'File Size',
    fileType: 'File Type',
    analyze: 'Read Invoice with AI',
    analyzing: 'Reading invoice...',
    selectFile: 'Choose a file first.',
    fileTooLarge: 'File is too large. Current limit is 3 MB.',
    readFailed: 'Invoice reading failed. Check setup or try a clearer file.',
    extracted: 'Extracted Data — Review Before Saving',
    confidence: 'Confidence',
    quality: 'Document Quality',
    currency: 'Currency',
    receiptFound: 'Payment proof detected',
    receiptMissing: 'Payment proof not attached',
    savePreview: 'Save Invoice in Preview',
    unknown: 'Unknown',
    clear: 'Clear',
    needs_review: 'Needs Review',
    rejected: 'Rejected',
    uploadRejected: 'Attachment Rejected',
    blockedSave: 'This invoice cannot be saved. Complete the required fields and attach one accepted payment proof when payment is by card.',
    manualInvoice: 'Handwritten / Non-tax Invoice',
    manualInvoiceHint: 'Enable for handwritten invoices without a TRN. Enter the core details manually.',
    receiptAttachment: 'Attach Payment Proof',
    receiptHint: 'Accepted: debit/card receipt, bank debit SMS/message, or a screenshot of the debit transaction from the banking app. The proof must be clear and separate from the invoice.',
    chooseReceipt: 'Choose Receipt',
    removeReceipt: 'Remove Receipt',
    receiptAttached: 'Payment proof attached',
    approveConfirm: 'Approve this invoice?',
    approvedSuccess: 'Invoice approved successfully.',
    returnTitle: 'Return Invoice to Nursery',
    returnInstruction: 'Enter a clear reason so the nursery can correct the invoice.',
    returnPlaceholder: 'Example: Attach a valid payment proof separately or correct the total amount...',
    cancel: 'Cancel',
    confirmReturn: 'Confirm Return',
    returnReasonRequired: 'Enter a return reason.',
    returnedSuccess: 'Invoice returned to the nursery.',
    currentReturnReason: 'Return Reason',
  },
};

function StatusBadge({ status, t }) {
  return <span className={`invoice-status ${status}`}>{t[status]}</span>;
}

export default function Invoices({ lang, profile, databaseMode }) {
  const invoiceFileInputRef = useRef(null);
  const invoiceCameraInputRef = useRef(null);
  const receiptFileInputRef = useRef(null);
  const receiptCameraInputRef = useRef(null);
  const ar = lang === 'ar';
  const isNursery = profile?.role === 'nursery';
  const accountNursery = profile?.nursery || '';
  const t = copy[lang] || copy.ar;
  const [search, setSearch] = useState('');
  const [nursery, setNursery] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [rows, setRows] = useState(initialData);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const selectedFile = selectedFiles[activeFileIndex] || null;
  const [selectedFileUrl, setSelectedFileUrl] = useState('');
  const [reading, setReading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocr, setOcr] = useState(null);
  const [detectedInvoices, setDetectedInvoices] = useState([]);
  const [activeDetectedIndex, setActiveDetectedIndex] = useState(0);
  const [pageClassification, setPageClassification] = useState([]);
  const [uploadNursery, setUploadNursery] = useState('');
  const [uploadAdvance, setUploadAdvance] = useState('');
  const [manualInvoice, setManualInvoice] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptFileUrl, setReceiptFileUrl] = useState('');
  const [fullScreenAttachment, setFullScreenAttachment] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [dbLoading, setDbLoading] = useState(databaseMode);
  const [advanceOptions, setAdvanceOptions] = useState([]);
  const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

  useEffect(() => {
    let active = true;
    async function loadDatabaseRows() {
      if (!databaseMode) {
        setDbLoading(false);
        return;
      }
      try {
        const dbRows = await listInvoicesDb();
        if (active) setRows(dbRows);
        const options = await listOpenAdvanceAllocations(profile?.nursery_id || null);
        if (active) setAdvanceOptions(options);
      } catch (error) {
        console.error('Invoice database load failed:', error);
        if (active) {
          setOcrError(ar ? 'تعذر تحميل بيانات الفواتير من Supabase. تأكدي من تشغيل ملف SQL.' : 'Could not load invoices from Supabase.');
        }
      } finally {
        if (active) setDbLoading(false);
      }
    }
    loadDatabaseRows();
    return () => { active = false; };
  }, [databaseMode, profile?.nursery_id]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFileUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(selectedFile);
    setSelectedFileUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptFileUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(receiptFile);
    setReceiptFileUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [receiptFile]);

  const scopedRows = isNursery ? rows.filter((item) => item.nurseryAr === accountNursery || item.nurseryEn === accountNursery) : rows;
  const nurseries = [...new Set(scopedRows.map((item) => ar ? item.nurseryAr : item.nurseryEn))];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scopedRows.filter((item) => {
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
  }, [search, nursery, status, ar, scopedRows]);

  const stats = [
    { label: t.total, value: scopedRows.length, icon: '▤', tone: 'blue' },
    { label: t.pending, value: scopedRows.filter((x) => x.status === 'review').length, icon: '◷', tone: 'orange' },
    { label: t.approvedCount, value: scopedRows.filter((x) => x.status === 'approved').length, icon: '✓', tone: 'green' },
    { label: t.returnedCount, value: scopedRows.filter((x) => x.status === 'returned').length, icon: '↩', tone: 'violet' },
    { label: t.amount, value: `${scopedRows.reduce((sum, x) => sum + x.total, 0).toLocaleString(undefined, {minimumFractionDigits: 2})} AED`, icon: '◉', tone: 'teal' },
  ];

  function safeFileName(value) {
    return String(value || 'invoice')
      .replace(/[\\/:*?\"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function dataUrlParts(dataUrl) {
    const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    return {
      mimeType: match[1] || 'application/octet-stream',
      isBase64: Boolean(match[2]),
      payload: match[3] || '',
    };
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrlParts(dataUrl);
    if (!parts) return null;
    const binary = parts.isBase64 ? atob(parts.payload) : decodeURIComponent(parts.payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: parts.mimeType });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function showFullAttachment({ dataUrl, name, type }) {
    if (!dataUrl) return;
    setFullScreenAttachment({ dataUrl, name: name || 'invoice', type: type || '' });
  }

  function exportInvoicesExcel() {
    const headers = ar
      ? ['رقم الفاتورة', 'المورد', 'التاريخ', 'الحضانة', 'السلفة', 'قبل الضريبة', 'الضريبة', 'الإجمالي', 'طريقة الدفع', 'الحالة', 'الرقم الضريبي', 'اسم المرفق', 'اسم إيصال البطاقة']
      : ['Invoice No.', 'Supplier', 'Date', 'Nursery', 'Advance', 'Before VAT', 'VAT', 'Total', 'Payment', 'Status', 'TRN', 'Attachment', 'Card Receipt'];
    const bodyRows = filtered.map((item) => [
      item.id,
      ar ? item.supplierAr : item.supplierEn,
      item.date,
      ar ? item.nurseryAr : item.nurseryEn,
      ar ? item.advanceAr : item.advanceEn,
      (Number(item.total) - Number(item.vat)).toFixed(2),
      Number(item.vat).toFixed(2),
      Number(item.total).toFixed(2),
      t[item.payment] || item.payment,
      t[item.status] || item.status,
      item.trn || '',
      item.attachmentName || '',
      item.receiptName || '',
    ]);
    const escapeCell = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = `<!doctype html><html><head><meta charset="UTF-8"><style>
      table{border-collapse:collapse;font-family:Arial,sans-serif;direction:${ar ? 'rtl' : 'ltr'}}
      th,td{border:1px solid #b9c8d5;padding:8px;white-space:nowrap}th{background:#dff4f2;font-weight:700}
      td.amount{mso-number-format:'0.00'}
    </style></head><body><table><thead><tr>${headers.map((h) => `<th>${escapeCell(h)}</th>`).join('')}</tr></thead>
      <tbody>${bodyRows.map((row) => `<tr>${row.map((cell, index) => `<td${index >= 5 && index <= 7 ? ' class="amount"' : ''}>${escapeCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></body></html>`;
    downloadBlob(new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `SAAMS_Invoices_${new Date().toISOString().slice(0, 10)}.xls`);
  }

  async function downloadInvoiceAttachments() {
    const attachmentRows = filtered.filter((item) => item.attachmentDataUrl || item.receiptDataUrl);
    if (!attachmentRows.length) {
      window.alert(t.noAttachmentsToDownload);
      return;
    }
    const zip = new JSZip();
    for (const item of attachmentRows) {
      const folder = zip.folder(safeFileName(item.id || 'invoice'));
      if (item.attachmentDataUrl) {
        const parts = dataUrlParts(item.attachmentDataUrl);
        if (parts) {
          const fallbackExt = parts.mimeType === 'application/pdf' ? '.pdf' : parts.mimeType.includes('png') ? '.png' : '.jpg';
          const invoiceName = safeFileName(item.attachmentName || `${item.id}${fallbackExt}`);
          folder.file(invoiceName, parts.payload, { base64: parts.isBase64 });
        }
      }
      if (item.receiptDataUrl) {
        const parts = dataUrlParts(item.receiptDataUrl);
        if (parts) {
          const fallbackExt = parts.mimeType === 'application/pdf' ? '.pdf' : parts.mimeType.includes('png') ? '.png' : '.jpg';
          const receiptName = safeFileName(item.receiptName || `${item.id}_card_receipt${fallbackExt}`);
          folder.file(`Card_Receipt_${receiptName}`, parts.payload, { base64: parts.isBase64 });
        }
      }
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    downloadBlob(blob, `SAAMS_Invoice_Attachments_${new Date().toISOString().slice(0, 10)}.zip`);
  }

  function addSelectedFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const valid = incoming.filter((file) => file.size <= MAX_UPLOAD_BYTES);
    const rejectedCount = incoming.length - valid.length;
    setSelectedFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const unique = valid.filter((file) => !existing.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...unique];
    });
    if (rejectedCount) setOcrError(t.fileTooLarge);
    else setOcrError('');
    setOcr(null);
  }

  function selectQueuedFile(index) {
    setActiveFileIndex(index);
    setOcr(null);
    setOcrError('');
    setManualInvoice(false);
    setReceiptFile(null);
    setDetectedInvoices([]);
    setActiveDetectedIndex(0);
    setPageClassification([]);
  }

  function normalizeDetectedInvoice(item) {
    const proofPages = Array.isArray(item?.payment_proof_pages) && item.payment_proof_pages.length
      ? item.payment_proof_pages
      : (Array.isArray(item?.receipt_pages) ? item.receipt_pages : []);
    const proofTypes = Array.isArray(item?.payment_proof_types) ? item.payment_proof_types : [];
    const normalized = {
      ...emptyOcr,
      ...item,
      linked_receipt_pages: proofPages,
      payment_proof_pages: proofPages,
      payment_proof_types: proofTypes,
      invoice_page: Number(item?.invoice_page) || 1,
      sequence_mark: String(item?.sequence_mark || ''),
      card_receipt_detected: Boolean(item?.card_receipt_detected || proofPages.length),
    };
    const validated = applyValidation(normalized, false, Boolean(proofPages.length));
    const ref = String(normalized.sequence_mark || normalized.invoice_number || normalized.invoice_page || '').trim();
    const missingProof = validated.payment_method === 'card' && !validated.card_receipt_detected;
    return {
      ...validated,
      needs_review: Boolean(item?.needs_review || validated.document_quality === 'needs_review' || !validated.can_save),
      review_message: missingProof
        ? `يرجى إرفاق إثبات الخصم للفاتورة متسلسل ${ref}`
        : String(item?.review_message || ''),
    };
  }

  function chooseDetectedInvoice(index) {
    const item = detectedInvoices[index];
    if (!item) return;
    setActiveDetectedIndex(index);
    setManualInvoice(false);
    setReceiptFile(null);
    setOcr(applyValidation(normalizeDetectedInvoice(item), false, Boolean(item?.receipt_pages?.length)));
    setOcrError('');
  }

  async function analyzeInvoice(fileOverride = null) {
    setOcrError('');
    const targetFile = fileOverride || selectedFile;
    if (!targetFile) {
      setOcrError(t.selectFile);
      return;
    }
    if (targetFile.size > MAX_UPLOAD_BYTES) {
      setOcrError(t.fileTooLarge);
      return;
    }

    setReading(true);
    try {
      const fileData = await fileToDataUrl(targetFile);
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: targetFile.name,
          mimeType: targetFile.type || 'application/octet-stream',
          fileData,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || t.readFailed);
      const found = Array.isArray(payload?.data?.batch_invoices)
        ? payload.data.batch_invoices.map(normalizeDetectedInvoice)
        : [];
      setPageClassification(Array.isArray(payload?.data?.page_classification) ? payload.data.page_classification : []);
      if (found.length) {
        setDetectedInvoices(found);
        setActiveDetectedIndex(0);
        setOcr(applyValidation(found[0], manualInvoice, Boolean(found[0]?.linked_receipt_pages?.length || receiptFile)));
      } else {
        setDetectedInvoices([]);
        setActiveDetectedIndex(0);
        setOcr(applyValidation({ ...emptyOcr, ...payload.data }, manualInvoice, Boolean(receiptFile)));
      }
      console.info('SAAMS OCR request completed:', payload.requestId || '');
    } catch (error) {
      setOcrError(error.message || t.readFailed);
    } finally {
      setReading(false);
    }
  }

  async function handleInvoiceCamera(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setOcrError(t.fileTooLarge);
      return;
    }
    setSelectedFiles((current) => {
      const next = [...current, file];
      setActiveFileIndex(next.length - 1);
      return next;
    });
    setOcr(null);
    setOcrError('');
    setManualInvoice(false);
    setReceiptFile(null);
    setDetectedInvoices([]);
    setActiveDetectedIndex(0);
    setPageClassification([]);
    await analyzeInvoice(file);
  }

  function handleInvoiceFileInput(fileList) {
    addSelectedFiles(fileList);
  }

  function handleReceiptCamera(file) {
    if (!file) return;
    handleReceiptFile(file);
  }

  function applyValidation(next, isManual = manualInvoice, hasSeparateReceipt = Boolean(receiptFile)) {
    const required = [
      ['supplier_name', next.supplier_name],
      ['invoice_number', next.invoice_number],
      ['invoice_date', next.invoice_date],
      ['amount_before_vat', next.amount_before_vat],
      ['vat_amount', next.vat_amount],
      ['total_amount', next.total_amount],
      ...(!isManual ? [['trn', next.trn]] : []),
      ['payment_method', next.payment_method === 'unknown' ? '' : next.payment_method],
    ];
    const missing = required
      .filter(([, item]) => item === '' || item === null || item === undefined)
      .map(([name]) => name);
    const receiptAvailable = Boolean(next.card_receipt_detected || next.linked_receipt_pages?.length || hasSeparateReceipt);
    const cardReceiptMissing = next.payment_method === 'card' && !receiptAvailable;
    const visuallyRejected = next.document_quality === 'rejected';
    return {
      ...next,
      card_receipt_detected: receiptAvailable,
      missing_fields: missing,
      can_save: !visuallyRejected && !cardReceiptMissing && missing.length === 0,
      document_quality: visuallyRejected ? 'rejected' : (!cardReceiptMissing && missing.length === 0 ? 'clear' : 'needs_review'),
    };
  }

  function updateOcr(field, value) {
    setOcr((current) => current ? applyValidation({ ...current, [field]: value }) : current);
  }

  function toggleManualInvoice(checked) {
    setManualInvoice(checked);
    setOcr((current) => current ? applyValidation(current, checked, Boolean(receiptFile)) : current);
  }

  function handleReceiptFile(file) {
    if (!file) return;
    setReceiptFile(file);
    setOcr((current) => current ? applyValidation({ ...current, card_receipt_detected: true }, manualInvoice, true) : current);
  }

  function removeReceiptFile() {
    setReceiptFile(null);
    setOcr((current) => current ? applyValidation({ ...current, card_receipt_detected: false }, manualInvoice, false) : current);
  }

  function removeSelectedFile() {
    setSelectedFiles((current) => current.filter((_, index) => index !== activeFileIndex));
    setActiveFileIndex((current) => Math.max(0, current - (current >= selectedFiles.length - 1 ? 1 : 0)));
    setOcr(null);
    setOcrError('');
    setManualInvoice(false);
    setReceiptFile(null);
    setDetectedInvoices([]);
    setActiveDetectedIndex(0);
    setPageClassification([]);
  }

  function resetUpload() {
    setShowUpload(false);
    setSelectedFiles([]);
    setActiveFileIndex(0);
    setOcr(null);
    setOcrError('');
    setUploadNursery('');
    setUploadAdvance('');
    setManualInvoice(false);
    setReceiptFile(null);
    setDetectedInvoices([]);
    setActiveDetectedIndex(0);
    setPageClassification([]);
  }

  function guessAttachmentType(name = '') {
    const lower = String(name).toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return '';
  }

  async function openSavedInvoice(item) {
    if (!item) return;
    if (item.attachmentDataUrl) {
      showFullAttachment({
        dataUrl: item.attachmentDataUrl,
        name: item.attachmentName || item.id,
        type: item.attachmentType || guessAttachmentType(item.attachmentName),
      });
      return;
    }
    if (item.attachmentPath && databaseMode) {
      try {
        const { data, error } = await supabase.storage
          .from('saams-invoices')
          .createSignedUrl(item.attachmentPath, 60 * 10);
        if (error) throw error;
        if (!data?.signedUrl) throw new Error('SIGNED_URL_MISSING');
        const fileName = item.attachmentPath.split('/').pop() || item.id;
        showFullAttachment({ dataUrl: data.signedUrl, name: fileName, type: guessAttachmentType(fileName) });
        return;
      } catch (error) {
        console.error('Invoice attachment open failed:', error);
        showActionMessage(ar ? 'تعذر فتح مرفق الفاتورة من التخزين. راجعي صلاحيات Storage.' : 'Could not open the invoice attachment from Storage. Review Storage permissions.');
      }
    }
    setSelected(item);
  }

  async function savePreviewInvoice() {
    if (!ocr) return;
    if (!ocr.can_save || ocr.document_quality === 'rejected') {
      setOcrError(t.blockedSave);
      return;
    }
    const nurseryName = isNursery ? accountNursery : (uploadNursery || (ar ? 'غير محددة' : 'Not selected'));
    const attachmentDataUrl = selectedFile ? await fileToDataUrl(selectedFile) : '';
    const linkedReceiptPages = Array.isArray(ocr.linked_receipt_pages) ? ocr.linked_receipt_pages : [];
    const receiptDataUrl = receiptFile ? await fileToDataUrl(receiptFile) : (linkedReceiptPages.length ? attachmentDataUrl : '');
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
      pages: Number(ocr.invoice_page) || 1,
      invoicePage: Number(ocr.invoice_page) || 1,
      receiptPages: linkedReceiptPages,
      trn: ocr.trn || '',
      attachmentDataUrl,
      attachmentName: selectedFile?.name || '',
      attachmentType: selectedFile?.type || '',
      receiptDataUrl,
      receiptName: receiptFile?.name || (linkedReceiptPages.length ? `${selectedFile?.name || 'batch.pdf'} - pages ${linkedReceiptPages.join(', ')}` : ''),
      receiptType: receiptFile?.type || (linkedReceiptPages.length ? selectedFile?.type || 'application/pdf' : ''),
    };
    if (databaseMode) {
      try {
        const nurseryRecord = profile?.nursery_id
          ? { id: profile.nursery_id, name_ar: profile.nursery, name_en: profile.nursery_en }
          : await findNurseryByName(nurseryName);
        if (!nurseryRecord?.id) throw new Error('NURSERY_NOT_FOUND');
        next.nurseryId = nurseryRecord.id;
        next.nurseryAr = nurseryRecord.name_ar || next.nurseryAr;
        next.nurseryEn = nurseryRecord.name_en || next.nurseryEn;
        const chosenAllocation = advanceOptions.find((option) =>
          option.id === uploadAdvance || option.advances?.name_ar === uploadAdvance || option.advances?.code === uploadAdvance
        );
        next.advanceAllocationId = chosenAllocation?.id || null;
        next.ocrPayload = ocr;
        const saved = await createInvoiceDb(next, selectedFile, receiptFile);
        next.dbId = saved.dbId;
        next.attachmentPath = saved.attachmentPath;
        next.receiptPath = saved.receiptPath;
      } catch (error) {
        console.error('Invoice save failed:', error);
        const code = String(error?.code || error?.message || '');
        let messageAr = 'تعذر حفظ الفاتورة في النسخة التشغيلية الجديدة.';
        let messageEn = 'Could not save the invoice in the new production flow.';
        if (code.includes('NO_OPEN_ADVANCE')) {
          messageAr = 'لا توجد سلفة مفتوحة لهذه الحضانة. افتحي السلفة أولًا ثم أعيدي حفظ الفاتورة.';
          messageEn = 'There is no open advance for this nursery. Open an advance first, then save the invoice again.';
        } else if (code.includes('MULTIPLE_OPEN_ADVANCES')) {
          messageAr = 'يوجد أكثر من سلفة مفتوحة لهذه الحضانة. اختاري السلفة المطلوبة قبل حفظ الفاتورة.';
          messageEn = 'More than one advance is open for this nursery. Select the required advance before saving.';
        } else if (code.includes('NURSERY_SCOPE_MISSING') || code.includes('NURSERY_NOT_FOUND')) {
          messageAr = 'تعذر تحديد حضانة الحساب من قاعدة البيانات. سجلي خروجًا ثم دخولًا مرة أخرى، وإذا استمرت الرسالة راجعي ربط المستخدم بالحضانة.';
          messageEn = 'The nursery could not be resolved from the database. Sign out and back in; if it continues, review the user-to-nursery link.';
        } else if (code.includes('AUTH_SESSION_MISSING')) {
          messageAr = 'انتهت جلسة الدخول. سجلي خروجًا ثم دخولًا مرة أخرى قبل حفظ الفاتورة.';
          messageEn = 'Your session has expired. Sign out and back in before saving the invoice.';
        } else if (code.includes('row-level security') || code.includes('42501')) {
          messageAr = 'رفضت قاعدة البيانات الحفظ بسبب صلاحيات الحضانة. يرجى مراجعة سياسات RLS.';
          messageEn = 'The database rejected the save because of nursery access policies. Review RLS policies.';
        } else if (error?.message) {
          const technicalCode = error?.code ? ` [${error.code}]` : '';
          messageAr = `تعذر حفظ الفاتورة: ${error.message}${technicalCode}`;
          messageEn = `Could not save invoice: ${error.message}${technicalCode}`;
        }
        setOcrError(ar ? messageAr : messageEn);
        return;
      }
    }
    setRows((current) => [next, ...current]);
    if (attachmentDataUrl) registerAttachment({entityType:'invoice',entityId:next.id,kind:'invoice',name:next.attachmentName||`${next.id}.pdf`,mime:next.attachmentType,dataUrl:attachmentDataUrl,nursery:next.nurseryAr,supplier:next.supplierAr});
    if (receiptDataUrl) registerAttachment({entityType:'invoice',entityId:next.id,kind:'receipt',name:next.receiptName||`${next.id}_receipt`,mime:next.receiptType,dataUrl:receiptDataUrl,nursery:next.nurseryAr,supplier:next.supplierAr});
    recordAudit({
      profile,
      screen: 'الفواتير',
      action: 'رفع فاتورة',
      actionType: 'create',
      entityType: 'invoice',
      entityId: next.id,
      nursery: next.nurseryAr || profile?.nursery || '',
      details: `${next.supplierAr || next.supplierEn || 'مورد'} — ${Number(next.total || 0).toFixed(2)} AED`,
      after: { status: next.status, total: next.total, supplier: next.supplierAr || next.supplierEn },
    });
    if (detectedInvoices.length > 1) {
      const remainingDetected = detectedInvoices.filter((_, index) => index !== activeDetectedIndex);
      setDetectedInvoices(remainingDetected);
      const nextIndex = Math.min(activeDetectedIndex, remainingDetected.length - 1);
      setActiveDetectedIndex(nextIndex);
      setManualInvoice(false);
      setReceiptFile(null);
      setOcr(applyValidation(remainingDetected[nextIndex], false, Boolean(remainingDetected[nextIndex]?.linked_receipt_pages?.length)));
      setOcrError('');
    } else if (selectedFiles.length > 1) {
      const remaining = selectedFiles.filter((_, index) => index !== activeFileIndex);
      setSelectedFiles(remaining);
      setActiveFileIndex(Math.min(activeFileIndex, Math.max(0, remaining.length - 1)));
      setDetectedInvoices([]);
      setActiveDetectedIndex(0);
      setPageClassification([]);
      setOcr(null);
      setOcrError('');
      setManualInvoice(false);
      setReceiptFile(null);
    } else {
      resetUpload();
    }
  }

  function showActionMessage(message) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(''), 3200);
  }

  async function approveInvoice(invoice) {
    if (!invoice) return;
    if (!window.confirm(t.approveConfirm)) return;
    let approvedAt = new Date().toISOString();
    if (databaseMode) {
      try {
        approvedAt = await updateInvoiceStatus(invoice, 'approved');
      } catch (error) {
        console.error(error);
        showActionMessage(ar ? 'تعذر اعتماد الفاتورة في قاعدة البيانات.' : 'Database approval failed.');
        return;
      }
    }
    setRows((current) => current.map((item) => item.id === invoice.id
      ? { ...item, status: 'approved', approvedAt, returnReason: '' }
      : item));
    setSelected((current) => current?.id === invoice.id
      ? { ...current, status: 'approved', approvedAt, returnReason: '' }
      : current);
    recordAudit({
      profile,
      screen: 'الفواتير',
      action: 'اعتماد فاتورة',
      actionType: 'approve',
      entityType: 'invoice',
      entityId: invoice.id,
      nursery: invoice.nurseryAr || invoice.nurseryEn || '',
      details: `${invoice.supplierAr || invoice.supplierEn || ''} — ${Number(invoice.total || 0).toFixed(2)} AED`,
      before: { status: invoice.status },
      after: { status: 'approved', approvedAt },
    });
    showActionMessage(t.approvedSuccess);
  }

  function openReturnDialog(invoice) {
    if (!invoice) return;
    setReturnTarget(invoice);
    setReturnReason(invoice.returnReason || '');
  }

  async function confirmReturnInvoice() {
    const reason = returnReason.trim();
    if (!reason) {
      window.alert(t.returnReasonRequired);
      return;
    }
    let returnedAt = new Date().toISOString();
    if (databaseMode) {
      try {
        returnedAt = await updateInvoiceStatus(returnTarget, 'returned', reason);
      } catch (error) {
        console.error(error);
        showActionMessage(ar ? 'تعذر إرجاع الفاتورة في قاعدة البيانات.' : 'Database return failed.');
        return;
      }
    }
    setRows((current) => current.map((item) => item.id === returnTarget.id
      ? { ...item, status: 'returned', returnReason: reason, returnedAt }
      : item));
    setSelected((current) => current?.id === returnTarget.id
      ? { ...current, status: 'returned', returnReason: reason, returnedAt }
      : current);
    recordAudit({
      profile,
      screen: 'الفواتير',
      action: 'إرجاع فاتورة',
      actionType: 'return',
      entityType: 'invoice',
      entityId: returnTarget.id,
      nursery: returnTarget.nurseryAr || returnTarget.nurseryEn || '',
      details: returnTarget.supplierAr || returnTarget.supplierEn || '',
      reason,
      before: { status: returnTarget.status },
      after: { status: 'returned', returnedAt },
    });
    setReturnTarget(null);
    setReturnReason('');
    showActionMessage(t.returnedSuccess);
  }

  return (
    <section className="invoice-page">
      {databaseMode&&<div className="database-connected-banner">● {ar?'الفواتير مرتبطة الآن بقاعدة بيانات Supabase والتخزين الآمن.':'Invoices are connected to Supabase database and private storage.'}</div>}
      {dbLoading&&<div className="database-loading-banner">◷ {ar?'جاري تحميل الفواتير من قاعدة البيانات...':'Loading invoices from database...'}</div>}
      {actionMessage && <div className="invoice-action-toast">✓ {actionMessage}</div>}
      <div className="module-heading">
        <div>
          <span className="eyebrow">SAAMS Official 3.2</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="module-actions">
          <button className="secondary-action" type="button" onClick={exportInvoicesExcel}>⇩ {t.export}</button>
          <button className="secondary-action attachments-download-action" type="button" onClick={downloadInvoiceAttachments}>▣ {t.downloadInvoices}</button>
          <button className="primary-action" type="button" onClick={() => setShowUpload(true)}>＋ {t.upload}</button>
        </div>
      </div>

      {detectPotentialDuplicates(rows).length>0&&<button type="button" className="invoice-duplicate-alert" onClick={()=>setSearch('')}>
        <span>⚠</span><div><strong>{ar?'تنبيه: فواتير محتمل تكرارها':'Warning: Potential Duplicate Invoices'}</strong><small>{ar?`تم العثور على ${detectPotentialDuplicates(rows).length} حالة متشابهة في المورد أو المبلغ أو التاريخ.`:`${detectPotentialDuplicates(rows).length} similar case(s) found.`}</small></div>
      </button>}

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
                      <button className="view-invoice-row" type="button" onClick={() => openSavedInvoice(item)}>↗ {t.viewInvoice}</button>
                      {!isNursery && item.status === 'review' && <button className="approve-row" type="button" onClick={() => approveInvoice(item)}>{t.approve}</button>}
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
            <div className="invoice-review-shortcut">
              <div>
                <strong>{ar ? 'مراجعة الفاتورة' : 'Invoice Review'}</strong>
                <small>{ar ? 'افتحي الفاتورة الأصلية بسرعة أثناء المراجعة.' : 'Open the original invoice quickly while reviewing.'}</small>
              </div>
              <button className="quick-invoice-view" type="button" onClick={() => openSavedInvoice(selected)}>↗ {t.viewInvoice}</button>
            </div>
            <div className={`saved-attachment-viewer ${selected.attachmentDataUrl ? 'has-file' : 'no-file'}`}>
              <div className="saved-attachment-head">
                <div><small>{t.originalInvoice}</small><strong>{selected.attachmentName || selected.id}</strong></div>
                {(selected.attachmentDataUrl || selected.attachmentPath) && (
                  <button className="attachment-open-button" type="button" onClick={() => openSavedInvoice(selected)}>↗ {t.openOriginal}</button>
                )}
              </div>
              {selected.attachmentDataUrl ? (
                selected.attachmentType === 'application/pdf' ? (
                  <iframe src={`${selected.attachmentDataUrl}#toolbar=1&navpanes=0&view=FitH`} title={selected.attachmentName || selected.id} />
                ) : (
                  <img src={selected.attachmentDataUrl} alt={selected.attachmentName || selected.id} />
                )
              ) : (
                <div className="saved-attachment-empty">
                  <span>PDF</span>
                  <strong>{t.preview}</strong>
                  <small>{t.noOriginalAttachment}</small>
                </div>
              )}
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
            {selected.payment === 'card' && (
              <>
                <div className="receipt-check">✓ {t.bankReceipt}</div>
                {selected.receiptDataUrl && (
                  <button className="saved-receipt-link" type="button" onClick={() => showFullAttachment({ dataUrl: selected.receiptDataUrl, name: selected.receiptName || `${selected.id}_receipt`, type: selected.receiptType })}>↗ {ar ? 'عرض إثبات الخصم' : 'View Payment Proof'}</button>
                )}
              </>
            )}

            <div className="entity-history">
              <div className="entity-history-head"><strong>{ar?'سجل الفاتورة':'Invoice History'}</strong><small>{ar?'آخر الحركات المسجلة على الفاتورة':'Latest recorded actions'}</small></div>
              <div className="entity-timeline">
                {loadAuditLog().filter(x=>x.entityId===selected.id).slice().reverse().map((x,i)=><div key={x.id}><span>{i+1}</span><div><strong>{x.action}</strong><small>{x.date} · {x.time} · {x.user}</small>{x.reason&&<p>{x.reason}</p>}</div></div>)}
                {!loadAuditLog().some(x=>x.entityId===selected.id)&&<div><span>1</span><div><strong>{ar?'تم رفع الفاتورة':'Invoice Uploaded'}</strong><small>{selected.date}</small></div></div>}
              </div>
            </div>
            {selected.returnReason && <div className="saved-return-reason"><small>{t.currentReturnReason}</small><strong>{selected.returnReason}</strong></div>}
            <div className="drawer-actions">
              {!isNursery && <>
              <button className="return-button" type="button" onClick={() => openReturnDialog(selected)}>↩ {t.return}</button>
              <button className="primary-action" type="button" onClick={() => approveInvoice(selected)} disabled={selected.status === 'approved'}>✓ {t.approve}</button>
              </>}
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
            <p className="batch-upload-hint">{t.batchHint}</p>
            {selectedFiles.length > 0 && (
              <div className="batch-file-queue">
                <div className="batch-queue-title"><strong>{t.selectedInvoices}</strong><span>{activeFileIndex + 1} / {selectedFiles.length}</span></div>
                <div className="batch-queue-items">
                  {selectedFiles.map((file, index) => (
                    <button key={`${file.name}-${file.lastModified}-${index}`} type="button" className={index === activeFileIndex ? 'active' : ''} onClick={() => selectQueuedFile(index)}>
                      <span>{index + 1}</span>
                      <b>{file.name}</b>
                      <small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="upload-form-grid">
              {!isNursery ? <label><span>{t.chooseNursery}</span><select value={uploadNursery} onChange={(e) => setUploadNursery(e.target.value)}><option value="">{t.nursery}</option>{nurseries.map((name) => <option key={name}>{name}</option>)}</select></label> : <label><span>{t.chooseNursery}</span><input value={accountNursery} readOnly /></label>}
              <label><span>{t.chooseAdvance}</span><select value={uploadAdvance} onChange={(e) => setUploadAdvance(e.target.value)}><option value="">{t.advance}</option><option>{ar ? 'فواتير أغسطس 2026' : 'August 2026 Invoices'}</option><option>{ar ? 'سلفة نشاط التخرج 2026' : 'Graduation Advance 2026'}</option></select></label>
            </div>

            <div className={`attachment-workspace ${ocr ? 'with-results' : ''}`}>
              <section
                  className="attachment-preview-panel invoice-drop-zone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addSelectedFiles(event.dataTransfer.files);
                  }}
                >
                <div className="attachment-panel-head">
                  <div><small>{t.attachmentPreview}</small><strong>{selectedFile?.name || t.noAttachment}</strong></div>
                  {selectedFileUrl && <button className="attachment-open-button" type="button" onClick={() => showFullAttachment({ dataUrl: selectedFileUrl, name: selectedFile?.name, type: selectedFile?.type })}>↗ {t.openFull}</button>}
                </div>

                {!selectedFile && (
                  <div className="invoice-source-picker">
                    <input ref={invoiceFileInputRef} className="hidden-file-input" type="file" multiple accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => handleInvoiceFileInput(e.target.files)} />
                    <input ref={invoiceCameraInputRef} className="hidden-file-input" type="file" accept="image/*" capture="environment" onChange={(e) => handleInvoiceCamera(e.target.files?.[0])} />
                    <button type="button" className="invoice-source-card file-source" onClick={() => invoiceFileInputRef.current?.click()}>
                      <span className="source-icon">📁</span>
                      <strong>{t.uploadFromDevice}</strong>
                      <small>{t.uploadFromDeviceHint}</small>
                    </button>
                    <div className="source-divider"><span>{ar ? 'أو' : 'OR'}</span></div>
                    <button type="button" className="invoice-source-card camera-source" onClick={() => invoiceCameraInputRef.current?.click()}>
                      <span className="source-icon">📷</span>
                      <strong>{t.takeInvoicePhoto}</strong>
                      <small>{t.takeInvoicePhotoHint}</small>
                      <em>{t.cameraAutoRead}</em>
                    </button>
                    <p className="source-formats">PDF, JPG, PNG, WEBP — Max 3 MB</p>
                  </div>
                )}

                {selectedFile && (
                  <>
                    <div className="attachment-viewer">
                      {selectedFile.type === 'application/pdf' ? (
                        <iframe src={`${selectedFileUrl}#toolbar=1&navpanes=0&view=FitH`} title={selectedFile.name} />
                      ) : (
                        <img src={selectedFileUrl} alt={selectedFile.name} />
                      )}
                    </div>
                    <div className="attachment-meta">
                      <div><small>{t.fileName}</small><strong>{selectedFile.name}</strong></div>
                      <div><small>{t.fileSize}</small><strong>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</strong></div>
                      <div><small>{t.fileType}</small><strong>{selectedFile.type || '—'}</strong></div>
                    </div>
                    <div className="selected-attachment-actions">
                      <input ref={invoiceCameraInputRef} className="hidden-file-input" type="file" accept="image/*" capture="environment" onChange={(e) => handleInvoiceCamera(e.target.files?.[0])} />
                      <button className="secondary-camera-action" type="button" onClick={() => invoiceCameraInputRef.current?.click()}>📷 {t.takeAnotherPage}</button>
                      <button className="remove-attachment" type="button" onClick={removeSelectedFile}>× {t.removeAttachment}</button>
                    </div>
                  </>
                )}
              </section>

              <section className="attachment-data-panel">
                {!ocr && (
                  <div className="attachment-read-panel">
                    <span className="ai-orb">✦</span>
                    <h3>{t.analyze}</h3>
                    <p>{ar ? 'بعد اختيار المرفق، سيقرأ النظام البيانات ويعرضها هنا بجانب الفاتورة للمراجعة.' : 'After choosing an attachment, the system will extract and display its data here beside the invoice.'}</p>
                    {ocrError && <div className="ocr-error">! {ocrError}</div>}
                    <button className="primary-action upload-save" type="button" disabled={reading || !selectedFile} onClick={() => analyzeInvoice()}>{reading ? `◌ ${t.analyzing}` : `✦ ${t.analyze}`}</button>
                  </div>
                )}

                {ocr && (
                  <div className="ocr-results embedded-results">
                    {detectedInvoices.length > 0 && (
                      <div className="detected-invoice-queue batch-review-card">
                        <div className="detected-queue-head"><strong>{t.detectedInvoices}</strong><span>{detectedInvoices.length} {ar ? 'فاتورة' : 'invoice(s)'}</span></div>
                        <div className="batch-review-table-wrap">
                          <table className="batch-review-table">
                            <thead><tr>
                              <th>{t.sequence}</th><th>{t.detectedPages}</th><th>{t.invoiceNo}</th><th>{t.supplier}</th><th>{t.totalAmount}</th><th>{t.payment}</th><th>{t.proof}</th><th>{t.reviewStatus}</th><th>{t.actions}</th>
                            </tr></thead>
                            <tbody>
                              {detectedInvoices.map((item, index) => {
                                const proofPages = item.payment_proof_pages || item.linked_receipt_pages || [];
                                const proofTypes = item.payment_proof_types || [];
                                const proofLabel = proofPages.length
                                  ? `${proofPages.join(', ')}${proofTypes.length ? ` • ${proofTypes.map((kind) => kind === 'card_receipt' ? t.pageTypeReceipt : kind === 'bank_message' ? t.pageTypeBankMessage : t.pageTypeBankApp).join(' / ')}` : ''}`
                                  : t.missingProof;
                                const needsReview = item.needs_review || item.document_quality === 'needs_review' || !item.can_save;
                                return <tr key={`${item.invoice_page}-${item.invoice_number}-${index}`} className={index === activeDetectedIndex ? 'active' : ''}>
                                  <td><strong>{item.sequence_mark || '—'}</strong></td>
                                  <td>ص{item.invoice_page}</td>
                                  <td><strong>{item.invoice_number || '—'}</strong></td>
                                  <td>{item.supplier_name || '—'}</td>
                                  <td>{Number(item.total_amount || 0).toFixed(2)} AED</td>
                                  <td>{item.payment_method === 'card' ? t.card : item.payment_method === 'cash' ? t.cash : t.unknown}</td>
                                  <td><span className={`batch-proof ${proofPages.length ? 'ok' : 'missing'}`}>{proofLabel}</span></td>
                                  <td><span className={`batch-review-status ${item.document_quality === 'rejected' ? 'rejected' : needsReview ? 'review' : 'ready'}`}>{item.document_quality === 'rejected' ? t.rejected : needsReview ? t.needs_review : t.ready}</span>{item.review_message && <small className="batch-review-message">{item.review_message}</small>}</td>
                                  <td><button type="button" className="batch-review-select" onClick={() => chooseDetectedInvoice(index)}>{t.select}</button></td>
                                </tr>;
                              })}
                            </tbody>
                          </table>
                        </div>
                        {detectedInvoices.some((item) => item.payment_method === 'card' && !(item.payment_proof_pages?.length || item.linked_receipt_pages?.length)) && (
                          <div className="batch-missing-proof-summary">
                            <strong>! {ar ? 'إثباتات خصم ناقصة' : 'Missing payment proof'}</strong>
                            {detectedInvoices.filter((item) => item.payment_method === 'card' && !(item.payment_proof_pages?.length || item.linked_receipt_pages?.length)).map((item, index) => <span key={`${item.invoice_page}-${index}`}>{item.review_message || (ar ? `يرجى إرفاق إثبات الخصم للفاتورة متسلسل ${item.sequence_mark || item.invoice_number || item.invoice_page}` : `Please attach payment proof for invoice ${item.sequence_mark || item.invoice_number || item.invoice_page}`)}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                    {!!pageClassification.length && (
                      <div className="page-classification-strip">
                        {pageClassification.map((page) => <span key={page.page_number} className={page.document_type}>ص{page.page_number}: {page.document_type === 'invoice' ? t.pageTypeInvoice : page.document_type === 'card_receipt' ? t.pageTypeReceipt : page.document_type === 'bank_message' ? t.pageTypeBankMessage : page.document_type === 'bank_app_proof' ? t.pageTypeBankApp : page.document_type === 'order_summary' ? t.pageTypeOrderSummary : t.pageTypeOther}</span>)}
                      </div>
                    )}
                    <div className="ocr-results-head">
                      <div><small>AI OCR</small><h3>{t.extracted}</h3></div>
                      <span className={`quality-pill ${ocr.document_quality}`}>{t[ocr.document_quality] || ocr.document_quality}</span>
                    </div>
                    <div className="ocr-confidence"><span>{t.confidence}</span><div><i style={{ width: `${Math.round((Number(ocr.confidence) || 0) * 100)}%` }} /></div><b>{Math.round((Number(ocr.confidence) || 0) * 100)}%</b></div>
                    {ocr.document_quality === 'rejected' && (
                      <div className="ocr-blocked-banner">
                        <strong>✕ {t.uploadRejected}</strong>
                        <span>{t.blockedSave}</span>
                      </div>
                    )}
                    {ocr.document_quality === 'needs_review' && (
                      <div className="ocr-review-banner">
                        <strong>! {t.needs_review}</strong>
                        <span>{t.reviewNeeded}</span>
                      </div>
                    )}
                    <label className="manual-invoice-option">
                      <input type="checkbox" checked={manualInvoice} onChange={(e) => toggleManualInvoice(e.target.checked)} />
                      <span><strong>{t.manualInvoice}</strong><small>{t.manualInvoiceHint}</small></span>
                    </label>
                    <div className={`ocr-form-grid ${ocr.document_quality === 'rejected' ? 'ocr-form-blocked' : ''}`}>
                      <label><span>{t.supplier}</span><input value={ocr.supplier_name} onChange={(e) => updateOcr('supplier_name', e.target.value)} /></label>
                      <label><span>{t.invoiceNo}</span><input value={ocr.invoice_number} onChange={(e) => updateOcr('invoice_number', e.target.value)} /></label>
                      <label><span>{t.invoiceDate}</span><input value={ocr.invoice_date} onChange={(e) => updateOcr('invoice_date', e.target.value)} /></label>
                      <label><span>{t.trn}{manualInvoice ? ` (${ar ? 'اختياري' : 'Optional'})` : ''}</span><input value={ocr.trn} onChange={(e) => updateOcr('trn', e.target.value)} /></label>
                      <label><span>{t.beforeVat}</span><input type="number" step="0.01" value={ocr.amount_before_vat} onChange={(e) => updateOcr('amount_before_vat', e.target.value)} /></label>
                      <label><span>{t.vat}</span><input type="number" step="0.01" value={ocr.vat_amount} onChange={(e) => updateOcr('vat_amount', e.target.value)} /></label>
                      <label><span>{t.totalAmount}</span><input type="number" step="0.01" value={ocr.total_amount} onChange={(e) => updateOcr('total_amount', e.target.value)} /></label>
                      <label><span>{t.payment}</span><select value={ocr.payment_method} onChange={(e) => updateOcr('payment_method', e.target.value)}><option value="unknown">{t.unknown}</option><option value="card">{t.card}</option><option value="cash">{t.cash}</option></select></label>
                    </div>
                    {ocr.payment_method === 'card' && (
                      <div className="receipt-upload-card">
                        <div className="receipt-upload-head">
                          <div>
                            <strong>{t.receiptAttachment}</strong>
                            <small>{t.receiptHint}</small>
                            <div className="accepted-payment-proof-types">
                              <span>✓ {ar ? 'إيصال الخصم' : 'Debit / card receipt'}</span>
                              <span>✓ {ar ? 'رسالة الخصم من البنك' : 'Bank debit message / SMS'}</span>
                              <span>✓ {ar ? 'لقطة شاشة من تطبيق البنك' : 'Banking app debit screenshot'}</span>
                            </div>
                          </div>
                          {!receiptFile && <div className="receipt-source-actions">
                            <input ref={receiptFileInputRef} className="hidden-file-input" type="file" accept=".pdf,image/*" onChange={(e) => handleReceiptFile(e.target.files?.[0])} />
                            <input ref={receiptCameraInputRef} className="hidden-file-input" type="file" accept="image/*" capture="environment" onChange={(e) => handleReceiptCamera(e.target.files?.[0])} />
                            <button type="button" className="receipt-file-button" onClick={() => receiptFileInputRef.current?.click()}>📁 {t.uploadReceipt}</button>
                            <button type="button" className="receipt-camera-button" onClick={() => receiptCameraInputRef.current?.click()}>📷 {t.photographReceipt}</button>
                          </div>}
                        </div>
                        {receiptFile && (
                          <div className="receipt-file-preview">
                            <div className="receipt-thumb">
                              {receiptFile.type?.startsWith('image/') ? <img src={receiptFileUrl} alt="receipt" /> : <span>PDF</span>}
                            </div>
                            <div><strong>{receiptFile.name}</strong><small>{(receiptFile.size / (1024 * 1024)).toFixed(2)} MB</small></div>
                            <button type="button" onClick={removeReceiptFile}>× {t.removeReceipt}</button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`receipt-check ${ocr.payment_method === 'card' && !ocr.card_receipt_detected ? 'receipt-warning' : ''}`}>{ocr.card_receipt_detected ? '✓' : '!'} {ocr.card_receipt_detected ? (ocr.linked_receipt_pages?.length ? `${t.receiptAttached} (${t.linkedReceiptPages}: ${ocr.linked_receipt_pages.join(', ')})` : (receiptFile ? t.receiptAttached : t.receiptFound)) : t.receiptMissing}</div>
                    {!!ocr.rejection_reasons?.length && <div className="ocr-reasons">{ocr.rejection_reasons.map((reason) => <span key={reason}>! {reason}</span>)}</div>}
                    {ocrError && <div className="ocr-error">! {ocrError}</div>}
                    <div className="ocr-actions">
                      <button className="secondary-action" type="button" onClick={() => analyzeInvoice()}>↻ {t.analyze}</button>
                      <button className="primary-action" type="button" disabled={!ocr.can_save} onClick={savePreviewInvoice}>✓ {t.savePreview}</button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {!isNursery && returnTarget && (
        <div className="return-invoice-overlay" onClick={() => setReturnTarget(null)}>
          <div className="return-invoice-modal" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div><small>{returnTarget.id}</small><h2>{t.returnTitle}</h2></div>
              <button type="button" onClick={() => setReturnTarget(null)}>×</button>
            </div>
            <p>{t.returnInstruction}</p>
            <textarea
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              placeholder={t.returnPlaceholder}
              rows={6}
              autoFocus
            />
            <div className="return-modal-actions">
              <button className="secondary-action" type="button" onClick={() => setReturnTarget(null)}>{t.cancel}</button>
              <button className="return-button" type="button" onClick={confirmReturnInvoice}>↩ {t.confirmReturn}</button>
            </div>
          </div>
        </div>
      )}

      {fullScreenAttachment && (
        <div className="full-attachment-overlay" onClick={() => setFullScreenAttachment(null)}>
          <div className="full-attachment-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><small>{t.originalFullScreen}</small><strong>{fullScreenAttachment.name}</strong></div>
              <div className="full-attachment-actions">
                <button type="button" onClick={() => {
                  const blob = fullScreenAttachment.dataUrl.startsWith('blob:')
                    ? null
                    : dataUrlToBlob(fullScreenAttachment.dataUrl);
                  if (blob) downloadBlob(blob, safeFileName(fullScreenAttachment.name));
                  else {
                    const anchor = document.createElement('a');
                    anchor.href = fullScreenAttachment.dataUrl;
                    anchor.download = safeFileName(fullScreenAttachment.name);
                    anchor.click();
                  }
                }}>⇩ {t.downloadFile}</button>
                <button className="full-attachment-close" type="button" onClick={() => setFullScreenAttachment(null)}>×</button>
              </div>
            </header>
            <div className="full-attachment-content">
              {(fullScreenAttachment.type === 'application/pdf' || fullScreenAttachment.name?.toLowerCase().endsWith('.pdf')) ? (
                <iframe src={`${fullScreenAttachment.dataUrl}#toolbar=1&navpanes=1&view=FitH`} title={fullScreenAttachment.name} />
              ) : (
                <img src={fullScreenAttachment.dataUrl} alt={fullScreenAttachment.name} />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
