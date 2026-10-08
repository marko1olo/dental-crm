import { logger } from "../../../utils/logger";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";
import {
	APPOINTMENT_DRAFT_KEY_PREFIX,
	CASH_RECEIPT_DRAFT_KEY_PREFIX,
	DRAFTS_STORE_NAME,
	FORM_043_DRAFT_KEY_PREFIX,
	LOCAL_STORAGE_DRAFTS_PREFIX,
	ODONTOGRAM_DRAFT_KEY_PREFIX,
	PRESCRIPTION_DRAFT_KEY_PREFIX,
	VISIT_DRAFT_KEY_PREFIX,
} from "./constants";
import {
	isIndexedDbAvailable,
	withIdbTransactionRetry,
} from "./idbDatabase";
import {
	getLocalStorageDraft,
	removeLocalStorageDraft,
	saveLocalStorageDraft,
} from "./idbLocalStorageFallback";
import {
	inMemoryDraftsMap,
	setBoundedInMemoryMap,
} from "./idbMemory";
import type {
	MutationEntityType,
	OfflineDraft,
	SaveOfflineDraftOptions,
} from "./types";

interface PendingDraftFlush {
	draft: OfflineDraft<unknown>;
	timer: ReturnType<typeof setTimeout>;
}

const pendingDraftFlushesMap = new Map<string, PendingDraftFlush>();

/**
 * Принудительный сброс на диск (IndexedDB + LocalStorage) всех накопленных черновиков.
 */
export async function flushPendingOfflineDrafts(): Promise<void> {
	if (pendingDraftFlushesMap.size === 0) return;

	const toFlush: OfflineDraft<unknown>[] = [];
	for (const [, entry] of pendingDraftFlushesMap.entries()) {
		clearTimeout(entry.timer);
		toFlush.push(entry.draft);
	}
	if (toFlush.length === 0) return;

	if (!isIndexedDbAvailable()) {
		for (const draft of toFlush) {
			saveLocalStorageDraft(draft);
		}
		return;
	}

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				for (const draft of toFlush) {
					store.put(draft);
				}
				tx.oncomplete = () => resolve();
				tx.onerror = () =>
					reject(tx.error ?? new Error("Failed to flush pending drafts to IDB"));
				tx.onabort = () =>
					reject(tx.error ?? new Error("Transaction aborted while flushing pending drafts"));
			});
		});
		for (const draft of toFlush) {
			saveLocalStorageDraft(draft);
		}
	} catch (err) {
		logger.warn(
			`[OfflineStorage] Failed to flush pending drafts to IDB, saving to LocalStorage fallback`,
			err,
		);
		for (const draft of toFlush) {
			saveLocalStorageDraft(draft);
		}
	}
}

// Регистрация глобальных слушателей экстренного сброса при закрытии вкладки или входящем звонке
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
	const emergencyDraftFlush = () => {
		void flushPendingOfflineDrafts();
	};

	window.addEventListener("beforeunload", emergencyDraftFlush);
	window.addEventListener("pagehide", emergencyDraftFlush);
	if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				emergencyDraftFlush();
			}
		});
	}
	window.addEventListener("dente-telephony-incoming-call", emergencyDraftFlush);
}

/**
 * Сохранение черновика с дебаунсом дисковых операций (Anti-HDD Thrashing, Мандаты 8e, 8k, 8n).
 *
 * 1. L1 RAM (inMemoryDraftsMap) обновляется МГНОВЕННО (0 мс, 0 байт I/O).
 * 2. Запись на диск (IndexedDB + LocalStorage) откладывается на время debounceMs
 *    (по умолчанию адаптивно: 1800 мс на слабых ПК с 5400 RPM HDD, 800 мс на SSD).
 * 3. При повторном вызове до истечения таймера предыдущий таймер сбрасывается.
 * 4. При смене вкладки, закрытии окна или звонке телефонии данные мгновенно сбрасываются на диск.
 */
