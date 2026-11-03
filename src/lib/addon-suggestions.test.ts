import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptAddonSuggestion, getAddonSuggestions, MAX_ADDON_SUGGESTIONS, rejectAddonSuggestion, validateAddonSuggestions } from './addon-suggestions';
import { VIDYA_SAGAR_REDDY_DRAFT } from './historicalData';
import { calculateQuotationPricing, computeCustomerSelectionTotal } from './pricing';
import { type QuotationDraftV2, type SuggestedAddon, validateQuotationDraftV2 } from './schema';

function draftWithIdea(incomplete = false): QuotationDraftV2 {
  const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.customer = { name: 'Suggestion Test Customer', phone: '9000000000', site: 'Unit 101, Example Residence, Hyderabad' };
  draft.owner_requests = [];
  draft.needs_clarification = [];
  const idea: SuggestedAddon = {
    room_index: 0,
    reason: 'Adds useful bedside storage while keeping the walking area clear.',
    item: {
      name: 'Additional bedside storage cabinet', work_type: 'Box type', size_text: incomplete ? null : '2 ft by 2 ft',
      measure: { unit: 'sq_ft', per_item: incomplete ? null : 4 }, quantity: incomplete ? null : 1,
      optional: true,
      source_text_en: 'Optional bedside storage cabinet with inside and outside laminate finish.',
      custom_rates: { Base: 100, Normal: 200, Premium: 300, pvc_adder: 0 },
    },
  };
  draft.suggested_addons = [idea];
  return draft;
}

test('recommendations alone never change quotation pricing or block a complete base quote for unknown measures', () => {
  const draft = draftWithIdea(true);
  const without = structuredClone(draft);
  delete without.suggested_addons;
  assert.equal(validateAddonSuggestions(draft).valid, true);
  assert.equal(getAddonSuggestions(draft).length, 1);
  assert.deepEqual(calculateQuotationPricing(draft), calculateQuotationPricing(without));
  assert.equal(validateQuotationDraftV2(draft, { reviewedOwnerRequests: true }).readyForPublish, true);
});

test('AI recommendations do not require per-item PVC metadata', () => {
  const draft = draftWithIdea();
  assert.equal(validateAddonSuggestions(draft).valid, true);
});

test('acceptance immutably adds optional scope; price changes only when that optional item is selected', () => {
  const draft = draftWithIdea();
  const originalCount = draft.rooms[0].items.length;
  const original = structuredClone(draft);
  const accepted = acceptAddonSuggestion(draft, 0);
  assert.deepEqual(draft, original);
  assert.equal(accepted.rooms[0].items.length, originalCount + 1);
  assert.equal(accepted.rooms[0].items[originalCount].optional, true);
  assert.equal(accepted.suggested_addons!.length, 0);
  assert.equal(accepted.rooms[0].items[originalCount].source_text_en, draft.suggested_addons![0].item.source_text_en);
  const before = calculateQuotationPricing(draft);
  const after = calculateQuotationPricing(accepted);
  assert.deepEqual(after.baseWholeHomeTotals, before.baseWholeHomeTotals);
  const selection = { wholeHomeSelection: { grade: 'Premium' as const, protection: 'Standard' as const, finish: 'SF' as const, brand_preference: null }, mixByRoom: false };
  const base = computeCustomerSelectionTotal(after, selection);
  const optedIn = computeCustomerSelectionTotal(after, { ...selection, selectedOptionalPointers: [`/rooms/0/items/${originalCount}`] });
  assert.equal(optedIn.grandTotal, base.grandTotal + 1200);
});

test('accepting an incomplete recommendation triggers ordinary publication gates until measurements are confirmed', () => {
  const draft = draftWithIdea(true);
  assert.equal(validateQuotationDraftV2(draft, { reviewedOwnerRequests: true }).readyForPublish, true);
  const accepted = acceptAddonSuggestion(draft, 0);
  const validation = validateQuotationDraftV2(accepted, { reviewedOwnerRequests: true });
  assert.equal(validation.readyForPublish, false);
  assert.ok(validation.issues.some((issue) => issue.code === 'INVALID_MEASUREMENT'));
});

test('dismissal never adds scope or changes prices and leaves the source draft unchanged', () => {
  const draft = draftWithIdea();
  const dismissed = rejectAddonSuggestion(draft, 0);
  assert.equal(draft.suggested_addons!.length, 1);
  assert.deepEqual(dismissed.rooms, draft.rooms);
  assert.deepEqual(dismissed.suggested_addons, []);
  assert.deepEqual(calculateQuotationPricing(dismissed), calculateQuotationPricing(draft));
});

test('malformed recommendations are bounded and reported without crashing an imported draft', () => {
  const draft = draftWithIdea();
  for (const invalid of [null, 123, {}, [null], [{ room_index: 99, reason: 'Extra storage', item: {} }], [{ room_index: 0, reason: 'Extra storage', item: { optional: false } }]]) {
    const candidate = { ...draft, suggested_addons: invalid };
    assert.doesNotThrow(() => validateAddonSuggestions(candidate));
    assert.equal(validateAddonSuggestions(candidate).valid, false);
    assert.deepEqual(getAddonSuggestions(candidate), []);
    assert.equal(validateQuotationDraftV2(candidate, { reviewedOwnerRequests: true }).readyForPublish, false);
  }
  const tooMany = { ...draft, suggested_addons: Array.from({ length: MAX_ADDON_SUGGESTIONS + 1 }, () => draft.suggested_addons![0]) };
  assert.equal(validateAddonSuggestions(tooMany).valid, false);
  assert.ok(validateAddonSuggestions(tooMany).errors.some((message) => message.includes('at most 12')));
  const nonEnglish = draftWithIdea();
  nonEnglish.suggested_addons![0].reason = 'అదనపు నిల్వ';
  assert.equal(validateAddonSuggestions(nonEnglish).valid, false);
});

test('duplicate existing work and repeated recommendations are rejected before acceptance', () => {
  const existing = draftWithIdea();
  existing.suggested_addons![0].item.name = existing.rooms[0].items[0].name;
  existing.suggested_addons![0].item.work_type = existing.rooms[0].items[0].work_type;
  assert.equal(validateAddonSuggestions(existing).valid, false);
  assert.throws(() => acceptAddonSuggestion(existing, 0), /duplicates/);
  const repeated = draftWithIdea();
  repeated.suggested_addons!.push(structuredClone(repeated.suggested_addons![0]));
  assert.equal(validateAddonSuggestions(repeated).valid, false);
  assert.throws(() => acceptAddonSuggestion(draftWithIdea(), -1), /existing/);
});
