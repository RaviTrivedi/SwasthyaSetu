import { env, passwordResetDeliveryConfig } from './config/env.js';
import { app } from './app.js';
import { sessionConfig } from './config/session.js';

// Fail before listening if signing secrets or deployment settings are invalid.
sessionConfig();
passwordResetDeliveryConfig();

const server = app.listen(env.port, () => {
  console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
});

server.on('error', (error) => {
  console.error('Failed to start API:', error.message);
  process.exit(1);
});
