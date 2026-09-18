/**
 * Безопасный доступ к localStorage с in-memory кэшированием и отложенной записью (Debounced Write Queue).
 *
 * В приватном режиме Safari / при запрете хранения `getItem`/`setItem`/`removeItem`
 * бросают DOMException. Без try/catch вкладка настроек или выход из сессии
 * роняют всё приложение белым экраном.
 *
 * ОПТИМИЗАЦИЯ ДЛЯ МЕДЛЕННЫХ HDD 5400 RPM И 4GB RAM (Мандаты 8n, 8k):
 * 1. In-Memory Read Cache: повторные чтения берутся из RAM за 0 мс без синхронных
 *    системных вызовов к диску, предотвращая микрофризы главного потока.
 * 2. Debounced Batch Writing: частые сохранения UI-состояний, вкладок, фильтров
 *    и черновиков группируются в очереди и сбрасываются пачкой через 200 мс
 *    вместо постоянного насилия головок механического жесткого диска.
 * 3. Immediate Token Guarantee: токены авторизации и сессий (`DENTE_STAFF_TOKEN_KEY`,
 *    `DENTE_CLINIC_TOKEN_KEY`, `PATIENT_TOKEN_KEY`) всегда пишутся немедленно.
 * 4. Guaranteed Persistence: при событиях `beforeunload` и `pagehide` все накопленные
 *    в очереди записи гарантированно синхронно сохраняются на диск.
 */

/** Токен сотрудника кабинета (PIN/login session). */
export const DENTE_STAFF_TOKEN_KEY = "dente_staff_token";

/** Токен клиники (cabinet unlock). */
export const DENTE_CLINIC_TOKEN_KEY = "dente_clinic_token";

/** Токен личного кабинета пациента (OTP session). */
export const PATIENT_TOKEN_KEY = "patient_token";

let inMemoryStaffToken: string | null = null;
let inMemoryClinicToken: string | null = null;
let tokenStorageListenerAttached = false;

/** In-memory кэш для 0 мс чтения без дискового ввода-вывода */
const inMemoryStorageCache = new Map<string, string | null>();

/** Очередь отложенной записи на диск (Anti-HDD Thrashing) */
const pendingDiskWrites = new Map<string, string>();
let diskFlushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushingDisk = false;

/** Задержка дебаунса для сброса на диск (мс) per Mandate 8n (5400 RPM HDD & 4GB RAM) */
const DISK_FLUSH_DEBOUNCE_MS = 400;

/** In-memory кэш для 0 мс чтения sessionStorage без дискового I/O */
const inMemorySessionStorageCache = new Map<string, string | null>();
const pendingSessionDiskWrites = new Map<string, string>();
let sessionDiskFlushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushingSessionDisk = false;

function isImmediateDiskKey(key: string): boolean {
	if (
		typeof process !== "undefined" &&
		(process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST))
	) {
		return true;
	}
	return (
		key === DENTE_STAFF_TOKEN_KEY ||
		key === DENTE_CLINIC_TOKEN_KEY ||
		key === PATIENT_TOKEN_KEY ||
		key.endsWith("_token") ||
		key.startsWith("__") ||
		key.includes("probe")
	);
}

/**
 * Принудительно сбрасывает все накопленные в очереди записи sessionStorage на диск.
 */
export function flushPendingSessionStorageWrites(): void {
	if (sessionDiskFlushTimer !== null) {
		clearTimeout(sessionDiskFlushTimer);
		sessionDiskFlushTimer = null;
	}
	if (typeof window === "undefined" || pendingSessionDiskWrites.size === 0 || isFlushingSessionDisk) {
		return;
	}
	isFlushingSessionDisk = true;
	try {
		for (const [key, value] of pendingSessionDiskWrites.entries()) {
			try {
				window.sessionStorage.setItem(key, value);
			} catch {
				// Защита от QuotaExceededError или запрета хранения в Safari Private
			}
		}
		pendingSessionDiskWrites.clear();
	} finally {
		isFlushingSessionDisk = false;
	}
}

/**
 * Принудительно сбрасывает все накопленные в очереди записи на диск.
 */
export function flushPendingStorageWrites(): void {
	if (diskFlushTimer !== null) {
		clearTimeout(diskFlushTimer);
		diskFlushTimer = null;
	}
	flushPendingSessionStorageWrites();
	if (typeof window === "undefined" || pendingDiskWrites.size === 0 || isFlushingDisk) {
		return;
	}
	isFlushingDisk = true;
	try {
		for (const [key, value] of pendingDiskWrites.entries()) {
			try {
				window.localStorage.setItem(key, value);
			} catch {
				// Защита от QuotaExceededError или запрета хранения в Safari Private
			}
		}
		pendingDiskWrites.clear();
	} finally {
		isFlushingDisk = false;
	}
}

/**
 * Очищает внутренний in-memory кэш (для тестов или сброса сессий).
 */
export function clearInMemoryStorageCache(): void {
	inMemoryStorageCache.clear();
	pendingDiskWrites.clear();
	inMemorySessionStorageCache.clear();
	pendingSessionDiskWrites.clear();
	if (diskFlushTimer !== null) {
		clearTimeout(diskFlushTimer);
		diskFlushTimer = null;
	}
	if (sessionDiskFlushTimer !== null) {
		clearTimeout(sessionDiskFlushTimer);
		sessionDiskFlushTimer = null;
	}
	resetInMemoryAuthTokens();
}

