import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { isSupabaseConfigured, listAdvances, listInvoices, listNurseries } from '../data/supabaseData';

// Assets are still shown from the current asset module dataset until that module is migrated to Supabase.
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
];

const COPY = {
  ar:{
    title:'التقارير',sub:'تقارير تشغيلية مباشرة من قاعدة البيانات للفواتير والسلف، مع تقارير حسب الحضانة والسلفة وتصدير Excel.',
    assets:'تقرير الأصول',invoices:'تقرير الفواتير',advances:'تقرير السلف',comprehensive:'التقرير الشامل',download:'تصدير Excel',downloadAll:'تصدير التقرير الشامل',
    nursery:'الحضانة',advance:'السلفة',from:'من تاريخ',to:'إلى تاريخ',status:'الحالة',all:'الكل',allNurseries:'كل الحضانات',allAdvances:'كل السلف',search:'بحث داخل التقرير...',records:'عدد السجلات',totalValue:'إجمالي القيمة',totalInvoices:'إجمالي الفواتير',totalAllocated:'إجمالي السلف',totalSpent:'إجمالي المصروف المعتمد',totalRemaining:'إجمالي المتبقي',preview:'معاينة التقرير',noData:'لا توجد بيانات مطابقة للتصفية.',reset:'إعادة التصفية',pdf:'حفظ PDF',
    loading:'جاري تحديث التقارير من قاعدة البيانات...',connected:'التقارير المالية مرتبطة ببيانات التشغيل الفعلية.',loadFailed:'تعذر تحديث التقارير من قاعدة البيانات.',
    approved:'معتمدة',review:'قيد المراجعة',returned:'معادة للتعديل',rejected:'مرفوضة',open:'مفتوحة',closed:'مغلقة',draft:'مسودة',
    approvedCount:'معتمدة',reviewCount:'بانتظار المراجعة',returnedCount:'معادة للتعديل',proof:'إثبات الخصم',yes:'مرفق',no:'غير مرفق',
  },
  en:{
    title:'Reports',sub:'Live operational reports for invoices and advances with nursery/advance filters and Excel export.',
    assets:'Asset Report',invoices:'Invoice Report',advances:'Advance Report',comprehensive:'Comprehensive Report',download:'Export Excel',downloadAll:'Export Comprehensive',
    nursery:'Nursery',advance:'Advance',from:'From Date',to:'To Date',status:'Status',all:'All',allNurseries:'All Nurseries',allAdvances:'All Advances',search:'Search report...',records:'Records',totalValue:'Total Value',totalInvoices:'Invoice Total',totalAllocated:'Total Advances',totalSpent:'Approved Spent',totalRemaining:'Total Remaining',preview:'Report Preview',noData:'No data matches the filters.',reset:'Reset Filters',pdf:'Save PDF',
    loading:'Refreshing reports from database...',connected:'Financial reports are linked to live operational data.',loadFailed:'Could not refresh reports from database.',
    approved:'Approved',review:'Under Review',returned:'Returned',rejected:'Rejected',open:'Open',closed:'Closed',draft:'Draft',
    approvedCount:'Approved',reviewCount:'Pending Review',returnedCount:'Returned',proof:'Payment Proof',yes:'Attached',no:'Not Attached',
  }
};

const money = n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const safe = v => String(v ?? '').toLowerCase();
const dateInRange = (date, from, to) => (!from || !date || date >= from) && (!to || !date || date <= to);
const statusText = (status, ar) => ({
  approved: ar?'معتمدة':'Approved', review:ar?'قيد المراجعة':'Under Review', returned:ar?'معادة للتعديل':'Returned', rejected:ar?'مرفوضة':'Rejected',
  open:ar?'مفتوحة':'Open', closed:ar?'مغلقة':'Closed', draft:ar?'مسودة':'Draft'
}[status] || status || '—');

