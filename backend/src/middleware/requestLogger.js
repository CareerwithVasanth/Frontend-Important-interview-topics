const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

// Logs the Cookie header the browser sent and the Set-Cookie headers we sent back,
// so the full round trip is visible in the terminal as well as in DevTools.
export function requestLogger(req, res, next) {
  if (req.method === 'OPTIONS') {
    console.log(dim(`[preflight] ${req.originalUrl} origin=${req.headers.origin ?? '-'}`));
    return next();
  }

  const start = performance.now();
  res.on('finish', () => {
    const ms = (performance.now() - start).toFixed(1);
    console.log(`${cyan(req.method)} ${req.originalUrl} → ${res.statusCode} ${dim(`${ms}ms origin=${req.headers.origin ?? '-'}`)}`);
    console.log(`  ${dim('Cookie:')}     ${req.headers.cookie ?? dim('(none)')}`);
    const setCookie = res.getHeader('Set-Cookie');
    if (setCookie) {
      for (const line of [].concat(setCookie)) console.log(`  ${yellow('Set-Cookie:')} ${line}`);
    }
  });
  next();
}
