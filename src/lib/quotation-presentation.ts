import { formatCleanItemDescription, standardizeCompetitorItemName, type StudioCatalogue } from './catalogue';
import { applyStandardPvcScopes } from './pvc-scope';
import type { PricedLineMatrix } from './pricing';
import type { QuotationDraftV2 } from './schema';
import { normalizeFurnitureLayout } from './furniture-layout';
import {simplifyFurnitureLanguage} from './furniture-contract';

/** Preview and publication use the same customer-facing vocabulary and scope. */
export function prepareQuotationDraft(draft: QuotationDraftV2, catalogue: StudioCatalogue): QuotationDraftV2 {
  const protectedDraft=applyStandardPvcScopes(draft,catalogue);
  for(const room of protectedDraft.rooms)for(const item of room.items){
    if(item.manual_parent!==true&&item.parent_item_index==null&&/loft|low roof/i.test(`${item.name} ${item.work_type}`)&&/shoe|footwear/i.test(`${item.name} ${item.source_text_en}`)){
      const candidates=room.items.map((other,index)=>({other,index})).filter(({other})=>other!==item&&!/loft|low roof/i.test(`${other.name} ${other.work_type}`)&&/shoe|footwear/i.test(other.name||''));
      if(candidates.length===1)item.parent_item_index=candidates[0].index;
    }
  }
  const next = normalizeFurnitureLayout(protectedDraft);
  for (const room of next.rooms) for (const item of room.items) {
    if(item.manual_parent!==true&&item.parent_item_index==null&&/loft|low roof/i.test(`${item.name} ${item.work_type}`)&&!/panelling|under loft/i.test(item.name||'')){
      const hint=`${item.name} ${item.source_text_en}`;
      const match=/dressing|vanity/i.test(hint)?/dressing|vanity/i:/crockery/i.test(hint)?/crockery/i:/wardrobe|cupboard/i.test(hint)?/wardrobe|cupboard/i:null;
      const candidates=room.items.map((other,index)=>({other,index})).filter(({other})=>other!==item&&!/loft|low roof/i.test(`${other.name} ${other.work_type}`)&&match?.test(other.name||''));
      if(candidates.length===1)item.parent_item_index=candidates[0].index;
    }
    const originalName=item.name||'';
    item.source_text_en ??= '';
    if (item.owner_text?.name !== true) item.name=standardizeCompetitorItemName(originalName,item.work_type || '',room.name || '',item.source_text_en||'');
    if(item.owner_text?.specification!==true&&/opposite/i.test(originalName)&&!/opposite/i.test(item.source_text_en))item.source_text_en=(item.source_text_en.trim()+' Position: opposite side of the kitchen.').trim();
    if(item.owner_text?.specification!==true&&/lower.*(?:pillar|column)/i.test(originalName)&&!/lower/i.test(item.source_text_en))item.source_text_en=(item.source_text_en.trim()+' Position: lower part of the pillar.').trim();
    if(item.measure?.unit==='each'&&(!item.size_text?.trim()||/^standard (?:size|unit)$/i.test(item.size_text.trim()))){
      item.size_text=/basket/i.test(item.name || '')?(/drawer/i.test(item.name || '')?'Per drawer system or basket':'Per pull-out basket'):/drawer system/i.test(item.name || '')?'Per drawer system':/drawer/i.test(item.name || '')?'Per additional drawer':'Per item';
      if(item.measure.per_item==null)item.measure.per_item=1;
    }
    if (item.source_text_en && item.owner_text?.specification !== true) item.source_text_en=formatCleanItemDescription(item.source_text_en,item.name || '',item.work_type || '',room.name || '');
  }
  if(Array.isArray(next.suggested_addons))for(const suggestion of next.suggested_addons){
    if(!suggestion||typeof suggestion!=='object'||!suggestion.item||typeof suggestion.item!=='object')continue;
    const item=suggestion.item,room=next.rooms[suggestion.room_index]?.name||'';
    if(typeof item.name==='string'&&typeof item.work_type==='string'&&typeof item.source_text_en==='string'){
      item.name=standardizeCompetitorItemName(item.name,item.work_type,room,item.source_text_en);
      item.source_text_en=formatCleanItemDescription(item.source_text_en,item.name || '',item.work_type,room);
    }
    if(typeof suggestion.reason==='string')suggestion.reason=simplifyFurnitureLanguage(suggestion.reason);
  }
  return next;
}

/** Older published lines still benefit from display cleanup. Owner edits use the saved wording. */
export function quotationFurnitureText(item: PricedLineMatrix, room: string) {
  return {
    name: item.ownerText?.name === true ? item.name : standardizeCompetitorItemName(item.name,item.workType,room,item.sourceTextEn),
    specification: item.ownerText?.specification === true ? item.sourceTextEn : formatCleanItemDescription(item.sourceTextEn,item.name,item.workType,room),
  };
}

export function reviewedQuotationNotes(draft: QuotationDraftV2, reviewed: boolean): string[] {
  return [...new Set([...(draft.quote.notes || []),...(reviewed ? draft.owner_requests.filter(request=>!/feedback|discount|payment.*claim/i.test(request.text)).map(request=>request.text) : [])])];
}
