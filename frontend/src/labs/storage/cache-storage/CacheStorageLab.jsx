import { useEffect, useRef, useState } from 'react';
import { EventLog } from '../EventLog.jsx';
import { ms, useEventLog } from '../useEventLog.js';

const PHOTO_IDS = [1, 2, 3, 4, 5, 6];
const CACHE_PREFIX = 'photo-gallery-v';
const photoUrl = (id) => `/api/storage/photos/${id}.svg`;

const STRATEGIES = {
  network: { label: 'Network only', hint: 'Always download. No Cache Storage involved (this is what a plain <img> does here).' },
  cacheFirst: { label: 'Cache first', hint: 'Look in Cache Storage first. Only download on a miss, then save a copy for next time.' },
};

const CODE = `async function cacheFirst(url) {
  const cache = await caches.open('photo-gallery-v1'); // open (or create) a named cache

  const saved = await cache.match(url);                 // look for a saved Response
  if (saved) return saved;                              // ⚡ HIT: no network at all

  const response = await fetch(url);                    // 🌐 MISS: download it
  if (response.ok) {
    await cache.put(url, response.clone());             // 💾 keep a copy for next time
  }
  return response;
}

// Show it on the page
const blob = await (await cacheFirst('/api/storage/photos/1.svg')).blob();
img.src = URL.createObjectURL(blob);`;

const COMPARISON = [
  ['Who decides what is stored?', 'The browser, from Cache-Control headers', 'Your JavaScript', 'Your JavaScript'],
  ['What is stored?', 'HTTP responses', 'Request → Response pairs (status, headers, body)', 'JavaScript objects'],
  ['When does it expire?', 'Automatically (max-age, ETag…)', 'Never. Until your code deletes it', 'Never. Until your code deletes it'],
  ['How do you look things up?', 'Automatic, by URL', 'By URL: cache.match(request)', 'By key or index'],
  ['Typical use', 'Everything, by default', 'Images, CSS/JS, offline pages (Service Workers)', 'App data: feeds, drafts, messages'],
];

const STRATEGY_GUIDE = [
  ['Cache first', 'Images, fonts, versioned JS/CSS: things that rarely change', 'This demo'],
  ['Network first, cache as fallback', 'HTML pages and API data that should be fresh but still work offline', ''],
  ['Stale-while-revalidate', 'Show the saved copy instantly, update it in the background (avatars, feeds)', 'The IndexedDB feed demo does this with data'],
  ['Network only', 'Payments, analytics, anything that must never be stale', 'The other radio button'],
];

function formatBytes(n) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString() : '–';
}

