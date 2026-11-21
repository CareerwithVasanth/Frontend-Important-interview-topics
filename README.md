# Web Fundamentals Lab

An end-to-end **React (Vite) + Node (Express)** playground for learning how the web works: browser storage (cookies, IndexedDB, Cache Storage), Core Web Vitals and micro frontends today, with caching, CORS, and more to come.

```
web-fundamentals-lab/
├── package.json            # npm workspaces + `npm run dev` runs everything
├── backend/                # Express API on http://localhost:4000
│   └── src/
│       ├── server.js       # CORS (credentials), cookie-parser, module mounting
│       ├── config.js
│       ├── middleware/requestLogger.js   # prints Cookie / Set-Cookie per request
│       └── modules/
│           ├── index.js    # ← register new backend labs here
│           ├── cookies/routes.js
│           ├── storage/routes.js   # slow feed API + slow photos (no-store) for the IndexedDB / Cache Storage demos
│           ├── web-vitals/
│           │   ├── routes.js   # slow assets (?delay=ms), no-store, serves pages/
│           │   └── pages/      # plain HTML good/bad demo pairs (lcp, cls, inp)
│           └── micro-frontends/
│               ├── routes.js   # serves shell/ at /micro-frontends
│               ├── teams.js    # starts the team servers on :4001 (products) and :4002 (cart)
│               ├── shell/      # container pages: iframes, web-components, import-maps (+ shared/)
│               └── teams/      # each team's code: core.js + iframe / element / esm adapters
├── module-federation/      # Module Federation demo: three separate Vite apps
│   ├── host/               # shell on :5180
│   ├── products/           # remote on :5181 (exposes ./ProductList)
│   ├── cart/               # remote on :5182 (exposes ./CartPanel)
│   └── lab-ops-plugin.mjs  # outage switch for the remotes' Vite servers
└── frontend/               # React app on http://localhost:5173
    └── src/
        ├── lib/api.js      # fetch wrapper + transport/credentials switch
        └── labs/
            ├── registry.js # ← register new frontend labs here
            ├── storage/    # Storage lab: overview + tabs
            │   ├── cookies/        # Cookies demo UI
            │   ├── indexeddb/      # Social feed backed by IndexedDB (feedDb.js = data layer)
            │   └── cache-storage/  # Photo gallery backed by the Cache API
            ├── web-vitals/ # Web Vitals lab UI (links out to the demo pages)
            └── micro-frontends/ # Micro Frontends lab UI (links out to the demo shops)
```

## Run it

```bash
npm install
npm run dev        # API on :4000 (+ team servers :4001/:4002), web on :5173, Module Federation on :5180-5182
```

Open http://localhost:5173/storage/cookies (the old `/cookies` URL redirects there). Keep **DevTools → Application → Cookies** and **Network** open, and watch the backend terminal. It logs the raw `Cookie` and `Set-Cookie` headers for every request.

Optional: `cp backend/.env.example backend/.env` to change the port, allowed origins, or cookie secret.

## Storage lab

Open http://localhost:5173/storage. The overview compares cookies, localStorage, sessionStorage, IndexedDB and Cache Storage, and shows how much storage this origin is using. Each storage type has its own tab.

### Cookies

#### Transport switch (top of the page)

| Mode | Frontend calls | What it demonstrates |
|------|----------------|----------------------|
| Same-origin (Vite proxy) | `/api/...` on :5173, proxied to :4000 | Production-like same-origin setup, no CORS |
| Cross-origin, same-site | `http://localhost:4000` | Different port means different **origin** but the same **site**. Needs `Access-Control-Allow-Credentials` and `credentials: 'include'`. |
| Cross-site | `http://127.0.0.1:4000` | Different **site**: a separate cookie jar, and `SameSite=Lax/Strict` cookies are blocked |

The `credentials` dropdown (`include` / `same-origin` / `omit`) shows how `fetch` decides whether to send and store cookies.

#### Scenarios

1. **Server view**: `GET /api/cookies/inspect` echoes the `Cookie` header the browser sent.
2. **Attribute playground**: `POST /api/cookies/set` / `clear` with any combination of `HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Path`, and signed. Presets include an invalid `SameSite=None` without `Secure`.
3. **Login session**: `alice/password123` or `bob/hunter2`. This is an HttpOnly `sid` cookie backed by an in-memory session store. It covers login, `/me`, and logout, plus session rotation on login.
4. **Path scoping**: a cookie that is only sent to `/api/cookies/scoped/*`. Clearing it with the wrong `Path` silently fails.
5. **Signed cookies**: an HMAC-signed `role` cookie. You can tamper with it from JS and watch the server reject it.

