import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CartPanel from './CartPanel.jsx';

const SAMPLE_LINES = [
  { product: { id: 'js', emoji: '📘', name: 'JavaScript Deep Dive', price: 2999 }, qty: 2 },
  { product: { id: 'web', emoji: '🌐', name: 'Web Fundamentals', price: 1999 }, qty: 1 },
];

// Standalone mode: Team Cart develops against sample data, without the host or Team Products.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <main style={{ maxWidth: 480, margin: '2rem auto', font: '15px/1.5 system-ui, sans-serif' }}>
      <p style={{ color: '#6b6b78' }}>Team Cart · standalone dev mode (the host loads <code>/remoteEntry.js</code> instead)</p>
      <CartPanel lines={SAMPLE_LINES} currency="INR" onClear={() => console.log('onClear')} />
    </main>
  </StrictMode>,
);
