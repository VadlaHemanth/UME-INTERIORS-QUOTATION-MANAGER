import type { StudioCatalogue } from '../src/lib/catalogue';
import type { PackageSelection, QuotationDraftV2, ResolvedPackageSelection } from '../src/lib/schema';
import type { PublishedQuotationRecord } from './routes';

function selection<T extends PackageSelection | ResolvedPackageSelection>(value: T): T {
  return { grade: value.grade, protection: value.protection, finish: value.finish, brand_preference: value.brand_preference } as T;
}

function publicDraft(draft: QuotationDraftV2): QuotationDraftV2 {
  return {
    schema_version: draft.schema_version,
    output_language: draft.output_language,
    is_demo: draft.is_demo,
    languages: [...draft.languages],
    customer: { name: draft.customer.name, phone: draft.customer.phone, site: draft.customer.site },
    quote: { number: draft.quote.number, date: draft.quote.date, valid_until: draft.quote.valid_until },
    recommended: draft.recommended ? selection(draft.recommended) : null,
    rooms: draft.rooms.map((room) => ({
      name: room.name,
      recommended: room.recommended ? selection(room.recommended) : null,
      items: room.items.map((item) => ({
        name: item.name,
        work_type: item.work_type,
        size_text: item.size_text,
        measure: { unit: item.measure.unit, per_item: item.measure.per_item },
        quantity: item.quantity,
        pvc: { eligible: item.pvc.eligible, parts: [...item.pvc.parts] },
        optional: item.optional,
        source_text_en: item.source_text_en,
      })),
    })),
    owner_requests: [],
    needs_clarification: [],
  };
}

// Customer payloads are allowlisted separately from owner records. Item prices
// remain in the calculated snapshot used by comparisons and customer PDFs.
export function publicQuote(record: PublishedQuotationRecord) {
  const current = record.lastCustomerSelection;
  return {
    publicId: record.publicId,
    revision: record.revision,
    supersededByPublicId: record.supersededByPublicId,
    status: record.status,
    draft: publicDraft(record.draft),
    snapshot: structuredClone(record.snapshot),
    approvedDiscountRupees: record.approvedDiscountRupees,
    defaultSentPackage: selection(record.defaultSentPackage),
    lastCustomerSelection: {
      wholeHomeSelection: selection(current.wholeHomeSelection),
      mixByRoom: current.mixByRoom,
      roomSelections: Object.fromEntries(Object.entries(current.roomSelections).map(([key, value]) => [key, selection(value)])),
      selectedOptionalPointers: [...current.selectedOptionalPointers],
      acceptedTermsAt: current.acceptedTermsAt,
      savedByCustomer: current.savedByCustomer,
      savedAt: current.savedAt,
      savedFinalTotalRupees: current.savedFinalTotalRupees,
      summaryLabel: current.summaryLabel,
    },
    customerFeedback: (record.customerFeedback || []).map((entry) => ({ id: entry.id, topic: entry.topic, message: entry.message, submittedAt: entry.submittedAt })),
  };
}

export function publicCatalogue(catalogue: StudioCatalogue): StudioCatalogue {
  return {
    version: catalogue.version,
    company: structuredClone(catalogue.company),
    grades: structuredClone(catalogue.grades),
    pvcSpec: structuredClone(catalogue.pvcSpec),
    commonMaterials: [...catalogue.commonMaterials],
    notesAndExclusions: [...catalogue.notesAndExclusions],
    termsAndConditions: structuredClone(catalogue.termsAndConditions),
    highGlossSheetUpgradeDelta: catalogue.highGlossSheetUpgradeDelta,
    // Unrelated owner rates and future work types are not needed by the client.
    workTypes: {},
  };
}
