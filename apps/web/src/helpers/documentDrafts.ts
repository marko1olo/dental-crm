/**
 * @file apps/web/src/helpers/documentDrafts.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type DocumentIssueSignatureMode,
} from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	todayDateInputValue,
} from "../utils/dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	logger,
} from "../utils/logger";
import {
	localDraftString,
	sensitiveLocalDraftRetentionMs,
} from "./storageHelpers";
import {
	type DocumentIssueSignatureDraft,
	type DocumentPayloadDraftEntry,
	type DocumentPayloadDraftStore,
	type MedicalRecordExtractDocumentDraftFields,
} from "./types";

export const documentPayloadDraftStorageKey =
	"dental-crm:document-payload-drafts:v1";

export const documentIssueSignatureStorageKey =
	"dental-crm:document-issue-signature:v1";

export const documentIssueSignatureModeLabels: Record<
	DocumentIssueSignatureMode,
	string
> = {
	paper_signed: "Бумажный экземпляр подписан",
	simple_electronic_signature: "Простая электронная подпись",
	enhanced_non_qualified_electronic_signature: "УНЭП",
	qualified_electronic_signature: "УКЭП",
};

export function normalizedDocumentIssueSignatureMode(
	value: unknown,
): DocumentIssueSignatureMode {
	return value === "simple_electronic_signature" ||
		value === "qualified_electronic_signature" ||
		value === "paper_signed"
		? value
		: "paper_signed";
}

export function documentIssueSignatureLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		documentIssueSignatureStorageKey,
		organizationId,
	);
}

export function documentPayloadDraftLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		documentPayloadDraftStorageKey,
		organizationId,
	);
}

export function loadDocumentIssueSignatureDraft(
	organizationId: string | null | undefined = null,
): DocumentIssueSignatureDraft {
	const fallback: DocumentIssueSignatureDraft = {
		version: 1,
		mode: "paper_signed",
		staffFullName: "",
		staffRole: "Врач/администратор",
		savedAt: "",
	};
	if (typeof window === "undefined") return fallback;
	try {
		const localKey = documentIssueSignatureLocalKey(organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(documentIssueSignatureStorageKey)
				: null);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as Partial<DocumentIssueSignatureDraft>;
		if (parsed?.version !== 1) return fallback;
		const savedAt = typeof parsed.savedAt === "string" ? parsed.savedAt : "";
		if (!localSavedAtFresh(savedAt, localConvenienceRetentionMs)) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(documentIssueSignatureStorageKey);
			return fallback;
		}
		return {
			version: 1,
			mode: normalizedDocumentIssueSignatureMode(parsed.mode),
			staffFullName:
				typeof parsed.staffFullName === "string"
					? parsed.staffFullName.slice(0, 240)
					: "",
			staffRole:
				typeof parsed.staffRole === "string" && parsed.staffRole.trim()
					? parsed.staffRole.slice(0, 120)
					: "Врач/администратор",
			savedAt,
		};
	} catch (error) {
		logger.warn(error);
		return fallback;
	}
}

export function saveDocumentIssueSignatureDraft(
	organizationId: string | null | undefined,
	mode: DocumentIssueSignatureMode,
	staffFullName: string,
	staffRole: string,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageSetItem(
			documentIssueSignatureLocalKey(organizationId),
			JSON.stringify({
				version: 1,
				mode,
				staffFullName: staffFullName.trim().slice(0, 240),
				staffRole: staffRole.trim().slice(0, 120) || "Врач/администратор",
				savedAt: new Date().toISOString(),
			} satisfies DocumentIssueSignatureDraft),
		);
	} catch (error) {
		logger.warn(error);
		// Signature defaults are convenience only; the server still requires explicit attestation on issue.
	}
}

export function documentPayloadDraftKey(
	kind: "dental_outpatient_card_043u" | "medical_record_extract",
	organizationId: string | null | undefined,
	patientId: string | null,
	visitId: string | null,
): string | null {
	const normalizedOrganizationId = organizationId?.trim();
	if (!normalizedOrganizationId || !patientId) return null;
	return `${kind}:${normalizedOrganizationId}:${patientId}:${visitId ?? "all-visits"}`;
}

export function emptyDocumentPayloadDraftStore(): DocumentPayloadDraftStore {
	return { version: 1, drafts: {} };
}

export function emptyMedicalRecordExtractDocumentDraftFields(): MedicalRecordExtractDocumentDraftFields {
	const today = todayDateInputValue();
	return {
		recordExtractPeriodStart: today,
		recordExtractPeriodEnd: today,
		recordExtractSourceVisitIds: "",
		recordExtractComplaintAndAnamnesis: "",
		recordExtractObjectiveStatus: "",
		recordExtractDiagnosis: "",
		recordExtractTreatmentProvided: "",
		recordExtractRecommendations: "",
		recordExtractDoctorFullName: "",
		recordExtractRecipientFullName: "",
		recordExtractRecipientAuthority: "пациент лично",
		recordExtractIssuedAt: new Date().toLocaleString("ru-RU"),
		recordExtractPreparedFromSignedRecords: false,
		recordExtractThirdPartyDataChecked: false,
	};
}

export function normalizeMedicalRecordExtractDocumentDraftFields(
	value: unknown,
): MedicalRecordExtractDocumentDraftFields | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<
		Record<keyof MedicalRecordExtractDocumentDraftFields, unknown>
	>;
	return {
		recordExtractPeriodStart: localDraftString(
			candidate.recordExtractPeriodStart,
			40,
		),
		recordExtractPeriodEnd: localDraftString(
			candidate.recordExtractPeriodEnd,
			40,
		),
		recordExtractSourceVisitIds: localDraftString(
			candidate.recordExtractSourceVisitIds,
			2400,
		),
		recordExtractComplaintAndAnamnesis: localDraftString(
			candidate.recordExtractComplaintAndAnamnesis,
		),
		recordExtractObjectiveStatus: localDraftString(
			candidate.recordExtractObjectiveStatus,
		),
		recordExtractDiagnosis: localDraftString(candidate.recordExtractDiagnosis),
		recordExtractTreatmentProvided: localDraftString(
			candidate.recordExtractTreatmentProvided,
		),
		recordExtractRecommendations: localDraftString(
			candidate.recordExtractRecommendations,
		),
		recordExtractDoctorFullName: localDraftString(
			candidate.recordExtractDoctorFullName,
			240,
		),
		recordExtractRecipientFullName: localDraftString(
			candidate.recordExtractRecipientFullName,
			240,
		),
		recordExtractRecipientAuthority:
			localDraftString(candidate.recordExtractRecipientAuthority, 240) ||
			"пациент лично",
		recordExtractIssuedAt: localDraftString(
			candidate.recordExtractIssuedAt,
			80,
		),
		recordExtractPreparedFromSignedRecords:
			candidate.recordExtractPreparedFromSignedRecords === true,
		recordExtractThirdPartyDataChecked:
			candidate.recordExtractThirdPartyDataChecked === true,
	};
}

export function loadDocumentPayloadDraftStore(
	organizationId: string | null | undefined = null,
): DocumentPayloadDraftStore {
	if (typeof window === "undefined") return emptyDocumentPayloadDraftStore();
	try {
		const localKey = documentPayloadDraftLocalKey(organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(documentPayloadDraftStorageKey)
				: null);
		if (!raw) return emptyDocumentPayloadDraftStore();
		const parsed = JSON.parse(raw) as Partial<DocumentPayloadDraftStore>;
		if (
			parsed?.version !== 1 ||
			!parsed.drafts ||
			typeof parsed.drafts !== "object"
		)
			return emptyDocumentPayloadDraftStore();
		const drafts: DocumentPayloadDraftStore["drafts"] = {};
		let pruned = false;
		for (const [key, rawEntry] of Object.entries(parsed.drafts)) {
			if (
				!key ||
				key.length > 320 ||
				!rawEntry ||
				typeof rawEntry !== "object"
			) {
				pruned = true;
				continue;
			}
			const entry = rawEntry as Partial<DocumentPayloadDraftEntry>;
			if (
				entry.kind !== "dental_outpatient_card_043u" &&
				entry.kind !== "medical_record_extract"
			) {
				pruned = true;
				continue;
			}
			if (
				typeof entry.patientId !== "string" ||
				!entry.patientId ||
				typeof entry.savedAt !== "string" ||
				!entry.savedAt
			) {
				pruned = true;
				continue;
			}
			if (!localSavedAtFresh(entry.savedAt, sensitiveLocalDraftRetentionMs)) {
				pruned = true;
				continue;
			}
			const fields =
				entry.kind === "dental_outpatient_card_043u"
					? (entry.fields ?? {})
					: normalizeMedicalRecordExtractDocumentDraftFields(entry.fields);
			if (!fields) {
				pruned = true;
				continue;
			}
			drafts[key] = {
				kind: entry.kind,
				patientId: entry.patientId,
				visitId:
					typeof entry.visitId === "string" && entry.visitId
						? entry.visitId
						: null,
				savedAt: entry.savedAt,
				fields,
			};
		}
		if (pruned || organizationId) {
			if (Object.keys(drafts).length) {
				safeLocalStorageSetItem(
					localKey,
					JSON.stringify({
						version: 1,
						drafts,
					} satisfies DocumentPayloadDraftStore),
				);
			} else {
				safeLocalStorageRemoveItem(localKey);
			}
			if (organizationId)
				safeLocalStorageRemoveItem(documentPayloadDraftStorageKey);
		}
		return { version: 1, drafts };
	} catch {
		// Payload drafts are recovery data only; missing or invalid local storage defaults to empty.
		return emptyDocumentPayloadDraftStore();
	}
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
				.sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
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
		logger.error("Failed to save medical record extract document draft", error);
		// Payload drafts are recovery data only; document issue still validates all facts server-side.
	}
}

export function isDocumentIssueSignatureModePreference(
	value: unknown,
): value is DocumentIssueSignatureMode {
	return (
		value === "paper_signed" ||
		value === "simple_electronic_signature" ||
		value === "qualified_electronic_signature"
	);
}
