import { CookiesLab } from './cookies/CookiesLab.jsx';
import { MicroFrontendsLab } from './micro-frontends/MicroFrontendsLab.jsx';
import { WebVitalsLab } from './web-vitals/WebVitalsLab.jsx';

// Register new labs here (performance, caching, CORS, ...). Each gets a route and a home-page card.
export const labs = [
  {
    slug: 'cookies',
    title: 'Cookies',
    description: 'Set-Cookie, HttpOnly, Secure, SameSite, Path, Max-Age, sessions, signed cookies, and CORS credentials.',
    Component: CookiesLab,
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
