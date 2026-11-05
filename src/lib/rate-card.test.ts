import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULT_UME_CATALOGUE,extractAndMergeRateCardFromDraft,mergeRateCardJsonIntoCatalogue} from './catalogue';
import {upgradeCatalogue} from './commercial-spec';
import {APPROVED_CORE_RATES,editPackageRate,packageRates} from './rate-card';

test('owner-confirmed default rates, PVC extras and linked frame construction stay explicit',()=>{
  for(const [key,rates] of Object.entries(APPROVED_CORE_RATES))assert.deepEqual(DEFAULT_UME_CATALOGUE.workTypes[key].rates,packageRates(...rates));
  assert.deepEqual(DEFAULT_UME_CATALOGUE.workTypes['Box type'].rates,packageRates(950,1150,1350,100));
  const changed=editPackageRate(DEFAULT_UME_CATALOGUE,'Loft - frame and shutter','Normal',975);
  for(const [key,extra] of [['Frame type',60],['Loft - frame and shutter',75],['Low roof - frame and shutter',75]] as const)assert.deepEqual(changed.workTypes[key].rates.Normal,{Standard:975,'With PVC':975+extra});
  assert.equal(DEFAULT_UME_CATALOGUE.workTypes['Frame type'].rates.Normal.Standard,900);
});

test('approved default update runs once and retains brands, company, custom work types and subsequent edits',()=>{
  const saved=structuredClone(DEFAULT_UME_CATALOGUE);saved.version='ume-catalogue-2026.11.v9';
  saved.workTypes['Box type'].rates=packageRates(950,1000,1250,75);
  saved.workTypes['Custom confirmed work']={...structuredClone(saved.workTypes['Box type']),id:'Custom confirmed work',rates:packageRates(111,222,333,44)};
  const before=structuredClone(saved);const updated=upgradeCatalogue(saved);
  assert.deepEqual(updated.workTypes['Box type'].rates,packageRates(950,1150,1350,100));
  assert.deepEqual(updated.company,before.company);assert.deepEqual(updated.grades,before.grades);
  assert.deepEqual(updated.workTypes['Custom confirmed work'],before.workTypes['Custom confirmed work']);
  assert.deepEqual(saved,before);
  updated.workTypes['Box type'].rates.Normal.Standard=1234;
  assert.equal(upgradeCatalogue(updated),updated);
  assert.equal(upgradeCatalogue(updated).workTypes['Box type'].rates.Normal.Standard,1234);
});

test('rate-card JSON never fabricates missing package rates and respects explicitly confirmed zeroes',()=>{
  assert.throws(()=>mergeRateCardJsonIntoCatalogue(DEFAULT_UME_CATALOGUE,{workTypes:{'Unpriced work':{rates:{Base:{Standard:10}}}}}),/Provide Basic, Standard and Premium together/);
  const zero=mergeRateCardJsonIntoCatalogue(DEFAULT_UME_CATALOGUE,{workTypes:{'Included adjustment':{unit:'each',rates:packageRates(0,0,0)}}});
  assert.deepEqual(zero.catalogue.workTypes['Included adjustment'].rates,packageRates(0,0,0));
  const rooms=[{items:[{work_type:'Unknown scope',measure:{unit:'each'},custom_rates:{Base:100}}]}];
  assert.deepEqual(extractAndMergeRateCardFromDraft(DEFAULT_UME_CATALOGUE,{rooms}).addedOrUpdatedKeys,[]);
  rooms[0].items[0].custom_rates={Base:100,Normal:200,Premium:300} as any;
  assert.deepEqual(extractAndMergeRateCardFromDraft(DEFAULT_UME_CATALOGUE,{rooms}).catalogue.workTypes['Unknown scope'].rates,packageRates(100,200,300));
});
