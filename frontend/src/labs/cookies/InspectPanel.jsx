import { useState } from 'react';
import { ResultView, Section } from './ResultView.jsx';

export function InspectPanel({ call }) {
  const [result, setResult] = useState(null);

  return (
    <Section
      title="1. Server view: what did the browser send?"
      lessons={[
        'The browser attaches matching cookies to every request automatically — your code never adds a Cookie header.',
        'Cookies are scoped by host, not port: cookies for localhost:4000 are visible to localhost:5173 too.',
        'Switch to "Cross-site (127.0.0.1)" — it has its own separate cookie jar.',
        'Set credentials to "omit" and inspect again: the Cookie header disappears.',
      ]}
    >
      <button onClick={async () => setResult(await call('/inspect'))}>GET /api/cookies/inspect</button>
      <ResultView result={result} />
    </Section>
  );
}
