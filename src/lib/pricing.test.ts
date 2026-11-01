import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMilestoneSchedule,
  calculateQuotationPricing,
  computeCustomerSelectionTotal,
  formatINR,
  makeComboKey,
} from './pricing';
import {
  APPENDIX_PRACTICE_DRAFT,
  KARTHIK_HISTORICAL_RATE_OVERRIDES,
  KARTHIK_PEERZADIGUDA_DRAFT,
  VIDYA_SAGAR_REDDY_DRAFT,
} from './historicalData';
import {
  detectPlaceholders,
  detectUntranslatedTokens,
  migrateV1ToV2Draft,
  validateQuotationDraftV2,
} from './schema';

test('Vidya Sagar Reddy quote reproduces historical PDF totals and enforces SF = High-Gloss same price parity', async () => {
  const {
    DEFAULT_UME_CATALOGUE,
    getPackageDisplayName,
    resolveStandardDepthInches,
    STANDARD_DEPTH_SCHEDULE_INCHES,
    standardizeCompetitorItemName,
  } = await import('./catalogue');
  const snapshot = calculateQuotationPricing(VIDYA_SAGAR_REDDY_DRAFT);

  // Historical PDF 1: Premium · Standard · SF = ₹7,32,965
  assert.equal(snapshot.baseWholeHomeTotals[makeComboKey('Premium', 'Standard', 'SF')], 732965);

  // Historical PDF 2: Standard (Base) · Standard · SF = ₹5,46,034
  assert.equal(snapshot.baseWholeHomeTotals[makeComboKey('Base', 'Standard', 'SF')], 546034);

  // SF Matte and High-Gloss 1.0mm external laminate must be the EXACT SAME PRICE
  const premiumHighGloss = snapshot.baseWholeHomeTotals[makeComboKey('Premium', 'Standard', 'High Gloss')];
  assert.equal(premiumHighGloss, 732965, 'High Gloss and SF Matte must have the exact same price');
  assert.equal(
    snapshot.baseWholeHomeTotals[makeComboKey('Base', 'Standard', 'High Gloss')],
    546034
  );

  // Verify customer package display names: Standard, Normal, Premium
  assert.equal(getPackageDisplayName('Base'), 'Standard');
  assert.equal(getPackageDisplayName('Normal'), 'Normal');
  assert.equal(getPackageDisplayName('Premium'), 'Premium');

  // Verify UPI ID is 9491661555@oksbi
  assert.equal(DEFAULT_UME_CATALOGUE.company.bank.upiId, '9491661555@oksbi');

  // Verify 12-item Standard Depth Schedule in inches
  assert.equal(STANDARD_DEPTH_SCHEDULE_INCHES.length, 12);
  assert.equal(resolveStandardDepthInches('Wardrobe', 'Box type', 'Master Bedroom'), 21);
  assert.equal(resolveStandardDepthInches('Base cabinet unit', 'Box type', 'Kitchen'), 21);
  assert.equal(resolveStandardDepthInches('Wall cabinet unit', 'Box type', 'Kitchen'), 12);
  assert.equal(resolveStandardDepthInches('Mini crockery unit (above breakfast counter)', 'Box type', 'Kitchen'), 12);
  assert.equal(resolveStandardDepthInches('Crockery base unit', 'Box type', 'Hall & Dining'), 18);
  assert.equal(resolveStandardDepthInches('TV unit', 'Box type', 'Hall & Dining'), 16);
  assert.equal(resolveStandardDepthInches('TV overhead unit', 'Box type', 'Hall & Dining'), 12);
  assert.equal(resolveStandardDepthInches('Study table', 'Box type', 'Children Bedroom'), 20);
  assert.equal(resolveStandardDepthInches('Folding table', 'Folding table', 'Master Bedroom'), 18);
  assert.equal(resolveStandardDepthInches('Book shelf', 'Box type', 'Children Bedroom'), 12);
  assert.equal(resolveStandardDepthInches('Wash area wardrobe', 'Box type', 'Kitchen'), 12);
  assert.equal(resolveStandardDepthInches('Shoe rack', 'Box type', 'Hall & Dining'), 14);

  // Verify clean unbracketed competitor-standard naming & sub-line formatting
  const { formatCleanItemDescription } = await import('./catalogue');
  assert.equal(
    standardizeCompetitorItemName('Base cabinet unit', 'Box type', 'Kitchen'),
    'Kitchen Base Cabinet'
  );
  assert.equal(
    standardizeCompetitorItemName('Wall cabinet unit', 'Box type', 'Kitchen'),
    'Kitchen Overhead Wall Cabinet'
  );
  assert.equal(
    formatCleanItemDescription(
      'Box-type kitchen base cabinet unit with 0.8mm inside laminate and High Gloss or SF laminate finish, 10.6 ft by 2.6 ft (27.56 sq ft).',
      'Kitchen Base Cabinet',
      'Box type',
      'Kitchen'
    ),
    '21" carcass depth · Box-type kitchen base cabinet unit with inside laminate and outside laminate finish.'
  );

  // With PVC adds PVC substitution ONLY to eligible items (Folding table, Tandem baskets, Pooja CNC doors stay unchanged)
  const foldingTable = snapshot.rooms[0].items[3];
  assert.equal(foldingTable.pvcEligible, false);
  assert.equal(
    foldingTable.exactAmounts[makeComboKey('Premium', 'Standard', 'SF')],
    foldingTable.exactAmounts[makeComboKey('Premium', 'With PVC', 'SF')]
  );

  // Eligible locker gets +₹75/sq.ft PVC adjustment
  const locker = snapshot.rooms[0].items[1];
  assert.equal(locker.pvcEligible, true);
  assert.equal(locker.unitRates[makeComboKey('Premium', 'Standard', 'SF')], 1250);
  assert.equal(locker.unitRates[makeComboKey('Premium', 'With PVC', 'SF')], 1325);
});

