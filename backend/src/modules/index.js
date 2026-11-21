import { cookiesRouter } from './cookies/routes.js';
import { microFrontendsRouter } from './micro-frontends/routes.js';
import { startTeamServers } from './micro-frontends/teams.js';
import { storageRouter } from './storage/routes.js';
import { webVitalsRouter } from './web-vitals/routes.js';

// Each lab registers its router here. Add new labs (performance, caching, ...) to this list.
// Optional `start()` runs once the main server is listening (e.g. to launch extra servers).
export const modules = [
  { basePath: '/api/cookies', router: cookiesRouter },
  // Slow feed + photo APIs used by the IndexedDB and Cache Storage demos.
  { basePath: '/api/storage', router: storageRouter },
  // Not under /api: these are full HTML pages opened directly from the backend (fresh page loads).
  { basePath: '/web-vitals', router: webVitalsRouter },
  // The shell pages live here; the micro frontends themselves are served by team servers on :4001/:4002.
  { basePath: '/micro-frontends', router: microFrontendsRouter, start: startTeamServers },
];
