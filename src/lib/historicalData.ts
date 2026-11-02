import { QuotationDraftV2 } from './schema';

// Source examples are anonymized; original client records remain in the ignored local database.
// Legacy exported identifiers are retained for import compatibility and arithmetic regression tests.

/**
 * 1. Demo Customer One — Anonymized 21-item arithmetic reference:
 *    - Reference_Premium.pdf -> Exact Total: ₹7,32,965.00 (Premium · Standard)
 *    - Reference_Standard.pdf         -> Exact Total: ₹5,46,034.00 (Base · Standard)
 */
export const VIDYA_SAGAR_REDDY_DRAFT: QuotationDraftV2 = {
  schema_version: 'quotation-studio.draft.v2',
  output_language: 'en',
  is_demo: false,
  languages: ['te', 'en'],
  customer: {
    name: 'Demo Customer One',
    site: 'Example Apartment One, Hyderabad',
    phone: null,
  },
  quote: {
    number: 'UME-2026-1024',
    date: '2026-10-24',
    valid_until: '2026-11-23',
  },
  recommended: {
    grade: 'Premium',
    protection: 'Standard',
    finish: 'High Gloss',
    brand_preference: 'Flaer Ply (SMART)',
  },
  rooms: [
    {
      name: 'Master Bedroom',
      recommended: null,
      items: [
        {
          name: 'Loft Frame and Shutter',
          work_type: 'Loft - frame and shutter',
          size_text: '9.9 ft × 11.9 ft',
          measure: { unit: 'sq_ft', per_item: 117.81 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall and slab-contact perimeter frame'] },
          optional: false,
          source_text_en:
            'Frame and shutter construction with inside laminate and outside laminate finish.',
        },
        {
          name: 'Locker Inside Wardrobe',
          work_type: 'Box type',
          size_text: '1.5 ft × 3 ft',
          measure: { unit: 'sq_ft', per_item: 4.5 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel'] },
          optional: false,
          source_text_en:
            '21" carcass depth · Box-type internal locker with inside laminate and outside laminate finish.',
        },
        {
          name: 'Dressing Table',
          work_type: 'Box type',
          size_text: '7 ft × 2 ft',
          measure: { unit: 'sq_ft', per_item: 14 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel', 'Bottom floor-contact panel'] },
          optional: false,
          source_text_en:
            '21" carcass depth · Box-type dressing unit with mirror, inside laminate, and outside laminate finish.',
        },
        {
          name: 'Wall-Mounted Folding Table',
          work_type: 'Folding table',
          size_text: '2 ft × 3 ft',
          measure: { unit: 'sq_ft', per_item: 6 },
          quantity: 1,
          pvc: { eligible: false, parts: [] },
          optional: false,
          source_text_en:
            '18" depth · Wall-mounted folding table with both sides laminate finish and heavy-duty folding brackets.',
        },
      ],
    },
    {
      name: 'Children Bedroom',
      recommended: null,
      items: [
        {
          name: 'Wardrobe Frame and Shutter',
          work_type: 'Frame type',
          size_text: '6.9 ft × 8.5 ft',
          measure: { unit: 'sq_ft', per_item: 58.65 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact perimeter frame'] },
          optional: false,
          source_text_en:
            'Perimeter frame and shutter construction with inside laminate and outside laminate finish.',
        },
        {
          name: 'Loft Frame and Shutter',
          work_type: 'Loft - frame and shutter',
          size_text: '3 ft × 11.9 ft',
          measure: { unit: 'sq_ft', per_item: 35.7 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall and slab-contact perimeter frame'] },
          optional: false,
          source_text_en:
            'Frame and shutter construction with inside laminate and outside laminate finish.',
        },
        {
          name: 'Study Table Workstation',
          work_type: 'Box type',
          size_text: '7 ft × 4 ft',
          measure: { unit: 'sq_ft', per_item: 28 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel', 'Wall-side panel'] },
          optional: false,
          source_text_en:
            '20" carcass depth · Box-type study workstation with inside laminate and outside laminate finish.',
        },
      ],
    },
    {
      name: 'Kitchen',
      recommended: null,
      items: [
        {
          name: 'Kitchen Base Cabinet',
          work_type: 'Box type',
          size_text: '2.9 ft × 10 ft',
          measure: { unit: 'sq_ft', per_item: 29 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Under-sink & wet-zone back panel', 'Bottom skirting panel'] },
          optional: false,
          source_text_en:
            '21" carcass depth · Under-counter modular box cabinet with inside laminate and outside laminate finish.',
        },
        {
          name: 'Modular Tandem / SS 304 Pull-Out Baskets',
          work_type: 'Tandem or SS baskets',
          size_text: '6 units (Standard modular sizes)',
          measure: { unit: 'each', per_item: 1 },
          quantity: 6,
          pvc: { eligible: false, parts: [] },
          optional: false,
          source_text_en:
            'Six Tandem or stainless-steel (SS 304) pull-out baskets with soft-close telescopic channels and hardware fittings.',
        },
        {
          name: 'Kitchen Overhead Wall Cabinet',
          work_type: 'Box type',
          size_text: '2 ft × 10 ft',
          measure: { unit: 'sq_ft', per_item: 20 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel'] },
          optional: false,
          source_text_en:
            '12" carcass depth · Overhead wall-mounted box cabinet with inside laminate and outside laminate finish.',
        },
        {
          name: 'Kitchen Full-Height Utility Cabinet',
          work_type: 'Box type',
          size_text: '6.9 ft × 5.9 ft',
          measure: { unit: 'sq_ft', per_item: 40.71 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel', 'Floor-contact base panel'] },
          optional: false,
          source_text_en:
            '21" carcass depth · Full-height pantry and utility cabinet opposite to base counter with inside laminate and outside laminate finish.',
        },
        {
          name: 'Loft Frame and Shutter',
          work_type: 'Loft - frame and shutter',
          size_text: '3 ft × 21 ft',
          measure: { unit: 'sq_ft', per_item: 63 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Ceiling slab & wall-contact frame'] },
          optional: false,
          source_text_en:
            'Frame and shutter construction with inside laminate and outside laminate finish.',
        },
        {
          name: 'Wall Panelling Under Loft',
          work_type: 'Wood wall paneling',
          size_text: '1.9 ft × 24 ft',
          measure: { unit: 'sq_ft', per_item: 45.6 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing sheet'] },
          optional: false,
          source_text_en:
            'Plywood wall panelling under kitchen loft with outside laminate finish.',
        },
        {
          name: 'Wash Area Utility Cabinet',
          work_type: 'Box type',
          size_text: '2.5 ft × 2.5 ft',
          measure: { unit: 'sq_ft', per_item: 6.25 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wet-area back panel', 'Wet-area bottom panel', 'Side wall panel'] },
          optional: false,
          source_text_en:
            '12" carcass depth · Box-type wash area utility storage cabinet with inside laminate and outside laminate finish.',
        },
        {
          name: 'Breakfast Counter Console',
          work_type: 'Box type',
          size_text: '2.5 ft × 6.3 ft',
          measure: { unit: 'sq_ft', per_item: 15.75 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Floor-contact base', 'Wall-side panel'] },
          optional: false,
          source_text_en:
            '18" carcass depth · Box-type breakfast counter cabinet with inside laminate and outside laminate finish.',
        },
        {
          name: 'Breakfast Counter Wall Panelling',
          work_type: 'Wood wall paneling',
          size_text: '2.5 ft × 7.3 ft',
          measure: { unit: 'sq_ft', per_item: 18.25 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing sheet'] },
          optional: false,
          source_text_en:
            'Decorative plywood wall panelling for breakfast counter with outside laminate finish.',
        },
        {
          name: 'Crockery Overhead Display Unit',
          work_type: 'Box type',
          size_text: '4 ft × 2 ft',
          measure: { unit: 'sq_ft', per_item: 8 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel'] },
          optional: false,
          source_text_en:
            '12" carcass depth · Overhead crockery cabinet above breakfast counter with inside laminate and outside laminate finish.',
        },
        {
          name: 'Upper Pillar Wall Panelling',
          work_type: 'Wood wall paneling',
          size_text: '3.5 ft × 11 ft',
          measure: { unit: 'sq_ft', per_item: 38.5 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Beam/pillar wall-contact backing'] },
          optional: false,
          source_text_en:
            'Plywood wall panelling for upper pillar above breakfast counter with outside laminate finish.',
        },
      ],
    },
    {
      name: 'Pooja',
      recommended: null,
      items: [
        {
          name: 'Pooja Mandir Unit',
          work_type: 'Box type',
          size_text: '6.9 ft × 4 ft',
          measure: { unit: 'sq_ft', per_item: 27.6 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel'] },
          optional: false,
          source_text_en:
            'Box-type Pooja mandir unit with inside laminate and outside laminate finish.',
        },
        {
          name: 'Pooja Entrance Frame & CNC / Glass Double Doors',
          work_type: 'Pooja CNC / glass door paneling',
          size_text: '7.5 ft × 4.5 ft',
          measure: { unit: 'sq_ft', per_item: 33.75 },
          quantity: 1,
          pvc: { eligible: false, parts: [] },
          optional: false,
          source_text_en:
            'Entrance wall panelling and double doors with decorative CNC jali / glass cut-outs and outside laminate finish.',
        },
      ],
    },
    {
      name: 'Hall and Dining',
      recommended: null,
      items: [
        {
          name: 'TV Media Console with Louvers',
          work_type: 'Box type',
          size_text: '9.5 ft × 8 ft',
          measure: { unit: 'sq_ft', per_item: 76 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel'] },
          optional: false,
          source_text_en:
            '16" carcass depth · Box-type TV media console with inside laminate, charcoal louvers, and outside laminate finish.',
        },
        {
          name: 'Main Door Entrance Wall Panelling with Louvers',
          work_type: 'Louvers wall paneling',
          size_text: '3.5 ft × 3.5 ft',
          measure: { unit: 'sq_ft', per_item: 12.25 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing panel'] },
          optional: false,
          source_text_en:
            'Decorative wall panelling with vertical louvers and outside laminate finish above main door.',
        },
        {
          name: 'Additional Soft-Close Wardrobe Drawers (Set of 2)',
          work_type: 'Tandem or SS baskets',
          size_text: '2 drawers with telescopic channels & locks',
          measure: { unit: 'each', per_item: 1 },
          quantity: 2,
          pvc: { eligible: false, parts: [] },
          optional: true,
          source_text_en:
            'Optional add-on: Two additional internal soft-close drawers with heavy-duty telescopic channels.',
        },
        {
          name: 'Shoe Rack & Foyer Sit-Out Console',
          work_type: 'Box type',
          size_text: '3 ft × 4.5 ft',
          measure: { unit: 'sq_ft', per_item: 13.5 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel', 'Floor-contact base'] },
          optional: true,
          source_text_en:
            '14" carcass depth · Optional box-type entrance shoe rack with sit-out ledge, inside laminate, and outside laminate finish.',
        },
      ],
    },
  ],
  owner_requests: [],
  needs_clarification: [],
};

/**
 * 2. Demo Customer Two — Anonymized arithmetic reference (QUOTATION_4f19d65b.pdf)
 *    Date: 10-09-2026 · Exact Printed Total: ₹5,27,445.00
 */
export const KARTHIK_PEERZADIGUDA_DRAFT: QuotationDraftV2 = {
  schema_version: 'quotation-studio.draft.v2',
  output_language: 'en',
  is_demo: false,
  languages: ['te', 'en'],
  customer: {
    name: 'Demo Customer Two',
    site: 'Example Apartment Two, Hyderabad',
    phone: null,
  },
  quote: {
    number: 'UME-2026-0910',
    date: '2026-09-10',
    valid_until: '2026-10-10',
  },
  recommended: {
    grade: 'Base',
    protection: 'Standard',
    finish: 'SF',
    brand_preference: 'Garjan 710',
  },
  rooms: [
    {
      name: 'Master Bedroom',
      recommended: null,
      items: [
        {
          name: 'Frame type wardrobe',
          work_type: 'Frame type',
          size_text: '8.5 ft × 13.5 ft',
          measure: { unit: 'sq_ft', per_item: 114.75 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact perimeter frame'] },
          optional: false,
          source_text_en: 'Frame-type wardrobe 8.5 ft by 13.5 ft (114.75 sq ft).',
        },
        {
          name: 'Locker inside wardrobe',
          work_type: 'Box type',
          size_text: '3 ft × 2 ft',
          measure: { unit: 'sq_ft', per_item: 6 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel'] },
          optional: false,
          source_text_en: 'Box-type locker inside wardrobe 3 ft by 2 ft (6 sq ft).',
        },
        {
          name: 'Dressing table',
          work_type: 'Box type',
          size_text: '6.5 ft × 3 ft',
          measure: { unit: 'sq_ft', per_item: 19.5 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel'] },
          optional: false,
          source_text_en: 'Box-type dressing table 6.5 ft by 3 ft (19.5 sq ft).',
        },
        {
          name: 'Loft frame and shutter (above dressing table)',
          work_type: 'Loft - frame and shutter',
          size_text: '2 ft × 3 ft',
          measure: { unit: 'sq_ft', per_item: 6 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall and slab-contact frame'] },
          optional: false,
          source_text_en: 'Loft frame and shutter above dressing table 2 ft by 3 ft (6 sq ft).',
        },
        {
          name: 'Folding table',
          work_type: 'Folding table',
          size_text: '1.9 ft × 6 ft',
          measure: { unit: 'sq_ft', per_item: 11.4 },
          quantity: 1,
          pvc: { eligible: false, parts: [] },
          optional: false,
          source_text_en: 'Folding table with both sides laminate finish 1.9 ft by 6 ft (11.4 sq ft).',
        },
      ],
    },
    {
      name: 'Children Bedroom',
      recommended: null,
      items: [
        {
          name: 'Frame type wardrobe',
          work_type: 'Frame type',
          size_text: '7 ft × 7.5 ft',
          measure: { unit: 'sq_ft', per_item: 52.5 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact perimeter frame'] },
          optional: false,
          source_text_en: 'Frame-type wardrobe 7 ft by 7.5 ft (52.5 sq ft).',
        },
        {
          name: 'Loft frame and shutter',
          work_type: 'Loft - frame and shutter',
          size_text: '1.5 ft × 10.9 ft',
          measure: { unit: 'sq_ft', per_item: 16.35 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall and slab-contact frame'] },
          optional: false,
          source_text_en: 'Loft frame and shutter 1.5 ft by 10.9 ft (16.35 sq ft).',
        },
        {
          name: 'Wood wall paneling under loft and side wall',
          work_type: 'Wood wall paneling',
          size_text: '9.5 ft × 1.9 ft',
          measure: { unit: 'sq_ft', per_item: 18.05 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing'] },
          optional: false,
          source_text_en: 'Wood wall paneling under loft and side wall 9.5 ft by 1.9 ft (18.05 sq ft).',
        },
        {
          name: 'Wood wall paneling and mirror finish',
          work_type: 'Mirror wall paneling',
          size_text: '6 ft × 4 ft',
          measure: { unit: 'sq_ft', per_item: 24 },
          quantity: 1,
          pvc: { eligible: false, parts: [] },
          optional: false,
          source_text_en: 'Wood wall paneling with mirror finish 6 ft by 4 ft (24 sq ft).',
        },
        {
          name: 'Folding table',
          work_type: 'Folding table',
          size_text: '3 ft × 1.9 ft',
          measure: { unit: 'sq_ft', per_item: 5.7 },
          quantity: 1,
          pvc: { eligible: false, parts: [] },
          optional: false,
          source_text_en: 'Folding table with both sides laminate finish 3 ft by 1.9 ft (5.7 sq ft).',
        },
        {
          name: 'Wall mount bed',
          work_type: 'Wall mount bed',
          size_text: '6.9 ft × 5.3 ft',
          measure: { unit: 'sq_ft', per_item: 36.57 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact back frame'] },
          optional: false,
          source_text_en: 'Wall-mount folding bed 6.9 ft by 5.3 ft (36.57 sq ft).',
        },
      ],
    },
    {
      name: 'Kitchen',
      recommended: null,
      items: [
        {
          name: 'Frame type base cabinet unit',
          work_type: 'Frame type',
          size_text: '3 ft × 16.5 ft',
          measure: { unit: 'sq_ft', per_item: 49.5 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Under-slab wet-zone frame'] },
          optional: false,
          source_text_en: 'Frame-type kitchen base cabinet unit 3 ft by 16.5 ft (49.5 sq ft).',
        },
        {
          name: 'Box type base cabinet unit',
          work_type: 'Box type',
          size_text: '3 ft × 3 ft',
          measure: { unit: 'sq_ft', per_item: 9 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel', 'Bottom panel'] },
          optional: false,
          source_text_en: 'Box-type kitchen base cabinet unit 3 ft by 3 ft (9 sq ft).',
        },
        {
          name: 'Tandem or SS baskets with hardware fitting',
          work_type: 'Tandem or SS baskets',
          size_text: '5 units',
          measure: { unit: 'each', per_item: 1 },
          quantity: 5,
          pvc: { eligible: false, parts: [] },
          optional: false,
          source_text_en: 'Five Tandem or SS baskets with hardware fitting.',
        },
        {
          name: 'Box type wall cabinet unit',
          work_type: 'Box type',
          size_text: '2 ft × 7 ft',
          measure: { unit: 'sq_ft', per_item: 14 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel'] },
          optional: false,
          source_text_en: 'Box-type kitchen wall cabinet unit 2 ft by 7 ft (14 sq ft).',
        },
        {
          name: 'Frame type wall cabinet unit',
          work_type: 'Frame type',
          size_text: '2 ft × 6 ft',
          measure: { unit: 'sq_ft', per_item: 12 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact frame'] },
          optional: false,
          source_text_en: 'Frame-type kitchen wall cabinet unit 2 ft by 6 ft (12 sq ft).',
        },
        {
          name: 'Wood wall paneling under wall cabinet',
          work_type: 'Wood wall paneling (under wall cabinet)',
          size_text: '1 ft × 8 ft',
          measure: { unit: 'sq_ft', per_item: 8 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing'] },
          optional: false,
          source_text_en: 'Wood wall paneling under wall cabinet 1 ft by 8 ft (8 sq ft).',
        },
        {
          name: 'Loft frame and shutter',
          work_type: 'Loft - frame and shutter',
          size_text: '2.3 ft × 17 ft',
          measure: { unit: 'sq_ft', per_item: 39.1 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall and slab-contact frame'] },
          optional: false,
          source_text_en: 'Kitchen loft frame and shutter 2.3 ft by 17 ft (39.1 sq ft).',
        },
        {
          name: 'Wood wall paneling under loft',
          work_type: 'Wood wall paneling',
          size_text: '1.9 ft × 16 ft',
          measure: { unit: 'sq_ft', per_item: 30.4 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing'] },
          optional: false,
          source_text_en: 'Wood wall paneling under kitchen loft 1.9 ft by 16 ft (30.4 sq ft).',
        },
        {
          name: 'Breakfast counter wood wall paneling',
          work_type: 'Wood wall paneling',
          size_text: '3 ft × 5 ft',
          measure: { unit: 'sq_ft', per_item: 15 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing'] },
          optional: false,
          source_text_en: 'Breakfast counter wood wall paneling 3 ft by 5 ft (15 sq ft).',
        },
        {
          name: 'Bar counter unit (above breakfast counter)',
          work_type: 'Box type',
          size_text: '4 ft × 2 ft',
          measure: { unit: 'sq_ft', per_item: 8 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel'] },
          optional: false,
          source_text_en: 'Box-type bar counter unit above breakfast counter 4 ft by 2 ft (8 sq ft).',
        },
      ],
    },
    {
      name: 'Pooja',
      recommended: null,
      items: [
        {
          name: 'Pooja mandir',
          work_type: 'Box type',
          size_text: '6.5 ft × 3.3 ft',
          measure: { unit: 'sq_ft', per_item: 21.45 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel'] },
          optional: false,
          source_text_en: 'Box-type Pooja mandir 6.5 ft by 3.3 ft (21.45 sq ft).',
        },
        {
          name: 'Loft frame and shutter',
          work_type: 'Loft - frame and shutter',
          size_text: '2 ft × 4.5 ft',
          measure: { unit: 'sq_ft', per_item: 9 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact frame'] },
          optional: false,
          source_text_en: 'Pooja loft frame and shutter 2 ft by 4.5 ft (9 sq ft).',
        },
        {
          name: 'Wood wall paneling under frame',
          work_type: 'Wood wall paneling',
          size_text: '1 ft × 4.5 ft',
          measure: { unit: 'sq_ft', per_item: 4.5 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact backing'] },
          optional: false,
          source_text_en: 'Wood wall paneling under Pooja frame 1 ft by 4.5 ft (4.5 sq ft).',
        },
      ],
    },
    {
      name: 'Hall and Dining',
      recommended: null,
      items: [
        {
          name: 'TV unit with outside louvers',
          work_type: 'Box type',
          size_text: '8.5 ft × 6.5 ft',
          measure: { unit: 'sq_ft', per_item: 55.25 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back wall-contact panel'] },
          optional: false,
          source_text_en: 'Box-type TV unit with outside louvers 8.5 ft by 6.5 ft (55.25 sq ft).',
        },
        {
          name: 'Frame type crockery unit',
          work_type: 'Frame type',
          size_text: '8.5 ft × 6 ft',
          measure: { unit: 'sq_ft', per_item: 51 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact frame'] },
          optional: false,
          source_text_en: 'Frame-type crockery unit 8.5 ft by 6 ft (51 sq ft).',
        },
        {
          name: 'Low roof frame and shutter (outside balcony)',
          work_type: 'Low roof - frame and shutter',
          size_text: '2.9 ft × 3 ft',
          measure: { unit: 'sq_ft', per_item: 8.7 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Balcony damp-zone frame'] },
          optional: false,
          source_text_en: 'Low-roof frame and shutter in outside balcony 2.9 ft by 3 ft (8.7 sq ft).',
        },
        {
          name: 'Frame type shoe rack',
          work_type: 'Frame type',
          size_text: '4.9 ft × 2.9 ft',
          measure: { unit: 'sq_ft', per_item: 14.21 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Wall-contact frame'] },
          optional: false,
          source_text_en: 'Frame-type shoe rack 4.9 ft by 2.9 ft (14.21 sq ft).',
        },
        {
          name: 'Box type shoe rack',
          work_type: 'Box type',
          size_text: '2 ft × 6 ft',
          measure: { unit: 'sq_ft', per_item: 12 },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel', 'Floor-contact base'] },
          optional: false,
          source_text_en: 'Box-type shoe rack 2 ft by 6 ft (12 sq ft).',
        },
      ],
    },
  ],
  owner_requests: [],
  needs_clarification: [],
};

/**
 * Custom line overrides for Demo Customer Two historical PDF (`QUOTATION_4f19d65b.pdf`)
 * where Frame type / Loft / Folding table were billed at ₹750/sq.ft, Locker at ₹1,100/sq.ft,
 * Wood wall paneling at ₹450/sq.ft, and Wall mount bed at ₹1,000/sq.ft -> Exact Total ₹5,27,445.00
 */
export const KARTHIK_HISTORICAL_RATE_OVERRIDES: Record<string, Record<string, number>> = {
  '/rooms/0/items/0': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/0/items/1': { 'Base__Standard__SF': 1100, 'Base__Standard__High Gloss': 1100 },
  '/rooms/0/items/3': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/0/items/4': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/1/items/0': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/1/items/1': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/1/items/2': { 'Base__Standard__SF': 450, 'Base__Standard__High Gloss': 450 },
  '/rooms/1/items/4': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/1/items/5': { 'Base__Standard__SF': 1000, 'Base__Standard__High Gloss': 1000 },
  '/rooms/2/items/0': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/2/items/4': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/2/items/5': { 'Base__Standard__SF': 450, 'Base__Standard__High Gloss': 450 },
  '/rooms/2/items/6': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/2/items/7': { 'Base__Standard__SF': 450, 'Base__Standard__High Gloss': 450 },
  '/rooms/2/items/8': { 'Base__Standard__SF': 450, 'Base__Standard__High Gloss': 450 },
  '/rooms/3/items/1': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/3/items/2': { 'Base__Standard__SF': 450, 'Base__Standard__High Gloss': 450 },
  '/rooms/4/items/1': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/4/items/2': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
  '/rooms/4/items/3': { 'Base__Standard__SF': 750, 'Base__Standard__High Gloss': 750 },
};

/**
 * 3. Appendix Practice Example (with unresolved clarifications)
 */
export const APPENDIX_PRACTICE_DRAFT: QuotationDraftV2 = {
  schema_version: 'quotation-studio.draft.v2',
  output_language: 'en',
  is_demo: true,
  languages: ['te', 'hi', 'en'],
  customer: { name: null, site: null, phone: null },
  quote: { number: null, date: null, valid_until: null },
  recommended: {
    grade: 'Normal',
    protection: null,
    finish: 'SF',
    brand_preference: null,
  },
  rooms: [
    {
      name: 'Master bedroom',
      recommended: null,
      items: [
        {
          name: 'Locker',
          work_type: 'Box type',
          size_text: '1.5 ft × 3 ft',
          measure: { unit: null, per_item: null },
          quantity: 1,
          pvc: { eligible: true, parts: ['Back panel'] },
          optional: false,
          source_text_en:
            'One box-type locker, 1.5 ft by 3 ft. Only the back panel touches the wall.',
        },
      ],
    },
  ],
  owner_requests: [],
  needs_clarification: [
    {
      path: '/rooms/0/items/0/measure/unit',
      question: 'Is this locker billed by front-face area or per locker?',
    },
    {
      path: '/recommended/protection',
      question: 'Which protection option do you recommend, Standard or With PVC?',
    },
  ],
};

/**
 * Historical PDF Reconciliation Summary for Phase 0 & Phase 2 Verification
 */
export interface HistoricalPdfAuditRecord {
  id: string;
  title: string;
  pdfAssetPath: string;
  customerName: string;
  date: string;
  site: string;
  packageMapped: string;
  brandsListed: string;
  printedTotalRupees: number;
  computedTotalRupees: number;
  exactMatch: boolean;
  keyRatesExtracted: string[];
  auditNotes: string[];
}

export const HISTORICAL_PDF_AUDITS: HistoricalPdfAuditRecord[] = [
  {
    id: 'vidya-sagar-premium',
    title: 'Demo Customer One — Premium Package (30/25/21 Yrs)',
    pdfAssetPath: '',
    customerName: 'Demo Customer One',
    date: '2026-10-24',
    site: 'Example Apartment One, Hyderabad',
    packageMapped: 'Premium · Standard · High Gloss / SF',
    brandsListed:
      'Flaer Ply (SMART - 30 Yrs), Saburi (Gold - 30 Yrs), Austin (Gold - 25 Yrs), Green Ply (Optima G - 25 Yrs), Century Ply (Bond Shield - 21 Yrs)',
    printedTotalRupees: 732965,
    computedTotalRupees: 732965,
    exactMatch: true,
    keyRatesExtracted: [
      'Box type (Wardrobe, Locker, Study/Dressing table, Kitchen cabinets, Pooja mandir, TV unit): ₹1,250 / sq.ft',
      'Frame type Wardrobe / Loft frame & shutter / Folding table: ₹1,000 / sq.ft',
      'Wood wall paneling (under loft, breakfast counter, pillar): ₹550 / sq.ft',
      'Pooja CNC / glass door paneling: ₹850 / sq.ft',
      'TV unit wood wall paneling with louvers (above main door): ₹650 / sq.ft',
      'Tandem or SS baskets with hardware fitting: 6 pcs × ₹3,600 = ₹21,600',
    ],
    auditNotes: [
      'Reproduces 100% of all 21 line items across 5 rooms to the exact rupee (₹7,32,965.00).',
      'Six lines have .50 paise products (e.g. 40.71 × 1,250 = ₹50,887.50) which pair up cleanly to ₹7,32,965.00.',
      'Extra drawer charge in Note #4 is ₹5,000/- per drawer.',
    ],
  },
  {
    id: 'vidya-sagar-base',
    title: 'Demo Customer One — Base BWP Package',
    pdfAssetPath: '',
    customerName: 'Demo Customer One',
    date: '2026-10-24',
    site: 'Example Apartment One, Hyderabad',
    packageMapped: 'Base · Standard · High Gloss / SF',
    brandsListed: 'Garjan 710, 303 SURAKSHA, Wildwood, or Swadeshi Plywood BWP',
    printedTotalRupees: 546034,
    computedTotalRupees: 546034,
    exactMatch: true,
    keyRatesExtracted: [
      'Box type items: ₹950 / sq.ft',
      'Frame type Wardrobe / Loft frame & shutter / Folding table: ₹700 / sq.ft',
      'Wood wall paneling: ₹400 / sq.ft',
      'Pooja CNC / glass door paneling: ₹700 / sq.ft',
      'TV unit wood wall paneling with louvers (above main door): ₹550 / sq.ft',
      'Tandem or SS baskets with hardware fitting: 6 pcs × ₹3,600 = ₹21,600',
    ],
    auditNotes: [
      'Identical 21-item geometry to the Premium PDF; reproduces ₹5,46,034.00 to the exact rupee.',
      'Establishes the exact ₹300/sq.ft spread between Base (₹950) and Premium (₹1,250) on Box type work.',
    ],
  },
  {
    id: 'karthik-peerzadiguda',
    title: 'Demo Customer Two — Reference Custom BWP 710/303 Quote',
    pdfAssetPath: '',
    customerName: 'Demo Customer Two',
    date: '2026-09-10',
    site: 'Example Apartment Two, Hyderabad',
    packageMapped: 'Base/Custom · Standard · High Gloss / SF',
    brandsListed: 'BWP 710 or 303 Plywood',
    printedTotalRupees: 527445,
    computedTotalRupees: 527445,
    exactMatch: true,
    keyRatesExtracted: [
      'Box type items: ₹950 / sq.ft (Locker inside wardrobe: ₹1,100 / sq.ft)',
      'Frame type / Loft / Low roof / Folding table: ₹750 / sq.ft',
      'Wall mount bed: ₹1,000 / sq.ft',
      'Wood wall paneling: ₹450 / sq.ft',
      'Wood wall paneling with mirror finish: ₹300 / sq.ft',
      'Tandem or SS baskets: 5 pcs × ₹3,600 = ₹18,000',
    ],
    auditNotes: [
      'Reproduces all 26 items across 5 rooms to the exact rupee (₹5,27,445.00).',
      'Note #3 in original PDF has a truncated sentence ("If customer choose other hardware and plywood then the") which our v2 Terms validator automatically repairs.',
      'Extra drawer charge in Note #4 is ₹4,500/- per drawer.',
    ],
  },
  {
    id: 'subhash-warranty-normal',
    title: 'Demo Customer Three — Normal Package (20/15/10 Yrs Warranty)',
    pdfAssetPath: '',
    customerName: 'Demo Customer Three',
    date: '2025-04-29',
    site: 'Example Apartment Three, Hyderabad',
    packageMapped: 'Normal · Standard · High Gloss / SF',
    brandsListed: 'BWR 710 or 303 Plywood (20 / 15 / 10 Years Warranty)',
    printedTotalRupees: 1206619,
    computedTotalRupees: 1206619,
    exactMatch: true,
    keyRatesExtracted: [
      'Box type items: ₹1,000 / sq.ft',
      'Frame type / Loft / Low roof / Folding table: ₹800 / sq.ft',
      'Wood wall paneling: ₹500 / sq.ft (Under wall cabinet: ₹450 / sq.ft)',
      'Pooja CNC / glass door paneling: ₹800 / sq.ft',
      'Tandem or SS baskets: 6 pcs × ₹3,600 = ₹21,600',
      'False ceiling (Saint Gobain): 500 sq.ft @ ₹60/sq.ft = ₹30,000 (listed below carpentry total)',
    ],
    auditNotes: [
      'Establishes the exact Normal Grade rates (₹1,000 Box / ₹800 Frame & Loft / ₹500 Paneling).',
      'All 53 carpentry lines across Master, Children, Guest Bedrooms, Kitchen, Pooja, Hall & Dining, and Main Door Entrance sum to ₹12,06,619.00.',
    ],
  },
  {
    id: 'subhash-pvc',
    title: 'Demo Customer Three — Normal + 6mm PVC Package',
    pdfAssetPath: '',
    customerName: 'Demo Customer Three',
    date: '2025-04-29',
    site: 'Example Apartment Three, Hyderabad',
    packageMapped: 'Normal · With PVC · High Gloss / SF',
    brandsListed: 'BWR 710 or 303 Plywood + 6mm PVC Board Near Wall, Slab and Flooring Area',
    printedTotalRupees: 1424314.5,
    computedTotalRupees: 1424314.5,
    exactMatch: true,
    keyRatesExtracted: [
      'Box type PVC and Plywood: ₹1,075 / sq.ft (+₹75/sq.ft over Normal ₹1,000)',
      'Frame type / Loft PVC and Plywood: ₹875 / sq.ft (+₹75/sq.ft over Normal ₹800)',
      'PVC and Plywood Wood wall paneling: ₹550 / sq.ft (+₹50/sq.ft over Normal ₹500)',
      'Non-eligible items retain non-PVC rates: Folding table ₹700/sq.ft, Pooja CNC doors ₹800/sq.ft',
      'Tandem or SS baskets: 6 pcs × ₹3,550 = ₹21,300',
    ],
    auditNotes: [
      'Proves UME Interiors’ exact PVC pricing rule: +₹75/sq.ft on eligible Box/Frame/Loft units and +₹50/sq.ft on eligible Wood Wall Paneling, using "6mm PVC Board Near Wall, Slab and Flooring Area".',
      'Historical audit note: Guest Bedroom Item #4 (7 × 10 = 70 sq.ft @ ₹1,075) was typed as ₹61,250.00 in the original spreadsheet instead of ₹75,250.00 (a ₹14,000 manual typing variance in the 2025 PDF), which our deterministic engine flags transparently.',
    ],
  },
  {
    id: 'subhash-premium-100-bwp',
    title: 'Demo Customer Three — Premium 100% BWP Package (30/25/20 Yrs)',
    pdfAssetPath: '',
    customerName: 'Demo Customer Three',
    date: '2025-04-29',
    site: 'Example Apartment Three, Hyderabad',
    packageMapped: 'Premium (2025) · Standard · High Gloss / SF',
    brandsListed:
      'BWP 710 – Siam (Club Gold – 30 Yrs) or Austin Gold (Marine Grade – 25 Yrs) or Century Bond (21 Yrs)',
    printedTotalRupees: 1467118,
    computedTotalRupees: 1467118,
    exactMatch: true,
    keyRatesExtracted: [
      'Box type items: ₹1,200 / sq.ft (2025 rate; updated to ₹1,250 / sq.ft in Oct 2026 Demo Customer One quote)',
      'Frame type / Loft: ₹950–₹1,200 / sq.ft',
      'Wood wall paneling: ₹650 / sq.ft',
      'Outside 1mm laminate worth up to Rs.1,600/- and Handles worth up to Rs.300/-',
      'Tandem or SS baskets: 6 pcs × ₹3,650 = ₹21,900',
    ],
    auditNotes: [
      'Historical audit finding: In the 2025 PDF, Children Bedroom Locker (4.35 sq.ft) and Kitchen Breakfast Counter (7.25 sq.ft) had blank rate cells, and Guest Bedroom Loft (29 sq.ft @ ₹950) had ₹0.00 in the amount column.',
      'Our Worker validation gate now blocks any item with null/zero rate or unpriced measure from being published.',
    ],
  },
];

/**
 * Multilingual Dictation Preset Examples (Telugu, Hindi, Roman Telugu, Roman Hindi, Code-Switching)
 */
export interface DictationPreset {
  id: string;
  title: string;
  languages: ('te' | 'hi' | 'en')[];
  badge: string;
  transcript: string;
  correctionTranscript?: string;
  expectedResult: QuotationDraftV2;
}

export const DICTATION_PRESETS: DictationPreset[] = [
  {
    id: 'vidya-sagar-full',
    title: '1. Demo Customer One — Full 5-Room Site Note (Telugu + Roman Telugu + English)',
    languages: ['te', 'en'],
    badge: 'Complete Publishable Job · ₹7,32,965',
    transcript:
      'Customer peru Demo Customer One garu, phone not provided. Site Example Apartment One, Hyderabad. Quote date 24-10-2026, recommended package Premium grade Standard protection High Gloss finish, Flaer Ply SMART preference. Master bedroom lo loft frame and shutter 9.9 ft by 11.9 ft, wardrobe lopala okati box type locker ఒకటిన్నర అడుగులు by 3 ft back panel wall touch, box type dressing table 7 ft by 2 ft, folding table 2 ft by 3 ft. Children bedroom lo frame type wardrobe 6.9 by 8.5 ft, loft 3 by 11.9 ft, box type study table 7 by 4 ft. Kitchen lo box type base cabinet 2.9 by 10 ft, 6 tandem baskets, wall cabinet 2 by 10 ft, opposite kitchen cabinet 6.9 by 5.9 ft, loft 3 by 21 ft, wood wall paneling under loft 1.9 by 24 ft, wash area box wardrobe 2.5 by 2.5 ft, breakfast counter 2.5 by 6.3 ft, breakfast counter paneling 2.5 by 7.3 ft, mini crockery unit 4 by 2 ft, upper pillar paneling 3.5 by 11 ft. Pooja room lo box type pooja mandir 6.9 by 4 ft, pooja CNC glass door paneling 7.5 by 4.5 ft. Hall and Dining lo box type TV unit with louvers 9.5 by 8 ft, main door paina TV unit louver paneling 3.5 by 3.5 ft. All sq ft front face billing confirmed.',
    expectedResult: VIDYA_SAGAR_REDDY_DRAFT,
  },
  {
    id: 'acceptance-lockers-mixed',
    title: '2. Acceptance Test — Mixed Telugu/Hindi Lockers + Spoken Correction + "five-six" Ambiguity',
    languages: ['te', 'hi', 'en'],
    badge: 'Acceptance Test · Correction & Clarification Gate',
    transcript:
      'Master bedroom lo రెండు లాకర్లు (दो लॉकर) box type, डेढ़ फुट by 3 ft each, front-face area billing confirmed, only back panels touch the wall. Correction: make the locker count three instead of two. Also add one study table in Master bedroom measured as five-six.',
    expectedResult: {
      schema_version: 'quotation-studio.draft.v2',
      output_language: 'en',
      is_demo: true,
      languages: ['te', 'hi', 'en'],
      customer: { name: null, site: null, phone: null },
      quote: { number: null, date: null, valid_until: null },
      recommended: {
        grade: 'Normal',
        protection: 'With PVC',
        finish: 'SF',
        brand_preference: null,
      },
      rooms: [
        {
          name: 'Master Bedroom',
          recommended: null,
          items: [
            {
              name: 'Locker',
              work_type: 'Box type',
              size_text: '1.5 ft × 3 ft',
              measure: { unit: 'sq_ft', per_item: 4.5 },
              quantity: 3,
              pvc: { eligible: true, parts: ['Back panel'] },
              optional: false,
              source_text_en:
                'Three box-type lockers (updated from two), 1.5 ft by 3 ft each (4.5 sq ft per locker, 13.5 sq ft total) billed by confirmed front-face area. Only the back panels touch the wall.',
            },
            {
              name: 'Study table',
              work_type: 'Box type',
              size_text: 'five-six',
              measure: { unit: null, per_item: null },
              quantity: 1,
              pvc: { eligible: null, parts: [] },
              optional: false,
              source_text_en:
                'One box-type study table with stated size five-six requiring measurement clarification.',
            },
          ],
        },
      ],
      owner_requests: [],
      needs_clarification: [
        {
          path: '/rooms/0/items/1/size_text',
          question:
            'Does "five-six" for the study table mean 5 ft × 6 ft (two dimensions) or 5 ft 6 in (5.5 ft) in one dimension?',
        },
        {
          path: '/rooms/0/items/1/pvc/eligible',
          question: 'Which panels of the study table, if any, touch a wall or damp area for PVC eligibility?',
        },
        {
          path: '/customer/name',
          question: 'What is the confirmed English spelling of the customer name and site address?',
        },
      ],
    },
  },
  {
    id: 'owner-override-request',
    title: '3. Hindi + Roman Telugu Kitchen with Spoken Discount & Special Brand Request',
    languages: ['hi', 'te', 'en'],
    badge: 'Owner Request Gate · Private Review',
    transcript:
      'Customer Demo Customer Four, Example Apartment Four, Hyderabad. Recommend Premium With PVC High Gloss. Kitchen mein ek box type base cabinet 3 ft by 12 ft (36 sq ft face area), wet area back panel and bottom panel PVC eligible. Customer Greenply exact supply mang raha hai aur ₹15,000 festival discount bol raha hai, plus bol raha hai ₹50,000 cash de diya.',
    expectedResult: {
      schema_version: 'quotation-studio.draft.v2',
      output_language: 'en',
      is_demo: false,
      languages: ['hi', 'te', 'en'],
      customer: {
        name: 'Demo Customer Four',
        site: 'Example Apartment Four, Hyderabad',
        phone: null,
      },
      quote: {
        number: 'UME-2026-1102',
        date: '2026-11-01',
        valid_until: '2026-12-01',
      },
      recommended: {
        grade: 'Premium',
        protection: 'With PVC',
        finish: 'High Gloss',
        brand_preference: 'Green Ply (Optima G)',
      },
      rooms: [
        {
          name: 'Kitchen',
          recommended: null,
          items: [
            {
              name: 'Base cabinet unit',
              work_type: 'Box type',
              size_text: '3 ft × 12 ft',
              measure: { unit: 'sq_ft', per_item: 36 },
              quantity: 1,
              pvc: {
                eligible: true,
                parts: ['Wet-area back panel', 'Bottom floor-contact panel'],
              },
              optional: false,
              source_text_en:
                'One box-type kitchen base cabinet unit, 3 ft by 12 ft (36 sq ft) billed by confirmed front-face area, with wet-area back panel and bottom panel eligible for PVC.',
            },
          ],
        },
      ],
      owner_requests: [
        {
          path: '/recommended/brand_preference',
          text: 'Customer requested guaranteed supply of Green Ply (Optima G) rather than dealer equivalence. Apply only after the owner reviews and confirms dealer stock in writing.',
        },
        {
          path: '',
          text: 'Customer requested a ₹15,000 festival discount on the whole quotation. Apply the requested change only after the owner reviews it.',
        },
        {
          path: '',
          text: 'Spoken claim that ₹50,000 booking was paid in cash. Do not credit the ledger until the owner verifies receipt.',
        },
      ],
      needs_clarification: [],
    },
  },
];

/**
 * Upgraded Copy-Ready Quotation_Assistant_Instructions.txt tailored to UME Interiors (umeinteriors.com)
 */
export const UPGRADED_ASSISTANT_INSTRUCTIONS = `You are Quotation Studio, the private dictation assistant for UME Interiors (Umamaheshwara Enterprises Interior Designers — umeinteriors.com, Chengicherla, Hyderabad, Proprietor: V. Subhash).
I speak or paste residential carpentry site notes in Telugu, Hindi, English, Roman Telugu, Roman Hindi, or any code-switched mix. Turn them into ONE bare, valid UTF-8 English-only JSON object matching schema "quotation-studio.draft.v2".

1. STRICT ENGLISH-ONLY OUTPUT CONTRACT
- Output ONLY the raw JSON object. Never wrap in Markdown code fences (\`\`\`json), headings, commentary, or trailing commas.
- Write every JSON key and every human-readable value in natural English: room names, item names, work_type, size_text, pvc.parts, source_text_en, owner_requests, and needs_clarification questions.
- Translate Telugu and Hindi meaning—including Romanised words such as "rendu lockers" (two lockers, quantity 2), "okatinnara adugulu" / "dedh foot" (1.5 ft), "almara" (wardrobe), "vantillu" / "rasoi" (Kitchen), "devudi gadi" (Pooja).
- Never echo native-script or Romanised Telugu/Hindi phrases inside source_text_en or questions.
- output_language is always "en". Record detected input languages in languages using only ["te", "hi", "en"].
- Preserve confirmed Latin-script spellings of customer names, apartment/colony names, and brands. If a proper name's English spelling is uncertain, set that field to null and ask in needs_clarification.

2. UME INTERIORS APPROVED GLOSSARY & CATALOGUE MAPPING
- Grades: "Base", "Normal", "Premium"
  * Base brands: "Garjan 710", "303 Suraksha", "Wildwood BWP", "Swadeshi Plywood BWP"
  * Normal brands: "BWR 710 Marine Core", "303 Commercial Plus", "Archid / Duroply 303" (20/15/10 Years Warranty)
  * Premium brands: "Flaer Ply (SMART)", "Saburi (Gold)", "Siam (Club Gold)", "Austin (Gold)", "Green Ply (Optima G)", "Century Ply (Bond Shield)" (30/25/21 Years Warranty with Certificate)
- Protection: "Standard" or "With PVC" (6mm PVC Board Near Wall, Slab and Flooring Area)
- Finish: "High Gloss" or "SF" (keep "SF" unless the owner supplies a full expansion)
- Approved Work Types & Default Units:
  * "Box type" (unit: "sq_ft") — Full carcass wardrobes, lockers, dressing tables, study tables, base/wall/tall kitchen cabinets, wash area cabinets, breakfast counters, crockery units, Pooja mandir, TV units, shoe racks.
  * "Frame type" (unit: "sq_ft") — Perimeter frame and shutter wardrobes, crockery units, base/wall cabinets, shoe racks.
  * "Loft - frame and shutter" (unit: "sq_ft") — Overhead loft framing and shutters.
  * "Low roof - frame and shutter" (unit: "sq_ft") — Sunken slab / balcony low-roof framing and shutters.
  * "Folding table" (unit: "sq_ft") — Wall-mounted collapsible table with both sides laminate finish (pvc.eligible: false).
  * "Wood wall paneling" (unit: "sq_ft") — Paneling under loft, around pillars, main door entrance jambs, or breakfast counter.
  * "Wood wall paneling (under wall cabinet)" (unit: "sq_ft") — Kitchen backsplash/underside paneling.
  * "Louvers wall paneling" (unit: "sq_ft") — Fluted louvers with laminate finish (TV unit backdrop / above main door).
  * "Pooja CNC / glass door paneling" (unit: "sq_ft") — Pooja room doors with CNC/glass cut-outs (pvc.eligible: false).
  * "Wall mount bed" (unit: "sq_ft") — Folding wall-mounted bed.
  * "Mirror wall paneling" (unit: "sq_ft") — Plywood backing with mirror finish (pvc.eligible: false).
  * "Tandem or SS baskets" (unit: "each", per_item: 1, quantity: count, pvc.eligible: false).
  * "False ceiling (Saint Gobain)" (unit: "sq_ft").

3. MEASUREMENT & PVC ELIGIBILITY RULES
- Keep one line per distinct room, item, and work_type.
- 5 ft 6 in = 5.5 ft. Note that in UME Interiors site measurements written as decimal feet on rate sheets (e.g. "6.9 × 8.5 = 58.65 sq ft" or "9.9 × 11.9 = 117.81 sq ft"), preserve the exact decimal foot factors when stated.
- If a spoken phrase like "five-six" could mean either 5 ft × 6 ft or 5 ft 6 in, keep size_text as "five-six", set measure.unit and measure.per_item to null, and ask in needs_clarification.
- Two dimensions alone do not prove front-face area billing unless confirmed by the owner's dictation or standard UME room scope. For count-based items ("each"), set measure.per_item = 1 and quantity = piece count. Never multiply by quantity twice.
- PVC eligibility (pvc.eligible) and package protection ("With PVC") are separate facts. List only confirmed wall-contact, ceiling-slab contact, or wet-area parts in pvc.parts (e.g. ["Back panel", "Bottom floor-contact panel"]).

4. OWNER REQUESTS, COMMANDS & HANDOFF
- Record any spoken special rate, discount, exact brand guarantee, exclusion, or unverified payment claim inside owner_requests as {"path": "/...", "text": "..."} in English. Imported requests never alter catalogue prices or mark a payment paid until owner review in Studio.
- Commands:
  * "Studio JSON" -> Return only the latest complete v2 JSON object.
  * "Review" -> Give a concise private English summary of rooms, items, and open questions.
  * Correction -> Update only the targeted item, remove resolved clarifications, and emit the full updated v2 JSON.
  * "New quotation" -> Reset all state and start a clean v2 job.
  * "Ratecard JSON" -> When the owner dictates or pastes new work elements/rates to add to the rate card (e.g. Aluminum profile glass shutter, Acrylic 1.5mm box cabinet, CNC jali partition, Curtain pelmet), return ONE bare English-only JSON object matching schema "quotation-studio.ratecard.v2":
{
  "schema_version": "quotation-studio.ratecard.v2",
  "output_language": "en",
  "workTypes": {
    "Aluminum profile glass shutter": {
      "id": "Aluminum profile glass shutter",
      "label": "Aluminum profile glass shutter",
      "unit": "sq_ft",
      "plainEnglishDefinition": "Slim anodised aluminum profile frame fitted with 5mm tinted, frosted, or fluted glass shutters and soft-close hinges.",
      "pvcDefaultEligible": false,
      "pvcDefaultParts": [],
      "rates": {
        "Base": { "Standard": 1350, "With PVC": 1350 },
        "Normal": { "Standard": 1450, "With PVC": 1450 },
        "Premium": { "Standard": 1600, "With PVC": 1600 }
      },
      "highGlossPremiumPerUnit": 0
    }
  }
}
  * "Publish" -> Emit the verified v2 JSON and instruct the owner to click Paste/Upload JSON -> Review -> Publish in UME Interiors Studio (umeinteriors.com/studio).`;

