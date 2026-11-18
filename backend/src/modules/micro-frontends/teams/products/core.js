// Team Products' feature code. The same core is shipped through three different integration contracts:
// iframe.html (a page), element.js (a Custom Element) and esm.js (an ES module with mount()).
export const TEAM = { name: 'Products', version: '1.0.0' };

const USD_RATE = 85; // demo rate, 1 USD = 85 INR

export const PRODUCTS = [
  { id: 'js', emoji: '📘', name: 'JavaScript Deep Dive', price: 2999 },
  { id: 'react', emoji: '⚛️', name: 'React Patterns', price: 3499 },
  { id: 'web', emoji: '🌐', name: 'Web Fundamentals', price: 1999 },
  { id: 'sd', emoji: '🧠', name: 'Frontend System Design', price: 4999 },
];

export function formatPrice(inr, currency = 'INR') {
  const amount = currency === 'USD' ? inr / USD_RATE : inr;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0 }).format(amount);
}

// Deliberately written with bare tag selectors (h2, button), like a lot of real-world CSS.
// Inside an iframe or Shadow DOM they stay contained; in the light DOM they leak into the whole page.
export const styles = `
  h2 { margin: 0 0 0.5rem; font-size: 1.05rem; color: #0e7490; border-bottom: 3px dashed #0e7490; padding-bottom: 0.25rem; }
  button { font: inherit; font-size: 0.85rem; background: #0e7490; color: #fff; border: 0; border-radius: 999px; padding: 0.3rem 0.9rem; cursor: pointer; }
  button:hover { filter: brightness(1.15); }
  .products { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
  .products li { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; border-radius: 8px; background: rgba(14, 116, 144, 0.08); }
  .products .name { flex: 1; }
  .products .price { font-variant-numeric: tabular-nums; font-weight: 600; }
  .mfe-badge { margin-top: 0.6rem; font: 0.72rem/1.4 ui-monospace, Menlo, monospace; color: #0e7490; opacity: 0.85; }
`;

export function createProductList(root, { currency = 'INR', via, onAdd }) {
  const origin = new URL(import.meta.url).origin;

  function render() {
    root.innerHTML = `
      <h2>Products</h2>
      <ul class="products">
        ${PRODUCTS.map((p) => `
          <li>
            <span>${p.emoji}</span>
            <span class="name">${p.name}</span>
            <span class="price">${formatPrice(p.price, currency)}</span>
            <button data-id="${p.id}">Add to cart</button>
          </li>`).join('')}
      </ul>
      <div class="mfe-badge">Team ${TEAM.name} · v${TEAM.version} · from ${origin} · via ${via}</div>`;
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    onAdd(PRODUCTS.find((p) => p.id === button.dataset.id));
  });

  render();
  return {
    setCurrency(next) {
      currency = next;
      render();
    },
  };
}
