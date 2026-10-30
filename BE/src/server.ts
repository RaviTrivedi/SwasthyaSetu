import { INTERNAL_ERROR_MESSAGES } from "./constants/messages.js";
import { env } from "./config/env.js";
import { passwordResetDeliveryConfig } from "./config/password-reset-delivery.js";
import { app } from "./app.js";
import { sessionConfig } from "./config/session.js";

// STARTUP: Node evaluates the imported modules first. env.ts loads configuration;
// app.ts creates Express and registers middleware/routes, but does not listen yet.
// Validate required settings before opening the HTTP port. A thrown error stops startup.
sessionConfig();
passwordResetDeliveryConfig();

// Start accepting requests. Express passes each request through app.ts in order.
// This callback runs after the server starts listening, not for every request.
const server = app.listen(env.port, () => {
  console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
});

// Handle server-level failures such as an occupied port. Request errors instead
// go to middleware/error-handler.ts.
server.on("error", (error) => {
  console.error(INTERNAL_ERROR_MESSAGES.API_START_FAILED, error.message);
  process.exit(1);
});
