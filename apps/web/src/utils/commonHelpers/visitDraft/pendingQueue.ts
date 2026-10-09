import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
} from "../../../lib/safeLocalStorage";
import { normalizedLocalOrganizationId } from "../../AuthOnboardingHelpers";
import { isDentalSpecialty } from "../../clinicProfileUtils";
import {
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../../localStorageHelpers";
import { logger } from "../../logger";
import {
	openSpeechChunkDb,
	savePendingVisitSavesToLocalStorage,
	speechChunkIndexedDbAvailable,
} from "../../SpeechHelpers";
import { sensitiveLocalDraftRetentionMs } from "../documentDraftHelpers";
import {
	pendingVisitSaveQueueKey,
	pendingVisitSaveStoreName,
} from "./constants";
import {
	createLocalQueueId,
	localQueueOrganizationMatches,
} from "./normalizers";
import { isNullableString, isVisitNoteDraft } from "./typeGuards";
import type { PendingVisitSave } from "./types";

export function pendingVisitSaveQueueLocalKey(
	organizationId: string | null | undefined = null,
): string {
	return organizationScopedLocalStorageKey(
		pendingVisitSaveQueueKey,
		organizationId,
	);
}

export function parsePendingVisitSaveQueue(
	raw: string | null,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingVisitSave[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item): PendingVisitSave[] => {
			const normalized = normalizePendingVisitSave(
				item,
				activeOrganizationId,
				legacyOrganizationFallback,
			);
			return normalized ? [normalized] : [];
		});
	} catch {
		return [];
	}
}

export function normalizePendingVisitSave(
	value: unknown,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingVisitSave | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<PendingVisitSave>;
	const {
		id,
		visitId,
		queuedAt,
		draft,
		doctorSummary,
		transcript,
		selectedSpecialty,
	} = candidate;
	const organizationId =
		normalizedLocalOrganizationId(candidate.organizationId) ??
		normalizedLocalOrganizationId(legacyOrganizationFallback);
	if (
		candidate.version !== 1 ||
		typeof id !== "string" ||
		!localQueueOrganizationMatches(organizationId, activeOrganizationId) ||
		typeof visitId !== "string" ||
		typeof queuedAt !== "string" ||
		!localSavedAtFresh(queuedAt, sensitiveLocalDraftRetentionMs) ||
		!isVisitNoteDraft(draft) ||
		!isNullableString(doctorSummary) ||
		typeof transcript !== "string" ||
		!isDentalSpecialty(selectedSpecialty)
	) {
		return null;
	}
	const normalizedBaseRevision =
		typeof candidate.baseRevision === "number" &&
		Number.isInteger(candidate.baseRevision)
			? candidate.baseRevision
			: null;
	return {
		version: 1,
		id,
		organizationId,
		visitId,
		clientMutationId:
			typeof candidate.clientMutationId === "string"
				? candidate.clientMutationId
				: id,
		baseRevision: normalizedBaseRevision,
		queuedAt,
		draft,
		doctorSummary,
		transcript,
		selectedSpecialty,
	};
}

export function sortPendingVisitSaves(
	queue: PendingVisitSave[],
): PendingVisitSave[] {
	return queue
		.slice()
		.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export function loadPendingVisitSavesFromLocalStorage(
	organizationId: string | null | undefined = null,
): PendingVisitSave[] {
	if (typeof window === "undefined") return [];
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const localKey = pendingVisitSaveQueueLocalKey(normalizedOrganizationId);
	const scopedRaw = safeLocalStorageGetItem(localKey);
	const legacyRaw = normalizedOrganizationId
		? safeLocalStorageGetItem(pendingVisitSaveQueueKey)
		: null;
	const byId = new Map<string, PendingVisitSave>();
	for (const item of parsePendingVisitSaveQueue(
		scopedRaw,
		normalizedOrganizationId,
	)) {
		byId.set(item.id, item);
	}
	for (const item of parsePendingVisitSaveQueue(
		legacyRaw,
		normalizedOrganizationId,
		normalizedOrganizationId,
	)) {
		byId.set(item.id, item);
	}
	const queue = sortPendingVisitSaves(Array.from(byId.values()));
	if (normalizedOrganizationId && legacyRaw) {
		savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
		safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
	}
	return queue;
}

export function pendingVisitSaveIndexedDbAvailable(): boolean {
	return speechChunkIndexedDbAvailable();
}

export async function readPendingVisitSavesFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave[]> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const values = await new Promise<unknown[]>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readonly");
		const request = transaction.objectStore(pendingVisitSaveStoreName).getAll();
		request.onsuccess = () =>
			resolve(Array.isArray(request.result) ? request.result : []);
		request.onerror = () =>
			reject(request.error ?? new Error("Local visit queue read failed"));
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Local visit queue transaction failed"),
			);
	});
	const queue: PendingVisitSave[] = [];
	const staleIds: string[] = [];
	for (const value of values) {
		const candidate =
			value && typeof value === "object"
				? (value as Partial<PendingVisitSave>)
				: {};
		const normalized = normalizePendingVisitSave(
			value,
			normalizedOrganizationId,
			normalizedOrganizationId,
		);
		if (normalized) {
			queue.push(normalized);
		} else if (typeof candidate.id === "string") {
			const itemOrganizationId =
				normalizedLocalOrganizationId(candidate.organizationId) ??
				normalizedOrganizationId;
			const stale =
				typeof candidate.queuedAt === "string" &&
				!localSavedAtFresh(candidate.queuedAt, sensitiveLocalDraftRetentionMs);
			const malformedActiveRecord = localQueueOrganizationMatches(
				itemOrganizationId,
				normalizedOrganizationId,
			);
			if (stale || malformedActiveRecord) {
				staleIds.push(candidate.id);
			}
		}
	}
	if (staleIds.length) {
		await Promise.allSettled(
			staleIds.map((id) => deletePendingVisitSaveFromIndexedDb(id)),
		);
	}
	return sortPendingVisitSaves(queue);
}

