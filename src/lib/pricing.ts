import { DEFAULT_UME_CATALOGUE, StudioCatalogue } from './catalogue';
import {
  DraftItem,
  FinishOption,
  PlywoodGrade,
  ProtectionOption,
  QuotationDraftV2,
  ResolvedPackageSelection,
} from './schema';

export type PackageComboKey =
  | 'Base__Standard__SF'
  | 'Base__Standard__High Gloss'
  | 'Base__With PVC__SF'
  | 'Base__With PVC__High Gloss'
  | 'Normal__Standard__SF'
  | 'Normal__Standard__High Gloss'
  | 'Normal__With PVC__SF'
  | 'Normal__With PVC__High Gloss'
  | 'Premium__Standard__SF'
  | 'Premium__Standard__High Gloss'
  | 'Premium__With PVC__SF'
  | 'Premium__With PVC__High Gloss';

export const ALL_GRADES: PlywoodGrade[] = ['Base', 'Normal', 'Premium'];
export const ALL_PROTECTIONS: ProtectionOption[] = ['Standard', 'With PVC'];
export const ALL_FINISHES: FinishOption[] = ['SF', 'High Gloss'];

export function makeComboKey(
  grade: PlywoodGrade,
  protection: ProtectionOption,
  finish: FinishOption
): PackageComboKey {
  return `${grade}__${protection}__${finish}`;
}

export interface PricedLineMatrix {
  itemIndex: number;
  parentItemIndex?:number|null;
  roomIndex: number;
  name: string;
  workType: string;
  sizeText: string;
  unit: string;
  perItemMeasure: number;
  quantity: number;
  totalMeasure: number;
  optional: boolean;
  pvcEligible: boolean;
  pvcParts: string[];
  sourceTextEn: string;
  unitRates: Record<PackageComboKey, number>;
  exactAmounts: Record<PackageComboKey, number>;
  roundedAmounts: Record<PackageComboKey, number>;
}

export interface PricedRoom {
  roomIndex: number;
  name: string;
  recommended: ResolvedPackageSelection | null;
  items: PricedLineMatrix[];
  roomTotals: Record<PackageComboKey, number>;
}
export function selectedRoomItems(room:PricedRoom,pointers:readonly string[]){
  return room.items.filter(item=>!item.optional||pointers.includes(`/rooms/${room.roomIndex}/items/${item.itemIndex}`));
}
export function selectedRoomPackageAmount(room:PricedRoom,selection:ResolvedPackageSelection,pointers:readonly string[]){
  const combo=makeComboKey(selection.grade,selection.protection,selection.finish);
  return selectedRoomItems(room,pointers).reduce((sum,item)=>sum+item.exactAmounts[combo],0);
}

export interface PricedQuotationSnapshot {
  catalogueVersion: string;
  rooms: PricedRoom[];
  baseWholeHomeTotals: Record<PackageComboKey, number>;
  exactWholeHomeTotals: Record<PackageComboKey, number>;
  optionalAddOnTotals: Record<PackageComboKey, number>;
  pvcSummary: {
    eligibleItemCount: number;
    eligibleTotalSqFt: number;
    locations: { roomName: string; itemName: string; parts: string[]; measureSqFt: number }[];
  };
}

export interface MilestoneSchedule {
  totalAmount: number;
  bookingRequired: number;
  bookingVerifiedPaid: number;
  advance50PercentTotal: number;
  advanceRemainingToStartWork: number;
  plywoodCompletion35Percent: number;
  laminateCompletion10Percent: number;
  handoverFinal5Percent: number;
  requiresOwnerSmallOrderRule: boolean;
}

/**
 * Formats numbers in standard Indian grouping: ₹12,34,567 (or with .50 if exact decimals exist and showPaise=true)
 */
