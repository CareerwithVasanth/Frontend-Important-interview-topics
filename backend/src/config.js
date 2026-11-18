export const config = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigins: (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  cookieSecret: process.env.COOKIE_SECRET ?? 'dev-only-cookie-secret',
};
