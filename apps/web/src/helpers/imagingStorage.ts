/**
 * @file apps/web/src/helpers/imagingStorage.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type DicomSeriesPreviewGroup,
	type DicomViewerWorkbenchManifestResponse,
} from "@dental/shared";
import {
	showToast,
} from "../components/GlobalToast";
import {
	actionFailureToast,
} from "../lib/panelStateText";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	localImagingFolderFingerprint,
} from "../utils/browserScanUtils";
import {
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	logger,
} from "../utils/logger";
import {
	normalizeMprWorkbenchState,
} from "./imagingHelpers";
import {
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
	openSpeechChunkDb,
	speechChunkIndexedDbAvailable,
} from "./offlineStorageEngine";
import {
	normalizedLocalOrganizationId,
	offlineDraftOrganizationKey,
	sensitiveLocalDraftRetentionMs,
} from "./storageHelpers";
import {
	type DicomWorkbenchIndexedDbDraft,
	type DicomWorkbenchLocalDraft,
	type MprWorkbenchIndexedDbDraft,
	type MprWorkbenchLocalDraft,
	type MprWorkbenchState,
} from "./types";

export const dicomWorkbenchLocalStorageKey = "dental-crm:dicom-workbench:last";

export const mprWorkbenchLocalStoragePrefix = "dental-crm:ct-mpr-workbench:";

export function dicomWorkbenchSeriesKey(
	manifest: DicomViewerWorkbenchManifestResponse,
): string {
	return (
		manifest.toolStateBundle.seriesRef.seriesInstanceUid ??
		manifest.launchManifest.seriesInstanceUid ??
		manifest.toolStateBundle.seriesRef.firstFilePath ??
		manifest.toolStateBundle.seriesRef.sourceName
	);
}

export function dicomWorkbenchIndexedDbKey(
	organizationId: string | null | undefined = null,
): string {
	return `dicom-workbench:${offlineDraftOrganizationKey(organizationId)}`;
}

export function mprWorkbenchIndexedDbKey(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): string {
	return `mpr-workbench:${offlineDraftOrganizationKey(organizationId)}:${seriesKey}`;
}

export function normalizeLocalDicomWorkbenchDraft(
	value: unknown,
): DicomWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<DicomWorkbenchLocalDraft>;
	if (parsed?.manifest?.version !== "dental-crm-dicom-workbench-v1")
		return null;
	if (
		typeof parsed.seriesKey !== "string" ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	return {
		manifest: parsed.manifest,
		seriesKey: parsed.seriesKey,
		clientSavedAt: parsed.clientSavedAt,
	};
}

export function newerDicomWorkbenchDraft(
	left: DicomWorkbenchLocalDraft | null,
	right: DicomWorkbenchLocalDraft | null,
): DicomWorkbenchLocalDraft | null {
	if (!left) return right;
	if (!right) return left;
	return Date.parse(right.clientSavedAt) > Date.parse(left.clientSavedAt)
		? right
		: left;
}

export function loadLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): DicomWorkbenchLocalDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			dicomWorkbenchLocalStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(dicomWorkbenchLocalStorageKey)
				: null);
		if (!raw) return null;
		const parsed = normalizeLocalDicomWorkbenchDraft(JSON.parse(raw));
		if (!parsed) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(dicomWorkbenchLocalStorageKey);
			return null;
		}
		return parsed;
	} catch (error) {
		logger.warn(
			"Failed to load local DICOM workbench draft from local storage:",
			error,
		);
		return null;
	}
}

export function mprWorkbenchSeriesKey(
	series: DicomSeriesPreviewGroup | null,
): string | null {
	if (!series) return null;
	const identity = [
		series.seriesInstanceUid,
		series.studyInstanceUid,
		series.id,
		series.sourceName,
		series.seriesDescription,
		series.studyDescription,
		series.capturedAt,
	]
		.filter((value): value is string => Boolean(value?.trim()))
		.join("|");
	if (!identity) return null;
	return localImagingFolderFingerprint(
		`${series.sourceKind}:${identity}:${series.fileCount}`,
	);
}

export function mprWorkbenchLocalKey(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): string {
	const normalizedOrganizationId = organizationId?.trim();
	return `${mprWorkbenchLocalStoragePrefix}${normalizedOrganizationId ? `${normalizedOrganizationId}:` : ""}${seriesKey}`;
}

export function loadLocalMprWorkbenchDraftFromLocalStorage(
	seriesKey: string | null,
	organizationId: string | null | undefined = null,
): MprWorkbenchLocalDraft | null {
	if (!seriesKey || typeof window === "undefined") return null;
	try {
		const localKey = mprWorkbenchLocalKey(seriesKey, organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(mprWorkbenchLocalKey(seriesKey))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as MprWorkbenchLocalDraft;
		if (
			parsed?.version !== 1 ||
			parsed.seriesKey !== seriesKey ||
			!parsed.clientSavedAt
		)
			return null;
		if (
			!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs)
		) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
			return null;
		}
		const state = normalizeMprWorkbenchState(parsed.state);
		return state ? { ...parsed, state } : null;
	} catch (error) {
		logger.warn(error);
		return null;
	}
}

export function saveLocalMprWorkbenchDraftToLocalStorage(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			mprWorkbenchLocalKey(seriesKey, organizationId),
			JSON.stringify({
				version: 1,
				seriesKey,
				state,
				clientSavedAt,
			} satisfies MprWorkbenchLocalDraft),
		);
		return true;
	} catch {
		return false;
	}
}

export function saveLocalDicomWorkbenchDraftToLocalStorage(
	draft: DicomWorkbenchLocalDraft,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				dicomWorkbenchLocalStorageKey,
				organizationId,
			),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		return false;
	}
}

export function createLocalDicomWorkbenchDraft(
	manifest: DicomViewerWorkbenchManifestResponse,
	clientSavedAt: string,
): DicomWorkbenchLocalDraft {
	return {
		manifest,
		clientSavedAt,
		seriesKey: dicomWorkbenchSeriesKey(manifest),
	};
}

export function removeLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				dicomWorkbenchLocalStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(dicomWorkbenchLocalStorageKey);
	} catch {
		// ignore unavailable storage
	}
}

export async function readLocalDicomWorkbenchDraftFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<DicomWorkbenchLocalDraft | null> {
	const db = await openSpeechChunkDb();
	const key = dicomWorkbenchIndexedDbKey(organizationId);
	const record = await new Promise<unknown>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readonly",
		);
		const request = transaction
			.objectStore(dicomWorkbenchDraftStoreName)
			.get(key);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () =>
			reject(
				request.error ?? new Error("Local DICOM workbench draft read failed"),
			);
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft transaction failed"),
			);
	});
	const normalized = normalizeLocalDicomWorkbenchDraft(record);
	if (!normalized && record && typeof record === "object") {
		await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(
			() => undefined,
		);
	}
	return normalized;
}

export async function saveLocalDicomWorkbenchDraftToIndexedDb(
	draft: DicomWorkbenchLocalDraft,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const record: DicomWorkbenchIndexedDbDraft = {
		...draft,
		storageKey: dicomWorkbenchIndexedDbKey(normalizedOrganizationId),
		organizationId: normalizedOrganizationId,
	};
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readwrite",
		);
		transaction.objectStore(dicomWorkbenchDraftStoreName).put(record);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft save failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft save aborted"),
			);
	});
}

export async function deleteLocalDicomWorkbenchDraftFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readwrite",
		);
		transaction
			.objectStore(dicomWorkbenchDraftStoreName)
			.delete(dicomWorkbenchIndexedDbKey(organizationId));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft delete failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft delete aborted"),
			);
	});
}

export async function migrateLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (!speechChunkIndexedDbAvailable()) return;
	const legacyDraft =
		loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	if (!legacyDraft) return;
	const existing = await readLocalDicomWorkbenchDraftFromIndexedDb(
		organizationId,
	).catch((err) => {
		logger.error("[Dente] read draft error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения черновика DICOM",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const draft = newerDicomWorkbenchDraft(existing, legacyDraft);
	if (!draft) return;
	await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
	removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export async function loadLocalDicomWorkbenchDraft(
	organizationId: string | null | undefined = null,
): Promise<DicomWorkbenchLocalDraft | null> {
	if (!speechChunkIndexedDbAvailable())
		return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	try {
		await migrateLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
		return await readLocalDicomWorkbenchDraftFromIndexedDb(organizationId);
	} catch {
		return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	}
}

export async function saveLocalDicomWorkbenchDraft(
	manifest: DicomViewerWorkbenchManifestResponse,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<boolean> {
	const draft = createLocalDicomWorkbenchDraft(manifest, clientSavedAt);
	if (speechChunkIndexedDbAvailable()) {
		try {
			await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
			removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
			return true;
		} catch {
			// Keep local CT workbench recovery available on restricted browsers.
		}
	}
	return saveLocalDicomWorkbenchDraftToLocalStorage(draft, organizationId);
}

export async function removeLocalDicomWorkbenchDraft(
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (speechChunkIndexedDbAvailable()) {
		await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(
			() => undefined,
		);
	}
	removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export function normalizeMprWorkbenchDraft(
	value: unknown,
	seriesKey: string,
): MprWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<MprWorkbenchLocalDraft>;
	if (
		parsed?.version !== 1 ||
		parsed.seriesKey !== seriesKey ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	const state = normalizeMprWorkbenchState(parsed.state);
	return state
		? { version: 1, seriesKey, state, clientSavedAt: parsed.clientSavedAt }
		: null;
}

export async function readLocalMprWorkbenchDraftFromIndexedDb(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<MprWorkbenchLocalDraft | null> {
	const db = await openSpeechChunkDb();
	const key = mprWorkbenchIndexedDbKey(seriesKey, organizationId);
	const record = await new Promise<unknown>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readonly");
		const request = transaction
			.objectStore(mprWorkbenchDraftStoreName)
			.get(key);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () =>
			reject(
				request.error ?? new Error("Local MPR workbench draft read failed"),
			);
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft transaction failed"),
			);
	});
	const normalized = normalizeMprWorkbenchDraft(record, seriesKey);
	if (!normalized && record && typeof record === "object") {
		await deleteLocalMprWorkbenchDraftFromIndexedDb(
			seriesKey,
			organizationId,
		).catch((err) => {
			logger.error("[Dente] delete draft error:", err);
			showToast(
				actionFailureToast(
					"Не удалось удалить черновик MPR",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			return undefined;
		});
	}
	return normalized;
}

export async function saveLocalMprWorkbenchDraftToIndexedDb(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const record: MprWorkbenchIndexedDbDraft = {
		version: 1,
		seriesKey,
		state,
		clientSavedAt,
		storageKey: mprWorkbenchIndexedDbKey(seriesKey, normalizedOrganizationId),
		organizationId: normalizedOrganizationId,
	};
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
		transaction.objectStore(mprWorkbenchDraftStoreName).put(record);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Local MPR workbench draft save failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft save aborted"),
			);
	});
}

export async function deleteLocalMprWorkbenchDraftFromIndexedDb(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
		transaction
			.objectStore(mprWorkbenchDraftStoreName)
			.delete(mprWorkbenchIndexedDbKey(seriesKey, organizationId));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft delete failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft delete aborted"),
			);
	});
}

export async function migrateLocalMprWorkbenchDraftFromLocalStorage(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (!speechChunkIndexedDbAvailable()) return;
	const legacyDraft = loadLocalMprWorkbenchDraftFromLocalStorage(
		seriesKey,
		organizationId,
	);
	if (!legacyDraft) return;
	const existing = await readLocalMprWorkbenchDraftFromIndexedDb(
		seriesKey,
		organizationId,
	).catch((err) => {
		logger.error("[Dente] read draft error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения черновика MPR",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const draft =
		existing &&
		Date.parse(existing.clientSavedAt) >= Date.parse(legacyDraft.clientSavedAt)
			? existing
			: legacyDraft;
	await saveLocalMprWorkbenchDraftToIndexedDb(
		seriesKey,
		draft.state,
		draft.clientSavedAt,
		organizationId,
	);
	if (typeof window !== "undefined") {
		safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey, organizationId));
		if (organizationId)
			safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
	}
}

export async function loadLocalMprWorkbenchDraft(
	seriesKey: string | null,
	organizationId: string | null | undefined = null,
): Promise<MprWorkbenchLocalDraft | null> {
	if (!seriesKey) return null;
	if (!speechChunkIndexedDbAvailable())
		return loadLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
	try {
		await migrateLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
		return await readLocalMprWorkbenchDraftFromIndexedDb(
			seriesKey,
			organizationId,
		);
	} catch {
		return loadLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
	}
}

export async function saveLocalMprWorkbenchDraft(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<boolean> {
	if (speechChunkIndexedDbAvailable()) {
		try {
			await saveLocalMprWorkbenchDraftToIndexedDb(
				seriesKey,
				state,
				clientSavedAt,
				organizationId,
			);
			if (typeof window !== "undefined") {
				safeLocalStorageRemoveItem(
					mprWorkbenchLocalKey(seriesKey, organizationId),
				);
				if (organizationId)
					safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
			}
			return true;
		} catch {
			// Keep MPR recovery available on restricted browsers.
		}
	}
	return saveLocalMprWorkbenchDraftToLocalStorage(
		seriesKey,
		state,
		clientSavedAt,
		organizationId,
	);
}
