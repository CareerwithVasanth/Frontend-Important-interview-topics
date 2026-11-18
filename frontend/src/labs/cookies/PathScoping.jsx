import { useState } from 'react';
import { ResultView, Section } from './ResultView.jsx';

export function PathScoping({ call }) {
  const [result, setResult] = useState(null);
  const run = async (path, options) => setResult(await call(path, options));

  return (
    <Section
      title="4. Path scoping"
      lessons={[
        'scoped_token is set with Path=/api/cookies/scoped.',
        'It is sent to /api/cookies/scoped/inspect but NOT to /api/cookies/inspect, and it never shows in document.cookie (page path is /cookies).',
        'Clearing with the wrong Path silently does nothing — Path must match exactly to delete.',
      ]}
    >
      <div className="row">
        <button onClick={() => run('/scoped/set', { method: 'POST' })}>Set scoped cookie</button>
        <button className="secondary" onClick={() => run('/scoped/inspect')}>GET /scoped/inspect</button>
        <button className="secondary" onClick={() => run('/inspect')}>GET /inspect</button>
        <button className="secondary" onClick={() => run('/scoped/clear?wrongPath=1', { method: 'POST' })}>Clear (wrong Path)</button>
        <button className="secondary" onClick={() => run('/scoped/clear', { method: 'POST' })}>Clear (correct Path)</button>
      </div>
      <ResultView result={result} />
    </Section>
  );
}