export function saveOfflineDraftDebounced<T = unknown>(
	draftKey: string,
	entityType: MutationEntityType,
	entityId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs?: number,
): OfflineDraft<T> {
	const now = new Date();
	const draft: OfflineDraft<T> = {
		draftKey,
		entityType,
		entityId,
		data,
		updatedAt: now.toISOString(),
		updatedAtMs: now.getTime(),
		organizationId,
		version: 1,
	};

	// 1. Немедленная запись в L1 RAM (0 мс) — гарантия мгновенного доступа и защиты от потери
	setBoundedInMemoryMap(inMemoryDraftsMap, draftKey, draft as OfflineDraft<unknown>);

	// 2. Сброс предыдущего отложенного таймера для этого ключа
	const existing = pendingDraftFlushesMap.get(draftKey);
	if (existing) {
		clearTimeout(existing.timer);
	}

	const timing = getOptimizedTiming();
	const effectiveDelay = debounceMs ?? timing.autosaveDebounceMs;

	const timer = setTimeout(async () => {
		pendingDraftFlushesMap.delete(draftKey);
		try {
			await withIdbTransactionRetry(async (db) => {
				return new Promise<void>((resolve, reject) => {
					const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
					const store = tx.objectStore(DRAFTS_STORE_NAME);
					const request = store.put(draft);
					request.onsuccess = () => resolve();
					request.onerror = () =>
						reject(request.error ?? new Error("Failed to save debounced draft to IDB"));
				});
			});
			saveLocalStorageDraft(draft);
		} catch (err) {
			logger.warn(
				`[OfflineStorage] Debounced IDB save failed for ${draftKey}, falling back to localStorage`,
				err,
			);
			saveLocalStorageDraft(draft);
		}
	}, effectiveDelay);

	pendingDraftFlushesMap.set(draftKey, {
		draft: draft as OfflineDraft<unknown>,
		timer,
	});

	return draft;
}

/**
 * Сохранение черновика документа/дневника в IndexedDB
 * (с бесшовным переходом на chunked LocalStorage и in-memory buffer при QuotaExceededError)
 */
export async function saveOfflineDraft<T = unknown>(
	draftKey: string,
	entityType: MutationEntityType,
	entityId: string,
	data: T,
	organizationId?: string | undefined,
	options?: SaveOfflineDraftOptions,
): Promise<OfflineDraft<T>> {
	if (options?.immediate === false) {
		return saveOfflineDraftDebounced<T>(
			draftKey,
			entityType,
			entityId,
			data,
			organizationId,
			options?.debounceMs,
		);
	}

	// Если был запланирован дебаунсированный сброс для этого ключа, отменяем его
	const pending = pendingDraftFlushesMap.get(draftKey);
	if (pending) {
		clearTimeout(pending.timer);
		pendingDraftFlushesMap.delete(draftKey);
	}

	const now = new Date();
	const draft: OfflineDraft<T> = {
		draftKey,
		entityType,
		entityId,
		data,
		updatedAt: now.toISOString(),
		updatedAtMs: now.getTime(),
		organizationId,
		version: 1,
	};

	// Always record in in-memory safety buffer with bounded memory cap
	setBoundedInMemoryMap(inMemoryDraftsMap, draftKey, draft as OfflineDraft<unknown>);

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.put(draft);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to save draft to IDB"));
			});
		});
		// Dual-storage resilience: mirror to LocalStorage immediately so synchronous lookups
		// and emergency recovery before IDB initialization are 100% guaranteed
		saveLocalStorageDraft(draft);
		return draft;
	} catch (err) {
		logger.warn(
			`[OfflineStorage] IDB save draft failed for ${draftKey} (${err instanceof Error ? err.name : "error"}), falling back to chunked localStorage & in-memory buffer`,
			err,
		);
		saveLocalStorageDraft(draft);
		return draft;
	}
}

/**
 * Синхронный мгновенный доступ к черновику из L1 оперативной памяти (0 мс, 0 байт I/O).
 * Защищает от лагов и фризов интерфейса при активном вводе текста в карте 043/у.
 */
export function getSynchronousDraft<T = unknown>(draftKey: string): OfflineDraft<T> | null {
	const memDraft = (inMemoryDraftsMap.get(draftKey) as OfflineDraft<T>) || null;
	if (memDraft) return memDraft;
	return getLocalStorageDraft<T>(draftKey);
}

/**
 * Синхронный мгновенный доступ к черновику визита (SOAP дневник 043/у) из L1 RAM (0 мс).
 */
export function loadVisitDraftSync<T = unknown>(visitId: string): OfflineDraft<T> | null {
	return getSynchronousDraft<T>(`${VISIT_DRAFT_KEY_PREFIX}${visitId}`);
}

