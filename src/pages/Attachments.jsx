import { useCallback, useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { loadAttachments } from '../utils/attachments';
import { getSignedInvoiceUrl, listAttachmentIndex } from '../data/supabaseData';

function dedupeRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.entityType}-${row.entityId}-${row.kind}`;
    if (!map.has(key) || row.source === 'database') map.set(key, row);
  }
  return [...map.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}

export default function Attachments({ lang, profile }) {
  const ar = lang === 'ar';
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isNursery = profile?.role === 'nursery';
  const refresh = useCallback(async()=>{
    setLoading(true);
    setError('');
    try {
      const live = await listAttachmentIndex(isNursery ? profile?.nursery_id : null);
      const local = loadAttachments().map(row=>({ ...row, source: 'local' }));
      setRows(dedupeRows([...live, ...local]));
    } catch (e) {
      console.error('Attachment center live sync failed', e);
      setRows(loadAttachments().map(row=>({ ...row, source: 'local' })));
      setError(ar?'تعذر تحديث المرفقات من قاعدة البيانات. يتم عرض النسخة المحلية المتاحة.':'Could not refresh database attachments. Showing available local files.');
    } finally {
      setLoading(false);
    }
  },[isNursery,profile?.nursery_id,ar]);

  useEffect(()=>{
    refresh();
    const onUpdate=()=>refresh();
    const onVisible=()=>{if(document.visibilityState==='visible')refresh()};
    window.addEventListener('saams:attachments-updated',onUpdate);
    window.addEventListener('saams:data-updated',onUpdate);
    window.addEventListener('saams:invoice-status-changed',onUpdate);
    window.addEventListener('focus',onUpdate);
    document.addEventListener('visibilitychange',onVisible);
    const timer=setInterval(refresh,30000);
    return()=>{
      clearInterval(timer);
      window.removeEventListener('saams:attachments-updated',onUpdate);
      window.removeEventListener('saams:data-updated',onUpdate);
      window.removeEventListener('saams:invoice-status-changed',onUpdate);
      window.removeEventListener('focus',onUpdate);
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[refresh]);

  const filtered = useMemo(()=>rows.filter(row=>{
    const scopeOk = !isNursery || row.nurseryId === profile?.nursery_id || row.nursery === profile?.nursery;
    const typeOk = type==='all' || row.entityType===type;
    const q=search.toLowerCase();
    const textOk=!q || [row.name,row.entityId,row.nursery,row.supplier,row.kind].join(' ').toLowerCase().includes(q);
    return scopeOk&&typeOk&&textOk;
  }),[rows,search,type,isNursery,profile?.nursery_id,profile?.nursery]);

  async function resolveUrl(row){
    if(row.dataUrl) return row.dataUrl;
    if(row.path) return getSignedInvoiceUrl(row.path,900);
    return '';
  }
  async function openRow(row){
    setSelected(row);setSelectedUrl('');
    try{setSelectedUrl(await resolveUrl(row))}catch(e){console.error(e);setError(ar?'تعذر فتح المرفق.':'Could not open attachment.')}
  }
  async function download(row){
    try{
      const url=await resolveUrl(row);if(!url)return;
      const a=document.createElement('a');a.href=url;a.download=row.name||'attachment';a.target='_blank';a.rel='noopener';a.click();
    }catch(e){console.error(e);setError(ar?'تعذر تنزيل المرفق.':'Could not download attachment.')}
  }
  async function downloadAll(){
    const zip=new JSZip();
    for(const row of filtered){
      try{
        const url=await resolveUrl(row);if(!url)continue;
        if(url.startsWith('data:')){
          const comma=url.indexOf(',');if(comma>-1)zip.file(`${row.entityType}/${row.entityId}/${row.name}`,url.slice(comma+1),{base64:true});
        }else{
          const response=await fetch(url);if(!response.ok)continue;zip.file(`${row.entityType}/${row.entityId}/${row.name}`,await response.blob());
        }
      }catch(e){console.warn('Skipping attachment in ZIP',row,e)}
    }
    const blob=await zip.generateAsync({type:'blob'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='SAAMS_Attachments.zip';a.click();URL.revokeObjectURL(url);
  }

  return <section className="attachments-page">
    <div className="module-heading"><div><span className="eyebrow">SAAMS Official 3.2</span><h1>{ar?'مركز المرفقات':'Attachment Center'}</h1><p>{ar?'مركز حي مرتبط مباشرة بمرفقات الفواتير المحفوظة في Supabase Storage.':'A live center linked directly to invoice files saved in Supabase Storage.'}</p></div><div className="command-center-actions"><button className="secondary-action" onClick={refresh}>↻ {ar?'تحديث':'Refresh'}</button><button className="primary-action" onClick={downloadAll} disabled={!filtered.length}>⇩ {ar?'تنزيل النتائج ZIP':'Download Results ZIP'}</button></div></div>
    {loading&&<div className="dashboard-live-note">{ar?'جاري مزامنة المرفقات...':'Syncing attachments...'}</div>}{error&&<div className="dashboard-live-note error">{error}</div>}
    <div className="attachment-center-stats">
      <article><small>{ar?'إجمالي الملفات':'Total Files'}</small><strong>{filtered.length}</strong></article>
      <article><small>{ar?'فواتير أصلية':'Original Invoices'}</small><strong>{filtered.filter(x=>x.kind==='invoice').length}</strong></article>
      <article><small>{ar?'إثباتات خصم':'Payment Proofs'}</small><strong>{filtered.filter(x=>x.kind==='receipt').length}</strong></article>
    </div>
    <div className="invoice-toolbar attachment-center-toolbar"><div className="invoice-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'بحث باسم الملف أو رقم الفاتورة أو الحضانة أو المورد...':'Search file, invoice, nursery, or supplier...'}/></div><select value={type} onChange={e=>setType(e.target.value)}><option value="all">{ar?'كل الأنواع':'All Types'}</option><option value="invoice">{ar?'الفواتير':'Invoices'}</option><option value="asset">{ar?'الأصول':'Assets'}</option><option value="advance">{ar?'السلف':'Advances'}</option></select></div>
    <div className="attachment-center-grid">
      {filtered.map(row=><article key={row.id} className="attachment-file-card">
        <div className="attachment-file-preview" onClick={()=>openRow(row)}>{row.mime==='application/pdf'?<span>PDF</span>:row.dataUrl?<img src={row.dataUrl} alt={row.name}/>:<span>FILE</span>}</div>
        <div className="attachment-file-info"><small>{row.kind==='receipt'?(ar?'إثبات خصم':'Payment Proof'):(ar?'فاتورة أصلية':'Original Invoice')}</small><strong>{row.name}</strong><span>{row.entityId} · {row.nursery||'—'}</span><em>{row.source==='database'?(ar?'محفوظ في قاعدة البيانات':'Database'):(ar?'محلي':'Local')}</em></div>
        <div className="attachment-file-actions"><button onClick={()=>openRow(row)}>{ar?'عرض':'View'}</button><button onClick={()=>download(row)}>⇩</button></div>
      </article>)}
      {!filtered.length&&<div className="invoice-empty attachment-empty">▤<strong>{ar?'لا توجد مرفقات محفوظة بعد. أي ملف يُحفظ مع فاتورة سيظهر هنا تلقائيًا.':'No saved attachments yet. Files saved with invoices will appear here automatically.'}</strong></div>}
    </div>
    {selected&&<div className="full-attachment-overlay" onClick={()=>{setSelected(null);setSelectedUrl('')}}><div className="full-attachment-modal" onClick={e=>e.stopPropagation()}><div className="full-attachment-header"><div><small>{selected.entityId}</small><strong>{selected.name}</strong></div><div className="full-attachment-actions"><button onClick={()=>download(selected)}>⇩</button><button className="full-attachment-close" onClick={()=>{setSelected(null);setSelectedUrl('')}}>×</button></div></div><div className="full-attachment-content">{!selectedUrl?<div className="dashboard-empty-state"><span>{ar?'جاري فتح المرفق...':'Opening attachment...'}</span></div>:selected.mime==='application/pdf'?<iframe src={selectedUrl}/>:<img src={selectedUrl} alt={selected.name}/>}</div></div></div>}
  </section>
}
