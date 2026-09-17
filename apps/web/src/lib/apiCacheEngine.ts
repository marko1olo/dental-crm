/**
 * apiCacheEngine.ts — высокопроизводительный in-memory кэш справочников и каталогов против троттлинга HDD.
 *
 * ЗАЧЕМ ЭТО НУЖНО:
 * В стоматологической практике врач или администратор непрерывно переключается между
 * расписанием, амбулаторной картой 043/у, счетами и справочниками.
 * При каждом переходе интерфейс запрашивает:
 * - Номенклатуру услуг Минздрава 804н (тысячи позиций)
 * - Справочник МКБ-10 (диагнозы)
 * - Прейскуранты и услуги клиники
 * - Структуру клиники, кресла, филиалы
 * - Список врачей и ассистентов
 *
 * Без кэша эти запросы либо непрерывно дергают сеть, либо при попытке кэшировать их в
 * localStorage / IndexedDB забивают диск синхронными операциями и вызывают 100% HDD Thrashing.
 *
 * РЕШЕНИЕ:
 * 1. Чистый In-Memory LRU кэш (0 мс доступ, 0 байт дискового I/O).
 * 2. Request Coalescing (дедупликация параллельных запросов): если 3 компонента
 *    одновременно запросили список врачей при открытии смены, уходит ровно 1 сетевой запрос.
 * 3. Автоматическая инвалидация при мутациях (POST/PUT/PATCH/DELETE) в смежных маршрутах.
 * 4. Уважение директив Cache-Control: 'no-store' / 'no-cache'.
 */

import {
	createMemoryLruCache,
	estimateObjectByteSize,
	getOptimizedTiming,
	MemoryLruCache,
} from "../utils/lowSpecHddOptimizer";

export interface CachedApiResponse<T = unknown> {
	readonly data: T;
	readonly status: number;
	readonly statusText: string;
	readonly headers: Record<string, string>;
	readonly url: string;
	readonly timestamp: number;
	readonly ttlMs: number | null;
}

export interface CatalogCacheRule {
	readonly id: string;
	readonly pattern: RegExp;
	readonly defaultTtlMs: number;
	readonly description: string;
}

export interface MutationInvalidationRule {
	readonly mutationPattern: RegExp;
	readonly invalidatePatterns: readonly RegExp[];
}

export interface CachedFetchOptions {
	/** Индивидуальное время жизни записи в миллисекундах (null = бессрочно) */
	readonly ttlMs?: number | null;
	/** Принудительное обновление кэша (игнорирует существующую запись) */
	readonly forceRefresh?: boolean;
	/** Полный обход кэша без сохранения результата */
	readonly bypassCache?: boolean;
	/** Пользовательский ключ кэша (по умолчанию используется нормализованный URL) */
	readonly cacheKey?: string;
}

export interface ApiCacheStats {
	/** Количество попаданий в кэш (0 мс) */
	readonly hits: number;
	/** Количество промахов кэша (обращений к сети) */
	readonly misses: number;
	/** Количество дедуплицированных параллельных запросов (coalesced) */
	readonly coalescedRequests: number;
	/** Количество инвалидированных записей */
	readonly invalidations: number;
	/** Текущее количество параллельных запросов в полете */
	readonly inFlightCount: number;
	/** Текущее количество записей в оперативной памяти */
	readonly cachedEntriesCount: number;
	/** Текущий объем кэша в оперативной памяти (в байтах) */
	readonly cachedBytesCount: number;
	/** Максимальный лимит размера кэша в байтах (не более 50 МБ на слабом ПК) */
	readonly maxCacheBytes: number;
}

/**
 * Канонические правила кэширования регламентных стоматологических справочников.
 */
