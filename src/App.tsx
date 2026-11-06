/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  LogOut,
  Phone,
  Download,
  Share2,
  Check,
  Settings,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { printQuotation } from './lib/print-quotation';
import { UmeLogoMark } from './components/BrandMark';
import type { CredentialUpdate } from './components/BusinessSettings';
import type {
  LedgerEntrySummary,
  PublishedQuoteSummary,
} from './components/OwnerStudioView';
import './components/BusinessSettings.css';
import { DEFAULT_UME_CATALOGUE, StudioCatalogue } from './lib/catalogue';
import { QuotationDraftV2, ResolvedPackageSelection } from './lib/schema';
import { CompanySettings, companyWebsiteUrl, validateCompanySettings } from './lib/company-settings';

type AppMode = 'portal' | 'customer_quote' | 'studio' | 'owner_login';

const CustomerQuotationView = lazy(() => import('./components/CustomerQuotationView').then(module => ({ default: module.CustomerQuotationView })));
const OwnerStudioView = lazy(() => import('./components/OwnerStudioView').then(module => ({ default: module.OwnerStudioView })));
const BusinessSettings = lazy(() => import('./components/BusinessSettings').then(module => ({ default: module.BusinessSettings })));

function ViewLoading({ children }: { children: React.ReactNode }) {
  return <div role="status" aria-live="polite" className="quote-loading"><span className="loading-dot" aria-hidden="true"/>{children}</div>;
}

function CustomerViewMounted({ children, onReady }: { children: React.ReactNode; onReady: (ready: boolean) => void }) {
  useEffect(() => { onReady(true); return () => onReady(false); }, [onReady]);
  return <>{children}</>;
}

