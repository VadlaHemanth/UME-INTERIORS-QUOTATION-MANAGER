import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULT_UME_CATALOGUE,extractAndMergeRateCardFromDraft,buildDynamicGemInstructions} from './catalogue';
import {getUnitRateForItem,calculateQuotationPricing,makeComboKey} from './pricing';
import {VIDYA_SAGAR_REDDY_DRAFT} from './historicalData';
import {validateQuotationDraftV2} from './schema';
import {customerHardwareScope,DEFAULT_HARDWARE_SCOPE} from './commercial-spec';

test('one package rate exception changes one line only and retains the saved PVC extra',()=>{
  const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);
  const draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  const item=draft.rooms[0].items[0];
  item.custom_rates={Normal:1234};
  const work=catalogue.workTypes[item.work_type!];
  assert.equal(getUnitRateForItem(item,'Normal','Standard','SF',catalogue),1234);
  const extra=work.pvcDefaultEligible?work.rates.Normal['With PVC']-work.rates.Normal.Standard:0;
  assert.equal(getUnitRateForItem(item,'Normal','With PVC','SF',catalogue),1234+extra);
  assert.equal(getUnitRateForItem(item,'Base','Standard','SF',catalogue),work.rates.Base.Standard);
  assert.equal(getUnitRateForItem(item,'Premium','Standard','SF',catalogue),work.rates.Premium.Standard);
  const snapshot=calculateQuotationPricing(draft,catalogue);
  const key=makeComboKey('Normal','Standard','SF');
  assert.equal(snapshot.rooms[0].items[0].exactAmounts[key],1234*item.measure.per_item!*item.quantity!);
  const merged=extractAndMergeRateCardFromDraft(catalogue,draft);
  assert.deepEqual(merged.catalogue.workTypes,catalogue.workTypes);
  const sibling=draft.rooms[0].items[1];
  assert.equal(getUnitRateForItem(sibling,'Normal','Standard','SF',catalogue),catalogue.workTypes[sibling.work_type!].rates.Normal.Standard);
  item.custom_rates={Normal:1234,pvc_adder:125};
  assert.equal(getUnitRateForItem(item,'Base','With PVC','SF',catalogue),work.rates.Base.Standard+125);
  assert.equal(getUnitRateForItem(item,'Normal','With PVC','SF',catalogue),1359);
});

test('item rate validation rejects invalid or unsupported values but accepts sparse package overrides',()=>{
  const draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.rooms[0].items[0].custom_rates={Normal:0};
  assert.equal(validateQuotationDraftV2(draft).issues.some(i=>i.path.includes('/custom_rates')),false);
  for(const rates of [{Normal:-1},{Normal:Infinity},{Normal:'1200'},{Standard:1200}]) {
    draft.rooms[0].items[0].custom_rates=rates as any;
    assert.equal(validateQuotationDraftV2(draft).issues.some(i=>i.path.includes('/custom_rates')),true);
  }
  const instructions=buildDynamicGemInstructions(DEFAULT_UME_CATALOGUE);
  assert.match(instructions,/ITEM-ONLY RATE EXCEPTION/);
  assert.match(instructions,/Omit unchanged package keys/);
});

test('customer hardware wording removes ranking and soft-close channel promises from saved wording',()=>{
  const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);
  catalogue.hardwareScope='Bedroom wardrobe sliding-door fittings, tandem systems, soft-close hinges/mechanisms and soft-close telescopic channels. Brands are in preferred order. Handles use their separate allowance.';
  const scope=customerHardwareScope(catalogue);
  assert.match(scope,/Soft-close bedroom wardrobe sliding-door fittings/);
  assert.match(scope,/soft-close tandem systems/);
  assert.match(scope,/soft-close hinges and telescopic channels/);
  assert.doesNotMatch(scope,/preferred order|soft-close telescopic|hinges\/mechanisms/);
  assert.equal(customerHardwareScope({...catalogue,hardwareScope:DEFAULT_HARDWARE_SCOPE}),DEFAULT_HARDWARE_SCOPE);
  assert.equal(customerHardwareScope({...catalogue,hardwareScope:'Soft-closing tandem drawer systems and telescopic channels.'}),'soft-close tandem drawer systems and telescopic channels.');
});
