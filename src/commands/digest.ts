import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { sendDigestToConfiguredChannel } from "../digest.js";
import { Category } from "../feeds.js";
import { ChatCommand, CommandContext } from "./types.js";

const categoryChoices: { name: string; value: Category | "all" }[] = [
  { name: "all", value: "all" },
  { name: "om", value: "om" },
  { name: "ai_tech", value: "ai_tech" },
  { name: "gaming", value: "gaming" }
];

export const digestCommand: ChatCommand = {
  data: new SlashCommandBuilder()
    .setName("digest")
    .setDescription("Envoie le digest dans le salon configure")
    .addStringOption((option) => {
      option.setName("category").setDescription("Categorie du digest").setRequired(false);
      for (const choice of categoryChoices) {
        option.addChoices({ name: choice.name, value: choice.value });
      }
      return option;
    })
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Nombre max d'items par section")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    ),
  async execute(
    interaction: ChatInputCommandInteraction,
    context: CommandContext
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const category = (interaction.options.getString("category") ?? "all") as Category | "all";
    const limit = interaction.options.getInteger("limit") ?? undefined;

    await sendDigestToConfiguredChannel(interaction.client, context.config, { category, limit });
    await interaction.editReply("Digest envoye dans le salon configure.");
  }
};
