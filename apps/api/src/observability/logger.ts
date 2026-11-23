import { sanitizePayload, sanitizeString } from "@dental/shared";
import type { FastifyBaseLogger } from "fastify";
import pino, {
	type Bindings,
	type ChildLoggerOptions,
	type DestinationStream,
	type Logger,
	type LoggerOptions,
} from "pino";
import { getHddFastifyLoggerConfig } from "../lib/hddPerformanceConfig.js";

const DEFAULT_SENSITIVE_REDACT_PATHS: readonly string[] = [
	"req.headers.authorization",
	"req.headers.cookie",
	"req.headers['x-csrf-token']",
	"headers.authorization",
	"headers.cookie",
	"password",
	"*.password",
	"secret",
	"*.secret",
	"token",
	"*.token",
	"apiKey",
	"*.apiKey",
	"proxyUrl",
	"*.proxyUrl",
	"raw",
	"*.raw",
];

function extractStreamFromConfig(
	config: ReturnType<typeof getHddFastifyLoggerConfig>,
): DestinationStream | undefined {
	if ("stream" in config && config.stream !== undefined && config.stream !== null) {
		return config.stream as DestinationStream;
	}
	return undefined;
}

function buildStandalonePinoLogger(): Logger {
	const hddConfig = getHddFastifyLoggerConfig();
	const existingPaths = Array.isArray(hddConfig.redact?.paths)
		? hddConfig.redact.paths
		: [];
	const mergedRedactPaths = Array.from(
		new Set([...existingPaths, ...DEFAULT_SENSITIVE_REDACT_PATHS]),
	);

	const level =
		typeof hddConfig.level === "string"
			? hddConfig.level
			: process.env.NODE_ENV === "production"
				? "info"
				: "debug";

	const options: LoggerOptions = {
		level,
		redact: {
			paths: mergedRedactPaths,
			censor: hddConfig.redact?.censor ?? "[скрыто]",
		},
		base: {
			service: "dental-api",
		},
	};

	const stream = extractStreamFromConfig(hddConfig);
	return stream ? pino(options, stream) : pino(options);
}

const standalonePinoLogger: Logger = buildStandalonePinoLogger();
let boundServerLogger: FastifyBaseLogger | null = null;

/**
 * Binds the active Fastify server logger so background workers and services
 * emit structured JSON logs through the unified server pipeline.
 */
export function bindServerLogger(logger: FastifyBaseLogger | null): void {
	boundServerLogger = logger;
}

function resolveBaseLogger(bindings?: Bindings): FastifyBaseLogger {
	const root: FastifyBaseLogger = boundServerLogger ?? standalonePinoLogger;
	if (!bindings || Object.keys(bindings).length === 0) {
		return root;
	}
	return root.child(bindings);
}

function callLogMethod(
	level: "info" | "warn" | "error" | "debug" | "fatal" | "trace",
	bindings: Bindings,
	args: [unknown, ...unknown[]],
): void {
	const target = resolveBaseLogger(bindings);
	switch (level) {
		case "fatal":
			Reflect.apply(target.fatal, target, args);
			break;
		case "error":
			Reflect.apply(target.error, target, args);
			break;
		case "warn":
			Reflect.apply(target.warn, target, args);
			break;
		case "info":
			Reflect.apply(target.info, target, args);
			break;
		case "debug":
			Reflect.apply(target.debug, target, args);
			break;
		case "trace":
			Reflect.apply(target.trace, target, args);
			break;
	}
}

function createDelegatingLogger(bindings: Bindings): FastifyBaseLogger {
	return {
		get level(): string {
			return resolveBaseLogger().level;
		},
		set level(nextLevel: string) {
			resolveBaseLogger().level = nextLevel;
		},
		fatal: (...args: unknown[]) => {
			if (args.length > 0) {
				callLogMethod("fatal", bindings, [args[0], ...args.slice(1)]);
			}
		},
		error: (...args: unknown[]) => {
			if (args.length > 0) {
				callLogMethod("error", bindings, [args[0], ...args.slice(1)]);
			}
		},
		warn: (...args: unknown[]) => {
			if (args.length > 0) {
				callLogMethod("warn", bindings, [args[0], ...args.slice(1)]);
			}
		},
		info: (...args: unknown[]) => {
			if (args.length > 0) {
				callLogMethod("info", bindings, [args[0], ...args.slice(1)]);
			}
		},
		debug: (...args: unknown[]) => {
			if (args.length > 0) {
				callLogMethod("debug", bindings, [args[0], ...args.slice(1)]);
			}
		},
		trace: (...args: unknown[]) => {
			if (args.length > 0) {
				callLogMethod("trace", bindings, [args[0], ...args.slice(1)]);
			}
		},
		silent: (..._args: unknown[]) => undefined,
		child: (
			childBindings: Bindings,
			_options?: ChildLoggerOptions,
		): FastifyBaseLogger =>
			createDelegatingLogger({ ...bindings, ...childBindings }),
	};
}

/**
 * Shared root API logger for background services without a FastifyRequest.
 */
export const apiLogger: FastifyBaseLogger = createDelegatingLogger({});

/**
 * Returns a child Pino/Fastify structured logger bound to a specific backend module.
 */
export function createApiLogger(
	moduleName: string,
	extraBindings?: Bindings,
): FastifyBaseLogger {
	return createDelegatingLogger({
		module: moduleName,
		...(extraBindings ?? {}),
	});
}

const SENSITIVE_QUERY_KEYS = new Set([
	"key",
	"api_key",
	"apikey",
	"token",
	"access_token",
	"auth",
	"password",
	"secret",
]);

/**
 * Strips embedded credentials and sensitive query parameters from URLs before logging.
 */
export function sanitizeUrlCredentials(rawUrl: string): string {
	const trimmed = rawUrl.trim();
	if (!trimmed) return "";
	try {
		const parsed = new URL(trimmed);
		if (parsed.username) parsed.username = "***";
		if (parsed.password) parsed.password = "***";
		for (const key of parsed.searchParams.keys()) {
			if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
				parsed.searchParams.set(key, "***");
			}
		}
		return parsed.toString();
	} catch {
		return sanitizeString(
			trimmed.replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^/@\s]+)@/g, "$1***@"),
		);
	}
}

function redactInlineUrlSecrets(text: string): string {
	return text
		.replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^/@\s]+)@/g, "$1***@")
		.replace(
			/([?&](?:key|api_key|apikey|token|access_token|auth|password|secret)=)([^&\s]+)/gi,
			"$1***",
		);
}

export interface SafeLoggedError {
	name?: string | undefined;
	message: string;
	code?: string | undefined;
}

/**
 * Formats an unknown thrown value into a PII/secret-safe structured error object for Pino.
 */
export function safeLogError(err: unknown): SafeLoggedError {
	if (err instanceof Error) {
		const codeValue =
			"code" in err && typeof (err as { code?: unknown }).code === "string"
				? (err as { code: string }).code
				: undefined;
		return {
			name: err.name,
			message: sanitizeString(redactInlineUrlSecrets(err.message)),
			...(codeValue !== undefined ? { code: codeValue } : {}),
		};
	}
	if (typeof err === "object" && err !== null) {
		const sanitized = sanitizePayload(err as Record<string, unknown>);
		const msg =
			typeof sanitized.message === "string"
				? redactInlineUrlSecrets(sanitized.message)
				: JSON.stringify(sanitized);
		return {
			message: sanitizeString(msg),
		};
	}
	return {
		message: sanitizeString(redactInlineUrlSecrets(String(err))),
	};
}
