import React,{useRef} from 'react';
import { CalendarDays } from 'lucide-react';
import { formatQuotationDate,parseQuotationDate,validIsoDate } from '../lib/quotation-dates';

export function QuotationDateField({label,value,onChange}:{label:string;value:string|null;onChange:(value:string|null)=>void}){
  const picker=useRef<HTMLInputElement>(null);
  const invalid=Boolean(value&&!validIsoDate(value));
  return <div className="owner-field quotation-date-field"><label>{label}<span className="quotation-date-control"><input type="text" inputMode="numeric" aria-label={label} aria-invalid={invalid} placeholder="DD-MM-YYYY" value={formatQuotationDate(value)} onChange={event=>onChange(parseQuotationDate(event.target.value)||event.target.value||null)}/></span></label><button type="button" className="quotation-date-calendar" aria-label={`Choose ${label.toLowerCase()} from calendar`} onClick={()=>{try{picker.current?.showPicker();}catch{picker.current?.focus();picker.current?.click();}}}><CalendarDays size={18}/></button><input ref={picker} className="quotation-date-native" type="date" aria-label={`${label} calendar`} tabIndex={-1} value={validIsoDate(value)?value:''} onChange={event=>onChange(event.target.value||null)}/>{invalid&&<span className="quotation-date-error">Enter a valid date as DD-MM-YYYY.</span>}</div>;
}
