// Vite plugin used by the Module Federation remotes: the same lab-only "ops" API as the backend team
// servers (GET /__ops/status, POST /__ops/outage?on=1|0). With an outage on, every request gets a 503.
// Works for both `vite` (dev) and `vite preview` (production build).
export function labOps(team) {
  let outage = false;
  const json = (res, body) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  const install = (server) => {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/__ops/status') return json(res, { team, outage });
      if (url.pathname === '/__ops/outage' && req.method === 'POST') {
        outage = url.searchParams.get('on') === '1';
        server.config.logger.info(`[team-${team}] outage ${outage ? 'ON' : 'OFF'}`, { timestamp: true });
        return json(res, { team, outage });
      }
      if (outage) {
        res.statusCode = 503;
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.end(`team-${team} is down (simulated outage)`);
      }
      next();
    });
  };

  return { name: 'lab-ops', configureServer: install, configurePreviewServer: install };
}