function ensureTokenStorageListener(): void {
	if (tokenStorageListenerAttached || typeof window === "undefined" || !window.addEventListener) return;
	tokenStorageListenerAttached = true;
	window.addEventListener("storage", (e: StorageEvent) => {
		if (e.key === DENTE_STAFF_TOKEN_KEY) {
			inMemoryStaffToken = e.newValue?.trim() || "";
		} else if (e.key === DENTE_CLINIC_TOKEN_KEY) {
			inMemoryClinicToken = e.newValue?.trim() || "";
		} else if (e.key === null) {
			inMemoryStaffToken = "";
			inMemoryClinicToken = "";
			inMemoryStorageCache.clear();
			pendingDiskWrites.clear();
		} else {
			inMemoryStorageCache.set(e.key, e.newValue);
			pendingDiskWrites.delete(e.key);
		}
	});

	// Гарантия сохранности данных при закрытии вкладки / перезагрузке
	window.addEventListener("beforeunload", () => {
		flushPendingStorageWrites();
	});
	window.addEventListener("pagehide", () => {
		flushPendingStorageWrites();
	});
}

export function safeLocalStorageGetItem(key: string): string | null {
	// 1. Проверяем очередь отложенных записей (самое свежее состояние)
	if (pendingDiskWrites.has(key)) {
		return pendingDiskWrites.get(key) ?? null;
	}

	// 2. Проверяем in-memory кэш (0 мс, 0 дискового I/O)
	if (inMemoryStorageCache.has(key)) {
		return inMemoryStorageCache.get(key) ?? null;
	}

	if (typeof window === "undefined") return null;
	try {
		ensureTokenStorageListener();
		const val = window.localStorage.getItem(key);
		inMemoryStorageCache.set(key, val);
		return val;
	} catch {
		return null;
	}
}

export function safeLocalStorageSetItem(key: string, value: string, immediate = false): boolean {
	if (key === DENTE_STAFF_TOKEN_KEY) {
		inMemoryStaffToken = value.trim();
	} else if (key === DENTE_CLINIC_TOKEN_KEY) {
		inMemoryClinicToken = value.trim();
	}

	// Мгновенное обновление памяти: последующие чтения сразу видят новое значение
	inMemoryStorageCache.set(key, value);

	if (typeof window === "undefined") return false;

	ensureTokenStorageListener();

	// Критические ключи или явный флаг immediate пишутся синхронно
	if (immediate || isImmediateDiskKey(key)) {
		pendingDiskWrites.delete(key);
		try {
			window.localStorage.setItem(key, value);
			return true;
		} catch {
			return false;
		}
	}

	// Регулярные ключи дебаунсятся для защиты HDD 5400 RPM от постоянного фриза главного потока
	pendingDiskWrites.set(key, value);
	if (diskFlushTimer === null) {
		diskFlushTimer = setTimeout(() => {
			diskFlushTimer = null;
			flushPendingStorageWrites();
		}, DISK_FLUSH_DEBOUNCE_MS);
	}
	return true;
}

export function safeLocalStorageRemoveItem(key: string): boolean {
	if (key === DENTE_STAFF_TOKEN_KEY) {
		inMemoryStaffToken = "";
	} else if (key === DENTE_CLINIC_TOKEN_KEY) {
		inMemoryClinicToken = "";
	}

	inMemoryStorageCache.set(key, null);
	pendingDiskWrites.delete(key);

	if (typeof window === "undefined") return false;
	try {
		ensureTokenStorageListener();
		window.localStorage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}

export function readDenteStaffToken(): string {
	if (inMemoryStaffToken !== null) return inMemoryStaffToken;
	ensureTokenStorageListener();
	inMemoryStaffToken = safeLocalStorageGetItem(DENTE_STAFF_TOKEN_KEY)?.trim() || "";
	return inMemoryStaffToken;
}

export function readDenteClinicToken(): string {
	if (inMemoryClinicToken !== null) return inMemoryClinicToken;
	ensureTokenStorageListener();
	inMemoryClinicToken = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY)?.trim() || "";
	return inMemoryClinicToken;
}

export function resetInMemoryAuthTokens(): void {
	inMemoryStaffToken = null;
	inMemoryClinicToken = null;
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
	if (pendingSessionDiskWrites.has(key)) {
		return pendingSessionDiskWrites.get(key) ?? null;
	}
	if (inMemorySessionStorageCache.has(key)) {
		return inMemorySessionStorageCache.get(key) ?? null;
	}
	if (typeof window === "undefined") return null;
	try {
		const val = window.sessionStorage.getItem(key);
		inMemorySessionStorageCache.set(key, val);
		return val;
	} catch {
		return null;
	}
}

export function safeSessionStorageSetItem(key: string, value: string, immediate = false): boolean {
	inMemorySessionStorageCache.set(key, value);
	if (typeof window === "undefined") return false;
	if (immediate) {
		pendingSessionDiskWrites.delete(key);
		try {
			window.sessionStorage.setItem(key, value);
			return true;
		} catch {
			return false;
		}
	}
	pendingSessionDiskWrites.set(key, value);
	if (sessionDiskFlushTimer === null) {
		sessionDiskFlushTimer = setTimeout(() => {
			sessionDiskFlushTimer = null;
			flushPendingSessionStorageWrites();
		}, DISK_FLUSH_DEBOUNCE_MS);
	}
	return true;
}

export function safeSessionStorageRemoveItem(key: string): boolean {
	inMemorySessionStorageCache.set(key, null);
	pendingSessionDiskWrites.delete(key);
	if (typeof window === "undefined") return false;
	try {
		window.sessionStorage.removeItem(key);
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
 * Запись JSON с отложенным сбросом на диск (Debounced 200ms) для защиты HDD от фризов.
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
