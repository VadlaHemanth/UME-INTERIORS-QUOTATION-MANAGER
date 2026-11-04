import { validateCompanySettings } from '../src/lib/company-settings';
import { KARTHIK_HISTORICAL_RATE_OVERRIDES } from '../src/lib/historicalData';
import { DEFAULT_UME_CATALOGUE, extractAndMergeRateCardFromDraft, formatCleanItemDescription, standardizeCompetitorItemName, getPackageDisplayName, mergeRateCardJsonIntoCatalogue, type StudioCatalogue } from '../src/lib/catalogue';
import { calculateMilestoneSchedule, calculateQuotationPricing, computeCustomerSelectionTotal, type PricedQuotationSnapshot } from '../src/lib/pricing';
import { applyStandardPvcScopes } from '../src/lib/pvc-scope';
import { type QuotationDraftV2, type ResolvedPackageSelection, validateQuotationDraftV2 } from '../src/lib/schema';
import { randomHex, type OwnerAccount } from './auth';
import { carryAgreedSelection, indiaDate, latestRecord, nextQuoteNumber, quoteExpiry, seriesIds, type FinalizedWorkOrder } from '../src/lib/quote-workflow';
import { DEFAULT_MATERIAL_WORDING, packageAllowances, syncDrawerAllowances } from '../src/lib/commercial-spec';

