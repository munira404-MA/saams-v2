import { recordAudit, loadAuditLog } from '../utils/audit';
import AssetOfficialDocument from '../components/AssetOfficialDocument';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase';

const ASSETS = [];

const NURSERIES_AR=['الرحمانية الجديدة','مركز اللؤلؤية للطفولة المبكرة','مركز السيوح للطفولة المبكرة','واسط 2','مركز الرحمانية للطفولة المبكرة','البديع','اللية','القليعة','مركز البستان للطفولة المبكرة','مركز كلباء للطفولة المبكرة','الغيل','الطيبة','الحرس الأميري','الحمرية','المدينة الباسمة','الشرطي الصغير','الثميد','سهيلة','سهيلة الجديدة','البرير','مليحة','القادسية','دبا الحصن','السياقة','الشارقة النموذجية','مغيدر','الشيماء','المستقبل','غرفتي الصغيرة','جميلة','الباحثة','النحوة','جامعة خورفكان','جامعة كلباء','وادي الحلو','شيص'];
const NURSERIES_EN=NURSERIES_AR;


const COPY={
 ar:{title:'إدارة الأصول',sub:'سجل الأصول وطلبات النقل والفائض والإسقاط في شاشة موحدة.',admin:'الإدارة',nursery:'الحضانة',add:'إضافة أصل',register:'سجل الأصول',requests:'طلبات الأصول',transfer:'طلب نقل',surplus:'طلب فائض',disposal:'طلب إسقاط',barcode:'رقم الباركود',asset:'اسم الأصل',from:'من',to:'إلى',reason:'السبب',scan:'تصوير الباركود',upload:'رفع صورة الباركود',manual:'أو أدخلي الرقم يدويًا',lookup:'البحث عن الأصل',found:'تم التعرف على الأصل',notFound:'لم يتم العثور على أصل بهذا الباركود',submit:'إرسال الطلب',cancel:'إلغاء',status:'الحالة',date:'التاريخ',type:'نوع الطلب',pending:'قيد الاعتماد',approved:'معتمد',returned:'معاد',rejected:'مرفوض',approve:'اعتماد',reject:'رفض',actions:'الإجراءات',rejectionReason:'سبب الرفض',confirmReject:'تأكيد الرفض',previewNursery:'معاينة طلبات الحضانة',exitPreview:'العودة لوضع الإدارة',viewRequest:'عرض الطلب',all:'الكل',category:'التصنيف',location:'الموقع الحالي',save:'حفظ الأصل',assetName:'اسم الأصل',choose:'اختاري',notes:'ملاحظات',cameraHint:'وجهي الكاميرا على الباركود حتى تتم قراءته تلقائيًا.',cameraUnsupported:'المتصفح لا يدعم قراءة الباركود مباشرة. استخدمي رفع الصورة أو اكتبي الرقم.',closeCamera:'إغلاق الكاميرا',requestSent:'تم إرسال الطلب بنجاح',assetSaved:'تمت إضافة الأصل بنجاح',adminOnly:'إضافة الأصول متاحة للإدارة فقط',destinationNotNeeded:'الفائض لا يحتاج تحديد جهة مستلمة.',disposalHint:'أرفقي سبب الإسقاط بشكل واضح ليتم عرضه على الإدارة.',surplusHint:'حددي سبب اعتبار الأصل فائضًا، ولن يظهر حقل «إلى».',transferHint:'حددي الحضانة المنقول منها وإليها مع سبب النقل.',edit:'تعديل',delete:'حذف',editAsset:'تعديل الأصل',deleteConfirm:'هل أنتِ متأكدة من حذف هذا الأصل؟ لا يمكن التراجع عن الحذف.',assetUpdated:'تم تحديث الأصل بنجاح',assetDeleted:'تم حذف الأصل بنجاح',duplicateBarcode:'هذا الأصل مسجل مسبقًا في النظام',duplicateBarcodeDetail:'الموقع الحالي',duplicateBarcodeBlocked:'لا يمكن حفظ أصل جديد بنفس الباركود'},
 en:{title:'Asset Management',sub:'A unified register for asset transfers, surplus, and disposal requests.',admin:'Administration',nursery:'Nursery',add:'Add Asset',register:'Asset Register',requests:'Asset Requests',transfer:'Transfer Request',surplus:'Surplus Request',disposal:'Disposal Request',barcode:'Barcode Number',asset:'Asset Name',from:'From',to:'To',reason:'Reason',scan:'Scan Barcode',upload:'Upload Barcode Image',manual:'or enter the number manually',lookup:'Find Asset',found:'Asset identified',notFound:'No asset found for this barcode',submit:'Submit Request',cancel:'Cancel',status:'Status',date:'Date',type:'Request Type',pending:'Pending Approval',approved:'Approved',returned:'Returned',rejected:'Rejected',approve:'Approve',reject:'Reject',actions:'Actions',rejectionReason:'Rejection Reason',confirmReject:'Confirm Rejection',previewNursery:'Preview Nursery Requests',exitPreview:'Back to Admin Mode',viewRequest:'View Request',all:'All',category:'Category',location:'Current Location',save:'Save Asset',assetName:'Asset Name',choose:'Choose',notes:'Notes',cameraHint:'Point the camera at the barcode to scan it automatically.',cameraUnsupported:'Barcode scanning is not supported by this browser. Upload an image or enter the number manually.',closeCamera:'Close Camera',requestSent:'Request submitted successfully',assetSaved:'Asset added successfully',adminOnly:'Only administration can add assets',destinationNotNeeded:'Surplus requests do not require a destination.',disposalHint:'Provide a clear disposal reason for administration review.',surplusHint:'Explain why the asset is surplus. The “To” field is not required.',transferHint:'Select the source and destination nurseries and state the transfer reason.',edit:'Edit',delete:'Delete',editAsset:'Edit Asset',deleteConfirm:'Are you sure you want to delete this asset? This action cannot be undone.',assetUpdated:'Asset updated successfully',assetDeleted:'Asset deleted successfully',duplicateBarcode:'This asset is already registered in the system',duplicateBarcodeDetail:'Current location',duplicateBarcodeBlocked:'A new asset cannot be saved with the same barcode'}
};

