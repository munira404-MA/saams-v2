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
 ar:{title:'إدارة الأصول',sub:'سجل الأصول وطلبات النقل والفائض والإسقاط في شاشة موحدة.',admin:'الإدارة',nursery:'الحضانة',add:'إضافة أصل',register:'سجل الأصول',requests:'طلبات الأصول',transfer:'طلب نقل',surplus:'طلب فائض',disposal:'طلب إسقاط',barcode:'رقم الباركود',asset:'اسم الأصل',from:'من',to:'إلى',reason:'السبب',scan:'تصوير الباركود',upload:'رفع صورة الباركود',manual:'أو أدخلي الرقم يدويًا',lookup:'البحث عن الأصل',found:'تم التعرف على الأصل',notFound:'لم يتم العثور على أصل بهذا الباركود',submit:'إرسال الطلب',cancel:'إلغاء',status:'الحالة',date:'التاريخ',type:'نوع الطلب',pending:'قيد الاعتماد',approved:'معتمد',returned:'معاد',all:'الكل',category:'التصنيف',location:'الموقع الحالي',save:'حفظ الأصل',assetName:'اسم الأصل',choose:'اختاري',notes:'ملاحظات',cameraHint:'وجهي الكاميرا على الباركود حتى تتم قراءته تلقائيًا.',cameraUnsupported:'المتصفح لا يدعم قراءة الباركود مباشرة. استخدمي رفع الصورة أو اكتبي الرقم.',closeCamera:'إغلاق الكاميرا',requestSent:'تم إرسال الطلب بنجاح',assetSaved:'تمت إضافة الأصل بنجاح',adminOnly:'إضافة الأصول متاحة للإدارة فقط',destinationNotNeeded:'الفائض لا يحتاج تحديد جهة مستلمة.',disposalHint:'أرفقي سبب الإسقاط بشكل واضح ليتم عرضه على الإدارة.',surplusHint:'حددي سبب اعتبار الأصل فائضًا، ولن يظهر حقل «إلى».',transferHint:'حددي الحضانة المنقول منها وإليها مع سبب النقل.'},
 en:{title:'Asset Management',sub:'A unified register for asset transfers, surplus, and disposal requests.',admin:'Administration',nursery:'Nursery',add:'Add Asset',register:'Asset Register',requests:'Asset Requests',transfer:'Transfer Request',surplus:'Surplus Request',disposal:'Disposal Request',barcode:'Barcode Number',asset:'Asset Name',from:'From',to:'To',reason:'Reason',scan:'Scan Barcode',upload:'Upload Barcode Image',manual:'or enter the number manually',lookup:'Find Asset',found:'Asset identified',notFound:'No asset found for this barcode',submit:'Submit Request',cancel:'Cancel',status:'Status',date:'Date',type:'Request Type',pending:'Pending Approval',approved:'Approved',returned:'Returned',all:'All',category:'Category',location:'Current Location',save:'Save Asset',assetName:'Asset Name',choose:'Choose',notes:'Notes',cameraHint:'Point the camera at the barcode to scan it automatically.',cameraUnsupported:'Barcode scanning is not supported by this browser. Upload an image or enter the number manually.',closeCamera:'Close Camera',requestSent:'Request submitted successfully',assetSaved:'Asset added successfully',adminOnly:'Only administration can add assets',destinationNotNeeded:'Surplus requests do not require a destination.',disposalHint:'Provide a clear disposal reason for administration review.',surplusHint:'Explain why the asset is surplus. The “To” field is not required.',transferHint:'Select the source and destination nurseries and state the transfer reason.'}
};

function assetLabel(a,ar){return ar?a.nameAr:a.nameEn}
function nurseryLabel(a,ar){return ar?a.nurseryAr:a.nurseryEn}

