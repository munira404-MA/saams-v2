import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardAccess, activityPage} from '../src/utils/dashboardAccess.js';
import {translateAssetName} from '../src/utils/assetTranslations.js';

test('Mohamed only receives explicitly permitted asset content',()=>{
 const can=dashboardAccess({role:'admin',permissions:{assets:true}});
 assert.equal(can('assets'),true);
 for(const page of ['invoices','advances','reports','users','transport'])assert.equal(can(page),false);
 assert.equal(can(activityPage({entityType:'asset_request'})),true);
 assert.equal(can(activityPage({entityType:'invoice',screen:'الأصول'})),false);
 assert.equal(activityPage({screen:'الفواتير'}),'invoices');
});
test('missing permissions deny access and transport remains independent',()=>{
 assert.equal(dashboardAccess({role:'admin'})('assets'),false);
 assert.equal(dashboardAccess({role:'admin',permissions:{transport:true}})('transport'),true);
 assert.equal(dashboardAccess({role:'super_admin'})('invoices'),true);
 assert.equal(dashboardAccess({role:'nursery'})('invoices'),true);
});
for(const [ar,en,bad] of [
 ['كمبيوتر محمول','Laptop','Computer mhmwl'],['سرير مزدوج','Double Bed','Bed mzdwj'],
 ['وحدة تكييف سبليت','Split AC Unit','whda tkyyf sblyt'],
 ['جهاز مزيل الرجفان الخارجي الآلي','Automated External Defibrillator (AED)','jhaz mzyl alrjfan alkharjy alaaly'],
 ['مبدل شبكة','Network Switch','mbdl shbka']
])test(`English asset name: ${en}`,()=>{
 for(const value of ['',ar,bad])assert.equal(translateAssetName(value,ar),en);
 assert.equal(translateAssetName(bad),en);
});
test('preserves legitimate English and never romanizes unknown Arabic',()=>{
 assert.equal(translateAssetName('Dell Latitude 5440','جهاز غير معروف'),'Dell Latitude 5440');
 assert.equal(translateAssetName('Dell Latitude 5440','كمبيوتر محمول'),'Dell Latitude 5440');
 assert.equal(translateAssetName('','أصل تخصصي غير مترجم'),'Asset name awaiting translation');
 assert.equal(translateAssetName('Desk khshby','مكتب خشبي'),'Asset name awaiting translation');
 assert.equal(translateAssetName('  كمبيوتر   محمول  '),'Laptop');
});

test('SAN207210 and SAN207209 storage cabinets use their Arabic source',()=>{
 for(const ar of ['خزانة أغراض','خزانة اغراض']){
  assert.equal(translateAssetName('',ar),'Storage Cabinet');
  assert.equal(translateAssetName(ar,ar),'Storage Cabinet');
  assert.equal(translateAssetName('Cabinet aghrad',ar),'Storage Cabinet');
 }
});