export const STATUTORY_CATALOG_RULES: readonly CatalogCacheRule[] = [
	{
		id: "nomenclature-804n",
		pattern: /^\/api\/(?:clinical\/)?(?:nomenclature|804n)(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут — эталон Минздрава меняется крайне редко
		description: "Номенклатура медицинских услуг Минздрава 804н",
	},
	{
		id: "icd10-diagnosis",
		pattern: /^\/api\/(?:clinical\/)?(?:icd10|icd-10|mkb10|mkb-10|classifiers)(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут — справочник МКБ-10
		description: "Справочник диагнозов МКБ-10",
	},
	{
		id: "clinical-somatic-templates",
		pattern: /^\/api\/(?:templates|document-templates|emr\/templates|somatic(?:-status|-templates)?)(?:\/|\?|$)/i,
		defaultTtlMs: 20 * 60 * 1000, // 20 минут — клинические протоколы, шаблоны 043/у и соматические статусы
		description: "Клинические протоколы, шаблоны 043/у, соматические статусы и ИДС",
	},
	{
		id: "catalog-services-pricelists",
		pattern: /^\/api\/(?:catalog|price-lists|settings\/price)(?:\/|\?|$)/i,
		defaultTtlMs: 10 * 60 * 1000, // 10 минут
		description: "Прайс-листы клиники и каталог стоматологических услуг",
	},
	{
		id: "clinic-staff-doctors",
		pattern: /^\/api\/(?:settings\/staff|hr\/doctors)(?:\/|\?|$)/i,
		defaultTtlMs: 5 * 60 * 1000, // 5 минут
		description: "Список сотрудников и расписание врачей клиники",
	},
	{
		id: "clinic-structure-workspace",
		pattern: /^\/api\/(?:settings\/clinic|settings\/branches|workspace\/profile)(?:\/|\?|$)/i,
		defaultTtlMs: 5 * 60 * 1000, // 5 минут
		description: "Структура клиники, филиалы, кресла и профиль кабинета",
	},
	{
		id: "clinical-task-types",
		pattern: /^\/api\/crm\/custom-task-types(?:\/|\?|$)/i,
		defaultTtlMs: 10 * 60 * 1000, // 10 минут
		description: "Пользовательские типы клинических задач",
	},
	{
		id: "clinical-rules-definitions",
		pattern: /^\/api\/clinical\/rules(?:\?|$)/i,
		defaultTtlMs: 10 * 60 * 1000, // 10 минут (только определения правил, не вычисление evaluate)
		description: "Определения клинических правил и протоколов",
	},
	{
		id: "clinical-phase-completions",
		pattern: /^\/api\/clinical\/phase-completions(?:\/|\?|$)/i,
		defaultTtlMs: 5 * 60 * 1000, // 5 минут
		description: "Справочник завершений клинических фаз",
	},
	{
		id: "pharmacology-references",
		pattern: /^\/api\/pharmacology\/(?:references|interactions-matrix)(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут
		description: "Справочники фармакологии и матрица совместимости препаратов",
	},
	{
		id: "sanpin-references",
		pattern: /^\/api\/sanpin\/references(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут
		description: "Нормативы СанПиН и справочники стерилизации",
	},
] as const;

/**
 * Правила автоматической инвалидации кэша при сохранении или изменении данных.
 */
export const DEFAULT_MUTATION_RULES: readonly MutationInvalidationRule[] = [
	{
		mutationPattern: /^\/api\/settings\/staff(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/settings\/staff/i, /^\/api\/hr\/doctors/i],
	},
	{
		mutationPattern: /^\/api\/(?:settings\/clinic|settings\/branches|workspace\/profile)(?:\/|\?|$)/i,
		invalidatePatterns: [
			/^\/api\/settings\/clinic/i,
			/^\/api\/settings\/branches/i,
			/^\/api\/workspace\/profile/i,
		],
	},
	{
		mutationPattern: /^\/api\/(?:settings\/price|catalog|price-lists)(?:\/|\?|$)/i,
		invalidatePatterns: [
			/^\/api\/settings\/price/i,
			/^\/api\/catalog/i,
			/^\/api\/price-lists/i,
		],
	},
	{
		mutationPattern: /^\/api\/(?:templates|document-templates|emr\/templates|somatic)(?:\/|\?|$)/i,
		invalidatePatterns: [
			/^\/api\/templates/i,
			/^\/api\/document-templates/i,
			/^\/api\/emr\/templates/i,
			/^\/api\/somatic/i,
		],
	},
	{
		mutationPattern: /^\/api\/crm\/custom-task-types(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/crm\/custom-task-types/i],
	},
	{
		mutationPattern: /^\/api\/clinical\/rules(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/clinical\/rules/i],
	},
	{
		mutationPattern: /^\/api\/clinical\/phase-completions(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/clinical\/phase-completions/i],
	},
] as const;

// ---------------------------------------------------------------------------
// ВНУТРЕННЕЕ СОСТОЯНИЕ КЭША
// ---------------------------------------------------------------------------

let apiCacheInstance: MemoryLruCache<string, CachedApiResponse<unknown>> | null = null;

const inFlightRequests = new Map<string, Promise<unknown>>();

let statsHits = 0;
let statsMisses = 0;
let statsCoalesced = 0;
let statsInvalidations = 0;

let ttlPruneInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Запускает периодическую фоновую очистку просроченных записей по TTL.
 */
export function startApiCacheTtlPruning(): void {
	if (ttlPruneInterval || typeof setInterval === "undefined") return;
	const timing = getOptimizedTiming();
	ttlPruneInterval = setInterval(() => {
		if (apiCacheInstance) {
			const pruned = apiCacheInstance.pruneExpired();
			if (pruned > 0) {
				statsInvalidations += pruned;
			}
		}
	}, timing.cachePruneIntervalMs);

	if (
		ttlPruneInterval &&
		typeof ttlPruneInterval === "object" &&
		"unref" in ttlPruneInterval &&
		typeof (ttlPruneInterval as { unref: () => void }).unref === "function"
	) {
		(ttlPruneInterval as { unref: () => void }).unref();
	}

	if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
		const cleanup = () => {
			stopApiCacheTtlPruning();
		};
		window.addEventListener("beforeunload", cleanup, { once: true });
	}
}

/**
 * Останавливает фоновую очистку просроченных записей.
 */
export function stopApiCacheTtlPruning(): void {
	if (ttlPruneInterval) {
		clearInterval(ttlPruneInterval);
		ttlPruneInterval = null;
	}
}

/**
 * Возвращает синглтон In-Memory LRU кэша для API.
 */
export function getApiCache(): MemoryLruCache<string, CachedApiResponse<unknown>> {
	if (!apiCacheInstance) {
		const timing = getOptimizedTiming();
		apiCacheInstance = createMemoryLruCache<string, CachedApiResponse<unknown>>({
			maxEntries: timing.maxLruCacheEntries,
			maxBytes: timing.maxLruCacheBytes,
			defaultTtlMs: timing.defaultCacheTtlMs,
			sizeCalculator: (entry) => {
				const dataBytes = estimateObjectByteSize(entry.data);
				return dataBytes + (entry.url ? entry.url.length * 2 : 64) + 256;
			},
		});
		startApiCacheTtlPruning();
	}
	return apiCacheInstance;
}

/**
 * Извлекает относительный путь API из строки, URL или объекта Request.
 */
export function normalizeApiUrl(input: RequestInfo | URL): string {
	let rawUrl: string;
	if (typeof input === "string") {
		rawUrl = input;
	} else if (input instanceof URL) {
		rawUrl = input.toString();
	} else {
		rawUrl = input.url;
	}

	try {
		const origin = typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost";
		const parsed = new URL(rawUrl, origin);
		return parsed.pathname + parsed.search;
	} catch {
		return rawUrl;
	}
}

/**
 * Проверяет, подходит ли URL под регламентное кэширование справочников.
 */
export function matchCatalogRule(pathname: string): CatalogCacheRule | undefined {
	for (const rule of STATUTORY_CATALOG_RULES) {
		if (rule.pattern.test(pathname)) {
			return rule;
		}
	}
	return undefined;
}

/**
 * Проверяет, можно ли кэшировать данный запрос (только безопасные методы GET/HEAD и подходящий путь).
 */
export function isCacheableCatalogUrl(url: string, method = "GET"): boolean {
	const normalizedMethod = method.toUpperCase();
	if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") {
		return false;
	}
	const normalizedPath = normalizeApiUrl(url);
	return matchCatalogRule(normalizedPath) !== undefined;
}

/**
 * Преобразует заголовки Headers в плоский объект Record<string, string>.
 */
export function headersToRecord(headers?: HeadersInit): Record<string, string> {
	if (!headers) return {};
	const result: Record<string, string> = {};

	if (headers instanceof Headers) {
		headers.forEach((value, key) => {
			result[key.toLowerCase()] = value;
		});
	} else if (Array.isArray(headers)) {
		for (const [key, value] of headers) {
			result[key.toLowerCase()] = value;
		}
	} else {
		for (const [key, value] of Object.entries(headers)) {
			if (typeof value === "string") {
				result[key.toLowerCase()] = value;
			}
		}
	}

	return result;
}

/**
 * Получает запись из оперативной памяти, если она существует и актуальна.
 */
export function getCachedApiResponse<T = unknown>(url: string): CachedApiResponse<T> | undefined {
	const key = normalizeApiUrl(url);
	const entry = getApiCache().get(key);
	if (entry) {
		statsHits++;
		return entry as CachedApiResponse<T>;
	}
	return undefined;
}

/**
 * Сохраняет разобранный ответ API в оперативной памяти с расчетом TTL.
 */
export function setCachedApiResponse<T = unknown>(
	url: string,
	data: T,
	meta?: { status?: number; statusText?: string; headers?: Record<string, string>; ttlMs?: number | null },
): void {
	const key = normalizeApiUrl(url);
	const rule = matchCatalogRule(key);
	const ttlMs: number | null =
		meta?.ttlMs !== undefined
			? meta.ttlMs
			: (rule?.defaultTtlMs ?? getOptimizedTiming().defaultCacheTtlMs);

	// Защита от раздувания кучи гигантскими ответами на слабом ПК (> 10 МБ)
	const estimatedBytes = estimateObjectByteSize(data);
	if (estimatedBytes > 10 * 1024 * 1024) {
		return;
	}

	const entry: CachedApiResponse<T> = {
		data,
		status: meta?.status ?? 200,
		statusText: meta?.statusText ?? "OK",
		headers: meta?.headers ?? { "content-type": "application/json; charset=utf-8" },
		url: key,
		timestamp: Date.now(),
		ttlMs,
	};

	getApiCache().set(key, entry as CachedApiResponse<unknown>, ttlMs);
}

/**
 * Инвалидирует записи кэша по строковому префиксу, регулярному выражению или полностью.
 * Возвращает количество удаленных записей.
 */
export function invalidateApiCache(patternOrUrl?: string | RegExp): number {
	const cache = getApiCache();
	if (!patternOrUrl) {
		const total = cache.size;
		cache.clear();
		statsInvalidations += total;
		return total;
	}

	let removedCount = 0;
	const regex = typeof patternOrUrl === "string"
		? new RegExp(patternOrUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
		: patternOrUrl;

	for (const key of cache.keys()) {
		if (regex.test(key)) {
			if (cache.delete(key)) {
				removedCount++;
			}
		}
	}

	statsInvalidations += removedCount;
	return removedCount;
}

/**
 * Полностью сбрасывает кэш API.
 */
export function clearApiCache(): void {
	invalidateApiCache();
}

/**
 * Уведомляет движок кэша о мутирующем запросе (POST, PUT, PATCH, DELETE) для сброса затронутых справочников.
 */
export function notifyApiMutation(rawUrl: string, method: string): number {
	const normalizedMethod = method.toUpperCase();
	if (normalizedMethod === "GET" || normalizedMethod === "HEAD") {
		return 0;
	}

	const normalizedUrl = normalizeApiUrl(rawUrl);
	let invalidatedTotal = 0;

	for (const rule of DEFAULT_MUTATION_RULES) {
		if (rule.mutationPattern.test(normalizedUrl)) {
			for (const pattern of rule.invalidatePatterns) {
				invalidatedTotal += invalidateApiCache(pattern);
			}
		}
	}

	return invalidatedTotal;
}

/**
 * Создает экземпляр Response на основе кэшированной записи.
 */
export function createResponseFromCachedEntry<T>(entry: CachedApiResponse<T>): Response {
	const headers = new Headers(entry.headers);
	headers.set("x-dente-cache", "HIT");
	if (!headers.has("content-type")) {
		headers.set("content-type", "application/json; charset=utf-8");
	}

	const body = typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data);

	return new Response(body, {
		status: entry.status,
		statusText: entry.statusText,
		headers,
	});
}

/**
 * Выполняет запрос к API с кэшированием в оперативной памяти и защитой от Cache Stampede.
 * Возвращает разобранные данные типа T.
 */
export async function cachedApiFetch<T = unknown>(
	input: RequestInfo | URL,
	init?: RequestInit,
	options?: CachedFetchOptions,
): Promise<T> {
	const cacheKey = options?.cacheKey ?? normalizeApiUrl(input);
	const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

	const cacheControl = init?.cache ?? (input instanceof Request ? input.cache : undefined);
	const isBypassed = options?.bypassCache || cacheControl === "no-store" || cacheControl === "no-cache";

	// 1. Проверяем кэш, если не запрошен принудительный обход
	if (!isBypassed && !options?.forceRefresh && method === "GET") {
		const cached = getCachedApiResponse<T>(cacheKey);
		if (cached) {
			return cached.data;
		}
	}

	// 2. Защита от Cache Stampede (дедупликация параллельных запросов в полете)
	if (method === "GET" && inFlightRequests.has(cacheKey) && !options?.forceRefresh) {
		statsCoalesced++;
		return inFlightRequests.get(cacheKey) as Promise<T>;
	}

	// 3. Формируем сетевой запрос
	statsMisses++;
	const fetchPromise = (async () => {
		const response = await fetch(input, init);

		if (!response.ok) {
			throw new Error(`API error ${response.status} ${response.statusText} for ${cacheKey}`);
		}

		const contentType = response.headers.get("content-type") || "";
		let data: T;
		if (contentType.includes("application/json")) {
			data = (await response.json()) as T;
		} else {
			data = (await response.text()) as unknown as T;
		}

		// Сохраняем только при успехе и если кэш не обойден
		if (!isBypassed && method === "GET") {
			setCachedApiResponse(cacheKey, data, {
				status: response.status,
				statusText: response.statusText,
				headers: headersToRecord(response.headers),
				...(options?.ttlMs !== undefined ? { ttlMs: options.ttlMs } : {}),
			});
		}

		return data;
	})();

	if (method === "GET") {
		inFlightRequests.set(cacheKey, fetchPromise);
	}

	try {
		return await fetchPromise;
	} finally {
		if (method === "GET") {
			inFlightRequests.delete(cacheKey);
		}
	}
}

/**
 * Выполняет запрос к API и возвращает стандартный объект Response (либо клон из кэша, либо сетевой).
 */
export async function cachedApiFetchResponse(
	input: RequestInfo | URL,
	init?: RequestInit,
	options?: CachedFetchOptions,
): Promise<Response> {
	const cacheKey = options?.cacheKey ?? normalizeApiUrl(input);
	const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

	const cacheControl = init?.cache ?? (input instanceof Request ? input.cache : undefined);
	const isBypassed = options?.bypassCache || cacheControl === "no-store" || cacheControl === "no-cache";

	if (!isBypassed && !options?.forceRefresh && method === "GET") {
		const cached = getCachedApiResponse(cacheKey);
		if (cached) {
			return createResponseFromCachedEntry(cached);
		}
	}

	// Выполняем сетевой запрос
	const data = await cachedApiFetch(input, init, options);

	// Возвращаем Response
	const cached = getCachedApiResponse(cacheKey);
	if (cached) {
		return createResponseFromCachedEntry(cached);
	}

	return new Response(typeof data === "string" ? data : JSON.stringify(data), {
		status: 200,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}

/**
 * Возвращает статистику использования кэша.
 */
export function getApiCacheStats(): ApiCacheStats {
	const cache = getApiCache();
	const stats = cache.getStats();
	return {
		hits: statsHits,
		misses: statsMisses,
		coalescedRequests: statsCoalesced,
		invalidations: statsInvalidations,
		inFlightCount: inFlightRequests.size,
		cachedEntriesCount: cache.size,
		cachedBytesCount: stats.currentBytes,
		maxCacheBytes: stats.maxBytes,
	};
}

/**
 * Сбрасывает счетчики статистики.
 */
export function resetApiCacheStats(): void {
	statsHits = 0;
	statsMisses = 0;
	statsCoalesced = 0;
	statsInvalidations = 0;
}
