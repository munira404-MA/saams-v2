import { useMemo } from 'react';
import { loadAuditLog } from '../utils/audit';

const nurseries = [
  ['اللؤلؤية', 4820], ['واسط 2', 3910], ['القليعة', 3480],
  ['الرحمانية الجديدة', 3150], ['السيوح', 2760], ['البديع', 2410],
];

const suppliers = [
  ['مكتبة دبي للتوزيع', 21], ['مركز الإمارات للقرطاسية', 17],
  ['سوبرماركت المدينة', 14], ['مطابع الاتحاد', 11], ['زهور الشارقة', 8],
];

export default function Executive({ lang, profile, setActive }) {
  const ar = lang === 'ar';
  const logs = useMemo(() => loadAuditLog(), []);
  const cards = [
    [ar?'فواتير هذا الشهر':'Invoices This Month', '184', '▤', 'blue'],
    [ar?'قيمة السلف المفتوحة':'Open Advances', '148,500 AED', '▣', 'teal'],
    [ar?'بانتظار الاعتماد':'Pending Approval', '23', '◷', 'orange'],
    [ar?'طلبات أصول معلقة':'Pending Asset Requests', '9', '◇', 'violet'],
    [ar?'إجمالي الأصول':'Total Assets', '12,846', '◆', 'green'],
  ];

  return (
    <section className="executive-page">
      <div className="module-heading">
        <div><span className="eyebrow">SAAMS v8.0</span><h1>{ar?'لوحة المدير العام':'Executive Dashboard'}</h1><p>{ar?'ملخص تنفيذي موحد للفواتير والسلف والأصول والحضانات.':'Unified executive overview of invoices, advances, assets, and nurseries.'}</p></div>
        <button className="primary-action" onClick={()=>setActive('reports')}>⇩ {ar?'فتح التقرير الشامل':'Open Comprehensive Report'}</button>
      </div>

      <div className="executive-kpis">
        {cards.map(([label,value,icon,tone])=><article className={`executive-kpi ${tone}`} key={label}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>)}
      </div>

      <div className="executive-grid">
        <article className="executive-card executive-wide">
          <div className="executive-card-head"><div><h2>{ar?'أكثر الحضانات صرفًا':'Highest Spending Nurseries'}</h2><p>{ar?'المصروفات المعتمدة خلال الفترة الحالية':'Approved spending in the current period'}</p></div><button onClick={()=>setActive('advances')}>{ar?'عرض السلف':'View Advances'}</button></div>
          <div className="executive-bars">{nurseries.map(([name,value],i)=><div key={name}><div className="executive-bar-label"><strong>{name}</strong><span>{value.toLocaleString()} AED</span></div><div className="executive-bar-track"><i style={{width:`${100-i*11}%`}} /></div></div>)}</div>
        </article>

        <article className="executive-card">
          <div className="executive-card-head"><div><h2>{ar?'حالة الفواتير':'Invoice Status'}</h2><p>{ar?'توزيع الفواتير الحالية':'Current distribution'}</p></div></div>
          <div className="executive-donut"><div className="executive-donut-chart"><strong>184</strong><small>{ar?'فاتورة':'Invoices'}</small></div><div className="executive-legend"><span><i className="ok"/> {ar?'معتمدة':'Approved'} <b>112</b></span><span><i className="wait"/> {ar?'قيد المراجعة':'Under Review'} <b>41</b></span><span><i className="back"/> {ar?'معادة':'Returned'} <b>19</b></span><span><i className="late"/> {ar?'متأخرة':'Late'} <b>12</b></span></div></div>
        </article>

        <article className="executive-card">
          <div className="executive-card-head"><div><h2>{ar?'أكثر الموردين تكرارًا':'Top Suppliers'}</h2><p>{ar?'حسب عدد الفواتير':'By invoice count'}</p></div></div>
          <div className="supplier-list">{suppliers.map(([name,count],i)=><div key={name}><span>{i+1}</span><strong>{name}</strong><b>{count}</b></div>)}</div>
        </article>

        <article className="executive-card executive-wide">
          <div className="executive-card-head"><div><h2>{ar?'آخر العمليات المهمة':'Recent Key Activity'}</h2><p>{ar?'من سجل العمليات المركزي':'From the central audit log'}</p></div><button onClick={()=>setActive('settings')}>{ar?'سجل العمليات':'Audit Log'}</button></div>
          <div className="executive-activity">
            {(logs.length?logs.slice(0,6):[
              {id:'1',action:'اعتماد فاتورة',user:'منيرة الأحمد',details:'INV-2026-00134',time:'12:25 م'},
              {id:'2',action:'طلب نقل أصل',user:'حضانة واسط 2',details:'SEA-000427',time:'11:40 ص'},
              {id:'3',action:'إنشاء سلفة',user:'منيرة الأحمد',details:'سلفة أغسطس وسبتمبر',time:'10:15 ص'},
            ]).map(x=><div key={x.id}><span>✓</span><div><strong>{x.action}</strong><small>{x.user} · {x.details}</small></div><time>{x.time}</time></div>)}
          </div>
        </article>
      </div>
    </section>
  );
}
