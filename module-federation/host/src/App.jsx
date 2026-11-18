import { lazy, Suspense, useCallback, useState } from 'react';
import { LabControls } from './LabControls.jsx';
import { RemoteBoundary } from './RemoteBoundary.jsx';
import { SharedScope } from './SharedScope.jsx';

// 'products/ProductList' isn't in node_modules: the federation plugin resolves it at RUNTIME by fetching
// http://localhost:5181/remoteEntry.js. The remote can redeploy without rebuilding this host.
const ProductList = lazy(() => import('products/ProductList'));
const CartPanel = lazy(() => import('cart/CartPanel'));

let nextEventId = 1;

export default function App() {
  const [currency, setCurrency] = useState('INR');
  const [lines, setLines] = useState([]);
  const [events, setEvents] = useState([]);

  const log = useCallback((text) => {
    const entry = { id: nextEventId++, text: `${new Date().toLocaleTimeString()}  ${text}` };
    setEvents((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  // The shell owns the cart state; both remotes are plain React children receiving props and callbacks.
  function addToCart(product) {
    log(`<ProductList onAdd> → ${product.name}; shell updates state, <CartPanel> re-renders`);
    setLines((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (!existing) return [...prev, { product, qty: 1 }];
      return prev.map((line) => (line === existing ? { ...line, qty: line.qty + 1 } : line));
    });
  }

  function clearCart() {
    log('<CartPanel onClear> → shell clears state');
    setLines([]);
  }

  const count = lines.reduce((n, line) => n + line.qty, 0);

  return (
    <>
      <header className="shell-header">
        <span className="brand">🛍️ MiniShop</span>
        <span className="owner">shell · host app · :5180</span>
        <span className="spacer" />
        <label>
          Currency{' '}
          <select value={currency} onChange={(e) => { setCurrency(e.target.value); log(`shell → remotes: currency="${e.target.value}" prop`); }}>
            <option>INR</option>
            <option>USD</option>
          </select>
        </label>
        <span className="shell-cart-pill">🛒 {count}</span>
      </header>

      <main className="shell-main">
        <section className="shell-lesson">
          <h2>4 · Module Federation</h2>
          <p>
            Each team is a separate Vite app with its own package, dev server and build. A remote <b>exposes</b> modules
            through a <code>remoteEntry.js</code>. The host lists <b>remotes</b> by URL and imports them like normal packages:{' '}
            <code>import(&apos;products/ProductList&apos;)</code>. Loading happens at runtime, so a team deploys without the host rebuilding.
          </p>
          <ul>
            <li><b>Communication:</b> it's all one React tree, so the shell passes <code>currency</code>, <code>lines</code>, <code>onAdd</code> and <code>onClear</code> as props. This is the easiest option, but it couples the teams to the shell's data shapes.</li>
            <li><b>Shared dependencies:</b> <code>react</code> and <code>react-dom</code> are <code>singleton</code> shares, so all three apps negotiate and use one copy. Without that, the remote's hooks would hit a second React and throw "Invalid hook call".</li>
            <li><b>CSS:</b> no isolation, the same as import maps. Each team scopes its own styles (inline here, often CSS Modules).</li>
            <li><b>Failure:</b> <code>React.lazy</code> + <code>&lt;Suspense&gt;</code> + an error boundary for each slot. Simulate an outage below and reload.</li>
            <li><b>Network tab:</b> look for <code>remoteEntry.js</code> from :5181 and :5182, and notice that React is downloaded only once.</li>
          </ul>
        </section>

        <div className="shell-slots">
          <div className="shell-slot" data-label="slot: import('products/ProductList') · remoteEntry from :5181">
            <RemoteBoundary team="products" onError={log}>
              <Suspense fallback={<p className="shell-loading">Loading products…</p>}>
                <ProductList currency={currency} onAdd={addToCart} />
              </Suspense>
            </RemoteBoundary>
          </div>
          <div className="shell-slot" data-label="slot: import('cart/CartPanel') · remoteEntry from :5182">
            <RemoteBoundary team="cart" onError={log}>
              <Suspense fallback={<p className="shell-loading">Loading cart…</p>}>
                <CartPanel lines={lines} currency={currency} onClear={clearCart} />
              </Suspense>
            </RemoteBoundary>
          </div>
        </div>

        <SharedScope />
        <LabControls events={events} />
      </main>
    </>
  );
}
