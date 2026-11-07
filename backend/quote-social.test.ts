import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleQuoteShareRequest,quotationSocialCard,quotationSocialCopy,quotationSocialHtml,quotationSocialVersion} from './quote-social';
import {createSocialImageRenderer,quotationSocialSvg} from './social-image';
import {emptyState,type PublishedQuotationRecord} from './routes';
import {VIDYA_SAGAR_REDDY_DRAFT} from '../src/lib/historicalData';
import {calculateQuotationPricing} from '../src/lib/pricing';

const template='<!doctype html><html><head><title>Default</title><meta name="description" content="old"><meta property="og:title" content="old"><meta name="twitter:card" content="summary_large_image"></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
function fixture(){
  const state=emptyState(),draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.customer={name:'Anita & Rahul Rao',phone:'9876543210',site:'PRIVATE-HOME-ADDRESS'};draft.quote={number:'UME-26-0042',date:'2026-11-07',valid_until:'2026-12-07',notes:['PRIVATE-OWNER-NOTE']};draft.is_demo=false;
  const selection={grade:'Normal',protection:'Standard',finish:'SF',brand_preference:null} as const;
  const record:PublishedQuotationRecord={publicId:'ume-social-test',revision:1,status:'Sent',publishedAt:'2026-11-07T06:00:00Z',viewsCount:0,lastViewedAt:null,draft,snapshot:calculateQuotationPricing(draft),approvedDiscountRupees:919191,catalogueSnapshot:state.catalogue,defaultSentPackage:selection,lastCustomerSelection:{wholeHomeSelection:selection,mixByRoom:false,roomSelections:{},selectedOptionalPointers:[],acceptedTermsAt:null}};
  state.quotes.push(record);let images=0,saves=0;
  const deps={store:{load:async()=>({state,version:0}),save:async()=>{saves++;return true;}},html:async()=>template,image:async()=>{images++;return new Uint8Array([137,80,78,71]);}};
  return {state,record,deps,counts:()=>({images,saves})};
}

test('social HTML has personalized server-rendered metadata and an absolute PNG, without private or financial details',async()=>{
  const {record,deps,counts}=fixture();
  const response=(await handleQuoteShareRequest(new Request('https://example.test/q/ume-social-test?pkg=Premium'),deps))!;
  assert.equal(response.status,200);assert.match(response.headers.get('Content-Type')!,/text\/html/);
  const html=await response.text();
  assert.match(html,/<title>Quotation for Anita &amp; Rahul Rao \| UME INTERIORS<\/title>/);
  assert.equal((html.match(/property="og:title"/g)||[]).length,1);assert.equal((html.match(/name="description"/g)||[]).length,1);
  assert.match(html,/https:\/\/example.test\/q\/ume-social-test\/social.png\?v=[a-f0-9]+/);
  assert.match(html,/property="og:image:type" content="image\/png"/);assert.match(html,/property="og:image:width" content="1200"/);assert.match(html,/property="og:image:height" content="630"/);
  assert.match(html,/<script src="\/app.js"><\/script>/);assert.doesNotMatch(html,/9876543210|PRIVATE-HOME-ADDRESS|PRIVATE-OWNER-NOTE|919191|35976768268|9177389543|₹/);
  assert.match(response.headers.get('X-Robots-Tag')!,/noindex/);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(record.viewsCount,0);assert.equal(record.status,'Sent');assert.deepEqual(counts(),{images:0,saves:0});
});

test('old links resolve latest metadata; versions change on public identity changes but not prices',async()=>{
  const {state,record,deps}=fixture(),original=await quotationSocialVersion(quotationSocialCard(record));
  record.approvedDiscountRupees=111;assert.equal(await quotationSocialVersion(quotationSocialCard(record)),original);
  const revised=structuredClone(record);revised.publicId='ume-revised';revised.revision=2;revised.draft.customer.name='Updated Name';record.supersededByPublicId=revised.publicId;state.quotes.push(revised);
  const response=(await handleQuoteShareRequest(new Request('https://example.test/q/ume-social-test'),deps))!;
  assert.match(await response.text(),/Quotation for Updated Name/);assert.notEqual(await quotationSocialVersion(quotationSocialCard(revised)),original);
});

