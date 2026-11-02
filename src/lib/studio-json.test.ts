import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStudioJson } from './studio-json';
import { migrateV1ToV2Draft, validateQuotationDraftV2 } from './schema';

test('studio imports copy-button JSON and a complete fenced JSON block', () => {
  const payload = { schema_version: 'quotation-studio.draft.v2', suggested_addons: [] };
  assert.deepEqual(parseStudioJson(JSON.stringify(payload)), payload);
  assert.deepEqual(parseStudioJson('  ```json\r\n' + JSON.stringify(payload) + '\r\n```  '), payload);
  assert.deepEqual(parseStudioJson('```\n' + JSON.stringify(payload) + '\n```'), payload);
  assert.throws(() => parseStudioJson('Here is your quote:\n```json\n{}\n```'));
  assert.throws(() => parseStudioJson('```json\n{}\n```\n```json\n{}\n```'));
});

test('legacy imports default to a real job but retain explicit practice flags', () => {
  assert.equal(migrateV1ToV2Draft({}).is_demo, false);
  assert.equal(migrateV1ToV2Draft({ is_demo: false }).is_demo, false);
  assert.equal(migrateV1ToV2Draft({ is_demo: 'false' }).is_demo, false);
  for (const flag of [true, 'true']) {
    const migrated = migrateV1ToV2Draft({ is_demo: flag });
    assert.equal(migrated.is_demo, true);
    assert.ok(validateQuotationDraftV2(migrated).issues.some(issue => issue.code === 'DEMO_RECORD'));
  }
});
