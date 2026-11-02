import type { QuoteMeta } from './schema';

const FLOOR_PLAN_ESTIMATE_NOTE = 'This preliminary estimate is based on the supplied floor plan. On-site measurements, the scope of work, requirements, material specifications and prices may change after the site visit. Any changes will be set out in a revised quotation for your written approval before work proceeds.';

/** An unknown basis must never be presented as a completed site measurement. */
export function getQuotationBasisLabel(quote: QuoteMeta): string {
  if (quote.estimate_basis === 'floor_plan') return 'Based on floor plan';
  if (quote.estimate_basis === 'site_measurement') return 'Based on site measurements';
  return '';
}

/** Owner notes supplement, and cannot replace, the floor-plan estimate notice. */
export function getQuotationEstimateNote(quote: QuoteMeta): string {
  const ownerNote = typeof quote.estimate_note === 'string' ? quote.estimate_note.trim() : '';
  return [quote.estimate_basis === 'floor_plan' ? FLOOR_PLAN_ESTIMATE_NOTE : '', ownerNote]
    .filter(Boolean).join('\n\n');
}
