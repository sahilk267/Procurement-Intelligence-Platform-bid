import app from "./app";
import { logger } from "./lib/logger";
import { config } from "./config";

app.listen(config.PORT, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port: config.PORT }, "Server listening");
});
