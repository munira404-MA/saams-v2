import test from 'node:test';
import assert from 'node:assert/strict';
import { assetCategoryLabel } from '../src/utils/assetCategories.js';

test('legacy clinic category is corrected in both languages and either column',()=>{
 for(const [ar,en] of [['madat alayada','madat alayada'],['','madat alayada'],['madat alayada',''],['معدات العيادة','madat alayada']]){
  assert.equal(assetCategoryLabel(ar,en,'ar'),'معدات العيادة');
  assert.equal(assetCategoryLabel(ar,en,'en'),'Clinic Equipment');
 }
});
test('category aliases share one label for filters, list and details',()=>{
 assert.equal(assetCategoryLabel('IT Equipment','','ar'),'معدات تقنية المعلومات');
 assert.equal(assetCategoryLabel('الأثاث','الأثاث','en'),'Furniture');
 assert.equal(assetCategoryLabel('معدات طبية','Medical Equipment','ar'),'معدات طبية');
 assert.equal(assetCategoryLabel('تصنيف مخصص','','ar'),'تصنيف مخصص');
});
