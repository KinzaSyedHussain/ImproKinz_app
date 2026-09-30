import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import app from "./app";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the main project .env file
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

logger.info(
  {
    youtubeApiKeyLoaded: Boolean(process.env["YOUTUBE_API_KEY"]),
  },
  "Environment loaded",
);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});