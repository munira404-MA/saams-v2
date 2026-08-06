import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { loadAttachments } from '../utils/attachments';

export default function Attachments({ lang, profile }) {
  const ar = lang === 'ar';
  const [rows, setRows] = useState(loadAttachments);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    const refresh=()=>setRows(loadAttachments());
    window.addEventListener('saams:attachments-updated',refresh);
    return()=>window.removeEventListener('saams:attachments-updated',refresh);
  },[]);

  const isNursery = profile?.role === 'nursery';
  const filtered = useMemo(()=>rows.filter(row=>{
    const scopeOk = !isNursery || row.nursery === profile?.nursery;
    const typeOk = type==='all' || row.entityType===type;
    const q=search.toLowerCase();
    const textOk=!q || [row.name,row.entityId,row.nursery,row.supplier,row.kind].join(' ').toLowerCase().includes(q);
    return scopeOk&&typeOk&&textOk;
  }),[rows,search,type,isNursery,profile]);

  function download(row){
    const a=document.createElement('a');a.href=row.dataUrl;a.download=row.name||'attachment';a.click();
  }
  async function downloadAll(){
    const zip=new JSZip();
    filtered.forEach(row=>{
      const comma=row.dataUrl.indexOf(',');
      if(comma>-1) zip.file(`${row.entityType}/${row.entityId}/${row.name}`,row.dataUrl.slice(comma+1),{base64:true});
    });
    const blob=await zip.generateAsync({type:'blob'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='SAAMS_Attachments.zip';a.click();URL.revokeObjectURL(url);
  }

  return <section className="attachments-page">
    <div className="module-heading"><div><span className="eyebrow">SAAMS Official 3.2</span><h1>{ar?'مركز المرفقات':'Attachment Center'}</h1><p>{ar?'جميع الفواتير وإيصالات البطاقات والمستندات المرفوعة في مكان واحد.':'All uploaded invoices, receipts, and documents in one place.'}</p></div><button className="primary-action" onClick={downloadAll} disabled={!filtered.length}>⇩ {ar?'تنزيل النتائج ZIP':'Download Results ZIP'}</button></div>
    <div className="attachment-center-stats">
      <article><small>{ar?'إجمالي الملفات':'Total Files'}</small><strong>{filtered.length}</strong></article>
      <article><small>{ar?'فواتير أصلية':'Original Invoices'}</small><strong>{filtered.filter(x=>x.kind==='invoice').length}</strong></article>
      <article><small>{ar?'إيصالات بطاقة':'Card Receipts'}</small><strong>{filtered.filter(x=>x.kind==='receipt').length}</strong></article>
    </div>
    <div className="invoice-toolbar attachment-center-toolbar"><div className="invoice-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'بحث باسم الملف أو رقم الفاتورة أو الحضانة...':'Search file, invoice, or nursery...'}/></div><select value={type} onChange={e=>setType(e.target.value)}><option value="all">{ar?'كل الأنواع':'All Types'}</option><option value="invoice">{ar?'الفواتير':'Invoices'}</option><option value="asset">{ar?'الأصول':'Assets'}</option><option value="advance">{ar?'السلف':'Advances'}</option></select></div>
    <div className="attachment-center-grid">
      {filtered.map(row=><article key={row.id} className="attachment-file-card">
        <div className="attachment-file-preview" onClick={()=>setSelected(row)}>{row.mime==='application/pdf'?<span>PDF</span>:<img src={row.dataUrl} alt={row.name}/>}</div>
        <div className="attachment-file-info"><small>{row.kind==='receipt'?(ar?'إيصال بطاقة':'Card Receipt'):(ar?'فاتورة أصلية':'Original Invoice')}</small><strong>{row.name}</strong><span>{row.entityId} · {row.nursery||'—'}</span></div>
        <div className="attachment-file-actions"><button onClick={()=>setSelected(row)}>{ar?'عرض':'View'}</button><button onClick={()=>download(row)}>⇩</button></div>
      </article>)}
      {!filtered.length&&<div className="invoice-empty attachment-empty">▤<strong>{ar?'لا توجد مرفقات محفوظة بعد. ارفعي فاتورة من شاشة الفواتير لتظهر هنا.':'No saved attachments yet.'}</strong></div>}
    </div>
    {selected&&<div className="full-attachment-overlay" onClick={()=>setSelected(null)}><div className="full-attachment-modal" onClick={e=>e.stopPropagation()}><div className="full-attachment-header"><div><small>{selected.entityId}</small><strong>{selected.name}</strong></div><div className="full-attachment-actions"><button onClick={()=>download(selected)}>⇩</button><button className="full-attachment-close" onClick={()=>setSelected(null)}>×</button></div></div><div className="full-attachment-content">{selected.mime==='application/pdf'?<iframe src={selected.dataUrl}/>:<img src={selected.dataUrl} alt={selected.name}/>}</div></div></div>}
  </section>
}
