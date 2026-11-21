import { MicroFrontendsLab } from './micro-frontends/MicroFrontendsLab.jsx';
import { StorageLab } from './storage/StorageLab.jsx';
import { WebVitalsLab } from './web-vitals/WebVitalsLab.jsx';

// Register new labs here (performance, caching, CORS, ...). Each gets a route and a home-page card.
// A lab owns every URL under /<slug>/, so it can have its own sub-pages (see StorageLab).
export const labs = [
  {
    slug: 'storage',
    title: 'Storage',
    description: 'Cookies, IndexedDB and Cache Storage: what each is for, with hands-on demos (login sessions, an offline social feed, a cached photo gallery).',
    Component: StorageLab,
  },
  {
    slug: 'web-vitals',
    title: 'Web Vitals',
    description: 'Good vs bad LCP, CLS and INP. Side-by-side pages served by Node, measured live in Chrome DevTools.',
    Component: WebVitalsLab,
  },
  {
    slug: 'micro-frontends',
    title: 'Micro Frontends',
    description: 'One shop, three teams, four compositions: iframes, Web Components, import maps and Module Federation.',
    Component: MicroFrontendsLab,
  },
];
