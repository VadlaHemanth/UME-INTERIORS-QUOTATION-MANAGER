import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi, type StateStore } from './api';
import { emptyState, type StudioState, type PublishedQuotationRecord } from './routes';
import { createOwner, issueSession, validSession, verifyPassword } from './auth';
import { VIDYA_SAGAR_REDDY_DRAFT } from '../src/lib/historicalData';
import { calculateQuotationPricing } from '../src/lib/pricing';
import { prepareQuotationDraft, reviewedQuotationNotes } from '../src/lib/quotation-presentation';

const environment = { OWNER_USERNAME: 'owner', OWNER_PASSWORD: 'A-private-local-password-123' };
function memoryStore(initial = emptyState()): StateStore {
  let value = initial;
  let version = 0;
  return {
    async load() { return { state: structuredClone(value), version }; },
    async save(state: StudioState, expected: number) { if (expected !== version) return false; value = structuredClone(state); version++; return true; },
  };
}
function request(path: string, method = 'GET', body?: unknown, cookie?: string, origin?: string): Request {
  return new Request(`https://studio.example${path}`, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
function cookieFrom(response: Response): string { return response.headers.get('set-cookie')!.split(';')[0]; }

test('owner deletion revokes every revision link, hides records and retains payment history',async()=>{
  const store=memoryStore(paymentFixture());
  const cookie=cookieFrom(await handleApi(request('/api/studio/auth','POST',{username:environment.OWNER_USERNAME,password:environment.OWNER_PASSWORD}),store,environment));
  const initial=(await store.load()).state.quotes[0];
  const route=`/api/studio/quotes/${initial.publicId}`;
  assert.equal((await handleApi(request(route,'DELETE',{confirmDelete:true}),store,environment)).status,401);
  assert.equal((await handleApi(request(route,'DELETE',{},cookie),store,environment)).status,400);
  const revised=await handleApi(request(`${route}/default-package`,'PATCH',{defaultSentPackage:{grade:'Base',protection:'Standard',finish:'SF',brand_preference:null}},cookie),store,environment);
  assert.equal(revised.status,200);
  const current=(await revised.json() as any).quote;
  assert.equal((await handleApi(request(`/api/studio/quotes/${current.publicId}/verified-payment`,'POST',{amountRupees:50000,reference:'DELETE-TEST-RECEIPT'},cookie),store,environment)).status,201);
  const ledger=structuredClone((await store.load()).state.ledger);
  const removed=await handleApi(request(route,'DELETE',{confirmDelete:true},cookie),store,environment);
  assert.equal(removed.status,200);
  assert.deepEqual((await removed.json() as any).quotes,[]);
  for(const id of [initial.publicId,current.publicId]) {
    assert.equal((await handleApi(request(`/api/quotes/${id}`),store,environment)).status,404);
    assert.equal((await handleApi(request('/api/quotes/lookup','POST',{codeOrLink:id}),store,environment)).status,404);
    assert.equal((await handleApi(request(`/api/quotes/${id}/selection`,'PATCH',{}),store,environment)).status,404);
  }
  const bootstrap=await (await handleApi(request('/api/studio/bootstrap','GET',undefined,cookie),store,environment)).json() as any;
  assert.deepEqual(bootstrap.quotes,[]);assert.deepEqual(bootstrap.ledger,ledger);
  const stored=(await store.load()).state;
  assert.ok(stored.quotes.every(q=>q.deletedAt));assert.deepEqual(stored.ledger,ledger);
  assert.equal((await handleApi(request('/api/studio/publish','POST',{draft:current.draft,supersedePublicId:current.publicId,reviewedOwnerRequests:true},cookie),store,environment)).status,404);
  const draftResponse=await handleApi(request('/api/studio/drafts','POST',{draft:{...current.draft,quote:{number:null,date:null,valid_until:null}}},cookie),store,environment);
  assert.equal(draftResponse.status,200);
  const draft=(await draftResponse.json() as any).record;
  assert.equal((await handleApi(request(`/api/studio/quotes/${draft.publicId}`,'DELETE',{confirmDelete:true},cookie),store,environment)).status,200);
  assert.equal((await handleApi(request('/api/studio/drafts','POST',{draft:draft.draft,publicId:draft.publicId},cookie),store,environment)).status,404);
});

test('saved material wording and drawer rates reach new publications without AI-generated notes',async()=>{
  const store=memoryStore(paymentFixture());
  const cookie=cookieFrom(await handleApi(request('/api/studio/auth','POST',{username:environment.OWNER_USERNAME,password:environment.OWNER_PASSWORD}),store,environment));
  const initial=(await store.load()).state;
  const catalogue=structuredClone(initial.catalogue);
  catalogue.materialWording={materialsAndLabour:'Materials and installation labour are included.',externalLaminate:'Approved decorative laminate finish.',internalLaminate:'Approved internal liner finish.',handles:'Included handles'};
  catalogue.commonMaterials=['Woodworking adhesive: Fevicol and Jeevanjor.','Approved soft-close hardware.'];
  assert.equal((await handleApi(request('/api/studio/catalogue','PUT',{...catalogue,materialWording:{...catalogue.materialWording,internalLaminate:''}},cookie),store,environment)).status,400);
  assert.equal((await handleApi(request('/api/studio/catalogue','PUT',catalogue,cookie),store,environment)).status,200);
  const draft=structuredClone(initial.quotes[0].draft);draft.quote.notes=[];draft.owner_requests=[];
  const drawer=structuredClone(catalogue.workTypes['Additional internal drawer']);drawer.rates.Base={Standard:4250,'With PVC':4250};
  draft.rate_card_updates={'Additional internal drawer':drawer};
  const published=await handleApi(request('/api/studio/publish','POST',{draft,supersedePublicId:initial.quotes[0].publicId,reviewedOwnerRequests:true},cookie),store,environment);
  assert.equal(published.status,201);
  const next=(await published.json() as any).record;
  assert.equal(next.catalogueSnapshot.grades.Base.allowances.extraDrawerRupees,4250);
  assert.deepEqual(next.draft.quote.notes,[]);
  const publicData=await (await handleApi(request(`/api/quotes/${next.publicId}`),store,environment)).json() as any;
  assert.deepEqual(publicData.catalogue.materialWording,catalogue.materialWording);
  assert.deepEqual(publicData.catalogue.commonMaterials,catalogue.commonMaterials);
  assert.equal((await store.load()).state.quotes[0].catalogueSnapshot!.materialWording,undefined,'earlier document snapshot stays unchanged');
});

test('unpublished presentation and publication share vocabulary, reviewed notes and prices',async()=>{
  const store=memoryStore();
  const cookie=cookieFrom(await handleApi(request('/api/studio/auth','POST',{username:environment.OWNER_USERNAME,password:environment.OWNER_PASSWORD}),store,environment));
  const catalogue=(await store.load()).state.catalogue;
  const draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.rooms[0].items[1].name='Inside Wardrobe Box Locker';
  draft.rooms[0].items[1].source_text_en='Box-type internal locker with inside laminate and outside laminate finish.';
  draft.quote.notes=['Confirm access before installation.'];
  draft.owner_requests=[{path:'/quote/terms_notes',text:'Customer will confirm the installation layout.'},{path:'/discount',text:'Discount requested; needs approval.'},{path:'/payment',text:'Unverified payment claim.'}];
  const before=structuredClone(draft);
  const preview=prepareQuotationDraft(draft,catalogue);preview.quote.notes=reviewedQuotationNotes(preview,true);
  assert.deepEqual(draft,before,'preparing a preview must not alter the editor draft');
  assert.equal(preview.rooms[0].items[1].name,'Internal Wardrobe Locker');
  assert.deepEqual(preview.quote.notes,['Confirm access before installation.','Customer will confirm the installation layout.']);
  const response=await handleApi(request('/api/studio/publish','POST',{draft,reviewedOwnerRequests:true},cookie),store,environment);
  assert.equal(response.status,201);
  const published=(await response.json() as any).record;
  assert.deepEqual(published.draft.rooms,preview.rooms);
  assert.deepEqual(published.draft.quote.notes,preview.quote.notes);
  assert.deepEqual(published.snapshot.rooms,calculateQuotationPricing(preview,catalogue).rooms);
});

test('password hashing, tampered sessions, expiry and owner version invalidation', async () => {
  const owner = await createOwner('owner', environment.OWNER_PASSWORD);
  assert.notEqual(owner.passwordHash, environment.OWNER_PASSWORD);
  assert.equal(await verifyPassword(owner, environment.OWNER_PASSWORD), true);
  assert.equal(await verifyPassword(owner, '9491'), false);
  const now = Date.now();
  const token = await issueSession(owner, now);
  assert.equal(await validSession(owner, token, now), true);
  assert.equal(await validSession(owner, `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`, now), false);
  assert.equal(await validSession(owner, token, now + 8 * 60 * 60 * 1000), false);
  assert.equal(await validSession({ ...owner, version: owner.version + 1 }, token, now), false);
});

test('owner APIs fail closed, login sets secure cookie, credentials persist and logout revokes session', async () => {
  const store = memoryStore();
  assert.equal((await handleApi(request('/api/studio/bootstrap'), store, environment)).status, 401);
  assert.equal((await handleApi(request('/api/quotes/unknown/draft', 'PATCH', {}), store, environment)).status, 401);
  assert.equal((await handleApi(request('/api/assistant/ratecard', 'POST', {}), store, environment)).status, 401);
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { passcode: '9491' }), store, environment)).status, 401);
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: environment.OWNER_PASSWORD }), store, environment);
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
  const cookie = cookieFrom(login);
  const session = await handleApi(request('/api/studio/session', 'GET', undefined, cookie), store, environment);
  assert.deepEqual(await session.json(), { authenticated: true, username: 'owner' });
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, cookie), store, environment)).status, 200);
  const changed = await handleApi(request('/api/studio/credentials', 'PUT', { currentPassword: environment.OWNER_PASSWORD, newUsername: 'subhash', newPassword: 'A-new-private-password-456' }, cookie), store, environment);
  assert.equal(changed.status, 200);
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, cookie), store, environment)).status, 401);
  const renewedCookie = cookieFrom(changed);
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, renewedCookie), store, environment)).status, 200);
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: environment.OWNER_PASSWORD }), store, environment)).status, 401);
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: 'subhash', password: 'A-new-private-password-456' }), store, environment)).status, 200);
  assert.equal((await handleApi(request('/api/studio/logout', 'POST', {}, renewedCookie), store, environment)).status, 200);
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, renewedCookie), store, environment)).status, 401);
});

