import { ChannelType, Client } from "discord.js";
import Parser from "rss-parser";
import { LinkCache } from "./cache.js";
import {
  Category,
  FeedConfig,
  FeedItemNormalized,
  categoryLabels,
  isAllowedDomain,
  loadFeeds
} from "./feeds.js";
import { logger } from "./utils/logger.js";

const RSS_FETCH_LIMIT = 10;
const RSS_TIMEOUT_MS = 8000;
const MAX_RETRIES = 1;
const SUMMARY_SENTENCE_MAX = 170;
const BULLET = "\u2022";

const BASE_ITEMS_PER_SECTION = 3;
const MAX_ITEMS_PER_SECTION = 5;

const INTRO_LINES = [
  "Je me suis leve tot pour fouiller les flux, comme ca t'as juste a lire.",
  "Pendant que tout le monde dormait, j'ai trie les infos utiles pour ce matin.",
  "J'ai fait le sale boulot des news a ta place, version rapide et propre.",
  "J'ai ecume les sources a l'aube pour t'eviter la chasse aux actus.",
  "Cafe pour moi, digest pour toi: voici ce qui vaut vraiment le coup.",
  "J'ai filtre le bruit du web ce matin, tu recuperes juste l'essentiel.",
  "J'ai fouille internet de bon matin pour t'eviter de le faire toi-meme.",
  "Le tri est deja fait: tu peux commencer ta journee sans scroller partout.",
  "J'ai ramasse les infos importantes avant 9h, tu n'as plus qu'a parcourir.",
  "Mission matinale terminee: les actus utiles sont pretes.",
  "J'ai passe les flux au tamis pendant que ton cafe refroidissait.",
  "Le bruit est parti a la poubelle, j'ai garde ce qui compte.",
  "J'ai deja fait le tri, tu peux faire semblant d'etre ultra informe.",
  "Les actus sont rangees, classees, et servies sans effort de ta part.",
  "Tu voulais l'essentiel sans perdre 40 minutes? C'est fait.",
  "J'ai fait le sprint matinal sur les RSS, tu recoltes le resultat.",
  "J'ai filtre les titres clickbait, il reste du concret.",
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
  "Je t'ai economise le scroll inutile de bon matin.",
  "C'est pret: infos claires, ordre logique, zero detour.",
  "J'ai fait l'inspection matinale des flux, verdict ci-dessous.",
  "J'ai lu, compare, coupe, puis garde l'essentiel.",
  "Tu voulais un recap propre sans fouiller partout: le voila.",
  "Le digest est pret, le chaos internet est reste dehors.",
  "J'ai fait la partie penible, profite de la version concise.",
  "J'ai sorti la version matinale pour humains presses.",
  "Le filtre est passe: seulement les infos qui se defendent.",
  "Tu peux gagner du temps, j'ai deja fait le boulot de veille.",
  "Je t'evite les onglets en cascade, tout est ici.",
  "J'ai fait un recap qui va droit au but, sans cinema.",
  "Les flux ont parle, j'ai garde ce qui tient la route.",
  "J'ai fait la pre-selection severe, tu lis le top.",
  "La veille est bouclee: reste juste a parcourir.",
  "J'ai condense la matinee en quelques lignes utiles.",
  "Tu n'as rien manque d'important, j'ai verrouille la veille.",
  "J'ai fait le travail de fond, version digest instantane.",
  "Tout est trie, horodate mentalement et avance.",
  "J'ai isole les signaux forts pour t'eviter la pollution info.",
  "Tu voulais rapide et clair: mission tenue.",
  "J'ai transforme le flux brut en recap lisible.",
  "Les infos du matin ont deja ete apprivoisees.",
  "J'ai coupe le superflu, garde le necessaire.",
  "Le recap est servi, sans bruit, sans detour, sans drame.",
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

const AI_TERMS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Meta",
  "Microsoft",
  "NVIDIA",
  "ChatGPT",
  "GPT-4",
  "GPT-4o",
  "Claude",
  "Gemini",
  "Llama",
  "Copilot"
];

const GAMING_TERMS = [
  "PlayStation 5",
  "PS5",
  "PlayStation",
  "Xbox Series X|S",
  "Xbox",
  "Nintendo Switch",
  "Nintendo",
  "Steam",
  "Game Pass"
];

const STOP_WORDS = new Set([
  "Le",
  "La",
  "Les",
  "Un",
  "Une",
  "Des",
  "De",
  "Du",
  "OM",
  "FC",
  "IA",
  "Tech",
  "Gaming"
]);

