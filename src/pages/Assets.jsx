import { recordAudit, loadAuditLog } from '../utils/audit';
import AssetOfficialDocument from '../components/AssetOfficialDocument';
import { useMemo, useRef, useState } from 'react';

const ASSETS = [
  { barcode:'SEA-000156', nameAr:'جهاز حاسب آلي مكتبي', nameEn:'Desktop Computer', nurseryAr:'الرحمانية الجديدة', nurseryEn:'New Al Rahmaniya', categoryAr:'أجهزة تقنية', categoryEn:'IT Equipment', status:'active' },
  { barcode:'SEA-000284', nameAr:'طاولة أطفال مستديرة', nameEn:'Round Children Table', nurseryAr:'اللؤلؤية', nurseryEn:'Al Luluyah', categoryAr:'أثاث', categoryEn:'Furniture', status:'active' },
  { barcode:'SEA-000427', nameAr:'خزانة تخزين خشبية', nameEn:'Wooden Storage Cabinet', nurseryAr:'واسط 2', nurseryEn:'Wasit 2', categoryAr:'أثاث', categoryEn:'Furniture', status:'active' },
  { barcode:'SEA-000603', nameAr:'شاشة عرض تفاعلية', nameEn:'Interactive Display', nurseryAr:'السيوح', nurseryEn:'Al Suyoh', categoryAr:'أجهزة تعليمية', categoryEn:'Educational Equipment', status:'active' },
  { barcode:'SEA-000715', nameAr:'ثلاجة صغيرة', nameEn:'Small Refrigerator', nurseryAr:'القليعة', nurseryEn:'Al Qulaya', categoryAr:'أجهزة كهربائية', categoryEn:'Electrical Equipment', status:'active' },
];

const NURSERIES_AR=['الرحمانية الجديدة','اللؤلؤية','واسط 2','السيوح','القليعة','البديع','الرحمانية','البستان'];
const NURSERIES_EN=['New Al Rahmaniya','Al Luluyah','Wasit 2','Al Suyoh','Al Qulaya','Al Badie','Al Rahmaniya','Al Bustan'];

