import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/pages/Assets.jsx',import.meta.url),'utf8');
const add=source.slice(source.indexOf(' async function addAsset(form)'),source.indexOf(' async function updateAsset(form)'));
const update=source.slice(source.indexOf(' async function updateAsset(form)'),source.indexOf(' async function deleteAsset('));
function harness(assets,editingAsset=null){
 const writes=[],messages=[];
 const q=table=>{
  let payload;
  const query={select(){return this},or(){return this},limit(){return this},eq(){return this},
   insert(value){payload=value;writes.push({table,payload});return this},
   update(value){payload=value;writes.push({table,payload});return this},
   single(){return Promise.resolve({data:{id:'saved',barcode:editingAsset?.barcode||payload.barcode,...payload},error:null})},
   then(resolve){return Promise.resolve({data:[{id:'nursery'}],error:null}).then(resolve)}};
  return query;
 };
 const deps={assets,editingAsset,ar:false,t:{},assetsDbReady:true,newFlagReady:true,assetSelectAfterWrite:()=>'*',profile:{id:'admin'},supabase:{from:q},notify:m=>messages.push(m),normalizeBarcode:v=>String(v||'').replace(/\s+/g,'').toLowerCase(),nurseryLabel:()=>'',dbAssetToUi:row=>({...row,centralBarcode:row.central_finance_barcode}),setAssets(){},setModal(){},setEditingAsset(){},recordAudit(){},window:{dispatchEvent(){}},CustomEvent:class{}};
 const keys=Object.keys(deps);
 const actions=new Function(...keys,add+update+';return {addAsset,updateAsset}')( ...keys.map(k=>deps[k]));
 return {...actions,writes,messages};
}
const form={barcode:'SAN2',centralBarcode:'',name:'خزانة',category:'الأثاث',from:'الباحثة',isNew:'no'};
test('adding another blank finance barcode succeeds and stores NULL',async()=>{
 const h=harness([{id:'1',barcode:'SAN1',centralBarcode:''}]);
 assert.equal(await h.addAsset(form),true);
 assert.equal(h.writes[0].payload.central_finance_barcode,null);
 assert.equal(h.writes[0].payload.barcode,'SAN2');
});
test('future finance barcode entries still reject normalized duplicates',async()=>{
 const h=harness([{id:'1',barcode:'SAN1',centralBarcode:'FIN 123'}]);
 assert.equal(await h.addAsset({...form,centralBarcode:'fin123'}),false);
 assert.equal(h.writes.length,0);
});
test('editing an asset with empty finance barcode preserves internal barcode',async()=>{
 const asset={id:'1',barcode:'SAN1',centralBarcode:'OLD'};
 const h=harness([asset,{id:'2',barcode:'SAN2',centralBarcode:''}],asset);
 await h.updateAsset(form);
 assert.equal(h.writes.length,1);
 assert.equal(h.writes[0].payload.central_finance_barcode,null);
 assert.equal('barcode' in h.writes[0].payload,false);
});
test('an asset can receive a finance barcode later',async()=>{
 const asset={id:'1',barcode:'SAN1',centralBarcode:''};
 const h=harness([asset],asset);
 await h.updateAsset({...form,centralBarcode:'  FIN-2026  '});
 assert.equal(h.writes[0].payload.central_finance_barcode,'FIN-2026');
});

test('adding an asset requires answering «is this a new asset?»',async()=>{
 const h=harness([]);
 assert.equal(await h.addAsset({...form,isNew:''}),false);
 assert.equal(h.writes.length,0);
});
test('the answer is stored on the asset',async()=>{
 const yes=harness([]);
 assert.equal(await yes.addAsset({...form,isNew:'yes'}),true);
 assert.equal(yes.writes[0].payload.is_new_asset,true);
 const no=harness([]);
 assert.equal(await no.addAsset(form),true);
 assert.equal(no.writes[0].payload.is_new_asset,false);
});
