import { useEffect, useState } from 'react';
import { parseDocumentCookie } from '../../lib/api.js';

// What JavaScript on this page can see via document.cookie (HttpOnly cookies never appear here).
export function BrowserJar() {
  const [cookies, setCookies] = useState(parseDocumentCookie);
  const [form, setForm] = useState({ name: 'theme', value: 'dark', maxAge: '', sameSite: 'Lax', path: '/' });

  useEffect(() => {
    const id = setInterval(() => setCookies(parseDocumentCookie()), 500);
    return () => clearInterval(id);
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function setFromJs(e) {
    e.preventDefault();
    let cookie = `${form.name}=${encodeURIComponent(form.value)}; Path=${form.path || '/'}; SameSite=${form.sameSite}`;
    if (form.maxAge !== '') cookie += `; Max-Age=${form.maxAge}`;
    document.cookie = cookie;
    setCookies(parseDocumentCookie());
  }

  function deleteFromJs(name) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
    setCookies(parseDocumentCookie());
  }

  return (
    <section className="card">
      <h2>Browser view: <code>document.cookie</code></h2>
      <p className="muted small">
        Origin <code>{location.origin}</code> · path <code>{location.pathname}</code>. Refreshes every 500ms.
      </p>
      {cookies.length === 0 ? (
        <p className="muted small">(empty — no JS-visible cookies)</p>
      ) : (
        <table>
          <thead><tr><th>Name</th><th>Value</th><th /></tr></thead>
          <tbody>
            {cookies.map((c) => (
              <tr key={c.name}>
                <td className="mono">{c.name}</td>
                <td className="mono">{c.value}</td>
                <td><button className="link" title="document.cookie = name=; Max-Age=0" onClick={() => deleteFromJs(c.name)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={setFromJs} style={{ marginTop: '0.75rem' }}>
        <fieldset>
          <legend>Set a cookie from JavaScript</legend>
          <div className="form-grid">
            <label>Name<input value={form.name} onChange={update('name')} required /></label>
            <label>Value<input value={form.value} onChange={update('value')} /></label>
            <label>Max-Age (s, blank = session)<input type="number" value={form.maxAge} onChange={update('maxAge')} /></label>
            <label>SameSite
              <select value={form.sameSite} onChange={update('sameSite')}>
                <option>Lax</option><option>Strict</option><option>None</option>
              </select>
            </label>
            <label>Path<input value={form.path} onChange={update('path')} /></label>
          </div>
          <button type="submit">document.cookie = …</button>
          <p className="muted small" style={{ marginTop: '0.4rem' }}>
            JS can&apos;t set <code>HttpOnly</code>. Deleting only works if Path/Domain match the original cookie.
          </p>
        </fieldset>
      </form>
    </section>
  );
}
