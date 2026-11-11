import { computeLateNurseries, lateReasonText } from '../src/utils/lateNurseries.js';
const now=new Date('2026-11-21T10:00:00');
const adv=[
 {id:'A1',nameAr:'نوفمبر',status:'open',from:'2026-11-01',to:'2026-11-30',allocations:[
   {nurseryId:'n1',nurseryAr:'البديع',allInvoices:[{createdAt:'2026-11-18T09:00:00Z'}]},
   {nurseryId:'n2',nurseryAr:'الحمرية',allInvoices:[]},
   {nurseryId:'n3',nurseryAr:'الطيبة',allInvoices:[{createdAt:'2026-10-30T09:00:00Z'}]}]},
 {id:'A2',nameAr:'أكتوبر',status:'open',from:'2026-10-01',to:'2026-10-31',allocations:[{nurseryId:'n1',nurseryAr:'البديع',allInvoices:[]}]},
 {id:'A3',nameAr:'مفتوحة',status:'open',openAmount:true,from:'2026-10-01',to:'2026-12-31',allocations:[{nurseryId:'n9',nurseryAr:'س',allInvoices:[]}]},
 {id:'A4',nameAr:'مغلقة',status:'closed',from:'2026-01-01',to:'2026-02-01',allocations:[{nurseryId:'n8',nurseryAr:'ص',allInvoices:[]}]}];
const r=computeLateNurseries(adv,{now});
for(const n of r) console.log(n.nurseryAr, n.items.map(i=>i.advanceAr+': '+i.reasons.map(x=>lateReasonText(x,true)).join(' + ')).join(' | '));
const names=r.map(n=>n.nurseryAr);
if(JSON.stringify(names)!==JSON.stringify(['البديع','الحمرية','الطيبة'])) throw new Error('unexpected late list '+names);
if(r.some(n=>n.nurseryAr==='س'||n.nurseryAr==='ص')) throw new Error('open-amount/closed advances must be excluded');
console.log('ok');
