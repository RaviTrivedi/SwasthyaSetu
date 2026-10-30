import { API_ERROR_MESSAGES } from './constants/messages.js';
import express from 'express';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { browserAccess } from './middleware/browser-access.js';

// REQUEST FLOW:
// browserAccess -> /api/v1 router -> matching route middleware -> controller
// -> service -> repository/database -> controller sends the response.
// No route matched? The 404 handler responds.
// next(error), a thrown error, or a rejected async handler? Express skips normal
// handlers and forwards the error to errorHandler at the bottom.
export const app = express();

// app.disable(name) sets an Express application setting to false.
// Disabling 'x-powered-by' removes the default X-Powered-By: Express header.
// Docs: https://expressjs.com/en/5x/api/application/#app.disable
app.disable('x-powered-by');
// First stop for every request, including browser OPTIONS preflight requests.
app.use(browserAccess);

// app.use(path, middleware) mounts middleware (including routers) at a path.
// Requests under /api/v1 enter apiRouter; its /health route becomes /api/v1/health.
// Express strips the mount prefix while matching routes inside that router.
// Docs: https://expressjs.com/en/5x/api/application/#app.use
app.use('/api/v1', apiRouter);

// Without a path, app.use matches all paths and HTTP methods.
// Middleware runs in registration order, so this fallback belongs after routes.
// It responds when earlier middleware passes control without handling the request.
// _req is the request object; the underscore marks it as unused here.
// res is the response object used to send a reply to the client.
app.use((_req, res) => {
  // res.status(404) sets the HTTP status and returns res for method chaining.
  // res.json(...) serializes the object as JSON, sets the JSON content type,
  // and sends the response. No next() call is needed because this ends the reply.
  // Docs: https://expressjs.com/en/5x/api/response/#res.status
  // Docs: https://expressjs.com/en/5x/api/response/#res.json
  res.status(404).json({ message: API_ERROR_MESSAGES.NOT_FOUND });
});

// Register last so it can handle errors forwarded from all earlier handlers.
app.use(errorHandler);
