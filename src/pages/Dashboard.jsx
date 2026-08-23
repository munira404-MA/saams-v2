import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

const translations = {
  ar: {
    greeting: 'مرحباً', intro: 'مرحباً بكِ في منظومة الأصول والسلف الذكية', filter: 'تصفية حسب',
    totalAssets: 'إجمالي الأصول', openAdvances: 'السلف المفتوحة', pendingInvoices: 'الفواتير قيد الاعتماد', lateInvoices: 'الفواتير المتأخرة',
    asset: 'أصل', advance: 'سلفة', invoice: 'فاتورة', awaitingReview: 'بانتظار المراجعة', invoiceStatus: 'حالة الفواتير', assetByNursery: 'توزيع الأصول حسب الحضانة', thisMonth: 'هذا الشهر', approved: 'معتمدة', review: 'قيد المراجعة', returned: 'معادة للحضانة', late: 'متأخرة', alerts: 'التنبيهات', viewAll: 'عرض الكل', quickActions: 'العمليات السريعة', todayActivity: 'نشاط اليوم', activity: 'النشاط', details: 'التفاصيل', user: 'المستخدم', time: 'الوقت', addAsset: 'أصل جديد', addInvoice: 'فاتورة جديدة', addAdvance: 'سلفة جديدة', transferAsset: 'نقل أصل', addUser: 'مستخدم جديد', report: 'تقرير', noAlerts: 'لا توجد تنبيهات حالياً', noActivity: 'لا يوجد نشاط مسجل حالياً', noAssetData: 'لا توجد أصول مسجلة حالياً', totalInvoices: 'إجمالي الفواتير', loading: 'جاري تحميل البيانات...', loadError: 'تعذر تحميل بعض بيانات الصفحة الرئيسية.'
  },
  en: {
    greeting: 'Welcome', intro: 'Welcome to the Smart Assets & Advances Management System', filter: 'Filter by',
    totalAssets: 'Total Assets', openAdvances: 'Open Advances', pendingInvoices: 'Invoices Pending Approval', lateInvoices: 'Late Invoices',
    asset: 'Assets', advance: 'Advances', invoice: 'Invoices', awaitingReview: 'awaiting review', invoiceStatus: 'Invoice Status', assetByNursery: 'Assets by Nursery', thisMonth: 'This Month', approved: 'Approved', review: 'Under Review', returned: 'Returned', late: 'Late', alerts: 'Alerts', viewAll: 'View All', quickActions: 'Quick Actions', todayActivity: 'Today’s Activity', activity: 'Activity', details: 'Details', user: 'User', time: 'Time', addAsset: 'New Asset', addInvoice: 'New Invoice', addAdvance: 'New Advance', transferAsset: 'Transfer Asset', addUser: 'New User', report: 'Report', noAlerts: 'No alerts at the moment', noActivity: 'No activity recorded yet', noAssetData: 'No assets are registered yet', totalInvoices: 'Total invoices', loading: 'Loading data...', loadError: 'Some dashboard data could not be loaded.'
  },
};

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 500, start = performance.now(); let frame;
    const animate = now => { const p=Math.min((now-start)/duration,1); setDisplay(value*(1-Math.pow(1-p,3))); if(p<1) frame=requestAnimationFrame(animate); };
    frame=requestAnimationFrame(animate); return()=>cancelAnimationFrame(frame);
  }, [value]);
  return Math.round(display).toLocaleString();
}

function StatusDonut({ t, counts }) {
  const total = counts.approved + counts.review + counts.returned + counts.late;
  const pct = key => total ? Math.round((counts[key] / total) * 100) : 0;
  const approved=pct('approved'), review=pct('review'), returned=pct('returned');
  const end1=approved, end2=end1+review, end3=end2+returned;
  const bg = total ? `conic-gradient(#15b3a6 0 ${end1}%, #3d73e8 ${end1}% ${end2}%, #ff922b ${end2}% ${end3}%, #f34d68 ${end3}% 100%)` : 'conic-gradient(#e7edf3 0 100%)';
  return <div className="donut-wrap">
    <div className="donut-chart" style={{background:bg}}><div className="donut-center"><strong>{total}</strong><span>{t.invoice}</span></div></div>
    <div className="donut-legend">
      <span><i className="legend approved" />{t.approved}<b>{approved}%</b></span>
      <span><i className="legend review" />{t.review}<b>{review}%</b></span>
      <span><i className="legend returned" />{t.returned}<b>{returned}%</b></span>
      <span><i className="legend late" />{t.late}<b>{pct('late')}%</b></span>
    </div>
  </div>;
}

function EmptyAssetChart({ t }) { return <div className="dashboard-empty-state"><strong>0</strong><span>{t.noAssetData}</span></div>; }

