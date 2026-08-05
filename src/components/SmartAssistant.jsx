import { useState } from 'react';
import { loadAuditLog } from '../utils/audit';
import { loadAttachments } from '../utils/attachments';

export default function SmartAssistant({ lang, profile, onNavigate }) {
  const ar=lang==='ar';
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [messages,setMessages]=useState([{role:'assistant',text:ar?'مرحبًا، اسأليني عن الفواتير أو الأصول أو السلف أو سجل العمليات.':'Hello. Ask about invoices, assets, advances, or activity.'}]);

  function answer(q){
    const text=q.toLowerCase();
    const logs=loadAuditLog();
    const attachments=loadAttachments();
    if(text.includes('فاتور')||text.includes('invoice')){
      const invoiceLogs=logs.filter(x=>x.screen==='الفواتير');
      return ar?`عندي ${invoiceLogs.length} حركة مسجلة على الفواتير، و${attachments.filter(x=>x.entityType==='invoice'&&x.kind==='invoice').length} فاتورة أصلية محفوظة في مركز المرفقات.`:`There are ${invoiceLogs.length} invoice actions and ${attachments.filter(x=>x.entityType==='invoice'&&x.kind==='invoice').length} original invoice files.`;
    }
    if(text.includes('أصل')||text.includes('اصل')||text.includes('asset')){
      const assetLogs=logs.filter(x=>x.screen==='الأصول');
      return ar?`تم تسجيل ${assetLogs.length} حركة أصول تشمل النقل والفائض والإسقاط والاعتمادات.`:`There are ${assetLogs.length} asset actions including transfers, surplus, and disposal.`;
    }
    if(text.includes('سلف')||text.includes('advance')){
      const advanceLogs=logs.filter(x=>x.screen==='السلف');
      return ar?`يوجد ${advanceLogs.length} حركة مسجلة على السلف. افتحي شاشة السلف لمشاهدة المصروف والمتبقي لكل حضانة.`:`There are ${advanceLogs.length} recorded advance actions.`;
    }
    if(text.includes('مرفق')||text.includes('ملف')||text.includes('attachment')){
      return ar?`مركز المرفقات يحتوي حاليًا على ${attachments.length} ملف. أقدر أنقلك له مباشرة.`:`The attachment center currently contains ${attachments.length} files.`;
    }
    if(text.includes('رفض')||text.includes('مرفوض')){
      const rejected=logs.filter(x=>['reject','return'].includes(x.actionType));
      return ar?`تم العثور على ${rejected.length} عملية رفض أو إرجاع في سجل العمليات.`:`There are ${rejected.length} rejected or returned actions.`;
    }
    return ar?'أقدر أساعدج بالبحث عن الفواتير، الأصول، السلف، المرفقات، والعمليات المرفوضة. اكتبي السؤال بشكل مباشر.':'I can help with invoices, assets, advances, attachments, and rejected actions.';
  }

  function send(e){
    e.preventDefault();if(!query.trim())return;
    const q=query.trim();setMessages(m=>[...m,{role:'user',text:q},{role:'assistant',text:answer(q)}]);setQuery('');
  }

  return <>
    <button className="smart-assistant-fab" onClick={()=>setOpen(v=>!v)} aria-label={ar?'المساعد الذكي':'Smart Assistant'}>✦</button>
    {open&&<aside className="smart-assistant-panel">
      <div className="smart-assistant-head"><div><span>✦</span><div><strong>{ar?'المساعد الذكي':'Smart Assistant'}</strong><small>SAAMS AI</small></div></div><button onClick={()=>setOpen(false)}>×</button></div>
      <div className="smart-assistant-messages">{messages.map((m,i)=><div key={i} className={`assistant-message ${m.role}`}>{m.text}</div>)}</div>
      <div className="assistant-shortcuts"><button onClick={()=>onNavigate('invoices')}>{ar?'الفواتير':'Invoices'}</button><button onClick={()=>onNavigate('assets')}>{ar?'الأصول':'Assets'}</button><button onClick={()=>onNavigate('attachments')}>{ar?'المرفقات':'Attachments'}</button></div>
      <form onSubmit={send}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={ar?'اكتبي سؤالك...':'Type your question...'}/><button>➤</button></form>
    </aside>}
  </>
}
