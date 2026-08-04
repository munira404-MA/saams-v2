import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

const NURSERIES = ['كل الحضانات','الرحمانية الجديدة','اللؤلؤية','واسط 2','السيوح','القليعة','البديع','البستان'];

const ASSETS = [
  { barcode:'SEA-000427', name:'خزانة تخزين خشبية', category:'أثاث', nursery:'واسط 2', status:'نشط', value:1850, purchaseDate:'2024-09-12' },
  { barcode:'SEA-000284', name:'طاولة أطفال مستديرة', category:'أثاث', nursery:'اللؤلؤية', status:'فائض', value:720, purchaseDate:'2023-03-18' },
  { barcode:'SEA-000591', name:'جهاز حاسوب مكتبي', category:'تقنية', nursery:'الرحمانية الجديدة', status:'نشط', value:3200, purchaseDate:'2025-01-08' },
  { barcode:'SEA-000344', name:'مكيف سبليت', category:'أجهزة', nursery:'البديع', status:'قيد النقل', value:4100, purchaseDate:'2022-07-02' },
  { barcode:'SEA-000198', name:'ثلاجة صغيرة', category:'أجهزة', nursery:'السيوح', status:'نشط', value:980, purchaseDate:'2023-11-14' },
];

const ASSET_REQUESTS = [
  { requestNo:'AST-REQ-026', type:'نقل', barcode:'SEA-000427', asset:'خزانة تخزين خشبية', from:'واسط 2', to:'البستان', reason:'الحاجة إلى الخزانة في غرفة المصادر', status:'قيد الاعتماد', date:'2026-08-04' },
  { requestNo:'AST-REQ-025', type:'فائض', barcode:'SEA-000284', asset:'طاولة أطفال مستديرة', from:'اللؤلؤية', to:'—', reason:'فائض بعد إعادة توزيع الفصول', status:'معتمد', date:'2026-08-03' },
  { requestNo:'AST-REQ-024', type:'إسقاط', barcode:'SEA-000198', asset:'ثلاجة صغيرة', from:'السيوح', to:'—', reason:'تلف كامل وعدم جدوى الإصلاح', status:'مرفوض', date:'2026-08-02' },
];

const INVOICES = [
  { invoiceNo:'INV-2026-141', supplier:'جمعية الشارقة', nursery:'الرحمانية الجديدة', advance:'سلفة أغسطس وسبتمبر 2026', date:'2026-08-04', beforeVat:408.10, vat:20.40, total:428.50, payment:'بطاقة', status:'معتمدة' },
  { invoiceNo:'INV-2026-140', supplier:'سوبرماركت المدينة', nursery:'واسط 2', advance:'سلفة أغسطس وسبتمبر 2026', date:'2026-08-03', beforeVat:120.48, vat:6.02, total:126.50, payment:'نقد', status:'قيد الاعتماد' },
  { invoiceNo:'INV-2026-134', supplier:'مكتبة دبي للتوزيع', nursery:'الرحمانية الجديدة', advance:'سلفة أغسطس وسبتمبر 2026', date:'2026-08-03', beforeVat:300, vat:15, total:315, payment:'بطاقة', status:'معتمدة' },
  { invoiceNo:'INV-2026-133', supplier:'مركز الإمارات للقرطاسية', nursery:'اللؤلؤية', advance:'سلفة أغسطس وسبتمبر 2026', date:'2026-08-02', beforeVat:480, vat:24, total:504, payment:'نقد', status:'معتمدة' },
  { invoiceNo:'INV-2026-129', supplier:'مطابع الاتحاد', nursery:'السيوح', advance:'سلفة يوليو 2026', date:'2026-07-22', beforeVat:391.19, vat:19.56, total:410.75, payment:'بطاقة', status:'معادة للحضانة' },
];

