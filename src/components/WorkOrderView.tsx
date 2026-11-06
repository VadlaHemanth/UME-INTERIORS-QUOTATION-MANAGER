import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { PrintableA4Sheet } from './PrintableA4Sheet';
import { PlywoodSpecifications } from './PlywoodSpecifications';
import { formatCleanItemDescription, getPackageDisplayName, standardizeCompetitorItemName, type StudioCatalogue } from '../lib/catalogue';
import { computeCustomerSelectionTotal, formatINR, makeComboKey, type PricedQuotationSnapshot } from '../lib/pricing';
import type { QuotationDraftV2 } from '../lib/schema';
import type { FinalizedWorkOrder } from '../lib/quote-workflow';
import { documentTerms, materialLines, quotationCustomerNotes, scopeNotes } from '../lib/commercial-spec';
import { sharePaymentImage } from '../lib/payment-image-share';
import { furnitureRelationshipLabel,quotationDisplayRooms } from '../lib/quotation-order';
import { workOrderPaymentSummary } from '../lib/work-order-document';
import { formatQuotationDate } from '../lib/quotation-dates';
import { indiaDate } from '../lib/quote-workflow';

type Props={publicId:string;revision:number;draft:QuotationDraftV2;snapshot:PricedQuotationSnapshot;catalogue:StudioCatalogue;approvedDiscountRupees:number;verifiedPaidRupees:number;workOrder:FinalizedWorkOrder;isPreview?:boolean;initialPrintPreview?:boolean};

