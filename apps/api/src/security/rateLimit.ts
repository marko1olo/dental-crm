import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";

export interface RateLimitRule {
	max: number;
	timeWindow: number | string;
	hook?: "onRequest" | "preParsing" | "preValidation" | "preHandler";
	keyGenerator?: (request: FastifyRequest) => string | Promise<string>;
}

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
			keyGenerator: (req) => {
				const ip = req.ip ?? "unknown";
				const body = req.body as { phone?: unknown } | undefined;
				const rawPhone =
					typeof body?.phone === "string" ? body.phone.trim().replace(/\D/g, "") : "";
				const phoneSuffix =
					rawPhone.length >= 10 ? rawPhone.slice(-10) : (rawPhone || "no-phone");
				return `portal-otp|${ip}|${phoneSuffix}`;
			},
		},
	},
	{ test: /^\/api\/public\//, rule: { max: 30, timeWindow: "1 minute" } },
	{ test: /^\/api\/portal\//, rule: { max: 30, timeWindow: "1 minute" } },
];

function resolveRule(request: FastifyRequest): RateLimitRule | null {
	const routeConfig = (
		request as unknown as {
			routeOptions?: { config?: { rateLimit?: RateLimitRule | false } };
		}
	).routeOptions?.config?.rateLimit;
	if (routeConfig === false) return null;
	if (routeConfig && typeof routeConfig.max === "number") return routeConfig;

	const url =
		(request as unknown as { routeOptions?: { url?: string } }).routeOptions
			?.url ??
		request.url.split("?")[0] ??
		"";
	for (const entry of DEFAULT_RULES) {
		if (entry.test.test(url)) return entry.rule;
	}
	return null;
}

function clientKey(request: FastifyRequest): string {
	const rule = resolveRule(request);
	if (rule?.keyGenerator) {
		const customKey = rule.keyGenerator(request);
		if (typeof customKey === "string") return customKey;
	}
	const routeId =
		(request as unknown as { routeOptions?: { url?: string } }).routeOptions
			?.url ?? request.url;
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
	app.register(fastifyRateLimit, {
		global: true,
		timeWindow: 60000,
		keyGenerator: (req) => {
			const rule = resolveRule(req);
			if (!rule) {
				// To skip rate limiting, we can return a dummy key and set max extremely high,
				// since keyGenerator must return a string/number in older fastify-rate-limit types
				return "";
			}
			return clientKey(req);
		},
		max: (req, key) => {
			if (!key) return 1000000;
			const rule = resolveRule(req);
			return rule ? rule.max : 1000000;
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
