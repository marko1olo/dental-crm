/**
 * DENTE CRM — Fastify HTTP Caching, ETag & 304 Not Modified Plugin
 *
 * Архитектурный плагин кэширования для слабых ПК с медленным HDD (5400 RPM):
 * 1. Автоматическая генерация ETag для статических и полустатических справочников
 *    (номенклатура услуг 804н, классификаторы МКБ-10, клинические шаблоны EMR, согласия).
 * 2. Выставление правильных заголовков Cache-Control (private, max-age=3600, must-revalidate)
 *    и Vary, позволяющих браузеру мгновенно брать неизменные данные из ОЗУ.
 * 3. Поддержка условных запросов (If-None-Match):
 *    - preHandler: мгновенный возврат 304 Not Modified из оперативной памяти БЕЗ вызова
 *      обработчика маршрута и БЕЗ единого запроса к PostgreSQL / диску!
 *    - onSend: сверка вычисленного ETag с If-None-Match и отдача 304 с пустым телом.
 * 4. Автоматическая инвалидация кэша при мутациях (POST/PUT/PATCH/DELETE).
 */

import { createHash } from "node:crypto";
import type {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";

export interface RouteCacheConfig {
	/** Время жизни в кэше браузера в секундах (по умолчанию 3600 — 1 час) */
	maxAge?: number;
	/** Область видимости кэша (по умолчанию private для изоляции арендаторов) */
	scope?: "public" | "private";
	/** Требовать revalidation через If-None-Match (по умолчанию true) */
	mustRevalidate?: boolean;
	/** Дополнительный заголовок immutable для неизменных версий */
	immutable?: boolean;
}

export interface CacheHeadersPluginOptions {
	/** Дефолтный maxAge в секундах для сопоставленных справочников */
	defaultMaxAge?: number;
	/** Дополнительные регулярные выражения маршрутов для кэширования */
	customPatterns?: RegExp[];
	/** Максимальное количество записей в in-memory ETag кэше */
	maxCacheEntries?: number;
	/** TTL записей in-memory ETag в миллисекундах */
	cacheTtlMs?: number;
	/** Полное отключение плагина */
	disabled?: boolean;
}

declare module "fastify" {
	interface FastifyContextConfig {
		/**
		 * Настройки HTTP кэширования для маршрута.
		 * true — включает стандартное кэширование справочника (maxAge: 3600, private).
		 * false — явно отключает кэширование, даже если путь совпадает с паттерном справочников.
		 */
		cache?: RouteCacheConfig | boolean;
	}
}

/**
 * Канонические шаблоны путей статических справочников и классификаторов Dental CRM.
 * Эти данные практически не меняются в ходе смены и их повторное чтение с медленного HDD
 * является критическим источником тормозов и лагов на приёме.
 */
export const DEFAULT_STATIC_CATALOG_PATTERNS: RegExp[] = [
	// Номенклатура медицинских услуг Приказа Минздрава РФ 804н
	/^\/api\/(?:clinical\/)?(?:nomenclature|804n)(?:[/?#]|$)/i,
	// Международный классификатор болезней МКБ-10 (ICD-10) и справочники диагнозов
	/^\/api\/(?:clinical\/)?(?:icd10|icd-10|mkb10|mkb-10|classifiers)(?:[/?#]|$)/i,
	// Клинические протоколы, шаблоны приёма EMR (Форма 043/у) и соматические статусы
	/^\/api\/(?:templates|document-templates|documents\/templates|outpatient\/templates|emr\/templates|somatic(?:-status|-templates)?)(?:[/?#]|$)/i,
	// Прайс-листы и каталог стоматологических услуг
	/^\/api\/(?:catalog|price-lists|settings\/price)(?:[/?#]|$)/i,
	// Сотрудники и врачи клиники
	/^\/api\/(?:settings\/staff|hr\/doctors)(?:[/?#]|$)/i,
	// Структура клиники, кресла и филиалы
	/^\/api\/(?:settings\/clinic|settings\/branches|workspace\/profile)(?:[/?#]|$)/i,
	// Пользовательские типы задач CRM и справочники этапов
	/^\/api\/crm\/custom(?:-crm)?-task-types(?:[/?#]|$)/i,
	// Справочники определений клинических правил
	/^\/api\/clinical\/rules(?:[/?#]|$)/i,
	// Справочник завершений клинических фаз
	/^\/api\/clinical\/phase-completions(?:[/?#]|$)/i,
	// Справочники фильтров аналитики и удержания
	/^\/api\/analytics\/lost-patients-filters(?:[/?#]|$)/i,
	// Справочники фармакологии и матрица совместимости препаратов
	/^\/api\/pharmacology\/(?:references|interactions-matrix)(?:[/?#]|$)/i,
	// Нормативы СанПиН и справочники стерилизации
	/^\/api\/sanpin\/references(?:[/?#]|$)/i,
	// Системные словари
	/^\/api\/system\/(?:dictionaries|single-session-enforcements)(?:[/?#]|$)/i,
];

interface ETagCacheEntry {
	etag: string;
	maxAge: number;
	scope: "public" | "private";
	mustRevalidate: boolean;
	cachedAt: number;
}

// In-memory таблица вычисленных ETag для быстрого 304 без обращения к СУБД
const etagMemoryCache = new Map<string, ETagCacheEntry>();
let cacheHitsCount = 0;
let cacheMissesCount = 0;

/**
 * Генерация компактного быстрого ETag с использованием sha1 и base64url.
 * Слабый ETag W/"..." стандартен для JSON payload, гарантируя семантическую эквивалентность.
 */
export function generateEtag(payload: string | Buffer): string {
	const hash = createHash("sha1").update(payload).digest("base64url");
	return `W/"${hash}"`;
}

/**
 * Проверка соответствия заголовка клиента If-None-Match текущему ETag.
 * Корректно нормализует слабые префиксы W/ и кавычки, а также списки через запятую.
 */
export function matchesEtag(
	clientHeader: string | undefined,
	currentEtag: string,
): boolean {
	if (!clientHeader || typeof clientHeader !== "string") {
		return false;
	}
	const trimmed = clientHeader.trim();
	if (trimmed === "*") {
		return true;
	}

	const normalize = (tag: string) =>
		tag.trim().replace(/^W\//i, "").replace(/^"|"$/g, "");

	const target = normalize(currentEtag);
	const tags = trimmed.split(",").map(normalize);

	return tags.includes(target);
}

/**
 * Определение ключа изоляции арендатора из запроса.
 */
function extractTenantId(request: FastifyRequest): string {
	const _req = request as unknown as Record<string, unknown>;
	if (typeof _req.tenantId === "string" && _req.tenantId.length > 0) {
		return _req.tenantId;
	}
	const identity = _req.user as { organizationId?: string | null } | undefined;
	if (identity?.organizationId) {
		return identity.organizationId;
	}
	const headerOrg = request.headers["x-organization-id"];
	if (typeof headerOrg === "string" && headerOrg.trim()) {
		return headerOrg.trim();
	}
	return "global";
}

/**
 * Проверка, подлежит ли данный маршрут HTTP-кэшированию справочников.
 */
export function isRouteCacheable(
	request: FastifyRequest,
	patterns: RegExp[],
): { cacheable: boolean; config: RouteCacheConfig } {
	// Кэшируются строго безопасные идемпотентные методы GET и HEAD
	if (request.method !== "GET" && request.method !== "HEAD") {
		return { cacheable: false, config: {} };
	}

	const routeConfig = request.routeOptions.config?.cache;

	// Явный запрет в конфигурации маршрута
	if (routeConfig === false) {
		return { cacheable: false, config: {} };
	}

	// Явное включение в конфигурации маршрута
	if (routeConfig === true) {
		return {
			cacheable: true,
			config: { maxAge: 3600, scope: "private", mustRevalidate: true },
		};
	}

	if (typeof routeConfig === "object" && routeConfig !== null) {
		return {
			cacheable: true,
			config: {
				maxAge: routeConfig.maxAge ?? 3600,
				scope: routeConfig.scope ?? "private",
				mustRevalidate: routeConfig.mustRevalidate ?? true,
				immutable: routeConfig.immutable ?? false,
			},
		};
	}

	// Проверка по каноническим шаблонам URL
	const urlPath = request.url.split("?")[0] || "";
	const matchesPattern = patterns.some((pattern) => pattern.test(urlPath));

	if (matchesPattern) {
		return {
			cacheable: true,
			config: { maxAge: 3600, scope: "private", mustRevalidate: true },
		};
	}

	return { cacheable: false, config: {} };
}

/**
 * Построение заголовка Cache-Control.
 */
export function buildCacheControlHeader(config: RouteCacheConfig): string {
	const parts: string[] = [config.scope ?? "private"];
	const maxAge = config.maxAge ?? 3600;
	parts.push(`max-age=${maxAge}`);

	if (config.mustRevalidate !== false) {
		parts.push("must-revalidate");
	}
	if (config.immutable === true) {
		parts.push("immutable");
	}

	return parts.join(", ");
}

/**
 * Сброс in-memory ETag кэша по шаблону пути и/или tenantId.
 */
export function invalidateCache(
	pathPattern?: string | RegExp,
	tenantId?: string,
): number {
	let deletedCount = 0;
	for (const [key] of etagMemoryCache.entries()) {
		const [entryTenant, , entryPath] = key.split("::");

		if (tenantId && entryTenant !== tenantId) {
			continue;
		}

		if (pathPattern) {
			if (typeof pathPattern === "string" && !entryPath?.includes(pathPattern)) {
				continue;
			}
			if (pathPattern instanceof RegExp && !pathPattern.test(entryPath ?? "")) {
				continue;
			}
		}

		etagMemoryCache.delete(key);
		deletedCount++;
	}
	return deletedCount;
}

/**
 * Полная очистка in-memory ETag кэша.
 */
export function clearAllCache(): void {
	etagMemoryCache.clear();
	cacheHitsCount = 0;
	cacheMissesCount = 0;
}

/**
 * Получение телеметрии кэша.
 */
export function getCacheStats() {
	return {
		entriesCount: etagMemoryCache.size,
		hits: cacheHitsCount,
		misses: cacheMissesCount,
	};
}

const cacheHeadersPluginAsync: FastifyPluginAsync<
	CacheHeadersPluginOptions
> = async (app: FastifyInstance, opts: CacheHeadersPluginOptions = {}) => {
	if (opts.disabled) {
		return;
	}

	const patterns = [
		...DEFAULT_STATIC_CATALOG_PATTERNS,
		...(opts.customPatterns ?? []),
	];
	const maxEntries = opts.maxCacheEntries ?? 500;
	const ttlMs = opts.cacheTtlMs ?? 3600 * 1000;

	// ХУК 1: preHandler — Fast-path для 304 Not Modified
	// Если клиент передал If-None-Match и у нас есть актуальный ETag в памяти:
	// СРАЗУ возвращаем 304 без выполнения обработчика маршрута и БЕЗ запросов к PostgreSQL!
	app.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
		const { cacheable, config } = isRouteCacheable(request, patterns);
		if (!cacheable) {
			return;
		}

		const clientIfNoneMatch = request.headers["if-none-match"];
		if (!clientIfNoneMatch) {
			return;
		}

		const tenantId = extractTenantId(request);
		const cacheKey = `${tenantId}::${request.method}::${request.url}`;
		const entry = etagMemoryCache.get(cacheKey);

		if (entry && Date.now() - entry.cachedAt < ttlMs) {
			if (matchesEtag(clientIfNoneMatch, entry.etag)) {
				cacheHitsCount++;
				const cacheControl = buildCacheControlHeader(config);

				reply
					.code(304)
					.header("ETag", entry.etag)
					.header("Cache-Control", cacheControl)
					.header(
						"Vary",
						"Accept-Encoding, Authorization, x-organization-id",
					)
					.send();
				return reply;
			}
		}
	});

	// ХУК 2: onSend — Расчет ETag, сохранение в память и установка Cache-Control
	app.addHook("onSend", async (request: FastifyRequest, reply: FastifyReply, payload) => {
		// Для уже сформированного 304 ответа не пересчитываем ETag и отдаем пустое тело
		if (reply.statusCode === 304) {
			return "";
		}

		const { cacheable, config } = isRouteCacheable(request, patterns);
		if (!cacheable) {
			return payload;
		}

		// Кэшируем только успешные ответы 2xx
		if (reply.statusCode < 200 || reply.statusCode >= 300) {
			return payload;
		}

		// Вычисляем ETag от строкового или Buffer тела
		if (typeof payload === "string" || Buffer.isBuffer(payload)) {
			const etag = generateEtag(payload);
			const cacheControl = buildCacheControlHeader(config);
			const tenantId = extractTenantId(request);
			const cacheKey = `${tenantId}::${request.method}::${request.url}`;

			// Сохраняем в in-memory таблицу с контролем размера (LRU / FIFO)
			if (etagMemoryCache.size >= maxEntries) {
				const firstKey = etagMemoryCache.keys().next().value;
				if (firstKey) {
					etagMemoryCache.delete(firstKey);
				}
			}

			etagMemoryCache.set(cacheKey, {
				etag,
				maxAge: config.maxAge ?? 3600,
				scope: config.scope ?? "private",
				mustRevalidate: config.mustRevalidate ?? true,
				cachedAt: Date.now(),
			});

			reply.header("ETag", etag);
			reply.header("Cache-Control", cacheControl);
			reply.header(
				"Vary",
				"Accept-Encoding, Authorization, x-organization-id",
			);

			// Сверяем с If-None-Match клиента
			const clientIfNoneMatch = request.headers["if-none-match"];
			if (clientIfNoneMatch && matchesEtag(clientIfNoneMatch, etag)) {
				cacheHitsCount++;
				reply.code(304);
				return "";
			}

			cacheMissesCount++;
		}

		return payload;
	});

	// ХУК 3: onResponse — Автоматическая инвалидация кэша справочников при мутациях
	app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
		const method = request.method;
		// Если это успешная мутация (POST, PUT, PATCH, DELETE)
		if (
			method !== "GET" &&
			method !== "HEAD" &&
			reply.statusCode >= 200 &&
			reply.statusCode < 400
		) {
			const tenantId = extractTenantId(request);
			const urlPath = request.url.split("?")[0] || "";

			// Если мутация затрагивает шаблоны или справочники — сбрасываем кэш этого ресурса
			if (
				urlPath.includes("/templates") ||
				urlPath.includes("/classifiers") ||
				urlPath.includes("/nomenclature") ||
				urlPath.includes("/custom-task-types") ||
				urlPath.includes("/somatic") ||
				urlPath.includes("/document-templates") ||
				urlPath.includes("/settings/price") ||
				urlPath.includes("/catalog") ||
				urlPath.includes("/price-lists") ||
				urlPath.includes("/settings/staff") ||
				urlPath.includes("/settings/clinic") ||
				urlPath.includes("/clinical/rules") ||
				urlPath.includes("/clinical/phase-completions")
			) {
				const prefix = urlPath.replace(/\/[0-9a-f-]+$/i, "");
				invalidateCache(prefix, tenantId);
			}
		}
	});
};

export const cacheHeadersPlugin = fp(cacheHeadersPluginAsync, {
	name: "dente-cache-headers-plugin",
	fastify: "5.x",
});
