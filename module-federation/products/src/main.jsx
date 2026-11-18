import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ProductList from './ProductList.jsx';

// Standalone mode: Team Products can develop and test its component without the host running.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <main style={{ maxWidth: 640, margin: '2rem auto', font: '15px/1.5 system-ui, sans-serif' }}>
      <p style={{ color: '#6b6b78' }}>Team Products · standalone dev mode (the host loads <code>/remoteEntry.js</code> instead)</p>
      <ProductList currency="INR" onAdd={(product) => console.log('onAdd', product)} />
    </main>
  </StrictMode>,
);
