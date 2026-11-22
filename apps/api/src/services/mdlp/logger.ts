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

let activeLogger: MdlpLogger = {
	debug: (objOrMsg: unknown, msg?: string) => {
		if (process.env.NODE_ENV !== "test") {
			// eslint-disable-next-line no-console
			console.debug(`[${new Date().toISOString()}] [MDLP]`, msg ?? "", objOrMsg);
		}
	},
	info: (objOrMsg: unknown, msg?: string) => {
		if (process.env.NODE_ENV !== "test") {
			// eslint-disable-next-line no-console
			console.info(`[${new Date().toISOString()}] [MDLP]`, msg ?? "", objOrMsg);
		}
	},
	warn: (objOrMsg: unknown, msg?: string) => {
		// eslint-disable-next-line no-console
		console.warn(`[${new Date().toISOString()}] [MDLP WARN]`, msg ?? "", objOrMsg);
	},
	error: (objOrMsg: unknown, msg?: string) => {
		// eslint-disable-next-line no-console
		console.error(`[${new Date().toISOString()}] [MDLP ERROR]`, msg ?? "", objOrMsg);
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