test('images support HEAD and conditional GET but unavailable/deleted/draft links never disclose a card',async()=>{
  const {record,deps,counts}=fixture(),url='https://example.test/q/ume-social-test/social.png';
  const head=(await handleQuoteShareRequest(new Request(url,{method:'HEAD'}),deps))!;assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(counts().images,0);
  const response=(await handleQuoteShareRequest(new Request(url),deps))!;assert.equal(response.headers.get('Content-Type'),'image/png');assert.equal(counts().images,1);
  const tag=response.headers.get('ETag')!;
  assert.equal((await handleQuoteShareRequest(new Request(url,{headers:{'If-None-Match':tag}}),deps))!.status,304);
  record.deletedAt='2026-11-07T08:00:00Z';assert.equal((await handleQuoteShareRequest(new Request(url,{headers:{'If-None-Match':tag}}),deps))!.status,404);
  delete record.deletedAt;record.status='Draft';assert.equal((await handleQuoteShareRequest(new Request('https://example.test/q/ume-social-test'),deps))!.status,404);
  record.status='Sent';record.draft.is_demo=true;assert.equal((await handleQuoteShareRequest(new Request(url),deps))!.status,404);
  assert.equal((await handleQuoteShareRequest(new Request('https://example.test/q/missing'),deps))!.status,404);
  assert.equal(await handleQuoteShareRequest(new Request('https://example.test/owner'),deps),undefined);assert.equal(counts().images,1);
});

test('metadata and SVG escape markup, and work orders use agreed scope and the India confirmation date',()=>{
  const {record}=fixture();record.draft.customer.name='Name " onload="<script>alert(1)</script>';
  let card=quotationSocialCard(record);const html=quotationSocialHtml(template,card,'https://example.test/q/x','https://example.test/q/x/social.png');assert.doesNotMatch(html,/<script>alert/);assert.match(html,/&lt;script&gt;/);
  const svg=quotationSocialSvg(card,new Uint8Array());assert.doesNotMatch(svg,/<script>alert/);assert.match(svg,/&lt;script&gt;/);
  const dollars=quotationSocialHtml(template,{...card,customerName:'Name $& and $\' and $`'},'https://example.test/q/x','https://example.test/q/x/social.png');
  assert.equal((dollars.match(/<title>/g)||[]).length,1);assert.ok(dollars.includes('Name $&amp; and $&#39; and $`'));assert.equal((dollars.match(/<script src="\/app.js">/g)||[]).length,1);
  record.workOrder={confirmedAt:'2026-11-07T20:00:00Z',sourceRevision:1,totalRupees:919191,selection:record.lastCustomerSelection};
  card=quotationSocialCard(record);assert.equal(card.documentType,'Work order');assert.equal(card.issueDate,'08-11-2026');assert.match(quotationSocialCopy(card).description,/agreed furniture scope/);assert.doesNotMatch(JSON.stringify(card),/919191/);
});

test('the real Wasm renderer produces a 1200×630 PNG and reuses rendered cards',async()=>{
  const {record}=fixture();let assets=0;
  const renderer=createSocialImageRenderer(async()=>readFile(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm',import.meta.url)),async asset=>{assets++;return new Uint8Array(await readFile(new URL('../public'+asset,import.meta.url)));});
  const png=await renderer(quotationSocialCard(record));assert.deepEqual(Array.from(png.slice(0,8)),[137,80,78,71,13,10,26,10]);
  const size=new DataView(png.buffer,png.byteOffset,png.byteLength);assert.equal(size.getUint32(16),1200);assert.equal(size.getUint32(20),630);
  assert.equal(await renderer(quotationSocialCard(record)),png);assert.equal(assets,2);
});
