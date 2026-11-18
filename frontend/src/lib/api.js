// How the frontend reaches the backend. Switching between these is the core of the cookies lab.
export const TRANSPORTS = {
  proxy: {
    label: 'Same-origin (Vite proxy)',
    baseUrl: '',
    hint: 'Browser → http://localhost:5173/api → proxied to :4000. No CORS. Cookies are first-party.',
  },
  crossOrigin: {
    label: 'Cross-origin, same-site',
    baseUrl: 'http://localhost:4000',
    hint: 'Browser → http://localhost:4000 directly. Different port = different origin, but same site (localhost). Needs CORS + credentials.',
  },
  crossSite: {
    label: 'Cross-site',
    baseUrl: 'http://127.0.0.1:4000',
    hint: 'Browser → http://127.0.0.1:4000. Different site from localhost, so SameSite=Lax/Strict cookies are blocked and the cookie jar is separate.',
  },
};

export const CREDENTIALS = ['include', 'same-origin', 'omit'];

let nextId = 1;

export async function apiFetch({ transport, credentials, path, method = 'GET', body }) {
  const { baseUrl } = TRANSPORTS[transport];
  const url = `${baseUrl}${path}`;
  const started = performance.now();
  const entry = {
    id: nextId++,
    at: new Date().toLocaleTimeString(),
    method,
    url,
    credentials,
    documentCookieBefore: document.cookie,
  };

  try {
    const res = await fetch(url, {
      method,
      credentials,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { ...entry, ok: res.ok, status: res.status, data, ms: Math.round(performance.now() - started) };
  } catch (err) {
    // CORS failures surface as an opaque TypeError — the details are only in the DevTools console.
    return {
      ...entry,
      ok: false,
      status: 0,
      data: null,
      error: `${err.message} (likely CORS/network — check the DevTools console)`,
      ms: Math.round(performance.now() - started),
    };
  }
}

export function parseDocumentCookie() {
  if (!document.cookie) return [];
  return document.cookie.split('; ').map((pair) => {
    const i = pair.indexOf('=');
    return { name: pair.slice(0, i), value: decodeURIComponent(pair.slice(i + 1)) };
  });
}
