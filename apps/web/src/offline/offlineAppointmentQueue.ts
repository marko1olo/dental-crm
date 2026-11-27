/**
 * DENTE CRM — Offline Appointment Queue & Schedule Cache
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization.
 * - Mandate 8e: Doctor autonomy — receptionist & doctor can schedule visits offline without network blocks.
 * - Mandate 8n: Solo doctor & small clinic resilience in 1-chair clinics without network/server.
 * - Mandate 8s: Friction-killer — zero lost bookings, instant local state updates.
 *
 * Provides resilient optimistic queueing of created, rescheduled, and updated appointments.
 */

import { type AppointmentStatus, generateUuidV7 } from "@dental/shared";
import { SCHEDULES_CACHE_STORE_NAME } from "../services/offline/storage/constants.js";
import { queueBatchedStorePut } from "../services/offline/storage/idbBatchBuffer.js";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	removeOfflineMutation,
	type OfflineMutation,
} from "../services/offline/offlineStorage.js";
import { logger } from "../utils/logger.js";
import { offlineSyncService } from "../services/offline/offlineSyncService.js";

export type AppointmentMutationAction = "CREATE_APPOINTMENT" | "UPDATE_APPOINTMENT" | "CANCEL_APPOINTMENT";

export interface OfflineAppointmentItem {
	readonly id: string;
	readonly clientReferenceId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorName?: string | null | undefined;
	readonly chairId?: string | null | undefined;
	readonly startTime: string;
	readonly endTime: string;
	readonly status: AppointmentStatus | "scheduled";
	readonly notes?: string | null | undefined;
	readonly serviceIds?: string[] | undefined;
	readonly organizationId?: string | null | undefined;
	readonly createdAt: string;
	readonly isOfflineCreated?: boolean | undefined;
}

export interface QueuedAppointmentMutation {
	readonly id: string;
	readonly action: AppointmentMutationAction;
	readonly appointment: OfflineAppointmentItem;
	readonly timestamp: number;
}

// Bounded in-memory optimistic schedule cache keyed by YYYY-MM-DD (max 31 days)
const MAX_CACHED_SCHEDULE_DAYS = 31;
const scheduleDateCache = new Map<string, OfflineAppointmentItem[]>();

