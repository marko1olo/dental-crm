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
import {
	parseJsonNonBlocking,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "./safeLocalStorage";

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
		pattern: /^\/api\/(?:catalogs?\/|clinical\/)?(?:icd10|icd-10|mkb|mkb10|mkb-10|classifiers)(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут — справочник МКБ-10
		description: "Справочник диагнозов МКБ-10",
	},
	{
		id: "clinical-somatic-templates",
		pattern: /^\/api\/(?:templates|document-templates|documents\/templates|outpatient\/templates|emr\/templates|somatic(?:-status|-templates)?)(?:\/|\?|$)/i,
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
		pattern: /^\/api\/pharmacology(?:\/(?:references|interactions-matrix|medications|catalog|drugs))?(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут
		description: "Справочники фармакологии, лекарственных препаратов и матрица совместимости",
	},
	{
		id: "sanpin-references",
		pattern: /^\/api\/sanpin\/references(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут
		description: "Нормативы СанПиН и справочники стерилизации",
	},
	{
		id: "inventory-warehouse-items",
		pattern: /^\/api\/inventory(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 15 * 60 * 1000, // 15 минут — номенклатура склада и материалы
		description: "Складской учет, расходные материалы и медикаменты",
	},
	{
		id: "inventory-boms-rules",
		pattern: /^\/api\/inventory(?:\/[a-zA-Z0-9_-]+)?\/rules(?:\/|\?|$)/i,
		defaultTtlMs: 20 * 60 * 1000, // 20 минут — техкарты списания материалов (804н)
		description: "Техкарты и правила списания материалов по услугам",
	},
	{
		id: "dental-lab-catalogs",
		pattern: /^\/api\/lab(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 20 * 60 * 1000, // 20 минут — каталоги зуботехнических лабораторий и наряды ЗТЛ
		description: "Каталоги зуботехнических лабораторий, этапы и прайслисты ЗТЛ",
	},
	{
		id: "insurance-dms-catalogs",
		pattern: /^\/api\/insurance(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 30 * 60 * 1000, // 30 минут — страховые компании ДМС и гарантийные тарифы
		description: "Справочники страховых компаний ДМС, программы и гарантийные лимиты",
	},
	{
		id: "marketing-channels-sources",
		pattern: /^\/api\/marketing(?:\/[a-zA-Z0-9_-]+)?(?:\/|\?|$)/i,
		defaultTtlMs: 15 * 60 * 1000, // 15 минут — каналы привлечения и рекламные источники
		description: "Маркетинговые каналы, рекламные источники и метрики привлечения",
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
	{
		mutationPattern: /^\/api\/inventory(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/inventory/i],
	},
	{
		mutationPattern: /^\/api\/lab(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/lab/i],
	},
	{
		mutationPattern: /^\/api\/insurance(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/insurance/i],
	},
	{
		mutationPattern: /^\/api\/marketing(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/marketing/i],
	},
	{
		mutationPattern: /^\/api\/pharmacology(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/pharmacology/i],
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
			void import("../services/storage/statutoryCatalogCache")
				.then((m) => {
					m.setStatutoryCatalogInRam("804n", data as unknown[]);
				})
				.catch(() => {});
			void import("../services/storage/clinicalCacheStorage")
				.then((m) => {
					void m.cacheStatutoryCatalog("catalog_804n", data).catch(() => {});
				})
				.catch(() => {});
		} else if (key === "/api/clinical/icd10" || key === "/api/icd10") {
			void import("../services/storage/statutoryCatalogCache")
				.then((m) => {
					m.setStatutoryCatalogInRam("icd10", data as unknown[]);
				})
				.catch(() => {});
			void import("../services/storage/clinicalCacheStorage")
				.then((m) => {
					void m.cacheStatutoryCatalog("catalog_icd10", data).catch(() => {});
				})
				.catch(() => {});
		} else if (key === "/api/emr/templates" || key === "/api/templates") {
			void import("../services/storage/statutoryCatalogCache")
				.then((m) => {
					m.setStatutoryCatalogInRam("templates", data as unknown[]);
				})
				.catch(() => {});
			void import("../services/storage/clinicalCacheStorage")
				.then((m) => {
					void m.cacheStatutoryCatalog("catalog_templates", data).catch(() => {});
				})
				.catch(() => {});
		}
	}
}

// ---------------------------------------------------------------------------
// L2 PERSISTENT CATALOG STORAGE (INDEXEDDB + LOCALSTORAGE FALLBACK)
// ---------------------------------------------------------------------------

const CATALOG_DB_NAME = "dente-catalog-persistent-cache-v1";
const CATALOG_DB_VERSION = 1;
const CATALOG_STORE_NAME = "catalogs";
const LOCAL_STORAGE_CATALOG_PREFIX = "dente:catalog-cache:";

let catalogDbPromise: Promise<IDBDatabase | null> | null = null;

export function openCatalogDb(): Promise<IDBDatabase | null> {
	if (typeof window === "undefined" || !("indexedDB" in window)) {
		return Promise.resolve(null);
	}
	if (catalogDbPromise) return catalogDbPromise;

	catalogDbPromise = new Promise((resolve) => {
		try {
			const request = window.indexedDB.open(CATALOG_DB_NAME, CATALOG_DB_VERSION);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(CATALOG_STORE_NAME)) {
					db.createObjectStore(CATALOG_STORE_NAME, { keyPath: "url" });
				}
			};
			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					catalogDbPromise = null;
					db.close();
				};
				db.onclose = () => {
					catalogDbPromise = null;
				};
				resolve(db);
			};
			request.onerror = () => {
				catalogDbPromise = null;
				resolve(null);
			};
		} catch {
			catalogDbPromise = null;
			resolve(null);
		}
	});

	return catalogDbPromise;
}

// Low-Spec 5400 RPM HDD Batch Write Buffer for Persistent Catalogs
const pendingCatalogBatch = new Map<string, CachedApiResponse<unknown>>();
let catalogBatchFlushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushingCatalogBatch = false;

export async function flushPendingCatalogWrites(): Promise<void> {
	if (catalogBatchFlushTimer) {
		clearTimeout(catalogBatchFlushTimer);
		catalogBatchFlushTimer = null;
	}
	if (isFlushingCatalogBatch || pendingCatalogBatch.size === 0) return;
	isFlushingCatalogBatch = true;

	const snapshot = new Map(pendingCatalogBatch);
	pendingCatalogBatch.clear();

	const db = await openCatalogDb();
	if (db) {
		try {
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readwrite");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				for (const [key, entry] of snapshot.entries()) {
					store.put({
						url: key,
						data: entry.data,
						status: entry.status,
						statusText: entry.statusText,
						headers: entry.headers,
						timestamp: entry.timestamp,
						ttlMs: entry.ttlMs,
					});
				}
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
				tx.onabort = () => reject(tx.error ?? new Error("Catalog transaction aborted"));
			});
			isFlushingCatalogBatch = false;
			return;
		} catch {
			// fallback to localStorage
		}
	}

	// Fallback to localStorage
	for (const [key, entry] of snapshot.entries()) {
		try {
			const serialized = JSON.stringify(entry);
			if (serialized.length < 80 * 1024) {
				safeLocalStorageSetItem(LOCAL_STORAGE_CATALOG_PREFIX + key, serialized);
			}
		} catch {
			// ignore
		}
	}
	isFlushingCatalogBatch = false;
}

