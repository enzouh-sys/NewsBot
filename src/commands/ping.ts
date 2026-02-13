import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ChatCommand } from "./types.js";

export const pingCommand: ChatCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with pong"),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply("pong");
  }
};
