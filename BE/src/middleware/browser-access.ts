import cors from 'cors';
import type { RequestHandler } from 'express';
import { browserConfig } from '../config/session.js';
import { HttpError } from '../errors/http-error.js';

export const browserAccess: RequestHandler = (req, res, next) => {
  const config = browserConfig();
  const origin = req.get('origin');
  // Reject untrusted browser origins before any cookie-creating side effects.
  if (origin && origin !== config.frontendOrigin && origin !== config.apiOrigin) {
    next(new HttpError(403, 'Origin not allowed'));
    return;
  }
  cors({ origin: config.frontendOrigin, credentials: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] })(req, res, next);
};
