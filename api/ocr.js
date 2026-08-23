export const config = {
  maxDuration: 60,
};

// Vercel Functions accept at most 4.5 MB per request. Base64 increases the
// original file size by roughly one third, so the browser is limited to 3 MB.
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const invoiceItemSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    invoice_page: { type: 'integer', minimum: 1 },
    sequence_mark: { type: 'string' },
    receipt_pages: { type: 'array', items: { type: 'integer', minimum: 1 } },
    payment_proof_pages: { type: 'array', items: { type: 'integer', minimum: 1 } },
    payment_proof_types: { type: 'array', items: { type: 'string', enum: ['card_receipt','bank_message','bank_app_proof'] } },
    supplier_name: { type: 'string' },
    invoice_number: { type: 'string' },
    invoice_date: { type: 'string' },
    amount_before_vat: { type: ['number', 'null'] },
    vat_amount: { type: ['number', 'null'] },
    total_amount: { type: ['number', 'null'] },
    trn: { type: 'string' },
    payment_method: { type: 'string', enum: ['card', 'cash', 'unknown'] },
    card_receipt_detected: { type: 'boolean' },
    currency: { type: 'string' },
    document_quality: { type: 'string', enum: ['clear', 'needs_review', 'rejected'] },
    rejection_reasons: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    needs_review: { type: 'boolean' },
    review_message: { type: 'string' },
    can_save: { type: 'boolean' },
  },
  required: [
    'invoice_page','sequence_mark','receipt_pages','payment_proof_pages','payment_proof_types','supplier_name','invoice_number','invoice_date',
    'amount_before_vat','vat_amount','total_amount','trn','payment_method',
    'card_receipt_detected','currency','document_quality','rejection_reasons','confidence','needs_review','review_message','can_save'
  ],
};

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    supplier_name: { type: 'string' },
    invoice_number: { type: 'string' },
    invoice_date: { type: 'string' },
    amount_before_vat: { type: ['number', 'null'] },
    vat_amount: { type: ['number', 'null'] },
    total_amount: { type: ['number', 'null'] },
    trn: { type: 'string' },
    payment_method: { type: 'string', enum: ['card', 'cash', 'unknown'] },
    card_receipt_detected: { type: 'boolean' },
    bank_receipt_over_invoice: { type: 'boolean' },
    multiple_documents_same_page: { type: 'boolean' },
    invoice_cropped: { type: 'boolean' },
    important_fields_obscured: { type: 'boolean' },
    can_save: { type: 'boolean' },
    currency: { type: 'string' },
    document_quality: { type: 'string', enum: ['clear', 'needs_review', 'rejected'] },
    rejection_reasons: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    page_classification: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          page_number: { type: 'integer', minimum: 1 },
          document_type: { type: 'string', enum: ['invoice', 'card_receipt', 'bank_message', 'bank_app_proof', 'order_summary', 'other'] },
          linked_invoice_page: { type: ['integer', 'null'], minimum: 1 },
          sequence_mark: { type: 'string' },
          supplier_hint: { type: 'string' },
          invoice_number_hint: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['page_number','document_type','linked_invoice_page','sequence_mark','supplier_hint','invoice_number_hint','reason'],
      },
    },
    batch_invoices: { type: 'array', items: invoiceItemSchema },
  },
  required: [
    'supplier_name','invoice_number','invoice_date','amount_before_vat','vat_amount',
    'total_amount','trn','payment_method','card_receipt_detected',
    'bank_receipt_over_invoice','multiple_documents_same_page','invoice_cropped',
    'important_fields_obscured','can_save','currency','document_quality',
    'rejection_reasons','confidence','page_classification','batch_invoices'
  ],
};

function getBase64Part(dataUrl) {
  const value = String(dataUrl || '');
  const commaIndex = value.indexOf(',');
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

function estimateBase64Bytes(base64) {
  const cleaned = String(base64 || '').replace(/\s/g, '');
  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((cleaned.length * 3) / 4) - padding);
}

function estimatePdfPageCount(buffer) {
  try {
    const text = buffer.toString('latin1');
    const matches = text.match(/\/Type\s*\/Page(?!s)\b/g);
    return Math.max(0, matches ? matches.length : 0);
  } catch {
    return 0;
  }
}

function uniqueSortedPages(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a,b)=>a-b);
}


function completenessScore(item = {}) {
  const fields = ['supplier_name','invoice_number','invoice_date','amount_before_vat','vat_amount','total_amount','trn'];
  return fields.reduce((score, key) => score + (item[key] !== '' && item[key] !== null && item[key] !== undefined ? 1 : 0), 0) + Number(item.confidence || 0);
}

