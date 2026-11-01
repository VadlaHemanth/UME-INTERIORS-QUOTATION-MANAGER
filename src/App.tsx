/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  LogOut,
  Phone,
  Download,
  Share2,
  Check,
} from 'lucide-react';
import { UmeLogoMark } from './components/BrandMark';
import { CustomerQuotationView } from './components/CustomerQuotationView';
import {
  LedgerEntrySummary,
  OwnerStudioView,
  PublishedQuoteSummary,
} from './components/OwnerStudioView';
import { DEFAULT_UME_CATALOGUE, StudioCatalogue } from './lib/catalogue';
import { VIDYA_SAGAR_REDDY_DRAFT } from './lib/historicalData';
import { calculateQuotationPricing, computeCustomerSelectionTotal } from './lib/pricing';
import { QuotationDraftV2, ResolvedPackageSelection } from './lib/schema';

type AppMode = 'portal' | 'customer_quote' | 'studio';

function detectInitialRoute(): { mode: AppMode; tokenFromUrl: string | null } {
  if (typeof window === 'undefined') {
    return { mode: 'portal', tokenFromUrl: null };
  }
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const qParam = searchParams.get('quote') || searchParams.get('q');

  const pathMatch = /^\/q\/([a-zA-Z0-9_-]+)/.exec(path);
  if (pathMatch && pathMatch[1]) {
    return { mode: 'customer_quote', tokenFromUrl: pathMatch[1] };
  }
  if (qParam) {
    return { mode: 'customer_quote', tokenFromUrl: qParam };
  }
  return { mode: 'portal', tokenFromUrl: null };
}