export async function saveCatalogToPersistentStorage<T>(
	url: string,
	entry: CachedApiResponse<T>,
): Promise<void> {
	const key = normalizeApiUrl(url);
	pendingCatalogBatch.set(key, entry as CachedApiResponse<unknown>);

	if (!catalogBatchFlushTimer) {
		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			window.requestIdleCallback(() => void flushPendingCatalogWrites(), { timeout: 100 });
		} else {
			catalogBatchFlushTimer = setTimeout(() => void flushPendingCatalogWrites(), 60);
		}
	}
}

export async function readCatalogFromPersistentStorage<T = unknown>(
	url: string,
): Promise<CachedApiResponse<T> | null> {
	const key = normalizeApiUrl(url);

	// 0. Check pending in-memory batch write buffer first (0 ms, zero disk I/O)
	const pending = pendingCatalogBatch.get(key) as CachedApiResponse<T> | undefined;
	if (pending) {
		if (pending.ttlMs === null || Date.now() <= pending.timestamp + pending.ttlMs) {
			return pending;
		}
	}

	// 1. Проверяем IndexedDB
	const db = await openCatalogDb();
	if (db) {
		try {
			const record = await new Promise<CachedApiResponse<T> | null>((resolve) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readonly");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				const req = store.get(key);
				req.onsuccess = () => {
					const res = req.result;
					if (!res) {
						resolve(null);
						return;
					}
					// Проверка срока жизни (TTL)
					if (res.ttlMs !== null && Date.now() > res.timestamp + res.ttlMs) {
						void deleteCatalogFromPersistentStorage(key);
						resolve(null);
						return;
					}
					resolve(res as CachedApiResponse<T>);
				};
				req.onerror = () => resolve(null);
			});
			if (record) return record;
		} catch {
			// fallback к localStorage
		}
	}

	// 2. Fallback в localStorage
	try {
		const raw = safeLocalStorageGetItem(LOCAL_STORAGE_CATALOG_PREFIX + key);
		if (raw) {
			const parsed = (await parseJsonNonBlocking<CachedApiResponse<T>>(raw)) as CachedApiResponse<T>;
			if (parsed && (parsed.ttlMs === null || Date.now() <= parsed.timestamp + parsed.ttlMs)) {
				return parsed;
			}
			safeLocalStorageRemoveItem(LOCAL_STORAGE_CATALOG_PREFIX + key);
		}
	} catch {
		// ignore
	}

	// 3. Fallback к clinicalCacheStorage (catalog_804n, catalog_icd10, catalog_templates)
	try {
		if (key === "/api/clinical/804n" || key === "/api/clinical/nomenclature") {
			const { getCachedStatutoryCatalog } = await import("../services/storage/clinicalCacheStorage");
			const idbData = await getCachedStatutoryCatalog<T>("catalog_804n");
			if (idbData && Array.isArray(idbData) && idbData.length > 0) {
				const entry: CachedApiResponse<T> = {
					data: idbData,
					status: 200,
					statusText: "OK",
					headers: { "content-type": "application/json; charset=utf-8" },
					url: key,
					timestamp: Date.now(),
					ttlMs: 24 * 60 * 60 * 1000,
				};
				void saveCatalogToPersistentStorage(key, entry);
				return entry;
			}
		} else if (key === "/api/clinical/icd10" || key === "/api/icd10") {
			const { getCachedStatutoryCatalog } = await import("../services/storage/clinicalCacheStorage");
			const idbData = await getCachedStatutoryCatalog<T>("catalog_icd10");
			if (idbData && Array.isArray(idbData) && idbData.length > 0) {
				const entry: CachedApiResponse<T> = {
					data: idbData,
					status: 200,
					statusText: "OK",
					headers: { "content-type": "application/json; charset=utf-8" },
					url: key,
					timestamp: Date.now(),
					ttlMs: 24 * 60 * 60 * 1000,
				};
				void saveCatalogToPersistentStorage(key, entry);
				return entry;
			}
		} else if (key === "/api/emr/templates" || key === "/api/templates") {
			const { getCachedStatutoryCatalog } = await import("../services/storage/clinicalCacheStorage");
			const idbData = await getCachedStatutoryCatalog<T>("catalog_templates");
			if (idbData && Array.isArray(idbData) && idbData.length > 0) {
				const entry: CachedApiResponse<T> = {
					data: idbData,
					status: 200,
					statusText: "OK",
					headers: { "content-type": "application/json; charset=utf-8" },
					url: key,
					timestamp: Date.now(),
					ttlMs: 24 * 60 * 60 * 1000,
				};
				void saveCatalogToPersistentStorage(key, entry);
				return entry;
			}
		}
	} catch {
		// ignore
	}

	return null;
}

