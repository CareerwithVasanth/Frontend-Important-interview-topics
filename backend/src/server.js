import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { requestLogger } from './middleware/requestLogger.js';
import { modules } from './modules/index.js';

const app = express();

app.use(requestLogger);
// credentials: true => Access-Control-Allow-Credentials: true, which the browser
// requires before it will send/accept cookies on cross-origin fetches.
app.use(cors({ origin: config.frontendOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser(config.cookieSecret));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, modules: modules.map((m) => m.basePath) });
});

for (const { basePath, router } of modules) {
  app.use(basePath, router);
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? 'Internal Server Error' });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`CORS (with credentials) allowed for: ${config.frontendOrigins.join(', ')}`);
  for (const { start } of modules) start?.();
});