const ADVANCES = [
  { advanceNo:'ADV-2026-008', name:'سلفة أغسطس وسبتمبر 2026', type:'شهرية', nursery:'الرحمانية الجديدة', from:'2026-08-01', to:'2026-09-30', allocated:2500, spent:743.50, remaining:1756.50, invoices:2, status:'مفتوحة' },
  { advanceNo:'ADV-2026-008', name:'سلفة أغسطس وسبتمبر 2026', type:'شهرية', nursery:'اللؤلؤية', from:'2026-08-01', to:'2026-09-30', allocated:2200, spent:504, remaining:1696, invoices:1, status:'مفتوحة' },
  { advanceNo:'ADV-2026-008', name:'سلفة أغسطس وسبتمبر 2026', type:'شهرية', nursery:'واسط 2', from:'2026-08-01', to:'2026-09-30', allocated:2400, spent:126.50, remaining:2273.50, invoices:1, status:'مفتوحة' },
  { advanceNo:'ADV-2026-007', name:'سلفة نشاط التخرج 2026', type:'فعالية', nursery:'البديع', from:'2026-06-01', to:'2026-06-30', allocated:1500, spent:1150, remaining:350, invoices:2, status:'مغلقة' },
  { advanceNo:'ADV-2026-006', name:'سلفة يوليو 2026', type:'شهرية', nursery:'السيوح', from:'2026-07-01', to:'2026-07-31', allocated:1800, spent:410.75, remaining:1389.25, invoices:1, status:'مغلقة' },
];

const COPY = {
  ar:{title:'التقارير',sub:'تقارير الأصول والفواتير والسلف، مع تقرير شامل وتصدير كل تقرير إلى Excel.',assets:'تقرير الأصول',invoices:'تقرير الفواتير',advances:'تقرير السلف',comprehensive:'التقرير الشامل',download:'تصدير Excel',downloadAll:'تصدير التقرير الشامل',nursery:'الحضانة',from:'من تاريخ',to:'إلى تاريخ',status:'الحالة',all:'الكل',search:'بحث داخل التقرير...',records:'عدد السجلات',totalValue:'إجمالي القيمة',totalInvoices:'إجمالي الفواتير',totalAllocated:'إجمالي السلف',totalSpent:'إجمالي المصروف',totalRemaining:'إجمالي المتبقي',preview:'معاينة التقرير',noData:'لا توجد بيانات مطابقة للتصفية.',reset:'إعادة التصفية'},
  en:{title:'Reports',sub:'Asset, invoice, advance and comprehensive reports with Excel export.',assets:'Asset Report',invoices:'Invoice Report',advances:'Advance Report',comprehensive:'Comprehensive Report',download:'Export Excel',downloadAll:'Export Comprehensive',nursery:'Nursery',from:'From Date',to:'To Date',status:'Status',all:'All',search:'Search report...',records:'Records',totalValue:'Total Value',totalInvoices:'Invoice Total',totalAllocated:'Total Advances',totalSpent:'Total Spent',totalRemaining:'Total Remaining',preview:'Report Preview',noData:'No data matches the filters.',reset:'Reset Filters'}
};

const money = n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const safe = v => String(v ?? '').toLowerCase();
const dateInRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);

function autoWidth(rows){
  const keys = Object.keys(rows[0] || {});
  return keys.map(k => ({wch: Math.min(42, Math.max(k.length + 2, ...rows.map(r => String(r[k] ?? '').length + 2)))}));
}
function addSheet(workbook, name, rows){
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);
  ws['!freeze'] = {xSplit:0,ySplit:1};
  XLSX.utils.book_append_sheet(workbook, ws, name.slice(0,31));
}

