import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	generateUuidV7,
	getAdjustedNowIso,
	getAdjustedNowMs,
} from "@dental/shared";
import { logger } from "../../../utils/logger";
import { MUTATIONS_STORE_NAME } from "./constants";
import { inMemoryMutationsMap, setBoundedInMemoryMap } from "./idbMemory";
import {
	getLocalStorageMutations,
	saveLocalStorageMutations,
} from "./idbLocalStorageFallback";
import { withIdbTransactionRetry } from "./idbDatabase";
import type {
	AppointmentMutationInput,
	Card043MutationInput,
	CashReceiptMutationInput,
	EnqueueMutationInput,
	MutationEntityType,
	MutationStatus,
	OdontogramStampMutationInput,
	OfflineMutation,
	PrescriptionMutationInput,
	ServiceAdditionMutationInput,
} from "./types";

/**
 * Генерация UUID v7 (RFC 9562) с миллисекундной упорядоченностью
 * и криптографической устойчивостью.
 */
export function generateMutationUuid(): string {
	return generateUuidV7();
}

/**
 * Текущая временная метка ISO с миллисекундами, откалиброванная
 * по серверному времени (Clock Skew Compensation).
 */
export function nowIsoWithMs(localTimeMs: number = Date.now()): string {
	return getAdjustedNowIso(localTimeMs);
}

/**
 * Добавление мутации в очередь (IndexedDB с fallback на chunked LocalStorage и in-memory buffer)
 */
export async function enqueueOfflineMutation<T = unknown>(
	input: EnqueueMutationInput<T>,
): Promise<OfflineMutation<T>> {
	const timestamp = input.timestamp || getAdjustedNowIso();
	const timestampMs = new Date(timestamp).getTime() || getAdjustedNowMs();
	const mutationId = input.mutationId || generateMutationUuid();
	const payloadHash = computePayloadHash(input.payload);
	const idempotencyKey =
		input.idempotencyKey ||
		createCompositeIdempotencyKey(mutationId, input.payload);

	const mutation: OfflineMutation<T> = {
		mutationId,
		idempotencyKey,
		payloadHash,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action || "update",
		payload: input.payload,
		timestamp,
		timestampMs,
		organizationId: input.organizationId,
		mutationVector: input.mutationVector,
		authorUserId: input.authorUserId,
		status: "pending",
		retryCount: 0,
	};

	// Always record in in-memory outbox buffer for zero-loss guarantee
	setBoundedInMemoryMap(inMemoryMutationsMap, mutationId, mutation as OfflineMutation<unknown>);

	// Deduplication Guard: if an identical pending mutation exists with matching payloadHash, return it
	try {
		const existingPending = await getPendingOfflineMutations({
			entityType: input.entityType,
			organizationId: input.organizationId,
		});
		const duplicate = existingPending.find(
			(m) =>
				m.mutationId !== mutationId &&
				m.entityId === input.entityId &&
				m.action === (input.action || "update") &&
				m.payloadHash === payloadHash &&
				m.status === "pending",
		);
		if (duplicate) {
			logger.info(
				`[OfflineStorage] Deduplicated rapid double-click mutation for ${input.entityType}/${input.entityId} (hash: ${payloadHash.substring(0, 8)})`,
			);
			return duplicate as OfflineMutation<T>;
		}
	} catch (err: unknown) {
		logger.warn("[OfflineStorage] Failed to check for duplicate pending mutations:", err);
	}

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.put(mutation);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to put mutation to IDB"));
				tx.onerror = () =>
					reject(tx.error ?? new Error("Transaction error while putting mutation"));
			});
		});
		return mutation;
	} catch (err) {
		logger.warn(
			"[OfflineStorage] IndexedDB enqueue failed (e.g. QuotaExceededError), using chunked localStorage fallback",
			err,
		);
		const list = getLocalStorageMutations();
		const withoutCurrent = list.filter((m) => m.mutationId !== mutationId);
		withoutCurrent.push(mutation as OfflineMutation<unknown>);
		saveLocalStorageMutations(withoutCurrent);
		return mutation;
	}
}

/**
 * Пакетное добавление мутаций в очередь единой транзакцией (Coalesced Batch I/O).
 *
 * ОПТИМИЗАЦИЯ ДЛЯ МЕДЛЕННЫХ HDD 5400 RPM И СЛАБЫХ НОУТБУКОВ (Мандаты 8c, 8e, 8n):
 * Вместо создания N отдельных транзакций в IndexedDB (что вызывает N синхронных сбросов на диск
 * и вешает шпиндель HDD на 300–500 мс при массовом обновлении зубной формулы или пакета услуг),
 * все элементы регистрируются в L1 RAM (0 мс) и записываются в хранилище за 1 единую транзакцию.
 */
