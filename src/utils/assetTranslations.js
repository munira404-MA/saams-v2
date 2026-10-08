const EXACT = {
  'فرن ميكروويف':'Microwave Oven','ميكروويف':'Microwave Oven','مقعد متحرك':'Wheelchair','كرسي متحرك':'Wheelchair',
  'آيباد':'iPad','ايباد':'iPad','جهاز تنقية الهواء':'Air Purifier','منقي هواء':'Air Purifier','كرسي زائر':'Visitor Chair',
  'تلفزيون ذكي':'Smart TV','نقطة وصول':'Access Point','كرسي مكتبي':'Office Chair','وحدة تكييف سبلت':'Split AC Unit','مكيف سبلت':'Split AC Unit',
  'ثلاجة':'Refrigerator','غسالة':'Washing Machine','غسالة صحون':'Dishwasher','طابعة':'Printer','ماسح ضوئي':'Scanner','آلة تصوير':'Photocopier',
  'كمبيوتر':'Computer','حاسوب':'Computer','لابتوب':'Laptop','لاب توب':'Laptop','شاشة':'Monitor','شاشة تلفزيون':'TV Screen','تلفزيون':'Television',
  'طاولة':'Table','طاولة أطفال':'Children Table','طاولة مستديرة':'Round Table','طاولة مكتب':'Office Desk','مكتب':'Desk','خزانة':'Cabinet',
  'خزانة تخزين':'Storage Cabinet','خزانة خشبية':'Wooden Cabinet','رف':'Shelf','رفوف':'Shelving Unit','كنبة':'Sofa','أريكة':'Sofa','كرسي':'Chair',
  'سرير':'Bed','سرير أطفال':'Children Bed','سبورة':'Whiteboard','سبورة ذكية':'Smart Board','بروجكتر':'Projector','جهاز عرض':'Projector',
  'هاتف':'Telephone','هاتف مكتبي':'Desk Phone','راوتر':'Router','سويتش':'Network Switch','جهاز بصمة':'Fingerprint Device','كاميرا':'Camera',
  'كاميرا مراقبة':'CCTV Camera','طفاية حريق':'Fire Extinguisher','مبرد مياه':'Water Cooler','برادة مياه':'Water Cooler','آلة قهوة':'Coffee Machine',
  'ماكينة قهوة':'Coffee Machine','غلاية':'Kettle','خلاط':'Blender','فرن':'Oven','موقد':'Stove','شفاط':'Extractor Hood','مكنسة كهربائية':'Vacuum Cleaner',
  'سجادة':'Carpet','سجاد':'Carpet','ستارة':'Curtain','مرآة':'Mirror','ساعة حائط':'Wall Clock','لوحة':'Board','لوحة إعلانات':'Notice Board',
  'بيت ألعاب خارجي':'Outdoor Playhouse','زحليقة':'Slide','مرجيحة':'Swing','لعبة':'Toy','ألعاب خارجية':'Outdoor Play Equipment','دراجة':'Bicycle',
  'جهاز رياضي':'Exercise Equipment','جهاز مشي':'Treadmill','كرة':'Ball','حصيرة':'Mat','عربة':'Trolley','عربة أطفال':'Stroller',
  'صندوق تخزين':'Storage Box','حاوية':'Container','طاولة تغيير حفاض':'Changing Table','مقعد':'Seat','بنش':'Bench'
};

const PARTS = [
 ['فرن ميكروويف','Microwave Oven'],['وحدة تكييف سبلت','Split AC Unit'],['جهاز تنقية الهواء','Air Purifier'],['نقطة وصول','Access Point'],
 ['كرسي مكتبي','Office Chair'],['كرسي زائر','Visitor Chair'],['مقعد متحرك','Wheelchair'],['تلفزيون ذكي','Smart TV'],['خزانة تخزين','Storage Cabinet'],
 ['طاولة أطفال','Children Table'],['طاولة مستديرة','Round Table'],['طاولة مكتب','Office Desk'],['سبورة ذكية','Smart Board'],['جهاز عرض','Projector'],
 ['كاميرا مراقبة','CCTV Camera'],['طفاية حريق','Fire Extinguisher'],['مبرد مياه','Water Cooler'],['برادة مياه','Water Cooler'],['آلة قهوة','Coffee Machine'],
 ['ماكينة قهوة','Coffee Machine'],['مكنسة كهربائية','Vacuum Cleaner'],['ألعاب خارجية','Outdoor Play Equipment'],['بيت ألعاب خارجي','Outdoor Playhouse'],
 ['طاولة','Table'],['خزانة','Cabinet'],['كرسي','Chair'],['مكتب','Desk'],['شاشة','Monitor'],['تلفزيون','Television'],['ثلاجة','Refrigerator'],
 ['طابعة','Printer'],['كمبيوتر','Computer'],['حاسوب','Computer'],['لابتوب','Laptop'],['رفوف','Shelving Unit'],['رف','Shelf'],['سجادة','Carpet'],['ستارة','Curtain'],
 ['مرآة','Mirror'],['لوحة','Board'],['عربة','Trolley'],['مقعد','Seat'],['سرير','Bed'],['هاتف','Telephone'],['راوتر','Router'],['كاميرا','Camera'],['لعبة','Toy']
];

const AR_LATIN={'ا':'a','أ':'a','إ':'i','آ':'aa','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'w','ؤ':'w','ي':'y','ى':'a','ئ':'y','ء':'','َ':'','ً':'','ُ':'','ٌ':'','ِ':'','ٍ':'','ْ':'','ّ':''};
function transliterateArabic(v){return String(v||'').split('').map(ch=>AR_LATIN[ch]??ch).join('').replace(/\s+/g,' ').trim()}


const EN_TO_AR = Object.fromEntries(Object.entries(EXACT).map(([ar,en]) => [en, ar]));
Object.assign(EN_TO_AR, {
  'Kids Table':'طاولة أطفال',
  'Children Table':'طاولة أطفال',
  'Office Chair':'كرسي مكتبي',
  'Storage Cabinet':'خزانة تخزين',
  'Locker':'خزانة',
  'Microwave Oven':'فرن ميكروويف',
  'Air Purifier':'جهاز تنقية الهواء',
  'Smart TV':'تلفزيون ذكي',
  'Access Point':'نقطة وصول',
  'iPad':'آيباد',
});

export function translateAssetNameArabic(value){
  const raw=String(value||'').trim();
  if(!raw) return '';
  if(/[؀-ۿ]/.test(raw)) return raw;
  return EN_TO_AR[raw] || raw;
}

export function translateAssetName(value){
  const raw=String(value||'').trim();
  if(!raw) return '';
  if(!/[\u0600-\u06FF]/.test(raw)) return raw;
  if(EXACT[raw]) return EXACT[raw];
  let out=raw;
  for(const [ar,en] of PARTS){ out=out.split(ar).join(en); }
  out=out.replace(/\bواحد\b/g,'1').replace(/\bاثنين\b/g,'2').replace(/\bثلاثة\b/g,'3');
  return /[\u0600-\u06FF]/.test(out) ? transliterateArabic(out) : out;
}
