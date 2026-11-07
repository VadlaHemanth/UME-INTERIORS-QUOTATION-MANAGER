import type { StateStore } from './api';
import type { PublishedQuotationRecord } from './routes';
import { indiaDate,latestRecord } from '../src/lib/quote-workflow';
import { formatQuotationDate } from '../src/lib/quotation-dates';

export interface QuoteSocialCard {
  customerName:string;
  reference:string;
  brandName:string;
  documentType:'Quotation'|'Work order';
  issueDate:string;
  roomCount:number;
}
export const escapeSocialText=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const plain=(value:unknown,fallback:string,limit=160)=>Array.from(typeof value==='string'?value.replace(/[\p{Cc}\p{Cf}]/gu,' ').replace(/\s+/g,' ').trim():'').slice(0,limit).join('')||fallback;

/** Only these public document fields may reach a social card. Never use totals, notes, site or phone. */
export function quotationSocialCard(record:PublishedQuotationRecord):QuoteSocialCard {
  const scope=record.workOrder?.selection;
  const roomCount=scope?record.snapshot.rooms.filter(room=>room.items.some(item=>!item.optional||scope.selectedOptionalPointers.includes(`/rooms/${room.roomIndex}/items/${item.itemIndex}`))).length:record.draft.rooms.length;
  return {
    customerName:plain(record.draft.customer.name,'Your home'),
    reference:plain(record.draft.quote.number,'Interior quotation',80),
    brandName:plain(record.catalogueSnapshot?.company.brandName,'UME INTERIORS',80).toUpperCase(),
    documentType:record.workOrder?'Work order':'Quotation',
    issueDate:formatQuotationDate(record.workOrder?.confirmedAt?indiaDate(new Date(record.workOrder.confirmedAt)):record.draft.quote.date)||'',
    roomCount,
  };
}
export function quotationSocialCopy(card:QuoteSocialCard) {
  const scope=card.roomCount===1?'room':'rooms';
  return {
    title:`${card.documentType} for ${card.customerName} | ${card.brandName}`,
    description:card.documentType==='Work order'
      ?`${card.reference} · Prepared for ${card.customerName}. Review your agreed furniture scope, materials and specifications across ${card.roomCount} ${scope}.`
      :`${card.reference} · Tailored for ${card.customerName}. Explore your ${card.roomCount}-room interior scope, plywood and hardware options, and project specifications.`,
    alt:`${card.documentType} ${card.reference}, prepared for ${card.customerName} by ${card.brandName}.`,
  };
}
export async function quotationSocialVersion(card:QuoteSocialCard):Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['ume-social-v1',card])));
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,20);
}

export function quotationSocialHtml(template:string,card:QuoteSocialCard,pageUrl:string,imageUrl:string):string {
  const copy=quotationSocialCopy(card),escape=escapeSocialText;
  const tags=[
    ['name','description',copy.description],['property','og:title',copy.title],['property','og:description',copy.description],
    ['property','og:type','website'],['property','og:site_name',card.brandName],['property','og:url',pageUrl],
    ['property','og:locale','en_IN'],['property','og:image',imageUrl],['property','og:image:secure_url',imageUrl],
    ['property','og:image:type','image/png'],['property','og:image:width','1200'],['property','og:image:height','630'],['property','og:image:alt',copy.alt],
    ['name','twitter:card','summary_large_image'],['name','twitter:title',copy.title],['name','twitter:description',copy.description],['name','twitter:image',imageUrl],['name','twitter:image:alt',copy.alt],
  ].map(([attribute,name,value])=>`<meta ${attribute}="${name}" content="${escape(value)}" />`).join('\n');
  return template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i,()=>`<title>${escape(copy.title)}</title>`)
    .replace(/<meta\b[^>]*>/gi,tag=>/\b(?:name|property)\s*=\s*["'](?:description|og:[^"']+|twitter:[^"']+)["']/i.test(tag)?'':tag)
    .replace(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi,'')
    .replace(/<\/head>/i,()=>`${tags}\n<link rel="canonical" href="${escape(pageUrl)}" />\n</head>`);
}

export interface QuoteShareDependencies {
  store:StateStore;
  html:()=>Promise<string>;
  image:(card:QuoteSocialCard)=>Promise<Uint8Array>;
}
/** Serve real HTML metadata to every reader, including social crawlers that do not run JavaScript. */
export async function handleQuoteShareRequest(request:Request,deps:QuoteShareDependencies):Promise<Response|undefined> {
  const url=new URL(request.url),match=/^\/q\/([A-Za-z0-9_-]{1,120})(\/social\.png)?\/?$/.exec(url.pathname);
  if(!match)return undefined;
  const headers=new Headers({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...Object.fromEntries(headers),Allow:'GET, HEAD'}});
  const {state}=await deps.store.load(),record=latestRecord(state.quotes,match[1]);
  if(!record||record.deletedAt||record.status==='Draft'||record.draft.is_demo===true){
    headers.set('Content-Type',match[2]?'text/plain; charset=utf-8':'text/html; charset=utf-8');
    return new Response(request.method==='HEAD'?null:match[2]?'Quotation unavailable.':'<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><title>Quotation unavailable | UME INTERIORS</title></head><body><h1>Quotation unavailable</h1><p>This link is unavailable. Please contact UME Interiors for your latest quotation.</p></body></html>',{status:404,headers});
  }
  const card=quotationSocialCard(record),version=await quotationSocialVersion(card);
  if(match[2]){
    headers.set('Content-Type','image/png');headers.set('ETag',`"${version}"`);
    headers.set('Cache-Control','public, max-age=0, must-revalidate');
    if(request.headers.get('If-None-Match')===`"${version}"`)return new Response(null,{status:304,headers});
    if(request.method==='HEAD')return new Response(null,{headers});
    const png=await deps.image(card);
    return new Response(new Uint8Array(png).buffer,{headers});
  }
  headers.set('Content-Type','text/html; charset=utf-8');
  const pageUrl=`${url.origin}/q/${match[1]}`;
  const body=request.method==='HEAD'?null:quotationSocialHtml(await deps.html(),card,pageUrl,`${pageUrl}/social.png?v=${version}`);
  return new Response(body,{headers});
}