const COPY={
 ar:{title:'إدارة الأصول',sub:'سجل الأصول وطلبات النقل والفائض والإسقاط في شاشة موحدة.',admin:'الإدارة',nursery:'الحضانة',add:'إضافة أصل',register:'سجل الأصول',requests:'طلبات الأصول',transfer:'طلب نقل',surplus:'طلب فائض',disposal:'طلب إسقاط',barcode:'رقم الباركود',asset:'اسم الأصل',from:'من',to:'إلى',reason:'السبب',scan:'تصوير الباركود',upload:'رفع صورة الباركود',manual:'أو أدخلي الرقم يدويًا',lookup:'البحث عن الأصل',found:'تم التعرف على الأصل',notFound:'لم يتم العثور على أصل بهذا الباركود',submit:'إرسال الطلب',cancel:'إلغاء',status:'الحالة',date:'التاريخ',type:'نوع الطلب',pending:'قيد الاعتماد',approved:'معتمد',returned:'معاد',rejected:'مرفوض',approve:'اعتماد',reject:'رفض',actions:'الإجراءات',rejectionReason:'سبب الرفض',confirmReject:'تأكيد الرفض',previewNursery:'معاينة طلبات الحضانة',exitPreview:'العودة لوضع الإدارة',viewRequest:'عرض الطلب',all:'الكل',category:'التصنيف',location:'الموقع الحالي',save:'حفظ الأصل',assetName:'اسم الأصل',choose:'اختاري',notes:'ملاحظات',cameraHint:'وجهي الكاميرا على الباركود حتى تتم قراءته تلقائيًا.',cameraUnsupported:'المتصفح لا يدعم قراءة الباركود مباشرة. استخدمي رفع الصورة أو اكتبي الرقم.',closeCamera:'إغلاق الكاميرا',requestSent:'تم إرسال الطلب بنجاح',assetSaved:'تمت إضافة الأصل بنجاح',adminOnly:'إضافة الأصول متاحة للإدارة فقط',destinationNotNeeded:'الفائض لا يحتاج تحديد جهة مستلمة.',disposalHint:'أرفقي سبب الإسقاط بشكل واضح ليتم عرضه على الإدارة.',surplusHint:'حددي سبب اعتبار الأصل فائضًا، ولن يظهر حقل «إلى».',transferHint:'حددي الحضانة المنقول منها وإليها مع سبب النقل.'},
 en:{title:'Asset Management',sub:'A unified register for asset transfers, surplus, and disposal requests.',admin:'Administration',nursery:'Nursery',add:'Add Asset',register:'Asset Register',requests:'Asset Requests',transfer:'Transfer Request',surplus:'Surplus Request',disposal:'Disposal Request',barcode:'Barcode Number',asset:'Asset Name',from:'From',to:'To',reason:'Reason',scan:'Scan Barcode',upload:'Upload Barcode Image',manual:'or enter the number manually',lookup:'Find Asset',found:'Asset identified',notFound:'No asset found for this barcode',submit:'Submit Request',cancel:'Cancel',status:'Status',date:'Date',type:'Request Type',pending:'Pending Approval',approved:'Approved',returned:'Returned',rejected:'Rejected',approve:'Approve',reject:'Reject',actions:'Actions',rejectionReason:'Rejection Reason',confirmReject:'Confirm Rejection',previewNursery:'Preview Nursery Requests',exitPreview:'Back to Admin Mode',viewRequest:'View Request',all:'All',category:'Category',location:'Current Location',save:'Save Asset',assetName:'Asset Name',choose:'Choose',notes:'Notes',cameraHint:'Point the camera at the barcode to scan it automatically.',cameraUnsupported:'Barcode scanning is not supported by this browser. Upload an image or enter the number manually.',closeCamera:'Close Camera',requestSent:'Request submitted successfully',assetSaved:'Asset added successfully',adminOnly:'Only administration can add assets',destinationNotNeeded:'Surplus requests do not require a destination.',disposalHint:'Provide a clear disposal reason for administration review.',surplusHint:'Explain why the asset is surplus. The “To” field is not required.',transferHint:'Select the source and destination nurseries and state the transfer reason.'}
};

function assetLabel(a,ar){return ar?a.nameAr:a.nameEn}
function nurseryLabel(a,ar){return ar?a.nurseryAr:a.nurseryEn}