function autoWidth(rows){
  const keys = Object.keys(rows[0] || {});
  return keys.map(k => ({wch: Math.min(45, Math.max(k.length + 2, ...rows.map(r => String(r[k] ?? '').length + 2)))}));
}
function addSheet(workbook, name, rows){
  const safeRows = rows.length ? rows : [{ '—':'—' }];
  const ws = XLSX.utils.json_to_sheet(safeRows);
  ws['!cols'] = autoWidth(safeRows);
  ws['!freeze'] = {xSplit:0,ySplit:1};
  let sheetName = String(name || 'Sheet').replace(/[\\/?*\[\]:]/g,' ').slice(0,31) || 'Sheet';
  let candidate = sheetName, index = 2;
  while (workbook.SheetNames.includes(candidate)) candidate = `${sheetName.slice(0,27)} ${index++}`.slice(0,31);
  XLSX.utils.book_append_sheet(workbook, ws, candidate);
}

export default function Reports({lang,profile}){
  const ar = lang === 'ar';
  const isNursery = profile?.role === 'nursery';
  const accountNursery = profile?.nursery || '';
  const t = COPY[lang] || COPY.ar;
  const databaseMode = isSupabaseConfigured();
  const [tab,setTab] = useState('invoices');
  const [filters,setFilters] = useState({nursery:isNursery?accountNursery:t.allNurseries,advance:t.allAdvances,from:'',to:'',status:t.all,search:''});
  const [toast,setToast] = useState('');
  const [loading,setLoading] = useState(databaseMode);
  const [loadError,setLoadError] = useState('');
  const [nurseryRows,setNurseryRows] = useState([]);
  const [invoiceRows,setInvoiceRows] = useState([]);
  const [advanceRows,setAdvanceRows] = useState([]);

  useEffect(()=>{
    setFilters(current=>({...current,nursery:isNursery?accountNursery:t.allNurseries,advance:t.allAdvances,status:t.all}));
  },[lang,isNursery,accountNursery]);

  useEffect(()=>{
    if(!databaseMode){ setLoading(false); return; }
    let active=true;
    const refresh = async()=>{
      setLoading(true);setLoadError('');
      try{
        const [nurseries,invoices,advances]=await Promise.all([listNurseries(),listInvoices(),listAdvances()]);
        if(!active)return;
        setNurseryRows((nurseries||[]).filter(n=>n.active!==false));
        setInvoiceRows((invoices||[]).map(row=>({
          invoiceNo:row.id||'—', supplier:ar?row.supplierAr:row.supplierEn, nursery:ar?row.nurseryAr:row.nurseryEn,
          nurseryAr:row.nurseryAr,nurseryEn:row.nurseryEn, advance:ar?row.advanceAr:row.advanceEn, advanceAr:row.advanceAr,advanceEn:row.advanceEn,
          date:row.date||'', beforeVat:Number(row.subtotal||Math.max(0,row.total-row.vat)), vat:Number(row.vat||0), total:Number(row.total||0),
          payment:row.payment||'', status:row.status||'review', trn:row.trn||'', proof:Boolean(row.receiptPath), receiptPath:row.receiptPath||'', attachmentPath:row.attachmentPath||''
        })));
        const flat=[];
        (advances||[]).forEach(advance=>{
          (advance.allocations||[]).forEach(allocation=>{
            const allInvoices=allocation.allInvoices||[];
            const approved=allInvoices.filter(x=>x.status==='approved');
            const spent=approved.reduce((s,x)=>s+Number(x.amount||0),0);
            const allocated=Number(allocation.allocated||0);
            flat.push({
              advanceNo:advance.id,name:ar?advance.nameAr:advance.nameEn,nameAr:advance.nameAr,nameEn:advance.nameEn,type:advance.type,
              nursery:ar?allocation.nurseryAr:allocation.nurseryEn,nurseryAr:allocation.nurseryAr,nurseryEn:allocation.nurseryEn,
              from:advance.from||'',to:advance.to||'',allocated,spent,remaining:Math.max(0,allocated-spent),invoices:allInvoices.length,
              approved:approved.length,review:allInvoices.filter(x=>x.status==='review').length,returned:allInvoices.filter(x=>x.status==='returned').length,
              status:advance.status
            });
          });
        });
        setAdvanceRows(flat);
      }catch(error){ if(active){setLoadError(error?.message||t.loadFailed);} }
      finally{if(active)setLoading(false);}
    };
    refresh();
    window.addEventListener('focus',refresh);
    window.addEventListener('saams:invoice-status-changed',refresh);
    return()=>{active=false;window.removeEventListener('focus',refresh);window.removeEventListener('saams:invoice-status-changed',refresh);};
  },[databaseMode,ar]);

  const nurseryOptions = useMemo(()=>{
    const names=nurseryRows.map(n=>ar?n.name_ar:n.name_en).filter(Boolean);
    return [t.allNurseries,...names];
  },[nurseryRows,ar,t.allNurseries]);

  const advanceOptions = useMemo(()=>[t.allAdvances,...Array.from(new Set(advanceRows.map(x=>x.name).filter(Boolean)))],[advanceRows,t.allAdvances]);

  const filtered = useMemo(() => {
    const term=safe(filters.search);
    const effectiveNursery=isNursery?accountNursery:filters.nursery;
    const nurseryMatch=row=>effectiveNursery===t.allNurseries || row.nursery===effectiveNursery || row.nurseryAr===effectiveNursery || row.nurseryEn===effectiveNursery;
    const advanceMatch=row=>filters.advance===t.allAdvances || row.advance===filters.advance || row.name===filters.advance || row.advanceAr===filters.advance || row.advanceEn===filters.advance || row.nameAr===filters.advance || row.nameEn===filters.advance;
    const statusMatch=row=>filters.status===t.all || statusText(row.status,ar)===filters.status || row.status===filters.status;
    const textMatch=row=>!term || Object.values(row).some(v=>safe(v).includes(term));
    return {
      assets:ASSETS.filter(row=>nurseryMatch(row)&&dateInRange(row.purchaseDate,filters.from,filters.to)&&statusMatch(row)&&textMatch(row)),
      invoices:invoiceRows.filter(row=>nurseryMatch(row)&&advanceMatch(row)&&dateInRange(row.date,filters.from,filters.to)&&statusMatch(row)&&textMatch(row)),
      advances:advanceRows.filter(row=>nurseryMatch(row)&&advanceMatch(row)&&dateInRange(row.from,filters.from,filters.to)&&statusMatch(row)&&textMatch(row)),
      assetRequests:ASSET_REQUESTS.filter(row=>(!isNursery||row.from===accountNursery)&&dateInRange(row.date,filters.from,filters.to)&&textMatch(row))
    };
  },[filters,isNursery,accountNursery,t.allNurseries,t.allAdvances,t.all,invoiceRows,advanceRows,ar]);

  const summary = useMemo(()=>({
    assetCount:filtered.assets.length,assetValue:filtered.assets.reduce((s,r)=>s+Number(r.value||0),0),
    invoiceCount:filtered.invoices.length,invoiceTotal:filtered.invoices.reduce((s,r)=>s+Number(r.total||0),0),
    approvedInvoices:filtered.invoices.filter(r=>r.status==='approved').length,reviewInvoices:filtered.invoices.filter(r=>r.status==='review').length,returnedInvoices:filtered.invoices.filter(r=>r.status==='returned').length,
    allocated:filtered.advances.reduce((s,r)=>s+Number(r.allocated||0),0),spent:filtered.advances.reduce((s,r)=>s+Number(r.spent||0),0),remaining:filtered.advances.reduce((s,r)=>s+Number(r.remaining||0),0),
  }),[filtered]);

  const tabs=[{id:'invoices',label:t.invoices,icon:'▤'},{id:'advances',label:t.advances,icon:'▥'},{id:'assets',label:t.assets,icon:'◇'},{id:'comprehensive',label:t.comprehensive,icon:'▦'}];
  function notify(msg){setToast(msg);setTimeout(()=>setToast(''),2300)}

  function invoiceExcelRows(rows){return rows.map(r=>ar?{
    'رقم الفاتورة':r.invoiceNo,'المورد':r.supplier,'الحضانة':r.nursery,'السلفة':r.advance,'التاريخ':r.date,'قبل الضريبة':r.beforeVat,'الضريبة':r.vat,'الإجمالي':r.total,'طريقة الدفع':r.payment==='card'?'بطاقة':'نقد','الحالة':statusText(r.status,true),'الرقم الضريبي':r.trn,'إثبات الخصم':r.proof?'مرفق':'غير مرفق'
  }:{Invoice:r.invoiceNo,Supplier:r.supplier,Nursery:r.nursery,Advance:r.advance,Date:r.date,Subtotal:r.beforeVat,VAT:r.vat,Total:r.total,Payment:r.payment,Status:statusText(r.status,false),TRN:r.trn,'Payment Proof':r.proof?'Attached':'Not Attached'});}
  function advanceExcelRows(rows){return rows.map(r=>ar?{
    'رقم السلفة':r.advanceNo,'اسم السلفة':r.name,'النوع':r.type,'الحضانة':r.nursery,'من':r.from,'إلى':r.to,'المخصص':r.allocated,'المصروف المعتمد':r.spent,'المتبقي':r.remaining,'عدد الفواتير':r.invoices,'معتمدة':r.approved,'قيد المراجعة':r.review,'معادة للتعديل':r.returned,'الحالة':statusText(r.status,true)
  }:{'Advance No':r.advanceNo,Advance:r.name,Type:r.type,Nursery:r.nursery,From:r.from,To:r.to,Allocated:r.allocated,'Approved Spent':r.spent,Remaining:r.remaining,Invoices:r.invoices,Approved:r.approved,'Under Review':r.review,Returned:r.returned,Status:statusText(r.status,false)});}

  function workbookFor(kind){
    const wb=XLSX.utils.book_new();
    const invRows=invoiceExcelRows(filtered.invoices);
    const advRows=advanceExcelRows(filtered.advances);
    const assetRows=filtered.assets.map(r=>ar?{'رقم الباركود':r.barcode,'اسم الأصل':r.name,'الفئة':r.category,'الحضانة':r.nursery,'الحالة':r.status,'القيمة':r.value,'تاريخ الشراء':r.purchaseDate}:r);
    const summaryRows=ar?[
      {'المؤشر':'عدد الفواتير','القيمة':summary.invoiceCount},{'المؤشر':'إجمالي الفواتير','القيمة':summary.invoiceTotal},{'المؤشر':'الفواتير المعتمدة','القيمة':summary.approvedInvoices},{'المؤشر':'بانتظار المراجعة','القيمة':summary.reviewInvoices},{'المؤشر':'معادة للتعديل','القيمة':summary.returnedInvoices},{'المؤشر':'إجمالي السلف','القيمة':summary.allocated},{'المؤشر':'المصروف المعتمد','القيمة':summary.spent},{'المؤشر':'المتبقي','القيمة':summary.remaining}
    ]:[
      {Metric:'Invoice Count',Value:summary.invoiceCount},{Metric:'Invoice Total',Value:summary.invoiceTotal},{Metric:'Approved Invoices',Value:summary.approvedInvoices},{Metric:'Pending Review',Value:summary.reviewInvoices},{Metric:'Returned',Value:summary.returnedInvoices},{Metric:'Allocated Advances',Value:summary.allocated},{Metric:'Approved Spent',Value:summary.spent},{Metric:'Remaining',Value:summary.remaining}
    ];
    if(kind==='invoices')addSheet(wb,ar?'الفواتير':'Invoices',invRows);
    if(kind==='advances')addSheet(wb,ar?'السلف':'Advances',advRows);
    if(kind==='assets')addSheet(wb,ar?'الأصول':'Assets',assetRows);
    if(kind==='comprehensive'){
      addSheet(wb,ar?'الملخص':'Summary',summaryRows);addSheet(wb,ar?'الفواتير':'Invoices',invRows);addSheet(wb,ar?'السلف':'Advances',advRows);addSheet(wb,ar?'الأصول':'Assets',assetRows);
      const nurseryNames=Array.from(new Set(filtered.invoices.map(r=>r.nursery).filter(Boolean)));
      nurseryNames.forEach(name=>addSheet(wb,name,invoiceExcelRows(filtered.invoices.filter(r=>r.nursery===name))));
    }
    return wb;
  }
  function exportExcel(kind){XLSX.writeFile(workbookFor(kind),`SAAMS_${kind}_${new Date().toISOString().slice(0,10)}.xlsx`);notify(ar?'تم تصدير التقرير إلى Excel بنجاح':'Report exported successfully');}
  function reset(){setFilters({nursery:isNursery?accountNursery:t.allNurseries,advance:t.allAdvances,from:'',to:'',status:t.all,search:''});}

  return <section className="reports-page">
    <div className="module-heading reports-heading"><div><span className="eyebrow">SAAMS Official 3.2</span><h1>{t.title}</h1><p>{t.sub}</p></div><div className="report-heading-actions"><button className="secondary-action" onClick={()=>window.print()}>PDF {t.pdf}</button><button className="primary-action report-master-export" onClick={()=>exportExcel('comprehensive')}>⇩ {t.downloadAll}</button></div></div>
    {databaseMode&&<div className="database-connected-banner">● {t.connected}</div>}
    {loading&&<div className="database-loading-banner">◷ {t.loading}</div>}
    {loadError&&<div className="database-error-banner">! {t.loadFailed} {loadError}</div>}

    <div className="report-type-grid">{tabs.map(item=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.id==='invoices'?`${summary.invoiceCount} ${t.records}`:item.id==='advances'?`${filtered.advances.length} ${t.records}`:item.id==='assets'?`${summary.assetCount} ${t.records}`:`${ar?'تقارير الإدارة':'Management reports'}`}</small></button>)}</div>

    <div className="report-filter-panel">
      <label><span>{t.nursery}</span>{isNursery?<input value={accountNursery} readOnly/>:<select value={filters.nursery} onChange={e=>setFilters({...filters,nursery:e.target.value})}>{nurseryOptions.map(n=><option key={n}>{n}</option>)}</select>}</label>
      <label><span>{t.advance}</span><select value={filters.advance} onChange={e=>setFilters({...filters,advance:e.target.value})}>{advanceOptions.map(n=><option key={n}>{n}</option>)}</select></label>
      <label><span>{t.from}</span><input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label><span>{t.to}</span><input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <label><span>{t.status}</span><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option>{t.all}</option><option>{t.approved}</option><option>{t.review}</option><option>{t.returned}</option><option>{t.rejected}</option><option>{t.open}</option><option>{t.closed}</option><option>{t.draft}</option></select></label>
      <label className="report-search"><span>{t.search}</span><input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder={t.search}/></label>
      <button className="report-reset" onClick={reset}>↻ {t.reset}</button>
    </div>

    <div className="report-summary-grid">
      {(tab==='invoices'||tab==='comprehensive')&&<><article><span>▤</span><small>{t.records}</small><strong>{summary.invoiceCount}</strong></article><article><span>↗</span><small>{t.totalInvoices}</small><strong>{money(summary.invoiceTotal)} <b>AED</b></strong></article><article><span>✓</span><small>{t.approvedCount}</small><strong>{summary.approvedInvoices}</strong></article><article><span>◷</span><small>{t.reviewCount}</small><strong>{summary.reviewInvoices}</strong></article></>}
      {(tab==='advances'||tab==='comprehensive')&&<><article><span>▥</span><small>{t.totalAllocated}</small><strong>{money(summary.allocated)} <b>AED</b></strong></article><article><span>↘</span><small>{t.totalSpent}</small><strong>{money(summary.spent)} <b>AED</b></strong></article><article><span>◉</span><small>{t.totalRemaining}</small><strong>{money(summary.remaining)} <b>AED</b></strong></article></>}
      {tab==='assets'&&<><article><span>◇</span><small>{t.records}</small><strong>{summary.assetCount}</strong></article><article><span>◉</span><small>{t.totalValue}</small><strong>{money(summary.assetValue)} <b>AED</b></strong></article></>}
    </div>

    <div className="report-preview-card"><div className="report-preview-head"><div><small>{t.preview}</small><h2>{tabs.find(x=>x.id===tab)?.label}</h2></div><div className="report-preview-actions"><button onClick={()=>window.print()}>PDF</button><button onClick={()=>exportExcel(tab)}>⇩ {t.download}</button></div></div>
      {tab==='invoices'&&<InvoicesTable rows={filtered.invoices} ar={ar} empty={t.noData}/>} 
      {tab==='advances'&&<AdvancesTable rows={filtered.advances} ar={ar} empty={t.noData}/>} 
      {tab==='assets'&&<AssetsTable rows={filtered.assets} ar={ar} empty={t.noData}/>} 
      {tab==='comprehensive'&&<ComprehensivePreview summary={summary} rows={filtered} ar={ar}/>} 
    </div>
    {toast&&<div className="asset-toast">✓ {toast}</div>}
  </section>;
}

