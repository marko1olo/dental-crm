import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { normalizedLocalOrganizationId } from "../../AuthOnboardingHelpers";
import { localImagingFolderFingerprint } from "../../browserScanUtils";
import { sensitiveLocalDraftRetentionMs } from "../../commonHelpers/documentDraftHelpers";
import {
	type DicomWorkbenchIndexedDbDraft,
	type DicomWorkbenchLocalDraft,
	dicomWorkbenchDraftStoreName,
	dicomWorkbenchIndexedDbKey,
	dicomWorkbenchLocalStorageKey,
	type ImagingViewerLocalDraft,
	imagingViewerLocalKey,
	type LocalImagingFolderDraft,
	localImagingFolderStorageKey,
	type MprWorkbenchIndexedDbDraft,
	type MprWorkbenchLocalDraft,
	type MprWorkbenchState,
	mprWorkbenchDraftStoreName,
	mprWorkbenchIndexedDbKey,
	mprWorkbenchLocalKey,
} from "../../ImagingHelpers";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../../localStorageHelpers";
import { logger } from "../../logger";
import { openSpeechChunkDb } from "../../SpeechHelpers";
import {
	normalizeLocalDicomWorkbenchDraft,
	normalizeMprWorkbenchDraft,
	normalizeMprWorkbenchState,
} from "./draftAnnotationTransformer";

export function loadLocalImagingViewerDraft(
	studyId: string | null,
	organizationId: string | null | undefined = null,
): ImagingViewerLocalDraft | null {
	if (!studyId || typeof window === "undefined") return null;
	try {
		const localKey = imagingViewerLocalKey(studyId, organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(imagingViewerLocalKey(studyId))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as ImagingViewerLocalDraft;
		if (
			!localSavedAtFresh(parsed?.clientSavedAt, sensitiveLocalDraftRetentionMs)
		) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(imagingViewerLocalKey(studyId));
			return null;
		}
		return parsed?.state && Array.isArray(parsed.annotations) ? parsed : null;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn("Failed to load local imaging viewer draft", error);
		return null;
	}
}

export function saveLocalImagingViewerDraft(
	studyId: string,
	draft: ImagingViewerLocalDraft,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			imagingViewerLocalKey(studyId, organizationId),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		return false;
	}
}

export function loadLocalImagingFolderDraft(
	organizationId: string | null | undefined = null,
): LocalImagingFolderDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			localImagingFolderStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(localImagingFolderStorageKey)
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as LocalImagingFolderDraft;
		if (parsed?.version !== 1 || !parsed.folderPath?.trim() || !parsed.savedAt)
			return null;
		if (!localSavedAtFresh(parsed.savedAt, localConvenienceRetentionMs)) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(localImagingFolderStorageKey);
			return null;
		}
		return {
			...parsed,
			safeDisplayName:
				parsed.safeDisplayName ||
				`Локальная папка снимков #${localImagingFolderFingerprint(parsed.folderPath)}`,
			sourceLabel: parsed.sourceLabel || "Это устройство",
			sourceKind: parsed.sourceKind || "manual",
			folderFingerprint:
				parsed.folderFingerprint ||
				localImagingFolderFingerprint(parsed.folderPath),
			origin: parsed.origin || "manual",
		};
	} catch {
		return null;
	}
}

export function saveLocalImagingFolderDraft(
	draft: LocalImagingFolderDraft,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				localImagingFolderStorageKey,
				organizationId,
			),
			JSON.stringify(draft),
		);
	} catch {
		// Local folder recovery is best-effort and never sent to the server.
	}
}

export function removeLocalImagingFolderDraft(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				localImagingFolderStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(localImagingFolderStorageKey);
	} catch {
		// ignore unavailable storage
	}
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
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn(
			"Failed to load local DICOM workbench draft from local storage:",
			error,
		);
		return null;
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
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
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
