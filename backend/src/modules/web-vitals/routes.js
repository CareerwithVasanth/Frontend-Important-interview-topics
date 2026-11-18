import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import express, { Router } from 'express';

const PAGES_DIR = path.join(import.meta.dirname, 'pages');
const MAX_DELAY_MS = 10_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ?delay=1500 → wait 1.5s before responding. Simulates a slow network / heavy asset.
function delayFrom(req) {
  const ms = Number(req.query.delay ?? 0);
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), MAX_DELAY_MS) : 0;
}

// A small gradient PNG with noise. It must carry real image data: Chrome ignores
// "low-entropy" images (e.g. a tiny SVG stretched full width) as LCP candidates.
function createHeroPng(width = 320, height = 160) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const noise = () => (Math.random() - 0.5) * 30;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    raw[i++] = 0; // PNG filter type: none
    for (let x = 0; x < width; x++) {
      const t = (x / width + y / height) / 2;
      raw[i++] = clamp(109 + (251 - 109) * t + noise());
      raw[i++] = clamp(40 + (146 - 40) * t + noise());
      raw[i++] = clamp(217 + (60 - 217) * t + noise());
    }
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const heroPng = createHeroPng();

export const webVitalsRouter = Router();

// No caching anywhere, so every reload is a cold load and the numbers are reproducible.
webVitalsRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

webVitalsRouter.get('/assets/hero.png', async (req, res) => {
  await sleep(delayFrom(req));
  res.type('png').send(heroPng);
});

// A "third-party" stylesheet. Its rules are harmless; what matters is how the page loads it.
webVitalsRouter.get('/assets/slow.css', async (req, res) => {
  await sleep(delayFrom(req));
  res.type('css').send('.footer-note { font-style: italic; }\n');
});

// Data the bad LCP page fetches before it knows which hero image to show (client-side rendering).
webVitalsRouter.get('/api/hero', async (req, res) => {
  await sleep(delayFrom(req));
  res.json({ src: 'assets/hero.png?delay=1200', alt: 'Hero banner' });
});

// A late-arriving promo banner (think ads, cookie notices, "download our app").
webVitalsRouter.get('/api/banner', async (req, res) => {
  await sleep(delayFrom(req));
  res.json({ text: '🎉 Festive sale: 50% off all courses. Ends tonight!' });
});

webVitalsRouter.use(
  express.static(PAGES_DIR, { cacheControl: false, etag: false, lastModified: false }),
);