test('auth requires server configuration and rejects cross-origin requests and repeated guesses', async () => {
  const store = memoryStore();
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: environment.OWNER_PASSWORD }), store, {})).status, 503);
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', {}, undefined, 'https://other.example'), store, environment)).status, 403);
  for (let index = 0; index < 8; index++) assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: 'bad-password' }), store, environment)).status, 401);
  const blocked = await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: environment.OWNER_PASSWORD }), store, environment);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

test('customer routes stay public and invalid selection/payment inputs are rejected', async () => {
  const store = memoryStore();
  assert.equal((await handleApi(request('/api/quotes/unknown'), store, environment)).status, 404);
  assert.equal((await handleApi(request('/api/quotes/unknown/selection', 'PATCH', { wholeHomeSelection: { grade: 'Fake' } }), store, environment)).status, 400);
  assert.equal((await handleApi(request('/api/quotes/unknown/payments', 'POST', { amountRupees: -100 }), store, environment)).status, 400);
});

function paymentFixture(small = false): StudioState {
  const state = emptyState();
  const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.customer = { name: 'API Test Customer', site: 'Test site', phone: '9000000000' };
  draft.quote = { number: 'TEST-API', date: '2026-11-01', valid_until: '2099-12-31' };
  if (small) {
    draft.rooms = [draft.rooms[0]];
    draft.rooms[0].items = [draft.rooms[0].items[0]];
    draft.rooms[0].items[0].custom_rates = { Base: 1, Normal: 2, Premium: 3, pvc_adder: 0 };
  }
  const selection = { grade: 'Premium', protection: 'Standard', finish: 'SF', brand_preference: null } as const;
  const quote: PublishedQuotationRecord = {
    publicId: 'ume-test-api', revision: 1, status: 'Sent', publishedAt: new Date().toISOString(), viewsCount: 0, lastViewedAt: null,
    draft, snapshot: calculateQuotationPricing(draft, state.catalogue), approvedDiscountRupees: 0, defaultSentPackage: selection,
    lastCustomerSelection: { wholeHomeSelection: selection, mixByRoom: false, roomSelections: {}, selectedOptionalPointers: [], acceptedTermsAt: null },
  };
  state.quotes.push(quote);
  return state;
}