export default function Reports({lang}){
  const ar = lang === 'ar';
  const t = COPY[lang] || COPY.ar;
  const [tab,setTab] = useState('assets');
  const [filters,setFilters] = useState({nursery:'كل الحضانات',from:'',to:'',status:'الكل',search:''});
  const [toast,setToast] = useState('');

  const filtered = useMemo(() => {
    const term = safe(filters.search);
    const baseFilter = row => (filters.nursery==='كل الحضانات' || row.nursery===filters.nursery) && dateInRange(row.date || row.purchaseDate || row.from, filters.from, filters.to) && (filters.status==='الكل' || row.status===filters.status) && (!term || Object.values(row).some(v=>safe(v).includes(term)));
    return {
      assets: ASSETS.filter(baseFilter),
      invoices: INVOICES.filter(baseFilter),
      advances: ADVANCES.filter(baseFilter),
      assetRequests: ASSET_REQUESTS.filter(row => dateInRange(row.date, filters.from, filters.to) && (filters.status==='الكل' || row.status===filters.status) && (!term || Object.values(row).some(v=>safe(v).includes(term))))
    };
  },[filters]);

  const summary = {
    assetCount: filtered.assets.length,
    assetValue: filtered.assets.reduce((s,r)=>s+r.value,0),
    invoiceCount: filtered.invoices.length,
    invoiceTotal: filtered.invoices.reduce((s,r)=>s+r.total,0),
    allocated: filtered.advances.reduce((s,r)=>s+r.allocated,0),
    spent: filtered.advances.reduce((s,r)=>s+r.spent,0),
    remaining: filtered.advances.reduce((s,r)=>s+r.remaining,0),
  };

  const tabs = [
    {id:'assets',label:t.assets,icon:'◇'},
    {id:'invoices',label:t.invoices,icon:'▤'},
    {id:'advances',label:t.advances,icon:'▥'},
    {id:'comprehensive',label:t.comprehensive,icon:'▦'}
  ];

  function notify(msg){setToast(msg);setTimeout(()=>setToast(''),2300)}
  function workbookFor(kind){
    const wb = XLSX.utils.book_new();
    const assetRows = filtered.assets.map(r=> ar ? {'رقم الباركود':r.barcode,'اسم الأصل':r.name,'الفئة':r.category,'الحضانة':r.nursery,'الحالة':r.status,'القيمة':r.value,'تاريخ الشراء':r.purchaseDate} : r);
    const requestRows = filtered.assetRequests.map(r=> ar ? {'رقم الطلب':r.requestNo,'نوع الطلب':r.type,'رقم الباركود':r.barcode,'الأصل':r.asset,'من':r.from,'إلى':r.to,'السبب':r.reason,'الحالة':r.status,'التاريخ':r.date} : r);
    const invoiceRows = filtered.invoices.map(r=> ar ? {'رقم الفاتورة':r.invoiceNo,'المورد':r.supplier,'الحضانة':r.nursery,'السلفة':r.advance,'التاريخ':r.date,'قبل الضريبة':r.beforeVat,'الضريبة':r.vat,'الإجمالي':r.total,'الدفع':r.payment,'الحالة':r.status} : r);
    const advanceRows = filtered.advances.map(r=> ar ? {'رقم السلفة':r.advanceNo,'اسم السلفة':r.name,'النوع':r.type,'الحضانة':r.nursery,'من':r.from,'إلى':r.to,'المخصص':r.allocated,'المصروف':r.spent,'المتبقي':r.remaining,'عدد الفواتير':r.invoices,'الحالة':r.status} : r);
    const summaryRows = ar ? [
      {'المؤشر':'عدد الأصول','القيمة':summary.assetCount},{'المؤشر':'قيمة الأصول','القيمة':summary.assetValue},{'المؤشر':'عدد الفواتير','القيمة':summary.invoiceCount},{'المؤشر':'إجمالي الفواتير','القيمة':summary.invoiceTotal},{'المؤشر':'إجمالي السلف','القيمة':summary.allocated},{'المؤشر':'إجمالي المصروف','القيمة':summary.spent},{'المؤشر':'إجمالي المتبقي','القيمة':summary.remaining}
    ] : [
      {Metric:'Asset Count',Value:summary.assetCount},{Metric:'Asset Value',Value:summary.assetValue},{Metric:'Invoice Count',Value:summary.invoiceCount},{Metric:'Invoice Total',Value:summary.invoiceTotal},{Metric:'Allocated Advances',Value:summary.allocated},{Metric:'Spent',Value:summary.spent},{Metric:'Remaining',Value:summary.remaining}
    ];
    if(kind==='assets'){addSheet(wb,ar?'الأصول':'Assets',assetRows);addSheet(wb,ar?'طلبات الأصول':'Asset Requests',requestRows)}
    if(kind==='invoices') addSheet(wb,ar?'الفواتير':'Invoices',invoiceRows);
    if(kind==='advances') addSheet(wb,ar?'السلف':'Advances',advanceRows);
    if(kind==='comprehensive'){addSheet(wb,ar?'الملخص':'Summary',summaryRows);addSheet(wb,ar?'الأصول':'Assets',assetRows);addSheet(wb,ar?'طلبات الأصول':'Asset Requests',requestRows);addSheet(wb,ar?'الفواتير':'Invoices',invoiceRows);addSheet(wb,ar?'السلف':'Advances',advanceRows)}
    return wb;
  }
  function exportExcel(kind){
    XLSX.writeFile(workbookFor(kind), `SAAMS_${kind}_${new Date().toISOString().slice(0,10)}.xlsx`);
    notify(ar?'تم تصدير التقرير إلى Excel بنجاح':'Report exported successfully');
  }
  function reset(){setFilters({nursery:'كل الحضانات',from:'',to:'',status:'الكل',search:''})}

  return <section className="reports-page">
    <div className="module-heading reports-heading">
      <div><span className="eyebrow">SAAMS v5.3</span><h1>{t.title}</h1><p>{t.sub}</p></div>
      <button className="primary-action report-master-export" onClick={()=>exportExcel('comprehensive')}>⇩ {t.downloadAll}</button>
    </div>

    <div className="report-type-grid">
      {tabs.map(item=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.id==='assets'?`${summary.assetCount} ${t.records}`:item.id==='invoices'?`${summary.invoiceCount} ${t.records}`:item.id==='advances'?`${filtered.advances.length} ${t.records}`:`4 ${ar?'أوراق Excel':'Excel sheets'}`}</small></button>)}
    </div>

    <div className="report-filter-panel">
      <label><span>{t.nursery}</span><select value={filters.nursery} onChange={e=>setFilters({...filters,nursery:e.target.value})}>{NURSERIES.map(n=><option key={n}>{n}</option>)}</select></label>
      <label><span>{t.from}</span><input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label><span>{t.to}</span><input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <label><span>{t.status}</span><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option>الكل</option><option>نشط</option><option>معتمدة</option><option>قيد الاعتماد</option><option>مفتوحة</option><option>مغلقة</option><option>مرفوض</option></select></label>
      <label className="report-search"><span>{t.search}</span><input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder={t.search}/></label>
      <button className="report-reset" onClick={reset}>↻ {t.reset}</button>
    </div>

    <div className="report-summary-grid">
      {(tab==='assets'||tab==='comprehensive')&&<><article><span>◇</span><small>{t.records}</small><strong>{summary.assetCount}</strong></article><article><span>◉</span><small>{t.totalValue}</small><strong>{money(summary.assetValue)} <b>AED</b></strong></article></>}
      {(tab==='invoices'||tab==='comprehensive')&&<><article><span>▤</span><small>{t.records}</small><strong>{summary.invoiceCount}</strong></article><article><span>↗</span><small>{t.totalInvoices}</small><strong>{money(summary.invoiceTotal)} <b>AED</b></strong></article></>}
      {(tab==='advances'||tab==='comprehensive')&&<><article><span>▥</span><small>{t.totalAllocated}</small><strong>{money(summary.allocated)} <b>AED</b></strong></article><article><span>↘</span><small>{t.totalSpent}</small><strong>{money(summary.spent)} <b>AED</b></strong></article><article><span>◉</span><small>{t.totalRemaining}</small><strong>{money(summary.remaining)} <b>AED</b></strong></article></>}
    </div>

    <div className="report-preview-card">
      <div className="report-preview-head"><div><small>{t.preview}</small><h2>{tabs.find(x=>x.id===tab)?.label}</h2></div><button onClick={()=>exportExcel(tab)}>⇩ {t.download}</button></div>
      {tab==='assets'&&<AssetsTable rows={filtered.assets} ar={ar} empty={t.noData}/>} 
      {tab==='invoices'&&<InvoicesTable rows={filtered.invoices} ar={ar} empty={t.noData}/>} 
      {tab==='advances'&&<AdvancesTable rows={filtered.advances} ar={ar} empty={t.noData}/>} 
      {tab==='comprehensive'&&<ComprehensivePreview summary={summary} rows={filtered} ar={ar}/>} 
    </div>
    {toast&&<div className="asset-toast">✓ {toast}</div>}
  </section>
}

