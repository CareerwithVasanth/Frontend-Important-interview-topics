import { useState } from 'react';
import { ResultView, Section } from './ResultView.jsx';

const DEFAULTS = { name: 'demo', value: 'hello', httpOnly: false, secure: false, sameSite: 'lax', maxAgeSeconds: '', path: '/', signed: false };

const PRESETS = {
  'Plain (JS-visible)': { name: 'plain', value: 'visible-to-js' },
  HttpOnly: { name: 'hidden', value: 'js-cannot-read-me', httpOnly: true },
  'Expires in 10s': { name: 'shortlived', value: 'tick-tock', maxAgeSeconds: 10 },
  'SameSite=None (no Secure) ❌': { name: 'none_insecure', value: 'rejected', sameSite: 'none' },
  'SameSite=None; Secure ✅': { name: 'none_secure', value: 'cross-site-ok', sameSite: 'none', secure: true },
  'Strict': { name: 'strict', value: 'same-site-only', sameSite: 'strict' },
};

export function AttributePlayground({ call }) {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState(null);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });
  const checkbox = (key) => ({
    checked: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.checked })),
  });

  async function set(e) {
    e.preventDefault();
    const { name, value, ...options } = form;
    setResult(await call('/set', { method: 'POST', body: { name, value, options } }));
  }

  async function clear() {
    setResult(await call('/clear', { method: 'POST', body: { name: form.name, path: form.path || '/' } }));
  }

  return (
    <Section
      title="2. Set-Cookie attribute playground"
      lessons={[
        'HttpOnly → shows in DevTools and is sent to the server, but never appears in document.cookie.',
        'No Max-Age/Expires → session cookie (gone when the browser session ends). Max-Age=10 → watch it vanish.',
        'SameSite=None without Secure is rejected — DevTools Network → Cookies tab shows the yellow warning.',
        'Secure works on http://localhost because browsers treat localhost as a secure context.',
      ]}
    >
      <div className="row" style={{ marginBottom: '0.5rem' }}>
        {Object.entries(PRESETS).map(([label, preset]) => (
          <button key={label} className="secondary" onClick={() => setForm({ ...DEFAULTS, ...preset })}>{label}</button>
        ))}
      </div>
      <form onSubmit={set}>
        <div className="form-grid">
          <label>Name<input {...field('name')} required /></label>
          <label>Value<input {...field('value')} /></label>
          <label>Max-Age (s, blank = session)<input type="number" {...field('maxAgeSeconds')} /></label>
          <label>Path<input {...field('path')} /></label>
          <label>SameSite
            <select {...field('sameSite')}>
              <option value="">(not set)</option>
              <option value="lax">Lax</option>
              <option value="strict">Strict</option>
              <option value="none">None</option>
            </select>
          </label>
        </div>
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          <label><input type="checkbox" {...checkbox('httpOnly')} /> HttpOnly</label>
          <label><input type="checkbox" {...checkbox('secure')} /> Secure</label>
          <label><input type="checkbox" {...checkbox('signed')} /> Signed (server HMAC)</label>
        </div>
        <div className="row">
          <button type="submit">POST /set</button>
          <button type="button" className="secondary" onClick={clear}>POST /clear</button>
        </div>
      </form>
      <ResultView result={result} />
    </Section>
  );
}
