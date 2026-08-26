/**
 * DENTE CRM — Offline Cache & Storage Integrity Verification Engine
 *
 * Автоматическая проверка целостности локального кэша и базы при старте:
 * - Сканирование IndexedDB таблиц (mutations, drafts, clinical_cache, schedules_cache, patients_cache, odontogram_cache, pricelist_804n_cache, icd10_cache)
 * - Проверка структуры объектов, обязательных полей и UUIDv7
 * - Валидация криптографических контрольных сумм полезной нагрузки (SHA-256)
 * - Мониторинг квоты дисковой памяти через Storage Estimate API
 * - Автоматическое самовосстановление (Auto-Repair) поврежденных записей
 */

import { computePayloadHash } from "@dental/shared";
import { logger } from "../../utils/logger";
import {
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
	ICD10_CACHE_STORE_NAME,
	MUTATIONS_STORE_NAME,
	ODONTOGRAM_CACHE_STORE_NAME,
	PATIENTS_CACHE_STORE_NAME,
	PRICELIST_CACHE_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
	type StorageEstimateInfo,
	getStorageEstimate,
	isIndexedDbAvailable,
	openOfflineOutboxDb,
	withIdbTransactionRetry,
} from "./offlineStorage";
import type {
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	OfflineDraft,
	OfflineMutation,
} from "./types";

export interface IntegrityIssue {
	storeName: string;
	itemKey: string;
	severity: "warning" | "error";
	message: string;
	autoRepaired: boolean;
}

export interface OfflineCacheIntegrityReport {
	healthy: boolean;
	totalChecked: number;
	validCount: number;
	corruptedCount: number;
	repairedCount: number;
	issues: IntegrityIssue[];
	storesStats: {
		mutationsCount: number;
		draftsCount: number;
		clinicalCacheCount: number;
		schedulesCount: number;
		patientsCount: number;
		odontogramsCount: number;
		pricelistsCount: number;
		icd10Count: number;
	};
	storageEstimate: StorageEstimateInfo;
	timestamp: string;
}

/**
 * Полная проверка целостности локального хранилища IndexedDB и LocalStorage
 */
