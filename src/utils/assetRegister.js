// Full asset register (administration data) — columns of the «Consolidated Asset Register» Excel.
// Values are stored exactly as in the register (English) and shown in Arabic on screen.

export const REGISTER_COLUMNS = [
  // key in UI row, DB column, Arabic header, English header, Excel header (as in the register)
  { key: 'siteLocation', db: 'site_location', ar: 'الموقع داخل الحضانة', en: 'Location (Site/User)', excel: 'Location (Site/user Name)' },
  { key: 'fundSource', db: 'fund_source', ar: 'مصدر التمويل', en: 'Fund Source', excel: 'Fund Source' },
  { key: 'mainCategory', db: 'main_category', ar: 'التصنيف الرئيسي', en: 'Main Category', excel: 'Main Category' },
  { key: 'subCategory1', db: 'sub_category_1', ar: 'التصنيف الفرعي 1', en: 'Sub-Category 1', excel: 'Sub-Category 1' },
  { key: 'subCategory2', db: 'sub_category_2', ar: 'التصنيف الفرعي 2', en: 'Sub-Category 2', excel: 'Sub-Category 2' },
  { key: 'itemDescription', db: 'item_description', ar: 'وصف الأصل', en: 'Item Description', excel: 'Item Description' },
  { key: 'model', db: 'model', ar: 'الموديل', en: 'Model', excel: 'Model' },
  { key: 'brand', db: 'brand', ar: 'العلامة التجارية', en: 'Brand', excel: 'Brand' },
  { key: 'serialNumber', db: 'serial_number', ar: 'الرقم التسلسلي', en: 'Serial Number', excel: 'Serial Number' },
  { key: 'cost', db: 'cost', ar: 'التكلفة (درهم)', en: 'Cost (AED)', excel: 'Cost' },
  { key: 'supplierName', db: 'supplier_name', ar: 'المورد', en: 'Supplier', excel: 'Supplier Name' },
  { key: 'documentReference', db: 'document_reference', ar: 'رقم المستند المرجعي', en: 'Document Reference No', excel: 'Document Reference No' },
  { key: 'receivingDate', db: 'receiving_date', ar: 'تاريخ الاستلام', en: 'Receiving Date', excel: 'Receiving Date' },
  { key: 'warrantyExpiry', db: 'warranty_expiry', ar: 'تاريخ انتهاء الضمان', en: 'Warranty Expiry', excel: 'Warranty Expiry Date' },
  { key: 'assetCondition', db: 'asset_condition', ar: 'حالة الأصل', en: 'Asset Condition', excel: 'Asset Condition' },
  { key: 'disposalReference', db: 'disposal_reference', ar: 'رقم مرجع الإسقاط', en: 'Disposal Reference No', excel: 'Disposal Reference No' },
  { key: 'registerStatus', db: 'register_status', ar: 'حالة القيد', en: 'Asset Status', excel: 'Asset Status' },
];
export const REGISTER_DB_COLUMNS = REGISTER_COLUMNS.map((c) => c.db);

// Who may see the full register: system administrator, or an administration employee
// given the «السجل الكامل للأصول» permission in the Users screen.
export function canSeeFullRegister(profile) {
  if (!profile) return false;
  if (profile.role === 'super_admin') return true;
  return profile.role === 'admin' && Boolean(profile.permissions?.asset_register) && Boolean(profile.permissions?.assets);
}

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const FUND = { 'grant': 'منحة', 'purchase order': 'أمر شراء', 'direct purchase': 'شراء مباشر', 'loa': 'خطاب ترسية (LOA)' };
const MAIN = {
  'furniture': 'الأثاث', 'it equipment': 'معدات تقنية المعلومات', 'kitchen equipment': 'معدات المطبخ',
  'sport equipment': 'المعدات الرياضية', 'air conditioners': 'أجهزة التكييف', 'clinic equipment': 'معدات العيادة',
  'office equipment': 'المعدات المكتبية', 'vehicles': 'المركبات',
};
const CONDITION = { 'excellent': 'ممتازة', 'good': 'جيدة', 'poor': 'سيئة', 'fair': 'مقبولة', 'damaged': 'تالفة' };
const STATUS = { 'active': 'نشط', 'disposed': 'مُسقط', 'inactive': 'غير نشط', 'surplus': 'فائض', 'transferred': 'منقول' };