export function formatINR(amount: number, showPaise = false): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const hasHalfRupee = Math.abs((abs * 100) % 100) > 0.001;

  if (showPaise && hasHalfRupee) {
    const formatted = abs.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? '-' : ''}₹${formatted}`;
  }

  const rounded = Math.round(abs);
  const formatted = rounded.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Uses the rate card as the single source of truth for contact-area
 * protection. The old per-item `pvc` JSON field is accepted only while old
 * drafts are imported and must not change a customer's package price.
 */
function getWorkTypeDefinition(item: DraftItem, catalogue: StudioCatalogue) {
  const workTypeKey = item.work_type || 'Box type';
  return (
    catalogue.workTypes[workTypeKey] ||
    Object.values(catalogue.workTypes).find(
      (workType) => workType.label.toLowerCase() === workTypeKey.toLowerCase()
    ) ||
    catalogue.workTypes['Box type']
  );
}

export function getAutomaticPvcScopeForItem(
  item: DraftItem,
  catalogue: StudioCatalogue = DEFAULT_UME_CATALOGUE
): { eligible: boolean; parts: string[] } {
  const workType = getWorkTypeDefinition(item, catalogue);
  const eligible = Boolean(workType?.pvcDefaultEligible);
  return {
    eligible,
    parts: eligible ? [...(workType?.pvcDefaultParts || [])] : [],
  };
}

/**
 * Resolves unit rate for a given work type and package combination.
 * Supports optional line-level rate override maps for historical PDF reconciliation.
 */
export function getUnitRateForItem(
  item: DraftItem,
  grade: PlywoodGrade,
  protection: ProtectionOption,
  finish: FinishOption,
  catalogue: StudioCatalogue = DEFAULT_UME_CATALOGUE,
  customRateOverrides?: Partial<Record<PackageComboKey, number>>
): number {
  const key = makeComboKey(grade, protection, finish);
  if (customRateOverrides && typeof customRateOverrides[key] === 'number') {
    return customRateOverrides[key]!;
  }

  const workDef = getWorkTypeDefinition(item, catalogue);
  const isPvcEligible = getAutomaticPvcScopeForItem(item, catalogue).eligible;

  // CRITICAL RULE: Only confirmed eligible parts attract the PVC rate adjustment!
  const effectiveProtection: ProtectionOption =
    protection === 'With PVC' && isPvcEligible ? 'With PVC' : 'Standard';

  if (item.custom_rates && typeof item.custom_rates[grade] === 'number') {
    const customBase = item.custom_rates[grade]!;
    const pvcAdder =
      effectiveProtection === 'With PVC'
        ? typeof item.custom_rates.pvc_adder === 'number'
          ? item.custom_rates.pvc_adder
          : 75
        : 0;
    const finishDelta =
      finish === 'High Gloss' && (item.measure?.unit || workDef.unit) === 'sq_ft'
        ? catalogue.highGlossSheetUpgradeDelta
        : 0;
    return customBase + pvcAdder + finishDelta;
  }

  let baseRate = workDef.rates[grade][effectiveProtection];

  // Finish delta if configured (e.g. High Gloss sheet upgrade on sq_ft items)
  if (finish === 'High Gloss' && workDef.unit === 'sq_ft') {
    baseRate += workDef.highGlossPremiumPerUnit + catalogue.highGlossSheetUpgradeDelta;
  }

  return baseRate;
}

/**
 * Pre-calculates all 12 package prices for every line and room deterministically.
 */
export function calculateQuotationPricing(
  draft: QuotationDraftV2,
  catalogue: StudioCatalogue = DEFAULT_UME_CATALOGUE,
  options: {
    lineRateOverrides?: Record<string, Partial<Record<PackageComboKey, number>>>;
    roundEachLine?: boolean;
  } = {}
): PricedQuotationSnapshot {
  const roundEachLine = options.roundEachLine ?? false;

  const allKeys: PackageComboKey[] = [];
  for (const g of ALL_GRADES) {
    for (const p of ALL_PROTECTIONS) {
      for (const f of ALL_FINISHES) {
        allKeys.push(makeComboKey(g, p, f));
      }
    }
  }

  const initZeroRecord = (): Record<PackageComboKey, number> => {
    const rec = {} as Record<PackageComboKey, number>;
    for (const k of allKeys) rec[k] = 0;
    return rec;
  };

  const baseWholeHomeTotals = initZeroRecord();
  const exactWholeHomeTotals = initZeroRecord();
  const optionalAddOnTotals = initZeroRecord();
  const pvcLocations: {
    roomName: string;
    itemName: string;
    parts: string[];
    measureSqFt: number;
  }[] = [];

  let eligibleItemCount = 0;
  let eligibleTotalSqFt = 0;

  const rooms: PricedRoom[] = (draft.rooms || []).map((room, rIdx) => {
    const roomTotals = initZeroRecord();

    const items: PricedLineMatrix[] = (room.items || []).map((item, iIdx) => {
      const pointer = `/rooms/${rIdx}/items/${iIdx}`;
      const overrides = options.lineRateOverrides?.[pointer];

      const perItem = typeof item.measure?.per_item === 'number' && item.measure.per_item > 0 ? item.measure.per_item : 0;
      const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      // Multiply by quantity ONCE
      const totalMeasure = Number((perItem * qty).toFixed(4));
      const isOptional = Boolean(item.optional);
      const automaticPvcScope = getAutomaticPvcScopeForItem(item, catalogue);
      const isPvcEligible = automaticPvcScope.eligible;

      if (isPvcEligible && !isOptional) {
        eligibleItemCount += 1;
        eligibleTotalSqFt = Number((eligibleTotalSqFt + totalMeasure).toFixed(2));
        pvcLocations.push({
          roomName: room.name || `Room ${rIdx + 1}`,
          itemName: item.name || `Item ${iIdx + 1}`,
          parts: automaticPvcScope.parts,
          measureSqFt: totalMeasure,
        });
      }

      const unitRates = initZeroRecord();
      const exactAmounts = initZeroRecord();
      const roundedAmounts = initZeroRecord();

      for (const g of ALL_GRADES) {
        for (const p of ALL_PROTECTIONS) {
          for (const f of ALL_FINISHES) {
            const k = makeComboKey(g, p, f);
            const rate = getUnitRateForItem(item, g, p, f, catalogue, overrides);
            const exact = Number((totalMeasure * rate).toFixed(2));
            const rounded = Math.round(exact);

            unitRates[k] = rate;
            exactAmounts[k] = exact;
            roundedAmounts[k] = rounded;

            const effectiveLineAmount = roundEachLine ? rounded : exact;

            if (isOptional) {
              optionalAddOnTotals[k] = Number((optionalAddOnTotals[k] + effectiveLineAmount).toFixed(2));
            } else {
              roomTotals[k] = Number((roomTotals[k] + effectiveLineAmount).toFixed(2));
              exactWholeHomeTotals[k] = Number((exactWholeHomeTotals[k] + exact).toFixed(2));
            }
          }
        }
      }

      return {
        itemIndex: iIdx,
        ...(item.parent_item_index!=null?{parentItemIndex:item.parent_item_index}:{}),
        roomIndex: rIdx,
        name: item.name || 'Unnamed item',
        workType: item.work_type || 'Box type',
        sizeText: item.size_text || '-',
        unit: item.measure?.unit || 'sq_ft',
        perItemMeasure: perItem,
        quantity: qty,
        totalMeasure,
        optional: isOptional,
        pvcEligible: isPvcEligible,
        pvcParts: automaticPvcScope.parts,
        sourceTextEn: item.source_text_en,
        unitRates,
        exactAmounts,
        roundedAmounts,
      };
    });

    for (const k of allKeys) {
      baseWholeHomeTotals[k] = Math.round(exactWholeHomeTotals[k]);
    }

    return {
      roomIndex: rIdx,
      name: room.name || `Room ${rIdx + 1}`,
      recommended:
        room.recommended && room.recommended.grade && room.recommended.protection && room.recommended.finish
          ? {
              grade: room.recommended.grade,
              protection: room.recommended.protection,
              finish: room.recommended.finish,
              brand_preference: room.recommended.brand_preference,
            }
          : null,
      items,
      roomTotals,
    };
  });

  return {
    catalogueVersion: catalogue.version,
    rooms,
    baseWholeHomeTotals,
    exactWholeHomeTotals,
    optionalAddOnTotals,
    pvcSummary: {
      eligibleItemCount,
      eligibleTotalSqFt,
      locations: pvcLocations,
    },
  };
}

/**
 * Computes deterministic customer selection total supporting:
 * - Whole-home package OR Room-by-Room mixed package
 * - Opt-in optional items (by "/rooms/r/items/i" pointer)
 * - Owner-approved flat discount
 */
export function computeCustomerSelectionTotal(
  snapshot: PricedQuotationSnapshot,
  params: {
    wholeHomeSelection: ResolvedPackageSelection;
    mixByRoom: boolean;
    roomSelections?: Record<number, ResolvedPackageSelection>;
    selectedOptionalPointers?: string[];
    approvedDiscountRupees?: number;
  }
): {
  baseScopeTotal: number;
  optionalSelectedTotal: number;
  discountRupees: number;
  grandTotal: number;
  roomBreakdownTotals: Record<number, { comboKey: PackageComboKey; total: number }>;
} {
  const selectedOptSet = new Set(params.selectedOptionalPointers || []);
  const roomBreakdownTotals: Record<number, { comboKey: PackageComboKey; total: number }> = {};

  let baseScopeExact = 0;
  let optionalSelectedExact = 0;

  for (const room of snapshot.rooms) {
    const activePkg =
      params.mixByRoom && params.roomSelections?.[room.roomIndex]
        ? params.roomSelections[room.roomIndex]
        : params.wholeHomeSelection;

    const comboKey = makeComboKey(activePkg.grade, activePkg.protection, activePkg.finish);
    let roomSum = 0;

    for (const item of room.items) {
      const pointer = `/rooms/${room.roomIndex}/items/${item.itemIndex}`;
      const lineAmt = item.exactAmounts[comboKey];

      if (item.optional) {
        if (selectedOptSet.has(pointer)) {
          optionalSelectedExact += lineAmt;
          roomSum += lineAmt;
        }
      } else {
        baseScopeExact += lineAmt;
        roomSum += lineAmt;
      }
    }

    roomBreakdownTotals[room.roomIndex] = {
      comboKey,
      total: Math.round(roomSum),
    };
  }

  const baseScopeTotal = Math.round(baseScopeExact);
  const optionalSelectedTotal = Math.round(optionalSelectedExact);
  const discountRupees = Math.max(0, Math.round(params.approvedDiscountRupees || 0));
  const grandTotal = Math.max(0, baseScopeTotal + optionalSelectedTotal - discountRupees);

  return {
    baseScopeTotal,
    optionalSelectedTotal,
    discountRupees,
    grandTotal,
    roomBreakdownTotals,
  };
}

/**
 * Computes the UME Interiors milestone schedule:
 * - ₹50,000 booking confirms the order and counts ONCE toward the 50% advance required to start work.
 * - On ₹4,00,000 total: 50% advance is ₹2,00,000. After verified ₹50,000 booking, ₹1,50,000 remains to reach that advance.
 * - 35% upon completion of all plywood work
 * - 10% after completion of outside laminate
 * - 5% final balance before handover
 */
export function calculateMilestoneSchedule(
  totalAmountRupees: number,
  verifiedBookingPaidRupees = 0
): MilestoneSchedule {
  const total = Math.round(totalAmountRupees);
  const advance50 = Math.round(total * 0.5);
  const requiresOwnerSmallOrderRule = advance50 < 50000;

  const bookingRequired = requiresOwnerSmallOrderRule ? advance50 : 50000;
  const bookingCredited = Math.min(verifiedBookingPaidRupees, advance50);
  const advanceRemainingToStartWork = Math.max(0, advance50 - bookingCredited);

  const plywood35 = Math.round(total * 0.35);
  const laminate10 = Math.round(total * 0.1);
  // Final 5% absorbs any 1-rupee rounding remainder so milestones sum to exact total
  const handover5 = Math.max(0, total - advance50 - plywood35 - laminate10);

  return {
    totalAmount: total,
    bookingRequired,
    bookingVerifiedPaid: verifiedBookingPaidRupees,
    advance50PercentTotal: advance50,
    advanceRemainingToStartWork,
    plywoodCompletion35Percent: plywood35,
    laminateCompletion10Percent: laminate10,
    handoverFinal5Percent: handover5,
    requiresOwnerSmallOrderRule,
  };
}
