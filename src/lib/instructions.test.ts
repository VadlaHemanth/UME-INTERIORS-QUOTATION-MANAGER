import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildDynamicGemInstructions, DEFAULT_UME_CATALOGUE } from './catalogue';
import { validateQuotationDraftV2, type QuotationDraftV2 } from './schema';
import { parseStudioJson } from './studio-json';
import { DEFAULT_MATERIAL_WORDING, documentTerms, materialLines, scopeNotes } from './commercial-spec';

test('downloaded assistant instructions match the app copy button', () => {
  const download = readFileSync(new URL('../../public/Quotation_Assistant_Instructions.txt', import.meta.url), 'utf8').trim();
  assert.equal(download, buildDynamicGemInstructions().trim());
});

test('assistant instructions use current edited rates and keep the example behind review gates', () => {
  const catalogue = structuredClone(DEFAULT_UME_CATALOGUE);
  catalogue.workTypes['Box type'].rates.Base.Standard = 987;
  catalogue.grades.Normal.approvedBrands[0].warrantyYears = 20;
  const instructions = buildDynamicGemInstructions(catalogue);
  assert.match(instructions, /\| Box type \| sq_ft \| 987 \| 1150 \| 1350 \|/);
  assert.match(instructions, /signs in at \/owner/);
  assert.match(instructions, /not a live sync/);
  assert.match(instructions,/ONE CONSOLIDATED REVIEW BEFORE FINAL JSON/);
  assert.match(instructions,/DIMENSION ORDER — HEIGHT × WIDTH/);
  assert.match(instructions,/ROOM AND FURNITURE WALKTHROUGH ORDER/);
  assert.match(instructions,/Crockery Cabinet → Loft above Crockery/);
  assert.match(instructions,/Wardrobe → Wardrobe Loft → Dressing Table → Dressing Loft/);
  assert.match(instructions,/exactly THREE readable Markdown tables/);
  assert.match(instructions,/do not print the full saved catalogue/i);
  assert.match(instructions,/“Package preview”: Room \| Standard ₹ \| Premium ₹ \| Luxury ₹/);
  assert.match(instructions,/root assistant_memory_updates/);
  assert.match(instructions,/parent_item_index:2/);
  assert.match(instructions,/recompute suggested_addons\[\]\.room_index/);
  assert.match(instructions,/package comparison/);
  assert.match(instructions,/WORK ORDER CREATION AND PDF/);
  assert.match(instructions,/retain the original booking confirmation date/);
  assert.match(instructions,/Confirm scope & create work order without adding another payment/);
  assert.match(instructions,/work-order confirmation date, verified credits, remaining balance/);
  assert.match(instructions,/never swap or guess an unlabelled pair/);
  assert.match(instructions,/Preserve confirmed length, depth, diameter, piece counts/);
  assert.match(instructions,/do not interview rate by rate/);
  assert.match(instructions,/The AI CAN generate a reusable rate-card addition\/change in JSON/);
  assert.match(instructions,/For ordinary quotations, reuse the saved rates/);
  assert.ok(instructions.includes('| Box type | sq_ft | 987 | 1150 | 1350 |'));
  assert.match(instructions, /Premium: Up to 20 years plywood warranty/);
  assert.match(instructions, /Do not generate these labels or comparisons in JSON, quote.notes or owner_requests/);
  const example = parseStudioJson(instructions.slice(instructions.lastIndexOf('```json'))) as QuotationDraftV2;
  const validation = validateQuotationDraftV2(example);
  assert.equal(validation.validForDraft, true);
  assert.equal(validation.readyForPublish, false, 'unknown customer data must block publication');
  assert.equal(example.rooms[0].items[0].measure.per_item, 56);
  assert.equal(example.rooms[0].items[0].quantity, 1);
});


test('assistant output keeps per-item PVC internal and requires tailored JSON recommendations in one copyable block', () => {
  const catalogue = structuredClone(DEFAULT_UME_CATALOGUE);
  catalogue.workTypes['Box type'].pvcDefaultParts = ['Owner-approved wall-contact back panel'];
  const instructions = buildDynamicGemInstructions(catalogue);
  assert.match(instructions, /ALWAYS use COPY-AND-PASTE FORMAT/);
  assert.match(instructions, /ONE fenced json code block/);
  assert.match(instructions, /Always include suggested_addons/);
  assert.match(instructions, /AUTOMATIC SITE PROTECTION/);
  assert.match(instructions, /do not include a pvc object/i);
  assert.match(instructions, /quote\.show_recommended_package: false/);
  assert.match(instructions, /Never default an ordinary customer job to true/);
  const example = parseStudioJson(instructions.slice(instructions.lastIndexOf('```json'))) as QuotationDraftV2;
  assert.equal(example.is_demo, false);
  assert.equal('pvc' in example.rooms[0].items[0], false);
  assert.equal('pvc' in example.suggested_addons![0].item, false);
  assert.ok(example.suggested_addons!.length > 0);
  example.customer = { name: 'Anita Rao', phone: '9000000000', site: 'Flat 203, Uppal, Hyderabad' };
  example.quote = { number: 'UME-2026-2040', date: '2026-11-02', valid_until: '2026-12-02' };
  example.needs_clarification = [];
  assert.equal(validateQuotationDraftV2(example).readyForPublish, true, 'confirming the client should leave no artificial demo or PVC blockers');
});