function Empty({text}){return <div className="report-empty">▦<strong>{text}</strong></div>}
function AssetsTable({rows,ar,empty}){if(!rows.length)return <Empty text={empty}/>;return <div className="report-table-wrap"><table><thead><tr><th>{ar?'الباركود':'Barcode'}</th><th>{ar?'اسم الأصل':'Asset'}</th><th>{ar?'الفئة':'Category'}</th><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'القيمة':'Value'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{rows.map(r=><tr key={r.barcode}><td><b>{r.barcode}</b></td><td>{r.name}</td><td>{r.category}</td><td>{r.nursery}</td><td>{money(r.value)} AED</td><td><span className="report-status">{r.status}</span></td></tr>)}</tbody></table></div>}
function InvoicesTable({rows,ar,empty}){if(!rows.length)return <Empty text={empty}/>;return <div className="report-table-wrap"><table><thead><tr><th>{ar?'رقم الفاتورة':'Invoice'}</th><th>{ar?'المورد':'Supplier'}</th><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'السلفة':'Advance'}</th><th>{ar?'التاريخ':'Date'}</th><th>{ar?'قبل الضريبة':'Subtotal'}</th><th>{ar?'الضريبة':'VAT'}</th><th>{ar?'الإجمالي':'Total'}</th><th>{ar?'الدفع':'Payment'}</th><th>{ar?'إثبات الخصم':'Proof'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.invoiceNo}-${i}`}><td><b>{r.invoiceNo}</b></td><td>{r.supplier}</td><td>{r.nursery}</td><td>{r.advance||'—'}</td><td>{r.date}</td><td>{money(r.beforeVat)} AED</td><td>{money(r.vat)} AED</td><td><b>{money(r.total)} AED</b></td><td>{r.payment==='card'?(ar?'بطاقة':'Card'):(ar?'نقد':'Cash')}</td><td><span className={`report-proof ${r.proof?'yes':'no'}`}>{r.payment==='card'?(r.proof?(ar?'مرفق':'Attached'):(ar?'غير مرفق':'Missing')):'—'}</span></td><td><span className={`report-status ${r.status}`}>{statusText(r.status,ar)}</span></td></tr>)}</tbody></table></div>}
function AdvancesTable({rows,ar,empty}){if(!rows.length)return <Empty text={empty}/>;return <div className="report-table-wrap"><table><thead><tr><th>{ar?'السلفة':'Advance'}</th><th>{ar?'الحضانة':'Nursery'}</th><th>{ar?'المخصص':'Allocated'}</th><th>{ar?'المصروف المعتمد':'Approved Spent'}</th><th>{ar?'المتبقي':'Remaining'}</th><th>{ar?'الفواتير':'Invoices'}</th><th>{ar?'معتمدة':'Approved'}</th><th>{ar?'مراجعة':'Review'}</th><th>{ar?'معادة':'Returned'}</th><th>{ar?'الحالة':'Status'}</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.advanceNo}-${r.nursery}-${i}`}><td><b>{r.name}</b><small>{r.advanceNo}</small></td><td>{r.nursery}</td><td>{money(r.allocated)} AED</td><td>{money(r.spent)} AED</td><td className="remaining-cell">{money(r.remaining)} AED</td><td>{r.invoices}</td><td>{r.approved}</td><td>{r.review}</td><td>{r.returned}</td><td><span className={`report-status ${r.status}`}>{statusText(r.status,ar)}</span></td></tr>)}</tbody></table></div>}
function ComprehensivePreview({summary,rows,ar}){return <div className="comprehensive-preview"><div className="comprehensive-hero"><div><small>{ar?'الوضع المالي التشغيلي':'Operational Financial Position'}</small><strong>{money(summary.remaining)} AED</strong><p>{ar?'إجمالي المتبقي في السلف ضمن التصفية الحالية':'Total remaining advances in current filter'}</p></div><span>SAAMS</span></div><div className="comprehensive-sections"><article><h3>{ar?'الفواتير':'Invoices'}</h3><b>{summary.invoiceCount}</b><p>{money(summary.invoiceTotal)} AED</p></article><article><h3>{ar?'المعتمدة':'Approved'}</h3><b>{summary.approvedInvoices}</b><p>{ar?'فاتورة':'invoice(s)'}</p></article><article><h3>{ar?'السلف':'Advances'}</h3><b>{rows.advances.length}</b><p>{money(summary.spent)} AED {ar?'مصروف معتمد':'approved spent'}</p></article><article><h3>{ar?'المتبقي':'Remaining'}</h3><b>{money(summary.remaining)}</b><p>AED</p></article></div></div>}
