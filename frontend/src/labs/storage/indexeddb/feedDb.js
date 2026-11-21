// A tiny promise wrapper around the raw IndexedDB API (no library), so every step is visible.
// Real apps often use the `idb` package, which does the same thing with less code.

export const DB_NAME = 'social-feed-lab';
const DB_VERSION = 1;

let dbPromise = null;

// Every IndexedDB call returns an IDBRequest that fires `success` / `error` later. Turn it into a promise.
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// A transaction is "done" when all of its requests succeeded and the data is written to disk.
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

// One connection per page, reused by every component (like a DB connection pool of size 1).
export function openFeedDb(log) {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs only when the DB doesn't exist yet or DB_VERSION went up: the ONLY place you may change the schema.
    request.onupgradeneeded = (event) => {
      const db = request.result;
      log?.('🛠️', `onupgradeneeded (v${event.oldVersion} → v${event.newVersion}): creating object stores "posts", "likes", "meta"`);
      const posts = db.createObjectStore('posts', { keyPath: 'id' });
      posts.createIndex('by_author', 'author.handle');
      db.createObjectStore('likes', { keyPath: 'postId' });
      db.createObjectStore('meta');
    };

    request.onsuccess = () => {
      const db = request.result;
      // Another tab (or "Delete database") wants to change/delete the DB: let go of our connection.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

// Read the whole cached feed (newest first) plus the posts I liked, in ONE read-only transaction.
export async function readFeed(db) {
  const tx = db.transaction(['posts', 'likes', 'meta'], 'readonly');
  const [posts, likes, lastSync] = await Promise.all([
    promisify(tx.objectStore('posts').getAll()), // sorted by key (id) ascending
    promisify(tx.objectStore('likes').getAllKeys()),
    promisify(tx.objectStore('meta').get('lastSync')),
  ]);
  return { posts: posts.reverse(), likedIds: new Set(likes), lastSync: lastSync ?? null };
}

// Query through an index instead of scanning every post.
export async function readByAuthor(db, handle) {
  const tx = db.transaction('posts', 'readonly');
  const posts = await promisify(tx.objectStore('posts').index('by_author').getAll(handle));
  return posts.reverse();
}

// put() = insert or update by key, so re-saving a post we already have just refreshes it (e.g. new like count).
export async function savePosts(db, posts) {
  const tx = db.transaction(['posts', 'meta'], 'readwrite');
  const store = tx.objectStore('posts');
  for (const post of posts) store.put(post);
  tx.objectStore('meta').put(new Date().toISOString(), 'lastSync');
  await transactionDone(tx);
}

export async function setLiked(db, postId, liked) {
  const tx = db.transaction('likes', 'readwrite');
  const store = tx.objectStore('likes');
  if (liked) store.put({ postId, likedAt: new Date() });
  else store.delete(postId);
  await transactionDone(tx);
}

export async function deleteFeedDb() {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    db?.close();
    dbPromise = null;
  }
  await promisify(indexedDB.deleteDatabase(DB_NAME));
}
