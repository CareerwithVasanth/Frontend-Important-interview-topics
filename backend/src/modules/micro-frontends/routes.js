import path from 'node:path';
import express, { Router } from 'express';

// The shell (container app) owned by the "platform team". It's served from the main backend (:4000),
// while each micro frontend comes from its own team server (see teams.js).
export const microFrontendsRouter = Router();

microFrontendsRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

microFrontendsRouter.use(
  express.static(path.join(import.meta.dirname, 'shell'), { etag: false, lastModified: false }),
);
