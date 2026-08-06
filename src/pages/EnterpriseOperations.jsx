import { useMemo } from 'react';
import { loadAuditLog } from '../utils/audit';

function groupCount(rows, getter) {
  return Object.entries(rows.reduce((acc, row) => {
    const key = getter(row) || 'غير محدد';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a,b)=>b[1]-a[1]);
}

export default function EnterpriseOperations({ lang, setActive }) {
  const ar = lang === 'ar';
  const logs = useMemo(() => loadAuditLog(), []);
  const today = new Date().toISOString().slice(0,10);
  const todayRows = logs.filter(x => x.createdAt?.slice(0,10) === today);
  const approvals = logs.filter(x => x.actionType === 'approve');
  const returns = logs.filter(x => ['reject','return'].includes(x.actionType));
  const assetMoves = logs.filter(x => ['transfer','surplus','disposal'].includes(x.actionType));
  const topScreens = groupCount(logs, x => x.screen).slice(0,5);
  const topUsers = groupCount(logs, x => x.user).slice(0,5);

  const cards = [
    [ar?'عمليات اليوم':'Today Actions', todayRows.length, '◷', 'blue'],
    [ar?'الاعتمادات':'Approvals', approvals.length, '✓', 'green'],
    [ar?'الرفض والإرجاع':'Rejected / Returned', returns.length, '↺', 'orange'],
    [ar?'حركات الأصول':'Asset Movements', assetMoves.length, '⇄', 'violet'],
  ];

  return (
    <section className="enterprise-operations-page">
      <div className="module-heading">
        <div>
          <span className="eyebrow">SAAMS Enterprise v3.0</span>
          <h1>{ar?'مركز العمليات المؤسسية':'Enterprise Operations Center'}</h1>
          <p>{ar?'متابعة العمليات اليومية، الأداء، الاعتمادات، والحركات الأكثر نشاطًا.':'Monitor daily activity, performance, approvals, and operational trends.'}</p>
        </div>
        <div className="enterprise-heading-actions">
          <button className="secondary-action" onClick={()=>window.print()}>⌘ {ar?'طباعة الملخص':'Print Summary'}</button>
          <button className="primary-action" onClick={()=>setActive('settings')}>{ar?'فتح سجل العمليات':'Open Audit Log'}</button>
        </div>
      </div>

      <div className="enterprise-kpi-grid">
        {cards.map(([label,value,icon,tone])=><article className={`enterprise-kpi ${tone}`} key={label}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>)}
      </div>

      <div className="enterprise-ops-grid">
        <article className="enterprise-panel">
          <div className="enterprise-panel-head"><h2>{ar?'أكثر الشاشات نشاطًا':'Most Active Screens'}</h2></div>
          <div className="enterprise-ranking">
            {topScreens.map(([name,count],i)=><div key={name}><span>{i+1}</span><strong>{name}</strong><b>{count}</b></div>)}
            {!topScreens.length&&<p>{ar?'لا توجد بيانات بعد.':'No data yet.'}</p>}
          </div>
        </article>

        <article className="enterprise-panel">
          <div className="enterprise-panel-head"><h2>{ar?'أكثر المستخدمين نشاطًا':'Most Active Users'}</h2></div>
          <div className="enterprise-ranking">
            {topUsers.map(([name,count],i)=><div key={name}><span>{i+1}</span><strong>{name}</strong><b>{count}</b></div>)}
            {!topUsers.length&&<p>{ar?'لا توجد بيانات بعد.':'No data yet.'}</p>}
          </div>
        </article>

        <article className="enterprise-panel enterprise-wide">
          <div className="enterprise-panel-head"><h2>{ar?'آخر العمليات':'Latest Activity'}</h2></div>
          <div className="enterprise-latest">
            {logs.slice(0,10).map(row=><div key={row.id}><span className={`enterprise-action-dot ${row.actionType}`}></span><div><strong>{row.action}</strong><small>{row.user} · {row.details || row.entityId || '—'}</small></div><time>{row.date} · {row.time}</time></div>)}
            {!logs.length&&<p>{ar?'لا توجد عمليات مسجلة بعد.':'No recorded activity yet.'}</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
