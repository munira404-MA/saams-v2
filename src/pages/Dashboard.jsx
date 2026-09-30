import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { loadAuditLog } from '../utils/audit';


const DEVELOPER_NAME_AR = 'منيرة الأحمد';
const DEVELOPER_NAME_EN = 'Munira Alahmed';
const DEVELOPER_PHONE_DISPLAY = '0506404227';
const DEVELOPER_PHONE_TEL = '+971506404227';
const DEVELOPER_VCARD = `BEGIN:VCARD
VERSION:3.0
FN:${DEVELOPER_NAME_AR}
TEL;TYPE=CELL:${DEVELOPER_PHONE_TEL}
NOTE:مطورة منظومة الأصول والسلف الذكية
END:VCARD`;
const DEVELOPER_VCARD_URI = `data:text/vcard;charset=utf-8,${encodeURIComponent(DEVELOPER_VCARD)}`;

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

function AssetDistribution({ t, rows }) {
  if(!rows?.length) return <div className="dashboard-empty-state"><strong>0</strong><span>{t.noAssetData}</span></div>;
  const max=Math.max(...rows.map(x=>x.count),1);
  return <div className="asset-distribution-live">{rows.slice(0,6).map(x=><div className="asset-distribution-item" key={x.name}><div className="asset-distribution-bar-wrap"><b style={{height:`${Math.max(12,(x.count/max)*100)}%`}}></b></div><strong>{x.count}</strong><span>{x.name}</span></div>)}</div>;
}

