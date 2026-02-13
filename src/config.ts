export type AppConfig = {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_GUILD_ID: string;
  DISCORD_CHANNEL_ID: string;
  TIMEZONE: string;
  STRICT_MODE: boolean;
};

type RequiredVar =
  | "DISCORD_TOKEN"
  | "DISCORD_CLIENT_ID"
  | "DISCORD_GUILD_ID"
  | "DISCORD_CHANNEL_ID";

function getEnvVar(name: RequiredVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const strictModeRaw = process.env.STRICT_MODE ?? "false";
  const strictMode = strictModeRaw.toLowerCase() === "true";

  return {
    DISCORD_TOKEN: getEnvVar("DISCORD_TOKEN"),
    DISCORD_CLIENT_ID: getEnvVar("DISCORD_CLIENT_ID"),
    DISCORD_GUILD_ID: getEnvVar("DISCORD_GUILD_ID"),
    DISCORD_CHANNEL_ID: getEnvVar("DISCORD_CHANNEL_ID"),
    TIMEZONE: process.env.TIMEZONE ?? "Europe/Paris",
    STRICT_MODE: strictMode
  };
}
