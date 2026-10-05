process.env.TZ = 'Asia/Kolkata';

import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { initCronScheduler, stopCronScheduler } from './services/cron.service.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`AxomSetu Backend API running on port ${PORT} in ${env.NODE_ENV} mode`);
  // Initialize in-app background backup scheduler
  initCronScheduler();
});

// Anti-DDoS / Slowloris Defenses & HTTP Connection Hardening
// 1. headersTimeout: Time allowed for client to transmit entire HTTP headers (20s)
server.headersTimeout = 20000;
// 2. requestTimeout: Time allowed for client to transmit entire request body (30s)
server.requestTimeout = 30000;
// 3. keepAliveTimeout: Max idle time between requests on keep-alive socket (65s)
server.keepAliveTimeout = 65000;
// 4. maxHeadersCount: Limit HTTP header lines to prevent header flood attacks
server.maxHeadersCount = 100;

const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Initiating graceful shutdown...`);
  stopCronScheduler();
  
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await prisma.$disconnect();
        console.log('Prisma client disconnected cleanly.');
        process.exit(0);
      } catch (err) {
        console.error('Error during Prisma disconnect:', err);
        process.exit(1);
      }
    });

    // Force exit after 10 seconds if connections are stuck
    setTimeout(() => {
      console.error('Could not close connections in time, forcing shutdown.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

const unexpectedErrorHandler = async (error) => {
  console.error('Unhandled Exception or Rejection:', error);
  if (server) {
    server.close(async () => {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore error during forced exit
      }
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

