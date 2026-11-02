import { handleApi, type ApiEnvironment } from '../backend/api';
import { D1StateStore, type StudioDatabase } from '../backend/d1-store';

interface Environment extends ApiEnvironment {
  DB: StudioDatabase;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    let response: Response;
    try {
      response = url.pathname.startsWith('/api/')
        ? await handleApi(request, new D1StateStore(env.DB), env)
        : await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Studio request failed:', error instanceof Error ? error.message : 'Unknown error');
      response = new Response(JSON.stringify({ error: 'The studio is temporarily unavailable. Please try again.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/owner')) headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
