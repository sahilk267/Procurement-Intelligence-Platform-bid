import app from "./app";
import { logger } from "./lib/logger";
import { config } from "./config";
import { initializeIngestionScheduler, stopIngestionScheduler } from "./lib/scheduler";

app.listen(config.PORT, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port: config.PORT }, "Server listening");

  // Initialize data ingestion scheduler
  try {
    await initializeIngestionScheduler();
    logger.info("Data ingestion scheduler initialized");
  } catch (error) {
    logger.error({ error }, "Failed to initialize scheduler");
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  stopIngestionScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  stopIngestionScheduler();
  process.exit(0);
});
