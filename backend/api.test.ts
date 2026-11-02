import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi, type StateStore } from './api';
import { emptyState, type StudioState, type PublishedQuotationRecord } from './routes';
import { createOwner, issueSession, validSession, verifyPassword } from './auth';
import { VIDYA_SAGAR_REDDY_DRAFT } from '../src/lib/historicalData';
import { calculateQuotationPricing } from '../src/lib/pricing';

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
  assert.deepEqual(originalData.quote.snapshot,snapshot);
  assert.equal(originalData.quote.supersededByPublicId,second.publicId);
  const changed = await handleApi(request(`/api/studio/quotes/${second.publicId}/default-package`,'PATCH',{defaultSentPackage:{...defaultSentPackage,grade:'Normal'}},cookie),store,environment);
  assert.equal(changed.status,200);
  assert.equal((await changed.json() as any).quote.defaultSentPackage.grade,'Normal');
});
