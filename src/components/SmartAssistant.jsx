import { useState } from 'react';
import { loadAuditLog } from '../utils/audit';
import { loadAttachments } from '../utils/attachments';
import { answerSystemQuestion } from '../utils/intelligence';

export default function SmartAssistant({ lang, profile, onNavigate }) {
  const ar=lang==='ar';
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [messages,setMessages]=useState([{role:'assistant',text:ar?'مرحبًا، اسأليني عن الفواتير أو الأصول أو السلف أو سجل العمليات.':'Hello. Ask about invoices, assets, advances, or activity.'}]);

  function answer(q){
    return answerSystemQuestion(q,{profile});
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
