/**
 * DENTE CRM — Offline Visit Drafting Engine
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization.
 * - Mandate 8e: Doctor autonomy — debounced autosave, zero lost keystrokes, non-blocking disk I/O.
 * - Mandate 8n: Solo doctor & small clinic resilience without internet connection.
 * - Mandate 8s: Friction-killer — Form 043/u instant drafting.
 *
 * Memory-first (L1 RAM) read/write with debounced coalesced flush to IndexedDB/localStorage.
 * Completely eliminates UI stalls, cursor freezes, and disk queue saturation.
 */

import {
	saveOfflineDraftDebounced,
	saveOfflineDraft,
	getOfflineDraft,
	deleteOfflineDraft,
	getOfflineDraftsByType,
	type OfflineDraftRecord,
} from "../services/offline/offlineStorage.js";
import { isLowSpecDevice } from "../utils/lowSpecHddOptimizer.js";
import { logger } from "../utils/logger.js";

export interface VisitDraftPayload {
	readonly patientId: string;
	readonly visitId?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly complaints?: string | undefined;
	readonly anamnesisMorbi?: string | undefined;
	readonly anamnesisVitae?: string | undefined;
	readonly objectiveData?: string | undefined;
	readonly diagnosisIcd10?: string[] | undefined;
	readonly treatmentPlan?: string | undefined;
	readonly performedProcedures?: string[] | undefined;
	readonly teethStatus?: Record<string, string> | undefined;
	readonly recommendations?: string | undefined;
	readonly updatedAt?: string | undefined;
	readonly isDraft?: boolean | undefined;
	readonly [key: string]: unknown;
}

const memoryDraftCache = new Map<string, VisitDraftPayload>();

function makeDraftKey(patientId: string, visitId?: string): string {
	return visitId ? `visit_draft_${patientId}_${visitId}` : `visit_draft_${patientId}_active`;
}

/**
 * Returns optimal autosave debounce time based on hardware tier.
 * On slow mechanical HDDs (5400 RPM), extends debounce to 2500ms to eliminate head seek thrashing.
 */
export function getVisitDraftDebounceMs(): number {
	return isLowSpecDevice() ? 2500 : 1200;
}

/**
 * Saves a visit draft with instant memory update (0ms latency) and debounced disk flush.
 * Guaranteed zero UI freeze even under 100% disk queue.
 */
export function saveVisitDraftDebouncedOffline(
	draft: VisitDraftPayload,
	debounceMs?: number,
): OfflineDraftRecord<VisitDraftPayload> {
	const key = makeDraftKey(draft.patientId, draft.visitId);
	memoryDraftCache.set(key, draft);

	const timeout = debounceMs ?? getVisitDraftDebounceMs();
	const entityId = draft.visitId ?? draft.patientId;
	const orgId = draft.organizationId ?? "default_org";

	return saveOfflineDraftDebounced<VisitDraftPayload>(
		key,
		"DIARY_043_DRAFT",
		entityId,
		draft,
		orgId,
		timeout,
	);
}

/**
 * Explicitly saves a visit draft immediately to offline storage without debounce.
 */
export async function saveVisitDraftOffline(
	draft: VisitDraftPayload,
): Promise<OfflineDraftRecord<VisitDraftPayload>> {
	const key = makeDraftKey(draft.patientId, draft.visitId);
	memoryDraftCache.set(key, draft);

	const entityId = draft.visitId ?? draft.patientId;
	const orgId = draft.organizationId ?? "default_org";

	return saveOfflineDraft<VisitDraftPayload>(
		key,
		"DIARY_043_DRAFT",
		entityId,
		draft,
		orgId,
	);
}

/**
 * Retrieves a visit draft, checking memory L1 first (0ms), then IndexedDB.
 */
export async function getVisitDraftOffline(
	patientId: string,
	visitId?: string,
): Promise<VisitDraftPayload | null> {
	const key = makeDraftKey(patientId, visitId);

	if (memoryDraftCache.has(key)) {
		return memoryDraftCache.get(key) ?? null;
	}

	try {
		const record = await getOfflineDraft<VisitDraftPayload>(key);
		if (record?.data) {
			memoryDraftCache.set(key, record.data);
			return record.data;
		}
	} catch (err) {
		logger.warn(`[offlineVisitDrafting] Error reading draft for ${key}:`, err);
	}

	return null;
}

/**
 * Lists all active offline visit drafts, optionally filtered by patientId.
 */
export async function listVisitDraftsOffline(
	patientId?: string,
): Promise<Array<{ key: string; draft: VisitDraftPayload; updatedAt: string }>> {
	try {
		const records = await getOfflineDraftsByType<VisitDraftPayload>("DIARY_043_DRAFT");
		const results: Array<{ key: string; draft: VisitDraftPayload; updatedAt: string }> = [];

		for (const rec of records) {
			if (!patientId || rec.entityId === patientId || rec.data?.patientId === patientId) {
				results.push({
					key: rec.id,
					draft: rec.data,
					updatedAt: rec.updatedAt,
				});
			}
		}

		return results;
	} catch (err) {
		logger.warn("[offlineVisitDrafting] Error listing drafts:", err);
		return [];
	}
}

/**
 * Removes a visit draft from both memory cache and persistent offline storage upon final submission.
 */
export async function removeVisitDraftOffline(patientId: string, visitId?: string): Promise<void> {
	const key = makeDraftKey(patientId, visitId);
	memoryDraftCache.delete(key);

	try {
		await deleteOfflineDraft(key);
	} catch (err) {
		logger.warn(`[offlineVisitDrafting] Error deleting draft for ${key}:`, err);
	}
}

/**
 * Clears in-memory draft cache (useful during testing or logout).
 */
export function clearVisitDraftMemoryCache(): void {
	memoryDraftCache.clear();
}
