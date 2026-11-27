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
import { ODONTOGRAM_CACHE_STORE_NAME } from "../../../services/offline/storage/constants";
import {
	isIndexedDbAvailable,
	openOfflineOutboxDb,
} from "../../../services/offline/storage/idbDatabase";
import { logger } from "../../../utils/logger";

const STORE_NAME = ODONTOGRAM_CACHE_STORE_NAME;

async function getIndexedDb(): Promise<IDBDatabase | null> {
	if (!isIndexedDbAvailable()) {
		return null;
	}
	try {
		return await openOfflineOutboxDb();
	} catch (err) {
		logger.error("[IndexedDB Odontogram] Failed to open unified outbox database", err);
		return null;
	}
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
		const nowMs = Date.now();
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.put({
			patientId,
			teeth: states,
			states,
			adultMode: true,
			cachedAt: new Date(nowMs).toISOString(),
			cachedAtMs: nowMs,
			savedAt: new Date(nowMs).toISOString(),
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
				const res = req.result as { states?: ToothData[]; teeth?: ToothData[] } | undefined;
				const resolved = Array.isArray(res?.states) && res.states.length > 0
					? res.states
					: Array.isArray(res?.teeth) && res.teeth.length > 0
						? res.teeth
						: null;
				resolve(resolved);
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

		const resolvedResorption =
			found.rootResorptionStage ??
			found.rootResorption ??
			cachedTooth.rootResorptionStage ??
			cachedTooth.rootResorption;
		const resolvedMobility = found.mobility ?? cachedTooth.mobility;
		const pediatricPatch = {
			...(resolvedResorption !== undefined ? { rootResorptionStage: resolvedResorption, rootResorption: resolvedResorption } : {}),
			...(resolvedMobility !== undefined ? { mobility: resolvedMobility } : {}),
		};

		const localTime = cachedTooth.updatedAt ? new Date(cachedTooth.updatedAt).getTime() : 0;
		const serverTime = found.updatedAt ? new Date(found.updatedAt).getTime() : 0;

		if (localTime > 0 && serverTime > 0) {
			if (localTime > serverTime) {
				return {
					...found,
					...cachedTooth,
					...surfacePatch,
					...pediatricPatch,
				};
			}
			return {
				...cachedTooth,
				...found,
				...surfacePatch,
				...pediatricPatch,
			};
		}

		if (localTime > 0 && serverTime === 0) {
			return {
				...found,
				...cachedTooth,
				...surfacePatch,
				...pediatricPatch,
			};
		}

		return {
			...cachedTooth,
			...found,
			...surfacePatch,
			...pediatricPatch,
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
 * Supports Surface Union Merge (MODBL) preserving fillings and caries on concurrent surfaces.
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

		const prevClin = (tooth.clinicalData ?? {}) as Record<string, unknown>;
		const isPrevFilling =
			tooth.state === "Filled" ||
			(tooth.state as string) === "Filling" ||
			Boolean(prevClin.hasFilling);
		const isIncomingCaries = state === "Caries";
		const isIncomingFilling = state === "Filled" || (state as string) === "Filling";
		const isPrevCaries = tooth.state === "Caries" || Boolean(prevClin.hasCaries);

		let resolvedIncomingSurfaces: string[] = [];
		if (surfacesOverride !== undefined) {
			resolvedIncomingSurfaces = [...surfacesOverride];
		} else if (currentActiveSurfaces.length > 0) {
			resolvedIncomingSurfaces = [...currentActiveSurfaces];
		}

		// Composite state merge: Filling + Caries simultaneously
		if (isPrevFilling && isIncomingCaries && resolvedIncomingSurfaces.length > 0) {
			const prevFillSurfs = Array.isArray(prevClin.fillingSurfaces)
				? (prevClin.fillingSurfaces as string[])
				: (tooth.surfaces ?? []);
			const mergedSurfaces = Array.from(
				new Set([...prevFillSurfs, ...resolvedIncomingSurfaces]),
			);
			const updated: ToothData = {
				...tooth,
				state: "Caries",
				surfaces: mergedSurfaces,
				clinicalData: {
					...prevClin,
					hasFilling: true,
					hasCaries: true,
					baseState: "Filled",
					fillingSurfaces: prevFillSurfs,
					defectSurfaces: resolvedIncomingSurfaces,
				},
				updatedAt: nowIso,
			};
			return updated;
		}

		if (isPrevCaries && isIncomingFilling && resolvedIncomingSurfaces.length > 0) {
			const prevCariesSurfs = Array.isArray(prevClin.defectSurfaces)
				? (prevClin.defectSurfaces as string[])
				: (tooth.surfaces ?? []);
			const remainingCaries = prevCariesSurfs.filter(
				(s) => !resolvedIncomingSurfaces.includes(s),
			);
			const mergedSurfaces = Array.from(
				new Set([...resolvedIncomingSurfaces, ...remainingCaries]),
			);
			const updated: ToothData = {
				...tooth,
				state: remainingCaries.length > 0 ? "Caries" : "Filled",
				surfaces: mergedSurfaces,
				clinicalData: {
					...prevClin,
					hasFilling: true,
					hasCaries: remainingCaries.length > 0,
					fillingSurfaces: resolvedIncomingSurfaces,
					defectSurfaces: remainingCaries.length > 0 ? remainingCaries : undefined,
				},
				updatedAt: nowIso,
			};
			return updated;
		}

		const updated: ToothData = { ...tooth, state, updatedAt: nowIso };
		if (surfacesOverride !== undefined) {
			if (surfacesOverride.length > 0) updated.surfaces = [...surfacesOverride];
			else delete updated.surfaces;
		} else if (currentActiveSurfaces.length > 0) {
			updated.surfaces = [...currentActiveSurfaces];
		} else if (state === "Healthy" || state === "Missing") {
			delete updated.surfaces;
			if (updated.clinicalData) {
				const { fillingSurfaces, defectSurfaces, hasFilling, hasCaries, ...restClin } = (updated.clinicalData as Record<string, unknown>);
				updated.clinicalData = restClin;
			}
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
