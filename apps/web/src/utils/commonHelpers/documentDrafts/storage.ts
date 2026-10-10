import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { normalizedLocalOrganizationId } from "../../AuthOnboardingHelpers";
import {
	emptyMedicalRecordExtractDocumentDraftFields,
	normalizeMedicalRecordExtractDocumentDraftFields,
} from "./formatting";
import {
	documentPayloadDraftLocalKey,
	type DocumentPayloadDraftStore,
	type DocumentPaymentSelectionStore,
	loadDocumentPayloadDraftStore,
	type MedicalRecordExtractDocumentDraftFields,
} from "../../DocumentHelpers";
import { logger } from "../../logger";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function emptyDocumentPaymentSelectionStore(): DocumentPaymentSelectionStore {
	return { version: 1, selections: {} };
}

export function emptyDocumentPayloadDraftStore(): DocumentPayloadDraftStore {
	return { version: 1, drafts: {} };
}

export function loadMedicalRecordExtractDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
): MedicalRecordExtractDocumentDraftFields | null {
	if (!key || typeof window === "undefined") return null;
	const draft = loadDocumentPayloadDraftStore(organizationId).drafts[key];
	return draft?.kind === "medical_record_extract"
		? (draft.fields as MedicalRecordExtractDocumentDraftFields)
		: null;
}

export function saveMedicalRecordExtractDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
	patientId: string | null,
	visitId: string | null,
	fields: MedicalRecordExtractDocumentDraftFields,
): void {
	if (!key || !patientId || typeof window === "undefined") return;
	try {
		const store = loadDocumentPayloadDraftStore(organizationId);
		store.drafts[key] = {
			kind: "medical_record_extract",
			patientId,
			visitId,
			fields:
				normalizeMedicalRecordExtractDocumentDraftFields(fields) ??
				emptyMedicalRecordExtractDocumentDraftFields(),
			savedAt: new Date().toISOString(),
		};
		const trimmedDrafts = Object.fromEntries(
			Object.entries(store.drafts)
				.sort((left, right) => {
					const leftSavedAt =
						isRecord(left[1]) && typeof left[1].savedAt === "string"
							? left[1].savedAt
							: "";
					const rightSavedAt =
						isRecord(right[1]) && typeof right[1].savedAt === "string"
							? right[1].savedAt
							: "";
					return rightSavedAt.localeCompare(leftSavedAt);
				})
				.slice(0, 60),
		);
		safeLocalStorageSetItem(
			documentPayloadDraftLocalKey(organizationId),
			JSON.stringify({
				version: 1,
				drafts: trimmedDrafts,
			} satisfies DocumentPayloadDraftStore),
		);
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save medical record extract document draft", error);
		// Payload drafts are recovery data only; document issue still validates all facts server-side.
	}
}

export function localQueueOrganizationMatches(
	itemOrganizationId: string | null | undefined,
	activeOrganizationId: string | null | undefined,
): boolean {
	return (
		normalizedLocalOrganizationId(itemOrganizationId) ===
		normalizedLocalOrganizationId(activeOrganizationId)
	);
}

export const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;