const SUB = {
  'aed machine': 'جهاز الصدمات الكهربائية (AED)', 'access point': 'نقطة وصول لاسلكية', 'air purifier': 'منقي هواء',
  'amblifier': 'مضخم صوت', 'amplifier': 'مضخم صوت', 'bed': 'سرير', 'bench': 'مقعد طويل', 'biometric': 'جهاز بصمة',
  'cctv display': 'شاشة كاميرات المراقبة', 'cpu': 'وحدة معالجة (CPU)', 'cabinet': 'خزانة', 'call station': 'محطة نداء',
  'camera': 'كاميرا', 'chair': 'كرسي', 'clinic bed': 'سرير عيادة', 'cooking range': 'موقد طبخ', 'counter': 'كاونتر',
  'digital screen': 'شاشة رقمية', 'dishwasher': 'غسالة صحون', 'drawer': 'أدراج', 'dress up unit': 'وحدة ملابس تنكرية',
  'easel stand': 'حامل لوحة', 'freezer': 'فريزر', 'fridge': 'ثلاجة', 'general furniture': 'أثاث عام',
  'indoor game': 'لعبة داخلية', 'ipad': 'آيباد', 'lamination': 'جهاز تغليف حراري', 'laminator': 'جهاز تغليف حراري',
  'laptop': 'حاسوب محمول', 'locker': 'خزانة شخصية', 'lockers': 'خزائن شخصية', 'mac studio': 'Mac Studio',
  'magic pen': 'قلم ذكي', 'medical trolley': 'عربة طبية', 'microphone': 'ميكروفون', 'microwave': 'ميكروويف',
  'mobile phone': 'هاتف متحرك', 'monitor': 'شاشة', 'nvr': 'مسجل فيديو شبكي (NVR)', 'network switch': 'محول شبكة',
  'outdoor game': 'لعبة خارجية', 'pc': 'حاسوب مكتبي', 'poe switch': 'محول شبكة PoE', 'paper shredder': 'آلة تمزيق ورق',
  'passenger van': 'حافلة ركاب', 'pedestol': 'وحدة أدراج', 'pedestal unit': 'وحدة أدراج', 'photocopier': 'آلة تصوير',
  'pickup': 'مركبة بيك أب', 'printer': 'طابعة', 'projector': 'جهاز عرض', 'recliner chair': 'كرسي استرخاء',
  'recorder': 'جهاز تسجيل', 'round table': 'طاولة دائرية', 'router': 'موجه شبكة (راوتر)', 'suv': 'مركبة رباعية الدفع',
  'safelocker': 'خزنة', 'saloon': 'سيارة صالون', 'scale': 'ميزان', 'seating system': 'نظام جلوس', 'shoe rack': 'رف أحذية',
  'shredder': 'آلة تمزيق ورق', 'sofa': 'كنبة', 'sound system': 'نظام صوت', 'speaker': 'سماعة', 'split ac': 'مكيف سبليت',
  'split ac unit': 'وحدة تكييف سبليت', 'stool': 'كرسي بدون ظهر', 'storage cabinet': 'خزانة تخزين', 'storageg cabinet': 'خزانة تخزين',
  'studio display': 'شاشة Studio Display', 'tv cart': 'عربة تلفزيون', 'table': 'طاولة', 'television': 'تلفزيون',
  'time & attendance': 'جهاز الحضور والانصراف', 'trolley': 'عربة', 'truck': 'شاحنة', 'video recorder': 'مسجل فيديو',
  'vital signs': 'جهاز العلامات الحيوية', 'washing machine': 'غسالة ملابس', 'wheel chair': 'كرسي متحرك', 'wheelchair': 'كرسي متحرك',
  'wireless presenter': 'مؤشر عرض لاسلكي', 'workstation': 'محطة عمل', 'sport equi': 'معدات رياضية',
  'ball pool': 'مسبح كرات', 'bar chair': 'كرسي بار', 'cashier stand': 'منصة كاشير', 'climbing toys': 'ألعاب تسلق',
  'climbing wall': 'جدار تسلق', 'coffee table': 'طاولة قهوة', 'combo game': 'لعبة متعددة', 'cosplay wardrobe': 'خزانة أزياء تنكرية',
  'dining chair': 'كرسي طعام', 'dining table': 'طاولة طعام', 'doube bed': 'سرير مزدوج', 'double bed': 'سرير مزدوج',
  'double door': 'بابين', 'dressing table': 'طاولة تسريحة', 'fire station': 'ركن محطة الإطفاء', 'foldable table': 'طاولة قابلة للطي',
  'front loading': 'تحميل أمامي', 'fruits shop': 'ركن محل الفواكه', 'garden': 'ركن الحديقة', 'gas station': 'ركن محطة الوقود',
  'general table': 'طاولة عامة', 'grocery stall': 'ركن البقالة', 'grocery store': 'ركن البقالة', 'hopsital': 'ركن المستشفى',
  'hospital': 'ركن المستشفى', 'house on fire': 'ركن البيت المحترق', 'kids chair': 'كرسي أطفال', 'kids table': 'طاولة أطفال',
  'kitchen': 'ركن المطبخ', 'kitchen set': 'طقم مطبخ', 'kithcen sets': 'أطقم مطبخ', 'l shape office table': 'طاولة مكتب على شكل L',
  'leather type': 'نوع جلد', 'meeting chair': 'كرسي اجتماعات', 'meeting table': 'طاولة اجتماعات', 'microwave oven': 'فرن ميكروويف',
  'office chair': 'كرسي مكتب', 'office table': 'طاولة مكتب', 'once seater': 'مقعد فردي', 'one seater': 'مقعد فردي',
  'single seater': 'مقعد فردي', 'two seater': 'مقعد لشخصين', 'three seater': 'مقعد لثلاثة أشخاص', 'outdoor home': 'بيت خارجي',
  'outdoor table': 'طاولة خارجية', 'play ground': 'ملعب أطفال', 'playground': 'ملعب أطفال', 'puppet show': 'مسرح الدمى',
  'rainbow house': 'بيت قوس قزح', 'reception bench': 'مقعد استقبال', 'reception counter': 'كاونتر استقبال',
  'rocking stool': 'كرسي هزاز بدون ظهر', 'roll stool': 'كرسي دوار بدون ظهر', 'round stool': 'كرسي دائري بدون ظهر',
  'sale counter': 'كاونتر بيع', 'sand table': 'طاولة رمل', 'sand water table': 'طاولة رمل وماء', 'sand and water station': 'محطة رمل وماء',
  'service trolley': 'عربة خدمة', 'single bed': 'سرير مفرد', 'single door': 'باب واحد', 'slide': 'زحليقة', 'smart tv': 'تلفزيون ذكي',
  'steel type': 'نوع معدني', 'swing': 'أرجوحة', 'teacher table': 'طاولة معلمة', 'theater': 'مسرح', 'top loading': 'تحميل علوي',
  'toy fridge': 'ثلاجة ألعاب', 'toy train': 'قطار ألعاب', 'traingular mirror': 'مرآة مثلثة', 'triangular mirror': 'مرآة مثلثة',
  'visitor chair': 'كرسي زائر', 'wash sink': 'مغسلة', 'weighing scale': 'ميزان', 'wooden boat': 'قارب خشبي', 'wooden car': 'سيارة خشبية',
  'wooden horse': 'حصان خشبي', 'wooden slide': 'زحليقة خشبية', 'wooden tent': 'خيمة خشبية', 'wooden toy': 'لعبة خشبية',
  'wooden train': 'قطار خشبي',
};

