import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";

export interface RateLimitRule {
	max: number;
	timeWindow: number | string;
	hook?: "onRequest" | "preParsing" | "preValidation" | "preHandler";
	keyGenerator?: (request: FastifyRequest) => string | Promise<string>;
}

declare module "fastify" {
	interface FastifyContextConfig {
		rateLimit?: RateLimitRule | false | undefined;
	}
}

function extractNormalizedPhoneSuffix(req: FastifyRequest): string {
	const body = req.body as { phone?: unknown } | undefined;
	const rawPhone =
		typeof body?.phone === "string" ? body.phone.trim().replace(/\D/g, "") : "";
	return rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone || "no-phone";
}

const DEFAULT_FALLBACK_MAX_PER_MIN = 600;

const RATE_LIMIT_EXEMPT_PATH = /^\/api\/(health|system\/health|lan\/)/;

const DEFAULT_RULES: Array<{ test: RegExp; rule: RateLimitRule }> = [
	{
		test: /^\/api\/auth\/(clinic\/login|staff\/unlock|login)$/,
		rule: { max: 5, timeWindow: "1 minute" },
	},
	{
		test: /^\/api\/auth\/(register|setup\/init|invites\/accept)$/,
		rule: { max: 10, timeWindow: "1 minute" },
	},
	{
		test: /^\/api\/auth\/user\/update-(password|pin)$/,
		rule: { max: 10, timeWindow: "1 minute" },
	},
	{
		test: /^\/api\/auth\/(clinic\/set-password|staff\/set-pin)$/,
		rule: { max: 10, timeWindow: "1 minute" },
	},
	{
		test: /^\/api\/portal\/auth\/send-otp$/,
		rule: {
			max: 5,
			timeWindow: "1 minute",
			hook: "preHandler",
			keyGenerator: (req) =>
				`portal-otp|${req.ip ?? "unknown"}|${extractNormalizedPhoneSuffix(req)}`,
		},
	},
	{
		test: /^\/api\/portal\/auth\/verify-otp$/,
		rule: {
			max: 10,
			timeWindow: "1 minute",
			hook: "preHandler",
			keyGenerator: (req) =>
				`portal-verify-otp|${req.ip ?? "unknown"}|${extractNormalizedPhoneSuffix(req)}`,
		},
	},
	{ test: /^\/api\/public\//, rule: { max: 30, timeWindow: "1 minute" } },
	{ test: /^\/api\/portal\//, rule: { max: 30, timeWindow: "1 minute" } },
	{
		test: /^\/api\/(imports|migration|backup|settings\/backup|imaging\/upload|ai)\//,
		rule: { max: 120, timeWindow: "1 minute" },
	},
	{
		test: /^\/api\/(analytics|reports)\//,
		rule: { max: 240, timeWindow: "1 minute" },
	},
];

function matchDefaultRule(url: string): RateLimitRule | null {
	for (const entry of DEFAULT_RULES) {
		if (entry.test.test(url)) return entry.rule;
	}
	return null;
}

function resolveRule(request: FastifyRequest): RateLimitRule | null {
	const routeConfig = request.routeOptions?.config?.rateLimit;
	if (routeConfig === false) return null;
	if (routeConfig && typeof routeConfig.max === "number") return routeConfig;

	const url = request.routeOptions?.url ?? request.url.split("?")[0] ?? "";
	return matchDefaultRule(url);
}

function clientKey(request: FastifyRequest): string {
	const rule = resolveRule(request);
	if (rule?.keyGenerator) {
		const customKey = rule.keyGenerator(request);
		if (typeof customKey === "string") return customKey;
	}
	const routeId = request.routeOptions?.url ?? request.url;
	return `${request.ip ?? "unknown"}|${request.method}|${routeId}`;
}

export function resetRateLimit(_request: FastifyRequest): void {
	// With @fastify/rate-limit, we can clear the internal store if needed, but since our limits
	// are 1 minute, letting them naturally expire is fine for auth actions in most cases.
}

function _clearRateLimitState(): void {
	// No-op for the external store.
}

export function registerRateLimiting(app: FastifyInstance): void {
	// Пробрасываем hook (например preHandler для req.body/OTP) в config.rateLimit ДО регистрации @fastify/rate-limit,
	// иначе @fastify/rate-limit повесит лимитер на onRequest, где body ещё не распарсен.
	app.addHook("onRoute", (routeOptions) => {
		const config = (routeOptions.config ??= {});
		if (config.rateLimit !== undefined) return;
		const matched = matchDefaultRule(routeOptions.url);
		if (matched?.hook) {
			config.rateLimit = matched;
		}
	});

	app.register(fastifyRateLimit, {
		global: true,
		timeWindow: 60000,
		allowList: (req) => {
			if (req.routeOptions?.config?.rateLimit === false) return true;
			const url = req.routeOptions?.url ?? req.url.split("?")[0] ?? "";
			return RATE_LIMIT_EXEMPT_PATH.test(url);
		},
		keyGenerator: (req) => clientKey(req),
		max: (req) => {
			const rule = resolveRule(req);
			return rule ? rule.max : DEFAULT_FALLBACK_MAX_PER_MIN;
		},
		errorResponseBuilder: (_req, _context) => {
			return {
				statusCode: 429,
				error: "TooManyRequests",
				message: "Слишком много запросов. Пожалуйста, подождите.",
			};
		},
	});
}
