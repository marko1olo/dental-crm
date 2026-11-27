/**
 * apps/web/src/components/odontogram/syncModules/odontogramApiBatchSync.ts
 *
 * DENTE Dental CRM — Batch HTTP Synchronization for Tooth States.
 * Coordinates background dispatch of modified teeth to Fastify API
 * with graceful offline fallback and status notifications.
 */

import { generateUuidV7 } from "@dental/shared";
import type { ToothData, ToothState } from "../ToothChart";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { logger } from "../../../utils/logger";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	removeOfflineMutation,
} from "../../../services/offline/offlineStorage";

export interface ToothBatchPayload {
	toothNumbers: number[];
	state: ToothState;
	surfaces?: string[];
}

export interface ToothBatchOptions {
	readonly surfaces?: readonly string[] | string[] | undefined;
	readonly resorptionStage?: number | undefined;
	readonly mobility?: number | undefined;
	readonly isPrimaryPediatric?: boolean | undefined;
	readonly notes?: string | undefined;
	readonly reason?: string | undefined;
}

export interface ToothResorptionUpdateItem {
	toothNumber: number;
	resorptionStage: number;
	mobility?: number | undefined;
	state?: ToothState | undefined;
	isPrimaryPediatric?: boolean | undefined;
	notes?: string | undefined;
}

function extractServerErrorMessage(rawBody: string): string | null {
	if (!rawBody || !rawBody.trim()) return null;
	try {
		const parsed: unknown = JSON.parse(rawBody);
		if (!parsed || typeof parsed !== "object") return null;
		if (
			"error" in parsed &&
			typeof parsed.error === "object" &&
			parsed.error !== null &&
			"message" in parsed.error &&
			typeof parsed.error.message === "string"
		) {
			const msg = parsed.error.message.trim();
			if (msg) return msg;
		}
		if ("message" in parsed && typeof parsed.message === "string" && parsed.message.trim()) {
			return parsed.message.trim();
		}
		if ("error" in parsed && typeof parsed.error === "string" && parsed.error.trim()) {
			return parsed.error.trim();
		}
	} catch {
		// Non-JSON error body
	}
	return null;
}

/**
 * Sends a batch update of tooth states to the backend API.
 * Network/5xx errors enqueue into the offline Outbox queue (IndexedDB) with an informational toast.
 * Deterministic 4xx client/validation errors show an actionable error toast without looping the Outbox.
 */
