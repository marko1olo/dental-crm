import { todayDateInputValue } from "../../dateTimeUtils";
import type { PersistenceHealth } from "./types";
import type { MedicalRecordExtractDocumentDraftFields } from "../../DocumentHelpers";

export function browserGeneratedId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function createLocalQueueId(): string {
	if (typeof crypto !== "undefined") {
		if ("randomUUID" in crypto) return crypto.randomUUID();
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const cryptoAny = crypto as any;
		if (typeof cryptoAny.getRandomValues === "function") {
			const array = new Uint32Array(1);
			cryptoAny.getRandomValues(array);
			return `local-${Date.now()}-${(array[0] || 0).toString(16)}`;
		}
	}

	const timeStr = Date.now().toString(16);
	let hash = 0;
	for (let i = 0; i < timeStr.length; i++) {
		hash = (Math.imul(31, hash) + timeStr.charCodeAt(i)) | 0;
	}

	return `local-${Date.now()}-${Math.abs(hash).toString(16)}`;
}

export function normalizePersistenceHealth(payload: unknown): PersistenceHealth | null {
	if (!payload || typeof payload !== "object") return null;
	const persistence = (
		payload as {
			meta?: Partial<PersistenceHealth>;
			persistence?: Partial<PersistenceHealth>;
		}
	).meta ?? (payload as { persistence?: Partial<PersistenceHealth> }).persistence;
	if (!persistence || typeof persistence !== "object") return null;
	return {
		enabled: persistence.enabled === true,
		filePath: typeof persistence.filePath === "string" ? persistence.filePath : "",
		exists: persistence.exists === true,
		version: typeof persistence.version === "number" ? persistence.version : null,
		savedAt: typeof persistence.savedAt === "string" ? persistence.savedAt : null,
		checksum: typeof persistence.checksum === "string" ? persistence.checksum : null,
		backupDirectoryPath:
			typeof persistence.backupDirectoryPath === "string"
				? persistence.backupDirectoryPath
				: "",
		backupCount:
			typeof persistence.backupCount === "number" ? persistence.backupCount : 0,
		latestBackupAt:
			typeof persistence.latestBackupAt === "string"
				? persistence.latestBackupAt
				: null,
		latestBackupSizeBytes:
			typeof persistence.latestBackupSizeBytes === "number"
				? persistence.latestBackupSizeBytes
				: null,
		maxBackupCount:
			typeof persistence.maxBackupCount === "number"
				? persistence.maxBackupCount
				: 0,
	};
}

export function localDraftString(value: unknown, maxLength = 1200): string {
	return typeof value === "string" ? value.slice(0, maxLength) : "";
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
