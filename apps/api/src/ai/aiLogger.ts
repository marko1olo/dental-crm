/**
 * aiLogger.ts — Структурированный логгер для подсистем Clinical Copilot & AI (Мандат 8b, 8bq).
 * Заменяет сырые вызовы console.warn / console.error на JSON-логирование уровня хоста.
 */

export interface AiStructuredLogEntry {
	level: "info" | "warn" | "error";
	scope: string;
	message: string;
	error?: unknown;
	details?: unknown;
	timestamp: string;
}

export interface AiLogger {
	info(scope: string, message: string, details?: unknown): void;
	warn(scope: string, message: string, error?: unknown, details?: unknown): void;
	error(scope: string, message: string, error?: unknown, details?: unknown): void;
}

export const aiLogger: AiLogger = {
	info(scope: string, message: string, details?: unknown): void {
		const entry: AiStructuredLogEntry = {
			level: "info",
			scope,
			message,
			...(details !== undefined ? { details } : {}),
			timestamp: new Date().toISOString(),
		};
		process.stdout.write(`${JSON.stringify(entry)}\n`);
	},

	warn(scope: string, message: string, error?: unknown, details?: unknown): void {
		const entry: AiStructuredLogEntry = {
			level: "warn",
			scope,
			message,
			...(error !== undefined
				? { error: error instanceof Error ? { message: error.message, stack: error.stack } : error }
				: {}),
			...(details !== undefined ? { details } : {}),
			timestamp: new Date().toISOString(),
		};
		process.stderr.write(`${JSON.stringify(entry)}\n`);
	},

	error(scope: string, message: string, error?: unknown, details?: unknown): void {
		const entry: AiStructuredLogEntry = {
			level: "error",
			scope,
			message,
			...(error !== undefined
				? { error: error instanceof Error ? { message: error.message, stack: error.stack } : error }
				: {}),
			...(details !== undefined ? { details } : {}),
			timestamp: new Date().toISOString(),
		};
		process.stderr.write(`${JSON.stringify(entry)}\n`);
	},
};
