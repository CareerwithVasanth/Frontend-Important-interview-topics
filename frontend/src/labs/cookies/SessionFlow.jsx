import { useState } from 'react';
import { ResultView, Section } from './ResultView.jsx';

export function SessionFlow({ call }) {
  const [creds, setCreds] = useState({ username: 'alice', password: 'password123' });
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState(null);

  async function run(path, options) {
    const r = await call(path, options);
    setResult(r);
    const s = await call('/auth/sessions');
    setSessions(s.data?.sessions ?? null);
  }

  return (
    <Section
      title="3. Login session with an HttpOnly cookie"
      lessons={[
        'Login → server creates a session in memory and sends Set-Cookie: sid=…; HttpOnly; SameSite=Lax.',
        'The sid is NOT in document.cookie (XSS can\'t steal it), yet GET /me works because the browser sends it.',
        'Logout → server deletes the session and sends an expired sid cookie to clear it.',
        'Try logging in with credentials "omit": login succeeds, but /me is 401 — the cookie was never stored.',
        'Restart the backend: the sid cookie survives in the browser but the server forgot the session → 401.',
      ]}
    >
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          run('/auth/login', { method: 'POST', body: creds });
        }}
      >
        <input value={creds.username} onChange={(e) => setCreds({ ...creds, username: e.target.value })} placeholder="username" />
        <input type="password" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} placeholder="password" />
        <button type="submit">Login</button>
        <button type="button" className="secondary" onClick={() => run('/auth/me')}>GET /me</button>
        <button type="button" className="secondary" onClick={() => run('/auth/logout', { method: 'POST' })}>Logout</button>
      </form>
      <p className="muted small" style={{ marginTop: '0.4rem' }}>Users: <code>alice / password123</code>, <code>bob / hunter2</code></p>
      {sessions && (
        <p className="small">
          Server-side session store: {sessions.length === 0 ? <span className="muted">(empty)</span> : sessions.map((s) => (
            <code key={s.sid} style={{ marginRight: '0.4rem' }}>{s.username} · {s.sid} · {s.expiresInSeconds}s</code>
          ))}
        </p>
      )}
      <ResultView result={result} />
    </Section>
  );
}
