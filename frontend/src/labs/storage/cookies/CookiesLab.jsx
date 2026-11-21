import { useCallback, useState } from 'react';
import { apiFetch, CREDENTIALS, TRANSPORTS } from '../../../lib/api.js';
import { BrowserJar } from './BrowserJar.jsx';
import { RequestLog } from './ResultView.jsx';
import { InspectPanel } from './InspectPanel.jsx';
import { AttributePlayground } from './AttributePlayground.jsx';
import { SessionFlow } from './SessionFlow.jsx';
import { PathScoping } from './PathScoping.jsx';
import { SignedCookies } from './SignedCookies.jsx';

export function CookiesLab() {
  const [transport, setTransport] = useState('proxy');
  const [credentials, setCredentials] = useState('include');
  const [log, setLog] = useState([]);

  const call = useCallback(
    async (path, { method = 'GET', body } = {}) => {
      const result = await apiFetch({ transport, credentials, path: `/api/cookies${path}`, method, body });
      setLog((prev) => [result, ...prev].slice(0, 50));
      return result;
    },
    [transport, credentials],
  );

  return (
    <div className="stack">
      <div>
        <h2>🍪 Cookies, end to end</h2>
        <p className="muted">
          Every button makes a real request to the Node backend. Keep DevTools open on
          <b> Application → Cookies</b> and <b>Network</b>, and watch the backend terminal for the raw
          <code>Cookie</code> / <code>Set-Cookie</code> headers.
        </p>
      </div>

      <section className="card">
        <h2>How the frontend talks to the backend</h2>
        <div className="row">
          {Object.entries(TRANSPORTS).map(([key, t]) => (
            <label key={key}>
              <input type="radio" name="transport" checked={transport === key} onChange={() => setTransport(key)} />
              {t.label} <code>{t.baseUrl || '/api (proxy)'}</code>
            </label>
          ))}
        </div>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <label>
            fetch <code>credentials</code>:
            <select value={credentials} onChange={(e) => setCredentials(e.target.value)}>
              {CREDENTIALS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <p className="muted small" style={{ marginTop: '0.5rem' }}>{TRANSPORTS[transport].hint}</p>
        {transport !== 'proxy' && credentials !== 'include' && (
          <p className="warn">
            Cross-origin + <code>credentials: &apos;{credentials}&apos;</code> → the browser will neither send cookies nor
            store any <code>Set-Cookie</code> from the response.
          </p>
        )}
      </section>

      <div className="two-col">
        <div className="stack">
          <InspectPanel call={call} />
          <AttributePlayground call={call} />
          <SessionFlow call={call} />
          <PathScoping call={call} />
          <SignedCookies call={call} />
        </div>
        <div className="stack sticky">
          <BrowserJar />
          <RequestLog log={log} onClear={() => setLog([])} />
        </div>
      </div>
    </div>
  );
}