function detectInitialRoute(): { mode: AppMode; tokenFromUrl: string | null } {
  if (typeof window === 'undefined') {
    return { mode: 'portal', tokenFromUrl: null };
  }
  const path = window.location.pathname;
  if (/^\/(owner|studio)\/?$/.test(path)) return { mode: 'owner_login', tokenFromUrl: null };
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
  const [initialRoute] = useState(detectInitialRoute);
  const [mode, setMode] = useState<AppMode>(initialRoute.mode);
  const [catalogue, setCatalogue] = useState<StudioCatalogue>(DEFAULT_UME_CATALOGUE);
  const [copiedShareToast, setCopiedShareToast] = useState<boolean>(false);
  const [customerViewReady, setCustomerViewReady] = useState(false);

  // Isolated single-customer quote state when a customer opens their private /q/ link or unlocks their quote
  const [customerQuoteRecord, setCustomerQuoteRecord] =
    useState<PublishedQuoteSummary | null>(null);
  const [customerCatalogue,setCustomerCatalogue] = useState<StudioCatalogue | null>(null);
  const [customerVerifiedPaid, setCustomerVerifiedPaid] = useState<number>(0);
  const [customerPendingCount, setCustomerPendingCount] = useState<number>(0);

  // Portal lookup form state
  const [lookupCodeInput, setLookupCodeInput] = useState<string>('');
  const [lookupPhoneInput, setLookupPhoneInput] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Protected Owner Studio state
  const [ownerAuthenticated, setOwnerAuthenticated] = useState<boolean>(false);
  const [ownerStudioLoaded,setOwnerStudioLoaded] = useState(false);
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [ownerAuthError, setOwnerAuthError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<PublishedQuoteSummary[]>([]);
  const [ledger, setLedger] = useState<LedgerEntrySummary[]>([]);

  // If opened via /q/<token> URL, fetch ONLY that single customer quotation
  useEffect(() => {
    if (initialRoute.mode === 'portal' || initialRoute.mode === 'owner_login') {
      fetch('/api/company').then(response => response.ok ? response.json() : null).then(data => {
        if (!data?.company || typeof data.company !== 'object') return;
        const company = data.company;
        setCatalogue(previous => previous === DEFAULT_UME_CATALOGUE
          ? { ...previous, company: { ...previous.company, ...company, bank: previous.company.bank } }
          : previous);
      }).catch(() => {});
    }
    if (initialRoute.tokenFromUrl) {
      fetchSingleCustomerQuote(initialRoute.tokenFromUrl);
    }
    fetch('/api/studio/session').then(r => r.json()).then(async data => {
      if (data.authenticated) {
        setOwnerAuthenticated(true);
        setOwnerUsername(data.username || '');
        if (initialRoute.mode === 'owner_login') {
          await loadOwnerStudioData();
          setMode('studio');
          window.history.replaceState({}, '', '/owner');
        }
      }
    }).catch(() => {});
    const onPopState = () => {
      const route = detectInitialRoute();
      setMode(route.mode);
      if (route.mode === 'owner_login') {
        fetch('/api/studio/session').then(r => r.json()).then(async session => {
          setOwnerAuthenticated(Boolean(session.authenticated));
          if (session.authenticated) { await loadOwnerStudioData(); setMode('studio'); }
        }).catch(() => {});
      }
      if (route.tokenFromUrl) fetchSingleCustomerQuote(route.tokenFromUrl);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
      if (data.catalogue) { setCustomerCatalogue(data.catalogue); setCatalogue(previous => ({...previous,company:data.catalogue.company})); }
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
      if (data.catalogue) setCustomerCatalogue(data.catalogue);
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
    const res = await fetch('/api/studio/bootstrap');
    const data = await res.json();
    if (res.status === 401) { setOwnerAuthenticated(false); setMode('owner_login'); setOwnerAuthError('Your session has expired. Sign in to continue.'); window.history.replaceState({}, '', '/owner'); }
    if (!res.ok) throw new Error(data.error || 'Unable to load owner workspace.');
    if (data.catalogue) setCatalogue(data.catalogue);
    setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    setLedger(Array.isArray(data.ledger) ? data.ledger : []);
    setOwnerStudioLoaded(true);
  };

  const handleOwnerStudioLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerAuthError(null);
    setOwnerBusy(true);
    try {
      const res = await fetch('/api/studio/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ownerUsername.trim(), password: ownerPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Please check your username and password.');
      await loadOwnerStudioData();
      setOwnerAuthenticated(true);
      setOwnerPassword('');
      setMode('studio');
      window.history.replaceState({}, '', '/owner');
    } catch (err) {
      setOwnerAuthError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally { setOwnerBusy(false); }
  };

  const handleOwnerLogout = async () => {
    try {
      const res = await fetch('/api/studio/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!res.ok) throw new Error('Unable to sign out. Please try again.');
      setOwnerAuthenticated(false);
      setOwnerStudioLoaded(false);
      setSettingsOpen(false);
      setQuotes([]); setLedger([]); setCustomerQuoteRecord(null);
      setMode('owner_login');
      window.history.replaceState({}, '', '/owner');
    } catch (err) { setActionError(String(err)); }
  };

  const handleCredentialChange = async (values: CredentialUpdate) => {
    const res = await fetch('/api/studio/credentials', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update sign-in details.');
    setOwnerUsername(values.newUsername);
  };

  const handleSaveCompany = async (company: CompanySettings): Promise<CompanySettings> => {
    const res = await fetch('/api/studio/company', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company }),
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'Could not save business details.'), { fieldErrors: data.errors });
    const saved = validateCompanySettings(data.company);
    if (!saved.company) throw new Error('The server returned incomplete business details. Please reload and try again.');
    setCatalogue(previous => ({ ...previous, company: saved.company! }));
    return saved.company;
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

    const res = await fetch(`/api/quotes/${targetId}/selection`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection),
    });
    const data = await res.json();
    if (!res.ok || !data.quote) throw new Error(data.error || 'Your selection could not be saved. Please try again.');
    setCustomerQuoteRecord(data.quote);
    setQuotes(prev => prev.map(q => q.publicId === targetId ? data.quote : q));
  };

  const handleUpdateDefaultPackage = async (publicId: string, defaultSentPackage: ResolvedPackageSelection) => {
    try {
      const res = await fetch(`/api/studio/quotes/${publicId}/default-package`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultSentPackage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save package.');
      if (Array.isArray(data.quotes)) setQuotes(data.quotes);
      if (data.quote && customerQuoteRecord?.publicId === publicId) setCustomerQuoteRecord(data.quote);
    } catch (err) { setActionError(String(err)); throw err; }
  };

  const handleUpdateQuoteDraft = async (publicId: string, updatedDraft: QuotationDraftV2, defaultSentPackage?: ResolvedPackageSelection) => {
    try {
      const res = await fetch(`/api/quotes/${publicId}/draft`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({draft: updatedDraft, defaultSentPackage}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save quotation.');
      if (Array.isArray(data.quotes)) setQuotes(data.quotes);
      if (data.catalogue) setCatalogue(data.catalogue);
      if (data.catalogue) setCustomerCatalogue(data.catalogue);
      if (data.quote) setCustomerQuoteRecord(prev => prev?.publicId === publicId ? data.quote : prev);
    } catch (err) { setActionError(String(err)); throw err; }
  };

  const returnToStudio = async () => {
    try { await loadOwnerStudioData(); setMode('studio'); window.history.replaceState({}, '', '/owner'); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Could not return to the studio. Please try again.'); }
  };

  const handleRecordVerifiedPayment = async (publicId: string, amountRupees: number, reference: string) => {
    const record=quotes.find(quote=>quote.publicId===publicId);
    const response = await fetch(`/api/studio/quotes/${publicId}/verified-payment`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amountRupees, reference,expectedRevision:record?.revision,expectedSelection:record?.lastCustomerSelection})});
    const data = await response.json();
    if (!response.ok) {if(response.status===409)await loadOwnerStudioData();throw new Error(data.error || 'Could not record payment.');}
    setQuotes(data.quotes); setLedger(data.ledger);
  };

  const handleCreateWorkOrder=async(publicId:string)=>{
    const record=quotes.find(quote=>quote.publicId===publicId);
    const response=await fetch(`/api/studio/quotes/${publicId}/work-order`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmAgreedScope:true,expectedRevision:record?.revision,expectedSelection:record?.lastCustomerSelection})});
    const data=await response.json();
    if(!response.ok){if(response.status===409)await loadOwnerStudioData();throw new Error(data.error||'Could not create the work order.');}
    setQuotes(data.quotes);
  };

  const handleDeleteQuote = async (publicId: string) => {
    const response = await fetch(`/api/studio/quotes/${publicId}`, {method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmDelete:true})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not delete the quotation. Please try again.');
    setQuotes(data.quotes); setLedger(data.ledger);
    if (customerQuoteRecord && !data.quotes.some((record: PublishedQuoteSummary) => record.publicId === customerQuoteRecord.publicId)) setCustomerQuoteRecord(null);
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
    confirmWorkOrderSelection?: boolean;
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

  const handleSaveOwnerDraft = async (draft: QuotationDraftV2, publicId?: string, approvedDiscountRupees = 0) => {
    const response = await fetch('/api/studio/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft,publicId,approvedDiscountRupees})});
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'Could not save the draft.');
    setQuotes(data.quotes);
    return data.record as PublishedQuoteSummary;
  };

  const handleUpdateCatalogue = async (nextCat: StudioCatalogue) => {
    try {
      const res = await fetch('/api/studio/catalogue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextCat),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save rate card.');
      setCatalogue(data.catalogue || nextCat);
    } catch (err) { setActionError(String(err)); throw err; }
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
      if (!res.ok) throw new Error(data.error || 'Could not update payment.');
      if (Array.isArray(data.ledger)) setLedger(data.ledger);
      if (Array.isArray(data.quotes)) setQuotes(data.quotes);
    } catch (err) { setActionError(String(err)); }
  };

  return (
    <div className="ume-app min-h-screen flex flex-col bg-[#F4F1EA] text-[#1B241E]">
      {/* Reference-Matched Top Header Bar (Official UME Interiors Logo, navigation links, Download PDF + Share Quote CTA buttons) */}
      <header className="app-header flex flex-wrap items-center justify-between gap-3 sm:gap-6 px-4 sm:px-8 py-3.5 bg-white border-b border-[#E5DFD3] no-print">
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
        {mode === 'customer_quote' && customerQuoteRecord?.workOrder ? (
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold"><a href="#work-order-scope">Agreed scope</a><a href="#work-order-materials">Materials & terms</a><a href="#work-order-payment">Payments & support</a></nav>
        ) : mode === 'customer_quote' && customerQuoteRecord ? (
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
              {catalogue.company.brandName}{catalogue.company.subtitle && ` · ${catalogue.company.subtitle}`}
            </span>
          </div>
        )}

        {/* Zone 3: Reference Action Buttons (Download PDF + Share Quote in Customer View) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {mode === 'customer_quote' && (
            <>
              {ownerAuthenticated && (
                <button
                  type="button"
                  onClick={() => void returnToStudio()}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-[#1B241E] bg-[#E6CBA8] hover:bg-[#DFBE94] transition-colors whitespace-nowrap cursor-pointer"
                >
                  ← Back to Owner Studio
                </button>
              )}
              <button
                type="button"
                disabled={!customerViewReady}
                onClick={() => void printQuotation()}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#1B241E] bg-white hover:bg-[#FAF8F3] border border-[#D4CEC2] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1C3A2F]" />
                <span>{customerQuoteRecord?.workOrder?'Download work order PDF':'Download PDF'}</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopiedShareToast(true);
                    setTimeout(() => setCopiedShareToast(false), 2500);
                  } catch {
                    setActionError('Your browser could not copy the link. You can copy it from the address bar.');
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
                    <span>{customerQuoteRecord?.workOrder ? 'Share' : 'Share Quote'}</span>
                  </>
                )}
              </button>
            </>
          )}

          {mode === 'studio' && ownerAuthenticated && <>
            <button id="studio-settings-trigger" type="button" onClick={() => {setSettingsOpen(true); window.scrollTo({ top: 0 });}} className="header-secondary" aria-current={settingsOpen ? 'page' : undefined}><Settings size={15}/> Settings</button>
            <button type="button" onClick={handleOwnerLogout} className="header-primary"><LogOut size={15}/> Sign out</button>
          </>}
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
      <main className="flex-1" id="main-content">
        {actionError && <div role="alert" className="app-error"><span>{actionError}</span><button type="button" onClick={() => setActionError('')} aria-label="Dismiss error"><X size={18}/></button></div>}
        {/* MODE 1: HOME PAGE — PRIVATE CLIENT QUOTATION PORTAL (Never exposes other customers' quotes!) */}
        {mode === 'portal' && (
          <div className="portal-page">
            <section className="portal-hero">
              <div className="portal-hero-copy">
                <p className="eyebrow">{catalogue.company.brandName}</p>
                <h1>Your space.<br/><em>Beautifully considered.</em></h1>
                <p>A thoughtful home begins with the details. Explore your personalised interior proposal, compare materials, and make it yours.</p>
                <a href="#quotation-access" className="hero-link">Open your quotation <ArrowRight size={18}/></a>
                <div className="hero-caption">RESIDENTIAL & COMMERCIAL INTERIORS</div>
              </div>
              <div className="portal-hero-image"><img src="/assets/ume-living.jpg" alt="Warm contemporary living room with carefully crafted interior finishes"/><span>Made for the way you live.</span></div>
            </section>
            <section className="portal-access" id="quotation-access">
              <div className="access-intro"><p className="eyebrow">YOUR PERSONAL PROPOSAL</p><h2>Good design.<br/>Clear choices.</h2><p>Your quotation brings every room, material and price together in one place. Use the private link we shared with you, or enter your quotation details.</p><div className="privacy-note"><ShieldCheck size={22}/><span>Your proposal is private.<br/>Only your quotation will be opened.</span></div></div>
              <div className="access-card">
                <h2>Welcome home.</h2><p className="form-intro">Let’s open your interior proposal.</p>
                <form onSubmit={handleCustomerLookupSubmit}>
                  <label htmlFor="portal-quote-code">Quotation link or number</label>
                  <input id="portal-quote-code" value={lookupCodeInput} onChange={e => setLookupCodeInput(e.target.value)} placeholder="Paste your private link or quotation number" required autoComplete="off"/>
                  <label htmlFor="portal-quote-phone">Registered mobile number <span>(for quotation number access)</span></label>
                  <input id="portal-quote-phone" type="tel" value={lookupPhoneInput} onChange={e => setLookupPhoneInput(e.target.value)} placeholder="Your registered mobile number" autoComplete="tel"/>
                  {lookupError && <p role="alert" className="form-error">{lookupError}</p>}
                  <button type="submit" className="form-submit" disabled={lookupLoading}>{lookupLoading ? 'Opening your quotation…' : 'Open my quotation'}<ArrowRight size={17}/></button>
                </form>
                <p className="access-help">Need your link? <a href={`https://wa.me/${catalogue.company.whatsapp.replace(/\D/g, '')}`}>Message {catalogue.company.brandName}</a></p>
              </div>
            </section>
          </div>
        )}

        {((mode === 'owner_login') || (mode === 'studio' && !ownerAuthenticated)) && (
          <section className="owner-login-page">
            <div className="owner-login-story"><p className="eyebrow">THE UME WORKSPACE</p><h1>Thoughtful spaces.<br/><em>Seamless beginnings.</em></h1><p>Your private workspace for beautiful proposals, considered materials and every client detail.</p><img src="/assets/ume-kitchen.jpg" alt="Bespoke kitchen with warm cabinetry"/></div>
            <div className="owner-login-card"><div className="login-icon"><Lock size={22}/></div><p className="eyebrow">OWNER ACCESS</p><h2>Welcome to your studio.</h2><p className="form-intro">Sign in to manage quotations and your rate card.</p>
              <form onSubmit={handleOwnerStudioLogin}>
                <label htmlFor="owner-username">Username</label><input id="owner-username" name="username" autoComplete="username" value={ownerUsername} onChange={e => setOwnerUsername(e.target.value)} required autoFocus/>
                <label htmlFor="owner-password">Password</label><div className="password-field"><input id="owner-password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} required/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
                {ownerAuthError && <p role="alert" className="form-error">{ownerAuthError}</p>}
                <button type="submit" className="form-submit" disabled={ownerBusy}>{ownerBusy ? 'Signing in…' : 'Sign in to studio'}<ArrowRight size={17}/></button>
              </form><a href="/" className="back-home">← Back to client portal</a>
            </div>
          </section>
        )}

        {mode === 'customer_quote' && !customerQuoteRecord && <div role="status" className="quote-loading"><span className="loading-dot"/> Opening your private quotation…</div>}
        {/* MODE 2: PRIVATE SINGLE-CUSTOMER QUOTATION VIEW (Strictly isolated to their own quote) */}
        {mode === 'customer_quote' && customerQuoteRecord && (
          <Suspense fallback={<ViewLoading>Opening your private quotation…</ViewLoading>}><CustomerViewMounted onReady={setCustomerViewReady}><CustomerQuotationView
            key={`${customerQuoteRecord.publicId}-${customerQuoteRecord.revision}`}
            isOwner={ownerAuthenticated}
            publicId={customerQuoteRecord.publicId}
            revision={customerQuoteRecord.revision}
            supersededByPublicId={customerQuoteRecord.supersededByPublicId}
            status={customerQuoteRecord.status}
            draft={customerQuoteRecord.draft}
            snapshot={customerQuoteRecord.snapshot}
            catalogue={customerCatalogue || catalogue}
            approvedDiscountRupees={customerQuoteRecord.approvedDiscountRupees}
            verifiedPaidRupees={customerVerifiedPaid}
            pendingPaymentsCount={customerPendingCount}
            defaultSentPackage={customerQuoteRecord.defaultSentPackage}
            initialSelection={customerQuoteRecord.lastCustomerSelection}
            existingFeedback={customerQuoteRecord.customerFeedback}
            workOrder={customerQuoteRecord.workOrder}
            onSaveSelection={handleSaveSelection}
            onUpdateQuoteDraft={({draft, defaultSentPackage}) =>
              handleUpdateQuoteDraft(customerQuoteRecord.publicId, draft, defaultSentPackage)
            }
            onSubmitPayment={handleSubmitPayment}
            onSwitchQuote={(pid) => fetchSingleCustomerQuote(pid)}
          /></CustomerViewMounted></Suspense>
        )}

        {/* MODE 3: AUTHENTICATED OWNER STUDIO */}
        {mode === 'studio' && ownerAuthenticated && settingsOpen && (
          <Suspense fallback={<ViewLoading>Opening settings…</ViewLoading>}><BusinessSettings
            company={catalogue.company}
            catalogue={catalogue}
            onSaveCatalogue={handleUpdateCatalogue}
            ownerUsername={ownerUsername}
            onSaveCompany={handleSaveCompany}
            onSaveCredentials={handleCredentialChange}
            onClose={() => { setSettingsOpen(false); requestAnimationFrame(() => document.getElementById('studio-settings-trigger')?.focus()); }}
          /></Suspense>
        )}
        {ownerAuthenticated && ownerStudioLoaded && (
          <div hidden={mode !== 'studio' || settingsOpen}><Suspense fallback={<ViewLoading>Opening your studio…</ViewLoading>}><OwnerStudioView
            catalogue={catalogue}
            quotes={quotes}
            ledger={ledger}
            onOpenCustomerQuote={(pid) => void fetchSingleCustomerQuote(pid)}
            onPublishDraft={handlePublishDraft}
            onSaveOwnerDraft={handleSaveOwnerDraft}
            onUpdateDefaultPackage={handleUpdateDefaultPackage}
            onUpdateQuoteDraft={handleUpdateQuoteDraft}
            onUpdateCatalogue={handleUpdateCatalogue}
            onVerifyOrRejectPayment={handleVerifyOrRejectPayment}
            onRecordVerifiedPayment={handleRecordVerifiedPayment}
            onCreateWorkOrder={handleCreateWorkOrder}
            onDeleteQuote={handleDeleteQuote}
          /></Suspense></div>
        )}
      </main>

      {/* Quiet Architectural Footer */}
      <footer className="company-footer no-print">
        <div className="company-footer-inner">
          <div className="company-footer-identity">
            <UmeLogoMark size="sm" />
            <div><strong>{catalogue.company.legalName}</strong><p>{catalogue.company.address}</p></div>
          </div>
          <div className="company-footer-contact">
            <span>Proprietor: {catalogue.company.proprietor}</span>
            <div><a href={`tel:${catalogue.company.phone.replace(/[^\d+]/g, '')}`}>{catalogue.company.phone}</a>
            {catalogue.company.domain && (companyWebsiteUrl(catalogue.company.domain) ? <a href={companyWebsiteUrl(catalogue.company.domain)}>{catalogue.company.domain.replace(/^https?:\/\//i, '').replace(/\/$/, '')}</a> : <span>{catalogue.company.domain}</span>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
