import path from 'node:path';
import express from 'express';

const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// Each team is a separate Express server on its own port = its own origin, like a separate deployment
// (products.shop.com, cart.shop.com). The static demo pages hard-code these ports.
export const TEAMS = [
  { name: 'products', port: 4001, color: '\x1b[36m' },
  { name: 'cart', port: 4002, color: '\x1b[33m' },
];

function createTeamServer({ name, port, color }) {
  const app = express();
  const label = `${color}[team-${name}]\x1b[0m`;
  let outage = false;

  app.use((req, res, next) => {
    res.on('finish', () => console.log(`${label} ${req.method} ${req.originalUrl} → ${res.statusCode} ${dim(`origin=${req.headers.origin ?? '-'}`)}`));
    // Module scripts (<script type="module">, import()) are fetched in CORS mode, so a remote on another
    // origin MUST send this header or the shell can't load it. Iframes and classic <script> don't need it.
    res.set('Access-Control-Allow-Origin', '*');
    // No caching, so editing a team's file and reloading the shell behaves like a fresh deployment.
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Lab-only "ops" endpoints: simulate this team's deployment being down.
  app.get('/__ops/status', (_req, res) => res.json({ team: name, outage }));
  app.post('/__ops/outage', (req, res) => {
    outage = req.query.on === '1';
    console.log(`${label} outage ${outage ? 'ON' : 'OFF'}`);
    res.json({ team: name, outage });
  });

  app.use((_req, res, next) => {
    if (outage) return res.status(503).type('text').send(`team-${name} is down (simulated outage)`);
    next();
  });

  app.use(express.static(path.join(import.meta.dirname, 'teams', name), { etag: false, lastModified: false }));

  const server = app.listen(port, () => console.log(`${label} serving its micro frontend on http://localhost:${port}`));
  server.on('error', (err) => console.error(`${label} failed to start on :${port}: ${err.message}`));
  return server;
}

export function startTeamServers() {
  return TEAMS.map(createTeamServer);
}
