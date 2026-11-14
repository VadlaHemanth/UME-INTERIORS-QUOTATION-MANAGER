import { PackageTierCopy } from './PackageTierCopy';
import { packageLinkGrade } from '../lib/package-tiers';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { sharePaymentImage } from '../lib/payment-image-share';
import { getQuotationBasisLabel, getQuotationEstimateNote } from '../lib/quotation-notes';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  FileText,
  Layers,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  getPackageDisplayName,
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
  FinishOption,
  PlywoodGrade,
  ProtectionOption,
  QuotationDraftV2,
  ResolvedPackageSelection,
} from '../lib/schema';
import { DeterministicQrCode } from './BrandMark';
import { printQuotation } from '../lib/print-quotation';
import { quotationFileName } from '../lib/document-filename';
import { PrintableA4Sheet } from './PrintableA4Sheet';
import './customer-quotation.css';
import { documentTerms, materialLines, materialWording, quotationCustomerNotes, scopeNotes } from '../lib/commercial-spec';
import { quotationDisplayRooms } from '../lib/quotation-order';
import type { FinalizedWorkOrder } from '../lib/quote-workflow';
import { WorkOrderView } from './WorkOrderView';
import { PlywoodSpecifications } from './PlywoodSpecifications';
import { beginQuotationEdit, formatQuotationDate } from '../lib/quotation-dates';
import { indiaDate } from '../lib/quote-workflow';
import {selectedRoomItems,selectedRoomPackageAmount} from '../lib/pricing';
import { furnitureRelationshipLabel } from '../lib/quotation-order';
import { RoomScopeEditor } from './RoomScopeEditor';
import { quotationFurnitureText } from '../lib/quotation-presentation';
import { PackageWarrantyLabel } from './PackageWarrantyLabel';

