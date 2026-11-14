/**
 * apps/web/src/components/odontogram/syncModules/odontogramApiBatchSync.ts
 *
 * DENTE Dental CRM — Batch HTTP Synchronization for Tooth States.
 * Coordinates background dispatch of modified teeth to Fastify API
 * with graceful offline fallback and status notifications.
 */

import type { ToothData, ToothState } from "../ToothChart";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
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

/**
 * Sends a batch update of tooth states to the backend API.
 * In case of network errors or server downtime, safely logs error,
 * enqueues the mutation to the offline Outbox queue (IndexedDB)
 * and displays an informational offline toast.
 */
export async function sendToothStatesBatch(
	patientId: string,
	toothNumbers: number[],
	state: ToothState,
	surfaces?: string[],
): Promise<boolean> {
	if (!patientId || toothNumbers.length === 0) return true;

	const payload = {
		patientId,
		toothNumber: toothNumbers[0],
		toothNumbers,
		state,
		...(surfaces && surfaces.length > 0 ? { surfaces } : {}),
	};

	// Fast offline check: if network is already down, persist directly into Outbox
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		try {
			await enqueueOfflineMutation({
				entityType: "ODONTOGRAM_STATUS",
				entityId: `${patientId}_tooth_${toothNumbers.join("_")}_${Date.now()}`,
				action: "update",
				payload,
			});
			showToast(
				"Отметка сохранена локально на диск (офлайн). Данные в безопасности и синхронизируются при связи",
				"info",
				8000,
			);
			return false;
		} catch (e) {
			// fallback
		}
	}

	try {
		const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			const rawBody = await res.text();
			logger.error(
				`[tooth states status mutation] ${res.status} ${rawBody.slice(0, 300)}`,
			);
			try {
				await enqueueOfflineMutation({
					entityType: "ODONTOGRAM_STATUS",
					entityId: `${patientId}_tooth_${toothNumbers.join("_")}_${Date.now()}`,
					action: "update",
					payload,
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
				payload,
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
			} | undefined;

			if (!payload || !payload.patientId) {
				await removeOfflineMutation(mut.mutationId);
				continue;
			}

			if (targetPatientId && payload.patientId !== targetPatientId) {
				continue;
			}

			const toothNums = payload.toothNumbers || (payload.toothNumber ? [payload.toothNumber] : []);
			if (toothNums.length === 0) {
				await removeOfflineMutation(mut.mutationId);
				continue;
			}

			try {
				const res = await fetch(`/api/patients/${payload.patientId}/tooth-states/batch`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						patientId: payload.patientId,
						toothNumber: toothNums[0],
						toothNumbers: toothNums,
						state: payload.state,
						...(payload.surfaces && payload.surfaces.length > 0 ? { surfaces: payload.surfaces } : {}),
					}),
				});

				if (res.ok) {
					await removeOfflineMutation(mut.mutationId);
					syncedCount++;
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
			headers: denteAdminSecretRequestHeaders(),
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

		const incomingStates: ToothData[] | null = Array.isArray(data)
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

		return { states: incomingStates, status, rawBody };
	} catch (err) {
		const status = (err as { status?: number })?.status ?? null;
		return { states: null, status, rawBody: String(err) };
	}
}