// Common words in «Location (Site/user Name)»; person names are kept as written.
const LOCATION_WORDS = {
  room: 'غرفة', class: 'فصل', reception: 'الاستقبال', clinic: 'العيادة', store: 'المخزن', office: 'مكتب',
  principal: 'المديرة', kitchen: 'المطبخ', lounge: 'الاستراحة', staff: 'الموظفين', multipurpose: 'متعددة الأغراض',
  pantry: 'المطبخ الصغير', corridor: 'الممر', gym: 'الصالة الرياضية', director: 'المدير', assistant: 'مساعد',
  manager: 'مدير', hall: 'قاعة', meeting: 'الاجتماعات', play: 'اللعب', teachers: 'المعلمات', area: 'منطقة',
  ground: 'الأرضي', laundry: 'المغسلة', indoor: 'الداخلية', floor: 'الطابق', outside: 'الخارج', rest: 'استراحة',
  marketing: 'التسويق', child: 'الطفل', protection: 'حماية', department: 'قسم', administration: 'الإدارة',
  adminsistration: 'الإدارة', supervisor: 'المشرفة', outdoor: 'الخارجية', secretary: 'السكرتارية', theatre: 'المسرح',
  first: 'الأول', general: 'العامة', services: 'الخدمات', guard: 'الحارس', administrative: 'الإدارية',
  adminstrative: 'الإدارية', server: 'الخوادم', electrical: 'الكهرباء', nurse: 'الممرضة', mother: 'الأمهات',
  curriculum: 'المناهج', activity: 'الأنشطة', english: 'الإنجليزي', arabic: 'العربي', management: 'الإدارة',
  procurement: 'المشتريات', offices: 'مكاتب', parking: 'المواقف', telephone: 'الهاتف', maid: 'العاملة',
  coordinator: 'المنسقة', prayer: 'المصلى', president: 'الرئيس', chancellor: 'مدير الجامعة', storage: 'التخزين',
  library: 'المكتبة', toilet: 'دورة المياه', garden: 'الحديقة', entrance: 'المدخل', security: 'الأمن', hr: 'الموارد البشرية',
  it: 'تقنية المعلومات', kg: 'الروضة', age: 'عمر', asset: 'الأصول', no: 'رقم', the: '', new: 'الجديد',
};

