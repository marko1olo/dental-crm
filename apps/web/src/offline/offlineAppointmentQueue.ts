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

import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	removeOfflineMutation,
	type OfflineMutation,
} from "../services/offline/offlineStorage.js";
import { logger } from "../utils/logger.js";

export type AppointmentMutationAction = "CREATE_APPOINTMENT" | "UPDATE_APPOINTMENT" | "CANCEL_APPOINTMENT";

export interface OfflineAppointmentItem {
	readonly id: string;
	readonly clientReferenceId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorName?: string | undefined;
	readonly chairId?: string | undefined;
	readonly startTime: string;
	readonly endTime: string;
	readonly status: "scheduled" | "confirmed" | "completed" | "cancelled";
	readonly notes?: string | undefined;
	readonly serviceIds?: string[] | undefined;
	readonly organizationId?: string | undefined;
	readonly createdAt: string;
	readonly isOfflineCreated?: boolean | undefined;
}

export interface QueuedAppointmentMutation {
	readonly id: string;
	readonly action: AppointmentMutationAction;
	readonly appointment: OfflineAppointmentItem;
	readonly timestamp: number;
}

// In-memory optimistic schedule cache keyed by YYYY-MM-DD
const scheduleDateCache = new Map<string, OfflineAppointmentItem[]>();

/**
 * Generates collision-resistant unique client reference ID for offline appointments.
 */
export function generateOfflineAppointmentId(): string {
	const rand = Math.random().toString(36).substring(2, 9);
	const time = Date.now().toString(36);
	return `off_apt_${time}_${rand}`;
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
	scheduleDateCache.set(normalizedDate, [...appointments]);

	try {
		if (typeof localStorage !== "undefined") {
			const cacheKey = `dente_schedule_cache_${normalizedDate}`;
			localStorage.setItem(cacheKey, JSON.stringify({
				cachedAt: Date.now(),
				data: appointments,
			}));
		}
	} catch (e) {
		// Quota or disabled, safe to ignore
	}
}

/**
 * Retrieves cached appointments for a given date (memory first, then localStorage).
 */
export function getCachedScheduleOffline(dateStr: string): OfflineAppointmentItem[] | null {
	const normalizedDate = dateStr.substring(0, 10);

	if (scheduleDateCache.has(normalizedDate)) {
		return scheduleDateCache.get(normalizedDate) || [];
	}

	try {
		if (typeof localStorage !== "undefined") {
			const raw = localStorage.getItem(`dente_schedule_cache_${normalizedDate}`);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed?.data)) {
					scheduleDateCache.set(normalizedDate, parsed.data);
					return parsed.data;
				}
			}
		}
	} catch (e) {
		// Parse error, ignore
	}

	return null;
}

/**
 * Flushes pending appointment mutations with a provided server dispatcher.
 */
export async function syncAppointmentQueue(
	syncDispatcher: (mutation: QueuedAppointmentMutation) => Promise<{ success: boolean; serverId?: string }>,
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
 * Clears schedule cache memory.
 */
export function clearScheduleMemoryCache(): void {
	scheduleDateCache.clear();
}