function Empty({text}){return <div className="report-empty">▦<strong>{text}</strong></div>}
function AssetsTable({rows,ar,empty}){if(!rows.length)return <Empty text={empty}/>;return <div className="report-table-wrap"><table><thead><tr><th>{ar?'الباركود':'Barcode'}</th><th>{ar?'اسم الأصل':'Asset'}</th><th>{ar?'الفئة':'Category'}</th><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'القيمة':'Value'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{rows.map(r=><tr key={r.barcode}><td><b>{r.barcode}</b></td><td>{r.name}</td><td>{r.category}</td><td>{r.nursery}</td><td>{money(r.value)} AED</td><td><span className="report-status">{r.status}</span></td></tr>)}</tbody></table></div>}
function InvoicesTable({rows,ar,empty}){if(!rows.length)return <Empty text={empty}/>;return <div className="report-table-wrap"><table><thead><tr><th>{ar?'رقم الفاتورة':'Invoice'}</th><th>{ar?'المورد':'Supplier'}</th><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'التاريخ':'Date'}</th><th>{ar?'الإجمالي':'Total'}</th><th>{ar?'الدفع':'Payment'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{rows.map(r=><tr key={r.invoiceNo}><td><b>{r.invoiceNo}</b></td><td>{r.supplier}</td><td>{r.nursery}</td><td>{r.date}</td><td>{money(r.total)} AED</td><td>{r.payment}</td><td><span className="report-status">{r.status}</span></td></tr>)}</tbody></table></div>}
function AdvancesTable({rows,ar,empty}){if(!rows.length)return <Empty text={empty}/>;return <div className="report-table-wrap"><table><thead><tr><th>{ar?'السلفة':'Advance'}</th><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'المخصص':'Allocated'}</th><th>{ar?'المصروف':'Spent'}</th><th>{ar?'المتبقي':'Remaining'}</th><th>{ar?'الفواتير':'Invoices'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.advanceNo}-${i}`}><td><b>{r.name}</b><small>{r.advanceNo}</small></td><td>{r.nursery}</td><td>{money(r.allocated)} AED</td><td>{money(r.spent)} AED</td><td className="remaining-cell">{money(r.remaining)} AED</td><td>{r.invoices}</td><td><span className="report-status">{r.status}</span></td></tr>)}</tbody></table></div>}
function ComprehensivePreview({summary,rows,ar}){return <div className="comprehensive-preview"><div className="comprehensive-hero"><div><small>{ar?'إجمالي القيمة المالية':'Total Financial Value'}</small><strong>{money(summary.invoiceTotal+summary.assetValue+summary.allocated)} AED</strong></div><span>SAAMS</span></div><div className="comprehensive-sections"><article><h3>{ar?'الأصول':'Assets'}</h3><b>{summary.assetCount}</b><p>{money(summary.assetValue)} AED</p></article><article><h3>{ar?'الفواتير':'Invoices'}</h3><b>{summary.invoiceCount}</b><p>{money(summary.invoiceTotal)} AED</p></article><article><h3>{ar?'السلف':'Advances'}</h3><b>{rows.advances.length}</b><p>{money(summary.remaining)} AED {ar?'متبقي':'remaining'}</p></article><article><h3>{ar?'طلبات الأصول':'Asset Requests'}</h3><b>{rows.assetRequests.length}</b><p>{ar?'نقل، فائض، إسقاط':'Transfer, surplus, disposal'}</p></article></div></div>}