/**
 * Загрузка черновика по ключу
 * (с многоуровневым чтением IndexedDB -> chunked LocalStorage -> in-memory buffer)
 */
export async function loadOfflineDraft<T = unknown>(
	draftKey: string,
): Promise<OfflineDraft<T> | null> {
	// 0ms L1 RAM Fast Path: if actively typed in-memory draft is fresh (< 5 min), return immediately without IDB disk queue
	const memDraft = (inMemoryDraftsMap.get(draftKey) as OfflineDraft<T>) || null;
	if (memDraft && memDraft.updatedAtMs && Date.now() - memDraft.updatedAtMs < 300_000) {
		return memDraft;
	}

	let idbDraft: OfflineDraft<T> | null = null;
	try {
		idbDraft = await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineDraft<T> | null>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readonly");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.get(draftKey);
				request.onsuccess = () => resolve((request.result as OfflineDraft<T>) ?? null);
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to load draft from IDB"));
			});
		});
	} catch (err) {
		logger.warn(
			`[OfflineStorage] IDB load draft failed for ${draftKey}, checking localStorage & in-memory buffer`,
			err,
		);
	}

	const localDraft = getLocalStorageDraft<T>(draftKey);

	const candidates = [idbDraft, localDraft, memDraft].filter(
		(d): d is OfflineDraft<T> => Boolean(d),
	);

	if (candidates.length === 0) return null;
	candidates.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
	return candidates[0] || null;
}

/**
 * Удаление сохранённого черновика
 */