export default function Assets({lang,profile}){
 const ar=lang==='ar',t=COPY[lang]||COPY.ar;
 const isAdmin=profile?.role!=='nursery';
 const accountNursery=profile?.nursery||'';
 const nurseries=ar?NURSERIES_AR:NURSERIES_EN;
 const [tab,setTab]=useState('register');
 const [modal,setModal]=useState(null);
 const [rejecting,setRejecting]=useState(null);
 const [viewing,setViewing]=useState(null);
 const [historyAsset,setHistoryAsset]=useState(null);
 const [officialDocument,setOfficialDocument]=useState(null);
 const [previewNursery,setPreviewNursery]=useState(false);
 const [toast,setToast]=useState('');
 const [assets,setAssets]=useState(ASSETS);
 const [requests,setRequests]=useState([
  {id:'AST-REQ-026',type:'transfer',barcode:'SEA-000427',assetAr:'خزانة تخزين خشبية',assetEn:'Wooden Storage Cabinet',fromAr:'واسط 2',fromEn:'Wasit 2',toAr:'البستان',toEn:'Al Bustan',reasonAr:'الحاجة إلى الخزانة في غرفة المصادر',reasonEn:'Needed in the resource room',status:'pending',date:'04/08/2026'},
  {id:'AST-REQ-025',type:'surplus',barcode:'SEA-000284',assetAr:'طاولة أطفال مستديرة',assetEn:'Round Children Table',fromAr:'اللؤلؤية',fromEn:'Al Luluyah',reasonAr:'فائض بعد إعادة توزيع الفصول',reasonEn:'Surplus after classroom redistribution',status:'approved',date:'03/08/2026'},
 ]);
 const [search,setSearch]=useState('');
 const scopedAssets=useMemo(()=>isAdmin||previewNursery?assets:assets.filter(a=>a.nurseryAr===accountNursery||a.nurseryEn===accountNursery),[assets,isAdmin,previewNursery,accountNursery]);
 const scopedRequests=useMemo(()=>isAdmin||previewNursery?requests:requests.filter(r=>r.fromAr===accountNursery||r.fromEn===accountNursery),[requests,isAdmin,previewNursery,accountNursery]);
 const filtered=useMemo(()=>scopedAssets.filter(a=>[a.barcode,a.nameAr,a.nameEn,a.nurseryAr,a.nurseryEn].some(v=>v.toLowerCase().includes(search.toLowerCase()))),[scopedAssets,search]);
 function notify(msg){setToast(msg);setTimeout(()=>setToast(''),2600)}
 function addAsset(form){
  const next={barcode:form.barcode,nameAr:form.name,nameEn:form.name,nurseryAr:form.from,nurseryEn:form.from,categoryAr:form.category,categoryEn:form.category,status:'active'};
  setAssets(x=>[next,...x]);setModal(null);notify(t.assetSaved);
  recordAudit({profile,screen:'الأصول',action:'إضافة أصل',actionType:'create',entityType:'asset',entityId:next.barcode,nursery:next.nurseryAr,details:next.nameAr,after:next});
 }
 function addRequest(form){const a=assets.find(x=>x.barcode===form.barcode);setRequests(x=>[{id:`AST-REQ-${String(x.length+27).padStart(3,'0')}`,type:modal,barcode:form.barcode,assetAr:a?.nameAr||form.asset,assetEn:a?.nameEn||form.asset,fromAr:form.from,fromEn:form.from,toAr:form.to,toEn:form.to,reasonAr:form.reason,reasonEn:form.reason,status:'pending',date:new Date().toLocaleDateString('en-GB')},...x]);setModal(null);notify(t.requestSent)}
 function approveRequest(id){
  const req=requests.find(r=>r.id===id);
  const decisionDate=new Date().toLocaleDateString('en-GB');
  setRequests(x=>x.map(r=>r.id===id?{...r,status:'approved',decisionDate}:r));setViewing(null);notify(ar?'تم اعتماد الطلب بنجاح':'Request approved successfully');
  if(req)recordAudit({profile,screen:'الأصول',action:'اعتماد طلب أصل',actionType:'approve',entityType:'asset_request',entityId:req.id,nursery:req.fromAr,details:`${req.assetAr} — ${req.barcode}`,before:{status:req.status},after:{status:'approved',decisionDate}});
 }
 function rejectRequest(id,reason){setRequests(x=>x.map(r=>r.id===id?{...r,status:'rejected',rejectionReasonAr:reason,rejectionReasonEn:reason,decisionDate:new Date().toLocaleDateString('en-GB')}:r));setRejecting(null);setViewing(null);notify(ar?'تم رفض الطلب وإضافة سبب الرفض':'Request rejected with reason')}
 return <section className="assets-page">
  <div className="module-heading assets-heading"><div><span className="eyebrow">SAAMS v2.0</span><h1>{t.title}</h1><p>{t.sub}</p></div><div className="assets-heading-actions">{isAdmin&&<button className="preview-nursery-btn" onClick={()=>setPreviewNursery(v=>!v)}>{previewNursery?t.exitPreview:t.previewNursery}</button>}<div className="role-pill">{isAdmin&&!previewNursery?t.admin:t.nursery}</div></div></div>
  <div className="asset-stat-grid">
   <article><span>◇</span><div><small>{ar?'إجمالي الأصول':'Total Assets'}</small><strong>{scopedAssets.length}</strong></div></article>
   <article><span>⇄</span><div><small>{ar?'طلبات النقل':'Transfer Requests'}</small><strong>{scopedRequests.filter(r=>r.type==='transfer').length}</strong></div></article>
   <article><span>▱</span><div><small>{ar?'طلبات الفائض':'Surplus Requests'}</small><strong>{scopedRequests.filter(r=>r.type==='surplus').length}</strong></div></article>
   <article><span>⌫</span><div><small>{ar?'طلبات الإسقاط':'Disposal Requests'}</small><strong>{scopedRequests.filter(r=>r.type==='disposal').length}</strong></div></article>
  </div>
  <div className="asset-tabs">
   <button className={tab==='register'?'active':''} onClick={()=>setTab('register')}>{t.register}</button>
   <button className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}>{t.requests}</button>
  </div>
  {tab==='register'?<>
   <div className="asset-toolbar"><div className="invoice-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'بحث باسم الأصل أو الباركود أو الموقع...':'Search asset, barcode, or location...'}/></div>
    <div className="asset-actions">
     {(!isAdmin||previewNursery)&&<><button onClick={()=>setModal('transfer')}>⇄ {t.transfer}</button><button onClick={()=>setModal('surplus')}>▱ {t.surplus}</button><button onClick={()=>setModal('disposal')}>⌫ {t.disposal}</button></>}
     {isAdmin&&!previewNursery&&<button className="primary-action" onClick={()=>setModal('add')}>＋ {t.add}</button>}
    </div>
   </div>
   <div className="asset-card-grid">{filtered.map(a=><article className="asset-card" key={a.barcode}><div className="asset-card-icon">◇</div><div className="asset-card-main"><button className="asset-history-link" type="button" onClick={()=>setHistoryAsset(a)}>{assetLabel(a,ar)}</button><span>{a.barcode}</span><div><small>{t.location}</small><b>{nurseryLabel(a,ar)}</b></div><div><small>{t.category}</small><b>{ar?a.categoryAr:a.categoryEn}</b></div></div>{(!isAdmin||previewNursery)&&<div className="asset-card-menu"><button onClick={()=>setModal('transfer')}>⇄</button><button onClick={()=>setModal('surplus')}>▱</button><button onClick={()=>setModal('disposal')}>⌫</button></div>}</article>)}</div>
  </>:<div className="invoice-table-card"><div className="invoice-table-wrap"><table className="invoice-table asset-request-table"><thead><tr><th>{ar?'رقم الطلب':'Request ID'}</th><th>{t.type}</th><th>{t.asset}</th><th>{t.barcode}</th><th>{t.from}</th><th>{t.to}</th><th>{t.reason}</th><th>{t.status}</th><th>{t.date}</th><th>{t.actions}</th></tr></thead><tbody>{scopedRequests.map(r=><tr key={r.id}><td><button className="request-link" onClick={()=>setViewing(r)}>{r.id}</button></td><td><span className={`request-type ${r.type}`}>{t[r.type]}</span></td><td>{ar?r.assetAr:r.assetEn}</td><td>{r.barcode}</td><td>{ar?r.fromAr:r.fromEn}</td><td>{r.type==='transfer'?(ar?r.toAr:r.toEn):'—'}</td><td>{ar?r.reasonAr:r.reasonEn}</td><td><span className={`invoice-status ${r.status==='pending'?'review':r.status}`}>{t[r.status]}</span>{r.status==='rejected'&&<small className="rejection-inline">{ar?r.rejectionReasonAr:r.rejectionReasonEn}</small>}</td><td>{r.date}</td><td><div className="request-actions-cell"><button onClick={()=>setViewing(r)}>{t.viewRequest}</button>{isAdmin&&r.status==='pending'&&<><button className="approve-request-btn" onClick={()=>approveRequest(r.id)}>✓ {t.approve}</button><button className="reject-request-btn" onClick={()=>setRejecting(r)}>✕ {t.reject}</button></>}</div></td></tr>)}</tbody></table></div></div>}
  {officialDocument&&<AssetOfficialDocument request={officialDocument} ar={ar} onClose={()=>setOfficialDocument(null)} />}
  {historyAsset&&<AssetHistory asset={historyAsset} ar={ar} onClose={()=>setHistoryAsset(null)} />}
  {modal&&<AssetModal type={modal} ar={ar} defaultNursery={accountNursery} t={t} assets={assets} nurseries={nurseries} onClose={()=>setModal(null)} onSave={modal==='add'?addAsset:addRequest}/>}
  {viewing&&<RequestDetails request={viewing} ar={ar} t={t} isAdmin={isAdmin} onClose={()=>setViewing(null)} onApprove={()=>approveRequest(viewing.id)} onReject={()=>setRejecting(viewing)}/>}
  {rejecting&&<RejectModal request={rejecting} ar={ar} t={t} onClose={()=>setRejecting(null)} onConfirm={reason=>rejectRequest(rejecting.id,reason)}/>}
  {toast&&<div className="asset-toast">✓ {toast}</div>}
 </section>
}

