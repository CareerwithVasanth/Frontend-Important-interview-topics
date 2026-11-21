import { Router } from 'express';

export const storageRouter = Router();

const MAX_DELAY_MS = 10_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function delayFrom(req, fallback) {
  const ms = Number(req.query.delay ?? fallback);
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), MAX_DELAY_MS) : fallback;
}

// The network is deliberately slow and never HTTP-cacheable, so any speed-up the
// learner sees comes from IndexedDB / Cache Storage, not from the browser's HTTP cache.
storageRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/* ------------------------------------------------------------------ */
/* Social feed (IndexedDB demo)                                        */
/* ------------------------------------------------------------------ */
const AUTHORS = [
  { handle: 'alice', name: 'Alice Chen', color: '#7c3aed' },
  { handle: 'bob', name: 'Bob Kumar', color: '#0891b2' },
  { handle: 'carol', name: 'Carol Diaz', color: '#db2777' },
  { handle: 'dev', name: 'Dev Patel', color: '#ea580c' },
  { handle: 'erin', name: 'Erin Okafor', color: '#16a34a' },
];

const TEXTS = [
  'Just shipped dark mode 🌙 Took 2 hours to build and 2 days to pick the shade of grey.',
  'Hot take: most "slow websites" are just waiting on the network. Cache more!',
  'Coffee #3. The bug was a missing await. It is always a missing await. ☕',
  'Learned today: IndexedDB can store Blobs, Dates and Maps, not just strings 🤯',
  'Weekend project: a recipe app that works on the train with zero signal 🚆',
  'Reminder: localStorage is synchronous. Your 2 MB JSON blob is blocking the main thread.',
  'Our feed now opens instantly from cache, then quietly refreshes. Users noticed. 📈',
  'Code review tip: ask "what happens when this request fails?"',
  'Finally understood CSS grid. Now I understand nothing else. 🧩',
  'Hiking this weekend, posting from the mountains with 1 bar of signal ⛰️',
  'Rewrote the onboarding flow. 40% fewer clicks, same features.',
  'Pair programming is just rubber-duck debugging where the duck talks back 🦆',
];

const SERVER_START = Date.now();
const SEED_POSTS = 60;
// A "new post" is published every 20 seconds, so refreshing the feed later brings in fresh content.
const NEW_POST_EVERY_MS = 20_000;

function latestPostId() {
  return SEED_POSTS + Math.floor((Date.now() - SERVER_START) / NEW_POST_EVERY_MS);
}

function makePost(id) {
  const createdAt = id <= SEED_POSTS
    ? SERVER_START - (SEED_POSTS - id + 1) * 37 * 60_000
    : SERVER_START + (id - SEED_POSTS) * NEW_POST_EVERY_MS;
  const liveSeconds = Math.max(0, (Date.now() - Math.max(createdAt, SERVER_START)) / 1000);
  return {
    id,
    author: AUTHORS[id % AUTHORS.length],
    text: TEXTS[(id * 7) % TEXTS.length],
    createdAt: new Date(createdAt).toISOString(),
    // Like counts keep growing, so a cached copy is visibly "stale" until the next refresh.
    likes: ((id * 37) % 120) + Math.floor(liveSeconds / 30),
    comments: (id * 13) % 25,
  };
}

// Cursor pagination, newest first: GET /feed?limit=10&before=<id>
storageRouter.get('/feed', async (req, res) => {
  await sleep(delayFrom(req, 1500));
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30);
  const latest = latestPostId();
  const before = Number(req.query.before) || latest + 1;

  const posts = [];
  for (let id = Math.min(before - 1, latest); id >= 1 && posts.length < limit; id--) posts.push(makePost(id));

  const last = posts.at(-1);
  res.json({
    posts,
    nextCursor: last && last.id > 1 ? last.id : null,
    serverTime: new Date().toISOString(),
  });
});

/* ------------------------------------------------------------------ */
/* Photo gallery (Cache Storage demo)                                  */
/* ------------------------------------------------------------------ */
const PHOTOS = {
  1: { title: 'Mountain sunrise', emoji: '🏔️', from: '#f97316', to: '#7c3aed' },
  2: { title: 'Beach day', emoji: '🏖️', from: '#38bdf8', to: '#facc15' },
  3: { title: 'City lights', emoji: '🌃', from: '#1e3a8a', to: '#db2777' },
  4: { title: 'Forest walk', emoji: '🌲', from: '#14532d', to: '#84cc16' },
  5: { title: 'Desert road', emoji: '🏜️', from: '#b45309', to: '#fde68a' },
  6: { title: 'Northern lights', emoji: '🌌', from: '#0f172a', to: '#22c55e' },
};

function photoSvg({ title, emoji, from, to }, servedAt) {
  const time = servedAt.toLocaleTimeString('en-GB');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="400" height="260" fill="url(#g)"/>
  <text x="200" y="130" font-size="96" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="200" y="215" font-size="24" font-family="system-ui, sans-serif" font-weight="600" fill="#fff" text-anchor="middle">${title}</text>
  <text x="200" y="243" font-size="14" font-family="ui-monospace, monospace" fill="#fff" fill-opacity="0.85" text-anchor="middle">rendered by the server at ${time}</text>
</svg>`;
}

storageRouter.get('/photos/:id.svg', async (req, res) => {
  const photo = PHOTOS[req.params.id];
  if (!photo) return res.status(404).json({ error: `No photo ${req.params.id}` });
  await sleep(delayFrom(req, 1200));
  const servedAt = new Date();
  res
    .set('Content-Type', 'image/svg+xml')
    // Custom headers are stored with the Response in Cache Storage, so the UI can show how old a copy is.
    .set('X-Served-At', servedAt.toISOString())
    .set('Access-Control-Expose-Headers', 'X-Served-At')
    .send(photoSvg(photo, servedAt));
});
