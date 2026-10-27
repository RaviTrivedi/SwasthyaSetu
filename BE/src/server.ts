import { env } from './config/env.js';
import { app } from './app.js';

const server = app.listen(env.port, () => {
  console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
});

server.on('error', (error) => {
  console.error('Failed to start API:', error.message);
  process.exit(1);
});