test('J. Karthik Peerzadiguda quote reproduces ₹5,27,445 to the rupee', () => {
  const snapshot = calculateQuotationPricing(KARTHIK_PEERZADIGUDA_DRAFT, undefined, {
    lineRateOverrides: KARTHIK_HISTORICAL_RATE_OVERRIDES,
  });
  assert.equal(snapshot.baseWholeHomeTotals[makeComboKey('Base', 'Standard', 'SF')], 527445);
});

test('Room mixing, optional add-ons, and flat discount calculate deterministically', () => {
  const snapshot = calculateQuotationPricing(VIDYA_SAGAR_REDDY_DRAFT);

  // Whole-home Premium Standard SF with no add-ons
  const baseCalc = computeCustomerSelectionTotal(snapshot, {
    wholeHomeSelection: {
      grade: 'Premium',
      protection: 'Standard',
      finish: 'SF',
      brand_preference: 'Flaer Ply (SMART)',
    },
    mixByRoom: false,
    selectedOptionalPointers: [],
    approvedDiscountRupees: 0,
  });
  assert.equal(baseCalc.grandTotal, 732965);

  // Opt-in to 2 extra soft-close drawers (/rooms/4/items/2 -> 2 × ₹3,600 = ₹7,200)
  const withDrawers = computeCustomerSelectionTotal(snapshot, {
    wholeHomeSelection: {
      grade: 'Premium',
      protection: 'Standard',
      finish: 'SF',
      brand_preference: null,
    },
    mixByRoom: false,
    selectedOptionalPointers: ['/rooms/4/items/2'],
    approvedDiscountRupees: 2965,
  });
  assert.equal(withDrawers.optionalSelectedTotal, 7200);
  assert.equal(withDrawers.grandTotal, 732965 + 7200 - 2965);
});

test('Milestone payment schedule credits ₹50,000 booking once toward 50% advance', () => {
  // Brief example: On a ₹4,00,000 total, advance is ₹2,00,000. After verified ₹50,000 booking, ₹1,50,000 remains.
  const unpaid = calculateMilestoneSchedule(400000, 0);
  assert.equal(unpaid.bookingRequired, 50000);
  assert.equal(unpaid.advance50PercentTotal, 200000);
  assert.equal(unpaid.advanceRemainingToStartWork, 200000);

  const afterVerifiedBooking = calculateMilestoneSchedule(400000, 50000);
  assert.equal(afterVerifiedBooking.advance50PercentTotal, 200000);
  assert.equal(afterVerifiedBooking.advanceRemainingToStartWork, 150000);
  assert.equal(afterVerifiedBooking.plywoodCompletion35Percent, 140000);
  assert.equal(afterVerifiedBooking.laminateCompletion10Percent, 40000);
  assert.equal(afterVerifiedBooking.handoverFinal5Percent, 20000);

  // Small order rule trigger when 50% < ₹50,000
  const smallOrder = calculateMilestoneSchedule(80000, 0);
  assert.equal(smallOrder.requiresOwnerSmallOrderRule, true);
});

