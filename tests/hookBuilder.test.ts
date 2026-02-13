import assert from "node:assert/strict";
import { buildHookLine } from "../src/utils/hookBuilder.js";
import { FeedItemNormalized } from "../src/feeds.js";

function mkItem(title: string, summary: string, category: FeedItemNormalized["category"]): FeedItemNormalized {
  return {
    title,
    summary,
    link: "https://example.com/article",
    isoDate: new Date().toISOString(),
    sourceName: "Test Source",
    category
  };
}

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "OM transfert",
    run: () => {
      const item = mkItem(
        "Greenwood proche d'un accord avec l'OM",
        "Transfert en discussion avancee, le club negocie les derniers details.",
        "om"
      );
      const hook = buildHookLine(item, "om");
      assert.ok(hook.toLowerCase().includes("greenwood"));
      assert.ok(hook.toLowerCase().includes("negocie"));
      assert.ok(hook.length <= 110);
    }
  },
  {
    name: "OM blessure",
    run: () => {
      const item = mkItem(
        "Valentin Rongier confirme une blessure avant le match",
        "Le staff medical annonce une absence de plusieurs semaines.",
        "om"
      );
      const hook = buildHookLine(item, "om");
      assert.ok(hook.toLowerCase().includes("valentin rongier"));
      assert.ok(hook.toLowerCase().includes("confirme"));
      assert.ok(hook.length <= 110);
    }
  },
  {
    name: "IA release",
    run: () => {
      const item = mkItem(
        "OpenAI lance une nouvelle release API",
        "La release ajoute des outils de benchmark et de securite.",
        "ai_tech"
      );
      const hook = buildHookLine(item, "ai_tech");
      assert.ok(hook.toLowerCase().includes("openai"));
      assert.ok(hook.toLowerCase().includes("lance"));
      assert.ok(hook.length <= 110);
    }
  },
  {
    name: "IA modele",
    run: () => {
      const item = mkItem(
        "Anthropic revele Claude 3.5 Sonnet",
        "Le modele annonce des gains de vitesse et de qualite.",
        "ai_tech"
      );
      const hook = buildHookLine(item, "ai_tech");
      assert.ok(hook.toLowerCase().includes("anthropic"));
      assert.ok(hook.toLowerCase().includes("revele"));
      assert.ok(hook.length <= 110);
    }
  },
  {
    name: "Gaming sortie",
    run: () => {
      const item = mkItem(
        "GTA 6 : Rockstar confirme une nouvelle date de trailer",
        "Le studio annonce la date officielle pour la prochaine bande-annonce.",
        "gaming"
      );
      const hook = buildHookLine(item, "gaming");
      assert.ok(hook.toLowerCase().includes("gta 6"));
      assert.ok(hook.toLowerCase().includes("confirme"));
      assert.ok(hook.length <= 110);
    }
  },
  {
    name: "Gaming patch",
    run: () => {
      const item = mkItem(
        "Fortnite patch 30.10 publie",
        "Epic publie une update qui corrige plusieurs bugs critiques.",
        "gaming"
      );
      const hook = buildHookLine(item, "gaming");
      assert.ok(hook.toLowerCase().includes("fortnite"));
      assert.ok(/patch|publie|update/.test(hook.toLowerCase()));
      assert.ok(hook.length <= 110);
    }
  }
];

let failures = 0;
for (const test of tests) {
  try {
    test.run();
    console.log(`PASS: ${test.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL: ${test.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`All ${tests.length} hookBuilder tests passed.`);
}
