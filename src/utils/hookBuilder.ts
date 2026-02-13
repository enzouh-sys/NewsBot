import { Category, FeedItemNormalized } from "../feeds.js";

const MAX_HOOK_LENGTH = 110;

const ACTION_KEYWORDS = [
  "signe",
  "signé",
  "annonce",
  "sort",
  "lance",
  "revele",
  "révèle",
  "confirme",
  "negocie",
  "négocie",
  "publie",
  "devoile",
  "dévoile",
  "patch",
  "update",
  "release"
];

const IA_TERMS = [
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

const GAME_TERMS = [
  "GTA 6",
  "Grand Theft Auto VI",
  "Call of Duty",
  "EA Sports FC",
  "Fortnite",
  "FIFA",
  "League of Legends",
  "Valorant",
  "Minecraft",
  "PlayStation",
  "Xbox",
  "Nintendo",
  "Steam"
];

const STOP_WORDS = new Set([
  "Le",
  "La",
  "Les",
  "Un",
  "Une",
  "Des",
  "OM",
  "Olympique",
  "Marseille",
  "IA",
  "Tech",
  "Gaming"
]);

export function buildHookLine(item: FeedItemNormalized, category: Category): string {
  const title = clean(item.title);
  const description = clean(item.summary);
  const combined = `${title} ${description}`.trim();

  const entity = extractEntity(title, combined, category);
  const action = extractAction(combined);
  const complement = extractComplement(title, description, entity, action);

  if (!entity || !action) {
    return truncate(title, MAX_HOOK_LENGTH);
  }

  const hook = `${entity} ${action}${complement ? ` ${complement}` : ""}`.trim();
  return truncate(removeTrailingPunctuation(hook), MAX_HOOK_LENGTH);
}

function extractEntity(title: string, combined: string, category: Category): string | null {
  if (category === "ai_tech") {
    const fromKnown = IA_TERMS.find((term) => includesWord(combined, term));
    if (fromKnown) {
      return fromKnown;
    }
    const modelMatch = combined.match(/\b[A-Z]{2,}(?:-[0-9A-Za-z]+)?\b/);
    if (modelMatch?.[0]) {
      return modelMatch[0];
    }
  }

  if (category === "gaming") {
    const fromKnown = GAME_TERMS.find((term) => includesWord(combined, term));
    if (fromKnown) {
      return fromKnown;
    }
  }

  const properNouns = title.match(/\b[A-Z][A-Za-z0-9'-]+(?:\s+[A-Z][A-Za-z0-9'-]+){0,2}\b/g) ?? [];
  for (const candidate of properNouns) {
    if (!STOP_WORDS.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function extractAction(text: string): string | null {
  const lowered = text.toLowerCase();
  for (const action of ACTION_KEYWORDS) {
    if (lowered.includes(action.toLowerCase())) {
      return action;
    }
  }
  return null;
}

function extractComplement(
  title: string,
  description: string,
  entity: string | null,
  action: string | null
): string {
  const source = `${title} ${description}`.trim();
  let out = source;
  if (entity) {
    out = out.replace(new RegExp(escapeRegExp(entity), "i"), "");
  }
  if (action) {
    out = out.replace(new RegExp(escapeRegExp(action), "i"), "");
  }
  out = out.replace(/\s+/g, " ").trim();
  return truncate(out, 56);
}

function includesWord(text: string, value: string): boolean {
  return new RegExp(`\\b${escapeRegExp(value)}\\b`, "i").test(text);
}

function clean(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function removeTrailingPunctuation(input: string): string {
  return input.replace(/[.!?:;,]+$/, "").trim();
}

function truncate(input: string, max: number): string {
  if (input.length <= max) {
    return input;
  }
  const cut = input.slice(0, max - 1);
  const cleanCut = cut.slice(0, cut.lastIndexOf(" ")).trim();
  return (cleanCut || cut).trim();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