function AssetModal({type,ar,t,assets,nurseries,onClose,onSave,defaultNursery}){
 const [form,setForm]=useState({barcode:'',asset:'',from:defaultNursery||nurseries[0]||'',to:nurseries.find(n=>n!==defaultNursery)||nurseries[1]||'',reason:'',name:'',category:'',notes:''});
 const [lookup,setLookup]=useState(null),[camera,setCamera]=useState(false),[scanMsg,setScanMsg]=useState('');
 const videoRef=useRef(null),streamRef=useRef(null);
 const selected=assets.find(a=>a.barcode.trim().toLowerCase()===form.barcode.trim().toLowerCase());
 function applyAsset(a){if(!a)return;setLookup('found');setForm(f=>({...f,barcode:a.barcode,asset:assetLabel(a,ar),from:nurseryLabel(a,ar)}))}
 function findAsset(){if(selected)applyAsset(selected);else setLookup('missing')}
 async function decodeImage(file){
  try{if(!('BarcodeDetector' in window)){setScanMsg(t.cameraUnsupported);return}const detector=new BarcodeDetector({formats:['code_128','code_39','ean_13','ean_8','qr_code']});const bmp=await createImageBitmap(file);const codes=await detector.detect(bmp);if(codes[0]){const value=codes[0].rawValue;setForm(f=>({...f,barcode:value}));const a=assets.find(x=>x.barcode.toLowerCase()===value.toLowerCase());if(a)applyAsset(a);else setLookup('missing')}else setScanMsg(ar?'لم يتم اكتشاف باركود واضح في الصورة.':'No clear barcode was detected in the image.')}catch(e){setScanMsg(t.cameraUnsupported)}
 }
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia||!('BarcodeDetector' in window)){setScanMsg(t.cameraUnsupported);return}
  try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});streamRef.current=stream;setCamera(true);setTimeout(async()=>{if(videoRef.current)videoRef.current.srcObject=stream;const detector=new BarcodeDetector({formats:['code_128','code_39','ean_13','ean_8','qr_code']});const tick=async()=>{if(!streamRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes[0]){const value=codes[0].rawValue;setForm(f=>({...f,barcode:value}));const a=assets.find(x=>x.barcode.toLowerCase()===value.toLowerCase());if(a)applyAsset(a);else setLookup('missing');stopCamera();return}}catch{}requestAnimationFrame(tick)};requestAnimationFrame(tick)},150)}catch{setScanMsg(t.cameraUnsupported)}
 }
 function stopCamera(){streamRef.current?.getTracks().forEach(x=>x.stop());streamRef.current=null;setCamera(false)}
 function submit(e){e.preventDefault();if(type!=='add'&&!selected)return setLookup('missing');onSave(form)}
 const hint=type==='transfer'?t.transferHint:type==='surplus'?t.surplusHint:type==='disposal'?t.disposalHint:'';
 return <div className="invoice-overlay" onClick={()=>{stopCamera();onClose()}}><form className="asset-modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="drawer-header"><div><small>SAAMS Assets</small><h2>{type==='add'?t.add:t[type]}</h2></div><button type="button" onClick={()=>{stopCamera();onClose()}}>×</button></div>
  {type==='add'?<div className="asset-form-grid"><label><span>{t.barcode}</span><input required value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></label><label><span>{t.assetName}</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span>{t.category}</span><input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label><span>{t.location}</span><select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{nurseries.map(n=><option key={n}>{n}</option>)}</select></label><label className="wide"><span>{t.notes}</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>:<>
   <p className="request-hint">{hint}</p><div className="barcode-panel"><label><span>{t.barcode}</span><div className="barcode-input-row"><input required value={form.barcode} onChange={e=>{setForm({...form,barcode:e.target.value});setLookup(null)}} placeholder="SEA-000000"/><button type="button" onClick={findAsset}>{t.lookup}</button></div></label><div className="barcode-tools"><button type="button" onClick={startCamera}>▣ {t.scan}</button><label className="upload-barcode">⇧ {t.upload}<input type="file" accept="image/*" capture="environment" onChange={e=>e.target.files[0]&&decodeImage(e.target.files[0])}/></label></div><small>{t.manual}</small>{scanMsg&&<div className="scan-warning">{scanMsg}</div>}{lookup==='found'&&selected&&<div className="asset-found"><b>✓ {t.found}</b><strong>{assetLabel(selected,ar)}</strong><span>{nurseryLabel(selected,ar)} · {selected.barcode}</span></div>}{lookup==='missing'&&<div className="scan-error">! {t.notFound}</div>}</div>
   {camera&&<div className="camera-box"><video ref={videoRef} autoPlay muted playsInline/><div className="scan-frame"></div><p>{t.cameraHint}</p><button type="button" onClick={stopCamera}>{t.closeCamera}</button></div>}
   <div className="asset-form-grid"><label><span>{t.asset}</span><input readOnly value={form.asset}/></label><label><span>{t.from}</span><select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{nurseries.map(n=><option key={n}>{n}</option>)}</select></label>{type==='transfer'&&<label><span>{t.to}</span><select value={form.to} onChange={e=>setForm({...form,to:e.target.value})}>{nurseries.filter(n=>n!==form.from).map(n=><option key={n}>{n}</option>)}</select></label>}<label className={type==='transfer'?'':'wide'}><span>{t.reason}</span><textarea required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label></div>
  </>}
  <div className="asset-modal-actions"><button type="button" className="secondary-action" onClick={()=>{stopCamera();onClose()}}>{t.cancel}</button><button className="primary-action" disabled={type!=='add'&&!selected}>{type==='add'?t.save:t.submit}</button></div></form></div>
}


