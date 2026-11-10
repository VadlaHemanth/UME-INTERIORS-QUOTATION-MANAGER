import { parseStudioJson } from '../lib/studio-json';
import { applyStandardPvcScopes } from '../lib/pvc-scope';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { syncCatalogueDraft } from '../lib/company-settings';
import './pdf-owner.css';
import './addon-suggestions.css';
import { acceptAddonSuggestion, rejectAddonSuggestion, getAddonSuggestions, validateAddonSuggestions } from '../lib/addon-suggestions';
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
  VIDYA_SAGAR_REDDY_DRAFT,
} from '../lib/historicalData';
import {
  ALL_FINISHES,
  ALL_GRADES,
  ALL_PROTECTIONS,
  calculateQuotationPricing,
  calculateMilestoneSchedule,
  computeCustomerSelectionTotal,
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
  quotationDraftShapeIssue,
} from '../lib/schema';
import { getQuotationBasisLabel, getQuotationEstimateNote, isFloorPlanEstimate } from '../lib/quotation-notes';
import { indiaDate, nextQuoteNumber, quoteExpiry, seriesIds, type FinalizedWorkOrder } from '../lib/quote-workflow';
import { CustomerQuotationView } from './CustomerQuotationView';
import { packageAllowances } from '../lib/commercial-spec';
import { prepareQuotationDraft, reviewedQuotationNotes } from '../lib/quotation-presentation';
import { RoomScopeEditor } from './RoomScopeEditor';
import { RateCardEditor } from './RateCardEditor';
import { workOrderPreview } from '../lib/work-order-document';
import { beginQuotationEdit,completeQuoteDates,expiryFromIssue,validityBetween,validIsoDate } from '../lib/quotation-dates';
import { normalizeFurnitureLayout } from '../lib/furniture-layout';
import { QuotationDateField } from './QuotationDateField';

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
  workOrder?: FinalizedWorkOrder;
  catalogueSnapshot?: StudioCatalogue;
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
  onDeleteQuote: (publicId: string) => Promise<void>;
  onSaveOwnerDraft: (draft: QuotationDraftV2, publicId?: string, discount?: number) => Promise<PublishedQuoteSummary>;
  catalogue: StudioCatalogue;
  quotes: PublishedQuoteSummary[];
  ledger: LedgerEntrySummary[];
  onOpenCustomerQuote: (publicId: string) => void;
  onPublishDraft: (payload: {
    draft: QuotationDraftV2;
    reviewedOwnerRequests: boolean;
    supersedePublicId?: string;
    expectedRevision?: number;
    approvedDiscountRupees: number;
    defaultSentPackage?: ResolvedPackageSelection;
    confirmWorkOrderSelection?: boolean;
  }) => Promise<{ ok: boolean; shareUrl?: string; publicId?: string; record?: PublishedQuoteSummary; error?: string }>;
  onUpdateDefaultPackage?: (
    publicId: string,
    defaultSentPackage: ResolvedPackageSelection
  ) => Promise<void>;
  onUpdateCatalogue: (nextCatalogue: StudioCatalogue) => Promise<void>;
  onVerifyOrRejectPayment: (
    paymentId: string,
    action: 'verify' | 'reject',
    rejectionReason?: string
  ) => Promise<void>;
  onRecordVerifiedPayment: (publicId: string, amountRupees: number, reference: string) => Promise<void>;
  onCreateWorkOrder:(publicId:string)=>Promise<void>;
}

function createEmptyOwnerDraft(quotes: PublishedQuoteSummary[] = []): QuotationDraftV2 {
  return {
    schema_version: 'quotation-studio.draft.v2', output_language: 'en', is_demo: false,
    languages: ['en'], customer: { name: null, site: null, phone: null },
    quote: { number: nextQuoteNumber(quotes), date: indiaDate(), valid_until: quoteExpiry(),validity_days:30, show_recommended_package: false, notes: [] },
    recommended: { grade: 'Base', protection: 'Standard', finish: 'SF', brand_preference: null },
    rooms: [{ name: 'Master Bedroom', recommended: null, items: [] }],
    owner_requests: [], needs_clarification: [],
  };
}

function getOwnerRequestPresentation(path: string) {
  const normalizedPath = path.toLowerCase();
  if (normalizedPath.includes('payment')) {
    return {
      badge: 'PAYMENT',
      title: 'Payment schedule',
      summary: 'Confirm the payment milestones customers will see before work begins and at each completion stage.',
    };
  }
  if (normalizedPath.includes('bank') || normalizedPath.includes('upi')) {
    return {
      badge: 'BANK',
      title: 'Bank and payment details',
      summary: 'Confirm these receiving-account details are correct before customers use them to make a payment.',
    };
  }
  if (normalizedPath.includes('term') || normalizedPath.includes('note') || normalizedPath.includes('condition')) {
    return {
      badge: 'TERMS',
      title: 'Extra-work and site terms',
      summary: 'Confirm these conditions and charges are approved for this quotation before they are shown to the customer.',
    };
  }
  return {
    badge: 'REVIEW',
    title: 'Special quotation note',
    summary: 'Confirm this requested detail is correct before it is included in the quotation.',
  };
}