The right column shows `document.cookie` live (HttpOnly cookies never appear there) and a request log.

#### Guided walkthrough

1. Log in through the proxy. `sid` is in DevTools but not in `document.cookie`, yet `/me` works.
2. Switch to **Cross-origin, same-site**. The same cookies are still sent, because cookies are scoped by host and ignore the port.
3. Set credentials to **omit**. No `Cookie` header is sent, and `/me` returns 401.
4. Switch to **Cross-site**. Inspect shows an empty jar, and login "succeeds" but `/me` returns 401 because `SameSite=Lax` blocked the cookie. Use the playground preset `SameSite=None; Secure` and inspect again.
5. Restart the backend. The browser still has `sid`, but the server has forgotten the session, so `/me` returns 401.

> Browser note: third-party cookie settings (Incognito, Safari ITP, Firefox ETP) can block even `SameSite=None; Secure` cookies in cross-site mode. Try the same steps in different browsers and compare.

### IndexedDB: an offline-first social feed

http://localhost:5173/storage/indexeddb. `GET /api/storage/feed` is deliberately slow (about 1.5s) and sends `no-store`, so any speed-up comes from IndexedDB alone. The page uses the **cache, then network** pattern: show posts from IndexedDB right away, fetch fresh posts in the background, save them, and update the screen.

1. On the first visit the feed is empty for about 1.5s, then posts appear and are saved to the `posts` store.
2. Click **Reopen app**. Posts appear in a few milliseconds from IndexedDB, then new ones (a new post is created every 20s) slide in with a "new" badge.
3. Tick **Simulate offline** and reopen. The feed still works.
4. Like a post. The like is saved in the `likes` store and survives a page reload.
5. Filter by author. This reads through the `by_author` index without using the network.
6. Open **DevTools → Application → IndexedDB → social-feed-lab** to see the stores, then click **Delete database** to start over.

### Cache Storage: a photo gallery

http://localhost:5173/storage/cache-storage. Each photo (`/api/storage/photos/<n>.svg`) takes about 1.2s and shows the time the server rendered it.

1. In **Network only** mode, every reload waits about 1.2s per photo and the render time changes each time.
2. Switch to **Cache first**. The first load goes to the network and the response is saved with `cache.put()`. After that, photos load in a few milliseconds and the render time stays the same, because it is the exact stored response.
3. Tick **Simulate offline**. Cached photos still load and uncached ones fail.
4. Use the inspector to see and delete entries, or click **Deploy v2** to create a new cache version and delete the old one, as a Service Worker does on `activate`.

## Web Vitals lab

Open http://localhost:5173/web-vitals. Each metric has a **bad** and a **good** plain HTML page served by Node at `http://localhost:4000/web-vitals/<name>.html`. They use the same server, the same assets, and the same delays. Only the frontend code differs.

**Why aren't they React routes?** Web Vitals are measured once per full page load. Client-side navigation inside the React app would keep the first page's numbers.

**How to measure:** open a demo, then open **Chrome DevTools → Performance**. The *Local metrics* panel shows live LCP, CLS and INP. Reload with DevTools open for LCP and CLS, and interact with the page for INP. The backend sends `Cache-Control: no-store` and uses `?delay=ms` endpoints, so every reload is a reproducible cold load with no throttling needed.

| Demo | Bad page | Good page | Typical result (bad → good) |
|------|----------|-----------|-----------------------------|
| LCP | Render-blocking CSS (2s) → JS fetches `api/hero` (1s) → lazy `<img>` (1.2s) | Inline critical CSS, non-blocking stylesheet, `<img fetchpriority="high">` in the HTML | ~4.2s → ~1.2s |
| CLS | `<img>` without `width`/`height`, banner injected above content | `width`/`height` on `<img>`, `min-height` slot for the banner | ~0.32 → 0 |
| INP | 500ms of synchronous work before updating the UI | UI updated first, same work in 10ms chunks with `scheduler.yield()` | ~520ms → ~25ms |

Tips: don't click or scroll during LCP/CLS demos, because input stops LCP and excuses shifts. On the INP pages, the "heartbeat" square is driven by `requestAnimationFrame`, so it visibly freezes while the main thread is blocked.

Thresholds (75th percentile of real users): LCP ≤ 2.5s good / > 4s poor · INP ≤ 200ms / > 500ms · CLS ≤ 0.1 / > 0.25.

## Micro Frontends lab

Open http://localhost:5173/micro-frontends. A tiny shop is built by three "teams" that deploy independently: the **shell** (platform team), **Products** and **Cart**. The same shop is composed four ways. Each team really runs on its own origin, so CORS, isolation and failures behave like a real deployment.