interface CustomerQuotationViewProps {
  isPreview?: boolean;
  initialPrintPreview?: boolean;
  workOrder?: FinalizedWorkOrder;
  publicId: string;
  revision: number;
  isOwner?: boolean;
  supersededByPublicId?: string;
  status: string;
  draft: QuotationDraftV2;
  snapshot: PricedQuotationSnapshot;
  catalogue: StudioCatalogue;
  approvedDiscountRupees: number;
  verifiedPaidRupees: number;
  pendingPaymentsCount: number;
  defaultSentPackage?: ResolvedPackageSelection;
  initialSelection: {
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
  existingFeedback?: {
    id: string;
    topic: string;
    message: string;
    submittedAt: string;
  }[];
  onSaveSelection: (selection: {
    wholeHomeSelection: ResolvedPackageSelection;
    mixByRoom: boolean;
    roomSelections: Record<number, ResolvedPackageSelection>;
    selectedOptionalPointers: string[];
    acceptedTerms?: boolean;
    explicitCustomerSave?: boolean;
  }) => Promise<void> | void;
  onUpdateQuoteDraft?: (draft: QuotationDraftV2) => Promise<void>;
  onSubmitPayment: (payload: {
    utrReference: string;
    method: 'UPI / PhonePe' | 'NEFT / RTGS / IMPS';
    amountRupees: number;
    selectedPackageLabel: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onSwitchQuote?: (publicId: string) => void;
}

function parseUrlPackageParam(
  catalogue: StudioCatalogue
): ResolvedPackageSelection | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const rawPkg = params.get('pkg') || params.get('package') || params.get('default');
  const grade = packageLinkGrade(params);
  if (!grade) return null;

  const lower = params.has('tier') ? '' : rawPkg?.toLowerCase() || '';
  const protection: ProtectionOption = lower.includes('pvc') && !/(without|no[-_ ]?pvc)/.test(lower) ? 'With PVC' : 'Standard';
  const finish: FinishOption =
    lower.includes('gloss') || lower.includes('hg') ? 'High Gloss' : 'SF';

  return {
    grade,
    protection,
    finish,
    brand_preference: catalogue.grades[grade]?.approvedBrands[0]?.name || null,
  };
}

function getPackageThumbnailUrl(grade: PlywoodGrade): string {
  const filename = grade === 'Base' ? 'standard' : grade.toLowerCase();
  return `/assets/pkg-${filename}.webp`;
}

export const CustomerQuotationView: React.FC<CustomerQuotationViewProps> = ({
  publicId,
  revision,
  isOwner = false,
  isPreview = false,
  initialPrintPreview = false,
  workOrder,
  supersededByPublicId,
  draft,
  snapshot,
  catalogue,
  approvedDiscountRupees,
  verifiedPaidRupees,
  defaultSentPackage,
  initialSelection,
  existingFeedback = [],
  onSaveSelection,
  onUpdateQuoteDraft,
  onSubmitPayment,
  onSwitchQuote,
}) => {
  const displayRooms=useMemo(()=>quotationDisplayRooms(snapshot.rooms),[snapshot.rooms]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = quotationFileName(draft.customer.name,draft.quote.number,Boolean(workOrder));
    return () => { document.title = previousTitle; };
  }, [draft.customer.name,draft.quote.number,Boolean(workOrder)]);
  const resolvedStartingSelection = useMemo((): ResolvedPackageSelection => {
    if (isPreview) return defaultSentPackage || initialSelection.wholeHomeSelection;
    if (initialSelection.savedByCustomer) {
      return initialSelection.wholeHomeSelection;
    }
    const fromUrl = parseUrlPackageParam(catalogue);
    if (fromUrl) return fromUrl;
    if (defaultSentPackage) return defaultSentPackage;
    return initialSelection.wholeHomeSelection;
  }, [initialSelection, defaultSentPackage, catalogue, isPreview]);

  const [wholeHomeSelection, setWholeHomeSelection] =
    useState<ResolvedPackageSelection>(resolvedStartingSelection);
  const [mixByRoom, setMixByRoom] = useState<boolean>(
    initialSelection.savedByCustomer ? initialSelection.mixByRoom : false
  );

  const [roomSelections, setRoomSelections] = useState<
    Record<number, ResolvedPackageSelection>
  >(() => {
    const map: Record<number, ResolvedPackageSelection> = {};
    snapshot.rooms.forEach((r) => {
      if (
        initialSelection.savedByCustomer && initialSelection.mixByRoom &&
        initialSelection.roomSelections?.[r.roomIndex]
      ) {
        map[r.roomIndex] = initialSelection.roomSelections[r.roomIndex];
      } else {
        map[r.roomIndex] = { ...resolvedStartingSelection };
      }
    });
    return map;
  });

  const [selectedOptionalPointers, setSelectedOptionalPointers] = useState<string[]>(
    initialSelection.selectedOptionalPointers || []
  );

  const [savedByCustomer, setSavedByCustomer] = useState<boolean>(
    Boolean(initialSelection.savedByCustomer)
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [savingPackage, setSavingPackage] = useState<boolean>(false);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
  const [selectionSaveError, setSelectionSaveError] = useState<string | null>(null);
  const selectionSaveInFlight = useRef(false);
  const [reviewingPayment, setReviewingPayment] = useState(false);
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const selectionActionsRef = useRef<HTMLDivElement>(null);
  const [endActionsVisible, setEndActionsVisible] = useState(false);

  // Inline Line Editing Mode (Flexibility to change any line or sub-line anywhere in the quotation)
  const [isEditingLines, setIsEditingLines] = useState<boolean>(false);
  const [editableDraft, setEditableDraft] = useState<QuotationDraftV2>(() =>
    structuredClone(draft)
  );
  const [lineSaveError, setLineSaveError] = useState('');
  const [savingLines, setSavingLines] = useState<boolean>(false);
  const canEditLines = Boolean(isOwner && onUpdateQuoteDraft);

  useEffect(() => {
    if (!canEditLines) setIsEditingLines(false);
  }, [canEditLines]);

  const [activeBreakdownRoomIdx, setActiveBreakdownRoomIdx] = useState<number | 'ALL'>(displayRooms[0]?.roomIndex??0);
  useEffect(()=>{setActiveBreakdownRoomIdx(quotationDisplayRooms(snapshot.rooms)[0]?.roomIndex??0);},[publicId,revision]);

  // View mode: Interactive vs Printable A4 PDF Sheet
  const [showPrintSheet, setShowPrintSheet] = useState<boolean>(initialPrintPreview);
  useEffect(() => {
    if (showPrintSheet || !selectionActionsRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setEndActionsVisible(entry.isIntersecting), {
      rootMargin: '0px 0px -120px 0px', threshold: 0.2,
    });
    observer.observe(selectionActionsRef.current);
    return () => observer.disconnect();
  }, [showPrintSheet]);
  useEffect(() => {
    const prepare = () => flushSync(() => setShowPrintSheet(true));
    window.addEventListener('ume:prepare-print', prepare);
    window.addEventListener('beforeprint', prepare);
    return () => { window.removeEventListener('ume:prepare-print', prepare); window.removeEventListener('beforeprint', prepare); };
  }, []);

  // Payment screenshot sharing
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(
    Boolean(initialSelection.acceptedTermsAt)
  );
  const [paymentImage, setPaymentImage] = useState<File | null>(null);
  const [paymentImagePreview, setPaymentImagePreview] = useState('');
  const [showManualPaymentShare, setShowManualPaymentShare] = useState(false);
  useEffect(() => {
    if (!paymentImage) {setPaymentImagePreview(''); return;}
    const url=URL.createObjectURL(paymentImage); setPaymentImagePreview(url);
    return () => URL.revokeObjectURL(url);
  },[paymentImage]);
  const [paymentMethod, setPaymentMethod] = useState<
    'UPI / PhonePe' | 'NEFT / RTGS / IMPS'
  >('UPI / PhonePe');
  const [paymentAmount, setPaymentAmount] = useState<number>(50000);
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [bankCopyError, setBankCopyError] = useState<string | null>(null);
  const selectionIsBusy = savingPackage || submittingPayment || reviewingPayment;

  // Customer Change Request / Feedback Box State
  const [feedbackTopic, setFeedbackTopic] = useState<string>(
    'Room-Wise Package / Brand Change'
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [feedbackList, setFeedbackList] = useState(existingFeedback);
  const [feedbackStatus, setFeedbackStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setFeedbackList(existingFeedback);
  }, [existingFeedback]);

  // Reinitialise only when a different quote/revision or owner default arrives.
  // Ordinary save responses must not erase an in-progress customer choice.
  const selectionSourceKey = `${publicId}:${revision}:${JSON.stringify(defaultSentPackage)}`;
  const previousSelectionSource = useRef(selectionSourceKey);
  useEffect(() => {
    if (previousSelectionSource.current === selectionSourceKey) return;
    previousSelectionSource.current = selectionSourceKey;
    const start = initialSelection.savedByCustomer
      ? initialSelection.wholeHomeSelection
      : parseUrlPackageParam(catalogue) || defaultSentPackage || initialSelection.wholeHomeSelection;
    setWholeHomeSelection(start);
    setMixByRoom(Boolean(initialSelection.savedByCustomer && initialSelection.mixByRoom));
    setRoomSelections(Object.fromEntries(snapshot.rooms.map((room) => [
      room.roomIndex,
      initialSelection.savedByCustomer && initialSelection.mixByRoom
        ? initialSelection.roomSelections[room.roomIndex] || { ...start }
        : { ...start },
    ])));
    setSelectedOptionalPointers(initialSelection.selectedOptionalPointers || []);
    setSavedByCustomer(Boolean(initialSelection.savedByCustomer));
    setHasUnsavedChanges(false);
    setSaveToastMessage(null);
    setSelectionSaveError(null);
    setAcceptedTerms(Boolean(initialSelection.acceptedTermsAt));
  }, [selectionSourceKey, catalogue, defaultSentPackage, initialSelection, snapshot.rooms]);

  const calc = useMemo(
    () =>
      computeCustomerSelectionTotal(snapshot, {
        wholeHomeSelection,
        mixByRoom,
        roomSelections,
        selectedOptionalPointers,
        approvedDiscountRupees,
      }),
    [
      snapshot,
      wholeHomeSelection,
      mixByRoom,
      roomSelections,
      selectedOptionalPointers,
      approvedDiscountRupees,
    ]
  );

  const allOptionalItems = useMemo(() => {
    const list: {
      pointer: string;
      roomName: string;
      roomIndex: number;
      item: (typeof snapshot.rooms)[0]['items'][0];
    }[] = [];
    displayRooms.forEach((r) => {
      r.items.forEach((it) => {
        if (it.optional) {
          list.push({
            pointer: `/rooms/${r.roomIndex}/items/${it.itemIndex}`,
            roomName: r.name,
            roomIndex: r.roomIndex,
            item: it,
          });
        }
      });
    });
    return list;
  }, [displayRooms]);

  const totalUnitsCount = useMemo(
    () =>
      snapshot.rooms.reduce(
        (sum, r) => sum + selectedRoomItems(r,selectedOptionalPointers).length,
        0
      ),
    [snapshot,selectedOptionalPointers]
  );

  const milestones = useMemo(
    () => calculateMilestoneSchedule(calc.grandTotal, verifiedPaidRupees),
    [calc.grandTotal, verifiedPaidRupees]
  );

  const upiLimit = Number(catalogue.company.bank.upiLimitRupees);
  const paymentAmountIsValid = Number.isFinite(paymentAmount) && paymentAmount > 0;
  const upiAmountWithinLimit = paymentAmountIsValid && Number.isFinite(upiLimit) && upiLimit > 0 && paymentAmount <= upiLimit;
  const upiId = catalogue.company.bank.upiId.trim();
  const canPayWithUpi = !isPreview && !milestones.requiresOwnerSmallOrderRule && upiAmountWithinLimit && Boolean(upiId);
  const upiPaymentUrl = canPayWithUpi ? `upi://pay?${new URLSearchParams({
    pa: upiId,
    pn: catalogue.company.bank.accountName,
    am: paymentAmount.toFixed(2),
    cu: 'INR',
    tn: `Quotation ${draft.quote.number || publicId}`,
  }).toString()}` : null;
  const estimateNote = getQuotationEstimateNote(draft.quote);
  const estimateBasisLabel = getQuotationBasisLabel(draft.quote);

  useEffect(() => {
    setPaymentAmount(milestones.bookingRequired);
  }, [publicId, milestones.bookingRequired]);

  const activeGradeInfo = catalogue.grades[wholeHomeSelection.grade];

  // Calculate exact optional 6mm PVC Wall Shield delta for the active grade
  const wholeHomePvcDeltaRupees = useMemo(() => {
    return snapshot.rooms.reduce((sum, room) => {
      const selection = mixByRoom ? roomSelections[room.roomIndex] || wholeHomeSelection : wholeHomeSelection;
      const standard = room.roomTotals[makeComboKey(selection.grade, 'Standard', selection.finish)] || 0;
      const pvc = room.roomTotals[makeComboKey(selection.grade, 'With PVC', selection.finish)] || 0;
      return sum + Math.max(0, pvc - standard);
    }, 0);
  }, [snapshot, wholeHomeSelection, mixByRoom, roomSelections]);

  const applyProtectionToAllRooms = (protection: ProtectionOption) => {
    const next = { ...wholeHomeSelection, protection };
    setWholeHomeSelection(next);
    setRoomSelections(Object.fromEntries(snapshot.rooms.map((room) => [
      room.roomIndex,
      { ...(mixByRoom ? roomSelections[room.roomIndex] || wholeHomeSelection : next), protection },
    ])));
    setHasUnsavedChanges(true);
    setSaveToastMessage(null);
    setSelectionSaveError(null);
  };

  const applyWholeHomeChange = (nextWholeHome: ResolvedPackageSelection) => {
    setWholeHomeSelection(nextWholeHome);
    setMixByRoom(false);
    const syncedRooms: Record<number, ResolvedPackageSelection> = {};
    snapshot.rooms.forEach((r) => {
      syncedRooms[r.roomIndex] = { ...nextWholeHome };
    });
    setRoomSelections(syncedRooms);
    setHasUnsavedChanges(true);
    setSaveToastMessage(null);
  };

  const handleRoomSelectionChange = (
    roomIndex: number,
    patch: Partial<ResolvedPackageSelection>
  ) => {
    const currentRoomSel = roomSelections[roomIndex] || wholeHomeSelection;
    const nextGrade = patch.grade || currentRoomSel.grade;
    const nextBrand =
      patch.brand_preference !== undefined
        ? patch.brand_preference
        : patch.grade && patch.grade !== currentRoomSel.grade
        ? catalogue.grades[nextGrade].approvedBrands[0]?.name || null
        : currentRoomSel.brand_preference;

    const updatedRoom: ResolvedPackageSelection = {
      ...currentRoomSel,
      ...patch,
      grade: nextGrade,
      brand_preference: nextBrand,
    };

    const nextRooms = {
      ...roomSelections,
      [roomIndex]: updatedRoom,
    };

    setMixByRoom(true);
    setRoomSelections(nextRooms);
    setHasUnsavedChanges(true);
    setSaveToastMessage(null);
  };

  const handleResetAllRoomsToWholeHome = () => {
    const synced: Record<number, ResolvedPackageSelection> = {};
    snapshot.rooms.forEach((r) => {
      synced[r.roomIndex] = { ...wholeHomeSelection };
    });
    setRoomSelections(synced);
    setMixByRoom(false);
    setHasUnsavedChanges(true);
    setSaveToastMessage(null);
  };

  const handleToggleOptionalItem = (pointer: string) => {
    const exists = selectedOptionalPointers.includes(pointer);
    const nextPointers = exists
      ? selectedOptionalPointers.filter((p) => p !== pointer)
      : [...selectedOptionalPointers, pointer];
    setSelectedOptionalPointers(nextPointers);
    setHasUnsavedChanges(true);
    setSaveToastMessage(null);
  };

  const handleCustomerFinalSave = async (): Promise<boolean> => {
    if (isPreview) { setSaveToastMessage('Preview updated locally. Publish the quotation to enable customer saving.'); return true; }
    if (selectionSaveInFlight.current || submittingPayment) return false;
    selectionSaveInFlight.current = true;
    setSavingPackage(true);
    setSaveToastMessage(null);
    setSelectionSaveError(null);
    try {
      await onSaveSelection({
        wholeHomeSelection,
        mixByRoom,
        roomSelections,
        selectedOptionalPointers,
        acceptedTerms,
        explicitCustomerSave: true,
      });
      setSavedByCustomer(true);
      setHasUnsavedChanges(false);
      const dispName = getPackageDisplayName(wholeHomeSelection.grade);
      setSaveToastMessage(
        `Your ${
          mixByRoom
            ? 'Custom Room-by-Room Selection'
            : `${dispName} Package (${
                wholeHomeSelection.protection === 'With PVC'
                  ? 'With Optional 6mm PVC'
                  : 'Without optional PVC'
              })`
        } at ${formatINR(calc.grandTotal)} is saved. You can adjust your choices and save again.`
      );
      return true;
    } catch (error) {
      setSelectionSaveError(error instanceof Error ? error.message : 'Could not save your selection. Please try again.');
      return false;
    } finally {
      selectionSaveInFlight.current = false;
      setSavingPackage(false);
    }
  };

  const handleReviewAndPay = async () => {
    if (selectionIsBusy) return;
    setReviewingPayment(true);
    const saved = await handleCustomerFinalSave();
    setReviewingPayment(false);
    if (!saved) return;
    const checkout = document.getElementById('booking-checkout');
    checkout?.scrollIntoView({ block: 'start', behavior: 'instant' });
    checkout?.focus({ preventScroll: true });
  };

  const closeLineEditor = () => {
    setIsEditingLines(false);
    setLineSaveError('');
  };

  const openLineEditor = () => {
    const next = structuredClone(draft);
    next.quote = beginQuotationEdit(next.quote,indiaDate());
    setEditableDraft(next);
    setLineSaveError('');
    setIsEditingLines(true);
    requestAnimationFrame(() => document.getElementById('inline-quotation-editor')?.scrollIntoView({block:'start'}));
  };

  const handleSaveEditedLines = async () => {
    if (!canEditLines || !onUpdateQuoteDraft || savingLines) return;
    setSavingLines(true);
    setLineSaveError('');
    try {
      await onUpdateQuoteDraft(editableDraft);
      closeLineEditor();
    } catch (error) {
      setLineSaveError(error instanceof Error ? error.message : 'Could not save the edited quotation. Please try again.');
    } finally {
      setSavingLines(false);
    }
  };

  const handleCopyText = async (label: string, text: string) => {
    setBankCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBankField(label);
      setTimeout(() => setCopiedBankField(null), 1800);
    } catch {
      setBankCopyError('Your browser could not copy this detail. Please select and copy the displayed value.');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) { setPaymentFeedback({type:'error',message:'This is a preview. Publish the quotation before requesting payment.'}); return; }
    setPaymentFeedback(null);
    if (submittingPayment) return;
    if (!paymentImage) {
      setPaymentFeedback({ type: 'error', message: 'Choose a payment screenshot first.' });
      return;
    }
    if (!acceptedTerms || !paymentAmountIsValid || milestones.requiresOwnerSmallOrderRule) {
      setPaymentFeedback({ type: 'error', message: 'Confirm the payment amount, package and terms before sharing.' });
      return;
    }
    if (paymentMethod === 'UPI / PhonePe' && !upiAmountWithinLimit) {
      setPaymentFeedback({ type: 'error', message: `The UPI limit is ${formatINR(upiLimit)} per payment. For a larger payment, select NEFT / RTGS / IMPS and use the bank details.` });
      return;
    }
    if (showManualPaymentShare) {
      const text = `Payment for ${draft.quote.number}: ${formatINR(paymentAmount)}. I will attach my payment screenshot. ${window.location.origin}/q/${publicId}`;
      window.open(`https://wa.me/${catalogue.company.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      setPaymentFeedback({ type: 'success', message: 'Attach the downloaded screenshot in WhatsApp and tap Send. UME will confirm payment after checking the bank credit.' });
      return;
    }
    setSubmittingPayment(true);
    try {
      // Start file sharing directly from the tap, before any save/network await.
      const result = await sharePaymentImage(paymentImage, draft.quote.number || 'quotation', navigator, window.isSecureContext);
      if (result === 'cancelled') {
        setPaymentFeedback({type:'info',message:'Sharing cancelled. Your screenshot is still attached. Tap “I’ve made the payment” when you’re ready to try again.'});
        return;
      }
      if (result !== 'shared') {
        setShowManualPaymentShare(true);
        setPaymentFeedback({ type: 'error', message: result === 'insecure'
          ? 'Open this quotation using its secure HTTPS link to share the screenshot. You can also use the attachment steps below.'
          : 'This browser could not open image sharing. Download the screenshot, then use the button below to open WhatsApp and attach it.' });
        return;
      }
      setPaymentFeedback({ type: 'success', message: `Your screenshot is ready in your share app. Choose WhatsApp, select ${catalogue.company.proprietor} (${catalogue.company.phone}) and tap Send. UME will confirm payment after checking the bank credit.` });
      try {
        await onSaveSelection({ wholeHomeSelection, mixByRoom, roomSelections, selectedOptionalPointers, acceptedTerms: true, explicitCustomerSave: true });
        setSavedByCustomer(true);
        setHasUnsavedChanges(false);
      } catch {
        setSelectionSaveError('Please save your package again; its latest changes could not be saved.');
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) { setFeedbackStatus({ok:false,message:'This is an unpublished preview. Customer requests become available after publication.'}); return; }
    setFeedbackStatus(null);
    if (!feedbackMessage.trim()) {
      setFeedbackStatus({
        ok: false,
        message: 'Please type your requested changes or feedback below.',
      });
      return;
    }
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/quotes/${publicId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: feedbackTopic,
          message: feedbackMessage.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.entry) {
        setFeedbackList((prev) => [data.entry, ...prev]);
        setFeedbackMessage('');
        setFeedbackStatus({
          ok: true,
          message:
            `Your change request has been saved for ${catalogue.company.proprietor} to review.`,
        });
      } else {
        setFeedbackStatus({
          ok: false,
          message: data.error || 'Could not submit your request. Please try again.',
        });
      }
    } catch {
      setFeedbackStatus({
        ok: false,
        message: 'Network error while sending feedback.',
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const activePackageDisplayName = getPackageDisplayName(wholeHomeSelection.grade);
  const activePackageSummaryText = mixByRoom
    ? 'Custom Room-Wise Mix'
    : `${activePackageDisplayName} Package${
        wholeHomeSelection.protection === 'With PVC' ? ' (+6mm PVC Shield)' : ''
      }`;
  // The owner may guide the customer to one package, but the customer's live
  // selection is always the only card that receives the selected treatment.
  const ownerRecommendedGrade = draft.quote.show_recommended_package
    ? (defaultSentPackage?.grade || draft.recommended?.grade || null)
    : null;

  const displayedBreakdownRooms = useMemo(() => {
    if (activeBreakdownRoomIdx === 'ALL') {
      return displayRooms;
    }
    const found = displayRooms.find((r) => r.roomIndex === activeBreakdownRoomIdx);
    return found ? [found] : displayRooms.slice(0, 1);
  }, [displayRooms, activeBreakdownRoomIdx]);

  // Pre-compute whole-home totals for all tiers under active PVC setting
  const sideBySideWholeHomeTotals = useMemo(() => {
    const p = wholeHomeSelection.protection;
    const f = wholeHomeSelection.finish;
    return {
      Base: snapshot.baseWholeHomeTotals[makeComboKey('Base', p, f)] || 0,
      Normal: snapshot.baseWholeHomeTotals[makeComboKey('Normal', p, f)] || 0,
      Premium: snapshot.baseWholeHomeTotals[makeComboKey('Premium', p, f)] || 0,
    };
  }, [snapshot, wholeHomeSelection.protection, wholeHomeSelection.finish]);

  const whatsappChangeRequestUrl = useMemo(() => {
    const customNote = feedbackMessage.trim()
      ? `Requested Change (${feedbackTopic}): ${feedbackMessage.trim()}`
      : `Topic: ${feedbackTopic} — Please call/message me to discuss minor changes in my quotation.`;
    const text = [
      `Hello ${catalogue.company.proprietor} (${catalogue.company.brandName}),`,
      `Quotation Ref: ${draft.quote.number}`,
      `Client: ${draft.customer.name} (${draft.customer.site})`,
      `Selected Package: ${activePackageSummaryText}`,
      `Estimated Total: ${formatINR(calc.grandTotal)}`,
      customNote,
    ].join('\n');
    return `https://wa.me/${catalogue.company.whatsapp}?text=${encodeURIComponent(text)}`;
  }, [
    catalogue.company.proprietor,
    catalogue.company.brandName,
    catalogue.company.whatsapp,
    draft.quote.number,
    revision,
    draft.customer.name,
    draft.customer.site,
    activePackageSummaryText,
    calc.grandTotal,
    feedbackTopic,
    feedbackMessage,
  ]);

  if (workOrder) return <WorkOrderView publicId={publicId} revision={revision} draft={draft} snapshot={snapshot} catalogue={catalogue} approvedDiscountRupees={approvedDiscountRupees} verifiedPaidRupees={verifiedPaidRupees} workOrder={workOrder} isPreview={isPreview} initialPrintPreview={initialPrintPreview}/>;

  return (
    <div className="customer-quotation min-h-screen bg-[#F4F1EA] text-[#18221D] pb-16">
      {/* Screen-only Action Bar when viewing Print Preview */}
      {showPrintSheet && (
        <div className="bg-[#1C3A2F] text-white border-b border-[#2D5446] sticky top-0 z-30 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px]">
              <FileText className="w-4 h-4 text-[#E6CBA8]" />
              <span>
                Quotation PDF · {draft.quote.number}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowPrintSheet(false)}
                className="px-3.5 py-1.5 rounded-lg text-[13px] font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                ← Back to Interactive Quotation
              </button>
              <button
                type="button"
                onClick={() => void printQuotation()}
                className="px-4 py-1.5 rounded-lg text-[13px] font-bold bg-[#E6CBA8] hover:bg-[#DFC099] text-[#142920] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save A4 PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Superseded Revision Notice */}
      {isOwner && supersededByPublicId && (
        <div className="bg-[#FFFBEB] border-b border-[#D97706] px-4 py-3 no-print">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#92400E]">
            <span>
              <strong>Newer Revision Available:</strong> This is Revision {revision}, which has been superseded by an updated quotation revision.
            </span>
            {onSwitchQuote && (
              <button
                type="button"
                onClick={() => onSwitchQuote(supersededByPublicId)}
                className="px-3 py-1.5 bg-[#D97706] text-white font-bold rounded-lg cursor-pointer"
              >
                Open Latest Revision →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable A4 Sheet (Always rendered for @media print, or on screen when toggled) */}
      {showPrintSheet && <div className="quotation-print-shell block py-8 px-4">
        <PrintableA4Sheet
          isPreview={isPreview}
          publicId={publicId}
          revision={revision}
          draft={draft}
          snapshot={snapshot}
          catalogue={catalogue}
          wholeHomeSelection={wholeHomeSelection}
          mixByRoom={mixByRoom}
          roomSelections={roomSelections}
          selectedOptionalPointers={selectedOptionalPointers}
          approvedDiscountRupees={approvedDiscountRupees}
          verifiedPaidRupees={verifiedPaidRupees}
          onReturnToInteractiveSelector={() => setShowPrintSheet(false)}
        />
      </div>}

      {/* INTERACTIVE CUSTOMER QUOTATION STUDIO */}
      {!showPrintSheet && (
        <div className="customer-interactive max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 no-print">
          {/* 1. CLEAN MINIMAL HERO SECTION WITH SINGLE 3-PACKAGE SELECTOR (NO DUPLICATE LEFT SIDEBAR) */}
          <section
            id="choose-package"
            className="quote-introduction bg-[#EAE3D5] border border-[#DDD4C3] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            {/* Top Client Header Row */}
            <div className="quote-client-header flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#D8CEBC] pb-5">
              <div className="space-y-2 max-w-3xl">
                <div className="quote-reference flex flex-wrap items-center gap-2 text-[13px] font-bold text-[#1C3A2F]">
                  <span className="font-sans">{draft.quote.number || 'Quotation'}</span>
                  {isOwner && <span>· Revision {revision}</span>}
                  {savedByCustomer && !hasUnsavedChanges && (
                    <span className="quote-saved-status">
                      <CheckCircle2 size={14} aria-hidden="true" /> Selection saved
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18221D]">
                  Prepared for {draft.customer.name || 'Valued Client'}
                </h1>

                <div className="quote-client-meta flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#4A524D]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#18221D]">
                    <MapPin className="w-3.5 h-3.5 text-[#1C3A2F] shrink-0" />
                    {draft.customer.site}
                  </span>
                  {draft.customer.phone && (
                    <span className="font-sans tabular-nums">
                      Mobile: <strong>{draft.customer.phone}</strong>
                    </span>
                  )}
                  {draft.quote.date && <span className="font-sans tabular-nums">Issued: <strong>{formatQuotationDate(draft.quote.date)}</strong></span>}
                  {draft.quote.valid_until && <span className="font-sans tabular-nums">Valid until: <strong>{formatQuotationDate(draft.quote.valid_until)}</strong></span>}
                </div>
              </div>

              <div className="quote-header-actions flex flex-wrap items-center gap-2 shrink-0">
                {canEditLines && (
                  <button
                    type="button"
                    disabled={savingLines}
                    onClick={isEditingLines ? closeLineEditor : openLineEditor}
                    className={`px-3.5 py-2 rounded-xl text-[13px] font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      isEditingLines
                        ? 'bg-[#1C3A2F] text-[#E6CBA8] border-[#1C3A2F]'
                        : 'bg-white hover:bg-[#FAF8F4] text-[#18221D] border-[#C9BFA8]'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingLines ? 'Close Line Editor' : 'Edit Quotation Lines'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPrintSheet(true)}
                  className="quote-pdf-button px-4 py-2 bg-white border border-[#C9BFA8] text-[#1C3A2F] rounded-xl text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>View PDF</span>
                </button>
              </div>
            </div>

            {estimateNote && (
              <details className="quote-estimate-disclosure">
                <summary><FileText size={18} aria-hidden="true"/><span><strong>{estimateBasisLabel || 'Quotation note'}</strong><small>{draft.quote.is_floor_plan_estimate === true || draft.quote.estimate_basis === 'floor_plan' ? 'Prices and quantities may change after the site visit. View details.' : 'View the full quotation note.'}</small></span><ChevronDown size={16} aria-hidden="true"/></summary>
                <p>{estimateNote}</p>
              </details>
            )}

            <p className="text-[13px] font-semibold">{materialWording(catalogue).materialsAndLabour}</p>
            {/* Choose Your Package (Shown ONCE right here in the Hero Section) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#18221D]">
                    Choose your package
                  </h2>
                  <p className="text-[13px] text-[#4A524D]">
                    Compare packages for your home, then refine each room below. Prices update as you choose.
                  </p>
                </div>
                <span className="text-[13px] font-semibold text-[#1C3A2F]">
                  Inside liner and outside 1.0 mm laminate included
                </span>
              </div>

              <div className="package-choice-grid grid grid-cols-1 xl:grid-cols-3 gap-4">
                {ALL_GRADES.map((g) => {
                  const dispName = getPackageDisplayName(g);
                  const isActive = !mixByRoom && wholeHomeSelection.grade === g;
                  const isOwnerRecommended = ownerRecommendedGrade === g;
                  const amt = sideBySideWholeHomeTotals[g];
                  const gInfo = catalogue.grades[g];

                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        applyWholeHomeChange({
                          ...wholeHomeSelection,
                          grade: g,
                          brand_preference:
                            catalogue.grades[g].approvedBrands[0]?.name || null,
                        })
                      }
                      aria-pressed={isActive}
                      disabled={selectionIsBusy}
                      className={`package-choice p-4 rounded-2xl border text-left flex items-center gap-4 cursor-pointer ${
                        isActive
                          ? 'bg-[#1C3A2F] text-white border-2 border-[#1C3A2F]'
                          : isOwnerRecommended
                          ? 'bg-[#FFFCF6] hover:bg-white text-[#18221D] border-[#B69258]'
                          : 'bg-[#FAF8F4] hover:bg-white text-[#18221D] border-[#D8CEBC]'
                      }`}
                    >
                      <div
                        className={`package-choice-image w-20 h-20 rounded-xl overflow-hidden shrink-0 border ${
                          isActive
                            ? 'border-[#E6CBA8]/60 bg-[#22493A]'
                            : 'border-[#DFD5C3] bg-[#F3EDE0]'
                        }`}
                      >
                        <img
                          src={getPackageThumbnailUrl(g)}
                          alt={`${dispName} interior package — cabinetry and material detail`}
                          width={640}
                          height={420}
                          className="w-full h-full object-cover block"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`package-choice-title text-sm font-bold shrink-0 ${
                              isActive ? 'text-[#E6CBA8]' : 'text-[#18221D]'
                            }`}
                          >
                            {dispName} Package
                          </span>
                          <span className="inline-flex items-center gap-1.5 shrink-0">
                            {isOwnerRecommended && (
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                isActive
                                  ? 'bg-[#E6CBA8] text-[#142920]'
                                  : 'bg-[#F0E3C8] text-[#76541C]'
                              }`}>
                                Recommended
                              </span>
                            )}
                            <span
                              className={`w-5 h-5 rounded-full inline-flex items-center justify-center ${
                                isActive
                                  ? 'bg-[#E6CBA8] text-[#142920]'
                                  : 'border border-[#B8B0A0] bg-white'
                              }`}
                            >
                              {isActive && <Check className="w-3.5 h-3.5" />}
                            </span>
                          </span>
                        </div>

                        <PackageTierCopy grade={g}/>
                        <PackageWarrantyLabel grade={gInfo}/>

                        <p
                          className={`package-choice-price text-lg font-sans font-bold tabular-nums mt-1 ${
                            isActive ? 'text-white' : 'text-[#1C3A2F]'
                          }`}
                        >
                          {formatINR(amt)}
                        </p>

                        <p
                          className={`text-[11px] font-semibold mt-1 ${
                            isActive ? 'text-[#E6CBA8]' : 'text-[#1C3A2F]'
                          }`}
                        >
                          {gInfo.termiteProofBadge}
                        </p>

                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <PlywoodSpecifications catalogue={catalogue} grades={ALL_GRADES} selectedGrade={mixByRoom?null:wholeHomeSelection.grade}/>
          </section>

          {selectionSaveError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {selectionSaveError}
            </div>
          )}
          {/* Save Confirmation Banner when Customer Saves Package */}
          {saveToastMessage && (
            <div role="status" aria-live="polite" className="p-4 bg-[#E4EFE7] border-2 border-[#1C3A2F] rounded-xl flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#1C3A2F] font-bold shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
                <span>{saveToastMessage}</span>
              </div>
              <a
                href="#booking-checkout"
                className="px-4 py-2 bg-[#1C3A2F] text-[#E6CBA8] rounded-lg font-bold hover:bg-[#22493A] transition-colors"
              >
                Review payment details
              </a>
            </div>
          )}

          {/* 2. CLEAN TWO-COLUMN MAIN WORKSPACE (LEFT MAIN TABLE + RIGHT STICKY SUMMARY & OPTIONAL 6MM PVC) */}
          <div
            id="customise"
            className="quotation-workspace grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start"
          >
            {/* LEFT MAIN COLUMN: ROOM-BY-ROOM SELECTION & DETAILED ROOM BREAKDOWN */}
            <div className="space-y-6 min-w-0">
              {/* ROOM-BY-ROOM 3-PACKAGE COMPARISON & CUSTOMIZER */}
              <div
                id="room-matrix-customiser"
                className="bg-white border border-[#E5DFD3] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-[#18221D]">
                      Tailor each room
                    </h2>
                    <p className="text-[13px] text-[#5C645F] mt-0.5">
                      Compare <strong>{getPackageDisplayName('Base')}</strong>, <strong>{getPackageDisplayName('Normal')}</strong> and{' '}
                      <strong>{getPackageDisplayName('Premium')}</strong>. Choose a package and optional <strong>6 mm PVC</strong> protection for each room.
                    </p>
                  </div>

                  {mixByRoom && (
                    <button
                      type="button"
                      onClick={handleResetAllRoomsToWholeHome}
                      disabled={selectionIsBusy}
                      className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#E5DFD3] border border-[#D5CFC4] rounded-lg text-[13px] font-bold text-[#18221D] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset All Rooms to {activePackageDisplayName}
                    </button>
                  )}
                </div>

                {/* Room-by-Room Side-by-Side Table */}
                <div className="overflow-x-auto border border-[#E5DFD3] rounded-xl">
                  <table className="room-comparison-table w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#1C3A2F] text-white text-[11px]">
                        <th className="py-3 px-3.5 font-semibold whitespace-nowrap">
                          Room & Units
                        </th>
                        <th className="py-3 px-3 font-semibold whitespace-nowrap">
                          Room Package & +PVC Add-On
                        </th>
                        <th className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                          {getPackageDisplayName('Base')}
                        </th>
                        <th className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                          {getPackageDisplayName('Normal')}
                        </th>
                        <th className="py-3 px-3.5 text-right font-semibold whitespace-nowrap">
                          {getPackageDisplayName('Premium')} (BWP)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4D8]">
                      {displayRooms.map((room) => {
                        const rSel = roomSelections[room.roomIndex] || wholeHomeSelection;
                        const baseItemCount = selectedRoomItems(room,selectedOptionalPointers).length;
                        const unselectedOptional=room.items.length-baseItemCount;

                        const stdRoomAmt =
                          selectedRoomPackageAmount(room,{...rSel,grade:'Base'},selectedOptionalPointers);
                        const normRoomAmt =
                          selectedRoomPackageAmount(room,{...rSel,grade:'Normal'},selectedOptionalPointers);
                        const premRoomAmt =
                          selectedRoomPackageAmount(room,{...rSel,grade:'Premium'},selectedOptionalPointers);

                        const isPvcAdded = rSel.protection === 'With PVC';

                        return (
                          <tr
                            key={room.roomIndex}
                            className="hover:bg-[#FAF8F4] transition-colors"
                          >
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBreakdownRoomIdx(room.roomIndex);
                                  document
                                    .getElementById('room-breakdown')
                                    ?.scrollIntoView({ behavior: 'instant' });
                                }}
                                className="text-left group cursor-pointer"
                              >
                                <p className="font-bold text-[#18221D] group-hover:text-[#1C3A2F] leading-tight text-[13px]">
                                  {room.name}
                                </p>
                                <p className="text-[11px] text-[#5C645F] mt-0.5">
                                  {baseItemCount} {baseItemCount === 1 ? 'Unit' : 'Units'}{unselectedOptional?` · ${unselectedOptional} optional`:''} · View Items →
                                </p>
                              </button>
                            </td>

                            {/* Room-Wise Package Selection + Add-On PVC Button (Shifted to Left Side Before Prices) */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="room-selection-controls flex flex-col items-start gap-2">
                                <select
                                  aria-label={`${room.name} Package Selection`}
                                  disabled={selectionIsBusy}
                                  value={rSel.grade}
                                  onChange={(e) =>
                                    handleRoomSelectionChange(room.roomIndex, {
                                      grade: e.target.value as PlywoodGrade,
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-white border border-[#D8D0C2] rounded-lg text-[13px] font-bold text-[#18221D] focus:outline-none focus:border-[#1C3A2F] cursor-pointer"
                                >
                                  {ALL_GRADES.map((g) => (
                                    <option key={g} value={g}>
                                      {getPackageDisplayName(g)} Package
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  aria-label={`${room.name} Add-On 6mm PVC`}
                                  aria-pressed={isPvcAdded}
                                  disabled={selectionIsBusy}
                                  onClick={() =>
                                    handleRoomSelectionChange(room.roomIndex, {
                                      protection: isPvcAdded ? 'Standard' : 'With PVC',
                                    })
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                    isPvcAdded
                                      ? 'bg-[#1C3A2F] text-[#E6CBA8] border-[#1C3A2F]'
                                      : 'bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#4A524D] border-[#D8D0C2]'
                                  }`}
                                >
                                  {isPvcAdded ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>+6mm PVC Added</span>
                                    </>
                                  ) : (
                                    <span>+ Add 6mm PVC</span>
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Standard rate */}
                            <td className="py-3 px-3 text-right font-sans tabular-nums whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRoomSelectionChange(room.roomIndex, { grade: 'Base' })
                                }
                                disabled={selectionIsBusy}
                                aria-pressed={rSel.grade === 'Base'}
                                aria-label={`Select ${getPackageDisplayName('Base')} package for ${room.name}`}
                                className={`px-2.5 py-1 rounded-md text-[13px] transition-colors cursor-pointer ${
                                  rSel.grade === 'Base'
                                    ? 'bg-[#1C3A2F] text-white font-bold'
                                    : 'text-[#4A524D] hover:bg-[#EAE3D5]'
                                }`}
                              >
                                {formatINR(stdRoomAmt)}
                              </button>
                            </td>

                            {/* Premium rate */}
                            <td className="py-3 px-3 text-right font-sans tabular-nums whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRoomSelectionChange(room.roomIndex, { grade: 'Normal' })
                                }
                                disabled={selectionIsBusy}
                                aria-pressed={rSel.grade === 'Normal'}
                                aria-label={`Select ${getPackageDisplayName('Normal')} package for ${room.name}`}
                                className={`px-2.5 py-1 rounded-md text-[13px] transition-colors cursor-pointer ${
                                  rSel.grade === 'Normal'
                                    ? 'bg-[#1C3A2F] text-white font-bold'
                                    : 'text-[#4A524D] hover:bg-[#EAE3D5]'
                                }`}
                              >
                                {formatINR(normRoomAmt)}
                              </button>
                            </td>

                            {/* Luxury rate */}
                            <td className="py-3 px-3.5 text-right font-sans tabular-nums whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRoomSelectionChange(room.roomIndex, { grade: 'Premium' })
                                }
                                disabled={selectionIsBusy}
                                aria-pressed={rSel.grade === 'Premium'}
                                aria-label={`Select ${getPackageDisplayName('Premium')} package for ${room.name}`}
                                className={`px-2.5 py-1 rounded-md text-[13px] transition-colors cursor-pointer ${
                                  rSel.grade === 'Premium'
                                    ? 'bg-[#1C3A2F] text-[#E6CBA8] font-bold'
                                    : 'text-[#18221D] font-semibold hover:bg-[#EAE3D5]'
                                }`}
                              >
                                {formatINR(premRoomAmt)}
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Side-by-Side Whole-Home Totals Comparison Row */}
                      <tr className="bg-[#FAF8F4] border-t-2 border-[#D8CEBC] font-bold text-[13px]">
                        <td className="py-3.5 px-3.5 text-[#18221D] whitespace-nowrap">
                          All-Rooms Package Total
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E4EFE7] text-[#1C3A2F] text-[11px] font-bold">
                            <span>Selected Total:</span>
                            <span className="font-sans tabular-nums">
                              {formatINR(calc.baseScopeTotal)}
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-sans tabular-nums whitespace-nowrap">
                          <span
                            className={
                              !mixByRoom && wholeHomeSelection.grade === 'Base'
                                ? 'px-2.5 py-1 rounded-md bg-[#1C3A2F] text-white font-bold'
                                : 'text-[#4A524D]'
                            }
                          >
                            {formatINR(sideBySideWholeHomeTotals.Base)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-sans tabular-nums whitespace-nowrap">
                          <span
                            className={
                              !mixByRoom && wholeHomeSelection.grade === 'Normal'
                                ? 'px-2.5 py-1 rounded-md bg-[#1C3A2F] text-white font-bold'
                                : 'text-[#4A524D]'
                            }
                          >
                            {formatINR(sideBySideWholeHomeTotals.Normal)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-sans tabular-nums whitespace-nowrap">
                          <span
                            className={
                              !mixByRoom && wholeHomeSelection.grade === 'Premium'
                                ? 'px-2.5 py-1 rounded-md bg-[#1C3A2F] text-[#E6CBA8] font-bold'
                                : 'text-[#1C3A2F]'
                            }
                          >
                            {formatINR(sideBySideWholeHomeTotals.Premium)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Optional Add-Ons (If any exist in quote) */}
                {allOptionalItems.length > 0 && (
                  <div className="pt-1 space-y-2">
                    <p className="text-[13px] font-bold uppercase tracking-wider text-[#5C645F]">
                      Optional Add-On Units (Tick to Include)
                    </p>
                    <div className="space-y-2">
                      {allOptionalItems.map(({ pointer, roomName, roomIndex, item }) => {
                        const isChecked = selectedOptionalPointers.includes(pointer);
                        const rSel = roomSelections[roomIndex] || wholeHomeSelection;
                        const optCombo = makeComboKey(
                          rSel.grade,
                          rSel.protection,
                          rSel.finish
                        );
                        const optAmt = item.exactAmounts[optCombo] || 0;
                        return (
                          <label
                            key={pointer}
                            className={`optional-item-choice p-3 rounded-xl border flex items-center justify-between gap-3 text-[13px] cursor-pointer ${
                              isChecked
                                ? 'bg-[#F6FAF7] border-[#1C3A2F]'
                                : 'bg-[#FAF8F4] border-[#E5DFD3]'
                            }`}
                          >
                            <div className="optional-item-description flex items-start gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={selectionIsBusy}
                                onChange={() => handleToggleOptionalItem(pointer)}
                                className="w-4 h-4 accent-[#1C3A2F] rounded"
                              />
                              <div>
                                <span className="font-bold text-[#18221D]">
                                  {roomName} — {item.name}
                                </span>
                                <span className="text-[#5C645F] ml-2">({item.sizeText})</span>
                              </div>
                            </div>
                            <span className="optional-item-amount font-sans font-bold text-[#1C3A2F] tabular-nums shrink-0 whitespace-nowrap">
                              +{formatINR(optAmt)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* DETAILED ROOM BREAKDOWN (CLEAN ITEM NAMES & SUB-LINES + INLINE LINE EDITOR) */}
              <section
                id="room-breakdown"
                className="bg-white border border-[#E5DFD3] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#18221D]">
                      Furniture details
                    </h2>
                    <p className="text-[13px] text-[#5C645F] mt-0.5">
                      Furniture details, dimensions, area and package prices.
                    </p>
                  </div>

                  {/* Room Filter Pill Tabs */}
                  <div className="breakdown-room-tabs flex flex-wrap items-center gap-1.5" role="group" aria-label="Show room specifications">
                    {displayRooms.map((r) => {
                      const isActive = activeBreakdownRoomIdx === r.roomIndex;
                      return (
                        <button
                          key={r.roomIndex}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setActiveBreakdownRoomIdx(r.roomIndex)}
                          className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#1C3A2F] text-white'
                              : 'bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#4A524D] border border-[#E5DFD3]'
                          }`}
                        >
                          {r.name}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      aria-pressed={activeBreakdownRoomIdx === 'ALL'}
                      onClick={() => setActiveBreakdownRoomIdx('ALL')}
                      className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                        activeBreakdownRoomIdx === 'ALL'
                          ? 'bg-[#1C3A2F] text-white'
                          : 'bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#4A524D] border border-[#E5DFD3]'
                      }`}
                    >
                      All rooms
                    </button>
                  </div>
                </div>

                {canEditLines && isEditingLines ? (
                  <fieldset id="inline-quotation-editor" className="min-w-0 space-y-4 scroll-mt-24" disabled={savingLines} aria-busy={savingLines}>
                    <p className="text-sm text-[#2D4F3E]">Edit the rooms and furniture below. Saving publishes a revision to the existing customer link.</p>
                    <RoomScopeEditor draft={editableDraft} catalogue={catalogue} onChange={setEditableDraft}/>
                    {lineSaveError && <p className="form-error" role="alert">{lineSaveError}</p>}
                    <div className="owner-publish-actions">
                      <button type="button" onClick={closeLineEditor}>Cancel</button>
                      <button type="button" className="owner-action-primary" onClick={handleSaveEditedLines}>{savingLines ? 'Saving…' : 'Save Line Changes'}</button>
                    </div>
                  </fieldset>
                ) : (
                <div className="space-y-6">
                  {displayedBreakdownRooms.map((room) => {
                    const rSel =
                      mixByRoom && roomSelections[room.roomIndex]
                        ? roomSelections[room.roomIndex]
                        : wholeHomeSelection;
                    const rSub = calc.roomBreakdownTotals[room.roomIndex]?.total ?? 0;
                    const activeGradeLabel = getPackageDisplayName(rSel.grade);

                    const stdRoomTotal =
                      room.roomTotals[makeComboKey('Base', rSel.protection, rSel.finish)] || 0;
                    const normRoomTotal =
                      room.roomTotals[makeComboKey('Normal', rSel.protection, rSel.finish)] || 0;
                    const premRoomTotal =
                      room.roomTotals[makeComboKey('Premium', rSel.protection, rSel.finish)] || 0;

                    return (
                      <div
                        key={room.roomIndex}
                        className="border border-[#E5DFD3] rounded-xl overflow-hidden"
                      >
                        <div className="bg-[#FAF8F4] px-4 py-3 border-b border-[#E5DFD3] flex flex-wrap items-center justify-between gap-2 text-[13px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[#18221D] text-sm">
                              {room.name}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-[#E4EFE7] text-[#1C3A2F] font-bold">
                              Selected: {activeGradeLabel}
                              {rSel.protection === 'With PVC' ? ' (+6mm PVC)' : ''}
                            </span>
                          </div>
                          <span className="font-sans font-bold text-sm text-[#1C3A2F] tabular-nums">
                            Room Subtotal: {formatINR(rSub)}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="detail-price-table w-full min-w-[680px] text-left border-collapse text-[13px]">
                            <thead>
                              <tr className="bg-[#EFECE3] text-[#18221D] border-b border-[#E5DFD3] text-[11px]">
                                <th className="py-3 px-4 font-bold w-[40%] min-w-[240px]">
                                  Furniture and details
                                </th>
                                <th className="py-3 px-2.5 font-bold whitespace-nowrap">
                                  Dimensions
                                  <span className="block font-normal">Height × Width</span>
                                </th>
                                <th className="py-3 px-2.5 text-right font-bold whitespace-nowrap">
                                  Area / Qty
                                </th>
                                <th
                                  className={`py-3 px-2.5 text-right font-bold whitespace-nowrap ${
                                    rSel.grade === 'Base' ? 'bg-[#E4EFE7] text-[#1C3A2F]' : ''
                                  }`}
                                >
                                  {getPackageDisplayName('Base')}
                                </th>
                                <th
                                  className={`py-3 px-2.5 text-right font-bold whitespace-nowrap ${
                                    rSel.grade === 'Normal' ? 'bg-[#E4EFE7] text-[#1C3A2F]' : ''
                                  }`}
                                >
                                  {getPackageDisplayName('Normal')}
                                </th>
                                <th
                                  className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                                    rSel.grade === 'Premium' ? 'bg-[#E4EFE7] text-[#1C3A2F]' : ''
                                  }`}
                                >
                                  {getPackageDisplayName('Premium')} (BWP)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EAE4D8]">
                              {room.items
                                .filter((i) => !i.optional)
                                .map((item) => {
                                  const stdCombo = makeComboKey('Base', rSel.protection, rSel.finish);
                                  const normCombo = makeComboKey('Normal', rSel.protection, rSel.finish);
                                  const premCombo = makeComboKey('Premium', rSel.protection, rSel.finish);

                                  const stdRate = item.unitRates[stdCombo] || 0;
                                  const normRate = item.unitRates[normCombo] || 0;
                                  const premRate = item.unitRates[premCombo] || 0;

                                  const stdAmt = item.exactAmounts[stdCombo] || 0;
                                  const normAmt = item.exactAmounts[normCombo] || 0;
                                  const premAmt = item.exactAmounts[premCombo] || 0;

                                  const uLabel =
                                    item.unit === 'sq_ft'
                                      ? 'sq.ft'
                                      : item.unit === 'running_ft'
                                      ? 'rft'
                                      : item.unit;

                                  const {name:cleanTitle,specification:cleanDescription} = quotationFurnitureText(item,room.name);

                                  return (
                                    <tr
                                      key={`${room.roomIndex}-${item.itemIndex}`}
                                      className="hover:bg-[#FAF8F4]"
                                    >
                                      <td className="py-3.5 px-4">
                                        <p className="font-bold text-[#18221D] text-sm">{cleanTitle}</p>
                                        {furnitureRelationshipLabel(item,room.items)&&<p className="text-xs text-[#31513D] mt-0.5">{furnitureRelationshipLabel(item,room.items)}</p>}
                                        <p className="text-[13px] text-[#5C645F] mt-0.5 leading-relaxed">{cleanDescription}</p>
                                      </td>
                                      <td className="py-3.5 px-2.5 font-sans font-semibold text-[#18221D] tabular-nums whitespace-nowrap">
                                        {item.sizeText}
                                      </td>
                                      <td className="py-3.5 px-2.5 text-right font-sans font-semibold text-[#18221D] tabular-nums whitespace-nowrap">
                                        {item.unit === 'each' ? item.quantity + ' nos' : item.totalMeasure.toFixed(2) + ' ' + uLabel}
                                      </td>

                                      {/* Standard rate and amount */}
                                      <td
                                        className={`py-3.5 px-2.5 text-right font-sans tabular-nums whitespace-nowrap ${
                                          rSel.grade === 'Base'
                                            ? 'bg-[#F6FAF7] font-bold text-[#1C3A2F]'
                                            : 'text-[#4A524D]'
                                        }`}
                                      >
                                        <div>{formatINR(stdAmt)}</div>
                                        <div className="text-[10px] text-[#5C645F] font-normal">
                                          @{formatINR(stdRate,!Number.isInteger(stdRate))}/{uLabel}
                                        </div>
                                      </td>

                                      {/* Premium rate and amount */}
                                      <td
                                        className={`py-3.5 px-2.5 text-right font-sans tabular-nums whitespace-nowrap ${
                                          rSel.grade === 'Normal'
                                            ? 'bg-[#F6FAF7] font-bold text-[#1C3A2F]'
                                            : 'text-[#4A524D]'
                                        }`}
                                      >
                                        <div>{formatINR(normAmt)}</div>
                                        <div className="text-[10px] text-[#5C645F] font-normal">
                                          @{formatINR(normRate,!Number.isInteger(normRate))}/{uLabel}
                                        </div>
                                      </td>

                                      {/* Luxury rate and amount */}
                                      <td
                                        className={`py-3.5 px-3 text-right font-sans tabular-nums whitespace-nowrap ${
                                          rSel.grade === 'Premium'
                                            ? 'bg-[#F6FAF7] font-bold text-[#1C3A2F]'
                                            : 'text-[#18221D] font-semibold'
                                        }`}
                                      >
                                        <div>{formatINR(premAmt)}</div>
                                        <div className="text-[10px] text-[#5C645F] font-normal">
                                          @{formatINR(premRate,!Number.isInteger(premRate))}/{uLabel}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}

                              {/* Room Totals Row for all 3 Packages */}
                              <tr className="bg-[#FAF8F4] font-bold text-[13px] border-t border-[#D8CEBC]">
                                <td className="py-2.5 px-4 text-[#18221D]" colSpan={3}>
                                  {room.name} total (Standard, Premium and Luxury)
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-sans tabular-nums text-[#4A524D]">
                                  {formatINR(stdRoomTotal)}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-sans tabular-nums text-[#4A524D]">
                                  {formatINR(normRoomTotal)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-sans tabular-nums text-[#1C3A2F]">
                                  {formatINR(premRoomTotal)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </section>
            </div>

            {/* RIGHT STICKY SIDEBAR: YOUR QUOTATION + OPTIONAL 6MM PVC ON RIGHT SIDE + SAVE & LOCK CTA */}
            <div className="quotation-summary space-y-4 xl:sticky xl:top-24">
              {/* Dark Forest Green Card */}
              <div className="selection-overview bg-[#1C3A2F] text-white rounded-2xl p-5 sm:p-6 space-y-4 border border-[#2A5243]">
                <div>
                  <h2 className="text-sm font-semibold text-white/85">Your selected estimate</h2>
                  <p aria-live="polite" className="quotation-total text-3xl sm:text-4xl font-sans font-bold text-[#EED6B5] tabular-nums mt-1">
                    {formatINR(calc.grandTotal)}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/15 text-[13px] text-white/90">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-[#E6CBA8] shrink-0" />
                    <span className="min-w-0 break-words">
                      Package: <strong>{activePackageSummaryText}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-[#E6CBA8] shrink-0" />
                    <span>
                      Rooms: <strong>{snapshot.rooms.length}</strong> &nbsp;|&nbsp; Units:{' '}
                      <strong>{totalUnitsCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Optional package-level PVC protection. Individual scope is automatic. */}
                <div className="p-3.5 rounded-xl bg-white/10 border border-white/20 text-[13px] space-y-1.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={selectionIsBusy}
                      checked={mixByRoom
                        ? snapshot.rooms.every((room) => (roomSelections[room.roomIndex] || wholeHomeSelection).protection === 'With PVC')
                        : wholeHomeSelection.protection === 'With PVC'}
                      onChange={(e) => applyProtectionToAllRooms(e.target.checked ? 'With PVC' : 'Standard')}
                      className="w-4 h-4 mt-0.5 accent-[#E6CBA8] rounded shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-white">
                          Add 6 mm PVC protection to all rooms
                        </span>
                        <span className="px-1.5 py-0.5 bg-white/15 text-white/90 rounded text-[9px] font-bold uppercase">
                          Optional
                        </span>
                      </div>
                      <p className="text-[11px] text-white/85 leading-snug">
                        Applied automatically to the appropriate work in your selected rooms.
                      </p>
                      <p className="text-[11px] font-sans font-bold text-[#E6CBA8]">
                        +{formatINR(wholeHomePvcDeltaRupees)} for your selected scope
                      </p>
                    </div>
                  </label>
                </div>

                {/* CUSTOMER FINAL SAVE & LOCK BUTTON */}
                <button
                  id="final-save-package-btn"
                  type="button"
                  disabled={selectionIsBusy}
                  onClick={handleCustomerFinalSave}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#E6CBA8] hover:bg-[#DFC099] text-[#142920] text-[13px] sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>
                    {savingPackage
                      ? 'Saving selection…'
                      : 'Save selection'}
                  </span>
                </button>
                <p className="selection-save-caption text-xs text-white/85">
                  {hasUnsavedChanges ? 'Your changes are ready to save.' : savedByCustomer ? 'Your selection is saved. You can save it again anytime.' : 'Save your selection before reviewing payment.'}
                </p>
              </div>

              {/* White Quotation Summary Card */}
              <div className="bg-white border border-[#E5DFD3] rounded-2xl p-5 shadow-xs space-y-3 text-[13px]">
                <h3 className="text-sm font-bold text-[#18221D]">Quotation summary</h3>

                <div className="space-y-2 pt-1 border-t border-[#EAE4D8]">
                  <div className="flex items-center justify-between text-[#4A524D]">
                    <span>{activePackageSummaryText}</span>
                    <span className="font-sans font-semibold text-[#18221D] tabular-nums">
                      {formatINR(calc.baseScopeTotal)}
                    </span>
                  </div>

                  {calc.optionalSelectedTotal > 0 && (
                    <div className="flex items-center justify-between text-[#4A524D]">
                      <span>Selected Optional Add-Ons</span>
                      <span className="font-sans font-semibold text-[#18221D] tabular-nums">
                        +{formatINR(calc.optionalSelectedTotal)}
                      </span>
                    </div>
                  )}

                  {calc.discountRupees > 0 && (
                    <div className="flex items-center justify-between text-[#15803D]">
                      <span>Approved Flat Discount</span>
                      <span className="font-sans font-semibold tabular-nums">
                        -{formatINR(calc.discountRupees)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-[#EAE4D8] flex items-baseline justify-between">
                    <span className="text-sm font-bold text-[#18221D]">Grand Total</span>
                    <span className="text-base font-sans font-bold text-[#1C3A2F] tabular-nums">
                      {formatINR(calc.grandTotal)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#EAE4D8] flex items-center justify-between text-[11px] text-[#5C645F]">
                    <span>Order Confirmation Booking</span>
                    <strong className="font-sans text-[#1C3A2F] tabular-nums">
                      {formatINR(milestones.bookingRequired)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPrintSheet(true)}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl text-[13px] font-bold text-[#18221D] inline-flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#1C3A2F]" />
                  <span>Preview & download PDF</span>
                </button>

                <a
                  href={`https://wa.me/${catalogue.company.whatsapp}?text=${encodeURIComponent(
                    `Hello ${catalogue.company.proprietor}, I reviewed my UME Interiors Quotation (${draft.quote.number}) for ${draft.customer.name}. My selected configuration is ${activePackageSummaryText} with total ${formatINR(calc.grandTotal)}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl text-[13px] font-bold text-[#18221D] inline-flex items-center gap-2.5 transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#15803D]" />
                  <span>Chat on WhatsApp ({catalogue.company.phone})</span>
                </a>
              </div>
            </div>
          </div>

          {/* 3. EASY-TO-UNDERSTAND MILESTONE PAYMENT SCHEDULE, OFFICIAL SBI BANK ACCOUNT & ₹50,000 BOOKING */}
          <section
            id="booking-checkout"
            tabIndex={-1}
            aria-labelledby="booking-checkout-heading"
            className="bg-white border border-[#E5DFD3] rounded-2xl p-6 sm:p-7 space-y-6"
          >
            <div className="border-b border-[#EAE4D8] pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="booking-checkout-heading" className="text-xl font-bold text-[#18221D]">
                  Review & pay
                </h2>
                <p className="text-[13px] text-[#5C645F] mt-1">{activePackageSummaryText} · {snapshot.rooms.length} rooms</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-[#5C645F]">Selected Project Grand Total</p>
                <p className="text-xl font-sans font-bold text-[#1C3A2F] tabular-nums">
                  {formatINR(calc.grandTotal)}
                </p>
              </div>
            </div>

            {/* Clear Explanation Callout Box */}
            <div className="p-4 bg-[#E4EFE7] border border-[#1C3A2F]/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-[13px]">
              <div className="space-y-1 max-w-3xl">
                <p className="font-bold text-sm text-[#1C3A2F]">
                  Your {formatINR(milestones.bookingRequired)} booking counts toward the 50% advance
                </p>
                <p className="text-[#3D4741] leading-relaxed">
                  After bank verification, your <strong>{formatINR(milestones.bookingRequired)} booking</strong> is credited toward the <strong>{formatINR(milestones.advance50PercentTotal)} work-start advance</strong>. The remaining <strong>{formatINR(Math.max(0, milestones.advance50PercentTotal - milestones.bookingRequired))}</strong> is due before plywood dispatch. The booking is part of your quotation total.
                </p>
              </div>
              <div className="shrink-0 bg-white border border-[#C5DEC9] rounded-xl px-4 py-2.5 text-right font-sans tabular-nums">
                <p className="text-xs font-sans font-semibold text-[#5C645F]">
                  50% advance breakdown
                </p>
                <p className="text-[13px] text-[#18221D] mt-0.5">
                  {formatINR(milestones.bookingRequired)} Booking +{' '}
                  {formatINR(
                    Math.max(0, milestones.advance50PercentTotal - milestones.bookingRequired)
                  )}{' '}
                  Work-Start = <strong>{formatINR(milestones.advance50PercentTotal)} (50%)</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: 5-Stage Milestone Table + Official Bank Account */}
              <div className="payment-schedule-column lg:col-span-7 space-y-4">
                <details className="payment-schedule" open={showPaymentSchedule} onToggle={(event) => setShowPaymentSchedule(event.currentTarget.open)}>
                  <summary>Payment schedule <span>5 stages</span><ChevronDown size={18} aria-hidden="true" /></summary>
                <div className="border border-[#E5DFD3] rounded-xl overflow-hidden overflow-x-auto">
                  <table className="milestone-table w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#1C3A2F] text-white">
                        <th className="py-3 px-3.5 font-semibold">
                          Stage & What Happens at Site
                        </th>
                        <th className="py-3 px-2.5 text-right font-semibold">
                          Stage Instalment
                        </th>
                        <th className="py-3 px-2.5 text-right font-semibold">
                          Cumulative Target
                        </th>
                        <th className="py-3 px-3.5 text-right font-semibold text-[#E6CBA8]">
                          Due After Credit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4D8]">
                      {/* Step 1 */}
                      <tr className="bg-[#F6FAF7]">
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-[#1C3A2F]">
                            Step 1 · Order Confirmation Booking
                          </p>
                          <p className="text-[11px] text-[#4A524D] mt-0.5">
                            Pay now to lock package rates & schedule site markings (Included in 50% advance)
                          </p>
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans font-bold text-[#1C3A2F] tabular-nums whitespace-nowrap">
                          {formatINR(milestones.bookingRequired)}
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans text-[#4A524D] tabular-nums whitespace-nowrap">
                          {formatINR(milestones.bookingRequired)}
                          <div className="text-[10px] text-[#5C645F]">Booking Token</div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-sans font-bold text-[#1C3A2F] tabular-nums whitespace-nowrap">
                          {formatINR(Math.max(0, milestones.bookingRequired - verifiedPaidRupees))}
                        </td>
                      </tr>

                      {/* Step 2 */}
                      <tr>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-[#18221D]">
                            Step 2 · Balance of 50% Work-Start Advance
                          </p>
                          <p className="text-[11px] text-[#4A524D] mt-0.5">
                            50% Advance ({formatINR(milestones.advance50PercentTotal)}) minus {formatINR(milestones.bookingRequired)} booking · Due before plywood dispatch
                          </p>
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans font-bold tabular-nums whitespace-nowrap">
                          {formatINR(
                            Math.max(
                              0,
                              milestones.advance50PercentTotal - milestones.bookingRequired
                            )
                          )}
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans text-[#4A524D] tabular-nums whitespace-nowrap">
                          {formatINR(milestones.advance50PercentTotal)}
                          <div className="text-[10px] font-semibold text-[#1C3A2F]">50% Reached</div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-sans font-bold tabular-nums whitespace-nowrap">
                          {formatINR(milestones.advanceRemainingToStartWork)}
                        </td>
                      </tr>

                      {/* Step 3 */}
                      <tr>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-[#18221D]">
                            Step 3 · 35% Plywood Structure Completion
                          </p>
                          <p className="text-[11px] text-[#4A524D] mt-0.5">
                            Due after all plywood cabinet bodies, frames and lofts are completed at site
                          </p>
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans font-bold tabular-nums whitespace-nowrap">
                          {formatINR(milestones.plywoodCompletion35Percent)}
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans text-[#4A524D] tabular-nums whitespace-nowrap">
                          {formatINR(
                            milestones.advance50PercentTotal +
                              milestones.plywoodCompletion35Percent
                          )}
                          <div className="text-[10px] font-semibold text-[#1C3A2F]">85% Reached</div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-sans font-bold tabular-nums whitespace-nowrap">
                          {formatINR(
                            Math.max(
                              0,
                              milestones.advance50PercentTotal +
                                milestones.plywoodCompletion35Percent -
                                verifiedPaidRupees
                            )
                          )}
                        </td>
                      </tr>

                      {/* Step 4 */}
                      <tr>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-[#18221D]">
                            Step 4 · 10% Outside Laminate Completion
                          </p>
                          <p className="text-[11px] text-[#4A524D] mt-0.5">
                            Due after outside 1.0mm decorative laminate pressing is completed
                          </p>
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans font-bold tabular-nums whitespace-nowrap">
                          {formatINR(milestones.laminateCompletion10Percent)}
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans text-[#4A524D] tabular-nums whitespace-nowrap">
                          {formatINR(
                            milestones.advance50PercentTotal +
                              milestones.plywoodCompletion35Percent +
                              milestones.laminateCompletion10Percent
                          )}
                          <div className="text-[10px] font-semibold text-[#1C3A2F]">95% Reached</div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-sans font-bold tabular-nums whitespace-nowrap">
                          {formatINR(
                            Math.max(
                              0,
                              milestones.advance50PercentTotal +
                                milestones.plywoodCompletion35Percent +
                                milestones.laminateCompletion10Percent -
                                verifiedPaidRupees
                            )
                          )}
                        </td>
                      </tr>

                      {/* Step 5 */}
                      <tr className="bg-[#FAF8F4]">
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-[#18221D]">
                            Step 5 · 5% Final Handover Balance
                          </p>
                          <p className="text-[11px] text-[#4A524D] mt-0.5">
                            Due upon hardware alignment, cleaning & final handover
                          </p>
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans font-bold tabular-nums whitespace-nowrap">
                          {formatINR(milestones.handoverFinal5Percent)}
                        </td>
                        <td className="py-3 px-2.5 text-right font-sans font-bold text-[#1C3A2F] tabular-nums whitespace-nowrap">
                          {formatINR(calc.grandTotal)}
                          <div className="text-[10px] font-semibold text-[#1C3A2F]">100% Complete</div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-sans font-bold text-[#1C3A2F] tabular-nums whitespace-nowrap">
                          {formatINR(Math.max(0, calc.grandTotal - verifiedPaidRupees))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                </details>
              </div>

              {/* Payment screenshot file sharing */}
              <form
                onSubmit={handlePaymentSubmit}
                className="payment-evidence-form lg:col-span-5 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl p-5 space-y-4 text-[13px]"
              >
                <h3 className="text-base font-bold text-[#18221D]">
                  Pay & share your screenshot
                </h3>
                {milestones.requiresOwnerSmallOrderRule && (
                  <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 leading-relaxed">
                    <strong>Booking schedule needs owner confirmation.</strong> This project's 50% advance is below the usual booking amount. Please contact UME before paying; online payment submission is unavailable until the owner confirms the arrangement.
                    <a className="customer-action customer-action-secondary mt-2" href={`tel:${catalogue.company.phone}`}>Call {catalogue.company.proprietor}</a>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="customer-payment-method" className="block font-bold text-[#18221D] mb-1">
                      Payment method
                    </label>
                    <select
                      id="customer-payment-method"
                      disabled={submittingPayment}
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-[#D8D0C2] rounded-lg"
                    >
                      <option value="UPI / PhonePe">UPI / PhonePe</option>
                      <option value="NEFT / RTGS / IMPS">NEFT / RTGS / IMPS</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="customer-payment-amount" className="block font-bold text-[#18221D] mb-1">
                      Payment amount (₹)
                    </label>
                    <input
                      id="customer-payment-amount"
                      disabled={submittingPayment}
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step="0.01"
                      aria-describedby="payment-amount-help"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-[#D8D0C2] rounded-lg font-sans tabular-nums"
                    />
                  </div>
                </div>

                <p id="payment-amount-help" className="payment-field-help">
                  UPI limit: {formatINR(upiLimit)} per payment. Use NEFT / RTGS / IMPS for larger amounts.
                </p>
                {paymentMethod === 'UPI / PhonePe' && (
                  <div className="mobile-upi-payment">
                    {upiPaymentUrl ? (
                      <a className="customer-action customer-action-primary" href={upiPaymentUrl}>
                        <Smartphone size={18} aria-hidden="true" /> Pay with UPI <ArrowRight size={16} aria-hidden="true" />
                      </a>
                    ) : (
                      <button type="button" className="customer-action customer-action-primary" disabled>Pay with UPI</button>
                    )}
                    <p className="payment-field-help">
                      {isPreview ? 'Payment actions become available after publication.' : milestones.requiresOwnerSmallOrderRule ? 'Contact UME to confirm the booking arrangement before paying.'
                        : !paymentAmountIsValid ? 'Enter a payment amount to open your UPI app.'
                        : !upiAmountWithinLimit ? `This amount exceeds the ${formatINR(upiLimit)} UPI limit. Select a bank transfer instead.`
                        : !upiId ? 'UPI is unavailable. Please use the bank details below.'
                        : `Opens your UPI app for ${formatINR(paymentAmount)}. Check the payee before confirming.`}
                    </p>
                  </div>
                )}
                <details className="bank-details">
                  <summary>Bank details & QR <ChevronDown size={16} aria-hidden="true" /></summary>
                  <div className="bank-details-body">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#1C3A2F]">
                      Official remittance account
                    </p>
                    <p className="font-bold text-sm text-[#18221D]">
                      {catalogue.company.bank.bankName} — {catalogue.company.bank.branch}
                    </p>
                    <p className="text-[#4A524D]">
                      Account Name:{' '}
                      <strong className="text-[#18221D]">
                        {catalogue.company.bank.accountName}
                      </strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 font-sans">
                      <button
                        type="button"
                        aria-label={copiedBankField === 'acc' ? 'Account number copied' : 'Copy account number'}
                        onClick={() =>
                          handleCopyText('acc', catalogue.company.bank.accountNumber)
                        }
                        className="px-2.5 py-1 bg-white border border-[#D8D0C2] rounded-md font-bold cursor-pointer"
                      >
                        Acc: {catalogue.company.bank.accountNumber}{' '}
                        {copiedBankField === 'acc' ? <Check size={14} aria-label="Copied" /> : <Copy size={14} aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        aria-label={copiedBankField === 'ifsc' ? 'IFSC copied' : 'Copy IFSC'}
                        onClick={() => handleCopyText('ifsc', catalogue.company.bank.ifsc)}
                        className="px-2.5 py-1 bg-white border border-[#D8D0C2] rounded-md font-bold cursor-pointer"
                      >
                        IFSC: {catalogue.company.bank.ifsc}{' '}
                        {copiedBankField === 'ifsc' ? <Check size={14} aria-label="Copied" /> : <Copy size={14} aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        aria-label={copiedBankField === 'upi' ? 'UPI ID copied' : 'Copy UPI ID'}
                        onClick={() => handleCopyText('upi', catalogue.company.bank.upiId)}
                        className="px-2.5 py-1 bg-[#E4EFE7] border border-[#C5DEC9] text-[#1C3A2F] rounded-md font-bold cursor-pointer"
                      >
                        UPI: {catalogue.company.bank.upiId}{' '}
                        {copiedBankField === 'upi' ? <Check size={14} aria-label="Copied" /> : <Copy size={14} aria-hidden="true" />}
                      </button>
                    </div>
                    {bankCopyError && <p role="status" className="payment-field-help">{bankCopyError}</p>}
                  </div>
                  {upiPaymentUrl && <div className="payment-qr">
                    <DeterministicQrCode value={upiPaymentUrl} size={112} label={`Pay ${formatINR(paymentAmount)}`} />
                    <p>Scan with a UPI app to pay {formatINR(paymentAmount)}.</p>
                  </div>}
                  </div>
                </details>

                <div className="payment-image-upload">
                  <label htmlFor="customer-payment-image" className="block font-bold mb-2">Payment screenshot</label>
                  <input id="customer-payment-image" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="payment-image-help" disabled={submittingPayment} onChange={e=>{
                    const file=e.target.files?.[0];setPaymentFeedback(null);setShowManualPaymentShare(false);
                    if(!file){setPaymentImage(null);return;}
                    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){setPaymentImage(null);e.target.value='';setPaymentFeedback({type:'error',message:'Choose a JPG, PNG or WebP image smaller than 10 MB.'});return;}
                    setPaymentImage(file);
                  }}/>
                  {paymentImagePreview&&<div className="payment-image-preview"><img src={paymentImagePreview} alt="Selected payment screenshot"/><button type="button" onClick={()=>{setPaymentImage(null);setShowManualPaymentShare(false);setPaymentFeedback(null);const input=document.getElementById('customer-payment-image') as HTMLInputElement;if(input)input.value='';}}>Remove image</button></div>}
                  <p id="payment-image-help" className="payment-field-help">JPG, PNG or WebP, up to 10 MB. After attaching your screenshot, tap “I’ve made the payment”, choose WhatsApp, select {catalogue.company.proprietor} ({catalogue.company.phone}) and tap Send.</p>
                  {showManualPaymentShare && paymentImagePreview && (
                    <div className="payment-share-fallback" aria-label="Manual screenshot attachment">
                      <p>Download the screenshot first. Then use the button below to open WhatsApp and attach it using the paperclip.</p>
                      <a href={paymentImagePreview} download={paymentImage?.name || 'payment-screenshot.png'}>Download screenshot</a>
                    </div>
                  )}
                </div>

                <label className="payment-consent" htmlFor="customer-payment-consent">
                  <input
                    id="customer-payment-consent"
                    type="checkbox"
                    checked={acceptedTerms}
                    disabled={submittingPayment}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="payment-consent-checkbox"
                  />
                  <span className="payment-consent-copy">
                    I confirm the selected package (<strong>{activePackageSummaryText}</strong>) and agree to the UME Interiors execution terms and milestone schedule.
                  </span>
                </label>

                {paymentFeedback && (
                  <div role="status" aria-live="polite"
                    className={`p-3 rounded-lg border font-medium ${
                      paymentFeedback.type === 'success'
                        ? 'bg-[#E4EFE7] border-[#15803D] text-[#1C3A2F]'
                        : paymentFeedback.type === 'info'
                        ? 'bg-[#FAF8F4] border-[#D8D0C2] text-[#1C3A2F]'
                        : 'bg-[#FEF2F2] border-[#B91C1C] text-[#991B1B]'
                    }`}
                  >
                    {paymentFeedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingPayment || milestones.requiresOwnerSmallOrderRule}
                  className="w-full py-3 px-4 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submittingPayment
                      ? 'Opening share options…'
                      : milestones.requiresOwnerSmallOrderRule ? 'Owner confirmation required'
                      : showManualPaymentShare ? 'Open WhatsApp to attach screenshot'
                      : 'I’ve made the payment'}
                  </span>
                </button>
                <p className="payment-field-help payment-verification-note">Your screenshot is shared as an image. Payment is confirmed only after UME checks the bank credit.</p>
              </form>
            </div>

            {/* Terms, Notes & 0.8mm (0.72mm–0.80mm Nominal Gauge) Laminate Note */}
            <div className="pt-4 border-t border-[#EAE4D8] space-y-3 text-[13px]">
              <p className="font-semibold text-[#18221D]">
                Materials & execution terms
              </p>
              <div className="p-3.5 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl text-[#18221D] leading-relaxed">
                <strong>Laminate thickness and finish:</strong> {materialWording(catalogue).internalLaminate} {materialWording(catalogue).externalLaminate}
              </div>
              <ul className="quotation-notes-list">{[...materialLines(catalogue,ALL_GRADES),...scopeNotes(catalogue,ALL_GRADES),...quotationCustomerNotes(draft)].map((note,index) => <li key={index}>{note}</li>)}</ul>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] text-[#4A524D]">
                {documentTerms(catalogue,ALL_GRADES).map((t) => (
                  <div key={t.id} className="leading-snug">
                    <strong className="text-[#18221D]">
                      {t.id}. {t.title}:
                    </strong>{' '}
                    {t.clause}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 4. BOTTOM CUSTOMER CHANGE REQUEST & DIRECT WHATSAPP BOX (+91 9491661555) */}
          <section
            id="feedback-section"
            className="bg-white border border-[#E5DFD3] rounded-2xl p-6 sm:p-7 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#18221D] mt-0.5">
                  Request a change or site visit
                </h2>
                <p className="text-[13px] text-[#5C645F] mt-0.5">
                  Tell <strong>{catalogue.company.proprietor}</strong> what you would like to adjust. Save your request here or send it on WhatsApp.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleFeedbackSubmit}
              className="feedback-form text-[13px]"
            >
              <div className="md:col-span-3">
                <label htmlFor="customer-feedback-topic" className="block font-bold text-[#18221D] mb-1">Topic</label>
                <select
                  id="customer-feedback-topic"
                  value={feedbackTopic}
                  onChange={(e) => setFeedbackTopic(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl font-semibold"
                >
                  <option value="Room-Wise Package / Brand Change">
                    Room-Wise Package / Brand Change
                  </option>
                  <option value="Add / Modify Furniture Item">
                    Add / Modify Furniture Item
                  </option>
                  <option value="Site Measurement / Visit Request">
                    Site Measurement / Visit Request
                  </option>
                  <option value="Discount / Payment Discussion">
                    Discount / Payment Discussion
                  </option>
                </select>
              </div>
              <div className="md:col-span-5">
                <label htmlFor="customer-feedback-message" className="block font-bold text-[#18221D] mb-1">
                  Your message
                </label>
                <textarea
                  id="customer-feedback-message"
                  rows={3}
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="For example: Premium in the kitchen and Standard in the guest bedroom."
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#D8D0C2] rounded-xl resize-y"
                />
              </div>
              <div className="md:col-span-4 flex flex-wrap items-center gap-2">
                <a
                  href={whatsappChangeRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-3.5 bg-[#15803D] hover:bg-[#166534] text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>Send on WhatsApp</span>
                </a>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="py-2.5 px-4 bg-[#1C3A2F] hover:bg-[#142920] text-[#E6CBA8] font-bold rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{submittingFeedback ? 'Saving…' : 'Save request'}</span>
                </button>
              </div>
            </form>

            {feedbackStatus && (
              <div role="status" aria-live="polite"
                className={`p-3 rounded-xl border text-[13px] font-medium ${
                  feedbackStatus.ok
                    ? 'bg-[#E4EFE7] border-[#15803D] text-[#1C3A2F]'
                    : 'bg-[#FEF2F2] border-[#B91C1C] text-[#991B1B]'
                }`}
              >
                {feedbackStatus.message}
              </div>
            )}

            {feedbackList.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C645F]">
                  Saved requests ({feedbackList.length})
                </p>
                <div className="space-y-1.5">
                  {feedbackList.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3 bg-[#FAF8F4] border border-[#E5DFD3] rounded-xl flex flex-wrap items-center justify-between gap-2 text-[13px]"
                    >
                      <div>
                        <span className="font-bold text-[#1C3A2F] mr-2">[{fb.topic}]</span>
                        <span className="text-[#18221D]">{fb.message}</span>
                      </div>
                      <span className="text-[10px] font-sans text-[#5C645F]">
                        {new Date(fb.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div ref={selectionActionsRef} className="selection-end-actions" aria-label="Save your quotation selection">
            <div>
              <h2>Your selected quotation</h2>
              <p>{activePackageSummaryText}</p>
              <strong className="selection-end-total">{formatINR(calc.grandTotal)}</strong>
              <p className="selection-action-status">
                {savingPackage ? 'Saving selection…' : selectionSaveError ? selectionSaveError : hasUnsavedChanges ? 'You have changes to save.' : savedByCustomer ? 'Your selection is saved.' : 'Save your choices, then review the payment details.'}
              </p>
            </div>
            <div className="selection-action-buttons">
              <button type="button" className="customer-action customer-action-secondary" disabled={selectionIsBusy} onClick={() => void handleCustomerFinalSave()}>
                <Save size={17} aria-hidden="true" />{savingPackage && !reviewingPayment ? 'Saving…' : 'Save selection'}
              </button>
              <button type="button" className="customer-action customer-action-primary" disabled={selectionIsBusy} onClick={() => void handleReviewAndPay()}>
                {reviewingPayment ? 'Saving…' : 'Review & pay'}<ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>

          {!endActionsVisible && (
            <div className="selection-mobile-bar" aria-label="Quotation selection actions">
              <div className="selection-mobile-context">
                <div><span>Selected estimate</span><strong>{formatINR(calc.grandTotal)}</strong></div>
                <p>{selectionSaveError ? 'Save failed. Try again.' : savingPackage ? 'Saving…' : hasUnsavedChanges ? 'Unsaved changes' : savedByCustomer ? 'Selection saved' : 'Ready to save'}</p>
              </div>
              <div className="selection-action-buttons">
                <button type="button" className="customer-action customer-action-secondary" disabled={selectionIsBusy} onClick={() => void handleCustomerFinalSave()}>
                  <Save size={16} aria-hidden="true" />{savingPackage && !reviewingPayment ? 'Saving…' : 'Save selection'}
                </button>
                <button type="button" className="customer-action customer-action-primary" disabled={selectionIsBusy} onClick={() => void handleReviewAndPay()}>
                  {reviewingPayment ? 'Saving…' : 'Review & pay'}<ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
