import { randomUUID } from 'node:crypto';
import { API_ERROR_MESSAGES } from '../constants/messages.js';
import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../errors/http-error.js';
import { requestErrorDetails } from '../errors/request-error-log.js';
import { env } from '../config/env.js';

// Express forwards thrown/rejected route errors here. Log diagnostics once,
// then keep the existing safe API response format.
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  let status = 500;
  let message: string = API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
  } else if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      status = 400; message = API_ERROR_MESSAGES.INVALID_JSON;
    } else if (error.type === 'entity.too.large') {
      status = 413; message = API_ERROR_MESSAGES.BODY_TOO_LARGE;
    }
  }
  const requestId = randomUUID();
  const details = requestErrorDetails(error, req, status, requestId, message, env.nodeEnv === 'development');
  if (status >= 500) console.error(JSON.stringify(details));
  else console.warn(JSON.stringify(details));

  if (res.headersSent) {
    // Do not hand the original sensitive error to Express's default logger.
    next(new Error(API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR));
    return;
  }
  res.set('X-Request-ID', requestId);
  res.status(status).json({ message });
};