test('assistant instructions use the floor-plan checkbox without assuming a site visit', () => {
  const instructions = buildDynamicGemInstructions();
  assert.match(instructions, /quote\.is_floor_plan_estimate/);
  assert.match(instructions, /otherwise false/);
  assert.match(instructions, /never imply that a site visit has happened/);
  assert.equal((instructions.match(/```json/g) || []).length, 1);
  const example = parseStudioJson(instructions.slice(instructions.lastIndexOf('```json'))) as QuotationDraftV2;
  assert.equal(example.quote.is_floor_plan_estimate, false);
  assert.equal(example.quote.estimate_basis, undefined);
  assert.equal(example.quote.estimate_note, undefined);
  assert.equal(example.quote.show_recommended_package, false);
  assert.equal(validateQuotationDraftV2(example).validForDraft, true);
});

test('assistant handoff leaves app-owned document sections out of ordinary JSON notes and review requests',()=>{
  const instructions=buildDynamicGemInstructions();
  assert.match(instructions,/DEFAULT TO quote\.notes: \[\] AND owner_requests: \[\]/);
  assert.match(instructions,/ALREADY GENERATED BY THE APP — DO NOT REPEAT/);
  for(const topic of ['plywood brands','manufacturer warranty','laminate-sheet and handle allowances','additional-drawer charges','heavy glass and CNC design work','Booking/advance/milestone terms','bank/account/UPI details','floor-plan estimate disclosure']) assert.ok(instructions.includes(topic),`missing app-owned topic: ${topic}`);
  assert.match(instructions,/explicitly owner-approved job-specific instruction/);
  assert.match(instructions,/A specifically requested glass door or CNC panel likewise belongs in the actual scope/);
  assert.match(instructions,/Do not silently discard it/);
  assert.match(instructions,/Do not add unsupported root\/quote fields/);
  assert.match(instructions,/Generic package benefits and extra-charge disclaimers are not tailored add-ons/);
  assert.doesNotMatch(instructions,/Do not omit these points or replace them/);
  const example=parseStudioJson(instructions.slice(instructions.lastIndexOf('```json'))) as QuotationDraftV2;
  assert.deepEqual(example.quote.notes,[]);
  assert.deepEqual(example.owner_requests,[]);
  assert.equal((instructions.match(/```json/g)||[]).length,1);
});

test('automatic-document references use the actual saved renderers without modifying settings',()=>{
  const catalogue=structuredClone(DEFAULT_UME_CATALOGUE);
  catalogue.materialWording={...DEFAULT_MATERIAL_WORDING,externalLaminate:'Owner-approved decorative laminate wording.'};
  catalogue.commonMaterials=['Owner-approved soft-close hardware.','Woodworking adhesive: Fevicol and Jeevanjor.'];
  catalogue.workTypes['Additional internal drawer'].rates.Base.Standard=4250;
  catalogue.notesAndExclusions.push('Building access must be booked through the site manager.');
  catalogue.termsAndConditions[0].clause='Owner-configured booking clause for this catalogue.';
  catalogue.grades.Normal.approvedBrands[0].name='Owner-approved BWR product';
  const before=structuredClone(catalogue);
  const instructions=buildDynamicGemInstructions(catalogue);
  for(const line of [...materialLines(catalogue,['Base','Normal','Premium']),...scopeNotes(catalogue,['Base','Normal','Premium'])]) assert.ok(instructions.includes(line),`missing saved automatic text: ${line}`);
  for(const term of documentTerms(catalogue,['Base','Normal','Premium'])) assert.ok(instructions.includes(`${term.title}: ${term.clause}`));
  assert.match(instructions,/Standard: handles up to ₹200 each; laminate up to ₹1500 per sheet; additional internal drawers ₹4250 each/);
  assert.match(instructions,/Owner-approved BWR product/);
  assert.deepEqual(catalogue,before,'copying assistant instructions must not alter settings');
});
