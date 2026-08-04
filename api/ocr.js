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
    receipt_pages: { type: 'array', items: { type: 'integer', minimum: 1 } },
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
  },
  required: [
    'invoice_page','receipt_pages','supplier_name','invoice_number','invoice_date',
    'amount_before_vat','vat_amount','total_amount','trn','payment_method',
    'card_receipt_detected','currency','document_quality','rejection_reasons','confidence'
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
          document_type: { type: 'string', enum: ['invoice', 'card_receipt', 'other'] },
          linked_invoice_page: { type: ['integer', 'null'], minimum: 1 },
          reason: { type: 'string' },
        },
        required: ['page_number','document_type','linked_invoice_page','reason'],
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
  let fileInput = isPdf
    ? null
    : {
        type: 'input_image',
        image_url: String(fileData),
        detail: 'high',
      };

  const prompt = `You are a UAE nursery invoice document-separation, validation, pairing, and extraction engine.

IMPORTANT: A multipage PDF may contain MANY invoices and card/POS receipts mixed together. Treat every PDF page as a separate document first. Do not treat the whole PDF as one invoice.

STEP 1 — CLASSIFY EVERY PAGE:
- invoice: tax invoice, cash invoice, handwritten invoice, supplier invoice.
- card_receipt: POS/network/NeoPay/Visa/Mastercard/debit/credit terminal receipt.
- other: cover sheet or unrelated page.
Return page_classification for every visible page.

STEP 2 — PAIR RECEIPTS TO INVOICES:
- A receipt is normally immediately before or after its invoice.
- Pair using matching or near-matching date, amount, supplier/merchant, card evidence, and handwritten sequence marks.
- Small amount differences caused by rounding are allowed.
- A receipt page is a separate valid attachment. It must NOT cause rejection merely because it is in the same multipage PDF.
- Never merge two different invoices into one record.
- Cash invoices normally have no receipt.

STEP 3 — CREATE batch_invoices:
Create one item per invoice page, in original page order. Put linked receipt page numbers in receipt_pages. Extract fields from the invoice page, not from the receipt, except use the receipt only to confirm card payment and attachment presence.

VISUAL REJECTION RULES APPLY PER PAGE, NOT TO THE WHOLE PDF:
- Reject an invoice page only if another paper/receipt physically overlaps or covers that same page, two unrelated documents are visible on one page, the invoice is cropped/blurred, or important fields are obscured.
- A separate receipt on another PDF page is correct and must be linked, not rejected.
- Missing TRN or payment method means needs_review, not rejected.

EXTRACTION:
- invoice_number must come from the invoice, never POS receipt/reference number.
- invoice_date DD/MM/YYYY when readable.
- UAE TRN is normally 15 digits.
- Numeric amounts only.
- payment_method=card when linked receipt or clear card evidence exists; cash only when printed; otherwise unknown.
- card_receipt_detected=true when receipt_pages is not empty.
- confidence 0..1.

TOP-LEVEL FIELDS:
For backward compatibility, copy the FIRST invoice in batch_invoices into the top-level invoice fields. If there is no invoice, return empty/null fields and rejected.

Return only the requested structured result.`

  try {
    if (isPdf) {
      const pdfBytes = Buffer.from(base64Data, 'base64');
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
              { type: 'input_text', text: prompt },
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

    const batchInvoices = Array.isArray(extracted.batch_invoices) ? extracted.batch_invoices : [];
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