export async function sendToothStatesBatch(
	patientId: string,
	toothNumbers: number[],
	state: ToothState,
	surfacesOrOptions?: readonly string[] | string[] | ToothBatchOptions | undefined,
): Promise<boolean> {
	if (!patientId || toothNumbers.length === 0) return true;

	const isOptions =
		surfacesOrOptions &&
		typeof surfacesOrOptions === "object" &&
		!Array.isArray(surfacesOrOptions);

	const surfaces = isOptions
		? (surfacesOrOptions as ToothBatchOptions).surfaces
		: Array.isArray(surfacesOrOptions)
			? surfacesOrOptions
			: undefined;

	const options = isOptions ? (surfacesOrOptions as ToothBatchOptions) : undefined;

	const apiPayload: Record<string, unknown> = {
		toothNumbers,
		state,
		...(surfaces && surfaces.length > 0 ? { surfaces: [...surfaces] } : {}),
		...(options?.resorptionStage !== undefined ? { resorptionStage: options.resorptionStage } : {}),
		...(options?.mobility !== undefined ? { mobility: options.mobility, mobilityDegree: options.mobility } : {}),
		...(options?.isPrimaryPediatric !== undefined ? { isPrimaryPediatric: options.isPrimaryPediatric } : {}),
		...(options?.notes ? { notes: options.notes } : {}),
		...(options?.reason ? { reason: options.reason } : {}),
	};
	const offlinePayload: Record<string, unknown> = {
		patientId,
		...apiPayload,
	};

	// Fast offline check: if network is already down, persist directly into Outbox
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		try {
			await enqueueOfflineMutation({
				entityType: "ODONTOGRAM_STATUS",
				entityId: `${patientId}_tooth_${toothNumbers.join("_")}_${Date.now()}`,
				action: "update",
				payload: offlinePayload,
			});
			showToast(
				"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
				"info",
				8000,
			);
			return false;
		} catch (e) {
			logger.warn("[odontogramApiBatchSync] Offline enqueue status failed:", e);
		}
	}

	try {
		const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(apiPayload),
		});

		if (!res.ok) {
			const rawBody = await res.text();
			logger.error(
				`[tooth states status mutation] ${res.status} ${rawBody.slice(0, 300)}`,
			);
			if (res.status >= 400 && res.status < 500) {
				const serverMessage = extractServerErrorMessage(rawBody);
				showToast(
					serverMessage || `Не удалось сохранить отметку зубной формулы (ошибка ${res.status})`,
					"error",
					8000,
					{
						label: "Повторить",
						ariaLabel: "Повторить сохранение отметки зубной формулы",
						onAction: () => {
							void sendToothStatesBatch(patientId, toothNumbers, state, surfacesOrOptions);
						},
					},
				);
				return false;
			}
			try {
				await enqueueOfflineMutation({
					entityType: "ODONTOGRAM_STATUS",
					entityId: `${patientId}_tooth_${toothNumbers.join("_")}_${Date.now()}`,
					action: "update",
					payload: offlinePayload,
				});
			} catch (queueErr) {
				logger.warn("[odontogramApiBatchSync] Failed to enqueue into offline storage:", queueErr);
			}
			showToast(
				"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
				"info",
				8000,
			);
			return false;
		}

		return true;
	} catch (err) {
		logger.error("[tooth states status mutation] запрос не выполнен", err);
		try {
			await enqueueOfflineMutation({
				entityType: "ODONTOGRAM_STATUS",
				entityId: `${patientId}_tooth_${toothNumbers.join("_")}_${Date.now()}`,
				action: "update",
				payload: offlinePayload,
			});
		} catch (queueErr) {
			logger.warn("[odontogramApiBatchSync] Failed to enqueue into offline storage:", queueErr);
		}
		showToast(
			"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
			"info",
			8000,
		);
		return false;
	}
}

/**
 * Flushes all queued offline tooth state mutations to backend API when connection is restored.
 */
