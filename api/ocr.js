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

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    supplier_name: { type: 'string' },
    invoice_number: { type: 'string' },
    invoice_date: {
      type: 'string',
      description: 'Use DD/MM/YYYY when readable; otherwise return an empty string.',
    },
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
  },
  required: [
    'supplier_name',
    'invoice_number',
    'invoice_date',
    'amount_before_vat',
    'vat_amount',
    'total_amount',
    'trn',
    'payment_method',
    'card_receipt_detected',
    'bank_receipt_over_invoice',
    'multiple_documents_same_page',
    'invoice_cropped',
    'important_fields_obscured',
    'can_save',
    'currency',
    'document_quality',
    'rejection_reasons',
    'confidence',
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

  const fileInput = isPdf
    ? {
        type: 'input_file',
        filename: String(filename),
        file_data: base64Data,
      }
    : {
        type: 'input_image',
        image_url: String(fileData),
        detail: 'high',
      };

  const prompt = `You are a strict invoice validation and extraction engine for UAE nursery petty-cash invoices.
FIRST inspect the entire page for document-validity problems. Only after validation may you extract invoice data.

NON-NEGOTIABLE REJECTION RULES:
1. If a bank/POS/card receipt, cover sheet, paper, hand, sticker, or any other document is placed on top of, overlaps, covers, or hides any part of the invoice, set bank_receipt_over_invoice=true, document_quality="rejected", can_save=false. This is true even if some values can still be guessed.
2. If two unrelated invoices or two unrelated documents are visible on the same page/image, set multiple_documents_same_page=true, document_quality="rejected", can_save=false.
3. If the invoice is cropped, cut off, blurred, too faint, skewed so important fields cannot be read, or key fields are obscured, set the relevant flags, document_quality="rejected", can_save=false.
4. Handwriting alone is not a reason to reject, unless it covers or obscures printed invoice information.
5. A card receipt may be accepted only when it is a separate clearly visible attachment/page that does not cover the invoice. If card payment is clearly detected but no separate receipt is visible, mark needs_review and can_save=false; do not classify the invoice image itself as rejected.
6. When rejected, do not confidently infer hidden values. Leave unreadable fields empty/null and list every specific reason in rejection_reasons. When needs_review, extract all readable values and list only the missing or uncertain fields.
7. Use three outcomes:
- clear: the invoice image is valid and all important fields are readable.
- needs_review: the invoice image itself is valid, but one or more fields such as TRN, payment method, VAT, or another value are missing, not printed, handwritten, or uncertain. Do NOT reject solely for missing fields.
- rejected: only for visual/document problems such as overlap, multiple documents on one page, crop, blur, or important fields being obscured.
8. can_save=false for rejected documents. For needs_review, can_save may remain false until the user completes the missing fields manually in the interface.

MANDATORY FIELDS:
- supplier_name
- invoice_number
- invoice_date
- amount_before_vat
- vat_amount
- total_amount
- trn
- payment_method

EXTRACTION RULES:
- Copy only values visibly present. Never invent or reconstruct hidden information.
- invoice_number means the invoice number, not a POS terminal receipt/reference number.
- invoice_date format DD/MM/YYYY when readable.
- trn is normally a 15-digit UAE Tax Registration Number.
- Return numeric amounts only.
- payment_method is card when invoice/receipt shows Visa, Mastercard, Card, Debit, Credit, POS or terminal evidence; cash only when clearly stated; otherwise unknown.
- card_receipt_detected=true only for a separate visible bank/POS receipt.
- confidence is overall confidence from 0 to 1.

Be conservative. A readable payment receipt placed over an invoice is still a rejected upload because the invoice underneath is not fully visible.
Return only the requested structured result.`;

  try {
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
  }
}
