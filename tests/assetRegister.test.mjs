import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRegisterSheet,registerValueAr,canSeeFullRegister} from '../src/utils/assetRegister.js';
const header=['Customer Name','Location (Site/user Name)',' Barcode','Fund Source','Main Category','Sub-Category 1','Sub-Category 2','Item Description','Model','Brand','Serial Number','Cost','Supplier Name','Document Reference No','Receiving Date','Warranty Expiry Date','Asset Condition','Disposal Reference No','Asset Status','SFD Barcode'];
test('reads the Consolidated Asset Register layout',()=>{
 const rows=[header,['Al Hamriya Nursery','Director Room','SAN203274','Grant','IT Equipment','PC','PC','Dell PC','N/A','Dell','N/A',0,'N/A','N/A',46101,'N/A','Good',null,'Active','113-1'],['X','Y','N/B','Grant','Furniture','Table','Table','t','N/A','N/A','N/A',0,'N/A','N/A','N/A','N/A','Good',null,'Active',null]];
 const out=parseRegisterSheet(rows);
 assert.equal(out.length,1);
 assert.equal(out[0].barcode,'SAN203274');
 assert.equal(out[0].model,null);
 assert.equal(out[0].receiving_date,'2026-03-20');
 assert.equal(out[0].sfd_barcode,'113-1');
});
test('values are shown in Arabic',()=>{
 assert.equal(registerValueAr('fundSource','Grant'),'منحة');
 assert.equal(registerValueAr('mainCategory','IT Equipment'),'معدات تقنية المعلومات');
 assert.equal(registerValueAr('assetCondition','Excellent'),'ممتازة');
 assert.equal(registerValueAr('registerStatus','Disposed'),'مُسقط');
 assert.equal(registerValueAr('siteLocation','Director Room'),'غرفة المدير');
 assert.equal(registerValueAr('cost',0),'—');
});
test('only the system administrator or an employee with the register permission sees it',()=>{
 assert.equal(canSeeFullRegister({role:'super_admin'}),true);
 assert.equal(canSeeFullRegister({role:'admin',permissions:{assets:true}}),false);
 assert.equal(canSeeFullRegister({role:'admin',permissions:{assets:true,asset_register:true}}),true);
 assert.equal(canSeeFullRegister({role:'nursery'}),false);
});
