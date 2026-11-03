import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStandardPvcScopes } from './pvc-scope';
import { VIDYA_SAGAR_REDDY_DRAFT } from './historicalData';
import { DEFAULT_UME_CATALOGUE } from './catalogue';
import { validateQuotationDraftV2 } from './schema';

test('legacy item-level PVC metadata is removed while ordinary quote data is preserved', () => {
  const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.is_demo = true;
  draft.needs_clarification = [
    { path: '/rooms/0/items/0/pvc/parts', question: 'Which contact areas?' },
    { path: '/rooms/0/items/0/pvc/eligible', question: 'Is this unit PVC eligible?' },
    { path: '/rooms/0/items/0/measure/per_item', question: 'Confirm measured area?' },
  ];
  const original = structuredClone(draft);
  const normalized = applyStandardPvcScopes(draft, DEFAULT_UME_CATALOGUE);
  assert.deepEqual(draft, original);
  assert.equal(normalized.is_demo, true);
  assert.equal(
    normalized.rooms.every((room) => room.items.every((item) => !Object.hasOwn(item, 'pvc'))),
    true
  );
  assert.deepEqual(normalized.needs_clarification, [
    { path: '/rooms/0/items/0/measure/per_item', question: 'Confirm measured area?' },
  ]);
});

test('PVC-free assistant JSON remains PVC-free after the owner draft sync', () => {
  const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  for (const room of draft.rooms) {
    for (const item of room.items) delete item.pvc;
  }
  const normalized = applyStandardPvcScopes(draft, DEFAULT_UME_CATALOGUE);
  assert.equal(
    normalized.rooms.every((room) => room.items.every((item) => !Object.hasOwn(item, 'pvc'))),
    true
  );
});