function assetLabel(a,ar){return ar?a.nameAr:a.nameEn}
function nurseryLabel(a,ar){return ar?a.nurseryAr:a.nurseryEn}
function normalizeBarcode(value){return String(value||'').trim().replace(/\s+/g,'').toLowerCase()}

function rebuildAssetsFromAudit(){
 const logs=loadAuditLog().filter(x=>x.entityType==='asset').slice().reverse();
 const byBarcode=new Map();
 for(const row of logs){
  const key=normalizeBarcode(row.entityId||row.after?.barcode||row.before?.barcode);
  if(!key) continue;
  if(row.actionType==='delete'){byBarcode.delete(key);continue}
  const src=row.after||row.before;
  if(src?.barcode) byBarcode.set(key,{...src});
 }
 return [...byBarcode.values()];
}

function dbAssetToUi(row){
 const n=Array.isArray(row.nurseries)?row.nurseries[0]:row.nurseries;
 return {id:row.id,barcode:row.barcode||'',nameAr:row.name_ar||row.name_en||'',nameEn:row.name_en||row.name_ar||'',nurseryId:row.nursery_id||null,nurseryAr:n?.name_ar||n?.name_en||'',nurseryEn:n?.name_en||n?.name_ar||'',categoryAr:row.category_ar||row.category_en||'',categoryEn:row.category_en||row.category_ar||'',status:row.status||'active',notes:row.notes||''};
}

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
 const [editingAsset,setEditingAsset]=useState(null);
 const [officialDocument,setOfficialDocument]=useState(null);
 const [previewNursery,setPreviewNursery]=useState(false);
 const [toast,setToast]=useState('');
 const [assets,setAssets]=useState(ASSETS);
 const [assetsLoading,setAssetsLoading]=useState(true);
 const [assetsDbReady,setAssetsDbReady]=useState(false);
 const [requests,setRequests]=useState([]);
 const [search,setSearch]=useState('');

 useEffect(()=>{let alive=true;(async()=>{
  const auditFallback=rebuildAssetsFromAudit();
  try{
   const {data,error}=await supabase.from('assets').select('id,barcode,name_ar,name_en,category_ar,category_en,nursery_id,status,notes,created_at,nurseries(name_ar,name_en)').order('created_at',{ascending:false});
   if(error) throw error;
   let rows=data||[];

   // Recover assets that were added in older builds where they only lived in the browser audit log.
   // We only insert barcodes that are missing from Supabase, so existing production rows are never overwritten.
   if(auditFallback.length){
    const existing=new Set(rows.map(r=>normalizeBarcode(r.barcode)));
    const missing=auditFallback.filter(a=>a?.barcode&&!existing.has(normalizeBarcode(a.barcode)));
    if(missing.length){
      const {data:nurseryRows,error:nErr}=await supabase.from('nurseries').select('id,name_ar,name_en'); if(nErr) throw nErr;
      const nurseryMap=new Map();
      for(const n of nurseryRows||[]){if(n.name_ar)nurseryMap.set(n.name_ar,n.id);if(n.name_en)nurseryMap.set(n.name_en,n.id)}
      const payload=missing.map(a=>({
        barcode:String(a.barcode||'').trim(),name_ar:a.nameAr||a.nameEn||'',name_en:a.nameEn||a.nameAr||'',
        category_ar:a.categoryAr||a.categoryEn||'',category_en:a.categoryEn||a.categoryAr||'',
        nursery_id:nurseryMap.get(a.nurseryAr)||nurseryMap.get(a.nurseryEn)||a.nurseryId||null,
        status:a.status||'active',notes:a.notes||'',created_by:profile?.id||null
      })).filter(x=>x.barcode);
      if(payload.length){
        const {error:insertErr}=await supabase.from('assets').insert(payload);
        if(insertErr && insertErr.code!=='23505') throw insertErr;
        const refreshed=await supabase.from('assets').select('id,barcode,name_ar,name_en,category_ar,category_en,nursery_id,status,notes,created_at,nurseries(name_ar,name_en)').order('created_at',{ascending:false});
        if(refreshed.error) throw refreshed.error; rows=refreshed.data||rows;
      }
    }
   }
   if(alive){setAssets(rows.map(dbAssetToUi));setAssetsDbReady(true)}
  }catch(e){
    console.warn('Assets database unavailable',e);
    if(alive){setAssets(auditFallback);setAssetsDbReady(false);notify(ar?'تعذر الاتصال بجدول الأصول. لن يتم اعتبار أي إضافة محفوظة حتى يتم إصلاح الاتصال.':'Assets database is unavailable. New assets will not be treated as saved until the connection is fixed.')}
  }finally{if(alive)setAssetsLoading(false)}
 })();return()=>{alive=false}},[profile?.id]);

 const scopedAssets=useMemo(()=>isAdmin||previewNursery?assets:assets.filter(a=>a.nurseryAr===accountNursery||a.nurseryEn===accountNursery),[assets,isAdmin,previewNursery,accountNursery]);
 const scopedRequests=useMemo(()=>isAdmin||previewNursery?requests:requests.filter(r=>r.fromAr===accountNursery||r.fromEn===accountNursery),[requests,isAdmin,previewNursery,accountNursery]);
 const filtered=useMemo(()=>scopedAssets.filter(a=>[a.barcode,a.nameAr,a.nameEn,a.nurseryAr,a.nurseryEn].some(v=>v.toLowerCase().includes(search.toLowerCase()))),[scopedAssets,search]);
 function notify(msg){setToast(msg);setTimeout(()=>setToast(''),2600)}
 async function addAsset(form){
  const duplicate=assets.find(a=>normalizeBarcode(a.barcode)===normalizeBarcode(form.barcode));
  if(duplicate){notify(`${t.duplicateBarcode}: ${duplicate.barcode} — ${nurseryLabel(duplicate,ar)}`);return false}
  const barcode=String(form.barcode||'').trim();
  const next={barcode,nameAr:form.name,nameEn:form.name,nurseryAr:form.from,nurseryEn:form.from,categoryAr:form.category,categoryEn:form.category,status:'active',notes:form.notes||''};
  if(!assetsDbReady){notify(ar?'تعذر حفظ الأصل: قاعدة بيانات الأصول غير جاهزة. شغلي ملف 10_ASSETS_LIVE_DASHBOARD.sql أولاً.':'Could not save the asset: the assets database is not ready. Run 10_ASSETS_LIVE_DASHBOARD.sql first.');return false}
  const {data:nurseryRows,error:nurseryErr}=await supabase.from('nurseries').select('id,name_ar,name_en').or(`name_ar.eq.${form.from},name_en.eq.${form.from}`).limit(1);
  if(nurseryErr){notify(ar?'تعذر التحقق من الحضانة':'Could not verify the nursery');return false}
  const nurseryId=nurseryRows?.[0]?.id||null;
  if(!nurseryId){notify(ar?'تعذر حفظ الأصل: لم يتم العثور على الحضانة المحددة في قاعدة البيانات':'Could not save the asset: selected nursery was not found');return false}
  const {data,error}=await supabase.from('assets').insert({barcode,name_ar:form.name,name_en:form.name,category_ar:form.category,category_en:form.category,nursery_id:nurseryId,status:'active',notes:form.notes||'',created_by:profile?.id||null}).select('id,barcode,name_ar,name_en,category_ar,category_en,nursery_id,status,notes,nurseries(name_ar,name_en)').single();
  if(error){if(error.code==='23505'){notify(`${t.duplicateBarcode}: ${barcode}`);return false}console.error('Asset insert failed',error);notify(ar?`تعذر حفظ الأصل في قاعدة البيانات: ${error.message||'خطأ غير معروف'}`:`Could not save the asset: ${error.message||'Unknown error'}`);return false}
  const saved=dbAssetToUi(data);setAssets(x=>[saved,...x]);next.id=saved.id;next.nurseryId=saved.nurseryId;
  setModal(null);notify(t.assetSaved);recordAudit({profile,screen:'الأصول',action:'إضافة أصل',actionType:'create',entityType:'asset',entityId:next.barcode,nursery:next.nurseryAr,details:next.nameAr,after:next});window.dispatchEvent(new CustomEvent('saams:data-updated',{detail:{table:'assets'}}));return true;
 }
 async function updateAsset(form){
  if(!editingAsset)return; const before=editingAsset; let updated={...editingAsset,nameAr:form.name,nameEn:form.name,nurseryAr:form.from,nurseryEn:form.from,categoryAr:form.category,categoryEn:form.category};
  if(assetsDbReady){
   const {data:nurseryRows}=await supabase.from('nurseries').select('id,name_ar,name_en').or(`name_ar.eq.${form.from},name_en.eq.${form.from}`).limit(1); const nurseryId=nurseryRows?.[0]?.id||null;
   let q=supabase.from('assets').update({name_ar:form.name,name_en:form.name,category_ar:form.category,category_en:form.category,nursery_id:nurseryId,updated_at:new Date().toISOString()}); q=editingAsset.id?q.eq('id',editingAsset.id):q.eq('barcode',editingAsset.barcode);
   const {data,error}=await q.select('id,barcode,name_ar,name_en,category_ar,category_en,nursery_id,status,notes,nurseries(name_ar,name_en)').single(); if(error){notify(ar?'تعذر تحديث الأصل':'Could not update the asset');return} updated=dbAssetToUi(data);
  }
  setAssets(x=>x.map(a=>(editingAsset.id&&a.id===editingAsset.id)||(!editingAsset.id&&a.barcode===editingAsset.barcode)?updated:a));setEditingAsset(null);notify(t.assetUpdated);recordAudit({profile,screen:'الأصول',action:'تعديل أصل',actionType:'update',entityType:'asset',entityId:updated.barcode,nursery:updated.nurseryAr,details:updated.nameAr,before,after:updated});window.dispatchEvent(new CustomEvent('saams:data-updated',{detail:{table:'assets'}}));
 }
 async function deleteAsset(asset){
  if(!window.confirm(t.deleteConfirm))return;
  if(assetsDbReady){let q=supabase.from('assets').delete();q=asset.id?q.eq('id',asset.id):q.eq('barcode',asset.barcode);const {error}=await q;if(error){notify(ar?'تعذر حذف الأصل':'Could not delete the asset');return}}
  setAssets(x=>x.filter(a=>(asset.id?a.id!==asset.id:a.barcode!==asset.barcode)));if(historyAsset?.barcode===asset.barcode)setHistoryAsset(null);notify(t.assetDeleted);recordAudit({profile,screen:'الأصول',action:'حذف أصل',actionType:'delete',entityType:'asset',entityId:asset.barcode,nursery:asset.nurseryAr,details:asset.nameAr,before:asset});window.dispatchEvent(new CustomEvent('saams:data-updated',{detail:{table:'assets'}}));
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
  <div className="module-heading assets-heading"><div><span className="eyebrow">SAAMS Official 3.2</span><h1>{t.title}</h1><p>{t.sub}</p></div><div className="assets-heading-actions">{isAdmin&&<button className="preview-nursery-btn" onClick={()=>setPreviewNursery(v=>!v)}>{previewNursery?t.exitPreview:t.previewNursery}</button>}<div className="role-pill">{isAdmin&&!previewNursery?t.admin:t.nursery}</div></div></div>
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
   <div className="asset-list-card"><div className="asset-list-wrap"><table className="asset-list-table"><thead><tr><th>{t.barcode}</th><th>{t.asset}</th><th>{t.location}</th><th>{t.category}</th><th>{t.actions}</th></tr></thead><tbody>{filtered.length?filtered.map((a,index)=><tr key={`${a.barcode}-${a.nurseryAr}-${index}`}><td><span className="asset-barcode-cell">{a.barcode}</span></td><td><button className="asset-history-link asset-name-cell" type="button" onClick={()=>setHistoryAsset(a)}>{assetLabel(a,ar)}</button></td><td>{nurseryLabel(a,ar)}</td><td>{ar?a.categoryAr:a.categoryEn}</td><td><div className="asset-row-actions">{isAdmin&&!previewNursery?<><button className="asset-edit-btn" onClick={()=>setEditingAsset(a)}>✎ {t.edit}</button><button className="asset-delete-btn" onClick={()=>deleteAsset(a)}>⌫ {t.delete}</button></>:<><button title={t.transfer} onClick={()=>setModal('transfer')}>⇄</button><button title={t.surplus} onClick={()=>setModal('surplus')}>▱</button><button title={t.disposal} onClick={()=>setModal('disposal')}>⌫</button></>}</div></td></tr>):<tr><td colSpan="5" className="asset-empty-row">{ar?'لا توجد أصول مسجلة حاليًا':'No assets are currently registered'}</td></tr>}</tbody></table></div></div>
  </>:<div className="invoice-table-card"><div className="invoice-table-wrap"><table className="invoice-table asset-request-table"><thead><tr><th>{ar?'رقم الطلب':'Request ID'}</th><th>{t.type}</th><th>{t.asset}</th><th>{t.barcode}</th><th>{t.from}</th><th>{t.to}</th><th>{t.reason}</th><th>{t.status}</th><th>{t.date}</th><th>{t.actions}</th></tr></thead><tbody>{scopedRequests.map(r=><tr key={r.id}><td><button className="request-link" onClick={()=>setViewing(r)}>{r.id}</button></td><td><span className={`request-type ${r.type}`}>{t[r.type]}</span></td><td>{ar?r.assetAr:r.assetEn}</td><td>{r.barcode}</td><td>{ar?r.fromAr:r.fromEn}</td><td>{r.type==='transfer'?(ar?r.toAr:r.toEn):'—'}</td><td>{ar?r.reasonAr:r.reasonEn}</td><td><span className={`invoice-status ${r.status==='pending'?'review':r.status}`}>{t[r.status]}</span>{r.status==='rejected'&&<small className="rejection-inline">{ar?r.rejectionReasonAr:r.rejectionReasonEn}</small>}</td><td>{r.date}</td><td><div className="request-actions-cell"><button onClick={()=>setViewing(r)}>{t.viewRequest}</button>{isAdmin&&r.status==='pending'&&<><button className="approve-request-btn" onClick={()=>approveRequest(r.id)}>✓ {t.approve}</button><button className="reject-request-btn" onClick={()=>setRejecting(r)}>✕ {t.reject}</button></>}</div></td></tr>)}</tbody></table></div></div>}
  {officialDocument&&<AssetOfficialDocument request={officialDocument} ar={ar} onClose={()=>setOfficialDocument(null)} />}
  {historyAsset&&<AssetHistory asset={historyAsset} ar={ar} onClose={()=>setHistoryAsset(null)} />}
  {editingAsset&&<AssetEditModal asset={editingAsset} ar={ar} t={t} nurseries={nurseries} onClose={()=>setEditingAsset(null)} onSave={updateAsset}/>}
  {modal&&<AssetModal type={modal} ar={ar} defaultNursery={accountNursery} t={t} assets={assets} nurseries={nurseries} onClose={()=>setModal(null)} onSave={modal==='add'?addAsset:addRequest}/>}
  {viewing&&<RequestDetails request={viewing} ar={ar} t={t} isAdmin={isAdmin} onClose={()=>setViewing(null)} onApprove={()=>approveRequest(viewing.id)} onReject={()=>setRejecting(viewing)}/>}
  {rejecting&&<RejectModal request={rejecting} ar={ar} t={t} onClose={()=>setRejecting(null)} onConfirm={reason=>rejectRequest(rejecting.id,reason)}/>}
  {toast&&<div className="asset-toast">✓ {toast}</div>}
 </section>
}

