import { createOwner, rememberEnvironmentCredentials, reconcileEnvironmentCredentials, issueSession, readSession, sessionCookie, validPassword, validSession, validUsername, verifyPassword } from './auth';
import { registerDataRoutes, type ApiContext, type ApiReply, type ApiRouter, type StudioState } from './routes';
import { publicCatalogue, publicQuote } from './public-quote';
import { upgradeCatalogue } from '../src/lib/commercial-spec';

export interface ApiEnvironment { OWNER_USERNAME?: string; OWNER_PASSWORD?: string }
export interface StateStore {
  load(): Promise<{ state: StudioState; version: number }>;
  save(state: StudioState, expectedVersion: number): Promise<boolean>;
}

function ownerConfigurationError(env: ApiEnvironment): string {
  const issues: string[] = [];
  if (!env.OWNER_USERNAME) issues.push('OWNER_USERNAME is missing from the deployed Worker');
  else if (!validUsername(env.OWNER_USERNAME)) issues.push('OWNER_USERNAME must be 3–64 characters and start with a letter or number; email addresses and names with spaces, dots, underscores, plus signs or hyphens are supported');
  if (!env.OWNER_PASSWORD) issues.push('OWNER_PASSWORD is missing from the deployed Worker');
  else if (!validPassword(env.OWNER_PASSWORD)) issues.push('OWNER_PASSWORD must be 12–256 characters');
  return `Owner login configuration needs attention: ${issues.join('. ')}. Update these runtime Worker secrets in Cloudflare and deploy the changes.`;
}

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

function ownerRoute(path: string): boolean {
  return path.startsWith('/api/studio/') || path.startsWith('/api/assistant/') || /^\/api\/quotes\/[^/]+\/draft$/.test(path);
}

function validSelection(value: any): boolean {
  return value && ['Base', 'Normal', 'Premium'].includes(value.grade) && ['Standard', 'With PVC'].includes(value.protection) && ['SF', 'High Gloss'].includes(value.finish) && (value.brand_preference == null || typeof value.brand_preference === 'string');
}

