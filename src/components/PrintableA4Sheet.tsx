import React, { useLayoutEffect, useRef } from 'react';
import './pdf-owner.css';
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

/** The preview and native PDF share these exact measured A4 page nodes. */
function A4Document({ children, reference }: { children: React.ReactNode; reference: string }) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const source = sourceRef.current;
    const pages = pagesRef.current;
    const viewport = viewportRef.current;
    if (!source || !pages || !viewport) return;
    let active = true;

    const setPreviewScale = () => {
      const paperPixels = 210 * 96 / 25.4;
      const scale = Math.min(1, viewport.clientWidth / paperPixels);
      viewport.style.setProperty('--pdf-preview-scale', String(scale));
    };
    const rebuild = () => {
      if (!active) return;
      // Measure outside the preview shell, which is display:none during the interactive view.
      const measurementHost = document.createElement('div');
      measurementHost.className = 'quote-document pdf-pagination-measure';
      measurementHost.setAttribute('aria-hidden', 'true');
      measurementHost.inert = true;
      document.body.append(measurementHost);
      const created: HTMLElement[] = [];
      let body!: HTMLDivElement;
      let sectionHeading: HTMLElement | undefined;
      let sectionLabel = 'Quotation';
      const newPage = (continued = false) => {
        const page = document.createElement('section');
        page.className = 'pdf-page';
        page.dataset.section = sectionLabel;
        body = document.createElement('div');
        body.className = 'pdf-page-body';
        page.append(body);
        measurementHost.append(page);
        created.push(page);
        if (continued && sectionHeading) {
          const heading = sectionHeading.cloneNode(true) as HTMLElement;
          body.append(heading);
          if (body.scrollHeight > body.clientHeight + 1) {
            heading.remove();
            const compact = document.createElement('p');
            compact.className = 'pdf-continuation-heading';
            compact.textContent = `${sectionLabel} (continued)`;
            body.append(compact);
          }
        }
      };
      const overflows = () => body.scrollHeight > body.clientHeight + 1;
      const readableText = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        return Array.from(node.childNodes).map(readableText).join(' ').replace(/\s+/g, ' ').trim();
      };
      const takeText = (text: string, limit: number) => {
        if (text.length <= limit) return text;
        let end = limit;
        const boundary = text.lastIndexOf(' ', limit);
        if (boundary > limit * .75) end = boundary;
        // Do not divide a Unicode surrogate pair at a page boundary.
        const code = text.charCodeAt(end - 1);
        if (code >= 0xd800 && code <= 0xdbff) end--;
        return text.slice(0, Math.max((text.codePointAt(0) || 0) > 0xffff ? 2 : 1, end));
      };
      const appendLongText = (block: HTMLElement) => {
        let remaining = readableText(block);
        while (remaining.length) {
          const fragment = document.createElement('div');
          fragment.className = 'pdf-text-fragment';
          body.append(fragment);
          let low = 1, high = remaining.length, best = 0;
          while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            fragment.textContent = takeText(remaining, middle);
            if (overflows()) high = middle - 1;
            else { best = middle; low = middle + 1; }
          }
          if (!best) {
            fragment.remove();
            newPage(false);
            continue;
          }
          const part = takeText(remaining, best);
          fragment.textContent = part;
          remaining = remaining.slice(part.length).trimStart();
          if (remaining.length) newPage(true);
        }
        // Keep non-text visual content, including payment QR SVGs, in the document.
        for (const visual of Array.from(block.querySelectorAll('img, svg'))) {
          const copy = visual.cloneNode(true) as HTMLElement;
          body.append(copy);
          if (overflows()) { copy.remove(); newPage(true); body.append(copy); }
        }
      };
      const appendTable = (block: HTMLElement) => {
        const originalBody = block.querySelector('tbody');
        const rows = originalBody ? Array.from(originalBody.children) : [];
        if (!rows.length) return false;
        let shell!: HTMLElement;
        let tableBody!: HTMLTableSectionElement;
        const addShell = () => {
          shell = block.cloneNode(true) as HTMLElement;
          tableBody = shell.querySelector('tbody')!;
          tableBody.replaceChildren();
          body.append(shell);
        };
        addShell();
        if (overflows()) { shell.remove(); appendLongText(block); return true; }
        for (const row of rows) {
          const copy = row.cloneNode(true);
          tableBody.append(copy);
          if (overflows()) {
            tableBody.removeChild(copy);
            if (!tableBody.children.length) shell.remove();
            newPage(true);
            addShell();
            tableBody.append(copy);
            if (overflows()) {
              tableBody.removeChild(copy);
              // A single long note must continue across rows/pages, never clip.
              const originalCells = Array.from(row.children) as HTMLElement[];
              let remaining = originalCells.map(readableText);
              let continued = false;
              while (remaining.some(Boolean)) {
                const fragment = row.cloneNode(false) as HTMLTableRowElement;
                const cells = originalCells.map((cell) => cell.cloneNode(false) as HTMLElement);
                fragment.append(...cells);
                tableBody.append(fragment);
                const fill = (limit: number) => cells.forEach((cell, index) => {
                  const text = takeText(remaining[index], limit);
                  cell.textContent = `${continued && index === 0 ? '(continued) ' : ''}${text}`;
                  if (remaining[index].length > 80) {
                    cell.style.whiteSpace = 'normal';
                    cell.style.overflowWrap = 'anywhere';
                  }
                });
                let low = 1, high = Math.max(...remaining.map((text) => text.length)), best = 0;
                while (low <= high) {
                  const middle = Math.floor((low + high) / 2);
                  fill(middle);
                  if (overflows()) high = middle - 1;
                  else { best = middle; low = middle + 1; }
                }
                if (!best) {
                  fragment.remove();
                  if (!tableBody.children.length) shell.remove();
                  newPage(false);
                  addShell();
                  continue;
                }
                fill(best);
                remaining = remaining.map((text) => text.slice(takeText(text, best).length).trimStart());
                continued = true;
                if (remaining.some(Boolean)) { newPage(true); addShell(); }
              }
            }
          }
        }
        return true;
      };
      const appendBlock = (block: HTMLElement) => {
        const copy = block.cloneNode(true) as HTMLElement;
        body.append(copy);
        if (!overflows()) return;
        copy.remove();
        if (block.querySelector('tbody') && appendTable(block)) return;
        if (body.children.length) newPage(true);
        body.append(copy);
        if (overflows()) { copy.remove(); appendLongText(block); }
      };

      let started = false;
      for (const section of Array.from(source.children) as HTMLElement[]) {
        const blocks = (Array.from(section.children) as HTMLElement[]).flatMap((block) =>
          block.hasAttribute('data-pdf-flow-group') ? Array.from(block.children) as HTMLElement[] : [block]
        );
        if (!blocks.length) continue;
        sectionHeading = blocks[0];
        sectionLabel = section.dataset.pageLabel || 'Quotation';
        if (!started) {
          newPage();
          started = true;
        } else {
          // Keep a section heading with its introduction and at least the first table row.
          const probes: HTMLElement[] = [];
          for (const block of blocks.slice(0, 3)) {
            const probe = block.cloneNode(true) as HTMLElement;
            const table = probe.querySelector('tbody');
            if (table) {
              for (const row of Array.from(table.children).slice(1)) row.remove();
            }
            body.append(probe);
            probes.push(probe);
            if (table) break;
          }
          const needsNewPage = overflows();
          probes.forEach((probe) => probe.remove());
          if (needsNewPage) newPage();
          else {
            const page = body.parentElement!;
            page.dataset.section = `${page.dataset.section} / ${sectionLabel}`;
          }
        }
        for (const block of blocks) appendBlock(block);
      }
      // An exceptionally tall first block can cause a provisional empty page.
      for (let index = created.length - 1; index >= 0; index--) {
        if (!created[index].firstElementChild?.children.length) {
          created[index].remove();
          created.splice(index, 1);
        }
      }
      created.forEach((page, index) => {
        const footer = document.createElement('footer');
        footer.className = 'pdf-page-footer';
        const label = document.createElement('span');
        label.textContent = `${reference} · ${page.dataset.section}`;
        const number = document.createElement('span');
        number.textContent = `Page ${index + 1} of ${created.length}`;
        footer.append(label, number);
        page.append(footer);
        page.setAttribute('aria-label', `Quotation page ${index + 1} of ${created.length}`);
      });
      pages.replaceChildren(...created);
      measurementHost.remove();
      setPreviewScale();
    };
    rebuild();
    void document.fonts.ready.then(rebuild);
    for (const image of Array.from(source.querySelectorAll('img'))) {
      if (!image.complete) image.addEventListener('load', rebuild, { once: true });
    }
    const resize = new ResizeObserver(setPreviewScale);
    resize.observe(viewport);
    window.addEventListener('beforeprint', rebuild);
    return () => {
      active = false;
      resize.disconnect();
      window.removeEventListener('beforeprint', rebuild);
    };
  }, [children, reference]);

  return (
    <div ref={viewportRef} className="quote-document" role="document" aria-label="A4 quotation preview">
      <div ref={sourceRef} className="pdf-source-layout" aria-hidden="true" inert>{children}</div>
      <div ref={pagesRef} className="pdf-pages" />
    </div>
  );
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
  const origin = typeof window !== 'undefined' ? window.location.origin : `https://${catalogue.company.domain}`;
  const shareUrl = `${origin}/q/${publicId}`;

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
    <A4Document reference={`${quoteRef} · Rev ${revCode}`}>
      {/* PAGE 1: LETTERHEAD, CLIENT DETAILS & SIDE-BY-SIDE 3-PACKAGE SUMMARY */}
      <div className="pdf-flow-section" data-page-label="Quotation overview">
        <header className="pdf-letterhead">
          <UmeLogoMark size="pdf" />
          <div className="pdf-company">
            <div className="pdf-company-title">
              <p>UMAMAHESHWARA INTERIORS</p>
              <span>QUOTATION</span>
            </div>
            <p className="pdf-enterprise">Umamaheshwara Enterprises</p>
            <p className="pdf-designers">Residential and Commercial Interior Designers</p>
          </div>
          <div className="pdf-contact">
            <p>{catalogue.company.address}<br /><strong>Phone:</strong> {catalogue.company.phone}</p>
            <p className="pdf-proprietor"><span>PROPRIETOR</span><strong>{catalogue.company.proprietor}</strong></p>
          </div>
        </header>

        {/* Non-Overflowing 4-Column Quotation Reference & Validity Metadata Bar */}
        <div className="grid grid-cols-4 gap-3 bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg p-3.5 text-xs">
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
        <div className="pdf-client-summary grid grid-cols-12 gap-4 bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg p-5">
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
                Mobile: <strong className="text-[#18221D]">{draft.customer.phone}</strong>
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
                {mixByRoom ? 'Grades and PVC options vary by room. Manufacturer warranties follow the selected product’s certificate and terms.' : `${activeGradeInfo.termiteProofBadge} · ${activeGradeInfo.warrantyBanner}`}
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
            Package comparison · Base scope before optional work and discount
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
            Room-by-room package comparison
          </p>
          <div className="pdf-table-scroll border border-[#E5DFD3] rounded-lg overflow-hidden">
            <table className="pdf-room-comparison w-full text-left border-collapse text-xs">
              <colgroup><col style={{ width: '25%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '15%' }} /><col style={{ width: '18%' }} /></colgroup>
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
                    Base scope totals
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

        <div className="pdf-total-summary print-avoid-break">
          <span>Selected scope <strong>{formatINR(calc.baseScopeTotal)}</strong></span>
          {calc.optionalSelectedTotal > 0 && <span>Optional work <strong>+{formatINR(calc.optionalSelectedTotal)}</strong></span>}
          {calc.discountRupees > 0 && <span>Approved discount <strong>−{formatINR(calc.discountRupees)}</strong></span>}
          <span>Quotation total <strong>{formatINR(calc.grandTotal)}</strong></span>
        </div>

        {/* Material & Laminate Specifications */}
        <div className="bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg p-4 text-[11px] space-y-1.5 print-avoid-break">
          <p className="font-bold uppercase tracking-wider text-[#1C3A2F] text-[10px]">
            Included Material, Laminate & Hardware Specifications
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[#4A524D] list-disc list-inside">
            {catalogue.commonMaterials.map((m, idx) => (
              <li key={idx} className="leading-snug">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* PAGE 2: ITEMISED ROOM-BY-ROOM BREAKDOWN WITH ALL 3 PACKAGE RATES SIDE-BY-SIDE */}
      <div className="pdf-flow-section" data-page-label="Furniture scope & rates">
        <div className="pdf-section-heading flex items-center justify-between gap-4 border-b-2 border-[#1C3A2F] pb-3 pt-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <UmeLogoMark size="md" />
            <div className="flex flex-col justify-center gap-1 py-0.5 min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider leading-none text-[#1C3A2F]">
                UMAMAHESHWARA INTERIORS · Umamaheshwara Enterprises
              </p>
              <h2 className="text-[15px] font-bold leading-none text-[#18221D]">
                01 · Furniture scope & package rates
              </h2>
            </div>
          </div>
          <p className="text-xs font-semibold text-[#5C645F] font-mono tabular-nums whitespace-nowrap shrink-0">
            {quoteRef} · {draft.customer.name}
          </p>
        </div>

        <div className="space-y-5" data-pdf-flow-group>
          {snapshot.rooms.map((room) => {
            const rSel =
              mixByRoom && roomSelections[room.roomIndex]
                ? roomSelections[room.roomIndex]
                : wholeHomeSelection;
            const rSub = calc.roomBreakdownTotals[room.roomIndex]?.total ?? 0;

            return (
              <div
                key={room.roomIndex}
                className="pdf-table-scroll border border-[#E5DFD3] rounded-lg overflow-hidden print-avoid-break"
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
                    Selected room total: {formatINR(rSub)}
                  </span>
                </div>

                <table className="pdf-scope-table w-full text-left border-collapse text-[10.5px]">
                  <colgroup><col style={{ width: '33%' }} /><col style={{ width: '15%' }} /><col style={{ width: '10%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /></colgroup>
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
                      .filter((i) => !i.optional || selectedOptionalPointers.includes(`/rooms/${room.roomIndex}/items/${i.itemIndex}`))
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
                              <p className="font-bold text-[#18221D]">{cleanTitle}{item.optional ? " · Selected optional work" : ""}</p>
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
      <div className="pdf-flow-section" data-page-label="Payment schedule & terms">
        <div className="pdf-section-heading flex items-center justify-between gap-4 border-b-2 border-[#1C3A2F] pb-3 pt-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <UmeLogoMark size="md" />
            <div className="flex flex-col justify-center gap-1 py-0.5 min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider leading-none text-[#1C3A2F]">
                UMAMAHESHWARA INTERIORS · Umamaheshwara Enterprises
              </p>
              <h2 className="text-[15px] font-bold leading-none text-[#18221D]">
                02 · Payment schedule & terms
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
            {milestones.requiresOwnerSmallOrderRule ? (
              <>This order requires proprietor confirmation of booking and work-start terms. The milestone amounts below are indicative. Contact {catalogue.company.proprietor} before making a payment.</>
            ) : (
              <>The <strong>{formatINR(milestones.bookingRequired, true)} order booking payment</strong> is <strong>included inside your first 50% advance</strong>. It counts toward your project price ({formatINR(calc.grandTotal, true)}). Payments follow the stages below.</>
            )}
          </p>
        </div>

        {/* 4-Column Easy-to-Understand Milestone Schedule Table */}
        <div className="pdf-table-scroll border border-[#E5DFD3] rounded-lg overflow-hidden print-avoid-break">
          <table className="pdf-payment-table w-full text-left border-collapse text-xs">
            <colgroup><col style={{ width: '43%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /></colgroup>
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
              {milestones.requiresOwnerSmallOrderRule ? (
                <tr className="bg-[#FAF8F4]">
                  <td className="py-2.5 px-3.5 font-bold">Step 1 · Booking terms</td>
                  <td colSpan={3} className="py-2.5 px-3.5 text-xs text-[#5C645F]">Confirm the booking amount with the proprietor before payment.</td>
                </tr>
              ) : (
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
              )}

              {/* Stage 2 */}
              <tr>
                <td className="py-2.5 px-3.5">
                  <p className="font-bold text-[#18221D]">
                    Step 2 · Balance of 50% Work-Start Advance
                  </p>
                  <p className="text-[10.5px] text-[#5C645F]">
                    {milestones.requiresOwnerSmallOrderRule ? 'Work-start terms and booking credit require proprietor confirmation.' : `50% advance (${formatINR(milestones.advance50PercentTotal)}) less the ${formatINR(milestones.bookingRequired)} booking. Due before plywood dispatch to site.`}
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
                  {formatINR(Math.max(0, calc.grandTotal - verifiedPaidRupees), true)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="pdf-bank print-avoid-break" aria-label="Bank account and payment QR codes">
          <div className="pdf-bank-info">
            <p className="pdf-eyebrow">Official bank remittance account</p>
            <h3>{catalogue.company.bank.bankName}</h3>
            <p className="pdf-bank-branch">{catalogue.company.bank.branch}</p>
            <p className="pdf-bank-account-name">{catalogue.company.bank.accountName}</p>
            <dl className="pdf-bank-details">
              <div><dt>Account no.</dt><dd>{catalogue.company.bank.accountNumber}</dd></div>
              <div><dt>IFSC</dt><dd>{catalogue.company.bank.ifsc}</dd></div>
              <div className="pdf-upi"><dt>UPI ID</dt><dd>{catalogue.company.bank.upiId}</dd></div>
            </dl>
          </div>
          <div className="pdf-bank-qrs">
            {!milestones.requiresOwnerSmallOrderRule && (
              <DeterministicQrCode
                value={`upi://pay?${new URLSearchParams({ pa: catalogue.company.bank.upiId, pn: catalogue.company.bank.accountName, am: String(milestones.bookingRequired), cu: 'INR', tn: `Booking ${quoteRef}` }).toString()}`}
                size={94} label="UPI booking" />
            )}
            <DeterministicQrCode value={shareUrl} size={94} label="Online quotation" />
          </div>
        </section>

        {/* Notes & Terms and Conditions (Includes 0.8mm / 0.72mm Laminate Gauge Note) */}
        <div className="space-y-2.5 print-avoid-break">
          <p className="text-xs font-bold uppercase tracking-wider text-[#18221D]">
            Notes, Laminate Gauge Standard & Terms and Conditions
          </p>
          <div className="p-3 bg-[#FAF8F4] border border-[#E5DFD3] rounded-lg text-[10.5px] text-[#18221D] leading-snug">
            <strong>Technical Note on Laminate Thickness & Finish:</strong> Internal balancing/liner laminate is industry-standard <strong>0.8 mm</strong> category (actual factory sheet gauge ranges from <strong>0.72 mm to 0.80 mm</strong> as per standard ISI/manufacturer tolerance). External decorative laminate is <strong>1.0 mm</strong> thickness in the customer’s chosen finish (SF Matte or High-Gloss at the same price).
          </div>
          <div className="pdf-terms grid grid-cols-2 gap-x-6 gap-y-2 text-[10.5px] text-[#5C645F] leading-snug">
            {catalogue.termsAndConditions.map((t) => (
              <div key={t.id}>
                <strong className="text-[#18221D]">
                  {t.id}. {milestones.requiresOwnerSmallOrderRule && t.id === 1 ? 'Booking confirmation' : milestones.requiresOwnerSmallOrderRule && t.id === 2 ? 'Work-start confirmation' : t.title}:
                </strong>{' '}
                {milestones.requiresOwnerSmallOrderRule && [1, 2].includes(t.id) ? 'Booking amount, credit and work-start timing require written proprietor confirmation for this order before payment.' : t.clause}
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
    </A4Document>
  );
};
