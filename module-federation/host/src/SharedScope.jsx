import { useEffect, useState } from 'react';

const PACKAGES = ['react', 'react-dom'];

// Reads the federation runtime's global state to show share negotiation: every app OFFERS its own React,
// but the share scope picks one provider for the singleton, and the other copies are never downloaded.
function inspect() {
  const federation = globalThis.__FEDERATION__;
  if (!federation) return [];
  return federation.__INSTANCES__.map((instance) => ({
    app: instance.name,
    packages: PACKAGES.map((pkg) => {
      const offered = [].concat(instance.options.shared?.[pkg] ?? [])[0];
      const inScope = Object.entries(instance.shareScopeMap?.default?.[pkg] ?? {});
      const used = inScope.find(([, share]) => share.loaded) ?? inScope[0];
      return {
        pkg,
        offered: offered?.version,
        requiredVersion: offered?.shareConfig?.requiredVersion,
        usedVersion: used?.[0],
        usedFrom: used?.[1].from,
      };
    }),
  }));
}

export function SharedScope() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    // Remotes register with the runtime only after their remoteEntry.js loads, so poll briefly.
    let tries = 0;
    const id = setInterval(() => {
      const next = inspect();
      setRows(next);
      if (next.length >= 3 || ++tries > 10) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="shell-card">
      <h3>Shared dependencies <small className="muted">(read from <code>globalThis.__FEDERATION__</code>)</small></h3>
      <table>
        <thead>
          <tr><th>App</th><th>Package</th><th>Offers</th><th>Requires</th><th>Actually uses</th></tr>
        </thead>
        <tbody>
          {rows.flatMap(({ app, packages }) =>
            packages.map((p) => (
              <tr key={`${app}-${p.pkg}`}>
                <td><b>{app}</b></td>
                <td><code>{p.pkg}</code></td>
                <td>{p.offered ?? '–'}</td>
                <td>{p.requiredVersion ?? '–'}</td>
                <td>{p.usedVersion ? <>{p.usedVersion} from <b>{p.usedFrom}</b></> : '–'}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      <p className="muted small">
        Every app bundles a fallback copy of React, but when <b>Actually uses</b> points at another app, that copy is never
        downloaded. Check the Network tab: there are no React chunks from :5181 or :5182.
      </p>
    </section>
  );
}
