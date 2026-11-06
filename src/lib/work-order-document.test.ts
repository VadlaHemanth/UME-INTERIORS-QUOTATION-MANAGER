import assert from 'node:assert/strict';
import test from 'node:test';
import {workOrderPaymentSummary,workOrderPreview} from './work-order-document';
import {calculateQuotationPricing,computeCustomerSelectionTotal} from './pricing';
import {VIDYA_SAGAR_REDDY_DRAFT} from './historicalData';
import type {FinalizedWorkOrder} from './quote-workflow';

test('work-order payment balances credit booking once and identify the next unpaid stage',()=>{
  assert.deepEqual(workOrderPaymentSummary(400000,50000),{verifiedPaid:50000,balance:350000,nextAmount:150000,nextLabel:'Before work starts'});
  assert.equal(workOrderPaymentSummary(400000,200000).nextAmount,140000);
  assert.equal(workOrderPaymentSummary(400000,200000).nextLabel,'After plywood work');
  assert.equal(workOrderPaymentSummary(400000,340000).nextAmount,40000);
  assert.equal(workOrderPaymentSummary(400000,380000).nextAmount,20000);
  assert.deepEqual(workOrderPaymentSummary(400000,400000),{verifiedPaid:400000,balance:0,nextAmount:0,nextLabel:'Paid in full'});
  assert.equal(workOrderPaymentSummary(400000,410000).balance,0);
});

test('work-order revision previews retain agreed rooms, optional items and confirmation without changing saved state',()=>{
  const previous=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  const next=structuredClone(previous);next.rooms=[next.rooms[4],...next.rooms.slice(0,4)];
  const existing:FinalizedWorkOrder={confirmedAt:'2026-11-01T08:00:00Z',sourceRevision:1,totalRupees:123,selection:{wholeHomeSelection:{grade:'Premium',protection:'Standard',finish:'High Gloss',brand_preference:null},mixByRoom:true,roomSelections:{4:{grade:'Normal',protection:'With PVC',finish:'SF',brand_preference:null}},selectedOptionalPointers:['/rooms/4/items/2'],acceptedTermsAt:'2026-11-01T07:00:00Z'}};
  const before=structuredClone(existing);const snapshot=calculateQuotationPricing(next);
  const preview=workOrderPreview(previous,next,existing,snapshot,1000);
  assert.equal(preview.selection.roomSelections[0].grade,'Normal');assert.deepEqual(preview.selection.selectedOptionalPointers,['/rooms/0/items/2']);assert.equal(preview.confirmedAt,existing.confirmedAt);
  assert.equal(preview.totalRupees,computeCustomerSelectionTotal(snapshot,{...preview.selection,approvedDiscountRupees:1000}).grandTotal);
  const changed=workOrderPreview(previous,next,existing,snapshot,0,{grade:'Base',protection:'Standard',finish:'High Gloss',brand_preference:null});
  assert.equal(changed.selection.mixByRoom,false);assert.equal(changed.selection.wholeHomeSelection.grade,'Base');assert.deepEqual(changed.selection.roomSelections,{});
  assert.deepEqual(existing,before);
});
