import { formatCleanItemDescription, standardizeCompetitorItemName, type StudioCatalogue } from './catalogue';
import { applyStandardPvcScopes } from './pvc-scope';
import type { QuotationDraftV2 } from './schema';
import { normalizeFurnitureLayout } from './furniture-layout';

/** Preview and publication use the same customer-facing vocabulary and scope. */
export function prepareQuotationDraft(draft: QuotationDraftV2, catalogue: StudioCatalogue): QuotationDraftV2 {
  const protectedDraft=applyStandardPvcScopes(draft,catalogue);
  for(const room of protectedDraft.rooms)for(const item of room.items){
    if(item.parent_item_index==null&&/loft|low roof/i.test(`${item.name} ${item.work_type}`)&&/shoe|footwear/i.test(`${item.name} ${item.source_text_en}`)){
      const candidates=room.items.map((other,index)=>({other,index})).filter(({other})=>other!==item&&!/loft|low roof/i.test(`${other.name} ${other.work_type}`)&&/shoe|footwear/i.test(other.name||''));
      if(candidates.length===1)item.parent_item_index=candidates[0].index;
    }
  }
  const next = normalizeFurnitureLayout(protectedDraft);
  for (const room of next.rooms) for (const item of room.items) {
    if(item.parent_item_index==null&&/loft|low roof/i.test(`${item.name} ${item.work_type}`)&&!/panelling|under loft/i.test(item.name||'')){
      const hint=`${item.name} ${item.source_text_en}`;
      const match=/dressing|vanity/i.test(hint)?/dressing|vanity/i:/crockery/i.test(hint)?/crockery/i:/wardrobe|cupboard/i.test(hint)?/wardrobe|cupboard/i:null;
      const candidates=room.items.map((other,index)=>({other,index})).filter(({other})=>other!==item&&!/loft|low roof/i.test(`${other.name} ${other.work_type}`)&&match?.test(other.name||''));
      if(candidates.length===1)item.parent_item_index=candidates[0].index;
    }
    item.name=standardizeCompetitorItemName(item.name || '',item.work_type || '',room.name || '');
    if (item.source_text_en) item.source_text_en=formatCleanItemDescription(item.source_text_en,item.name,item.work_type || '',room.name || '');
  }
  return next;
}

export function reviewedQuotationNotes(draft: QuotationDraftV2, reviewed: boolean): string[] {
  return [...new Set([...(draft.quote.notes || []),...(reviewed ? draft.owner_requests.filter(request=>!/feedback|discount|payment.*claim/i.test(request.text)).map(request=>request.text) : [])])];
}