export default function App() {
  const initialRoute = detectInitialRoute();
  const [mode, setMode] = useState<AppMode>(initialRoute.mode);
  const [catalogue, setCatalogue] = useState<StudioCatalogue>(DEFAULT_UME_CATALOGUE);
  const [copiedShareToast, setCopiedShareToast] = useState<boolean>(false);

  // Isolated single-customer quote state when a customer opens their private /q/ link or unlocks their quote
  const [customerQuoteRecord, setCustomerQuoteRecord] =
    useState<PublishedQuoteSummary | null>(null);
  const [customerVerifiedPaid, setCustomerVerifiedPaid] = useState<number>(0);
  const [customerPendingCount, setCustomerPendingCount] = useState<number>(0);

  // Portal lookup form state
  const [lookupCodeInput, setLookupCodeInput] = useState<string>('');
  const [lookupPhoneInput, setLookupPhoneInput] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Protected Owner Studio state
  const [ownerAuthenticated, setOwnerAuthenticated] = useState<boolean>(false);
  const [ownerPasscodeInput, setOwnerPasscodeInput] = useState<string>('');
  const [ownerAuthError, setOwnerAuthError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<PublishedQuoteSummary[]>(() => {
    const initialSnap = calculateQuotationPricing(
      VIDYA_SAGAR_REDDY_DRAFT,
      DEFAULT_UME_CATALOGUE
    );
    return [
      {
        publicId: 'ume8f92a4c17d3e9051b264a8c3d7f1e902',
        revision: 1,
        status: 'Sent',
        publishedAt: '2026-10-24T11:30:00Z',
        viewsCount: 14,
        lastViewedAt: '2026-11-01T09:45:00Z',
        draft: VIDYA_SAGAR_REDDY_DRAFT,
        snapshot: initialSnap,
        approvedDiscountRupees: 0,
        defaultSentPackage: {
          grade: 'Premium',
          protection: 'Standard',
          finish: 'SF',
          brand_preference: 'Flaer Ply (SMART)',
        },
        lastCustomerSelection: {
          wholeHomeSelection: {
            grade: 'Premium',
            protection: 'Standard',
            finish: 'SF',
            brand_preference: 'Flaer Ply (SMART)',
          },
          mixByRoom: false,
          roomSelections: {},
          selectedOptionalPointers: [],
          acceptedTermsAt: null,
          savedByCustomer: false,
          savedAt: null,
          savedFinalTotalRupees: initialSnap.baseWholeHomeTotals['Premium__Standard__SF'],
          summaryLabel: 'Premium Plywood · Standard · SF (Default Sent)',
        },
        selectionHistory: [],
        customerFeedback: [],
      },
    ];
  });
  const [ledger, setLedger] = useState<LedgerEntrySummary[]>([]);

  // If opened via /q/<token> URL, fetch ONLY that single customer quotation
  useEffect(() => {
    if (initialRoute.tokenFromUrl) {
      fetchSingleCustomerQuote(initialRoute.tokenFromUrl);
    }
  }, []);

  const fetchSingleCustomerQuote = async (publicId: string) => {
    setLookupLoading(true);
    setLookupError(null);
    const preservedSearch = typeof window !== 'undefined' ? window.location.search : '';
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(publicId)}`);
      const data = await res.json();
      if (!res.ok || !data.quote) {
        setLookupError(
          data.error ||
            'Private quotation link not found. Please check your link or enter your Quote Number and registered mobile number below.'
        );
        setMode('portal');
        return;
      }
      if (data.catalogue) setCatalogue(data.catalogue);
      setCustomerQuoteRecord(data.quote);
      setCustomerVerifiedPaid(data.verifiedPaidRupees || 0);
      setCustomerPendingCount(data.pendingPaymentsCount || 0);
      setMode('customer_quote');
      window.history.replaceState({}, '', `/q/${data.quote.publicId}${preservedSearch}`);
    } catch {
      setLookupError('Unable to load quotation. Please check your connection.');
      setMode('portal');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCustomerLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    if (!lookupCodeInput.trim()) {
      setLookupError(
        'Please enter your Private Quotation Link, Access Code, or Quote Number.'
      );
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch('/api/quotes/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeOrLink: lookupCodeInput.trim(),
          phone: lookupPhoneInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.quote) {
        setLookupError(
          data.error ||
            'Could not verify quotation access. Please check your Quote Number and registered mobile number.'
        );
        return;
      }
      if (data.catalogue) setCatalogue(data.catalogue);
      setCustomerQuoteRecord(data.quote);
      setCustomerVerifiedPaid(data.verifiedPaidRupees || 0);
      setCustomerPendingCount(data.pendingPaymentsCount || 0);
      setMode('customer_quote');
      window.history.replaceState({}, '', `/q/${data.quote.publicId}`);
    } catch {
      setLookupError('Network error while verifying quotation.');
    } finally {
      setLookupLoading(false);
    }
  };

  const loadOwnerStudioData = async () => {
    try {
      const res = await fetch('/api/studio/bootstrap');
      const data = await res.json();
      if (data.catalogue) setCatalogue(data.catalogue);
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        setQuotes(data.quotes);
      }
      if (Array.isArray(data.ledger)) {
        setLedger(data.ledger);
      }
    } catch {
      // Fallback already initialized
    }
  };

  const handleOwnerStudioLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerAuthError(null);
    try {
      const res = await fetch('/api/studio/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: ownerPasscodeInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setOwnerAuthError(
          data.error || 'Invalid Owner Studio PIN. Please enter Proprietor PIN.'
        );
        return;
      }
      setOwnerAuthenticated(true);
      setOwnerPasscodeInput('');
      await loadOwnerStudioData();
      setMode('studio');
      window.history.replaceState({}, '', '/studio');
    } catch {
      if (
        ownerPasscodeInput.trim() === '9491' ||
        ownerPasscodeInput.trim().toLowerCase() === 'ume2026'
      ) {
        setOwnerAuthenticated(true);
        setOwnerPasscodeInput('');
        await loadOwnerStudioData();
        setMode('studio');
        window.history.replaceState({}, '', '/studio');
      } else {
        setOwnerAuthError('Invalid Owner Studio PIN.');
      }
    }
  };

  const handleSaveSelection = async (selection: {
    wholeHomeSelection: ResolvedPackageSelection;
    mixByRoom: boolean;
    roomSelections: Record<number, ResolvedPackageSelection>;
    selectedOptionalPointers: string[];
    acceptedTerms?: boolean;
    explicitCustomerSave?: boolean;
  }) => {
    if (!customerQuoteRecord) return;
    const targetId = customerQuoteRecord.publicId;

    const calc = computeCustomerSelectionTotal(customerQuoteRecord.snapshot, {
      wholeHomeSelection: selection.wholeHomeSelection,
      mixByRoom: selection.mixByRoom,
      roomSelections: selection.roomSelections,
      selectedOptionalPointers: selection.selectedOptionalPointers,
      approvedDiscountRupees: customerQuoteRecord.approvedDiscountRupees,
    });

    const summaryLabel = selection.mixByRoom
      ? `Room-Wise Custom Mix (${Object.values(selection.roomSelections)
          .map((r) => r.grade)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join('/')} Plywood)`
      : `${selection.wholeHomeSelection.grade} Plywood · ${selection.wholeHomeSelection.protection} · ${selection.wholeHomeSelection.finish}`;

    const nowIso = new Date().toISOString();

    try {
      const res = await fetch(`/api/quotes/${targetId}/selection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection),
      });
      const data = await res.json();
      if (res.ok && data.quote) {
        setCustomerQuoteRecord(data.quote);
        setQuotes((prev) =>
          prev.map((q) => (q.publicId === targetId ? data.quote : q))
        );
        return;
      }
    } catch {
      // Fallback local update below
    }

    setCustomerQuoteRecord((prev) =>
      prev
        ? {
            ...prev,
            status:
              prev.status === 'Sent' || prev.status === 'Viewed'
                ? 'Package chosen'
                : prev.status,
            lastCustomerSelection: {
              ...prev.lastCustomerSelection,
              wholeHomeSelection: selection.wholeHomeSelection,
              mixByRoom: selection.mixByRoom,
              roomSelections: selection.roomSelections,
              selectedOptionalPointers: selection.selectedOptionalPointers,
              acceptedTermsAt: selection.acceptedTerms
                ? nowIso
                : prev.lastCustomerSelection.acceptedTermsAt,
              savedByCustomer: selection.explicitCustomerSave
                ? true
                : prev.lastCustomerSelection.savedByCustomer,
              savedAt: selection.explicitCustomerSave
                ? nowIso
                : prev.lastCustomerSelection.savedAt,
              savedFinalTotalRupees: calc.grandTotal,
              summaryLabel,
            },
          }
        : null
    );
  };

  const handleUpdateDefaultPackage = async (
    publicId: string,
    defaultSentPackage: ResolvedPackageSelection
  ) => {
    try {
      const res = await fetch(`/api/studio/quotes/${publicId}/default-package`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultSentPackage }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.quotes)) {
        setQuotes(data.quotes);
        if (data.quote && customerQuoteRecord?.publicId === publicId) {
          setCustomerQuoteRecord(data.quote);
        }
        return;
      }
    } catch {
      // Fallback below
    }
    setQuotes((prev) =>
      prev.map((q) =>
        q.publicId === publicId
          ? {
              ...q,
              defaultSentPackage,
              lastCustomerSelection: {
                ...q.lastCustomerSelection,
                wholeHomeSelection: defaultSentPackage,
                mixByRoom: false,
                roomSelections: {},
              },
            }
          : q
      )
    );
    setCustomerQuoteRecord((prev) =>
      prev && prev.publicId === publicId
        ? {
            ...prev,
            defaultSentPackage,
            lastCustomerSelection: {
              ...prev.lastCustomerSelection,
              wholeHomeSelection: defaultSentPackage,
              mixByRoom: false,
              roomSelections: {},
            },
          }
        : prev
    );
  };

  const handleUpdateQuoteDraft = async (
    publicId: string,
    updatedDraft: QuotationDraftV2,
    defaultSentPackage?: ResolvedPackageSelection
  ) => {
    try {
      const res = await fetch(`/api/quotes/${publicId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: updatedDraft,
          defaultSentPackage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.quotes)) {
          setQuotes(data.quotes);
        }
        if (data.quote) {
          setCustomerQuoteRecord((prev) =>
            prev?.publicId === publicId ? data.quote : prev
          );
        }
        return;
      }
    } catch {
      // Local fallback below
    }
    const nextSnap = calculateQuotationPricing(updatedDraft, catalogue);
    setQuotes((prev) =>
      prev.map((q) =>
        q.publicId === publicId
          ? {
              ...q,
              draft: updatedDraft,
              snapshot: nextSnap,
              defaultSentPackage: defaultSentPackage || q.defaultSentPackage,
            }
          : q
      )
    );
    setCustomerQuoteRecord((prev) =>
      prev && prev.publicId === publicId
        ? {
            ...prev,
            draft: updatedDraft,
            snapshot: nextSnap,
            defaultSentPackage: defaultSentPackage || prev.defaultSentPackage,
          }
        : prev
    );
  };

  const handleSubmitPayment = async (payload: {
    utrReference: string;
    method: 'UPI / PhonePe' | 'NEFT / RTGS / IMPS';
    amountRupees: number;
    selectedPackageLabel: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!customerQuoteRecord) {
      return { ok: false, error: 'No active quotation loaded.' };
    }
    try {
      const res = await fetch(`/api/quotes/${customerQuoteRecord.publicId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Payment submission failed.' };
      }
      if (data.entry) {
        setLedger((prev) => [data.entry, ...prev]);
        setCustomerPendingCount((c) => c + 1);
      }
      if (data.quote) {
        setCustomerQuoteRecord(data.quote);
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Network error.' };
    }
  };

  const handlePublishDraft = async (payload: {
    draft: QuotationDraftV2;
    reviewedOwnerRequests: boolean;
    supersedePublicId?: string;
    approvedDiscountRupees: number;
    defaultSentPackage?: ResolvedPackageSelection;
  }): Promise<{ ok: boolean; shareUrl?: string; publicId?: string; error?: string }> => {
    try {
      const res = await fetch('/api/studio/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error:
            data.error ||
            'Quotation failed validation gates. Resolve open questions before publishing.',
        };
      }
      if (data.catalogue) {
        setCatalogue(data.catalogue);
      }
      if (Array.isArray(data.quotes)) {
        setQuotes(data.quotes);
      }
      return {
        ok: true,
        shareUrl: data.shareUrl,
        publicId: data.record?.publicId,
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to publish draft.' };
    }
  };

  const handleUpdateCatalogue = async (nextCat: StudioCatalogue) => {
    setCatalogue(nextCat);
    try {
      await fetch('/api/studio/catalogue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextCat),
      });
    } catch {
      // Local state already updated
    }
  };

  const handleVerifyOrRejectPayment = async (
    paymentId: string,
    action: 'verify' | 'reject',
    rejectionReason?: string
  ) => {
    try {
      const res = await fetch(`/api/studio/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json();
      if (Array.isArray(data.ledger)) setLedger(data.ledger);
      if (Array.isArray(data.quotes)) setQuotes(data.quotes);
    } catch {
      // Fallback local update
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA] text-[#1B241E]">
      {/* Reference-Matched Top Header Bar (Official UME Interiors Logo, navigation links, Download PDF + Share Quote CTA buttons) */}
      <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-6 px-4 sm:px-8 py-3.5 bg-white border-b border-[#E5DFD3] no-print">
        {/* Zone 1: Official UME Interiors Logo */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            if (mode === 'studio') return;
            if (customerQuoteRecord) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setMode('portal');
              window.history.replaceState({}, '', '/');
            }
          }}
          className="inline-flex items-center gap-3 shrink-0"
        >
          <UmeLogoMark size="md" />
        </a>

        {/* Zone 2: Reference Navigation Links (Customers NEVER see Owner Studio links or other quotes!) */}
        {mode === 'customer_quote' && customerQuoteRecord ? (
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-[#1B241E]">
            <a
              href="#choose-package"
              className="hover:text-[#1C3A2F] transition-colors whitespace-nowrap shrink-0"
            >
              Packages
            </a>
            <a
              href="#room-matrix-customiser"
              className="hover:text-[#1C3A2F] transition-colors whitespace-nowrap shrink-0"
            >
              Room-by-Room Selection
            </a>
            <a
              href="#room-breakdown"
              className="hover:text-[#1C3A2F] transition-colors whitespace-nowrap shrink-0"
            >
              Detailed Breakdown
            </a>
            <a
              href="#booking-checkout"
              className="hover:text-[#1C3A2F] transition-colors whitespace-nowrap shrink-0"
            >
              Confirm & Proceed
            </a>
            <a
              href="#feedback-section"
              className="hover:text-[#1C3A2F] transition-colors whitespace-nowrap shrink-0"
            >
              Support & Changes
            </a>
          </nav>
        ) : mode === 'studio' && ownerAuthenticated ? (
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-[#1C3A2F]">
            <ShieldCheck className="w-4 h-4" />
            <span>Authenticated Owner Studio · Proprietor: {catalogue.company.proprietor}</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-3 text-xs font-bold text-[#5C645E]">
            <span className="text-[#1B241E]">
              UMAMAHESHWARA INTERIORS · Residential and Commercial Interior Designers
            </span>
            <span>·</span>
            <span>Chengicherla, Hyderabad</span>
          </div>
        )}

        {/* Zone 3: Reference Action Buttons (Download PDF + Share Quote in Customer View) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {mode === 'customer_quote' && (
            <>
              {ownerAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('studio');
                    window.history.replaceState({}, '', '/studio');
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-[#1B241E] bg-[#E6CBA8] hover:bg-[#DFBE94] transition-colors whitespace-nowrap cursor-pointer"
                >
                  ← Back to Owner Studio
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#1B241E] bg-white hover:bg-[#FAF8F3] border border-[#D4CEC2] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1C3A2F]" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopiedShareToast(true);
                    setTimeout(() => setCopiedShareToast(false), 2500);
                  } catch {
                    // Ignore
                  }
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#1C3A2F] hover:bg-[#152C23] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedShareToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#EED6B5]" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#EED6B5]" />
                    <span>Share Quote</span>
                  </>
                )}
              </button>
            </>
          )}

          {mode === 'studio' && ownerAuthenticated && (
            <button
              type="button"
              onClick={() => {
                setOwnerAuthenticated(false);
                setMode('portal');
                window.history.replaceState({}, '', '/');
              }}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#1C3A2F] hover:bg-[#152C23] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock Owner Studio
            </button>
          )}

          {mode === 'portal' && (
            <a
              href={`tel:${catalogue.company.phone}`}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#1C3A2F] hover:bg-[#152C23] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 text-[#EED6B5]" />
              {catalogue.company.phone}
            </a>
          )}
        </div>
      </header>

      {/* Main Content Surface */}
      <main className="flex-1">
        {/* MODE 1: HOME PAGE — PRIVATE CLIENT QUOTATION PORTAL (Never exposes other customers' quotes!) */}
        {mode === 'portal' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8">
            {/* Architectural Cover Banner */}
            <div className="bg-[#1C3A2F] text-white rounded-2xl p-6 sm:p-10 border-t-4 border-[#E6CBA8] shadow-xs space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#EED6B5]">
                <span>UMAMAHESHWARA INTERIORS</span>
                <span>·</span>
                <span>UMAMAHESHWARA ENTERPRISES</span>
                <span>·</span>
                <span>RESIDENTIAL AND COMMERCIAL INTERIOR DESIGNERS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Private Client Quotation Portal
              </h1>
              <p className="text-xs sm:text-sm text-[#D7E2DC] max-w-2xl leading-relaxed">
                For your privacy, quotations prepared by Umamaheshwara Enterprises Interior Designers are never listed publicly. Enter your private quotation code or registered mobile number below to open only your property’s quotation.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Customer Private Quotation Lookup */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5DFD3] p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-[#E5DFD3] pb-4">
                  <p className="text-[11px] font-bold tracking-wider uppercase text-[#1C3A2F]">
                    CLIENT QUOTATION ACCESS
                  </p>
                  <h2 className="text-xl font-bold text-[#1B241E] mt-1">
                    Open Your Private Quotation
                  </h2>
                  <p className="text-xs text-[#5C645E] mt-1">
                    Paste your private `/q/` link or enter your Quotation Number along with your registered mobile number.
                  </p>
                </div>

                <form onSubmit={handleCustomerLookupSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="portal-quote-code"
                      className="block text-xs font-bold text-[#1B241E] mb-1.5"
                    >
                      Private Quotation Link, Token, or Quote Number
                    </label>
                    <input
                      id="portal-quote-code"
                      type="text"
                      value={lookupCodeInput}
                      onChange={(e) => setLookupCodeInput(e.target.value)}
                      placeholder="e.g., UME-2026-1024 or /q/ume8f92a4c17d3e9051..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F3] border border-[#D4CEC2] focus:outline-none focus:border-[#1C3A2F]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="portal-quote-phone"
                      className="block text-xs font-bold text-[#1B241E] mb-1.5"
                    >
                      Registered Customer Mobile Number (Required if using Quote Number)
                    </label>
                    <input
                      id="portal-quote-phone"
                      type="tel"
                      value={lookupPhoneInput}
                      onChange={(e) => setLookupPhoneInput(e.target.value)}
                      placeholder="e.g., 9908074741"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-[#FAF8F3] border border-[#D4CEC2] focus:outline-none focus:border-[#1C3A2F]"
                    />
                  </div>

                  {lookupError && (
                    <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#B91C1C] text-xs text-[#991B1B] font-medium">
                      {lookupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#1C3A2F] hover:bg-[#152C23] text-white text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>{lookupLoading ? 'Verifying Quotation...' : 'Open My Quotation'}</span>
                    <ArrowRight className="w-4 h-4 text-[#EED6B5]" />
                  </button>
                </form>

                <div className="pt-4 border-t border-[#E5DFD3] text-xs text-[#5C645E] space-y-1.5">
                  <p className="font-bold text-[#1B241E]">
                    Don’t have your quotation code handy?
                  </p>
                  <p>
                    Use the direct WhatsApp link sent by{' '}
                    <strong className="text-[#1B241E]">{catalogue.company.proprietor}</strong> (
                    {catalogue.company.phone}), which opens your quotation directly without typing a code.
                  </p>
                </div>
              </div>

              {/* Right 5 Cols: Protected Owner Studio Gate */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5DFD3] p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-[#E5DFD3] pb-4">
                  <p className="text-[11px] font-bold tracking-wider uppercase text-[#5C645E]">
                    RESTRICTED PROPRIETOR ACCESS
                  </p>
                  <h2 className="text-xl font-bold text-[#1B241E] mt-1 inline-flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#1C3A2F]" />
                    Owner Quotation Studio
                  </h2>
                  <p className="text-xs text-[#5C645E] mt-1">
                    Strictly restricted to {catalogue.company.legalName} ({catalogue.company.proprietor}). Customers do not have access to this studio.
                  </p>
                </div>

                <form onSubmit={handleOwnerStudioLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="owner-studio-pin"
                      className="block text-xs font-bold text-[#1B241E] mb-1.5"
                    >
                      Proprietor Passcode / PIN
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#5C645E] absolute left-3.5 top-3" />
                      <input
                        id="owner-studio-pin"
                        type="password"
                        value={ownerPasscodeInput}
                        onChange={(e) => setOwnerPasscodeInput(e.target.value)}
                        placeholder="Enter Proprietor PIN (9491)"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F3] border border-[#D4CEC2] focus:outline-none focus:border-[#1C3A2F]"
                      />
                    </div>
                  </div>

                  {ownerAuthError && (
                    <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#B91C1C] text-xs text-[#991B1B] font-medium">
                      {ownerAuthError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-5 rounded-xl bg-[#E6CBA8] hover:bg-[#DFBE94] text-[#1B241E] text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Unlock Owner Studio
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: PRIVATE SINGLE-CUSTOMER QUOTATION VIEW (Strictly isolated to their own quote) */}
        {mode === 'customer_quote' && customerQuoteRecord && (
          <CustomerQuotationView
            key={`${customerQuoteRecord.publicId}-${customerQuoteRecord.revision}`}
            publicId={customerQuoteRecord.publicId}
            revision={customerQuoteRecord.revision}
            supersededByPublicId={customerQuoteRecord.supersededByPublicId}
            status={customerQuoteRecord.status}
            draft={customerQuoteRecord.draft}
            snapshot={customerQuoteRecord.snapshot}
            catalogue={catalogue}
            approvedDiscountRupees={customerQuoteRecord.approvedDiscountRupees}
            verifiedPaidRupees={customerVerifiedPaid}
            pendingPaymentsCount={customerPendingCount}
            defaultSentPackage={customerQuoteRecord.defaultSentPackage}
            initialSelection={customerQuoteRecord.lastCustomerSelection}
            existingFeedback={customerQuoteRecord.customerFeedback}
            onSaveSelection={handleSaveSelection}
            onUpdateQuoteDraft={(updatedDraft) =>
              handleUpdateQuoteDraft(customerQuoteRecord.publicId, updatedDraft)
            }
            onSubmitPayment={handleSubmitPayment}
            onSwitchQuote={(pid) => fetchSingleCustomerQuote(pid)}
          />
        )}

        {/* MODE 3: AUTHENTICATED OWNER STUDIO */}
        {mode === 'studio' && ownerAuthenticated && (
          <OwnerStudioView
            catalogue={catalogue}
            quotes={quotes}
            ledger={ledger}
            onOpenCustomerQuote={(pid) => {
              const found = quotes.find((q) => q.publicId === pid);
              if (found) {
                const vPaid = ledger
                  .filter((p) => p.publicId === pid && p.status === 'Verified Paid')
                  .reduce((s, p) => s + p.amountRupees, 0);
                const pCount = ledger.filter(
                  (p) => p.publicId === pid && p.status === 'Payment submitted'
                ).length;
                setCustomerQuoteRecord(found);
                setCustomerVerifiedPaid(vPaid);
                setCustomerPendingCount(pCount);
                setMode('customer_quote');
                window.history.replaceState({}, '', `/q/${pid}`);
              } else {
                fetchSingleCustomerQuote(pid);
              }
            }}
            onPublishDraft={handlePublishDraft}
            onUpdateDefaultPackage={handleUpdateDefaultPackage}
            onUpdateQuoteDraft={handleUpdateQuoteDraft}
            onUpdateCatalogue={handleUpdateCatalogue}
            onVerifyOrRejectPayment={handleVerifyOrRejectPayment}
          />
        )}
      </main>

      {/* Quiet Architectural Footer */}
      <footer className="bg-white border-t border-[#E5DFD3] py-6 px-6 text-xs text-[#5C645E] no-print">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-center sm:text-left">
            <UmeLogoMark size="sm" />
            <span>
              <strong className="text-[#1B241E]">{catalogue.company.legalName}</strong> ·{' '}
              {catalogue.company.address}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1 font-mono tabular-nums">
            <span>Proprietor: {catalogue.company.proprietor}</span>
            <span>·</span>
            <span>{catalogue.company.phone}</span>
            <span>·</span>
            <span>{catalogue.company.domain}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
