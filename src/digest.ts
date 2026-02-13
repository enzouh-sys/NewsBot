import { ChannelType, Client } from "discord.js";
import Parser from "rss-parser";
import { LinkCache } from "./cache.js";
import {
  buildGoogleNewsRssQuery,
  Category,
  FeedConfig,
  FeedItemNormalized,
  OmSourcesConfig,
  categoryLabels,
  isAllowedDomain,
  loadFeeds,
  loadOmSourcesConfig
} from "./feeds.js";
import { logger } from "./utils/logger.js";
import { buildHookLine } from "./utils/hookBuilder.js";

const RSS_FETCH_LIMIT = 10;
const RSS_TIMEOUT_MS = 8000;
const MAX_RETRIES = 1;
const RECENT_HOURS = 72;
const SUMMARY_SENTENCE_MAX = 170;
const BULLET = "\u2022";

const BASE_ITEMS_PER_SECTION = 3;
const MAX_ITEMS_PER_SECTION = 5;
const OM_MAX_ITEMS = 12;

const INTRO_LINES = [
  "Je me suis leve tot pour fouiller les flux, comme ca t'as juste a lire.",
  "Pendant que tout le monde dormait, j'ai trie les infos utiles pour ce matin.",
  "J'ai fait le sale boulot des news a ta place, version rapide et propre.",
  "J'ai ecume les sources a l'aube pour t'eviter la chasse aux actus.",
  "Cafe pour moi, digest pour toi: voici ce qui vaut vraiment le coup.",
  "J'ai filtre le bruit du web ce matin, tu recuperes juste l'essentiel.",
  "J'ai fouille internet de bon matin pour t'eviter de le faire toi-meme.",
  "Le tri est deja fait: tu peux commencer ta journee sans faire defiler partout.",
  "J'ai ramasse les infos importantes avant 9h, tu n'as plus qu'a parcourir.",
  "Mission matinale terminee: les actus utiles sont pretes.",
  "J'ai passe les flux au tamis pendant que ton cafe refroidissait.",
  "Le bruit est parti a la poubelle, j'ai garde ce qui compte.",
  "J'ai deja fait le tri, tu peux faire semblant d'etre ultra informe.",
  "Les actus sont rangees, classees, et servies sans effort de ta part.",
  "Tu voulais l'essentiel sans perdre 40 minutes? C'est fait.",
  "J'ai fait la course matinale sur les flux RSS, tu recoltes le resultat.",
  "J'ai filtre les titres pieges, il reste du concret.",
  "Les infos du matin sont pretes, toi tu restes en mode economie d'energie.",
  "J'ai compile ce qu'il fallait savoir avant que la journee parte dans tous les sens.",
  "J'ai lu le bazar internet pour t'eviter la punition.",
  "Tout est deja trie par importance, respire et lis.",
  "J'ai nettoye le flux, il reste la version utile.",
  "Pendant que tu procrastinais, j'ai fait le point complet.",
  "J'ai remonte les actus qui valent vraiment ton attention.",
  "Ce matin j'ai fait l'aspirateur a infos: voici le propre.",
  "J'ai fait la veille avant 9h, parce que quelqu'un devait le faire.",
  "Les news sont pretes et le bruit de fond est deja oublie.",
  "Je t'ai sorti une version courte, nette, exploitable.",
  "Tu ouvres Discord, tout est deja range pour toi.",
  "La recolte est terminee: que du pertinent.",
  "J'ai separe l'utile du decoratif, cadeau.",
  "J'ai fait le tri sans pitie, tu recuperes le meilleur.",
  "Je t'ai economise le defilement inutile de bon matin.",
  "C'est pret: infos claires, ordre logique, zero detour.",
  "J'ai fait l'inspection matinale des flux, verdict ci-dessous.",
  "J'ai lu, compare, coupe, puis garde l'essentiel.",
  "Tu voulais un recapitulatif propre sans fouiller partout: le voila.",
  "Le recapitulatif est pret, le chaos internet est reste dehors.",
  "J'ai fait la partie penible, profite de la version concise.",
  "J'ai sorti la version matinale pour humains presses.",
  "Le filtre est passe: seulement les infos qui se defendent.",
  "Tu peux gagner du temps, j'ai deja fait le boulot de veille.",
  "Je t'evite les onglets en cascade, tout est ici.",
  "J'ai fait un recapitulatif qui va droit au but, sans mise en scene.",
  "Les flux ont parle, j'ai garde ce qui tient la route.",
  "J'ai fait la pre-selection severe, tu lis le meilleur.",
  "La veille est bouclee: reste juste a parcourir.",
  "J'ai condense la matinee en quelques lignes utiles.",
  "Tu n'as rien manque d'important, j'ai verrouille la veille.",
  "J'ai fait le travail de fond, version recapitulatif instantane.",
  "Tout est trie, horodate mentalement et avance.",
  "J'ai isole les signaux forts pour t'eviter la pollution info.",
  "Tu voulais rapide et clair: mission tenue.",
  "J'ai transforme le flux brut en recapitulatif lisible.",
  "Les infos du matin ont deja ete apprivoisees.",
  "J'ai coupe le superflu, garde le necessaire.",
  "Le recapitulatif est servi, sans bruit, sans detour, sans drame.",
  "J'ai fait la tournee des sources pendant que la ville se reveillait.",
  "Ce que tu dois savoir est deja la, proprement emballe."
];

