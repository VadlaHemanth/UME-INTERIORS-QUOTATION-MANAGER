import type { GradeInfo, StudioCatalogue } from './catalogue';
import type { PlywoodGrade, QuotationDraftV2 } from './schema';
import { applyApprovedCoreRates } from './rate-card';

export interface PackageAllowances {
  handleRupees: number;
  laminateSheetRupees: number;
  extraDrawerRupees: number;
  includedBedroomDrawersMin: number;
  includedBedroomDrawersMax: number;
  additionalAllowances?: { name: string; amountRupees: number; unit: string }[];
}
export const DEFAULT_PACKAGE_ALLOWANCES: PackageAllowances = {
  handleRupees: 200, laminateSheetRupees: 1500, extraDrawerRupees: 5000,
  includedBedroomDrawersMin: 2, includedBedroomDrawersMax: 4, additionalAllowances: [],
};
export const DEFAULT_DRAWER_PRICES: Record<PlywoodGrade, number> = {Base:4000, Normal:5000, Premium:6000};
export const PLYWOOD_WARRANTY_CONDITIONS = 'Manufacturer warranty applies to plywood. Coverage depends on the selected product, brand certificate, invoice and manufacturer terms.';
export function packageWarrantyYears(grade: GradeInfo): number {
  return Math.max(0, ...grade.approvedBrands.map(brand => Number.isFinite(brand.warrantyYears) && brand.warrantyYears > 0 ? brand.warrantyYears : 0));
}
export function packageWarrantyLabel(grade: GradeInfo): string | null {
  const years = packageWarrantyYears(grade);
  return years > 0 ? `Up to ${years} years plywood warranty` : null;
}
export const packageAllowances = (grade: GradeInfo): PackageAllowances => ({ ...DEFAULT_PACKAGE_ALLOWANCES, extraDrawerRupees:DEFAULT_DRAWER_PRICES[grade.grade], ...grade.allowances });
export function syncDrawerAllowances(catalogue: StudioCatalogue): StudioCatalogue {
  const drawers = catalogue.workTypes['Additional internal drawer'];
  if (drawers) for (const grade of ['Base','Normal','Premium'] as const) catalogue.grades[grade].allowances = {...packageAllowances(catalogue.grades[grade]),extraDrawerRupees:drawers.rates[grade].Standard};
  return catalogue;
}

