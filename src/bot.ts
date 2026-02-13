import {
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits
} from "discord.js";
import cron from "node-cron";
import { commands } from "./commands/index.js";
import { ChatCommand } from "./commands/types.js";
import { AppConfig } from "./config.js";
import { sendDigestToConfiguredChannel } from "./digest.js";
import { logger } from "./utils/logger.js";

const commandMap = new Map<string, ChatCommand>(commands.map((command) => [command.data.name, command]));

export async function startBot(config: AppConfig): Promise<void> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Ready - ${readyClient.user.tag}`);

    const channel = await readyClient.channels.fetch(config.DISCORD_CHANNEL_ID).catch(() => null);
    if (channel?.type === ChannelType.GuildText) {
      await channel.send("NewsBot est en ligne.");
    } else {
      logger.warn("DISCORD_CHANNEL_ID does not point to a guild text channel.");
    }

    cron.schedule(
      "1 9 * * *",
      async () => {
        try {
          await sendDigestToConfiguredChannel(readyClient, config);
          logger.info("Daily digest sent.");
        } catch (error) {
          logger.error("Daily digest failed", error);
        }
      },
      { timezone: config.TIMEZONE }
    );
    logger.info(`Cron scheduled at 09:01 (${config.TIMEZONE}).`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    await handleChatInput(interaction, config);
  });

  await client.login(config.DISCORD_TOKEN);
}

async function handleChatInput(
  interaction: ChatInputCommandInteraction,
  config: AppConfig
): Promise<void> {
  const command = commandMap.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ content: "Commande inconnue.", ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction, { config });
  } catch (error) {
    logger.error(`Command /${interaction.commandName} failed`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Erreur interne.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Erreur interne.", ephemeral: true });
    }
  }
}