const OM_IMPORTANCE_KEYWORDS = [
  "officiel",
  "communiqu",
  "transfert",
  "blessure",
  "sanction",
  "conference",
  "conference de presse",
  "mercato",
  "signature",
  "ligue 1",
  "uefa"
];

const OM_RUMOR_KEYWORDS = [
  "rumeur",
  "piste",
  "interet",
  "intérêt",
  "negociation",
  "négociation",
  "discussions",
  "cible",
  "ciblé",
  "pourrait",
  "envisage",
  "envisagé"
];

const OM_OFFICIAL_KEYWORDS = [
  "officiel",
  "communique",
  "communiqué",
  "officialise",
  "officialisé",
  "annonce"
];

const HIGHLIGHT_KEYWORDS: Record<Category, string[]> = {
  om: [
    "officiel",
    "communique",
    "transfert",
    "blessure",
    "sanction",
    "conference",
    "mercato",
    "signature",
    "ligue 1",
    "uefa"
  ],
  ai_tech: [
    "release",
    "launch",
    "open source",
    "model",
    "api",
    "security",
    "benchmark",
    "update",
    "nvidia",
    "openai",
    "anthropic",
    "google",
    "meta",
    "microsoft",
    "gpt",
    "claude",
    "gemini",
    "llama",
    "copilot"
  ],
  gaming: [
    "release date",
    "sortie",
    "trailer",
    "patch",
    "update",
    "game pass",
    "playstation",
    "xbox",
    "nintendo",
    "steam",
    "esport",
    "ps5",
    "switch"
  ]
};

type DigestConfig = {
  DISCORD_CHANNEL_ID: string;
  STRICT_MODE: boolean;
};

export type DigestOptions = {
  category?: Category | "all";
  limit?: number;
};

type FeedWithMeta = {
  feedUrl: string;
  category: Category;
};

function buildOmFeedList(baseFeeds: string[], omSources: OmSourcesConfig): string[] {
  const journalistFeeds = omSources.journalist_sources.map((name) => buildGoogleNewsRssQuery(name));
  const all = [
    ...baseFeeds,
    ...omSources.direct_feeds,
    ...journalistFeeds,
    ...omSources.fallback_aggregator_feeds
  ];
  return [...new Set(all)];
}

const parser = new Parser({
  timeout: RSS_TIMEOUT_MS,
  headers: {
    "User-Agent": "NewsBot/1.0 (+discord digest)"
  }
});

export async function sendDigestToConfiguredChannel(
  client: Client,
  config: DigestConfig,
  options?: DigestOptions
): Promise<string> {
  const channel = await client.channels.fetch(config.DISCORD_CHANNEL_ID).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error("DISCORD_CHANNEL_ID does not point to a guild text channel.");
  }

  const digest = await buildDigestMessage(config, options);
  await sendInChunks(channel, digest);
  return digest;
}