export default function Assets({lang,profile}){
 const ar=lang==='ar',t=COPY[lang]||COPY.ar;
 const username=(profile?.username||'').toLowerCase();
 const isAdmin=profile?.role==='admin'||!/(nursery|حضانة)/i.test(username);
 const nurseries=ar?NURSERIES_AR:NURSERIES_EN;
 const [tab,setTab]=useState('register');
 const [modal,setModal]=useState(null);
 const [toast,setToast]=useState('');
 const [assets,setAssets]=useState(ASSETS);
 const [requests,setRequests]=useState([
  {id:'AST-REQ-026',type:'transfer',barcode:'SEA-000427',assetAr:'خزانة تخزين خشبية',assetEn:'Wooden Storage Cabinet',fromAr:'واسط 2',fromEn:'Wasit 2',toAr:'البستان',toEn:'Al Bustan',reasonAr:'الحاجة إلى الخزانة في غرفة المصادر',reasonEn:'Needed in the resource room',status:'pending',date:'04/08/2026'},
  {id:'AST-REQ-025',type:'surplus',barcode:'SEA-000284',assetAr:'طاولة أطفال مستديرة',assetEn:'Round Children Table',fromAr:'اللؤلؤية',fromEn:'Al Luluyah',reasonAr:'فائض بعد إعادة توزيع الفصول',reasonEn:'Surplus after classroom redistribution',status:'approved',date:'03/08/2026'},
 ]);
 const [search,setSearch]=useState('');
 const filtered=useMemo(()=>assets.filter(a=>[a.barcode,a.nameAr,a.nameEn,a.nurseryAr,a.nurseryEn].some(v=>v.toLowerCase().includes(search.toLowerCase()))),[assets,search]);
 function notify(msg){setToast(msg);setTimeout(()=>setToast(''),2600)}
 function addAsset(form){setAssets(x=>[{barcode:form.barcode,nameAr:form.name,nameEn:form.name,nurseryAr:form.from,nurseryEn:form.from,categoryAr:form.category,categoryEn:form.category,status:'active'},...x]);setModal(null);notify(t.assetSaved)}
 function addRequest(form){const a=assets.find(x=>x.barcode===form.barcode);setRequests(x=>[{id:`AST-REQ-${String(x.length+27).padStart(3,'0')}`,type:modal,barcode:form.barcode,assetAr:a?.nameAr||form.asset,assetEn:a?.nameEn||form.asset,fromAr:form.from,fromEn:form.from,toAr:form.to,toEn:form.to,reasonAr:form.reason,reasonEn:form.reason,status:'pending',date:new Date().toLocaleDateString('en-GB')},...x]);setModal(null);notify(t.requestSent)}
 return <section className="assets-page">
  <div className="module-heading assets-heading"><div><span className="eyebrow">SAAMS v5.0</span><h1>{t.title}</h1><p>{t.sub}</p></div><div className="role-pill">{isAdmin?t.admin:t.nursery}</div></div>
  <div className="asset-stat-grid">
   <article><span>◇</span><div><small>{ar?'إجمالي الأصول':'Total Assets'}</small><strong>{assets.length}</strong></div></article>
   <article><span>⇄</span><div><small>{ar?'طلبات النقل':'Transfer Requests'}</small><strong>{requests.filter(r=>r.type==='transfer').length}</strong></div></article>
   <article><span>▱</span><div><small>{ar?'طلبات الفائض':'Surplus Requests'}</small><strong>{requests.filter(r=>r.type==='surplus').length}</strong></div></article>
   <article><span>⌫</span><div><small>{ar?'طلبات الإسقاط':'Disposal Requests'}</small><strong>{requests.filter(r=>r.type==='disposal').length}</strong></div></article>
  </div>
  <div className="asset-tabs">
   <button className={tab==='register'?'active':''} onClick={()=>setTab('register')}>{t.register}</button>
   <button className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}>{t.requests}</button>
  </div>
  {tab==='register'?<>
   <div className="asset-toolbar"><div className="invoice-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'بحث باسم الأصل أو الباركود أو الموقع...':'Search asset, barcode, or location...'}/></div>
    <div className="asset-actions">
     {!isAdmin&&<><button onClick={()=>setModal('transfer')}>⇄ {t.transfer}</button><button onClick={()=>setModal('surplus')}>▱ {t.surplus}</button><button onClick={()=>setModal('disposal')}>⌫ {t.disposal}</button></>}
     {isAdmin&&<button className="primary-action" onClick={()=>setModal('add')}>＋ {t.add}</button>}
    </div>
   </div>
   <div className="asset-card-grid">{filtered.map(a=><article className="asset-card" key={a.barcode}><div className="asset-card-icon">◇</div><div className="asset-card-main"><strong>{assetLabel(a,ar)}</strong><span>{a.barcode}</span><div><small>{t.location}</small><b>{nurseryLabel(a,ar)}</b></div><div><small>{t.category}</small><b>{ar?a.categoryAr:a.categoryEn}</b></div></div>{!isAdmin&&<div className="asset-card-menu"><button onClick={()=>setModal('transfer')}>⇄</button><button onClick={()=>setModal('surplus')}>▱</button><button onClick={()=>setModal('disposal')}>⌫</button></div>}</article>)}</div>
  </>:<div className="invoice-table-card"><div className="invoice-table-wrap"><table className="invoice-table asset-request-table"><thead><tr><th>{ar?'رقم الطلب':'Request ID'}</th><th>{t.type}</th><th>{t.asset}</th><th>{t.barcode}</th><th>{t.from}</th><th>{t.to}</th><th>{t.reason}</th><th>{t.status}</th><th>{t.date}</th></tr></thead><tbody>{requests.map(r=><tr key={r.id}><td><strong className="invoice-id">{r.id}</strong></td><td><span className={`request-type ${r.type}`}>{t[r.type]}</span></td><td>{ar?r.assetAr:r.assetEn}</td><td>{r.barcode}</td><td>{ar?r.fromAr:r.fromEn}</td><td>{r.type==='transfer'?(ar?r.toAr:r.toEn):'—'}</td><td>{ar?r.reasonAr:r.reasonEn}</td><td><span className={`invoice-status ${r.status==='pending'?'review':r.status}`}>{t[r.status]}</span></td><td>{r.date}</td></tr>)}</tbody></table></div></div>}
  {modal&&<AssetModal type={modal} ar={ar} t={t} assets={assets} nurseries={nurseries} onClose={()=>setModal(null)} onSave={modal==='add'?addAsset:addRequest}/>} {toast&&<div className="asset-toast">✓ {toast}</div>}
 </section>
}

function AssetModal({type,ar,t,assets,nurseries,onClose,onSave}){
 const [form,setForm]=useState({barcode:'',asset:'',from:nurseries[0]||'',to:nurseries[1]||'',reason:'',name:'',category:'',notes:''});
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
