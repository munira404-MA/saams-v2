import test from 'node:test';
import assert from 'node:assert/strict';

// Simulate a phone browser whose storage is full (~5 MB).
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    const used = [...store.entries()].filter(([key]) => key !== k).reduce((n, [, val]) => n + val.length, 0);
    if (used + String(v).length > 5 * 1024 * 1024) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
    store.set(k, String(v));
  },
  removeItem: (k) => store.delete(k),
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };

const { registerAttachment } = await import('../src/utils/attachments.js');
const photo = 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024); // ~2.2 MB phone photo

test('a full browser storage never throws after an invoice is saved', () => {
  for (let i = 0; i < 5; i += 1) {
    assert.doesNotThrow(() => registerAttachment({ entityType: 'invoice', entityId: `INV-${i}`, kind: 'invoice', name: 'image.jpg', dataUrl: photo }));
  }
});
test('large photos are cached without their data (file is in Supabase Storage)', () => {
  const saved = JSON.parse(localStorage.getItem('saams-attachment-center-v1'));
  assert.ok(saved.length >= 1);
  assert.ok(saved.every((row) => !row.dataUrl || row.dataUrl.length < 400 * 1024));
});
