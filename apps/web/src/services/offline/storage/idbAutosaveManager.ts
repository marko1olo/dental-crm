import { logger } from "../../../utils/logger";
import { flushBatchedStoreWritesSyncToLocalStorage } from "./idbBatchBuffer";
import {
	APPOINTMENT_DRAFT_KEY_PREFIX,
	DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
	FORM_043_DRAFT_KEY_PREFIX,
	ODONTOGRAM_DRAFT_KEY_PREFIX,
	PRESCRIPTION_DRAFT_KEY_PREFIX,
	VISIT_DRAFT_KEY_PREFIX,
} from "./constants";
import { saveOfflineDraft } from "./idbDraftOps";
import {
	getLocalStorageMutations,
	saveLocalStorageDraft,
	saveLocalStorageMutations,
} from "./idbLocalStorageFallback";
import {
	inMemoryDraftsMap,
	inMemoryMutationsMap,
	setBoundedInMemoryMap,
} from "./idbMemory";
import type {
	AutosaveEntry,
	MutationEntityType,
	OfflineDraft,
} from "./types";

export class ClinicalDraftAutosaveManager {
	private static instance: ClinicalDraftAutosaveManager | null = null;
	private pendingEntries = new Map<string, AutosaveEntry<unknown>>();

	public static getInstance(): ClinicalDraftAutosaveManager {
		if (!ClinicalDraftAutosaveManager.instance) {
			ClinicalDraftAutosaveManager.instance = new ClinicalDraftAutosaveManager();
		}
		return ClinicalDraftAutosaveManager.instance;
	}

	constructor() {
		this.initUnloadListener();
	}

	/**
	 * Планирование автосохранения черновика с 3-секундным дебаунсом
	 */
	public scheduleAutosave<T = unknown>(
		draftKey: string,
		entityType: MutationEntityType,
		entityId: string,
		data: T,
		organizationId?: string | undefined,
		debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
	): Promise<OfflineDraft<T>> {
		return new Promise<OfflineDraft<T>>((resolve, reject) => {
			const existing = this.pendingEntries.get(draftKey);
			if (existing?.timer) {
				clearTimeout(existing.timer);
			}

			// Low-Spec 0ms L1 Hit: update in-memory draft map immediately before debounce write
			const now = new Date();
			const inMemDraft: OfflineDraft<T> = {
				draftKey,
				entityType,
				entityId,
				data,
				updatedAt: now.toISOString(),
				updatedAtMs: now.getTime(),
				organizationId,
				version: 1,
			};
			setBoundedInMemoryMap(inMemoryDraftsMap, draftKey, inMemDraft as OfflineDraft<unknown>);

			const entry: AutosaveEntry<T> = {
				draftKey,
				entityType,
				entityId,
				data,
				organizationId,
				timer: null,
				lastScheduledAtMs: Date.now(),
			};

			entry.timer = setTimeout(async () => {
				this.pendingEntries.delete(draftKey);
				try {
					const saved = await saveOfflineDraft<T>(
						draftKey,
						entityType,
						entityId,
						data,
						organizationId,
					);
					resolve(saved);
				} catch (err) {
					reject(err);
				}
			}, debounceMs);

			this.pendingEntries.set(draftKey, entry as AutosaveEntry<unknown>);
		});
	}

	/**
	 * Мгновенный сброс (Flush) всех отложенных черновиков на диск
	 */
	public async flushAll(): Promise<number> {
		const entries = Array.from(this.pendingEntries.values());
		this.pendingEntries.clear();

		let savedCount = 0;
		for (const entry of entries) {
			if (entry.timer) {
				clearTimeout(entry.timer);
			}
			try {
				await saveOfflineDraft(
					entry.draftKey,
					entry.entityType,
					entry.entityId,
					entry.data,
					entry.organizationId,
				);
				savedCount++;
			} catch (err) {
				logger.error(`[AutosaveManager] Flush error for ${entry.draftKey}`, err);
			}
		}
		return savedCount;
	}

	/**
	 * Синхронный мгновенный сброс (Flush) всех отложенных черновиков в localStorage и in-memory buffer.
	 * Критически важен для beforeunload и pagehide, когда асинхронные микротаски могут быть прерваны браузером.
	 */
	public flushAllSync(): number {
		const entries = Array.from(this.pendingEntries.values());
		this.pendingEntries.clear();

		let savedCount = 0;
		for (const entry of entries) {
			if (entry.timer) {
				clearTimeout(entry.timer);
			}
			try {
				const now = new Date();
				const draft: OfflineDraft<unknown> = {
					draftKey: entry.draftKey,
					entityType: entry.entityType,
					entityId: entry.entityId,
					data: entry.data,
					updatedAt: now.toISOString(),
					updatedAtMs: now.getTime(),
					organizationId: entry.organizationId,
					version: 1,
				};
				setBoundedInMemoryMap(inMemoryDraftsMap, entry.draftKey, draft);
				saveLocalStorageDraft(draft);
				savedCount++;
			} catch (err) {
				logger.error(`[AutosaveManager] Sync flush error for ${entry.draftKey}`, err);
			}
		}
		return savedCount;
	}

