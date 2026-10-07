import { recordAudit, loadAuditLog } from '../utils/audit';
import AssetOfficialDocument from '../components/AssetOfficialDocument';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';
import { translateAssetName } from '../utils/assetTranslations';

const ASSETS = [];

const NURSERIES_AR=['الرحمانية الجديدة','مركز اللؤلؤية للطفولة المبكرة','مركز السيوح للطفولة المبكرة','واسط 2','مركز الرحمانية للطفولة المبكرة','البديع','اللية','القليعة','مركز البستان للطفولة المبكرة','مركز كلباء للطفولة المبكرة','الغيل','الطيبة','الحرس الأميري','الحمرية','المدينة الباسمة','الشرطي الصغير','الثميد','سهيلة','سهيلة الجديدة','البرير','مليحة','القادسية','دبا الحصن','السياقة','الشارقة النموذجية','مغيدر','الشيماء','المستقبل','غرفتي الصغيرة','جميلة','الباحثة','النحوة','جامعة خورفكان','جامعة كلباء','وادي الحلو','شيص'];
const NURSERIES_EN=['New Al Rahmaniya','Al Luluya Early Childhood Center','Al Suyoh Early Childhood Center','Wasit 2','Al Rahmaniya Early Childhood Center','Al Badie','Al Layyah','Al Qulayaa','Al Bustan Early Childhood Center','Kalba Early Childhood Center','Al Ghail','Al Taybah','Amiri Guard','Al Hamriyah','Al Madina Al Basma','Little Policeman','Al Thameed','Suhaila','New Suhaila','Al Brayer','Mleiha','Al Qadisiyah','Dibba Al Hisn','Driving Nursery','Sharjah Model Nursery','Mughaider','Al Shaimaa','Al Mustaqbal','My Little Room','Jameela','Al Bahitha','Al Nahwa','University of Khorfakkan','University of Kalba','Wadi Al Helo','Shees'];
const NURSERY_EN_BY_AR=Object.fromEntries(NURSERIES_AR.map((name,index)=>[name,NURSERIES_EN[index]]));
const CATEGORY_EN_BY_AR={
 'الأثاث':'Furniture','اثاث':'Furniture','أثاث':'Furniture',
 'معدات المطبخ':'Kitchen Equipment','أجهزة التكييف':'Air Conditioning Equipment','اجهزة التكييف':'Air Conditioning Equipment',
 'معدات تقنية المعلومات':'IT Equipment','تقنية المعلومات':'IT Equipment','معدات رياضية':'Sports Equipment',
 'معدات مكتبية':'Office Equipment','أجهزة كهربائية':'Electrical Equipment','اجهزة كهربائية':'Electrical Equipment',
 'ألعاب':'Toys','العاب':'Toys','معدات تعليمية':'Educational Equipment','تقنية':'Technology','أجهزة':'Equipment','اجهزة':'Equipment'
};
function hasArabic(value){return /[\u0600-\u06FF]/.test(String(value||''))}
function englishNursery(value){return NURSERY_EN_BY_AR[String(value||'').trim()]||value||''}
function englishCategory(value){const key=String(value||'').trim();return CATEGORY_EN_BY_AR[key]||key}

const EXTRA_TRANSFER_DESTINATIONS_AR=['المخزن','المبنى الرئيسي'];
const EXTRA_TRANSFER_DESTINATIONS_EN=['Warehouse','Main Building'];


