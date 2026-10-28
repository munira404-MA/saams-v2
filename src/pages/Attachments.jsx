import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { loadAttachments } from '../utils/attachments';
import { getSignedInvoiceUrl, listAttachmentIndex } from '../data/supabaseData';

const PAGE_SIZE = 40;
const URL_TTL_SECONDS = 900;

function dedupeRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.entityType}-${row.entityId}-${row.kind}`;
    if (!map.has(key) || row.source === 'database') map.set(key, row);
  }
  return [...map.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}

function extensionOf(row) {
  const m = String(row.path || row.name || '').match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toLowerCase();
  return row.mime === 'application/pdf' ? 'pdf' : 'jpg';
}

// Readable file name for downloads: 26442_فاتورة_الثميد.jpg
function friendlyName(row, ar) {
  const kind = row.kind === 'receipt' ? (ar ? 'إثبات_خصم' : 'payment_proof') : (ar ? 'فاتورة' : 'invoice');
  const parts = [row.entityId, kind, row.nursery].filter(Boolean).map((x) => String(x).replace(/[\\/:*?"<>|\s]+/g, '_'));
  return `${parts.join('_')}.${extensionOf(row)}`;
}

function fileBadge(row) {
  if (row.mime === 'application/pdf') return 'PDF';
  if (/^image\//.test(row.mime || '')) return 'IMG';
  return 'FILE';
}

export default function Attachments({ lang, profile }) {
  const ar = lang === 'ar';
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [nurseryFilter, setNurseryFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState({});
  const [zipProgress, setZipProgress] = useState(null);
  const urlCache = useRef(new Map());
  const firstLoad = useRef(true);

  const isNursery = profile?.role === 'nursery';
  const refresh = useCallback(async()=>{
    // Only the first load shows the loading banner; later refreshes happen quietly.
    if (firstLoad.current) setLoading(true);
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
      firstLoad.current = false;
      setLoading(false);
    }
  },[isNursery,profile?.nursery_id,ar]);

  useEffect(()=>{
    refresh();
    // Refresh when something changes — no constant 30-second reloading of the whole list.
    const onUpdate=(e)=>{const table=e?.detail?.table;if(!table||table==='invoices'||table==='attachments')refresh()};
    window.addEventListener('saams:attachments-updated',onUpdate);
    window.addEventListener('saams:data-updated',onUpdate);
    window.addEventListener('saams:invoice-status-changed',onUpdate);
    return()=>{
      window.removeEventListener('saams:attachments-updated',onUpdate);
      window.removeEventListener('saams:data-updated',onUpdate);
      window.removeEventListener('saams:invoice-status-changed',onUpdate);
    };
  },[refresh]);

  const nurseryOptions = useMemo(()=>{
    const counts = new Map();
    for (const row of rows) { const n=row.nursery||(ar?'غير محددة':'Unassigned'); counts.set(n,(counts.get(n)||0)+1); }
    return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],ar?'ar':'en'));
  },[rows,ar]);

  const filtered = useMemo(()=>rows.filter(row=>{
    const scopeOk = !isNursery || row.nurseryId === profile?.nursery_id || row.nursery === profile?.nursery;
    const nurseryOk = isNursery || nurseryFilter==='all' || (row.nursery||(ar?'غير محددة':'Unassigned'))===nurseryFilter;
    const kindOk = kindFilter==='all' || row.kind===kindFilter;
    const q=search.trim().toLowerCase();
    const textOk=!q || [row.name,row.entityId,row.nursery,row.supplier,row.kind].join(' ').toLowerCase().includes(q);
    return scopeOk&&nurseryOk&&kindOk&&textOk;
  }),[rows,search,nurseryFilter,kindFilter,isNursery,profile?.nursery_id,profile?.nursery,ar]);

  useEffect(()=>{setVisibleCount(PAGE_SIZE)},[search,nurseryFilter,kindFilter]);
  const visible = filtered.slice(0, visibleCount);

  // Signed links are reused for a few minutes instead of being requested on every click.
  async function signedUrl(row, download = false) {
    if (row.dataUrl) return row.dataUrl;
    if (!row.path) return '';
    const key = `${row.path}|${download ? 'd' : 'v'}`;
    const cached = urlCache.current.get(key);
    if (cached && cached.expires > Date.now()) return cached.url;
    const url = await getSignedInvoiceUrl(row.path, URL_TTL_SECONDS, download ? { download: friendlyName(row, ar) } : undefined);
    urlCache.current.set(key, { url, expires: Date.now() + (URL_TTL_SECONDS - 60) * 1000 });
    return url;
  }

  async function openRow(row){
    setSelected(row);setSelectedUrl('');
    try{setSelectedUrl(await signedUrl(row))}catch(e){console.error(e);setError(ar?'تعذر فتح المرفق.':'Could not open attachment.')}
  }

  // Direct download: the browser saves the file itself (with a clear name) instead of opening a tab.
  async function download(row){
    setBusy(b=>({...b,[row.id]:true}));
    try{
      const url=await signedUrl(row,true);if(!url)return;
      const a=document.createElement('a');a.href=url;a.download=friendlyName(row,ar);a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    }catch(e){console.error(e);setError(ar?'تعذر تنزيل المرفق.':'Could not download attachment.')}
    finally{setTimeout(()=>setBusy(b=>{const n={...b};delete n[row.id];return n}),1200)}
  }

  // ZIP: files are fetched 4 at a time with a progress counter, grouped by nursery.
  async function downloadAll(){
    if(zipProgress)return;
    const list=filtered;
    const zip=new JSZip();
    let done=0;
    setZipProgress({done:0,total:list.length});
    const worker=async(queue)=>{
      while(queue.length){
        const row=queue.shift();
        try{
          const folder=String(row.nursery||(ar?'غير محددة':'Unassigned')).replace(/[\\/:*?"<>|]+/g,'_');
          const fileName=`${folder}/${friendlyName(row,ar)}`;
          if(row.dataUrl){
            const comma=row.dataUrl.indexOf(',');if(comma>-1)zip.file(fileName,row.dataUrl.slice(comma+1),{base64:true});
          }else{
            const url=await signedUrl(row);
            if(url){const response=await fetch(url);if(response.ok)zip.file(fileName,await response.blob());}
          }
        }catch(e){console.warn('Skipping attachment in ZIP',row,e)}
        done+=1;setZipProgress({done,total:list.length});
      }
    };
    const queue=[...list];
    try{
      await Promise.all(Array.from({length:Math.min(4,queue.length)},()=>worker(queue)));
      const blob=await zip.generateAsync({type:'blob',compression:'STORE'});
      const label=!isNursery&&nurseryFilter!=='all'?`_${nurseryFilter.replace(/\s+/g,'_')}`:'';
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SAAMS_Attachments${label}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);
    }finally{setZipProgress(null)}
  }

  return <section className="attachments-page">
    <div className="module-heading"><div><span className="eyebrow">SAAMS Official 3.3</span><h1>{ar?'مركز المرفقات':'Attachment Center'}</h1><p>{ar?'مركز حي مرتبط مباشرة بمرفقات الفواتير المحفوظة في Supabase Storage.':'A live center linked directly to invoice files saved in Supabase Storage.'}</p></div><div className="command-center-actions"><button className="secondary-action" onClick={refresh}>↻ {ar?'تحديث':'Refresh'}</button><button className="primary-action" onClick={downloadAll} disabled={!filtered.length||!!zipProgress}>{zipProgress?(ar?`⏳ تجهيز ZIP ${zipProgress.done}/${zipProgress.total}`:`⏳ Preparing ZIP ${zipProgress.done}/${zipProgress.total}`):(ar?'⇩ تنزيل النتائج ZIP':'⇩ Download Results ZIP')}</button></div></div>
    {loading&&<div className="dashboard-live-note">{ar?'جاري مزامنة المرفقات...':'Syncing attachments...'}</div>}{error&&<div className="dashboard-live-note error">{error}</div>}
    <div className="attachment-center-stats">
      <article><small>{ar?'إجمالي الملفات':'Total Files'}</small><strong>{filtered.length}</strong></article>
      <article><small>{ar?'فواتير أصلية':'Original Invoices'}</small><strong>{filtered.filter(x=>x.kind==='invoice').length}</strong></article>
      <article><small>{ar?'إثباتات خصم':'Payment Proofs'}</small><strong>{filtered.filter(x=>x.kind==='receipt').length}</strong></article>
    </div>
    <div className={`invoice-toolbar attachment-center-toolbar ${isNursery?'nursery-scope':''}`}>
      <div className="invoice-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'بحث باسم الملف أو رقم الفاتورة أو المورد...':'Search file, invoice, or supplier...'}/></div>
      {!isNursery&&<select value={nurseryFilter} onChange={e=>setNurseryFilter(e.target.value)} aria-label={ar?'الحضانة':'Nursery'}><option value="all">{ar?`كل الحضانات (${rows.length})`:`All nurseries (${rows.length})`}</option>{nurseryOptions.map(([name,count])=><option key={name} value={name}>{name} ({count})</option>)}</select>}
      <select value={kindFilter} onChange={e=>setKindFilter(e.target.value)} aria-label={ar?'نوع الملف':'File type'}><option value="all">{ar?'الفواتير وإثباتات الخصم':'Invoices & proofs'}</option><option value="invoice">{ar?'الفواتير الأصلية فقط':'Original invoices only'}</option><option value="receipt">{ar?'إثباتات الخصم فقط':'Payment proofs only'}</option></select>
    </div>
    <div className="attachment-center-grid">
      {visible.map(row=><article key={row.id} className="attachment-file-card">
        <div className={`attachment-file-preview badge-${fileBadge(row).toLowerCase()}`} onClick={()=>openRow(row)}>{row.dataUrl&&/^image\//.test(row.mime||'')?<img src={row.dataUrl} alt={row.name} loading="lazy"/>:<span>{fileBadge(row)}</span>}</div>
        <div className="attachment-file-info"><small>{row.kind==='receipt'?(ar?'إثبات خصم':'Payment Proof'):(ar?'فاتورة أصلية':'Original Invoice')}</small><strong>{row.entityId}{row.supplier?` — ${row.supplier}`:''}</strong><span className="attachment-nursery">{row.nursery||'—'}</span><span>{row.createdAt?new Date(row.createdAt).toLocaleDateString('en-GB'):''}</span></div>
        <div className="attachment-file-actions"><button onClick={()=>openRow(row)}>{ar?'عرض':'View'}</button><button onClick={()=>download(row)} disabled={!!busy[row.id]} title={ar?'تنزيل':'Download'}>{busy[row.id]?'⏳':'⇩'}</button></div>
      </article>)}
      {!filtered.length&&!loading&&<div className="invoice-empty attachment-empty">▤<strong>{rows.length?(ar?'لا توجد مرفقات تطابق التصفية الحالية.':'No attachments match the current filter.'):(ar?'لا توجد مرفقات محفوظة بعد. أي ملف يُحفظ مع فاتورة سيظهر هنا تلقائيًا.':'No saved attachments yet. Files saved with invoices will appear here automatically.')}</strong></div>}
    </div>
    {filtered.length>visibleCount&&<div className="attachment-load-more"><button className="secondary-action" onClick={()=>setVisibleCount(c=>c+PAGE_SIZE)}>{ar?`عرض المزيد (${filtered.length-visibleCount} متبقي)`:`Show more (${filtered.length-visibleCount} left)`}</button></div>}
    {selected&&<div className="full-attachment-overlay" onClick={()=>{setSelected(null);setSelectedUrl('')}}><div className="full-attachment-modal" onClick={e=>e.stopPropagation()}><div className="full-attachment-header"><div><small>{selected.nursery||''} · {selected.entityId}</small><strong>{selected.kind==='receipt'?(ar?'إثبات خصم':'Payment Proof'):(ar?'فاتورة أصلية':'Original Invoice')}{selected.supplier?` — ${selected.supplier}`:''}</strong></div><div className="full-attachment-actions"><button onClick={()=>download(selected)} disabled={!!busy[selected.id]}>{busy[selected.id]?'⏳':'⇩'}</button><button className="full-attachment-close" onClick={()=>{setSelected(null);setSelectedUrl('')}}>×</button></div></div><div className="full-attachment-content">{!selectedUrl?<div className="dashboard-empty-state"><span>{ar?'جاري فتح المرفق...':'Opening attachment...'}</span></div>:selected.mime==='application/pdf'?<iframe src={selectedUrl} title={selected.name}/>:<img src={selectedUrl} alt={selected.name} decoding="async"/>}</div></div></div>}
  </section>
}
