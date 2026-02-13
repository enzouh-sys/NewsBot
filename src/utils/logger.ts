type LogLevel = "INFO" | "WARN" | "ERROR";

function log(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  if (meta === undefined) {
    console.log(`[${timestamp}] [${level}] ${message}`);
    return;
  }
  console.log(`[${timestamp}] [${level}] ${message}`, meta);
}

export const logger = {
  info: (message: string, meta?: unknown) => log("INFO", message, meta),
  warn: (message: string, meta?: unknown) => log("WARN", message, meta),
  error: (message: string, meta?: unknown) => log("ERROR", message, meta)
};
