import { randomUUID } from 'node:crypto';
import { Router } from 'express';

export const cookiesRouter = Router();

// RFC 6265 cookie-name "token" characters.
const COOKIE_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const SAME_SITE_VALUES = new Set(['lax', 'strict', 'none']);

// Browsers never expose Set-Cookie to JS (it's a "forbidden response header"),
// so we echo what we sent in the body to make it visible in the UI.
function snapshot(req, res, extra = {}) {
  const setCookie = res.getHeader('Set-Cookie');
  return {
    ...extra,
    request: {
      origin: req.headers.origin ?? null,
      cookieHeader: req.headers.cookie ?? null,
      cookies: req.cookies,
      signedCookies: req.signedCookies,
    },
    response: {
      setCookie: setCookie ? [].concat(setCookie) : [],
    },
  };
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

/* ------------------------------------------------------------------ */
/* 1. Inspect: what did the browser send us?                           */
/* ------------------------------------------------------------------ */
cookiesRouter.get('/inspect', (req, res) => {
  res.json(snapshot(req, res));
});

/* ------------------------------------------------------------------ */
/* 2. Attribute playground: set / clear any cookie with any attributes */
/* ------------------------------------------------------------------ */
cookiesRouter.post('/set', (req, res) => {
  const { name, value = '', options = {} } = req.body ?? {};
  if (!name || !COOKIE_NAME_RE.test(name)) throw badRequest('Invalid cookie name');

  const cookieOptions = {
    path: options.path || '/',
    httpOnly: Boolean(options.httpOnly),
    secure: Boolean(options.secure),
    signed: Boolean(options.signed),
  };
  if (options.sameSite && SAME_SITE_VALUES.has(options.sameSite)) cookieOptions.sameSite = options.sameSite;
  if (options.maxAgeSeconds !== undefined && options.maxAgeSeconds !== '' && options.maxAgeSeconds !== null) {
    // Express takes ms and emits both Max-Age (seconds) and Expires.
    cookieOptions.maxAge = Number(options.maxAgeSeconds) * 1000;
  }
  if (options.domain) cookieOptions.domain = options.domain;
  if (options.partitioned) cookieOptions.partitioned = true;

  res.cookie(name, String(value), cookieOptions);

  const warnings = [];
  if (cookieOptions.sameSite === 'none' && !cookieOptions.secure) {
    warnings.push('SameSite=None without Secure is rejected by modern browsers.');
  }
  if (cookieOptions.partitioned && !cookieOptions.secure) {
    warnings.push('Partitioned cookies must also be Secure.');
  }
  res.json(snapshot(req, res, { warnings }));
});

cookiesRouter.post('/clear', (req, res) => {
  const { name, path = '/', domain } = req.body ?? {};
  if (!name || !COOKIE_NAME_RE.test(name)) throw badRequest('Invalid cookie name');
  // A cookie is only removed if Path (and Domain) match the ones it was set with.
  res.clearCookie(name, { path, ...(domain ? { domain } : {}) });
  res.json(snapshot(req, res));
});

/* ------------------------------------------------------------------ */
/* 3. Session-based auth with an HttpOnly cookie                       */
/* ------------------------------------------------------------------ */
const SESSION_COOKIE = 'sid';
const SESSION_TTL_MS = 15 * 60 * 1000;
const USERS = { alice: 'password123', bob: 'hunter2' };
const sessions = new Map(); // sid -> { username, createdAt, expiresAt }

function getSession(req) {
  const sid = req.cookies[SESSION_COOKIE];
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return { sid, ...session };
}

cookiesRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (!USERS[username] || USERS[username] !== password) {
    return res.status(401).json(snapshot(req, res, { error: 'Invalid username or password' }));
  }

  const previous = getSession(req);
  if (previous) sessions.delete(previous.sid); // rotate id on login (prevents session fixation)

  const sid = randomUUID();
  const now = Date.now();
  sessions.set(sid, { username, createdAt: now, expiresAt: now + SESSION_TTL_MS });

  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true, // JS (and therefore XSS) can't read it
    sameSite: 'lax', // not sent on cross-site sub-requests (basic CSRF protection)
    secure: req.secure, // in production (HTTPS) this must be true
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
  res.json(snapshot(req, res, { user: { username } }));
});

cookiesRouter.get('/auth/me', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json(snapshot(req, res, { error: 'Not authenticated' }));
  res.json(snapshot(req, res, { user: { username: session.username }, expiresAt: session.expiresAt }));
});

cookiesRouter.post('/auth/logout', (req, res) => {
  const session = getSession(req);
  if (session) sessions.delete(session.sid);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json(snapshot(req, res, { loggedOut: Boolean(session) }));
});

// Lists the server-side session store. The browser only holds an opaque `sid`;
// the actual session data (user, expiry) lives here on the server.
// Never expose an endpoint like this in a real app.
cookiesRouter.get('/auth/sessions', (_req, res) => {
  res.json({
    sessions: [...sessions.entries()].map(([sid, s]) => ({
      sid: `${sid.slice(0, 8)}…`,
      username: s.username,
      expiresInSeconds: Math.max(0, Math.round((s.expiresAt - Date.now()) / 1000)),
    })),
  });
});

/* ------------------------------------------------------------------ */
/* 4. Path scoping                                                     */
/* ------------------------------------------------------------------ */
const SCOPED_PATH = '/api/cookies/scoped';

cookiesRouter.post('/scoped/set', (req, res) => {
  res.cookie('scoped_token', 'only-sent-to-/api/cookies/scoped', { path: SCOPED_PATH, sameSite: 'lax' });
  res.json(snapshot(req, res));
});

cookiesRouter.get('/scoped/inspect', (req, res) => {
  res.json(snapshot(req, res));
});

cookiesRouter.post('/scoped/clear', (req, res) => {
  // Pass ?wrongPath=1 to see that clearing with a different Path does nothing.
  res.clearCookie('scoped_token', { path: req.query.wrongPath ? '/' : SCOPED_PATH });
  res.json(snapshot(req, res));
});

/* ------------------------------------------------------------------ */
/* 5. Signed cookies (tamper detection)                                */
/* ------------------------------------------------------------------ */
cookiesRouter.post('/signed/set', (req, res) => {
  const { role = 'student' } = req.body ?? {};
  // Deliberately NOT HttpOnly so it can be edited from JS/DevTools to test tamper detection.
  res.cookie('role', String(role), { signed: true, sameSite: 'lax', path: '/' });
  res.json(snapshot(req, res));
});

cookiesRouter.get('/signed/read', (req, res) => {
  const role = req.signedCookies.role;
  let verdict;
  if (role === false) verdict = 'TAMPERED (signature mismatch) → rejected';
  else if (role !== undefined) verdict = `valid signature → role="${role}"`;
  else if (req.cookies.role !== undefined) verdict = `UNSIGNED value "${req.cookies.role}" → not trusted`;
  else verdict = 'missing';
  res.json(snapshot(req, res, { verdict }));
});