const COPY={
 ar:{title:'إدارة الأصول',sub:'سجل الأصول وطلبات النقل والفائض والإسقاط في شاشة موحدة.',admin:'الإدارة',nursery:'الحضانة',add:'إضافة أصل',register:'سجل الأصول',requests:'طلبات الأصول',transfer:'طلب نقل',surplus:'طلب فائض',disposal:'طلب إسقاط',barcode:'رقم الباركود',asset:'اسم الأصل',from:'من',to:'إلى',reason:'السبب',scan:'تصوير الباركود',upload:'رفع صورة الباركود',manual:'أو أدخلي الرقم يدويًا',lookup:'البحث عن الأصل',found:'تم التعرف على الأصل',notFound:'لم يتم العثور على أصل بهذا الباركود',submit:'إرسال الطلب',cancel:'إلغاء',status:'الحالة',date:'التاريخ',type:'نوع الطلب',pending:'قيد الاعتماد',approved:'معتمد',returned:'معاد',rejected:'مرفوض',approve:'اعتماد',reject:'رفض',actions:'الإجراءات',rejectionReason:'سبب الرفض',confirmReject:'تأكيد الرفض',previewNursery:'معاينة طلبات الحضانة',exitPreview:'العودة لوضع الإدارة',viewRequest:'عرض الطلب',all:'الكل',category:'التصنيف',location:'الموقع الحالي',save:'حفظ الأصل',assetName:'اسم الأصل',choose:'اختاري',notes:'ملاحظات',cameraHint:'وجهي الكاميرا على الباركود حتى تتم قراءته تلقائيًا.',cameraUnsupported:'المتصفح لا يدعم قراءة الباركود مباشرة. استخدمي رفع الصورة أو اكتبي الرقم.',closeCamera:'إغلاق الكاميرا',requestSent:'تم إرسال الطلب بنجاح',assetSaved:'تمت إضافة الأصل بنجاح',adminOnly:'إضافة الأصول متاحة للإدارة فقط',destinationNotNeeded:'الفائض لا يحتاج تحديد جهة مستلمة.',disposalHint:'أرفقي سبب الإسقاط بشكل واضح ليتم عرضه على الإدارة.',surplusHint:'حددي سبب اعتبار الأصل فائضًا، ولن يظهر حقل «إلى».',transferHint:'حددي الحضانة المنقول منها وإليها مع سبب النقل.',edit:'تعديل',delete:'حذف',editAsset:'تعديل الأصل',deleteConfirm:'هل أنتِ متأكدة من حذف هذا الأصل؟ لا يمكن التراجع عن الحذف.',assetUpdated:'تم تحديث الأصل بنجاح',assetDeleted:'تم حذف الأصل بنجاح',duplicateBarcode:'هذا الأصل مسجل مسبقًا في النظام',duplicateBarcodeDetail:'الموقع الحالي',duplicateBarcodeBlocked:'لا يمكن حفظ أصل جديد بنفس الباركود',excelTemplate:'تحميل قالب Excel',excelUpload:'رفع Excel',excelReading:'جاري قراءة الملف...',excelBadFile:'تعذر قراءة ملف Excel. تأكدي من استخدام القالب المعتمد.',excelMissingHeaders:'أعمدة ملف Excel غير مطابقة للقالب المعتمد.',excelNoRows:'لا توجد أصول مكتملة في الملف.',excelConfirm:'سيتم فحص الملف وحفظ الأصول الصحيحة فقط. هل تريدين المتابعة؟',excelDone:'اكتمل رفع الأصول من Excel',excelTemplateMade:'تم تنزيل قالب Excel المعتمد',excelParsed:'تمت قراءة ملف Excel بنجاح',excelDbError:'تمت قراءة Excel لكن تعذر الاتصال ببيانات الأصول'},
 en:{title:'Asset Management',sub:'A unified register for asset transfers, surplus, and disposal requests.',admin:'Administration',nursery:'Nursery',add:'Add Asset',register:'Asset Register',requests:'Asset Requests',transfer:'Transfer Request',surplus:'Surplus Request',disposal:'Disposal Request',barcode:'Barcode Number',asset:'Asset Name',from:'From',to:'To',reason:'Reason',scan:'Scan Barcode',upload:'Upload Barcode Image',manual:'or enter the number manually',lookup:'Find Asset',found:'Asset identified',notFound:'No asset found for this barcode',submit:'Submit Request',cancel:'Cancel',status:'Status',date:'Date',type:'Request Type',pending:'Pending Approval',approved:'Approved',returned:'Returned',rejected:'Rejected',approve:'Approve',reject:'Reject',actions:'Actions',rejectionReason:'Rejection Reason',confirmReject:'Confirm Rejection',previewNursery:'Preview Nursery Requests',exitPreview:'Back to Admin Mode',viewRequest:'View Request',all:'All',category:'Category',location:'Current Location',save:'Save Asset',assetName:'Asset Name',choose:'Choose',notes:'Notes',cameraHint:'Point the camera at the barcode to scan it automatically.',cameraUnsupported:'Barcode scanning is not supported by this browser. Upload an image or enter the number manually.',closeCamera:'Close Camera',requestSent:'Request submitted successfully',assetSaved:'Asset added successfully',adminOnly:'Only administration can add assets',destinationNotNeeded:'Surplus requests do not require a destination.',disposalHint:'Provide a clear disposal reason for administration review.',surplusHint:'Explain why the asset is surplus. The “To” field is not required.',transferHint:'Select the source and destination nurseries and state the transfer reason.',edit:'Edit',delete:'Delete',editAsset:'Edit Asset',deleteConfirm:'Are you sure you want to delete this asset? This action cannot be undone.',assetUpdated:'Asset updated successfully',assetDeleted:'Asset deleted successfully',duplicateBarcode:'This asset is already registered in the system',duplicateBarcodeDetail:'Current location',duplicateBarcodeBlocked:'A new asset cannot be saved with the same barcode',excelTemplate:'Download Excel Template',excelUpload:'Upload Excel',excelReading:'Reading file...',excelBadFile:'Could not read the Excel file. Please use the approved template.',excelMissingHeaders:'Excel columns do not match the approved template.',excelNoRows:'No complete asset rows were found.',excelConfirm:'The file will be validated and only valid assets will be saved. Continue?',excelDone:'Excel asset import completed',excelTemplateMade:'Approved Excel template downloaded',excelParsed:'Excel file read successfully',excelDbError:'Excel was read, but asset data could not be loaded'}
};

function assetLabel(a,ar){if(ar)return a.nameAr;const v=a.nameEn||a.nameAr;return hasArabic(v)?translateAssetName(a.nameAr||v):v}
function nurseryLabel(a,ar){if(ar)return a.nurseryAr;const value=a.nurseryEn||a.nurseryAr;return hasArabic(value)?englishNursery(a.nurseryAr||value):value}
function normalizeBarcode(value){return String(value||'').trim().replace(/\s+/g,'').toLowerCase()}

const NURSERY_IMPORT_ALIASES={
 'اللؤلؤية':'مركز اللؤلؤية للطفولة المبكرة',
 'السيوح':'مركز السيوح للطفولة المبكرة',
 'الرحمانية':'مركز الرحمانية للطفولة المبكرة',
 'البستان':'مركز البستان للطفولة المبكرة',
 'كلباء':'مركز كلباء للطفولة المبكرة',
 'الساف':'الغيل'
};
function normalizeNurseryForImport(value){
 let name=String(value||'').replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ').trim();
 name=name.replace(/^حضانة\s+/,'').trim();
 return NURSERY_IMPORT_ALIASES[name]||name;
}

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

async function fetchAllAssetRows(){
 const pageSize=1000;
 let from=0;
 let all=[];
 while(true){
  const {data,error}=await supabase.from('assets')
   .select('id,barcode,name_ar,name_en,category_ar,category_en,nursery_id,status,notes,created_at,nurseries(name_ar,name_en)')
   .order('created_at',{ascending:false})
   .range(from,from+pageSize-1);
  if(error)return {data:null,error};
  const rows=data||[];
  all=all.concat(rows);
  if(rows.length<pageSize)break;
  from+=pageSize;
 }
 return {data:all,error:null};
}

function dbRequestToUi(row){
 return {
  dbId:row.id,
  id:row.request_code||String(row.id||''),
  type:row.request_type||'transfer',
  barcode:row.barcode||'',
  assetAr:row.asset_name_ar||row.asset_name_en||'',
  assetEn:row.asset_name_en||row.asset_name_ar||'',
  fromAr:row.from_name_ar||row.from_name_en||'',
  fromEn:row.from_name_en||row.from_name_ar||'',
  toAr:row.to_name_ar||row.to_name_en||'',
  toEn:row.to_name_en||row.to_name_ar||'',
  reasonAr:row.reason_ar||row.reason_en||'',
  reasonEn:row.reason_en||row.reason_ar||'',
  status:row.status||'pending',
  date:row.created_at?new Date(row.created_at).toLocaleDateString('en-GB'):'',
  rejectionReasonAr:row.rejection_reason_ar||row.rejection_reason_en||'',
  rejectionReasonEn:row.rejection_reason_en||row.rejection_reason_ar||'',
  decisionDate:row.decision_at?new Date(row.decision_at).toLocaleDateString('en-GB'):'',
  createdBy:row.created_by||null
 };
}

