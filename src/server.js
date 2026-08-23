import 'dotenv/config';

import app from './app.js';
import config from './config/index.js';
import { logger } from './shared/index.js';
import { connectDatabases, disconnectDatabases } from './config/databases.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

const PORT = config.port || 3000;

async function startServer() {
  try {
    logger.startup('Starting ErrorLens Server...');
    await connectDatabases();
    await connectRedis();

    const server = app.listen(PORT, () => {
      logger.success(`Server running on port ${PORT}`);
      logger.info(`📖 API Documentation: http://localhost:${PORT}/v1`);
      logger.info(`🔍 Health Check: http://localhost:${PORT}/v1/health`);
      logger.info(`🌍 Environment: ${config.env}`);
    });

    app.set('server', server);

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });

    const gracefulShutdown = async (signal) => {
      logger.warn(`🛑 Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        logger.success('HTTP server closed');

        try {
          await disconnectDatabases();
          await disconnectRedis();
          logger.success('Database connections closed');
        } catch (error) {
          logger.error(`Error during database disconnect: ${error.message}`);
        }

        logger.success('Process terminated gracefully');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error(
          '⚠️ Could not close connections in time, forcefully shutting down'
        );
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
