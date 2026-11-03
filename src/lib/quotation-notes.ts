import type { QuoteMeta } from './schema';

const FLOOR_PLAN_ESTIMATE_NOTE = 'This preliminary estimate is based on the supplied floor plan. On-site measurements, the scope of work, requirements, material specifications and prices may change after the site visit. Any changes will be set out in a revised quotation for your written approval before work proceeds.';
const FLOOR_PLAN_WORK_ORDER_NOTE = 'The agreed scope in this work order is based on the supplied floor plan. Any changes identified during site measurements, including quantities, requirements, materials or prices, must be recorded in an updated work order and approved by the customer before the affected work proceeds.';

/** A false checkbox always suppresses the automatic quotation-basis note. */
export function isFloorPlanEstimate(quote: QuoteMeta): boolean {
  return quote.is_floor_plan_estimate === true
    || (quote.is_floor_plan_estimate === undefined && quote.estimate_basis === 'floor_plan');
}

/** An unknown basis must never be presented as a completed site measurement. */
export function getQuotationBasisLabel(quote: QuoteMeta): string {
  if (quote.is_floor_plan_estimate === false) return '';
  if (isFloorPlanEstimate(quote)) return 'Based on floor plan';
  if (quote.estimate_basis === 'site_measurement') return 'Based on site measurements';
  return '';
}

/** Owner notes supplement, and cannot replace, the floor-plan estimate notice. */
export function getQuotationEstimateNote(quote: QuoteMeta, documentType: 'quotation' | 'work_order' = 'quotation'): string {
  if (quote.is_floor_plan_estimate === false) return '';
  const ownerNote = typeof quote.estimate_note === 'string' ? quote.estimate_note.trim() : '';
  return [isFloorPlanEstimate(quote) ? documentType === 'work_order' ? FLOOR_PLAN_WORK_ORDER_NOTE : FLOOR_PLAN_ESTIMATE_NOTE : '', ownerNote]
    .filter(Boolean).join('\n\n');
}