test('payment submissions are pending until an authenticated owner verifies them', async () => {
  const store = memoryStore(paymentFixture());
  const submitted = await handleApi(request('/api/quotes/ume-test-api/payments', 'POST', { utrReference: 'TEST-REFERENCE-123456', amountRupees: 50000, method: 'UPI / PhonePe' }), store, environment);
  assert.equal(submitted.status, 201);
  const entry = (await submitted.json() as any).entry;
  assert.equal(entry.status, 'Payment submitted');
  const beforeVerification = await handleApi(request('/api/quotes/ume-test-api'), store, environment);
  assert.equal((await beforeVerification.json() as any).verifiedPaidRupees, 0);
  assert.equal((await handleApi(request(`/api/studio/payments/${entry.id}`, 'PATCH', { action: 'verify' }), store, environment)).status, 401);
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: environment.OWNER_USERNAME, password: environment.OWNER_PASSWORD }), store, environment);
  assert.equal((await handleApi(request(`/api/studio/payments/${entry.id}`, 'PATCH', { action: 'verify' }, cookieFrom(login)), store, environment)).status, 200);
  const verified = await handleApi(request('/api/quotes/ume-test-api'), store, environment);
  assert.equal((await verified.json() as any).verifiedPaidRupees, 50000);
});

test('small projects and payments exceeding the UPI limit are blocked on the server', async () => {
  const small = await handleApi(request('/api/quotes/ume-test-api/payments', 'POST', { utrReference: 'TEST-SMALL-123456', amountRupees: 50000, method: 'UPI / PhonePe' }), memoryStore(paymentFixture(true)), environment);
  assert.equal(small.status, 400);
  assert.match((await small.json() as any).error, /small project/);
  const overLimit = await handleApi(request('/api/quotes/ume-test-api/payments', 'POST', { utrReference: 'TEST-LIMIT-123456', amountRupees: 150000, method: 'UPI / PhonePe' }), memoryStore(paymentFixture()), environment);
  assert.equal(overLimit.status, 400);
  assert.match((await overLimit.json() as any).error, /UPI limit/);
});