export async function deleteCatalogFromPersistentStorage(
	patternOrUrl?: string | RegExp,
): Promise<void> {
	// Clear from in-memory batch write buffer
	if (!patternOrUrl) {
		pendingCatalogBatch.clear();
	} else if (typeof patternOrUrl === "string") {
		for (const key of pendingCatalogBatch.keys()) {
			if (key === patternOrUrl || key.includes(patternOrUrl)) {
				pendingCatalogBatch.delete(key);
			}
		}
	} else {
		for (const key of pendingCatalogBatch.keys()) {
			if (patternOrUrl.test(key)) {
				pendingCatalogBatch.delete(key);
			}
		}
	}

	// IndexedDB
	const db = await openCatalogDb();
	if (db) {
		try {
			await new Promise<void>((resolve) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readwrite");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				if (!patternOrUrl) {
					const req = store.clear();
					req.onsuccess = () => resolve();
					req.onerror = () => resolve();
					return;
				}
				const req = store.openCursor();
				req.onsuccess = () => {
					const cursor = req.result;
					if (cursor) {
						const key = String(cursor.key);
						let shouldDelete = false;
						if (typeof patternOrUrl === "string") {
							shouldDelete = key === patternOrUrl || key.includes(patternOrUrl);
						} else {
							shouldDelete = patternOrUrl.test(key);
						}
						if (shouldDelete) {
							cursor.delete();
						}
						cursor.continue();
					} else {
						resolve();
					}
				};
				req.onerror = () => resolve();
			});
		} catch {
			// ignore
		}
	}

	// localStorage fallback
	if (typeof window !== "undefined" && window.localStorage) {
		try {
			if (!patternOrUrl) {
				for (let i = window.localStorage.length - 1; i >= 0; i--) {
					const k = window.localStorage.key(i);
					if (k && k.startsWith(LOCAL_STORAGE_CATALOG_PREFIX)) {
						safeLocalStorageRemoveItem(k);
					}
				}
			} else {
				for (let i = window.localStorage.length - 1; i >= 0; i--) {
					const k = window.localStorage.key(i);
					if (k && k.startsWith(LOCAL_STORAGE_CATALOG_PREFIX)) {
						const subKey = k.slice(LOCAL_STORAGE_CATALOG_PREFIX.length);
						const matches =
							typeof patternOrUrl === "string"
								? subKey === patternOrUrl || subKey.includes(patternOrUrl)
								: patternOrUrl.test(subKey);
						if (matches) {
							safeLocalStorageRemoveItem(k);
						}
					}
				}
			}
		} catch {
			// ignore
		}
	}
}

