import { useMemo, useState } from 'react';
import { loadAuditLog } from '../utils/audit';
import { getInvoiceRows, getAdvanceRows, getAssetRows, buildRecommendations } from '../utils/intelligence';

const money = value => `${Number(value || 0).toLocaleString()} AED`;

export default function ExecutiveCommandCenter({ lang, setActive }) {
  const ar = lang === 'ar';
  const [search, setSearch] = useState('');
  const logs = useMemo(() => loadAuditLog(), []);
  const invoices = useMemo(() => getInvoiceRows(), []);
  const advances = useMemo(() => getAdvanceRows(), []);
  const assets = useMemo(() => getAssetRows(), []);
  const recommendations = useMemo(() => buildRecommendations({ invoices, advances, assets, logs }), [invoices, advances, assets, logs]);

  const approved = invoices.filter(x => String(x.status).toLowerCase() === 'approved');
  const pending = invoices.filter(x => ['pending','review','under_review','قيد المراجعة','قيد الاعتماد'].includes(String(x.status).toLowerCase()));
  const returned = invoices.filter(x => ['returned','rejected','مرفوض','معاد'].includes(String(x.status).toLowerCase()));
  const totalSpend = approved.reduce((sum,row)=>sum+Number(row.total || row.total_amount || 0),0);

  const allocations = advances.flatMap(a => Array.isArray(a.allocations) ? a.allocations : []);
  const allocated = allocations.reduce((sum,row)=>sum+Number(row.allocated || row.amount || 0),0);
  const spent = allocations.reduce((sum,row)=>sum+Number(row.spent || 0),0);
  const remaining = Math.max(0, allocated-spent);

  const assetRequests = logs.filter(x => x.screen === 'الأصول' && ['transfer','surplus','disposal'].includes(x.actionType));
  const assetDecisions = logs.filter(x => x.screen === 'الأصول' && ['approve','reject'].includes(x.actionType));
  const pendingAssets = Math.max(0, assetRequests.length-assetDecisions.length);

  const nurserySpend = Object.entries(approved.reduce((acc,row)=>{
    const name = row.nurseryAr || row.nursery || row.nurseryEn || 'غير محدد';
    acc[name] = (acc[name] || 0) + Number(row.total || row.total_amount || 0);
    return acc;
  },{})).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const supplierSpend = Object.entries(approved.reduce((acc,row)=>{
    const name = row.supplierAr || row.supplier || row.supplierEn || 'غير محدد';
    acc[name] = (acc[name] || 0) + Number(row.total || row.total_amount || 0);
    return acc;
  },{})).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const maxNursery = Math.max(...nurserySpend.map(x=>x[1]),1);
  const maxSupplier = Math.max(...supplierSpend.map(x=>x[1]),1);

  const results = useMemo(()=>{
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const a = invoices.filter(r=>[r.id,r.invoiceNumber,r.supplierAr,r.supplierEn,r.nurseryAr,r.nurseryEn,r.nursery].join(' ').toLowerCase().includes(q)).slice(0,5).map(r=>({type:ar?'فاتورة':'Invoice',title:r.id||r.invoiceNumber,subtitle:`${r.supplierAr||r.supplierEn||'—'} · ${r.nurseryAr||r.nurseryEn||r.nursery||'—'}`,target:'invoices'}));
    const b = logs.filter(r=>r.screen==='الأصول'&&[r.entityId,r.details,r.nursery,r.user].join(' ').toLowerCase().includes(q)).slice(0,5).map(r=>({type:ar?'أصل':'Asset',title:r.entityId||r.action,subtitle:r.details||r.nursery||'—',target:'assets'}));
    const c = advances.filter(r=>[r.id,r.nameAr,r.nameEn].join(' ').toLowerCase().includes(q)).slice(0,5).map(r=>({type:ar?'سلفة':'Advance',title:r.nameAr||r.nameEn||r.id,subtitle:r.status||'—',target:'advances'}));
    return [...a,...b,...c].slice(0,10);
  },[search,invoices,logs,advances,ar]);

  const kpis = [
    [ar?'إجمالي الصرف المعتمد':'Approved Spending', money(totalSpend), '▤','blue'],
    [ar?'المتبقي من السلف':'Advance Balance', money(remaining), '▣','green'],
    [ar?'فواتير بانتظار الإجراء':'Pending Invoices', pending.length, '◷','orange'],
    [ar?'طلبات أصول معلقة':'Pending Asset Requests', pendingAssets, '◇','violet'],
    [ar?'الفواتير المعادة':'Returned Invoices', returned.length, '↺','red'],
  ];

  return <section className="command-center-page">
    <div className="module-heading command-center-heading">
      <div><span className="eyebrow">SAAMS Enterprise v3.0</span><h1>{ar?'مركز القيادة التنفيذي':'Executive Command Center'}</h1><p>{ar?'واجهة مختصرة للإدارة العليا تعرض الأداء والمخاطر والحركات المهمة في مكان واحد.':'A concise executive view of performance, risks, and key activity.'}</p></div>
      <div className="command-center-actions"><button className="secondary-action" onClick={()=>window.print()}>⌘ {ar?'طباعة الملخص':'Print Summary'}</button><button className="primary-action" onClick={()=>setActive('reports')}>{ar?'فتح التقرير الشامل':'Open Comprehensive Report'}</button></div>
    </div>

    <div className="command-global-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'بحث شامل: فاتورة، مورد، حضانة، باركود أصل، أو سلفة...':'Global search: invoice, supplier, nursery, asset, or advance...'}/>{search&&<button onClick={()=>setSearch('')}>×</button>}</div>
    {search&&<div className="command-search-results">{results.map((r,i)=><button key={i} onClick={()=>setActive(r.target)}><span>{r.type}</span><div><strong>{r.title}</strong><small>{r.subtitle}</small></div><b>‹</b></button>)}{!results.length&&<p>{ar?'لا توجد نتائج مطابقة.':'No matching results.'}</p>}</div>}

    <div className="command-kpi-grid">{kpis.map(([label,value,icon,tone])=><article className={`command-kpi ${tone}`} key={label}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>

    <div className="command-layout">
      <article className="command-card command-wide">
        <div className="command-card-head"><div><h2>{ar?'أكثر الحضانات صرفًا':'Highest Spending Nurseries'}</h2><p>{ar?'حسب الفواتير المعتمدة':'Based on approved invoices'}</p></div><button onClick={()=>setActive('invoices')}>{ar?'الفواتير':'Invoices'}</button></div>
        <div className="command-bars">{nurserySpend.map(([name,value])=><div key={name}><div className="command-bar-label"><strong>{name}</strong><span>{money(value)}</span></div><div className="command-bar-track"><i style={{width:`${Math.max(7,(value/maxNursery)*100)}%`}}/></div></div>)}{!nurserySpend.length&&<p className="command-empty">{ar?'لا توجد فواتير معتمدة بعد.':'No approved invoices yet.'}</p>}</div>
      </article>

      <article className="command-card">
        <div className="command-card-head"><div><h2>{ar?'حالة الفواتير':'Invoice Status'}</h2><p>{ar?'توزيع الحالة الحالية':'Current status distribution'}</p></div></div>
        <div className="command-status-donut"><div className="command-donut"><strong>{invoices.length}</strong><small>{ar?'فاتورة':'Invoices'}</small></div><div className="command-legend"><span><i className="approved"/> {ar?'معتمدة':'Approved'} <b>{approved.length}</b></span><span><i className="pending"/> {ar?'قيد المراجعة':'Pending'} <b>{pending.length}</b></span><span><i className="returned"/> {ar?'معادة / مرفوضة':'Returned'} <b>{returned.length}</b></span></div></div>
      </article>

      <article className="command-card">
        <div className="command-card-head"><div><h2>{ar?'أكثر الموردين':'Top Suppliers'}</h2><p>{ar?'حسب قيمة الفواتير المعتمدة':'By approved invoice value'}</p></div></div>
        <div className="command-suppliers">{supplierSpend.map(([name,value],i)=><div key={name}><span>{i+1}</span><div><strong>{name}</strong><small>{money(value)}</small></div><b style={{width:`${Math.max(8,(value/maxSupplier)*100)}%`}}/></div>)}{!supplierSpend.length&&<p className="command-empty">{ar?'لا توجد بيانات موردين بعد.':'No supplier data yet.'}</p>}</div>
      </article>

      <article className="command-card command-wide">
        <div className="command-card-head"><div><h2>{ar?'توصيات الإدارة':'Management Recommendations'}</h2><p>{ar?'تنبيهات وتحليلات تلقائية حسب بيانات النظام':'Automatic alerts and analysis from system data'}</p></div></div>
        <div className="command-recommendations">{recommendations.slice(0,6).map(item=><button key={item.id} className={item.severity} onClick={()=>setActive(item.target)}><span>{item.icon}</span><div><strong>{ar?item.titleAr:item.titleEn}</strong><small>{ar?item.textAr:item.textEn}</small></div><b>‹</b></button>)}</div>
      </article>

      <article className="command-card command-wide">
        <div className="command-card-head"><div><h2>{ar?'آخر النشاطات المهمة':'Latest Key Activity'}</h2><p>{ar?'من سجل العمليات المركزي':'From the central audit log'}</p></div><button onClick={()=>setActive('settings')}>{ar?'سجل العمليات':'Audit Log'}</button></div>
        <div className="command-timeline">{logs.slice(0,10).map(row=><div key={row.id}><span className={`timeline-dot ${row.actionType}`}></span><div><strong>{row.action}</strong><small>{row.user} · {row.details || row.entityId || '—'}</small></div><time>{row.date} · {row.time}</time></div>)}{!logs.length&&<p className="command-empty">{ar?'لا توجد عمليات مسجلة بعد.':'No activity recorded yet.'}</p>}</div>
      </article>
    </div>
  </section>;
}