export const OwnerStudioView: React.FC<OwnerStudioViewProps> = ({
  catalogue,
  quotes,
  ledger,
  onOpenCustomerQuote,
  onPublishDraft,
  onSaveOwnerDraft,
  onUpdateDefaultPackage,
  onUpdateCatalogue,
  onVerifyOrRejectPayment,
  onRecordVerifiedPayment,
  onCreateWorkOrder,
  onDeleteQuote,
}) => {
  const [activeTab, setActiveTab] = useState<
    'unified_studio' | 'quotes' | 'gem_instructions' | 'ledger'
  >('unified_studio');
  const [savedDefaultToastId, setSavedDefaultToastId] = useState<string | null>(null);

  // Unified Quotation + Rate Card Studio State
  const [workingDraft, setWorkingDraft] = useState<QuotationDraftV2>(() => createEmptyOwnerDraft(quotes));
  const [pendingJson, setPendingJson] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ok:boolean;message:string} | null>(null);
  const [loadingJson, setLoadingJson] = useState(false);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [draftDirty, setDraftDirty] = useState(false);
  const rawJsonText = useMemo(() => pendingJson ?? JSON.stringify(workingDraft,null,2), [pendingJson,workingDraft]);
  const [editableCatalogue, setEditableCatalogue] = useState<StudioCatalogue>(() =>
    structuredClone(catalogue)
  );
  const [reviewedOwnerRequests, setReviewedOwnerRequests] = useState<boolean>(false);
  const [approvedDiscount, setApprovedDiscount] = useState<number>(0);
  const [supersedeId, setSupersedeId] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    ok: boolean;
    message: string;
    publicId?: string;
    shareUrl?: string;
  } | null>(null);

  // Inline Quick-Add Work Element Form inside the Unified Studio
  const [showFullRateCardTable, setShowFullRateCardTable] = useState<boolean>(true);
  const [newWorkLabel, setNewWorkLabel] = useState<string>('');
  const [newWorkUnit, setNewWorkUnit] = useState<'sq_ft' | 'running_ft' | 'each' | 'lumpsum'>(
    'sq_ft'
  );
  const [newWorkBase, setNewWorkBase] = useState('');
  const [newWorkNormal, setNewWorkNormal] = useState('');
  const [newWorkPremium, setNewWorkPremium] = useState('');
  const [newWorkPvcAdder, setNewWorkPvcAdder] = useState('0');
  const [savingNewWork,setSavingNewWork]=useState(false);
  const [newWorkDescription, setNewWorkDescription] = useState<string>('');

  // Tab 2: Quotes CMS search & filter
  const [quoteSearch, setQuoteSearch] = useState<string>('');
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [deleteQuoteError, setDeleteQuoteError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [expandedQuoteDetailsId, setExpandedQuoteDetailsId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quotePage, setQuotePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewMode, setPreviewMode] = useState<'online' | 'pdf' | null>(null);
  const editorScrollBeforePreview=useRef(0);
  const openPreview=(mode:'online'|'pdf')=>{
    if (previewMode===null) editorScrollBeforePreview.current=window.scrollY;
    setPreviewMode(mode);requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  };
  const closePreview=()=>{setPreviewMode(null);requestAnimationFrame(()=>window.scrollTo({top:editorScrollBeforePreview.current,left:0,behavior:'instant'}));};
  const [savingRates, setSavingRates] = useState(false);
  const [rateFeedback,setRateFeedback]=useState<{ok:boolean;message:string}|null>(null);
  const [paymentQuote, setPaymentQuote] = useState('');
  const [verifiedAmount, setVerifiedAmount] = useState(50000);
  const [verifiedReference, setVerifiedReference] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [creatingWorkOrder,setCreatingWorkOrder]=useState(false);
  const [workOrderFeedback,setWorkOrderFeedback]=useState<{ok:boolean;message:string}|null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const editorBusy = loadingJson || isPublishing || savingDraft || savingRates || savingNewWork;
  const [updateWorkOrderSelection,setUpdateWorkOrderSelection] = useState(false);
  const currentQuotes = useMemo(() => quotes.filter(q => !q.supersededByPublicId || !quotes.some(next => next.publicId === q.supersededByPublicId)).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)), [quotes]);
  const paymentRecord=currentQuotes.find(quote=>quote.publicId===paymentQuote&&quote.status!=='Draft');
  const verifiedForQuote=(publicId:string)=>{const ids=seriesIds(quotes,publicId);return ledger.filter(entry=>ids.has(entry.publicId)&&entry.status==='Verified Paid').reduce((sum,entry)=>sum+entry.amountRupees,0);};
  const paymentTotal=paymentRecord?computeCustomerSelectionTotal(paymentRecord.snapshot,{...paymentRecord.lastCustomerSelection,approvedDiscountRupees:paymentRecord.approvedDiscountRupees}).grandTotal:0;
  const paymentVerified=paymentRecord?verifiedForQuote(paymentRecord.publicId):0;
  const paymentBooking=calculateMilestoneSchedule(paymentTotal).bookingRequired;
  const bookingRemaining=Math.max(0,paymentBooking-paymentVerified);
  const choosePaymentQuote=(publicId:string)=>{const record=currentQuotes.find(quote=>quote.publicId===publicId);setPaymentQuote(publicId);setWorkOrderFeedback(null);setVerifiedReference('');if(record){const total=computeCustomerSelectionTotal(record.snapshot,{...record.lastCustomerSelection,approvedDiscountRupees:record.approvedDiscountRupees}).grandTotal;setVerifiedAmount(Math.max(0,calculateMilestoneSchedule(total).bookingRequired-verifiedForQuote(publicId)));}};
  const openWorkOrderSetup=(publicId:string)=>{choosePaymentQuote(publicId);setActiveTab('ledger');};
  useEffect(()=>{if(activeTab==='ledger'&&paymentQuote)requestAnimationFrame(()=>document.getElementById('work-order-setup')?.scrollIntoView({block:'start',behavior:'instant'}));},[activeTab,paymentQuote]);

  // Tab 3: Master Gem Instructions & Image Prompts
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [assistantMemoryFeedback,setAssistantMemoryFeedback]=useState('');
  const [savingAssistantMemory,setSavingAssistantMemory]=useState(false);
  const [copiedImagePromptId, setCopiedImagePromptId] = useState<string | null>(null);

  const previousCatalogue = useRef(catalogue);
  useEffect(() => {
    const previous = previousCatalogue.current;
    previousCatalogue.current = catalogue;
    setEditableCatalogue(local => syncCatalogueDraft(previous, catalogue, local));
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

  const addonSuggestions = useMemo(() => getAddonSuggestions(workingDraft), [workingDraft]);
  const validation = useMemo(
    () => validateQuotationDraftV2(workingDraft, { reviewedOwnerRequests }),
    [workingDraft, reviewedOwnerRequests]
  );
  const ordinaryValidationIssues = useMemo(
    () => validation.issues.filter((issue) => issue.code !== 'UNREVIEWED_OWNER_REQUEST'),
    [validation]
  );
  const pendingOwnerReviewCount = reviewedOwnerRequests ? 0 : workingDraft.owner_requests.length;
  const publishGateCount = ordinaryValidationIssues.length + pendingOwnerReviewCount;

  const previewDraft = useMemo(()=>{
    const draft=prepareQuotationDraft(workingDraft,editableCatalogue);
    draft.quote.notes=reviewedQuotationNotes(draft,reviewedOwnerRequests);
    draft.quote=completeQuoteDates(draft.quote,indiaDate());
    return draft;
  },[workingDraft,editableCatalogue,reviewedOwnerRequests]);
  const previewSnapshot=useMemo(()=>calculateQuotationPricing(previewDraft,editableCatalogue),[previewDraft,editableCatalogue]);
  const editingRecord=quotes.find(quote=>quote.publicId===supersedeId);
  const previewDefaultPackage:ResolvedPackageSelection={grade:previewDraft.recommended?.grade||'Base',protection:previewDraft.recommended?.protection||'Standard',finish:previewDraft.recommended?.finish||'SF',brand_preference:previewDraft.recommended?.brand_preference||null};
  const previewWorkOrder=editingRecord?.workOrder?workOrderPreview(editingRecord.draft,previewDraft,editingRecord.workOrder,previewSnapshot,approvedDiscount,updateWorkOrderSelection?previewDefaultPackage:undefined):undefined;
  const previewVerifiedPaid=editingRecord?.workOrder?verifiedForQuote(editingRecord.publicId):0;

  const syncDraft = (next: QuotationDraftV2, dirty = true) => {
    setWorkingDraft(next);
    setDraftDirty(dirty);
    setPublishResult(null);
  };

  const loadEditorDraft = (next: QuotationDraftV2, dirty = false) => {
    setPendingJson(null);
    setImportFeedback(null);
    setEditorGeneration(generation => generation + 1);
    syncDraft(applyStandardPvcScopes(next,editableCatalogue),dirty);
  };

  /**
   * Unified JSON Loader: Accepts EITHER a Quotation JSON (with optional rate_card_updates / custom_rates / new work_types)
   * OR a Rate Card JSON, and automatically updates both the Rate Card Catalogue and the Quotation Editor in ONE click!
   */
  const processUnifiedJsonText = async (readText: () => Promise<string>, sourceLabel = 'JSON') => {
    if (editorBusy) return;
    setLoadingJson(true);
    setImportFeedback(null);
    try {
      const jsonString = await readText();
      setPendingJson(jsonString);
      const value = parseStudioJson(jsonString);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Paste one quotation or rate card JSON object.');
      const parsed = value as Record<string, any>;

      // Case A: Pure Rate Card JSON (`quotation-studio.ratecard.v2` without `rooms`)
      if (
        (parsed.schema_version === 'quotation-studio.ratecard.v2' || parsed.workTypes) &&
        !Array.isArray(parsed.rooms)
      ) {
        const merged = mergeRateCardJsonIntoCatalogue(editableCatalogue, parsed);
        await onUpdateCatalogue(merged.catalogue);
        setEditableCatalogue(merged.catalogue);
        setPendingJson(null);
        setImportFeedback({
          ok: true,
          message: `Merged ${merged.addedOrUpdatedKeys.length} work element(s) (${merged.addedOrUpdatedKeys.join(', ')}) into your Rate Card Memory!`,
        });
        return;
      }

      if (!Array.isArray(parsed.rooms)) throw new Error('The quotation JSON must include a rooms list.');
      const v2 = (parsed.schema_version === 'quotation-studio.draft.v2' ? parsed : migrateV1ToV2Draft(parsed)) as QuotationDraftV2;
      const shapeIssue = quotationDraftShapeIssue(v2);
      if (shapeIssue) throw new Error(shapeIssue.message);
      const addonValidation = validateAddonSuggestions(v2);
      if (!addonValidation.valid) throw new Error(addonValidation.errors.join(' '));
      const autoRateMerge = extractAndMergeRateCardFromDraft(editableCatalogue, v2);
      if (autoRateMerge.addedOrUpdatedKeys.length > 0||autoRateMerge.assistantMemoryChanged) {
        await onUpdateCatalogue(autoRateMerge.catalogue);
        setEditableCatalogue(autoRateMerge.catalogue);
      }

      delete v2.rate_card_updates;
      const existing = currentQuotes.find(q => q.draft.quote.number && q.draft.quote.number === v2.quote.number);
      setSupersedeId(existing?.publicId || '');
      v2.quote.number ||= nextQuoteNumber(quotes);
      v2.quote = completeQuoteDates(v2.quote,indiaDate());
      v2.recommended = {
        grade:v2.recommended?.grade || 'Base',
        protection:v2.recommended?.protection || 'Standard',
        finish:v2.recommended?.finish || 'SF',
        brand_preference:v2.recommended?.brand_preference || null,
      };
      setReviewedOwnerRequests(false);
      setApprovedDiscount(existing?.approvedDiscountRupees || 0);
      setUpdateWorkOrderSelection(false);
      loadEditorDraft(prepareQuotationDraft(v2,autoRateMerge.catalogue),true);
      setImportFeedback({
        ok: true,
        message:
          autoRateMerge.addedOrUpdatedKeys.length > 0
            ? `${sourceLabel} loaded! Also auto-saved ${autoRateMerge.addedOrUpdatedKeys.length} work type(s) (${autoRateMerge.addedOrUpdatedKeys.join(', ')}) into your Rate Card Memory.`
            : `${sourceLabel} loaded. Review the quotation details below.`,
      });
    } catch (error) {
      setImportFeedback({ok:false,message:'Unable to load JSON. ' + (error instanceof Error ? error.message : 'Copy the complete quotation JSON and try again.')});
    } finally {
      setLoadingJson(false);
    }
  };

  const handlePasteFromClipboard = () => processUnifiedJsonText(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      throw new Error('Paste into the JSON box, then choose Load quotation & rates.');
    }
  }, 'Clipboard JSON');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) void processUnifiedJsonText(() => file.text(), 'File "' + file.name + '"');
  };

  const editorHasChanges = draftDirty || pendingJson !== null;
  const canReplaceEditor = () => !editorHasChanges || window.confirm('Discard unsaved changes to the quotation editor?');

  const loadPracticeDraft = (example: QuotationDraftV2) => {
    if (!canReplaceEditor()) return;
    setSupersedeId('');
    setApprovedDiscount(0);
    setReviewedOwnerRequests(false);
    setUpdateWorkOrderSelection(false);
    loadEditorDraft({...structuredClone(example),is_demo:true});
  };

  const handleStartNewQuotation = () => {
    if (editorBusy || !canReplaceEditor()) return;
    const clean = createEmptyOwnerDraft(quotes);
    setSupersedeId('');
    setApprovedDiscount(0);
    setReviewedOwnerRequests(false);
    setUpdateWorkOrderSelection(false);
    setPreviewMode(null);
    setActiveTab('unified_studio');
    loadEditorDraft(clean);
    window.scrollTo({top:0, behavior:'instant'});
  };

  const handleAutoAddMissingWorkTypesToRateCard = async () => {
    if (editorBusy || unmappedWorkTypes.length === 0) return;
    setSavingNewWork(true);
    setPublishResult(null);
    try {
      const merged = extractAndMergeRateCardFromDraft(editableCatalogue, workingDraft);
      if (!merged.addedOrUpdatedKeys.length) throw new Error('Enter the missing work-type rates in the rate card before saving.');
      await onUpdateCatalogue(merged.catalogue);
      setEditableCatalogue(merged.catalogue);
      setPublishResult({ ok: true, message: `Saved ${merged.addedOrUpdatedKeys.join(', ')} to the rate card.` });
    } catch (error) {
      setPublishResult({ ok: false, message: error instanceof Error ? error.message : 'Unable to save the new work types. Please try again.' });
    } finally {
      setSavingNewWork(false);
    }
  };

  const handleAddCustomWorkElementForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if(editorBusy)return;
    const cleanLabel = newWorkLabel.trim();
    if (!cleanLabel) return;
    if(editableCatalogue.workTypes[cleanLabel]) {setRateFeedback({ok:false,message:'This work type already exists. Edit its rates in the list above.'});return;}
    const amounts=[newWorkBase,newWorkNormal,newWorkPremium,newWorkPvcAdder];
    if(amounts.some(value=>!value.trim()||!Number.isFinite(Number(value))||Number(value)<0)) {setRateFeedback({ok:false,message:'Enter all three confirmed package rates and the PVC extra. Use 0 when no extra applies.'});return;}

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
        `Custom interior work: ${cleanLabel}. Billing unit: ${newWorkUnit}.`,
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
    setPublishResult(null);
    setRateFeedback(null);setSavingNewWork(true);
    try {
      await onUpdateCatalogue(nextCat);
      setEditableCatalogue(nextCat);
      setNewWorkLabel('');
      setNewWorkDescription('');
      setNewWorkBase('');setNewWorkNormal('');setNewWorkPremium('');setNewWorkPvcAdder('0');
      setRateFeedback({ok:true,message:`Saved ${cleanLabel}. Copy the refreshed assistant instructions to use it in future chats.`});
      setPublishResult({ ok: true, message: `Saved "${cleanLabel}" to the rate card. Copy the updated assistant instructions to use it in future chats.` });
    } catch (error) {
      setRateFeedback({ok:false,message:error instanceof Error ? error.message : 'Unable to save this work type. Your form is preserved; please try again.'});
      setPublishResult({ ok: false, message: error instanceof Error ? error.message : 'Unable to save this work type. Your form is preserved; please try again.' });
    } finally {setSavingNewWork(false);}
  };

  const handleSaveDraftClick = async () => {
    if (editorBusy) return;
    if (pendingJson !== null) {
      setPublishResult({ok:false,message:'Load or discard the pasted JSON before saving.'});
      return;
    }
    setSavingDraft(true);
    try {
      const saved = await onSaveOwnerDraft(workingDraft,supersedeId || undefined,approvedDiscount);
      syncDraft(saved.draft,false);
      setSupersedeId(saved.publicId);
      setPublishResult({ok:true,message:'Draft saved. It appears in Quotations and remains private until published.'});
    } catch (error) {
      setPublishResult({ok:false,message:error instanceof Error ? error.message : 'Could not save draft.'});
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishClick = async () => {
    if (editorBusy) return;
    if (pendingJson !== null) {
      setPublishResult({ok:false,message:'Load or discard the pasted JSON before publishing.'});
      return;
    }
    if (!validation.readyForPublish || unmappedWorkTypes.length) {
      setPublishResult({ ok: false, message: 'Resolve the review issues and missing work-type rates before publishing.' });
      return;
    }
    setPublishResult(null);
    setIsPublishing(true);
    try {
    // Ensure any inline rate changes in editableCatalogue are persisted first
    if (JSON.stringify(editableCatalogue) !== JSON.stringify(catalogue)) await onUpdateCatalogue(editableCatalogue);
    const publicationDraft = structuredClone(workingDraft);
    delete publicationDraft.rate_card_updates;

    const defaultPkg: ResolvedPackageSelection = {
      grade: workingDraft.recommended?.grade || 'Base',
      protection: workingDraft.recommended?.protection || 'Standard',
      finish: workingDraft.recommended?.finish || 'SF',
      brand_preference: workingDraft.recommended?.brand_preference || null,
    };
    const res = await onPublishDraft({
      draft: publicationDraft,
      reviewedOwnerRequests,
      supersedePublicId: supersedeId || undefined,
      expectedRevision: editingRecord?.revision,
      approvedDiscountRupees: approvedDiscount,
      defaultSentPackage: defaultPkg,
      confirmWorkOrderSelection:updateWorkOrderSelection,
    });
    if (res.ok) {
      if (res.publicId) setSupersedeId(res.publicId);
      if (res.record) syncDraft(res.record.draft,false);
      setUpdateWorkOrderSelection(false);
      setPublishResult({
        ok: true,
        message: `${supersedeId ? 'Updated quotation published' : 'Quotation published'} · ${getPackageDisplayName(defaultPkg.grade)} package. The customer link opens the latest version.`,
        publicId: res.publicId,
        shareUrl: res.shareUrl,
      });
    } else {
      setPublishResult({
        ok: false,
        message: res.error || 'Publication blocked by validation gate.',
      });
    }
    } catch (error) {
      setPublishResult({ ok: false, message: error instanceof Error ? error.message : 'Unable to publish. Please try again.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePaymentReview = async (paymentId: string, action: 'verify' | 'reject', reason?: string) => {
    setPublishResult(null);
    try {
      await onVerifyOrRejectPayment(paymentId, action, reason);
    } catch (error) {
      setPublishResult({ ok: false, message: error instanceof Error ? error.message : 'Unable to update this payment. Please try again.' });
    }
  };

  const filteredQuotes = useMemo(() => {
    return currentQuotes.filter((q) => {
      const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
      const qStr = `${q.draft.customer.name || ''} ${q.draft.customer.site || ''} ${
        q.draft.quote.number || ''
      }`.toLowerCase();
      const matchesSearch = !quoteSearch.trim() || qStr.includes(quoteSearch.toLowerCase());
      const day = indiaDate(new Date(q.publishedAt));
      return matchesStatus && matchesSearch && (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
    });
  }, [currentQuotes, quoteSearch, statusFilter, dateFrom, dateTo]);
  useEffect(() => setQuotePage(1), [quoteSearch, statusFilter, dateFrom, dateTo, pageSize]);
  const quotePageCount = Math.max(1, Math.ceil(filteredQuotes.length / pageSize));
  const visibleQuotes = filteredQuotes.slice((Math.min(quotePage, quotePageCount) - 1) * pageSize, Math.min(quotePage, quotePageCount) * pageSize);
  const saveRateCard = async () => {
    if(editorBusy)return;
    setSavingRates(true); setPublishResult(null); setRateFeedback(null);
    try {
      const next = structuredClone(workingDraft);
      delete next.rate_card_updates;
      await onUpdateCatalogue(editableCatalogue);
      syncDraft(next,draftDirty);
      setRateFeedback({ok:true,message:'Rate card saved and applied to this draft. Publish an update to change an existing customer quotation.'});
      setPublishResult({ok:true,message:'Rate card saved. This draft now uses the updated rates. Publish an update to apply them to the customer quotation.'});
    } catch(error) { const message=error instanceof Error ? error.message : 'Could not save rates. Your edits are preserved; try again.'; setRateFeedback({ok:false,message}); setPublishResult({ok:false,message}); }
    finally { setSavingRates(false); }
  };

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
    <div className={`min-h-screen bg-[#F4F1EA] text-[#18221D] pb-16 ${previewMode === null ? 'owner-studio no-print' : 'owner-preview-host'}`}>
      <datalist id="ume-worktypes-datalist">
        {Object.keys(editableCatalogue.workTypes).map((wt) => (
          <option key={wt} value={wt} />
        ))}
      </datalist>

      {/* Studio Header & Unified Segmented Navigation */}
      <fieldset disabled={editorBusy} hidden={previewMode !== null} className="min-w-0 bg-white border-b border-[#E5DFD3] no-print">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#18221D] mt-0.5">
                Quotation studio
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="px-4 py-2 rounded-xl text-xs border border-[#D8D0C2]" onClick={()=>{setPreviewMode(null);setActiveTab('unified_studio');requestAnimationFrame(()=>{const importer=document.querySelector<HTMLDetailsElement>('.owner-import');if(importer){importer.open=true;importer.scrollIntoView({block:'start',behavior:'smooth'});}});}}>Import JSON</button>
              <button
                type="button"
                onClick={handleStartNewQuotation}
                className="px-4 py-2 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4 text-[#1C3A2F]" />
                New quotation
              </button>
            </div>
          </div>

          {/* 4-Tab Unified Segmented Bar */}
          <div className="owner-tabs flex flex-wrap items-center gap-1.5 p-1.5 bg-[#EAE3D5] border border-[#DDD4C3] rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('unified_studio')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'unified_studio'
                  ? 'bg-[#1C3A2F] text-white shadow-2xs'
                  : 'text-[#4A524D] hover:text-[#18221D]'
              }`}
            >
              Create quotation
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
              Quotations ({currentQuotes.length})
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
              Payments & work orders
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
              Assistant instructions
            </button>
          </div>
        </div>
      </fieldset>

      {previewMode && <section className="owner-preview">
        <div className="owner-preview-toolbar no-print"><div><strong>Unpublished preview</strong><p>Check the customer experience before publishing. Changes here are temporary.</p></div><div><button type="button" onClick={() => openPreview('online')} aria-pressed={previewMode === 'online'}>Online</button><button type="button" onClick={() => openPreview('pdf')} aria-pressed={previewMode === 'pdf'}>PDF</button><button type="button" onClick={closePreview}>Back to editor</button></div></div>
        <CustomerQuotationView key={previewMode} publicId="preview" revision={1} status="Draft" workOrder={previewWorkOrder} isPreview initialPrintPreview={previewMode === 'pdf'} draft={previewDraft} snapshot={previewSnapshot} catalogue={editableCatalogue} approvedDiscountRupees={Math.max(0,Math.round(approvedDiscount))} verifiedPaidRupees={previewVerifiedPaid} pendingPaymentsCount={0} defaultSentPackage={{grade:workingDraft.recommended?.grade || 'Base', protection:workingDraft.recommended?.protection || 'Standard', finish:workingDraft.recommended?.finish || 'SF',brand_preference:workingDraft.recommended?.brand_preference || null}} initialSelection={{wholeHomeSelection:{grade:workingDraft.recommended?.grade || 'Base',protection:workingDraft.recommended?.protection || 'Standard',finish:workingDraft.recommended?.finish || 'SF',brand_preference:workingDraft.recommended?.brand_preference || null},mixByRoom:false,roomSelections:{},selectedOptionalPointers:[],acceptedTermsAt:null}} onSaveSelection={async()=>{}} onSubmitPayment={async()=>({ok:false,error:'Publish the quotation before requesting payment.'})}/>
      </section>}
      <div hidden={previewMode !== null} className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 no-print">
        {activeTab !== 'unified_studio' && publishResult && !publishResult.ok && (
          <div role="alert" className="mb-5 p-4 border border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B] rounded-xl text-sm">{publishResult.message}</div>
        )}
        {/* TAB 1: UNIFIED CREATE QUOTE & RATE CARD STUDIO */}
        {activeTab === 'unified_studio' && (
          <fieldset disabled={editorBusy} aria-busy={editorBusy} className="owner-create-layout min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Paste Unified JSON (Auto-Extracts Rate Card + Quotation) & Validation Gate */}
            <div className="lg:col-span-5 space-y-6">
              <details className="bg-white border border-[#E5DFD3] rounded-2xl p-6 space-y-4 owner-import">
                <summary className="font-bold cursor-pointer">Import from your assistant</summary>
                <div className="flex items-center justify-between gap-2 border-b border-[#EAE4D8] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#18221D] mt-0.5">
                      Paste or upload quotation JSON
                    </h2>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="p-3 bg-[#E4EFE7] border border-[#C5DEC9] rounded-xl text-xs text-[#1C3A2F] leading-relaxed">
                    <strong>Quotations use your saved rate card.</strong> Your assistant should reuse existing work types. Only approved reusable additions or changes belong in <code>rate_card_updates</code>; importing them saves those rates for future quotes. Item-level <code>custom_rates</code> affect only that quotation. New work needs all three confirmed package rates before publication.
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

                  {/* Quick Load Practice Templates */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C645F] mr-1">
                      Templates:
                    </span>
                    <button
                      type="button"
                      onClick={() => loadPracticeDraft(VIDYA_SAGAR_REDDY_DRAFT)}
                      className="px-2.5 py-1 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#E5DFD3] rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      3BHK practice template
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPracticeDraft(APPENDIX_PRACTICE_DRAFT)}
                      className="px-2.5 py-1 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#E5DFD3] rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      2BHK practice template
                    </button>
                  </div>

                  <textarea
                    aria-label="Paste JSON from Gemini Gem or Custom GPT"
                    rows={13}
                    value={rawJsonText}
                    onChange={(event) => {setPendingJson(event.target.value);setImportFeedback(null);}}
                    placeholder='Paste your unified {"schema_version": "quotation-studio.draft.v2", "rate_card_updates": {...}, "rooms": [...]} JSON here...'
                    className="w-full p-3.5 text-xs font-mono bg-[#18221D] text-[#FAF8F4] rounded-xl focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(rawJsonText);
                          setImportFeedback({ok:true,message:'JSON copied.'});
                        } catch {
                          setImportFeedback({ok:false,message:'The browser could not copy this JSON. Select and copy the text in the box.'});
                        }
                      }}
                      className="px-3 py-2 bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy JSON
                    </button>

                    <button
                      type="button"
                      onClick={() => void processUnifiedJsonText(async () => rawJsonText)}
                      className="px-4 py-2.5 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {loadingJson ? 'Loading…' : 'Load quotation & rates'}
                    </button>
                  </div>
                  {pendingJson !== null && <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span>JSON has not been applied. Load it or keep editing the current quotation.</span>
                    <button type="button" className="owner-action-secondary" onClick={() => {setPendingJson(null);setImportFeedback(null);}}>Discard pasted JSON</button>
                  </div>}
                  {importFeedback && <p className={importFeedback.ok ? 'text-xs' : 'form-error'} role={importFeedback.ok ? 'status' : 'alert'}>{importFeedback.message}</p>}
                </div>
              </details>

              {/* Validation & Publish Readiness Card */}
              <div className="bg-white border border-[#E5DFD3] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                      : pendingOwnerReviewCount > 0 && ordinaryValidationIssues.length === 0
                        ? `${pendingOwnerReviewCount} Owner Detail(s) to Review`
                        : `${publishGateCount} Issue(s) to Resolve`}
                  </span>
                </div>

                {ordinaryValidationIssues.length === 0 && workingDraft.owner_requests.length === 0 ? (
                  <p className="text-xs text-[#1C3A2F] bg-[#E4EFE7] p-3 border border-[#C5DEC9] rounded-xl font-medium">
                    Required details and measurements are complete. Review the selected package and prices before publishing.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {ordinaryValidationIssues.length > 0 && <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {ordinaryValidationIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#FFFBEB] border border-[#B45309]/40 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#92400E]">
                          <span>Field: {issue.path || '/'}</span>
                          <span>{issue.code}</span>
                        </div>
                        <p className="text-[#18221D] font-medium">{issue.path==='/quote/date'&&!validIsoDate(workingDraft.quote.date)?'Enter a valid issue date as DD-MM-YYYY, or choose it from the calendar.':issue.path==='/quote/valid_until'&&!validIsoDate(workingDraft.quote.valid_until)?'Enter a valid expiry as DD-MM-YYYY, or choose it from the calendar.':issue.message}</p>
                      </div>
                    ))}
                    </div>}
                    {workingDraft.owner_requests.length > 0 && (
                      <section className={`rounded-xl border p-3.5 space-y-3 ${reviewedOwnerRequests ? 'border-[#C5DEC9] bg-[#F6FAF7]' : 'border-[#C9BFA8] bg-[#FAF8F4]'}`} aria-labelledby="owner-review-title">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-[#1C3A2F]">OWNER CONFIRMATION</p>
                          <h4 id="owner-review-title" className="mt-0.5 text-sm font-bold text-[#18221D]">Review these {workingDraft.owner_requests.length} quotation detail{workingDraft.owner_requests.length === 1 ? '' : 's'}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-[#5C645F]">These are important payment, bank or terms details from the imported quote. They are not customer-facing errors; confirm them before publishing.</p>
                        </div>
                        <div className="space-y-2.5">
                          {workingDraft.owner_requests.map((request, requestIndex) => {
                            const presentation = getOwnerRequestPresentation(request.path);
                            return <article key={`${request.path}-${requestIndex}`} className="rounded-lg border border-[#E5DFD3] bg-white p-3 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-[#E4EFE7] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#1C3A2F]">{presentation.badge}</span>
                                <h5 className="text-xs font-bold text-[#18221D]">{presentation.title}</h5>
                              </div>
                              <p className="text-xs leading-relaxed text-[#5C645F]">{presentation.summary}</p>
                              <div className="rounded-md bg-[#FAF8F4] px-2.5 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#5C645F]">Details to confirm</p>
                                <p className="mt-1 text-xs leading-relaxed text-[#18221D]">{request.text}</p>
                              </div>
                            </article>;
                          })}
                        </div>
                        <label className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border border-[#D8D0C2] bg-white p-2.5 text-xs font-medium text-[#18221D]">
                          <input
                            type="checkbox"
                            checked={reviewedOwnerRequests}
                            onChange={(e) => setReviewedOwnerRequests(e.target.checked)}
                            className="h-[22px] w-[22px] shrink-0 accent-[#1C3A2F]"
                          />
                          <span>{reviewedOwnerRequests ? 'All listed details have been reviewed.' : `I have reviewed all ${workingDraft.owner_requests.length} listed detail${workingDraft.owner_requests.length === 1 ? '' : 's'}.`}</span>
                        </label>
                      </section>
                    )}
                  </div>
                )}

                {(workingDraft.is_demo || workingDraft.needs_clarification.length > 0) && (
                  <div className="pt-2 border-t border-[#EAE4D8] space-y-2">
                    {workingDraft.is_demo && (
                      <button type="button" onClick={() => syncDraft({ ...workingDraft, is_demo: false })}
                        className="w-full py-2 px-3 bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl text-xs font-bold text-left cursor-pointer">
                        Confirm this is a real customer job →
                      </button>
                    )}
                    {workingDraft.needs_clarification.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-[#5C645F]">Edit the quotation with the confirmed answer, then resolve each question.</p>
                        {workingDraft.needs_clarification.map((question, questionIndex) => (
                          <div key={`${question.path}-${questionIndex}`} className="p-3 rounded-xl border border-[#E5DFD3] space-y-2">
                            <p className="text-xs font-medium">{question.question}</p>
                            <button type="button" className="text-xs font-bold text-[#1C3A2F] underline underline-offset-4"
                              onClick={() => syncDraft({ ...workingDraft, needs_clarification: workingDraft.needs_clarification.filter((_, i) => i !== questionIndex) })}>
                              Mark answered after review
                            </button>
                          </div>
                        ))}
                      </div>
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
                    <h2 className="text-base font-bold text-[#18221D] mt-0.5">
                      {supersedeId ? 'Edit quotation' : 'New quotation'}
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

                {addonSuggestions.length > 0 && <section className="addon-review" aria-labelledby="addon-review-heading">
                  <div className="addon-review-heading"><div><p className="addon-eyebrow">PERSONALISED IDEAS</p><h3 id="addon-review-heading">Suggested for this home</h3></div><span>{addonSuggestions.length} to review</span></div>
                  <p className="addon-intro">Useful additions proposed by your assistant. Review what suits this home, then confirm the specification and price. These ideas are outside the quoted scope.</p>
                  <div className="addon-review-list">{addonSuggestions.map((suggestion, suggestionIndex) => <article key={`${suggestion.room_index}-${suggestion.item.name}-${suggestionIndex}`} className="addon-review-item">
                    <p className="addon-room">{workingDraft.rooms[suggestion.room_index]?.name || 'Room'}</p><h4>{suggestion.item.name}</h4><p>{suggestion.reason}</p>
                    <div className="addon-review-meta"><span>Optional addition</span>{(!suggestion.item.measure?.per_item || !suggestion.item.quantity || !suggestion.item.size_text) && <span>Confirm size & quantity</span>}{!editableCatalogue.workTypes[suggestion.item.work_type || ''] && <span>Confirm new work-type rates</span>}</div>
                    <div className="addon-review-actions"><button type="button" onClick={() => {try {syncDraft(acceptAddonSuggestion(workingDraft, suggestionIndex)); setPublishResult({ok:true,message:'Added as optional work. Review its measurements, quantity and rates in the room editor before publishing.'});} catch(error) {setPublishResult({ok:false,message:error instanceof Error ? error.message : 'Could not add this suggestion.'});}}}><Plus size={14}/> Add as optional</button><button type="button" onClick={() => syncDraft(rejectAddonSuggestion(workingDraft, suggestionIndex))}>Dismiss</button></div>
                  </article>)}</div>
                </section>}

                {/* Customer & Quote Meta Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#18221D] mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      aria-label="Customer name"
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
                      aria-label="Customer mobile number"
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
                      aria-label="Quotation reference number"
                      value={workingDraft.quote.number || ''}
                      readOnly={Boolean(editingRecord && editingRecord.status !== 'Draft')}
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
                      aria-label="Full site address"
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
                      aria-label="Approved discount in rupees"
                      value={approvedDiscount}
                      onChange={(e) => {setApprovedDiscount(Number(e.target.value) || 0);setDraftDirty(true);}}
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <QuotationDateField label="Issue date" value={workingDraft.quote.date} onChange={date=>syncDraft({...workingDraft,quote:{...workingDraft.quote,date,...(validIsoDate(date)?{valid_until:expiryFromIssue(date,workingDraft.quote.validity_days??30)}:{})}})}/>
                  <QuotationDateField label="Valid until" value={workingDraft.quote.valid_until} onChange={expiry=>{const days=validityBetween(workingDraft.quote.date,expiry);syncDraft({...workingDraft,quote:{...workingDraft.quote,valid_until:expiry,...(days?{validity_days:days}:{})}});}}/>
                  <label className="owner-field">Quotation validity (days)<input type="number" inputMode="numeric" aria-label="Quotation validity in days" min="1" max="3650" step="1" value={workingDraft.quote.validity_days||''} onChange={event=>{const days=Number(event.target.value);const expiry=expiryFromIssue(workingDraft.quote.date||'',days);syncDraft({...workingDraft,quote:{...workingDraft.quote,validity_days:days,...(expiry?{valid_until:expiry}:{})}});}}/><span>Defaults to 30 when you open a quotation for editing. Changing the issue date or days adjusts the expiry.</span></label>
                </div>
                <label className="owner-field">Additional quotation notes<textarea rows={3} value={(workingDraft.quote.notes || []).join('\n')} placeholder="One approved note per line. These notes appear in the online quotation and PDF." onChange={e => syncDraft({...workingDraft,quote:{...workingDraft.quote,notes:e.target.value.split('\n')}})}/></label>
                <fieldset className="space-y-3 border-t border-[#E5DFD3] pt-4">
                  <legend className="text-sm font-bold text-[#18221D] px-0 pt-4">Quotation basis</legend>
                  <label htmlFor="quotation-floor-plan-estimate" className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[#D8D0C2] bg-[#FAF8F4] p-3 text-xs text-[#18221D]">
                    <input
                      id="quotation-floor-plan-estimate"
                      type="checkbox"
                      checked={isFloorPlanEstimate(workingDraft.quote)}
                      onChange={(event) => {
                        const { estimate_basis: _legacyBasis, estimate_note: _legacyNote, ...quoteWithoutLegacyNote } = workingDraft.quote;
                        syncDraft({
                          ...workingDraft,
                          quote: event.target.checked
                            ? { ...quoteWithoutLegacyNote, is_floor_plan_estimate: true }
                            : { ...quoteWithoutLegacyNote, is_floor_plan_estimate: false },
                        });
                      }}
                      className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-[#1C3A2F]"
                    />
                    <span>
                      <span className="block font-bold">This quotation is based on the supplied floor plan</span>
                      <span className="mt-1 block leading-relaxed text-[#5C645F]">When checked, customers see the preliminary-estimate notice in their quotation and PDF.</span>
                    </span>
                  </label>
                  <p className="text-xs leading-relaxed text-[#5C645F]">Leave it unchecked to generate the quotation without an estimate-basis note.</p>
                  {isFloorPlanEstimate(workingDraft.quote) && (
                    <div className="text-xs leading-relaxed text-[#18221D] bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl p-3">
                      <p className="font-bold">Customer preview · {getQuotationBasisLabel(workingDraft.quote)}</p>
                      <p className="mt-1.5 whitespace-pre-line break-words">{getQuotationEstimateNote(workingDraft.quote)}</p>
                    </div>
                  )}
                </fieldset>

                {/* Default Sending Package Option */}
                <div className="p-4 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#1C3A2F]">
                        Package shown first
                      </p>
                      <p className="text-xs text-[#5C645F] mt-0.5">
                        Choose Basic, Standard or Premium for the customer’s starting selection.
                      </p>
                    </div>
                    {supersedeId && <p className="text-xs text-[#5C645F]">Editing {workingDraft.quote.number}. Publish an update below to record your changes.</p>}
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
                  <label className="flex items-start gap-2.5 rounded-lg border border-[#D8D0C2] bg-white px-3 py-2.5 text-xs text-[#18221D] cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label="Show selected package as recommended to customer"
                      checked={workingDraft.quote.show_recommended_package === true}
                      onChange={(event) =>
                        syncDraft({
                          ...workingDraft,
                          quote: {
                            ...workingDraft.quote,
                            show_recommended_package: event.target.checked,
                          },
                        })
                      }
                    />
                    <span className="min-w-0 leading-relaxed">
                      <span className="block font-bold">Show this as our recommended package</span>
                      <span className="mt-0.5 block text-[#5C645F]">
                        Only you control this label. Customers still see their own active selection highlighted separately.
                      </span>
                    </span>
                  </label>
                </div>

                {/* MERGED INLINE RATE CARD & NEW WORK ELEMENT MEMORY EDITOR (No separate tab switching!) */}
                {quotes.find(q=>q.publicId===supersedeId)?.workOrder && <label className="scope-optional"><input type="checkbox" checked={updateWorkOrderSelection} onChange={e=>{setUpdateWorkOrderSelection(e.target.checked);setDraftDirty(true);}}/><span>Apply this package to the confirmed work order<small>Use after agreeing a package change with the customer. Publishing records the change in revision history. Leave unchecked to keep their confirmed room-by-room choices.</small></span></label>}
                <details className="p-4 bg-[#F6FAF7] border border-[#C5DEC9] rounded-xl space-y-3.5 owner-rates">
                  <summary className="font-bold cursor-pointer">Rates and reusable work types</summary>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#1C3A2F]">
                        Rate card
                      </p>
                      <p className="text-xs text-[#2D4F3E] mt-0.5">
                        Change Basic, Standard, Premium or PVC rates, then save. Publish an update when you want the new prices on a customer quotation.
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

                  <RateCardEditor catalogue={editableCatalogue} workTypeKeys={showFullRateCardTable ? Object.keys(editableCatalogue.workTypes) : activeDraftWorkTypes} disabled={savingRates||savingNewWork} onChange={next=>{setRateFeedback(null);setEditableCatalogue(next);}}/>

                  <div className="owner-rate-actions"><button type="button" className="owner-action-primary" disabled={savingRates||savingNewWork} onClick={() => void saveRateCard()}>{savingRates ? 'Saving rates…' : 'Save rate card & apply to draft'}</button>{rateFeedback?<p role={rateFeedback.ok?'status':'alert'}>{rateFeedback.message}</p>:JSON.stringify(editableCatalogue.workTypes)!==JSON.stringify(catalogue.workTypes)?<p>Unsaved rate changes</p>:<p>Rate card is saved.</p>}</div>

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
                        aria-label="New work type name"
                        required
                        maxLength={200}
                      value={newWorkLabel}
                        onChange={(e) => setNewWorkLabel(e.target.value)}
                        placeholder="e.g., Wall-mounted study table"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        Basic (₹)
                      </label>
                      <input
                        type="number"
                        min="0" step="0.01" inputMode="decimal" required
                        aria-label="New work type Basic rate in rupees"
                      value={newWorkBase}
                        onChange={(e) => setNewWorkBase(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        Standard (₹)
                      </label>
                      <input
                        type="number"
                        min="0" step="0.01" inputMode="decimal" required
                        aria-label="New work type Standard rate in rupees"
                      value={newWorkNormal}
                        onChange={(e) => setNewWorkNormal(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        Premium (₹)
                      </label>
                      <input
                        type="number"
                        min="0" step="0.01" inputMode="decimal" required
                        aria-label="New work type Premium rate in rupees"
                      value={newWorkPremium}
                        onChange={(e) => setNewWorkPremium(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold uppercase text-[#5C645F] mb-1">
                        +PVC
                      </label>
                      <input
                        type="number"
                        min="0" step="0.01" inputMode="decimal" required
                        aria-label="New work type PVC extra rate in rupees"
                      value={newWorkPvcAdder}
                        onChange={(e) => setNewWorkPvcAdder(e.target.value)}
                        className="w-full px-1.5 py-1.5 text-xs font-mono bg-white border border-[#C5DEC9] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={savingNewWork||savingRates}
                        className="w-full py-1.5 px-2.5 bg-[#1C3A2F] text-[#E6CBA8] rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {savingNewWork?'Saving…':'+ Save work type'}
                      </button>
                    </div>
                    <label className="owner-field sm:col-span-3">Billing unit<select aria-label="New work type billing unit" value={newWorkUnit} onChange={event=>setNewWorkUnit(event.target.value as typeof newWorkUnit)}><option value="sq_ft">Per sq.ft</option><option value="running_ft">Per running ft</option><option value="each">Each</option><option value="lumpsum">Lump sum</option></select></label>
                    <label className="owner-field sm:col-span-9">Work specification<textarea aria-label="New work type specification" value={newWorkDescription} maxLength={2000} rows={2} onChange={event=>setNewWorkDescription(event.target.value)} placeholder="Describe the work and confirmed materials. Optional."/></label>
                  </form>
                </details>

                <RoomScopeEditor key={editorGeneration} draft={workingDraft} catalogue={editableCatalogue} onChange={syncDraft}/>

                {/* Live 3-Tier Price Preview & Publish Bar */}
                <div className="pt-4 border-t border-[#EAE4D8] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {ALL_GRADES.map((g) => {
                      const isDefaultSent = (workingDraft.recommended?.grade || 'Base') === g;
                      const isOwnerRecommended = isDefaultSent && workingDraft.quote.show_recommended_package === true;
                      return (
                        <button
                          key={g}
                          type="button"
                          aria-pressed={isDefaultSent}
                          aria-label={`Send ${getPackageDisplayName(g)} package by default`}
                          onClick={() => syncDraft({
                            ...workingDraft,
                            recommended: {
                              grade: g,
                              protection: workingDraft.recommended?.protection || 'Standard',
                              finish: workingDraft.recommended?.finish || 'SF',
                              brand_preference: editableCatalogue.grades[g].approvedBrands[0]?.name || null,
                            },
                          })}
                          className={`owner-package-choice text-left cursor-pointer p-4 rounded-xl border transition-colors ${
                            isDefaultSent
                              ? 'bg-[#E4EFE7] border-[#1C3A2F]'
                              : 'bg-[#FAF8F4] border-[#E5DFD3]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-[#18221D]">{getPackageDisplayName(g)} Package</p>
                            <span className="inline-flex items-center gap-1">
                              {isOwnerRecommended && (
                                <span className="px-1.5 py-0.5 bg-[#F0E3C8] text-[#76541C] rounded text-[9px] font-bold uppercase">
                                  Recommended
                                </span>
                              )}
                              {isDefaultSent && (
                                <span className="px-1.5 py-0.5 bg-[#1C3A2F] text-[#E6CBA8] rounded text-[9px] font-bold uppercase">
                                  Selected
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="font-mono tabular-nums text-[#1C3A2F] font-bold text-sm mt-1">
                            {formatINR(previewSnapshot.baseWholeHomeTotals[makeComboKey(g, 'Standard', 'SF')])}
                          </p>
                          <p className="text-[11px] font-mono tabular-nums text-[#5C645F] mt-0.5">
                            +PVC: {formatINR(previewSnapshot.baseWholeHomeTotals[makeComboKey(g, 'With PVC', 'SF')])}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <select
                      aria-label="Publish destination"
                      value={supersedeId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSupersedeId(id);
                        const target = currentQuotes.find(q => q.publicId === id);
                        setUpdateWorkOrderSelection(false);
                        syncDraft({...workingDraft,quote:{...workingDraft.quote,number:target?.draft.quote.number || nextQuoteNumber(quotes)}});
                      }}
                      className="px-3.5 py-2.5 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                    >
                      <option value="">New customer quotation</option>
                      {currentQuotes.map((q) => (
                        <option key={q.publicId} value={q.publicId}>
                          {q.draft.customer.name} · {q.draft.quote.number}
                        </option>
                      ))}
                    </select>

                    <div className="owner-publish-actions">
                    {(!supersedeId || quotes.find(q => q.publicId === supersedeId)?.status === 'Draft') && <button type="button" disabled={savingDraft} onClick={handleSaveDraftClick}>{savingDraft?'Saving…':'Save draft'}</button>}
                    <button type="button" onClick={() => openPreview('online')}>Preview online</button>
                    <button type="button" onClick={() => openPreview('pdf')}>Preview PDF</button>
                    <button
                      type="button"
                      onClick={handlePublishClick}
                      disabled={isPublishing}
                      aria-busy={isPublishing}
                      className="py-3 px-6 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      {isPublishing ? 'Publishing…' : supersedeId ? 'Publish update' : 'Publish quotation'}
                    </button>
                    </div>
                  </div>

                  {publishResult && (
                    <div
                      className={`p-4 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                        publishResult.ok
                          ? 'bg-[#E4EFE7] border-[#15803D] text-[#1C3A2F]'
                          : 'bg-[#FEF2F2] border-[#B91C1C] text-[#991B1B]'
                      }`}
                    >
                      <span className="font-medium" role={publishResult.ok ? 'status' : 'alert'}>{publishResult.message}</span>
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
          </fieldset>
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
                    aria-label="Search quotations"
                      value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                    placeholder="Search customer, site, or quote no..."
                    className="pl-9 pr-3 py-2 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl w-full sm:w-64"
                  />
                </div>
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Viewed">Viewed</option>
                  <option value="Package chosen">Package chosen</option>
                  <option value="Booking submitted">Booking submitted</option>
                  <option value="Booking paid">Booking paid</option>
                  <option value="Advance paid">Advance paid</option>
                </select>
                <label className="owner-field text-xs">From<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/></label>
                <label className="owner-field text-xs">To<input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}/></label>
                <label className="owner-field text-xs">Per page<select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
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

            {deleteQuoteError && <p role="alert" className="text-sm text-[#96372e]">{deleteQuoteError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{filteredQuotes.length} quotation{filteredQuotes.length === 1 ? '' : 's'} · newest first</span><div className="flex items-center gap-3"><button type="button" disabled={quotePage <= 1} onClick={() => setQuotePage(page => page-1)}>Previous</button><span>Page {Math.min(quotePage,quotePageCount)} of {quotePageCount}</span><button type="button" disabled={quotePage >= quotePageCount} onClick={() => setQuotePage(page => page+1)}>Next</button></div></div>
            {filteredQuotes.length === 0 && <p className="p-6 text-sm">No quotations match these filters. Change the dates, search or status to try again.</p>}
            <div className="space-y-4">
              {visibleQuotes.map((q) => {
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
                    <div className="owner-quote-card p-4 sm:p-5 bg-white">
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
                            {isSavedByCustomer ? 'Customer saved package ✓' : q.status}
                          </span>
                        </div>
                        <p className="text-base font-bold text-[#18221D]">
                          {q.draft.customer.name}{' '}
                          {q.draft.customer.phone && (
                            <span className="text-xs font-mono font-normal text-[#5C645F]">
                              ({q.draft.customer.phone})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#5C645F]">{q.draft.customer.site}</p>
                      </div>

                      {/* Middle: Default Sent Option vs Customer Saved Selection & Final Price */}
                      <div className="owner-quote-prices grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              setPublishResult(null);
                              try {
                              if (!onUpdateDefaultPackage) throw new Error('Default package saving is not available.');
                              await onUpdateDefaultPackage(q.publicId, {
                                grade: g,
                                protection: p,
                                finish: q.defaultSentPackage?.finish||q.lastCustomerSelection.wholeHomeSelection.finish,
                                brand_preference: catalogue.grades[g].approvedBrands[0]?.name || null,
                              });
                              setSavedDefaultToastId(q.publicId);
                              setTimeout(() => setSavedDefaultToastId(null), 2000);
                              } catch (error) {
                                setPublishResult({ ok: false, message: error instanceof Error ? error.message : 'Unable to save the default package. Please try again.' });
                              }
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
                        {q.status!=='Draft'&&!q.workOrder&&<button type="button" className="owner-create-work-order" onClick={()=>openWorkOrderSetup(q.publicId)}>Create work order</button>}
                        <button
                          type="button"
                          onClick={() => {
                            if (supersedeId === q.publicId && editorHasChanges) {
                              setActiveTab('unified_studio');
                              return;
                            }
                            if (!canReplaceEditor()) return;
                            const draftCopy = normalizeFurnitureLayout(q.draft);
                            if (q.status !== 'Draft') draftCopy.quote=beginQuotationEdit(draftCopy.quote,indiaDate());
                            if (q.defaultSentPackage) {
                              draftCopy.recommended = {
                                grade: q.defaultSentPackage.grade,
                                protection: q.defaultSentPackage.protection,
                                finish: q.defaultSentPackage.finish,
                                brand_preference: q.defaultSentPackage.brand_preference,
                              };
                            }
                            setSupersedeId(q.publicId);
                            setUpdateWorkOrderSelection(false);
                            setApprovedDiscount(q.approvedDiscountRupees || 0);
                            setReviewedOwnerRequests(false);
                            loadEditorDraft(draftCopy);
                            setActiveTab('unified_studio');
                          }}
                          className="px-3 py-2 bg-[#FAF8F4] hover:bg-[#EAE3D5] border border-[#D8D0C2] rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Edit Lines in Studio
                        </button>
                        <button
                          type="button"
                          disabled={q.status === 'Draft'}
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
                          onClick={() => {
                            if (q.status !== 'Draft') { onOpenCustomerQuote(q.publicId); return; }
                            if (supersedeId !== q.publicId || !editorHasChanges) {
                              if (!canReplaceEditor()) return;
                              setSupersedeId(q.publicId);
                              setApprovedDiscount(q.approvedDiscountRupees);
                              setReviewedOwnerRequests(false);
                              setUpdateWorkOrderSelection(false);
                              loadEditorDraft(structuredClone(q.draft));
                            }
                            setActiveTab('unified_studio');
                            openPreview('online');
                          }}
                          className="px-3.5 py-2 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold cursor-pointer"
                        >
                          {q.status === 'Draft' ? 'Preview draft' : q.workOrder ? 'Open work order' : 'Open quotation'}
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
                        <button type="button" className="quote-delete-button" disabled={deletingQuoteId !== null} onClick={async()=>{
                          if (!window.confirm(`Delete ${q.draft.quote.number || 'this quotation'} for ${q.draft.customer.name || 'this customer'}? All revisions will be removed from the studio and every customer link will stop working. Existing payment history stays recorded.`)) return;
                          setDeletingQuoteId(q.publicId);setDeleteQuoteError('');
                          try {
                            const editingDeleted = supersedeId && seriesIds(quotes,q.publicId).has(supersedeId);
                            await onDeleteQuote(q.publicId);
                            if (editingDeleted) { setSupersedeId('');loadEditorDraft(createEmptyOwnerDraft(quotes));setPreviewMode(null); }
                            setExpandedQuoteDetailsId(null);
                          } catch(error) { setDeleteQuoteError(error instanceof Error ? error.message : 'Could not delete the quotation.'); }
                          finally { setDeletingQuoteId(null); }
                        }}>{deletingQuoteId===q.publicId?'Deleting…':'Delete quotation'}</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-[#EAE4D8] bg-[#FAF8F4] space-y-4 text-xs">
                        <div className="space-y-1.5">
                          <p className="font-bold text-[#18221D]">
                            Starting package for this link (Basic / Standard / Premium):
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
                                    ? `Copied ${getPackageDisplayName(g)} link`
                                    : `Copy ${getPackageDisplayName(g)} link (${formatINR(
                                        q.snapshot.baseWholeHomeTotals[
                                          makeComboKey(g, 'Standard', 'SF')
                                        ]
                                      )})`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <section className="space-y-2"><h3 className="font-bold">Owner revision history</h3>{quotes.filter(record=>seriesIds(quotes,q.publicId).has(record.publicId)).sort((a,b)=>b.revision-a.revision).map(record=><p key={record.publicId} className="text-xs">{record.status==='Draft'?'Draft':`Revision ${record.revision}`} · {new Date(record.publishedAt).toLocaleString('en-IN')} · {record.draft.customer.name} · {record.workOrder?'Work order':'Quotation'}</p>)}</section>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#EAE4D8]">
                          <div className="space-y-2">
                            <p className="font-bold text-[#18221D] inline-flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-[#2B5B48]" />
                              Customer Package Selection History ({q.selectionHistory?.length || 0})
                            </p>
                            {!q.selectionHistory || q.selectionHistory.length === 0 ? (
                              <p className="text-[#5C645F]">
                                Customer has not saved a package yet.
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
                    Includes all <strong>{Object.keys(editableCatalogue.workTypes).length} current work types</strong>, prices and a room-by-room checklist for common omissions. Update reusable scope defaults under Saved corrections below, then copy the refreshed instructions into your Gem or Custom GPT. The assistant prepares JSON; you review and publish it here.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try{if(!navigator.clipboard)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(dynamicGemInstructions);setCopiedPrompt(true);setTimeout(() => setCopiedPrompt(false), 2000);}
                    catch{setAssistantMemoryFeedback('Copy is unavailable in this browser. Use Download instructions to open the complete setup as a text file.');}
                  }}
                  className="px-5 py-2.5 bg-[#2B5B48] hover:bg-[#142920] text-[#E6CBA8] rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Copy className="w-4 h-4" />
                  {copiedPrompt
                    ? 'Copied Master Gem Instructions ✓'
                    : 'Copy Master Gem Instructions'}
                </button>
                <button type="button" className="owner-action-secondary inline-flex items-center gap-2" onClick={()=>{const blob=new Blob([dynamicGemInstructions],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='UME-Quotation-Studio-Instructions.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}}><Download size={15}/> Download instructions</button>
                </div>
              </div>

              <pre className="owner-instructions p-4 bg-[#18221D] text-[#FAF8F4] rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                {dynamicGemInstructions}
              </pre>
              <div className="space-y-3 border-t border-[#E5DFD3] pt-4"><label className="owner-field">Saved corrections for future assistant setups<textarea aria-label="Saved assistant corrections" rows={4} maxLength={25500} value={(editableCatalogue.assistantLessons||[]).join('\n')} placeholder="One reusable rule per line, e.g. Keep each loft immediately after its confirmed main unit." onChange={event=>{setEditableCatalogue(previous=>({...previous,assistantLessons:event.target.value.split('\n')}));setAssistantMemoryFeedback('Unsaved corrections');}}/><span>Save reusable process rules only. Do not store customer details, passwords or payment references. These rules and the latest saved rates are included in the copy button above; paste the refreshed setup into your Gem/Custom GPT before a new chat.</span></label><button className="owner-action-primary" type="button" disabled={savingAssistantMemory} onClick={async()=>{setSavingAssistantMemory(true);try{const next={...editableCatalogue,assistantLessons:[...new Set((editableCatalogue.assistantLessons||[]).map(line=>line.trim()).filter(Boolean))]};await onUpdateCatalogue(next);setEditableCatalogue(next);setAssistantMemoryFeedback('Corrections saved. Copy the updated assistant instructions above for future chats.');}catch(error){setAssistantMemoryFeedback(error instanceof Error?error.message:'Could not save corrections.');}finally{setSavingAssistantMemory(false);}}}>{savingAssistantMemory?'Saving…':'Save assistant corrections'}</button>{assistantMemoryFeedback&&<p className="text-xs" role="status">{assistantMemoryFeedback}</p>}</div>
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
            <div id="work-order-setup" className="owner-work-order-setup">
              <h2>Payments & work orders</h2>
              <p>Review the agreed scope, then verify the booking in your bank statement. Recording enough verified booking creates the work order on the customer's existing link.</p>
              <p className="owner-bank-reference">{catalogue.company.bank.bankName} · account ending {catalogue.company.bank.accountNumber.slice(-4)}</p>
              {paymentRecord && <section className="owner-work-order-summary" aria-label="Work order setup summary">
                <h3>{paymentRecord.draft.customer.name} · {paymentRecord.draft.quote.number}</h3>
                <dl><div><dt>Agreed scope total</dt><dd>{formatINR(paymentTotal)}</dd></div><div><dt>Verified payments</dt><dd>{formatINR(paymentVerified)}</dd></div><div><dt>Booking required</dt><dd>{formatINR(paymentBooking)}</dd></div><div><dt>Booking still to verify</dt><dd>{formatINR(bookingRemaining)}</dd></div></dl>
                <p>Package: <strong>{paymentRecord.lastCustomerSelection.mixByRoom?'Room-by-room selection':getPackageDisplayName(paymentRecord.lastCustomerSelection.wholeHomeSelection.grade)}</strong> · {paymentRecord.draft.rooms.length} rooms · {paymentRecord.lastCustomerSelection.selectedOptionalPointers.length} selected optional items.</p>
                {!paymentRecord.lastCustomerSelection.savedByCustomer && !paymentRecord.workOrder && <p>Confirm this package and scope with the customer before creating the work order.</p>}
                <div className="owner-work-order-actions">
                  <button type="button" onClick={()=>onOpenCustomerQuote(paymentRecord.publicId)}>Review selected scope</button>
                  {paymentRecord.workOrder?<button type="button" className="owner-action-primary" onClick={()=>onOpenCustomerQuote(paymentRecord.publicId)}>Open work order</button>:bookingRemaining===0?<button type="button" className="owner-action-primary" disabled={creatingWorkOrder||recordingPayment} onClick={async()=>{setCreatingWorkOrder(true);setWorkOrderFeedback(null);try{await onCreateWorkOrder(paymentRecord.publicId);setWorkOrderFeedback({ok:true,message:'Work order created from the existing verified booking. No new payment was added.'});}catch(error){setWorkOrderFeedback({ok:false,message:error instanceof Error?error.message:'Could not create the work order.'});}finally{setCreatingWorkOrder(false);}}}>{creatingWorkOrder?'Creating…':'Confirm scope & create work order'}</button>:<p>Record or verify the remaining {formatINR(bookingRemaining)} booking below to create this work order.</p>}
                </div>
              </section>}
              <form className="owner-payment-record grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={async e=>{
                e.preventDefault();if(recordingPayment||creatingWorkOrder)return;setRecordingPayment(true);setWorkOrderFeedback(null);
                try{await onRecordVerifiedPayment(paymentQuote,verifiedAmount,verifiedReference.trim());setVerifiedReference('');setWorkOrderFeedback({ok:true,message:paymentRecord?.workOrder||verifiedAmount>=bookingRemaining?'Verified payment recorded. Open the agreed work order above.':'Verified payment recorded. Complete the remaining booking verification to create the work order.'});}
                catch(error){setWorkOrderFeedback({ok:false,message:error instanceof Error?error.message:'Could not record payment. Your entries are preserved; try again.'});}finally{setRecordingPayment(false);}
              }}>
                <h3 className="sm:col-span-2">Record a bank-verified payment</h3>
                <label className="owner-field">Quotation<select required aria-label="Quotation for work order or payment" value={paymentQuote} disabled={recordingPayment||creatingWorkOrder} onChange={e=>choosePaymentQuote(e.target.value)}><option value="">Choose a published quotation</option>{currentQuotes.filter(q=>q.status!=='Draft').map(q=><option key={q.publicId} value={q.publicId}>{q.draft.customer.name} · {q.draft.quote.number}{q.workOrder?' · Work order created':''}</option>)}</select></label>
                <label className="owner-field">Bank-verified amount (₹)<input type="number" inputMode="numeric" aria-label="Bank-verified payment amount" min="1" step="1" required disabled={recordingPayment||creatingWorkOrder} value={verifiedAmount||''} onChange={e=>setVerifiedAmount(Number(e.target.value))}/></label>
                <label className="owner-field">Bank transaction reference<input required aria-label="Bank transaction reference" maxLength={120} disabled={recordingPayment||creatingWorkOrder} value={verifiedReference} onChange={e=>setVerifiedReference(e.target.value)}/></label>
                <button type="submit" className="owner-action-primary self-end" disabled={!paymentRecord||recordingPayment||creatingWorkOrder}>{recordingPayment?'Recording…':paymentRecord&&!paymentRecord.workOrder&&verifiedAmount>=bookingRemaining&&bookingRemaining>0?'Record booking & create work order':'Record verified payment'}</button>
                <p className="text-xs sm:col-span-2">Record only money you have already checked in the bank. A shared screenshot alone does not verify a payment. The booking is credited toward the first 50% advance.</p>
              </form>
              {workOrderFeedback&&<p role={workOrderFeedback.ok?'status':'alert'} className={workOrderFeedback.ok?'owner-work-order-success':'owner-work-order-error'}>{workOrderFeedback.message}</p>}
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
                              onClick={() => handlePaymentReview(entry.id, 'verify')}
                              className="px-3 py-1.5 bg-[#15803D] text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Verify & credit {formatINR(entry.amountRupees)}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handlePaymentReview(
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
