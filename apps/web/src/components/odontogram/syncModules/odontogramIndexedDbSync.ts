/**
 * apps/web/src/components/odontogram/syncModules/odontogramIndexedDbSync.ts
 *
 * DENTE Dental CRM — Instant IndexedDB L2 Odontogram Persistence Engine.
 * Provides zero-latency write to IndexedDB L2 alongside memory/localStorage tier
 * to eliminate data loss upon browser crashes or forced tab closes (Mandate 8e).
 */

import type { ToothData } from "../ToothChart";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../odontogramStorage";
import { logger } from "../../../utils/logger";

const DB_NAME = "dente_odontogram_db";
const DB_VERSION = 1;
const STORE_NAME = "tooth_states";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIndexedDb(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === "undefined") {
		return Promise.resolve(null);
	}
	if (!dbPromise) {
		dbPromise = new Promise((resolve) => {
			try {
				const req = indexedDB.open(DB_NAME, DB_VERSION);
				req.onupgradeneeded = (e) => {
					const db = (e.target as IDBOpenDBRequest).result;
					if (!db.objectStoreNames.contains(STORE_NAME)) {
						db.createObjectStore(STORE_NAME, { keyPath: "patientId" });
					}
				};
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => {
					logger.error("[IndexedDB Odontogram] Failed to open database", req.error);
					resolve(null);
				};
			} catch (err) {
				logger.error("[IndexedDB Odontogram] Exception opening database", err);
				resolve(null);
			}
		});
	}
	return dbPromise;
}

/**
 * Direct non-blocking asynchronous write to IndexedDB L2.
 */
export async function saveToothStatesToIndexedDb(
	patientId: string,
	states: ToothData[],
): Promise<void> {
	if (!patientId) return;
	try {
		const db = await getIndexedDb();
		if (!db) return;
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.put({
			patientId,
			states,
			savedAt: new Date().toISOString(),
		});
	} catch (err) {
		logger.error("[IndexedDB Odontogram] write failure", err);
	}
}

/**
 * Reads tooth states from IndexedDB L2.
 */
export async function loadToothStatesFromIndexedDb(
	patientId: string,
): Promise<ToothData[] | null> {
	if (!patientId) return null;
	try {
		const db = await getIndexedDb();
		if (!db) return null;
		return new Promise((resolve) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const req = store.get(patientId);
			req.onsuccess = () => {
				const res = req.result as { states?: ToothData[] } | undefined;
				if (res && Array.isArray(res.states) && res.states.length > 0) {
					resolve(res.states);
				} else {
					resolve(null);
				}
			};
			req.onerror = () => resolve(null);
		});
	} catch {
		return null;
	}
}

/**
 * Two-tier synchronous and asynchronous local persistence.
 * Immediately saves to in-memory/localStorage cache, and queues IndexedDB L2 commit.
 */
export function persistTeethLocally(
	patientId: string,
	states: ToothData[],
	immediate = false,
): void {
	if (!patientId) return;
	saveStoredTeethData(patientId, states, immediate);
	void saveToothStatesToIndexedDb(patientId, states);
}

/**
 * Loads teeth from available local storage tiers (Memory -> LocalStorage -> Synchronous return).
 */
export function loadTeethFromLocalCache(patientId: string): ToothData[] | null {
	return loadStoredTeethData(patientId);
}

/**
 * Conflict resolution: merges incoming server tooth states with local cache,
 * respecting the latest updatedAt timestamp and preserving local optimistic surfaces.
 */
export function mergeTeethWithLocalCache(
	baseTeeth: ToothData[],
	incoming: ToothData[],
): ToothData[] {
	if (incoming.length === 0) return baseTeeth;

	const merged = baseTeeth.map((cachedTooth) => {
		const found = incoming.find((inc) => inc.toothNumber === cachedTooth.toothNumber);
		if (!found) {
			return cachedTooth;
		}
		const resolvedSurfaces =
			found.surfaces && found.surfaces.length > 0
				? found.surfaces
				: cachedTooth.surfaces && cachedTooth.surfaces.length > 0
					? cachedTooth.surfaces
					: [];
		const surfacePatch = { surfaces: [...resolvedSurfaces] };

		const localTime = cachedTooth.updatedAt ? new Date(cachedTooth.updatedAt).getTime() : 0;
		const serverTime = found.updatedAt ? new Date(found.updatedAt).getTime() : 0;

		if (localTime > 0 && serverTime > 0) {
			if (localTime > serverTime) {
				return {
					...found,
					...cachedTooth,
					...surfacePatch,
				};
			}
			return {
				...cachedTooth,
				...found,
				...surfacePatch,
			};
		}

		if (localTime > 0 && serverTime === 0) {
			return {
				...found,
				...cachedTooth,
				...surfacePatch,
			};
		}

		return {
			...cachedTooth,
			...found,
			...surfacePatch,
		};
	});

	for (const item of incoming) {
		if (!merged.some((m) => m.toothNumber === item.toothNumber)) {
			merged.push(item);
		}
	}

	return merged;
}

/**
 * Pure immutability reducer for applying tooth state and surface changes.
 */
export function applyUpdatedStatesToTeeth(
	currentTeeth: ToothData[],
	toothNumbers: number[],
	state: ToothData["state"],
	surfacesOverride?: readonly string[] | undefined,
	currentActiveSurfaces: readonly string[] = [],
): ToothData[] {
	const nowIso = new Date().toISOString();
	const next: ToothData[] = currentTeeth.map((tooth) => {
		if (!toothNumbers.includes(tooth.toothNumber)) return tooth;
		const updated: ToothData = { ...tooth, state, updatedAt: nowIso };
		if (surfacesOverride !== undefined) {
			if (surfacesOverride.length > 0) updated.surfaces = [...surfacesOverride];
			else delete updated.surfaces;
		} else if (currentActiveSurfaces.length > 0) {
			updated.surfaces = [...currentActiveSurfaces];
		} else if (state === "Healthy" || state === "Missing") {
			delete updated.surfaces;
		} else if (tooth.surfaces && tooth.surfaces.length > 0) {
			updated.surfaces = [...tooth.surfaces];
		}
		return updated;
	});
	for (const t of toothNumbers) {
		if (next.some((tooth) => tooth.toothNumber === t)) continue;
		const newItem: ToothData = { toothNumber: t, state, updatedAt: nowIso };
		if (surfacesOverride && surfacesOverride.length > 0) newItem.surfaces = [...surfacesOverride];
		else if (currentActiveSurfaces.length > 0) newItem.surfaces = [...currentActiveSurfaces];
		next.push(newItem);
	}
	return next;
}