test('quotation-number lookup requires the full registered phone; token links remain usable', async () => {
  const state = paymentFixture();
  const store = memoryStore(state);
  assert.equal((await handleApi(request('/api/quotes/lookup', 'POST', { codeOrLink: 'TEST-API', phone: '0000' }), store, environment)).status, 403);
  assert.equal((await handleApi(request('/api/quotes/lookup', 'POST', { codeOrLink: 'TEST-API', phone: '9000000000' }), store, environment)).status, 200);
  assert.equal((await handleApi(request('/api/quotes/lookup', 'POST', { codeOrLink: 'ume-test-api' }), store, environment)).status, 200);
  state.quotes[0].draft.customer.phone = null;
  assert.equal((await handleApi(request('/api/quotes/lookup', 'POST', { codeOrLink: 'TEST-API', phone: '9000000000' }), memoryStore(state), environment)).status, 403);
});

test('every public quote response excludes owner notes, raw rate edits, history and analytics while owner access retains them', async () => {
  const state = paymentFixture();
  const record = state.quotes[0];
  const secret = 'PRIVATE-OWNER-NOTE-DO-NOT-SHARE';
  record.draft.owner_requests = [{ path: '', text: secret }];
  record.draft.needs_clarification = [{ path: '', question: secret }];
  record.draft.rate_card_updates = { privateOwnerNote: secret };
  record.draft.rooms[0].items[0].custom_rates = { Base: 123, Normal: 456, Premium: 789 };
  (record as any).internalOwnerNote = secret;
  record.selectionHistory = [{ id: 'owner-history', summaryLabel: secret, finalTotalRupees: 123, mixByRoom: false, wholeHomeSelection: record.defaultSentPackage, roomSelections: {}, selectedOptionalPointers: [], savedAt: new Date().toISOString() }];
  Object.values(state.catalogue.workTypes)[0].label = secret;
  const store = memoryStore(state);
  const operations = [
    request('/api/quotes/ume-test-api'),
    request('/api/quotes/lookup', 'POST', { codeOrLink: 'ume-test-api' }),
    request('/api/quotes/ume-test-api/selection', 'PATCH', { wholeHomeSelection: record.defaultSentPackage, explicitCustomerSave: true }),
    request('/api/quotes/ume-test-api/feedback', 'POST', { topic: 'Customer question', message: 'Please confirm this room size.' }),
    request('/api/quotes/ume-test-api/payments', 'POST', { utrReference: 'TEST-PRIVACY-123456', amountRupees: 50000, method: 'UPI / PhonePe' }),
  ];
  for (const operation of operations) {
    const response = await handleApi(operation, store, environment);
    assert.ok(response.ok, await response.clone().text());
    const raw = await response.text();
    assert.equal(raw.includes(secret), false);
    const payload = JSON.parse(raw);
    assert.deepEqual(payload.quote.draft.owner_requests, []);
    assert.deepEqual(payload.quote.draft.needs_clarification, []);
    assert.equal('rate_card_updates' in payload.quote.draft, false);
    assert.equal('custom_rates' in payload.quote.draft.rooms[0].items[0], false);
    assert.equal('pvc' in payload.quote.draft.rooms[0].items[0], false);
    assert.equal('selectionHistory' in payload.quote, false);
    assert.equal('viewsCount' in payload.quote, false);
    assert.equal('lastViewedAt' in payload.quote, false);
    assert.equal('internalOwnerNote' in payload.quote, false);
    assert.ok(payload.quote.snapshot.rooms[0].items[0].unitRates);
    assert.ok(payload.quote.lastCustomerSelection.wholeHomeSelection);
    if (payload.catalogue) assert.deepEqual(payload.catalogue.workTypes, {});
  }
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: environment.OWNER_USERNAME, password: environment.OWNER_PASSWORD }), store, environment);
  const owner = await handleApi(request('/api/quotes/ume-test-api', 'GET', undefined, cookieFrom(login)), store, environment);
  const payload = await owner.json() as any;
  assert.equal(payload.quote.draft.owner_requests.some((entry: any) => entry.text === secret), true);
  assert.ok(payload.quote.draft.rate_card_updates);
  assert.ok(payload.quote.draft.rooms[0].items[0].custom_rates);
  assert.ok(payload.quote.selectionHistory.length);
  assert.ok(Object.keys(payload.catalogue.workTypes).length);
});