export interface PaymentLedgerEntry {
  id: string;
  publicId: string;
  quoteNumber: string;
  customerName: string;
  revision: number;
  selectedPackageLabel: string;
  amountRupees: number;
  method: 'UPI / PhonePe' | 'NEFT / RTGS / IMPS';
  utrReference: string;
  status: 'Payment submitted' | 'Verified Paid' | 'Rejected';
  submittedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface CustomerSelectionHistoryEntry {
  id: string;
  summaryLabel: string;
  finalTotalRupees: number;
  mixByRoom: boolean;
  wholeHomeSelection: ResolvedPackageSelection;
  roomSelections: Record<number, ResolvedPackageSelection>;
  selectedOptionalPointers: string[];
  savedAt: string;
}

export interface CustomerFeedbackEntry {
  id: string;
  topic: string;
  message: string;
  submittedAt: string;
}

export interface PublishedQuotationRecord {
  publicId: string;
  deletedAt?: string;
  revision: number;
  previousPublicId?: string;
  supersededByPublicId?: string;
  status:
    | 'Draft'
    | 'Sent'
    | 'Viewed'
    | 'Package chosen'
    | 'Booking submitted'
    | 'Booking paid'
    | 'Advance paid'
    | 'Closed'
    | 'Lost';
  publishedAt: string;
  viewsCount: number;
  lastViewedAt: string | null;
  draft: QuotationDraftV2;
  snapshot: PricedQuotationSnapshot;
  approvedDiscountRupees: number;
  defaultSentPackage: ResolvedPackageSelection;
  lastCustomerSelection: {
    wholeHomeSelection: ResolvedPackageSelection;
    mixByRoom: boolean;
    roomSelections: Record<number, ResolvedPackageSelection>;
    selectedOptionalPointers: string[];
    acceptedTermsAt: string | null;
    savedByCustomer?: boolean;
    savedAt?: string | null;
    savedFinalTotalRupees?: number;
    summaryLabel?: string;
  };
  selectionHistory?: CustomerSelectionHistoryEntry[];
  customerFeedback?: CustomerFeedbackEntry[];
  catalogueSnapshot?: StudioCatalogue;
  workOrder?: FinalizedWorkOrder;
}

export interface StudioState {
  catalogue: StudioCatalogue;
  quotes: PublishedQuotationRecord[];
  ledger: PaymentLedgerEntry[];
  owner?: OwnerAccount;
  loginAttempts?: Record<string, { count: number; resetAt: number }>;
}
export interface ApiContext { body: any; params: Record<string, string> }
export interface ApiReply { status(code: number): ApiReply; json(body: any): void }
export interface ApiRouter {
  get(path: string, handler: (req: ApiContext, res: ApiReply) => void): void;
  post(path: string, handler: (req: ApiContext, res: ApiReply) => void): void;
  put(path: string, handler: (req: ApiContext, res: ApiReply) => void): void;
  patch(path: string, handler: (req: ApiContext, res: ApiReply) => void): void;
  delete(path: string, handler: (req: ApiContext, res: ApiReply) => void): void;
}
export function emptyState(): StudioState { return { catalogue: structuredClone(DEFAULT_UME_CATALOGUE), quotes: [], ledger: [] }; }

function buildSelectionSummaryLabel(
  snapshot: PricedQuotationSnapshot,
  wholeHome: ResolvedPackageSelection,
  mixByRoom: boolean,
  roomSelections: Record<number, ResolvedPackageSelection>
): string {
  const pkgLabel = getPackageDisplayName(wholeHome.grade);
  const pvcLabel = wholeHome.protection === 'With PVC' ? 'With 6mm PVC' : 'Without PVC';
  if (!mixByRoom) {
    return `${pkgLabel} · ${pvcLabel} · ${wholeHome.finish}${
      wholeHome.brand_preference ? ` (${wholeHome.brand_preference})` : ''
    }`;
  }
  const roomParts = snapshot.rooms.map((r) => {
    const sel = roomSelections[r.roomIndex] || wholeHome;
    return `${r.name}: ${getPackageDisplayName(sel.grade)}/${sel.protection === 'With PVC' ? '+PVC' : 'No-PVC'}/${sel.finish}`;
  });
  return `Room-Wise Mix (${roomParts.join(' · ')})`;
}


export function registerDataRoutes(app: ApiRouter, state: StudioState, markChanged: () => void) {
  let activeCatalogue = state.catalogue;
  // Older records predate material snapshots. Capture their current approved
  // specification once so future rate/settings saves cannot rewrite history.
  for (const record of state.quotes) if (!record.catalogueSnapshot) {
    record.catalogueSnapshot = structuredClone(activeCatalogue);
    markChanged();
  }
  const quotesStore = new Map(state.quotes.map((record) => [record.publicId, record]));
  const paymentLedger = state.ledger;
  const prepareDraft = (draft: QuotationDraftV2) => {
    const next = applyStandardPvcScopes(draft, activeCatalogue);
    for (const room of next.rooms) for (const item of room.items) {
      item.name = standardizeCompetitorItemName(item.name || '', item.work_type || '', room.name || '');
      if (item.source_text_en) item.source_text_en = formatCleanItemDescription(item.source_text_en,item.name,item.work_type || '',room.name || '');
    }
    return next;
  };
  const allRecords = () => Array.from(quotesStore.values());
  const visibleRecords = () => allRecords().filter(record => !record.deletedAt);
  const latest = (id: string) => {
    const record = latestRecord(allRecords(), id);
    return record?.deletedAt ? undefined : record;
  };
  const paid = (id: string) => {
    const ids = seriesIds(allRecords(), id);
    return paymentLedger.filter(p => ids.has(p.publicId) && p.status === 'Verified Paid').reduce((sum, p) => sum + p.amountRupees, 0);
  };
  const pending = (id: string) => {
    const ids = seriesIds(allRecords(), id);
    return paymentLedger.filter(p => ids.has(p.publicId) && p.status === 'Payment submitted').length;
  };
  const startRevision = (previous: PublishedQuotationRecord) => {
    const record = structuredClone(previous);
    record.publicId = `ume${randomHex(16)}`;
    record.previousPublicId = previous.publicId;
    delete record.supersededByPublicId;
    record.revision += 1;
    record.publishedAt = new Date().toISOString();
    record.viewsCount = 0;
    record.lastViewedAt = null;
    previous.supersededByPublicId = record.publicId;
    quotesStore.set(record.publicId, record);
    return record;
  };
  const finalize = (record: PublishedQuotationRecord) => {
    const calc = computeCustomerSelectionTotal(record.snapshot, { ...record.lastCustomerSelection, approvedDiscountRupees: record.approvedDiscountRupees });
    record.workOrder = { confirmedAt: new Date().toISOString(), sourceRevision: record.revision, selection: structuredClone(record.lastCustomerSelection), totalRupees: calc.grandTotal };
    record.lastCustomerSelection.savedByCustomer = true;
    const advance = calculateMilestoneSchedule(calc.grandTotal, paid(record.publicId)).advance50PercentTotal;
    record.status = paid(record.publicId) >= advance ? 'Advance paid' : 'Booking paid';
  };
  function saveDbToDisk() {
    state.catalogue = activeCatalogue;
    state.quotes = Array.from(quotesStore.values());
    state.ledger = paymentLedger;
    markChanged();
  }
  // Private Customer Quote Lookup (returns ONLY the single matched customer quote, never other quotes)
  app.post('/api/quotes/lookup', (req, res) => {
    const { codeOrLink, phone } = req.body as { codeOrLink?: string; phone?: string };
    const rawCode = String(codeOrLink || '').trim();
    const rawPhone = String(phone || '').replace(/\D/g, '');

    if (!rawCode) {
      res.status(400).json({
        error: 'Please enter your Private Quotation Link, Access Token, or Quotation Number.',
      });
      return;
    }

    const tokenMatch = /ume[a-f0-9]{16,40}/i.exec(rawCode);
    let matchedRecord: PublishedQuotationRecord | undefined;

    if (tokenMatch) {
      matchedRecord = quotesStore.get(tokenMatch[0]);
    } else if (quotesStore.has(rawCode)) {
      matchedRecord = quotesStore.get(rawCode);
    } else {
      const byQuoteNo = allRecords().filter(q => !q.supersededByPublicId).find(
        (q) => (q.draft.quote.number || '').toLowerCase() === rawCode.toLowerCase()
      );
      if (byQuoteNo) {
        const quotePhoneDigits = String(byQuoteNo.draft.customer.phone || '').replace(/\D/g, '');
        if (
          quotePhoneDigits.length >= 10 &&
          rawPhone.length >= 10 && quotePhoneDigits.slice(-10) === rawPhone.slice(-10)
        ) {
          matchedRecord = byQuoteNo;
        } else {
          res.status(403).json({
            error:
              'To open a quotation by Quote Number, please also enter the registered customer phone number (or use your direct private /q/ link).',
          });
          return;
        }
      }
    }

    if (!matchedRecord || !latest(matchedRecord.publicId) || latest(matchedRecord.publicId)?.status === 'Draft') {
      res.status(404).json({
        error:
          'No quotation matched that access code. Please check the private quotation link sent to your WhatsApp by UME Interiors.',
      });
      return;
    }

    matchedRecord = latest(matchedRecord.publicId)!;
    matchedRecord.viewsCount += 1;
    matchedRecord.lastViewedAt = new Date().toISOString();
    if (matchedRecord.status === 'Sent') {
      matchedRecord.status = 'Viewed';
    }
    saveDbToDisk();

    const verifiedPaid = paymentLedger
      .filter((p) => p.publicId === matchedRecord!.publicId && p.status === 'Verified Paid')
      .reduce((acc, p) => acc + p.amountRupees, 0);
    const pendingPayments = paymentLedger.filter(
      (p) => p.publicId === matchedRecord!.publicId && p.status === 'Payment submitted'
    );

    res.json({
      quote: matchedRecord,
      catalogue: { ...(matchedRecord.catalogueSnapshot || activeCatalogue), company: activeCatalogue.company },
      verifiedPaidRupees: paid(matchedRecord.publicId),
      pendingPaymentsCount: pending(matchedRecord.publicId),
    });
  });

  // Get Catalogue & All Quotes & Ledger (for Owner Studio)
  app.get('/api/studio/bootstrap', (_req, res) => {
    res.json({
      catalogue: activeCatalogue,
      quotes: visibleRecords(),
      ledger: paymentLedger,
    });
  });

  app.delete('/api/studio/quotes/:publicId', (req, res) => {
    if (req.body.confirmDelete !== true) { res.status(400).json({error:'Confirm deletion of this quotation and all its revisions.'}); return; }
    const record = latest(req.params.publicId);
    if (!record) { res.status(404).json({error:'Quotation not found.'}); return; }
    const ids = seriesIds(allRecords(),record.publicId);
    const deletedAt = new Date().toISOString();
    for (const id of ids) { const previous = quotesStore.get(id); if (previous) previous.deletedAt = deletedAt; }
    // Retain the private financial/history records while revoking every customer link.
    saveDbToDisk();
    res.json({ok:true,quotes:visibleRecords(),ledger:paymentLedger});
  });

  // Public shell branding contains no bank, rate-card or owner-session data.
  app.post('/api/studio/drafts', (req, res) => {
    const draft = prepareDraft(req.body.draft);
    const validation = validateQuotationDraftV2(draft, {reviewedOwnerRequests:false});
    if (!validation.validForDraft) { res.status(422).json({error:'Check the draft format before saving.',validation}); return; }
    const existing = req.body.publicId ? quotesStore.get(req.body.publicId) : undefined;
    if (req.body.publicId && (!existing || existing.deletedAt)) { res.status(404).json({error:'Draft not found.'}); return; }
    if (existing && existing.status !== 'Draft') { res.status(409).json({error:'Publish an update to save changes to an already published quotation.'}); return; }
    const defaultPackage: ResolvedPackageSelection = {grade:draft.recommended?.grade || 'Base',protection:draft.recommended?.protection || 'Standard',finish:draft.recommended?.finish || 'SF',brand_preference:draft.recommended?.brand_preference || null};
    draft.quote.number ||= nextQuoteNumber(allRecords()); draft.quote.date ||= indiaDate();
    const record: PublishedQuotationRecord = {publicId:existing?.publicId || `ume${randomHex(16)}`,revision:0,status:'Draft',publishedAt:new Date().toISOString(),viewsCount:0,lastViewedAt:null,draft,snapshot:calculateQuotationPricing(draft,activeCatalogue),approvedDiscountRupees:Math.max(0,Number(req.body.approvedDiscountRupees)||0),defaultSentPackage:defaultPackage,lastCustomerSelection:{wholeHomeSelection:defaultPackage,mixByRoom:false,roomSelections:{},selectedOptionalPointers:[],acceptedTermsAt:null},catalogueSnapshot:structuredClone(activeCatalogue)};
    quotesStore.set(record.publicId,record); saveDbToDisk();
    res.json({record,quotes:visibleRecords()});
  });

  // Public shell branding contains no bank, rate-card or owner-session data.
  app.get('/api/company', (_req, res) => {
    const { bank: _bank, ...company } = activeCatalogue.company;
    res.json({ company });
  });

  // Company edits merge into the latest state without replacing the rate card.
  app.put('/api/studio/company', (req, res) => {
    const result = validateCompanySettings(req.body.company);
    if (!result.valid || !result.company) {
      res.status(400).json({ error: 'Review the highlighted business and payment details.', errors: result.errors });
      return;
    }
    activeCatalogue = { ...activeCatalogue, company: result.company };
    saveDbToDisk();
    res.json({ company: activeCatalogue.company });
  });

  // Update Studio Catalogue & Rate Card (previously published revisions retain their immutable snapshot!)
  app.put('/api/studio/catalogue', (req, res) => {
    const updated = req.body as StudioCatalogue;
    if (!updated || !updated.workTypes || !updated.grades) {
      res.status(400).json({ error: 'Invalid catalogue payload.' });
      return;
    }
    if (!Array.isArray(updated.commonMaterials) || updated.commonMaterials.length > 40 || updated.commonMaterials.some(line => typeof line !== 'string' || !line.trim() || line.length > 2000) || (updated.materialWording && Object.keys(DEFAULT_MATERIAL_WORDING).some(key => { const value = updated.materialWording![key as keyof typeof DEFAULT_MATERIAL_WORDING]; return typeof value !== 'string' || !value.trim() || value.length > 2000; }))) {
      res.status(400).json({error:'Enter a material specification in each field (up to 2,000 characters), or remove an unused material.'}); return;
    }
    for (const grade of Object.values(updated.grades)) {
      const allowance = packageAllowances(grade);
      if (Object.entries(allowance).some(([key, value]) => key !== 'additionalAllowances' && (!Number.isSafeInteger(value) || Number(value) < 0)) || allowance.includedBedroomDrawersMax < allowance.includedBedroomDrawersMin || !grade.approvedBrands?.length || grade.approvedBrands.some(b => !b.name?.trim() || !b.spec?.trim() || !Number.isInteger(b.warrantyYears) || b.warrantyYears < 0) || allowance.additionalAllowances?.some(a => !a.name?.trim() || !a.unit?.trim() || !Number.isSafeInteger(a.amountRupees) || a.amountRupees < 0)) {
        res.status(400).json({ error: 'Check package allowances, drawer limits, plywood names, grades and warranty years.' }); return;
      }
    }
    for (const wt of Object.values(updated.workTypes)) for (const rates of Object.values(wt.rates)) if (Object.values(rates).some(rate => !Number.isFinite(rate) || rate < 0)) {
      res.status(400).json({error:'Rates must be zero or a positive amount.'}); return;
    }
    const drawers = updated.workTypes['Additional internal drawer'];
    if (drawers) for (const grade of ['Base','Normal','Premium'] as const) updated.grades[grade].allowances = {...packageAllowances(updated.grades[grade]),extraDrawerRupees:drawers.rates[grade].Standard};
    // Business/payment details have their own validated endpoint; stale rate-card
    // tabs must not restore an old payment recipient or business address.
    activeCatalogue = { ...updated, company: activeCatalogue.company };
    saveDbToDisk();
    res.json({ catalogue: activeCatalogue });
  });

  // Direct Rate Card JSON Merge into Catalogue (Zero AI model — 100% direct JSON format)
  app.post('/api/assistant/ratecard', (req, res) => {
    const { rateCardJson, applyImmediately } = req.body as {
      rateCardJson?: any;
      applyImmediately?: boolean;
    };

    try {
      if (!rateCardJson) {
        res.status(400).json({ error: 'Please provide a valid quotation-studio.ratecard.v2 JSON object.' });
        return;
      }
      const parsed =
        typeof rateCardJson === 'string' ? JSON.parse(rateCardJson) : rateCardJson;
      const merged = mergeRateCardJsonIntoCatalogue(activeCatalogue, parsed);
      if (applyImmediately) {
        activeCatalogue = syncDrawerAllowances(merged.catalogue);
        saveDbToDisk();
      }
      res.json({
        ok: true,
        patch: merged.patch,
        catalogue: merged.catalogue,
        addedOrUpdatedKeys: merged.addedOrUpdatedKeys,
        source: 'direct_json',
      });
    } catch (err: any) {
      res.status(400).json({
        ok: false,
        error: err?.message || 'Invalid Rate Card JSON format.',
      });
    }
  });

  // Update Owner's Default Sending Package for a Quote (Always updates defaultSentPackage & active selection so customer sees it immediately)
  app.patch('/api/studio/quotes/:publicId/default-package', (req, res) => {
    const previous = latest(req.params.publicId);
    if (!previous) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
    if (previous.workOrder) { res.status(409).json({error:'This work order is confirmed. Edit and publish a recorded revision to change its scope.'}); return; }

    const defaultPackage: ResolvedPackageSelection =
      req.body.defaultPackage || req.body.defaultSentPackage;

    if (!defaultPackage || !defaultPackage.grade) {
      res.status(400).json({ error: 'Invalid default package specification.' });
      return;
    }

    const normalizedPkg: ResolvedPackageSelection = {
      grade: defaultPackage.grade,
      protection: defaultPackage.protection || 'Standard',
      finish: defaultPackage.finish || 'SF',
      brand_preference:
        defaultPackage.brand_preference ||
        activeCatalogue.grades[defaultPackage.grade]?.approvedBrands[0]?.name ||
        null,
    };

    const rec = startRevision(previous);
    rec.defaultSentPackage = structuredClone(normalizedPkg);
    rec.draft.recommended = structuredClone(normalizedPkg);

    const calc = computeCustomerSelectionTotal(rec.snapshot, {
      wholeHomeSelection: normalizedPkg,
      mixByRoom: false,
      roomSelections: {},
      selectedOptionalPointers: rec.lastCustomerSelection.selectedOptionalPointers || [],
      approvedDiscountRupees: rec.approvedDiscountRupees,
    });
    rec.lastCustomerSelection = {
      wholeHomeSelection: structuredClone(normalizedPkg),
      mixByRoom: false,
      roomSelections: {},
      selectedOptionalPointers: rec.lastCustomerSelection.selectedOptionalPointers || [],
      acceptedTermsAt: rec.lastCustomerSelection.acceptedTermsAt,
      savedByCustomer: false,
      savedAt: null,
      savedFinalTotalRupees: calc.grandTotal,
      summaryLabel: buildSelectionSummaryLabel(rec.snapshot, normalizedPkg, false, {}),
    };

    saveDbToDisk();
    res.json({
      ok: true,
      quote: rec,
      quotes: visibleRecords(),
    });
  });

  // Update Any Line Item, Room, Customer Info, or Default Package on an Existing Published Quote in Place
  app.patch('/api/quotes/:publicId/draft', (req, res) => {
    const previous = latest(req.params.publicId);
    if (!previous) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    const { draft, defaultSentPackage, approvedDiscountRupees } = req.body as {
      draft?: QuotationDraftV2;
      defaultSentPackage?: ResolvedPackageSelection;
      approvedDiscountRupees?: number;
    };

    if (draft) {
      const validation = validateQuotationDraftV2(draft, { reviewedOwnerRequests: true });
      if (!validation.readyForPublish) { res.status(422).json({ error: 'Resolve the missing quotation details before saving a revision.', validation }); return; }
    }
    const rec = startRevision(previous);

    if (draft && Array.isArray(draft.rooms)) {
      const normalizedDraft = prepareDraft(draft);
      const autoMerged = extractAndMergeRateCardFromDraft(activeCatalogue, normalizedDraft);
      activeCatalogue = syncDrawerAllowances(autoMerged.catalogue);
      rec.draft = structuredClone(normalizedDraft);
      delete rec.draft.rate_card_updates;
      rec.draft.quote.number = previous.draft.quote.number;
      rec.draft.quote.date = indiaDate();
      if (rec.draft.quote.valid_until === previous.draft.quote.valid_until) rec.draft.quote.valid_until = quoteExpiry(rec.draft.quote.date);
      (rec as any).linesCustomizedByOwner = true;
      const isKarthik = rec.publicId === 'ume3b71e904a52c88d1f603e219c4a7b810';
      rec.snapshot = calculateQuotationPricing(
        rec.draft,
        activeCatalogue,
        isKarthik ? { lineRateOverrides: KARTHIK_HISTORICAL_RATE_OVERRIDES } : undefined
      );
    }

    if (typeof approvedDiscountRupees === 'number') {
      rec.approvedDiscountRupees = Math.max(0, Math.round(approvedDiscountRupees));
    }

    if (defaultSentPackage && defaultSentPackage.grade && !previous.workOrder) {
      const normalizedPkg: ResolvedPackageSelection = {
        grade: defaultSentPackage.grade,
        protection: defaultSentPackage.protection || 'Standard',
        finish: defaultSentPackage.finish || 'SF',
        brand_preference:
          defaultSentPackage.brand_preference ||
          activeCatalogue.grades[defaultSentPackage.grade]?.approvedBrands[0]?.name ||
          null,
      };
      rec.defaultSentPackage = structuredClone(normalizedPkg);
      rec.draft.recommended = structuredClone(normalizedPkg);
      rec.lastCustomerSelection.wholeHomeSelection = structuredClone(normalizedPkg);
      rec.lastCustomerSelection.mixByRoom = false;
      rec.lastCustomerSelection.roomSelections = {};
      rec.lastCustomerSelection.savedByCustomer = false;
    }

    const calc = computeCustomerSelectionTotal(rec.snapshot, {
      wholeHomeSelection: rec.lastCustomerSelection.wholeHomeSelection,
      mixByRoom: rec.lastCustomerSelection.mixByRoom,
      roomSelections: rec.lastCustomerSelection.roomSelections,
      selectedOptionalPointers: rec.lastCustomerSelection.selectedOptionalPointers || [],
      approvedDiscountRupees: rec.approvedDiscountRupees,
    });
    rec.lastCustomerSelection.savedFinalTotalRupees = calc.grandTotal;
    rec.lastCustomerSelection.summaryLabel = buildSelectionSummaryLabel(
      rec.snapshot,
      rec.lastCustomerSelection.wholeHomeSelection,
      rec.lastCustomerSelection.mixByRoom,
      rec.lastCustomerSelection.roomSelections
    );

    rec.catalogueSnapshot = structuredClone(activeCatalogue);
    if (previous.workOrder) { rec.lastCustomerSelection = {...previous.lastCustomerSelection,...carryAgreedSelection(previous.draft,rec.draft,previous.workOrder.selection)}; finalize(rec); }

    saveDbToDisk();
    res.json({
      ok: true,
      quote: rec,
      catalogue: activeCatalogue,
      quotes: visibleRecords(),
    });
  });

  // Get Public Quotation by publicId
  app.get('/api/quotes/:publicId', (req, res) => {
    const rec = latest(req.params.publicId);
    if (!rec || rec.status === 'Draft') {
      res.status(404).json({ error: 'Quotation link not found.' });
      return;
    }
    rec.viewsCount += 1;
    rec.lastViewedAt = new Date().toISOString();
    if (rec.status === 'Sent') {
      rec.status = 'Viewed';
    }
    saveDbToDisk();

    const verifiedPaid = paymentLedger
      .filter((p) => p.publicId === rec.publicId && p.status === 'Verified Paid')
      .reduce((acc, p) => acc + p.amountRupees, 0);
    const pendingPayments = paymentLedger.filter(
      (p) => p.publicId === rec.publicId && p.status === 'Payment submitted'
    );

    res.json({
      quote: rec,
      catalogue: { ...(rec.catalogueSnapshot || activeCatalogue), company: activeCatalogue.company },
      verifiedPaidRupees: paid(rec.publicId),
      pendingPaymentsCount: pending(rec.publicId),
    });
  });

  // Save Customer Selection / Terms Acceptance on Public Quote
  app.patch('/api/quotes/:publicId/selection', (req, res) => {
    const rec = latest(req.params.publicId);
    if (!rec || rec.status === 'Draft') {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
    if (rec.workOrder) { res.status(409).json({error:'Your package is confirmed in the work order. Please contact UME to request a recorded revision.'}); return; }
    const {
      wholeHomeSelection,
      mixByRoom,
      roomSelections,
      selectedOptionalPointers,
      acceptedTerms,
      savedByCustomer,
      explicitCustomerSave,
    } = req.body;

    if (wholeHomeSelection) {
      rec.lastCustomerSelection.wholeHomeSelection = wholeHomeSelection;
    }
    if (typeof mixByRoom === 'boolean') {
      rec.lastCustomerSelection.mixByRoom = mixByRoom;
    }
    if (roomSelections) {
      rec.lastCustomerSelection.roomSelections = roomSelections;
    }
    if (Array.isArray(selectedOptionalPointers)) {
      rec.lastCustomerSelection.selectedOptionalPointers = selectedOptionalPointers;
    }
    if (acceptedTerms) {
      rec.lastCustomerSelection.acceptedTermsAt = new Date().toISOString();
    }

    const calc = computeCustomerSelectionTotal(rec.snapshot, {
      wholeHomeSelection: rec.lastCustomerSelection.wholeHomeSelection,
      mixByRoom: rec.lastCustomerSelection.mixByRoom,
      roomSelections: rec.lastCustomerSelection.roomSelections,
      selectedOptionalPointers: rec.lastCustomerSelection.selectedOptionalPointers,
      approvedDiscountRupees: rec.approvedDiscountRupees,
    });

    const summaryLabel = buildSelectionSummaryLabel(
      rec.snapshot,
      rec.lastCustomerSelection.wholeHomeSelection,
      rec.lastCustomerSelection.mixByRoom,
      rec.lastCustomerSelection.roomSelections
    );

    rec.lastCustomerSelection.savedFinalTotalRupees = calc.grandTotal;
    rec.lastCustomerSelection.summaryLabel = summaryLabel;

    if (savedByCustomer || explicitCustomerSave) {
      const nowIso = new Date().toISOString();
      rec.lastCustomerSelection.savedByCustomer = true;
      rec.lastCustomerSelection.savedAt = nowIso;

      const historyEntry: CustomerSelectionHistoryEntry = {
        id: `sel-${randomHex(4)}`,
        summaryLabel,
        finalTotalRupees: calc.grandTotal,
        mixByRoom: rec.lastCustomerSelection.mixByRoom,
        wholeHomeSelection: structuredClone(rec.lastCustomerSelection.wholeHomeSelection),
        roomSelections: structuredClone(rec.lastCustomerSelection.roomSelections),
        selectedOptionalPointers: [...rec.lastCustomerSelection.selectedOptionalPointers],
        savedAt: nowIso,
      };
      rec.selectionHistory = [historyEntry, ...(rec.selectionHistory || [])];
    }

    if (rec.status === 'Sent' || rec.status === 'Viewed') {
      rec.status = 'Package chosen';
    }

    saveDbToDisk();
    res.json({ quote: rec });
  });

  // Submit Customer Change Request / Feedback on Public Quote
  app.post('/api/quotes/:publicId/feedback', (req, res) => {
    const rec = latest(req.params.publicId);
    if (!rec || rec.status === 'Draft') {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
    const { topic, message } = req.body as { topic?: string; message?: string };
    const cleanMsg = String(message || '').trim();
    if (!cleanMsg) {
      res.status(400).json({ error: 'Please enter your requested change or message.' });
      return;
    }
    const existingList = rec.customerFeedback || [];
    const entry: CustomerFeedbackEntry = {
      id: `fb-${randomHex(4)}`,
      topic: String(topic || 'Scope / Measurement Change'),
      message: cleanMsg,
      submittedAt: new Date().toISOString(),
    };
    rec.customerFeedback = [entry, ...existingList];
    rec.draft.owner_requests = [
      {
        path: '',
        text: `[Customer Feedback — ${entry.topic}]: ${cleanMsg}`,
      },
      ...(rec.draft.owner_requests || []),
    ];

    saveDbToDisk();
    res.status(201).json({ ok: true, entry, quote: rec });
  });

  // Submit Customer Booking Payment Reference (No-Login Flow)
  app.post('/api/quotes/:publicId/payments', (req, res) => {
    const rec = latest(req.params.publicId);
    if (!rec || rec.status === 'Draft') {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    const checkedSelection = computeCustomerSelectionTotal(rec.snapshot, {
      wholeHomeSelection: rec.lastCustomerSelection.wholeHomeSelection,
      mixByRoom: rec.lastCustomerSelection.mixByRoom,
      roomSelections: rec.lastCustomerSelection.roomSelections,
      selectedOptionalPointers: rec.lastCustomerSelection.selectedOptionalPointers || [],
      approvedDiscountRupees: rec.approvedDiscountRupees,
    });
    if (calculateMilestoneSchedule(checkedSelection.grandTotal).requiresOwnerSmallOrderRule) {
      res.status(400).json({ error: 'Please ask UME to confirm the booking schedule for this small project before paying.' });
      return;
    }

    if (rec.draft.quote.valid_until) {
      const today = new Date().toISOString().slice(0, 10);
      if (rec.draft.quote.valid_until < today) {
        res.status(400).json({
          error:
            'This quotation link has expired. Please request a refreshed quotation from UME Interiors before submitting payment.',
        });
        return;
      }
    }

    const { utrReference, method, amountRupees, selectedPackageLabel } = req.body;
    if (method !== 'NEFT / RTGS / IMPS' && amountRupees > activeCatalogue.company.bank.upiLimitRupees) {
      res.status(400).json({ error: 'This amount exceeds the configured UPI limit. Use a bank transfer instead.' });
      return;
    }
    const cleanUtr = String(utrReference || '').trim();
    if (cleanUtr.length < 6) {
      res.status(400).json({
        error: 'Please enter a valid bank UTR or 12-digit UPI reference number.',
      });
      return;
    }

    const duplicate = paymentLedger.find(
      (p) => p.utrReference.toLowerCase() === cleanUtr.toLowerCase() && p.status !== 'Rejected'
    );
    if (duplicate) {
      res.status(409).json({
        error: `Reference "${cleanUtr}" has already been submitted. Duplicate credit is blocked; our team will verify your existing entry.`,
      });
      return;
    }

    const entry: PaymentLedgerEntry = {
      id: `pay-${randomHex(6)}`,
      publicId: rec.publicId,
      quoteNumber: rec.draft.quote.number || 'UME-QUOTE',
      customerName: rec.draft.customer.name || 'Customer',
      revision: rec.revision,
      selectedPackageLabel: selectedPackageLabel || 'Selected Package',
      amountRupees: Number(amountRupees) || 50000,
      method: method === 'NEFT / RTGS / IMPS' ? 'NEFT / RTGS / IMPS' : 'UPI / PhonePe',
      utrReference: cleanUtr,
      status: 'Payment submitted',
      submittedAt: new Date().toISOString(),
    };

    paymentLedger.unshift(entry);
    rec.lastCustomerSelection.acceptedTermsAt =
      rec.lastCustomerSelection.acceptedTermsAt || new Date().toISOString();
    if (rec.status !== 'Booking paid' && rec.status !== 'Advance paid') {
      rec.status = 'Booking submitted';
    }

    saveDbToDisk();
    res.status(201).json({ entry, quote: rec });
  });

  // Owner Verify or Reject Payment in Private Ledger
  app.patch('/api/studio/payments/:paymentId', (req, res) => {
    const entry = paymentLedger.find((p) => p.id === req.params.paymentId);
    if (!entry) {
      res.status(404).json({ error: 'Ledger entry not found.' });
      return;
    }
    const { action, rejectionReason } = req.body as {
      action: 'verify' | 'reject';
      rejectionReason?: string;
    };

    const quote = latest(entry.publicId);
    if (action === 'verify') {
      entry.status = 'Verified Paid';
      entry.verifiedAt = new Date().toISOString();
      if (quote) {
        const calc = computeCustomerSelectionTotal(quote.snapshot, { ...quote.lastCustomerSelection, approvedDiscountRupees: quote.approvedDiscountRupees });
        const threshold = Math.min(50000, calc.grandTotal * .5);
        if (paid(quote.publicId) >= threshold) finalize(quote);
      }
    } else {
      entry.status = 'Rejected';
      entry.rejectionReason = rejectionReason || 'Bank statement reference mismatch';
      if (quote) {
        const calc = computeCustomerSelectionTotal(quote.snapshot,{...quote.lastCustomerSelection,approvedDiscountRupees:quote.approvedDiscountRupees});
        if (paid(quote.publicId) < Math.min(50000,calc.grandTotal*.5)) { delete quote.workOrder; quote.status='Package chosen'; }
        else finalize(quote);
      }
    }

    saveDbToDisk();
    res.json({ entry, ledger: paymentLedger, quotes: visibleRecords() });
  });

  // Screenshots arrive in WhatsApp. The owner records the matching bank credit here.
  app.post('/api/studio/quotes/:publicId/verified-payment', (req, res) => {
    const record = latest(req.params.publicId);
    const amount = Number(req.body.amountRupees);
    const reference = String(req.body.reference || '').trim();
    if (!record || record.status === 'Draft' || !Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000 || !reference || reference.length > 120) {
      res.status(400).json({error:'Choose a quotation, enter the verified amount and bank reference.'}); return;
    }
    if (paymentLedger.some(p => p.utrReference.toLowerCase() === reference.toLowerCase() && p.status !== 'Rejected')) {
      res.status(409).json({error:'This bank reference is already recorded.'}); return;
    }
    const entry: PaymentLedgerEntry = { id:`pay-${randomHex(8)}`, publicId:record.publicId, quoteNumber:record.draft.quote.number || '', customerName:record.draft.customer.name || '', revision:record.revision, selectedPackageLabel:record.lastCustomerSelection.summaryLabel || '', amountRupees:amount, method:'NEFT / RTGS / IMPS', utrReference:reference, status:'Verified Paid', submittedAt:new Date().toISOString(), verifiedAt:new Date().toISOString() };
    paymentLedger.unshift(entry);
    const calc = computeCustomerSelectionTotal(record.snapshot, {...record.lastCustomerSelection, approvedDiscountRupees:record.approvedDiscountRupees});
    if (paid(record.publicId) >= Math.min(50000, calc.grandTotal * .5)) finalize(record);
    saveDbToDisk();
    res.status(201).json({entry, quote:record, ledger:paymentLedger, quotes:visibleRecords()});
  });

  // Publish or Revise a Validated v2 Draft directly from JSON (Creates cryptographic 128-bit publicId & immutable snapshot)
  app.post('/api/studio/publish', (req, res) => {
    const {
      draft,
      reviewedOwnerRequests,
      supersedePublicId,
      approvedDiscountRupees,
      defaultSentPackage,
      confirmWorkOrderSelection,
    } = req.body as {
      draft: QuotationDraftV2;
      reviewedOwnerRequests?: boolean;
      supersedePublicId?: string;
      approvedDiscountRupees?: number;
      defaultSentPackage?: ResolvedPackageSelection;
      confirmWorkOrderSelection?: boolean;
    };

    const normalizedDraft = prepareDraft(draft);
    const validation = validateQuotationDraftV2(normalizedDraft, { reviewedOwnerRequests });
    if (!validation.readyForPublish) {
      res.status(422).json({
        error: 'Quotation failed publication gates. Resolve all listed issues before publishing.',
        validation,
      });
      return;
    }

    if (supersedePublicId && !latest(supersedePublicId)) { res.status(404).json({error:'The quotation to update no longer exists.'}); return; }
    // Automatically extract and persist any rate_card_updates or new work types from the draft into activeCatalogue
    const autoMerged = extractAndMergeRateCardFromDraft(activeCatalogue, normalizedDraft);
    activeCatalogue = syncDrawerAllowances(autoMerged.catalogue);

    const now = new Date();
    const todayStr = indiaDate(now);
    const validUntilDate = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    const finalizedDraft: QuotationDraftV2 = structuredClone(normalizedDraft);
    const previous = supersedePublicId ? latest(supersedePublicId) : undefined;
    if (supersedePublicId && !previous) { res.status(404).json({error:'The quotation to revise was not found.'}); return; }
    if (previous) finalizedDraft.quote.number = previous.draft.quote.number;
    if (!finalizedDraft.quote.number) {
      finalizedDraft.quote.number = nextQuoteNumber(allRecords(), now);
    }
    if (!previous && allRecords().some(q => q.draft.quote.number === finalizedDraft.quote.number)) finalizedDraft.quote.number = nextQuoteNumber(allRecords(), now);
    delete finalizedDraft.rate_card_updates;
    finalizedDraft.quote.notes = [...new Set([...(finalizedDraft.quote.notes || []), ...(reviewedOwnerRequests ? finalizedDraft.owner_requests.filter(r => !/feedback|discount|payment.*claim/i.test(r.text)).map(r => r.text) : [])])];
    if (previous) finalizedDraft.quote.date = todayStr;
    if (previous && finalizedDraft.quote.valid_until === previous.draft.quote.valid_until) finalizedDraft.quote.valid_until = quoteExpiry(todayStr);
    if (!finalizedDraft.quote.date) {
      finalizedDraft.quote.date = todayStr;
    }
    if (!finalizedDraft.quote.valid_until) {
      finalizedDraft.quote.valid_until = quoteExpiry(finalizedDraft.quote.date || todayStr);
    }

    const snapshot = calculateQuotationPricing(finalizedDraft, activeCatalogue);
    const publicId = `ume${randomHex(16)}`;

    let revision = 1;
    if (previous) {
      revision = previous.revision + 1;
      previous.supersededByPublicId = publicId;
    }

    const defaultSentPkg: ResolvedPackageSelection = defaultSentPackage || {
      grade: finalizedDraft.recommended?.grade || 'Base',
      protection: finalizedDraft.recommended?.protection || 'Standard',
      finish: finalizedDraft.recommended?.finish || 'SF',
      brand_preference: finalizedDraft.recommended?.brand_preference || null,
    };
    finalizedDraft.recommended = structuredClone(defaultSentPkg);

    const discount = Math.max(0, Math.round(approvedDiscountRupees || 0));
    const initialCalc = computeCustomerSelectionTotal(snapshot, {
      wholeHomeSelection: defaultSentPkg,
      mixByRoom: false,
      roomSelections: {},
      selectedOptionalPointers: [],
      approvedDiscountRupees: discount,
    });

    const record: PublishedQuotationRecord = {
      publicId,
      revision,
      previousPublicId: previous?.publicId,
      status: 'Sent',
      publishedAt: now.toISOString(),
      viewsCount: 0,
      lastViewedAt: null,
      draft: finalizedDraft,
      snapshot,
      approvedDiscountRupees: discount,
      defaultSentPackage: structuredClone(defaultSentPkg),
      lastCustomerSelection: {
        wholeHomeSelection: structuredClone(defaultSentPkg),
        mixByRoom: false,
        roomSelections: {},
        selectedOptionalPointers: [],
        acceptedTermsAt: null,
        savedByCustomer: false,
        savedAt: null,
        savedFinalTotalRupees: initialCalc.grandTotal,
        summaryLabel: buildSelectionSummaryLabel(snapshot, defaultSentPkg, false, {}),
      },
      selectionHistory: [],
      customerFeedback: [],
      catalogueSnapshot: structuredClone(activeCatalogue),
    };

    if (previous) {
      record.customerFeedback = structuredClone(previous.customerFeedback || []);
      record.selectionHistory = structuredClone(previous.selectionHistory || []);
      if (previous.workOrder) {
        record.lastCustomerSelection = {...structuredClone(previous.lastCustomerSelection),...carryAgreedSelection(previous.draft,record.draft,previous.workOrder.selection)};
        if (confirmWorkOrderSelection === true) { record.lastCustomerSelection.wholeHomeSelection=structuredClone(defaultSentPkg);record.lastCustomerSelection.mixByRoom=false;record.lastCustomerSelection.roomSelections={}; }
        // Keep agreed room choices; newly added rooms use the agreed whole-home grade.
        finalize(record);
      }
    }

    quotesStore.set(publicId, record);
    saveDbToDisk();

    res.status(201).json({
      record,
      shareUrl: `/q/${publicId}`,
      quotes: visibleRecords(),
      catalogue: activeCatalogue,
    });
  });


}
