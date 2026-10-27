import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import {
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../../utils/localStorageHelpers";
import { todayDateInputValue } from "../../utils/dateTimeUtils";

export const documentPayloadDraftStorageKey =
	"dental-crm:document-payload-drafts:v1";

export const sensitiveLocalDraftRetentionMs = 14 * 24 * 60 * 60 * 1000;

export type MedicalRecordExtractDocumentDraftFields = {
	recordExtractPeriodStart: string;
	recordExtractPeriodEnd: string;
	recordExtractSourceVisitIds: string;
	recordExtractComplaintAndAnamnesis: string;
	recordExtractObjectiveStatus: string;
	recordExtractDiagnosis: string;
	recordExtractTreatmentProvided: string;
	recordExtractRecommendations: string;
	recordExtractDoctorFullName: string;
	recordExtractRecipientFullName: string;
	recordExtractRecipientAuthority: string;
	recordExtractIssuedAt: string;
	recordExtractPreparedFromSignedRecords: boolean;
	recordExtractThirdPartyDataChecked: boolean;
};

export type DocumentPayloadDraftEntry = {
	kind: "dental_outpatient_card_043u" | "medical_record_extract";
	patientId: string;
	visitId: string | null;
	savedAt: string;
	fields:
		| MedicalRecordExtractDocumentDraftFields
		| Record<string, unknown>;
};

export type DocumentPayloadDraftStore = {
	version: 1;
	drafts: Record<string, DocumentPayloadDraftEntry>;
};

export function documentPayloadDraftLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		documentPayloadDraftStorageKey,
		organizationId,
	);
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

function cleanString(val: unknown, maxLen = 4000): string {
	return typeof val === "string" ? val.slice(0, maxLen) : "";
}

export function normalizeMedicalRecordExtractDocumentDraftFields(
	value: unknown,
): MedicalRecordExtractDocumentDraftFields | null {
	if (!value || typeof value !== "object") return null;
	const c = value as Record<string, unknown>;
	return {
		recordExtractPeriodStart: cleanString(c.recordExtractPeriodStart, 40),
		recordExtractPeriodEnd: cleanString(c.recordExtractPeriodEnd, 40),
		recordExtractSourceVisitIds: cleanString(c.recordExtractSourceVisitIds, 2400),
		recordExtractComplaintAndAnamnesis: cleanString(c.recordExtractComplaintAndAnamnesis),
		recordExtractObjectiveStatus: cleanString(c.recordExtractObjectiveStatus),
		recordExtractDiagnosis: cleanString(c.recordExtractDiagnosis),
		recordExtractTreatmentProvided: cleanString(c.recordExtractTreatmentProvided),
		recordExtractRecommendations: cleanString(c.recordExtractRecommendations),
		recordExtractDoctorFullName: cleanString(c.recordExtractDoctorFullName, 240),
		recordExtractRecipientFullName: cleanString(c.recordExtractRecipientFullName, 240),
		recordExtractRecipientAuthority: cleanString(c.recordExtractRecipientAuthority, 240) || "пациент лично",
		recordExtractIssuedAt: cleanString(c.recordExtractIssuedAt, 80),
		recordExtractPreparedFromSignedRecords: c.recordExtractPreparedFromSignedRecords === true,
		recordExtractThirdPartyDataChecked: c.recordExtractThirdPartyDataChecked === true,
	};
}

export function loadDocumentPayloadDraftStore(
	organizationId: string | null | undefined = null,
): DocumentPayloadDraftStore {
	if (typeof window === "undefined") return emptyDocumentPayloadDraftStore();
	try {
		const localKey = documentPayloadDraftLocalKey(organizationId);
		const raw = safeLocalStorageGetItem(localKey) ?? (organizationId ? safeLocalStorageGetItem(documentPayloadDraftStorageKey) : null);
		if (!raw) return emptyDocumentPayloadDraftStore();
		const parsed = JSON.parse(raw) as Partial<DocumentPayloadDraftStore>;
		if (parsed?.version !== 1 || !parsed.drafts || typeof parsed.drafts !== "object") return emptyDocumentPayloadDraftStore();
		const drafts: DocumentPayloadDraftStore["drafts"] = {};
		for (const [k, v] of Object.entries(parsed.drafts)) {
			if (!k || !v || typeof v !== "object") continue;
			const e = v as Partial<DocumentPayloadDraftEntry>;
			if (e.kind !== "dental_outpatient_card_043u" && e.kind !== "medical_record_extract") continue;
			if (typeof e.patientId !== "string" || !e.patientId || typeof e.savedAt !== "string" || !e.savedAt) continue;
			if (!localSavedAtFresh(e.savedAt, sensitiveLocalDraftRetentionMs)) continue;
			const fields = e.kind === "dental_outpatient_card_043u" ? (e.fields ?? {}) : normalizeMedicalRecordExtractDocumentDraftFields(e.fields);
			if (!fields) continue;
			drafts[k] = { kind: e.kind, patientId: e.patientId, visitId: typeof e.visitId === "string" ? e.visitId : null, savedAt: e.savedAt, fields };
		}
		return { version: 1, drafts };
	} catch {
		return emptyDocumentPayloadDraftStore();
	}
}

export function loadMedicalRecordExtractDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
): MedicalRecordExtractDocumentDraftFields | null {
	if (!key || typeof window === "undefined") return null;
	const draft = loadDocumentPayloadDraftStore(organizationId).drafts[key];
	return draft?.kind === "medical_record_extract" ? (draft.fields as MedicalRecordExtractDocumentDraftFields) : null;
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
			fields: normalizeMedicalRecordExtractDocumentDraftFields(fields) ?? emptyMedicalRecordExtractDocumentDraftFields(),
			savedAt: new Date().toISOString(),
		};
		const trimmedDrafts = Object.fromEntries(
			Object.entries(store.drafts).sort((l, r) => r[1].savedAt.localeCompare(l[1].savedAt)).slice(0, 60),
		);
		safeLocalStorageSetItem(documentPayloadDraftLocalKey(organizationId), JSON.stringify({ version: 1, drafts: trimmedDrafts }));
	} catch (error) {
		logger.error("Failed to save medical record extract document draft", error);
	}
}
