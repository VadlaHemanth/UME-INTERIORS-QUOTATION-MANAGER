import { validateCompanySettings } from '../src/lib/company-settings';
import { KARTHIK_HISTORICAL_RATE_OVERRIDES } from '../src/lib/historicalData';
import { DEFAULT_UME_CATALOGUE, extractAndMergeRateCardFromDraft, getPackageDisplayName, mergeRateCardJsonIntoCatalogue, type StudioCatalogue } from '../src/lib/catalogue';
import { calculateMilestoneSchedule, calculateQuotationPricing, computeCustomerSelectionTotal, type PricedQuotationSnapshot } from '../src/lib/pricing';
import { type QuotationDraftV2, type ResolvedPackageSelection, validateQuotationDraftV2 } from '../src/lib/schema';
import { randomHex, type OwnerAccount } from './auth';

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
  const quotesStore = new Map(state.quotes.map((record) => [record.publicId, record]));
  const paymentLedger = state.ledger;
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
      const byQuoteNo = Array.from(quotesStore.values()).find(
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

    if (!matchedRecord) {
      res.status(404).json({
        error:
          'No quotation matched that access code. Please check the private quotation link sent to your WhatsApp by UME Interiors.',
      });
      return;
    }

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
      catalogue: activeCatalogue,
      verifiedPaidRupees: verifiedPaid,
      pendingPaymentsCount: pendingPayments.length,
    });
  });

  // Get Catalogue & All Quotes & Ledger (for Owner Studio)
  app.get('/api/studio/bootstrap', (_req, res) => {
    res.json({
      catalogue: activeCatalogue,
      quotes: Array.from(quotesStore.values()),
      ledger: paymentLedger,
    });
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
        activeCatalogue = merged.catalogue;
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
    const rec = quotesStore.get(req.params.publicId);
    if (!rec) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

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
      quotes: Array.from(quotesStore.values()),
    });
  });

  // Update Any Line Item, Room, Customer Info, or Default Package on an Existing Published Quote in Place
  app.patch('/api/quotes/:publicId/draft', (req, res) => {
    const rec = quotesStore.get(req.params.publicId);
    if (!rec) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    const { draft, defaultSentPackage, approvedDiscountRupees } = req.body as {
      draft?: QuotationDraftV2;
      defaultSentPackage?: ResolvedPackageSelection;
      approvedDiscountRupees?: number;
    };

    if (draft && Array.isArray(draft.rooms)) {
      const autoMerged = extractAndMergeRateCardFromDraft(activeCatalogue, draft);
      activeCatalogue = autoMerged.catalogue;
      rec.draft = structuredClone(draft);
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

    if (defaultSentPackage && defaultSentPackage.grade) {
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

    saveDbToDisk();
    res.json({
      ok: true,
      quote: rec,
      catalogue: activeCatalogue,
      quotes: Array.from(quotesStore.values()),
    });
  });

  // Get Public Quotation by publicId
  app.get('/api/quotes/:publicId', (req, res) => {
    const rec = quotesStore.get(req.params.publicId);
    if (!rec) {
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
      catalogue: activeCatalogue,
      verifiedPaidRupees: verifiedPaid,
      pendingPaymentsCount: pendingPayments.length,
    });
  });

  // Save Customer Selection / Terms Acceptance on Public Quote
  app.patch('/api/quotes/:publicId/selection', (req, res) => {
    const rec = quotesStore.get(req.params.publicId);
    if (!rec) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
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
    const rec = quotesStore.get(req.params.publicId);
    if (!rec) {
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
    const rec = quotesStore.get(req.params.publicId);
    if (!rec) {
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

    const quote = quotesStore.get(entry.publicId);
    if (action === 'verify') {
      entry.status = 'Verified Paid';
      entry.verifiedAt = new Date().toISOString();
      if (quote) {
        const totalVerified = paymentLedger
          .filter((p) => p.publicId === quote.publicId && p.status === 'Verified Paid')
          .reduce((s, p) => s + p.amountRupees, 0);
        quote.status = totalVerified >= 150000 ? 'Advance paid' : 'Booking paid';
      }
    } else {
      entry.status = 'Rejected';
      entry.rejectionReason = rejectionReason || 'Bank statement reference mismatch';
    }

    saveDbToDisk();
    res.json({ entry, ledger: paymentLedger, quotes: Array.from(quotesStore.values()) });
  });

  // Publish or Revise a Validated v2 Draft directly from JSON (Creates cryptographic 128-bit publicId & immutable snapshot)
  app.post('/api/studio/publish', (req, res) => {
    const {
      draft,
      reviewedOwnerRequests,
      supersedePublicId,
      approvedDiscountRupees,
      defaultSentPackage,
    } = req.body as {
      draft: QuotationDraftV2;
      reviewedOwnerRequests?: boolean;
      supersedePublicId?: string;
      approvedDiscountRupees?: number;
      defaultSentPackage?: ResolvedPackageSelection;
    };

    const validation = validateQuotationDraftV2(draft, { reviewedOwnerRequests });
    if (!validation.readyForPublish) {
      res.status(422).json({
        error: 'Quotation failed publication gates. Resolve all listed issues before publishing.',
        validation,
      });
      return;
    }

    // Automatically extract and persist any rate_card_updates or new work types from the draft into activeCatalogue
    const autoMerged = extractAndMergeRateCardFromDraft(activeCatalogue, draft);
    activeCatalogue = autoMerged.catalogue;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const validUntilDate = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    const finalizedDraft: QuotationDraftV2 = structuredClone(draft);
    if (!finalizedDraft.quote.number) {
      finalizedDraft.quote.number = `UME-${now.getFullYear()}-${String(quotesStore.size + 1025)}`;
    }
    if (!finalizedDraft.quote.date) {
      finalizedDraft.quote.date = todayStr;
    }
    if (!finalizedDraft.quote.valid_until) {
      finalizedDraft.quote.valid_until = validUntilDate;
    }

    const snapshot = calculateQuotationPricing(finalizedDraft, activeCatalogue);
    const publicId = `ume${randomHex(16)}`;

    let revision = 1;
    if (supersedePublicId && quotesStore.has(supersedePublicId)) {
      const prev = quotesStore.get(supersedePublicId)!;
      revision = prev.revision + 1;
      prev.supersededByPublicId = publicId;
    }

    const defaultSentPkg: ResolvedPackageSelection = defaultSentPackage || {
      grade: finalizedDraft.recommended?.grade || 'Base',
      protection: finalizedDraft.recommended?.protection || 'Standard',
      finish: finalizedDraft.recommended?.finish || 'SF',
      brand_preference: finalizedDraft.recommended?.brand_preference || null,
    };

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
      previousPublicId: supersedePublicId,
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
    };

    quotesStore.set(publicId, record);
    saveDbToDisk();

    res.status(201).json({
      record,
      shareUrl: `/q/${publicId}`,
      quotes: Array.from(quotesStore.values()),
    });
  });


}
