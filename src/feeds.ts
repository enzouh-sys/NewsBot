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

export type OmSourcesConfig = {
  direct_feeds: string[];
  fallback_aggregator_feeds: string[];
  journalist_sources: string[];
  official_domains: string[];
  top_tier_domains: string[];
  sports_domains: string[];
  blog_domains: string[];
  top_tier_journalists: string[];
  trusted_journalists: string[];
  insider_sources: string[];
};

const FEEDS_FILE_PATH = path.resolve(process.cwd(), "feeds.json");
const OM_SOURCES_FILE_PATH = path.resolve(process.cwd(), "om_sources.json");

export const categoryLabels: Record<Category, string> = {
  om: "\uD83D\uDD35\u26AA OM",
  ai_tech: "\uD83E\uDD16 IA & Tech",
  gaming: "\uD83C\uDFAE Gaming"
};

export const strictAllowlist: Record<Category, string[]> = {
  om: [],
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
    om: ensureCategoryArray(parsed.om, "om"),
    ai_tech: ensureCategoryArray(parsed.ai_tech, "ai_tech"),
    gaming: ensureCategoryArray(parsed.gaming, "gaming")
  };
}

export async function loadOmSourcesConfig(): Promise<OmSourcesConfig> {
  const raw = await readFile(OM_SOURCES_FILE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<OmSourcesConfig>;

  return {
    direct_feeds: ensureConfigArray(parsed.direct_feeds, "direct_feeds"),
    fallback_aggregator_feeds: ensureConfigArray(
      parsed.fallback_aggregator_feeds,
      "fallback_aggregator_feeds"
    ),
    journalist_sources: ensureConfigArray(parsed.journalist_sources, "journalist_sources"),
    official_domains: ensureConfigArray(parsed.official_domains, "official_domains"),
    top_tier_domains: ensureConfigArray(parsed.top_tier_domains, "top_tier_domains"),
    sports_domains: ensureConfigArray(parsed.sports_domains, "sports_domains"),
    blog_domains: ensureConfigArray(parsed.blog_domains, "blog_domains"),
    top_tier_journalists: ensureConfigArray(parsed.top_tier_journalists, "top_tier_journalists"),
    trusted_journalists: ensureConfigArray(parsed.trusted_journalists, "trusted_journalists"),
    insider_sources: ensureConfigArray(parsed.insider_sources, "insider_sources")
  };
}

function ensureCategoryArray(value: unknown, key: Category): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`feeds.json invalid: "${key}" must be an array of URLs`);
  }
  return value;
}

function ensureConfigArray(value: unknown, key: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`om_sources.json invalid: "${key}" must be an array of strings`);
  }
  return value;
}

export function buildGoogleNewsRssQuery(sourceName: string): string {
  const query = `${sourceName} OM OR Olympique de Marseille`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;
}

export function isAllowedDomain(category: Category, url: string): boolean {
  if (category === "om") {
    return true;
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    return strictAllowlist[category].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}