type DigestConfig = {
  DISCORD_CHANNEL_ID: string;
  STRICT_MODE: boolean;
  TIMEZONE: string;
};

export type DigestOptions = {
  category?: Category | "all";
  limit?: number;
};

type FeedWithMeta = {
  feedUrl: string;
  category: Category;
};

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
  await channel.send(digest);
  return digest;
}

export async function buildDigestMessage(config: DigestConfig, options?: DigestOptions): Promise<string> {
  const feeds = await loadFeeds();
  const cache = new LinkCache();
  await cache.init();

  const allItems = await fetchAllItems(feeds, config.STRICT_MODE, config.TIMEZONE);
  const deduped = dedupeByCache(allItems, cache);
  const selected = applyPerSectionSelection(deduped, options);

  for (const item of selected) {
    cache.add(item.link, item.isoDate);
  }
  cache.cleanup();
  await cache.persist();

  return formatDigest(selected, options?.category ?? "all");
}

async function fetchAllItems(
  feeds: FeedConfig,
  strictMode: boolean,
  timeZone: string
): Promise<FeedItemNormalized[]> {
  const feedEntries: FeedWithMeta[] = [
    ...feeds.om.map((feedUrl) => ({ feedUrl, category: "om" as const })),
    ...feeds.ai_tech.map((feedUrl) => ({ feedUrl, category: "ai_tech" as const })),
    ...feeds.gaming.map((feedUrl) => ({ feedUrl, category: "gaming" as const }))
  ];

  const items: FeedItemNormalized[] = [];
  for (const entry of feedEntries) {
    const fetched = await fetchOneFeed(entry.feedUrl, entry.category, strictMode, timeZone);
    items.push(...fetched);
  }
  return items;
}