export function WorkOrderView({publicId,revision,draft,snapshot,catalogue,approvedDiscountRupees,verifiedPaidRupees,workOrder,isPreview=false,initialPrintPreview=false}:Props) {
  const displayRooms=quotationDisplayRooms(snapshot.rooms,workOrder.selection.selectedOptionalPointers);
  const [pdf,setPdf]=useState(initialPrintPreview);
  const [paymentImage,setPaymentImage]=useState<File|null>(null);
  const [shareMessage,setShareMessage]=useState('');
  const [manualShare,setManualShare]=useState(false);
  const [sharing,setSharing]=useState(false);
  useEffect(()=>{const prepare=()=>flushSync(()=>setPdf(true));window.addEventListener('ume:prepare-print',prepare);window.addEventListener('beforeprint',prepare);return()=>{window.removeEventListener('ume:prepare-print',prepare);window.removeEventListener('beforeprint',prepare);};},[]);
  const selection=workOrder.selection;
  const calc=computeCustomerSelectionTotal(snapshot,{...selection,approvedDiscountRupees});
  const payment=workOrderPaymentSummary(calc.grandTotal,verifiedPaidRupees);
  const grades=displayRooms.map(room=>(selection.mixByRoom?selection.roomSelections[room.roomIndex]||selection.wholeHomeSelection:selection.wholeHomeSelection).grade);
  const upi=new URLSearchParams({pa:catalogue.company.bank.upiId,pn:catalogue.company.bank.accountName,cu:'INR',tn:`Work order ${draft.quote.number}`});
  if(payment.nextAmount>0&&payment.nextAmount<=catalogue.company.bank.upiLimitRupees)upi.set('am',String(payment.nextAmount));
  const share=async()=>{
    if(isPreview||!paymentImage||sharing)return;
    if(manualShare){window.open(`https://wa.me/${catalogue.company.whatsapp}?text=${encodeURIComponent(`Work order ${draft.quote.number}: I will attach my payment screenshot.`)}`,'_blank','noopener,noreferrer');return;}
    setSharing(true);setShareMessage('');
    try{
      const result=await sharePaymentImage(paymentImage,draft.quote.number||'work-order',navigator,window.isSecureContext);
      if(result==='cancelled')setShareMessage('Sharing cancelled. Your screenshot is still attached; you can try again.');
      else if(result==='shared')setShareMessage('Choose WhatsApp and send the screenshot to UME. Payment is credited after bank verification.');
      else{setManualShare(true);setShareMessage('Image sharing is unavailable here. Open WhatsApp with this button, attach your screenshot and send it to UME.');}
    }finally{setSharing(false);}
  };
  return <div className="customer-quotation work-order-view">
    <div className="work-order-toolbar no-print"><div><h1>Work order</h1><p>{draft.quote.number} · {draft.customer.name}</p></div><div><button type="button" onClick={()=>setPdf(!pdf)}>{pdf?'Back to work order':'Preview PDF'}</button></div></div>
    {pdf&&<div className="quotation-print-shell block py-8 px-4"><PrintableA4Sheet publicId={publicId} revision={revision} draft={draft} snapshot={snapshot} catalogue={catalogue} {...selection} approvedDiscountRupees={approvedDiscountRupees} verifiedPaidRupees={verifiedPaidRupees} isWorkOrder isPreview={isPreview} workOrderConfirmedAt={workOrder.confirmedAt}/></div>}
    {!pdf&&<div className="work-order-content no-print">
      <section className="work-order-summary" id="work-order-scope">
        <div><h2>{isPreview?'Proposed work-order scope':'Your agreed scope'}</h2><p>{draft.customer.site}</p><p>{selection.mixByRoom?'Packages confirmed by room':`${getPackageDisplayName(selection.wholeHomeSelection.grade)} package`}</p><p>{isPreview?'Existing confirmation':'Confirmed after bank verification'}: {formatQuotationDate(indiaDate(new Date(workOrder.confirmedAt)))}.</p></div>
        <dl><div><dt>Work order total</dt><dd>{formatINR(calc.grandTotal)}</dd></div><div><dt>Verified payments</dt><dd>{formatINR(verifiedPaidRupees)}</dd></div><div><dt>Balance</dt><dd>{formatINR(payment.balance)}</dd></div></dl>
      </section>
      <p className="work-order-notice">{isPreview?'This is an unpublished work-order revision. Review the proposed changes before publishing. Payment and sharing actions are available after publication.':'Your package and scope are confirmed. To change measurements, materials or work, contact UME; approved changes will be recorded in an updated work order.'}</p>
      {displayRooms.map(room=>{
        const chosen=selection.mixByRoom?selection.roomSelections[room.roomIndex]||selection.wholeHomeSelection:selection.wholeHomeSelection;
        const combo=makeComboKey(chosen.grade,chosen.protection,chosen.finish);
        return <section className="work-order-room" key={room.roomIndex}>
          <header><h2>{room.name}</h2><span>{getPackageDisplayName(chosen.grade)} · {chosen.finish==='SF'?'SF matte':'High-gloss'}{chosen.protection==='With PVC'?' · with 6 mm PVC':''}</span><strong>{formatINR(calc.roomBreakdownTotals[room.roomIndex]?.total||0)}</strong></header>
          {chosen.brand_preference&&<p className="work-order-brand">Preferred plywood: {chosen.brand_preference}</p>}
          {room.items.filter(item=>!item.optional||selection.selectedOptionalPointers.includes(`/rooms/${room.roomIndex}/items/${item.itemIndex}`)).map(item=><article key={item.itemIndex}><div><h3>{standardizeCompetitorItemName(item.name,item.workType,room.name)}</h3>{furnitureRelationshipLabel(item,room.items)&&<p className="work-order-relation">{furnitureRelationshipLabel(item,room.items)}</p>}<p>{formatCleanItemDescription(item.sourceTextEn,item.name,item.workType,room.name)}</p><p>{item.unit==='sq_ft'?'Height × Width: ':''}{item.sizeText} · {item.totalMeasure.toFixed(2)} {item.unit==='sq_ft'?'sq ft':item.unit==='each'?'items':item.unit==='running_ft'?'running ft':item.unit==='lumpsum'?'lump sum':item.unit}</p></div><strong>{formatINR(item.exactAmounts[combo])}</strong></article>)}
        </section>;
      })}
      <PlywoodSpecifications catalogue={catalogue} grades={grades} selectedGrade={selection.mixByRoom?null:selection.wholeHomeSelection.grade}/>
      <section className="work-order-terms" id="work-order-materials"><h2>Materials, notes and terms</h2><ul>{[...materialLines(catalogue,grades),...scopeNotes(catalogue,grades),...quotationCustomerNotes(draft)].map((line,index)=><li key={index}>{line}</li>)}</ul>{documentTerms(catalogue,grades,true).map(term=><p key={term.id}><strong>{term.title}.</strong> {term.clause}</p>)}</section>
      <section className="work-order-terms" id="work-order-payment">
        <h2>Payment details</h2>
        <p>{payment.nextAmount?`Next scheduled payment: ${formatINR(payment.nextAmount)} · ${payment.nextLabel}. Pay when this work stage is reached.`:'Paid in full based on the verified payment records.'}</p>
        <p>{catalogue.company.bank.bankName} · {catalogue.company.bank.branch}</p><p>{catalogue.company.bank.accountName}</p><p>Account: {catalogue.company.bank.accountNumber} · IFSC: {catalogue.company.bank.ifsc}</p><p>UPI: {catalogue.company.bank.upiId}</p>
        {!isPreview&&<div className="work-order-payment-actions">{payment.nextAmount>0&&<a className="mobile-upi-button" href={`upi://pay?${upi.toString()}`}>Pay with UPI</a>}<a href={`https://wa.me/${catalogue.company.whatsapp}?text=${encodeURIComponent(`Work order ${draft.quote.number}: I would like to discuss my project.`)}`}>Contact UME on WhatsApp</a></div>}
        {payment.nextAmount>catalogue.company.bank.upiLimitRupees&&<p>The saved UPI limit is {formatINR(catalogue.company.bank.upiLimitRupees)} per payment. Enter the amount in your UPI app or use bank transfer for a larger payment.</p>}
        <div className="work-order-proof">
          <label className="owner-field">Share a further payment screenshot<input type="file" accept="image/jpeg,image/png,image/webp" disabled={isPreview||sharing} onChange={event=>{const image=event.target.files?.[0]||null;setShareMessage('');setManualShare(false);if(image&&(!['image/jpeg','image/png','image/webp'].includes(image.type)||!image.size||image.size>10*1024*1024)){setPaymentImage(null);event.target.value='';setShareMessage('Choose a JPG, PNG or WebP screenshot up to 10 MB.');return;}setPaymentImage(image);}}/></label>
          <button type="button" className="owner-action-primary" disabled={isPreview||!paymentImage||sharing} onClick={()=>void share()}>{isPreview?'Available after publication':sharing?'Opening share options…':manualShare?'Open WhatsApp to attach screenshot':'I’ve made another payment'}</button>
          {shareMessage&&<p role="status">{shareMessage}</p>}
        </div>
      </section>
    </div>}
  </div>;
}
