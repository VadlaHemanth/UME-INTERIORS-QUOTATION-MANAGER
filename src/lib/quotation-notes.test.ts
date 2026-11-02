import assert from 'node:assert/strict';
import test from 'node:test';
import { VIDYA_SAGAR_REDDY_DRAFT } from './historicalData';
import { getQuotationBasisLabel, getQuotationEstimateNote } from './quotation-notes';
import { MAX_QUOTATION_ESTIMATE_NOTE_LENGTH, migrateV1ToV2Draft, validateQuotationDraftV2, type QuoteMeta } from './schema';

const quote: QuoteMeta = { number: null, date: null, valid_until: null };

test('legacy quotations do not claim that a site measurement happened', () => {
  assert.equal(getQuotationBasisLabel(quote), '');
  assert.equal(getQuotationEstimateNote(quote), '');
  const migrated = migrateV1ToV2Draft(VIDYA_SAGAR_REDDY_DRAFT);
  assert.equal(migrated.quote.estimate_basis, undefined);
  assert.equal(getQuotationBasisLabel(migrated.quote), '');
  assert.equal(validateQuotationDraftV2(VIDYA_SAGAR_REDDY_DRAFT).readyForPublish, true);
});

test('a floor-plan notice is always shown and custom notes only supplement it', () => {
  const floorPlan = { ...quote, estimate_basis: 'floor_plan' as const };
  const notice = getQuotationEstimateNote(floorPlan);
  assert.equal(getQuotationBasisLabel(floorPlan), 'Based on floor plan');
  for (const required of ['preliminary estimate', 'On-site measurements', 'scope of work', 'requirements', 'material specifications', 'prices', 'site visit', 'revised quotation', 'written approval']) assert.ok(notice.includes(required));
  assert.equal(getQuotationEstimateNote({ ...floorPlan, estimate_note: '   ' }), notice);
  assert.equal(getQuotationEstimateNote({ ...floorPlan, estimate_note: '  Confirm the kitchen layout during the visit.  ' }), `${notice}\n\nConfirm the kitchen layout during the visit.`);
});

test('site-measured and unspecified quotations show only their confirmed basis and owner note', () => {
  const site = { ...quote, estimate_basis: 'site_measurement' as const, estimate_note: 'Measurements taken on 2 November.' };
  assert.equal(getQuotationBasisLabel(site), 'Based on site measurements');
  assert.equal(getQuotationEstimateNote(site), site.estimate_note);
  assert.equal(getQuotationEstimateNote({ ...quote, estimate_note: 'Only the listed rooms are included.' }), 'Only the listed rooms are included.');
});

test('estimate metadata survives legacy migration and a JSON round trip', () => {
  const input = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  input.quote.estimate_basis = 'floor_plan';
  input.quote.estimate_note = 'Confirm appliance positions during the visit.';
  const migrated = migrateV1ToV2Draft(input);
  assert.deepEqual(migrated.quote, input.quote);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated)).quote, input.quote);
  assert.equal(validateQuotationDraftV2(migrated).readyForPublish, true);
});

test('estimate metadata rejects invalid bases, excessive notes and non-English text', () => {
  const input = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  for (const invalid of ['plan', null, 42]) {
    const result = validateQuotationDraftV2({ ...input, quote: { ...quote, estimate_basis: invalid } });
    assert.equal(result.validForDraft, false);
    assert.ok(result.issues.some((issue) => issue.path === '/quote/estimate_basis'));
  }
  for (const invalid of [42, 'x'.repeat(MAX_QUOTATION_ESTIMATE_NOTE_LENGTH + 1), '\u0c07\u0c32\u0c4d\u0c32\u0c41', 'rendu rooms']) {
    const result = validateQuotationDraftV2({ ...input, quote: { ...quote, estimate_note: invalid } });
    assert.equal(result.validForDraft, false);
    assert.ok(result.issues.some((issue) => issue.path === '/quote/estimate_note'));
  }
  for (const valid of [undefined, null, '', 'A'.repeat(MAX_QUOTATION_ESTIMATE_NOTE_LENGTH)]) {
    assert.equal(validateQuotationDraftV2({ ...input, quote: { ...quote, estimate_note: valid } }).readyForPublish, true);
  }
});
