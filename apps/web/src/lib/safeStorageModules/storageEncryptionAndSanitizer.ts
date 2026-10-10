/**
 * Защищенные операции чтения/записи/удаления ключей, изоляция токенов сессий (152-ФЗ)
 * и неблокирующая сериализация/десериализация JSON для слабых ПК.
 */

import {
	getIdbStorageFallback,
	getUnderlyingLocalStorage,
	getUnderlyingSessionStorage,
	isIdbStorageFallbackAvailable,
	isImmediateDiskKey,
	putInMemorySessionStorageCache,
	putInMemoryStorageCache,
	removeIdbStorageFallback,
	safeDeleteCookie,
	safeGetCookie,
	safeSetCookie,
	saveIdbStorageFallback,
} from "./memoryFallbackStore.js";
import {
	ensureTokenStorageListener,
	evictDisposableLocalStorageKeys,
	flushPendingSessionStorageWrites,
	flushPendingStorageWrites,
	isQuotaExceededError,
} from "./quotaEvictionEngine.js";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	DISK_FLUSH_DEBOUNCE_MS,
	PATIENT_TOKEN_KEY,
	storageState,
} from "./types.js";

export function safeLocalStorageGetItem(key: string): string | null {
	// 1. Проверяем очередь отложенных записей (самое свежее состояние)
	if (storageState.pendingDiskWrites.has(key)) {
		return storageState.pendingDiskWrites.get(key) ?? null;
	}

	const isTestEnv =
		typeof process !== "undefined" &&
		(process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST));

	// 2. В браузере проверяем in-memory кэш (0 мс, 0 дискового I/O на HDD 5400 RPM)
	if (!isTestEnv && storageState.inMemoryStorageCache.has(key)) {
		return storageState.inMemoryStorageCache.get(key) ?? null;
	}

	const storage = getUnderlyingLocalStorage();
	if (!storage) {
		return storageState.inMemoryStorageCache.get(key) ?? null;
	}
	try {
		ensureTokenStorageListener();
		const val = storage.getItem(key);
		if (val !== null) {
			putInMemoryStorageCache(key, val);
			return val;
		}
		const memVal = storageState.inMemoryStorageCache.get(key) ?? null;
		if (memVal !== null) {
			return memVal;
		}
		putInMemoryStorageCache(key, null);
		return null;
	} catch {
		return storageState.inMemoryStorageCache.get(key) ?? null;
	}
}

