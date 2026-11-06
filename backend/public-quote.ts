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
    quote: {
      number: draft.quote.number, date: draft.quote.date, valid_until: draft.quote.valid_until,
      ...(draft.quote.validity_days!==undefined?{validity_days:draft.quote.validity_days}:{}),
      ...(draft.quote.notes ? { notes: [...draft.quote.notes] } : {}),
      ...(typeof draft.quote.show_recommended_package === 'boolean'
        ? { show_recommended_package: draft.quote.show_recommended_package }
        : {}),
      ...(typeof draft.quote.is_floor_plan_estimate === 'boolean' ? { is_floor_plan_estimate: draft.quote.is_floor_plan_estimate } : {}),
      ...(draft.quote.estimate_basis ? { estimate_basis: draft.quote.estimate_basis } : {}),
      ...(draft.quote.estimate_note ? { estimate_note: draft.quote.estimate_note } : {}),
    },
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
        ...(item.parent_item_index!=null?{parent_item_index:item.parent_item_index}:{}),
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
    workOrder: record.workOrder ? structuredClone(record.workOrder) : undefined,
    draft: publicDraft(record.draft),
    snapshot: {
      ...structuredClone(record.snapshot),
      pvcSummary: undefined,
      rooms: record.snapshot.rooms.map(room => ({...room,items:room.items.map(({pvcEligible:_eligible,pvcParts:_parts,...item}) => item)})),
    },
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
    materialWording: catalogue.materialWording ? {...catalogue.materialWording} : undefined,
    hardwareScope:catalogue.hardwareScope,
    notesAndExclusions: [...catalogue.notesAndExclusions],
    termsAndConditions: structuredClone(catalogue.termsAndConditions),
    highGlossSheetUpgradeDelta: catalogue.highGlossSheetUpgradeDelta,
    // Unrelated owner rates and future work types are not needed by the client.
    workTypes: {},
  };
}
