import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const remote = (name, port) => ({
  type: 'module',
  name,
  entry: `http://localhost:${port}/remoteEntry.js`,
  entryGlobalName: name,
  shareScope: 'default',
});

export default defineConfig({
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
  plugins: [
    federation({
      name: 'shell',
      // Where to find each team at runtime. Only these URLs change when a team deploys; the host isn't rebuilt.
      remotes: {
        products: remote('products', 5181),
        cart: remote('cart', 5182),
      },
      filename: 'remoteEntry.js',
      shared: {
        react: { singleton: true, requiredVersion: pkg.dependencies.react },
        'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
      },
      dts: false,
    }),
    react(),
  ],
});
