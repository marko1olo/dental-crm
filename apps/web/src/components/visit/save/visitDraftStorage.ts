import type { VisitNoteForm } from "../../../AppHelpers";
import {
	loadVisitDraftSync,
	saveVisitDraft,
} from "../../../services/offline/offlineStorage";

/**
 * Изолированный ключ локального хранилища для черновика визита.
 * Исключает коллизии между параллельными визитами на соседних креслах (Мандаты 8e, 8n).
 */
export function getIsolatedVisitDraftKey(visitId: string): string {
	const sanitized = (visitId || "anonymous").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	return `dente_visit_draft_${sanitized}`;
}

export function loadIsolatedVisitDraft<T = VisitNoteForm>(visitId: string): T | null {
	if (!visitId || visitId === "no-active-visit") return null;
	try {
		const syncDraft = loadVisitDraftSync<T>(visitId);
		if (syncDraft?.data && typeof syncDraft.data === "object") {
			return syncDraft.data as T;
		}
		if (typeof localStorage !== "undefined") {
			const raw = localStorage.getItem(getIsolatedVisitDraftKey(visitId));
			if (raw) {
				const parsed = JSON.parse(raw);
				return (parsed?.data ?? parsed) as T;
			}
		}
	} catch {
		// Non-blocking parse error fallback
	}
	return null;
}

export function saveIsolatedVisitDraft<T = VisitNoteForm>(
	visitId: string,
	data: T,
	organizationId?: string,
): void {
	if (!visitId || visitId === "no-active-visit") return;
	try {
		void saveVisitDraft(visitId, data, organizationId, { immediate: true });
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(
				getIsolatedVisitDraftKey(visitId),
				JSON.stringify({
					visitId,
					data,
					savedAt: new Date().toISOString(),
				}),
			);
		}
	} catch {
		// Ignore storage quota errors
	}
}

export function verifyZeroDraftCollision(visitIdA: string, visitIdB: string): boolean {
	const keyA = getIsolatedVisitDraftKey(visitIdA);
	const keyB = getIsolatedVisitDraftKey(visitIdB);
	return keyA !== keyB;
}
