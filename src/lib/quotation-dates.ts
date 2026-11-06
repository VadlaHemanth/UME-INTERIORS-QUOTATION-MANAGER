import type { QuoteMeta } from './schema';

export function validIsoDate(value:string|null|undefined):value is string {
  return !!value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
}
export function formatQuotationDate(value:string|null|undefined):string {
  return validIsoDate(value)?`${value.slice(8,10)}-${value.slice(5,7)}-${value.slice(0,4)}`:value||'';
}
export function parseQuotationDate(value:string):string|null {
  const match=value.trim().match(/^(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/);
  const iso=match?`${match[3]}-${match[2]}-${match[1]}`:value.trim();
  return validIsoDate(iso)?iso:null;
}
export function expiryFromIssue(issue:string,days=30):string {
  if(!validIsoDate(issue)||!Number.isSafeInteger(days)||days<1||days>3650)return '';
  return new Date(Date.parse(`${issue}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
}
export function validityBetween(issue:string|null,expiry:string|null):number|null {
  if(!validIsoDate(issue)||!validIsoDate(expiry))return null;
  const days=Math.round((Date.parse(expiry)-Date.parse(issue))/86400000);
  return days>=1&&days<=3650?days:null;
}
export function completeQuoteDates(quote:QuoteMeta,today:string):QuoteMeta {
  const date=quote.date||today;
  const days=quote.validity_days??validityBetween(date,quote.valid_until)??30;
  return {...quote,date,validity_days:days,valid_until:quote.valid_until||expiryFromIssue(date,days)};
}
export function beginQuotationEdit(quote:QuoteMeta,today:string):QuoteMeta {
  return {...quote,date:today,validity_days:30,valid_until:expiryFromIssue(today,30)};
}
