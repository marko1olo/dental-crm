import type { DicomViewerWorkbenchManifestResponse } from "@dental/shared";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";
import {
	type DicomWorkbenchLocalDraft,
	dicomWorkbenchSeriesKey,
	type MprWorkbenchLocalDraft,
	type MprWorkbenchState,
	mprWorkbenchLocalKey,
} from "../../ImagingHelpers";
import { logger } from "../../logger";
import { speechChunkIndexedDbAvailable } from "../../SpeechHelpers";
import {
	deleteLocalDicomWorkbenchDraftFromIndexedDb,
	loadLocalDicomWorkbenchDraftFromLocalStorage,
	loadLocalMprWorkbenchDraftFromLocalStorage,
	readLocalDicomWorkbenchDraftFromIndexedDb,
	readLocalMprWorkbenchDraftFromIndexedDb,
	removeLocalDicomWorkbenchDraftFromLocalStorage,
	saveLocalDicomWorkbenchDraftToIndexedDb,
	saveLocalDicomWorkbenchDraftToLocalStorage,
	saveLocalMprWorkbenchDraftToIndexedDb,
	saveLocalMprWorkbenchDraftToLocalStorage,
} from "./draftStorageManager";

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
