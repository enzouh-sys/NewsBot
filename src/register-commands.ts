import dotenv from "dotenv";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";

dotenv.config();

async function registerCommands(): Promise<void> {
  const config = loadConfig();
  const token = config.DISCORD_TOKEN;
  const clientId = config.DISCORD_CLIENT_ID;
  const guildId = config.DISCORD_GUILD_ID;

  const rest = new REST({ version: "10" }).setToken(token);
  const payload = commands.map((command) => command.data.toJSON());

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: payload });
  logger.info(`Registered ${payload.length} commands in guild ${guildId}.`);
}

registerCommands().catch((error) => {
  logger.error("Failed to register commands", error);
  process.exit(1);
});