test('Language and schema gate blocks non-Latin scripts, Romanised Telugu/Hindi, placeholders, and demo records', () => {
  // Appendix practice draft has is_demo=true and unresolved clarifications
  const appendixRes = validateQuotationDraftV2(APPENDIX_PRACTICE_DRAFT);
  assert.equal(appendixRes.validForDraft, true);
  assert.equal(appendixRes.readyForPublish, false);
  assert.ok(appendixRes.issues.some((i) => i.code === 'DEMO_RECORD'));
  assert.ok(appendixRes.issues.some((i) => i.code === 'UNRESOLVED_CLARIFICATION'));

  //Vidya Sagar Reddy draft is clean and ready for publish
  const vidyaRes = validateQuotationDraftV2(VIDYA_SAGAR_REDDY_DRAFT);
  assert.equal(vidyaRes.validForDraft, true);
  assert.equal(vidyaRes.readyForPublish, true);
  assert.equal(vidyaRes.issues.length, 0);

  // Detect Romanised Telugu leak ("rendu lockers")
  const romanLeaks = detectUntranslatedTokens('Two rooms and rendu lockers in almara');
  assert.equal(romanLeaks.length, 2);

  // Detect placeholders
  assert.equal(detectPlaceholders('Laminate shade TBC after visit'), 'TBC');
  assert.equal(detectPlaceholders('Manufacturer to be confirmed'), 'Manufacturer to be confirmed');

  // v1 migration converts Romanised tokens and outputs valid v2 schema
  const migrated = migrateV1ToV2Draft({
    is_demo: false,
    languages: ['te'],
    customer: { name: 'Rao', site: 'Uppal', phone: '9000000000' },
    quote: { number: 'UME-01', date: '2026-11-01', valid_until: '2026-12-01' },
    recommended: { grade: 'Premium', protection: 'Standard', finish: 'SF', brand_preference: null },
    rooms: [
      {
        name: 'Vantillu',
        items: [
          {
            name: 'Rendu Lockers',
            work_type: 'Box type',
            size_text: 'okatinnara adugulu × 3 ft',
            unit: 'sq_ft',
            area_sqft: 4.5,
            quantity: 2,
            pvc_eligible: true,
            pvc: { eligible: true, parts: ['Back panel'] },
            source_text: 'rendu lockers okatinnara adugulu by 3 ft',
          },
        ],
      },
    ],
  });
  assert.equal(migrated.schema_version, 'quotation-studio.draft.v2');
  assert.equal(migrated.rooms[0].name, 'Kitchen');
  assert.equal(migrated.rooms[0].items[0].name, 'two Lockers');
  assert.equal(formatINR(732965), '₹7,32,965');
});

test('Rate Card JSON generator and merger adds new work elements and prices custom work types', async () => {
  const {
    DEFAULT_UME_CATALOGUE,
    generateRateCardPatchDeterministically,
    mergeRateCardJsonIntoCatalogue,
  } = await import('./catalogue');

  const patch = generateRateCardPatchDeterministically(
    'Add new rate card work elements: 1) Aluminum profile glass shutter at Base 1350, Normal 1450, Premium 1600 per sq ft'
  );
  assert.equal(patch.schema_version, 'quotation-studio.ratecard.v2');
  assert.equal(patch.output_language, 'en');

  const merged = mergeRateCardJsonIntoCatalogue(DEFAULT_UME_CATALOGUE, patch);
  assert.ok(merged.addedOrUpdatedKeys.length >= 1);
  const key = merged.addedOrUpdatedKeys[0];
  assert.equal(merged.catalogue.workTypes[key].rates.Base.Standard, 1350);
  assert.equal(merged.catalogue.workTypes[key].rates.Normal.Standard, 1450);
  assert.equal(merged.catalogue.workTypes[key].rates.Premium.Standard, 1600);
});

test('Unified Quotation + Rate Card JSON auto-extracts new work elements and applies item custom_rates', async () => {
  const {
    DEFAULT_UME_CATALOGUE,
    extractAndMergeRateCardFromDraft,
    buildDynamicGemInstructions,
    LUXURY_IMAGE_PROMPTS,
  } = await import('./catalogue');

  const customDraft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  customDraft.rate_card_updates = [
    {
      key: 'Wall-mounted study table',
      label: 'Wall-Mounted Study Table (Foldable)',
      unit: 'sq_ft',
      defaultPvcEligible: false,
      description: 'Custom floating study desk with hydraulic hinges',
      rates: {
        Base: { Standard: 1100, 'With PVC': 1100 },
        Normal: { Standard: 1200, 'With PVC': 1200 },
        Premium: { Standard: 1400, 'With PVC': 1400 },
      },
    },
  ];
  customDraft.rooms[0].items.push({
    name: 'Floating Wall-Mounted Study Desk',
    work_type: 'Wall-mounted study table',
    size_text: '4.0 × 2.0 ft',
    unit: 'sq_ft',
    width_ft: 4,
    height_ft: 2,
    area_sqft: 8,
    quantity: 1,
    optional: false,
    pvc: { eligible: false, parts: [] },
    notes: 'Custom floating study unit',
    source_text_en: 'One 4 by 2 ft wall-mounted study table',
  });

  const mergedRes = extractAndMergeRateCardFromDraft(DEFAULT_UME_CATALOGUE, customDraft);
  assert.ok(mergedRes.addedOrUpdatedKeys.includes('Wall-mounted study table'));

  const snap = calculateQuotationPricing(customDraft, mergedRes.catalogue);
  const studyItem = snap.rooms[0].items[snap.rooms[0].items.length - 1];
  assert.equal(studyItem.unitRates[makeComboKey('Base', 'Standard', 'SF')], 1100);
  assert.equal(studyItem.unitRates[makeComboKey('Premium', 'Standard', 'SF')], 1400);

  const gemPrompt = buildDynamicGemInstructions(mergedRes.catalogue);
  assert.ok(gemPrompt.includes('Wall-Mounted Study Table (Foldable)'));
  assert.ok(gemPrompt.includes('STEP 1 — CUSTOMER & SITE LOCATION'));
  assert.ok(LUXURY_IMAGE_PROMPTS.length >= 8);
});