test('owner publication, customer save and immutable revision work through the shared API', async () => {
  const store = memoryStore();
  const login = await handleApi(request('/api/studio/auth', 'POST', {username: environment.OWNER_USERNAME, password: environment.OWNER_PASSWORD}), store, environment);
  const cookie = cookieFrom(login);
  const draft = structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.is_demo = false;
  draft.quote = {number: 'INTEGRATION-001', date: null, valid_until: null};
  const defaultSentPackage = {grade:'Base', protection:'Standard', finish:'SF', brand_preference:null};
  const payload = {draft, reviewedOwnerRequests:true, approvedDiscountRupees:0, defaultSentPackage};
  const published = await handleApi(request('/api/studio/publish','POST',payload,cookie),store,environment);
  assert.equal(published.status,201);
  const first = (await published.json() as any).record;
  assert.ok(first.publicId.startsWith('ume'));
  assert.equal('pvc' in first.draft.rooms[0].items[0], false);
  const snapshot = structuredClone(first.snapshot);
  const selected = await handleApi(request(`/api/quotes/${first.publicId}/selection`,'PATCH', {
    wholeHomeSelection: defaultSentPackage, mixByRoom:true,
    roomSelections:{0:{grade:'Premium',protection:'With PVC',finish:'SF',brand_preference:null}},
    selectedOptionalPointers:[], explicitCustomerSave:true,
  }),store,environment);
  assert.equal(selected.status,200);
  assert.equal((await selected.json() as any).quote.lastCustomerSelection.roomSelections[0].grade,'Premium');
  const revisedDraft = structuredClone(draft);
  revisedDraft.rooms[0].items[0].measure.per_item! += 1;
  const revision = await handleApi(request('/api/studio/publish','POST',{...payload,draft:revisedDraft,supersedePublicId:first.publicId},cookie),store,environment);
  assert.equal(revision.status,201);
  const second = (await revision.json() as any).record;
  assert.equal(second.revision,2);
  assert.notEqual(second.publicId,first.publicId);
  const original = await handleApi(request(`/api/quotes/${first.publicId}`),store,environment);
  const originalData = await original.json() as any;
  assert.equal(originalData.quote.publicId,second.publicId,'an existing customer link opens the latest revision');
  const historical = (await store.load()).state.quotes.find(q=>q.publicId===first.publicId)!;
  assert.deepEqual(historical.snapshot,snapshot,'the previous owner revision remains immutable');
  assert.equal(historical.supersededByPublicId,second.publicId);
  const changed = await handleApi(request(`/api/studio/quotes/${second.publicId}/default-package`,'PATCH',{defaultSentPackage:{...defaultSentPackage,grade:'Normal'}},cookie),store,environment);
  assert.equal(changed.status,200);
  assert.equal((await changed.json() as any).quote.defaultSentPackage.grade,'Normal');
});

test('saved drafts stay private, new metadata is generated and draft publication starts at revision one',async()=>{
  const store=memoryStore();
  const login=await handleApi(request('/api/studio/auth','POST',{username:environment.OWNER_USERNAME,password:environment.OWNER_PASSWORD}),store,environment);
  const cookie=cookieFrom(login);
  const draft=structuredClone(VIDYA_SAGAR_REDDY_DRAFT);
  draft.quote={number:null,date:null,valid_until:null,notes:['Materials and labour are included in the itemised scope.'],show_recommended_package:true};
  const saved=await handleApi(request('/api/studio/drafts','POST',{draft},cookie),store,environment);
  assert.equal(saved.status,200);
  const record=(await saved.json() as any).record;
  assert.equal(record.status,'Draft');assert.equal(record.revision,0);assert.match(record.draft.quote.number,/^UME-\d{2}-\d{4}$/);assert.match(record.draft.quote.date,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await handleApi(request(`/api/quotes/${record.publicId}`),store,environment)).status,404);
  assert.equal((await handleApi(request(`/api/quotes/${record.publicId}/selection`,'PATCH',{}),store,environment)).status,404);
  const published=await handleApi(request('/api/studio/publish','POST',{draft:record.draft,supersedePublicId:record.publicId,reviewedOwnerRequests:true},cookie),store,environment);
  assert.equal(published.status,201);
  const final=(await published.json() as any).record;
  assert.equal(final.revision,1);assert.equal(final.draft.quote.number,record.draft.quote.number);
  const visible=await handleApi(request(`/api/quotes/${record.publicId}`),store,environment);
  const data=await visible.json() as any;
  assert.equal(data.quote.publicId,final.publicId);assert.equal(data.quote.draft.quote.show_recommended_package,true);
  assert.deepEqual(data.quote.draft.quote.notes,['Materials and labour are included in the itemised scope.']);
  assert.equal('pvcEligible' in data.quote.snapshot.rooms[0].items[0],false);
});

