// Team Cart's feature code, shipped through the same three contracts as Team Products.
export const TEAM = { name: 'Cart', version: '1.0.0' };

const USD_RATE = 85;

function formatPrice(inr, currency = 'INR') {
  const amount = currency === 'USD' ? inr / USD_RATE : inr;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0 }).format(amount);
}

// Same bare-selector problem as Team Products, with different colours. In the light DOM the two teams fight.
export const styles = `
  h2 { margin: 0 0 0.5rem; font-size: 1.05rem; color: #c2410c; border-bottom: 3px solid #c2410c; padding-bottom: 0.25rem; }
  button { font: inherit; font-size: 0.85rem; background: #c2410c; color: #fff; border: 0; border-radius: 4px; padding: 0.3rem 0.9rem; cursor: pointer; }
  button:hover { filter: brightness(1.15); }
  .cart { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
  .cart li { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.3rem 0.5rem; border-radius: 6px; background: rgba(194, 65, 12, 0.08); }
  .cart .empty { opacity: 0.7; font-style: italic; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-weight: 600; }
  .mfe-badge { margin-top: 0.6rem; font: 0.72rem/1.4 ui-monospace, Menlo, monospace; color: #c2410c; opacity: 0.85; }
`;

// The cart owns its own state. Other teams can only ask it to add items (through whatever contract is used).
export function createCartStore() {
  const lines = new Map();
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn(store));

  const store = {
    get lines() { return [...lines.values()]; },
    get count() { return store.lines.reduce((n, line) => n + line.qty, 0); },
    get total() { return store.lines.reduce((sum, line) => sum + line.qty * line.product.price, 0); },
    add(product) {
      const line = lines.get(product.id) ?? { product, qty: 0 };
      line.qty += 1;
      lines.set(product.id, line);
      notify();
    },
    clear() {
      lines.clear();
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  return store;
}

export function createCartView(root, { store, currency = 'INR', via }) {
  const origin = new URL(import.meta.url).origin;

  function render() {
    root.innerHTML = `
      <h2>🛒 Cart (${store.count})</h2>
      <ul class="cart">
        ${store.lines.length === 0
          ? '<li class="empty">Your cart is empty</li>'
          : store.lines.map(({ product, qty }) => `
            <li><span>${product.emoji} ${product.name} × ${qty}</span><span>${formatPrice(qty * product.price, currency)}</span></li>`).join('')}
      </ul>
      <div class="total">
        <span>Total: ${formatPrice(store.total, currency)}</span>
        ${store.lines.length ? '<button data-action="clear">Clear</button>' : ''}
      </div>
      <div class="mfe-badge">Team ${TEAM.name} · v${TEAM.version} · from ${origin} · via ${via}</div>`;
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="clear"]')) store.clear();
  });

  store.subscribe(render);
  render();
  return {
    setCurrency(next) {
      currency = next;
      render();
    },
  };
}