function AssetEditModal({asset,ar,t,nurseries,onClose,onSave}){
 const [form,setForm]=useState({name:ar?asset.nameAr:asset.nameEn,category:ar?asset.categoryAr:asset.categoryEn,from:ar?asset.nurseryAr:asset.nurseryEn});
 return <div className="invoice-overlay" onClick={onClose}><form className="asset-modal" onSubmit={e=>{e.preventDefault();onSave(form)}} onClick={e=>e.stopPropagation()}>
  <div className="drawer-header"><div><small>SAAMS Assets</small><h2>{t.editAsset}</h2></div><button type="button" onClick={onClose}>×</button></div>
  <div className="asset-form-grid">
   <label><span>{t.barcode}</span><input value={asset.barcode} readOnly className="readonly-input"/></label>
   <label><span>{t.assetName}</span><input required autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
   <label><span>{t.category}</span><input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label>
   <label><span>{t.location}</span><select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{nurseries.map(n=><option key={n}>{n}</option>)}</select></label>
  </div>
  <div className="asset-modal-actions"><button type="button" className="secondary-action" onClick={onClose}>{t.cancel}</button><button className="primary-action">✓ {t.edit}</button></div>
 </form></div>
}

function AssetModal({type,ar,t,assets,nurseries,onClose,onSave,defaultNursery}){
 const [form,setForm]=useState({barcode:'',asset:'',from:defaultNursery||nurseries[0]||'',to:nurseries.find(n=>n!==defaultNursery)||nurseries[1]||'',reason:'',name:'',category:'',notes:''});
 const [lookup,setLookup]=useState(null),[camera,setCamera]=useState(false),[scanMsg,setScanMsg]=useState('');
 const videoRef=useRef(null),streamRef=useRef(null);
 const selected=assets.find(a=>normalizeBarcode(a.barcode)===normalizeBarcode(form.barcode));
 const duplicateOnAdd=type==='add'?selected:null;
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
 function submit(e){e.preventDefault();if(type==='add'&&duplicateOnAdd){setLookup('duplicate');return}if(type!=='add'&&!selected)return setLookup('missing');onSave(form)}
 const hint=type==='transfer'?t.transferHint:type==='surplus'?t.surplusHint:type==='disposal'?t.disposalHint:'';
 return <div className="invoice-overlay" onClick={()=>{stopCamera();onClose()}}><form className="asset-modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="drawer-header"><div><small>SAAMS Assets</small><h2>{type==='add'?t.add:t[type]}</h2></div><button type="button" onClick={()=>{stopCamera();onClose()}}>×</button></div>
  {type==='add'?<div className="asset-form-grid"><label><span>{t.barcode}</span><input required value={form.barcode} onChange={e=>{setForm({...form,barcode:e.target.value});setLookup(null)}}/>{duplicateOnAdd&&<div className="duplicate-asset-warning"><b>⚠ {t.duplicateBarcode}</b><span>{duplicateOnAdd.barcode} · {assetLabel(duplicateOnAdd,ar)} · {t.duplicateBarcodeDetail}: {nurseryLabel(duplicateOnAdd,ar)}</span><small>{t.duplicateBarcodeBlocked}</small></div>}</label><label><span>{t.assetName}</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span>{t.category}</span><input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label><span>{t.location}</span><select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{nurseries.map(n=><option key={n}>{n}</option>)}</select></label><label className="wide"><span>{t.notes}</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>:<>
   <p className="request-hint">{hint}</p><div className="barcode-panel"><label><span>{t.barcode}</span><div className="barcode-input-row"><input required value={form.barcode} onChange={e=>{setForm({...form,barcode:e.target.value});setLookup(null)}} placeholder="SEA-000000"/><button type="button" onClick={findAsset}>{t.lookup}</button></div></label><div className="barcode-tools"><button type="button" onClick={startCamera}>▣ {t.scan}</button><label className="upload-barcode">⇧ {t.upload}<input type="file" accept="image/*" capture="environment" onChange={e=>e.target.files[0]&&decodeImage(e.target.files[0])}/></label></div><small>{t.manual}</small>{scanMsg&&<div className="scan-warning">{scanMsg}</div>}{lookup==='found'&&selected&&<div className="asset-found"><b>✓ {t.found}</b><strong>{assetLabel(selected,ar)}</strong><span>{nurseryLabel(selected,ar)} · {selected.barcode}</span></div>}{lookup==='missing'&&<div className="scan-error">! {t.notFound}</div>}</div>
   {camera&&<div className="camera-box"><video ref={videoRef} autoPlay muted playsInline/><div className="scan-frame"></div><p>{t.cameraHint}</p><button type="button" onClick={stopCamera}>{t.closeCamera}</button></div>}
   <div className="asset-form-grid"><label><span>{t.asset}</span><input readOnly value={form.asset}/></label><label><span>{t.from}</span><select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{nurseries.map(n=><option key={n}>{n}</option>)}</select></label>{type==='transfer'&&<label><span>{t.to}</span><select value={form.to} onChange={e=>setForm({...form,to:e.target.value})}>{nurseries.filter(n=>n!==form.from).map(n=><option key={n}>{n}</option>)}</select></label>}<label className={type==='transfer'?'':'wide'}><span>{t.reason}</span><textarea required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label></div>
  </>}
  <div className="asset-modal-actions"><button type="button" className="secondary-action" onClick={()=>{stopCamera();onClose()}}>{t.cancel}</button><button className="primary-action" disabled={(type==='add'&&!!duplicateOnAdd)||(type!=='add'&&!selected)}>{type==='add'?t.save:t.submit}</button></div></form></div>
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
 const fallback=[];
 const rows=logs.length?logs.slice().reverse():fallback;
 return <div className="invoice-overlay" onClick={onClose}><aside className="asset-history-modal" onClick={e=>e.stopPropagation()}>
  <div className="drawer-header"><div><small>{ar?'سجل الأصل':'Asset History'}</small><h2>{asset.barcode}</h2></div><button onClick={onClose}>×</button></div>
  <div className="asset-history-summary"><div className="asset-card-icon">◇</div><div><strong>{ar?asset.nameAr:asset.nameEn}</strong><span>{ar?asset.nurseryAr:asset.nurseryEn}</span><small>{ar?asset.categoryAr:asset.categoryEn}</small></div></div>
  <div className="asset-history-note">{ar?'يعرض هذا السجل حركات النقل والفائض والإسقاط فقط.':'This history shows transfer, surplus, and disposal movements only.'}</div>
  <div className="entity-timeline asset-timeline">{rows.map((x,i)=><div key={x.id}><span>{i+1}</span><div><strong>{x.action}</strong><small>{x.date} · {x.time} · {x.user}</small><p>{x.details}</p>{x.reason&&<p className="timeline-reason">{x.reason}</p>}</div></div>)}</div>
 </aside></div>
}
