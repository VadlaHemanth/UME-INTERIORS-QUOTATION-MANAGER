import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalFurnitureName } from './furniture';
import { DEFAULT_UME_CATALOGUE, formatCleanItemDescription, getPackageDisplayName } from './catalogue';
import { DEFAULT_MATERIAL_WORDING, materialLines, packageAllowances, scopeNotes, upgradeCatalogue } from './commercial-spec';
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
  for(const grade of ['Base','Normal','Premium'] as const) assert.deepEqual(packageAllowances(catalogue.grades[grade]),{handleRupees:200,laminateSheetRupees:1500,extraDrawerRupees:({Base:4000,Normal:5000,Premium:6000})[grade],includedBedroomDrawersMin:2,includedBedroomDrawersMax:4,additionalAllowances:[]});
  catalogue.grades.Base.allowances!.handleRupees=250;
  catalogue.grades.Base.allowances!.extraDrawerRupees=6000;
  catalogue.workTypes['Additional internal drawer'].rates.Base.Standard=6000;
  assert.match(materialLines(catalogue,['Base']).join('\n'),/₹250 per handle/);
  const notes=scopeNotes(catalogue,['Base']).join('\n');
  assert.match(notes,/₹6,000 each/);assert.match(notes,/2–4/);assert.match(notes,/aluminium/);assert.match(notes,/visible/);assert.match(notes,/materials and labour|cleaning/i);
  assert.deepEqual(['Base','Normal','Premium'].map(g=>getPackageDisplayName(g as any)),['Basic','Standard','Premium']);
});

test('automatic notes use drawer rate-card prices and material wording without AI notes',()=>{
  const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);
  const notes=scopeNotes(catalogue,['Base','Normal','Premium']).join('\n');
  assert.match(notes,/Basic ₹4,000 each; Standard ₹5,000 each; Premium ₹6,000 each/);
  catalogue.workTypes['Additional internal drawer'].rates.Base.Standard=4500;
  assert.match(scopeNotes(catalogue,['Base']).join('\n'),/₹4,500 each/);
  catalogue.materialWording={...DEFAULT_MATERIAL_WORDING,externalLaminate:'Owner-approved decorative laminate finish.',handles:'Included handles'};
  catalogue.commonMaterials=['Woodworking adhesive: Fevicol and Jeevanjor.','Owner-approved laminate edge specification.'];
  const lines=materialLines(catalogue,['Base']).join('\n');
  assert.match(lines,/Owner-approved decorative laminate finish.*₹1,500 per sheet/);
  assert.match(lines,/Included handles: ₹200 per handle/);
  assert.match(lines,/Owner-approved laminate edge/);
  assert.doesNotMatch(lines,/Marine|\bSH\b|Mirai/);
});

test('new drawer defaults upgrade old shipped values while retaining custom rates and brands',()=>{
  const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);catalogue.version='ume-catalogue-2026.11.v7';
  for(const grade of ['Base','Normal','Premium'] as const) {catalogue.grades[grade].allowances!.extraDrawerRupees=5000;catalogue.workTypes['Additional internal drawer'].rates[grade]={Standard:5000,'With PVC':5000};}
  catalogue.workTypes['Additional internal drawer'].rates.Premium={Standard:7250,'With PVC':7250};catalogue.grades.Premium.allowances!.extraDrawerRupees=7250;
  catalogue.commonMaterials=['Woodworking Adhesive (Fevicol Marine / SH / Jivanjor)'];
  const upgraded=upgradeCatalogue(catalogue);
  assert.equal(upgraded.grades.Base.allowances!.extraDrawerRupees,4000);
  assert.equal(upgraded.grades.Premium.allowances!.extraDrawerRupees,7250);
  assert.deepEqual(upgraded.grades.Premium.approvedBrands,catalogue.grades.Premium.approvedBrands);
  assert.deepEqual(upgraded.commonMaterials,['Woodworking adhesive: Fevicol and Jeevanjor.']);
  assert.deepEqual(upgradeCatalogue(upgraded),upgraded);
});
test('new quote metadata is short, unique and uses the India calendar date',()=>{
  const now=new Date('2026-11-02T19:00:00Z');
  assert.equal(indiaDate(now),'2026-11-03');
  assert.equal(nextQuoteNumber([{draft:{quote:{number:'UME-26-0001'}} as any}],now),'UME-26-0002');
});
