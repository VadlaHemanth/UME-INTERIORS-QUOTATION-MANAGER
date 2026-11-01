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
    return 'Kitchen Base Cabinet';
  }
  if (lower === 'wall cabinet unit' || lower === 'wall cabinet') {
    return 'Kitchen Overhead Wall Cabinet';
  }
  if (lower.includes('kitchen cabinet unit (opposite to base cabinet)')) {
    return 'Kitchen Full-Height Utility Cabinet';
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
    return 'Modular Tandem / SS 304 Pull-Out Baskets';
  }
  if (lower === 'pooja mandir' || (lower.includes('room') && lower.includes('pooja'))) {
    return 'Pooja Mandir Unit';
  }
  if (lower === 'pooja doors and glass or cnc doors with wall paneling') {
    return 'Pooja Entrance Frame & CNC / Glass Double Doors';
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
 * - Injects the standard carcass depth in inches (e.g., 21" depth, 12" depth) directly into the item description when applicable
 */
export function formatCleanItemDescription(
  rawSourceText: string,
  itemName: string,
  workType: string,
  roomName = ''
): string {
  const depthIn = resolveStandardDepthInches(itemName, workType, roomName);
  const raw = (rawSourceText || '').trim();

  let cleaned = raw
    // Remove trailing ", 9.9 ft by 11.9 ft (117.81 sq ft)." or similar dimension suffixes
    .replace(/,?\s*\d+(?:\.\d+)?\s*ft\s*(?:by|×|x)\s*\d+(?:\.\d+)?\s*ft\s*\([^)]*sq\s*ft\)\.?\s*$/i, '')
    .replace(/\s+\d+(?:\.\d+)?\s*ft\s*(?:by|×|x)\s*\d+(?:\.\d+)?\s*ft\s*\([^)]*sq\s*ft\)\.?\s*$/i, '')
    // Replace "High Gloss or SF laminate finish" / "SF Matte or High-Gloss laminate finish" with "outside laminate finish"
    .replace(/outside\s+(?:1\.?0?\s*mm\s+)?(?:High[-\s]*Gloss\s+or\s+SF|SF\s+(?:Matte\s+)?or\s+High[-\s]*Gloss)\s+laminate\s+finish/gi, 'outside laminate finish')
    .replace(/both\s+sides\s+(?:1\.?0?\s*mm\s+)?(?:High[-\s]*Gloss\s+or\s+SF|SF\s+(?:Matte\s+)?or\s+High[-\s]*Gloss)\s+laminate\s+finish/gi, 'both sides laminate finish')
    .replace(/High[-\s]*Gloss\s+or\s+SF\s+laminate\s+finish/gi, 'outside laminate finish')
    // Remove "0.8mm " / "0.8 mm " / "1mm " / "1.0mm " before "inside laminate" or "outside laminate" under the unit
    .replace(/\b0\.8\s*mm\s+inside\s+laminate\b/gi, 'inside laminate')
    .replace(/\b1(?:\.0)?\s*mm\s+outside\s+laminate\b/gi, 'outside laminate')
    .trim();

  if (cleaned && !cleaned.endsWith('.')) {
    cleaned += '.';
  }

  if (depthIn) {
    const hasDepthMention = /\b\d{1,2}\s*(?:"|''|in\b|inch\b|inches\b)|\bcarcass\s+depth\b/i.test(
      cleaned
    );
    if (!hasDepthMention) {
      cleaned = `${depthIn}" carcass depth · ${
        cleaned || 'With inside laminate and outside laminate finish.'
      }`;
    }
  }

  return cleaned || 'With inside laminate and outside laminate finish.';
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
      upiId: '9491661555@oksbi',
      upiLimitRupees: 100000,
    },
  },
  highGlossSheetUpgradeDelta: 0,
  grades: {
    Base: {
      grade: 'Base',
      displayLabel: 'Standard',
      tagline: 'BWP 710 & 303 Grade Plywood with Laminate Finish',
      warrantyBanner: '1.0mm Outside Laminate & Standard Hardware Included',
      termiteProofBadge: 'BWP 710 & Commercial 303 Grade Plywood',
      pvcRecommendationNote:
        'Optional Add-On: 6mm PVC Board at wall, slab, and floor contact areas (+₹75/sq.ft on eligible units).',
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
      warrantyBanner: '20 / 15 / 10 Years Manufacturer Brand Warranty',
      termiteProofBadge: 'BWR 710 & 303 Grade Plywood',
      pvcRecommendationNote:
        'Optional Add-On: 6mm PVC Board at wall, slab, and floor contact areas (+₹75/sq.ft on eligible units).',
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
      warrantyBanner: '30 / 25 / 21 Years Manufacturer Brand Warranty',
      termiteProofBadge: 'BWP 710 Marine Grade Plywood',
      pvcRecommendationNote:
        'Optional Add-On: 6mm PVC Board at wall, slab, and floor contact areas (+₹75/sq.ft on eligible units).',
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
      label: 'Box type',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Full 5-sided plywood carcass (top, bottom, two sides, and back panel) with internal shelves, 0.8mm inside laminate, and hinged or sliding shutters with 1mm outside laminate finish. Billed by front-face area (Height × Width).',
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
      label: 'Frame type',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Perimeter plywood frame anchored directly to existing masonry recess or granite/kadappa shelves, fitted with laminated shutters on the front face. Billed by front-face area (Height × Width).',
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
      label: 'Loft - frame and shutter',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Overhead storage closure above a concrete loft slab or wardrobe top, consisting of a seasoned plywood frame and hinged shutters with 0.8mm inside laminate and 1mm outside laminate finish.',
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
      label: 'Low roof - frame and shutter',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Frame and shutter storage built under a sunken slab / low-roof ledge, finished with 0.8mm inside laminate and 1mm outside laminate finish.',
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
      label: 'Folding table',
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
      label: 'Wood wall paneling',
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
      label: 'Wood wall paneling (under wall cabinet)',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Slim underside or backsplash plywood panelling beneath kitchen wall cabinets finished with 1mm outside laminate finish.',
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
      label: 'Louvers wall paneling',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Decorative fluted charcoal/wood louver and 1mm outside laminate wall panelling for TV units or above main door entrances.',
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
      label: 'Pooja CNC / glass door paneling',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Pooja room entrance framing and double doors incorporating decorative CNC jali / glass cut-outs and 1mm outside laminate finish.',
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
      label: 'Tandem or SS baskets',
      unit: 'each',
      plainEnglishDefinition:
        'Modular kitchen pull-out Tandem drawer box or stainless-steel (SS 304) basket complete with soft-close telescopic channels and fitting.',
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
      label: 'Wall mount bed',
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
      label: 'Mirror wall paneling',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Plywood backing panel with polished mirror mounting for dressing zones.',
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
      label: 'False ceiling (Saint Gobain)',
      unit: 'sq_ft',
      plainEnglishDefinition:
        'Gypsum false ceiling using Saint-Gobain boards and GI perimeter/intermediate channels.',
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
    'Laminate Thickness Standard: Internal balancing/liner laminate is industry-standard 0.8 mm class (actual manufacturer sheet gauge is 0.72 mm to 0.80 mm as per ISI/market tolerance). Outside decorative laminate is 1.0 mm thickness in the customer’s choice of finish (SF Matte or High-Gloss at same price).',
    'For acrylic sheets, Aluminium profile doors, heavy glass, and bespoke CNC design work, additional charges are applicable as per selection.',
    'Outside 1.0 mm decorative laminate is applied strictly on visible exterior surfaces.',
    'If the customer selects hardware or plywood outside the listed allowance/brands, the rate difference is payable at actuals.',
    'For any additional internal drawers beyond standard layout, ₹5,000 per drawer is charged on Premium/2026 quotes (₹4,500–₹4,000 on historical quotes as specified).',
    'All prices shown are all-inclusive for the listed material and labour scope.',
  ],
  termsAndConditions: [
    {
      id: 1,
      title: 'Order Confirmation Booking (₹50,000)',
      clause:
        'The customer must pay ₹50,000 (or above) as booking advance to confirm the work order and freeze the quoted material rates. This verified booking payment counts once toward the 50% work-start advance.',
      source: 'Supplied PDF',
    },
    {
      id: 2,
      title: '50% Work-Start Advance',
      clause:
        'The customer must complete 50% of the total quotation value (less the verified ₹50,000 booking already paid) prior to material dispatch and commencement of carpentry work at site.',
      source: 'Supplied PDF',
    },
    {
      id: 3,
      title: '35% Milestone Upon Plywood Structure Completion',
      clause:
        'The customer must pay 35% of the total quotation value immediately upon completion of all plywood carcass and framing work at site.',
      source: 'Supplied PDF',
    },
    {
      id: 4,
      title: '10% Milestone After Outside Laminate Completion',
      clause:
        'The customer must pay 10% of the total quotation value upon completion of outside 1.0mm laminate pressing and shutter hanging.',
      source: 'Supplied PDF',
    },
    {
      id: 5,
      title: '5% Final Balance Before Handover',
      clause:
        'The customer must pay the final 5% balance in full prior to final hardware alignment and formal site handover.',
      source: 'Supplied PDF',
    },
    {
      id: 6,
      title: 'Immediate Settlement for Extra Work',
      clause:
        'Any extra work, additional drawers, or scope additions requested during execution must be approved in writing and paid immediately upon completion of that item.',
      source: 'Supplied PDF',
    },
    {
      id: 7,
      title: 'Final Site Cleaning Responsibility',
      clause:
        'Carpentry debris will be stacked neatly by the execution team; final deep site cleaning after work completion is the client’s responsibility.',
      source: 'Supplied PDF',
    },
    {
      id: 8,
      title: 'Quotation Validity & Site Measurement Reconciliation',
      clause:
        'This quotation is valid for 30 calendar days from the issue date. Where initial quantities are prepared from floor plans, final billing is reconciled against physical site laser/tape measurements before laminate stage.',
      source: 'Supplied PDF',
    },
    {
      id: 9,
      title: 'Laminate Gauge & Finish Specification (0.8mm / 0.72mm Note)',
      clause:
        'Internal balancing liner laminate is standard 0.8 mm market category (actual factory sheet thickness ranges between 0.72 mm and 0.80 mm as per manufacturer tolerance). Outside laminate is 1.0 mm thickness in the customer’s selected SF Matte or High-Gloss finish at no price difference.',
      source: 'Owner-Approved Hyderabad Protection',
    },
    {
      id: 10,
      title: 'Materials, Approved Alternatives & Manufacturer Warranties',
      clause:
        'Listed alternatives allow sourcing within the approved brand schedule for each package; any different product requires written customer confirmation before purchase. Manufacturer plywood warranties (30/25/21 years on Premium or 20/15/10 years on Normal) are governed by the actual selected product’s manufacturer certificate, invoice, and terms.',
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
  const workTypeLines = Object.values(catalogue.workTypes)
    .map(
      (wt) =>
        `  - "${wt.label}" (unit: "${wt.unit}") -> Standard (schema key "Base"): ₹${wt.rates.Base.Standard} (With PVC: ₹${wt.rates.Base['With PVC']}) | Normal (schema key "Normal"): ₹${wt.rates.Normal.Standard} (With PVC: ₹${wt.rates.Normal['With PVC']}) | Premium (schema key "Premium"): ₹${wt.rates.Premium.Standard} (With PVC: ₹${wt.rates.Premium['With PVC']})`
    )
    .join('\n');

  const depthScheduleLines = STANDARD_DEPTH_SCHEDULE_INCHES.map(
    (d) => `  - ${d.categoryLabel}: ${d.depthInches}" (${d.depthInches} inches)`
  ).join('\n');

  return `You are Quotation Studio, the private Unified Quotation & Rate Card Assistant for UMAMAHESHWARA INTERIORS (Umamaheshwara Enterprises — Residential and Commercial Interior Designers, Chengicherla, Hyderabad, Proprietor: V. Subhash, +91 9491661555).

Your job is to handle BOTH Quotation creation AND Rate Card memory in ONE single conversation, whether I speak/type step-by-step or paste site notes in Telugu, Hindi, English, Roman Telugu, Roman Hindi, or a mix.

====================================================================
1. CONVERSATIONAL STEP-BY-STEP INTERVIEW MODE (WHEN STARTING A QUOTE)
====================================================================
When I say "I want to create a new quotation" or "New quotation" (or give partial details), guide me through these 4 quick steps before outputting the final JSON:

STEP 1 — CUSTOMER & SITE LOCATION:
- Ask: "What is the Customer's Name, Mobile Number, and Site Location / Address?"
- LOCATION & GOOGLE MAPS RULE: If I share a Google Maps link, coordinates, pin, or apartment/colony landmark in Hyderabad (e.g., "Navya Pinnacle Uppal Bhagayath" or "Peerzadiguda Plot 63"), extract and format the complete, clean English postal address for customer.site.

STEP 2 — ROOM-BY-ROOM SPECIFICATIONS, DIRECT CARCASS DEPTHS & CLEAN NAMING:
- Ask for each room (Master Bedroom, Children Bedroom, Guest Bedroom, Kitchen, Pooja, Hall & Dining, etc.) what items are included, their work_type (Box type, Frame type, Loft - frame and shutter, etc.), and dimensions (e.g., 7 ft × 8 ft).
- CLEAN MARKET-STANDARD TERMINOLOGY & DESCRIPTION RULES:
  1) Use clean, direct English names in "name" WITHOUT parenthetical brackets:
     - "Kitchen Base Cabinet" (instead of raw "base cabinet" or bracketed labels)
     - "Kitchen Overhead Wall Cabinet" (instead of raw "wall cabinet")
     - "Modular Wardrobe" (for Box type) or "Wardrobe Frame and Shutter" (for Frame type)
     - "Loft Frame and Shutter"
     - "Dressing Table", "Study Table Workstation", "Wall-Mounted Folding Table", "TV Media Console with Louvers", "Shoe Rack Console"
  2) In "source_text_en", write a clean, concise specification sentence:
     - Mention the exact carcass depth in inches directly in "source_text_en" for box/table units using the schedule below (e.g., "21\\" carcass depth · Box-type wardrobe with inside laminate and outside laminate finish.").
     - Write "with inside laminate and outside laminate finish" (do NOT mention "0.8mm" or "High Gloss or SF" under every unit; laminate thickness and finish details are already stated in the Material Schedule & Terms).
     - NEVER repeat the dimensions or sq.ft area inside "source_text_en" (because "size_text" and "measure" already display those in their own columns).
- STANDARD CARCASS DEPTHS TO INCLUDE DIRECTLY IN EACH ITEM'S RESPONSE (ALL IN INCHES):
${depthScheduleLines}

STEP 3 — RATE CARD CHECK, CUSTOM ITEMS & DEFAULT SENDING PACKAGE:
- Ask specifically:
  1) "Should I use your Default Rate Card prices below, or would you like to set custom Box / Frame / Loft / PVC extra prices for Standard (Base), Normal, and Premium on this quotation?"
  2) "If you mentioned any new work item not in the default Rate Card (such as a special Wall-mounted study table, Folding table, Profile glass door, etc.), what unit (sq_ft / running_ft / each / lumpsum) and Standard (Base) / Normal / Premium rates should I save to the Rate Card for it?"
  3) "Which Default Package (Standard [key: Base], Normal [key: Normal], or Premium [key: Premium]; with or without optional 6mm PVC) should the customer see first when they open the quotation link?"

STEP 4 — MEMORY RULE & SINGLE UNIFIED JSON OUTPUT:
- Whenever a new work item or custom rate is defined in our conversation, SAVE it in your active conversation memory so you automatically reuse it on future rooms and future quotations without asking again.
- Once I confirm or say "Give me the JSON" / "Studio JSON", output ONLY ONE raw, valid UTF-8 English JSON object (no Markdown fences, no commentary) that includes BOTH the quotation AND "rate_card_updates" so UME Quotation Studio automatically saves any new work types into the database and generates the quotation in a single paste!

====================================================================
2. DEFAULT RATE CARD MEMORY (AUTO-SYNCED FROM UME STUDIO DATABASE)
====================================================================
Current Active Work Types & Default Unit Rates (INR):
${workTypeLines}

Approved Plywood Packages & Brand Pools (SF Matte & High-Gloss are the EXACT SAME PRICE):
- Customer Display "Standard" (JSON schema key "Base"): Garjan 710, 303 Suraksha, Wildwood BWP, Swadeshi Plywood BWP
- Customer Display "Normal" (JSON schema key "Normal"): BWR 710 Grade (20 Yrs), BWR / 303 Grade (15 Yrs), 303 Grade (10 Yrs) (20 / 15 / 10 Yrs Manufacturer Warranty as per certificate)
- Customer Display "Premium" (JSON schema key "Premium"): Flaer Ply (SMART), Saburi (Gold), Siam (Club Gold), Austin (Gold), Green Ply (Optima G), Century Ply (Bond Shield) (BWP 710 Marine Grade — 30 / 25 / 21 Yrs Manufacturer Warranty as per certificate)
Optional Wall Protection: "Standard" (No PVC) | "With PVC" (Optional +₹75/sq.ft 6mm PVC Board at Wall, Slab & Floor Contact Areas)

--------------------------------------------------------------------
3. UNIFIED ENGLISH-ONLY JSON SCHEMA ("quotation-studio.draft.v2")
--------------------------------------------------------------------
Every key and value MUST be in English only. Translate Telugu/Hindi meaning (e.g., "rendu lockers" -> quantity: 2, "okatinnara adugulu" / "dedh foot" -> 1.5 ft). Never include native script or Romanised Telugu/Hindi words in source_text_en.

Include "rate_card_updates" whenever a new work element is introduced OR when custom Base/Normal/Premium rates are set for this quotation:
{
  "schema_version": "quotation-studio.draft.v2",
  "output_language": "en",
  "is_demo": false,
  "languages": ["te", "en"],
  "customer": {
    "name": "Customer Full Name",
    "site": "Full English Site Address, Hyderabad, Telangana",
    "phone": "9849011223"
  },
  "quote": {
    "number": "UME-2026-1025",
    "date": "2026-11-01",
    "valid_until": "2026-12-01"
  },
  "recommended": {
    "grade": "Base",
    "protection": "Standard",
    "finish": "SF",
    "brand_preference": "Garjan 710"
  },
  "rate_card_updates": {
    "Wall-mounted study table": {
      "label": "Wall-mounted study table",
      "unit": "sq_ft",
      "plainEnglishDefinition": "20\\" carcass depth · Wall-mounted floating study table with drawer storage, 0.8mm inside laminate, and outside laminate finish.",
      "pvcDefaultEligible": true,
      "pvcDefaultParts": ["Wall-contact back panel"],
      "rates": {
        "Base": { "Standard": 850, "With PVC": 925 },
        "Normal": { "Standard": 950, "With PVC": 1025 },
        "Premium": { "Standard": 1150, "With PVC": 1225 }
      }
    }
  },
  "rooms": [
    {
      "name": "Master Bedroom",
      "recommended": null,
      "items": [
        {
          "name": "Study Table Workstation",
          "work_type": "Wall-mounted study table",
          "size_text": "4 ft × 2 ft",
          "measure": { "unit": "sq_ft", "per_item": 8 },
          "quantity": 1,
          "pvc": { "eligible": true, "parts": ["Wall-contact back panel"] },
          "optional": false,
          "source_text_en": "20\\" carcass depth · Wall-mounted study table workstation with 0.8mm inside laminate and outside laminate finish.",
          "custom_rates": { "Base": 850, "Normal": 950, "Premium": 1150, "pvc_adder": 75 }
        }
      ]
    }
  ],
  "owner_requests": [],
  "needs_clarification": []
}`;
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
    defaultImageUrl: '/assets/pkg-standard.svg',
    aspectRatio: '1:1',
    prompt:
      'Clean modern minimalist Indian master bedroom interior, warm oak and cream SF suede matte laminated wardrobe, cozy upholstered bed with soft warm sconce lighting, neat dressing table, bright airy residential apartment, photorealistic interior design photography, 8k --ar 1:1',
  },
  {
    id: 'pkg-normal',
    slotName: 'Normal Package Card Visual — Modular Kitchen, Louvers & Tandem Units',
    whereUsed: 'Choose a Package -> Normal Package Card',
    defaultImageUrl: '/assets/pkg-normal.svg',
    aspectRatio: '1:1',
    prompt:
      'Contemporary luxury apartment living and dining room in Hyderabad, custom walnut and champagne matte laminated TV unit with fluted wood louvers, warm LED strip cove lighting, beige sofa, indoor plants, high-end residential carpentry showcase, 8k --ar 1:1',
  },
  {
    id: 'pkg-premium',
    slotName: 'Premium Package Card Visual — Bespoke BWP 710 Marine & Louver Console',
    whereUsed: 'Choose a Package -> Premium Package Card',
    defaultImageUrl: '/assets/pkg-premium.svg',
    aspectRatio: '1:1',
    prompt:
      'Ultra-luxury bespoke Indian residential master suite and modular kitchen showcase, rich dark walnut veneer and champagne high-gloss laminate cabinetry, brass profile handles, warm architectural chandelier and cove lighting, 5-star hotel suite aesthetic, 8k photorealistic --ar 1:1',
  },
  {
    id: 'room-master',
    slotName: 'Master Bedroom Thumbnail',
    whereUsed: 'Room-by-Room Selection -> Master Bedroom Row',
    defaultImageUrl: '/assets/pkg-standard.svg',
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
    defaultImageUrl: '/assets/pkg-normal.svg',
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


