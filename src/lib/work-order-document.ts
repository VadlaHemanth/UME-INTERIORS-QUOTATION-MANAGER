import {calculateMilestoneSchedule,computeCustomerSelectionTotal,type PricedQuotationSnapshot} from './pricing';
import {carryAgreedSelection,type FinalizedWorkOrder} from './quote-workflow';
import type {QuotationDraftV2,ResolvedPackageSelection} from './schema';

/** A schedule balance is payable when its corresponding work stage is reached. */
export function workOrderPaymentSummary(total:number,verifiedPaid:number) {
  const stages=calculateMilestoneSchedule(total,verifiedPaid);
  const targets=[
    {label:'Before work starts',amount:stages.advance50PercentTotal},
    {label:'After plywood work',amount:stages.advance50PercentTotal+stages.plywoodCompletion35Percent},
    {label:'After external laminate',amount:stages.advance50PercentTotal+stages.plywoodCompletion35Percent+stages.laminateCompletion10Percent},
    {label:'Before handover',amount:stages.totalAmount},
  ];
  const next=targets.find(stage=>stage.amount>verifiedPaid);
  return {verifiedPaid,balance:Math.max(0,stages.totalAmount-verifiedPaid),nextAmount:next?Math.max(0,next.amount-verifiedPaid):0,nextLabel:next?.label||'Paid in full'};
}

/** Preview proposed scope without changing confirmation, payments or saved selection identities. */
export function workOrderPreview(previousDraft:QuotationDraftV2,nextDraft:QuotationDraftV2,existing:FinalizedWorkOrder,snapshot:PricedQuotationSnapshot,discount:number,replacePackage?:ResolvedPackageSelection):FinalizedWorkOrder {
  const selection=carryAgreedSelection(previousDraft,nextDraft,existing.selection);
  if(replacePackage){selection.wholeHomeSelection=structuredClone(replacePackage);selection.mixByRoom=false;selection.roomSelections={};}
  return {...structuredClone(existing),selection,totalRupees:computeCustomerSelectionTotal(snapshot,{...selection,approvedDiscountRupees:discount}).grandTotal};
}
