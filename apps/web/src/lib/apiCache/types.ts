/**
 * types.ts — Layer 0: Контракты типов, опций и метрик кэширования API.
 *
 * Чистые интерфейсы и DTO без побочных эффектов рантайма.
 */

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

export interface WarmupCatalogResult {
	readonly hydratedFromStorage: number;
	readonly newlySeeded: number;
}

// Дополнительные канонические алиасы контрактов декомпозиции
export type ApiCacheEntry<T = unknown> = CachedApiResponse<T>;
export type ApiCacheOptions = CachedFetchOptions;
export type ApiCacheMetrics = ApiCacheStats;
