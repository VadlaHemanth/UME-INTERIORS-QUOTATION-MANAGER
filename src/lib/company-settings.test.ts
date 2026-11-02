import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_UME_CATALOGUE } from './catalogue';
import { companyWebsiteUrl, syncCatalogueDraft, validateCompanySettings } from './company-settings';

test('company settings preserve real names and account leading zeroes while normalising contact formats', () => {
  const value = structuredClone(DEFAULT_UME_CATALOGUE.company);
  value.brandName = '  శ్రీ Interiors & Co.  ';
  value.bank.accountName = 'V. Subhash / Umamaheshwara Enterprises';
  value.bank.accountNumber = '000123456789';
  value.bank.ifsc = 'sbin0065453';
  value.whatsapp = '+91 (94916) 61555';
  const result = validateCompanySettings(value);
  assert.equal(result.valid, true);
  assert.equal(result.company?.brandName, 'శ్రీ Interiors & Co.');
  assert.equal(result.company?.bank.accountNumber, '000123456789');
  assert.equal(result.company?.bank.ifsc, 'SBIN0065453');
  assert.equal(result.company?.whatsapp, '919491661555');
});

test('company settings reject malformed input with field errors and never return a partial company', () => {
  for (const input of [null, [], 'company', { ...DEFAULT_UME_CATALOGUE.company, bank: null }]) {
    const result = validateCompanySettings(input);
    assert.equal(result.valid, false);
    assert.ok(Object.keys(result.errors).length > 0);
    assert.equal(result.company, undefined);
  }
  const input = structuredClone(DEFAULT_UME_CATALOGUE.company);
  input.phone = 'call me';
  input.domain = 'javascript:alert(1)';
  input.bank.ifsc = 'INVALID';
  input.bank.upiId = 'not a upi';
  input.bank.upiLimitRupees = Number.POSITIVE_INFINITY;
  const result = validateCompanySettings(input);
  for (const path of ['phone', 'domain', 'bank.ifsc', 'bank.upiId', 'bank.upiLimitRupees']) assert.ok(result.errors[path], path);
});

test('company settings allow optional website and branch and strip unrelated payload properties', () => {
  const value = { ...structuredClone(DEFAULT_UME_CATALOGUE.company), domain: '', subtitle: '', credentials: 'not returned' };
  value.bank.branch = '';
  const result = validateCompanySettings(value);
  assert.equal(result.valid, true);
  assert.equal('credentials' in result.company!, false);
});

test('WhatsApp settings require the country code before generating a wa.me link', () => {
  for (const whatsapp of ['9491661555', '09491661555']) {
    const result = validateCompanySettings({ ...DEFAULT_UME_CATALOGUE.company, whatsapp });
    assert.equal(result.valid, false);
    assert.match(result.errors.whatsapp, /country code/);
  }
  assert.equal(validateCompanySettings({ ...DEFAULT_UME_CATALOGUE.company, whatsapp: '+91 94916 61555' }).valid, true);
});

test('website links accept http(s) addresses and refuse executable schemes and embedded credentials', () => {
  assert.equal(companyWebsiteUrl('umeinteriors.com'), 'https://umeinteriors.com/');
  assert.equal(companyWebsiteUrl('https://example.com/studio'), 'https://example.com/studio');
  for (const address of ['javascript:alert(1)', 'data:text/html,test', 'https://owner:secret@example.com', 'bad website.com']) assert.equal(companyWebsiteUrl(address), undefined);
});

test('company-only updates preserve unsaved local rates, while incoming rate updates replace them', () => {
  const previous = structuredClone(DEFAULT_UME_CATALOGUE);
  const local = structuredClone(previous);
  const workType = Object.keys(local.workTypes)[0];
  const savedRate = local.workTypes[workType].rates.Base.Standard;
  local.workTypes[workType].rates.Base.Standard = savedRate + 73;
  const incoming = structuredClone(previous);
  incoming.company.proprietor = 'Updated proprietor';
  const synced = syncCatalogueDraft(previous, incoming, local);
  assert.equal(synced.company.proprietor, 'Updated proprietor');
  assert.equal(synced.workTypes[workType].rates.Base.Standard, savedRate + 73);
  assert.equal(local.company.proprietor, previous.company.proprietor);

  incoming.workTypes[workType].rates.Base.Standard = savedRate + 42;
  const refreshed = syncCatalogueDraft(previous, incoming, local);
  assert.equal(refreshed.workTypes[workType].rates.Base.Standard, savedRate + 42);
  assert.notEqual(refreshed.workTypes, incoming.workTypes);
});
