import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildDynamicGemInstructions, DEFAULT_UME_CATALOGUE } from './catalogue';
import { validateQuotationDraftV2, type QuotationDraftV2 } from './schema';
import { parseStudioJson } from './studio-json';

test('downloaded assistant instructions match the app copy button', () => {
  const download = readFileSync(new URL('../../public/Quotation_Assistant_Instructions.txt', import.meta.url), 'utf8').trim();
  assert.equal(download, buildDynamicGemInstructions().trim());
});

test('assistant instructions use current edited rates and keep the example behind review gates', () => {
  const catalogue = structuredClone(DEFAULT_UME_CATALOGUE);
  catalogue.workTypes['Box type'].rates.Base.Standard = 987;
  const instructions = buildDynamicGemInstructions(catalogue);
  assert.match(instructions, /work_type "Box type"; unit "sq_ft"; Standard \(Base\) 987,/);
  assert.match(instructions, /signs in at \/owner/);
  assert.match(instructions, /not a live sync/);
  const example = parseStudioJson(instructions.slice(instructions.lastIndexOf('```json'))) as QuotationDraftV2;
  const validation = validateQuotationDraftV2(example);
  assert.equal(validation.validForDraft, true);
  assert.equal(validation.readyForPublish, false, 'unknown customer data must block publication');
  assert.equal(example.rooms[0].items[0].measure.per_item, 56);
  assert.equal(example.rooms[0].items[0].quantity, 1);
});


test('assistant output includes catalogue PVC scope, real-job status and JSON recommendations in one copyable block', () => {
  const catalogue = structuredClone(DEFAULT_UME_CATALOGUE);
  catalogue.workTypes['Box type'].pvcDefaultParts = ['Owner-approved wall-contact back panel'];
  const instructions = buildDynamicGemInstructions(catalogue);
  assert.match(instructions, /ALWAYS use COPY-AND-PASTE FORMAT/);
  assert.match(instructions, /ONE fenced json code block/);
  assert.match(instructions, /Always include suggested_addons/);
  assert.match(instructions, /Never default an ordinary customer job to true/);
  for (const definition of Object.values(catalogue.workTypes)) assert.ok(instructions.includes(JSON.stringify(definition.pvcDefaultParts)));
  const example = parseStudioJson(instructions.slice(instructions.lastIndexOf('```json'))) as QuotationDraftV2;
  assert.equal(example.is_demo, false);
  assert.deepEqual(example.rooms[0].items[0].pvc.parts, catalogue.workTypes['Box type'].pvcDefaultParts);
  assert.ok(example.suggested_addons!.length > 0);
  example.customer = { name: 'Anita Rao', phone: '9000000000', site: 'Flat 203, Uppal, Hyderabad' };
  example.quote = { number: 'UME-2026-2040', date: '2026-11-02', valid_until: '2026-12-02' };
  example.needs_clarification = [];
  assert.equal(validateQuotationDraftV2(example).readyForPublish, true, 'confirming the client should leave no artificial demo or PVC blockers');
});


test('assistant instructions preserve optional estimate metadata without assuming a site visit', () => {
  const instructions = buildDynamicGemInstructions();
  assert.match(instructions, /quote\.estimate_basis/);
  assert.match(instructions, /never assume a site visit took place/);
  assert.match(instructions, /1,000 characters/);
  assert.match(instructions, /custom note supplements this notice and cannot replace it/);
  assert.equal((instructions.match(/```json/g) || []).length, 1);
  const example = parseStudioJson(instructions.slice(instructions.lastIndexOf('```json'))) as QuotationDraftV2;
  assert.equal(example.quote.estimate_basis, 'floor_plan');
  assert.equal(example.quote.estimate_note, null);
  assert.equal(validateQuotationDraftV2(example).validForDraft, true);
});
