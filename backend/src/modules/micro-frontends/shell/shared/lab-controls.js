// Lab-only panel (not part of the shop): navigation between demos, outage switches for each team server,
// and a log of what the shell sees. It lives in Shadow DOM so the CSS-leak demo can't restyle it.
const DEMOS = [
  { label: 'Iframes', href: 'http://localhost:4000/micro-frontends/iframes.html' },
  { label: 'Web Components', href: 'http://localhost:4000/micro-frontends/web-components.html' },
  { label: 'Import maps', href: 'http://localhost:4000/micro-frontends/import-maps.html' },
  { label: 'Module Federation', href: 'http://localhost:5180/' },
];

const TEAMS = [
  { name: 'products', origin: 'http://localhost:4001' },
  { name: 'cart', origin: 'http://localhost:4002' },
];

const css = `
  :host { display: block; font: 14px/1.5 system-ui, sans-serif; color: #1d1d24; }
  section { background: #fff; border: 1px solid #e3e3ea; border-radius: 10px; padding: 0.75rem 1rem; display: grid; gap: 0.6rem; }
  h3 { margin: 0; font-size: 0.95rem; }
  small, .muted { color: #6b6b78; font-weight: 400; }
  nav { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  a { color: #6d28d9; }
  a[aria-current] { font-weight: 700; text-decoration: none; color: #1d1d24; }
  .teams { display: grid; gap: 0.35rem; }
  .team { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  code { font: 0.8rem ui-monospace, Menlo, monospace; background: #f2f2f6; padding: 0.05rem 0.3rem; border-radius: 4px; }
  .status { font-size: 0.75rem; font-weight: 600; padding: 0.05rem 0.45rem; border-radius: 999px; background: #f2f2f6; }
  .status.up { background: #e9f8ee; color: #15803d; }
  .status.down { background: #fdeeee; color: #b91c1c; }
  button { font: inherit; font-size: 0.8rem; padding: 0.2rem 0.6rem; border-radius: 6px; border: 1px solid #6d28d9; background: transparent; color: #6d28d9; cursor: pointer; }
  ol { margin: 0; padding-left: 1.4rem; max-height: 180px; overflow: auto; font: 0.78rem/1.5 ui-monospace, Menlo, monospace; }
`;

class LabControls extends HTMLElement {
  #log;

  connectedCallback() {
    if (this.#log) return;
    const here = location.href.split(/[?#]/)[0];
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${css}</style>
      <section>
        <h3>Lab controls <small>(not part of the shop)</small></h3>
        <nav>
          ${DEMOS.map((d) => `<a href="${d.href}" ${d.href === here ? 'aria-current="page"' : ''}>${d.label}</a>`).join('')}
          <a href="http://localhost:5173/micro-frontends">← Lab overview</a>
        </nav>
        <div class="teams">
          ${TEAMS.map((t) => `
            <div class="team" data-team="${t.name}">
              <b>team-${t.name}</b> <code>${t.origin}</code>
              <span class="status">checking…</span>
              <button hidden></button>
            </div>`).join('')}
        </div>
        <p class="muted" style="margin:0;font-size:0.8rem">An outage makes that team's server answer <code>503</code> for every file. The shell and the other team keep working.</p>
        <h3>Shell event log</h3>
        <ol></ol>
      </section>`;
    this.#log = shadow.querySelector('ol');
    for (const team of TEAMS) this.#initTeam(shadow.querySelector(`[data-team="${team.name}"]`), team);
  }

  async #initTeam(row, { origin }) {
    const status = row.querySelector('.status');
    const button = row.querySelector('button');
    try {
      const { outage } = await (await fetch(`${origin}/__ops/status`)).json();
      status.textContent = outage ? 'outage' : 'up';
      status.className = `status ${outage ? 'down' : 'up'}`;
      button.textContent = outage ? 'Restore & reload' : 'Simulate outage & reload';
      button.hidden = false;
      button.onclick = async () => {
        await fetch(`${origin}/__ops/outage?on=${outage ? 0 : 1}`, { method: 'POST' });
        location.reload();
      };
    } catch {
      status.textContent = 'unreachable (is the backend running?)';
      status.className = 'status down';
    }
  }

  log(message) {
    const item = document.createElement('li');
    item.textContent = `${new Date().toLocaleTimeString()}  ${message}`;
    this.#log?.prepend(item);
  }
}

if (!customElements.get('lab-controls')) customElements.define('lab-controls', LabControls);
