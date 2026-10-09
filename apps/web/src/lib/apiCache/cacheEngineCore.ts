/**
 * cacheEngineCore.ts — Layer 3: Ядро In-Memory LRU кэширования API.
 *
 * Управляет синглтоном памяти, операциями getOrFetch, фоновым устареванием TTL,
 * перехватом мутаций и сбором метрик производительности для слабого ПК.
 */

import {
	createMemoryLruCache,
	estimateObjectByteSize,
	getOptimizedTiming,
	MemoryLruCache,
} from "../../utils/lowSpecHddOptimizer";
import type {
	ApiCacheStats,
	CachedApiResponse,
	CachedFetchOptions,
} from "./types";
import {
	headersToRecord,
	matchCatalogRule,
	normalizeApiUrl,
} from "./cacheKeyAndTiming";
import {
	deleteInFlightRequest,
	getInFlightCount,
	getInFlightRequest,
	hasInFlightRequest,
	setInFlightRequest,
} from "./requestCoalescer";
import { DEFAULT_MUTATION_RULES } from "./invalidationHub";
import {
	deleteCatalogFromPersistentStorage,
	saveCatalogToPersistentStorage,
} from "./persistentStorage";

// ---------------------------------------------------------------------------
// ВНУТРЕННЕЕ СОСТОЯНИЕ КЭША
// ---------------------------------------------------------------------------

let apiCacheInstance: MemoryLruCache<string, CachedApiResponse<unknown>> | null = null;

let statsHits = 0;
let statsMisses = 0;
let statsCoalesced = 0;
let statsInvalidations = 0;

let ttlPruneInterval: ReturnType<typeof setInterval> | null = null;
let ttlPruneVisibilityCleanup: (() => void) | null = null;

/**
 * Запускает периодическую фоновую очистку просроченных записей по TTL.
 */
export function startApiCacheTtlPruning(): void {
	if (ttlPruneInterval || typeof setInterval === "undefined") return;
	const timing = getOptimizedTiming();
	ttlPruneInterval = setInterval(() => {
		if (typeof document !== "undefined" && document.hidden) {
			return; // Пропускаем очистку кэша в скрытой вкладке для снижения паразитного I/O и нагрузки на CPU (HDD 5400 RPM)
		}
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

	if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
		const onVisibilityChange = () => {
			if (!document.hidden && apiCacheInstance) {
				const pruned = apiCacheInstance.pruneExpired();
				if (pruned > 0) {
					statsInvalidations += pruned;
				}
			}
		};
		document.addEventListener("visibilitychange", onVisibilityChange);
		ttlPruneVisibilityCleanup = () => {
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
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
	if (ttlPruneVisibilityCleanup) {
		ttlPruneVisibilityCleanup();
		ttlPruneVisibilityCleanup = null;
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

	// Защита от раздувания кучи гигантскими ответами на слабом ПК (не более 25% от maxLruCacheBytes)
	const maxSingleEntryBytes = Math.min(10 * 1024 * 1024, getOptimizedTiming().maxLruCacheBytes / 4);
	const estimatedBytes = estimateObjectByteSize(data);
	if (estimatedBytes > maxSingleEntryBytes) {
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
	void saveCatalogToPersistentStorage(key, entry);

	// Synchronize dedicated RAM L1 pointers and persistent mirror for statutory reference catalogs
	if (Array.isArray(data) && data.length > 0) {
		if (key === "/api/clinical/804n" || key === "/api/clinical/nomenclature") {
			void import("../../services/storage/statutoryCatalogCache")
				.then((m) => {
					m.setStatutoryCatalogInRam("804n", data as unknown[]);
				})
				.catch(() => {});
			void import("../../services/storage/clinicalCacheStorage")
				.then((m) => {
					void m.cacheStatutoryCatalog("catalog_804n", data).catch(() => {});
				})
				.catch(() => {});
		} else if (key === "/api/clinical/icd10" || key === "/api/icd10") {
			void import("../../services/storage/statutoryCatalogCache")
				.then((m) => {
					m.setStatutoryCatalogInRam("icd10", data as unknown[]);
				})
				.catch(() => {});
			void import("../../services/storage/clinicalCacheStorage")
				.then((m) => {
					void m.cacheStatutoryCatalog("catalog_icd10", data).catch(() => {});
				})
				.catch(() => {});
		} else if (key === "/api/emr/templates" || key === "/api/templates") {
			void import("../../services/storage/statutoryCatalogCache")
				.then((m) => {
					m.setStatutoryCatalogInRam("templates", data as unknown[]);
				})
				.catch(() => {});
			void import("../../services/storage/clinicalCacheStorage")
				.then((m) => {
					void m.cacheStatutoryCatalog("catalog_templates", data).catch(() => {});
				})
				.catch(() => {});
		}
	}
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
		void deleteCatalogFromPersistentStorage();
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
	void deleteCatalogFromPersistentStorage(patternOrUrl);
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
 * На слабых 2-ядерных CPU (Celeron/Atom) устраняет избыточный JSON.stringify + JSON.parse,
 * разрешая .json() мгновенно за 0 мс без мусора для сборщика памяти (GC).
 */
export function createResponseFromCachedEntry<T>(entry: CachedApiResponse<T>): Response {
	const headers = new Headers(entry.headers);
	headers.set("x-dente-cache", "HIT");
	if (!headers.has("content-type")) {
		headers.set("content-type", "application/json; charset=utf-8");
	}

	const isObjectData = typeof entry.data === "object" && entry.data !== null;
	const body = isObjectData ? "" : String(entry.data ?? "");

	const res = new Response(body, {
		status: entry.status,
		statusText: entry.statusText,
		headers,
	});

	if (isObjectData) {
		const customJson = async () => entry.data;
		res.json = customJson;
		let cachedText: string | null = null;
		const customText = async () => {
			if (cachedText === null) {
				cachedText = JSON.stringify(entry.data);
			}
			return cachedText;
		};
		res.text = customText;
		const origClone = res.clone.bind(res);
		res.clone = () => {
			const cloned = origClone();
			cloned.json = customJson;
			cloned.text = customText;
			return cloned;
		};
	}

	return res;
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
	if (method === "GET" && hasInFlightRequest(cacheKey) && !options?.forceRefresh) {
		statsCoalesced++;
		return getInFlightRequest<T>(cacheKey) as Promise<T>;
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
		setInFlightRequest(cacheKey, fetchPromise);
	}

	try {
		return await fetchPromise;
	} finally {
		if (method === "GET") {
			deleteInFlightRequest(cacheKey);
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
		inFlightCount: getInFlightCount(),
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
