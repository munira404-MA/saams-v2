import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadAuditLog } from '../utils/audit';
import { buildRecommendations } from '../utils/intelligence';
import { listInvoices, listAdvances, listAllAssets, listAuditLogs, listAttachmentIndex } from '../data/supabaseData';

const money = value => `${Number(value || 0).toLocaleString()} AED`;

export default function ExecutiveCommandCenter({ lang, profile, setActive }) {
  const ar = lang === 'ar';
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nurseryId = profile?.role === 'nursery' ? profile?.nursery_id : null;
      const [invoiceRows, advanceRows, assetRows, auditRows, attachmentRows] = await Promise.all([
        listInvoices(),
        listAdvances(),
        listAllAssets(nurseryId),
        listAuditLogs({ nurseryId, limit: 250 }).catch(() => loadAuditLog()),
        listAttachmentIndex(nurseryId),
      ]);
      const scopedInvoices = nurseryId ? invoiceRows.filter(x => x.nurseryId === nurseryId) : invoiceRows;
      const scopedAdvances = nurseryId
        ? advanceRows.map(a => ({ ...a, allocations: (a.allocations || []).filter(x => x.nurseryId === nurseryId) })).filter(a => a.allocations.length)
        : advanceRows;
      setInvoices(scopedInvoices);
      setAdvances(scopedAdvances);
      setAssets(assetRows);
      setLogs(auditRows || []);
      setAttachments(attachmentRows || []);
    } catch (e) {
      console.error('Command center live sync failed', e);
      setError(ar ? 'تعذر تحديث بعض بيانات مركز القيادة. أعيدي المحاولة.' : 'Could not refresh some command-center data.');
    } finally {
      setLoading(false);
    }
  }, [profile?.role, profile?.nursery_id, ar]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('saams:data-updated', onUpdate);
    window.addEventListener('saams:invoice-status-changed', onUpdate);
    window.addEventListener('saams:attachments-updated', onUpdate);
    window.addEventListener('saams:audit-updated', onUpdate);
    window.addEventListener('focus', onUpdate);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('saams:data-updated', onUpdate);
      window.removeEventListener('saams:invoice-status-changed', onUpdate);
      window.removeEventListener('saams:attachments-updated', onUpdate);
      window.removeEventListener('saams:audit-updated', onUpdate);
      window.removeEventListener('focus', onUpdate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const recommendations = useMemo(() => buildRecommendations({ invoices, advances, assets, logs }), [invoices, advances, assets, logs]);
  const approved = invoices.filter(x => String(x.status).toLowerCase() === 'approved');
  const pending = invoices.filter(x => ['pending','review','under_review','قيد المراجعة','قيد الاعتماد'].includes(String(x.status).toLowerCase()));
  const returned = invoices.filter(x => ['returned','rejected','مرفوض','معاد'].includes(String(x.status).toLowerCase()));
  const totalSpend = approved.reduce((sum,row)=>sum+Number(row.total || row.total_amount || 0),0);

  const allocations = advances.flatMap(a => Array.isArray(a.allocations) ? a.allocations : []);
  const allocated = allocations.reduce((sum,row)=>sum+Number(row.allocated || row.amount || 0),0);
  const spent = allocations.reduce((sum,row)=>sum+(row.invoices || []).reduce((s,inv)=>s+Number(inv.amount||0),0),0);
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
    const invoiceResults = invoices.filter(r=>[r.id,r.invoiceNumber,r.supplierAr,r.supplierEn,r.nurseryAr,r.nurseryEn,r.nursery].join(' ').toLowerCase().includes(q)).slice(0,4).map(r=>({type:ar?'فاتورة':'Invoice',title:r.id||r.invoiceNumber,subtitle:`${r.supplierAr||r.supplierEn||'—'} · ${r.nurseryAr||r.nurseryEn||r.nursery||'—'}`,target:'invoices'}));
    const assetResults = assets.filter(r=>[r.barcode,r.nameAr,r.nameEn,r.nurseryAr,r.nurseryEn,r.categoryAr,r.categoryEn].join(' ').toLowerCase().includes(q)).slice(0,4).map(r=>({type:ar?'أصل':'Asset',title:r.barcode||r.id,subtitle:`${r.nameAr||r.nameEn||'—'} · ${r.nurseryAr||r.nurseryEn||'—'}`,target:'assets'}));
    const advanceResults = advances.filter(r=>[r.id,r.nameAr,r.nameEn].join(' ').toLowerCase().includes(q)).slice(0,3).map(r=>({type:ar?'سلفة':'Advance',title:r.nameAr||r.nameEn||r.id,subtitle:r.status||'—',target:'advances'}));
    const attachmentResults = attachments.filter(r=>[r.name,r.entityId,r.nursery,r.supplier].join(' ').toLowerCase().includes(q)).slice(0,3).map(r=>({type:ar?'مرفق':'Attachment',title:r.name,subtitle:`${r.entityId} · ${r.nursery||'—'}`,target:'attachments'}));
    return [...invoiceResults,...assetResults,...advanceResults,...attachmentResults].slice(0,12);
  },[search,invoices,assets,advances,attachments,ar]);

  const kpis = [
    [ar?'إجمالي الأصول':'Total Assets', assets.length, '◇','violet','assets'],
    [ar?'إجمالي الصرف المعتمد':'Approved Spending', money(totalSpend), '▤','blue','invoices'],
    [ar?'المتبقي من السلف':'Advance Balance', money(remaining), '▣','green','advances'],
    [ar?'فواتير بانتظار الإجراء':'Pending Invoices', pending.length, '◷','orange','invoices'],
    [ar?'المرفقات المحفوظة':'Saved Attachments', attachments.length, '▥','teal','attachments'],
    [ar?'طلبات أصول معلقة':'Pending Asset Requests', pendingAssets, '◇','violet','assets'],
  ];

  return <section className="command-center-page">
    <div className="module-heading command-center-heading">
      <div><span className="eyebrow">SAAMS Enterprise Official Release 3.2</span><h1>{ar?'مركز القيادة التنفيذي':'Executive Command Center'}</h1><p>{ar?'واجهة حية مرتبطة مباشرة بالأصول والفواتير والسلف والمرفقات والتقارير.':'A live executive view connected directly to assets, invoices, advances, attachments, and reports.'}</p></div>
      <div className="command-center-actions"><button className="secondary-action" onClick={refresh}>↻ {ar?'تحديث الآن':'Refresh'}</button><button className="secondary-action" onClick={()=>setActive('attachments')}>▥ {ar?'مركز المرفقات':'Attachments'}</button><button className="primary-action" onClick={()=>setActive('reports')}>{ar?'فتح التقرير الشامل':'Open Comprehensive Report'}</button></div>
    </div>
    {loading&&<div className="dashboard-live-note">{ar?'جاري مزامنة بيانات النظام...':'Syncing live system data...'}</div>}
    {error&&<div className="dashboard-live-note error">{error}</div>}

    <div className="command-global-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'بحث شامل: فاتورة، مورد، حضانة، باركود أصل، سلفة، أو مرفق...':'Global search: invoice, supplier, nursery, asset, advance, or attachment...'}/>{search&&<button onClick={()=>setSearch('')}>×</button>}</div>
    {search&&<div className="command-search-results">{results.map((r,i)=><button key={i} onClick={()=>setActive(r.target)}><span>{r.type}</span><div><strong>{r.title}</strong><small>{r.subtitle}</small></div><b>‹</b></button>)}{!results.length&&<p>{ar?'لا توجد نتائج مطابقة.':'No matching results.'}</p>}</div>}

    <div className="command-kpi-grid">{kpis.map(([label,value,icon,tone,target])=><article className={`command-kpi ${tone}`} key={label} onClick={()=>setActive(target)} role="button" tabIndex={0}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>

    <div className="command-layout">
      <article className="command-card command-wide">
        <div className="command-card-head"><div><h2>{ar?'أكثر الحضانات صرفًا':'Highest Spending Nurseries'}</h2><p>{ar?'حسب الفواتير المعتمدة الفعلية':'Based on live approved invoices'}</p></div><button onClick={()=>setActive('invoices')}>{ar?'الفواتير':'Invoices'}</button></div>
        <div className="command-bars">{nurserySpend.map(([name,value])=><div key={name}><div className="command-bar-label"><strong>{name}</strong><span>{money(value)}</span></div><div className="command-bar-track"><i style={{width:`${Math.max(7,(value/maxNursery)*100)}%`}}/></div></div>)}{!nurserySpend.length&&<p className="command-empty">{ar?'لا توجد فواتير معتمدة بعد.':'No approved invoices yet.'}</p>}</div>
      </article>

      <article className="command-card">
        <div className="command-card-head"><div><h2>{ar?'حالة الفواتير':'Invoice Status'}</h2><p>{ar?'توزيع الحالة الحالية':'Current status distribution'}</p></div></div>
        <div className="command-status-donut"><div className="command-donut"><strong>{invoices.length}</strong><small>{ar?'فاتورة':'Invoices'}</small></div><div className="command-legend"><span><i className="approved"/> {ar?'معتمدة':'Approved'} <b>{approved.length}</b></span><span><i className="pending"/> {ar?'قيد المراجعة':'Pending'} <b>{pending.length}</b></span><span><i className="returned"/> {ar?'معادة / مرفوضة':'Returned'} <b>{returned.length}</b></span></div></div>
      </article>

      <article className="command-card">
        <div className="command-card-head"><div><h2>{ar?'مركز المرفقات':'Attachment Center'}</h2><p>{ar?'المرفقات المحفوظة فعليًا مع الفواتير':'Files actually saved with invoices'}</p></div><button onClick={()=>setActive('attachments')}>{ar?'فتح':'Open'}</button></div>
        <div className="command-status-donut"><div className="command-donut"><strong>{attachments.length}</strong><small>{ar?'ملف':'Files'}</small></div><div className="command-legend"><span><i className="approved"/> {ar?'فواتير أصلية':'Invoices'} <b>{attachments.filter(x=>x.kind==='invoice').length}</b></span><span><i className="pending"/> {ar?'إثباتات خصم':'Proofs'} <b>{attachments.filter(x=>x.kind==='receipt').length}</b></span></div></div>
      </article>

      <article className="command-card">
        <div className="command-card-head"><div><h2>{ar?'أكثر الموردين':'Top Suppliers'}</h2><p>{ar?'حسب قيمة الفواتير المعتمدة':'By approved invoice value'}</p></div></div>
        <div className="command-suppliers">{supplierSpend.map(([name,value],i)=><div key={name}><span>{i+1}</span><div><strong>{name}</strong><small>{money(value)}</small></div><b style={{width:`${Math.max(8,(value/maxSupplier)*100)}%`}}/></div>)}{!supplierSpend.length&&<p className="command-empty">{ar?'لا توجد بيانات موردين بعد.':'No supplier data yet.'}</p>}</div>
      </article>

      <article className="command-card command-wide">
        <div className="command-card-head"><div><h2>{ar?'توصيات الإدارة':'Management Recommendations'}</h2><p>{ar?'تنبيهات وتحليلات تلقائية حسب بيانات النظام الحية':'Automatic alerts from live system data'}</p></div></div>
        <div className="command-recommendations">{recommendations.slice(0,6).map(item=><button key={item.id} className={item.severity} onClick={()=>setActive(item.target)}><span>{item.icon}</span><div><strong>{ar?item.titleAr:item.titleEn}</strong><small>{ar?item.textAr:item.textEn}</small></div><b>‹</b></button>)}</div>
      </article>

      <article className="command-card command-wide">
        <div className="command-card-head"><div><h2>{ar?'آخر النشاطات المهمة':'Latest Key Activity'}</h2><p>{ar?'من سجل العمليات المركزي في Supabase':'From the central Supabase audit log'}</p></div><button onClick={()=>setActive('settings')}>{ar?'سجل العمليات':'Audit Log'}</button></div>
        <div className="command-timeline">{logs.slice(0,10).map(row=><div key={row.id}><span className={`timeline-dot ${row.actionType}`}></span><div><strong>{row.action}</strong><small>{row.user} · {row.details || row.entityId || '—'}</small></div><time>{row.date} · {row.time}</time></div>)}{!logs.length&&<p className="command-empty">{ar?'لا توجد عمليات مسجلة بعد.':'No activity recorded yet.'}</p>}</div>
      </article>
    </div>
  </section>;
}
