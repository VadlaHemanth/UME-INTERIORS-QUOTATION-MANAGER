import { FinishOption, PlywoodGrade, ProtectionOption } from './schema';

export interface WorkTypeDefinition {
  id: string;
  label: string;
  unit: 'sq_ft' | 'running_ft' | 'each' | 'lumpsum';
  plainEnglishDefinition: string;
  pvcDefaultEligible: boolean;
  pvcDefaultParts: string[];
  rates: {
    Base: { Standard: number; 'With PVC': number };
    Normal: { Standard: number; 'With PVC': number };
    Premium: { Standard: number; 'With PVC': number };
  };
  highGlossPremiumPerUnit: number; // 0 when High Gloss & SF share the Rs.1500/sheet laminate rate as in historical PDFs
}

export interface GradeInfo {
  grade: PlywoodGrade;
  displayLabel: 'Standard' | 'Normal' | 'Premium';
  tagline: string;
  warrantyBanner: string;
  termiteProofBadge: string;
  pvcRecommendationNote: string;
  plainEnglishSummary: string;
  outerLaminateAllowance: string;
  handleAllowance: string;
  approvedBrands: {
    name: string;
    spec: string;
    warrantyYears: number;
    boardToneHex: string;
    grainAccentHex: string;
  }[];
}

export interface StandardDepthRule {
  id: string;
  categoryLabel: string;
  depthInches: number;
  typicalLocation: string;
  constructionNote: string;
}

/**
 * Official UME Interiors Standard Carcass Depth Schedule (All measurements in Inches)
 */
export const STANDARD_DEPTH_SCHEDULE_INCHES: StandardDepthRule[] = [
  {
    id: 'bedroom-box',
    categoryLabel: 'Bedroom Wardrobe (Box Carcass)',
    depthInches: 21,
    typicalLocation: 'Master, Children & Guest Bedrooms',
    constructionNote: 'Full 21" internal hanger & shelf carcass depth',
  },
  {
    id: 'kitchen-base',
    categoryLabel: 'Kitchen Base Unit (Under Counter)',
    depthInches: 21,
    typicalLocation: 'Modular Kitchen Lower Carcass',
    constructionNote: '21" modular carcass depth for tandem & SS pull-out baskets',
  },
  {
    id: 'kitchen-overhead',
    categoryLabel: 'Kitchen Overhead Wall Unit',
    depthInches: 12,
    typicalLocation: 'Modular Kitchen Eye-Level Storage',
    constructionNote: '12" ergonomic overhead depth above countertop',
  },
  {
    id: 'crockery-base',
    categoryLabel: 'Crockery Base Unit (Lower Console)',
    depthInches: 18,
    typicalLocation: 'Dining & Breakfast Counter Zone',
    constructionNote: '18" lower storage carcass for dinnerware & appliances',
  },
  {
    id: 'crockery-overhead',
    categoryLabel: 'Crockery Overhead Display Unit',
    depthInches: 12,
    typicalLocation: 'Dining & Breakfast Counter Upper Unit',
    constructionNote: '12" upper display cabinet for glassware & crockery',
  },
  {
    id: 'tv-base',
    categoryLabel: 'TV Base Console Unit',
    depthInches: 16,
    typicalLocation: 'Hall / Living Room Media Console',
    constructionNote: '16" low-height media drawer & console carcass',
  },
  {
    id: 'tv-overhead',
    categoryLabel: 'TV Overhead / Floating Wall Unit',
    depthInches: 12,
    typicalLocation: 'Hall / Living Room Media Wall',
    constructionNote: '12" upper display shelf / bridge cabinet',
  },
  {
    id: 'study-table',
    categoryLabel: 'Study Table Workstation',
    depthInches: 20,
    typicalLocation: 'Children & Master Bedroom Study Zone',
    constructionNote: '20" ergonomic desktop depth for laptop & books',
  },
  {
    id: 'folding-table',
    categoryLabel: 'Wall-Mounted Folding Table',
    depthInches: 18,
    typicalLocation: 'Compact Bedroom / Multi-Use Study Wall',
    constructionNote: '18" collapsible leaf with heavy-duty folding brackets',
  },
  {
    id: 'book-shelf',
    categoryLabel: 'Book Shelf / Overhead Study Unit',
    depthInches: 12,
    typicalLocation: 'Above Study Table / Living Room Niche',
    constructionNote: '12" open or shuttered book storage depth',
  },
  {
    id: 'wash-area',
    categoryLabel: 'Wash Area / Utility Storage Unit',
    depthInches: 12,
    typicalLocation: 'Utility Balcony & Wash Area',
    constructionNote: '12" utility & detergent storage cabinet',
  },
  {
    id: 'shoe-rack',
    categoryLabel: 'Shoe Rack / Foyer Console Unit',
    depthInches: 14,
    typicalLocation: 'Main Entrance Foyer',
    constructionNote: '14" ventilated footwear storage carcass',
  },
];

/**
 * Maps internal schema key ('Base' | 'Normal' | 'Premium') to Customer Display Package Name ('Standard' | 'Normal' | 'Premium')
 */
export function getPackageDisplayName(grade: PlywoodGrade): 'Standard' | 'Normal' | 'Premium' {
  if (grade === 'Base') return 'Standard';
  if (grade === 'Normal') return 'Normal';
  return 'Premium';
}

/**
 * Resolves the standard carcass depth in inches (21", 20", 18", 16", 14", 12") for any item based on UME Interiors' depth schedule.
 * Returns null for flat wall panelling, lofts (frame-only closures), or hardware fittings.
 */
export function resolveStandardDepthInches(
  itemName: string,
  workType: string,
  roomName = ''
): number | null {
  const n = (itemName || '').toLowerCase();
  const wt = (workType || '').toLowerCase();
  const r = (roomName || '').toLowerCase();

  // Flat wall paneling, louvers, CNC doors, lofts, false ceiling, or hardware baskets don't have a box depth schedule
  if (
    wt.includes('paneling') ||
    wt.includes('louver') ||
    wt.includes('cnc') ||
    wt.includes('loft') ||
    wt.includes('low roof') ||
    wt.includes('basket') ||
    wt.includes('ceiling') ||
    n.includes('loft') ||
    n.includes('paneling') ||
    n.includes('louver') ||
    n.includes('basket') ||
    n.includes('tandem')
  ) {
    return null;
  }

  if (n.includes('folding table') || wt.includes('folding table')) return 18;
  if (n.includes('study table') || n.includes('study unit') || n.includes('workstation')) return 20;
  if (n.includes('book shelf') || n.includes('bookshelf') || n.includes('book unit')) return 12;
  if (n.includes('shoe rack') || n.includes('shoe unit') || n.includes('foyer')) return 14;
  if (n.includes('wash area') || n.includes('utility') || r.includes('wash')) return 12;

  if (n.includes('crockery')) {
    if (
      n.includes('overhead') ||
      n.includes('wall') ||
      n.includes('upper') ||
      n.includes('mini crockery') ||
      n.includes('above')
    ) {
      return 12;
    }
    return 18;
  }

  if (n.includes('tv') || n.includes('media')) {
    if (n.includes('overhead') || n.includes('wall') || n.includes('upper')) {
      return 12;
    }
    return 16;
  }

  if (r.includes('kitchen') || n.includes('kitchen')) {
    if (n.includes('wall') || n.includes('overhead') || n.includes('upper')) {
      return 12;
    }
    if (n.includes('base') || n.includes('cabinet') || n.includes('counter') || n.includes('tall')) {
      return 21;
    }
  }

  if (
    n.includes('wardrobe') ||
    n.includes('bedroom box') ||
    n.includes('locker') ||
    n.includes('dressing')
  ) {
    if (wt.includes('box')) return 21;
  }

  return null;
}

/**
 * Converts informal carpentry labels into clean, unambiguous market-standard titles
 * without redundant brackets or parenthetical clutter.
 */