test('saved rate-card edits price the next revision, preserve the previous snapshot and do not revoke the owner session',async()=>{
  const store=memoryStore(paymentFixture());
  const login=await handleApi(request('/api/studio/auth','POST',{username:environment.OWNER_USERNAME,password:environment.OWNER_PASSWORD}),store,environment);
  const cookie=cookieFrom(login);
  const initial=(await store.load()).state;
  const original=structuredClone(initial.quotes[0].snapshot);
  const catalogue=structuredClone(initial.catalogue);
  catalogue.workTypes['Box type'].rates.Premium={Standard:1500,'With PVC':1575};
  catalogue.grades.Premium.allowances!.handleRupees=275;
  assert.equal((await handleApi(request('/api/studio/catalogue','PUT',catalogue,cookie),store,environment)).status,200);
  assert.equal((await handleApi(request('/api/studio/session','GET',undefined,cookie),store,environment)).status,200);
  const published=await handleApi(request('/api/studio/publish','POST',{draft:initial.quotes[0].draft,supersedePublicId:initial.quotes[0].publicId,reviewedOwnerRequests:true},cookie),store,environment);
  assert.equal(published.status,201);
  const next=(await published.json() as any).record;
  assert.equal(next.snapshot.rooms[0].items[1].unitRates.Premium__Standard__SF,1500);
  assert.equal(next.catalogueSnapshot.grades.Premium.allowances.handleRupees,275);
  assert.deepEqual((await store.load()).state.quotes[0].snapshot,original);
  const latest=await handleApi(request(`/api/quotes/${initial.quotes[0].publicId}`),store,environment);
  assert.equal((await latest.json() as any).quote.publicId,next.publicId);
  assert.equal((await handleApi(request('/api/studio/bootstrap','GET',undefined,cookie),store,environment)).status,200);
});

test('verified booking freezes the agreed selection into a work order and credits payments across later revisions',async()=>{
  const store=memoryStore(paymentFixture());
  const login=await handleApi(request('/api/studio/auth','POST',{username:environment.OWNER_USERNAME,password:environment.OWNER_PASSWORD}),store,environment);
  const cookie=cookieFrom(login);
  const selected={grade:'Normal',protection:'With PVC',finish:'SF',brand_preference:null};
  await handleApi(request('/api/quotes/ume-test-api/selection','PATCH',{wholeHomeSelection:selected,mixByRoom:false,roomSelections:{},selectedOptionalPointers:[],explicitCustomerSave:true,acceptedTerms:true}),store,environment);
  const verified=await handleApi(request('/api/studio/quotes/ume-test-api/verified-payment','POST',{amountRupees:50000,reference:'BANK-VERIFIED-0001'},cookie),store,environment);
  assert.equal(verified.status,201);
  const first=(await verified.json() as any).quote;
  assert.equal(first.workOrder.selection.wholeHomeSelection.grade,'Normal');
  assert.equal((await handleApi(request('/api/quotes/ume-test-api/selection','PATCH',{wholeHomeSelection:{...selected,grade:'Premium'}}),store,environment)).status,409);
  const draft=structuredClone(first.draft);draft.rooms[0].items[0].measure.per_item+=1;
  const revised=await handleApi(request('/api/studio/publish','POST',{draft,supersedePublicId:first.publicId,reviewedOwnerRequests:true},cookie),store,environment);
  assert.equal(revised.status,201);
  const next=(await revised.json() as any).record;
  assert.equal(next.workOrder.selection.wholeHomeSelection.grade,'Normal');
  assert.equal(next.revision,2);
  const visible=await handleApi(request('/api/quotes/ume-test-api'),store,environment);
  const data=await visible.json() as any;
  assert.equal(data.quote.publicId,next.publicId);assert.equal(data.verifiedPaidRupees,50000);assert.ok(data.quote.workOrder);
  assert.ok(data.quote.workOrder.totalRupees > first.workOrder.totalRupees);
  assert.equal((await handleApi(request('/api/studio/quotes/ume-test-api/verified-payment','POST',{amountRupees:50000,reference:'BANK-VERIFIED-0001'},cookie),store,environment)).status,409);
});


