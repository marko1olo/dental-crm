/**
 * Типы, константы и разделяемое in-memory состояние для безопасного доступа к localStorage / sessionStorage.
 *
 * ОПТИМИЗАЦИЯ ДЛЯ МЕДЛЕННЫХ HDD 5400 RPM И 4GB RAM (Мандаты 8n, 8k):
 * Хранит L1 RAM-кэш, очереди отложенной записи (Debounced Write Queue) и дескриптор IndexedDB fallback.
 */

/** Токен сотрудника кабинета (PIN/login session). */
export const DENTE_STAFF_TOKEN_KEY = "dente_staff_token";

/** Токен клиники (cabinet unlock). */
export const DENTE_CLINIC_TOKEN_KEY = "dente_clinic_token";

/** Токен личного кабинета пациента (OTP session). */
export const PATIENT_TOKEN_KEY = "patient_token";

/** Настраиваемый таймаут неактивности экрана приватности врача (152-ФЗ) в минутах. */
export const DENTE_INACTIVITY_TIMEOUT_KEY = "dente_inactivity_timeout_minutes";

/** Состояние блокировки экрана приватности врача (152-ФЗ). */
export const DENTE_PRIVACY_SHIELD_LOCKED_KEY = "dente_privacy_shield_locked";

/** Максимальное число элементов в L1 in-memory кэше */
export const MAX_IN_MEMORY_CACHE_ITEMS = 500;

/** Задержка дебаунса для сброса на диск (мс) per Mandate 8n (5400 RPM HDD & 4GB RAM) */
export const DISK_FLUSH_DEBOUNCE_MS = 400;

/** Имя базы данных IndexedDB для аварийного сохранения при переполнении LocalStorage (QuotaExceededError) */
export const IDB_FALLBACK_DB_NAME = "dente_local_storage_fallback_v1";
export const IDB_FALLBACK_STORE_NAME = "storage_kv";
export const IDB_FALLBACK_VERSION = 1;

/** Опции записи в безопасное хранилище */
export interface SafeStorageOptions {
	immediate?: boolean;
	ttlMs?: number;
	tenantId?: string;
}

/** Метаданные TTL/LRU элемента кэша */
export interface StorageCacheMetadata {
	key: string;
	updatedAt: number;
	expiresAt?: number;
}

/** Отчет о состоянии квоты и очистки хранилища */
export interface StorageQuotaReport {
	evictedCount: number;
	usedIdbFallback: boolean;
}

/** Политика безопасности ПДн (152-ФЗ) для ключей локального хранилища */
export interface PdnSecurityPolicy {
	isImmediateDiskKey: boolean;
	requiresCookieBackup: boolean;
	requiresIdbFallback: boolean;
}

/** Запись в объектном хранилище IndexedDB fallback */
export interface IdbStorageFallbackRecord {
	key: string;
	value: string;
	updatedAt?: number;
}

/** Внутреннее разделяемое состояние модуля безопасного хранилища */
export interface SafeStorageRuntimeState {
	inMemoryStaffToken: string | null;
	inMemoryClinicToken: string | null;
	tokenStorageListenerAttached: boolean;
	readonly inMemoryStorageCache: Map<string, string | null>;
	readonly pendingDiskWrites: Map<string, string>;
	diskFlushTimer: ReturnType<typeof setTimeout> | null;
	isFlushingDisk: boolean;
	readonly inMemorySessionStorageCache: Map<string, string | null>;
	readonly pendingSessionDiskWrites: Map<string, string>;
	sessionDiskFlushTimer: ReturnType<typeof setTimeout> | null;
	isFlushingSessionDisk: boolean;
	idbFallbackDbPromise: Promise<IDBDatabase | null> | null;
}

export const storageState: SafeStorageRuntimeState = {
	inMemoryStaffToken: null,
	inMemoryClinicToken: null,
	tokenStorageListenerAttached: false,
	inMemoryStorageCache: new Map<string, string | null>(),
	pendingDiskWrites: new Map<string, string>(),
	diskFlushTimer: null,
	isFlushingDisk: false,
	inMemorySessionStorageCache: new Map<string, string | null>(),
	pendingSessionDiskWrites: new Map<string, string>(),
	sessionDiskFlushTimer: null,
	isFlushingSessionDisk: false,
	idbFallbackDbPromise: null,
};
