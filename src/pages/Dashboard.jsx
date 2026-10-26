import { dashboardAccess, activityPage } from '../utils/dashboardAccess';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { loadActivityFeed, isToday, activityActor, activityTime } from '../utils/activityFeed';
import { translateAssetName } from '../utils/assetTranslations';
import { englishPersonName, englishActivityText } from '../utils/englishDisplay';
import { toArabicDisplay } from '../utils/globalI18n';


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
    asset: 'أصل', advance: 'سلفة', invoice: 'فاتورة', awaitingReview: 'بانتظار المراجعة', invoiceStatus: 'حالة الفواتير', assetByNursery: 'توزيع الأصول حسب الحضانة', thisMonth: 'هذا الشهر', approved: 'معتمدة', review: 'قيد المراجعة', returned: 'معادة للحضانة', late: 'متأخرة', alerts: 'التنبيهات', viewAll: 'عرض الكل', quickActions: 'العمليات السريعة', todayActivity: 'نشاط اليوم', activity: 'النشاط', details: 'التفاصيل', user: 'المستخدم', time: 'الوقت', addAsset: 'أصل جديد', addInvoice: 'فاتورة جديدة', addAdvance: 'سلفة جديدة', transferAsset: 'نقل أصل', addUser: 'مستخدم جديد', report: 'تقرير', noAlerts: 'لا توجد تنبيهات حالياً', noActivity: 'لا يوجد نشاط مسجل حالياً', noAssetData: 'لا توجد أصول مسجلة حالياً', totalInvoices: 'إجمالي الفواتير', loading: 'جاري تحميل البيانات...', loadError: 'تعذر تحميل بعض بيانات الصفحة الرئيسية.', showLess: 'عرض أقل', invoiceApprovedAlert: 'تم اعتماد الفاتورة', invoiceReturnedAlert: 'تمت إعادة الفاتورة للتعديل', invoiceRejectedAlert: 'تم رفض الفاتورة', invoiceReviewAlert: 'الفاتورة قيد المراجعة', assetTransfer: 'نقل', assetSurplus: 'فائض', assetDisposal: 'إسقاط', requestApprovedAlert: 'تمت الموافقة على طلب', requestRejectedAlert: 'تم رفض طلب', requestReturnedAlert: 'تمت إعادة طلب', requestPendingAlert: 'طلب بانتظار المراجعة', tapForDetails: 'اضغطي لعرض التفاصيل', newAssetAlert: 'أصل جديد أُضيف لحضانتكم', newAssetsAlert: 'أصول جديدة أُضيفت لحضانتكم', incomingPending: 'أصل وارد لحضانتكم — بانتظار اعتماد الإدارة', incomingApproved: 'تم اعتماد نقل أصل إلى حضانتكم — بانتظار النقل', incomingInTransit: 'أصل في الطريق إلى حضانتكم', incomingDelivered: 'تم تسليم أصل منقول إلى حضانتكم', incomingRejected: 'تم رفض نقل أصل كان موجهاً لحضانتكم', fromLabel: 'من', newThisMonth: 'جديد هذا الشهر', recentActivity: 'آخر النشاطات', noActivityToday: 'لا يوجد نشاط اليوم — اضغطي «عرض الكل» لآخر النشاطات' 
  },
  en: {
    greeting: 'Welcome', intro: 'Welcome to the Smart Assets & Advances Management System', filter: 'Filter by',
    totalAssets: 'Total Assets', openAdvances: 'Open Advances', pendingInvoices: 'Invoices Pending Approval', lateInvoices: 'Late Invoices',
    asset: 'Assets', advance: 'Advances', invoice: 'Invoices', awaitingReview: 'awaiting review', invoiceStatus: 'Invoice Status', assetByNursery: 'Assets by Nursery', thisMonth: 'This Month', approved: 'Approved', review: 'Under Review', returned: 'Returned', late: 'Late', alerts: 'Alerts', viewAll: 'View All', quickActions: 'Quick Actions', todayActivity: 'Today’s Activity', activity: 'Activity', details: 'Details', user: 'User', time: 'Time', addAsset: 'New Asset', addInvoice: 'New Invoice', addAdvance: 'New Advance', transferAsset: 'Transfer Asset', addUser: 'New User', report: 'Report', noAlerts: 'No alerts at the moment', noActivity: 'No activity recorded yet', noAssetData: 'No assets are registered yet', totalInvoices: 'Total invoices', loading: 'Loading data...', loadError: 'Some dashboard data could not be loaded.', showLess: 'Show Less', invoiceApprovedAlert: 'Invoice approved', invoiceReturnedAlert: 'Invoice returned for editing', invoiceRejectedAlert: 'Invoice rejected', invoiceReviewAlert: 'Invoice under review', assetTransfer: 'Transfer', assetSurplus: 'Surplus', assetDisposal: 'Disposal', requestApprovedAlert: 'Asset request approved', requestRejectedAlert: 'Asset request rejected', requestReturnedAlert: 'Asset request returned', requestPendingAlert: 'Asset request awaiting review', tapForDetails: 'Tap to view details', newAssetAlert: 'New asset added to your nursery', newAssetsAlert: 'New assets added to your nursery', incomingPending: 'Incoming asset — awaiting administration approval', incomingApproved: 'Transfer to your nursery approved — awaiting transport', incomingInTransit: 'Asset on its way to your nursery', incomingDelivered: 'Transferred asset delivered to your nursery', incomingRejected: 'Transfer to your nursery was rejected', fromLabel: 'from', newThisMonth: 'new this month', recentActivity: 'Recent Activity', noActivityToday: 'No activity today — tap “View All” for recent activity' 
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
  const can=dashboardAccess(profile);
  const canAssets=can('assets'), canInvoices=can('invoices'), canAdvances=can('advances'), canTransport=can('transport');
  const displayName=ar?(profile?.full_name||'المستخدم'):englishPersonName(profile?.full_name||'User');
  const nurseryName=profile?.nursery || (ar?'الحضانة':'Nursery');
  const [stats,setStats]=useState({assets:0,newAssetsMonth:0,openAdvances:0,review:0,late:0,approved:0,returned:0,totalInvoices:0});
  const [showAllActivity,setShowAllActivity]=useState(false);
  const [assetDistribution,setAssetDistribution]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [activities,setActivities]=useState([]);
  const [loading,setLoading]=useState(true), [error,setError]=useState('');
  const [developerOpen,setDeveloperOpen]=useState(false);
  const [showAllAlerts,setShowAllAlerts]=useState(false);

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
        const assetCount=canAssets?await exactCount('assets',q=>scopeNursery(q)):0;
        const monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
        const newAssetsMonth=canAssets?await exactCount('assets',q=>scopeNursery(q).gte('created_at',monthStart.toISOString())).catch(()=>0):0;

        // Distribution still needs row-level nursery data, so fetch it in safe pages.
        let assetRows=[];
        const ASSET_BATCH=1000;
        for(let from=0;canAssets;from+=ASSET_BATCH){
          let q=supabase.from('assets').select('nursery_id,nurseries(name_ar,name_en)').range(from,from+ASSET_BATCH-1);
          q=scopeNursery(q);
          const {data,error}=await q;
          if(error) throw error;
          const batch=data||[];
          assetRows.push(...batch);
          if(batch.length<ASSET_BATCH) break;
        }

        const lateCutoffIso=new Date(Date.now()-7*24*60*60*1000).toISOString();
        const totalInvoices=canInvoices?await exactCount('invoices',q=>scopeNursery(q)):0;
        const review=canInvoices?await exactCount('invoices',q=>scopeNursery(q).eq('status','review')):0;
        const approved=canInvoices?await exactCount('invoices',q=>scopeNursery(q).eq('status','approved')):0;
        const returned=canInvoices?await exactCount('invoices',q=>scopeNursery(q).in('status',['returned','rejected'])):0;
        const late=canInvoices?await exactCount('invoices',q=>scopeNursery(q).eq('status','review').lt('created_at',lateCutoffIso)):0;

        let openAdvances=0;
        if(canAdvances&&isNursery&&profile?.nursery_id){
          let q=supabase.from('advance_allocations').select('id,advances!inner(status)',{count:'exact',head:true})
            .eq('nursery_id',profile.nursery_id).eq('advances.status','open');
          const {count,error}=await q;
          if(error) throw error;
          openAdvances=count||0;
        }else if(canAdvances){
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
        if(!isNursery&&(canAssets||canTransport)){
          const {data:requests,error:requestError}=await supabase.from('asset_requests')
            .select('id,request_code,request_type,asset_name_ar,asset_name_en,status,transport_status,created_at')
            .in('status',['pending','approved']).order('created_at',{ascending:false}).limit(100);
          if(requestError)console.warn('Asset alerts load failed',requestError);
          for(const req of requests||[]){
            const transport=req.status==='approved'&&req.request_type==='transfer'&&req.transport_status!=='delivered';
            const target=transport&&canTransport?'transport':canAssets?'assets':null;
            if(!target||(!transport&&req.status!=='pending'))continue;
            nextAlerts.push({tone:'blue',target,title:ar?(transport?'مهمة نقل أصل':'طلب أصل بانتظار المراجعة'):(transport?'Asset transport task':'Asset request awaiting review'),sub:ar?(req.asset_name_ar||req.asset_name_en):translateAssetName(req.asset_name_en,req.asset_name_ar),time:req.created_at});
          }
        }
        if(isNursery&&profile?.nursery_id){
          const [{data:invoiceEvents,error:invoiceEventsError},{data:requestEvents,error:requestEventsError}]=await Promise.all([
            canInvoices?supabase.from('invoices')
              .select('id,invoice_number,status,supplier_name,return_reason,created_at,approved_at,returned_at')
              .eq('nursery_id',profile.nursery_id)
              .order('created_at',{ascending:false})
              .limit(100):Promise.resolve({data:[]}),
            canAssets?supabase.from('asset_requests')
              .select('id,request_code,request_type,barcode,asset_name_ar,asset_name_en,status,rejection_reason_ar,rejection_reason_en,created_at,updated_at,decision_at,to_name_ar,to_name_en')
              .eq('created_by',profile?.id||'00000000-0000-0000-0000-000000000000')
              .order('updated_at',{ascending:false})
              .limit(100):Promise.resolve({data:[]})
          ]);
          // Asset requests table is an optional production upgrade; invoice alerts should still work if it is not ready yet.
          if(invoiceEventsError) console.warn('Dashboard invoice notifications load failed',invoiceEventsError);
          if(requestEventsError) console.warn('Dashboard asset request notifications load failed',requestEventsError);
          const eventTime=(row)=>row.approved_at||row.returned_at||row.decision_at||row.updated_at||row.created_at||'';
          const formatWhen=(value)=>{
            if(!value)return '';
            try{return new Intl.DateTimeFormat(ar?'ar-AE':'en-AE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return ''}
          };
          for(const inv of invoiceEvents||[]){
            const number=inv.invoice_number||'—';
            let title='',tone='blue';
            if(inv.status==='approved'){title=ar?`${t.invoiceApprovedAlert} رقم ${number}`:`${t.invoiceApprovedAlert}: ${number}`;tone='green'}
            else if(inv.status==='returned'){title=ar?`${t.invoiceReturnedAlert} رقم ${number}`:`${t.invoiceReturnedAlert}: ${number}`;tone='orange'}
            else if(inv.status==='rejected'){title=ar?`${t.invoiceRejectedAlert} رقم ${number}`:`${t.invoiceRejectedAlert}: ${number}`;tone='red'}
            else {title=ar?`${t.invoiceReviewAlert} رقم ${number}`:`${t.invoiceReviewAlert}: ${number}`;tone='blue'}
            const reason=String(inv.return_reason||'').trim();
            nextAlerts.push({tone,title,sub:[inv.supplier_name,reason,formatWhen(eventTime(inv))].filter(Boolean).join(' • '),target:'invoices',time:eventTime(inv)});
          }
          const requestTypeLabel=(type)=>type==='surplus'?t.assetSurplus:type==='disposal'?t.assetDisposal:t.assetTransfer;
          for(const req of requestEvents||[]){
            const type=requestTypeLabel(req.request_type);
            const asset=ar?(req.asset_name_ar||req.asset_name_en||req.barcode||'—'):translateAssetName(req.asset_name_en,req.asset_name_ar);
            let title='',tone='blue';
            if(req.status==='approved'){title=ar?`${t.requestApprovedAlert} ${type}`:`${t.requestApprovedAlert}: ${type}`;tone='green'}
            else if(req.status==='rejected'){title=ar?`${t.requestRejectedAlert} ${type}`:`${t.requestRejectedAlert}: ${type}`;tone='red'}
            else if(req.status==='returned'){title=ar?`${t.requestReturnedAlert} ${type}`:`${t.requestReturnedAlert}: ${type}`;tone='orange'}
            else {title=ar?`${type} — ${t.requestPendingAlert}`:`${type} — ${t.requestPendingAlert}`;tone='blue'}
            const reason=String((ar?req.rejection_reason_ar:req.rejection_reason_en)||req.rejection_reason_ar||req.rejection_reason_en||'').trim();
            nextAlerts.push({tone,title,sub:[asset,req.barcode,reason,formatWhen(eventTime(req))].filter(Boolean).join(' • '),target:'assets',time:eventTime(req)});
          }
          if(canAssets){
            // Transfers coming TO this nursery (needs 17_ASSET_REQUESTS_REPAIR_AND_NURSERY_LINKS.sql; silently skipped before it).
            const seen=new Set((requestEvents||[]).map(r=>r.id));
            let incoming=await supabase.from('asset_requests')
              .select('id,request_code,barcode,asset_name_ar,asset_name_en,from_name_ar,from_name_en,status,transport_status,created_at,updated_at,decision_at')
              .eq('request_type','transfer').eq('to_nursery_id',profile.nursery_id)
              .order('updated_at',{ascending:false}).limit(50);
            if(incoming.error&&profile?.nursery) incoming=await supabase.from('asset_requests')
              .select('id,request_code,barcode,asset_name_ar,asset_name_en,from_name_ar,from_name_en,status,transport_status,created_at,updated_at,decision_at')
              .eq('request_type','transfer').eq('to_name_ar',profile.nursery)
              .order('updated_at',{ascending:false}).limit(50);
            if(incoming.error) console.warn('Incoming transfer alerts unavailable',incoming.error);
            for(const req of incoming.data||[]){
              if(seen.has(req.id))continue;
              const asset=ar?(req.asset_name_ar||req.asset_name_en||req.barcode||'—'):translateAssetName(req.asset_name_en,req.asset_name_ar);
              const from=ar?(req.from_name_ar||req.from_name_en||''):(req.from_name_en||req.from_name_ar||'');
              let title=t.incomingPending,tone='blue';
              if(req.status==='completed'||req.transport_status==='delivered'){title=t.incomingDelivered;tone='green'}
              else if(req.status==='approved'&&req.transport_status==='in_transit'){title=t.incomingInTransit;tone='green'}
              else if(req.status==='approved'){title=t.incomingApproved;tone='green'}
              else if(req.status==='rejected'){title=t.incomingRejected;tone='red'}
              nextAlerts.push({tone,title,sub:[asset,req.barcode,from?`${t.fromLabel} ${from}`:'',formatWhen(eventTime(req))].filter(Boolean).join(' • '),target:'assets',time:eventTime(req)});
            }
            // Assets the administration added to this nursery in the last 30 days, grouped per day.
            const since=new Date(Date.now()-30*24*60*60*1000).toISOString();
            const {data:newAssets,error:newAssetsError}=await supabase.from('assets')
              .select('id,barcode,name_ar,name_en,created_at').eq('nursery_id',profile.nursery_id).gte('created_at',since)
              .order('created_at',{ascending:false}).limit(500);
            if(newAssetsError) console.warn('New asset alerts unavailable',newAssetsError);
            const byDay=new Map();
            for(const a of newAssets||[]){const day=String(a.created_at||'').slice(0,10);if(!byDay.has(day))byDay.set(day,[]);byDay.get(day).push(a)}
            for(const [,items] of byDay){
              const first=items[0];
              const name=ar?(first.name_ar||first.name_en||first.barcode):translateAssetName(first.name_en,first.name_ar);
              nextAlerts.push(items.length===1
                ?{tone:'teal',title:t.newAssetAlert,sub:[name,first.barcode,formatWhen(first.created_at)].filter(Boolean).join(' • '),target:'assets',time:first.created_at}
                :{tone:'teal',title:ar?`${t.newAssetsAlert}: ${items.length}`:`${t.newAssetsAlert}: ${items.length}`,sub:[name,ar?`و${items.length-1} أخرى`:`and ${items.length-1} more`,formatWhen(first.created_at)].filter(Boolean).join(' • '),target:'assets',time:first.created_at});
            }
          }
          nextAlerts.sort((a,b)=>new Date(b.time||0)-new Date(a.time||0));
        }else{
          if(canInvoices&&late>0) nextAlerts.push({tone:'red',title:ar?`${late} فاتورة متأخرة لأكثر من أسبوع`:`${late} invoice(s) overdue for more than a week`,sub:ar?'بانتظار الاعتماد':'Awaiting approval'});
          if(canInvoices&&returned>0) nextAlerts.push({tone:'orange',title:ar?`${returned} فاتورة معادة/مرفوضة`:`${returned} returned/rejected invoice(s)`,sub:ar?'تحتاج متابعة':'Needs follow-up'});
          if(canAdvances&&openAdvances>0) nextAlerts.push({tone:'blue',title:ar?`${openAdvances} سلفة مفتوحة حالياً`:`${openAdvances} open advance(s)`,sub:ar?'من البيانات الفعلية':'Live data'});
        }

        const feed=await loadActivityFeed(profile,{limit:80});
        const auditRows=feed.rows.filter(x=>activityPage(x)&&can(activityPage(x)));
        if(alive){
          setStats({assets:assetCount,newAssetsMonth,openAdvances,review,late,approved,returned,totalInvoices});
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
    const timer=setInterval(loadDashboard,isNursery?10000:30000);
    let liveChannel=null;
    if(isNursery&&profile?.nursery_id){
      liveChannel=supabase.channel(`dashboard-${profile.nursery_id}-${profile?.id}`);
      if(canInvoices)liveChannel.on('postgres_changes',{event:'*',schema:'public',table:'invoices',filter:`nursery_id=eq.${profile.nursery_id}`},loadDashboard);
      if(canAssets)liveChannel.on('postgres_changes',{event:'*',schema:'public',table:'asset_requests',filter:`created_by=eq.${profile?.id}`},loadDashboard);
      liveChannel.subscribe();
    }
    return()=>{
      alive=false;
      clearInterval(timer);
      if(liveChannel)supabase.removeChannel(liveChannel);
      window.removeEventListener('saams:data-updated',onUpdate);
      window.removeEventListener('focus',onUpdate);
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[isNursery,profile?.nursery_id,profile?.nursery,profile?.id,profile?.role,JSON.stringify(profile?.permissions),lang]);

  const greeting=ar?`${t.greeting} ${displayName}`:`${t.greeting}, ${displayName}`;
  const intro=isNursery?(ar?`ملخص بيانات ${nurseryName} فقط`:`Summary for ${nurseryName} only`):t.intro;
  const cards=useMemo(()=>[
    {page:'assets',label:t.totalAssets,value:stats.assets,suffix:t.asset,icon:'◇',tone:'violet',note:stats.newAssetsMonth>0?(ar?`${stats.newAssetsMonth} ${t.newThisMonth}`:`${stats.newAssetsMonth} ${t.newThisMonth}`):(ar?'من البيانات الفعلية':'Live data')},
    {page:'advances',label:t.openAdvances,value:stats.openAdvances,suffix:t.advance,icon:'▣',tone:'blue',note:ar?'السلف المفتوحة فعلياً':'Currently open'},
    {page:'invoices',label:t.pendingInvoices,value:stats.review,suffix:t.invoice,icon:'▤',tone:'green',note:t.awaitingReview},
    {page:'invoices',label:t.lateInvoices,value:stats.late,suffix:t.invoice,icon:'◷',tone:'orange',note:ar?'لا توجد بيانات تجريبية':'No demo data'},
  ].filter(card=>can(card.page)),[stats,t,ar,canAssets,canInvoices,canAdvances]);
  const today=new Intl.DateTimeFormat(ar?'ar-AE':'en-AE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  const permittedAlerts=alerts.filter(a=>a.target?can(a.target):(a.tone==='blue'?canAdvances:canInvoices));
  const visibleAlerts=isNursery&&!showAllAlerts?permittedAlerts.slice(0,5):permittedAlerts;
  const permittedActivities=activities.filter(x=>activityPage(x)&&can(activityPage(x)));
  const visibleActivities=showAllActivity?permittedActivities.slice(0,30):permittedActivities.filter(isToday).slice(0,10);

  return <div className="glass-dashboard">
    <section className="dashboard-hero"><div><span className="eyebrow">SAAMS Official 3.3</span><h1>{greeting} <span className="wave">👋</span></h1><p>{intro}</p></div><div className="dashboard-filters"><button type="button">☷ {t.filter}</button><button type="button">▣ {today}</button></div></section>
    {loading&&<div className="dashboard-live-note">{t.loading}</div>}{error&&<div className="dashboard-live-note error">{error}</div>}
    <section className="stat-grid" style={{gridTemplateColumns:`repeat(${Math.max(cards.length,1)},minmax(0,1fr))`}}>{cards.map((c,i)=><article className={`stat-card ${c.tone}`} key={c.label} style={{animationDelay:`${i*70}ms`}}><div className="stat-icon">{c.icon}</div><span>{c.label}</span><strong><AnimatedNumber value={c.value}/></strong><em>{c.suffix}</em><footer>{c.note}</footer></article>)}</section>
    <section className="dashboard-grid dashboard-grid-top">
      <article className="glass-panel alerts-panel"><div className="panel-heading"><h2>♧ {t.alerts}</h2>{permittedAlerts.length>5&&<button type="button" onClick={()=>setShowAllAlerts(v=>!v)}>{showAllAlerts?t.showLess:t.viewAll}</button>}</div><div className="alerts-list">{visibleAlerts.length?visibleAlerts.map((a,i)=><div className={`live-alert ${a.tone} ${a.target?'clickable':''}`} key={`${a.title}-${i}`} role={a.target?'button':undefined} tabIndex={a.target?0:undefined} onClick={()=>a.target&&setActive(a.target)} onKeyDown={(e)=>{if(a.target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setActive(a.target)}}}><b>{a.tone==='green'?'✓':a.tone==='red'?'!':a.tone==='orange'?'↩':a.tone==='teal'?'＋':'•'}</b><div><strong>{a.title}</strong><small>{a.sub}{a.target?` • ${t.tapForDetails}`:''}</small></div></div>):<div className="dashboard-empty-state"><strong>✓</strong><span>{t.noAlerts}</span></div>}</div></article>
      {canAssets&&<article className="glass-panel chart-panel"><div className="panel-heading"><h2>{isNursery?(ar?`أصول ${nurseryName}`:`${nurseryName} Assets`):t.assetByNursery}</h2><button type="button">{t.thisMonth}⌄</button></div><AssetDistribution t={t} rows={assetDistribution}/></article>}
      {canInvoices&&<article className="glass-panel status-panel"><div className="panel-heading"><h2>{t.invoiceStatus}</h2><button type="button">{t.thisMonth}⌄</button></div><StatusDonut t={t} counts={{approved:stats.approved,review:stats.review,returned:stats.returned,late:stats.late}}/><p className="panel-total">{t.totalInvoices}: {stats.totalInvoices}</p></article>}
    </section>
    <section className="dashboard-grid dashboard-grid-bottom">
      <article className="glass-panel quick-panel"><div className="panel-heading"><h2>ϟ {t.quickActions}</h2></div><div className="quick-grid">{(isNursery?[[ '▤',t.addInvoice,'green','invoices'],['⇄',t.transferAsset,'orange','assets'],['▣',t.openAdvances,'blue','advances'],['▥',t.report,'violet','reports']]:[['◇',t.addAsset,'teal','assets'],['▤',t.addInvoice,'green','invoices'],['▣',t.addAdvance,'blue','advances'],['⇄',t.transferAsset,'orange','assets'],['♙',t.addUser,'sky','users'],['▥',t.report,'violet','reports']]).filter(([, , ,target])=>can(target)).concat(canTransport?[[ '⇄',ar?'مهام النقل':'Transport Tasks','orange','transport']]:[]).map(([icon,label,tone,target])=><button className={`quick-action ${tone}`} type="button" key={label} onClick={()=>setActive(target)}><span>{icon}</span><strong>{label}</strong></button>)}</div></article>
      <article className="glass-panel activity-panel"><div className="panel-heading"><h2>◷ {showAllActivity?t.recentActivity:t.todayActivity}</h2>{activities.length>0&&<button type="button" onClick={()=>setShowAllActivity(v=>!v)}>{showAllActivity?t.showLess:t.viewAll}</button>}</div><div className="activity-table"><div className="activity-row activity-head"><span>{t.activity}</span><span>{t.details}</span><span>{t.user}</span><span>{t.time}</span></div>{visibleActivities.length?visibleActivities.map(x=><div className={`activity-row tone-${x.actionType||'update'}`} key={x.id}><span>{ar?toArabicDisplay(x.action):englishActivityText(x.action)}</span><span>{ar?toArabicDisplay([x.details||x.screen||'—',x.reason].filter(Boolean).join(' — ')):englishActivityText(x.details||x.screen||'—')}</span><span>{ar?toArabicDisplay(activityActor(x,profile,ar)):englishPersonName(activityActor(x,profile,ar))}</span><span>{!showAllActivity||isToday(x)?activityTime(x,ar):`${new Date(x.createdAt||Date.now()).toLocaleDateString(ar?'ar-AE':'en-GB',{day:'numeric',month:'short'})} ${activityTime(x,ar)}`}</span></div>):<div className="dashboard-empty-state activity-empty"><span>{activities.length?t.noActivityToday:t.noActivity}</span></div>}</div></article>
    </section>
    <footer className="dashboard-footer">
      <span>SAAMS Official 3.3</span>
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
