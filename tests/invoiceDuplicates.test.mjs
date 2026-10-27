import test from 'node:test';
import assert from 'node:assert/strict';
import {isSameInvoice} from '../src/utils/invoiceDuplicates.js';

const base={supplier:'مكتبة الشارقة',number:'1001',date:'01/10/2026',total:100};
test('duplicate only when supplier + number + date + amount all match',()=>{
 assert.equal(isSameInvoice(base,{...base}),true);
 assert.equal(isSameInvoice(base,{supplier:' مكتبه  الشارقة ',number:' 1001',date:'2026-10-01',total:'100.00'}),true);
});
test('same supplier alone is NOT a duplicate',()=>{
 assert.equal(isSameInvoice(base,{...base,number:'2002',date:'05/10/2026',total:55}),false);
});
test('same supplier and date but different number or amount is NOT a duplicate',()=>{
 assert.equal(isSameInvoice(base,{...base,number:'1002'}),false);
 assert.equal(isSameInvoice(base,{...base,total:100.5}),false);
});
test('same number from a different supplier is NOT a duplicate',()=>{
 assert.equal(isSameInvoice(base,{...base,supplier:'تعاونية الشارقة'}),false);
});
test('missing invoice number never counts as duplicate',()=>{
 assert.equal(isSameInvoice({...base,number:''},{...base,number:''}),false);
});
