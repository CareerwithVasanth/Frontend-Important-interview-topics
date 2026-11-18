// Like the Web Vitals demos, these are NOT React routes: each approach is a separate "shop" page whose
// micro frontends are loaded from other origins (team servers), so they open in a new tab.
const SHELL_BASE = 'http://localhost:4000/micro-frontends';

const TEAMS = [
  { team: 'Shell (platform team)', serves: 'Container page, layout, header, cart count', where: ':4000 (Express) · :5180 (Vite host)' },
  { team: 'Team Products', serves: 'Product list with "Add to cart"', where: ':4001 (Express) · :5181 (Vite remote)' },
  { team: 'Team Cart', serves: 'Cart lines, total, clear', where: ':4002 (Express) · :5182 (Vite remote)' },
];

const COMPARISON = [
  { aspect: 'Composition', iframe: 'Runtime, separate documents', wc: 'Runtime, Custom Elements in one document', importMaps: 'Runtime, import() + import map', mf: 'Runtime, remoteEntry.js + bundler plugin' },
  { aspect: 'JS isolation', iframe: 'Full (separate realm)', wc: 'None (shared window)', importMaps: 'None', mf: 'None' },
  { aspect: 'CSS isolation', iframe: 'Full', wc: 'Shadow DOM', importMaps: 'None, styles leak both ways', mf: 'None, each team scopes its own CSS' },
  { aspect: 'Communication', iframe: 'postMessage + origin checks', wc: 'Attributes/props down, DOM events up', importMaps: 'Shared module (event bus)', mf: 'Props and callbacks (one React tree)' },
  { aspect: 'Shared deps', iframe: 'None, each frame has its own copy (HTTP cache at best)', wc: 'Not by default', importMaps: 'One URL = one instance', mf: 'Negotiated singletons with semver ranges' },
  { aspect: 'Failure handling', iframe: 'Handshake + timeout', wc: '<script onerror>, :not(:defined)', importMaps: 'try/catch around import()', mf: 'Error boundary + Suspense' },
  { aspect: 'Tooling', iframe: 'None', wc: 'None', importMaps: 'None (browser native)', mf: 'Bundler plugin on every app' },
  { aspect: 'Good fit', iframe: 'Untrusted or legacy apps, widgets', wc: 'Mixed frameworks, design systems', importMaps: 'Framework-agnostic, single-spa style', mf: 'Same-framework teams in a big SPA' },
];

const DEMOS = [
  {
    key: 'iframe',
    title: '1 · Iframes',
    href: `${SHELL_BASE}/iframes.html`,
    summary: 'Each team ships a whole page. The shell relays postMessage between frames and resizes them.',
    tryThis: ['Add items and watch the event log: Products → shell → Cart', 'Network tab: each iframe loads its own HTML, JS and CSS', 'Simulate a Cart outage: the shell only notices because the handshake never arrives'],
    source: ['shell/iframes.html', 'teams/*/iframe.js'],
  },
  {
    key: 'wc',
    title: '2 · Web Components',
    href: `${SHELL_BASE}/web-components.html`,
    summary: 'Each team registers a Custom Element rendered into Shadow DOM. The shell writes <team-products> and <team-cart> tags.',
    tryThis: ['Elements panel: expand #shadow-root to see each team\'s private DOM and <style>', 'Both teams style bare h2/button and they don\'t collide', 'Simulate a Products outage: <script onerror> swaps in a fallback'],
    source: ['shell/web-components.html', 'teams/*/element.js'],
  },
  {
    key: 'importMaps',
    title: '3 · Import maps + ES modules',
    href: `${SHELL_BASE}/import-maps.html`,
    summary: 'No bundler. The import map turns @team/cart into a URL. Each team exports mount(el, props), and they talk over a shared event bus.',
    tryThis: ['Compare bus #id in both badges: one URL gives one shared instance', 'Look at the headings: Cart\'s global CSS restyled the shell and Products', 'Network tab: remote modules are fetched in CORS mode (Access-Control-Allow-Origin)'],
    source: ['shell/import-maps.html', 'teams/*/esm.js', 'shell/shared/event-bus.js'],
  },
  {
    key: 'mf',
    title: '4 · Module Federation',
    href: 'http://localhost:5180/',
    summary: 'Three Vite apps with @module-federation/vite. The host imports products/ProductList at runtime and shares a single React.',
    tryThis: ['The shared dependencies table shows every app offering React, but only the shell\'s copy is used', 'Each remote also runs standalone (:5181, :5182)', 'Simulate an outage: remoteEntry.js returns 503 and the error boundary takes over'],
    source: ['module-federation/host/vite.config.js', 'module-federation/products/vite.config.js'],
  },
];

export function MicroFrontendsLab() {
  return (
    <main className="container stack">
      <div>
        <h1>🧩 Micro frontends: four ways to compose one page</h1>
        <p className="muted">
          One tiny shop, built by three "teams" that deploy independently: a <b>shell</b>, <b>Products</b> and <b>Cart</b>.
          The same shop is composed four different ways. Each team really runs on its own origin (port), so CORS, isolation
          and failures behave like a real deployment.
        </p>
      </div>

      <section className="card">
        <h2>The teams</h2>
        <table>
          <thead><tr><th>Team</th><th>Owns</th><th>Served from</th></tr></thead>
          <tbody>
            {TEAMS.map((t) => (
              <tr key={t.team}><td><b>{t.team}</b></td><td>{t.serves}</td><td className="mono">{t.where}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          Every demo page has <b>lab controls</b> to simulate an outage for each team (its server answers <code>503</code>) and a
          log of what the shell sees. Team servers send <code>Cache-Control: no-store</code>, so editing a team&apos;s file and
          reloading is a fresh "deployment" that needs no change to the shell.
        </p>
      </section>

      <div className="grid">
        {DEMOS.map((demo) => (
          <section key={demo.key} className="card stack" style={{ gap: '0.5rem' }}>
            <h2>{demo.title}</h2>
            <p className="small">{demo.summary}</p>
            <div className="row">
              <a className="button good" href={demo.href} target="_blank" rel="noreferrer">Open demo ↗</a>
            </div>
            <div className="lesson">
              <b>Try this</b>
              <ul>{demo.tryThis.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <p className="muted small">Source: {demo.source.map((s, i) => <span key={s}>{i > 0 && ', '}<code>{s}</code></span>)}</p>
          </section>
        ))}
      </div>

      <section className="card">
        <h2>Comparison</h2>
        <table>
          <thead>
            <tr><th /><th>Iframes</th><th>Web Components</th><th>Import maps</th><th>Module Federation</th></tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.aspect}>
                <td><b>{row.aspect}</b></td>
                <td>{row.iframe}</td>
                <td>{row.wc}</td>
                <td>{row.importMaps}</td>
                <td>{row.mf}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          Backend demo source lives in <code>backend/src/modules/micro-frontends/</code> (<code>shell/</code> for the
          container pages, <code>teams/</code> for each team&apos;s code). Module Federation lives in <code>module-federation/</code>.
        </p>
      </section>
    </main>
  );
}