// English puts the describing word first («Director Room»); Arabic puts it last («غرفة المدير»).
function translateSegment(seg) {
  const tokens = seg.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return '';
  const tr = (w) => { const t = LOCATION_WORDS[w.toLowerCase()]; return t === undefined ? null : t; };
  const known = tokens.map((w) => (/^[A-Za-z']+$/.test(w) ? tr(w) : null));
  if (tokens.length > 1 && known.every((t) => t !== null)) {
    const merged = [];
    for (let i = 0; i < known.length; i += 1) {
      if (known[i] === 'مساعد' && known[i + 1]) { merged.push(`مساعد ${known[i + 1]}`); i += 1; } else merged.push(known[i]);
    }
    const words = merged.filter(Boolean).reverse();
    if (words.length > 1) words[0] = words[0].replace(/^ال(?=\S{2,})/, ''); // «استراحة الموظفين», not «الاستراحة الموظفين»
    return words.join(' ');
  }
  const last = tokens[tokens.length - 1];
  if (tokens.length > 1 && /^(room|office|area|hall|lounge|store)$/i.test(last)) {
    return `${tr(last)} ${translateSegment(tokens.slice(0, -1).join(' '))}`.trim();
  }
  return tokens.map((w, i) => (known[i] !== null && known[i] !== undefined ? known[i] : w)).filter(Boolean).join(' ');
}
function translateLocation(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.split(/(\s*[\/,\-–]\s*)/).map((part, i) => (i % 2 ? part : translateSegment(part))).join('').replace(/\s+/g, ' ').trim();
}

const EMPTY = new Set(['', 'n/a', 'na', 'n.a', '-', '—', 'none', 'null']);
export function isEmptyRegisterValue(v) { return EMPTY.has(norm(v)); }

// Arabic display of a register value.
export function registerValueAr(key, value) {
  if (value === null || value === undefined || isEmptyRegisterValue(value)) return '—';
  const v = norm(value);
  switch (key) {
    case 'fundSource': return FUND[v] || value;
    case 'mainCategory': return MAIN[v] || value;
    case 'subCategory1': case 'subCategory2': return SUB[v] || value;
    case 'assetCondition': return CONDITION[v] || value;
    case 'registerStatus': return STATUS[v] || value;
    case 'siteLocation': return translateLocation(value);
    case 'cost': { const n = Number(value); return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
    case 'receivingDate': case 'warrantyExpiry': return String(value).slice(0, 10);
    default: return String(value);
  }
}
export function registerValue(key, value, ar) {
  if (ar) return registerValueAr(key, value);
  if (value === null || value === undefined || isEmptyRegisterValue(value)) return '—';
  if (key === 'cost') { const n = Number(value); return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'; }
  if (key === 'receivingDate' || key === 'warrantyExpiry') return String(value).slice(0, 10);
  return String(value);
}

export function dbRowToRegister(row) {
  const out = {};
  for (const c of REGISTER_COLUMNS) out[c.key] = row?.[c.db] ?? null;
  return out;
}

// ---- Reading the register Excel (sheet rows as arrays, first row = headers) ----
const HEADER_ALIASES = {
  barcode: ['barcode', 'الباركود', 'الباركود الداخلي'],
  sfdBarcode: ['sfd barcode', 'باركود المالية المركزية', 'central finance barcode'],
  customerName: ['customer name', 'الحضانة'],
};
function cleanHeader(h) { return norm(h).replace(/[^a-z0-9؀-ۿ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

function excelDate(v) {
  if (v === null || v === undefined || isEmptyRegisterValue(v)) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 20000 && v < 80000) { // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
function textOrNull(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).replace(/\s+/g, ' ').trim();
  return isEmptyRegisterValue(s) ? null : s;
}

export function parseRegisterSheet(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('EMPTY_SHEET');
  let headerIndex = -1, idx = null;
  for (let r = 0; r < Math.min(rows.length, 15); r += 1) {
    const headers = (rows[r] || []).map(cleanHeader);
    const find = (names) => headers.findIndex((h) => names.some((n) => h === cleanHeader(n)));
    const map = { barcode: find(HEADER_ALIASES.barcode), sfdBarcode: find(HEADER_ALIASES.sfdBarcode), customerName: find(HEADER_ALIASES.customerName) };
    for (const c of REGISTER_COLUMNS) map[c.key] = find([c.excel, c.en, c.ar]);
    const found = REGISTER_COLUMNS.filter((c) => map[c.key] >= 0).length;
    if (map.barcode >= 0 && found >= 8) { headerIndex = r; idx = map; break; }
  }
  if (headerIndex < 0) throw new Error('REGISTER_HEADERS');
  const out = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const barcode = textOrNull(row[idx.barcode]);
    if (!barcode || /^n\/?b$/i.test(barcode)) continue; // «N/B» = no barcode
    const item = { barcode, customer_name: idx.customerName >= 0 ? textOrNull(row[idx.customerName]) : null, sfd_barcode: idx.sfdBarcode >= 0 ? textOrNull(row[idx.sfdBarcode]) : null };
    for (const c of REGISTER_COLUMNS) {
      const v = idx[c.key] >= 0 ? row[idx[c.key]] : null;
      if (c.key === 'cost') { const n = Number(v); item.cost = v === null || v === '' || !Number.isFinite(n) ? null : n; }
      else if (c.key === 'receivingDate' || c.key === 'warrantyExpiry') item[c.db] = excelDate(v);
      else item[c.db] = textOrNull(v);
    }
    out.push(item);
  }
  return out;
}
