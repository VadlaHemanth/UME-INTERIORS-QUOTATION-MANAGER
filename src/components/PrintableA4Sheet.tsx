import React from 'react';
import {
  formatCleanItemDescription,
  getPackageDisplayName,
  standardizeCompetitorItemName,
  StudioCatalogue,
} from '../lib/catalogue';
import {
  ALL_GRADES,
  calculateMilestoneSchedule,
  computeCustomerSelectionTotal,
  formatINR,
  makeComboKey,
  PricedQuotationSnapshot,
} from '../lib/pricing';
import {
  QuotationDraftV2,
  ResolvedPackageSelection,
} from '../lib/schema';
import {
  DeterministicQrCode,
  UmeLogoMark,
} from './BrandMark';

interface PrintableA4SheetProps {
  publicId: string;
  revision: number;
  draft: QuotationDraftV2;
  snapshot: PricedQuotationSnapshot;
  catalogue: StudioCatalogue;
  wholeHomeSelection: ResolvedPackageSelection;
  mixByRoom: boolean;
  roomSelections: Record<number, ResolvedPackageSelection>;
  selectedOptionalPointers: string[];
  approvedDiscountRupees: number;
  verifiedPaidRupees: number;
  onReturnToInteractiveSelector?: () => void;
}

export const PrintableA4Sheet: React.FC<PrintableA4SheetProps> = ({
  publicId,
  revision,
  draft,
  snapshot,
  catalogue,
  wholeHomeSelection,
  mixByRoom,
  roomSelections,
  selectedOptionalPointers,
  approvedDiscountRupees,
  verifiedPaidRupees,
}) => {
  const calc = computeCustomerSelectionTotal(snapshot, {
    wholeHomeSelection,
    mixByRoom,
    roomSelections,
    selectedOptionalPointers,
    approvedDiscountRupees,
  });

  const milestones = calculateMilestoneSchedule(calc.grandTotal, verifiedPaidRupees);
  const activeGradeInfo = catalogue.grades[wholeHomeSelection.grade];
  const activeGradeDisplayName = getPackageDisplayName(wholeHomeSelection.grade);
  const quoteRef = draft.quote.number || 'UME-2026-1024';
  const revCode = String(revision).padStart(2, '0');
  const shareUrl = `https://${catalogue.company.domain}/q/${publicId}`;

  const stdWholeHomeTotal =
    snapshot.baseWholeHomeTotals[
      makeComboKey('Base', wholeHomeSelection.protection, wholeHomeSelection.finish)
    ] || 0;
  const normWholeHomeTotal =
    snapshot.baseWholeHomeTotals[
      makeComboKey('Normal', wholeHomeSelection.protection, wholeHomeSelection.finish)
    ] || 0;
  const premWholeHomeTotal =
    snapshot.baseWholeHomeTotals[
      makeComboKey('Premium', wholeHomeSelection.protection, wholeHomeSelection.finish)
    ] || 0;

  // Milestone cumulative & remaining after verified receipts calculations
  const stage2Instalment = Math.max(
    0,
    milestones.advance50PercentTotal - milestones.bookingRequired
  );
  const stage3Cumulative =
    milestones.advance50PercentTotal + milestones.plywoodCompletion35Percent;
  const stage4Cumulative =
    stage3Cumulative + milestones.laminateCompletion10Percent;

  return (
    <div className="max-w-[210mm] mx-auto space-y-6 text-[#18221D] print:space-y-0">
      {/* PAGE 1: LETTERHEAD, CLIENT DETAILS & SIDE-BY-SIDE 3-PACKAGE SUMMARY */}
      <div className="bg-white border border-[#E5DFD3] rounded-xl p-7 sm:p-9 space-y-5 print:border-0 print:rounded-none print:px-0 print:pt-2 print:pb-0">
        {/* Top Letterhead — Logo height (68px) matched 1:1 with the 4-line company header stack */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#1C3A2F] pb-4 pt-1">
          <div className="flex items-center gap-4 min-w-0">
            <UmeLogoMark size="pdf" />
            <div className="flex flex-col justify-between h-[68px] py-0.5 min-w-0">
              <p className="text-[16px] font-bold tracking-tight leading-none text-[#18221D]">
                UMAMAHESHWARA INTERIORS
              </p>
              <p className="text-[12.5px] font-bold leading-none text-[#3D4741]">
                Umamaheshwara Enterprises
              </p>
              <p className="text-[11.5px] font-semibold leading-none text-[#1C3A2F]">
                Residential and Commercial Interior Designers
              </p>
              <p className="text-[10.5px] leading-none text-[#5C645F] sm:whitespace-nowrap">
                <span>{catalogue.company.address}</span>{' '}
                <span className="font-medium text-[#3D4741]">
                  · Phone: {catalogue.company.phone}
                </span>
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0 flex flex-col justify-center">
            <div>
              <span className="inline-block px-3.5 py-1 bg-[#1C3A2F] text-[#E6CBA8] rounded-md text-xs font-bold uppercase tracking-widest">
                QUOTATION
              </span>
            </div>
            <p className="text-[11px] text-[#5C645F] mt-2">
              Proprietor: <strong className="text-[#18221D]">{catalogue.company.proprietor}</strong>
            </p>
          </div>
        </div>

        {/* Non-Overflowing 4-Column Quotation Reference & Validity Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg p-3.5 text-xs">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F]">
              Quotation No.
            </p>
            <p className="font-mono font-bold text-[#18221D] break-words mt-0.5">
              {quoteRef}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F]">
              Revision
            </p>
            <p className="font-mono font-bold text-[#18221D] mt-0.5">
              Rev {revCode}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F]">
              Issue Date
            </p>
            <p className="font-mono font-bold text-[#18221D] mt-0.5">
              {draft.quote.date || '2026-10-24'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F]">
              Valid Until
            </p>
            <p className="font-mono font-bold text-[#1C3A2F] mt-0.5">
              {draft.quote.valid_until || '2026-11-23'}
            </p>
          </div>
        </div>

        {/* Client & Selected Package Overview Box */}
        <div className="grid grid-cols-12 gap-4 bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg p-5">
          <div className="col-span-7 space-y-1 pr-4 border-r border-[#E5DFD3] min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1C3A2F]">
              Prepared For (Client & Site Address)
            </p>
            <h1 className="text-lg font-bold text-[#18221D] break-words">
              {draft.customer.name || 'Valued Client'}
            </h1>
            <p className="text-xs text-[#18221D] leading-relaxed break-words">
              {draft.customer.site}
            </p>
            {draft.customer.phone && (
              <p className="text-xs text-[#5C645F] font-mono tabular-nums pt-1">
                Mobile: <strong className="text-[#18221D]">+91 {draft.customer.phone}</strong>
              </p>
            )}
          </div>

          <div className="col-span-5 flex flex-col justify-between pl-2 min-w-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F]">
                Selected Package Configuration
              </p>
              <p className="text-sm font-bold text-[#18221D] mt-0.5">
                {mixByRoom
                  ? 'Custom Room-Wise Package Selection'
                  : `${activeGradeDisplayName} Package${
                      wholeHomeSelection.protection === 'With PVC'
                        ? ' (+6mm PVC Board at Contact Areas)'
                        : ''
                    }`}
              </p>
              <p className="text-[11px] text-[#1C3A2F] font-semibold mt-0.5">
                {activeGradeInfo.termiteProofBadge} · {activeGradeInfo.warrantyBanner}
              </p>
            </div>

            <div className="pt-3 border-t border-[#E5DFD3] flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-[#1C3A2F]">Selected Grand Total</span>
              <span className="text-xl font-bold text-[#18221D] font-mono tabular-nums">
                {formatINR(calc.grandTotal, true)}
              </span>
            </div>
          </div>
        </div>

        {/* All 3 Packages Side-by-Side Executive Comparison Strip */}
        <div className="space-y-2 print-avoid-break">
          <p className="text-xs font-bold uppercase tracking-wider text-[#18221D]">
            All 3 Packages Side-by-Side Comparison (Standard · Normal · Premium)
          </p>
          <div className="grid grid-cols-3 gap-3">
            {ALL_GRADES.map((g) => {
              const dispName = getPackageDisplayName(g);
              const gInfo = catalogue.grades[g];
              const stdTotal =
                snapshot.baseWholeHomeTotals[makeComboKey(g, 'Standard', wholeHomeSelection.finish)] || 0;
              const pvcTotal =
                snapshot.baseWholeHomeTotals[makeComboKey(g, 'With PVC', wholeHomeSelection.finish)] || 0;
              const isSelected = !mixByRoom && wholeHomeSelection.grade === g;

              return (
                <div
                  key={g}
                  className={`p-3.5 rounded-lg border text-xs ${
                    isSelected
                      ? 'bg-[#E4EFE7] border-2 border-[#1C3A2F]'
                      : 'bg-[#FAF8F4] border-[#E5DFD3]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-[#18221D]">{dispName} Package</p>
                    {isSelected && (
                      <span className="px-1.5 py-0.5 bg-[#1C3A2F] text-[#E6CBA8] rounded text-[9px] font-bold uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-[#1C3A2F] mt-0.5">
                    {gInfo.termiteProofBadge}
                  </p>
                  <p className="text-[10px] text-[#5C645F] mt-0.5">
                    Brands: {gInfo.approvedBrands.slice(0, 3).map((b) => b.name).join(', ')}
                  </p>
                  <div className="mt-2 pt-2 border-t border-[#E5DFD3] space-y-1 font-mono tabular-nums">
                    <div className="flex items-center justify-between">
                      <span>Package Total:</span>
                      <strong className="text-sm text-[#18221D]">{formatINR(stdTotal)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#5C645F]">
                      <span>Optional +6mm PVC:</span>
                      <strong>{formatINR(pvcTotal)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room-by-Room Side-by-Side 3-Package Summary Table */}
        <div className="space-y-2 print-avoid-break">
          <p className="text-xs font-bold uppercase tracking-wider text-[#18221D]">
            Room-by-Room Side-by-Side Package Cost Summary
          </p>
          <div className="border border-[#E5DFD3] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1C3A2F] text-white">
                  <th className="py-2.5 px-3 font-semibold">Room & Units</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">Standard</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">Normal</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold text-[#E6CBA8]">
                    Premium (BWP)
                  </th>
                  <th className="py-2.5 px-2.5 font-semibold">Chosen Spec</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Chosen Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DFD3]">
                {snapshot.rooms.map((r) => {
                  const rSel =
                    mixByRoom && roomSelections[r.roomIndex]
                      ? roomSelections[r.roomIndex]
                      : wholeHomeSelection;
                  const rSub = calc.roomBreakdownTotals[r.roomIndex]?.total ?? 0;
                  const stdRoom =
                    r.roomTotals[makeComboKey('Base', rSel.protection, rSel.finish)] || 0;
                  const normRoom =
                    r.roomTotals[makeComboKey('Normal', rSel.protection, rSel.finish)] || 0;
                  const premRoom =
                    r.roomTotals[makeComboKey('Premium', rSel.protection, rSel.finish)] || 0;

                  return (
                    <tr key={r.roomIndex}>
                      <td className="py-2.5 px-3 font-bold text-[#18221D]">
                        0{r.roomIndex + 1}. {r.name} ({r.items.filter((i) => !i.optional).length} units)
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-[#4A524D]">
                        {formatINR(stdRoom)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-[#4A524D]">
                        {formatINR(normRoom)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-semibold text-[#18221D]">
                        {formatINR(premRoom)}
                      </td>
                      <td className="py-2.5 px-2.5 text-[#1C3A2F] font-semibold">
                        {getPackageDisplayName(rSel.grade)}
                        {rSel.protection === 'With PVC' ? ' (+PVC)' : ''}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono tabular-nums text-[#18221D]">
                        {formatINR(rSub)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#FAF8F4] font-bold">
                  <td className="py-2.5 px-3 text-[#18221D]">
                    Whole-Home Package Totals
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {formatINR(stdWholeHomeTotal)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {formatINR(normWholeHomeTotal)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-[#1C3A2F]">
                    {formatINR(premWholeHomeTotal)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#1C3A2F]">
                    Selected Total →
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm text-[#1C3A2F] font-mono tabular-nums">
                    {formatINR(calc.grandTotal, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Material & Laminate Specifications */}
        <div className="bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg p-4 text-[11px] space-y-1.5 print-avoid-break">
          <p className="font-bold uppercase tracking-wider text-[#1C3A2F] text-[10px]">
            Included Material, Laminate & Hardware Specifications
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[#4A524D] list-disc list-inside">
            {catalogue.commonMaterials.map((m, idx) => (
              <li key={idx} className="leading-snug">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* PAGE 2: ITEMISED ROOM-BY-ROOM BREAKDOWN WITH ALL 3 PACKAGE RATES SIDE-BY-SIDE */}
      <div className="bg-white border border-[#E5DFD3] rounded-xl p-7 sm:p-9 space-y-5 print:border-0 print:rounded-none print:px-0 print:pt-2 print:pb-0 print-break-before">
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#1C3A2F] pb-3 pt-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <UmeLogoMark size="md" />
            <div className="flex flex-col justify-between h-[40px] py-0.5 min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider leading-none text-[#1C3A2F] whitespace-nowrap">
                UMAMAHESHWARA INTERIORS · Umamaheshwara Enterprises
              </p>
              <h2 className="text-[15px] font-bold leading-none text-[#18221D] whitespace-nowrap">
                Section 01 · Room-Wise Furniture Scope & Side-by-Side Package Rates
              </h2>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#5C645F] font-mono tabular-nums whitespace-nowrap shrink-0">
            {quoteRef} · {draft.customer.name}
          </p>
        </div>

        <div className="space-y-5">
          {snapshot.rooms.map((room) => {
            const rSel =
              mixByRoom && roomSelections[room.roomIndex]
                ? roomSelections[room.roomIndex]
                : wholeHomeSelection;
            const rSub = calc.roomBreakdownTotals[room.roomIndex]?.total ?? 0;

            return (
              <div
                key={room.roomIndex}
                className="border border-[#E5DFD3] rounded-lg overflow-hidden print-avoid-break"
              >
                <div className="bg-[#FAF8F4] px-4 py-2.5 border-b border-[#E5DFD3] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#18221D]">
                      0{room.roomIndex + 1}. {room.name}
                    </span>
                    <span className="ml-2 text-[#1C3A2F] font-semibold">
                      (Chosen: {getPackageDisplayName(rSel.grade)}
                      {rSel.protection === 'With PVC' ? ' · +6mm PVC' : ''})
                    </span>
                  </div>
                  <span className="font-bold text-[#18221D] font-mono tabular-nums">
                    Chosen Subtotal: {formatINR(rSub)}
                  </span>
                </div>

                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-[#1C3A2F] text-white">
                      <th className="py-2 px-3 font-semibold w-[40%]">
                        Furniture Unit & Specification
                      </th>
                      <th className="py-2 px-2 font-semibold">Dimensions</th>
                      <th className="py-2 px-2 text-right font-semibold">Area / Qty</th>
                      <th className="py-2 px-2 text-right font-semibold">Standard</th>
                      <th className="py-2 px-2 text-right font-semibold">Normal</th>
                      <th className="py-2 px-3 text-right font-semibold text-[#E6CBA8]">
                        Premium (BWP)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DFD3]">
                    {room.items
                      .filter((i) => !i.optional)
                      .map((item) => {
                        const stdCombo = makeComboKey('Base', rSel.protection, rSel.finish);
                        const normCombo = makeComboKey('Normal', rSel.protection, rSel.finish);
                        const premCombo = makeComboKey('Premium', rSel.protection, rSel.finish);

                        const stdAmt = item.exactAmounts[stdCombo] || 0;
                        const normAmt = item.exactAmounts[normCombo] || 0;
                        const premAmt = item.exactAmounts[premCombo] || 0;

                        const stdRate = item.unitRates[stdCombo] || 0;
                        const normRate = item.unitRates[normCombo] || 0;
                        const premRate = item.unitRates[premCombo] || 0;

                        const uLabel =
                          item.unit === 'sq_ft'
                            ? 'sq.ft'
                            : item.unit === 'running_ft'
                            ? 'rft'
                            : item.unit;

                        const cleanTitle = standardizeCompetitorItemName(
                          item.name,
                          item.workType,
                          room.name
                        );
                        const cleanDesc = formatCleanItemDescription(
                          item.sourceTextEn,
                          item.name,
                          item.workType,
                          room.name
                        );

                        return (
                          <tr key={`${room.roomIndex}-${item.itemIndex}`}>
                            <td className="py-2 px-3">
                              <p className="font-bold text-[#18221D]">{cleanTitle}</p>
                              <p className="text-[10px] text-[#5C645F] leading-snug mt-0.5">
                                {cleanDesc}
                              </p>
                            </td>
                            <td className="py-2 px-2 font-mono tabular-nums whitespace-nowrap">
                              {item.sizeText}
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {item.unit === 'each'
                                ? `${item.quantity} nos`
                                : `${item.totalMeasure.toFixed(2)} ${uLabel}`}
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-semibold">{formatINR(stdAmt)}</div>
                              <div className="text-[9.5px] text-[#5C645F]">@{formatINR(stdRate)}</div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-semibold">{formatINR(normAmt)}</div>
                              <div className="text-[9.5px] text-[#5C645F]">@{formatINR(normRate)}</div>
                            </td>
                            <td className="py-2 px-3 text-right font-bold font-mono tabular-nums whitespace-nowrap text-[#1C3A2F]">
                              <div>{formatINR(premAmt)}</div>
                              <div className="text-[9.5px] font-normal text-[#5C645F]">
                                @{formatINR(premRate)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* PAGE 3: EASY-TO-UNDERSTAND MILESTONE PAYMENT SCHEDULE, BANK DETAILS & TERMS */}
      <div className="bg-white border border-[#E5DFD3] rounded-xl p-7 sm:p-9 space-y-5 print:border-0 print:rounded-none print:px-0 print:pt-2 print:pb-0 print-break-before">
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#1C3A2F] pb-3 pt-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <UmeLogoMark size="md" />
            <div className="flex flex-col justify-between h-[40px] py-0.5 min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider leading-none text-[#1C3A2F] whitespace-nowrap">
                UMAMAHESHWARA INTERIORS · Umamaheshwara Enterprises
              </p>
              <h2 className="text-[15px] font-bold leading-none text-[#18221D] whitespace-nowrap">
                Section 02 · Milestone Payment Schedule, Bank Account & Terms
              </h2>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#5C645F] font-mono tabular-nums whitespace-nowrap shrink-0">
            Project Total: {formatINR(calc.grandTotal, true)}
          </p>
        </div>

        {/* Crystal-Clear Milestone Explanation Banner */}
        <div className="p-3.5 bg-[#E4EFE7] border border-[#1C3A2F]/30 rounded-lg text-xs text-[#18221D] space-y-1 print-avoid-break">
          <p className="font-bold text-[#1C3A2F]">
            How Your 5-Step Payment Schedule Works (100% Transparent):
          </p>
          <p className="text-[11px] text-[#3D4741] leading-relaxed">
            The <strong>{formatINR(milestones.bookingRequired, true)} order booking payment</strong> is <strong>included inside your first 50% advance</strong> — it is <strong>NOT an extra charge</strong> added on top of your project price ({formatINR(calc.grandTotal, true)}). You pay in 5 simple stages as work progresses at your site:
          </p>
        </div>

        {/* 4-Column Easy-to-Understand Milestone Schedule Table */}
        <div className="border border-[#E5DFD3] rounded-lg overflow-hidden print-avoid-break">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1C3A2F] text-white">
                <th className="py-2.5 px-3.5 font-semibold w-[44%]">
                  Milestone Stage & What Happens at Site
                </th>
                <th className="py-2.5 px-3 text-right font-semibold">
                  Stage Instalment
                </th>
                <th className="py-2.5 px-3 text-right font-semibold">
                  Total Paid So Far (Cumulative)
                </th>
                <th className="py-2.5 px-3.5 text-right font-semibold text-[#E6CBA8]">
                  Due After Verified Receipts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DFD3]">
              {/* Stage 1 */}
              <tr className="bg-[#FAF8F4]">
                <td className="py-2.5 px-3.5">
                  <p className="font-bold text-[#18221D]">
                    Step 1 · Order Confirmation Booking
                  </p>
                  <p className="text-[10.5px] text-[#5C645F]">
                    Locks your package rates & schedules site measurement. Part of the 50% advance.
                  </p>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(milestones.bookingRequired, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4A524D]">
                  {formatINR(milestones.bookingRequired, true)}
                  <div className="text-[9.5px] text-[#5C645F]">Booking Token</div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums text-[#1C3A2F]">
                  {formatINR(
                    Math.max(0, milestones.bookingRequired - verifiedPaidRupees),
                    true
                  )}
                </td>
              </tr>

              {/* Stage 2 */}
              <tr>
                <td className="py-2.5 px-3.5">
                  <p className="font-bold text-[#18221D]">
                    Step 2 · Balance of 50% Work-Start Advance
                  </p>
                  <p className="text-[10.5px] text-[#5C645F]">
                    50% Advance ({formatINR(milestones.advance50PercentTotal)}) minus ₹50,000 Booking. Due before plywood dispatch to site.
                  </p>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(stage2Instalment, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4A524D]">
                  {formatINR(milestones.advance50PercentTotal, true)}
                  <div className="text-[9.5px] font-semibold text-[#1C3A2F]">50% Reached</div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(milestones.advanceRemainingToStartWork, true)}
                </td>
              </tr>

              {/* Stage 3 */}
              <tr className="bg-[#FAF8F4]">
                <td className="py-2.5 px-3.5">
                  <p className="font-bold text-[#18221D]">
                    Step 3 · 35% Plywood Structure Completion
                  </p>
                  <p className="text-[10.5px] text-[#5C645F]">
                    Due after all plywood boxes, frames, and loft structures are erected at site.
                  </p>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(milestones.plywoodCompletion35Percent, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4A524D]">
                  {formatINR(stage3Cumulative, true)}
                  <div className="text-[9.5px] font-semibold text-[#1C3A2F]">85% Reached</div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(
                    Math.max(0, stage3Cumulative - verifiedPaidRupees),
                    true
                  )}
                </td>
              </tr>

              {/* Stage 4 */}
              <tr>
                <td className="py-2.5 px-3.5">
                  <p className="font-bold text-[#18221D]">
                    Step 4 · 10% Outside Laminate Completion
                  </p>
                  <p className="text-[10.5px] text-[#5C645F]">
                    Due upon completion of outside 1.0mm decorative laminate pressing & edge-banding.
                  </p>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(milestones.laminateCompletion10Percent, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4A524D]">
                  {formatINR(stage4Cumulative, true)}
                  <div className="text-[9.5px] font-semibold text-[#1C3A2F]">95% Reached</div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(
                    Math.max(0, stage4Cumulative - verifiedPaidRupees),
                    true
                  )}
                </td>
              </tr>

              {/* Stage 5 */}
              <tr className="bg-[#FAF8F4]">
                <td className="py-2.5 px-3.5">
                  <p className="font-bold text-[#18221D]">
                    Step 5 · 5% Final Handover Balance
                  </p>
                  <p className="text-[10.5px] text-[#5C645F]">
                    Due upon hardware alignment, cleaning, and final project handover.
                  </p>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#18221D]">
                  {formatINR(milestones.handoverFinal5Percent, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#1C3A2F]">
                  {formatINR(calc.grandTotal, true)}
                  <div className="text-[9.5px] font-semibold text-[#1C3A2F]">100% Complete</div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums text-[#1C3A2F]">
                  {formatINR(milestones.totalRemainingBalance, true)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bank Account + QR Box */}
        <div className="grid grid-cols-12 gap-4 bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg p-5 items-center print-avoid-break">
          <div className="col-span-8 space-y-1 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1C3A2F]">
              Official Bank Remittance Account
            </p>
            <p className="font-bold text-[#18221D] text-sm">
              {catalogue.company.bank.bankName} — {catalogue.company.bank.branch}
            </p>
            <p className="text-[#18221D]">
              Account Name: <strong>{catalogue.company.bank.accountName}</strong>
            </p>
            <p className="font-mono tabular-nums text-[#18221D]">
              Account No: <strong>{catalogue.company.bank.accountNumber}</strong> · IFSC:{' '}
              <strong>{catalogue.company.bank.ifsc}</strong> · UPI ID:{' '}
              <strong>{catalogue.company.bank.upiId}</strong>
            </p>
          </div>
          <div className="col-span-4 flex justify-end gap-4">
            <DeterministicQrCode
              value={`upi://pay?pa=${catalogue.company.bank.upiId}&pn=UME%20Interiors&am=50000&cu=INR`}
              size={76}
              label="UPI Booking QR"
            />
            <DeterministicQrCode value={shareUrl} size={76} label="Online Quote" />
          </div>
        </div>

        {/* Notes & Terms and Conditions (Includes 0.8mm / 0.72mm Laminate Gauge Note) */}
        <div className="space-y-2.5 print-avoid-break">
          <p className="text-xs font-bold uppercase tracking-wider text-[#18221D]">
            Notes, Laminate Gauge Standard & Terms and Conditions
          </p>
          <div className="p-3 bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg text-[10.5px] text-[#18221D] leading-snug">
            <strong>Technical Note on Laminate Thickness & Finish:</strong> Internal balancing/liner laminate is industry-standard <strong>0.8 mm</strong> category (actual factory sheet gauge ranges from <strong>0.72 mm to 0.80 mm</strong> as per standard ISI/manufacturer tolerance). External decorative laminate is <strong>1.0 mm</strong> thickness in the customer’s chosen finish (SF Matte or High-Gloss at the same price).
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10.5px] text-[#5C645F] leading-snug">
            {catalogue.termsAndConditions.map((t) => (
              <div key={t.id}>
                <strong className="text-[#18221D]">
                  {t.id}. {t.title}:
                </strong>{' '}
                {t.clause}
              </div>
            ))}
          </div>
        </div>

        {/* Signatures Block */}
        <div className="pt-8 border-t border-[#E5DFD3] grid grid-cols-2 gap-8 text-xs print-avoid-break">
          <div>
            <p className="font-bold text-[#18221D]">
              For UMAMAHESHWARA INTERIORS (Umamaheshwara Enterprises)
            </p>
            <p className="text-[#5C645F] mt-6">
              <strong>{catalogue.company.proprietor}</strong> · Proprietor ({catalogue.company.phone})
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#18221D]">Client Acceptance & Confirmation</p>
            <p className="text-[#5C645F] mt-6">
              <strong>{draft.customer.name || 'Client Signature'}</strong> · Date: ________________
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
