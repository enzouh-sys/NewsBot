import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "./utils/logger.js";

type CacheFile = {
  seen: Record<string, string>;
};

const CACHE_DIR = path.resolve(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "seen-links.json");
const RETENTION_DAYS = 7;

export class LinkCache {
  private seen = new Map<string, number>();

  async init(): Promise<void> {
    await mkdir(CACHE_DIR, { recursive: true });

    try {
      const raw = await readFile(CACHE_FILE, "utf8");
      const parsed = JSON.parse(raw) as CacheFile;
      for (const [url, isoDate] of Object.entries(parsed.seen ?? {})) {
        const ts = Date.parse(isoDate);
        if (Number.isFinite(ts)) {
          this.seen.set(url, ts);
        }
      }
    } catch {
      logger.info("No existing cache file found. Starting with empty cache.");
    }

    this.cleanup();
    await this.persist();
  }

  has(url: string): boolean {
    return this.seen.has(url);
  }

  add(url: string, isoDate: string): void {
    const ts = Date.parse(isoDate);
    this.seen.set(url, Number.isFinite(ts) ? ts : Date.now());
  }

  cleanup(): void {
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - maxAgeMs;
    for (const [url, ts] of this.seen.entries()) {
      if (ts < cutoff) {
        this.seen.delete(url);
      }
    }
  }

  async persist(): Promise<void> {
    const out: CacheFile = { seen: {} };
    for (const [url, ts] of this.seen.entries()) {
      out.seen[url] = new Date(ts).toISOString();
    }
    await writeFile(CACHE_FILE, JSON.stringify(out, null, 2), "utf8");
  }
}