export async function enqueueOfflineMutationsBatch<T = unknown>(
	inputs: EnqueueMutationInput<T>[],
): Promise<OfflineMutation<T>[]> {
	if (!inputs || inputs.length === 0) {
		return [];
	}

	if (inputs.length === 1) {
		const single = await enqueueOfflineMutation(inputs[0]!);
		return [single];
	}

	const createdMutations: OfflineMutation<T>[] = [];
	const mutationsToWrite: OfflineMutation<T>[] = [];

	// 1. Быстрая L1 RAM регистрация всех мутаций (0 мс, гарантия нулевой потери данных)
	for (const input of inputs) {
		const timestamp = input.timestamp || getAdjustedNowIso();
		const timestampMs = new Date(timestamp).getTime() || getAdjustedNowMs();
		const mutationId = input.mutationId || generateMutationUuid();
		const payloadHash = computePayloadHash(input.payload);
		const idempotencyKey =
			input.idempotencyKey ||
			createCompositeIdempotencyKey(mutationId, input.payload);

		const mutation: OfflineMutation<T> = {
			mutationId,
			idempotencyKey,
			payloadHash,
			entityType: input.entityType,
			entityId: input.entityId,
			action: input.action || "update",
			payload: input.payload,
			timestamp,
			timestampMs,
			organizationId: input.organizationId,
			mutationVector: input.mutationVector,
			authorUserId: input.authorUserId,
			status: "pending",
			retryCount: 0,
		};

		setBoundedInMemoryMap(inMemoryMutationsMap, mutationId, mutation as OfflineMutation<unknown>);
		createdMutations.push(mutation);
	}

	// 2. Дедупликация пачки против уже существующих pending мутаций
	try {
		const existingPending = await getPendingOfflineMutations();
		for (const m of createdMutations) {
			const duplicate = existingPending.find(
				(ex) =>
					ex.entityId === m.entityId &&
					ex.action === m.action &&
					ex.payloadHash === m.payloadHash &&
					ex.status === "pending" &&
					ex.mutationId !== m.mutationId,
			);
			if (!duplicate) {
				mutationsToWrite.push(m);
			} else {
				logger.info(
					`[OfflineStorage] Deduplicated batch item for ${m.entityType}/${m.entityId} (hash: ${m.payloadHash?.substring(0, 8) || "none"})`,
				);
			}
		}
	} catch (err: unknown) {
		logger.warn("[OfflineStorage] Failed to check for duplicate pending batch mutations:", err);
		mutationsToWrite.push(...createdMutations);
	}

	if (mutationsToWrite.length === 0) {
		return createdMutations;
	}

	// 3. Единая пакетная запись в IndexedDB
	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				for (const mut of mutationsToWrite) {
					store.put(mut);
				}
				tx.oncomplete = () => resolve();
				tx.onerror = () =>
					reject(tx.error ?? new Error("Failed to batch put mutations to IDB"));
				tx.onabort = () =>
					reject(tx.error ?? new Error("Transaction aborted while batch putting mutations"));
			});
		});
		return createdMutations;
	} catch (err) {
		logger.warn(
			"[OfflineStorage] IndexedDB batch enqueue failed, using chunked localStorage fallback",
			err,
		);
		const list = getLocalStorageMutations();
		const newIds = new Set(mutationsToWrite.map((m) => m.mutationId));
		const withoutCurrent = list.filter((m) => !newIds.has(m.mutationId));
		for (const mut of mutationsToWrite) {
			withoutCurrent.push(mut as OfflineMutation<unknown>);
		}
		saveLocalStorageMutations(withoutCurrent);
		return createdMutations;
	}
}

/**
 * Восстановление зависших мутаций со статусом "syncing"
 * (если вкладка упала, была закрыта или потеряла питание во время отправки).
 * Сбрасывает статус в "pending", гарантируя 0% потерю мутаций (Мандат 8e / 8n).
 */
export async function recoverStaleSyncingMutations(staleTimeoutMs = 60000): Promise<number> {
	let recoveredCount = 0;
	const now = Date.now();

	// 1. In-memory buffer recovery
	for (const m of inMemoryMutationsMap.values()) {
		if (m.status === "syncing" && (now - (m.timestampMs || 0) > staleTimeoutMs)) {
			m.status = "pending";
			recoveredCount++;
		}
	}

	// 2. IndexedDB recovery
	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => {
					const all = (req.result as OfflineMutation[]) || [];
					for (const mut of all) {
						if (mut.status === "syncing") {
							const age = now - (mut.timestampMs || 0);
							if (age > staleTimeoutMs) {
								mut.status = "pending";
								store.put(mut);
								recoveredCount++;
							}
						}
					}
					resolve();
				};
				req.onerror = () => reject(req.error);
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		let changed = false;
		for (const m of list) {
			if (m.status === "syncing" && (now - (m.timestampMs || 0) > staleTimeoutMs)) {
				m.status = "pending";
				recoveredCount++;
				changed = true;
			}
		}
		if (changed) {
			saveLocalStorageMutations(list);
		}
	}

	if (recoveredCount > 0) {
		logger.info(`[OfflineStorage] Recovered ${recoveredCount} stale "syncing" mutations back to "pending"`);
	}
	return recoveredCount;
}