function setBoundedScheduleCache(dateKey: string, list: OfflineAppointmentItem[]): void {
	if (scheduleDateCache.has(dateKey)) {
		scheduleDateCache.delete(dateKey);
	} else if (scheduleDateCache.size >= MAX_CACHED_SCHEDULE_DAYS) {
		const oldest = scheduleDateCache.keys().next().value;
		if (oldest !== undefined) scheduleDateCache.delete(oldest);
	}
	scheduleDateCache.set(dateKey, [...list]);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveValidSyncUuid(candidate?: string | null, fallback?: string | null): string {
	if (candidate && UUID_REGEX.test(candidate)) return candidate;
	if (fallback && UUID_REGEX.test(fallback)) return fallback;
	return generateUuidV7();
}

/**
 * Generates collision-resistant unique client reference ID (UUIDv7) for offline appointments.
 */
export function generateOfflineAppointmentId(): string {
	return generateUuidV7();
}

/**
 * Optimistically enqueues an appointment mutation and updates the in-memory schedule immediately.
 */
export async function enqueueOfflineAppointment(
	action: AppointmentMutationAction,
	appointment: OfflineAppointmentItem,
): Promise<OfflineMutation> {
	const dateKey = appointment.startTime.substring(0, 10);
	const currentList = scheduleDateCache.get(dateKey) || [];

	if (action === "CREATE_APPOINTMENT") {
		const updatedList = [...currentList.filter((a) => a.id !== appointment.id), appointment];
		scheduleDateCache.set(dateKey, updatedList);
	} else if (action === "UPDATE_APPOINTMENT") {
		const updatedList = currentList.map((a) => (a.id === appointment.id ? appointment : a));
		scheduleDateCache.set(dateKey, updatedList);
	} else if (action === "CANCEL_APPOINTMENT") {
		const updatedList = currentList.map((a) =>
			a.id === appointment.id ? { ...a, status: "cancelled" as const } : a,
		);
		scheduleDateCache.set(dateKey, updatedList);
	}

	const orgId = appointment.organizationId || "default_org";
	const mutationAction =
		action === "CREATE_APPOINTMENT"
			? "create"
			: action === "CANCEL_APPOINTMENT"
				? "delete"
				: "update";

	return enqueueOfflineMutation<OfflineAppointmentItem>({
		entityType: "appointment",
		entityId: appointment.id,
		action: mutationAction,
		payload: appointment,
		organizationId: orgId,
	});
}

/**
 * Retrieves all pending appointment mutations waiting to be synced with the server.
 */
export async function getPendingAppointmentMutations(): Promise<QueuedAppointmentMutation[]> {
	try {
		const mutations = await getPendingOfflineMutations({ entityType: "appointment" });
		const results: QueuedAppointmentMutation[] = [];

		for (const mut of mutations) {
			if (mut.entityType === "appointment" || mut.entityType === "APPOINTMENT_BOOKING_DRAFT") {
				const action: AppointmentMutationAction =
					mut.action === "create"
						? "CREATE_APPOINTMENT"
						: mut.action === "delete"
							? "CANCEL_APPOINTMENT"
							: "UPDATE_APPOINTMENT";

				results.push({
					id: mut.mutationId,
					action,
					appointment: mut.payload as OfflineAppointmentItem,
					timestamp: mut.timestampMs || new Date(mut.timestamp).getTime(),
				});
			}
		}

		return results;
	} catch (err) {
		logger.warn("[offlineAppointmentQueue] Error reading pending appointment mutations:", err);
		return [];
	}
}

/**
 * Caches server schedule list for a given date in memory and persistent storage.
 */
export function cacheScheduleOffline(
	dateStr: string,
	appointments: OfflineAppointmentItem[],
): void {
	const normalizedDate = dateStr.substring(0, 10);
	setBoundedScheduleCache(normalizedDate, appointments);

	const nowMs = Date.now();
	const scheduleKey = `schedule_default_${normalizedDate}`;
	queueBatchedStorePut({
		storeName: SCHEDULES_CACHE_STORE_NAME,
		key: scheduleKey,
		record: {
			scheduleKey,
			date: normalizedDate,
			appointments: [...appointments],
			cachedAt: new Date(nowMs).toISOString(),
			cachedAtMs: nowMs,
		},
	});
}

/**
 * Retrieves cached appointments for a given date from bounded L1 cache.
 */
export function getCachedScheduleOffline(dateStr: string): OfflineAppointmentItem[] | null {
	const normalizedDate = dateStr.substring(0, 10);

	if (scheduleDateCache.has(normalizedDate)) {
		return scheduleDateCache.get(normalizedDate) || [];
	}

	return null;
}

/**
 * Flushes pending appointment mutations with a provided server dispatcher.
 */
export async function syncAppointmentQueue(
	syncDispatcher: (mutation: QueuedAppointmentMutation) => Promise<{ success: boolean; serverId?: string | undefined }>,
): Promise<{ syncedCount: number; failedCount: number }> {
	const pending = await getPendingAppointmentMutations();
	let syncedCount = 0;
	let failedCount = 0;

	for (const item of pending) {
		try {
			const res = await syncDispatcher(item);
			if (res.success) {
				await removeOfflineMutation(item.id);
				syncedCount++;
			} else {
				failedCount++;
			}
		} catch (err) {
			logger.warn(`[offlineAppointmentQueue] Failed to sync mutation ${item.id}:`, err);
			failedCount++;
		}
	}

	return { syncedCount, failedCount };
}

/**
 * Flushes offline appointment mutations through the single SSOT Sync Gateway outbox (`OfflineSyncService`),
 * eliminating competing direct POST/PATCH flushes and duplicate online listeners.
 */
let isAppointmentFlushing = false;
export async function flushOfflineAppointmentsToServer(): Promise<{ syncedCount: number; failedCount: number }> {
	if (isAppointmentFlushing) {
		return { syncedCount: 0, failedCount: 0 };
	}
	isAppointmentFlushing = true;
	try {
		const drain = await offlineSyncService.drainOutbox();
		return {
			syncedCount: drain.appliedCount + drain.duplicateCount + drain.mergedCount,
			failedCount: drain.failedCount + drain.rejectedCount,
		};
	} finally {
		isAppointmentFlushing = false;
	}
}

/**
 * Legacy compatibility hook: lifecycle online sync is managed centrally by OfflineSyncService.
 */
export function initOfflineAppointmentAutoSync(): void {
	// Managed centrally by OfflineSyncService to prevent duplicate online flushes.
}

/**
 * Clears schedule cache memory.
 */
export function clearScheduleMemoryCache(): void {
	scheduleDateCache.clear();
}
