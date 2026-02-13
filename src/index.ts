import dotenv from "dotenv";
import { startBot } from "./bot.js";
import { loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";

dotenv.config();

async function main(): Promise<void> {
  const config = loadConfig();
  await startBot(config);
}

main().catch((error) => {
  logger.error("Fatal startup error", error);
  process.exit(1);
});
