import type { StudioCatalogue } from './catalogue';
import type { QuotationDraftV2 } from './schema';

/**
 * Removes the retired item-level PVC fields from a draft before it is shown,
 * saved or copied as JSON. The rate card now decides which work types receive
 * the package-level PVC rate, so this legacy metadata must not become a
 * customer choice or an AI/owner data-entry task.
 *
 * The catalogue argument is intentionally retained at the call boundary: the
 * rate card remains the sole source of automatic protection applicability in
 * the pricing layer.
 */
export function applyStandardPvcScopes(
  draft: QuotationDraftV2,
  _catalogue: StudioCatalogue
): QuotationDraftV2 {
  const next = structuredClone(draft);

  next.rooms.forEach((room) => {
    room.items.forEach((item) => {
      // Legacy quotations may contain this field. It is intentionally omitted
      // from all newly saved/copyable quotation JSON.
      delete item.pvc;
    });
  });

  // A contact-area clarification can no longer block publication: protection
  // is applied automatically from the selected work type at site execution.
  next.needs_clarification = next.needs_clarification.filter(
    (question) => !/^\/rooms\/\d+\/items\/\d+\/pvc(?:\/|$)/.test(question.path)
  );

  return next;
}
