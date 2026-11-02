const currentOrigin = 'https://quotation.umeinteriors.workers.dev';

/** Keep previously shared customer URLs usable after the owner's Worker rename. */
export default {
  async fetch(request: Request): Promise<Response> {
    const original = new URL(request.url);
    const destination = new URL(original.pathname + original.search, currentOrigin);
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // Stale app tabs must refresh; never forward submitted passwords or payments.
      return new Response(JSON.stringify({ error: 'The studio has moved. Refresh this page to open quotation.umeinteriors.workers.dev and try again.', redirectUrl: destination.toString() }), {
        status: 409, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    return new Response(null, { status: 307, headers: { ...headers, Location: destination.toString() } });
  },
};
