import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { labOps } from '../lab-ops-plugin.mjs';
import pkg from './package.json' with { type: 'json' };

const PORT = 5182;

export default defineConfig({
  server: { port: PORT, strictPort: true, origin: `http://localhost:${PORT}` },
  preview: { port: PORT, strictPort: true },
  plugins: [
    labOps('cart'),
    federation({
      name: 'cart',
      filename: 'remoteEntry.js',
      exposes: { './CartPanel': './src/CartPanel.jsx' },
      shared: {
        react: { singleton: true, requiredVersion: pkg.dependencies.react },
        'react/': {},
        'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
      },
      dts: false,
    }),
    react(),
  ],
});
