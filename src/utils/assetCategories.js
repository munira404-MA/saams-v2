const categories = [
 ['الأثاث','Furniture',['اثاث','أثاث']],
 ['معدات تقنية المعلومات','IT Equipment',['تقنية المعلومات']],
 ['معدات العيادة','Clinic Equipment',['معدات عيادة','معدات العياده','madat alayada']],
 ['معدات طبية','Medical Equipment',[]],
 ['معدات المطبخ','Kitchen Equipment',[]],
 ['أجهزة التكييف','Air Conditioning Equipment',['اجهزة التكييف']],
 ['معدات رياضية','Sports Equipment',[]],
 ['معدات مكتبية','Office Equipment',[]],
 ['أجهزة كهربائية','Electrical Equipment',['اجهزة كهربائية']],
 ['ألعاب','Toys',['العاب']],
 ['معدات تعليمية','Educational Equipment',[]],
 ['تقنية','Technology',[]],['أجهزة','Equipment',['اجهزة']],
];
const normalize=value=>String(value||'').normalize('NFKC').replace(/[ًٌٍَُِّْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/\s+/g,' ').trim().toLowerCase();
const index=new Map();
for(const [ar,en,aliases] of categories)for(const key of [ar,en,...aliases])index.set(normalize(key),{ar,en});
export function assetCategoryLabel(arabicValue,englishValue,lang){
 const primary=lang==='ar'?arabicValue:englishValue;
 const secondary=lang==='ar'?englishValue:arabicValue;
 const known=index.get(normalize(primary))||index.get(normalize(secondary));
 return known?known[lang==='ar'?'ar':'en']:String(primary||secondary||'').trim();
}