export const DEFAULT_MATERIAL_WORDING = {
  materialsAndLabour: 'Quoted prices include materials and labour for the listed scope.',
  externalLaminate: '1.0 mm external decorative laminate, SF matte or high-gloss at the same quoted price.',
  internalLaminate: 'Internal liner laminate: 0.8 mm nominal thickness (manufacturer sheet gauge: 0.72–0.80 mm).',
  handles: 'Handle allowance',
};
export type MaterialWording = typeof DEFAULT_MATERIAL_WORDING;
export const materialWording = (catalogue: StudioCatalogue): MaterialWording => ({...DEFAULT_MATERIAL_WORDING,...catalogue.materialWording});
export const additionalMaterialLines = (catalogue: StudioCatalogue) => catalogue.commonMaterials.filter(line => !/^(1\.0 mm Outside Decorative Laminate Finish|0\.8 mm White \/ Fabric Inside Liner Laminate|Handles \(worth up to)/i.test(line));

export function materialLines(catalogue: StudioCatalogue, grades: PlywoodGrade[]): string[] {
  const unique = [...new Set(grades)];
  const names = { Base: 'Basic', Normal: 'Standard', Premium: 'Premium' };
  const wording = materialWording(catalogue);
  const allowance = (field: 'handleRupees' | 'laminateSheetRupees' | 'extraDrawerRupees', suffix: string) => {
    const amounts = unique.map(g => packageAllowances(catalogue.grades[g])[field]);
    return new Set(amounts).size === 1 ? `₹${amounts[0].toLocaleString('en-IN')} ${suffix}` : unique.map((g, i) => `${names[g]}: ₹${amounts[i].toLocaleString('en-IN')} ${suffix}`).join('; ');
  };
  return [
    wording.materialsAndLabour,
    `${wording.externalLaminate} Sheet allowance: ${allowance('laminateSheetRupees', 'per sheet')}.`,
    wording.internalLaminate,
    `${wording.handles.replace(/[:.]+$/, '')}: ${allowance('handleRupees', 'per handle')}.`,
    ...additionalMaterialLines(catalogue),
    ...unique.flatMap(g => (packageAllowances(catalogue.grades[g]).additionalAllowances || []).map(a => `${names[g]} · ${a.name}: ₹${a.amountRupees.toLocaleString('en-IN')} ${a.unit}.`)),
  ];
}

export function scopeNotes(catalogue: StudioCatalogue, grades: PlywoodGrade[]): string[] {
  const unique = [...new Set(grades)];
  const labels = { Base: 'Basic', Normal: 'Standard', Premium: 'Premium' };
  const prices = unique.map(g => catalogue.workTypes['Additional internal drawer']?.rates[g].Standard ?? packageAllowances(catalogue.grades[g]).extraDrawerRupees);
  const priceText = new Set(prices).size === 1 ? `₹${prices[0].toLocaleString('en-IN')} each` : unique.map((g, i) => `${labels[g]} ₹${prices[i].toLocaleString('en-IN')} each`).join('; ');
  const ranges = [...new Set(unique.map(g => { const a = packageAllowances(catalogue.grades[g]); return `${a.includedBedroomDrawersMin}–${a.includedBedroomDrawersMax}`; }))];
  return [
    'Acrylic sheets, aluminium profile doors, heavy glass and custom CNC design work are charged separately unless explicitly included in the itemised scope.',
    'External decorative laminate is applied only to visible surfaces.',
    'Alternative hardware, plywood or finishes outside the selected package require written approval of the price difference before purchase or execution.',
    `Box-type bedroom wardrobes include ${ranges.join(' / ')} internal drawers, subject to wardrobe size and the approved layout.`,
    `Additional internal drawers beyond the included layout cost ${priceText}.`,
    'Final deep cleaning is the customer’s responsibility. The carpentry team will collect and stack work debris.',
    ...catalogue.notesAndExclusions.filter(line => !/acrylic|aluminium|visible|hardware or plywood|drawers|materials and labour|laminate specification/i.test(line)),
  ];
}

export function quotationCustomerNotes(draft: QuotationDraftV2): string[] {
  return [...new Set((draft.quote.notes || []).map(s => s.trim()).filter(Boolean))];
}

export function documentTerms(catalogue: StudioCatalogue, grades: PlywoodGrade[], workOrder = false) {
  const labels = {Base:'Basic',Normal:'Standard',Premium:'Premium'};
  return catalogue.termsAndConditions.map(term => {
    if (term.id === 9) { const wording = materialWording(catalogue); return {...term,clause:`${wording.internalLaminate} ${wording.externalLaminate}`}; }
    if (term.id === 10) return {...term,clause:`Materials follow the approved product list for the selected package. ${[...new Set(grades)].map(grade=>{const years=packageWarrantyYears(catalogue.grades[grade]);return `${labels[grade]} plywood: ${years ? `up to ${years} years manufacturer warranty` : 'warranty under the selected manufacturer’s terms; no fixed period is promised'}.`;}).join(' ')} Actual coverage follows the selected product, brand warranty certificate, invoice and manufacturer terms. Alternatives require written customer approval. This is not a blanket warranty on the entire furniture installation.`};
    if (workOrder && term.id === 8) return {...term,title:'Confirmed scope and recorded changes',clause:'This work order records the agreed package, measurements, quantities and specifications. Changes to the confirmed scope, materials, requirements or prices must be documented in an updated work order and approved by the customer before the affected work proceeds.'};
    return workOrder ? {...term,clause:term.clause.replace(/a revised quotation/g, 'an updated work order')} : term;
  });
}

/** Upgrade the old shipped defaults once; retain owner-entered brands and rates. */
export function upgradeCatalogue(catalogue: StudioCatalogue): StudioCatalogue {
  if (catalogue.version === 'ume-catalogue-2026.11.v10') return catalogue;
  const next = structuredClone(catalogue);
  if(catalogue.version==='ume-catalogue-2026.11.v9') {
    applyApprovedCoreRates(next);
    next.version='ume-catalogue-2026.11.v10';
    return next;
  }
  if (catalogue.version === 'ume-catalogue-2026.11.v8') {
    if (next.company.brandName === 'UMAMAHESHWARA INTERIORS') next.company.brandName = 'UME Interiors';
    next.version = 'ume-catalogue-2026.11.v9';
    return upgradeCatalogue(next);
  }
  // This release changes the shipped defaults without resetting custom amounts.
  if (catalogue.version === 'ume-catalogue-2026.11.v7') {
    for (const g of ['Base','Normal','Premium'] as const) {
      const current = packageAllowances(next.grades[g]);
      const drawer = next.workTypes['Additional internal drawer'];
      if (current.extraDrawerRupees === 5000 && (!drawer || drawer.rates[g].Standard === 5000)) {
        next.grades[g].allowances = {...current,extraDrawerRupees:DEFAULT_DRAWER_PRICES[g]};
        if (drawer) drawer.rates[g] = {Standard:DEFAULT_DRAWER_PRICES[g],'With PVC':DEFAULT_DRAWER_PRICES[g]};
      }
    }
    next.commonMaterials = next.commonMaterials.map(line => /^Woodworking Adhesive \(Fevicol Marine \/ SH \/ Jivanjor\)$/i.test(line) ? 'Woodworking adhesive: Fevicol and Jeevanjor.' : line);
    next.materialWording = materialWording(next);
    next.version = 'ume-catalogue-2026.11.v8';
    return upgradeCatalogue(next);
  }
  const labels = { Base: 'Basic', Normal: 'Standard', Premium: 'Premium' } as const;
  for (const g of ['Base', 'Normal', 'Premium'] as const) {
    const info = next.grades[g];
    info.displayLabel = labels[g];
    info.allowances ||= structuredClone(DEFAULT_PACKAGE_ALLOWANCES);
    info.handleAllowance = 'Handles worth up to ₹200 each';
    info.outerLaminateAllowance = '1.0 mm external laminate, SF matte or high-gloss, up to ₹1,500 per sheet';
    if (g === 'Normal') {
      info.tagline = 'BWR 710 / 303 grade plywood';
      info.warrantyBanner = 'Up to 15 years manufacturer warranty with brand certificate, depending on the selected product';
      info.plainEnglishSummary = 'BWR 710 / 303 grade plywood with inside and outside laminate finish. Manufacturer warranty depends on the selected brand, product, certificate and invoice.';
      info.approvedBrands = info.approvedBrands.map(brand => ({ ...brand, warrantyYears: Math.min(15, brand.warrantyYears), name: brand.name.replace(/20 Yrs/gi, '15 Yrs'), spec: brand.spec.replace(/20 Years/gi, '15 Years') }));
    }
    if (g === 'Premium') info.warrantyBanner = 'Up to 30 years manufacturer warranty with brand certificate, depending on the selected BWP product';
  }
  for (const term of next.termsAndConditions) if (term.id === 10 && /20, 15 or 10 years for Normal/.test(term.clause)) term.clause = 'Materials are sourced from the selected package’s approved brand list. Alternatives require written approval. Manufacturer warranties follow the selected product, brand warranty certificate, invoice and manufacturer terms. Refer to the listed plywood options for the applicable warranty period.';
  next.workTypes['Additional internal drawer'] ||= { id:'Additional internal drawer',label:'Additional Internal Drawer',unit:'each',plainEnglishDefinition:'An additional internal drawer beyond the included bedroom wardrobe layout.',pvcDefaultEligible:false,pvcDefaultParts:[],rates:{Base:{Standard:5000,'With PVC':5000},Normal:{Standard:5000,'With PVC':5000},Premium:{Standard:5000,'With PVC':5000}},highGlossPremiumPerUnit:0 };
  next.version = 'ume-catalogue-2026.11.v7';
  return upgradeCatalogue(next);
}