export async function flushPendingOdontogramMutations(
	targetPatientId?: string,
): Promise<{ syncedCount: number; failedCount: number }> {
	try {
		const mutations = await getPendingOfflineMutations({ entityType: "ODONTOGRAM_STATUS" });
		if (!mutations || mutations.length === 0) {
			return { syncedCount: 0, failedCount: 0 };
		}

		let syncedCount = 0;
		let failedCount = 0;

		for (const mut of mutations) {
			const payload = mut.payload as {
				patientId: string;
				toothNumber?: number;
				toothNumbers?: number[];
				state: ToothState;
				surfaces?: string[];
				resorptionStage?: number;
				mobility?: number;
				mobilityDegree?: number;
				isPrimaryPediatric?: boolean;
				notes?: string;
				reason?: string;
				updates?: unknown[];
			} | undefined;

			if (!payload || !payload.patientId) {
				await removeOfflineMutation(mut.mutationId);
				continue;
			}

			if (targetPatientId && payload.patientId !== targetPatientId) {
				continue;
			}

			const hasUpdates = Array.isArray(payload.updates) && payload.updates.length > 0;
			const toothNums = payload.toothNumbers || (payload.toothNumber ? [payload.toothNumber] : []);
			if (!hasUpdates && toothNums.length === 0) {
				await removeOfflineMutation(mut.mutationId);
				continue;
			}

			const flushBody = hasUpdates
				? { updates: payload.updates }
				: {
						toothNumbers: toothNums,
						state: payload.state,
						...(payload.surfaces && payload.surfaces.length > 0 ? { surfaces: payload.surfaces } : {}),
						...(payload.resorptionStage !== undefined ? { resorptionStage: payload.resorptionStage } : {}),
						...(payload.mobility !== undefined
							? {
									mobility: payload.mobility,
									mobilityDegree: payload.mobilityDegree ?? payload.mobility,
								}
							: {}),
						...(payload.isPrimaryPediatric !== undefined ? { isPrimaryPediatric: payload.isPrimaryPediatric } : {}),
						...(payload.notes ? { notes: payload.notes } : {}),
						...(payload.reason ? { reason: payload.reason } : {}),
					};

			try {
				const res = await fetch(`/api/patients/${payload.patientId}/tooth-states/batch`, {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify(flushBody),
				});

				if (res.ok) {
					await removeOfflineMutation(mut.mutationId);
					syncedCount++;
				} else if (res.status >= 400 && res.status < 500) {
					await removeOfflineMutation(mut.mutationId);
					failedCount++;
				} else {
					failedCount++;
				}
			} catch (err) {
				logger.warn(`[odontogramApiBatchSync] Failed to sync offline tooth mutation ${mut.mutationId}:`, err);
				failedCount++;
			}
		}

		if (syncedCount > 0) {
			showToast(`Синхронизировано отметок одонтограммы из офлайн-очереди: ${syncedCount}`, "success", 4000);
		}

		return { syncedCount, failedCount };
	} catch (err) {
		logger.error("[odontogramApiBatchSync] Error flushing pending odontogram mutations:", err);
		return { syncedCount: 0, failedCount: 0 };
	}
}

/**
 * Online event listener for automatic odontogram offline sync.
 */
let isOdontogramOnlineListenerInit = false;
export function initOdontogramAutoSync(): void {
	if (typeof window !== "undefined" && !isOdontogramOnlineListenerInit) {
		window.addEventListener("online", () => {
			void flushPendingOdontogramMutations();
		});
		isOdontogramOnlineListenerInit = true;
	}
}

// Auto-initialize online sync listener
initOdontogramAutoSync();

/**
 * Sends a batch update of primary tooth root resorption stages and mobility to the backend API.
 * Ensures 100% PostgreSQL 18 persistence without F5 amnesia (Mandate 8e/8ar).
 */
export async function sendToothResorptionBatch(
	patientId: string,
	updates: ToothResorptionUpdateItem[],
): Promise<boolean> {
	if (!patientId || updates.length === 0) return true;

	const apiPayload = {
		updates: updates.map((u) => {
			const mobility =
				u.mobility !== undefined
					? u.mobility
					: u.resorptionStage === 100
						? 3
						: u.resorptionStage === 75
							? 2
							: u.resorptionStage === 50
								? 1
								: 0;
			return {
				toothNumber: u.toothNumber,
				state: u.state ?? "Healthy",
				resorptionStage: u.resorptionStage,
				mobility,
				mobilityDegree: mobility,
				isPrimaryPediatric: u.isPrimaryPediatric ?? (u.toothNumber >= 51 && u.toothNumber <= 85),
				...(u.notes ? { notes: u.notes } : {}),
			};
		}),
	};
	const offlinePayload = {
		patientId,
		...apiPayload,
	};

	if (typeof navigator !== "undefined" && !navigator.onLine) {
		try {
			await enqueueOfflineMutation({
				entityType: "ODONTOGRAM_STATUS",
				entityId: `${patientId}_resorption_${Date.now()}`,
				action: "update",
				payload: offlinePayload,
			});
			showToast(
				"Резорбция сохранена локально (офлайн). Синхронизируется при связи",
				"info",
				6000,
			);
			return false;
		} catch (e) {
			logger.warn("[odontogramApiBatchSync] Offline enqueue resorption failed:", e);
		}
	}

	try {
		const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(apiPayload),
		});

		if (!res.ok) {
			const rawBody = await res.text();
			logger.error(`[tooth resorption batch] ${res.status} ${rawBody.slice(0, 300)}`);
			if (res.status >= 400 && res.status < 500) {
				const serverMessage = extractServerErrorMessage(rawBody);
				showToast(
					serverMessage || `Не удалось сохранить параметры резорбции (ошибка ${res.status})`,
					"error",
					8000,
					{
						label: "Повторить",
						ariaLabel: "Повторить сохранение резорбции",
						onAction: () => {
							void sendToothResorptionBatch(patientId, updates);
						},
					},
				);
				return false;
			}
			try {
				await enqueueOfflineMutation({
					entityType: "ODONTOGRAM_STATUS",
					entityId: `${patientId}_resorption_${Date.now()}`,
					action: "update",
					payload: offlinePayload,
				});
			} catch (e) {
				logger.warn("[odontogramApiBatchSync] Offline queue failed:", e);
			}
			return false;
		}
		return true;
	} catch (err) {
		logger.error("[tooth resorption batch] запрос не выполнен", err);
		try {
			await enqueueOfflineMutation({
				entityType: "ODONTOGRAM_STATUS",
				entityId: `${patientId}_resorption_${Date.now()}`,
				action: "update",
				payload: offlinePayload,
			});
		} catch (e) {
			logger.warn("[odontogramApiBatchSync] Offline queue failed:", e);
		}
		return false;
	}
}