| Team | Iframes / Web Components / import maps | Module Federation |
|------|-----------------------------------------|-------------------|
| Shell | `http://localhost:4000/micro-frontends/*.html` | `http://localhost:5180` (host) |
| Products | `http://localhost:4001` (Express, started by the backend) | `http://localhost:5181` (Vite remote) |
| Cart | `http://localhost:4002` (Express, started by the backend) | `http://localhost:5182` (Vite remote) |

Each team's code (`backend/src/modules/micro-frontends/teams/<team>/core.js`) is shipped through three adapters, so you can compare the same feature under different integration contracts: `iframe.js` (a page), `element.js` (a Custom Element) and `esm.js` (an ES module exporting `mount(el, props)`).

| Demo | How it composes | Communication | CSS | Failure handling |
|------|-----------------|---------------|-----|------------------|
| [Iframes](http://localhost:4000/micro-frontends/iframes.html) | `<iframe src="http://localhost:4001/iframe.html">` | `postMessage` relayed by the shell, with `event.origin` checks. Iframes also report their height. | Fully isolated | `ready` handshake + 3s timeout (the shell can't see an iframe's HTTP status) |
| [Web Components](http://localhost:4000/micro-frontends/web-components.html) | `<script type="module" src=".../element.js">` + `<team-products>` | Attributes down (`currency`), composed DOM events up (`add-to-cart`), public method (`cart.add()`) | Shadow DOM | `<script onerror>` + `:not(:defined)` placeholder |
| [Import maps](http://localhost:4000/micro-frontends/import-maps.html) | `import('@team/cart')` resolved by `<script type="importmap">` | Shared `@shop/event-bus` module: one URL = one instance for everyone | **None**: Cart's global `h2`/`button` rules restyle the shell and Products | `try/catch` around `import()` |
| [Module Federation](http://localhost:5180) | `@module-federation/vite`: host `remotes` → remote `exposes` via `remoteEntry.js` | React props/callbacks (one React tree, shell owns state) | None, each team scopes its own (inline styles here) | `React.lazy` + `<Suspense>` + an error boundary per slot |

**Lab controls** at the bottom of every demo page link to the other demos, show each team server's status, and toggle a **simulated outage**: that server answers `503` for everything until it's restored. There's also a **shell event log** that shows every message and event the shell sees.

### Guided walkthrough

1. **Iframes:** add items and follow the log: Products → `postMessage` → shell → `postMessage` → Cart. In the Network tab, each iframe loads its own document, scripts and styles. Simulate a Cart outage: the iframe still "loads" (it shows the 503 text), and only the missing handshake tells the shell something is wrong.
2. **Web Components:** in DevTools → Elements, expand each `#shadow-root`. The teams' bare `h2`/`button` styles don't collide with each other or with the shell's purple buttons. Change the currency: the shell only calls `setAttribute`.
3. **Import maps:** both badges show the same `bus #id`, so they share one module instance. Then look at the headings: everything is orange, because Cart's global stylesheet loaded last. Open the "import map on this page" panel. Shipping a new version of a team means changing one URL there.
4. **Module Federation:** the **Shared dependencies** table reads `globalThis.__FEDERATION__`. Every app offers React 19, but they all use the shell's copy, so the remote fallbacks are never downloaded. Open http://localhost:5181 or http://localhost:5182 to see each remote running standalone, the way its team develops it.
5. **Independent deploys:** change `version: '1.0.0'` in `teams/cart/core.js` (or in `module-federation/cart/src/CartPanel.jsx`) and reload the shell. The shell's code didn't change. Team servers send `Cache-Control: no-store`, so every reload is a fresh "deployment".
6. **CORS:** remove the `Access-Control-Allow-Origin` header in `teams.js`. The iframes demo keeps working, but Web Components and import maps break, because module scripts are always fetched in CORS mode. (The lab controls' status check will also report the team as unreachable.)

`npm run dev:mf` starts only the three Module Federation apps. To try production builds, run `npm run build -w mf-products -w mf-cart -w mf-host`, then `npm run preview` in each of those workspaces. They use the same ports, and the outage switch works there too.

## Adding a new lab (e.g. performance)

1. Backend: create `backend/src/modules/<lab>/routes.js` exporting an Express `Router`, then add it to [`backend/src/modules/index.js`](backend/src/modules/index.js). Add an optional `start()` if the lab needs extra servers (see `micro-frontends`).
2. Frontend: create `frontend/src/labs/<lab>/<Lab>.jsx`, then add it to [`frontend/src/labs/registry.js`](frontend/src/labs/registry.js). It gets a route and a home-page card automatically.
