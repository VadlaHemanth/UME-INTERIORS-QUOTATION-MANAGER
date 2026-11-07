/** Native Save as PDF uses the document title as its suggested filename. */
export function quotationFileName(customerName:string|null|undefined,quotationNumber:string|null|undefined,isWorkOrder=false):string {
  const clean=(text:string|null|undefined,fallback:string,limit:number)=>Array.from((text||'').normalize('NFKC').replace(/[<>:"/\\|?*\p{Cc}\p{Cf}]/gu,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'')).slice(0,limit).join('').trim()||fallback;
  return `${isWorkOrder?'Work Order':'Quotation'} - ${clean(customerName,'Customer',100)} - ${clean(quotationNumber,'Preview',60)}`;
}