function RequestDetails({request,ar,t,isAdmin,onClose,onApprove,onReject}){
 return <div className="invoice-overlay" onClick={onClose}><div className="asset-modal request-details-modal" onClick={e=>e.stopPropagation()}>
  <div className="drawer-header"><div><small>{t.viewRequest}</small><h2>{request.id}</h2></div><button type="button" onClick={onClose}>×</button></div>
  <div className="request-detail-badge-row"><span className={`request-type ${request.type}`}>{t[request.type]}</span><span className={`invoice-status ${request.status==='pending'?'review':request.status}`}>{t[request.status]}</span></div>
  <div className="request-detail-grid">
   <div><small>{t.asset}</small><strong>{ar?request.assetAr:request.assetEn}</strong></div>
   <div><small>{t.barcode}</small><strong>{request.barcode}</strong></div>
   <div><small>{t.from}</small><strong>{ar?request.fromAr:request.fromEn}</strong></div>
   {request.type==='transfer'&&<div><small>{t.to}</small><strong>{ar?request.toAr:request.toEn}</strong></div>}
   <div className="wide"><small>{t.reason}</small><strong>{ar?request.reasonAr:request.reasonEn}</strong></div>
   <div><small>{t.date}</small><strong>{request.date}</strong></div>
   {request.status==='rejected'&&<div className="wide rejection-detail"><small>{t.rejectionReason}</small><strong>{ar?request.rejectionReasonAr:request.rejectionReasonEn}</strong></div>}
  </div>
  {isAdmin&&request.status==='pending'&&<div className="request-decision-actions"><button className="reject-request-btn" onClick={onReject}>✕ {t.reject}</button><button className="approve-request-btn" onClick={onApprove}>✓ {t.approve}</button></div>}
 </div></div>
}

