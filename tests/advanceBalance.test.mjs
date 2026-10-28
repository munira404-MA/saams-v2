import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceBreakdown,isDeductedInvoice} from '../src/utils/advanceBalance.js';
test('uploaded (under review) and approved invoices are deducted',()=>{
 assert.equal(isDeductedInvoice('review'),true);
 assert.equal(isDeductedInvoice('approved'),true);
});
test('returned and rejected invoices give the amount back',()=>{
 assert.equal(isDeductedInvoice('returned'),false);
 assert.equal(isDeductedInvoice('rejected'),false);
});
test('balance breakdown',()=>{
 const b=balanceBreakdown([{amount:83,status:'review'},{amount:37,status:'approved'},{amount:105.25,status:'returned'}]);
 assert.deepEqual(b,{approved:37,pending:83,deducted:120});
});
