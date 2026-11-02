import type { StudioCatalogue } from './catalogue';
import type { QuotationDraftV2 } from './schema';

export function getMissingStandardPvcScopes(draft: QuotationDraftV2, catalogue: StudioCatalogue) {
  return draft.rooms.flatMap((room, roomIndex) => room.items.flatMap((item, itemIndex) => {
    if (item.pvc?.eligible !== true || item.pvc.parts.some(part => part.trim())) return [];
    const definition = catalogue.workTypes[item.work_type || ''];
    const parts = definition?.pvcDefaultEligible ? definition.pvcDefaultParts.filter(part => part.trim()) : [];
    return parts.length ? [{ roomIndex, itemIndex, name: item.name, parts: [...parts] }] : [];
  }));
}

/** Owner-triggered review action; existing item-specific scope is preserved. */
export function applyStandardPvcScopes(draft: QuotationDraftV2, catalogue: StudioCatalogue): QuotationDraftV2 {
  const next = structuredClone(draft);
  const applied = getMissingStandardPvcScopes(draft, catalogue);
  for (const entry of applied) next.rooms[entry.roomIndex].items[entry.itemIndex].pvc.parts = entry.parts;
  const answeredPaths = new Set(applied.map(entry => `/rooms/${entry.roomIndex}/items/${entry.itemIndex}/pvc/parts`));
  next.needs_clarification = next.needs_clarification.filter(question => !answeredPaths.has(question.path));
  return next;
}