async function fetchAllAssetRequestRows(){
 const pageSize=1000;
 let from=0;
 let all=[];
 while(true){
  const {data,error}=await supabase.from('asset_requests')
   .select('*')
   .order('created_at',{ascending:false})
   .range(from,from+pageSize-1);
  if(error)return {data:null,error};
  const rows=data||[];
  all=all.concat(rows);
  if(rows.length<pageSize)break;
  from+=pageSize;
 }
 return {data:all,error:null};
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
 const [requestsDbReady,setRequestsDbReady]=useState(false);
 const [search,setSearch]=useState('');
 const [nurseryFilter,setNurseryFilter]=useState('');
 const [categoryFilter,setCategoryFilter]=useState('');
 const [excelImporting,setExcelImporting]=useState(false);
 const [assetPage,setAssetPage]=useState(1);
 const ASSET_PAGE_SIZE=50;
 const excelInputRef=useRef(null);

 useEffect(()=>{let alive=true;(async()=>{
  const auditFallback=rebuildAssetsFromAudit();
  try{
   const {data,error}=await fetchAllAssetRows();
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
        const refreshed=await fetchAllAssetRows();
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
 async function loadRequests(){
  try{
   const {data,error}=await fetchAllAssetRequestRows();
   if(error) throw error;
   setRequests((data||[]).map(dbRequestToUi));
   setRequestsDbReady(true);
  }catch(err){
   console.warn('asset_requests load failed',err);
   setRequestsDbReady(false);
  }
 }
 useEffect(()=>{
  let alive=true;
  const run=async()=>{if(!alive)return;await loadRequests()};
  run();
  const timer=setInterval(run,15000);
  const onFocus=()=>run();
  const onSync=()=>run();
  window.addEventListener('focus',onFocus);
  window.addEventListener('saams:data-changed',onSync);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('saams:data-changed',onSync)};
 },[profile?.id]);

 const scopedRequests=useMemo(()=>isAdmin||previewNursery?requests:requests.filter(r=>r.fromAr===accountNursery||r.fromEn===accountNursery),[requests,isAdmin,previewNursery,accountNursery]);
 const nurseryFilterOptions=useMemo(()=>[...new Set(scopedAssets.map(a=>nurseryLabel(a,ar)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,ar?'ar':'en')),[scopedAssets,ar]);
 const categoryFilterOptions=useMemo(()=>[...new Set(scopedAssets.map(a=>ar?a.categoryAr:a.categoryEn).filter(Boolean))].sort((a,b)=>a.localeCompare(b,ar?'ar':'en')),[scopedAssets,ar]);
 const filtered=useMemo(()=>{
  const q=search.trim().toLowerCase();
  return scopedAssets.filter(a=>{
   const nursery=nurseryLabel(a,ar)||'';
   const category=(ar?a.categoryAr:a.categoryEn)||'';
   const matchesSearch=!q||[a.barcode,a.nameAr,a.nameEn,a.nurseryAr,a.nurseryEn,a.categoryAr,a.categoryEn].some(v=>String(v||'').toLowerCase().includes(q));
   const matchesNursery=!nurseryFilter||nursery===nurseryFilter;
   const matchesCategory=!categoryFilter||category===categoryFilter;
   return matchesSearch&&matchesNursery&&matchesCategory;
  });
 },[scopedAssets,search,nurseryFilter,categoryFilter,ar]);
 const assetPageCount=Math.max(1,Math.ceil(filtered.length/ASSET_PAGE_SIZE));
 const safeAssetPage=Math.min(assetPage,assetPageCount);
 const pagedAssets=useMemo(()=>filtered.slice((safeAssetPage-1)*ASSET_PAGE_SIZE,safeAssetPage*ASSET_PAGE_SIZE),[filtered,safeAssetPage]);
 useEffect(()=>{setAssetPage(1)},[search,nurseryFilter,categoryFilter,previewNursery,accountNursery,tab]);
 useEffect(()=>{if(assetPage>assetPageCount)setAssetPage(assetPageCount)},[assetPage,assetPageCount]);
 useEffect(()=>{if(!isAdmin&&tab==='requests')setTab('register')},[isAdmin,tab]);
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
 function downloadAssetExcelTemplate(){
  try{
   const rows=[['رقم الباركود','اسم الأصل','التصنيف','الحضانة / الموقع الحالي','ملاحظات']];
   const ws=XLSX.utils.aoa_to_sheet(rows);
   ws['!cols']=[{wch:22},{wch:30},{wch:24},{wch:38},{wch:34}];
   const nurseryWs=XLSX.utils.aoa_to_sheet([['قائمة الحضانات الرسمية'],...NURSERIES_AR.map(n=>[n])]);
   nurseryWs['!cols']=[{wch:40}];
   const guideWs=XLSX.utils.aoa_to_sheet([
    ['طريقة الاستخدام'],
    ['1','كل أصل يكون في صف مستقل.'],
    ['2','لا تغيري أسماء الأعمدة أو ترتيبها.'],
    ['3','رقم الباركود يجب أن يكون فريدًا على مستوى النظام.'],
    ['4','اكتبي اسم الحضانة كما يظهر في ورقة «قائمة الحضانات».'],
    ['5','الملاحظات اختيارية، وباقي الأعمدة إلزامية.'],
    ['6','احفظي الملف بصيغة XLSX ثم ارفعيه من زر «رفع Excel».']
   ]);
   guideWs['!cols']=[{wch:8},{wch:75}];
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,ws,'الأصول');
   XLSX.utils.book_append_sheet(wb,nurseryWs,'قائمة الحضانات');
   XLSX.utils.book_append_sheet(wb,guideWs,'تعليمات');
   XLSX.writeFile(wb,'SAAMS_Asset_Bulk_Import_Template.xlsx',{compression:true});
   notify(t.excelTemplateMade||t.excelTemplate);
  }catch(e){
   console.error('Excel template generation failed',e);
   notify(ar?'تعذر إنشاء قالب Excel. أعيدي المحاولة.':'Could not generate the Excel template. Please try again.');
  }
 }

 async function readExcelWorkbook(file){
  const buffer=await file.arrayBuffer();
  let lastError=null;
  try{return XLSX.read(new Uint8Array(buffer),{type:'array',cellDates:false,cellText:true})}catch(e){lastError=e}
  try{
   const bytes=new Uint8Array(buffer); let binary=''; const chunk=0x8000;
   for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
   return XLSX.read(binary,{type:'binary',cellDates:false,cellText:true});
  }catch(e){lastError=e}
  throw new Error(`XLSX_PARSE:${lastError?.message||'Unknown Excel parsing error'}`);
 }

 async function importAssetsExcel(file){
  if(!file||!isAdmin||previewNursery)return;
  setExcelImporting(true);
  try{
   if(!/\.(xlsx|xls)$/i.test(file.name||'')) throw new Error('BAD_EXTENSION');
   const wb=await readExcelWorkbook(file);
   const ws=wb.Sheets['الأصول']||wb.Sheets[wb.SheetNames[0]];
   if(!ws) throw new Error('NO_SHEET');
   const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,blankrows:false});
   if(!Array.isArray(raw)||!raw.length) throw new Error('EMPTY_SHEET');
   const normalizeHeader=(value)=>String(value||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/[ًٌٍَُِّْـ]/g,'')
    .replace(/\*/g,'')
    .replace(/[\/\\|:_–—-]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase();
   const aliases={
    barcode:['رقم الباركود','الباركود','barcode number','barcode','asset barcode','asset code','كود الأصل','رقم الأصل'],
    name:['اسم الأصل','اسم الاصل','الأصل','الاصل','asset name','asset'],
    category:['التصنيف','الفئة','نوع الأصل','نوع الاصل','category','asset category'],
    nursery:['الحضانة الموقع الحالي','الحضانة','الموقع الحالي','الموقع','nursery current location','nursery','current location','location'],
    notes:['ملاحظات','ملاحظة','notes','note']
   };
   const normAliases=Object.fromEntries(Object.entries(aliases).map(([k,arr])=>[k,arr.map(normalizeHeader)]));
   const findCol=(headers,names)=>headers.findIndex(h=>names.some(n=>h===n||h.includes(n)||n.includes(h)));
   let headerIndex=-1, indices=null;
   const scanLimit=Math.min(raw.length,25);
   for(let ri=0;ri<scanLimit;ri++){
    const headers=(raw[ri]||[]).map(normalizeHeader);
    const cand={
     barcode:findCol(headers,normAliases.barcode),
     name:findCol(headers,normAliases.name),
     category:findCol(headers,normAliases.category),
     nursery:findCol(headers,normAliases.nursery),
     notes:findCol(headers,normAliases.notes)
    };
    const score=['barcode','name','category','nursery'].filter(k=>cand[k]>=0).length;
    if(score===4){headerIndex=ri;indices=cand;break}
   }
   // Official template fallback: columns A:E in this exact order.
   if(headerIndex<0 && raw.length>=3){
    const third=(raw[2]||[]).map(normalizeHeader);
    if(third.length>=4 && third.some(Boolean)){
     headerIndex=2; indices={barcode:0,name:1,category:2,nursery:3,notes:4};
    }
   }
   // Simple template fallback: headers in the first row, A:E.
   if(headerIndex<0 && raw.length){
    const first=(raw[0]||[]).map(normalizeHeader);
    if(first.length>=4 && first.some(Boolean)){
     headerIndex=0; indices={barcode:0,name:1,category:2,nursery:3,notes:4};
    }
   }
   if(headerIndex<0||!indices) throw new Error('HEADERS');
   const iBarcode=indices.barcode;
   const iName=indices.name;
   const iCategory=indices.category;
   const iNursery=indices.nursery;
   const iNotes=indices.notes;
   if([iBarcode,iName,iCategory,iNursery].some(i=>i<0)) throw new Error('HEADERS');

   const sourceRows=raw.slice(headerIndex+1).map((r,idx)=>({
    excelRow:headerIndex+2+idx,
    barcode:String(r[iBarcode]||'').trim(),
    name:String(r[iName]||'').trim(),
    category:String(r[iCategory]||'').trim(),
    nursery:String(r[iNursery]||'').trim(),
    notes:iNotes>=0?String(r[iNotes]||'').trim():''
   })).filter(r=>r.barcode||r.name||r.category||r.nursery||r.notes);
   if(!sourceRows.length){notify(t.excelNoRows);return}
   if(!window.confirm(`${t.excelConfirm}\n\n${ar?'عدد الصفوف في الملف':'Rows in file'}: ${sourceRows.length}`))return;

   const {data:nurseryRows,error:nurseryErr}=await supabase.from('nurseries').select('id,name_ar,name_en').eq('active',true);
   if(nurseryErr) throw new Error(`DB_NURSERIES:${nurseryErr.message||nurseryErr.code||'error'}`);
   const nurseryMap=new Map();
   for(const n of nurseryRows||[]){
    if(n.name_ar){const raw=String(n.name_ar).trim();nurseryMap.set(raw,n.id);nurseryMap.set(normalizeNurseryForImport(raw),n.id)}
    if(n.name_en){const raw=String(n.name_en).trim();nurseryMap.set(raw,n.id);nurseryMap.set(normalizeNurseryForImport(raw),n.id)}
   }
   const seen=new Set();
   const valid=[]; const issues=[];
   for(const r of sourceRows){
    const key=normalizeBarcode(r.barcode);
    if(!r.barcode||!r.name||!r.category||!r.nursery){issues.push({row:r.excelRow,reason:ar?'بيانات إلزامية ناقصة':'Missing required data'});continue}
    if(seen.has(key)){issues.push({row:r.excelRow,reason:`${ar?'باركود مكرر داخل الملف':'Duplicate barcode in file'}: ${r.barcode}`});continue}
    const normalizedNursery=normalizeNurseryForImport(r.nursery);
    const nurseryId=nurseryMap.get(normalizedNursery)||nurseryMap.get(r.nursery);
    if(!nurseryId){issues.push({row:r.excelRow,reason:`${ar?'الحضانة غير فعالة/غير موجودة بالقائمة الرسمية وتحتاج مراجعة':'Nursery is not active/in the official list and needs review'}: ${r.nursery}`});continue}
    seen.add(key);
    valid.push({excelRow:r.excelRow,barcode:r.barcode,payload:{barcode:r.barcode,name_ar:r.name,name_en:r.name,category_ar:r.category,category_en:r.category,nursery_id:nurseryId,status:'active',notes:r.notes,created_by:profile?.id||null}});
   }
   let imported=0;
   // Production-safe Excel import:
   // 1) read the current barcodes from Supabase,
   // 2) skip only the assets that already exist,
   // 3) INSERT new assets without ON CONFLICT.
   // This avoids depending on a database UNIQUE constraint and prevents one duplicate
   // from blocking an entire Excel batch.
   const existingResult=await fetchAllAssetRows();
   if(existingResult.error) throw new Error(`DB_ASSETS:${existingResult.error.message||existingResult.error.code||'error'}`);
   const existingKeys=new Set((existingResult.data||[]).map(r=>normalizeBarcode(r.barcode)).filter(Boolean));
   const pending=[];
   for(const item of valid){
    const key=normalizeBarcode(item.barcode);
    if(existingKeys.has(key)){
      issues.push({row:item.excelRow,reason:`${ar?'الباركود موجود مسبقًا — تم تخطيه بدون تكرار':'Barcode already exists — skipped without duplication'}: ${item.barcode}`});
      continue;
    }
    pending.push(item);
   }
   async function insertEntries(entries){
    if(!entries.length)return;
    const payload=entries.map(x=>x.payload);
    const {data,error}=await supabase.from('assets').insert(payload).select('id,barcode');
    if(error){
      // Isolate the exact bad row; all other valid rows continue saving.
      if(entries.length>1){
        const mid=Math.ceil(entries.length/2);
        await insertEntries(entries.slice(0,mid));
        await insertEntries(entries.slice(mid));
        return;
      }
      const item=entries[0];
      if(error.code==='23505'){
        issues.push({row:item.excelRow,reason:`${ar?'الباركود موجود مسبقًا — تم تخطيه بدون تكرار':'Barcode already exists — skipped without duplication'}: ${item.barcode}`});
        existingKeys.add(normalizeBarcode(item.barcode));
      }else{
        issues.push({row:item.excelRow,reason:`${ar?'تعذر حفظ هذا الأصل':'Could not save this asset'}: ${error.message||error.code||'Database error'}`});
      }
      return;
    }
    const rows=data||[];
    imported+=rows.length;
    for(const row of rows) existingKeys.add(normalizeBarcode(row.barcode));
   }
   for(let i=0;i<pending.length;i+=200){
    await insertEntries(pending.slice(i,i+200));
   }
   const refreshed=await fetchAllAssetRows();
   if(!refreshed.error)setAssets((refreshed.data||[]).map(dbAssetToUi));
   window.dispatchEvent(new CustomEvent('saams:data-updated',{detail:{table:'assets'}}));
   const issueLines=issues.slice(0,12).map(x=>`${ar?'صف':'Row'} ${x.row}: ${x.reason}`).join('\n');
   const more=issues.length>12?`\n${ar?'... وملاحظات إضافية':'... and more issues'}: ${issues.length-12}`:'';
   window.alert(`${t.excelDone}\n\n${ar?'تم الحفظ':'Imported'}: ${imported}\n${ar?'لم يتم الحفظ':'Skipped'}: ${issues.length}${issueLines?`\n\n${issueLines}${more}`:''}`);
   if(imported) recordAudit({profile,screen:'الأصول',action:'رفع أصول من Excel',actionType:'create',entityType:'asset_bulk_import',entityId:`BULK-${Date.now()}`,details:`${imported} assets imported`});
  }catch(e){
   console.error('Excel asset import failed',e);
   const msg=String(e?.message||'');
   if(msg==='HEADERS') notify(t.excelMissingHeaders);
   else if(msg.startsWith('DB_')) notify(`${t.excelDbError||'تعذر تحميل بيانات الأصول'}: ${msg.split(':').slice(1).join(':')}`);
   else if(msg.startsWith('XLSX_PARSE:')) notify(`${t.excelBadFile} (${msg.slice(11)})`);
   else if(msg==='BAD_EXTENSION') notify(ar?'الملف يجب أن يكون بصيغة XLSX أو XLS.':'The file must be XLSX or XLS.');
   else if(msg==='EMPTY_SHEET'||msg==='NO_SHEET') notify(ar?'ملف Excel فارغ أو لا يحتوي ورقة الأصول.':'The Excel file is empty or does not contain the assets sheet.');
   else notify(`${t.excelBadFile}${msg?` — ${msg}`:''}`);
  }finally{
   setExcelImporting(false);
   if(excelInputRef.current)excelInputRef.current.value='';
  }
 }

 async function addRequest(form){
  const a=assets.find(x=>normalizeBarcode(x.barcode)===normalizeBarcode(form.barcode));
  const requestCode=`AST-REQ-${Date.now().toString().slice(-9)}`;
  const payload={
   request_code:requestCode,
   request_type:modal,
   asset_id:a?.id||null,
   barcode:form.barcode,
   asset_name_ar:a?.nameAr||form.asset,
   asset_name_en:a?.nameEn||form.asset,
   from_name_ar:form.from,
   from_name_en:form.from,
   to_name_ar:modal==='transfer'?(form.to||''):null,
   to_name_en:modal==='transfer'?(form.to||''):null,
   reason_ar:form.reason,
   reason_en:form.reason,
   status:'pending',
   created_by:profile?.id||null
  };
  try{
   const {data,error}=await supabase.from('asset_requests').insert(payload).select('*').single();
   if(error) throw error;
   const saved=dbRequestToUi(data);
   setRequests(x=>[saved,...x.filter(r=>r.id!==saved.id)]);
   setRequestsDbReady(true);
   setModal(null);
   notify(t.requestSent);
   recordAudit({profile,screen:'الأصول',action:modal==='transfer'?'طلب نقل أصل':modal==='surplus'?'طلب فائض أصل':'طلب إسقاط أصل',actionType:modal,entityType:'asset_request',entityId:saved.id,nursery:form.from,details:`${saved.assetAr} — ${saved.barcode}`,after:{status:'pending',to:form.to||null}});
   window.dispatchEvent(new CustomEvent('saams:data-changed',{detail:{entity:'asset_request',action:'insert'}}));
  }catch(err){
   console.error('asset request save failed',err);
   const message=String(err?.message||'');
   alert(ar?`تعذر إرسال الطلب إلى الإدارة. ${message.includes('asset_requests')?'تأكدي من تشغيل ملف SQL الخاص بطلبات الأصول في Supabase.':message}`:`Could not send request to administration. ${message}`);
  }
 }
 async function approveRequest(id){
  const req=requests.find(r=>r.id===id);
  if(!req)return;
  const decisionAt=new Date().toISOString();
  try{
   const query=supabase.from('asset_requests').update({status:'approved',decision_at:decisionAt,decided_by:profile?.id||null}).eq(req.dbId?'id':'request_code',req.dbId||req.id).select('*').single();
   const {data,error}=await query;
   if(error)throw error;
   const updated=dbRequestToUi(data);
   setRequests(x=>x.map(r=>r.id===id?updated:r));setViewing(null);notify(ar?'تم اعتماد الطلب بنجاح':'Request approved successfully');
   recordAudit({profile,screen:'الأصول',action:'اعتماد طلب أصل',actionType:'approve',entityType:'asset_request',entityId:req.id,nursery:req.fromAr,details:`${req.assetAr} — ${req.barcode}`,before:{status:req.status},after:{status:'approved',decisionDate:updated.decisionDate}});
   window.dispatchEvent(new CustomEvent('saams:data-changed',{detail:{entity:'asset_request',action:'approve'}}));
  }catch(err){console.error(err);alert(ar?'تعذر اعتماد الطلب. حاولي مرة أخرى.':'Could not approve request.')}
 }
 async function rejectRequest(id,reason){
  const req=requests.find(r=>r.id===id);if(!req)return;
  const decisionAt=new Date().toISOString();
  try{
   const {data,error}=await supabase.from('asset_requests').update({status:'rejected',rejection_reason_ar:reason,rejection_reason_en:reason,decision_at:decisionAt,decided_by:profile?.id||null}).eq(req.dbId?'id':'request_code',req.dbId||req.id).select('*').single();
   if(error)throw error;
   const updated=dbRequestToUi(data);
   setRequests(x=>x.map(r=>r.id===id?updated:r));setRejecting(null);setViewing(null);notify(ar?'تم رفض الطلب وإضافة سبب الرفض':'Request rejected with reason');
   window.dispatchEvent(new CustomEvent('saams:data-changed',{detail:{entity:'asset_request',action:'reject'}}));
  }catch(err){console.error(err);alert(ar?'تعذر رفض الطلب. حاولي مرة أخرى.':'Could not reject request.')}
 }
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
   {isAdmin&&<button className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}>{t.requests}</button>}
  </div>
  {tab==='register'?<>
   <div className="asset-toolbar asset-toolbar-stacked">
    <div className="asset-filter-row">
     <div className="invoice-search asset-search-main"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAdmin||previewNursery?(ar?'ابحثي باسم الأصل أو الباركود أو الحضانة أو التصنيف...':'Search asset, barcode, nursery, or category...'):(ar?'ابحثي باسم الأصل أو الباركود أو التصنيف...':'Search asset, barcode, or category...')}/></div>
     {isAdmin||previewNursery?<select className="asset-filter-select" value={nurseryFilter} onChange={e=>setNurseryFilter(e.target.value)}><option value="">{ar?'كل الحضانات':'All nurseries'}</option>{nurseryFilterOptions.map(n=><option key={n} value={n}>{n}</option>)}</select>:<div className="asset-nursery-fixed-filter"><small>{ar?'الحضانة':'Nursery'}</small><strong>{accountNursery||'—'}</strong></div>}
     <select className="asset-filter-select" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="">{ar?'كل التصنيفات':'All categories'}</option>{categoryFilterOptions.map(c=><option key={c} value={c}>{c}</option>)}</select>
     <button type="button" className="asset-clear-filters" disabled={!search&&!nurseryFilter&&!categoryFilter} onClick={()=>{setSearch('');setNurseryFilter('');setCategoryFilter('')}}>{ar?'مسح الفلاتر':'Clear filters'}</button>
    </div>
    <div className="asset-filter-summary">{ar?`تم العثور على ${filtered.length.toLocaleString('en-US')} أصل من أصل ${scopedAssets.length.toLocaleString('en-US')}`:`Found ${filtered.length.toLocaleString('en-US')} of ${scopedAssets.length.toLocaleString('en-US')} assets`}</div>
    <div className="asset-actions">
     {(!isAdmin||previewNursery)&&<><button onClick={()=>setModal('transfer')}>⇄ {t.transfer}</button><button onClick={()=>setModal('surplus')}>▱ {t.surplus}</button><button onClick={()=>setModal('disposal')}>⌫ {t.disposal}</button></>}
     {isAdmin&&!previewNursery&&<><button type="button" className="asset-excel-template-btn" onClick={downloadAssetExcelTemplate}>⇩ {t.excelTemplate}</button><button type="button" className="asset-excel-upload-btn" disabled={excelImporting} onClick={()=>excelInputRef.current?.click()}>{excelImporting?'… '+t.excelReading:'⇧ '+t.excelUpload}</button><input ref={excelInputRef} className="asset-excel-hidden-input" type="file" accept=".xlsx,.xls" onChange={e=>e.target.files?.[0]&&importAssetsExcel(e.target.files[0])}/><button className="primary-action" onClick={()=>setModal('add')}>＋ {t.add}</button></>}
    </div>
   </div>
   <div className="asset-list-card"><div className="asset-list-wrap"><table className="asset-list-table"><thead><tr><th>{t.barcode}</th><th>{t.asset}</th><th>{t.location}</th><th>{t.category}</th><th>{t.actions}</th></tr></thead><tbody>{filtered.length?pagedAssets.map((a,index)=><tr key={`${a.barcode}-${a.nurseryAr}-${(safeAssetPage-1)*ASSET_PAGE_SIZE+index}`}><td><span className="asset-barcode-cell">{a.barcode}</span></td><td><button className="asset-history-link asset-name-cell" type="button" onClick={()=>setHistoryAsset(a)}>{assetLabel(a,ar)}</button></td><td>{nurseryLabel(a,ar)}</td><td>{ar?a.categoryAr:englishCategory(a.categoryEn||a.categoryAr)}</td><td><div className="asset-row-actions">{isAdmin&&!previewNursery?<><button className="asset-edit-btn" onClick={()=>setEditingAsset(a)}>✎ {t.edit}</button><button className="asset-delete-btn" onClick={()=>deleteAsset(a)}>⌫ {t.delete}</button></>:<><button title={t.transfer} onClick={()=>setModal('transfer')}>⇄</button><button title={t.surplus} onClick={()=>setModal('surplus')}>▱</button><button title={t.disposal} onClick={()=>setModal('disposal')}>⌫</button></>}</div></td></tr>):<tr><td colSpan="5" className="asset-empty-row">{ar?'لا توجد أصول مسجلة حاليًا':'No assets are currently registered'}</td></tr>}</tbody></table></div>{filtered.length>0&&<div className="asset-pagination"><div className="asset-pagination-summary">{ar?`عرض ${(safeAssetPage-1)*ASSET_PAGE_SIZE+1}–${Math.min(safeAssetPage*ASSET_PAGE_SIZE,filtered.length)} من ${filtered.length.toLocaleString('en-US')} أصل`:`Showing ${(safeAssetPage-1)*ASSET_PAGE_SIZE+1}–${Math.min(safeAssetPage*ASSET_PAGE_SIZE,filtered.length)} of ${filtered.length.toLocaleString('en-US')} assets`}</div><div className="asset-pagination-controls"><button type="button" disabled={safeAssetPage<=1} onClick={()=>setAssetPage(1)}>«</button><button type="button" disabled={safeAssetPage<=1} onClick={()=>setAssetPage(p=>Math.max(1,p-1))}>{ar?'السابق':'Previous'}</button><span>{ar?`صفحة ${safeAssetPage} من ${assetPageCount}`:`Page ${safeAssetPage} of ${assetPageCount}`}</span><button type="button" disabled={safeAssetPage>=assetPageCount} onClick={()=>setAssetPage(p=>Math.min(assetPageCount,p+1))}>{ar?'التالي':'Next'}</button><button type="button" disabled={safeAssetPage>=assetPageCount} onClick={()=>setAssetPage(assetPageCount)}>»</button></div></div>}</div>
  </>:<div className="invoice-table-card"><div className="invoice-table-wrap"><table className="invoice-table asset-request-table"><thead><tr><th>{ar?'رقم الطلب':'Request ID'}</th><th>{t.type}</th><th>{t.asset}</th><th>{t.barcode}</th><th>{t.from}</th><th>{t.to}</th><th>{t.reason}</th><th>{t.status}</th><th>{t.date}</th><th>{t.actions}</th></tr></thead><tbody>{scopedRequests.map(r=><tr key={r.id}><td><button className="request-link" onClick={()=>setViewing(r)}>{r.id}</button></td><td><span className={`request-type ${r.type}`}>{t[r.type]}</span></td><td>{ar?r.assetAr:r.assetEn}</td><td>{r.barcode}</td><td>{ar?r.fromAr:r.fromEn}</td><td>{r.type==='transfer'?(ar?r.toAr:r.toEn):'—'}</td><td>{ar?r.reasonAr:r.reasonEn}</td><td><span className={`invoice-status ${r.status==='pending'?'review':r.status}`}>{t[r.status]}</span>{r.status==='rejected'&&<small className="rejection-inline">{ar?r.rejectionReasonAr:r.rejectionReasonEn}</small>}</td><td>{r.date}</td><td><div className="request-actions-cell"><button onClick={()=>setViewing(r)}>{t.viewRequest}</button>{isAdmin&&r.status==='pending'&&<><button className="approve-request-btn" onClick={()=>approveRequest(r.id)}>✓ {t.approve}</button><button className="reject-request-btn" onClick={()=>setRejecting(r)}>✕ {t.reject}</button></>}</div></td></tr>)}</tbody></table></div></div>}
  {officialDocument&&<AssetOfficialDocument request={officialDocument} ar={ar} onClose={()=>setOfficialDocument(null)} />}
  {historyAsset&&<AssetHistory asset={historyAsset} ar={ar} onClose={()=>setHistoryAsset(null)} />}
  {editingAsset&&<AssetEditModal asset={editingAsset} ar={ar} t={t} nurseries={nurseries} onClose={()=>setEditingAsset(null)} onSave={updateAsset}/>}
  {modal&&<AssetModal type={modal} ar={ar} defaultNursery={accountNursery} t={t} assets={isAdmin&&!previewNursery?assets:scopedAssets} nurseries={nurseries} isAdmin={isAdmin&&!previewNursery} onClose={()=>setModal(null)} onSave={modal==='add'?addAsset:addRequest}/>}
  {viewing&&<RequestDetails request={viewing} ar={ar} t={t} isAdmin={isAdmin} onClose={()=>setViewing(null)} onApprove={()=>approveRequest(viewing.id)} onReject={()=>setRejecting(viewing)}/>}
  {rejecting&&<RejectModal request={rejecting} ar={ar} t={t} onClose={()=>setRejecting(null)} onConfirm={reason=>rejectRequest(rejecting.id,reason)}/>}
  {toast&&<div className="asset-toast">✓ {toast}</div>}
 </section>
}

function AssetEditModal({asset,ar,t,nurseries,onClose,onSave}){
 const [form,setForm]=useState({name:ar?asset.nameAr:assetLabel(asset,false),category:ar?asset.categoryAr:englishCategory(asset.categoryEn||asset.categoryAr),from:ar?asset.nurseryAr:nurseryLabel(asset,false)});
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

function AssetModal({type,ar,t,assets,nurseries,onClose,onSave,defaultNursery,isAdmin=false}){
 const [form,setForm]=useState({barcode:'',asset:'',from:defaultNursery||'',to:'',reason:'',name:'',category:'',notes:''});
 const [lookup,setLookup]=useState(null),[camera,setCamera]=useState(false),[scanMsg,setScanMsg]=useState('');
 const videoRef=useRef(null),streamRef=useRef(null);
 const selected=assets.find(a=>normalizeBarcode(a.barcode)===normalizeBarcode(form.barcode));
 const transferDestinations=[...nurseries,...(ar?EXTRA_TRANSFER_DESTINATIONS_AR:EXTRA_TRANSFER_DESTINATIONS_EN)];
 const duplicateOnAdd=type==='add'?selected:null;
 function applyAsset(a){if(!a)return;setLookup('found');setForm(f=>({...f,barcode:a.barcode,asset:assetLabel(a,ar),category:ar?a.categoryAr:englishCategory(a.categoryEn||a.categoryAr),from:nurseryLabel(a,ar),to:f.to===nurseryLabel(a,ar)?'':f.to}))}
 function findAsset(){if(selected)applyAsset(selected);else setLookup('missing')}
 function handleRequestBarcode(value){
  const match=assets.find(a=>normalizeBarcode(a.barcode)===normalizeBarcode(value));
  if(match){applyAsset(match);return}
  setForm(f=>({...f,barcode:value,asset:'',category:'',from:defaultNursery||f.from}));setLookup(value?'missing':null);
 }
 function chooseRequestAsset(value){const a=assets.find(x=>x.id===value||normalizeBarcode(x.barcode)===normalizeBarcode(value));if(a)applyAsset(a)}
 async function decodeImage(file){
  try{if(!('BarcodeDetector' in window)){setScanMsg(t.cameraUnsupported);return}const detector=new BarcodeDetector({formats:['code_128','code_39','ean_13','ean_8','qr_code']});const bmp=await createImageBitmap(file);const codes=await detector.detect(bmp);if(codes[0]){const value=codes[0].rawValue;setForm(f=>({...f,barcode:value}));const a=assets.find(x=>x.barcode.toLowerCase()===value.toLowerCase());if(a)applyAsset(a);else setLookup('missing')}else setScanMsg(ar?'لم يتم اكتشاف باركود واضح في الصورة.':'No clear barcode was detected in the image.')}catch(e){setScanMsg(t.cameraUnsupported)}
 }
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia||!('BarcodeDetector' in window)){setScanMsg(t.cameraUnsupported);return}
  try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});streamRef.current=stream;setCamera(true);setTimeout(async()=>{if(videoRef.current)videoRef.current.srcObject=stream;const detector=new BarcodeDetector({formats:['code_128','code_39','ean_13','ean_8','qr_code']});const tick=async()=>{if(!streamRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes[0]){const value=codes[0].rawValue;setForm(f=>({...f,barcode:value}));const a=assets.find(x=>x.barcode.toLowerCase()===value.toLowerCase());if(a)applyAsset(a);else setLookup('missing');stopCamera();return}}catch{}requestAnimationFrame(tick)};requestAnimationFrame(tick)},150)}catch{setScanMsg(t.cameraUnsupported)}
 }
 function stopCamera(){streamRef.current?.getTracks().forEach(x=>x.stop());streamRef.current=null;setCamera(false)}
 function submit(e){e.preventDefault();if(type==='add'&&duplicateOnAdd){setLookup('duplicate');return}if(type!=='add'&&!selected)return setLookup('missing');if(type==='transfer'&&!form.to)return;onSave(form)}
 const hint=type==='transfer'?t.transferHint:type==='surplus'?t.surplusHint:type==='disposal'?t.disposalHint:'';
 return createPortal(<div className="invoice-overlay asset-request-overlay" onClick={()=>{stopCamera();onClose()}}><form className="asset-modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="drawer-header"><div><small>SAAMS Assets</small><h2>{type==='add'?t.add:t[type]}</h2></div><button type="button" onClick={()=>{stopCamera();onClose()}}>×</button></div>
  {type==='add'?<div className="asset-form-grid"><label><span>{t.barcode}</span><input required value={form.barcode} onChange={e=>{setForm({...form,barcode:e.target.value});setLookup(null)}}/>{duplicateOnAdd&&<div className="duplicate-asset-warning"><b>⚠ {t.duplicateBarcode}</b><span>{duplicateOnAdd.barcode} · {assetLabel(duplicateOnAdd,ar)} · {t.duplicateBarcodeDetail}: {nurseryLabel(duplicateOnAdd,ar)}</span><small>{t.duplicateBarcodeBlocked}</small></div>}</label><label><span>{t.assetName}</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span>{t.category}</span><input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label><span>{t.location}</span><select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{nurseries.map(n=><option key={n}>{n}</option>)}</select></label><label className="wide"><span>{t.notes}</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>:<>
   <p className="request-hint">{hint}</p>{!isAdmin&&<label className="nursery-asset-picker"><span>{ar?'اختاري الأصل من قائمة أصول الحضانة':'Choose from nursery assets'}</span><select value={selected?.id||selected?.barcode||''} onChange={e=>chooseRequestAsset(e.target.value)}><option value="">{ar?'اختاري الأصل...':'Choose asset...'}</option>{assets.map(a=><option key={a.id||a.barcode} value={a.id||a.barcode}>{a.barcode} — {assetLabel(a,ar)}</option>)}</select></label>}<div className="barcode-panel"><label><span>{t.barcode}</span><div className="barcode-input-row"><input required value={form.barcode} onChange={e=>handleRequestBarcode(e.target.value)} placeholder="SEA-000000"/><button type="button" onClick={findAsset}>{t.lookup}</button></div></label><div className="barcode-tools"><button type="button" onClick={startCamera}>▣ {t.scan}</button><label className="upload-barcode">⇧ {t.upload}<input type="file" accept="image/*" capture="environment" onChange={e=>e.target.files[0]&&decodeImage(e.target.files[0])}/></label></div><small>{ar?'يمكنك اختيار الأصل من القائمة أو إدخال كوده مباشرة، وسيتم تعبئة البيانات تلقائيًا.':'Choose an asset from the list or enter its code; details will fill automatically.'}</small>{scanMsg&&<div className="scan-warning">{scanMsg}</div>}{lookup==='found'&&selected&&<div className="asset-found"><b>✓ {t.found}</b><strong>{assetLabel(selected,ar)}</strong><span>{nurseryLabel(selected,ar)} · {selected.barcode}</span></div>}{lookup==='missing'&&form.barcode&&<div className="scan-error">! {t.notFound}</div>}</div>
   {camera&&<div className="camera-box"><video ref={videoRef} autoPlay muted playsInline/><div className="scan-frame"></div><p>{t.cameraHint}</p><button type="button" onClick={stopCamera}>{t.closeCamera}</button></div>}
   <div className="asset-form-grid"><label><span>{t.asset}</span><input readOnly value={form.asset}/></label><label><span>{t.category}</span><input readOnly value={form.category}/></label><label><span>{t.from}</span>{isAdmin?<select required value={form.from} onChange={e=>setForm({...form,from:e.target.value,to:e.target.value===form.to?'':form.to})}><option value="">{ar?'اختاري الحضانة...':'Choose nursery...'}</option>{nurseries.map(n=><option key={n}>{n}</option>)}</select>:<input readOnly value={form.from||defaultNursery||''}/>}</label>{type==='transfer'&&<label><span>{t.to}</span><select required value={form.to} onChange={e=>setForm({...form,to:e.target.value})}><option value="">{ar?'اختاري الحضانة المنقول إليها...':'Choose destination nursery...'}</option>{transferDestinations.filter(n=>n!==form.from).map(n=><option key={n} value={n}>{n}</option>)}</select></label>}<label className="wide"><span>{t.reason}</span><textarea required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label></div>
  </>}
  <div className="asset-modal-actions"><button type="button" className="secondary-action" onClick={()=>{stopCamera();onClose()}}>{t.cancel}</button><button className="primary-action" disabled={(type==='add'&&!!duplicateOnAdd)||(type!=='add'&&!selected)}>{type==='add'?t.save:t.submit}</button></div></form></div>, document.body)
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
  <div className="asset-history-summary"><div className="asset-card-icon">◇</div><div><strong>{assetLabel(asset,ar)}</strong><span>{ar?asset.nurseryAr:asset.nurseryEn}</span><small>{ar?asset.categoryAr:englishCategory(asset.categoryEn||asset.categoryAr)}</small></div></div>
  <div className="asset-history-note">{ar?'يعرض هذا السجل حركات النقل والفائض والإسقاط فقط.':'This history shows transfer, surplus, and disposal movements only.'}</div>
  <div className="entity-timeline asset-timeline">{rows.map((x,i)=><div key={x.id}><span>{i+1}</span><div><strong>{x.action}</strong><small>{x.date} · {x.time} · {x.user}</small><p>{x.details}</p>{x.reason&&<p className="timeline-reason">{x.reason}</p>}</div></div>)}</div>
 </aside></div>
}
