import type {
	MprWorkbenchIndexedDbDraft,
	MprWorkbenchLocalDraft,
	MprWorkbenchState,
} from "./types.js";
import type { MprProjection, MprWindowPreset } from "../imagingUiLabels";
import type {
	DicomSeriesPreviewGroup,
	TaxDeductionApplicationForm,
} from "@dental/shared";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
} from "../mprControlMath";
import { localImagingFolderFingerprint } from "../utils/browserScanUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";
import { showToast } from "../components/GlobalToast";
import { actionFailureToast } from "../lib/panelStateText";
import {
	offlineDraftOrganizationKey,
	normalizedLocalOrganizationId,
	sensitiveLocalDraftRetentionMs,
	isOptionValue,
} from "./uiFormatters.js";
import {
	openSpeechChunkDb,
	speechChunkIndexedDbAvailable,
	mprWorkbenchDraftStoreName,
} from "./speechHelpers.js";
import { taxApplicationFormOptions } from "./documentHelpers.js";

export const mprWorkbenchLocalStoragePrefix = "dental-crm:ct-mpr-workbench:";

export function mprWorkbenchIndexedDbKey(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): string {
	return `mpr-workbench:${offlineDraftOrganizationKey(organizationId)}:${seriesKey}`;
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

export function isMprProjection(value: unknown): value is MprProjection {
	return (
		value === "axial" ||
		value === "coronal" ||
		value === "sagittal" ||
		value === "oblique" ||
		value === "panoramic_reconstruction" ||
		value === "three_d_volume" ||
		value === "mip" ||
		value === "panoramic" ||
		value === "3d_reconstruction"
	);
}

export function isMprWindowPreset(value: unknown): value is MprWindowPreset {
	return (
		value === "bone" ||
		value === "soft_tissue" ||
		value === "implant" ||
		value === "custom" ||
		value === "teeth"
	);
}

export function resolveMprWorkbenchProjection(
	value: unknown,
	availableProjections: MprProjection[],
): MprProjection {
	const projection = isMprProjection(value) ? value : null;
	if (projection && availableProjections.includes(projection))
		return projection;
	if (availableProjections.includes("axial")) return "axial";
	return availableProjections[0] ?? "axial";
}

export function normalizeMprWorkbenchState(
	value: unknown,
): MprWorkbenchState | null {
	if (!value || typeof value !== "object") return null;
	const source = value as Partial<MprWorkbenchState>;
	if (
		!isMprProjection(source.projection) ||
		!isMprWindowPreset(source.windowPreset)
	)
		return null;
	const axisDeg = Number(source.axisDeg);
	const slabMm = Number(source.slabMm);
	const sliceIndex = Number(source.sliceIndex ?? 0);
	if (
		!Number.isFinite(axisDeg) ||
		!Number.isFinite(slabMm) ||
		!Number.isFinite(sliceIndex)
	)
		return null;
	return {
		projection: source.projection,
		axisDeg: clampMprAxisDeg(axisDeg),
		slabMm: clampMprSlabMm(slabMm),
		sliceIndex: clampMprSliceIndex(sliceIndex, 100000),
		windowPreset: source.windowPreset,
		crosshair: source.crosshair !== false,
		linkedPlanes: source.linkedPlanes !== false,
	};
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
