import { useState, version as reactVersion } from 'react';

// Team Products' exposed component. It's a normal React component: the host renders it in its own tree,
// so props and callbacks just work. useState only works because host and remote share ONE React.
const TEAM = { name: 'Products', version: '1.0.0' };

const USD_RATE = 85;

const PRODUCTS = [
  { id: 'js', emoji: '📘', name: 'JavaScript Deep Dive', price: 2999 },
  { id: 'react', emoji: '⚛️', name: 'React Patterns', price: 3499 },
  { id: 'web', emoji: '🌐', name: 'Web Fundamentals', price: 1999 },
  { id: 'sd', emoji: '🧠', name: 'Frontend System Design', price: 4999 },
];

const formatPrice = (inr, currency) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0 })
    .format(currency === 'USD' ? inr / USD_RATE : inr);

// Inline styles: with no Shadow DOM, scoping CSS is each team's job (CSS Modules, prefixes, inline, ...).
const s = {
  h2: { margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#0e7490', borderBottom: '3px dashed #0e7490', paddingBottom: '0.25rem' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' },
  item: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 8, background: 'rgba(14, 116, 144, 0.08)' },
  button: { font: 'inherit', fontSize: '0.85rem', background: '#0e7490', color: '#fff', border: 0, borderRadius: 999, padding: '0.3rem 0.9rem', cursor: 'pointer', minWidth: 110 },
  badge: { marginTop: '0.6rem', font: '0.72rem/1.4 ui-monospace, Menlo, monospace', color: '#0e7490' },
};

export default function ProductList({ currency = 'INR', onAdd }) {
  const [justAdded, setJustAdded] = useState(null);

  function add(product) {
    onAdd?.(product);
    setJustAdded(product.id);
    setTimeout(() => setJustAdded((id) => (id === product.id ? null : id)), 800);
  }

  return (
    <div>
      <h2 style={s.h2}>Products</h2>
      <ul style={s.list}>
        {PRODUCTS.map((p) => (
          <li key={p.id} style={s.item}>
            <span>{p.emoji}</span>
            <span style={{ flex: 1 }}>{p.name}</span>
            <b>{formatPrice(p.price, currency)}</b>
            <button style={s.button} onClick={() => add(p)}>{justAdded === p.id ? 'Added ✓' : 'Add to cart'}</button>
          </li>
        ))}
      </ul>
      <div style={s.badge}>
        Team {TEAM.name} · v{TEAM.version} · from {new URL(import.meta.url).origin} · via Module Federation · React {reactVersion}
      </div>
    </div>
  );
}