function RejectModal({request,ar,t,onClose,onConfirm}){
 const [reason,setReason]=useState('');
 return <div className="invoice-overlay" onClick={onClose}><form className="asset-modal reject-modal" onSubmit={e=>{e.preventDefault();if(reason.trim())onConfirm(reason.trim())}} onClick={e=>e.stopPropagation()}>
  <div className="drawer-header"><div><small>{request.id}</small><h2>{t.reject}</h2></div><button type="button" onClick={onClose}>×</button></div>
  <div className="reject-request-summary"><strong>{ar?request.assetAr:request.assetEn}</strong><span>{request.barcode}</span></div>
  <label className="reject-reason-label"><span>{t.rejectionReason}</span><textarea required autoFocus value={reason} onChange={e=>setReason(e.target.value)} placeholder={ar?'اكتبي سبب الرفض بشكل واضح ليظهر للحضانة...':'Enter a clear rejection reason for the nursery...'}/></label>
  <div className="asset-modal-actions"><button type="button" className="secondary-action" onClick={onClose}>{t.cancel}</button><button className="reject-confirm-btn" disabled={!reason.trim()}>✕ {t.confirmReject}</button></div>
 </form></div>
}


function AssetHistory({asset,ar,onClose}){
 const logs=loadAuditLog().filter(x=>x.entityId===asset.barcode || x.details?.includes(asset.barcode)).filter(x=>['transfer','surplus','disposal','approve','reject','return'].includes(x.actionType));
 const fallback=[
  {id:'h1',action:ar?'تم نقل الأصل':'Asset Transferred',date:'12/03/2026',time:'10:30 ص',user:'الإدارة',details:ar?'من المخزن الرئيسي إلى '+asset.nurseryAr:'Transferred to '+asset.nurseryEn,actionType:'transfer'},
  {id:'h2',action:ar?'تم اعتباره فائضًا':'Marked as Surplus',date:'21/06/2026',time:'09:15 ص',user:ar?'الحضانة':'Nursery',details:ar?'طلب فائض بانتظار الإجراء':'Surplus request submitted',actionType:'surplus'},
 ].filter((_,i)=>i===0 || asset.barcode==='SEA-000284');
 const rows=logs.length?logs.slice().reverse():fallback;
 return <div className="invoice-overlay" onClick={onClose}><aside className="asset-history-modal" onClick={e=>e.stopPropagation()}>
  <div className="drawer-header"><div><small>{ar?'سجل الأصل':'Asset History'}</small><h2>{asset.barcode}</h2></div><button onClick={onClose}>×</button></div>
  <div className="asset-history-summary"><div className="asset-card-icon">◇</div><div><strong>{ar?asset.nameAr:asset.nameEn}</strong><span>{ar?asset.nurseryAr:asset.nurseryEn}</span><small>{ar?asset.categoryAr:asset.categoryEn}</small></div></div>
  <div className="asset-history-note">{ar?'يعرض هذا السجل حركات النقل والفائض والإسقاط فقط.':'This history shows transfer, surplus, and disposal movements only.'}</div>
  <div className="entity-timeline asset-timeline">{rows.map((x,i)=><div key={x.id}><span>{i+1}</span><div><strong>{x.action}</strong><small>{x.date} · {x.time} · {x.user}</small><p>{x.details}</p>{x.reason&&<p className="timeline-reason">{x.reason}</p>}</div></div>)}</div>
 </aside></div>
}