test('Cloudflare secret changes replace saved login, revoke sessions immediately, and preserve Account edits until secrets change', async () => {
  const store = memoryStore();
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: environment.OWNER_PASSWORD }), store, environment);
  const originalCookie = cookieFrom(login);
  const changed = await handleApi(request('/api/studio/credentials', 'PUT', {
    currentPassword: environment.OWNER_PASSWORD, newUsername: 'subhash', newPassword: 'Private-account-password-789',
  }, originalCookie), store, environment);
  const accountCookie = cookieFrom(changed);
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, accountCookie), store, { ...environment })).status, 200);
  const rotated = { OWNER_USERNAME: 'studio-admin', OWNER_PASSWORD: 'Rotated-cloud-secret-456' };
  const session = await handleApi(request('/api/studio/session', 'GET', undefined, accountCookie), store, rotated);
  assert.deepEqual(await session.json(), { authenticated: false, username: null });
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, accountCookie), store, rotated)).status, 401);
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: 'subhash', password: 'Private-account-password-789' }), store, rotated)).status, 401);
  const renewed = await handleApi(request('/api/studio/auth', 'POST', { username: rotated.OWNER_USERNAME, password: rotated.OWNER_PASSWORD }), store, rotated);
  assert.equal(renewed.status, 200);
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, cookieFrom(renewed)), store, rotated)).status, 200);
  const saved = (await store.load()).state;
  assert.equal(saved.owner!.username, rotated.OWNER_USERNAME);
  assert.ok(saved.owner!.environmentCredentials?.salt);
  assert.ok(!JSON.stringify(saved).includes(rotated.OWNER_PASSWORD));
  assert.ok(!JSON.stringify(saved).includes(environment.OWNER_PASSWORD));
});

test('username-only and password-only secret rotation both apply without deleting stored quotations', async () => {
  const state = paymentFixture();
  const originalQuotes = structuredClone(state.quotes);
  const store = memoryStore(state);
  await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: environment.OWNER_PASSWORD }), store, environment);
  const usernameOnly = { ...environment, OWNER_USERNAME: 'new-owner' };
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: usernameOnly.OWNER_USERNAME, password: usernameOnly.OWNER_PASSWORD }), store, usernameOnly);
  assert.equal(login.status, 200);
  const passwordOnly = { ...usernameOnly, OWNER_PASSWORD: 'Another-cloud-secret-890' };
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, cookieFrom(login)), store, passwordOnly)).status, 401);
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: passwordOnly.OWNER_USERNAME, password: passwordOnly.OWNER_PASSWORD }), store, passwordOnly)).status, 200);
  assert.deepEqual((await store.load()).state.quotes, originalQuotes);
});

test('legacy accounts reconcile existing Cloudflare secrets and invalid secret values fail closed', async () => {
  const state = emptyState();
  state.owner = await createOwner('legacy-owner', 'Legacy-password-12345');
  const legacyCookie = 'ume_owner=' + await issueSession(state.owner);
  const store = memoryStore(state);
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, legacyCookie), store, environment)).status, 401);
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: environment.OWNER_USERNAME, password: environment.OWNER_PASSWORD }), store, environment)).status, 200);
  const invalidEnvironment = { ...environment, OWNER_PASSWORD: 'short' };
  const invalid = await handleApi(request('/api/studio/auth', 'POST', { username: environment.OWNER_USERNAME, password: environment.OWNER_PASSWORD }), store, invalidEnvironment);
  assert.equal(invalid.status, 503);
  const message = (await invalid.json() as any).error;
  assert.ok(message.includes('OWNER_PASSWORD must be 12–256 characters'));
  assert.ok(!message.includes('OWNER_USERNAME must'));
  assert.ok(!message.includes(invalidEnvironment.OWNER_PASSWORD));
  const absent = await handleApi(request('/api/studio/session'), store, {});
  assert.equal(absent.status, 503);
  const missingMessage = (await absent.json() as any).error;
  assert.ok(missingMessage.includes('OWNER_USERNAME is missing'));
  assert.ok(missingMessage.includes('OWNER_PASSWORD is missing'));
});


test('secret rotation also strips owner-only quote data from an old session on a public read', async () => {
  const state = paymentFixture();
  state.quotes[0].draft.owner_requests = [{ path: '/quote', text: 'Private proprietor note' }];
  const store = memoryStore(state);
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: 'owner', password: environment.OWNER_PASSWORD }), store, environment);
  const rotated = { ...environment, OWNER_PASSWORD: 'New-private-cloud-secret-2026' };
  const response = await handleApi(request('/api/quotes/ume-test-api', 'GET', undefined, cookieFrom(login)), store, rotated);
  assert.equal(response.status, 200);
  assert.deepEqual(((await response.json()) as any).quote.draft.owner_requests, []);
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, cookieFrom(login)), store, rotated)).status, 401);
});


test('Cloudflare usernames support email addresses and business names with consistent whitespace handling', async () => {
  const store = memoryStore();
  const configured = { ...environment, OWNER_USERNAME: '  Studio Owner  ' };
  const first = await handleApi(request('/api/studio/auth', 'POST', { username: ' Studio Owner ', password: configured.OWNER_PASSWORD }), store, configured);
  assert.equal(first.status, 200);
  assert.equal((await first.clone().json() as any).username, 'Studio Owner');
  const email = { ...configured, OWNER_USERNAME: '  ume.office+owner@example.com  ' };
  assert.equal((await handleApi(request('/api/studio/bootstrap', 'GET', undefined, cookieFrom(first)), store, email)).status, 401);
  const next = await handleApi(request('/api/studio/auth', 'POST', { username: 'ume.office+owner@example.com', password: email.OWNER_PASSWORD }), store, email);
  assert.equal(next.status, 200);
  assert.equal((await store.load()).state.owner!.username, 'ume.office+owner@example.com');
  assert.equal((await handleApi(request('/api/studio/auth', 'POST', { username: 'ume.office+owner@example.com', password: email.OWNER_PASSWORD.trim() + ' ' }), store, email)).status, 401, 'password whitespace is never silently changed');
});


