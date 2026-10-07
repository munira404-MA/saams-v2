import { translateAssetName } from './assetTranslations';

const PERSON_NAMES = {
  'منيرة الأحمد': 'Munira Alahmed',
  'منيرة احمد': 'Munira Alahmed',
  'منيرة الاحمد': 'Munira Alahmed',
};

const ACTIONS = {
  'رفع أصول من Excel': 'Assets imported from Excel',
  'حذف أصل': 'Asset deleted',
  'إضافة أصل': 'Asset added',
  'تعديل أصل': 'Asset updated',
  'نقل أصل': 'Asset transfer',
  'طلب نقل': 'Transfer request',
  'طلب فائض': 'Surplus request',
  'طلب إسقاط': 'Disposal request',
  'اعتماد فاتورة': 'Invoice approved',
  'إعادة فاتورة': 'Invoice returned for editing',
  'رفض فاتورة': 'Invoice rejected',
  'رفع فاتورة': 'Invoice uploaded',
  'إضافة سلفة': 'Advance created',
  'إنشاء سلفة': 'Advance created',
  'إغلاق سلفة': 'Advance closed',
};

const DETAILS_REPLACEMENTS = [
  ['أصول تم رفعها', 'assets imported'],
  ['تم رفع', 'Imported'],
  ['أصل', 'asset'],
  ['فاتورة', 'invoice'],
  ['سلفة', 'advance'],
];

export function englishPersonName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return PERSON_NAMES[raw] || raw;
}

export function englishActivityText(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (ACTIONS[raw]) return ACTIONS[raw];
  if (!/[\u0600-\u06FF]/.test(raw)) return raw;
  let out = raw;
  for (const [ar, en] of DETAILS_REPLACEMENTS) out = out.split(ar).join(en);
  // Asset names are often stored directly in activity details. Translate known names first.
  const translatedAsset = translateAssetName(out);
  return translatedAsset || out;
}

export function englishTime(value) {
  return String(value || '').replace(/\s*ص\b/g, ' AM').replace(/\s*م\b/g, ' PM').trim();
}
