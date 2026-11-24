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
	} else if (typeof objOrMsg === "object" && objOrMsg !== null) {
		apiLogger[method](objOrMsg as Record<string, unknown>, msg ?? "");
	} else {
		apiLogger[method]({ data: objOrMsg }, msg ?? "");
	}
}

let activeLogger: MdlpLogger = {
	debug: (objOrMsg: unknown, msg?: string) => {
		if (process.env.NODE_ENV !== "test") {
			logToApi("debug", objOrMsg, msg);
		}
	},
	info: (objOrMsg: unknown, msg?: string) => {
		if (process.env.NODE_ENV !== "test") {
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
