import { buildApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './core/logger/index.js';
import { pool, db } from './database/client.js';

async function startServer() {
  const app = await buildApp();

  // Test Database Connection
  try {
    const client = await pool.connect();
    client.release();
    logger.info('Connected to PostgreSQL successfully.');
  } catch (err) {
    logger.warn({ err }, 'Could not connect to PostgreSQL on startup (check database credentials/service)');
  }

  // Graceful Shutdown
  const signals = ['SIGINT', 'SIGTERM'] as const;
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      try {
        await app.close();
        await db.destroy();
        await pool.end();
        logger.info('Server and database connections closed cleanly.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
      }
    });
  }

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info(`🚀 RestockOps AI Server running on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
