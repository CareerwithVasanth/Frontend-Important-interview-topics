import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { labOps } from '../lab-ops-plugin.mjs';
import pkg from './package.json' with { type: 'json' };

const PORT = 5181;

export default defineConfig({
  // origin: absolute URLs for this remote's assets, so they load from :5181 even inside the host page.
  server: { port: PORT, strictPort: true, origin: `http://localhost:${PORT}` },
  preview: { port: PORT, strictPort: true },
  plugins: [
    labOps('products'),
    federation({
      name: 'products',
      filename: 'remoteEntry.js',
      // What this team publishes. The host imports it as 'products/ProductList'.
      exposes: { './ProductList': './src/ProductList.jsx' },
      // Negotiated at runtime: if the host already provides a compatible React, use that one.
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
