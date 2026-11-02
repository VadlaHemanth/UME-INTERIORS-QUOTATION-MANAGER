import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { handleApi, type StateStore } from './backend/api';
import { emptyState, type StudioState } from './backend/routes';

dotenv.config();
// Optional isolated data path supports local previews without touching real records.
const dataDirectory = path.resolve(process.env.UME_DATA_DIR || path.join(process.cwd(), 'data'));
const dataFile = path.join(dataDirectory, 'ume-studio-db.json');
let state: StudioState = emptyState();
if (fs.existsSync(dataFile)) {
  const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  state = { ...state, ...saved };
}
let version = 0;
const store: StateStore = {
  async load() { return { state: structuredClone(state), version }; },
  async save(next, expectedVersion) {
    if (expectedVersion !== version) return false;
    fs.mkdirSync(dataDirectory, { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporaryFile, dataFile);
    state = next;
    version++;
    return true;
  },
};

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
  app.use('/api', express.text({ type: '*/*', limit: '1mb' }));
  app.use('/api', async (req, res) => {
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(name, value);
      }
      headers.set('x-ume-client-ip', req.socket.remoteAddress || 'local');
      const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
        method: req.method,
        headers,
        ...(!['GET', 'HEAD'].includes(req.method) ? { body: typeof req.body === 'string' ? req.body : '{}' } : {}),
      });
      const response = await handleApi(request, store, { OWNER_USERNAME: process.env.OWNER_USERNAME, OWNER_PASSWORD: process.env.OWNER_PASSWORD });
      res.status(response.status);
      response.headers.forEach((value, name) => res.setHeader(name, value));
      res.send(await response.text());
    } catch (error) {
      console.error('Studio API failure:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'The studio could not save your change. Please try again.' });
    }
  });
  app.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error?.type === 'entity.too.large') { res.status(413).json({ error: 'Request exceeds the 1 MB limit.' }); return; }
    next(error);
  });
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(process.cwd(), 'dist/index.html')));
  }
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => console.log(`UME Interiors running at http://${host}:${port}`));
}
startServer().catch((error) => { console.error(error); process.exitCode = 1; });