export default function Dashboard({ lang, setActive, profile }) {
  const ar=lang==='ar', t=translations[lang]||translations.ar;
  const isNursery=profile?.role==='nursery';
  const displayName=profile?.full_name || (ar?'المستخدم':'User');
  const nurseryName=profile?.nursery || (ar?'الحضانة':'Nursery');
  const [stats,setStats]=useState({assets:0,openAdvances:0,review:0,late:0,approved:0,returned:0,totalInvoices:0});
  const [assetDistribution,setAssetDistribution]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [activities,setActivities]=useState([]);
  const [loading,setLoading]=useState(true), [error,setError]=useState('');
  const [developerOpen,setDeveloperOpen]=useState(false);

  useEffect(()=>{ let alive=true;
    const loadDashboard=async()=>{
      try{
        setError('');

        const scopeNursery=(q)=>isNursery&&profile?.nursery_id?q.eq('nursery_id',profile.nursery_id):q;
        const exactCount=async(table,configure)=>{
          let q=supabase.from(table).select('id',{count:'exact',head:true});
          if(configure) q=configure(q);
          const {count,error}=await q;
          if(error) throw error;
          return count||0;
        };

        // Assets: use an exact count so the dashboard is never capped at Supabase's 1,000-row response limit.
        const assetCount=await exactCount('assets',q=>scopeNursery(q));

        // Distribution still needs row-level nursery data, so fetch it in safe pages.
        let assetRows=[];
        const ASSET_BATCH=1000;
        for(let from=0;;from+=ASSET_BATCH){
          let q=supabase.from('assets').select('nursery_id,nurseries(name_ar,name_en)').range(from,from+ASSET_BATCH-1);
          q=scopeNursery(q);
          const {data,error}=await q;
          if(error) throw error;
          const batch=data||[];
          assetRows.push(...batch);
          if(batch.length<ASSET_BATCH) break;
        }

        const lateCutoffIso=new Date(Date.now()-7*24*60*60*1000).toISOString();
        const totalInvoices=await exactCount('invoices',q=>scopeNursery(q));
        const review=await exactCount('invoices',q=>scopeNursery(q).eq('status','review'));
        const approved=await exactCount('invoices',q=>scopeNursery(q).eq('status','approved'));
        const returned=await exactCount('invoices',q=>scopeNursery(q).in('status',['returned','rejected']));
        const late=await exactCount('invoices',q=>scopeNursery(q).eq('status','review').lt('created_at',lateCutoffIso));

        let openAdvances=0;
        if(isNursery&&profile?.nursery_id){
          let q=supabase.from('advance_allocations').select('id,advances!inner(status)',{count:'exact',head:true})
            .eq('nursery_id',profile.nursery_id).eq('advances.status','open');
          const {count,error}=await q;
          if(error) throw error;
          openAdvances=count||0;
        }else{
          openAdvances=await exactCount('advances',q=>q.eq('status','open'));
        }

        const distMap=new Map();
        for(const a of assetRows){
          const n=Array.isArray(a.nurseries)?a.nurseries[0]:a.nurseries;
          const name=(ar?n?.name_ar:n?.name_en)||n?.name_ar||n?.name_en||(ar?'غير محدد':'Unassigned');
          distMap.set(name,(distMap.get(name)||0)+1);
        }
        const distribution=[...distMap.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);

        const nextAlerts=[];
        if(late>0) nextAlerts.push({tone:'red',title:ar?`${late} فاتورة متأخرة لأكثر من أسبوع`:`${late} invoice(s) overdue for more than a week`,sub:ar?'بانتظار الاعتماد':'Awaiting approval'});
        if(returned>0) nextAlerts.push({tone:'orange',title:ar?`${returned} فاتورة معادة/مرفوضة`:`${returned} returned/rejected invoice(s)`,sub:ar?'تحتاج متابعة':'Needs follow-up'});
        if(openAdvances>0) nextAlerts.push({tone:'blue',title:ar?`${openAdvances} سلفة مفتوحة حالياً`:`${openAdvances} open advance(s)`,sub:ar?'من البيانات الفعلية':'Live data'});

        const auditRows=loadAuditLog().filter(x=>!isNursery||!profile?.nursery||x.nursery===profile.nursery).slice(0,8);
        if(alive){
          setStats({assets:assetCount,openAdvances,review,late,approved,returned,totalInvoices});
          setAssetDistribution(distribution);
          setAlerts(nextAlerts);
          setActivities(auditRows);
        }
      }catch(e){
        console.error(e);
        if(alive)setError(t.loadError);
      }finally{
        if(alive)setLoading(false);
      }
    };
    loadDashboard();
    const onUpdate=()=>loadDashboard();
    const onVisible=()=>{if(document.visibilityState==='visible')loadDashboard()};
    window.addEventListener('saams:data-updated',onUpdate);
    window.addEventListener('focus',onUpdate);
    document.addEventListener('visibilitychange',onVisible);
    const timer=setInterval(loadDashboard,30000);
    return()=>{
      alive=false;
      clearInterval(timer);
      window.removeEventListener('saams:data-updated',onUpdate);
      window.removeEventListener('focus',onUpdate);
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[isNursery,profile?.nursery_id,profile?.nursery,lang]);

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
      <article className="glass-panel alerts-panel"><div className="panel-heading"><h2>♧ {t.alerts}</h2><button type="button">{t.viewAll}</button></div><div className="alerts-list">{alerts.length?alerts.map((a,i)=><div className={`live-alert ${a.tone}`} key={`${a.title}-${i}`}><b>!</b><div><strong>{a.title}</strong><small>{a.sub}</small></div></div>):<div className="dashboard-empty-state"><strong>✓</strong><span>{t.noAlerts}</span></div>}</div></article>
      <article className="glass-panel chart-panel"><div className="panel-heading"><h2>{isNursery?(ar?`أصول ${nurseryName}`:`${nurseryName} Assets`):t.assetByNursery}</h2><button type="button">{t.thisMonth}⌄</button></div><AssetDistribution t={t} rows={assetDistribution}/></article>
      <article className="glass-panel status-panel"><div className="panel-heading"><h2>{t.invoiceStatus}</h2><button type="button">{t.thisMonth}⌄</button></div><StatusDonut t={t} counts={{approved:stats.approved,review:stats.review,returned:stats.returned,late:stats.late}}/><p className="panel-total">{t.totalInvoices}: {stats.totalInvoices}</p></article>
    </section>
    <section className="dashboard-grid dashboard-grid-bottom">
      <article className="glass-panel quick-panel"><div className="panel-heading"><h2>ϟ {t.quickActions}</h2></div><div className="quick-grid">{(isNursery?[[ '▤',t.addInvoice,'green','invoices'],['⇄',t.transferAsset,'orange','assets'],['▣',t.openAdvances,'blue','advances'],['▥',t.report,'violet','reports']]:[['◇',t.addAsset,'teal','assets'],['▤',t.addInvoice,'green','invoices'],['▣',t.addAdvance,'blue','advances'],['⇄',t.transferAsset,'orange','assets'],['♙',t.addUser,'sky','users'],['▥',t.report,'violet','reports']]).map(([icon,label,tone,target])=><button className={`quick-action ${tone}`} type="button" key={label} onClick={()=>setActive(target)}><span>{icon}</span><strong>{label}</strong></button>)}</div></article>
      <article className="glass-panel activity-panel"><div className="panel-heading"><h2>◷ {t.todayActivity}</h2><button type="button">{t.viewAll}</button></div><div className="activity-table"><div className="activity-row activity-head"><span>{t.activity}</span><span>{t.details}</span><span>{t.user}</span><span>{t.time}</span></div>{activities.length?activities.map(x=><div className="activity-row" key={x.id}><span>{x.action}</span><span>{x.details||x.screen||'—'}</span><span>{x.user||'—'}</span><span>{x.time||'—'}</span></div>):<div className="dashboard-empty-state activity-empty"><span>{t.noActivity}</span></div>}</div></article>
    </section>
    <footer className="dashboard-footer">
      <span>SAAMS Official 3.2</span>
      <div className="dashboard-footer-rights">
        <button type="button" className="developer-qr-trigger" onClick={()=>setDeveloperOpen(true)} aria-label={ar?'معلومات المطور':'Developer information'}>
          <img src="/developer-contact-qr.png" alt="" />
          <strong>{ar?'معلومات المطور':'Developer Info'}</strong>
        </button>
        <p>{ar?'© 2026 أكاديمية الشارقة للتعليم — جميع الحقوق محفوظة':'© 2026 Sharjah Education Academy — All rights reserved'}</p>
      </div>
    </footer>
    {developerOpen&&(
      <div className="developer-modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)setDeveloperOpen(false)}}>
        <section className="developer-modal" role="dialog" aria-modal="true" aria-label={ar?'معلومات المطور':'Developer information'}>
          <button type="button" className="developer-modal-close" onClick={()=>setDeveloperOpen(false)} aria-label={ar?'إغلاق':'Close'}>×</button>
          <img className="developer-modal-qr" src="/developer-contact-qr.png" alt={ar?'رمز QR لمعلومات المطور':'Developer contact QR code'} />
          <small>{ar?'معلومات المطور':'Developer Information'}</small>
          <h3>{ar?DEVELOPER_NAME_AR:DEVELOPER_NAME_EN}</h3>
          <p dir="ltr">{DEVELOPER_PHONE_DISPLAY}</p>
          <div className="developer-modal-actions">
            <a href={`tel:${DEVELOPER_PHONE_TEL}`}>{ar?'اتصال':'Call'}</a>
            <a href={DEVELOPER_VCARD_URI} download="Munira_Alahmed.vcf">{ar?'حفظ جهة الاتصال':'Save Contact'}</a>
          </div>
          <em>{ar?'يمكن أيضاً مسح رمز QR بالكاميرا لحفظ بيانات التواصل.':'You can also scan the QR code with a phone camera to save the contact.'}</em>
        </section>
      </div>
    )}
  </div>;
}