test('owner business settings persist edited payment recipient and stale rate-card tabs cannot overwrite them', async () => {
  const store = memoryStore(paymentFixture());
  const original = structuredClone((await store.load()).state.catalogue);
  assert.equal((await handleApi(request('/api/studio/company', 'PUT', { company: original.company }), store, environment)).status, 401);
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: environment.OWNER_USERNAME, password: environment.OWNER_PASSWORD }), store, environment);
  const cookie = cookieFrom(login);
  const company = structuredClone(original.company);
  company.brandName = 'UME Interiors Studio';
  company.proprietor = 'Updated Proprietor';
  company.bank.upiId = 'updated.owner@oksbi';
  company.bank.accountName = 'UPDATED ACCOUNT HOLDER';
  company.bank.accountNumber = '001234567890';
  const changed = await handleApi(request('/api/studio/company', 'PUT', { company }, cookie), store, environment);
  assert.equal(changed.status, 200);
  assert.deepEqual((await changed.json() as any).company, company);
  // Subsequent requests previously reset UPI to a hardcoded default.
  const quote = await handleApi(request('/api/quotes/ume-test-api'), store, environment);
  assert.equal((await quote.json() as any).catalogue.company.bank.upiId, company.bank.upiId);
  const staleRateCard = structuredClone(original);
  staleRateCard.workTypes['Box type'].rates.Base.Standard = 975;
  const saveRates = await handleApi(request('/api/studio/catalogue', 'PUT', staleRateCard, cookie), store, environment);
  assert.equal(saveRates.status, 200);
  const saved = (await store.load()).state;
  assert.deepEqual(saved.catalogue.company, company);
  assert.equal(saved.catalogue.workTypes['Box type'].rates.Base.Standard, 975);
  assert.deepEqual(saved.quotes[0].snapshot, paymentFixture().quotes[0].snapshot);
  assert.equal(saved.catalogue.company.bank.accountNumber, '001234567890');
});

test('invalid owner business settings are rejected without changing stored payment details', async () => {
  const store = memoryStore();
  const login = await handleApi(request('/api/studio/auth', 'POST', { username: environment.OWNER_USERNAME, password: environment.OWNER_PASSWORD }), store, environment);
  const cookie = cookieFrom(login);
  const original = structuredClone((await store.load()).state.catalogue.company);
  const invalid = structuredClone(original);
  invalid.bank.upiId = 'not-a-payment-address';
  invalid.bank.ifsc = 'invalid';
  const response = await handleApi(request('/api/studio/company', 'PUT', { company: invalid }, cookie), store, environment);
  assert.equal(response.status, 400);
  const payload = await response.json() as any;
  assert.ok(payload.errors['bank.upiId']);
  assert.ok(payload.errors['bank.ifsc']);
  assert.deepEqual((await store.load()).state.catalogue.company, original);
  assert.equal((await handleApi(request('/api/studio/company', 'PUT', { company: original }, cookie, 'https://another.example'), store, environment)).status, 403);
});


test('public portal loads current business identity without bank, rate-card or owner authentication data', async () => {
  const initial = emptyState();
  initial.catalogue.company.brandName = 'UME Updated Display Name';
  const response = await handleApi(request('/api/company'), memoryStore(initial), environment);
  assert.equal(response.status, 200);
  const payload = await response.json() as any;
  assert.equal(payload.company.brandName, initial.catalogue.company.brandName);
  assert.equal('bank' in payload.company, false);
  assert.equal('catalogue' in payload, false);
  assert.equal('owner' in payload, false);
  assert.match(response.headers.get('cache-control')!, /no-store/);
});


test('customer quote allowlist retains floor-plan checkbox metadata while hiding private metadata', async () => {
  const state = paymentFixture();
  state.quotes[0].draft.quote.is_floor_plan_estimate = true;
  state.quotes[0].draft.quote.estimate_basis = 'floor_plan'; // Accepted legacy import metadata.
  (state.quotes[0].draft.quote as any).internalOwnerNote = 'Not customer visible';
  const response = await handleApi(request('/api/quotes/ume-test-api'), memoryStore(state), environment);
  const payload = await response.json() as any;
  assert.equal(payload.quote.draft.quote.is_floor_plan_estimate, true);
  assert.equal(payload.quote.draft.quote.estimate_basis, 'floor_plan');
  assert.equal('internalOwnerNote' in payload.quote.draft.quote, false);
});
