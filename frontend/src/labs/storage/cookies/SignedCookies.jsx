import { useState } from 'react';
import { ResultView, Section } from './ResultView.jsx';

export function SignedCookies({ call }) {
  const [result, setResult] = useState(null);
  const run = async (path, options) => setResult(await call(path, options));

  function tamper(value) {
    document.cookie = `role=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
  }

  return (
    <Section
      title="5. Signed cookies (tamper detection)"
      lessons={[
        'The server sets role=s:student.<HMAC>. The value is readable — signing is NOT encryption.',
        'Edit it from JS (or DevTools) and the HMAC no longer matches → the server rejects it.',
        'Only the server knows COOKIE_SECRET, so the client cannot forge a valid signature.',
      ]}
    >
      <div className="row">
        <button onClick={() => run('/signed/set', { method: 'POST', body: { role: 'student' } })}>Set signed role=student</button>
        <button className="secondary" onClick={() => run('/signed/read')}>GET /signed/read</button>
      </div>
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <span className="small muted">Attack from JS:</span>
        <button className="secondary" onClick={() => tamper('s:admin.forged-signature')}>role = s:admin.forged-signature</button>
        <button className="secondary" onClick={() => tamper('admin')}>role = admin (unsigned)</button>
      </div>
      <p className="muted small" style={{ marginTop: '0.4rem' }}>
        Tampering edits the cookie jar for <code>{location.hostname}</code> — use the proxy or localhost transport so the
        server sees it.
      </p>
      <ResultView result={result} />
    </Section>
  );
}
