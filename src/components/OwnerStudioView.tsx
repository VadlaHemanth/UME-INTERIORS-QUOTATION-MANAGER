import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus2,
  History,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  buildDynamicGemInstructions,
  extractAndMergeRateCardFromDraft,
  getPackageDisplayName,
  LUXURY_IMAGE_PROMPTS,
  mergeRateCardJsonIntoCatalogue,
  RATECARD_EXTENSION_PRESETS,
  StudioCatalogue,
  WorkTypeDefinition,
} from '../lib/catalogue';
import {
  APPENDIX_PRACTICE_DRAFT,
  HISTORICAL_PDF_AUDITS,
  VIDYA_SAGAR_REDDY_DRAFT,
} from '../lib/historicalData';
import {
  ALL_FINISHES,
  ALL_GRADES,
  ALL_PROTECTIONS,
  calculateQuotationPricing,
  formatINR,
  makeComboKey,
} from '../lib/pricing';
import {
  FinishOption,
  migrateV1ToV2Draft,
  PlywoodGrade,
  ProtectionOption,
  QuotationDraftV2,
  ResolvedPackageSelection,
  validateQuotationDraftV2,
} from '../lib/schema';

export interface PublishedQuoteSummary {
  publicId: string;
  revision: number;
  previousPublicId?: string;
  supersededByPublicId?: string;
  status: string;
  publishedAt: string;
  viewsCount: number;
  lastViewedAt: string | null;
  draft: QuotationDraftV2;
  snapshot: any;
  approvedDiscountRupees: number;
  defaultSentPackage?: ResolvedPackageSelection;
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
  selectionHistory?: {
    id: string;
    savedAt: string;
    summaryLabel: string;
    finalTotalRupees: number;
    mixByRoom: boolean;
    wholeHomeSelection: ResolvedPackageSelection;
    roomSelections: Record<number, ResolvedPackageSelection>;
  }[];
  customerFeedback?: {
    id: string;
    topic: string;
    message: string;
    submittedAt: string;
  }[];
}