// A request reads a consistent state and retries a write only after an optimistic
// concurrency conflict. D1 commits every changed record and version atomically.
export async function handleApi(request: Request, store: StateStore, env: ApiEnvironment): Promise<Response> {
  env = { ...env, OWNER_USERNAME: env.OWNER_USERNAME?.trim() };
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (mutation) {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'This request must come from this website.' }, 403);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Send a JSON request body.' }, 415);
  }
  let body: any = {};
  if (mutation) {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1_048_576) return json({ error: 'Request exceeds the 1 MB limit.' }, 413);
    try { body = raw ? JSON.parse(raw) : {}; } catch { return json({ error: 'Invalid JSON request.' }, 400); }
    if (!body || Array.isArray(body) || typeof body !== 'object') return json({ error: 'A JSON object is required.' }, 400);
  }
  if (path === '/api/studio/auth' && typeof body.username === 'string') body.username = body.username.trim();
  if (path === '/api/studio/credentials' && typeof body.newUsername === 'string') body.newUsername = body.newUsername.trim();
  for (let attempt = 0; attempt < 6; attempt++) {
    const { state, version } = await store.load();
    const upgraded = upgradeCatalogue(state.catalogue);
    if (upgraded !== state.catalogue) {
      state.catalogue = upgraded;
      if (!await store.save(state, version)) continue;
      continue;
    }
    // Reconcile configured secrets before checking any owner session. Persist
    // atomically and reload so early 401/session responses cannot lose rotation.
    if (state.owner) {
      if (validUsername(env.OWNER_USERNAME) && validPassword(env.OWNER_PASSWORD)) {
        const reconciled = await reconcileEnvironmentCredentials(state.owner, env.OWNER_USERNAME, env.OWNER_PASSWORD);
        if (reconciled !== state.owner) {
          if (reconciled.version !== state.owner.version) state.loginAttempts = {};
          state.owner = reconciled;
          if (!await store.save(state, version)) continue;
          continue;
        }
      } else if (ownerRoute(path)) {
        return json({ error: ownerConfigurationError(env) }, 503);
      }
    }
    let changed = false;
    const markChanged = () => { changed = true; };
    const secure = url.protocol === 'https:';
    const isOwner = validUsername(env.OWNER_USERNAME) && validPassword(env.OWNER_PASSWORD) && await validSession(state.owner, readSession(request));
    let response: Response | undefined;

    if (path === '/api/studio/auth' && method === 'POST') {
      if (!state.owner) {
        if (!validUsername(env.OWNER_USERNAME) || !validPassword(env.OWNER_PASSWORD)) return json({ error: ownerConfigurationError(env) }, 503);
        state.owner = rememberEnvironmentCredentials(await createOwner(env.OWNER_USERNAME, env.OWNER_PASSWORD));
        changed = true;
      }
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-ume-client-ip') || 'local';
      const now = Date.now();
      state.loginAttempts ||= {};
      // Expired attempts are discarded to keep the persisted throttle bounded.
      for (const [key, value] of Object.entries(state.loginAttempts)) if (value.resetAt <= now) delete state.loginAttempts[key];
      const throttle = state.loginAttempts[ip];
      if (throttle && throttle.count >= 8) return json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, 429, { 'Retry-After': String(Math.ceil((throttle.resetAt - now) / 1000)) });
      const passwordMatches = await verifyPassword(state.owner, body.password);
      if (body.username !== state.owner.username || !passwordMatches) {
        // Global throttle also bounds spoofed-address storage in non-Cloudflare deployments.
        if (Object.keys(state.loginAttempts).length < 500 || state.loginAttempts[ip]) state.loginAttempts[ip] = { count: (throttle?.count || 0) + 1, resetAt: throttle?.resetAt || now + 15 * 60_000 };
        changed = true;
        response = json({ error: 'Username or password is incorrect.' }, 401);
      } else {
        delete state.loginAttempts[ip];
        changed = true;
        response = json({ ok: true, username: state.owner.username }, 200, { 'Set-Cookie': sessionCookie(await issueSession(state.owner), secure) });
      }
    } else if (path === '/api/studio/session' && method === 'GET') {
      return json({ authenticated: isOwner, username: isOwner ? state.owner!.username : null });
    } else if (path === '/api/studio/logout' && method === 'POST') {
      // Rotate the session version so a copied signed-out cookie cannot be reused.
      if (isOwner) { state.owner!.version += 1; changed = true; }
      response = json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', secure, true) });
    } else if (ownerRoute(path) && !isOwner) {
      return json({ error: 'Sign in to the owner studio to continue.' }, 401);
    } else if (path === '/api/studio/credentials' && method === 'PUT') {
      if (!await verifyPassword(state.owner!, body.currentPassword)) return json({ error: 'Current password is incorrect.' }, 403);
      if (!validUsername(body.newUsername) || !validPassword(body.newPassword)) return json({ error: 'Use a username or email address of 3–64 characters, starting with a letter or number, and a password of at least 12 characters.' }, 400);
      const baseline = state.owner!.environmentCredentials;
      state.owner = { ...await createOwner(body.newUsername, body.newPassword, state.owner!.version + 1), environmentCredentials: baseline };
      changed = true;
      response = json({ ok: true, username: state.owner.username }, 200, { 'Set-Cookie': sessionCookie(await issueSession(state.owner), secure) });
    } else {
      if (/\/selection$/.test(path) && method === 'PATCH') {
        if (body.wholeHomeSelection && !validSelection(body.wholeHomeSelection)) return json({ error: 'Choose a valid package, finish and PVC option.' }, 400);
        if (body.roomSelections && (typeof body.roomSelections !== 'object' || Array.isArray(body.roomSelections) || Object.values(body.roomSelections).some((value) => !validSelection(value)))) return json({ error: 'Room selections contain an invalid package.' }, 400);
        if (body.selectedOptionalPointers && (!Array.isArray(body.selectedOptionalPointers) || body.selectedOptionalPointers.some((value: unknown) => typeof value !== 'string'))) return json({ error: 'Optional item selections must be a list.' }, 400);
      }
      if (/\/payments$/.test(path) && method === 'POST' && (!Number.isFinite(body.amountRupees) || body.amountRupees <= 0 || body.amountRupees > 100_000_000)) return json({ error: 'Enter a valid positive payment amount.' }, 400);
      if (/\/feedback$/.test(path) && typeof body.message === 'string' && body.message.length > 5000) return json({ error: 'Keep your message within 5,000 characters.' }, 400);
      type Route = { method: string; path: string; handler: (req: ApiContext, res: ApiReply) => void };
      const routes: Route[] = [];
      const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map((verb) => [verb, (routePath: string, handler: Route['handler']) => routes.push({ method: verb.toUpperCase(), path: routePath, handler })])) as unknown as ApiRouter;
      registerDataRoutes(app, state, markChanged);
      const route = routes.find((route) => route.method === method && new RegExp(`^${route.path.replace(/:[^/]+/g, '([^/]+)')}$`).test(path));
      if (!route) return json({ error: 'API route not found.' }, 404);
      const values = new RegExp(`^${route.path.replace(/:[^/]+/g, '([^/]+)')}$`).exec(path)!;
      const keys = Array.from(route.path.matchAll(/:([^/]+)/g), (match) => match[1]);
      const params = Object.fromEntries(keys.map((key, index) => [key, decodeURIComponent(values[index + 1])]));
      let status = 200;
      const reply: ApiReply = {
        status(code) { status = code; return reply; },
        json(data) {
          // Authenticated owner previews retain their full record. Every public
          // read/save/feedback/payment response uses the same customer shape.
          if (!isOwner && !ownerRoute(path) && data?.quote) {
            data = { ...data, quote: publicQuote(data.quote), ...(data.catalogue ? { catalogue: publicCatalogue(data.catalogue) } : {}) };
          }
          response = json(data, status);
        },
      };
      try { route.handler({ body, params }, reply); } catch (error) {
        console.error('Quotation API request failed:', error instanceof Error ? error.message : 'Unknown error');
        return json({ error: 'Unable to process this request. Check the supplied quotation and try again.' }, 400);
      }
    }
    if (!changed || await store.save(state, version)) return response || json({ error: 'No API response.' }, 500);
  }
  return json({ error: 'The studio is busy saving another change. Please try again.' }, 409);
}