async function sendInChunks(
  channel: Extract<Awaited<ReturnType<Client["channels"]["fetch"]>>, { type: ChannelType.GuildText }>,
  content: string
): Promise<void> {
  const max = 1900;
  if (content.length <= max) {
    await channel.send(content);
    return;
  }

  const lines = content.split("\n");
  let current = "";

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= max) {
      current = candidate;
      continue;
    }

    if (current) {
      await channel.send(current);
      current = line;
      continue;
    }

    let remaining = line;
    while (remaining.length > max) {
      await channel.send(remaining.slice(0, max));
      remaining = remaining.slice(max);
    }
    current = remaining;
  }

  if (current) {
    await channel.send(current);
  }
}

export async function buildDigestMessage(config: DigestConfig, options?: DigestOptions): Promise<string> {
  const feeds = await loadFeeds();
  const omSources = await loadOmSourcesConfig();
  const cache = new LinkCache();
  await cache.init();

  const allItems = await fetchAllItems(feeds, omSources, config.STRICT_MODE);
  const deduped = dedupeByCache(allItems, cache);
  const selected = applyPerSectionSelection(deduped, options, omSources);

  for (const item of selected) {
    cache.add(item.link, item.isoDate);
  }
  cache.cleanup();
  await cache.persist();

  return formatDigest(selected, options?.category ?? "all", omSources);
}

async function fetchAllItems(
  feeds: FeedConfig,
  omSources: OmSourcesConfig,
  strictMode: boolean
): Promise<FeedItemNormalized[]> {
  const omFeedList = buildOmFeedList(feeds.om, omSources);
  const feedEntries: FeedWithMeta[] = [
    ...omFeedList.map((feedUrl) => ({ feedUrl, category: "om" as const })),
    ...feeds.ai_tech.map((feedUrl) => ({ feedUrl, category: "ai_tech" as const })),
    ...feeds.gaming.map((feedUrl) => ({ feedUrl, category: "gaming" as const }))
  ];

  const items: FeedItemNormalized[] = [];
  for (const entry of feedEntries) {
    const fetched = await fetchOneFeed(entry.feedUrl, entry.category, strictMode);
    items.push(...fetched);
  }
  return items;
}

async function fetchOneFeed(
  feedUrl: string,
  category: Category,
  strictMode: boolean
): Promise<FeedItemNormalized[]> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const sourceName = feed.title ?? safeHostname(feedUrl);
      const recentCutoff = Date.now() - RECENT_HOURS * 60 * 60 * 1000;

      const normalized = feed.items
        .slice(0, RSS_FETCH_LIMIT)
        .map((item) => normalizeItem(item, sourceName, category))
        .filter((item): item is FeedItemNormalized => item !== null)
        .filter((item) => Date.parse(item.isoDate) >= recentCutoff);

      if (!strictMode || category === "om") {
        return normalized;
      }
      return normalized.filter((item) => isAllowedDomain(category, item.link));
    } catch (error) {
      logger.warn(`RSS fetch failed (${attempt + 1}/${MAX_RETRIES + 1}) for ${feedUrl}`, error);
      if (attempt === MAX_RETRIES) {
        return [];
      }
    }
  }
  return [];
}

function normalizeItem(
  item: Parser.Item,
  sourceName: string,
  category: Category
): FeedItemNormalized | null {
  const title = (item.title ?? "").trim();
  const link = (item.link ?? "").trim();
  const isoDateRaw = item.isoDate ?? item.pubDate ?? "";
  const date = Date.parse(isoDateRaw);

  if (!title || !link || !Number.isFinite(date)) {
    return null;
  }

  const summary = buildSummary(item, title);

  return {
    title,
    summary,
    link,
    isoDate: new Date(date).toISOString(),
    sourceName,
    category
  };
}

function buildSummary(item: Parser.Item, title: string): string {
  const extendedItem = item as Parser.Item & {
    summary?: string;
    contentSnippet?: string;
    content?: string;
    "content:encoded"?: string;
  };

  const raw =
    extendedItem.contentSnippet ??
    extendedItem.summary ??
    extendedItem.content ??
    extendedItem["content:encoded"] ??
    title;

  const plain = cleanupText(raw);
  if (!plain) {
    return `Resume rapide: ${title}.`;
  }

  const sentences = toSentences(plain);
  if (sentences.length === 0) {
    return `Resume rapide: ${title}.`;
  }

  const picked = sentences.slice(0, 3).map((sentence) => limitSentence(sentence, SUMMARY_SENTENCE_MAX));
  return picked.join(" ");
}

