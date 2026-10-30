import { API_ERROR_MESSAGES } from '../constants/messages.js';
import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../errors/http-error.js';

// Express recognizes the four arguments as an error handler. Execution arrives
// here via next(error) or an error thrown/rejected by an earlier Express handler.
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    // A response already started: let Express finish handling the connection
    // instead of attempting to send a second JSON response.
    next(error);
    return;
  }
  // Expected application errors carry a deliberately safe message/status.
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  // Body-parser errors may contain the raw body; never log or serialize them.
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ message: API_ERROR_MESSAGES.INVALID_JSON });
      return;
    }
    if (error.type === 'entity.too.large') {
      res.status(413).json({ message: API_ERROR_MESSAGES.BODY_TOO_LARGE });
      return;
    }
  }
  // Unexpected failures end here; never send their stack or database details.
  res.status(500).json({ message: API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
};
