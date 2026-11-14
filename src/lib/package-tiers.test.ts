
import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_UME_CATALOGUE } from './catalogue';
import { upgradeCatalogue } from './commercial-spec';
import { legacyPaymentPackageLabel, packageLinkGrade, PACKAGE_TIERS } from './package-tiers';

test('renamed share links and older links resolve to their original pricing grades', () => {
  const links = {
    'tier=standard': 'Base', 'tier=premium': 'Normal', 'tier=luxury': 'Premium',
    'pkg=basic': 'Base', 'pkg=Base-Standard-SF': 'Base',
    'package=standard': 'Normal', 'pkg=Normal-With_PVC-High_Gloss': 'Normal',
    'default=premium': 'Premium', 'pkg=Premium-Standard-SF': 'Premium',
  };
  for (const [query, grade] of Object.entries(links)) {
    assert.equal(packageLinkGrade(new URLSearchParams(query)), grade, query);
  }
  assert.equal(packageLinkGrade(new URLSearchParams('tier=unknown')), undefined);
});

test('renaming the saved catalogue updates package labels and leaves commercial data intact', () => {
  const saved = structuredClone(DEFAULT_UME_CATALOGUE);
  saved.version = 'ume-catalogue-2026.11.v12';
  saved.workTypes['Box type'].rates.Normal.Standard = 1899;
  saved.grades.Premium.approvedBrands[0].warrantyYears = 27;
  const before = structuredClone(saved);
  const updated = upgradeCatalogue(saved);
  assert.deepEqual(Object.values(updated.grades).map(info => info.displayLabel), ['Standard','Premium','Luxury']);
  assert.deepEqual(updated.workTypes, before.workTypes);
  for (const grade of ['Base','Normal','Premium'] as const) {
    assert.deepEqual(updated.grades[grade], {...before.grades[grade],displayLabel:PACKAGE_TIERS[grade].name});
  }
  assert.deepEqual(saved,before);
  assert.equal(upgradeCatalogue(updated),updated);
});

test('older payment labels keep their tier and preserve room and brand text', () => {
  assert.equal(legacyPaymentPackageLabel('Basic · Without PVC · SF'),'Standard · Without PVC · SF');
  assert.equal(legacyPaymentPackageLabel('Standard · With 6mm PVC · SF (Premium Ply)'),'Premium · With 6mm PVC · SF (Premium Ply)');
  assert.equal(legacyPaymentPackageLabel('Room-Wise Mix (Premium Room: Premium/+PVC/SF · Hall: Basic/No-PVC/SF)'), 'Room-Wise Mix (Premium Room: Luxury/+PVC/SF · Hall: Standard/No-PVC/SF)');
  assert.equal(legacyPaymentPackageLabel('Selected Package'),'Selected Package');
});

