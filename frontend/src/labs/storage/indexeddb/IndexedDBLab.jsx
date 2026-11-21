import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { EventLog } from '../EventLog.jsx';
import { ms, useEventLog } from '../useEventLog.js';
import { DB_NAME, deleteFeedDb, openFeedDb, readByAuthor, readFeed, savePosts, setLiked } from './feedDb.js';

const FEED_URL = '/api/storage/feed';
const PAGE_SIZE = 10;

const VOCABULARY = [
  ['Database', 'The filing cabinet. One website can have several.', 'social-feed-lab'],
  ['Object store', 'A drawer in the cabinet (like a table in SQL).', 'posts, likes, meta'],
  ['Record', 'A folder in the drawer: any JavaScript object.', '{ id: 42, author, text, likes }'],
  ['Key', 'The unique label on each folder, used to find it fast.', "keyPath: 'id'"],
  ['Index', 'A second way to look folders up (by something other than the key).', 'by_author → author.handle'],
  ['Transaction', 'A unit of work on some drawers: all of it succeeds or none of it does.', 'readonly / readwrite'],
];

const CODE = `// 1. Open the database. On the very first visit, create its "drawers".
const request = indexedDB.open('social-feed-lab', 1);
request.onupgradeneeded = () => {
  const db = request.result;
  const posts = db.createObjectStore('posts', { keyPath: 'id' });
  posts.createIndex('by_author', 'author.handle');
};
const db = await promisify(request);

// 2. App starts: show whatever we saved last time. No network, ~5ms.
const cached = await promisify(
  db.transaction('posts', 'readonly').objectStore('posts').getAll()
);
render(cached.reverse()); // records come back sorted by key (id)

// 3. In the background, ask the server for the latest posts (slow, ~1.5s).
const { posts } = await fetch('/api/storage/feed').then((r) => r.json());

// 4. Save them. put() = insert, or update if that id already exists.
const tx = db.transaction('posts', 'readwrite');
posts.forEach((post) => tx.objectStore('posts').put(post));
await transactionDone(tx);

// 5. Re-render from IndexedDB, so the UI and the database never disagree.
render(await readFeed(db));`;

