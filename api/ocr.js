const MAX_BYTES = 4 * 1024 * 1024;

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    supplier_name: { type: 'string' },
    invoice_number: { type: 'string' },
    invoice_date: { type: 'string', description: 'Use DD/MM/YYYY when readable, otherwise empty string.' },
    amount_before_vat: { type: ['number', 'null'] },
    vat_amount: { type: ['number', 'null'] },
    total_amount: { type: ['number', 'null'] },
    trn: { type: 'string' },
    payment_method: { type: 'string', enum: ['card', 'cash', 'unknown'] },
    card_receipt_detected: { type: 'boolean' },
    currency: { type: 'string' },
    document_quality: { type: 'string', enum: ['clear', 'unclear', 'rejected'] },
    rejection_reasons: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: [
    'supplier_name', 'invoice_number', 'invoice_date', 'amount_before_vat',
    'vat_amount', 'total_amount', 'trn', 'payment_method',
    'card_receipt_detected', 'currency', 'document_quality',
    'rejection_reasons', 'confidence'
  ],
};

function estimateBase64Bytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in Vercel.' });

  const { filename, mimeType, fileData } = req.body || {};
  if (!filename || !fileData) return res.status(400).json({ error: 'Missing invoice file.' });
  if (estimateBase64Bytes(fileData) > MAX_BYTES) return res.status(413).json({ error: 'File exceeds the 4 MB limit.' });

  const isPdf = mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
  const fileInput = isPdf
    ? { type: 'input_file', filename, file_data: fileData }
    : { type: 'input_image', image_url: fileData, detail: 'high' };

  const prompt = `Read this UAE invoice accurately in Arabic or English. Extract only what is visible; never invent missing values.
Rules:
- A card payment is indicated by words such as Visa, Mastercard, Card, or a card terminal receipt.
- If payment is card, check whether a bank/card receipt is included.
- Reject or flag: unclear image, a cover/bank sheet covering the invoice, or two unrelated invoices on one page.
- Keep invoice pages linked when they clearly belong to the same invoice.
- Currency should normally be AED when shown.
- VAT amounts must be copied from the invoice, not guessed. If unavailable, return null.
- Confidence is an overall extraction confidence from 0 to 1.
Return the structured result only.`;

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_OCR_MODEL || 'gpt-4.1-mini',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            fileInput,
          ],
        }],
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

    const payload = await openaiResponse.json();
    if (!openaiResponse.ok) {
      return res.status(openaiResponse.status).json({ error: payload?.error?.message || 'OpenAI request failed.' });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) return res.status(502).json({ error: 'No structured OCR result was returned.' });
    return res.status(200).json({ data: JSON.parse(outputText), requestId: payload.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected OCR error.' });
  }
}