export function safeLocalStorageSetItem(key: string, value: string, immediate = false): boolean {
	if (key === DENTE_STAFF_TOKEN_KEY) {
		storageState.inMemoryStaffToken = value.trim();
		safeSetCookie(DENTE_STAFF_TOKEN_KEY, storageState.inMemoryStaffToken, 365);
		void saveIdbStorageFallback(DENTE_STAFF_TOKEN_KEY, storageState.inMemoryStaffToken);
	} else if (key === DENTE_CLINIC_TOKEN_KEY) {
		storageState.inMemoryClinicToken = value.trim();
		safeSetCookie(DENTE_CLINIC_TOKEN_KEY, storageState.inMemoryClinicToken, 365);
		void saveIdbStorageFallback(DENTE_CLINIC_TOKEN_KEY, storageState.inMemoryClinicToken);
	}

	// 1. Проверка на идентичность: исключаем паразитный дисковый I/O на HDD 5400 RPM, если значение не изменилось
	const currentCached = storageState.inMemoryStorageCache.get(key);
	const hasPending = storageState.pendingDiskWrites.has(key);
	if (storageState.inMemoryStorageCache.has(key) && currentCached === value) {
		if (!hasPending || storageState.pendingDiskWrites.get(key) === value) {
			return true;
		}
	}

	// Мгновенное обновление памяти: последующие чтения сразу видят новое значение
	putInMemoryStorageCache(key, value);

	const storage = getUnderlyingLocalStorage();
	if (!storage) {
		if (isIdbStorageFallbackAvailable()) {
			void saveIdbStorageFallback(key, value);
			return true;
		}
		return false;
	}

	ensureTokenStorageListener();

	// Критические ключи или явный флаг immediate пишутся синхронно с защитой от QuotaExceeded
	if (immediate || isImmediateDiskKey(key)) {
		storageState.pendingDiskWrites.delete(key);
		try {
			storage.setItem(key, value);
			return true;
		} catch (err) {
			if (isQuotaExceededError(err)) {
				evictDisposableLocalStorageKeys();
				try {
					storage.setItem(key, value);
					return true;
				} catch {
					// LocalStorage переполнен даже после очистки: спасаем в IndexedDB fallback
					void saveIdbStorageFallback(key, value);
					return true;
				}
			}
			void saveIdbStorageFallback(key, value);
			return true;
		}
	}

	// Регулярные ключи дебаунсятся для защиты HDD 5400 RPM от постоянного фриза главного потока
	storageState.pendingDiskWrites.set(key, value);
	if (storageState.diskFlushTimer === null) {
		storageState.diskFlushTimer = setTimeout(() => {
			storageState.diskFlushTimer = null;
			if (
				typeof window !== "undefined" &&
				typeof (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback === "function"
			) {
				(window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(
					() => flushPendingStorageWrites(),
					{ timeout: 1000 },
				);
			} else {
				flushPendingStorageWrites();
			}
		}, DISK_FLUSH_DEBOUNCE_MS);
	}
	return true;
}

export function safeLocalStorageRemoveItem(key: string): boolean {
	if (key === DENTE_STAFF_TOKEN_KEY) {
		storageState.inMemoryStaffToken = "";
		safeDeleteCookie(DENTE_STAFF_TOKEN_KEY);
	} else if (key === DENTE_CLINIC_TOKEN_KEY) {
		storageState.inMemoryClinicToken = "";
		safeDeleteCookie(DENTE_CLINIC_TOKEN_KEY);
	}

	const alreadyNull =
		storageState.inMemoryStorageCache.has(key) &&
		storageState.inMemoryStorageCache.get(key) === null;
	const hadPending = storageState.pendingDiskWrites.has(key);
	storageState.inMemoryStorageCache.set(key, null);
	storageState.pendingDiskWrites.delete(key);

	const storage = getUnderlyingLocalStorage();
	if (!storage) {
		void removeIdbStorageFallback(key);
		return false;
	}
	if (alreadyNull && !hadPending) {
		void removeIdbStorageFallback(key);
		return true;
	}
	try {
		ensureTokenStorageListener();
		storage.removeItem(key);
		void removeIdbStorageFallback(key);
		return true;
	} catch {
		void removeIdbStorageFallback(key);
		return false;
	}
}

export function readDenteStaffToken(): string {
	if (storageState.inMemoryStaffToken !== null) return storageState.inMemoryStaffToken;
	ensureTokenStorageListener();
	let token = safeLocalStorageGetItem(DENTE_STAFF_TOKEN_KEY)?.trim() || "";
	// Резервное восстановление из Cookie (Мандат 8e: гарантированное сохранение сессии)
	if (!token) {
		const cookieToken = safeGetCookie(DENTE_STAFF_TOKEN_KEY)?.trim() || "";
		if (cookieToken) {
			token = cookieToken;
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, token, true);
		}
	}
	storageState.inMemoryStaffToken = token;
	return storageState.inMemoryStaffToken;
}

export function readDenteClinicToken(): string {
	if (storageState.inMemoryClinicToken !== null) return storageState.inMemoryClinicToken;
	ensureTokenStorageListener();
	let token = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY)?.trim() || "";
	// Резервное восстановление из Cookie (Мандат 8e: гарантированное сохранение сессии)
	if (!token) {
		const cookieToken = safeGetCookie(DENTE_CLINIC_TOKEN_KEY)?.trim() || "";
		if (cookieToken) {
			token = cookieToken;
			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, token, true);
		}
	}
	storageState.inMemoryClinicToken = token;
	return storageState.inMemoryClinicToken;
}

export function readPatientToken(): string {
	return safeLocalStorageGetItem(PATIENT_TOKEN_KEY)?.trim() || "";
}

/**
 * Безопасный доступ к sessionStorage.
 *
 * Та же DOMException в приватном режиме / при запрете хранения, что и у
 * localStorage. Нужен для маркера однократной перезагрузки после смены
 * Service Worker controller (main.tsx) — без try/catch вкладка падает
 * белым экраном ещё до AppShell.
 */

export function safeSessionStorageGetItem(key: string): string | null {
	if (storageState.pendingSessionDiskWrites.has(key)) {
		return storageState.pendingSessionDiskWrites.get(key) ?? null;
	}

	const isTestEnv =
		typeof process !== "undefined" &&
		(process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST));

	if (!isTestEnv && storageState.inMemorySessionStorageCache.has(key)) {
		return storageState.inMemorySessionStorageCache.get(key) ?? null;
	}
	const storage = getUnderlyingSessionStorage();
	if (!storage) {
		return storageState.inMemorySessionStorageCache.get(key) ?? null;
	}
	try {
		const val = storage.getItem(key);
		putInMemorySessionStorageCache(key, val);
		return val;
	} catch {
		return storageState.inMemorySessionStorageCache.get(key) ?? null;
	}
}