export async function deleteOfflineDraft(draftKey: string): Promise<void> {
	const pending = pendingDraftFlushesMap.get(draftKey);
	if (pending) {
		clearTimeout(pending.timer);
		pendingDraftFlushesMap.delete(draftKey);
	}
	inMemoryDraftsMap.delete(draftKey);
	removeLocalStorageDraft(draftKey);
	if (!isIndexedDbAvailable()) return;
	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.delete(draftKey);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to delete draft from IDB"));
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Error deleting IDB draft ${draftKey}`, err);
	}
}

/**
 * Список всех сохранённых черновиков
 */
export async function listOfflineDrafts(filter?: {
	entityType?: MutationEntityType | undefined;
	organizationId?: string | undefined;
}): Promise<OfflineDraft[]> {
	try {
		const drafts = await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineDraft[]>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readonly");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.getAll();
				request.onsuccess = () => {
					const list = Array.isArray(request.result) ? request.result : [];
					resolve(list);
				};
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to list drafts from IDB"));
			});
		});

		return drafts
			.filter((d) => {
				if (filter?.entityType && d.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					d.organizationId &&
					d.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
	} catch {
		const list: OfflineDraft[] = Array.from(inMemoryDraftsMap.values());
		if (typeof window !== "undefined" && window.localStorage) {
			try {
				for (let i = 0; i < window.localStorage.length; i++) {
					const key = window.localStorage.key(i);
					if (key?.startsWith(LOCAL_STORAGE_DRAFTS_PREFIX)) {
						const draftKey = key.slice(LOCAL_STORAGE_DRAFTS_PREFIX.length);
						const d = getLocalStorageDraft(draftKey);
						if (d && !list.some((existing) => existing.draftKey === d.draftKey)) {
							list.push(d);
						}
					}
				}
			} catch {
				// ignore
			}
		}
		return list
			.filter((d) => {
				if (filter?.entityType && d.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					d.organizationId &&
					d.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Clinical Drafts (Visit Diary SOAP, Form 043/u, Odontogram)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Сохранение черновика визита (SOAP дневник 043/у)
 */
export async function saveVisitDraft<T = unknown>(
	visitId: string,
	data: T,
	organizationId?: string | undefined,
	options?: SaveOfflineDraftOptions,
): Promise<OfflineDraft<T>> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return saveOfflineDraft<T>(key, "DIARY_043_DRAFT", visitId, data, organizationId, options);
}

/**
 * Сохранение черновика визита с дебаунсом дисковых операций (Мандаты 8e, 8n)
 */
export function saveVisitDraftDebounced<T = unknown>(
	visitId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs?: number,
): OfflineDraft<T> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return saveOfflineDraftDebounced<T>(
		key,
		"DIARY_043_DRAFT",
		visitId,
		data,
		organizationId,
		debounceMs,
	);
}

/**
 * Загрузка черновика визита (SOAP дневник 043/у)
 */
export async function loadVisitDraft<T = unknown>(
	visitId: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика визита после успешного сохранения / подписания
 */
export async function deleteVisitDraft(visitId: string): Promise<void> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return deleteOfflineDraft(key);
}

/**
 * Сохранение черновика карты 043/у пациента (одонтограмма, анамнез, индексы)
 */
export async function saveForm043Draft<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
	options?: SaveOfflineDraftOptions,
): Promise<OfflineDraft<T>> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return saveOfflineDraft<T>(key, "DIARY_043_DRAFT", patientId, data, organizationId, options);
}

/**
 * Сохранение черновика карты 043/у пациента с дебаунсом дисковых операций
 */
export function saveForm043DraftDebounced<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs?: number,
): OfflineDraft<T> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return saveOfflineDraftDebounced<T>(
		key,
		"DIARY_043_DRAFT",
		patientId,
		data,
		organizationId,
		debounceMs,
	);
}

/**
 * Загрузка черновика карты 043/у пациента
 */
export async function loadForm043Draft<T = unknown>(
	patientId: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика карты 043/у пациента
 */
export async function deleteForm043Draft(patientId: string): Promise<void> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return deleteOfflineDraft(key);
}

/**
 * Сохранение черновика одонтограммы пациента (FDI 11–48 / 55–85)
 */
export async function saveOdontogramDraft<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return saveOfflineDraft<T>(key, "ODONTOGRAM_STATUS", patientId, data, organizationId);
}

/**
 * Загрузка черновика одонтограммы пациента
 */
export async function loadOdontogramDraft<T = unknown>(
	patientId: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика одонтограммы пациента
 */
export async function deleteOdontogramDraft(patientId: string): Promise<void> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return deleteOfflineDraft(key);
}

/**
 * Сохранение черновика рецепта / назначения (107-1/у)
 */
export async function savePrescriptionDraft<T = unknown>(
	id: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const key = `${PRESCRIPTION_DRAFT_KEY_PREFIX}${id}`;
	return saveOfflineDraft<T>(key, "PRESCRIPTION_107_DRAFT", id, data, organizationId);
}

/**
 * Загрузка черновика рецепта / назначения (107-1/у)
 */
export async function loadPrescriptionDraft<T = unknown>(
	id: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${PRESCRIPTION_DRAFT_KEY_PREFIX}${id}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика рецепта / назначения
 */
export async function deletePrescriptionDraft(id: string): Promise<void> {
	const key = `${PRESCRIPTION_DRAFT_KEY_PREFIX}${id}`;
	return deleteOfflineDraft(key);
}

/**
 * Сохранение черновика фискального чека / оплаты (54-ФЗ)
 */
export async function saveCashReceiptDraft<T = unknown>(
	id: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const key = `${CASH_RECEIPT_DRAFT_KEY_PREFIX}${id}`;
	return saveOfflineDraft<T>(key, "CASH_RECEIPT_DRAFT", id, data, organizationId);
}

/**
 * Загрузка черновика фискального чека / оплаты
 */
export async function loadCashReceiptDraft<T = unknown>(
	id: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${CASH_RECEIPT_DRAFT_KEY_PREFIX}${id}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика фискального чека / оплаты
 */
export async function deleteCashReceiptDraft(id: string): Promise<void> {
	const key = `${CASH_RECEIPT_DRAFT_KEY_PREFIX}${id}`;
	return deleteOfflineDraft(key);
}

/**
 * Сохранение черновика записи на прием в расписании
 */
export async function saveAppointmentDraft<T = unknown>(
	id: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const key = `${APPOINTMENT_DRAFT_KEY_PREFIX}${id}`;
	return saveOfflineDraft<T>(key, "APPOINTMENT_BOOKING_DRAFT", id, data, organizationId);
}

/**
 * Загрузка черновика записи на прием
 */
export async function loadAppointmentDraft<T = unknown>(
	id: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${APPOINTMENT_DRAFT_KEY_PREFIX}${id}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика записи на прием
 */
export async function deleteAppointmentDraft(id: string): Promise<void> {
	const key = `${APPOINTMENT_DRAFT_KEY_PREFIX}${id}`;
	return deleteOfflineDraft(key);
}