/**
 * Гидратирует сохраненные справочники из IndexedDB в оперативную память (L1 RAM кэш).
 * Обеспечивает 0 мс seek time при старте приложения даже при медленном HDD 5400 RPM.
 */
export async function hydrateCatalogsFromPersistentStorage(): Promise<number> {
	let hydratedCount = 0;
	const db = await openCatalogDb();
	if (db) {
		try {
			const entries = await new Promise<CachedApiResponse<unknown>[]>((resolve) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readonly");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as CachedApiResponse<unknown>[]) : []);
				req.onerror = () => resolve([]);
			});

			const now = Date.now();
			let count = 0;
			for (const entry of entries) {
				if (entry && entry.url) {
					if (entry.ttlMs === null || now <= entry.timestamp + entry.ttlMs) {
						if (!getApiCache().has(entry.url)) {
							getApiCache().set(entry.url, entry, entry.ttlMs);
							hydratedCount++;
						}
						// Synchronize L1 RAM statutory catalog cache for instant 0 ms access
						if (Array.isArray(entry.data) && entry.data.length > 0) {
							if (entry.url === "/api/clinical/804n" || entry.url === "/api/clinical/nomenclature") {
								try {
									const { setStatutoryCatalogInRam } = await import("../services/storage/statutoryCatalogCache");
									setStatutoryCatalogInRam("804n", entry.data as unknown[]);
								} catch {
									// ignore
								}
							} else if (entry.url === "/api/clinical/icd10" || entry.url === "/api/icd10") {
								try {
									const { setStatutoryCatalogInRam } = await import("../services/storage/statutoryCatalogCache");
									setStatutoryCatalogInRam("icd10", entry.data as unknown[]);
								} catch {
									// ignore
								}
							} else if (entry.url === "/api/templates" || entry.url === "/api/emr/templates") {
								try {
									const { setStatutoryCatalogInRam } = await import("../services/storage/statutoryCatalogCache");
									setStatutoryCatalogInRam("templates", entry.data as unknown[]);
								} catch {
									// ignore
								}
							}
						}
					}
				}
				if (++count % 25 === 0) {
					// Yield to main thread on Celeron CPU to prevent UI micro-stutters
					await new Promise((resolve) => {
						if (typeof window !== "undefined" && "requestIdleCallback" in window) {
							window.requestIdleCallback(() => resolve(undefined), { timeout: 16 });
						} else {
							setTimeout(resolve, 0);
						}
					});
				}
			}
		} catch {
			// ignore
		}
	}

	return hydratedCount;
}

