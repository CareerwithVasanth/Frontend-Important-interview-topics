import { useEffect, useState } from 'react';

// Lab-only panel (not part of the shop), same idea as the backend demos' <lab-controls>.
const DEMOS = [
  { label: 'Iframes', href: 'http://localhost:4000/micro-frontends/iframes.html' },
  { label: 'Web Components', href: 'http://localhost:4000/micro-frontends/web-components.html' },
  { label: 'Import maps', href: 'http://localhost:4000/micro-frontends/import-maps.html' },
  { label: 'Module Federation', href: 'http://localhost:5180/', current: true },
];

const TEAMS = [
  { name: 'products', origin: 'http://localhost:5181' },
  { name: 'cart', origin: 'http://localhost:5182' },
];

function TeamRow({ name, origin }) {
  const [outage, setOutage] = useState(undefined);

  useEffect(() => {
    fetch(`${origin}/__ops/status`)
      .then((res) => res.json())
      .then((data) => setOutage(data.outage))
      .catch(() => setOutage(null));
  }, [origin]);

  async function toggle() {
    await fetch(`${origin}/__ops/outage?on=${outage ? 0 : 1}`, { method: 'POST' });
    location.reload();
  }

  return (
    <div className="lab-team">
      <b>team-{name}</b> <code>{origin}</code>{' '}
      {outage === undefined && <span className="lab-status">checking…</span>}
      {outage === null && <span className="lab-status down">unreachable (is its dev server running?)</span>}
      {typeof outage === 'boolean' && (
        <>
          <span className={`lab-status ${outage ? 'down' : 'up'}`}>{outage ? 'outage' : 'up'}</span>
          <button className="lab-button" onClick={toggle}>{outage ? 'Restore & reload' : 'Simulate outage & reload'}</button>
        </>
      )}
      <a href={origin} target="_blank" rel="noreferrer" className="small">standalone ↗</a>
    </div>
  );
}

export function LabControls({ events }) {
  return (
    <section className="lab-controls">
      <h3>Lab controls <small className="muted">(not part of the shop)</small></h3>
      <nav>
        {DEMOS.map((d) => (
          <a key={d.href} href={d.href} aria-current={d.current ? 'page' : undefined}>{d.label}</a>
        ))}
        <a href="http://localhost:5173/micro-frontends">← Lab overview</a>
      </nav>
      {TEAMS.map((team) => <TeamRow key={team.name} {...team} />)}
      <p className="muted small">
        An outage makes that team's Vite server answer <code>503</code> for everything, including <code>remoteEntry.js</code>.
      </p>
      <h3>Shell event log</h3>
      <ol>{events.map((e) => <li key={e.id}>{e.text}</li>)}</ol>
    </section>
  );
}