function cleanupText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toSentences(input: string): string[] {
  return input
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function limitSentence(sentence: string, max: number): string {
  if (sentence.length <= max) {
    return sentence;
  }
  return `${sentence.slice(0, max).trim()}...`;
}

function dedupeByCache(items: FeedItemNormalized[], cache: LinkCache): FeedItemNormalized[] {
  const localSet = new Set<string>();
  const out: FeedItemNormalized[] = [];

  for (const item of items) {
    if (cache.has(item.link) || localSet.has(item.link)) {
      continue;
    }
    localSet.add(item.link);
    out.push(item);
  }
  return out;
}

function applyPerSectionSelection(
  items: FeedItemNormalized[],
  options: DigestOptions | undefined,
  omSources: OmSourcesConfig
): FeedItemNormalized[] {
  const requested = options?.category ?? "all";
  const categories: Category[] =
    requested === "all" ? ["om", "ai_tech", "gaming"] : [requested as Category];

  const selected: FeedItemNormalized[] = [];

  for (const category of categories) {
    const sectionItems = items.filter((item) => item.category === category);

    if (category === "om") {
      const omSorted = sectionItems.sort((a, b) => {
        const scoreDiff = scoreOmCredibility(b, omSources).score - scoreOmCredibility(a, omSources).score;
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return Date.parse(b.isoDate) - Date.parse(a.isoDate);
      });
      const sectionLimit = options?.limit ?? Math.min(OM_MAX_ITEMS, omSorted.length);
      selected.push(...omSorted.slice(0, sectionLimit));
      continue;
    }

    const sorted = sectionItems.sort((a, b) => compareByImportanceThenDate(a, b));
    const sectionLimit = options?.limit ?? computeDynamicSectionLimit(sorted);
    selected.push(...sorted.slice(0, sectionLimit));
  }

  return selected;
}

function isImportantOmItem(title: string): boolean {
  const normalized = title.toLowerCase();
  return OM_IMPORTANCE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function compareByImportanceThenDate(a: FeedItemNormalized, b: FeedItemNormalized): number {
  const scoreDiff = computeImportanceScore(b) - computeImportanceScore(a);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  return Date.parse(b.isoDate) - Date.parse(a.isoDate);
}

function computeDynamicSectionLimit(items: FeedItemNormalized[]): number {
  if (items.length <= BASE_ITEMS_PER_SECTION) {
    return items.length;
  }

  const importantCount = items.filter((item) => computeImportanceScore(item) >= 2).length;
  if (importantCount >= 4) {
    return Math.min(MAX_ITEMS_PER_SECTION, items.length);
  }
  if (importantCount >= 2) {
    return Math.min(BASE_ITEMS_PER_SECTION + 1, items.length);
  }
  return Math.min(BASE_ITEMS_PER_SECTION, items.length);
}

function computeImportanceScore(item: FeedItemNormalized): number {
  const title = item.title.toLowerCase();
  const summary = item.summary.toLowerCase();
  const text = `${title} ${summary}`;

  const keywords = item.category === "om" ? OM_IMPORTANCE_KEYWORDS : HIGHLIGHT_KEYWORDS[item.category];
  let score = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  if (item.category === "om" && isImportantOmItem(item.title)) {
    score += 2;
  }

  return score;
}

function scoreGenericCredibility(item: FeedItemNormalized): { emoji: "🟢" | "🟡" | "🟠" | "🔴" } {
  const score = computeImportanceScore(item);
  if (score >= 5) {
    return { emoji: "🟢" };
  }
  if (score >= 3) {
    return { emoji: "🟡" };
  }
  if (score >= 2) {
    return { emoji: "🟠" };
  }
  return { emoji: "🔴" };
}

type OmCredibility = {
  score: number;
  emoji: "🟢" | "🟡" | "🟠" | "🔴";
  level: "VERT" | "JAUNE" | "ORANGE" | "ROUGE";
  isRumor: boolean;
};

function scoreOmCredibility(item: FeedItemNormalized, omSources: OmSourcesConfig): OmCredibility {
  const text = `${item.title} ${item.summary} ${item.sourceName}`.toLowerCase();
  const host = safeHostname(item.link).toLowerCase();

  let score = 20;

  if (matchesDomain(host, omSources.official_domains)) {
    score += 55;
  } else if (matchesDomain(host, omSources.top_tier_domains)) {
    score += 40;
  } else if (matchesDomain(host, omSources.sports_domains)) {
    score += 25;
  } else if (matchesDomain(host, omSources.blog_domains)) {
    score += 12;
  }

  if (containsAny(text, OM_OFFICIAL_KEYWORDS)) {
    score += 25;
  }

  if (containsAny(text, OM_IMPORTANCE_KEYWORDS)) {
    score += 12;
  }

  const topTierJournalist = containsAny(text, omSources.top_tier_journalists);
  const trustedJournalist = containsAny(text, omSources.trusted_journalists);
  const insider = containsAny(text, omSources.insider_sources);

  if (topTierJournalist) {
    score += 30;
  } else if (trustedJournalist) {
    score += 22;
  } else if (insider) {
    score += 16;
  }

  const isOfficialType = containsAny(text, ["communique", "officiel", "officialise", "signature"]);
  const isRumor = containsAny(text, OM_RUMOR_KEYWORDS);
  if (isOfficialType) {
    score += 10;
  }
  if (isRumor) {
    score -= 8;
  }

  if (isRumor && !topTierJournalist) {
    score = Math.min(score, 75);
  }

  score = Math.max(0, Math.min(100, score));
  if (score >= 80) {
    return { score, emoji: "🟢", level: "VERT", isRumor };
  }
  if (score >= 60) {
    return { score, emoji: "🟡", level: "JAUNE", isRumor };
  }
  if (score >= 40) {
    return { score, emoji: "🟠", level: "ORANGE", isRumor };
  }
  return { score, emoji: "🔴", level: "ROUGE", isRumor };
}

function matchesDomain(host: string, domains: string[]): boolean {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function containsAny(text: string, words: string[]): boolean {
  const lowered = text.toLowerCase();
  return words.some((word) => lowered.includes(word.toLowerCase()));
}

function formatDigest(
  items: FeedItemNormalized[],
  requestedCategory: Category | "all",
  omSources: OmSourcesConfig
): string {
  const categories: Category[] =
    requestedCategory === "all" ? ["om", "ai_tech", "gaming"] : [requestedCategory];

  const lines: string[] = [pickIntroLine(), ""];

  for (const category of categories) {
    const section = items.filter((item) => item.category === category);

    if (category === "om") {
      lines.push("🔵⚪ OM — ACTU IMPORTANTE");
      if (section.length === 0) {
        lines.push(`${BULLET} Aucun item recent.`);
      } else {
        const mainItem = section[0];
        lines.push(`🔥 INFO MAJEURE — ${mainItem.title}`);
        lines.push("");
        for (const item of section) {
          const cred = scoreOmCredibility(item, omSources);
          const hook = buildHookLine(item, "om");
          lines.push(`${cred.emoji} **${hook}**`);
          lines.push(`${item.title} — <${item.link}>`);
          lines.push("");
        }
      }
      lines.push("");
      continue;
    }

    lines.push(categoryLabels[category]);
    if (section.length === 0) {
      lines.push(`${BULLET} Aucun item recent.`);
    } else {
      for (const item of section) {
        const quality = scoreGenericCredibility(item);
        const hook = buildHookLine(item, item.category);
        lines.push(`${quality.emoji} **${hook}**`);
        lines.push(`${item.title} — <${item.link}>`);
        lines.push("");
      }
    }
    lines.push("");
  }

  lines.push("_Le surplus est parti direct a la poubelle._");
  return lines.join("\n");
}

function pickIntroLine(): string {
  const index = Math.floor(Math.random() * INTRO_LINES.length);
  return INTRO_LINES[index] ?? INTRO_LINES[0];
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown-source";
  }
}
