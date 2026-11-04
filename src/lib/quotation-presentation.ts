import { formatCleanItemDescription, standardizeCompetitorItemName, type StudioCatalogue } from './catalogue';
import { applyStandardPvcScopes } from './pvc-scope';
import type { QuotationDraftV2 } from './schema';

/** Preview and publication use the same customer-facing vocabulary and scope. */
export function prepareQuotationDraft(draft: QuotationDraftV2, catalogue: StudioCatalogue): QuotationDraftV2 {
  const next = applyStandardPvcScopes(draft,catalogue);
  for (const room of next.rooms) for (const item of room.items) {
    item.name=standardizeCompetitorItemName(item.name || '',item.work_type || '',room.name || '');
    if (item.source_text_en) item.source_text_en=formatCleanItemDescription(item.source_text_en,item.name,item.work_type || '',room.name || '');
  }
  return next;
}

export function reviewedQuotationNotes(draft: QuotationDraftV2, reviewed: boolean): string[] {
  return [...new Set([...(draft.quote.notes || []),...(reviewed ? draft.owner_requests.filter(request=>!/feedback|discount|payment.*claim/i.test(request.text)).map(request=>request.text) : [])])];
}