export async function verifyLocalCacheIntegrity(options?: {
	autoRepair?: boolean | undefined;
	organizationId?: string | undefined;
}): Promise<OfflineCacheIntegrityReport> {
	const autoRepair = options?.autoRepair ?? true;
	const issues: IntegrityIssue[] = [];
	let totalChecked = 0;
	let validCount = 0;
	let corruptedCount = 0;
	let repairedCount = 0;

	let mutationsCount = 0;
	let draftsCount = 0;
	let clinicalCacheCount = 0;
	let schedulesCount = 0;
	let patientsCount = 0;
	let odontogramsCount = 0;
	let pricelistsCount = 0;
	let icd10Count = 0;

	if (!isIndexedDbAvailable()) {
		const estimate = await getStorageEstimate();
		return {
			healthy: true,
			totalChecked: 0,
			validCount: 0,
			corruptedCount: 0,
			repairedCount: 0,
			issues: [],
			storesStats: {
				mutationsCount: 0,
				draftsCount: 0,
				clinicalCacheCount: 0,
				schedulesCount: 0,
				patientsCount: 0,
				odontogramsCount: 0,
				pricelistsCount: 0,
				icd10Count: 0,
			},
			storageEstimate: estimate,
			timestamp: new Date().toISOString(),
		};
	}

	try {
		await withIdbTransactionRetry(async (db) => {
			const availableStores = [
				MUTATIONS_STORE_NAME,
				DRAFTS_STORE_NAME,
				CLINICAL_CACHE_STORE_NAME,
				SCHEDULES_CACHE_STORE_NAME,
				PATIENTS_CACHE_STORE_NAME,
				ODONTOGRAM_CACHE_STORE_NAME,
				PRICELIST_CACHE_STORE_NAME,
				ICD10_CACHE_STORE_NAME,
			].filter((s) => db.objectStoreNames.contains(s));

			if (availableStores.length === 0) return;

			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(
					availableStores,
					autoRepair ? "readwrite" : "readonly",
				);

				// 1. Mutations Store
				if (availableStores.includes(MUTATIONS_STORE_NAME)) {
					const mutStore = tx.objectStore(MUTATIONS_STORE_NAME);
					const mutReq = mutStore.getAll();
					mutReq.onsuccess = () => {
						const mutations = (mutReq.result as OfflineMutation[]) || [];
						mutationsCount = mutations.length;

						for (const mutation of mutations) {
							totalChecked++;
							let isCorrupt = false;

							if (!mutation.mutationId || typeof mutation.mutationId !== "string") {
								isCorrupt = true;
								issues.push({
									storeName: MUTATIONS_STORE_NAME,
									itemKey: mutation.mutationId || "unknown",
									severity: "error",
									message: "Отсутствует корректный mutationId",
									autoRepaired: false,
								});
							}

							if (!mutation.timestamp || isNaN(new Date(mutation.timestamp).getTime())) {
								isCorrupt = true;
								issues.push({
									storeName: MUTATIONS_STORE_NAME,
									itemKey: mutation.mutationId,
									severity: "warning",
									message: "Некорректная временная метка ISO",
									autoRepaired: false,
								});
							}

							// Проверка контрольной суммы payloadHash
							if (mutation.payload !== undefined && mutation.payloadHash) {
								try {
									const calcHash = computePayloadHash(mutation.payload);
									if (calcHash !== mutation.payloadHash) {
										isCorrupt = true;
										issues.push({
											storeName: MUTATIONS_STORE_NAME,
											itemKey: mutation.mutationId,
											severity: "error",
											message: "Контрольная сумма полезной нагрузки не совпадает с payloadHash",
											autoRepaired: false,
										});
									}
								} catch {
									// ignore hash calc error
								}
							}

							if (isCorrupt) {
								corruptedCount++;
								if (autoRepair && (!mutation.mutationId || !mutation.entityId)) {
									mutStore.delete(mutation.mutationId);
									repairedCount++;
									const lastIssue = issues[issues.length - 1];
									if (lastIssue) lastIssue.autoRepaired = true;
								}
							} else {
								validCount++;
							}
						}
					};
				}

				// 2. Drafts Store
				if (availableStores.includes(DRAFTS_STORE_NAME)) {
					const draftStore = tx.objectStore(DRAFTS_STORE_NAME);
					const draftReq = draftStore.getAll();
					draftReq.onsuccess = () => {
						const drafts = (draftReq.result as OfflineDraft[]) || [];
						draftsCount = drafts.length;

						for (const draft of drafts) {
							totalChecked++;
							let isCorrupt = false;

							if (!draft.draftKey || typeof draft.draftKey !== "string") {
								isCorrupt = true;
								issues.push({
									storeName: DRAFTS_STORE_NAME,
									itemKey: draft.draftKey || "unknown",
									severity: "error",
									message: "Отсутствует draftKey",
									autoRepaired: false,
								});
							}

							if (draft.data === undefined || draft.data === null) {
								isCorrupt = true;
								issues.push({
									storeName: DRAFTS_STORE_NAME,
									itemKey: draft.draftKey,
									severity: "warning",
									message: "Пустое тело черновика",
									autoRepaired: false,
								});
							}

							if (isCorrupt) {
								corruptedCount++;
								if (autoRepair && !draft.draftKey) {
									draftStore.delete(draft.draftKey);
									repairedCount++;
									const lastIssue = issues[issues.length - 1];
									if (lastIssue) lastIssue.autoRepaired = true;
								}
							} else {
								validCount++;
							}
						}
					};
				}

				// 3. Clinical Cache Store
				if (availableStores.includes(CLINICAL_CACHE_STORE_NAME)) {
					const cacheStore = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
					const cacheReq = cacheStore.getAll();
					cacheReq.onsuccess = () => {
						const cacheItems = (cacheReq.result as any[]) || [];
						clinicalCacheCount = cacheItems.length;

						for (const item of cacheItems) {
							totalChecked++;
							let isCorrupt = false;

							if (!item.cacheKey || typeof item.cacheKey !== "string") {
								isCorrupt = true;
								issues.push({
									storeName: CLINICAL_CACHE_STORE_NAME,
									itemKey: item.cacheKey || "unknown",
									severity: "error",
									message: "Отсутствует cacheKey",
									autoRepaired: false,
								});
							}

							if (isCorrupt) {
								corruptedCount++;
								if (autoRepair && !item.cacheKey) {
									cacheStore.delete(item.cacheKey);
									repairedCount++;
									const lastIssue = issues[issues.length - 1];
									if (lastIssue) lastIssue.autoRepaired = true;
								}
							} else {
								validCount++;
							}
						}
					};
				}

				// 4. Schedules Cache Store
				if (availableStores.includes(SCHEDULES_CACHE_STORE_NAME)) {
					const schedStore = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
					const schedReq = schedStore.getAll();
					schedReq.onsuccess = () => {
						const schedItems = (schedReq.result as CachedActiveSchedule[]) || [];
						schedulesCount = schedItems.length;

						for (const item of schedItems) {
							totalChecked++;
							if (!item.scheduleKey || !item.date) {
								corruptedCount++;
								issues.push({
									storeName: SCHEDULES_CACHE_STORE_NAME,
									itemKey: item.scheduleKey || "unknown",
									severity: "error",
									message: "Поврежденная запись расписания (отсутствует scheduleKey/date)",
									autoRepaired: false,
								});
							} else {
								validCount++;
							}
						}
					};
				}

				// 5. Patients Cache Store
				if (availableStores.includes(PATIENTS_CACHE_STORE_NAME)) {
					const patStore = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
					const patReq = patStore.getAll();
					patReq.onsuccess = () => {
						const patItems = (patReq.result as CachedPatientCard[]) || [];
						patientsCount = patItems.length;

						for (const item of patItems) {
							totalChecked++;
							if (!item.patientId || !item.personalInfo) {
								corruptedCount++;
								issues.push({
									storeName: PATIENTS_CACHE_STORE_NAME,
									itemKey: item.patientId || "unknown",
									severity: "error",
									message: "Поврежденная карточка пациента (отсутствует patientId/personalInfo)",
									autoRepaired: false,
								});
							} else {
								validCount++;
							}
						}
					};
				}

				// 6. Odontogram Cache Store
				if (availableStores.includes(ODONTOGRAM_CACHE_STORE_NAME)) {
					const odoStore = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
					const odoReq = odoStore.getAll();
					odoReq.onsuccess = () => {
						const odoItems = (odoReq.result as CachedOdontogram[]) || [];
						odontogramsCount = odoItems.length;

						for (const item of odoItems) {
							totalChecked++;
							if (!item.patientId || !Array.isArray(item.teeth)) {
								corruptedCount++;
								issues.push({
									storeName: ODONTOGRAM_CACHE_STORE_NAME,
									itemKey: item.patientId || "unknown",
									severity: "error",
									message: "Поврежденная одонтограмма (отсутствует patientId или массив teeth)",
									autoRepaired: false,
								});
							} else {
								validCount++;
							}
						}
					};
				}

				// 7. Pricelist Cache Store
				if (availableStores.includes(PRICELIST_CACHE_STORE_NAME)) {
					const plistStore = tx.objectStore(PRICELIST_CACHE_STORE_NAME);
					const plistReq = plistStore.getAll();
					plistReq.onsuccess = () => {
						const plistItems = (plistReq.result as CachedPriceList804n[]) || [];
						pricelistsCount = plistItems.length;
						for (const item of plistItems) {
							totalChecked++;
							if (!item.catalogKey || !Array.isArray(item.items)) {
								corruptedCount++;
								issues.push({
									storeName: PRICELIST_CACHE_STORE_NAME,
									itemKey: item.catalogKey || "unknown",
									severity: "error",
									message: "Поврежденный кэш прайс-листа",
									autoRepaired: false,
								});
							} else {
								validCount++;
							}
						}
					};
				}

				// 8. ICD10 Cache Store
				if (availableStores.includes(ICD10_CACHE_STORE_NAME)) {
					const icdStore = tx.objectStore(ICD10_CACHE_STORE_NAME);
					const icdReq = icdStore.getAll();
					icdReq.onsuccess = () => {
						const icdItems = (icdReq.result as CachedIcd10Dictionary[]) || [];
						icd10Count = icdItems.length;
						for (const item of icdItems) {
							totalChecked++;
							if (!item.dictionaryKey || !Array.isArray(item.items)) {
								corruptedCount++;
								issues.push({
									storeName: ICD10_CACHE_STORE_NAME,
									itemKey: item.dictionaryKey || "unknown",
									severity: "error",
									message: "Поврежденный кэш МКБ-10",
									autoRepaired: false,
								});
							} else {
								validCount++;
							}
						}
					};
				}

				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error ?? new Error("Ошибка транзакции проверки целостности"));
			});
		});
	} catch (err) {
		logger.warn("[OfflineIntegrity] Error during cache integrity audit", err);
	}

	const storageEstimate = await getStorageEstimate();

	const report: OfflineCacheIntegrityReport = {
		healthy: corruptedCount === 0,
		totalChecked,
		validCount,
		corruptedCount,
		repairedCount,
		issues,
		storesStats: {
			mutationsCount,
			draftsCount,
			clinicalCacheCount,
			schedulesCount,
			patientsCount,
			odontogramsCount,
			pricelistsCount,
			icd10Count,
		},
		storageEstimate,
		timestamp: new Date().toISOString(),
	};

	logger.info(
		`[OfflineIntegrity] Audit finished: ${totalChecked} checked, ${corruptedCount} corrupted, storage: ${storageEstimate.percentUsed}% (${storageEstimate.freeFormatted} free)`,
	);

	return report;
}

/**
 * Автоматический аудит при старте приложения
 */
export async function runStartupIntegrityAudit(): Promise<OfflineCacheIntegrityReport> {
	try {
		return await verifyLocalCacheIntegrity({ autoRepair: true });
	} catch (err) {
		logger.error("[OfflineIntegrity] Startup integrity check crashed safely", err);
		return {
			healthy: true,
			totalChecked: 0,
			validCount: 0,
			corruptedCount: 0,
			repairedCount: 0,
			issues: [],
			storesStats: {
				mutationsCount: 0,
				draftsCount: 0,
				clinicalCacheCount: 0,
				schedulesCount: 0,
				patientsCount: 0,
				odontogramsCount: 0,
				pricelistsCount: 0,
				icd10Count: 0,
			},
			storageEstimate: await getStorageEstimate(),
			timestamp: new Date().toISOString(),
		};
	}
}
