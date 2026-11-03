import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalFurnitureName } from './furniture';
import { DEFAULT_UME_CATALOGUE, formatCleanItemDescription, getPackageDisplayName } from './catalogue';
import { materialLines, packageAllowances, scopeNotes } from './commercial-spec';
import { indiaDate, nextQuoteNumber } from './quote-workflow';

test('canonical furniture names keep aliases consistent without confusing pull-outs and wall cabinets',()=>{
  for(const alias of ['wall cabinet','wall cabinet unit','Kitchen Overhead Wall Cabinet']) assert.equal(canonicalFurnitureName(alias,'Box type','Kitchen'),'Kitchen Overhead Wall Cabinet');
  for(const alias of ['frame type wardrobe','Wardrobe Frame and Shutter']) assert.equal(canonicalFurnitureName(alias,'Frame type','Bedroom'),'Wardrobe Frame and Shutters');
  assert.equal(canonicalFurnitureName('pull cabinet','Box type','Kitchen'),'pull cabinet','an ambiguous term is not silently mapped to another product');
  assert.equal(canonicalFurnitureName('SS basket','Tandem or SS baskets','Kitchen'),'Stainless-Steel Pull-Out Basket','do not invent steel grade');
  assert.equal(formatCleanItemDescription('Cabinet with inside laminate and outside laminate finish','Cabinet','Box type'),'Cabinet with inside and outside laminate finish.');
});
test('material allowances and exclusions use editable values and all package names are stable',()=>{
  const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);
  for(const grade of ['Base','Normal','Premium'] as const) assert.deepEqual(packageAllowances(catalogue.grades[grade]),{handleRupees:200,laminateSheetRupees:1500,extraDrawerRupees:5000,includedBedroomDrawersMin:2,includedBedroomDrawersMax:4,additionalAllowances:[]});
  catalogue.grades.Base.allowances!.handleRupees=250;
  catalogue.grades.Base.allowances!.extraDrawerRupees=6000;
  assert.match(materialLines(catalogue,['Base']).join('\n'),/₹250 per handle/);
  const notes=scopeNotes(catalogue,['Base']).join('\n');
  assert.match(notes,/₹6,000 each/);assert.match(notes,/2–4/);assert.match(notes,/aluminium/);assert.match(notes,/visible/);assert.match(notes,/materials and labour|cleaning/i);
  assert.deepEqual(['Base','Normal','Premium'].map(g=>getPackageDisplayName(g as any)),['Basic','Standard','Premium']);
});
test('new quote metadata is short, unique and uses the India calendar date',()=>{
  const now=new Date('2026-11-02T19:00:00Z');
  assert.equal(indiaDate(now),'2026-11-03');
  assert.equal(nextQuoteNumber([{draft:{quote:{number:'UME-26-0001'}} as any}],now),'UME-26-0002');
});