export interface FetchToothStatesResult {
	states: ToothData[] | null;
	status: number | null;
	rawBody: string;
}

/**
 * Fetches all tooth states for a patient from Fastify backend.
 */
export async function fetchToothStatesFromServer(
	patientId: string,
	signal?: AbortSignal,
): Promise<FetchToothStatesResult> {
	if (!patientId) {
		return { states: [], status: 200, rawBody: "" };
	}

	try {
		const res = await fetch(`/api/patients/${patientId}/tooth-states`, {
			headers: denteClinicalReadHeaders(),
			...(signal ? { signal } : {}),
		});

		const status = res.status;
		const rawBody = await res.text();

		if (!res.ok) {
			return { states: null, status, rawBody };
		}

		let data: unknown = null;
		try {
			data = rawBody.trim() === "" ? null : JSON.parse(rawBody);
		} catch {
			data = null;
		}

		const body =
			typeof data === "object" && data !== null && !Array.isArray(data)
				? (data as Record<string, unknown>)
				: null;

		const rawStates: ToothData[] | null = Array.isArray(data)
			? (data as ToothData[])
			: body
				? Array.isArray(body.states)
					? (body.states as ToothData[])
					: Array.isArray(body.data)
						? (body.data as ToothData[])
						: Object.keys(body).length === 0 || body.success === true
							? []
							: null
				: rawBody.trim() === ""
					? []
					: null;

		const incomingStates: ToothData[] | null = rawStates
			? rawStates.map((tooth) => {
					const clin = (tooth.clinicalData ?? {}) as Record<string, unknown>;
					const resorption =
						tooth.rootResorptionStage ??
						tooth.rootResorption ??
						(typeof clin.resorptionStage === "number"
							? (clin.resorptionStage as ToothData["rootResorptionStage"])
							: undefined);
					const mobility =
						tooth.mobility ??
						(typeof clin.mobility === "number"
							? (clin.mobility as 0 | 1 | 2 | 3)
							: undefined) ??
						(typeof clin.mobilityDegree === "number"
							? (clin.mobilityDegree as 0 | 1 | 2 | 3)
							: undefined);
					return {
						...tooth,
						...(resorption !== undefined ? { rootResorptionStage: resorption, rootResorption: resorption } : {}),
						...(mobility !== undefined ? { mobility } : {}),
					};
				})
			: null;

		return { states: incomingStates, status, rawBody };
	} catch (err) {
		const status = (err as { status?: number })?.status ?? null;
		return { states: null, status, rawBody: String(err) };
	}
}
