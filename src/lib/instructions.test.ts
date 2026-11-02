import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildDynamicGemInstructions, DEFAULT_UME_CATALOGUE } from './catalogue';
import { validateQuotationDraftV2 } from './schema';

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
  const jsonStart = instructions.lastIndexOf('\n{');
  const example = JSON.parse(instructions.slice(jsonStart));
  const validation = validateQuotationDraftV2(example);
  assert.equal(validation.validForDraft, true);
  assert.equal(validation.readyForPublish, false, 'unknown customer data must block publication');
  assert.equal(example.rooms[0].items[0].measure.per_item, 56);
  assert.equal(example.rooms[0].items[0].quantity, 1);
});
