import { FinishOption, PlywoodGrade, ProtectionOption } from './schema';
import { canonicalFurnitureName, FURNITURE_VOCABULARY } from './furniture';
import { documentTerms, materialLines, packageAllowances, scopeNotes, type MaterialWording, type PackageAllowances } from './commercial-spec';

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
  displayLabel: 'Basic' | 'Standard' | 'Premium';
  allowances?: PackageAllowances;
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
 * Stable storage keys map to the public Basic / Standard / Premium package names.
 */
export function getPackageDisplayName(grade: PlywoodGrade): 'Basic' | 'Standard' | 'Premium' {
  if (grade === 'Base') return 'Basic';
  if (grade === 'Normal') return 'Standard';
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
  return canonicalFurnitureName(rawName || '', workType, roomName);
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
    .replace(/with\s+(?:0\.8\s*mm\s+)?inside\s+laminate\s+and\s+(?:1\.?0?\s*mm\s+)?outside\s+laminate\s+finish/gi, 'with inside and outside laminate finish')
    .replace(/draws\b/gi, 'drawers')
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
  materialWording?: MaterialWording;
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
  version: 'ume-catalogue-2026.11.v8',
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
      displayLabel: 'Basic',
      allowances: { handleRupees: 200, laminateSheetRupees: 1500, extraDrawerRupees: 4000, includedBedroomDrawersMin: 2, includedBedroomDrawersMax: 4 },
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
      displayLabel: 'Standard',
      allowances: { handleRupees: 200, laminateSheetRupees: 1500, extraDrawerRupees: 5000, includedBedroomDrawersMin: 2, includedBedroomDrawersMax: 4 },
      tagline: 'BWR 710 / 303 Grade Plywood — Up to 15 Years Brand Warranty',
      warrantyBanner: 'Up to 15 years manufacturer warranty with brand certificate, depending on the selected product',
      termiteProofBadge: 'BWR 710 & 303 Grade Plywood',
      pvcRecommendationNote:
        'Optional 6 mm PVC board at the specified wall, slab and floor contact areas. The applicable item rate is shown in the quotation.',
      plainEnglishSummary:
        'BWR 710 / 303 grade plywood with inside and outside laminate finish. Up to 15 years manufacturer warranty, subject to the selected product, certificate and invoice.',
      outerLaminateAllowance:
        '1.0 mm External Decorative Laminate — SF Matte or High-Gloss (Same Price, worth up to ₹1,500/sheet)',
      handleAllowance: 'Handles worth up to ₹200 each',
      approvedBrands: [
        {
          name: 'BWR 710 Grade (15 Yrs)',
          spec: 'BWR 710 Grade Plywood (15 Years Manufacturer Warranty)',
          warrantyYears: 15,
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
      allowances: { handleRupees: 200, laminateSheetRupees: 1500, extraDrawerRupees: 6000, includedBedroomDrawersMin: 2, includedBedroomDrawersMax: 4 },
      tagline: 'BWP 710 Marine Grade Plywood — 30 / 25 / 21 Yrs Brand Warranty',
      warrantyBanner: 'Up to 30 years manufacturer warranty with brand certificate, depending on the selected BWP product',
      termiteProofBadge: 'BWP 710 Marine Grade Plywood',
      pvcRecommendationNote:
        'Optional 6 mm PVC board at the specified wall, slab and floor contact areas. The applicable item rate is shown in the quotation.',
      plainEnglishSummary:
        'BWP 710 marine-grade plywood across listed units with 30 / 25 / 21 years manufacturer warranty (governed by the selected product certificate and invoice), 0.8 mm inside liner laminate, and 1.0 mm outside laminate finish.',
      outerLaminateAllowance:
        '1.0 mm External Decorative Laminate — SF Matte or High-Gloss (Same Price, worth up to ₹1,500/sheet)',
      handleAllowance: 'Handles worth up to ₹200 each',
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
    'Handles (worth up to ₹200 each in Basic, Standard and Premium)',
    'Woodworking adhesive: Fevicol and Jeevanjor.',
  ],
  workTypes: {
    'Additional internal drawer': {
      id:'Additional internal drawer', label:'Additional Internal Drawer', unit:'each',
      plainEnglishDefinition:'An additional internal drawer beyond the included bedroom wardrobe layout, with the approved channels and fittings.',
      pvcDefaultEligible:false, pvcDefaultParts:[],
      rates:{Base:{Standard:4000,'With PVC':4000},Normal:{Standard:5000,'With PVC':5000},Premium:{Standard:6000,'With PVC':6000}},
      highGlossPremiumPerUnit:0,
    },
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
    'Box-type bedroom wardrobes include 2–4 internal drawers, subject to size and the approved layout. Additional internal drawers cost Basic ₹4,000, Standard ₹5,000 and Premium ₹6,000 each, unless otherwise specified.',
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
        'Materials are sourced from the selected package’s approved brand list. Alternatives require written approval. Manufacturer plywood warranty is up to 15 years for Standard and up to 30 years for Premium, depending on the selected brand and product. The applicable brand warranty certificate, invoice and manufacturer terms govern coverage; this is not a blanket warranty on the entire furniture installation.',
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
      'Rate card lo kotha items add cheyandi: 1) Curtain / AC pelmet box running ft basis Base 350, Normal 400, Premium 450. 2) Cushioned bed headboard panelling sq ft basis Base 650, Normal 750, Premium 850. 3) Additional internal drawer unit each basis Base 4000, Normal 5000, Premium 6000.',
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
            Normal: { Standard: 5000, 'With PVC': 5000 },
            Premium: { Standard: 6000, 'With PVC': 6000 },
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

        // Item-specific prices remain on the item. They must not silently undo
        // a later edit to a reusable rate-card entry.
        if (!exists) {
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
          const existingPvcAdder = existingDef
            ? Math.max(
                0,
                existingDef.rates.Premium['With PVC'] - existingDef.rates.Premium.Standard
              )
            : 0;
          const pvcAdder =
            typeof cr?.pvc_adder === 'number'
              ? cr.pvc_adder
              : existingPvcAdder;

          nextCat.workTypes[wt] = {
            id: wt,
            label: wt,
            unit,
            plainEnglishDefinition:
              existingDef?.plainEnglishDefinition ||
              item?.source_text_en ||
              `Custom residential interior work (${wt}) executed with calibrated plywood and 1mm laminate finish, billed per ${unit}.`,
            pvcDefaultEligible: existingDef?.pvcDefaultEligible ?? pvcAdder > 0,
            pvcDefaultParts: existingDef?.pvcDefaultParts || (pvcAdder > 0 ? ['Back panel'] : []),
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
    `- work_type ${JSON.stringify(key)}; unit ${JSON.stringify(wt.unit)}; Basic (Base) ${wt.rates.Base.Standard}, with PVC ${wt.rates.Base['With PVC']}; Standard (Normal) ${wt.rates.Normal.Standard}, with PVC ${wt.rates.Normal['With PVC']}; Premium ${wt.rates.Premium.Standard}, with PVC ${wt.rates.Premium['With PVC']}. Display label: ${wt.label}.`
  ).join('\n');
  const brandLines = Object.entries(catalogue.grades).map(([key, grade]) =>
    `- ${getPackageDisplayName(key as PlywoodGrade)} (schema key ${JSON.stringify(key)}): ${grade.approvedBrands.map((brand) => `${brand.name} — ${brand.spec}; ${brand.warrantyYears > 0 ? `${brand.warrantyYears} years manufacturer warranty subject to brand certificate and invoice` : 'manufacturer terms apply, no fixed warranty period promised'}`).join(' | ')}.`
  ).join('\n');
  const jsonFence = '```';
  const example = {
    schema_version: 'quotation-studio.draft.v2', output_language: 'en', is_demo: false,
    languages: ['en'], customer: { name: null, site: null, phone: null },
    quote: { number: null, date: null, valid_until: null, notes: [], is_floor_plan_estimate: false, show_recommended_package: false },
    recommended: { grade: 'Base', protection: 'Standard', finish: 'SF', brand_preference: null },
    rooms: [{ name: 'Master Bedroom', recommended: null, items: [{
      name: 'Wardrobe Cabinet', work_type: 'Box type', size_text: '7 ft × 8 ft',
      measure: { unit: 'sq_ft', per_item: 56 }, quantity: 1,
      optional: false,
      source_text_en: 'Box-type wardrobe with inside and outside laminate finish.',
    }] }], owner_requests: [], needs_clarification: [
      { path: '/customer/name', question: 'What is the customer’s full name?' },
      { path: '/customer/site', question: 'What is the full site address?' },
      { path: '/customer/phone', question: 'What is the customer’s mobile number?' },
    ],
    suggested_addons: [{room_index: 0, reason: 'A fold-away desk could add a compact work surface alongside the wardrobe. Confirm that the household needs a desk and has a clear wall before adding it.', item: {
      name: 'Wall-Mounted Folding Table', work_type: 'Folding table', size_text: null,
      measure: {unit: 'sq_ft', per_item: null}, quantity: null,
      optional: true,
      source_text_en: 'Fold-away wall desk with laminate finish and folding brackets; final specification to be confirmed.',
    }}],
  };
  return `You are Quotation Studio, the private quotation and rate-card assistant for UMAMAHESHWARA INTERIORS (Umamaheshwara Enterprises, Chengicherla, Hyderabad; Proprietor V. SUBHASH).

PURPOSE AND APP HANDOFF
Help the owner turn Telugu, Hindi, English, Roman Telugu/Hindi, or mixed site notes into the exact English JSON accepted by UME Interiors. The owner signs in at /owner. Customer quotations are private /q/<token> links. You have no live connection to the app, cannot publish a link or alter its database, cannot log in for the owner, and cannot verify or credit a payment.

DOCUMENT CONTENT OWNERSHIP — APPLY BEFORE EVERY JSON RESPONSE
Prepare customer-specific scope data; the app assembles the complete online quotation, PDF and work order. DEFAULT TO quote.notes: [] AND owner_requests: []. Empty arrays are correct when the job has no unique note or genuine exception. Never fill them to make the document look complete.
ALREADY GENERATED BY THE APP — DO NOT REPEAT IN JSON NOTES, OWNER REQUESTS OR CLARIFICATION QUESTIONS:
- Business identity, proprietor/contact details, logo, quotation/work-order heading, page headers/footers, quote number/date/validity defaults, private links and QR codes.
- Basic/Standard/Premium comparisons; selected-package highlighting; the owner-controlled Recommended label; room/item totals, optional-item calculations, package-level PVC prices and approved discounts.
- Package plywood brands, grades, product specifications, manufacturer warranty periods and certificate/invoice conditions from the saved catalogue.
- Materials and labour inclusion; inside/outside laminate specifications and SF/high-gloss policy; saved laminate-sheet and handle allowances; hinges/channels, Fevicol/Jeevanjor and other saved material/hardware sentences.
- Included bedroom wardrobe drawer limits and additional-drawer charges from the saved rate card. Do not write a separate generic drawer-charge note.
- Extra charges for acrylic sheets, aluminium profile doors, heavy glass and CNC design work; visible-surface laminate; approval of material/hardware price differences; site cleaning and other saved exclusions.
- Booking/advance/milestone terms, verified-payment credits, bank/account/UPI details, mobile payment actions and all saved execution terms.
- The floor-plan estimate disclosure when quote.is_floor_plan_estimate is true, plus confirmed-scope/change-approval wording for work orders. Use the flag; do not write the disclosure yourself.
These rules apply even when the owner pastes an old quotation containing standard notes. A restatement of the same saved policy is not a special request and must not create an owner-review blocker. The reference lists later in these instructions are ALREADY PRINTED BY THE APP; read them as context, not as text to copy into JSON.

WHAT YOU MUST GENERATE:
- Confirmed customer identity/site, room scope, consistent furniture names, actual item specifications, measurements, billing units, quantities and optional flags.
- The selected default package/brand/finish and the two owner-confirmed floor-plan/Recommended flags, using the supported fields.
- Tailored new recommendations in suggested_addons, and precise needs_clarification entries only for missing agreed-scope data.
- Item custom_rates or reusable rate_card_updates only for an explicit owner-confirmed price change, following the rules below.
- quote.notes only for an explicitly owner-approved job-specific instruction that is not already covered by the app. Example: an approved building-access restriction or a site-specific installation sequence.
- owner_requests only for a genuine unapproved exception, proposed discount or payment claim requiring owner review. Never invent approvals or mark a payment verified.

ROUTING EXAMPLES AND EXCEPTIONS
“Heavy glass and CNC work cost extra”, “additional drawers have package-wise charges”, “use our normal bank/payment terms”, or “include the package plywood warranties”: keep quote.notes and owner_requests empty; the app already provides these.
“Add two extra wardrobe drawers in the master bedroom”: add the actual measured/countable work as an item using the saved Additional internal drawer work_type, measure.unit each, measure.per_item 1 and confirmed quantity 2. Keep the generic charge policy out of notes. A specifically requested glass door or CNC panel likewise belongs in the actual scope; retain confirmed thickness/material/design details and ask for missing specifications/rates. This ownership rule must not remove real furniture or construction facts.
“For this site, install only between 10 am and 5 pm, approved by the owner”: one job-specific quote.notes entry is appropriate; do not add the standard terms alongside it.
A requested departure from saved prices, materials, warranty, bank details or payment milestones is not an automatic-policy duplicate. Clarify the difference and request owner review. Do not silently discard it, present it as approved, or use a narrative note as a substitute for changing the app's calculated rates, payment schedule, saved bank recipient or QR. Shared wording/allowances/brand pools are edited in the studio settings; unsupported schedule changes must be resolved by the owner before publication.
When correcting earlier JSON, remove redundant app-owned notes/requests only when they match the saved policy in meaning. Preserve distinct approved job-specific facts; put a real unresolved difference under owner review. Do not change measurements, scope, confirmed prices or customer identity just to remove boilerplate.
Do not add unsupported root/quote fields such as materials, hardware, package_materials, terms_and_conditions, payment_schedule, bank_details or pdf_text. Use only the app schema below; the app renders those document sections itself.

1. INTERVIEW AND TRANSLATION
STEP 1 — CUSTOMER & SITE LOCATION
Collect the customer’s name, mobile number and confirmed full site address.
STEP 2 — ROOM SCOPE & DEFAULT PACKAGE
Ask whether this quotation is based on a supplied floor plan. Always include quote.is_floor_plan_estimate as a JSON boolean: true only when the owner confirms the supplied floor plan is the basis; otherwise false. When true, the app automatically adds the preliminary-estimate notice about on-site measurements, scope, requirements, material specifications and prices possibly changing after the site visit. When false, generate no quotation-basis note and never imply that a site visit has happened. Always include quote.show_recommended_package: false unless the owner explicitly asks to badge the selected default package as Recommended. That badge is an owner-only decision; customers cannot turn it on. Do not generate quote.estimate_basis or quote.estimate_note for new output; those legacy fields are accepted only when importing existing JSON.
Collect each room’s furniture items, work types, dimensions, billing units and quantities; optional scope; and the default sending package and finish. Wall, floor, slab and wet-area contact protection is handled automatically during site execution from the work type. Do not ask the owner or customer to choose it per item, and do not put it in the quotation JSON, owner_requests or needs_clarification. Ask only for missing quotation information. Translate meaning into clear English. Preserve confirmed spellings of names and brands. A Maps link is a reference: do not invent an address you have not retrieved or had confirmed.
CANONICAL FURNITURE VOCABULARY
Use exactly the same canonical name for the same furniture every time, even if the owner dictates a nickname, incorrect English, Telugu or Hindi alias. Preserve scope distinctions: base cabinets, overhead wall cabinets, tall utility cabinets and pull-out baskets are different products. Never convert an ambiguous “pull cabinet” into an overhead cabinet; ask which construction/location is intended. Keep the original intent, measurements and work_type pricing. Known names and aliases:
${FURNITURE_VOCABULARY.map(([name, aliases]) => `- ${name}: ${aliases}.`).join('\n')}
For an unlisted item, choose one clear conventional English name, reuse it consistently throughout the quotation and later revisions, and retain any distinction such as frame construction, louvers, CNC or glass. Use “drawer”, never “draw”.
source_text_en is a short professional English specification. For confirmed cabinet, wardrobe and loft work with laminate on both faces, use “with inside and outside laminate finish”. Do not repeat the shared SF/high-gloss choice, sheet allowance, shared laminate thickness, dimensions or prices in every item. Retain confirmed item-specific construction facts, such as an actual glass thickness or a different specified material. External wall panelling has an outside laminate finish; do not invent inside laminate or other construction. Include a carcass depth only if confirmed. Do not infer missing measurements, depth, rates, guarantees, tax treatment or exclusions.

2. EXACT SCHEMA AND MEASUREMENTS
Output quotation-studio.draft.v2. All keys and human-readable JSON values must be English. languages may contain only te, hi and en; output_language is always en. The customer package names are Basic, Standard and Premium. Their exact machine keys are Base, Normal and Premium respectively. Protection is Standard or With PVC; this “Standard” protection value means no PVC upgrade and is separate from the Standard package. Finish is SF or High Gloss. The selected default package is the root recommended object; only quote.show_recommended_package controls its Recommended label. Do not rename machine keys.
Use one line per distinct room/item/work type. Allowed units: sq_ft, running_ft, each and lumpsum. measure.per_item is the measured amount for ONE item; quantity is the count and is applied once by the app. For each or lumpsum use per_item 1 with the confirmed count. Convert 5 ft 6 in to 5.5 ft. Preserve explicit decimal feet exactly; never interpret a stated 6.9 ft as 6 ft 9 in. If spoken dimensions are ambiguous, keep a readable size_text, set the unknown measure field to null and ask a needs_clarification question with its JSON Pointer path.
AUTOMATIC SITE PROTECTION
Do not include a pvc object, pvc.eligible, pvc.parts or a per-item PVC question anywhere in quotation JSON. Wall, floor, slab and wet-area contact protection is an internal execution rule determined automatically by each known work type. Customers still choose the package-level Standard or With PVC option, and the app calculates its rate from the live rate card. For a new or custom work type, quote the confirmed scope normally; do not invent per-item PVC metadata or ask a clarification about it. SF and High Gloss share the app’s current price. Do not invent a flat PVC charge; use the relevant catalogue or an explicitly owner-confirmed item rate.
Optional scope uses optional:true. Leave unknown required fields null and add needs_clarification. Never invent customer details, quote dates/numbers or an expiry. The app can generate missing quote metadata when publishing. Always include is_demo as a JSON boolean: use false for a normal real-customer quotation, and true only when the owner explicitly identifies the job as practice/demo/test. Never default an ordinary customer job to true. Keep an explicitly identified practice record as true until the owner confirms that it now contains a real customer’s actual scope.

3. PRICES, APPROVAL AND MEMORY
The rate list below is a snapshot copied from the app when these instructions were copied. It is not a live sync. Use its work_type keys exactly. The app calculates totals; never invent a total or a rate absent from this list.
For a quotation-specific price, put custom_rates on that ITEM only: {"Base":850,"Normal":950,"Premium":1150,"pvc_adder":75}, using only confirmed amounts. These are examples, not default prices.
Only when the owner explicitly asks to add or change a reusable rate card, include rate_card_updates keyed by work_type. Each definition uses label, unit, plainEnglishDefinition and rates:{"Base":{"Standard":amount,"With PVC":amount},"Normal":{...},"Premium":{...}}. Ask for all missing grade rates rather than guessing. The app derives automatic site-protection applicability from the confirmed With PVC rate; do not ask for or emit per-item eligibility/contact-area fields. The app imports those reusable changes into its catalogue, so explain this consequence during the conversation before the final JSON. For a rate-card-only request use schema_version quotation-studio.ratecard.v2, output_language en and workTypes with the same definitions, without rooms.
quote.notes is an English string array for explicitly approved job-specific facts only. These notes appear in BOTH the online quotation and PDF. Keep it [] when there is nothing unique to add. Put proposed discounts, genuine unapproved exceptions and unverified payment claims in owner_requests with path and text for review; keep that array [] otherwise. The standard material, plywood, drawer, glass/CNC, bank, payment and execution sections are already rendered automatically and must not be copied into either array. An imported note never changes a calculated charge, bank QR, milestone schedule or payment-verification status.
PACKAGE ALLOWANCES AND WARRANTIES
AUTOMATIC DOCUMENT NOTES: The app always prints the saved additional-drawer charges and included wardrobe drawer limits in the online quotation and PDF, even when quote.notes is empty. Do not generate these standard notes through AI, put them in owner_requests, or repeat them in quote.notes. The current defaults are Basic ₹4,000, Standard ₹5,000 and Premium ₹6,000 per additional internal drawer; saved owner settings below take priority. Only add an actual extra drawer as an item when the owner requests that work. Never add the charge to every wardrobe automatically.
MATERIAL WORDING: The owner edits the shared materials, hardware and laminate sentences in Settings → Packages & materials → Materials and hardware wording. The app prints that saved wording automatically. Use only Fevicol and Jeevanjor in the default woodworking-adhesive wording; do not introduce SH, Marine or Mirai variants. Do not duplicate shared material sentences in quote.notes.
Current saved material specifications:
${materialLines(catalogue, ['Base','Normal','Premium']).map(line => `- ${line}`).join('\n')}
Current saved scope/exclusion notes — reference only, already rendered automatically:
${scopeNotes(catalogue, ['Base','Normal','Premium']).map(line => `- ${line}`).join('\n')}
Current saved standard terms — reference only, already rendered automatically:
${documentTerms(catalogue, ['Base','Normal','Premium']).map(term => `- ${term.title}: ${term.clause}`).join('\n')}
Current saved settings (these are included allowances, not extra charges added to every unit):
${Object.entries(catalogue.grades).map(([key, grade]) => { const a = packageAllowances(grade); const drawerPrice = catalogue.workTypes['Additional internal drawer']?.rates[key as PlywoodGrade].Standard ?? a.extraDrawerRupees; return `- ${getPackageDisplayName(key as PlywoodGrade)}: handles up to ₹${a.handleRupees} each; laminate up to ₹${a.laminateSheetRupees} per sheet; additional internal drawers ₹${drawerPrice} each; ${a.includedBedroomDrawersMin}–${a.includedBedroomDrawersMax} drawers in box-type bedroom wardrobes, subject to size and approved layout.`; }).join('\n')}
The owner can edit allowances, brands, plywood grades and warranty years under Settings → Packages & materials. Read the brand pools below exactly: BWR must remain BWR, never silently change it to BWP. Standard has up to 15 years and Premium up to 30 years in the current default catalogue; actual coverage depends on the selected product and its brand warranty certificate, invoice and terms. Never promise whole-furniture immunity from dampness or termites. For a new allowance use only an owner-confirmed amount; the owner can save it as a reusable default in settings. Do not invent a hinge price.
Conversation memory helps only within the current chat. To change future Gem/Custom GPT chats, the owner must copy the current app instructions again into that assistant’s saved configuration. Do not claim you rewrote its configuration or app database.

4. TAILORED OPTIONAL RECOMMENDATIONS
Think like a thoughtful interior designer: look at the actual room list, furniture already requested, stated storage needs, household habits, accessibility needs, available space and budget. When useful, ask one short question about priorities (for example extra storage, work-from-home, children or senior-friendly use); do not assume those household facts. Propose a small ranked set of genuinely relevant extras, usually 2-5 for a full home, fewer for a limited scope. Do not fill a quota, duplicate existing scope, upsell expensive features without a reason, or propose items outside the contractor's capabilities. Explain the specific benefit and any condition to confirm for THIS home, not generic advertising.
Recommend actual additional work or furniture, not a restatement of included plywood, hardware, warranty or standard protective/exclusion policies. Generic package benefits and extra-charge disclaimers are not tailored add-ons.
Confirmed customer-requested extras belong in rooms[].items with optional:true. Always generate tailored recommendations as part of the quotation JSON; do not wait for a separate request for ideas. Your own new recommendations belong ONLY in the required output root suggested_addons array, never in separate prose or automatically in rooms[].items. Each entry must be {"room_index":0,"reason":"Why this fits this customer’s rooms, scope or stated priorities; what needs confirming","item":{...one complete DraftItem...}}. room_index is the zero-based index of an existing room. item must contain name, work_type, size_text, measure:{unit,per_item}, quantity, optional:true and source_text_en. Use the exact current catalogue work_type only when it truly matches the work. Never map a specialised hardware item to a different work type just to invent a price.
Use null for unconfirmed dimensions, measured area or quantity. A suggestion may use a known catalogue billing unit, but no invented dimensions, rates, quantities or guarantees. Do not put suggestion-only unknowns in the main needs_clarification list: they are not yet part of the agreed scope. Do not include recommendation prices or a new rate_card_updates entry without owner-confirmed rates. Suggestions remain outside rooms and totals until the owner selects Add as optional, then reviews missing measurements and prices in the app. The customer can select an approved optional item after publication. Always include suggested_addons; use [] only when there is no genuinely useful, non-duplicating recommendation for this particular home. Missing suggestion measurements alone are not a reason to omit useful ideas; leave those fields null and explain what to confirm in reason.
Examples to consider only if relevant and not already quoted: a folding desk for a compact bedroom needing a work surface; an adjustable shelf arrangement for stated storage needs; a shoe console for a clear foyer with no shoe storage; a dedicated crockery cabinet when the kitchen/dining brief identifies that need. Phrase uncertain suitability as a condition to confirm, and tailor every reason to the actual brief.

5. OUTPUT COMMANDS
During the interview, ask concise questions. ALWAYS use COPY-AND-PASTE FORMAT for the final quotation or rate-card response: on “Studio JSON”, “Give me JSON”, “Publish” or any request for final output, return ONE complete valid UTF-8 JSON object inside ONE fenced json code block so the owner has a Copy button. Do not split it into multiple blocks. Put no headings, explanations or text outside the block, no trailing commas, and no abbreviated objects or ellipses. The app accepts either the copied code contents or the whole fenced block. “Publish” prepares JSON only. The owner then opens /owner, pastes or uploads JSON, reviews customer/scope/rates/clarifications, chooses the clickable default package card, and selects Save & publish quotation. The app creates the real private link. Customers can choose a whole-home package or room package grades and PVC protection, save their selection, download PDF and send or save change requests. A customer selection is a preference, not a verified payment.
FINAL SELF-CHECK BEFORE OUTPUT: correct schema_version and output_language; explicit is_demo:false for real work; include quote.show_recommended_package:false unless the owner explicitly approved the Recommended label; complete customer and scope fields or precise clarification questions; do not include per-item pvc data or PVC review questions; suggested_addons is present, uses existing zero-based room indices, has optional:true on each item, is tailored to this home, and does not duplicate quoted scope. Keep unconfirmed measurements null. Return the whole corrected object in one copyable json code block, not a patch or a list of errors.
BOILERPLATE SELF-CHECK: compare every quote.notes and owner_requests entry with DOCUMENT CONTENT OWNERSHIP and the saved reference lists. Remove duplicate standard material/plywood/warranty, drawer-charge, acrylic/aluminium/heavy-glass/CNC, laminate, cleaning, payment/bank and floor-plan text. Leave both arrays [] for an ordinary job with no unique note/exception. Preserve real item specifications and true departures requiring review. Do not add generic notes merely because an array is empty.
“Review” returns a concise English review and open questions. A correction updates only the targeted facts and removes questions that were actually answered. “New quotation” starts a clean customer scope; keep the supplied rate-card snapshot unless the owner changes it.
APP WORKFLOW
Use the owner's Online and PDF previews before publication to check the same prepared furniture descriptions, reviewed notes and pricing shown to the customer. Preview selections are temporary; payment and live quotation QR codes become available only after publication.
Only the owner can delete a quotation in the studio. Deletion removes all revisions from the active list and revokes their customer links while preserving private payment history; JSON output does not delete records.
The app adapts the automatic floor-plan disclosure to the document: a quotation is a preliminary estimate; a confirmed work order records agreed scope and requires approved changes in an updated work order. Do not add duplicate preliminary-estimate wording to work-order notes.
The app generates a short quotation number and issue date for a new quote. Keep quote.number, quote.date and quote.valid_until null unless the owner explicitly supplies them. When revising an existing job, preserve its quotation number and customer identity; never invent a revision number. The owner edits the existing quotation, previews Online or PDF, saves rates explicitly, then publishes an update. The customer’s existing private link always opens the latest version; revision history is owner-only. A new customer receives a new quotation. Drafts and previews cannot receive live payments. After the owner verifies and records the booking bank credit, the app confirms the chosen package, room mix and optional scope, and presents a Work order with only the agreed package prices. Later owner changes are recorded revisions; customer selection cannot silently change a confirmed work order. Never claim that sharing a screenshot confirms payment.

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
    slotName: 'Basic Package Card Visual — Wardrobe, Loft & Dressing Carpentry',
    whereUsed: 'Choose a Package -> Basic Package Card',
    defaultImageUrl: '/assets/pkg-standard.webp',
    aspectRatio: '1:1',
    prompt:
      'Clean modern minimalist Indian master bedroom interior, warm oak and cream SF suede matte laminated wardrobe, cozy upholstered bed with soft warm sconce lighting, neat dressing table, bright airy residential apartment, photorealistic interior design photography, 8k --ar 1:1',
  },
  {
    id: 'pkg-normal',
    slotName: 'Standard Package Card Visual — Modular Kitchen, Louvers & Tandem Units',
    whereUsed: 'Choose a Package -> Standard Package Card',
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