export interface LedgerEntrySummary {
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

interface OwnerStudioViewProps {
  catalogue: StudioCatalogue;
  quotes: PublishedQuoteSummary[];
  ledger: LedgerEntrySummary[];
  onOpenCustomerQuote: (publicId: string) => void;
  onPublishDraft: (payload: {
    draft: QuotationDraftV2;
    reviewedOwnerRequests: boolean;
    supersedePublicId?: string;
    approvedDiscountRupees: number;
    defaultSentPackage?: ResolvedPackageSelection;
  }) => Promise<{ ok: boolean; shareUrl?: string; publicId?: string; error?: string }>;
  onUpdateDefaultPackage?: (
    publicId: string,
    defaultSentPackage: ResolvedPackageSelection
  ) => Promise<void>;
  onUpdateQuoteDraft?: (
    publicId: string,
    updatedDraft: QuotationDraftV2,
    defaultSentPackage?: ResolvedPackageSelection
  ) => Promise<void>;
  onUpdateCatalogue: (nextCatalogue: StudioCatalogue) => Promise<void>;
  onVerifyOrRejectPayment: (
    paymentId: string,
    action: 'verify' | 'reject',
    rejectionReason?: string
  ) => Promise<void>;
}

export const OwnerStudioView: React.FC<OwnerStudioViewProps> = ({
  catalogue,
  quotes,
  ledger,
  onOpenCustomerQuote,
  onPublishDraft,
  onUpdateDefaultPackage,
  onUpdateQuoteDraft,
  onUpdateCatalogue,
  onVerifyOrRejectPayment,
}) => {
  const [activeTab, setActiveTab] = useState<
    'unified_studio' | 'quotes' | 'gem_instructions' | 'ledger'
  >('unified_studio');
  const [savedDefaultToastId, setSavedDefaultToastId] = useState<string | null>(null);

  // Unified Quotation + Rate Card Studio State
  const [workingDraft, setWorkingDraft] = useState<QuotationDraftV2>(() =>
    structuredClone(VIDYA_SAGAR_REDDY_DRAFT)
  );
  const [rawJsonText, setRawJsonText] = useState<string>(() =>
    JSON.stringify(VIDYA_SAGAR_REDDY_DRAFT, null, 2)
  );
  const [editableCatalogue, setEditableCatalogue] = useState<StudioCatalogue>(() =>
    structuredClone(catalogue)
  );
  const [reviewedOwnerRequests, setReviewedOwnerRequests] = useState<boolean>(false);
  const [approvedDiscount, setApprovedDiscount] = useState<number>(0);
  const [supersedeId, setSupersedeId] = useState<string>('');
  const [publishResult, setPublishResult] = useState<{
    ok: boolean;
    message: string;
    publicId?: string;
    shareUrl?: string;
  } | null>(null);

  // Inline Quick-Add Work Element Form inside the Unified Studio
  const [showFullRateCardTable, setShowFullRateCardTable] = useState<boolean>(false);
  const [newWorkLabel, setNewWorkLabel] = useState<string>('');
  const [newWorkUnit, setNewWorkUnit] = useState<'sq_ft' | 'running_ft' | 'each' | 'lumpsum'>(
    'sq_ft'
  );
  const [newWorkBase, setNewWorkBase] = useState<number>(850);
  const [newWorkNormal, setNewWorkNormal] = useState<number>(950);
  const [newWorkPremium, setNewWorkPremium] = useState<number>(1100);
  const [newWorkPvcAdder, setNewWorkPvcAdder] = useState<number>(75);
  const [newWorkDescription, setNewWorkDescription] = useState<string>('');

  // Tab 2: Quotes CMS search & filter
  const [quoteSearch, setQuoteSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [expandedQuoteDetailsId, setExpandedQuoteDetailsId] = useState<string | null>(null);

  // Tab 3: Master Gem Instructions & Image Prompts
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedImagePromptId, setCopiedImagePromptId] = useState<string | null>(null);

  useEffect(() => {
    setEditableCatalogue(structuredClone(catalogue));
  }, [catalogue]);

  // Dynamic Master Gem Instructions (Always includes all current Rate Card items!)
  const dynamicGemInstructions = useMemo(
    () => buildDynamicGemInstructions(editableCatalogue),
    [editableCatalogue]
  );

  // Work types currently used in workingDraft so owner can edit their Base/Normal/Premium rates inline!
  const activeDraftWorkTypes = useMemo(() => {
    const used = new Set<string>();
    used.add('Box type');
    used.add('Frame type');
    used.add('Loft - frame and shutter');
    for (const room of workingDraft.rooms || []) {
      for (const item of room.items || []) {
        const wt = (item.work_type || '').trim();
        if (wt) used.add(wt);
      }
    }
    return Array.from(used);
  }, [workingDraft]);

  // Detect any unmapped / new work_type in workingDraft
  const unmappedWorkTypes = useMemo(() => {
    const missing = new Set<string>();
    for (const room of workingDraft.rooms || []) {
      for (const item of room.items || []) {
        const wt = (item.work_type || '').trim();
        if (wt && !editableCatalogue.workTypes[wt]) {
          missing.add(wt);
        }
      }
    }
    return Array.from(missing);
  }, [workingDraft, editableCatalogue.workTypes]);

  const validation = useMemo(
    () => validateQuotationDraftV2(workingDraft, { reviewedOwnerRequests }),
    [workingDraft, reviewedOwnerRequests]
  );

  const previewSnapshot = useMemo(
    () => calculateQuotationPricing(workingDraft, editableCatalogue),
    [workingDraft, editableCatalogue]
  );

  const syncDraft = (next: QuotationDraftV2) => {
    setWorkingDraft(next);
    setRawJsonText(JSON.stringify(next, null, 2));
    setPublishResult(null);
  };

  /**
   * Unified JSON Loader: Accepts EITHER a Quotation JSON (with optional rate_card_updates / custom_rates / new work_types)
   * OR a Rate Card JSON, and automatically updates both the Rate Card Catalogue and the Quotation Editor in ONE click!
   */
  const processUnifiedJsonText = async (jsonString: string, sourceLabel = 'JSON') => {
    try {
      const parsed = JSON.parse(jsonString);

      // Case A: Pure Rate Card JSON (`quotation-studio.ratecard.v2` without `rooms`)
      if (
        (parsed.schema_version === 'quotation-studio.ratecard.v2' || parsed.workTypes) &&
        !Array.isArray(parsed.rooms)
      ) {
        const merged = mergeRateCardJsonIntoCatalogue(editableCatalogue, parsed);
        setEditableCatalogue(merged.catalogue);
        await onUpdateCatalogue(merged.catalogue);
        setPublishResult({
          ok: true,
          message: `Merged ${merged.addedOrUpdatedKeys.length} work element(s) (${merged.addedOrUpdatedKeys.join(', ')}) into your Rate Card Memory!`,
        });
        return;
      }

      // Case B: Unified Quotation + Rate Card JSON (extracts rate_card_updates & any new work_type items automatically!)
      const autoRateMerge = extractAndMergeRateCardFromDraft(editableCatalogue, parsed);
      if (autoRateMerge.addedOrUpdatedKeys.length > 0) {
        setEditableCatalogue(autoRateMerge.catalogue);
        await onUpdateCatalogue(autoRateMerge.catalogue);
      }

      const v2 =
        parsed.schema_version === 'quotation-studio.draft.v2'
          ? parsed
          : migrateV1ToV2Draft(parsed);

      syncDraft(v2);
      setPublishResult({
        ok: true,
        message:
          autoRateMerge.addedOrUpdatedKeys.length > 0
            ? `${sourceLabel} loaded! Also auto-saved ${autoRateMerge.addedOrUpdatedKeys.length} work type(s) (${autoRateMerge.addedOrUpdatedKeys.join(', ')}) into your Rate Card Memory.`
            : `${sourceLabel} parsed, validated, and loaded into the Unified Quote & Rate Card Studio.`,
      });
    } catch (err: any) {
      setPublishResult({
        ok: false,
        message: `Invalid JSON syntax: ${err?.message || 'Please check that you copied the complete JSON object from your Gemini Gem or Custom GPT.'}`,
      });
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setRawJsonText(text.trim());
        await processUnifiedJsonText(text.trim(), 'Clipboard JSON');
      }
    } catch {
      setPublishResult({
        ok: false,
        message:
          'Browser blocked clipboard read. Please press Ctrl+V / Cmd+V inside the JSON box below and click Load Unified JSON.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '');
      setRawJsonText(text);
      await processUnifiedJsonText(text, `File "${file.name}"`);
    };
    reader.readAsText(file);
  };

  const handleStartNewQuotation = () => {
    const clean: QuotationDraftV2 = {
      schema_version: 'quotation-studio.draft.v2',
      output_language: 'en',
      is_demo: false,
      languages: ['en'],
      customer: { name: '', site: '', phone: '' },
      quote: {
        number: `UME-2026-${1025 + quotes.length}`,
        date: new Date().toISOString().slice(0, 10),
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      },
      recommended: {
        grade: 'Base',
        protection: 'Standard',
        finish: 'SF',
        brand_preference: 'Garjan 710',
      },
      rooms: [
        {
          name: 'Master Bedroom',
          recommended: null,
          items: [
            {
              name: 'Wardrobe',
              work_type: 'Box type',
              size_text: '7 ft × 8 ft',
              measure: { unit: 'sq_ft', per_item: 56 },
              quantity: 1,
              pvc: { eligible: true, parts: ['Back panel', 'Bottom floor-contact panel'] },
              optional: false,
              source_text_en:
                'One box-type wardrobe, 7 ft by 8 ft (56 sq ft) billed by front-face area.',
            },
          ],
        },
      ],
      owner_requests: [],
      needs_clarification: [],
    };
    setSupersedeId('');
    syncDraft(clean);
  };

  const handleAutoAddMissingWorkTypesToRateCard = async () => {
    if (unmappedWorkTypes.length === 0) return;
    const merged = extractAndMergeRateCardFromDraft(editableCatalogue, workingDraft);
    setEditableCatalogue(merged.catalogue);
    await onUpdateCatalogue(merged.catalogue);
    setPublishResult({
      ok: true,
      message: `Auto-saved ${merged.addedOrUpdatedKeys.join(', ')} into your Rate Card Memory!`,
    });
  };

  const handleAddCustomWorkElementForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newWorkLabel.trim();
    if (!cleanLabel) return;

    const pvcAdd = Math.max(0, Number(newWorkPvcAdder) || 0);
    const baseStd = Math.max(0, Number(newWorkBase) || 0);
    const normStd = Math.max(0, Number(newWorkNormal) || 0);
    const premStd = Math.max(0, Number(newWorkPremium) || 0);

    const newDef: WorkTypeDefinition = {
      id: cleanLabel,
      label: cleanLabel,
      unit: newWorkUnit,
      plainEnglishDefinition:
        newWorkDescription.trim() ||
        `Custom interior work (${cleanLabel}) executed with calibrated plywood and 1mm laminate finish, billed per ${newWorkUnit}.`,
      pvcDefaultEligible: pvcAdd > 0,
      pvcDefaultParts: pvcAdd > 0 ? ['Back panel'] : [],
      rates: {
        Base: { Standard: baseStd, 'With PVC': baseStd + pvcAdd },
        Normal: { Standard: normStd, 'With PVC': normStd + pvcAdd },
        Premium: { Standard: premStd, 'With PVC': premStd + pvcAdd },
      },
      highGlossPremiumPerUnit: 0,
    };

    const nextCat = structuredClone(editableCatalogue);
    nextCat.workTypes[cleanLabel] = newDef;
    setEditableCatalogue(nextCat);
    await onUpdateCatalogue(nextCat);

    setNewWorkLabel('');
    setNewWorkDescription('');
    setPublishResult({
      ok: true,
      message: `Added "${cleanLabel}" to your Rate Card Memory & updated Master Gem Instructions automatically!`,
    });
  };

  const handlePublishClick = async () => {
    setPublishResult(null);
    // Ensure any inline rate changes in editableCatalogue are persisted first
    await onUpdateCatalogue(editableCatalogue);

    const defaultPkg: ResolvedPackageSelection = {
      grade: workingDraft.recommended?.grade || 'Base',
      protection: workingDraft.recommended?.protection || 'Standard',
      finish: workingDraft.recommended?.finish || 'SF',
      brand_preference: workingDraft.recommended?.brand_preference || null,
    };
    const res = await onPublishDraft({
      draft: workingDraft,
      reviewedOwnerRequests,
      supersedePublicId: supersedeId || undefined,
      approvedDiscountRupees: approvedDiscount,
      defaultSentPackage: defaultPkg,
    });
    if (res.ok) {
      setPublishResult({
        ok: true,
        message: `Published quotation with Default Sent Package (${defaultPkg.grade} · ${defaultPkg.protection} · ${defaultPkg.finish}) to ${res.shareUrl}`,
        publicId: res.publicId,
        shareUrl: res.shareUrl,
      });
    } else {
      setPublishResult({
        ok: false,
        message: res.error || 'Publication blocked by validation gate.',
      });
    }
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
      const qStr = `${q.draft.customer.name || ''} ${q.draft.customer.site || ''} ${
        q.draft.quote.number || ''
      }`.toLowerCase();
      const matchesSearch = !quoteSearch.trim() || qStr.includes(quoteSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [quotes, quoteSearch, statusFilter]);

  const exportQuotesCsv = () => {
    const headers = [
      'Quote Number',
      'Revision',
      'Private Token',
      'Customer Name',
      'Phone',
      'Site',
      'Status',
      'Default Sent Package',
      'Customer Saved Selection',
      'Saved Final Total',
      'Base SF Total',
      'Premium SF Total',
      'Views',
      'Published At',
    ];
    const rows = quotes.map((q) => {
      const defPkg = q.defaultSentPackage || q.lastCustomerSelection.wholeHomeSelection;
      return [
        q.draft.quote.number || '',
        q.revision,
        q.publicId,
        `"${(q.draft.customer.name || '').replace(/"/g, '""')}"`,
        q.draft.customer.phone || '',
        `"${(q.draft.customer.site || '').replace(/"/g, '""')}"`,
        q.status,
        `"${defPkg.grade} ${defPkg.protection} ${defPkg.finish}"`,
        `"${q.lastCustomerSelection.summaryLabel || 'Not modified yet'}"`,
        q.lastCustomerSelection.savedFinalTotalRupees || 0,
        q.snapshot.baseWholeHomeTotals['Base__Standard__SF'] || 0,
        q.snapshot.baseWholeHomeTotals['Premium__Standard__SF'] || 0,
        q.viewsCount,
        q.publishedAt,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ume_interiors_quotes_export.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#18221D] pb-16">
      <datalist id="ume-worktypes-datalist">
        {Object.keys(editableCatalogue.workTypes).map((wt) => (
          <option key={wt} value={wt} />
        ))}
      </datalist>

      {/* Studio Header & Unified Segmented Navigation */}
      <div className="bg-white border-b border-[#E5DFD3]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1C3A2F]">
                UMAMAHESHWARA INTERIORS · Umamaheshwara Enterprises — Residential and Commercial Interior Designers
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-[#18221D] mt-0.5">
                Owner Quotation & Rate Card Studio
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('gem_instructions')}
                className="px-4 py-2 bg-[#E4EFE7] hover:bg-[#1C3A2F] text-[#1C3A2F] hover:text-white border border-[#C5DEC9] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                Open Master Gem / Custom GPT Instructions
              </button>
              <button
                type="button"
                onClick={handleStartNewQuotation}
                className="px-4 py-2 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4 text-[#1C3A2F]" />
                Start Blank Quotation
              </button>
            </div>
          </div>

          {/* 4-Tab Unified Segmented Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#EAE3D5] border border-[#DDD4C3] rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('unified_studio')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'unified_studio'
                  ? 'bg-[#1C3A2F] text-white shadow-2xs'
                  : 'text-[#4A524D] hover:text-[#18221D]'
              }`}
            >
              1. Create Quote & Rate Card Studio ({Object.keys(editableCatalogue.workTypes).length} Work Types)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'quotes'
                  ? 'bg-[#1C3A2F] text-white shadow-2xs'
                  : 'text-[#4A524D] hover:text-[#18221D]'
              }`}
            >
              2. Customer Quotes & Saved Selections ({quotes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gem_instructions')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'gem_instructions'
                  ? 'bg-[#1C3A2F] text-white shadow-2xs'
                  : 'text-[#4A524D] hover:text-[#18221D]'
              }`}
            >
              3. Gemini Gem / Custom GPT Prompt & Image Prompts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-[#1C3A2F] text-white shadow-2xs'
                  : 'text-[#4A524D] hover:text-[#18221D]'
              }`}
            >
              4. Payments Ledger ({ledger.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: UNIFIED CREATE QUOTE & RATE CARD STUDIO */}
        {activeTab === 'unified_studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Paste Unified JSON (Auto-Extracts Rate Card + Quotation) & Validation Gate */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-[#E5DFD3] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#EAE4D8] pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C3A2F]">
                      STEP 1 · UNIFIED JSON IMPORT (QUOTE + RATE CARD)
                    </span>
                    <h2 className="text-base font-bold text-[#18221D] mt-0.5">
                      Paste JSON from Your Single Gemini Gem / Custom GPT
                    </h2>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="p-3 bg-[#E4EFE7] border border-[#C5DEC9] rounded-xl text-xs text-[#1C3A2F] leading-relaxed">
                    <strong>One-Paste Auto Rate Card Memory:</strong> When your Gem outputs a quotation with new items (like a <em>Wall-mounted study table</em> or <em>Folding table</em>) or custom Box/Frame rates inside <code>rate_card_updates</code>, pasting it here <strong>automatically saves those new items into your Rate Card</strong> and builds the quote in one step!
                  </div>

                  {/* Quick Toolbar: Paste from Clipboard + Upload .json File */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="px-3.5 py-2 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Paste JSON from Clipboard
                    </button>

                    <label className="px-3.5 py-2 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#1C3A2F]" />
                      <span>Upload .json File</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Quick Load Verified JSON Templates */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F] mr-1">
                      Templates:
                    </span>
                    <button
                      type="button"
                      onClick={() => syncDraft(structuredClone(VIDYA_SAGAR_REDDY_DRAFT))}
                      className="px-2.5 py-1 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#E5DFD3] rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      Vidya Sagar Reddy (3BHK)
                    </button>
                    <button
                      type="button"
                      onClick={() => syncDraft(structuredClone(APPENDIX_PRACTICE_DRAFT))}
                      className="px-2.5 py-1 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#E5DFD3] rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      2BHK Sample JSON
                    </button>
                  </div>

                  <textarea
                    aria-label="Paste JSON from Gemini Gem or Custom GPT"
                    rows={13}
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                    placeholder='Paste your unified {"schema_version": "quotation-studio.draft.v2", "rate_card_updates": {...}, "rooms": [...]} JSON here...'
                    className="w-full p-3.5 text-xs font-mono bg-[#18221D] text-[#FAF8F4] rounded-xl focus:outline-none"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(rawJsonText)}
                      className="px-3 py-2 bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy JSON
                    </button>

                    <button
                      type="button"
                      onClick={() => processUnifiedJsonText(rawJsonText, 'JSON')}
                      className="px-4 py-2.5 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Load JSON & Auto-Save Rate Card Items
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation & Publish Readiness Card */}
              <div className="bg-white border border-[#E5DFD3] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#18221D]">
                    Validation & Publish Gate
                  </h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                      validation.readyForPublish
                        ? 'bg-[#E4EFE7] text-[#15803D]'
                        : 'bg-[#FFFBEB] text-[#B45309]'
                    }`}
                  >
                    {validation.readyForPublish
                      ? 'Ready to Publish ✓'
                      : `${validation.issues.length} Issue(s) to Resolve`}
                  </span>
                </div>

                {validation.issues.length === 0 ? (
                  <p className="text-xs text-[#1C3A2F] bg-[#E4EFE7] p-3 border border-[#C5DEC9] rounded-xl font-medium">
                    All fields are verified English-only (`quotation-studio.draft.v2`), measurements are complete, and the quotation is ready to publish.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {validation.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#FFFBEB] border border-[#B45309]/40 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#92400E]">
                          <span>Field: {issue.path || '/'}</span>
                          <span>{issue.code}</span>
                        </div>
                        <p className="text-[#18221D] font-medium">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {(workingDraft.is_demo ||
                  workingDraft.needs_clarification.length > 0 ||
                  workingDraft.owner_requests.length > 0) && (
                  <div className="pt-2 border-t border-[#EAE4D8] space-y-2">
                    {workingDraft.is_demo && (
                      <button
                        type="button"
                        onClick={() =>
                          syncDraft({
                            ...workingDraft,
                            is_demo: false,
                            customer: {
                              name: workingDraft.customer.name || 'M. Venkat Reddy',
                              site:
                                workingDraft.customer.site ||
                                'Flat 202, Aditya Sunshine, Habsiguda, Hyderabad',
                              phone: workingDraft.customer.phone || '9849011223',
                            },
                            recommended: {
                              grade: workingDraft.recommended?.grade || 'Base',
                              protection: workingDraft.recommended?.protection || 'Standard',
                              finish: workingDraft.recommended?.finish || 'SF',
                              brand_preference: workingDraft.recommended?.brand_preference || null,
                            },
                          })
                        }
                        className="w-full py-2 px-3 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold text-left cursor-pointer"
                      >
                        Mark as Real Customer Job (`is_demo = false`) →
                      </button>
                    )}

                    {workingDraft.needs_clarification.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = structuredClone(workingDraft);
                          next.rooms.forEach((r) =>
                            r.items.forEach((it) => {
                              if (!it.measure.unit) it.measure.unit = 'sq_ft';
                              if (!it.measure.per_item) it.measure.per_item = 4.5;
                              if (it.size_text === 'five-six') {
                                it.size_text = '5 ft × 6 ft';
                                it.measure.per_item = 30;
                              }
                              if (it.pvc.eligible === null) {
                                it.pvc.eligible = true;
                                it.pvc.parts = ['Back panel'];
                              }
                            })
                          );
                          if (!next.customer.name) next.customer.name = 'M. Venkat Reddy';
                          if (!next.customer.site)
                            next.customer.site = 'Flat 202, Aditya Sunshine, Habsiguda, Hyderabad';
                          if (next.recommended && !next.recommended.protection) {
                            next.recommended.protection = 'With PVC';
                          }
                          next.needs_clarification = [];
                          syncDraft(next);
                        }}
                        className="w-full py-2 px-3 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold text-left cursor-pointer"
                      >
                        Confirm Clarifications & Clear Open Questions →
                      </button>
                    )}

                    {workingDraft.owner_requests.length > 0 && (
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2.5 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl">
                        <input
                          type="checkbox"
                          checked={reviewedOwnerRequests}
                          onChange={(e) => setReviewedOwnerRequests(e.target.checked)}
                          className="w-4 h-4 accent-[#1C3A2F] rounded"
                        />
                        <span>
                          Owner has reviewed all {workingDraft.owner_requests.length} special request(s)
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right 7 Cols: Step 2 — Customer Details, Inline Rate Card & New Item Editor, Rooms & Publish */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-[#E5DFD3] rounded-2xl p-6 shadow-xs space-y-5">
                <div className="border-b border-[#EAE4D8] pb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1C3A2F]">
                      STEP 2 · REVIEW QUOTE, INLINE RATE CARD & PUBLISH
                    </span>
                    <h2 className="text-base font-bold text-[#18221D] mt-0.5">
                      Customer Details, Default Sending Package, Inline Rates & Room Scope
                    </h2>
                  </div>
                </div>

                {/* Unmapped / Custom Work Type Detector Banner */}
                {unmappedWorkTypes.length > 0 && (
                  <div className="p-4 bg-[#E4EFE7] border border-[#1C3A2F] rounded-xl space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#1C3A2F]">
                          New Work Element(s) Detected in Quote: {unmappedWorkTypes.join(', ')}
                        </p>
                        <p className="text-[#2D4F3E] mt-0.5">
                          Save these new work elements directly into your Rate Card Memory in one click.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoAddMissingWorkTypesToRateCard}
                        className="px-3.5 py-2 bg-[#1C3A2F] text-[#E6CBA8] rounded-xl font-bold cursor-pointer"
                      >
                        + Save to Rate Card Memory
                      </button>
                    </div>
                  </div>
                )}

                {/* Customer & Quote Meta Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#18221D] mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={workingDraft.customer.name || ''}
                      onChange={(e) =>
                        syncDraft({
                          ...workingDraft,
                          customer: { ...workingDraft.customer, name: e.target.value || null },
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#18221D] mb-1">
                      Customer Mobile Number
                    </label>
                    <input
                      type="text"
                      value={workingDraft.customer.phone || ''}
                      onChange={(e) =>
                        syncDraft({
                          ...workingDraft,
                          customer: { ...workingDraft.customer, phone: e.target.value || null },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#18221D] mb-1">
                      Quote Reference No.
                    </label>
                    <input
                      type="text"
                      value={workingDraft.quote.number || ''}
                      onChange={(e) =>
                        syncDraft({
                          ...workingDraft,
                          quote: { ...workingDraft.quote, number: e.target.value || null },
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#18221D] mb-1">
                      Full Site / Property Address (Hyderabad)
                    </label>
                    <input
                      type="text"
                      value={workingDraft.customer.site || ''}
                      onChange={(e) =>
                        syncDraft({
                          ...workingDraft,
                          customer: { ...workingDraft.customer, site: e.target.value || null },
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#18221D] mb-1">
                      Approved Flat Discount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={approvedDiscount}
                      onChange={(e) => setApprovedDiscount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    />
                  </div>
                </div>

                {/* Default Sending Package Option */}
                <div className="p-4 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#1C3A2F]">
                        DEFAULT SENDING PACKAGE OPTION (WHEN CUSTOMER OPENS LINK)
                      </p>
                      <p className="text-xs text-[#5C645F] mt-0.5">
                        Choose which package (<strong>Standard</strong>, <strong>Normal</strong>, or <strong>Premium</strong>) is displayed when the customer opens the quotation link.
                      </p>
                    </div>
                    {(() => {
                      const matchingQuote =
                        quotes.find((q) => q.publicId === supersedeId) ||
                        quotes.find((q) => q.draft.quote.number === workingDraft.quote.number) ||
                        quotes[0];
                      if (!matchingQuote) return null;
                      return (
                        <button
                          type="button"
                          onClick={async () => {
                            const pkg: ResolvedPackageSelection = {
                              grade: workingDraft.recommended?.grade || 'Base',
                              protection: workingDraft.recommended?.protection || 'Standard',
                              finish: 'SF',
                              brand_preference: workingDraft.recommended?.brand_preference || null,
                            };
                            await onUpdateCatalogue(editableCatalogue);
                            if (onUpdateQuoteDraft) {
                              await onUpdateQuoteDraft(matchingQuote.publicId, workingDraft, pkg);
                            } else if (onUpdateDefaultPackage) {
                              await onUpdateDefaultPackage(matchingQuote.publicId, pkg);
                            }
                            setSavedDefaultToastId('studio-default-saved');
                            setTimeout(() => setSavedDefaultToastId(null), 2500);
                            setPublishResult({
                              ok: true,
                              message: `Saved Default Package (Send as ${getPackageDisplayName(pkg.grade)} · ${pkg.protection}) & all line edits directly to ${matchingQuote.draft.quote.number}!`,
                              publicId: matchingQuote.publicId,
                            });
                          }}
                          className="px-3.5 py-2 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {savedDefaultToastId === 'studio-default-saved'
                            ? 'Saved to Active Quote ✓'
                            : `Save Default Package & Edits to ${matchingQuote.draft.quote.number}`}
                        </button>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#18221D] mb-1">
                        Default Sent Package
                      </label>
                      <select
                        aria-label="Default Sent Plywood Grade"
                        value={workingDraft.recommended?.grade || 'Base'}
                        onChange={(e) =>
                          syncDraft({
                            ...workingDraft,
                            recommended: {
                              grade: e.target.value as PlywoodGrade,
                              protection: workingDraft.recommended?.protection || 'Standard',
                              finish: 'SF',
                              brand_preference: workingDraft.recommended?.brand_preference || null,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#D8D0C2] rounded-lg"
                      >
                        {ALL_GRADES.map((g) => (
                          <option key={g} value={g}>
                            Send as {getPackageDisplayName(g)} ({formatINR(previewSnapshot.baseWholeHomeTotals[makeComboKey(g, workingDraft.recommended?.protection || 'Standard', 'SF')])})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#18221D] mb-1">
                        Default Optional 6mm PVC Wall Shield
                      </label>
                      <select
                        aria-label="Default Sent PVC Protection"
                        value={workingDraft.recommended?.protection || 'Standard'}
                        onChange={(e) =>
                          syncDraft({
                            ...workingDraft,
                            recommended: {
                              grade: workingDraft.recommended?.grade || 'Base',
                              protection: e.target.value as ProtectionOption,
                              finish: 'SF',
                              brand_preference: workingDraft.recommended?.brand_preference || null,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#D8D0C2] rounded-lg"
                      >
                        <option value="Standard">Without PVC (Standard)</option>
                        <option value="With PVC">With Optional 6mm PVC Wall Shield</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* MERGED INLINE RATE CARD & NEW WORK ELEMENT MEMORY EDITOR (No separate tab switching!) */}
                <div className="p-4 bg-[#F6FAF7] border border-[#C5DEC9] rounded-xl space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#1C3A2F]">
                        INLINE RATE CARD & CUSTOM WORK ELEMENT MEMORY (MERGED)
                      </p>
                      <p className="text-xs text-[#2D4F3E] mt-0.5">
                        Adjust <strong>Standard</strong>, <strong>Normal</strong>, <strong>Premium</strong>, or <strong>+PVC Extra</strong> rates right here — it updates both this quote and your persistent Rate Card Memory!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFullRateCardTable(!showFullRateCardTable)}
                      className="px-3 py-1.5 bg-white border border-[#1C3A2F]/30 rounded-lg text-xs font-bold text-[#1C3A2F] cursor-pointer"
                    >
                      {showFullRateCardTable
                        ? `Show Only Active Quote Work Types (${activeDraftWorkTypes.length})`
                        : `Show All Catalogue Work Types (${Object.keys(editableCatalogue.workTypes).length})`}
                    </button>
                  </div>

                  {/* Inline Editable Rates Table for Active Quote Work Types (or Full Catalogue) */}
                  <div className="overflow-x-auto border border-[#C5DEC9] rounded-lg bg-white max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#1C3A2F] text-white">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Work Type (Unit)</th>
                          <th className="py-2 px-2 text-right font-semibold">Standard (₹)</th>
                          <th className="py-2 px-2 text-right font-semibold">Normal (₹)</th>
                          <th className="py-2 px-2 text-right font-semibold">Premium (₹)</th>
                          <th className="py-2 px-2 text-right font-semibold">+PVC Extra (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAE4D8]">
                        {(showFullRateCardTable
                          ? Object.keys(editableCatalogue.workTypes)
                          : activeDraftWorkTypes
                        ).map((wtKey) => {
                          const wt = editableCatalogue.workTypes[wtKey];
                          if (!wt) return null;
                          const currentPvcAdder = Math.max(
                            0,
                            wt.rates.Premium['With PVC'] - wt.rates.Premium.Standard
                          );
                          return (
                            <tr key={wt.id} className="hover:bg-[#FAF8F4]">
                              <td className="py-2 px-3 font-bold text-[#18221D]">
                                {wt.label}{' '}
                                <span className="text-[10px] font-mono font-normal text-[#5C645F]">
                                  ({wt.unit})
                                </span>
                              </td>
                              {(['Base', 'Normal', 'Premium'] as PlywoodGrade[]).map((g) => (
                                <td key={`${wt.id}-${g}`} className="py-1.5 px-2 text-right">
                                  <input
                                    type="number"
                                    aria-label={`${wt.label} ${getPackageDisplayName(g)} rate`}
                                    value={wt.rates[g].Standard}
                                    onChange={(e) => {
                                      const newStd = Number(e.target.value) || 0;
                                      const oldDiff = Math.max(
                                        0,
                                        wt.rates[g]['With PVC'] - wt.rates[g].Standard
                                      );
                                      const next = structuredClone(editableCatalogue);
                                      next.workTypes[wt.id].rates[g].Standard = newStd;
                                      next.workTypes[wt.id].rates[g]['With PVC'] =
                                        newStd + oldDiff;
                                      setEditableCatalogue(next);
                                    }}
                                    className="w-20 px-2 py-1 text-right font-mono tabular-nums text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded"
                                  />
                                </td>
                              ))}
                              <td className="py-1.5 px-2 text-right">
                                <input
                                  type="number"
                                  aria-label={`${wt.label} PVC Extra rate`}
                                  value={currentPvcAdder}
                                  onChange={(e) => {
                                    const newAdder = Math.max(0, Number(e.target.value) || 0);
                                    const next = structuredClone(editableCatalogue);
                                    const targetWt = next.workTypes[wt.id];
                                    targetWt.pvcDefaultEligible = newAdder > 0;
                                    (['Base', 'Normal', 'Premium'] as PlywoodGrade[]).forEach(
                                      (g) => {
                                        targetWt.rates[g]['With PVC'] =
                                          targetWt.rates[g].Standard + newAdder;
                                      }
                                    );
                                    setEditableCatalogue(next);
                                  }}
                                  className="w-16 px-2 py-1 text-right font-mono tabular-nums text-xs bg-[#E4EFE7] border border-[#C5DEC9] text-[#1C3A2F] font-bold rounded"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* One-Line Quick Add New Work Element to Rate Card Memory */}
                  <form
                    onSubmit={handleAddCustomWorkElementForm}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1"
                  >
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold uppercase text-[#1C3A2F] mb-1">
                        + New Work Type Name
                      </label>
                      <input
                        type="text"
                        value={newWorkLabel}
                        onChange={(e) => setNewWorkLabel(e.target.value)}
                        placeholder="e.g., Wall-mounted study table"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        Standard (₹)
                      </label>
                      <input
                        type="number"
                        value={newWorkBase}
                        onChange={(e) => setNewWorkBase(Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        Normal (₹)
                      </label>
                      <input
                        type="number"
                        value={newWorkNormal}
                        onChange={(e) => setNewWorkNormal(Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        Premium (₹)
                      </label>
                      <input
                        type="number"
                        value={newWorkPremium}
                        onChange={(e) => setNewWorkPremium(Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        +PVC
                      </label>
                      <input
                        type="number"
                        value={newWorkPvcAdder}
                        onChange={(e) => setNewWorkPvcAdder(Number(e.target.value) || 0)}
                        className="w-full px-1.5 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="w-full py-1.5 px-2.5 bg-[#1C3A2F] text-[#E6CBA8] rounded-lg text-xs font-bold cursor-pointer"
                      >
                        + Save Rate
                      </button>
                    </div>
                  </form>
                </div>

                {/* Rooms & Items Editor */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1 pt-2 border-t border-[#EAE4D8]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#18221D]">
                      Rooms & Furniture Items ({workingDraft.rooms.length} Rooms)
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const next = structuredClone(workingDraft);
                        next.rooms.push({
                          name: `Room ${next.rooms.length + 1}`,
                          recommended: null,
                          items: [
                            {
                              name: 'Wardrobe',
                              work_type: 'Box type',
                              size_text: '6 ft × 7 ft',
                              measure: { unit: 'sq_ft', per_item: 42 },
                              quantity: 1,
                              pvc: { eligible: true, parts: ['Back panel'] },
                              optional: false,
                              source_text_en: 'Box-type wardrobe, 6 ft by 7 ft (42 sq ft).',
                            },
                          ],
                        });
                        syncDraft(next);
                      }}
                      className="px-3 py-1.5 bg-[#FAF8F4] border border-[#D8D0C2] rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#1C3A2F]" /> Add Room
                    </button>
                  </div>

                  {workingDraft.rooms.map((room, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-4 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={room.name || ''}
                          onChange={(e) => {
                            const next = structuredClone(workingDraft);
                            next.rooms[rIdx].name = e.target.value;
                            syncDraft(next);
                          }}
                          className="font-bold text-xs text-[#18221D] bg-white px-3 py-1.5 border border-[#D8D0C2] rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = structuredClone(workingDraft);
                            next.rooms[rIdx].items.push({
                              name: 'Wall-mounted folding table',
                              work_type: 'Folding table',
                              size_text: '2 ft × 3 ft',
                              measure: { unit: 'sq_ft', per_item: 6 },
                              quantity: 1,
                              pvc: { eligible: false, parts: [] },
                              optional: false,
                              source_text_en:
                                'Wall-mounted folding table with both sides laminate finish, 2 ft by 3 ft (6 sq ft).',
                            });
                            syncDraft(next);
                          }}
                          className="px-3 py-1 bg-white border border-[#D8D0C2] rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>

                       <div className="space-y-2.5">
                        {room.items.map((item, iIdx) => (
                          <div
                            key={iIdx}
                            className="p-3 bg-white border border-[#E5DFD3] rounded-lg space-y-2 text-xs"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              <input
                                type="text"
                                aria-label="Item name"
                                value={item.name || ''}
                                onChange={(e) => {
                                  const next = structuredClone(workingDraft);
                                  next.rooms[rIdx].items[iIdx].name = e.target.value;
                                  syncDraft(next);
                                }}
                                placeholder="Unit Title (e.g. Wardrobe Frame and Shutter)"
                                className="sm:col-span-3 px-2.5 py-1.5 border border-[#D8D0C2] rounded-md text-xs font-bold text-[#18221D]"
                              />
                              <input
                                type="text"
                                list="ume-worktypes-datalist"
                                aria-label="Work type"
                                value={item.work_type || ''}
                                placeholder="Select or type work type..."
                                onChange={(e) => {
                                  const next = structuredClone(workingDraft);
                                  next.rooms[rIdx].items[iIdx].work_type = e.target.value;
                                  syncDraft(next);
                                }}
                                className="sm:col-span-3 px-2.5 py-1.5 border border-[#D8D0C2] rounded-md text-xs"
                              />
                              <input
                                type="text"
                                aria-label="Size text"
                                value={item.size_text || ''}
                                onChange={(e) => {
                                  const next = structuredClone(workingDraft);
                                  next.rooms[rIdx].items[iIdx].size_text = e.target.value;
                                  syncDraft(next);
                                }}
                                placeholder="Dimensions (e.g. 9.9 ft × 7.0 ft)"
                                className="sm:col-span-2 px-2.5 py-1.5 border border-[#D8D0C2] rounded-md text-xs font-mono tabular-nums"
                              />
                              <input
                                type="number"
                                step="0.01"
                                aria-label="Per item measure"
                                value={item.measure.per_item ?? ''}
                                onChange={(e) => {
                                  const next = structuredClone(workingDraft);
                                  next.rooms[rIdx].items[iIdx].measure.per_item =
                                    Number(e.target.value) || null;
                                  syncDraft(next);
                                }}
                                placeholder="sq.ft"
                                className="sm:col-span-2 px-2.5 py-1.5 border border-[#D8D0C2] rounded-md text-xs font-mono tabular-nums text-right"
                              />
                              <input
                                type="number"
                                min={1}
                                aria-label="Quantity"
                                value={item.quantity ?? 1}
                                onChange={(e) => {
                                  const next = structuredClone(workingDraft);
                                  next.rooms[rIdx].items[iIdx].quantity =
                                    Number(e.target.value) || 1;
                                  syncDraft(next);
                                }}
                                className="sm:col-span-1 px-1.5 py-1.5 border border-[#D8D0C2] rounded-md text-xs font-mono tabular-nums text-right"
                              />
                              <button
                                type="button"
                                aria-label={`Delete ${item.name}`}
                                onClick={() => {
                                  const next = structuredClone(workingDraft);
                                  next.rooms[rIdx].items.splice(iIdx, 1);
                                  syncDraft(next);
                                }}
                                className="sm:col-span-1 text-[#B91C1C] hover:text-[#7F1D1D] inline-flex justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Editable Sub-Line Description & Depth Specification */}
                            <div>
                              <input
                                type="text"
                                aria-label={`Description for ${item.name}`}
                                value={item.source_text_en || ''}
                                onChange={(e) => {
                                  const next = structuredClone(workingDraft);
                                  next.rooms[rIdx].items[iIdx].source_text_en = e.target.value;
                                  syncDraft(next);
                                }}
                                placeholder='Sub-line specification & carcass depth (e.g., 21" carcass depth · With 0.8mm inside laminate and outside laminate finish)'
                                className="w-full px-2.5 py-1.5 bg-[#FAF8F4] border border-[#E5DFD3] rounded-md text-[11px] text-[#4A544E]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live 3-Tier Price Preview & Publish Bar */}
                <div className="pt-4 border-t border-[#EAE4D8] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {ALL_GRADES.map((g) => {
                      const isDefaultSent = (workingDraft.recommended?.grade || 'Base') === g;
                      return (
                        <div
                          key={g}
                          className={`p-3 rounded-xl border ${
                            isDefaultSent
                              ? 'bg-[#E4EFE7] border-[#1C3A2F]'
                              : 'bg-[#FAF8F4] border-[#E5DFD3]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-[#18221D]">{getPackageDisplayName(g)} Package</p>
                            {isDefaultSent && (
                              <span className="px-1.5 py-0.5 bg-[#1C3A2F] text-[#E6CBA8] rounded text-[9px] font-bold uppercase">
                                Default Sent
                              </span>
                            )}
                          </div>
                          <p className="font-mono tabular-nums text-[#1C3A2F] font-bold text-sm mt-1">
                            {formatINR(previewSnapshot.baseWholeHomeTotals[makeComboKey(g, 'Standard', 'SF')])}
                          </p>
                          <p className="text-[11px] font-mono tabular-nums text-[#5C645F] mt-0.5">
                            +PVC: {formatINR(previewSnapshot.baseWholeHomeTotals[makeComboKey(g, 'With PVC', 'SF')])}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <select
                      aria-label="Revision mode"
                      value={supersedeId}
                      onChange={(e) => setSupersedeId(e.target.value)}
                      className="px-3.5 py-2.5 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    >
                      <option value="">Publish as New Private Customer Link</option>
                      {quotes.map((q) => (
                        <option key={q.publicId} value={q.publicId}>
                          Issue New Revision for {q.draft.quote.number} ({q.draft.customer.name} · Rev {q.revision})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handlePublishClick}
                      className="py-3 px-6 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Save Rate Card & Publish Private Quotation Link
                    </button>
                  </div>

                  {publishResult && (
                    <div
                      className={`p-4 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                        publishResult.ok
                          ? 'bg-[#E4EFE7] border-[#15803D] text-[#1C3A2F]'
                          : 'bg-[#FEF2F2] border-[#B91C1C] text-[#991B1B]'
                      }`}
                    >
                      <span className="font-medium">{publishResult.message}</span>
                      {publishResult.publicId && (
                        <button
                          type="button"
                          onClick={() => onOpenCustomerQuote(publishResult.publicId!)}
                          className="px-3.5 py-1.5 bg-[#1C3A2F] text-[#E6CBA8] rounded-lg font-bold cursor-pointer"
                        >
                          Open Customer Quote →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER QUOTES, DEFAULT SENDING PACKAGE & SAVED SELECTIONS */}
        {activeTab === 'quotes' && (
          <div className="bg-white border border-[#E5DFD3] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D8] pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#5C645F] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                    placeholder="Search customer, site, or quote no..."
                    className="pl-9 pr-3 py-2 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl w-64"
                  />
                </div>
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Sent">Sent</option>
                  <option value="Viewed">Viewed</option>
                  <option value="Package chosen">Package chosen</option>
                  <option value="Booking submitted">Booking submitted</option>
                  <option value="Booking paid">Booking paid</option>
                  <option value="Advance paid">Advance paid</option>
                </select>
              </div>

              <button
                type="button"
                onClick={exportQuotesCsv}
                className="px-4 py-2 bg-[#1C3A2F] text-[#E6CBA8] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV Backup
              </button>
            </div>

            <div className="space-y-4">
              {filteredQuotes.map((q) => {
                const defaultSent = q.defaultSentPackage || {
                  grade: q.draft.recommended?.grade || 'Base',
                  protection: q.draft.recommended?.protection || 'Standard',
                  finish: q.draft.recommended?.finish || 'SF',
                  brand_preference: q.draft.recommended?.brand_preference || null,
                };
                const sel = q.lastCustomerSelection.wholeHomeSelection;
                const isSavedByCustomer = Boolean(q.lastCustomerSelection.savedByCustomer);
                const savedTotal =
                  q.lastCustomerSelection.savedFinalTotalRupees ||
                  q.snapshot.baseWholeHomeTotals[
                    makeComboKey(sel.grade, sel.protection, sel.finish)
                  ] ||
                  0;
                const defaultSentTotal =
                  q.snapshot.baseWholeHomeTotals[
                    makeComboKey(defaultSent.grade, defaultSent.protection, defaultSent.finish)
                  ] || 0;
                const customerLink = `${window.location.origin}/q/${q.publicId}`;
                const isExpanded = expandedQuoteDetailsId === q.publicId;

                return (
                  <div
                    key={q.publicId}
                    className="border border-[#E5DFD3] rounded-xl overflow-hidden bg-[#FAF8F4]"
                  >
                    <div className="p-4 sm:p-5 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Customer & Quote Identity */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#18221D]">
                            {q.draft.quote.number} · Rev {q.revision}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                              isSavedByCustomer
                                ? 'bg-[#E4EFE7] text-[#15803D] border border-[#15803D]/30'
                                : 'bg-[#FAF8F4] text-[#4A524D] border border-[#E5DFD3]'
                            }`}
                          >
                            {isSavedByCustomer ? 'Customer Locked Final Package ✓' : q.status}
                          </span>
                        </div>
                        <p className="text-base font-bold text-[#18221D]">
                          {q.draft.customer.name}{' '}
                          {q.draft.customer.phone && (
                            <span className="text-xs font-mono font-normal text-[#5C645F]">
                              (+91 {q.draft.customer.phone})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#5C645F]">{q.draft.customer.site}</p>
                      </div>

                      {/* Middle: Default Sent Option vs Customer Saved Selection & Final Price */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[440px]">
                        <div className="p-3 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F]">
                              Default Sent Option
                            </span>
                            <span className="text-xs font-mono font-bold text-[#18221D]">
                              {savedDefaultToastId === q.publicId ? (
                                <span className="text-[#15803D] font-sans font-bold">Saved ✓</span>
                              ) : (
                                formatINR(defaultSentTotal)
                              )}
                            </span>
                          </div>
                          <select
                            aria-label={`Default sent package for ${q.draft.customer.name}`}
                            value={`${defaultSent.grade}__${defaultSent.protection}`}
                            onChange={async (e) => {
                              const [g, p] = e.target.value.split('__') as [
                                PlywoodGrade,
                                ProtectionOption
                              ];
                              await onUpdateDefaultPackage?.(q.publicId, {
                                grade: g,
                                protection: p,
                                finish: 'SF',
                                brand_preference: defaultSent.brand_preference || null,
                              });
                              setSavedDefaultToastId(q.publicId);
                              setTimeout(() => setSavedDefaultToastId(null), 2000);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-[#D8D0C2] rounded-lg text-xs font-bold text-[#18221D]"
                          >
                            {ALL_GRADES.map((g) =>
                              ALL_PROTECTIONS.map((p) => (
                                <option key={`${g}__${p}`} value={`${g}__${p}`}>
                                  Send as: {getPackageDisplayName(g)}
                                  {p === 'With PVC' ? ' + 6mm PVC' : ''} (
                                  {formatINR(
                                    q.snapshot.baseWholeHomeTotals[makeComboKey(g, p, 'SF')]
                                  )}
                                  )
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <div
                          className={`p-3 rounded-xl border space-y-1 ${
                            isSavedByCustomer
                              ? 'bg-[#E4EFE7] border-[#1C3A2F]'
                              : 'bg-[#FAF8F4] border-[#E5DFD3]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isSavedByCustomer ? 'text-[#1C3A2F]' : 'text-[#5C645F]'
                              }`}
                            >
                              {isSavedByCustomer
                                ? 'Customer Saved Selection'
                                : 'Active Selection & Price'}
                            </span>
                            <span className="text-sm font-mono font-bold text-[#18221D]">
                              {formatINR(savedTotal)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#18221D] truncate">
                            {q.lastCustomerSelection.summaryLabel ||
                              (q.lastCustomerSelection.mixByRoom
                                ? 'Custom Room-Wise Mix'
                                : `${getPackageDisplayName(sel.grade)} · ${sel.protection}`)}
                          </p>
                          <p className="text-[10px] text-[#5C645F] font-mono">
                            {q.lastCustomerSelection.savedAt
                              ? `Saved ${new Date(q.lastCustomerSelection.savedAt).toLocaleString()}`
                              : 'Default sent active'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const draftCopy = structuredClone(q.draft);
                            if (q.defaultSentPackage) {
                              draftCopy.recommended = {
                                grade: q.defaultSentPackage.grade,
                                protection: q.defaultSentPackage.protection,
                                finish: 'SF',
                                brand_preference: q.defaultSentPackage.brand_preference,
                              };
                            }
                            setSupersedeId(q.publicId);
                            setApprovedDiscount(q.approvedDiscountRupees || 0);
                            syncDraft(draftCopy);
                            setActiveTab('unified_studio');
                          }}
                          className="px-3 py-2 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Edit Lines in Studio
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(customerLink);
                            setCopiedShareId(q.publicId);
                            setTimeout(() => setCopiedShareId(null), 1800);
                          }}
                          className="px-3 py-2 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold cursor-pointer"
                        >
                          {copiedShareId === q.publicId ? 'Copied Link ✓' : 'Copy Customer Link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenCustomerQuote(q.publicId)}
                          className="px-3.5 py-2 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Open Quote
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuoteDetailsId(isExpanded ? null : q.publicId)
                          }
                          className="px-3 py-2 bg-[#FAF8F4] border border-[#D8D0C2] text-[#18221D] rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          {isExpanded ? 'Hide Activity' : 'History & Links'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-[#EAE4D8] bg-[#FAF8F4] space-y-4 text-xs">
                        <div className="space-y-1.5">
                          <p className="font-bold text-[#18221D]">
                            Share Link with Specific Starting Package (Base / Normal / Premium):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(['Base', 'Normal', 'Premium'] as PlywoodGrade[]).map((g) => {
                              const pkgUrl = `${customerLink}?pkg=${g}-Standard-SF`;
                              const copyKey = `${q.publicId}-${g}`;
                              return (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(pkgUrl);
                                    setCopiedShareId(copyKey);
                                    setTimeout(() => setCopiedShareId(null), 1800);
                                  }}
                                  className="px-3 py-1.5 bg-white hover:bg-[#E4EFE7] border border-[#D8D0C2] rounded-lg font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3 text-[#2B5B48]" />
                                  {copiedShareId === copyKey
                                    ? `Copied ${g} Link ✓`
                                    : `Copy Link with ${g} Default (${formatINR(
                                        q.snapshot.baseWholeHomeTotals[
                                          makeComboKey(g, 'Standard', 'SF')
                                        ]
                                      )})`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#EAE4D8]">
                          <div className="space-y-2">
                            <p className="font-bold text-[#18221D] inline-flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-[#2B5B48]" />
                              Customer Package Selection History ({q.selectionHistory?.length || 0})
                            </p>
                            {!q.selectionHistory || q.selectionHistory.length === 0 ? (
                              <p className="text-[#5C645F]">
                                Customer has not clicked “Final Save & Lock My Package” yet.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {q.selectionHistory.map((h) => (
                                  <div
                                    key={h.id}
                                    className="p-2.5 bg-white border border-[#E5DFD3] rounded-lg flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <p className="font-bold text-[#18221D]">{h.summaryLabel}</p>
                                      <p className="text-[10px] text-[#5C645F] font-mono">
                                        {new Date(h.savedAt).toLocaleString()}
                                      </p>
                                    </div>
                                    <span className="font-mono font-bold text-[#15803D]">
                                      {formatINR(h.finalTotalRupees)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="font-bold text-[#18221D] inline-flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-[#2B5B48]" />
                              Customer Change & Feedback Notes ({q.customerFeedback?.length || 0})
                            </p>
                            {!q.customerFeedback || q.customerFeedback.length === 0 ? (
                              <p className="text-[#5C645F]">
                                No change requests submitted by customer yet.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {q.customerFeedback.map((fb) => (
                                  <div
                                    key={fb.id}
                                    className="p-2.5 bg-white border border-[#E5DFD3] rounded-lg space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[#2B5B48]">{fb.topic}</span>
                                      <span className="text-[10px] font-mono text-[#5C645F]">
                                        {new Date(fb.submittedAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-[#18221D]">{fb.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MASTER GEMINI GEM / CUSTOM GPT INSTRUCTIONS (DYNAMIC MEMORY) + AI IMAGE PROMPTS */}
        {activeTab === 'gem_instructions' && (
          <div className="space-y-6">
            {/* Master Conversational Gemini Gem / Custom GPT Instructions */}
            <div className="bg-white border border-[#E5DFD3] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D8] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2B5B48]">
                    SINGLE-MODEL CONVERSATIONAL GEMINI GEM / CHATGPT CUSTOM GPT PROMPT
                  </span>
                  <h2 className="text-lg font-bold text-[#18221D] mt-0.5">
                    Copy & Paste into Your Single Gemini Gem or Custom GPT Instructions
                  </h2>
                  <p className="text-xs text-[#5C645F] mt-1">
                    Automatically includes all <strong>{Object.keys(editableCatalogue.workTypes).length} active work types</strong> from your Rate Card Memory and instructs your Gem to ask step-by-step for Customer Name, Location/Google Maps Address, Room Scope, and Custom Box/Item Prices before outputting ONE unified JSON!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(dynamicGemInstructions);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }}
                  className="px-5 py-2.5 bg-[#2B5B48] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Copy className="w-4 h-4" />
                  {copiedPrompt
                    ? 'Copied Master Gem Instructions ✓'
                    : 'Copy Master Gem Instructions'}
                </button>
              </div>

              <pre className="p-4 bg-[#18221D] text-[#FAF8F4] rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                {dynamicGemInstructions}
              </pre>
            </div>

            {/* Luxury AI Image Prompts Library */}
            <div className="bg-white border border-[#E5DFD3] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-[#EAE4D8] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2B5B48]">
                  LUXURY INTERIOR AI IMAGE GENERATION PROMPTS
                </span>
                <h3 className="text-lg font-bold text-[#18221D] mt-0.5">
                  Copy-Ready Prompts for Every Quotation Image Slot (Hero, Packages & Rooms)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {LUXURY_IMAGE_PROMPTS.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl flex flex-col justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.defaultImageUrl}
                        alt={item.slotName}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            '/assets/aistudio/image_b8a06adb.png';
                        }}
                        className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[#D8D0C2]"
                      />
                      <div>
                        <p className="font-bold text-[#18221D]">{item.slotName}</p>
                        <p className="text-[11px] text-[#5C645F]">{item.whereUsed}</p>
                      </div>
                    </div>

                    <p className="p-2.5 bg-white border border-[#E5DFD3] rounded-lg font-mono text-[11px] text-[#2B352F] leading-relaxed">
                      {item.prompt}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(item.prompt);
                        setCopiedImagePromptId(item.id);
                        setTimeout(() => setCopiedImagePromptId(null), 1800);
                      }}
                      className="w-full py-2 px-3 bg-[#2B5B48] text-[#E6CBA8] rounded-lg font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedImagePromptId === item.id ? 'Copied Prompt ✓' : 'Copy Prompt'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BANK VERIFICATION LEDGER */}
        {activeTab === 'ledger' && (
          <div className="bg-white border border-[#E5DFD3] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-[#EAE4D8] pb-4">
              <h2 className="text-lg font-bold text-[#18221D]">
                Private Bank Verification Ledger (SBI Chengicherla Acc: 35976768268)
              </h2>
              <p className="text-xs text-[#5C645F]">
                Customer UTR submissions start as “Payment submitted”. Only after you verify against your State Bank of India statement is the ₹50,000 booking credited toward the 50% advance.
              </p>
            </div>

            <div className="overflow-x-auto border border-[#E5DFD3] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#2B5B48] text-white">
                    <th className="py-3 px-4 font-semibold">Submitted At</th>
                    <th className="py-3 px-3 font-semibold">Customer & Quote</th>
                    <th className="py-3 px-3 font-semibold">Package</th>
                    <th className="py-3 px-3 font-semibold">Method & UTR Reference</th>
                    <th className="py-3 px-3 text-right font-semibold">Amount</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Owner Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D8]">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#FAF8F4]">
                      <td className="py-3.5 px-4 font-mono tabular-nums text-[11px] text-[#5C645F]">
                        {new Date(entry.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-[#18221D]">{entry.customerName}</p>
                        <p className="font-mono tabular-nums text-[11px] text-[#5C645F]">
                          {entry.quoteNumber} · Rev {entry.revision}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-[#18221D]">{entry.selectedPackageLabel}</td>
                      <td className="py-3.5 px-3 font-mono tabular-nums">
                        <p className="font-bold text-[#18221D]">UTR: {entry.utrReference}</p>
                        <p className="text-[11px] text-[#5C645F]">{entry.method}</p>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold font-mono tabular-nums text-[#18221D]">
                        {formatINR(entry.amountRupees)}
                      </td>
                      <td className="py-3.5 px-3 font-bold">
                        <span
                          className={
                            entry.status === 'Verified Paid'
                              ? 'text-[#15803D]'
                              : entry.status === 'Rejected'
                              ? 'text-[#B91C1C]'
                              : 'text-[#B45309]'
                          }
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        {entry.status === 'Payment submitted' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onVerifyOrRejectPayment(entry.id, 'verify')}
                              className="px-3 py-1.5 bg-[#15803D] text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Verify & Credit ₹50k
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onVerifyOrRejectPayment(
                                  entry.id,
                                  'reject',
                                  'UTR not found in SBI statement'
                                )
                              }
                              className="px-2.5 py-1.5 bg-[#FEE2E2] text-[#991B1B] rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-mono tabular-nums text-[#5C645F]">
                            {entry.verifiedAt
                              ? `Verified ${new Date(entry.verifiedAt).toLocaleDateString()}`
                              : entry.rejectionReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