export interface WarmupCatalogResult {
	readonly hydratedFromStorage: number;
	readonly newlySeeded: number;
}

/**
 * Прогрев и наполнение регламентных справочников (Номенклатура 804н, МКБ-10, шаблоны 043/у)
 * в фоновом режиме (requestIdleCallback) с обязательным кэшированием в IndexedDB.
 * Гарантирует, что переключение вкладок на бюджетных ПК с медленным 5400 RPM HDD
 * не вызывает дискового троттлинга (HDD Thrashing) и блокирующих ожиданий.
 */
export async function warmupStatutoryCatalogs(): Promise<WarmupCatalogResult> {
	// 1. Сначала поднимаем всё, что уже сохранено в IndexedDB, в L1 RAM кэш (0 мс доступ)
	const hydratedFromStorage = await hydrateCatalogsFromPersistentStorage();
	let newlySeeded = 0;

	// 2. Список ключевых регламентных справочников, необходимых врачу и регистратору
	const statutoryUrls = [
		"/api/clinical/804n",
		"/api/clinical/nomenclature",
		"/api/clinical/icd10",
		"/api/icd10",
		"/api/templates",
		"/api/emr/templates",
		"/api/catalog",
		"/api/price-lists",
		"/api/pharmacology/references",
		"/api/pharmacology/medications",
	];

	// Проверяем, есть ли отсутствующие справочники в L1 кэше
	const missingUrls = statutoryUrls.filter((url) => {
		const cached = getCachedApiResponse(url);
		return !cached;
	});

	if (missingUrls.length > 0) {
		// Ленивый импорт канонических данных во время idle (не раздувает стартовый бандл)
		try {
			// 2.1 Номенклатура 804н и каталог услуг
			if (
				missingUrls.includes("/api/clinical/804n") ||
				missingUrls.includes("/api/clinical/nomenclature") ||
				missingUrls.includes("/api/catalog") ||
				missingUrls.includes("/api/price-lists")
			) {
				const { STATUTORY_804N_NOMENCLATURE } = await import(
					"../components/insurance/dmsInsurancePresets"
				);
				if (STATUTORY_804N_NOMENCLATURE && STATUTORY_804N_NOMENCLATURE.length > 0) {
					if (!getCachedApiResponse("/api/clinical/804n")) {
						setCachedApiResponse("/api/clinical/804n", STATUTORY_804N_NOMENCLATURE, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/clinical/nomenclature")) {
						setCachedApiResponse("/api/clinical/nomenclature", STATUTORY_804N_NOMENCLATURE, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/catalog")) {
						setCachedApiResponse("/api/catalog", STATUTORY_804N_NOMENCLATURE, {
							ttlMs: 15 * 60 * 1000,
						});
						newlySeeded++;
					}
				}
			}

			// 2.2 Справочник диагнозов МКБ-10
			if (
				missingUrls.includes("/api/clinical/icd10") ||
				missingUrls.includes("/api/icd10")
			) {
				const { ICD10_DICTIONARY } = await import("./icd10");
				if (ICD10_DICTIONARY && ICD10_DICTIONARY.length > 0) {
					if (!getCachedApiResponse("/api/clinical/icd10")) {
						setCachedApiResponse("/api/clinical/icd10", ICD10_DICTIONARY, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/icd10")) {
						setCachedApiResponse("/api/icd10", ICD10_DICTIONARY, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
				}
			}

			// 2.3 Шаблоны дневников ЭМК (043/у)
			if (
				missingUrls.includes("/api/templates") ||
				missingUrls.includes("/api/emr/templates")
			) {
				const { CLINICAL_1CLICK_TEMPLATES_CATALOG } = await import(
					"../components/emr/templates/clinicalDiaryTemplatesEngine"
				);
				if (
					CLINICAL_1CLICK_TEMPLATES_CATALOG &&
					CLINICAL_1CLICK_TEMPLATES_CATALOG.length > 0
				) {
					if (!getCachedApiResponse("/api/templates")) {
						setCachedApiResponse("/api/templates", CLINICAL_1CLICK_TEMPLATES_CATALOG, {
							ttlMs: 20 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/emr/templates")) {
						setCachedApiResponse(
							"/api/emr/templates",
							CLINICAL_1CLICK_TEMPLATES_CATALOG,
							{ ttlMs: 20 * 60 * 1000 },
						);
						newlySeeded++;
					}
				}
			}
		} catch {
			// Игнорируем ошибку динамической загрузки fallback справочников
		}

		// 2.4 Гарантированное сохранение в хранилище IndexedDB для 0 мс запуска на 5400 RPM HDD
		try {
			const { seedAllStatutoryCatalogsInIndexedDb } = await import(
				"../services/storage/statutoryCatalogCache"
			);
			void seedAllStatutoryCatalogsInIndexedDb().catch(() => {});
		} catch {
			// Игнорируем ошибку фонового сидирования
		}
	}

	// 3. Если устройство онлайн, планируем тихое фоновое обновление через requestIdleCallback без блокировки UI
	if (
		typeof window !== "undefined" &&
		typeof navigator !== "undefined" &&
		navigator.onLine
	) {
		const refreshOnline = async () => {
			const urlsToRefresh = [
				"/api/clinical/804n",
				"/api/clinical/icd10",
				"/api/templates",
				"/api/catalog",
			];
			for (const url of urlsToRefresh) {
				try {
					const res = await fetch(url, { cache: "no-cache" });
					if (res.ok) {
						const json = await res.json();
						setCachedApiResponse(url, json);
					}
				} catch {
					// Офлайн или серверная ошибка — не прерываем работу
				}
				// Дозируем I/O на HDD 5400 RPM: пауза между запросами для сохранения отзывчивости диска
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		};

		const idleWin = window as Window & {
			requestIdleCallback?: (
				cb: () => void,
				opts?: { timeout: number },
			) => number;
		};
		if (idleWin.requestIdleCallback) {
			idleWin.requestIdleCallback(() => void refreshOnline(), {
				timeout: 12000,
			});
		} else {
			window.setTimeout(() => void refreshOnline(), 6000);
		}
	}

	return {
		hydratedFromStorage,
		newlySeeded,
	};
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