export async function savePendingVisitSavesToIndexedDb(
	queue: PendingVisitSave[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const scopedQueue = sortPendingVisitSaves(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, sensitiveLocalDraftRetentionMs),
			),
	);
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
		const store = transaction.objectStore(pendingVisitSaveStoreName);
		const request = store.getAll();
		request.onsuccess = () => {
			const existing = Array.isArray(request.result) ? request.result : [];
			for (const value of existing) {
				const candidate =
					value && typeof value === "object"
						? (value as Partial<PendingVisitSave>)
						: {};
				const itemOrganizationId =
					normalizedLocalOrganizationId(candidate.organizationId) ??
					normalizedOrganizationId;
				const stale =
					typeof candidate.queuedAt === "string" &&
					!localSavedAtFresh(
						candidate.queuedAt,
						sensitiveLocalDraftRetentionMs,
					);
				if (
					typeof candidate.id === "string" &&
					(localQueueOrganizationMatches(
						itemOrganizationId,
						normalizedOrganizationId,
					) ||
						stale)
				) {
					store.delete(candidate.id);
				}
			}
			for (const item of scopedQueue) {
				store.put(item);
			}
		};
		request.onerror = () =>
			reject(request.error ?? new Error("Local visit queue read failed"));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Local visit queue save failed"));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error("Local visit queue save aborted"));
	});
}

export async function deletePendingVisitSaveFromIndexedDb(
	id: string,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
		transaction.objectStore(pendingVisitSaveStoreName).delete(id);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Local visit queue delete failed"));
		transaction.onabort = () =>
			reject(
				transaction.error ?? new Error("Local visit queue delete aborted"),
			);
	});
}

export async function migratePendingVisitSavesFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const legacyQueue = loadPendingVisitSavesFromLocalStorage(
		normalizedOrganizationId,
	);
	if (!legacyQueue.length || !pendingVisitSaveIndexedDbAvailable()) return;
	const existing = await readPendingVisitSavesFromIndexedDb(
		normalizedOrganizationId,
	).catch((err) => {
		logger.error("[Dente] read visit saves error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения очереди приёмов",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return [];
	});
	const byId = new Map<string, PendingVisitSave>();
	for (const item of [...existing, ...legacyQueue]) {
		byId.set(item.id, item);
	}
	await savePendingVisitSavesToIndexedDb(
		sortPendingVisitSaves(Array.from(byId.values())),
		normalizedOrganizationId,
	);
	safeLocalStorageRemoveItem(
		pendingVisitSaveQueueLocalKey(normalizedOrganizationId),
	);
	if (normalizedOrganizationId)
		safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
}

export async function loadPendingVisitSaves(
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave[]> {
	if (!pendingVisitSaveIndexedDbAvailable())
		return loadPendingVisitSavesFromLocalStorage(organizationId);
	try {
		await migratePendingVisitSavesFromLocalStorage(organizationId);
		return await readPendingVisitSavesFromIndexedDb(organizationId);
	} catch {
		return loadPendingVisitSavesFromLocalStorage(organizationId);
	}
}

export async function savePendingVisitSaves(
	queue: PendingVisitSave[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	if (pendingVisitSaveIndexedDbAvailable()) {
		try {
			await savePendingVisitSavesToIndexedDb(queue, normalizedOrganizationId);
			safeLocalStorageRemoveItem(
				pendingVisitSaveQueueLocalKey(normalizedOrganizationId),
			);
			if (normalizedOrganizationId)
				safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
			return;
		} catch {
			// Keep accepted visits retryable on restricted browsers.
		}
	}
	savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
}

export async function queuePendingVisitSave(
	save: Omit<
		PendingVisitSave,
		"version" | "id" | "queuedAt" | "organizationId"
	>,
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const queued: PendingVisitSave = {
		...save,
		version: 1,
		id: createLocalQueueId(),
		organizationId: normalizedOrganizationId,
		queuedAt: new Date().toISOString(),
	};
	const existing = await loadPendingVisitSaves(normalizedOrganizationId);
	const withoutSameVisit = existing.filter(
		(item) => item.visitId !== queued.visitId,
	);
	await savePendingVisitSaves(
		[...withoutSameVisit, queued],
		normalizedOrganizationId,
	);
	return queued;
}

export function latestPendingVisitSaveAt(
	queue: PendingVisitSave[],
): string | null {
	const latest = queue[queue.length - 1];
	return latest?.queuedAt ?? null;
}
