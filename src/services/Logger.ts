export class Logger {
  logInfo(category: string, message: string, details?: unknown): void {
    console.info(`[${category}] ${message}`, details ?? '');
  }

  logWarn(category: string, message: string, details?: unknown): void {
    console.warn(`[${category}] ${message}`, details ?? '');
  }

  logError(category: string, message: string, details?: unknown): void {
    console.error(`[${category}] ${message}`, details ?? '');
  }

  logDebug(category: string, message: string, details?: unknown): void {
    console.debug(`[${category}] ${message}`, details ?? '');
  }
}

export const logger = new Logger();