/**
 * Получение неотправленных (pending / failed) мутаций из очереди
 */
export async function getPendingOfflineMutations(filter?: {
	entityType?: MutationEntityType | undefined;
	organizationId?: string | undefined;
}): Promise<OfflineMutation[]> {
	try {
		// Авто-восстановление зависших "syncing" мутаций перед выборкой
		await recoverStaleSyncingMutations(60000);

		const mutations = await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineMutation[]>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readonly");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.getAll();
				request.onsuccess = () => {
					const list = Array.isArray(request.result) ? request.result : [];
					resolve(list);
				};
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to read mutations from IDB"));
			});
		});

		return mutations
			.filter((m) => {
				if (m.status !== "pending" && m.status !== "failed") return false;
				if (filter?.entityType && m.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					m.organizationId &&
					m.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => a.timestampMs - b.timestampMs);
	} catch (err) {
		logger.warn(
			"[OfflineStorage] IndexedDB getPending failed, using localStorage fallback",
			err,
		);
		const list = getLocalStorageMutations();
		const mapItems = Array.from(inMemoryMutationsMap.values());
		const combined = list.length > 0
			? [...list, ...mapItems.filter((mem) => !list.some((l) => l.mutationId === mem.mutationId))]
			: mapItems;

		return combined
			.filter((m) => {
				if (m.status !== "pending" && m.status !== "failed") return false;
				if (filter?.entityType && m.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					m.organizationId &&
					m.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => a.timestampMs - b.timestampMs);
	}
}

/**
 * Получение мутации по ID
 */
export async function getOfflineMutationById(
	mutationId: string,
): Promise<OfflineMutation | null> {
	try {
		return await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineMutation | null>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readonly");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.get(mutationId);
				request.onsuccess = () => resolve(request.result ?? null);
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to get mutation by id"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		return list.find((m) => m.mutationId === mutationId) ?? null;
	}
}

/**
 * Обновление статуса мутации
 */
export async function updateOfflineMutationStatus(
	mutationId: string,
	status: MutationStatus,
	error?: string | undefined,
): Promise<void> {
	const memMut = inMemoryMutationsMap.get(mutationId);
	if (memMut) {
		memMut.status = status;
		if (status === "failed") {
			memMut.retryCount = (memMut.retryCount || 0) + 1;
			memMut.lastError = error || "Unknown error";
		} else if (status === "synced") {
			memMut.lastError = undefined;
		}
	}

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const getReq = store.get(mutationId);
				getReq.onsuccess = () => {
					const item = getReq.result as OfflineMutation | undefined;
					if (!item) {
						resolve();
						return;
					}
					item.status = status;
					if (status === "failed") {
						item.retryCount = (item.retryCount || 0) + 1;
						item.lastError = error || "Unknown error";
					} else if (status === "synced") {
						item.lastError = undefined;
					}
					const putReq = store.put(item);
					putReq.onsuccess = () => resolve();
					putReq.onerror = () =>
						reject(putReq.error ?? new Error("Failed to update mutation status"));
				};
				getReq.onerror = () =>
					reject(getReq.error ?? new Error("Failed to find mutation to update"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		const item = list.find((m) => m.mutationId === mutationId);
		if (item) {
			item.status = status;
			if (status === "failed") {
				item.retryCount = (item.retryCount || 0) + 1;
				item.lastError = error || "Unknown error";
			} else if (status === "synced") {
				item.lastError = undefined;
			}
			saveLocalStorageMutations(list);
		}
	}
}

/**
 * Отметка мутации как успешно синхронизированной
 */
export async function markMutationSynced(mutationId: string): Promise<void> {
	await updateOfflineMutationStatus(mutationId, "synced");
}

/**
 * Удаление мутации из очереди
 */
export async function deleteOfflineMutation(mutationId: string): Promise<void> {
	inMemoryMutationsMap.delete(mutationId);
	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.delete(mutationId);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to delete mutation from IDB"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		const filtered = list.filter((m) => m.mutationId !== mutationId);
		saveLocalStorageMutations(filtered);
	}
}

export { deleteOfflineMutation as removeOfflineMutation };

/**
 * Очистка успешно синхронизированных мутаций
 */
export async function clearSyncedOfflineMutations(): Promise<number> {
	for (const [id, m] of inMemoryMutationsMap.entries()) {
		if (m.status === "synced") {
			inMemoryMutationsMap.delete(id);
		}
	}

	try {
		return await withIdbTransactionRetry(async (db) => {
			return new Promise<number>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const getAllReq = store.getAll();
				getAllReq.onsuccess = () => {
					const all = (getAllReq.result as OfflineMutation[]) || [];
					const synced = all.filter((m) => m.status === "synced");
					for (const item of synced) {
						store.delete(item.mutationId);
					}
					resolve(synced.length);
				};
				getAllReq.onerror = () =>
					reject(getAllReq.error ?? new Error("Failed to read synced mutations"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		const remaining = list.filter((m) => m.status !== "synced");
		const removed = list.length - remaining.length;
		saveLocalStorageMutations(remaining);
		return removed;
	}
}

export async function enqueueCard043Mutation(
	input: Card043MutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "DIARY_043_DRAFT",
		entityId: input.patientId,
		action: input.action || "update",
		payload: input.diaryData,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}

export async function enqueueOdontogramMutation(
	input: OdontogramStampMutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	const payload: Record<string, unknown> = {
		tooth: input.tooth,
		surface: input.surface,
		condition: input.condition,
		...(input.state || {}),
	};
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "ODONTOGRAM_STATUS",
		entityId: input.patientId,
		action: input.action || "update",
		payload,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}

export async function enqueueServiceAdditionMutation(
	input: ServiceAdditionMutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	const item = input.serviceItem;
	const priceKop =
		item.priceKopecks !== undefined
			? item.priceKopecks
			: Math.round((item.priceRub || 0) * 100);

	const payload: Record<string, unknown> = {
		visitId: input.visitId,
		patientId: input.patientId,
		code804n: item.code804n,
		name: item.name,
		priceRub: item.priceRub,
		priceKopecks: priceKop,
		quantity: item.quantity || 1,
		toothNumber: item.toothNumber,
		discountRub: item.discountRub || 0,
	};

	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "TREATMENT_PLAN_DRAFT",
		entityId: input.visitId || input.patientId,
		action: input.action || "create",
		payload,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}

/**
 * Очередь назначений и рецептов врача (Форма 107-1/у) при обрыве интернета
 */
export async function enqueuePrescriptionMutation(
	input: PrescriptionMutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	const payload: Record<string, unknown> = {
		patientId: input.patientId,
		visitId: input.visitId,
		prescriptionNumber: input.prescriptionNumber,
		formType: input.formType || "107-1/у",
		medications: input.medications,
		diagnosisIcd10: input.diagnosisIcd10,
		notes: input.notes,
	};

	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "PRESCRIPTION_107_DRAFT",
		entityId: input.prescriptionNumber || input.visitId || input.patientId,
		action: input.action || "create",
		payload,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}

/**
 * Очередь фискальных чеков и платежей (54-ФЗ) при работе кассы офлайн
 */
export async function enqueueCashReceiptMutation(
	input: CashReceiptMutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	const payload: Record<string, unknown> = {
		patientId: input.patientId,
		visitId: input.visitId,
		invoiceId: input.invoiceId,
		cashierName: input.cashierName,
		totalRub: input.totalRub,
		totalKopecks: input.totalKopecks,
		paymentType: input.paymentType,
		items: input.items,
		patientPhoneOrEmail: input.patientPhoneOrEmail,
		isFiscalized: input.isFiscalized ?? false,
		fiscalSign: input.fiscalSign,
	};

	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "CASH_RECEIPT_DRAFT",
		entityId: input.invoiceId || input.visitId || input.patientId,
		action: input.action || "create",
		payload,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}

/**
 * Очередь записей на прием в расписание при обрыве связи у регистратуры / врача
 */
export async function enqueueAppointmentMutation(
	input: AppointmentMutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	const payload: Record<string, unknown> = {
		patientId: input.patientId,
		doctorId: input.doctorId,
		chairId: input.chairId,
		date: input.date,
		startTime: input.startTime,
		endTime: input.endTime,
		durationMinutes: input.durationMinutes,
		serviceTitle: input.serviceTitle,
		status: input.status || "scheduled",
		notes: input.notes,
	};

	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "APPOINTMENT_BOOKING_DRAFT",
		entityId: `${input.patientId}_${input.date}_${input.startTime}`,
		action: input.action || "create",
		payload,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}
