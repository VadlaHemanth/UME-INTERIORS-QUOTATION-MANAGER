import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStandardPvcScopes, getMissingStandardPvcScopes } from './pvc-scope';
import { VIDYA_SAGAR_REDDY_DRAFT } from './historicalData';
import { DEFAULT_UME_CATALOGUE } from './catalogue';
import { validateQuotationDraftV2 } from './schema';

test('owner-reviewed catalogue PVC scope repairs missing parts while preserving item overrides and practice status', () => {
  const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.is_demo = true;
  for (const room of draft.rooms) for (const item of room.items) if (item.pvc.eligible) item.pvc.parts = [];
  draft.rooms[0].items[1].pvc.parts = ['Owner-specific rear panel'];
  draft.needs_clarification = [
    { path: '/rooms/0/items/0/pvc/parts', question: 'Which contact areas?' },
    { path: '/rooms/0/items/0/measure/per_item', question: 'Confirm measured area?' },
  ];
  const original = structuredClone(draft);
  const catalogue = structuredClone(DEFAULT_UME_CATALOGUE);
  catalogue.workTypes['Loft - frame and shutter'].pvcDefaultParts = ['Reviewed slab-contact frame'];
  assert.equal(getMissingStandardPvcScopes(draft, catalogue).length, 19);
  const repaired = applyStandardPvcScopes(draft, catalogue);
  assert.deepEqual(draft, original);
  assert.deepEqual(repaired.rooms[0].items[0].pvc.parts, ['Reviewed slab-contact frame']);
  assert.deepEqual(repaired.rooms[0].items[1].pvc.parts, ['Owner-specific rear panel']);
  assert.equal(repaired.is_demo, true);
  assert.equal(repaired.needs_clarification.length, 1);
  assert.equal(validateQuotationDraftV2(repaired).issues.filter(issue => issue.path.endsWith('/pvc/parts')).length, 0);
  assert.equal(getMissingStandardPvcScopes(repaired, catalogue).length, 0);
});

test('PVC repair never invents contact parts for a new work type', () => {
  const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.rooms[0].items[0].work_type = 'New custom carpentry';
  draft.rooms[0].items[0].pvc.parts = [];
  const repaired = applyStandardPvcScopes(draft, DEFAULT_UME_CATALOGUE);
  assert.deepEqual(repaired.rooms[0].items[0].pvc.parts, []);
  assert.ok(validateQuotationDraftV2(repaired).issues.some(issue => issue.path === '/rooms/0/items/0/pvc/parts'));
});
