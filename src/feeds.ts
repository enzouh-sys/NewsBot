import { readFile } from "node:fs/promises";
import path from "node:path";

export type Category = "om" | "ai_tech" | "gaming";

export type FeedConfig = {
  om: string[];
  ai_tech: string[];
  gaming: string[];
};

export type FeedItemNormalized = {
  title: string;
  summary: string;
  link: string;
  isoDate: string;
  sourceName: string;
  category: Category;
};

const FEEDS_FILE_PATH = path.resolve(process.cwd(), "feeds.json");

export const categoryLabels: Record<Category, string> = {
  om: "\uD83D\uDD35\u26AA OM",
  ai_tech: "\uD83E\uDD16 IA & Tech",
  gaming: "\uD83C\uDFAE Gaming"
};

export const strictAllowlist: Record<Category, string[]> = {
  om: ["om.fr", "lequipe.fr", "uefa.com", "ligue1.fr", "francefootball.fr", "rmc.bfmtv.com"],
  ai_tech: [
    "openai.com",
    "anthropic.com",
    "ai.google.dev",
    "blog.google",
    "microsoft.com",
    "aws.amazon.com",
    "nvidia.com",
    "meta.com"
  ],
  gaming: [
    "news.xbox.com",
    "blog.playstation.com",
    "nintendo.com",
    "store.steampowered.com",
    "steamcommunity.com",
    "ea.com",
    "ubisoft.com"
  ]
};

export async function loadFeeds(): Promise<FeedConfig> {
  const raw = await readFile(FEEDS_FILE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<FeedConfig>;

  return {
    om: ensureStringArray(parsed.om, "om"),
    ai_tech: ensureStringArray(parsed.ai_tech, "ai_tech"),
    gaming: ensureStringArray(parsed.gaming, "gaming")
  };
}

function ensureStringArray(value: unknown, key: Category): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`feeds.json invalid: "${key}" must be an array of URLs`);
  }
  return value;
}

export function isAllowedDomain(category: Category, url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return strictAllowlist[category].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}
