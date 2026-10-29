import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../errors/http-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  // Body-parser errors may contain the raw body; never log or serialize them.
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ message: 'Invalid JSON body' });
      return;
    }
    if (error.type === 'entity.too.large') {
      res.status(413).json({ message: 'Request body too large' });
      return;
    }
  }
  res.status(500).json({ message: 'Internal server error' });
};