export default function Dashboard({ lang, setActive, profile }) {
  const ar=lang==='ar', t=translations[lang]||translations.ar;
  const isNursery=profile?.role==='nursery';
  const displayName=profile?.full_name || (ar?'المستخدم':'User');
  const nurseryName=profile?.nursery || (ar?'الحضانة':'Nursery');
  const [stats,setStats]=useState({assets:0,openAdvances:0,review:0,late:0,approved:0,returned:0,totalInvoices:0});
  const [loading,setLoading]=useState(true), [error,setError]=useState('');

  useEffect(()=>{ let alive=true; (async()=>{
    try{
      let invoiceQ=supabase.from('invoices').select('status',{count:'exact'});
      if(isNursery&&profile?.nursery_id) invoiceQ=invoiceQ.eq('nursery_id',profile.nursery_id);
      const {data:invoiceRows,error:invErr}=await invoiceQ; if(invErr) throw invErr;
      let allocationQ=supabase.from('advance_allocations').select('id,nursery_id,advances!inner(status)').eq('advances.status','open');
      if(isNursery&&profile?.nursery_id) allocationQ=allocationQ.eq('nursery_id',profile.nursery_id);
      const {data:allocRows,error:advErr}=await allocationQ; if(advErr) throw advErr;
      const rows=invoiceRows||[];
      const review=rows.filter(x=>x.status==='review').length;
      const approved=rows.filter(x=>x.status==='approved').length;
      const returned=rows.filter(x=>x.status==='returned'||x.status==='rejected').length;
      if(alive) setStats({assets:0,openAdvances:(allocRows||[]).length,review,late:0,approved,returned,totalInvoices:rows.length});
    }catch(e){ if(alive){setError(t.loadError); setStats({assets:0,openAdvances:0,review:0,late:0,approved:0,returned:0,totalInvoices:0});} }
    finally{if(alive)setLoading(false)}
  })(); return()=>{alive=false}; },[isNursery,profile?.nursery_id,lang]);

  const greeting=ar?`${t.greeting} ${displayName}`:`${t.greeting}, ${displayName}`;
  const intro=isNursery?(ar?`ملخص بيانات ${nurseryName} فقط`:`Summary for ${nurseryName} only`):t.intro;
  const cards=useMemo(()=>[
    {label:t.totalAssets,value:stats.assets,suffix:t.asset,icon:'◇',tone:'violet',note:ar?'من البيانات الفعلية':'Live data'},
    {label:t.openAdvances,value:stats.openAdvances,suffix:t.advance,icon:'▣',tone:'blue',note:ar?'السلف المفتوحة فعلياً':'Currently open'},
    {label:t.pendingInvoices,value:stats.review,suffix:t.invoice,icon:'▤',tone:'green',note:t.awaitingReview},
    {label:t.lateInvoices,value:stats.late,suffix:t.invoice,icon:'◷',tone:'orange',note:ar?'لا توجد بيانات تجريبية':'No demo data'},
  ],[stats,t,ar]);
  const today=new Intl.DateTimeFormat(ar?'ar-AE':'en-AE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());

  return <div className="glass-dashboard">
    <section className="dashboard-hero"><div><span className="eyebrow">SAAMS Official 3.2</span><h1>{greeting} <span className="wave">👋</span></h1><p>{intro}</p></div><div className="dashboard-filters"><button type="button">☷ {t.filter}</button><button type="button">▣ {today}</button></div></section>
    {loading&&<div className="dashboard-live-note">{t.loading}</div>}{error&&<div className="dashboard-live-note error">{error}</div>}
    <section className="stat-grid">{cards.map((c,i)=><article className={`stat-card ${c.tone}`} key={c.label} style={{animationDelay:`${i*70}ms`}}><div className="stat-icon">{c.icon}</div><span>{c.label}</span><strong><AnimatedNumber value={c.value}/></strong><em>{c.suffix}</em><footer>{c.note}</footer></article>)}</section>
    <section className="dashboard-grid dashboard-grid-top">
      <article className="glass-panel alerts-panel"><div className="panel-heading"><h2>♧ {t.alerts}</h2><button type="button">{t.viewAll}</button></div><div className="alerts-list"><div className="dashboard-empty-state"><strong>✓</strong><span>{t.noAlerts}</span></div></div></article>
      <article className="glass-panel chart-panel"><div className="panel-heading"><h2>{isNursery?(ar?`أصول ${nurseryName}`:`${nurseryName} Assets`):t.assetByNursery}</h2><button type="button">{t.thisMonth}⌄</button></div><EmptyAssetChart t={t}/></article>
      <article className="glass-panel status-panel"><div className="panel-heading"><h2>{t.invoiceStatus}</h2><button type="button">{t.thisMonth}⌄</button></div><StatusDonut t={t} counts={{approved:stats.approved,review:stats.review,returned:stats.returned,late:stats.late}}/><p className="panel-total">{t.totalInvoices}: {stats.totalInvoices}</p></article>
    </section>
    <section className="dashboard-grid dashboard-grid-bottom">
      <article className="glass-panel quick-panel"><div className="panel-heading"><h2>ϟ {t.quickActions}</h2></div><div className="quick-grid">{(isNursery?[[ '▤',t.addInvoice,'green','invoices'],['⇄',t.transferAsset,'orange','assets'],['▣',t.openAdvances,'blue','advances'],['▥',t.report,'violet','reports']]:[['◇',t.addAsset,'teal','assets'],['▤',t.addInvoice,'green','invoices'],['▣',t.addAdvance,'blue','advances'],['⇄',t.transferAsset,'orange','assets'],['♙',t.addUser,'sky','users'],['▥',t.report,'violet','reports']]).map(([icon,label,tone,target])=><button className={`quick-action ${tone}`} type="button" key={label} onClick={()=>setActive(target)}><span>{icon}</span><strong>{label}</strong></button>)}</div></article>
      <article className="glass-panel activity-panel"><div className="panel-heading"><h2>◷ {t.todayActivity}</h2><button type="button">{t.viewAll}</button></div><div className="activity-table"><div className="activity-row activity-head"><span>{t.activity}</span><span>{t.details}</span><span>{t.user}</span><span>{t.time}</span></div><div className="dashboard-empty-state activity-empty"><span>{t.noActivity}</span></div></div></article>
    </section>
    <footer className="dashboard-footer"><span>SAAMS Official 3.2</span><p>{ar?'© 2026 أكاديمية الشارقة للتعليم — جميع الحقوق محفوظة':'© 2026 Sharjah Education Academy — All rights reserved'}</p></footer>
  </div>;
}