	/**
	 * Мгновенный сброс конкретного черновика
	 */
	public async flushKey<T = unknown>(draftKey: string): Promise<OfflineDraft<T> | null> {
		const entry = this.pendingEntries.get(draftKey);
		if (!entry) return null;

		this.pendingEntries.delete(draftKey);
		if (entry.timer) {
			clearTimeout(entry.timer);
		}

		// Синхронный fallback в localStorage
		const now = new Date();
		const draft: OfflineDraft<T> = {
			draftKey: entry.draftKey,
			entityType: entry.entityType,
			entityId: entry.entityId,
			data: entry.data as T,
			updatedAt: now.toISOString(),
			updatedAtMs: now.getTime(),
			organizationId: entry.organizationId,
			version: 1,
		};
		setBoundedInMemoryMap(inMemoryDraftsMap, entry.draftKey, draft as OfflineDraft<unknown>);
		saveLocalStorageDraft(draft);

		return saveOfflineDraft<T>(
			entry.draftKey,
			entry.entityType,
			entry.entityId,
			entry.data as T,
			entry.organizationId,
		);
	}

	/**
	 * Отмена отложенного автосохранения
	 */
	public cancel(draftKey: string): boolean {
		const entry = this.pendingEntries.get(draftKey);
		if (!entry) return false;
		if (entry.timer) {
			clearTimeout(entry.timer);
		}
		this.pendingEntries.delete(draftKey);
		return true;
	}

	public isPending(draftKey: string): boolean {
		return this.pendingEntries.has(draftKey);
	}

	public getPendingCount(): number {
		return this.pendingEntries.size;
	}

	private initUnloadListener(): void {
		if (typeof window === "undefined") return;
		const flush = () => {
			emergencyFlushAllOfflineData();
			void this.flushAll();
		};
		window.addEventListener("beforeunload", flush);
		window.addEventListener("pagehide", flush);
		if ("onfreeze" in window) {
			window.addEventListener("freeze", flush);
		}
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "hidden") {
					emergencyFlushAllOfflineData();
					void this.flushAll();
				}
			});
		}
	}
}

export const clinicalDraftAutosaver = ClinicalDraftAutosaveManager.getInstance();

/**
 * Глобальный аварийный сброс всех данных при выгрузке/закрытии окна
 * (beforeunload, pagehide, visibilitychange, freeze, native exit).
 * Синхронно сохраняет все отложенные черновики и мутации из памяти в localStorage.
 */
export function emergencyFlushAllOfflineData(): { draftsSaved: number; mutationsSaved: number } {
	let draftsSaved = 0;
	let mutationsSaved = 0;

	try {
		// 1. Сброс черновиков автосохранения
		draftsSaved = clinicalDraftAutosaver.flushAllSync();

		// 2. Сброс in-memory мутаций в localStorage
		if (inMemoryMutationsMap.size > 0) {
			const existingList = getLocalStorageMutations();
			const existingIds = new Set(existingList.map((m) => m.mutationId));
			let added = false;
			for (const mutation of inMemoryMutationsMap.values()) {
				if (!existingIds.has(mutation.mutationId)) {
					existingList.push(mutation);
					existingIds.add(mutation.mutationId);
					added = true;
					mutationsSaved++;
				}
			}
			if (added) {
				saveLocalStorageMutations(existingList);
			}
		}

		// 2b. Сброс отложенных пакетов кэша (Low-Spec HDD 5400 RPM write buffer)
		flushBatchedStoreWritesSyncToLocalStorage();

		// 3. Отправка аварийного события для локальных форм
		if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente:emergency-flush", {
						detail: { draftsSaved, mutationsSaved, timestamp: Date.now() },
					}),
				);
			} catch {
				// Event dispatching during teardown may be restricted
			}
		}
	} catch (err) {
		logger.error("[OfflineStorage] Emergency flush failure:", err);
	}

	return { draftsSaved, mutationsSaved };
}

/**
 * Хелпер автосохранения дневника Form 043/u с 3-секундным дебаунсом
 */
export function scheduleForm043Autosave<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
): Promise<OfflineDraft<T>> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return clinicalDraftAutosaver.scheduleAutosave<T>(
		key,
		"DIARY_043_DRAFT",
		patientId,
		data,
		organizationId,
		debounceMs,
	);
}

/**
 * Хелпер автосохранения одонтограммы с 3-секундным дебаунсом
 */
export function scheduleOdontogramAutosave<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
): Promise<OfflineDraft<T>> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return clinicalDraftAutosaver.scheduleAutosave<T>(
		key,
		"ODONTOGRAM_STATUS",
		patientId,
		data,
		organizationId,
		debounceMs,
	);
}

/**
 * Хелпер автосохранения дневника визита (SOAP) с дебаунсом
 */
export function scheduleVisitDraftAutosave<T = unknown>(
	visitId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
): Promise<OfflineDraft<T>> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return clinicalDraftAutosaver.scheduleAutosave<T>(
		key,
		"DIARY_043_DRAFT",
		visitId,
		data,
		organizationId,
		debounceMs,
	);
}

/**
 * Хелпер автосохранения рецепта / назначения (107-1/у) с дебаунсом
 */
export function schedulePrescriptionAutosave<T = unknown>(
	id: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
): Promise<OfflineDraft<T>> {
	const key = `${PRESCRIPTION_DRAFT_KEY_PREFIX}${id}`;
	return clinicalDraftAutosaver.scheduleAutosave<T>(
		key,
		"PRESCRIPTION_107_DRAFT",
		id,
		data,
		organizationId,
		debounceMs,
	);
}

/**
 * Хелпер автосохранения черновика приема в расписании с дебаунсом
 */
export function scheduleAppointmentAutosave<T = unknown>(
	appointmentId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
): Promise<OfflineDraft<T>> {
	const key = `${APPOINTMENT_DRAFT_KEY_PREFIX}${appointmentId}`;
	return clinicalDraftAutosaver.scheduleAutosave<T>(
		key,
		"APPOINTMENT_BOOKING_DRAFT",
		appointmentId,
		data,
		organizationId,
		debounceMs,
	);
}
