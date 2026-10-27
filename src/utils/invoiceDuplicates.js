// One rule for «duplicate invoice», used by the save check and the duplicate warning:
// an invoice is a duplicate ONLY when supplier name + invoice number + invoice date + total amount
// are all the same. Same supplier alone, or same date alone, is NOT a duplicate.

export function normalizeSupplier(value) {
  return String(value || '')
    .replace(/[ً-ْـ]/g, '') // Arabic diacritics / tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeInvoiceNumber(value) {
  return String(value || '').replace(/\s+/g, '').trim().toLowerCase();
}

export function normalizeInvoiceDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parts = raw.split(/[\/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return raw;
}

export function normalizeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function invoiceDuplicateKey({ supplier, number, date, total }) {
  const s = normalizeSupplier(supplier);
  const n = normalizeInvoiceNumber(number);
  if (!s || !n) return '';
  return [s, n, normalizeInvoiceDate(date), normalizeAmount(total).toFixed(2)].join('|');
}

export function isSameInvoice(a, b) {
  const ka = invoiceDuplicateKey(a);
  return Boolean(ka) && ka === invoiceDuplicateKey(b);
}
