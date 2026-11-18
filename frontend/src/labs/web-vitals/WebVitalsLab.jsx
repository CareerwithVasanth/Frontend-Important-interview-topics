// Demo pages are plain HTML served by the Node backend, NOT React routes. Web Vitals are measured once per
// full page load, so each demo must open as a fresh page in a new tab.
const DEMO_BASE = 'http://localhost:4000/web-vitals';
const SOURCE_DIR = 'backend/src/modules/web-vitals/pages';

const THRESHOLDS = [
  { metric: 'LCP', name: 'Largest Contentful Paint', measures: 'Loading: when the main content appears', good: '≤ 2.5s', poor: '> 4s' },
  { metric: 'INP', name: 'Interaction to Next Paint', measures: 'Responsiveness: click/tap/key → next frame', good: '≤ 200ms', poor: '> 500ms' },
  { metric: 'CLS', name: 'Cumulative Layout Shift', measures: 'Visual stability: unexpected movement', good: '≤ 0.1', poor: '> 0.25' },
];

const DEMOS = [
  {
    slug: 'lcp',
    title: 'LCP: the hero image shows up late',
    howTo: 'Reload the page and don\'t touch it until the image appears.',
    bad: ['Render-blocking stylesheet in <head>', 'Hero <img> created by JS after an API call', 'loading="lazy" on the hero'],
    good: ['Critical CSS inlined, slow CSS loaded non-blocking', '<img> in the HTML with fetchpriority="high"', 'No lazy-loading above the fold'],
  },
  {
    slug: 'cls',
    title: 'CLS: content jumps while loading',
    howTo: 'Reload and watch the paragraph. Don\'t click or scroll (shifts right after input are not counted).',
    bad: ['<img> without width/height', 'Promo banner injected above content'],
    good: ['width/height on <img> (aspect ratio reserved)', 'min-height slot reserved for the banner'],
  },
  {
    slug: 'inp',
    title: 'INP: the button feels frozen',
    howTo: 'Click "Add to cart" a few times. Watch the heartbeat square freeze on the bad page.',
    bad: ['500ms of synchronous work before updating the UI'],
    good: ['Update UI first', 'Same work in 10ms chunks, yielding to the main thread'],
  },
];

export function WebVitalsLab() {
  return (
    <main className="container stack">
      <div>
        <h1>⚡ Core Web Vitals: good vs bad</h1>
        <p className="muted">
          Each scenario has a <b>bad</b> and a <b>good</b> page served by the Node backend. They use the same server,
          the same assets, and the same delays. Only the frontend code differs. Open both and compare the numbers.
        </p>
      </div>

      <section className="card">
        <h2>How to measure</h2>
        <ol>
          <li>Open a demo (it opens in a new tab), then open <b>Chrome DevTools → Performance</b>.</li>
          <li>The <b>Local metrics</b> panel shows live LCP, CLS and INP for that tab. Hover a value to see the element responsible.</li>
          <li>Reload with DevTools open for LCP/CLS. Interact with the page for INP.</li>
        </ol>
        <p className="muted small">
          The backend sends <code>Cache-Control: no-store</code> and adds artificial delays (<code>?delay=ms</code>), so every
          reload is a reproducible cold load. No network throttling needed.
        </p>
      </section>

      <section className="card">
        <h2>Thresholds (75th percentile of real users)</h2>
        <table>
          <thead>
            <tr><th>Metric</th><th>What it measures</th><th><span className="badge ok">Good</span></th><th><span className="badge err">Poor</span></th></tr>
          </thead>
          <tbody>
            {THRESHOLDS.map((t) => (
              <tr key={t.metric}>
                <td><b>{t.metric}</b> <span className="muted small">{t.name}</span></td>
                <td>{t.measures}</td>
                <td>{t.good}</td>
                <td>{t.poor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small" style={{ marginTop: '0.5rem' }}>Anything between Good and Poor is “Needs improvement”.</p>
      </section>

      <div className="grid">
        {DEMOS.map((demo) => (
          <section key={demo.slug} className="card stack" style={{ gap: '0.5rem' }}>
            <h2>{demo.title}</h2>
            <p className="lesson">{demo.howTo}</p>
            <div className="row">
              <a className="button bad" href={`${DEMO_BASE}/${demo.slug}-bad.html`} target="_blank" rel="noreferrer">Open bad ↗</a>
              <a className="button good" href={`${DEMO_BASE}/${demo.slug}-good.html`} target="_blank" rel="noreferrer">Open good ↗</a>
            </div>
            <div>
              <h3><span className="badge err">Bad</span></h3>
              <ul>{demo.bad.map((b) => <li key={b} className="small">{b}</li>)}</ul>
              <h3><span className="badge ok">Good</span></h3>
              <ul>{demo.good.map((g) => <li key={g} className="small">{g}</li>)}</ul>
            </div>
            <p className="muted small">Source: <code>{SOURCE_DIR}/{demo.slug}-bad.html</code> vs <code>{demo.slug}-good.html</code></p>
          </section>
        ))}
      </div>
    </main>
  );
}