export function safeSessionStorageSetItem(key: string, value: string, immediate = false): boolean {
	// 1. Проверка на идентичность: исключаем паразитный дисковый I/O на медленных накопителях
	const currentCached = storageState.inMemorySessionStorageCache.get(key);
	const hasPending = storageState.pendingSessionDiskWrites.has(key);
	if (storageState.inMemorySessionStorageCache.has(key) && currentCached === value) {
		if (!hasPending || storageState.pendingSessionDiskWrites.get(key) === value) {
			return true;
		}
	}

	putInMemorySessionStorageCache(key, value);
	const storage = getUnderlyingSessionStorage();
	if (!storage) return false;
	if (immediate) {
		storageState.pendingSessionDiskWrites.delete(key);
		try {
			storage.setItem(key, value);
			return true;
		} catch {
			return false;
		}
	}
	storageState.pendingSessionDiskWrites.set(key, value);
	if (storageState.sessionDiskFlushTimer === null) {
		storageState.sessionDiskFlushTimer = setTimeout(() => {
			storageState.sessionDiskFlushTimer = null;
			if (
				typeof window !== "undefined" &&
				typeof (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback === "function"
			) {
				(window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(
					() => flushPendingSessionStorageWrites(),
					{ timeout: 1000 },
				);
			} else {
				flushPendingSessionStorageWrites();
			}
		}, DISK_FLUSH_DEBOUNCE_MS);
	}
	return true;
}

export function safeSessionStorageRemoveItem(key: string): boolean {
	const alreadyNull =
		storageState.inMemorySessionStorageCache.has(key) &&
		storageState.inMemorySessionStorageCache.get(key) === null;
	const hadPending = storageState.pendingSessionDiskWrites.has(key);
	storageState.inMemorySessionStorageCache.set(key, null);
	storageState.pendingSessionDiskWrites.delete(key);
	const storage = getUnderlyingSessionStorage();
	if (!storage) return false;
	if (alreadyNull && !hadPending) {
		return true;
	}
	try {
		storage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}

/**
 * Чтение JSON из кэша памяти без синхронного дискового I/O (Anti-Freeze 5400 RPM).
 */
export function safeLocalStorageGetJson<T>(key: string, defaultValue: T): T {
	const raw = safeLocalStorageGetItem(key);
	if (!raw) return defaultValue;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return defaultValue;
	}
}

/**
 * Запись JSON с отложенным сбросом на диск (Debounced 400ms) для защиты HDD от фризов.
 */
export function safeLocalStorageSetJson(
	key: string,
	value: unknown,
	immediate = false,
): boolean {
	try {
		return safeLocalStorageSetItem(key, JSON.stringify(value), immediate);
	} catch {
		return false;
	}
}

/**
 * Асинхронный неблокирующий парсинг больших JSON-строк (>32KB).
 * Для объемных сериализованных структур (каталоги 804н, история приемов, дампы)
 * задействует нативный поток декодирования браузера через Response.prototype.json(),
 * предотвращая просадку FPS и блокировку главного потока на 2-ядерных CPU картофельных ноутбуков.
 */
export async function parseJsonNonBlocking<T = unknown>(raw: string): Promise<T> {
	if (!raw) return null as T;
	// Для компактных строк синхронный JSON.parse быстрее, так как не имеет оверхеда Stream/Promise
	if (raw.length < 32768) {
		return JSON.parse(raw) as T;
	}
	if (typeof Response !== "undefined") {
		try {
			return (await new Response(raw).json()) as T;
		} catch {
			return JSON.parse(raw) as T;
		}
	}
	return JSON.parse(raw) as T;
}

/**
 * Асинхронное получение значения из safeLocalStorage с автоматической проверкой IndexedDB fallback.
 */
export async function safeLocalStorageGetItemAsync(key: string): Promise<string | null> {
	const syncVal = safeLocalStorageGetItem(key);
	if (syncVal !== null) return syncVal;
	const idbVal = await getIdbStorageFallback(key);
	if (idbVal !== null) {
		putInMemoryStorageCache(key, idbVal);
		return idbVal;
	}
	return null;
}

/**
 * Асинхронное чтение JSON из safeLocalStorage с фоновым парсингом больших объемов и проверкой IndexedDB fallback.
 */
export async function safeLocalStorageGetJsonAsync<T>(
	key: string,
	defaultValue: T,
): Promise<T> {
	const raw = await safeLocalStorageGetItemAsync(key);
	if (!raw) return defaultValue;
	try {
		const parsed = await parseJsonNonBlocking<T>(raw);
		return parsed ?? defaultValue;
	} catch {
		return defaultValue;
	}
}
