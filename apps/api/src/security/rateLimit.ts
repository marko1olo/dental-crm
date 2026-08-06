/**
 * rateLimit.ts — ограничение частоты запросов без внешних зависимостей.
 *
 * ПОЧЕМУ НЕ @fastify/rate-limit
 * В routes/auth.ts стоял `config: { rateLimit: { max: 100, timeWindow: "1 minute" } }`,
 * но плагин @fastify/rate-limit не установлен в apps/api/package.json — значит эта
 * конфигурация ничего не делала, и логин клиники можно было брутфорсить без ограничений
 * (тест authRateLimit.test.ts падал по той же причине). Этот модуль даёт рабочий
 * лимитер на чистом Node, не требуя `npm install`.
 *
 * МОДЕЛЬ
 *  - Ключ: IP + метод + маршрут.
 *  - Окно фиксированное; при превышении — 429 с заголовком Retry-After.
 *  - Успешный вход сбрасывает счётчик (resetRateLimit), поэтому персонал клиники
 *    за одним NAT не блокирует сам себя, а перебор паролей всё равно упирается в лимит.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface RateLimitRule {
	/** Максимум запросов в окне. */
	max: number;
	/** Длина окна в миллисекундах либо строка вида "1 minute". */
	timeWindow: number | string;
}

interface Bucket {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Максимум ключей в памяти — защита от роста при распределённом переборе. */
const MAX_TRACKED_KEYS = 20_000;

function parseWindowMs(timeWindow: number | string): number {
	if (typeof timeWindow === "number") return timeWindow;
	const match =
		/^(\d+)\s*(ms|milliseconds?|s|seconds?|m|minutes?|h|hours?)?$/i.exec(
			timeWindow.trim(),
		);
	if (!match) return 60_000;
	const amount = Number(match[1]);
	const unit = (match[2] ?? "ms").toLowerCase();
	if (unit.startsWith("h")) return amount * 3_600_000;
	if (unit.startsWith("m") && !unit.startsWith("ms") && unit !== "milliseconds")
		return amount * 60_000;
	if (unit.startsWith("s")) return amount * 1_000;
	return amount;
}

function pruneExpired(now: number): void {
	if (buckets.size < MAX_TRACKED_KEYS) return;
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
		if (buckets.size < MAX_TRACKED_KEYS / 2) break;
	}
	// Если после очистки всё ещё переполнено — сбрасываем всё, чтобы не течь по памяти.
	if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
}

function clientKey(request: FastifyRequest): string {
	const routeId =
		(request as unknown as { routeOptions?: { url?: string } }).routeOptions
			?.url ?? request.url;
	return `${request.ip ?? "unknown"}|${request.method}|${routeId}`;
}

/**
 * Маршруты, для которых лимит включён по умолчанию, даже если у обработчика
 * нет собственного `config.rateLimit`. Публичные и аутентификационные точки входа.
 */
const DEFAULT_RULES: Array<{ test: RegExp; rule: RateLimitRule }> = [
	// Подбор пароля кабинета / PIN сотрудника / пароля пользователя.
	{
		test: /^\/api\/auth\/(clinic\/login|staff\/unlock|login)$/,
		rule: { max: 5, timeWindow: "1 minute" },
	},
	// Создание организаций и приглашений — защита от массовой регистрации.
	{
		test: /^\/api\/auth\/(register|setup\/init|invites\/accept)$/,
		rule: { max: 10, timeWindow: "1 minute" },
	},
	// Смена собственных учётных данных — защита от перебора старого пароля/PIN.
	{
		test: /^\/api\/auth\/user\/update-(password|pin)$/,
		rule: { max: 10, timeWindow: "1 minute" },
	},
	// Административная смена чужих учётных данных.
	{
		test: /^\/api\/auth\/(clinic\/set-password|staff\/set-pin)$/,
		rule: { max: 10, timeWindow: "1 minute" },
	},
	// Публичная запись на приём и портал пациента.
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

/**
 * Сбрасывает счётчик для текущего запроса. Вызывайте после успешной аутентификации,
 * чтобы легитимные пользователи не накапливали лимит.
 */
export function resetRateLimit(request: FastifyRequest): void {
	buckets.delete(clientKey(request));
}

/** Только для тестов: полностью очистить состояние лимитера. */
export function clearRateLimitState(): void {
	buckets.clear();
}

export function registerRateLimiting(app: FastifyInstance): void {
	app.addHook(
		"onRequest",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const rule = resolveRule(request);
			if (!rule) return;

			const now = Date.now();
			pruneExpired(now);

			const key = clientKey(request);
			const windowMs = parseWindowMs(rule.timeWindow);
			const existing = buckets.get(key);

			if (!existing || existing.resetAt <= now) {
				buckets.set(key, { count: 1, resetAt: now + windowMs });
				reply.header("x-ratelimit-limit", String(rule.max));
				reply.header(
					"x-ratelimit-remaining",
					String(Math.max(0, rule.max - 1)),
				);
				return;
			}

			existing.count += 1;
			const remaining = Math.max(0, rule.max - existing.count);
			reply.header("x-ratelimit-limit", String(rule.max));
			reply.header("x-ratelimit-remaining", String(remaining));

			if (existing.count > rule.max) {
				const retryAfterSeconds = Math.max(
					1,
					Math.ceil((existing.resetAt - now) / 1000),
				);
				reply.header("retry-after", String(retryAfterSeconds));
				reply.code(429).send({
					error: "TooManyRequests",
					message: "Слишком много запросов. Повторите попытку позже.",
				});
				return reply;
			}
		},
	);
}
