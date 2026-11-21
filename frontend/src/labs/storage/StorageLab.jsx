import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router';
import { CookiesLab } from './cookies/CookiesLab.jsx';
import { IndexedDBLab } from './indexeddb/IndexedDBLab.jsx';
import { CacheStorageLab } from './cache-storage/CacheStorageLab.jsx';

const BASE = '/storage';

const SECTIONS = [
  {
    path: 'cookies',
    title: '🍪 Cookies',
    description: 'Small values the browser sends to the server with every request. Sessions, HttpOnly, SameSite, Path, signed cookies, CORS credentials.',
    Component: CookiesLab,
  },
  {
    path: 'indexeddb',
    title: '🗂️ IndexedDB',
    description: 'A real database in the browser. A social feed that opens instantly from IndexedDB, then refreshes from the network, and still works offline.',
    Component: IndexedDBLab,
  },
  {
    path: 'cache-storage',
    title: '📦 Cache Storage',
    description: 'Save whole HTTP responses by URL. A photo gallery: slow from the network, instant from the cache, with versioning and cleanup.',
    Component: CacheStorageLab,
  },
];

const COMPARISON = [
  ['Cookies', '~4 KB each', 'document.cookie / Set-Cookie (strings)', 'Yes, with every matching request', 'Until Expires / Max-Age, or the browser session ends', 'Sessions, auth, server-readable preferences'],
  ['localStorage', '~5 MB', 'Synchronous, strings only', 'No', 'Until cleared', 'Small settings: theme, language'],
  ['sessionStorage', '~5 MB', 'Synchronous, strings only', 'No', 'Until the tab closes', 'Per-tab state: a multi-step form'],
  ['IndexedDB', 'Large (a share of free disk)', 'Async, JS objects, keys, indexes, transactions', 'No', 'Until cleared or evicted', 'App data: feeds, messages, drafts, offline data'],
  ['Cache Storage', 'Large (same quota as IndexedDB)', 'Async, Request → Response pairs', 'No (but can replace the network)', 'Until your code deletes it', 'Files and API responses: images, app shell, offline pages'],
];

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;
}

function QuotaPanel() {
  const [estimate, setEstimate] = useState(null);
  const [persisted, setPersisted] = useState(null);

  function refresh() {
    if (!navigator.storage?.estimate) return undefined;
    let cancelled = false;
    Promise.all([navigator.storage.estimate(), navigator.storage.persisted?.()]).then(([e, p]) => {
      if (cancelled) return;
      setEstimate(e);
      setPersisted(p ?? null);
    });
    return () => {
      cancelled = true;
    };
  }

  useEffect(refresh, []);

  if (!navigator.storage?.estimate) return null;
  const details = estimate?.usageDetails;

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>How much is this origin using?</h2>
        <button className="secondary" onClick={refresh}>Refresh</button>
      </div>
      {estimate && (
        <p>
          <code>navigator.storage.estimate()</code> → using <b>{formatMb(estimate.usage)}</b> of a{' '}
          <b>{formatMb(estimate.quota)}</b> quota
          {details && (
            <span className="muted small">
              {' '}(IndexedDB {formatMb(details.indexedDB ?? 0)} · Cache Storage {formatMb(details.caches ?? 0)})
            </span>
          )}
          . Persistent: <b>{persisted ? 'yes' : 'no'}</b>
          <span className="muted small"> (if no, the browser may evict it when the disk is full).</span>
        </p>
      )}
      <p className="muted small">
        Cookies, localStorage and sessionStorage have their own small limits. IndexedDB and Cache Storage share this
        quota. Clear everything at once in DevTools → <b>Application → Storage → Clear site data</b>.
      </p>
    </section>
  );
}

function StorageOverview() {
  return (
    <div className="stack">
      <div className="grid">
        {SECTIONS.map((s) => (
          <Link key={s.path} to={`${BASE}/${s.path}`} className="card card-link">
            <h2>{s.title}</h2>
            <p className="muted">{s.description}</p>
          </Link>
        ))}
      </div>

      <section className="card">
        <h2>Which storage should I use?</h2>
        <table>
          <thead>
            <tr><th>Storage</th><th>Size</th><th>API</th><th>Sent to the server?</th><th>Lives until</th><th>Use it for</th></tr>
          </thead>
          <tbody>
            {COMPARISON.map(([name, ...cells]) => (
              <tr key={name}><td><b>{name}</b></td>{cells.map((c, i) => <td key={i}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          All of them are scoped to the origin (cookies to the site/domain), and all of them are visible in DevTools →
          <b> Application</b>. None of the JS-readable ones are safe for secrets: anything a script can read, an XSS can read.
        </p>
      </section>

      <QuotaPanel />
    </div>
  );
}

export function StorageLab() {
  return (
    <main className="container stack">
      <div>
        <h1>🗄️ Browser Storage</h1>
        <p className="muted">
          Where can a web app keep data on the user&apos;s device, and which one should you pick? Each tab is a hands-on demo
          backed by the Node server.
        </p>
      </div>

      <nav className="tabs">
        <NavLink to={BASE} end>Overview</NavLink>
        {SECTIONS.map((s) => <NavLink key={s.path} to={`${BASE}/${s.path}`}>{s.title}</NavLink>)}
      </nav>

      <Routes>
        <Route index element={<StorageOverview />} />
        {SECTIONS.map(({ path, Component }) => <Route key={path} path={path} element={<Component />} />)}
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
    </main>
  );
}