function blankInvoiceForPage(page) {
  const seq = String(page?.sequence_mark || '').trim();
  const invNo = String(page?.invoice_number_hint || '').trim();
  return {
    invoice_page: Number(page?.page_number) || 1,
    invoice_pages: [Number(page?.page_number) || 1],
    sequence_mark: seq,
    receipt_pages: [],
    payment_proof_pages: [],
    payment_proof_types: [],
    supplier_name: String(page?.supplier_hint || ''),
    invoice_number: invNo,
    invoice_date: '',
    amount_before_vat: null,
    vat_amount: null,
    total_amount: null,
    trn: '',
    payment_method: 'unknown',
    card_receipt_detected: false,
    currency: 'AED',
    document_quality: 'needs_review',
    rejection_reasons: [],
    confidence: 0,
    needs_review: true,
    review_message: `تعذر قراءة بيانات كاملة من صفحة الفاتورة ${Number(page?.page_number) || 1}. يرجى مراجعتها يدويًا.`,
    can_save: false,
  };
}

function repairBatchInvoices(data = {}, expectedPageCount = 0) {
  const classifications = Array.isArray(data.page_classification) ? data.page_classification : [];
  const rows = Array.isArray(data.batch_invoices) ? data.batch_invoices.map((item) => ({
    ...item,
    invoice_pages: uniqueSortedPages(item.invoice_pages?.length ? item.invoice_pages : [item.invoice_page]),
    payment_proof_pages: uniqueSortedPages(item.payment_proof_pages || item.receipt_pages || []),
    receipt_pages: uniqueSortedPages(item.receipt_pages || item.payment_proof_pages || []),
  })) : [];

  // Merge logical rows by a non-empty sequence mark first. This is deterministic and prevents
  // a two-page invoice from appearing as a complete row plus a second blank/weak row.
  const grouped = new Map();
  const noSeq = [];
  for (const row of rows) {
    const seq = String(row.sequence_mark || '').trim();
    if (!seq) { noSeq.push(row); continue; }
    if (!grouped.has(seq)) grouped.set(seq, []);
    grouped.get(seq).push(row);
  }
  const merged = [];
  for (const [seq, group] of grouped) {
    const best = [...group].sort((a,b)=>completenessScore(b)-completenessScore(a))[0];
    const pages = uniqueSortedPages(group.flatMap((x)=>x.invoice_pages || [x.invoice_page]));
    const proofs = uniqueSortedPages(group.flatMap((x)=>x.payment_proof_pages || x.receipt_pages || []));
    const proofTypes = [...new Set(group.flatMap((x)=>Array.isArray(x.payment_proof_types)?x.payment_proof_types:[]))];
    const conflicts = ['supplier_name','invoice_number','invoice_date','total_amount'].some((key) => {
      const values = [...new Set(group.map((x)=>String(x[key] ?? '').trim()).filter(Boolean))];
      return values.length > 1;
    });
    merged.push({
      ...best,
      sequence_mark: seq,
      invoice_page: Number(best.invoice_page) || pages[0] || 1,
      invoice_pages: pages,
      payment_proof_pages: proofs,
      receipt_pages: proofs,
      payment_proof_types: proofTypes,
      card_receipt_detected: Boolean(proofs.length),
      needs_review: Boolean(best.needs_review || conflicts),
      review_message: conflicts ? `توجد بيانات متعارضة بين صفحات الفاتورة متسلسل ${seq}. يرجى مراجعتها.` : String(best.review_message || ''),
      can_save: Boolean(best.can_save && !conflicts),
    });
  }
  merged.push(...noSeq);

  // Use page-level sequence hints to attach invoice pages that the model returned as a separate
  // weak row or omitted from batch_invoices.
  const seqMap = new Map(merged.filter((r)=>String(r.sequence_mark||'').trim()).map((r)=>[String(r.sequence_mark).trim(), r]));
  const covered = new Set(merged.flatMap((r)=>r.invoice_pages || [r.invoice_page]).map(Number));
  for (const page of classifications.filter((p)=>p.document_type === 'invoice')) {
    const pn = Number(page.page_number);
    const seq = String(page.sequence_mark || '').trim();
    if (seq && seqMap.has(seq)) {
      const target = seqMap.get(seq);
      target.invoice_pages = uniqueSortedPages([...(target.invoice_pages || [target.invoice_page]), pn]);
      covered.add(pn);
      continue;
    }
    if (!covered.has(pn)) {
      const fallback = blankInvoiceForPage(page);
      merged.push(fallback);
      if (seq) seqMap.set(seq, fallback);
      covered.add(pn);
    }
  }

  // Guarantee physical page accounting. If the model classification itself skipped a page,
  // append a neutral classification record so the UI can show that nothing disappeared silently.
  if (expectedPageCount > 0) {
    const byPage = new Map(classifications.map((p)=>[Number(p.page_number), p]));
    const repairedClass = [];
    for (let pn=1; pn<=expectedPageCount; pn+=1) {
      repairedClass.push(byPage.get(pn) || {
        page_number: pn,
        document_type: 'other',
        linked_invoice_page: null,
        sequence_mark: '',
        supplier_hint: '',
        invoice_number_hint: '',
        reason: 'لم يتم تصنيف الصفحة آليًا؛ يرجى مراجعتها.',
      });
    }
    data.page_classification = repairedClass;
  }
  data.batch_invoices = merged.sort((a,b)=>(Math.min(...(a.invoice_pages || [a.invoice_page])))-(Math.min(...(b.invoice_pages || [b.invoice_page]))));
  return data;
}

function extractOutputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;

  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  return '';
}

function sendError(res, status, message, code = 'OCR_ERROR') {
  return res.status(status).json({ error: message, code });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed.', 'METHOD_NOT_ALLOWED');
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendError(
      res,
      500,
      'OPENAI_API_KEY is not configured in Vercel.',
      'MISSING_API_KEY',
    );
  }

  const { filename, mimeType, fileData } = req.body || {};
  if (!filename || !fileData) {
    return sendError(res, 400, 'Missing invoice file.', 'MISSING_FILE');
  }

  const normalizedMimeType = String(mimeType || '').toLowerCase();
  const isPdf =
    normalizedMimeType === 'application/pdf' ||
    String(filename).toLowerCase().endsWith('.pdf');
  const effectiveMimeType = isPdf ? 'application/pdf' : normalizedMimeType;

  if (!ALLOWED_MIME_TYPES.has(effectiveMimeType)) {
    return sendError(
      res,
      415,
      'Unsupported file type. Upload PDF, JPG, PNG, or WEBP.',
      'UNSUPPORTED_FILE_TYPE',
    );
  }

  const base64Data = getBase64Part(fileData);
  if (estimateBase64Bytes(base64Data) > MAX_FILE_BYTES) {
    return sendError(
      res,
      413,
      'File exceeds the 3 MB limit for this preview.',
      'FILE_TOO_LARGE',
    );
  }

  // Images can be sent as data URLs. PDFs are uploaded first to the OpenAI
  // Files API and then referenced by file_id. This is more reliable than
  // embedding a large PDF directly in input_file.file_data.
  let uploadedFileId = '';
  let expectedPageCount = 0;
  let fileInput = isPdf
    ? null
    : {
        type: 'input_image',
        image_url: String(fileData),
        detail: 'high',
      };

  const prompt = `You are a UAE nursery multi-document invoice separation, validation, pairing, and extraction engine.

A PDF can contain a deliberately arranged packet of MANY documents: supplier invoices, POS/card receipts, bank debit SMS/messages, screenshots/details from a banking app, online order summaries, and unrelated pages. Read the ENTIRE PDF and build a review table. NEVER treat the whole PDF as one invoice.

STEP 1 — CLASSIFY EVERY PAGE independently:
- The PDF page count supplied by the server is EXPECTED_PAGE_COUNT. page_classification MUST contain exactly one record for every physical PDF page from 1 through EXPECTED_PAGE_COUNT, in order, with no skipped page numbers and no duplicates.
- If a page visually looks like any supplier invoice/receipt with invoice/tax invoice/bill fields, classify it as invoice even when it resembles another invoice from the same supplier. NEVER deduplicate invoice pages.
- invoice: tax invoice, supplier invoice, handwritten/manual invoice, cash invoice.
- card_receipt: POS/network/Visa/Mastercard/debit/credit terminal receipt.
- bank_message: SMS/text/bank notification showing a debit/card purchase, merchant and amount.
- bank_app_proof: transaction details or debit transaction screenshot from a banking app.
- order_summary: online order summary / purchase summary that is not itself a tax invoice. HOWEVER, if it has a sequence mark, merchant, total and payment method and there is no separate invoice for the same sequence, keep it as a purchase-document candidate for review instead of dropping it.
- other: cover sheet or unrelated page.
Return page_classification for EVERY page.

STEP 2 — READ THE HANDWRITTEN SEQUENCE MARK:
- Many packets have a handwritten/circled sequence number such as 55, 56, 57, 58, 59, 60.
- For each invoice, return sequence_mark exactly as visible. If none is visible, return an empty string.
- Use the same sequence mark as a strong pairing signal when linking proofs to invoices.

STEP 3 — PAIR PAYMENT PROOF TO INVOICES:
Accepted payment proof for CARD invoices can be ANY ONE of:
1) card_receipt,
2) bank_message,
3) bank_app_proof.
- Pair using sequence_mark first when available, then page adjacency in BOTH directions, amount, date, supplier/merchant and card details.
- A proof page can be immediately BEFORE or AFTER its invoice. Search both neighboring directions before deciding proof is missing. Sequence/amount/date can override adjacency.
- Do not pair a bank message to the wrong invoice only because it is nearby.
- order_summary is NOT payment proof by itself.
- Cash invoices normally need no payment proof.
- Keep receipt_pages for backward compatibility, but put ALL accepted proof pages in payment_proof_pages and their types in payment_proof_types.

STEP 4 — CREATE batch_invoices FROM LOGICAL INVOICES:
First identify every physical invoice page, but remember that ONE logical invoice can span more than one physical page. Handwritten/circled sequence_mark is the strongest grouping key. Pages carrying the SAME non-empty sequence_mark normally belong to the SAME logical invoice packet, even if one page is a printed tax invoice and another page is a manual/duplicate invoice copy from the same supplier.
- Return one batch_invoices row per LOGICAL invoice, not per physical invoice page.
- invoice_page is the primary/best invoice page for extraction.
- Do not merge pages with different non-empty sequence_mark values.
- If sequence_mark is missing, only group pages when they clearly say Page 1/2, Page 2/2, continuation, or share the same invoice number and are visibly continuations.
- A card/POS receipt, bank message, or bank app screenshot is payment proof, never an extra invoice row.
- When multiple invoice pages belong to the same logical invoice, extract the authoritative values from the clearest/most complete tax-invoice page in that group. Do not combine fields from unrelated logical invoices.
- If grouped pages disagree materially on supplier, total amount, or date, keep the group but set needs_review=true and explain the conflict.
Never omit a logical invoice because OCR is weak. A weak/uncertain logical invoice must still get a row with needs_review=true.
For every invoice calculate:
- needs_review: true if any mandatory field is missing/uncertain, image quality is weak, payment method is unknown, or card payment lacks accepted payment proof.
- review_message: short Arabic message explaining exactly what needs attention. For a card invoice with no proof use exactly: "يرجى إرفاق إثبات الخصم للفاتورة متسلسل X" where X is sequence_mark; if sequence_mark is empty use the invoice number instead.
- can_save: false for visually rejected invoices or card invoices missing payment proof or invoices missing required fields; otherwise true.

VISUAL REJECTION RULES APPLY PER PAGE, NOT TO THE WHOLE PDF:
- Reject only if another paper physically overlaps/covers the invoice page, multiple unrelated documents are visible on the SAME page, invoice is cropped/blurred, or important fields are obscured.
- A separate proof on another PDF page is correct and must be linked, not rejected.
- Missing TRN/payment method means needs_review, not visual rejection.

EXTRACTION:
- invoice_number comes from the SAME invoice page only, never from POS receipt/reference and never from a different invoice page.
- Some UAE retail invoices print the invoice number as a long numeric barcode value directly UNDER a barcode, sometimes without the words Invoice No. If no explicit Invoice No/Bill No/Receipt No is present, treat the long numeric string printed immediately under the invoice barcode as a strong invoice_number candidate. Do NOT use card/POS authorization, merchant ID, terminal ID, TRN, or approval code as invoice_number.
- amount_before_vat, vat_amount and total_amount must all come from the SAME invoice page as invoice_number. Do not mix fields across pages.
- invoice_date DD/MM/YYYY when readable.
- UAE TRN normally 15 digits.
- Numeric amounts only.
- payment_method=card when invoice prints card/CC/Visa/Mastercard or a linked accepted proof confirms it; cash only when invoice clearly says cash; otherwise unknown.
- card_receipt_detected=true when payment_proof_pages is not empty (legacy name; it means accepted payment proof detected).
- confidence 0..1.

TOP-LEVEL FIELDS:
Copy the FIRST invoice in batch_invoices into top-level invoice fields for backward compatibility. If no invoice exists, return empty/null fields and rejected.

Return only the requested structured result.`

  try {
    if (isPdf) {
      const pdfBytes = Buffer.from(base64Data, 'base64');
      expectedPageCount = estimatePdfPageCount(pdfBytes);
      const uploadForm = new FormData();
      uploadForm.append('purpose', 'user_data');
      uploadForm.append(
        'file',
        new Blob([pdfBytes], { type: 'application/pdf' }),
        String(filename),
      );

      const uploadResponse = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: uploadForm,
      });

      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadPayload?.id) {
        const uploadMessage = uploadPayload?.error?.message || 'OpenAI PDF upload failed.';
        return sendError(
          res,
          uploadResponse.status || 502,
          uploadMessage,
          'OPENAI_FILE_UPLOAD_FAILED',
        );
      }

      uploadedFileId = uploadPayload.id;
      fileInput = {
        type: 'input_file',
        file_id: uploadedFileId,
      };
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_OCR_MODEL || 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt.replace('EXPECTED_PAGE_COUNT', String(expectedPageCount || 'all physical PDF pages')) },
              fileInput,
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'invoice_extraction',
            strict: true,
            schema,
          },
        },
      }),
    });

    const payload = await openaiResponse.json().catch(() => ({}));
    if (!openaiResponse.ok) {
      const upstreamMessage = payload?.error?.message || 'OpenAI request failed.';
      return sendError(res, openaiResponse.status, upstreamMessage, 'OPENAI_REQUEST_FAILED');
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return sendError(
        res,
        502,
        'No structured OCR result was returned.',
        'EMPTY_MODEL_RESPONSE',
      );
    }

    let extracted;
    try {
      extracted = JSON.parse(outputText);
    } catch {
      return sendError(
        res,
        502,
        'The OCR result could not be parsed.',
        'INVALID_MODEL_RESPONSE',
      );
    }

    const rawClassification = Array.isArray(extracted.page_classification) ? extracted.page_classification : [];
    const byPage = new Map();
    for (const page of rawClassification) {
      const n = Number(page?.page_number);
      if (!Number.isInteger(n) || n < 1) continue;
      if (!byPage.has(n)) byPage.set(n, page);
    }
    if (expectedPageCount > 0) {
      for (let n = 1; n <= expectedPageCount; n += 1) {
        if (!byPage.has(n)) {
          byPage.set(n, { page_number:n, document_type:'other', linked_invoice_page:null, sequence_mark:'', supplier_hint:'', invoice_number_hint:'', reason:'لم يتم تصنيف هذه الصفحة آليًا؛ تحتاج مراجعة يدوية.' });
        }
      }
    }
    extracted.page_classification = [...byPage.values()].sort((a,b)=>Number(a.page_number)-Number(b.page_number));

    const rawBatchInvoices = Array.isArray(extracted.batch_invoices) ? extracted.batch_invoices : [];
    const invoiceRowByPage = new Map();
    for (const row of rawBatchInvoices) {
      const rowPages = uniqueSortedPages(Array.isArray(row?.invoice_pages) && row.invoice_pages.length ? row.invoice_pages : [row?.invoice_page]);
      for (const n of rowPages) {
        if (!invoiceRowByPage.has(n)) invoiceRowByPage.set(n, row);
      }
    }
    const classifiedInvoicePages = uniqueSortedPages(extracted.page_classification.filter((p)=>p.document_type === 'invoice').map((p)=>p.page_number));
    const physicalInvoiceRows = classifiedInvoicePages.map((pageNo) => {
      const existing = invoiceRowByPage.get(pageNo);
      if (existing) return { ...existing, invoice_page: pageNo };
      const pageHint = extracted.page_classification.find((p)=>Number(p.page_number)===Number(pageNo)) || {};
      return {
        invoice_page: pageNo,
        sequence_mark:String(pageHint.sequence_mark || ''),
        receipt_pages:[], payment_proof_pages:[], payment_proof_types:[],
        supplier_name:String(pageHint.supplier_hint || ''),
        invoice_number:String(pageHint.invoice_number_hint || ''),
        invoice_date:'', amount_before_vat:null, vat_amount:null, total_amount:null, trn:'',
        payment_method:'unknown', card_receipt_detected:false, currency:'AED', document_quality:'needs_review',
        rejection_reasons:[], confidence:0, needs_review:true,
        review_message:`صفحة الفاتورة ${pageNo} تم اكتشافها لكن تعذر استخراج بياناتها بشكل موثوق. راجعيها يدويًا.`, can_save:false
      };
    });

    const normalizedSequence = (value) => String(value || '').trim().replace(/[^0-9A-Za-z_-]/g, '').toLowerCase();
    const groups = [];
    const groupBySequence = new Map();
    for (const row of physicalInvoiceRows) {
      const seq = normalizedSequence(row.sequence_mark);
      if (seq) {
        if (!groupBySequence.has(seq)) {
          const group = [];
          groupBySequence.set(seq, group);
          groups.push(group);
        }
        groupBySequence.get(seq).push(row);
      } else {
        groups.push([row]);
      }
    }

    const scoreRow = (row) => {
      let score = Number(row.confidence || 0) * 10;
      for (const key of ['supplier_name','invoice_number','invoice_date','trn']) if (String(row?.[key] || '').trim()) score += 2;
      for (const key of ['amount_before_vat','vat_amount','total_amount']) if (row?.[key] !== null && row?.[key] !== undefined) score += 2;
      if (row.payment_method && row.payment_method !== 'unknown') score += 1;
      if (row.document_quality === 'clear') score += 2;
      return score;
    };

    const groupedRows = groups.map((group) => {
      const ordered = [...group].sort((a,b)=>Number(a.invoice_page)-Number(b.invoice_page));
      const best = [...ordered].sort((a,b)=>scoreRow(b)-scoreRow(a))[0] || ordered[0];
      const invoicePages = uniqueSortedPages(ordered.map((x)=>x.invoice_page));
      const allProofPages = uniqueSortedPages(ordered.flatMap((x)=>Array.isArray(x.payment_proof_pages)&&x.payment_proof_pages.length ? x.payment_proof_pages : (Array.isArray(x.receipt_pages)?x.receipt_pages:[])));
      const allProofTypes = [];
      for (const x of ordered) for (const kind of (Array.isArray(x.payment_proof_types)?x.payment_proof_types:[])) if (!allProofTypes.includes(kind)) allProofTypes.push(kind);
      const suppliers = [...new Set(ordered.map((x)=>String(x.supplier_name||'').trim().toLowerCase()).filter(Boolean))];
      const totals = [...new Set(ordered.map((x)=>x.total_amount).filter((x)=>x!==null&&x!==undefined).map((x)=>Number(x).toFixed(2)))];
      const dates = [...new Set(ordered.map((x)=>String(x.invoice_date||'').trim()).filter(Boolean))];
      const groupConflict = ordered.length > 1 && (suppliers.length > 1 || totals.length > 1 || dates.length > 1);
      return {
        ...best,
        invoice_page: Number(best.invoice_page) || invoicePages[0] || 1,
        invoice_pages: invoicePages,
        receipt_pages: allProofPages.filter((_,i)=>allProofTypes[i] === 'card_receipt' || !allProofTypes.length),
        payment_proof_pages: allProofPages,
        payment_proof_types: allProofTypes,
        card_receipt_detected: allProofPages.length > 0,
        needs_review: Boolean(best.needs_review || groupConflict),
        review_message: groupConflict
          ? `تحتاج مراجعة: الصفحات ${invoicePages.join('، ')} تحمل نفس المتسلسل لكن توجد اختلافات بين بعض بياناتها. راجعي الفاتورة متعددة الصفحات.`
          : String(best.review_message || ''),
      };
    });

    // Link continuation invoice pages to the primary invoice page so the audit strip makes grouping visible.
    const primaryBySequence = new Map();
    for (const item of groupedRows) {
      const seq = normalizedSequence(item.sequence_mark);
      if (seq) primaryBySequence.set(seq, Number(item.invoice_page));
    }
    for (const page of extracted.page_classification) {
      if (page.document_type !== 'invoice') continue;
      const row = physicalInvoiceRows.find((x)=>Number(x.invoice_page)===Number(page.page_number));
      const seq = normalizedSequence(row?.sequence_mark);
      if (seq && primaryBySequence.has(seq) && Number(page.page_number) !== primaryBySequence.get(seq)) {
        page.linked_invoice_page = primaryBySequence.get(seq);
        page.reason = `صفحة إضافية لنفس الفاتورة متسلسل ${row.sequence_mark}.`;
      }
    }

    // Promote an order summary into a reviewable purchase-document row when it has its own
    // sequence and there is no invoice row for that sequence. This prevents the last purchase
    // in a packet (for example Amazon order summary + preceding bank debit message) from disappearing.
    const existingSeqs = new Set(groupedRows.map((x)=>normalizedSequence(x.sequence_mark)).filter(Boolean));
    for (const page of extracted.page_classification.filter((p)=>p.document_type === 'order_summary')) {
      const seq = normalizedSequence(page.sequence_mark);
      if (!seq || existingSeqs.has(seq)) continue;
      groupedRows.push({
        invoice_page: Number(page.page_number) || 1,
        invoice_pages: [Number(page.page_number) || 1],
        sequence_mark: String(page.sequence_mark || ''),
        receipt_pages: [], payment_proof_pages: [], payment_proof_types: [],
        supplier_name: String(page.supplier_hint || ''),
        invoice_number: String(page.invoice_number_hint || ''),
        invoice_date: '', amount_before_vat: null, vat_amount: null, total_amount: null, trn: '',
        payment_method: 'unknown', card_receipt_detected: false, currency: 'AED',
        document_quality: 'needs_review', rejection_reasons: [], confidence: 0.5, needs_review: true,
        review_message: `مستند شراء متسلسل ${String(page.sequence_mark || page.page_number)} يحتاج مراجعة قبل الحفظ.`, can_save: false,
        source_document_type: 'order_summary'
      });
      existingSeqs.add(seq);
    }

    // Re-link payment proof after logical grouping. The model can miss a proof simply because it
    // appears before the invoice. Sequence is strongest; otherwise use nearest page on either side.
    const proofPagesAll = extracted.page_classification.filter((p)=>['card_receipt','bank_message','bank_app_proof'].includes(p.document_type));
    for (const row of groupedRows) {
      const currentProofs = uniqueSortedPages(row.payment_proof_pages || row.receipt_pages || []);
      const currentTypes = Array.isArray(row.payment_proof_types) ? [...row.payment_proof_types] : [];
      const seq = normalizedSequence(row.sequence_mark);
      const rowPages = uniqueSortedPages(row.invoice_pages || [row.invoice_page]);
      let candidates = proofPagesAll.filter((p)=>seq && normalizedSequence(p.sequence_mark) === seq);
      if (!candidates.length) {
        const minPage = Math.min(...rowPages), maxPage = Math.max(...rowPages);
        candidates = proofPagesAll.filter((p)=>{ const pn=Number(p.page_number); return pn===minPage-1 || pn===maxPage+1; });
      }
      for (const proof of candidates) {
        const pn=Number(proof.page_number);
        if (!currentProofs.includes(pn)) currentProofs.push(pn);
        if (!currentTypes.includes(proof.document_type)) currentTypes.push(proof.document_type);
        proof.linked_invoice_page = Number(row.invoice_page) || rowPages[0] || null;
        if (!proof.reason) proof.reason = `إثبات خصم مرتبط بالفاتورة متسلسل ${row.sequence_mark || row.invoice_number || row.invoice_page}.`;
      }
      row.payment_proof_pages = uniqueSortedPages(currentProofs);
      row.receipt_pages = uniqueSortedPages(currentProofs);
      row.payment_proof_types = currentTypes;
      row.card_receipt_detected = row.payment_proof_pages.length > 0;
      if (row.card_receipt_detected && row.payment_method === 'unknown') row.payment_method = 'card';
    }

    const batchInvoices = groupedRows.map((item) => {
      const proofPages = Array.isArray(item.payment_proof_pages) && item.payment_proof_pages.length
        ? item.payment_proof_pages
        : (Array.isArray(item.receipt_pages) ? item.receipt_pages : []);
      const proofTypes = Array.isArray(item.payment_proof_types) ? item.payment_proof_types : [];
      const missing = [];
      const checks = [
        ['supplier_name', item.supplier_name],
        ['invoice_number', item.invoice_number],
        ['invoice_date', item.invoice_date],
        ['amount_before_vat', item.amount_before_vat],
        ['vat_amount', item.vat_amount],
        ['total_amount', item.total_amount],
        ['trn', item.trn],
        ['payment_method', item.payment_method === 'unknown' ? '' : item.payment_method],
      ];
      for (const [field, value] of checks) if (value === '' || value === null || value === undefined) missing.push(field);
      const proofDetected = proofPages.length > 0;
      const cardProofMissing = item.payment_method === 'card' && !proofDetected;
      const visualReject = item.document_quality === 'rejected';
      const needsReview = Boolean(item.needs_review || visualReject || missing.length || cardProofMissing || Number(item.confidence || 0) < 0.9 || item.document_quality === 'needs_review');
      let reviewMessage = String(item.review_message || '').trim();
      if (cardProofMissing) {
        const ref = String(item.sequence_mark || item.invoice_number || item.invoice_page || '').trim();
        reviewMessage = `يرجى إرفاق إثبات الخصم للفاتورة متسلسل ${ref}`;
      } else if (!reviewMessage && missing.length) reviewMessage = `تحتاج مراجعة: بيانات غير مكتملة (${missing.join(', ')})`;
      else if (!reviewMessage && visualReject) reviewMessage = 'المستند يحتاج إعادة رفع بصورة أوضح وكاملة.';
      else if (!reviewMessage && needsReview) reviewMessage = 'تحتاج مراجعة قبل الحفظ.';
      return {
        ...item,
        invoice_pages: Array.isArray(item.invoice_pages) && item.invoice_pages.length ? item.invoice_pages : [item.invoice_page],
        payment_proof_pages: proofPages,
        payment_proof_types: proofTypes,
        card_receipt_detected: proofDetected,
        needs_review: needsReview,
        review_message: reviewMessage,
        can_save: !visualReject && !cardProofMissing && missing.length === 0 && !item.needs_review,
      };
    });

    extracted.batch_invoices = batchInvoices;
    extracted.batch_audit = {
      expected_page_count: expectedPageCount || null,
      classified_page_count: extracted.page_classification.length,
      physical_invoice_page_count: classifiedInvoicePages.length,
      logical_invoice_count: batchInvoices.length,
      returned_invoice_count: batchInvoices.length,
      complete_page_classification: expectedPageCount ? extracted.page_classification.length === expectedPageCount : true,
      complete_invoice_rows: classifiedInvoicePages.every((pageNo) => batchInvoices.some((item) => (item.invoice_pages || [item.invoice_page]).includes(pageNo))),
    };
    if (batchInvoices.length) {
      const first = batchInvoices[0];
      extracted = {
        ...extracted,
        supplier_name: first.supplier_name,
        invoice_number: first.invoice_number,
        invoice_date: first.invoice_date,
        amount_before_vat: first.amount_before_vat,
        vat_amount: first.vat_amount,
        total_amount: first.total_amount,
        trn: first.trn,
        payment_method: first.payment_method,
        card_receipt_detected: first.card_receipt_detected,
        currency: first.currency,
        document_quality: first.document_quality,
        rejection_reasons: first.rejection_reasons,
        confidence: first.confidence,
      };
    }

    const reasons = Array.isArray(extracted.rejection_reasons)
      ? extracted.rejection_reasons.filter(Boolean)
      : [];

    const addReason = (reason) => {
      if (!reasons.includes(reason)) reasons.push(reason);
    };

    if (extracted.bank_receipt_over_invoice) {
      addReason('A bank/POS receipt or another paper is covering or overlapping the invoice. Upload the full invoice and receipt as separate pages/files.');
    }
    if (extracted.multiple_documents_same_page) {
      addReason('More than one unrelated document is visible on the same page. Upload one invoice per page.');
    }
    if (extracted.invoice_cropped) {
      addReason('The invoice is cropped or not fully visible.');
    }
    if (extracted.important_fields_obscured) {
      addReason('Important invoice fields are covered or unreadable.');
    }
    if (extracted.payment_method === 'card' && !extracted.card_receipt_detected) {
      addReason('Card payment detected but a separate card receipt was not found.');
    }

    const missingFields = [];
    const requiredChecks = [
      ['supplier_name', extracted.supplier_name],
      ['invoice_number', extracted.invoice_number],
      ['invoice_date', extracted.invoice_date],
      ['amount_before_vat', extracted.amount_before_vat],
      ['vat_amount', extracted.vat_amount],
      ['total_amount', extracted.total_amount],
      ['trn', extracted.trn],
      ['payment_method', extracted.payment_method === 'unknown' ? '' : extracted.payment_method],
    ];

    for (const [field, value] of requiredChecks) {
      if (value === '' || value === null || value === undefined) missingFields.push(field);
    }

    if (missingFields.length) {
      addReason(`Needs review: missing or uncertain fields: ${missingFields.join(', ')}.`);
    }

    const visualReject = Boolean(
      extracted.bank_receipt_over_invoice ||
      extracted.multiple_documents_same_page ||
      extracted.invoice_cropped ||
      extracted.important_fields_obscured ||
      extracted.document_quality === 'rejected'
    );

    const cardReceiptMissing = Boolean(
      extracted.payment_method === 'card' && !extracted.card_receipt_detected
    );

    const needsReview = Boolean(
      !visualReject && (
        missingFields.length ||
        cardReceiptMissing ||
        Number(extracted.confidence || 0) < 0.9 ||
        extracted.document_quality === 'needs_review'
      )
    );

    extracted.rejection_reasons = reasons;
    extracted.missing_fields = missingFields;
    extracted.document_quality = visualReject ? 'rejected' : needsReview ? 'needs_review' : 'clear';
    extracted.can_save = !visualReject && !cardReceiptMissing && missingFields.length === 0;

    return res.status(200).json({
      data: extracted,
      requestId: payload.id || '',
      model: payload.model || process.env.OPENAI_OCR_MODEL || 'gpt-4.1-mini',
    });
  } catch (error) {
    console.error('SAAMS OCR error:', error instanceof Error ? error.message : error);
    return sendError(
      res,
      500,
      error instanceof Error ? error.message : 'Unexpected OCR error.',
      'UNEXPECTED_OCR_ERROR',
    );
  } finally {
    // Remove the temporary OpenAI file after extraction so uploaded PDFs do
    // not accumulate in the project storage.
    if (uploadedFileId) {
      fetch(`https://api.openai.com/v1/files/${uploadedFileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }).catch(() => {});
    }
  }
}
