import { version as reactVersion } from 'react';

// Team Cart's exposed component. In this demo the host owns the cart state and passes it down as props.
const TEAM = { name: 'Cart', version: '1.0.0' };

const USD_RATE = 85;

const formatPrice = (inr, currency) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0 })
    .format(currency === 'USD' ? inr / USD_RATE : inr);

const s = {
  h2: { margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#c2410c', borderBottom: '3px solid #c2410c', paddingBottom: '0.25rem' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.3rem' },
  item: { display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: 6, background: 'rgba(194, 65, 12, 0.08)' },
  total: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontWeight: 600 },
  button: { font: 'inherit', fontSize: '0.85rem', background: '#c2410c', color: '#fff', border: 0, borderRadius: 4, padding: '0.3rem 0.9rem', cursor: 'pointer' },
  badge: { marginTop: '0.6rem', font: '0.72rem/1.4 ui-monospace, Menlo, monospace', color: '#c2410c' },
};

export default function CartPanel({ lines = [], currency = 'INR', onClear }) {
  const count = lines.reduce((n, line) => n + line.qty, 0);
  const total = lines.reduce((sum, line) => sum + line.qty * line.product.price, 0);

  return (
    <div>
      <h2 style={s.h2}>🛒 Cart ({count})</h2>
      <ul style={s.list}>
        {lines.length === 0 && <li style={{ ...s.item, fontStyle: 'italic', opacity: 0.7 }}>Your cart is empty</li>}
        {lines.map(({ product, qty }) => (
          <li key={product.id} style={s.item}>
            <span>{product.emoji} {product.name} × {qty}</span>
            <span>{formatPrice(qty * product.price, currency)}</span>
          </li>
        ))}
      </ul>
      <div style={s.total}>
        <span>Total: {formatPrice(total, currency)}</span>
        {lines.length > 0 && <button style={s.button} onClick={onClear}>Clear</button>}
      </div>
      <div style={s.badge}>
        Team {TEAM.name} · v{TEAM.version} · from {new URL(import.meta.url).origin} · via Module Federation · React {reactVersion}
      </div>
    </div>
  );
}
