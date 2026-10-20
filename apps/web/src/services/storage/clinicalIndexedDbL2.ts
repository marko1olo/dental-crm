/**
 * DENTE CRM — Clinical IndexedDB L2 Offline Persistence & Crash Recovery
 *
 * Provides a crash-resilient L2 storage layer for clinic workstations (Celeron/Atom/HDD):
 * 1. offline_mutations: UUIDv7 mutation queue with pending/synced/failed states.
 * 2. patient_snapshots: Instant snapshot of active patient record (EMK, odontogram, somatic).
 * 3. schedule_cache: Daily and weekly schedule snapshot for offline clinic work.
 * 4. Cold-Start Hydration: L1 RAM cache warmed up in <5ms before first API request.
 *
 * Conforms to Mandate 8b (< 500 lines limit).
 */

import { useEffect, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { logger } from "../../utils/logger";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import {
	L2_STORE_MUTATIONS,
	L2_STORE_PATIENTS,
	L2_STORE_SCHEDULE,
	type L2MutationStatus,
	type L2OfflineMutation,
	type L2StorageStatus,
	type PatientSnapshot,
	type ScheduleCacheEntry,
} from "./clinicalIndexedDbL2Types";
import {
	idbDeleteRecord,
	idbGetAllRecords,
	idbGetRecord,
	idbPutRecord,
	openClinicalL2Db,
	resetL2DbConnection,
} from "./clinicalIndexedDbL2Db";

export * from "./clinicalIndexedDbL2Types";
export { openClinicalL2Db } from "./clinicalIndexedDbL2Db";

// In-Memory Fallback when IndexedDB is unavailable
const fallbackMutations = new Map<string, L2OfflineMutation>();
const fallbackPatients = new Map<string, PatientSnapshot>();
const fallbackSchedule = new Map<string, ScheduleCacheEntry>();

let lastSavedTimestamp: string | null = null;
let lastHydratedTimestamp: string | null = null;
const statusListeners = new Set<(status: L2StorageStatus) => void>();

export async function savePatientSnapshot<T = unknown>(
	snapshot: Omit<PatientSnapshot<T>, "updatedAt" | "updatedAtMs"> & {
		updatedAt?: string | undefined;
		updatedAtMs?: number | undefined;
	},
): Promise<void> {
	const now = new Date();
	const record: PatientSnapshot<T> = {
		...snapshot,
		updatedAt: snapshot.updatedAt ?? now.toISOString(),
		updatedAtMs: snapshot.updatedAtMs ?? now.getTime(),
	};

	lastSavedTimestamp = record.updatedAt;
	fallbackPatients.set(record.patientId, record as PatientSnapshot);

	try {
		safeLocalStorageSetItem(`dente_l2_patient:${record.patientId}`, JSON.stringify(record));
	} catch {}

	try {
		await idbPutRecord(L2_STORE_PATIENTS, record);
	} catch (err) {
		logger.debug(`[L2Storage] IDB save patient error: ${record.patientId}`, err);
	}

	notifyL2StatusChanged();
}

export async function getPatientSnapshot<T = unknown>(
	patientId: string,
): Promise<PatientSnapshot<T> | null> {
	try {
		const idbRecord = await idbGetRecord<PatientSnapshot<T>>(L2_STORE_PATIENTS, patientId);
		if (idbRecord) return idbRecord;
	} catch (err) {
		logger.debug(`[L2Storage] IDB get patient error: ${patientId}`, err);
	}

	const fallback = fallbackPatients.get(patientId);
	if (fallback) return fallback as PatientSnapshot<T>;

	try {
		const raw = safeLocalStorageGetItem(`dente_l2_patient:${patientId}`);
		if (raw) {
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === "object" ? parsed : null;
		}
	} catch {}

	return null;
}

export async function listPatientSnapshots(): Promise<PatientSnapshot[]> {
	const map = new Map<string, PatientSnapshot>();
	for (const [id, snap] of fallbackPatients.entries()) {
		map.set(id, snap);
	}

	try {
		const idbList = await idbGetAllRecords<PatientSnapshot>(L2_STORE_PATIENTS);
		for (const snap of idbList) {
			map.set(snap.patientId, snap);
		}
	} catch (err) {
		logger.debug("[L2Storage] IDB list patients error", err);
	}

	return Array.from(map.values()).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

export async function saveScheduleCache<T = unknown>(
	entry: Omit<ScheduleCacheEntry<T>, "updatedAt" | "updatedAtMs"> & {
		updatedAt?: string | undefined;
		updatedAtMs?: number | undefined;
	},
): Promise<void> {
	const now = new Date();
	const record: ScheduleCacheEntry<T> = {
		...entry,
		updatedAt: entry.updatedAt ?? now.toISOString(),
		updatedAtMs: entry.updatedAtMs ?? now.getTime(),
	};

	lastSavedTimestamp = record.updatedAt;
	fallbackSchedule.set(record.scheduleKey, record as ScheduleCacheEntry);

	try {
		safeLocalStorageSetItem(`dente_l2_schedule:${record.scheduleKey}`, JSON.stringify(record));
	} catch {}

	try {
		await idbPutRecord(L2_STORE_SCHEDULE, record);
	} catch (err) {
		logger.debug(`[L2Storage] IDB save schedule error: ${record.scheduleKey}`, err);
	}

	notifyL2StatusChanged();
}

export async function getScheduleCache<T = unknown>(
	scheduleKey: string,
): Promise<ScheduleCacheEntry<T> | null> {
	try {
		const idbRecord = await idbGetRecord<ScheduleCacheEntry<T>>(L2_STORE_SCHEDULE, scheduleKey);
		if (idbRecord) return idbRecord;
	} catch (err) {
		logger.debug(`[L2Storage] IDB get schedule error: ${scheduleKey}`, err);
	}

	const fallback = fallbackSchedule.get(scheduleKey);
	if (fallback) return fallback as ScheduleCacheEntry<T>;

	try {
		const raw = safeLocalStorageGetItem(`dente_l2_schedule:${scheduleKey}`);
		if (raw) {
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === "object" ? parsed : null;
		}
	} catch {}

	return null;
}

export async function listScheduleCaches(): Promise<ScheduleCacheEntry[]> {
	const map = new Map<string, ScheduleCacheEntry>();
	for (const [k, v] of fallbackSchedule.entries()) {
		map.set(k, v);
	}

	try {
		const idbList = await idbGetAllRecords<ScheduleCacheEntry>(L2_STORE_SCHEDULE);
		for (const item of idbList) {
			map.set(item.scheduleKey, item);
		}
	} catch (err) {
		logger.debug("[L2Storage] IDB list schedules error", err);
	}

	return Array.from(map.values()).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

export async function enqueueL2OfflineMutation<T = unknown>(
	input: Omit<L2OfflineMutation<T>, "mutationId" | "status" | "createdAt" | "createdAtMs"> & {
		mutationId?: string | undefined;
	},
): Promise<L2OfflineMutation<T>> {
	const now = new Date();
	const mutationId = input.mutationId ?? generateUuidV7();
	const record: L2OfflineMutation<T> = {
		mutationId,
		status: "pending",
		entityType: input.entityType,
		action: input.action,
		payload: input.payload,
		createdAt: now.toISOString(),
		createdAtMs: now.getTime(),
		organizationId: input.organizationId,
	};

	lastSavedTimestamp = record.createdAt;
	fallbackMutations.set(mutationId, record as L2OfflineMutation);

	try {
		await idbPutRecord(L2_STORE_MUTATIONS, record);
	} catch (err) {
		logger.debug(`[L2Storage] IDB enqueue mutation error: ${mutationId}`, err);
	}

	notifyL2StatusChanged();
	return record;
}

export async function getPendingL2OfflineMutations(): Promise<L2OfflineMutation[]> {
	const map = new Map<string, L2OfflineMutation>();
	for (const [id, m] of fallbackMutations.entries()) {
		if (m.status === "pending") map.set(id, m);
	}

	try {
		const all = await idbGetAllRecords<L2OfflineMutation>(L2_STORE_MUTATIONS);
		for (const item of all) {
			if (item.status === "pending") {
				map.set(item.mutationId, item);
			}
		}
	} catch (err) {
		logger.debug("[L2Storage] IDB get pending mutations error", err);
	}

	return Array.from(map.values()).sort((a, b) => a.createdAtMs - b.createdAtMs);
}

export async function updateL2OfflineMutationStatus(
	mutationId: string,
	status: L2MutationStatus,
	error?: string,
): Promise<void> {
	const fallback = fallbackMutations.get(mutationId);
	if (fallback) {
		fallback.status = status;
		if (error) fallback.error = error;
		if (status === "synced") fallback.syncedAt = new Date().toISOString();
	}

	try {
		const existing = await idbGetRecord<L2OfflineMutation>(L2_STORE_MUTATIONS, mutationId);
		if (existing) {
			existing.status = status;
			if (error) existing.error = error;
			if (status === "synced") existing.syncedAt = new Date().toISOString();
			await idbPutRecord(L2_STORE_MUTATIONS, existing);
		}
	} catch (err) {
		logger.debug(`[L2Storage] IDB update mutation error: ${mutationId}`, err);
	}

	notifyL2StatusChanged();
}

export async function clearSyncedL2OfflineMutations(): Promise<number> {
	const deletedIds = new Set<string>();

	for (const [id, m] of Array.from(fallbackMutations.entries())) {
		if (m.status === "synced") {
			fallbackMutations.delete(id);
			deletedIds.add(id);
		}
	}

	try {
		const all = await idbGetAllRecords<L2OfflineMutation>(L2_STORE_MUTATIONS);
		for (const item of all) {
			if (item.status === "synced") {
				await idbDeleteRecord(L2_STORE_MUTATIONS, item.mutationId);
				deletedIds.add(item.mutationId);
			}
		}
	} catch (err) {
		logger.debug("[L2Storage] IDB clear synced mutations error", err);
	}

	notifyL2StatusChanged();
	return deletedIds.size;
}

export async function hydrateL1CacheFromL2(
	onHydrateEntity?: (kind: string, id: string, data: unknown) => void,
): Promise<{
	patientSnapshotsCount: number;
	scheduleCount: number;
	pendingMutationsCount: number;
	hydrationTimeMs: number;
}> {
	const startTime = performance.now();
	lastHydratedTimestamp = new Date().toISOString();

	let patientSnapshotsCount = 0;
	let scheduleCount = 0;
	let pendingMutationsCount = 0;

	try {
		const [patients, schedules, pending] = await Promise.all([
			listPatientSnapshots(),
			listScheduleCaches(),
			getPendingL2OfflineMutations(),
		]);

		patientSnapshotsCount = patients.length;
		scheduleCount = schedules.length;
		pendingMutationsCount = pending.length;

		if (onHydrateEntity) {
			for (const p of patients) {
				onHydrateEntity("patient", p.patientId, p);
			}
			for (const s of schedules) {
				onHydrateEntity("schedule", s.scheduleKey, s);
			}
		}
	} catch (err) {
		logger.warn("[L2Storage] Cold-start hydration encountered error", err);
	}

	const hydrationTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
	notifyL2StatusChanged();
	return {
		patientSnapshotsCount,
		scheduleCount,
		pendingMutationsCount,
		hydrationTimeMs,
	};
}

export function writeThroughL2Snapshot(
	entityKind: string,
	entityId: string,
	data: unknown,
	organizationId?: string,
): void {
	const run = () => {
		void (async () => {
			try {
				if (entityKind === "patient" || entityKind === "visit" || entityKind === "odontogram") {
					const patientId = entityKind === "patient" ? entityId : (data as { patientId?: string })?.patientId || entityId;
					await savePatientSnapshot({
						patientId,
						organizationId,
						emkRecord: entityKind === "visit" ? data : undefined,
						odontogram: entityKind === "odontogram" ? data : undefined,
					});
				} else if (entityKind === "appointment" || entityKind === "schedule") {
					await saveScheduleCache({
						scheduleKey: `schedule:${entityId}`,
						date: new Date().toISOString().slice(0, 10),
						organizationId,
						appointments: Array.isArray(data) ? data : [data],
					});
				}
			} catch (err) {
				logger.debug("[L2Storage] Write-through save error", err);
			}
		})();
	};

	if (typeof queueMicrotask === "function") {
		queueMicrotask(run);
	} else {
		void Promise.resolve().then(run);
	}
}

export async function getL2StorageStatus(): Promise<L2StorageStatus> {
	const db = await openClinicalL2Db();
	const isReady = db !== null || fallbackPatients.size > 0;
	const isPersisted =
		typeof navigator !== "undefined" &&
		navigator.storage &&
		typeof navigator.storage.persisted === "function"
			? await navigator.storage.persisted().catch(() => false)
			: false;

	const [patients, schedules, pending] = await Promise.all([
		listPatientSnapshots(),
		listScheduleCaches(),
		getPendingL2OfflineMutations(),
	]);

	return {
		isReady,
		isPersisted,
		storageType: db ? "indexeddb" : "memory_fallback",
		patientSnapshotsCount: patients.length,
		scheduleSnapshotsCount: schedules.length,
		pendingMutationsCount: pending.length,
		lastSavedAt: lastSavedTimestamp,
		lastHydratedAt: lastHydratedTimestamp,
	};
}

export function subscribeL2StorageStatus(
	listener: (status: L2StorageStatus) => void,
): () => void {
	statusListeners.add(listener);
	void getL2StorageStatus().then((st) => listener(st));
	return () => {
		statusListeners.delete(listener);
	};
}

function notifyL2StatusChanged(): void {
	if (statusListeners.size === 0) return;
	void getL2StorageStatus().then((status) => {
		for (const listener of statusListeners) {
			try {
				listener(status);
			} catch {}
		}
	});
}

export async function resetL2Storage(): Promise<void> {
	fallbackMutations.clear();
	fallbackPatients.clear();
	fallbackSchedule.clear();
	lastSavedTimestamp = null;
	lastHydratedTimestamp = null;
	resetL2DbConnection();
}

/**
 * Reactive React hook to observe L2 storage status in UI components.
 */
export function useL2StorageStatus(): L2StorageStatus {
	const [status, setStatus] = useState<L2StorageStatus>({
		isReady: false,
		isPersisted: false,
		storageType: "memory_fallback",
		patientSnapshotsCount: 0,
		scheduleSnapshotsCount: 0,
		pendingMutationsCount: 0,
		lastSavedAt: null,
		lastHydratedAt: null,
	});

	useEffect(() => {
		const unsub = subscribeL2StorageStatus((st) => setStatus(st));
		return unsub;
	}, []);

	return status;
}