export function standardizeCompetitorItemName(
  rawName: string,
  workType: string,
  roomName = ''
): string {
  const trimmed = (rawName || '').trim();
  const lower = trimmed.toLowerCase();
  const wt = (workType || '').toLowerCase();

  if (lower === 'base cabinet unit' || lower === 'base cabinet') {
    return /kitchen/i.test(roomName) ? 'Kitchen Base Cabinet' : 'Base Cabinet';
  }
  if (lower === 'wall cabinet unit' || lower === 'wall cabinet') {
    return /kitchen/i.test(roomName) ? 'Kitchen Overhead Wall Cabinet' : 'Wall Cabinet';
  }
  if (lower.includes('kitchen cabinet unit (opposite to base cabinet)')) {
    return 'Cabinet Opposite Kitchen Base Cabinets';
  }
  if (lower === 'loft frame and shutter' || lower === 'loft') {
    return 'Loft Frame and Shutter';
  }
  if (lower === 'wardrobe' && wt.includes('box')) {
    return 'Modular Wardrobe';
  }
  if (lower === 'wardrobe' && wt.includes('frame')) {
    return 'Wardrobe Frame and Shutter';
  }
  if (lower === 'frame type wardrobe') {
    return 'Wardrobe Frame and Shutter';
  }
  if (lower === 'locker inside wardrobe') {
    return 'Locker Inside Wardrobe';
  }
  if (lower === 'dressing table') {
    return 'Dressing Table';
  }
  if (lower === 'folding table' || lower === 'wall-mounted folding table') {
    return 'Wall-Mounted Folding Table';
  }
  if (lower === 'study table') {
    return 'Study Table Workstation';
  }
  if (lower === 'wash area wardrobe') {
    return 'Wash Area Utility Cabinet';
  }
  if (lower === 'mini crockery unit (above breakfast counter)') {
    return 'Crockery Overhead Display Unit';
  }
  if (lower === 'breakfast counter') {
    return 'Breakfast Counter Console';
  }
  if (lower === 'tv unit' || lower === 'tv unit with outside louvers') {
    return lower.includes('louver') ? 'TV Media Console with Louvers' : 'TV Media Console';
  }
  if (lower === 'tandem or ss baskets with hardware fitting' || lower === 'tandem or ss baskets') {
    return 'Tandem Drawers or Stainless-Steel Baskets';
  }
  if (lower === 'pooja mandir' || (lower.includes('room') && lower.includes('pooja'))) {
    return 'Pooja Mandir Unit';
  }
  if (lower === 'pooja doors and glass or cnc doors with wall paneling') {
    return 'Pooja Entrance with CNC or Glass Doors and Wall Panelling';
  }
  if (lower === 'wood wall paneling under loft') {
    return 'Wall Panelling Under Loft';
  }
  if (lower === 'wood wall paneling (breakfast counter)') {
    return 'Breakfast Counter Wall Panelling';
  }
  if (lower === 'wood wall paneling for upper pillar (above breakfast counter)') {
    return 'Upper Pillar Wall Panelling';
  }
  if (lower === 'tv unit wood wall paneling with louvers (above main door)') {
    return 'Main Door Entrance Wall Panelling with Louvers';
  }
  return trimmed;
}

/**
 * Produces a clean, non-repetitive item specification sub-line:
 * - Strips redundant trailing dimensions (since Dimensions has its own column)
 * - Replaces "High Gloss or SF laminate finish" with clean "outside laminate finish"
 * - Preserves confirmed specifications without inferring depth, hardware or materials
 */
export function formatCleanItemDescription(
  rawSourceText: string,
  itemName: string,
  workType: string,
  roomName = ''
): string {
  const raw = (rawSourceText || '').trim();

  let cleaned = raw
    // Remove trailing ", 9.9 ft by 11.9 ft (117.81 sq ft)." or similar dimension suffixes
    .replace(/,?\s*\d+(?:\.\d+)?\s*ft\s*(?:by|×|x)\s*\d+(?:\.\d+)?\s*ft\s*\([^)]*sq\s*ft\)\.?\s*$/i, '')
    .replace(/\s+\d+(?:\.\d+)?\s*ft\s*(?:by|×|x)\s*\d+(?:\.\d+)?\s*ft\s*\([^)]*sq\s*ft\)\.?\s*$/i, '')
    // Replace "High Gloss or SF laminate finish" / "SF Matte or High-Gloss laminate finish" with "outside laminate finish"
    .replace(/outside\s+(?:1\.?0?\s*mm\s+)?(?:High[-\s]*Gloss\s+or\s+SF|SF\s+(?:Matte\s+)?or\s+High[-\s]*Gloss)\s+laminate\s+finish/gi, 'outside laminate finish')
    .replace(/both\s+sides\s+(?:1\.?0?\s*mm\s+)?(?:High[-\s]*Gloss\s+or\s+SF|SF\s+(?:Matte\s+)?or\s+High[-\s]*Gloss)\s+laminate\s+finish/gi, 'both sides laminate finish')
    .replace(/High[-\s]*Gloss\s+or\s+SF\s+laminate\s+finish/gi, 'outside laminate finish')
    .trim();

  if (cleaned && !cleaned.endsWith('.')) {
    cleaned += '.';
  }

  return cleaned || 'See the agreed item specification.';
}

export interface StudioCatalogue {
  version: string;
  company: {
    brandName: string;
    legalName: string;
    subtitle: string;
    domain: string;
    proprietor: string;
    phone: string;
    whatsapp: string;
    address: string;
    bank: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      ifsc: string;
      branch: string;
      upiId: string;
      upiLimitRupees: number;
    };
  };
  highGlossSheetUpgradeDelta: number; // 0 so SF Suede Matte and High-Gloss 1.0mm external laminate share the exact same price
  grades: Record<PlywoodGrade, GradeInfo>;
  pvcSpec: {
    boardSpec: string;
    whereUsedSummary: string;
    honestBenefit: string;
    approvedPvcBrands: string[];
  };
  commonMaterials: string[];
  workTypes: Record<string, WorkTypeDefinition>;
  notesAndExclusions: string[];
  termsAndConditions: {
    id: number;
    title: string;
    clause: string;
    source: 'Supplied PDF' | 'Owner-Approved Hyderabad Protection';
  }[];
}