function timeAgo(iso) {
  const seconds = Math.round((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export function IndexedDBLab() {
  const log = useEventLog();
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [lastSync, setLastSync] = useState(null);
  const [newIds, setNewIds] = useState(() => new Set());
  const [timings, setTimings] = useState({ idb: null, network: null });
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [author, setAuthor] = useState('');
  const [error, setError] = useState(null);

  // Mirrors of `offline` / `author` for async flows that outlive a render, so they always see the current value.
  const offlineRef = useRef(false);
  const authorRef = useRef('');

  function changeOffline(value) {
    setOffline(value);
    offlineRef.current = value;
  }

  function changeAuthor(handle) {
    setAuthor(handle);
    authorRef.current = handle;
  }

  async function fetchFeed(query) {
    if (offlineRef.current) throw new Error('you are offline (simulated)');
    const start = performance.now();
    const res = await fetch(`${FEED_URL}${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const took = ms(start);
    setTimings((t) => ({ ...t, network: took }));
    log.add('🌐', `GET ${FEED_URL}${query} → ${data.posts.length} posts in ${took}ms`);
    return data;
  }

  // IndexedDB is the single source of truth: the UI always renders what's in the database.
  async function renderFromDb(db) {
    const full = await readFeed(db);
    setAllPosts(full.posts);
    setLikedIds(full.likedIds);
    setLastSync(full.lastSync);
    setPosts(authorRef.current ? await readByAuthor(db, authorRef.current) : full.posts);
    return full;
  }

  async function refreshFromNetwork(db, knownPosts) {
    setSyncing(true);
    try {
      const data = await fetchFeed(`?limit=${PAGE_SIZE}`);
      const known = new Set(knownPosts.map((p) => p.id));
      const fresh = data.posts.filter((p) => !known.has(p.id)).map((p) => p.id);
      const start = performance.now();
      await savePosts(db, data.posts);
      log.add('💾', `posts.put() × ${data.posts.length} in one readwrite transaction (${ms(start)}ms): ${fresh.length} new, ${data.posts.length - fresh.length} updated`);
      await renderFromDb(db);
      // On a first visit everything is "new", so only highlight posts that arrived on top of a cached feed.
      setNewIds(known.size ? new Set(fresh) : new Set());
      if (known.size && fresh.length) log.add('✨', `${fresh.length} new post${fresh.length > 1 ? 's' : ''} slid in on top of the cached feed`);
    } catch (err) {
      log.add('📴', `Network failed: ${err.message}. The ${knownPosts.length} cached posts stay on screen.`);
    } finally {
      setSyncing(false);
    }
  }

  // Simulates opening the app: read the cache first, then refresh from the network.
  async function openApp() {
    setError(null);
    setPosts([]);
    setAllPosts([]);
    setNewIds(new Set());
    changeAuthor('');
    setTimings({ idb: null, network: null });
    log.add('📱', 'App opened');
    try {
      const db = await openFeedDb(log.add);
      const start = performance.now();
      const cached = await renderFromDb(db);
      const took = ms(start);
      setTimings((t) => ({ ...t, idb: took }));
      log.add(
        cached.posts.length ? '📦' : '📭',
        cached.posts.length
          ? `IndexedDB → ${cached.posts.length} posts in ${took}ms. Rendered instantly, before any network request.`
          : `IndexedDB is empty (${took}ms). First visit: the user stares at a spinner until the network answers.`,
      );
      await refreshFromNetwork(db, cached.posts);
    } catch (err) {
      setError(err.message);
      log.add('❌', `IndexedDB error: ${err.message}`);
    }
  }

  async function loadOlder() {
    const oldest = allPosts.at(-1);
    if (!oldest) return;
    setSyncing(true);
    try {
      const db = await openFeedDb(log.add);
      const data = await fetchFeed(`?limit=${PAGE_SIZE}&before=${oldest.id}`);
      await savePosts(db, data.posts);
      log.add('💾', `Saved ${data.posts.length} older posts. They'll be there instantly next time, even offline.`);
      await renderFromDb(db);
    } catch (err) {
      log.add('📴', `Couldn't load older posts: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function filterByAuthor(handle) {
    changeAuthor(handle);
    const db = await openFeedDb(log.add);
    const start = performance.now();
    if (!handle) {
      await renderFromDb(db);
      log.add('📦', 'Filter cleared: showing every cached post');
      return;
    }
    const found = await readByAuthor(db, handle);
    setPosts(found);
    log.add('🔎', `index('by_author').getAll('${handle}') → ${found.length} posts in ${ms(start)}ms. Works offline: no server involved.`);
  }

  async function toggleLike(post) {
    const liked = !likedIds.has(post.id);
    const db = await openFeedDb(log.add);
    await setLiked(db, post.id, liked);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.add(post.id);
      else next.delete(post.id);
      return next;
    });
    log.add(
      liked ? '❤️' : '🤍',
      liked
        ? `likes.put({ postId: ${post.id} }). Reload the browser tab: the heart is still red.`
        : `likes.delete(${post.id})`,
    );
  }

  async function wipe() {
    await deleteFeedDb();
    setPosts([]);
    setAllPosts([]);
    setLikedIds(new Set());
    setLastSync(null);
    setNewIds(new Set());
    setTimings({ idb: null, network: null });
    changeAuthor('');
    log.add('🗑️', `indexedDB.deleteDatabase('${DB_NAME}'). Press "Reopen app" to feel a first visit again.`);
  }

  // Ref guard: React StrictMode runs effects twice in dev, but the app should "open" once.
  const opened = useRef(false);
  const onMount = useEffectEvent(openApp);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    onMount();
  }, []);

  const authors = [...new Map(allPosts.map((p) => [p.author.handle, p.author])).values()];
  const supported = typeof indexedDB !== 'undefined';

  return (
    <div className="stack">
      <div>
        <h2>🗂️ IndexedDB: a social feed that opens instantly (and offline)</h2>
        <p className="muted">
          Open Instagram or X in a train tunnel and you still see your feed. The app saved the last posts on your device.
          On the web, that &quot;save it on the device&quot; part is <b>IndexedDB</b>.
        </p>
      </div>

      <section className="card">
        <h2>What is IndexedDB, in plain words?</h2>
        <p>
          A real database built into every browser. Each website (origin) gets its own private one. It stores real
          JavaScript objects (not just strings), can hold hundreds of megabytes, and keeps everything after the tab,
          the browser, or the computer is closed. Think of it as a <b>filing cabinet</b>:
        </p>
        <table>
          <thead><tr><th>Term</th><th>Filing-cabinet meaning</th><th>In this demo</th></tr></thead>
          <tbody>
            {VOCABULARY.map(([term, meaning, example]) => (
              <tr key={term}><td><b>{term}</b></td><td>{meaning}</td><td><code>{example}</code></td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          <b>Why not localStorage?</b> It holds ~5 MB of strings only (you <code>JSON.stringify</code> everything), it is
          synchronous (reading a big feed freezes the page), and you can&apos;t query it. Fine for a theme setting, wrong for a feed.
        </p>
      </section>

      <section className="card">
        <h2>The pattern: show what you have, then refresh</h2>
        <ol className="steps">
          <li><b>📱 Open the app.</b> Open the database (and create the stores on the first visit).</li>
          <li><b>📦 Read IndexedDB and render.</b> A few milliseconds. The user is already scrolling.</li>
          <li><b>🌐 Fetch the latest posts</b> in the background. Our fake server takes ~1.5s, like a phone on 3G.</li>
          <li><b>💾 Save them into IndexedDB</b> in one transaction.</li>
          <li><b>✨ Re-render from IndexedDB.</b> New posts slide in on top, like counts update.</li>
        </ol>
        <p className="muted small">
          If step 3 fails (offline, server down), nothing breaks. The user keeps reading the posts from step 2.
          This is called <i>cache, then network</i> (or <i>stale-while-revalidate</i>), and it&apos;s how most feed apps feel fast.
        </p>
      </section>

      {!supported && <p className="warn">This browser has no IndexedDB (some private modes disable it).</p>}
      {error && <p className="warn">⚠️ {error}</p>}

      <div className="two-col">
        <section className="card">
          <div className="lesson">
            <ul>
              <li>Watch the two timers: IndexedDB answers in a few ms, the network in ~1.5s.</li>
              <li>Press <b>Reopen app</b> (or reload the browser tab): posts appear instantly from IndexedDB, then refresh.</li>
              <li>A new post is published every 20s. Wait a bit, reopen, and look for the <span className="badge ok">new</span> badge.</li>
              <li>Tick <b>Simulate offline</b> (or DevTools → Network → Offline) and reopen: the feed still works.</li>
              <li>Like a post, then reload the tab. Filter by author: that query uses the <code>by_author</code> index.</li>
              <li>DevTools → <b>Application → IndexedDB → {DB_NAME}</b> shows every store and record.</li>
            </ul>
          </div>

          <div className="row">
            <button onClick={openApp} disabled={syncing}>📱 Reopen app</button>
            <button className="secondary" onClick={loadOlder} disabled={syncing || !allPosts.length || !!author}>⬇️ Load older posts</button>
            <label><input type="checkbox" checked={offline} onChange={(e) => changeOffline(e.target.checked)} /> Simulate offline</label>
            <label>
              Author
              <select value={author} onChange={(e) => filterByAuthor(e.target.value)} disabled={!allPosts.length}>
                <option value="">Everyone</option>
                {authors.map((a) => <option key={a.handle} value={a.handle}>@{a.handle}</option>)}
              </select>
            </label>
            <button className="secondary danger" onClick={wipe} disabled={syncing}>🗑️ Delete database</button>
          </div>

          <div className="timers">
            <div className="timer">
              <span className="muted small">📦 IndexedDB read</span>
              <b>{timings.idb === null ? '–' : `${timings.idb} ms`}</b>
            </div>
            <div className="timer">
              <span className="muted small">🌐 Network fetch</span>
              <b>{syncing ? '⏳' : timings.network === null ? '–' : `${timings.network} ms`}</b>
            </div>
            <div className="timer">
              <span className="muted small">💾 Stored on this device</span>
              <b>{allPosts.length} posts · {likedIds.size} likes</b>
            </div>
          </div>

          <div className="phone">
            <div className="phone-status small">
              {syncing
                ? '⏳ Refreshing from the network… (you are already reading cached posts)'
                : lastSync
                  ? `Last synced ${new Date(lastSync).toLocaleTimeString()}${offline ? ' · 📴 offline' : ''}`
                  : 'Never synced'}
            </div>
            {posts.length === 0 && (
              <p className="muted small phone-empty">
                {syncing ? '⏳ Nothing cached yet. Waiting for the network…' : 'No posts in IndexedDB.'}
              </p>
            )}
            {posts.map((post) => {
              const liked = likedIds.has(post.id);
              return (
                <article key={post.id} className={`post${newIds.has(post.id) ? ' post-new' : ''}`}>
                  <div className="avatar" style={{ background: post.author.color }}>{post.author.name[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="small">
                      <b>{post.author.name}</b>{' '}
                      <span className="muted">@{post.author.handle} · {timeAgo(post.createdAt)} · #{post.id}</span>{' '}
                      {newIds.has(post.id) && <span className="badge ok">new</span>}
                    </div>
                    <p style={{ margin: '0.15rem 0 0.3rem' }}>{post.text}</p>
                    <div className="row small">
                      <button className={`like${liked ? ' liked' : ''}`} onClick={() => toggleLike(post)}>
                        {liked ? '❤️' : '🤍'} {post.likes + (liked ? 1 : 0)}
                      </button>
                      <span className="muted">💬 {post.comments}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="stack sticky">
          <EventLog entries={log.entries} onClear={log.clear} />
          <section className="card">
            <h2>The code behind it</h2>
            <p className="muted small">
              Simplified from <code>frontend/src/labs/storage/indexeddb/feedDb.js</code>. <code>promisify</code> turns
              IndexedDB&apos;s <code>onsuccess</code>/<code>onerror</code> events into a promise.
            </p>
            <pre>{CODE}</pre>
          </section>
        </div>
      </div>

      <section className="card">
        <h2>Good to know</h2>
        <ul>
          <li><b>Don&apos;t <code>await fetch()</code> inside a transaction.</b> A transaction auto-commits as soon as it has no pending work, so after the await it&apos;s closed (<code>TransactionInactiveError</code>). Fetch first, then open the write transaction, like step 3 → 4 above.</li>
          <li><b>Schema changes only happen in <code>onupgradeneeded</code></b>, and only when you bump the version number in <code>indexedDB.open(name, version)</code>.</li>
          <li><b>It&apos;s per origin.</b> <code>localhost:5173</code> and <code>localhost:4000</code> have different databases.</li>
          <li><b>It can be wiped.</b> The browser may evict it when the disk is full (ask for <code>navigator.storage.persist()</code>), and Safari clears script-written storage after 7 days without a visit. The server stays the source of truth.</li>
          <li><b>Never store secrets or tokens here.</b> Any script on the page (including an XSS payload) can read it. That&apos;s why session IDs live in <code>HttpOnly</code> cookies.</li>
          <li><b>It stores structured clones:</b> objects, arrays, <code>Date</code>, <code>Map</code>, <code>Blob</code>, <code>File</code> all work. Functions, DOM nodes, and class methods don&apos;t.</li>
        </ul>
      </section>
    </div>
  );
}