export function CacheStorageLab() {
  const log = useEventLog();
  const supported = typeof window !== 'undefined' && 'caches' in window;
  const [strategy, setStrategy] = useState('network');
  const [offline, setOffline] = useState(false);
  const [version, setVersion] = useState(1);
  const [tiles, setTiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [inspector, setInspector] = useState([]);
  const objectUrls = useRef({});

  const cacheName = `${CACHE_PREFIX}${version}`;

  async function refreshInspector() {
    const names = await caches.keys();
    const result = await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        const entries = await Promise.all(
          requests.map(async (request) => {
            const response = await cache.match(request);
            const blob = await response.clone().blob();
            return {
              url: request.url,
              path: new URL(request.url).pathname,
              type: response.headers.get('Content-Type'),
              servedAt: response.headers.get('X-Served-At'),
              size: blob.size,
            };
          }),
        );
        return { name, entries: entries.sort((a, b) => a.path.localeCompare(b.path)) };
      }),
    );
    setInspector(result);
  }

  // Pick up the newest gallery version that already exists, so a page reload keeps the "deployed" version.
  useEffect(() => {
    if (!supported) return undefined;
    caches.keys().then((names) => {
      const versions = names.filter((n) => n.startsWith(CACHE_PREFIX)).map((n) => Number(n.slice(CACHE_PREFIX.length)));
      if (versions.length) setVersion(Math.max(...versions));
      refreshInspector();
    });
    const urls = objectUrls.current;
    return () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
  }, [supported]);

  async function download(url) {
    if (offline) throw new Error('offline (simulated)');
    const response = await fetch(url);
    return response;
  }

  async function loadPhoto(id) {
    const url = photoUrl(id);
    const start = performance.now();
    let response;
    let source = 'network';

    if (strategy === 'cacheFirst') {
      const cache = await caches.open(cacheName);
      response = await cache.match(url);
      if (response) {
        source = 'cache';
      } else {
        response = await download(url);
        if (response.ok) await cache.put(url, response.clone());
      }
    } else {
      response = await download(url);
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (objectUrls.current[id]) URL.revokeObjectURL(objectUrls.current[id]);
    objectUrls.current[id] = URL.createObjectURL(blob);
    return { src: objectUrls.current[id], source, ms: ms(start), servedAt: response.headers.get('X-Served-At') };
  }

  async function loadGallery() {
    setLoading(true);
    setTiles(Object.fromEntries(PHOTO_IDS.map((id) => [id, { status: 'loading' }])));
    log.add('🖼️', `Loading 6 photos with "${STRATEGIES[strategy].label}"${strategy === 'cacheFirst' ? ` from cache "${cacheName}"` : ''}${offline ? ' while offline' : ''}`);
    const start = performance.now();

    const results = await Promise.all(
      PHOTO_IDS.map(async (id) => {
        try {
          const result = await loadPhoto(id);
          setTiles((t) => ({ ...t, [id]: { status: 'done', ...result } }));
          return result;
        } catch (err) {
          setTiles((t) => ({ ...t, [id]: { status: 'error', error: err.message } }));
          return { source: 'error' };
        }
      }),
    );

    const count = (s) => results.filter((r) => r.source === s).length;
    const hits = count('cache');
    const misses = count('network');
    const failed = count('error');
    log.add(
      hits === 6 ? '⚡' : failed ? '📴' : '🌐',
      `Done in ${ms(start)}ms: ${hits} from Cache Storage, ${misses} from the network${failed ? `, ${failed} failed` : ''}.` +
        (strategy === 'cacheFirst' && misses ? ` Saved ${misses} new cache entr${misses === 1 ? 'y' : 'ies'} with cache.put().` : ''),
    );
    setLoading(false);
    refreshInspector();
  }

  async function deleteEntry(name, url) {
    const cache = await caches.open(name);
    await cache.delete(url);
    log.add('✂️', `caches.open('${name}').delete('${new URL(url).pathname}'). That photo will be downloaded again next time.`);
    refreshInspector();
  }

  async function deleteCache(name) {
    await caches.delete(name);
    log.add('🗑️', `caches.delete('${name}'). Every photo is a cache miss again.`);
    refreshInspector();
  }

  // What a Service Worker does in its "activate" event after a new deploy.
  async function deployNewVersion() {
    const next = version + 1;
    const nextName = `${CACHE_PREFIX}${next}`;
    await caches.open(nextName);
    const old = (await caches.keys()).filter((n) => n.startsWith(CACHE_PREFIX) && n !== nextName);
    await Promise.all(old.map((n) => caches.delete(n)));
    setVersion(next);
    log.add('🚀', `Deployed v${next}: created "${nextName}" and deleted ${old.length ? old.map((n) => `"${n}"`).join(', ') : 'nothing'}. Old copies never expire on their own, so cleanup is your job.`);
    refreshInspector();
  }

  if (!supported) {
    return (
      <p className="warn">
        <code>window.caches</code> isn&apos;t available. Cache Storage only works in a secure context: open the lab via
        <code>http://localhost:5173</code> (not a LAN IP) or over HTTPS.
      </p>
    );
  }

  return (
    <div className="stack">
      <div>
        <h2>📦 Cache Storage: a photo gallery that loads instantly the second time</h2>
        <p className="muted">
          Same six photos, two ways to load them. Our server is slow on purpose (~1.2s per photo) and sends
          <code>Cache-Control: no-store</code>, so the browser&apos;s normal HTTP cache never helps. Any speed-up you see
          comes from Cache Storage.
        </p>
      </div>

      <section className="card">
        <h2>What is Cache Storage, in plain words?</h2>
        <p>
          A place where your JavaScript can <b>save complete HTTP responses</b> (an image, a CSS file, a JSON reply) and
          get them back later <b>by URL</b>, without touching the network. Think of a <b>photo album of downloads</b>:
          the label under each photo is the request URL, and the photo is the full response, including status and headers.
        </p>
        <ul>
          <li><code>caches.open(&apos;photo-gallery-v1&apos;)</code> opens (or creates) a named album.</li>
          <li><code>cache.put(url, response)</code> sticks a response in. <code>cache.match(url)</code> finds it again.</li>
          <li><code>cache.delete(url)</code> / <code>caches.delete(name)</code> removes one entry or the whole album.</li>
        </ul>
        <p className="muted small">
          It is usually used inside a <b>Service Worker</b>, which sits between the page and the network and can answer
          any request (even <code>&lt;img&gt;</code> tags) from the cache, which is how PWAs work offline. <code>caches</code> also
          works on a normal page, so this demo calls it directly and you can watch each step. The API is the same.
        </p>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="lesson">
            <ul>
              <li><b>Network only</b> → Load gallery twice. Every photo takes ~1.2s and its &quot;rendered at&quot; time changes.</li>
              <li><b>Cache first</b> → the first load is slow (misses, saved with <code>cache.put</code>). The second is instant, and the time stops changing: you are looking at the saved copy.</li>
              <li>Tick <b>Simulate offline</b> (or DevTools → Network → Offline): cache first still shows everything, network only breaks.</li>
              <li>Delete one entry in the inspector: only that photo is downloaded next time.</li>
              <li>DevTools → <b>Application → Cache storage → {cacheName}</b> shows the same entries with headers and a preview.</li>
            </ul>
          </div>

          <div className="row">
            {Object.entries(STRATEGIES).map(([key, s]) => (
              <label key={key}>
                <input type="radio" name="strategy" checked={strategy === key} onChange={() => setStrategy(key)} />
                {s.label}
              </label>
            ))}
            <label><input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} /> Simulate offline</label>
            <button onClick={loadGallery} disabled={loading}>{loading ? '⏳ Loading…' : '🖼️ Load gallery'}</button>
          </div>
          <p className="muted small" style={{ marginTop: '0.4rem' }}>{STRATEGIES[strategy].hint}</p>

          <div className="gallery">
            {PHOTO_IDS.map((id) => {
              const tile = tiles[id] ?? { status: 'idle' };
              return (
                <figure key={id} className="photo">
                  <div className="photo-frame">
                    {tile.status === 'done' && <img src={tile.src} alt={`Photo ${id}`} />}
                    {tile.status === 'loading' && <span className="muted small">⏳ loading…</span>}
                    {tile.status === 'idle' && <span className="muted small">photo {id}</span>}
                    {tile.status === 'error' && <span className="small">❌ {tile.error}</span>}
                  </div>
                  <figcaption className="small">
                    {tile.status === 'done' ? (
                      <>
                        <span className={`badge ${tile.source === 'cache' ? 'ok' : 'neutral'}`}>
                          {tile.source === 'cache' ? '⚡ cache' : '🌐 network'} · {tile.ms}ms
                        </span>{' '}
                        <span className="muted">rendered at {formatTime(tile.servedAt)}</span>
                      </>
                    ) : (
                      <span className="muted">{photoUrl(id)}</span>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        <div className="stack sticky">
          <section className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>Inspector: <code>caches.keys()</code></h2>
              <div className="row">
                <button className="secondary" onClick={refreshInspector}>Refresh</button>
                <button className="secondary" onClick={deployNewVersion} title="Create the next cache version and delete the old ones">🚀 Deploy v{version + 1}</button>
              </div>
            </div>
            <p className="muted small">
              Current cache: <code>{cacheName}</code>. Nothing here expires on its own. The <code>X-Served-At</code> header
              was saved with each response, so you can see how old each copy is.
            </p>
            {inspector.length === 0 && <p className="muted small">(no caches for this origin yet)</p>}
            {inspector.map((c) => (
              <div key={c.name} style={{ marginTop: '0.5rem' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b className="small">
                    🗄️ {c.name} {c.name === cacheName && <span className="badge ok">current</span>}
                  </b>
                  <button className="secondary danger" onClick={() => deleteCache(c.name)}>Delete cache</button>
                </div>
                {c.entries.length === 0 ? (
                  <p className="muted small">(empty)</p>
                ) : (
                  <table>
                    <thead><tr><th>Request URL</th><th>Type</th><th>Size</th><th>Saved from server at</th><th /></tr></thead>
                    <tbody>
                      {c.entries.map((e) => (
                        <tr key={e.url}>
                          <td className="mono">{e.path}</td>
                          <td className="mono">{e.type?.split(';')[0]}</td>
                          <td>{formatBytes(e.size)}</td>
                          <td>{formatTime(e.servedAt)}</td>
                          <td><button className="link" title="cache.delete(url)" onClick={() => deleteEntry(c.name, e.url)}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </section>
          <EventLog entries={log.entries} onClear={log.clear} empty="Press “Load gallery” to start." />
        </div>
      </div>

      <section className="card">
        <h2>The code behind &quot;Cache first&quot;</h2>
        <pre>{CODE}</pre>
        <p className="muted small">
          <b>Why <code>response.clone()</code>?</b> A response body is a stream that can be read only once. One copy goes
          into the cache, the other one is shown on the page.
        </p>
      </section>

      <section className="card">
        <h2>HTTP cache vs Cache Storage vs IndexedDB</h2>
        <table>
          <thead><tr><th /><th>HTTP cache</th><th>Cache Storage</th><th>IndexedDB</th></tr></thead>
          <tbody>
            {COMPARISON.map(([q, ...cells]) => (
              <tr key={q}><td><b>{q}</b></td>{cells.map((c, i) => <td key={i}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Caching strategies (pick one per type of request)</h2>
        <table>
          <thead><tr><th>Strategy</th><th>Good for</th><th /></tr></thead>
          <tbody>
            {STRATEGY_GUIDE.map(([name, use, note]) => (
              <tr key={name}><td><b>{name}</b></td><td>{use}</td><td className="muted">{note}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Good to know</h2>
        <ul>
          <li><b>Nothing expires.</b> Name caches with a version (<code>photo-gallery-v1</code>) and delete old ones after a deploy, like the 🚀 button does. Service Workers do this in their <code>activate</code> event.</li>
          <li><b>Only cache good responses.</b> Check <code>response.ok</code>, or you&apos;ll serve a saved 500 error forever.</li>
          <li><b>Only <code>GET</code> requests</b> can be stored. <code>cache.put()</code> throws for <code>POST</code>.</li>
          <li><b>Secure context only:</b> HTTPS, or <code>localhost</code> during development.</li>
          <li><b>It shares the origin&apos;s quota with IndexedDB</b>, and the browser may evict it when the disk is full.</li>
          <li><b>Be careful with private data</b> (e.g. a user&apos;s invoices): it stays on the device after logout unless you delete it.</li>
        </ul>
      </section>
    </div>
  );
}