async function fetchOneFeed(
  feedUrl: string,
  category: Category,
  strictMode: boolean,
  timeZone: string
): Promise<FeedItemNormalized[]> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const sourceName = feed.title ?? safeHostname(feedUrl);
      const yesterdayRange = getYesterdayRangeUtc(timeZone);

      const normalized = feed.items
        .slice(0, RSS_FETCH_LIMIT)
        .map((item) => normalizeItem(item, sourceName, category))
        .filter((item): item is FeedItemNormalized => item !== null)
        .filter((item) => {
          const ts = Date.parse(item.isoDate);
          return ts >= yesterdayRange.startMs && ts <= yesterdayRange.endMs;
        });

      if (!strictMode) {
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

function ensureSentenceEnd(input: string): string {
  if (/[.!?]$/.test(input)) {
    return input;
  }
  return `${input}.`;
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

function applyPerSectionSelection(items: FeedItemNormalized[], options?: DigestOptions): FeedItemNormalized[] {
  const requested = options?.category ?? "all";
  const categories: Category[] =
    requested === "all" ? ["om", "ai_tech", "gaming"] : [requested as Category];

  const selected: FeedItemNormalized[] = [];

  for (const category of categories) {
    const sectionItems = items
      .filter((item) => item.category === category)
      .sort((a, b) => compareByImportanceThenDate(a, b));

    const sectionLimit = options?.limit ?? computeDynamicSectionLimit(sectionItems);
    selected.push(...sectionItems.slice(0, sectionLimit));
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

function formatDigest(items: FeedItemNormalized[], requestedCategory: Category | "all"): string {
  const categories: Category[] =
    requestedCategory === "all" ? ["om", "ai_tech", "gaming"] : [requestedCategory];

  const lines: string[] = [pickIntroLine(), ""];

  for (const category of categories) {
    lines.push(categoryLabels[category]);
    const section = items.filter((item) => item.category === category);

    if (section.length === 0) {
      lines.push(`${BULLET} Aucun item recent.`);
    } else {
      for (const item of section) {
        lines.push(`${BULLET} **${item.title}**`);
        lines.push(`  ${composeHumanNarrative(item)}`);
        lines.push(`  ${composeOpinionLine(item)}`);
        lines.push(`  Source: <${item.link}>`);
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

function composeHumanNarrative(item: FeedItemNormalized): string {
  const focus = extractKeyEntity(item);
  const sentences = toSentences(item.summary)
    .map((sentence) => ensureSentenceEnd(limitSentence(sentence, SUMMARY_SENTENCE_MAX)))
    .filter((sentence) => sentence.length > 0);

  const selectedSentences = sentences.slice(0, 2);
  if (selectedSentences.length === 0) {
    selectedSentences.push(`L'information essentielle concerne ${item.title}.`);
  }

  if (focus) {
    selectedSentences.unshift(buildFocusSentence(item.category, focus));
  }

  const narrative = selectedSentences.join(" ");
  return emphasizeSummary(narrative, item.category);
}

function composeOpinionLine(item: FeedItemNormalized): string {
  const opinion = `Mon avis : ${buildCondescendingTake(item)}`;
  return emphasizeSummary(opinion, item.category);
}

function buildFocusSentence(category: Category, focus: string): string {
  if (category === "om") {
    return `Le point cle concerne **${focus}**.`;
  }
  if (category === "ai_tech") {
    return `La techno a suivre ici est **${focus}**.`;
  }
  return `L'element a retenir, c'est **${focus}**.`;
}

function buildCondescendingTake(item: FeedItemNormalized): string {
  const templates: Record<Category, string[]> = {
    om: [
      "Soyons honnetes: c'est presente comme un tournant, mais on a deja vu ce scenario trop souvent.",
      "Le storytelling est ambitieux, la realite du terrain sera probablement beaucoup moins epique.",
      "Encore une annonce habillee en evenement majeur; on jugera quand il y aura du concret."
    ],
    ai_tech: [
      "C'est vendu comme une revolution, alors que ca ressemble surtout a une iteration bien marketee.",
      "Le discours est impressionnant, l'innovation nette l'est souvent beaucoup moins une fois le vernis retire.",
      "Comme d'habitude en IA, beaucoup de promesses immediates et des limites qu'on decouvre juste apres."
    ],
    gaming: [
      "Le marketing fait beaucoup de bruit, l'innovation utile est souvent plus discrete.",
      "Sur le papier c'est grandiose, en pratique ca sent surtout la mise a jour attendue et rien de plus.",
      "On nous vend un moment fort; au final ce sera probablement une annonce correcte, pas historique."
    ]
  };

  const picks = templates[item.category];
  const index = stableIndexFromLink(item.link, picks.length);
  return picks[index];
}

function stableIndexFromLink(link: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < link.length; i += 1) {
    hash = (hash * 31 + link.charCodeAt(i)) >>> 0;
  }
  return modulo === 0 ? 0 : hash % modulo;
}

function extractKeyEntity(item: FeedItemNormalized): string | null {
  const title = cleanupText(item.title);

  if (item.category === "ai_tech") {
    const aiTerm = findKnownTerm(title, AI_TERMS);
    if (aiTerm) {
      return aiTerm;
    }
  }

  if (item.category === "gaming") {
    const gamingTerm = findKnownTerm(title, GAMING_TERMS);
    if (gamingTerm) {
      return gamingTerm;
    }
  }

  return extractProperNounPhrase(title);
}

function findKnownTerm(text: string, knownTerms: string[]): string | null {
  for (const term of knownTerms) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    const match = text.match(regex);
    if (match?.[0]) {
      return match[0];
    }
  }
  return null;
}

function extractProperNounPhrase(text: string): string | null {
  const matches = text.match(/\b[A-Z][A-Za-z0-9'-]+(?:\s+[A-Z][A-Za-z0-9'-]+){0,2}\b/g) ?? [];
  for (const match of matches) {
    if (!STOP_WORDS.has(match)) {
      return match;
    }
  }
  return null;
}

function emphasizeSummary(summary: string, category: Category): string {
  let output = summary;
  for (const keyword of HIGHLIGHT_KEYWORDS[category]) {
    const escaped = escapeRegExp(keyword);
    const regex = new RegExp(`(${escaped})`, "gi");
    output = output.replace(regex, "**$1**");
  }
  return output;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown-source";
  }
}

function getYesterdayRangeUtc(timeZone: string): { startMs: number; endMs: number } {
  const now = new Date();
  const localNow = getZonedParts(now, timeZone);
  const todayNoonUtc = Date.UTC(localNow.year, localNow.month - 1, localNow.day, 12, 0, 0);
  const yesterdayNoon = new Date(todayNoonUtc - 24 * 60 * 60 * 1000);

  const year = yesterdayNoon.getUTCFullYear();
  const month = yesterdayNoon.getUTCMonth() + 1;
  const day = yesterdayNoon.getUTCDate();

  const start = zonedDateTimeToUtc(timeZone, year, month, day, 0, 0, 0);
  const end = zonedDateTimeToUtc(timeZone, year, month, day, 23, 59, 59);

  return { startMs: start.getTime(), endMs: end.getTime() };
}

function zonedDateTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offsetMs);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return zonedAsUtcMs - date.getTime();
}

function getZonedParts(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const values = new Map<string, string>();
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") {
      values.set(part.type, part.value);
    }
  }

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second"))
  };
}