export const DEFAULT_UME_CATALOGUE: StudioCatalogue = {
  version: 'ume-catalogue-2026.11.v6',
  company: {
    brandName: 'UMAMAHESHWARA INTERIORS',
    legalName: 'Umamaheshwara Enterprises',
    subtitle: 'Residential and Commercial Interior Designers',
    domain: 'umeinteriors.com',
    proprietor: 'V. SUBHASH',
    phone: '+91 9491661555',
    whatsapp: '919491661555',
    address: '# 2-84/3/152, Street No: 1, Kamala Nagar, Chengicherla, Hyderabad, 500092',
    bank: {
      bankName: 'STATE BANK OF INDIA',
      accountName: 'UMAMAHESHWARA ENTERPRISES / V. SUBHASH',
      accountNumber: '35976768268',
      ifsc: 'SBIN0065453',
      branch: 'CHENGICHERLA, HYDERABAD-500092',
      upiId: '9177389543@oksbi',
      upiLimitRupees: 100000,
    },
  },
  highGlossSheetUpgradeDelta: 0,
  grades: {
    Base: {
      grade: 'Base',
      displayLabel: 'Standard',
      tagline: 'BWP 710 & 303 Grade Plywood with Laminate Finish',
      warrantyBanner: '1.0 mm external laminate and standard hardware included',
      termiteProofBadge: 'BWP 710 & Commercial 303 Grade Plywood',
      pvcRecommendationNote:
        'Optional 6 mm PVC board at the specified wall, slab and floor contact areas. The applicable item rate is shown in the quotation.',
      plainEnglishSummary:
        'Plywood furniture with 0.8 mm inside liner laminate and 1.0 mm outside decorative laminate. Approved brand pool: Garjan 710, 303 Suraksha, Wildwood, or Swadeshi Plywood BWP.',
      outerLaminateAllowance:
        '1.0 mm External Decorative Laminate — SF Matte or High-Gloss (Same Price, worth up to ₹1,500/sheet)',
      handleAllowance: 'Handles worth up to ₹200 each',
      approvedBrands: [
        {
          name: 'Garjan 710',
          spec: 'BWP 710 Grade Plywood (As per selected product)',
          warrantyYears: 0,
          boardToneHex: '#C89D7C',
          grainAccentHex: '#8C5A3C',
        },
        {
          name: '303 Suraksha',
          spec: '303 Commercial Grade Plywood (As per selected product)',
          warrantyYears: 0,
          boardToneHex: '#D1A986',
          grainAccentHex: '#9A6B49',
        },
        {
          name: 'Wildwood BWP',
          spec: 'BWP Grade Plywood (As per selected product)',
          warrantyYears: 0,
          boardToneHex: '#BE916E',
          grainAccentHex: '#7D4E32',
        },
        {
          name: 'Swadeshi Plywood BWP',
          spec: 'BWP Grade Plywood (As per selected product)',
          warrantyYears: 0,
          boardToneHex: '#C59B76',
          grainAccentHex: '#88583A',
        },
      ],
    },
    Normal: {
      grade: 'Normal',
      displayLabel: 'Normal',
      tagline: 'BWR 710 / 303 Grade Plywood — 20 / 15 / 10 Yrs Brand Warranty',
      warrantyBanner: 'Manufacturer warranty: 20, 15 or 10 years, depending on the selected product',
      termiteProofBadge: 'BWR 710 & 303 Grade Plywood',
      pvcRecommendationNote:
        'Optional 6 mm PVC board at the specified wall, slab and floor contact areas. The applicable item rate is shown in the quotation.',
      plainEnglishSummary:
        'BWR 710 and 303 grade plywood with 20 / 15 / 10 years manufacturer warranty (governed by the selected brand certificate and invoice), 0.8 mm inside liner laminate, and 1.0 mm outside laminate finish.',
      outerLaminateAllowance:
        '1.0 mm External Decorative Laminate — SF Matte or High-Gloss (Same Price, worth up to ₹1,500/sheet)',
      handleAllowance: 'Handles worth up to ₹200 each',
      approvedBrands: [
        {
          name: 'BWR 710 Grade (20 Yrs)',
          spec: 'BWR 710 Grade Plywood (20 Years Manufacturer Warranty)',
          warrantyYears: 20,
          boardToneHex: '#B8865F',
          grainAccentHex: '#734526',
        },
        {
          name: 'BWR / 303 Grade (15 Yrs)',
          spec: 'BWR / 303 Grade Plywood (15 Years Manufacturer Warranty)',
          warrantyYears: 15,
          boardToneHex: '#C4956E',
          grainAccentHex: '#7E5030',
        },
        {
          name: '303 Grade (10 Yrs)',
          spec: '303 Grade Plywood (10 Years Manufacturer Warranty)',
          warrantyYears: 10,
          boardToneHex: '#B07D56',
          grainAccentHex: '#6A3D1F',
        },
      ],
    },
    Premium: {
      grade: 'Premium',
      displayLabel: 'Premium',
      tagline: 'BWP 710 Marine Grade Plywood — 30 / 25 / 21 Yrs Brand Warranty',
      warrantyBanner: 'Manufacturer warranty: 30, 25 or 21 years, depending on the selected product',
      termiteProofBadge: 'BWP 710 Marine Grade Plywood',
      pvcRecommendationNote:
        'Optional 6 mm PVC board at the specified wall, slab and floor contact areas. The applicable item rate is shown in the quotation.',
      plainEnglishSummary:
        'BWP 710 marine-grade plywood across listed units with 30 / 25 / 21 years manufacturer warranty (governed by the selected product certificate and invoice), 0.8 mm inside liner laminate, and 1.0 mm outside laminate finish.',
      outerLaminateAllowance:
        '1.0 mm External Decorative Laminate — SF Matte or High-Gloss (Same Price, worth up to ₹1,500–₹1,600/sheet)',
      handleAllowance: 'Handles worth up to ₹200–₹300 each',
      approvedBrands: [
        {
          name: 'Flaer Ply (SMART)',
          spec: 'SMART Series BWP 710 Grade — 30 Yrs Manufacturer Warranty',
          warrantyYears: 30,
          boardToneHex: '#9E6843',
          grainAccentHex: '#593118',
        },
        {
          name: 'Saburi (Gold)',
          spec: 'Gold Club BWP 710 Grade — 30 Yrs Manufacturer Warranty',
          warrantyYears: 30,
          boardToneHex: '#A6704B',
          grainAccentHex: '#61371C',
        },
        {
          name: 'Siam (Club Gold)',
          spec: 'Club Gold BWP 710 Grade — 30 Yrs Manufacturer Warranty',
          warrantyYears: 30,
          boardToneHex: '#96613D',
          grainAccentHex: '#522C14',
        },
        {
          name: 'Austin (Gold)',
          spec: 'Marine Grade Gold BWP 710 — 25 Yrs Manufacturer Warranty',
          warrantyYears: 25,
          boardToneHex: '#AD7852',
          grainAccentHex: '#683C20',
        },
        {
          name: 'Green Ply (Optima G)',
          spec: 'Optima G BWP 710 Grade — 25 Yrs Manufacturer Warranty',
          warrantyYears: 25,
          boardToneHex: '#8E5B38',
          grainAccentHex: '#4C2812',
        },
        {
          name: 'Century Ply (Bond Shield)',
          spec: 'Bond Shield BWP 710 Grade — 21 Yrs Manufacturer Warranty',
          warrantyYears: 21,
          boardToneHex: '#9B6540',
          grainAccentHex: '#572F17',
        },
      ],
    },
  },
  pvcSpec: {
    boardSpec: 'Optional 6mm PVC Board at Wall, Slab & Floor Contact Areas',
    whereUsedSummary:
      'Plywood furniture with 6 mm PVC board at the wall, slab, or floor contact areas specified in the scope (+₹75/sq.ft on eligible box/frame/loft units; +₹50/sq.ft on eligible wall panelling). This is not an all-PVC furniture package.',
    honestBenefit:
      'Optional protective upgrade for wall-touching back panels, loft perimeter frames, and wet-zone base areas where wall dampness is a concern.',
    approvedPvcBrands: ['6mm High-Density PVC Board (Approved Equivalent)'],
  },
  commonMaterials: [
    '1.0 mm Outside Decorative Laminate Finish (worth up to ₹1,500/sheet — Customer choice of SF or High-Gloss at same price)',
    '0.8 mm White / Fabric Inside Liner Laminate on interior faces (0.72 mm–0.80 mm standard manufacturer nominal gauge)',
    'Soft-Close Hinges & Telescopic Channels (Berlin / Ebco / Nimmi)',
    'Handles (Worth up to ₹200/unit on Standard & Normal; up to ₹300/unit on Premium)',
    'Woodworking Adhesive (Fevicol Marine / SH / Jivanjor)',
  ],
  workTypes: {
    'Box type': {
      id: 'Box type',
      label: 'Full cabinet with doors',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Full plywood cabinet body (top, bottom, two sides and back) with internal shelves, 0.8mm inside laminate, and hinged or sliding shutters with 1mm outside laminate finish. Billed by front area (height × width).',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Back panel', 'Bottom floor-contact panel'],
      rates: {
        Base: { Standard: 950, 'With PVC': 1025 },
        Normal: { Standard: 1000, 'With PVC': 1075 },
        Premium: { Standard: 1250, 'With PVC': 1325 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Frame type': {
      id: 'Frame type',
      label: 'Frame and doors',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Plywood frame fixed to an existing wall recess or stone shelves, with laminated doors at the front. Billed by front area (height × width).',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Wall-contact perimeter frame'],
      rates: {
        Base: { Standard: 700, 'With PVC': 775 },
        Normal: { Standard: 800, 'With PVC': 875 },
        Premium: { Standard: 1000, 'With PVC': 1075 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Loft - frame and shutter': {
      id: 'Loft - frame and shutter',
      label: 'Loft frame and doors',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Overhead storage closure above a concrete loft slab or wardrobe top, with a plywood frame and hinged doors with 0.8mm inside laminate and 1mm outside laminate finish.',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Wall and slab-contact perimeter frame'],
      rates: {
        Base: { Standard: 700, 'With PVC': 775 },
        Normal: { Standard: 800, 'With PVC': 875 },
        Premium: { Standard: 1000, 'With PVC': 1075 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Low roof - frame and shutter': {
      id: 'Low roof - frame and shutter',
      label: 'Low-ceiling storage frame and doors',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Storage frame and doors below a sunken slab or low-ceiling ledge, finished with 0.8mm inside laminate and 1mm outside laminate finish.',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Sunken slab & wall-contact frame'],
      rates: {
        Base: { Standard: 700, 'With PVC': 775 },
        Normal: { Standard: 800, 'With PVC': 875 },
        Premium: { Standard: 1000, 'With PVC': 1075 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Folding table': {
      id: 'Folding table',
      label: 'Wall-mounted folding table',
      unit: 'sq_ft',
      plainEnglishDefinition:
        '18" depth wall-mounted collapsible study or utility table finished on both top and bottom faces with 1mm outside laminate finish and heavy-duty folding brackets.',
      pvcDefaultEligible: false,
      pvcDefaultParts: [],
      rates: {
        Base: { Standard: 700, 'With PVC': 700 },
        Normal: { Standard: 800, 'With PVC': 800 },
        Premium: { Standard: 1000, 'With PVC': 1000 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Wood wall paneling': {
      id: 'Wood wall paneling',
      label: 'Plywood wall panelling',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Flat plywood wall cladding installed under lofts, around pillars, main door jambs, or breakfast counters, finished on the visible face with 1mm outside laminate finish.',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Wall-contact backing sheet'],
      rates: {
        Base: { Standard: 400, 'With PVC': 450 },
        Normal: { Standard: 500, 'With PVC': 550 },
        Premium: { Standard: 550, 'With PVC': 600 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Wood wall paneling (under wall cabinet)': {
      id: 'Wood wall paneling (under wall cabinet)',
      label: 'Plywood panelling below wall cabinets',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Plywood panelling below kitchen wall cabinets finished with 1mm outside laminate finish.',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Wall-contact backing'],
      rates: {
        Base: { Standard: 400, 'With PVC': 450 },
        Normal: { Standard: 450, 'With PVC': 500 },
        Premium: { Standard: 550, 'With PVC': 600 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Louvers wall paneling': {
      id: 'Louvers wall paneling',
      label: 'Decorative louvre wall panelling',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Decorative fluted louvre wall panelling with 1 mm external laminate, for TV units or above the main entrance.',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Wall-contact backing panel'],
      rates: {
        Base: { Standard: 550, 'With PVC': 600 },
        Normal: { Standard: 600, 'With PVC': 650 },
        Premium: { Standard: 650, 'With PVC': 700 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Pooja CNC / glass door paneling': {
      id: 'Pooja CNC / glass door paneling',
      label: 'Pooja entrance with CNC or glass doors',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Pooja room entrance frame and double doors with CNC-cut decorative screens or glass panels and 1mm outside laminate finish.',
      pvcDefaultEligible: false,
      pvcDefaultParts: [],
      rates: {
        Base: { Standard: 700, 'With PVC': 700 },
        Normal: { Standard: 800, 'With PVC': 800 },
        Premium: { Standard: 850, 'With PVC': 850 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Tandem or SS baskets': {
      id: 'Tandem or SS baskets',
      label: 'Tandem drawers or stainless-steel baskets',
      unit: 'each',
      plainEnglishDefinition:
        'Kitchen pull-out tandem drawer or stainless-steel basket with the specified channels and installation. Confirm the basket grade and hardware model in the agreed item specification.',
      pvcDefaultEligible: false,
      pvcDefaultParts: [],
      rates: {
        Base: { Standard: 3600, 'With PVC': 3600 },
        Normal: { Standard: 3600, 'With PVC': 3600 },
        Premium: { Standard: 3600, 'With PVC': 3600 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Wall mount bed': {
      id: 'Wall mount bed',
      label: 'Wall-mounted folding bed',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Space-saving wall-mounted hydraulic/folding bed frame with 0.8mm inside laminate and 1mm outside laminate finish.',
      pvcDefaultEligible: true,
      pvcDefaultParts: ['Wall-contact back frame'],
      rates: {
        Base: { Standard: 950, 'With PVC': 1025 },
        Normal: { Standard: 1000, 'With PVC': 1075 },
        Premium: { Standard: 1200, 'With PVC': 1275 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'Mirror wall paneling': {
      id: 'Mirror wall paneling',
      label: 'Mirror backing panel',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Plywood backing panel for a mirror in a dressing area.',
      pvcDefaultEligible: false,
      pvcDefaultParts: [],
      rates: {
        Base: { Standard: 300, 'With PVC': 300 },
        Normal: { Standard: 300, 'With PVC': 300 },
        Premium: { Standard: 350, 'With PVC': 350 },
      },
      highGlossPremiumPerUnit: 0,
    },
    'False ceiling (Saint Gobain)': {
      id: 'False ceiling (Saint Gobain)',
      label: 'Saint-Gobain gypsum false ceiling',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Gypsum false ceiling with Saint-Gobain boards and galvanised steel support channels.',
      pvcDefaultEligible: false,
      pvcDefaultParts: [],
      rates: {
        Base: { Standard: 60, 'With PVC': 60 },
        Normal: { Standard: 60, 'With PVC': 60 },
        Premium: { Standard: 60, 'With PVC': 60 },
      },
      highGlossPremiumPerUnit: 0,
    },
  },
  notesAndExclusions: [
    'Laminate specification: 0.8 mm nominal internal liner laminate (manufacturer sheet gauge: 0.72–0.80 mm) and 1.0 mm external decorative laminate. SF matte and high-gloss finishes have the same quoted price.',
    'Acrylic sheets, aluminium profile doors, heavy glass and custom CNC work are charged separately according to the approved selection.',
    'The 1.0 mm decorative laminate is applied to visible external surfaces.',
    'Hardware or plywood outside the listed brands or allowances is charged at the approved price difference.',
    'Additional internal drawers beyond the agreed standard layout cost ₹5,000 each on Premium/2026 quotations. Historical quotations retain their specified ₹4,000–₹4,500 rates.',
    'Quoted prices include the materials and labour listed in the agreed scope.',
  ],
  termsAndConditions: [
    {
      id: 1,
      title: 'Booking payment (₹50,000)',
      clause:
        'A booking payment of ₹50,000 or more confirms the work order and reserves the quoted material rates for the agreed scope. Once verified, it counts toward the 50% advance and is not an additional charge. Changes to measurements, scope or specifications require a revised quotation and written approval.',
      source: 'Supplied PDF',
    },
    {
      id: 2,
      title: '50% advance before work starts',
      clause:
        'Before material dispatch and on-site carpentry begins, pay the balance needed to reach 50% of the quotation total. Verified booking payments count toward this amount.',
      source: 'Supplied PDF',
    },
    {
      id: 3,
      title: '35% after the plywood structure is complete',
      clause:
        'Pay 35% of the quotation total when all plywood cabinet bodies and frames are complete on site.',
      source: 'Supplied PDF',
    },
    {
      id: 4,
      title: '10% after external laminate is complete',
      clause:
        'Pay 10% of the quotation total when the 1.0 mm external laminate is applied and the doors are fitted.',
      source: 'Supplied PDF',
    },
    {
      id: 5,
      title: '5% final balance before handover',
      clause:
        'Pay the final 5% balance before final hardware alignment and site handover.',
      source: 'Supplied PDF',
    },
    {
      id: 6,
      title: 'Approval and payment for extra work',
      clause:
        'Extra work, additional drawers and other scope changes require written approval. Payment is due when the approved item is complete.',
      source: 'Supplied PDF',
    },
    {
      id: 7,
      title: 'Site cleaning',
      clause:
        'The carpentry team will stack work debris neatly. The customer is responsible for final deep cleaning after completion.',
      source: 'Supplied PDF',
    },
    {
      id: 8,
      title: 'Quotation validity and site measurements',
      clause:
        'This quotation is valid until its stated expiry date, or for 30 calendar days from issue if no expiry is stated. Floor-plan estimates are checked against site measurements before the laminate stage. Any changes to quantities, scope, requirements, materials or prices require a revised quotation and written customer approval before the affected work proceeds.',
      source: 'Supplied PDF',
    },
    {
      id: 9,
      title: 'Laminate thickness and finish',
      clause:
        'Internal liner laminate is 0.8 mm nominal thickness; manufacturer sheet gauge ranges from 0.72 mm to 0.80 mm. External laminate is 1.0 mm, in the selected SF matte or high-gloss finish at the same quoted price.',
      source: 'Owner-Approved Hyderabad Protection',
    },
    {
      id: 10,
      title: 'Materials, alternatives and manufacturer warranties',
      clause:
        'Materials are sourced from the selected package’s approved brand list. A product outside that list requires written customer approval before purchase. Plywood warranties depend on the selected product and its manufacturer certificate, invoice and terms: 30, 25 or 21 years for Premium; 20, 15 or 10 years for Normal.',
      source: 'Owner-Approved Hyderabad Protection',
    },
  ],
};

export interface RateCardPatchV2 {
  schema_version: 'quotation-studio.ratecard.v2';
  output_language: 'en';
  highGlossSheetUpgradeDelta?: number;
  workTypes: Record<string, WorkTypeDefinition>;
  notesAndExclusions?: string[];
}

export interface RateCardExtensionPreset {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  patch: RateCardPatchV2;
}

export const RATECARD_EXTENSION_PRESETS: RateCardExtensionPreset[] = [
  {
    id: 'profile-glass-acrylic-cnc',
    title: '1. Profile Glass Shutters, Acrylic Finish & Bespoke CNC Jali Pack',
    badge: '3 Extra Work Elements · sq_ft',
    prompt:
      'Add new rate card work elements: 1) Aluminum profile glass shutter (crockery/kitchen) at Base 1350, Normal 1450, Premium 1600 per sq ft, no PVC needed. 2) 1.5mm Acrylic high-gloss box unit at Base 1250, Normal 1350, Premium 1550 per sq ft with +75 PVC adder for back panel. 3) Bespoke CNC Mandir / Partition Jali work at Base 850, Normal 950, Premium 1100 per sq ft.',
    patch: {
      schema_version: 'quotation-studio.ratecard.v2',
      output_language: 'en',
      workTypes: {
        'Aluminum profile glass shutter': {
          id: 'Aluminum profile glass shutter',
          label: 'Aluminum profile glass shutter',
          unit: 'sq_ft',
          plainEnglishDefinition:
            'Slim anodised aluminum profile frame fitted with 5mm tinted, frosted, or fluted glass shutters and soft-close profile hinges.',
          pvcDefaultEligible: false,
          pvcDefaultParts: [],
          rates: {
            Base: { Standard: 1350, 'With PVC': 1350 },
            Normal: { Standard: 1450, 'With PVC': 1450 },
            Premium: { Standard: 1600, 'With PVC': 1600 },
          },
          highGlossPremiumPerUnit: 0,
        },
        'Acrylic 1.5mm box cabinet': {
          id: 'Acrylic 1.5mm box cabinet',
          label: 'Acrylic 1.5mm box cabinet',
          unit: 'sq_ft',
          plainEnglishDefinition:
            'Full 5-sided plywood carcass finished on visible shutters with 1.5mm anti-scratch mirror-gloss acrylic sheet and matching edge-banding.',
          pvcDefaultEligible: true,
          pvcDefaultParts: ['Back panel', 'Bottom floor-contact panel'],
          rates: {
            Base: { Standard: 1250, 'With PVC': 1325 },
            Normal: { Standard: 1350, 'With PVC': 1425 },
            Premium: { Standard: 1550, 'With PVC': 1625 },
          },
          highGlossPremiumPerUnit: 0,
        },
        'CNC jali partition / mandir back': {
          id: 'CNC jali partition / mandir back',
          label: 'CNC jali partition / mandir back',
          unit: 'sq_ft',
          plainEnglishDefinition:
            'Precision CNC-routed decorative lattice partition or Pooja backdrop panel in seasoned HDHMR / plywood with smooth PU/laminate border.',
          pvcDefaultEligible: false,
          pvcDefaultParts: [],
          rates: {
            Base: { Standard: 850, 'With PVC': 850 },
            Normal: { Standard: 950, 'With PVC': 950 },
            Premium: { Standard: 1100, 'With PVC': 1100 },
          },
          highGlossPremiumPerUnit: 0,
        },
      },
    },
  },
  {
    id: 'pelmet-headboard-drawers',
    title: '2. Curtain Pelmet, Upholstered Headboard & Extra Internal Drawer Pack',
    badge: 'running_ft · sq_ft · each',
    prompt:
      'Rate card lo kotha items add cheyandi: 1) Curtain / AC pelmet box running ft basis Base 350, Normal 400, Premium 450. 2) Cushioned bed headboard panelling sq ft basis Base 650, Normal 750, Premium 850. 3) Additional internal drawer unit each basis Base 4000, Normal 4500, Premium 5000.',
    patch: {
      schema_version: 'quotation-studio.ratecard.v2',
      output_language: 'en',
      workTypes: {
        'Curtain / AC pelmet box': {
          id: 'Curtain / AC pelmet box',
          label: 'Curtain / AC pelmet box',
          unit: 'running_ft',
          plainEnglishDefinition:
            'Concealed plywood curtain track pelmet or AC piping boxing finished with 1mm exterior decorative laminate. Billed per running foot.',
          pvcDefaultEligible: false,
          pvcDefaultParts: [],
          rates: {
            Base: { Standard: 350, 'With PVC': 350 },
            Normal: { Standard: 400, 'With PVC': 400 },
            Premium: { Standard: 450, 'With PVC': 450 },
          },
          highGlossPremiumPerUnit: 0,
        },
        'Upholstered headboard paneling': {
          id: 'Upholstered headboard paneling',
          label: 'Upholstered headboard paneling',
          unit: 'sq_ft',
          plainEnglishDefinition:
            'Plywood backing with high-density foam cushioning and premium fabric/leatherette upholstery for bedroom cot headboards.',
          pvcDefaultEligible: true,
          pvcDefaultParts: ['Wall-contact plywood backing'],
          rates: {
            Base: { Standard: 650, 'With PVC': 700 },
            Normal: { Standard: 750, 'With PVC': 800 },
            Premium: { Standard: 850, 'With PVC': 900 },
          },
          highGlossPremiumPerUnit: 0,
        },
        'Additional internal drawer': {
          id: 'Additional internal drawer',
          label: 'Additional internal drawer',
          unit: 'each',
          plainEnglishDefinition:
            'Extra internal lockable/storage drawer inside wardrobe or cabinet complete with soft-close telescopic channels.',
          pvcDefaultEligible: false,
          pvcDefaultParts: [],
          rates: {
            Base: { Standard: 4000, 'With PVC': 4000 },
            Normal: { Standard: 4500, 'With PVC': 4500 },
            Premium: { Standard: 5000, 'With PVC': 5000 },
          },
          highGlossPremiumPerUnit: 0,
        },
      },
    },
  },
];

function normalizeSingleWorkType(keyHint: string, raw: any): WorkTypeDefinition {
  const id = String(
    raw?.key || raw?.id || (keyHint && !/^\d+$/.test(keyHint) ? keyHint : '') || raw?.label || raw?.name || 'Custom Work Element'
  ).trim();
  const label = String(raw?.label || raw?.name || id).trim();
  const unitRaw = String(raw?.unit || 'sq_ft').toLowerCase();
  const unit: WorkTypeDefinition['unit'] =
    unitRaw === 'running_ft' || unitRaw === 'rft'
      ? 'running_ft'
      : unitRaw === 'each' || unitRaw === 'nos' || unitRaw === 'piece'
      ? 'each'
      : unitRaw === 'lumpsum' || unitRaw === 'lump_sum'
      ? 'lumpsum'
      : 'sq_ft';

  const pvcAdder = Number(raw?.pvcAdder ?? raw?.pvc_adder ?? 0) || 0;
  const baseStd =
    Number(raw?.rates?.Base?.Standard ?? raw?.baseRate ?? raw?.base ?? 750) || 750;
  const basePvc =
    Number(
      raw?.rates?.Base?.['With PVC'] ??
        raw?.basePvcRate ??
        (pvcAdder > 0 ? baseStd + pvcAdder : baseStd)
    ) || baseStd;

  const normalStd =
    Number(raw?.rates?.Normal?.Standard ?? raw?.normalRate ?? raw?.normal ?? 850) || 850;
  const normalPvc =
    Number(
      raw?.rates?.Normal?.['With PVC'] ??
        raw?.normalPvcRate ??
        (pvcAdder > 0 ? normalStd + pvcAdder : normalStd)
    ) || normalStd;

  const premiumStd =
    Number(raw?.rates?.Premium?.Standard ?? raw?.premiumRate ?? raw?.premium ?? 1000) || 1000;
  const premiumPvc =
    Number(
      raw?.rates?.Premium?.['With PVC'] ??
        raw?.premiumPvcRate ??
        (pvcAdder > 0 ? premiumStd + pvcAdder : premiumStd)
    ) || premiumStd;

  const pvcDefaultEligible =
    typeof raw?.pvcDefaultEligible === 'boolean'
      ? raw.pvcDefaultEligible
      : typeof raw?.defaultPvcEligible === 'boolean'
      ? raw.defaultPvcEligible
      : basePvc > baseStd || normalPvc > normalStd || premiumPvc > premiumStd;

  return {
    id,
    label,
    unit,
    plainEnglishDefinition:
      String(
        raw?.plainEnglishDefinition ||
          raw?.description ||
          `Custom residential interior work (${label}) executed in calibrated plywood and 1mm laminate finish, billed per ${unit}.`
      ).trim(),
    pvcDefaultEligible,
    pvcDefaultParts: Array.isArray(raw?.pvcDefaultParts)
      ? raw.pvcDefaultParts
      : pvcDefaultEligible
      ? ['Back panel']
      : [],
    rates: {
      Base: { Standard: baseStd, 'With PVC': basePvc },
      Normal: { Standard: normalStd, 'With PVC': normalPvc },
      Premium: { Standard: premiumStd, 'With PVC': premiumPvc },
    },
    highGlossPremiumPerUnit: Number(raw?.highGlossPremiumPerUnit ?? 0) || 0,
  };
}

/**
 * Accepts a full StudioCatalogue JSON, a RateCardPatchV2 JSON (`quotation-studio.ratecard.v2`),
 * a `workTypes` map, a single work item object, or an array of work item objects, and merges
 * them cleanly into the existing StudioCatalogue.
 */
export function mergeRateCardJsonIntoCatalogue(
  currentCatalogue: StudioCatalogue,
  rawInput: any
): {
  catalogue: StudioCatalogue;
  patch: RateCardPatchV2;
  addedOrUpdatedKeys: string[];
} {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('Rate card JSON must be a JSON object or array of work elements.');
  }

  const nextCatalogue: StudioCatalogue = structuredClone(currentCatalogue);
  const patchWorkTypes: Record<string, WorkTypeDefinition> = {};
  const addedOrUpdatedKeys: string[] = [];

  if (typeof rawInput.highGlossSheetUpgradeDelta === 'number') {
    nextCatalogue.highGlossSheetUpgradeDelta = rawInput.highGlossSheetUpgradeDelta;
  }
  if (Array.isArray(rawInput.notesAndExclusions)) {
    nextCatalogue.notesAndExclusions = rawInput.notesAndExclusions.map(String);
  }
  if (rawInput.company && typeof rawInput.company === 'object') {
    nextCatalogue.company = { ...nextCatalogue.company, ...rawInput.company };
  }
  if (rawInput.grades && typeof rawInput.grades === 'object') {
    nextCatalogue.grades = { ...nextCatalogue.grades, ...rawInput.grades };
  }

  // Case 1: Array of work elements
  if (Array.isArray(rawInput)) {
    for (const item of rawInput) {
      const normalized = normalizeSingleWorkType(item?.label || item?.id || 'Custom Work', item);
      nextCatalogue.workTypes[normalized.id] = normalized;
      patchWorkTypes[normalized.id] = normalized;
      addedOrUpdatedKeys.push(normalized.id);
    }
  }
  // Case 2: Has workTypes object (RateCardPatchV2 or StudioCatalogue)
  else if (rawInput.workTypes && typeof rawInput.workTypes === 'object') {
    for (const [key, val] of Object.entries(rawInput.workTypes)) {
      const normalized = normalizeSingleWorkType(key, val);
      nextCatalogue.workTypes[normalized.id] = normalized;
      patchWorkTypes[normalized.id] = normalized;
      addedOrUpdatedKeys.push(normalized.id);
    }
  }
  // Case 3: Single work element object with label/rates/base
  else if (rawInput.label || rawInput.rates || rawInput.base || rawInput.baseRate) {
    const normalized = normalizeSingleWorkType(rawInput.label || rawInput.id || 'Custom Work', rawInput);
    nextCatalogue.workTypes[normalized.id] = normalized;
    patchWorkTypes[normalized.id] = normalized;
    addedOrUpdatedKeys.push(normalized.id);
  }
  // Case 4: Direct map of { "Work Name": { rates... } }
  else {
    for (const [key, val] of Object.entries(rawInput)) {
      if (key === 'schema_version' || key === 'output_language') continue;
      if (val && typeof val === 'object') {
        const normalized = normalizeSingleWorkType(key, val);
        nextCatalogue.workTypes[normalized.id] = normalized;
        patchWorkTypes[normalized.id] = normalized;
        addedOrUpdatedKeys.push(normalized.id);
      }
    }
  }

  if (addedOrUpdatedKeys.length === 0 && typeof rawInput.highGlossSheetUpgradeDelta !== 'number') {
    throw new Error('No valid workTypes or rate card fields found in the provided JSON.');
  }

  return {
    catalogue: nextCatalogue,
    patch: {
      schema_version: 'quotation-studio.ratecard.v2',
      output_language: 'en',
      highGlossSheetUpgradeDelta: nextCatalogue.highGlossSheetUpgradeDelta,
      workTypes: patchWorkTypes,
    },
    addedOrUpdatedKeys,
  };
}

/**
 * Deterministic multilingual Rate Card generator from natural language prompt (English / Telugu / Hindi)
 */
export function generateRateCardPatchDeterministically(prompt: string): RateCardPatchV2 {
  const trimmed = prompt.trim();
  const matchedPreset = RATECARD_EXTENSION_PRESETS.find(
    (p) => p.prompt.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (matchedPreset) {
    return structuredClone(matchedPreset.patch);
  }

  // Parse lines or clauses describing work elements and numbers
  const workTypes: Record<string, WorkTypeDefinition> = {};
  const cleanedPrompt = trimmed
    .replace(/^add new rate card work elements:?\s*/i, '')
    .replace(/^rate card lo kotha items add cheyandi:?\s*/i, '');
  const segments = cleanedPrompt
    .split(/\n|(?:\d+\))|;/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  for (const seg of segments) {
    const lower = seg.toLowerCase();
    const unit: WorkTypeDefinition['unit'] =
      /running_ft|running ft|rft|running foot/.test(lower)
        ? 'running_ft'
        : /each|per piece|per unit|nos|drawer|basket/.test(lower)
        ? 'each'
        : /lumpsum|lump sum|package/.test(lower)
        ? 'lumpsum'
        : 'sq_ft';

    const nums = Array.from(seg.matchAll(/\b(\d{2,5})\b/g)).map((m) => Number(m[1]));
    const baseRate = nums[0] || 850;
    const normalRate = nums[1] || Math.round(baseRate + 100);
    const premiumRate = nums[2] || Math.round(normalRate + 150);
    const pvcAdder =
      /pvc\s*\+?(\d{2,3})/i.exec(seg)?.[1]
        ? Number(/pvc\s*\+?(\d{2,3})/i.exec(seg)![1])
        : /with pvc|back panel/i.test(lower)
        ? 75
        : 0;

    // Extract clean English work type label
    let label = seg
      .replace(/add new rate card work elements:?/gi, '')
      .replace(/rate card lo kotha items add cheyandi:?/gi, '')
      .replace(/\bat\b.*$/i, '')
      .replace(/\bbase\b.*$/i, '')
      .replace(/\b(sq_ft|sq ft|running_ft|running ft|each|lumpsum)\b.*$/i, '')
      .replace(/[,:-]+$/, '')
      .trim();

    if (!label || label.length < 2) {
      label = 'Custom interior element';
    }
    label = label.charAt(0).toUpperCase() + label.slice(1);

    workTypes[label] = {
      id: label,
      label,
      unit,
      plainEnglishDefinition: `Custom residential carpentry scope (${label}) executed with approved grade plywood and 1mm exterior laminate finish, billed per ${unit}.`,
      pvcDefaultEligible: pvcAdder > 0,
      pvcDefaultParts: pvcAdder > 0 ? ['Back panel'] : [],
      rates: {
        Base: { Standard: baseRate, 'With PVC': baseRate + pvcAdder },
        Normal: { Standard: normalRate, 'With PVC': normalRate + pvcAdder },
        Premium: { Standard: premiumRate, 'With PVC': premiumRate + pvcAdder },
      },
      highGlossPremiumPerUnit: 0,
    };
  }

  if (Object.keys(workTypes).length === 0) {
    return structuredClone(RATECARD_EXTENSION_PRESETS[0].patch);
  }

  return {
    schema_version: 'quotation-studio.ratecard.v2',
    output_language: 'en',
    workTypes,
  };
}

/**
 * Automatically extracts any embedded `rate_card_updates`, `workTypes`, or inline `custom_rates` /
 * unmapped `work_type` items from a single unified Quotation JSON and merges them into the Catalogue.
 */
export function extractAndMergeRateCardFromDraft(
  currentCatalogue: StudioCatalogue,
  rawJson: any
): {
  catalogue: StudioCatalogue;
  addedOrUpdatedKeys: string[];
} {
  let nextCat = structuredClone(currentCatalogue);
  const addedOrUpdated = new Set<string>();

  if (!rawJson || typeof rawJson !== 'object') {
    return { catalogue: nextCat, addedOrUpdatedKeys: [] };
  }

  // 1. Check top-level rate_card_updates or workTypes in the pasted JSON
  const updatesObj = rawJson.rate_card_updates || rawJson.workTypes;
  if (updatesObj && typeof updatesObj === 'object') {
    try {
      const merged = mergeRateCardJsonIntoCatalogue(
        nextCat,
        Array.isArray(updatesObj) ? updatesObj : { workTypes: updatesObj }
      );
      nextCat = merged.catalogue;
      merged.addedOrUpdatedKeys.forEach((k) => addedOrUpdated.add(k));
    } catch {
      // Continue to item-level extraction
    }
  }

  // 2. Scan rooms[].items[] for any new work_type or inline custom_rates
  if (Array.isArray(rawJson.rooms)) {
    for (const room of rawJson.rooms) {
      if (!Array.isArray(room?.items)) continue;
      for (const item of room.items) {
        const wt = String(item?.work_type || '').trim();
        if (!wt) continue;
        const cr = item?.custom_rates;
        const exists = Boolean(nextCat.workTypes[wt]);

        if (!exists || (cr && typeof cr === 'object')) {
          const unitRaw = String(item?.measure?.unit || 'sq_ft').toLowerCase();
          const unit: WorkTypeDefinition['unit'] =
            unitRaw === 'running_ft' || unitRaw === 'rft'
              ? 'running_ft'
              : unitRaw === 'each'
              ? 'each'
              : unitRaw === 'lumpsum'
              ? 'lumpsum'
              : 'sq_ft';

          const existingDef = nextCat.workTypes[wt];
          const baseStd =
            Number(cr?.Base ?? existingDef?.rates?.Base?.Standard ?? 750) || 750;
          const normalStd =
            Number(cr?.Normal ?? existingDef?.rates?.Normal?.Standard ?? 850) || 850;
          const premiumStd =
            Number(cr?.Premium ?? existingDef?.rates?.Premium?.Standard ?? 1000) || 1000;
          const pvcAdder =
            typeof cr?.pvc_adder === 'number'
              ? cr.pvc_adder
              : item?.pvc?.eligible
              ? 75
              : 0;

          nextCat.workTypes[wt] = {
            id: wt,
            label: wt,
            unit,
            plainEnglishDefinition:
              existingDef?.plainEnglishDefinition ||
              item?.source_text_en ||
              `Custom residential interior work (${wt}) executed with calibrated plywood and 1mm laminate finish, billed per ${unit}.`,
            pvcDefaultEligible: Boolean(item?.pvc?.eligible ?? pvcAdder > 0),
            pvcDefaultParts:
              Array.isArray(item?.pvc?.parts) && item.pvc.parts.length > 0
                ? item.pvc.parts
                : pvcAdder > 0
                ? ['Back panel']
                : [],
            rates: {
              Base: { Standard: baseStd, 'With PVC': baseStd + pvcAdder },
              Normal: { Standard: normalStd, 'With PVC': normalStd + pvcAdder },
              Premium: { Standard: premiumStd, 'With PVC': premiumStd + pvcAdder },
            },
            highGlossPremiumPerUnit: existingDef?.highGlossPremiumPerUnit ?? 0,
          };
          addedOrUpdated.add(wt);
        }
      }
    }
  }

  return {
    catalogue: nextCat,
    addedOrUpdatedKeys: Array.from(addedOrUpdated),
  };
}

/**
 * Dynamically generates the Single-Model Master Instructions for Gemini Gem / ChatGPT Custom GPT,
 * embedding the live Rate Card memory table so any newly added work types are automatically included.
 */
export function buildDynamicGemInstructions(catalogue: StudioCatalogue = DEFAULT_UME_CATALOGUE): string {
  const workTypeLines = Object.entries(catalogue.workTypes).map(([key, wt]) =>
    `- work_type ${JSON.stringify(key)}; unit ${JSON.stringify(wt.unit)}; Standard (Base) ${wt.rates.Base.Standard}, with PVC ${wt.rates.Base['With PVC']}; Normal ${wt.rates.Normal.Standard}, with PVC ${wt.rates.Normal['With PVC']}; Premium ${wt.rates.Premium.Standard}, with PVC ${wt.rates.Premium['With PVC']}. PVC eligible by default: ${wt.pvcDefaultEligible}. Standard PVC contact parts (pvcDefaultParts): ${JSON.stringify(wt.pvcDefaultParts)}. Display label: ${wt.label}.`
  ).join('\n');
  const brandLines = Object.entries(catalogue.grades).map(([key, grade]) =>
    `- ${getPackageDisplayName(key as PlywoodGrade)} (schema key ${JSON.stringify(key)}): ${grade.approvedBrands.map((brand) => brand.name).join(', ')}.`
  ).join('\n');
  const jsonFence = '```';
  const example = {
    schema_version: 'quotation-studio.draft.v2', output_language: 'en', is_demo: false,
    languages: ['en'], customer: { name: null, site: null, phone: null },
    quote: { number: null, date: null, valid_until: null, is_floor_plan_estimate: false },
    recommended: { grade: 'Base', protection: 'Standard', finish: 'SF', brand_preference: null },
    rooms: [{ name: 'Master Bedroom', recommended: null, items: [{
      name: 'Modular Wardrobe', work_type: 'Box type', size_text: '7 ft × 8 ft',
      measure: { unit: 'sq_ft', per_item: 56 }, quantity: 1,
      pvc: { eligible: catalogue.workTypes['Box type']?.pvcDefaultEligible ?? null, parts: [...(catalogue.workTypes['Box type']?.pvcDefaultParts || [])] }, optional: false,
      source_text_en: 'Box-type wardrobe with inside laminate and outside laminate finish.',
    }] }], owner_requests: [], needs_clarification: [
      { path: '/customer/name', question: 'What is the customer’s full name?' },
      { path: '/customer/site', question: 'What is the full site address?' },
      { path: '/customer/phone', question: 'What is the customer’s mobile number?' },
    ],
    suggested_addons: [{room_index: 0, reason: 'A fold-away desk could add a compact work surface alongside the wardrobe. Confirm that the household needs a desk and has a clear wall before adding it.', item: {
      name: 'Wall-Mounted Folding Desk', work_type: 'Folding table', size_text: null,
      measure: {unit: 'sq_ft', per_item: null}, quantity: null,
      pvc: {eligible: false, parts: []}, optional: true,
      source_text_en: 'Fold-away wall desk with laminate finish and folding brackets; final specification to be confirmed.',
    }}],
  };
  return `You are Quotation Studio, the private quotation and rate-card assistant for UMAMAHESHWARA INTERIORS (Umamaheshwara Enterprises, Chengicherla, Hyderabad; Proprietor V. SUBHASH).

PURPOSE AND APP HANDOFF
Help the owner turn Telugu, Hindi, English, Roman Telugu/Hindi, or mixed site notes into the exact English JSON accepted by UME Interiors. The owner signs in at /owner. Customer quotations are private /q/<token> links. You have no live connection to the app, cannot publish a link or alter its database, cannot log in for the owner, and cannot verify or credit a payment.

1. INTERVIEW AND TRANSLATION
STEP 1 — CUSTOMER & SITE LOCATION
Collect the customer’s name, mobile number and confirmed full site address.
STEP 2 — ROOM SCOPE & DEFAULT PACKAGE
Ask whether this quotation is based on a supplied floor plan. Always include quote.is_floor_plan_estimate as a JSON boolean: true only when the owner confirms the supplied floor plan is the basis; otherwise false. When true, the app automatically adds the preliminary-estimate notice about on-site measurements, scope, requirements, material specifications and prices possibly changing after the site visit. When false, generate no quotation-basis note and never imply that a site visit has happened. Do not generate quote.estimate_basis or quote.estimate_note for new output; those legacy fields are accepted only when importing existing JSON.
Collect each room’s furniture items, work types, dimensions, billing units and quantities; optional scope; confirmed PVC contact areas; and the default sending package and finish. Ask only for missing information. Translate meaning into clear English. Preserve confirmed spellings of names and brands. A Maps link is a reference: do not invent an address you have not retrieved or had confirmed.
Use natural furniture names such as Modular Wardrobe, Wardrobe Frame and Shutter, Loft Frame and Shutter, Kitchen Base Cabinet, Kitchen Overhead Wall Cabinet, Dressing Table, Study Table Workstation, TV Media Console, Shoe Rack and Pooja Mandir.
source_text_en is a short English specification. Do not repeat dimensions or prices there. Include a carcass depth only if stated or confirmed by the owner. Do not infer missing measurements, depth, rates, guarantees, tax treatment or exclusions.

2. EXACT SCHEMA AND MEASUREMENTS
Output quotation-studio.draft.v2. All keys and human-readable JSON values must be English. languages may contain only te, hi and en; output_language is always en. Customer-facing Standard uses the schema key Base; the other keys are Normal and Premium. Protection is Standard or With PVC. Finish is SF or High Gloss. Do not rename these machine values.
Use one line per distinct room/item/work type. Allowed units: sq_ft, running_ft, each and lumpsum. measure.per_item is the measured amount for ONE item; quantity is the count and is applied once by the app. For each or lumpsum use per_item 1 with the confirmed count. Convert 5 ft 6 in to 5.5 ft. Preserve explicit decimal feet exactly; never interpret a stated 6.9 ft as 6 ft 9 in. If spoken dimensions are ambiguous, keep a readable size_text, set the unknown measure field to null and ask a needs_clarification question with its JSON Pointer path.
PVC SCOPE — COMPLETE EVERY ITEM
pvc.eligible describes eligibility, not whether the customer already selected PVC. The current rate-card snapshot below includes both eligibility and pvcDefaultParts. For an ordinary catalogue work type with no owner override, use its exact standard eligibility and copy its non-empty pvcDefaultParts into pvc.parts as the company’s quoted standard contact-area scope, subject to owner review. This states the proposed coverage, not a claim that a site inspection happened. Owner-specified parts override the catalogue. Do not leave pvc.parts empty when eligible is true. If a new/custom work type has no approved parts, ask what contact areas to cover; keep it in needs_clarification rather than inventing parts or marking it ineligible just to suppress an error. For eligible:false use parts:[]. SF and High Gloss share the app’s current price. Do not invent a flat PVC charge; use the relevant catalogue or explicit item override.
Optional scope uses optional:true. Leave unknown required fields null and add needs_clarification. Never invent customer details, quote dates/numbers or an expiry. The app can generate missing quote metadata when publishing. Always include is_demo as a JSON boolean: use false for a normal real-customer quotation, and true only when the owner explicitly identifies the job as practice/demo/test. Never default an ordinary customer job to true. Keep an explicitly identified practice record as true until the owner confirms that it now contains a real customer’s actual scope.

3. PRICES, APPROVAL AND MEMORY
The rate list below is a snapshot copied from the app when these instructions were copied. It is not a live sync. Use its work_type keys exactly. The app calculates totals; never invent a total or a rate absent from this list.
For a quotation-specific price, put custom_rates on that ITEM only: {"Base":850,"Normal":950,"Premium":1150,"pvc_adder":75}, using only confirmed amounts. These are examples, not default prices.
Only when the owner explicitly asks to add or change a reusable rate card, include rate_card_updates keyed by work_type. Each definition uses label, unit, plainEnglishDefinition, pvcDefaultEligible, pvcDefaultParts and rates:{"Base":{"Standard":amount,"With PVC":amount},"Normal":{...},"Premium":{...}}. Ask for all missing grade rates and PVC eligibility rather than guessing. The app imports those reusable changes into its catalogue, so explain this consequence during the conversation before the final JSON. For a rate-card-only request use schema_version quotation-studio.ratecard.v2, output_language en and workTypes with the same definitions, without rooms.
Record discounts, special conditions, unverified payment claims and other approvals as English owner_requests objects with path and text. An import never confirms a payment. Warranties remain subject to the selected manufacturer’s certificate and terms; do not promise whole-furniture immunity from dampness or termites.
Conversation memory helps only within the current chat. To change future Gem/Custom GPT chats, the owner must copy the current app instructions again into that assistant’s saved configuration. Do not claim you rewrote its configuration or app database.

4. TAILORED OPTIONAL RECOMMENDATIONS
Think like a thoughtful interior designer: look at the actual room list, furniture already requested, stated storage needs, household habits, accessibility needs, available space and budget. When useful, ask one short question about priorities (for example extra storage, work-from-home, children or senior-friendly use); do not assume those household facts. Propose a small ranked set of genuinely relevant extras, usually 2-5 for a full home, fewer for a limited scope. Do not fill a quota, duplicate existing scope, upsell expensive features without a reason, or propose items outside the contractor's capabilities. Explain the specific benefit and any condition to confirm for THIS home, not generic advertising.
Confirmed customer-requested extras belong in rooms[].items with optional:true. Always generate tailored recommendations as part of the quotation JSON; do not wait for a separate request for ideas. Your own new recommendations belong ONLY in the required output root suggested_addons array, never in separate prose or automatically in rooms[].items. Each entry must be {"room_index":0,"reason":"Why this fits the supplied home brief; what needs confirming","item":{...one complete DraftItem...}}. room_index is the zero-based index of an existing room. item must contain name, work_type, size_text, measure:{unit,per_item}, quantity, pvc:{eligible,parts}, optional:true and source_text_en. Use the exact current catalogue work_type only when it truly matches the work. Never map a specialised hardware item to a different work type just to invent a price.
Use null for unconfirmed dimensions, measured area, quantity or PVC eligibility; use an empty parts array until contact areas are confirmed. A suggestion may use a known catalogue billing unit, but no invented dimensions, rates, quantities or guarantees. Do not put suggestion-only unknowns in the main needs_clarification list: they are not yet part of the agreed scope. Do not include recommendation prices or a new rate_card_updates entry without owner-confirmed rates. Suggestions remain outside rooms and totals until the owner selects Add as optional, then reviews missing measurements and prices in the app. The customer can select an approved optional item after publication. Always include suggested_addons; use [] only when there is no useful, non-duplicating recommendation for the supplied brief. Missing suggestion measurements alone are not a reason to omit useful ideas; leave those fields null and explain what to confirm in reason.
Examples to consider only if relevant and not already quoted: a folding desk for a compact bedroom needing a work surface; an adjustable shelf arrangement for stated storage needs; a shoe console for a clear foyer with no shoe storage; a dedicated crockery cabinet when the kitchen/dining brief identifies that need. Phrase uncertain suitability as a condition to confirm, and tailor every reason to the actual brief.

5. OUTPUT COMMANDS
During the interview, ask concise questions. ALWAYS use COPY-AND-PASTE FORMAT for the final quotation or rate-card response: on “Studio JSON”, “Give me JSON”, “Publish” or any request for final output, return ONE complete valid UTF-8 JSON object inside ONE fenced json code block so the owner has a Copy button. Do not split it into multiple blocks. Put no headings, explanations or text outside the block, no trailing commas, and no abbreviated objects or ellipses. The app accepts either the copied code contents or the whole fenced block. “Publish” prepares JSON only. The owner then opens /owner, pastes or uploads JSON, reviews customer/scope/rates/clarifications, chooses the clickable default package card, and selects Save & publish quotation. The app creates the real private link. Customers can choose a whole-home package or room packages/PVC, save their selection, download PDF and send or save change requests. A customer selection is a preference, not a verified payment.
FINAL SELF-CHECK BEFORE OUTPUT: correct schema_version and output_language; explicit is_demo:false for real work; complete customer and scope fields or precise clarification questions; eligible:true always has non-empty approved PVC parts; suggested_addons is present, uses existing zero-based room indices, has optional:true on each item, and does not duplicate quoted scope. Keep unconfirmed measurements null. Return the whole corrected object in one copyable json code block, not a patch or a list of errors.
“Review” returns a concise English review and open questions. A correction updates only the targeted facts and removes questions that were actually answered. “New quotation” starts a clean customer scope; keep the supplied rate-card snapshot unless the owner changes it.

6. CURRENT RATE-CARD SNAPSHOT (INR PER LISTED UNIT)
${workTypeLines}

APPROVED BRAND POOLS
${brandLines}

7. STRUCTURE EXAMPLE — replace the sample scope with confirmed facts
This example deliberately leaves the floor-plan checkbox false and customer details unknown. Set is_floor_plan_estimate to true only for a confirmed supplied-floor-plan quotation. Do not retain its sample wardrobe or dimensions in an unrelated quotation; use the confirmed facts for that job.
${jsonFence}json
${JSON.stringify(example, null, 2)}
${jsonFence}`;
}

export interface LuxuryImagePromptItem {
  id: string;
  slotName: string;
  whereUsed: string;
  defaultImageUrl: string;
  aspectRatio: string;
  prompt: string;
}

export const LUXURY_IMAGE_PROMPTS: LuxuryImagePromptItem[] = [
  {
    id: 'hero-living-room',
    slotName: 'Quotation Hero Banner — Luxury Living Room',
    whereUsed: 'Top Right Arch Banner on Customer Quotation ("Build Your Dream Home")',
    defaultImageUrl: '/assets/ume-living.jpg',
    aspectRatio: '16:9',
    prompt:
      'Warm luxury Indian apartment living room interior in Hyderabad, floor-to-ceiling vertical fluted teak wood wall paneling, warm recessed brass pendant lamp, plush cream L-shaped sofa with neutral linen cushions, travertine marble coffee table with indoor tropical plant in glass vase, warm sunlight, Architectural Digest photography, 8k photorealistic --ar 16:9',
  },
  {
    id: 'pkg-base',
    slotName: 'Standard Package Card Visual — Wardrobe, Loft & Dressing Carpentry',
    whereUsed: 'Choose a Package -> Standard Package Card',
    defaultImageUrl: '/assets/pkg-standard.webp',
    aspectRatio: '1:1',
    prompt:
      'Clean modern minimalist Indian master bedroom interior, warm oak and cream SF suede matte laminated wardrobe, cozy upholstered bed with soft warm sconce lighting, neat dressing table, bright airy residential apartment, photorealistic interior design photography, 8k --ar 1:1',
  },
  {
    id: 'pkg-normal',
    slotName: 'Normal Package Card Visual — Modular Kitchen, Louvers & Tandem Units',
    whereUsed: 'Choose a Package -> Normal Package Card',
    defaultImageUrl: '/assets/pkg-normal.webp',
    aspectRatio: '1:1',
    prompt:
      'Contemporary luxury apartment living and dining room in Hyderabad, custom walnut and champagne matte laminated TV unit with fluted wood louvers, warm LED strip cove lighting, beige sofa, indoor plants, high-end residential carpentry showcase, 8k --ar 1:1',
  },
  {
    id: 'pkg-premium',
    slotName: 'Premium Package Card Visual — Bespoke BWP 710 Marine & Louver Console',
    whereUsed: 'Choose a Package -> Premium Package Card',
    defaultImageUrl: '/assets/pkg-premium.webp',
    aspectRatio: '1:1',
    prompt:
      'Ultra-luxury bespoke Indian residential master suite and modular kitchen showcase, rich dark walnut veneer and champagne high-gloss laminate cabinetry, brass profile handles, warm architectural chandelier and cove lighting, 5-star hotel suite aesthetic, 8k photorealistic --ar 1:1',
  },
  {
    id: 'room-master',
    slotName: 'Master Bedroom Thumbnail',
    whereUsed: 'Room-by-Room Selection -> Master Bedroom Row',
    defaultImageUrl: '/assets/pkg-standard.webp',
    aspectRatio: '4:3',
    prompt:
      'Luxury Master Bedroom interior in Hyderabad apartment, full-height sliding and hinged wardrobe with overhead loft shutters in warm cashmere and teak laminate, integrated dressing table with mirror and folding study desk, warm lighting, 8k --ar 4:3',
  },
  {
    id: 'room-children',
    slotName: 'Children Bedroom & Study Thumbnail',
    whereUsed: 'Room-by-Room Selection -> Children Bedroom Row',
    defaultImageUrl: '/assets/ume-commercial.jpg',
    aspectRatio: '4:3',
    prompt:
      'Modern Children Bedroom interior with custom plywood wardrobe, overhead loft cabinets, and ergonomic box-type study table with floating bookshelf in soft sage and warm wood laminate finish, bright natural light, 8k --ar 4:3',
  },
  {
    id: 'room-kitchen',
    slotName: 'Modular Kitchen & Breakfast Counter Thumbnail',
    whereUsed: 'Room-by-Room Selection -> Kitchen Row',
    defaultImageUrl: '/assets/ume-kitchen.jpg',
    aspectRatio: '4:3',
    prompt:
      'Luxury Indian Modular Kitchen with BWP plywood base and wall cabinets, soft-close tandem drawer baskets, breakfast counter with wooden wall paneling and mini crockery unit, under-cabinet warm LED lighting, quartz countertop, 8k --ar 4:3',
  },
  {
    id: 'room-pooja',
    slotName: 'Pooja Mandir & CNC Jali Door Thumbnail',
    whereUsed: 'Room-by-Room Selection -> Pooja Room Row',
    defaultImageUrl: '/assets/pkg-normal.webp',
    aspectRatio: '4:3',
    prompt:
      'Serene traditional-modern Indian Pooja Mandir room with intricately carved CNC lattice jali and glass double doors, warm teak wood paneling, backlit brass bells and warm cove lighting, luxury residential carpentry, 8k --ar 4:3',
  },
  {
    id: 'room-hall',
    slotName: 'Hall & Dining TV Unit with Louvers Thumbnail',
    whereUsed: 'Room-by-Room Selection -> Hall & Dining Row',
    defaultImageUrl: '/assets/ume-living.jpg',
    aspectRatio: '4:3',
    prompt:
      'Grand Indian Hall and Dining room featuring a designer box-type TV unit with vertical charcoal and teak wood louver wall paneling, warm cove lighting, and main door entrance paneling, 8k architectural photography --ar 4:3',
  },
];


