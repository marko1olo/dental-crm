/**
 * logger.ts — Structured Logger for MDLP & Chestny Znak Services.
 *
 * Supports fastify logger injection via setMdlpLogger.
 * Defaults to structured console output with ISO timestamps.
 */

import { createApiLogger } from "../../observability/logger.js";

const apiLogger = createApiLogger("mdlp");

export interface MdlpLogger {
	debug: (objOrMsg: unknown, msg?: string) => void;
	info: (objOrMsg: unknown, msg?: string) => void;
	warn: (objOrMsg: unknown, msg?: string) => void;
	error: (objOrMsg: unknown, msg?: string) => void;
}

function toStructuredLogFields(objOrMsg: unknown): Record<string, unknown> {
	if (typeof objOrMsg === "object" && objOrMsg !== null && !Array.isArray(objOrMsg)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(objOrMsg)) {
			out[k] = v;
		}
		return out;
	}
	return { data: objOrMsg };
}

function logToApi(
	method: "debug" | "info" | "warn" | "error",
	objOrMsg: unknown,
	msg?: string,
): void {
	if (typeof objOrMsg === "string") {
		if (msg) {
			apiLogger[method]({ detail: objOrMsg }, msg);
		} else {
			apiLogger[method](objOrMsg);
		}
	} else {
		apiLogger[method](toStructuredLogFields(objOrMsg), msg ?? "");
	}
}

let suppressVerboseLogs = false;

export function configureMdlpLogger(options: { suppressVerbose?: boolean | undefined }): void {
	if (options.suppressVerbose !== undefined) {
		suppressVerboseLogs = options.suppressVerbose;
	}
}

let activeLogger: MdlpLogger = {
	debug: (objOrMsg: unknown, msg?: string) => {
		if (!suppressVerboseLogs) {
			logToApi("debug", objOrMsg, msg);
		}
	},
	info: (objOrMsg: unknown, msg?: string) => {
		if (!suppressVerboseLogs) {
			logToApi("info", objOrMsg, msg);
		}
	},
	warn: (objOrMsg: unknown, msg?: string) => {
		logToApi("warn", objOrMsg, msg);
	},
	error: (objOrMsg: unknown, msg?: string) => {
		logToApi("error", objOrMsg, msg);
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
