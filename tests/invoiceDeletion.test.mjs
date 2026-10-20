import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canDeleteInvoice } from '../src/utils/invoiceDeletion.js';

const nursery = { role: 'nursery', active: true, nursery_id: 'nursery-a' };
const invoice = { dbId: 'invoice-a', nurseryId: 'nursery-a', status: 'review', advanceAllocationId: 'allocation-a', advanceStatus: 'open' };
const cases = [
  ['own review invoice in open advance', nursery, invoice, true],
  ['own returned invoice', nursery, { ...invoice, status: 'returned' }, true],
  ['own late invoice', nursery, { ...invoice, status: 'late' }, true],
  ['other nursery even with identical display name', nursery, { ...invoice, nurseryId: 'nursery-b', nurseryAr: 'same name' }, false],
  ['approved invoice', nursery, { ...invoice, status: 'approved' }, false],
  ['previous approval remains protected', nursery, { ...invoice, approvedAt: '2026-10-20' }, false],
  ['closed advance', nursery, { ...invoice, advanceStatus: 'closed' }, false],
  ['unknown linked advance status fails closed', nursery, { ...invoice, advanceStatus: null }, false],
  ['draft advance', nursery, { ...invoice, advanceStatus: 'draft' }, false],
  ['unallocated invoice', nursery, { ...invoice, advanceAllocationId: null, advanceStatus: null }, true],
  ['inactive nursery', { ...nursery, active: false }, invoice, false],
  ['missing scope', { ...nursery, nursery_id: null }, invoice, false],
  ['admin without invoice permission', { role: 'admin', permissions: {} }, invoice, false],
  ['admin with permission can delete locked invoice', { role: 'admin', permissions: { invoices: true } }, { ...invoice, status: 'approved', advanceStatus: 'closed' }, true],
  ['inactive admin', { role: 'admin', active: false, permissions: { invoices: true } }, invoice, false],
  ['super admin override', { role: 'super_admin' }, { ...invoice, status: 'approved', advanceStatus: 'closed' }, true],
  ['unknown role', { role: 'driver' }, invoice, false],
  ['no session', null, invoice, false],
];
for (const [name, profile, row, expected] of cases) {
  test(name, () => assert.equal(canDeleteInvoice(profile, row), expected));
}

const source = await readFile(new URL('../src/data/supabaseData.js', import.meta.url), 'utf8');
const mockedSource = source.replace("import { supabase } from '../supabase';", 'const supabase = globalThis.__invoiceTestDb;');
const calls = [];
globalThis.__invoiceTestDb = { rpc: async (...args) => { calls.push(args); return { error: null }; } };
const { deleteInvoice } = await import(`data:text/javascript;base64,${Buffer.from(mockedSource).toString('base64')}`);
test('delete sends only the UUID to the guarded RPC', async () => {
  await deleteInvoice('uuid-a');
  assert.deepEqual(calls, [['delete_saams_invoice', { p_invoice_id: 'uuid-a' }]]);
});
test('missing UUID never calls the server', async () => {
  await assert.rejects(() => deleteInvoice(null), /INVOICE_NOT_FOUND/);
  assert.equal(calls.length, 1);
});
test('database rejection reaches UI without reporting success', async () => {
  const rejection = new Error('INVOICE_DELETE_LOCKED');
  globalThis.__invoiceTestDb.rpc = async () => ({ error: rejection });
  await assert.rejects(() => deleteInvoice('uuid-b'), (error) => error === rejection);
});
