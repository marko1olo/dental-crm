/**
 * logger.ts — Structured Logger for MDLP & Chestny Znak Services.
 *
 * Supports fastify logger injection via setMdlpLogger.
 * Defaults to structured console output with ISO timestamps.
 */

export interface MdlpLogger {
	debug: (objOrMsg: unknown, msg?: string) => void;
	info: (objOrMsg: unknown, msg?: string) => void;
	warn: (objOrMsg: unknown, msg?: string) => void;
	error: (objOrMsg: unknown, msg?: string) => void;
}

function formatMdlpLogLine(
	level: "DEBUG" | "INFO" | "WARN" | "ERROR",
	objOrMsg: unknown,
	msg?: string,
): string {
	const prefix =
		level === "WARN" || level === "ERROR" ? `[MDLP ${level}]` : "[MDLP]";
	const payload =
		typeof objOrMsg === "string"
			? objOrMsg
			: (() => {
					try {
						return JSON.stringify(objOrMsg);
					} catch {
						return String(objOrMsg);
					}
				})();
	const text = msg ? `${msg} ${payload}` : payload;
	return `[${new Date().toISOString()}] ${prefix} ${text}\n`;
}

let activeLogger: MdlpLogger = {
	debug: (objOrMsg: unknown, msg?: string) => {
		if (process.env.NODE_ENV !== "test") {
			process.stdout.write(formatMdlpLogLine("DEBUG", objOrMsg, msg));
		}
	},
	info: (objOrMsg: unknown, msg?: string) => {
		if (process.env.NODE_ENV !== "test") {
			process.stdout.write(formatMdlpLogLine("INFO", objOrMsg, msg));
		}
	},
	warn: (objOrMsg: unknown, msg?: string) => {
		process.stderr.write(formatMdlpLogLine("WARN", objOrMsg, msg));
	},
	error: (objOrMsg: unknown, msg?: string) => {
		process.stderr.write(formatMdlpLogLine("ERROR", objOrMsg, msg));
	},
};

export function setMdlpLogger(customLogger: MdlpLogger): void {
	activeLogger = customLogger;
}

export const mdlpLogger: MdlpLogger = {
	debug: (objOrMsg: unknown, msg?: string) => activeLogger.debug(objOrMsg, msg),
	info: (objOrMsg: unknown, msg?: string) => activeLogger.info(objOrMsg, msg),
	warn: (objOrMsg: unknown, msg?: string) => activeLogger.warn(objOrMsg, msg),
	error: (objOrMsg: unknown, msg?: string) => activeLogger.error(objOrMsg, msg),
};
