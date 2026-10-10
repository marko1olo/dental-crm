import type {
	ClinicalToothStatus,
	ClinicalToothSurface,
	MedicalDocumentReleaseChannel,
	DocumentIssueSignatureDraft,
	DocumentPayloadDraftStore,
	MedicalRecordExtractDocumentDraftFields,
	DocumentPayloadDraftEntry,
} from "./types.js";
import type {
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
	GeneratedDocument,
	PhotoVideoConsentMaterial,
	PostVisitCareTopic,
	ProcedureSpecificConsentProcedure,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { documentKindMetadata } from "@dental/shared";
import { defaultUiPreferences } from "../utils/preferencesUtils";
import { postVisitCareTopicOptions } from "../workspaceStaticOptions";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import { todayDateInputValue } from "../utils/dateTimeUtils";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";
import {
	offlineDraftOrganizationKey,
	localDraftString,
	sensitiveLocalDraftRetentionMs,
	isRecordKey,
	isOptionValue,
} from "./uiFormatters.js";

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

export const documentVoidReasonLabels: Record<DocumentVoidReasonCode, string> =
	{
		draft_error: "Ошибка в черновике",
		issued_in_error: "Документ выдан с ошибкой",
		patient_request: "Запрос пациента или представителя",
		duplicate_document: "Дубль документа",
		tax_certificate_correction: "Коррекция налоговой справки",
		medical_release_correction: "Коррекция выдачи меддокументов",
		payment_correction: "Коррекция оплаты или чека",
		other: "Другая причина",
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

export const documentIngestionQualityLabels: Record<
	DocumentIngestionResponse["quality"]["extractionQuality"],
	string
> = {
	ready: "Можно открыть предпросмотр",
	review: "Нужна ручная проверка",
	ocr_required: "Нужен OCR / vision",
	unsupported: "Формат не разобран",
};

export const documentDetectedKindLabels: Record<string, string> = {
	archive: "архив",
	csv: "таблица",
	docx: "документ Word",
	html: "веб-страница",
	image: "изображение",
	json: "структурированный текст",
	legacy_database: "старая база",
	legacy_dump: "резервная копия старой базы",
	ods: "таблица",
	odt: "документ",
	pdf: "PDF",
	pptx: "презентация",
	rtf: "текстовый документ",
	spreadsheet: "таблица",
	text: "текст",
	unknown: "не определено",
	xlsx: "таблица Excel",
	xml: "структурированный текст",
	zip: "архив",
};

export function documentDetectedKindLabel(kind: string) {
	return documentDetectedKindLabels[kind] ?? "файл";
}

export const medicalDocumentReleaseChannelLabels: Record<
	MedicalDocumentReleaseChannel,
	string
> = {
	paper: "Бумага",
	pdf: "PDF",
	dicom_archive: "архив снимков",
	secure_link: "Защищенная ссылка",
	physical_media: "Физический носитель",
	other: "Иной канал",
};

export const taxApplicationRelationshipOptions: Array<{
	value: TaxDeductionApplicationRelationship;
	label: string;
}> = [
	{ value: "self", label: "Пациент сам" },
	{ value: "spouse", label: "Супруг / супруга" },
	{ value: "parent", label: "Родитель" },
	{ value: "child", label: "Ребенок" },
	{ value: "ward", label: "Подопечный" },
];

export const taxApplicationFormOptions: Array<{
	value: TaxDeductionApplicationForm;
	label: string;
}> = [
	{ value: "knd_1151156", label: "Справка для налогового вычета (с 2024)" },
	{ value: "legacy_2021_2023", label: "Старая справка, оплаты 2021-2023" },
];

export const taxApplicationDeliveryChannelOptions: Array<{
	value: TaxDeductionApplicationDeliveryChannel;
	label: string;
}> = [
	{ value: "paper", label: "Бумажно в клинике" },
	{ value: "pdf", label: "PDF после подписи" },
	{ value: "secure_link", label: "Защищенная ссылка" },
	{ value: "email", label: "Email" },
	{ value: "portal", label: "Личный кабинет" },
	{ value: "other", label: "Иной канал" },
];

export function normalizeTaxApplicationRelationship(
	value: string | null | undefined,
): TaxDeductionApplicationRelationship | null {
	const normalized =
		value
			?.trim()
			.toLocaleLowerCase("ru-RU")
			.replaceAll("ё", "е")
			.replace(/[\s_-]+/g, " ") ?? "";
	if (!normalized) return null;
	if (
		[
			"self",
			"patient",
			"пациент",
			"сам пациент",
			"сама пациентка",
			"налогоплательщик",
		].includes(normalized)
	)
		return "self";
	if (
		["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(
			normalized,
		)
	)
		return "spouse";
	if (
		[
			"parent",
			"father",
			"mother",
			"родитель",
			"отец",
			"мать",
			"папа",
			"мама",
		].includes(normalized)
	)
		return "parent";
	if (
		[
			"child",
			"son",
			"daughter",
			"ребенок",
			"сын",
			"дочь",
			"усыновленный",
			"усыновленная",
		].includes(normalized)
	)
		return "child";
	if (
		["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(
			normalized,
		)
	)
		return "ward";
	return null;
}

export const procedureSpecificConsentProcedureOptions: Array<{
	value: ProcedureSpecificConsentProcedure;
	label: string;
}> = [
	{ value: "local_anesthesia", label: "Местная анестезия" },
	{
		value: "therapy_endo_restoration",
		label: "Терапия, эндодонтия, реставрация",
	},
	{ value: "sedation", label: "Седация (ЗАКС / в/в)" },
	{ value: "surgery_extraction", label: "Хирургия / удаление" },
	{ value: "implantation_bone_graft", label: "Имплантация / костная пластика" },
	{ value: "prosthetics", label: "Ортопедия" },
	{ value: "orthodontics", label: "Ортодонтия" },
	{ value: "hygiene_whitening", label: "Гигиена / отбеливание" },
	{ value: "periodontology", label: "Пародонтология" },
	{ value: "other", label: "Другая процедура" },
];

export const photoVideoMaterialOptions: Array<{
	value: PhotoVideoConsentMaterial;
	label: string;
}> = [
	{ value: "intraoral_photo", label: "Внутриротовые фото" },
	{ value: "face_photo", label: "Фото лица" },
	{ value: "video", label: "Видео" },
	{ value: "xray", label: "Рентген" },
	{ value: "cbct", label: "КЛКТ/КТ" },
	{ value: "scan", label: "Цифровые сканы" },
	{ value: "other", label: "Иные материалы" },
];

export function isTaxDocumentYearPreference(value: unknown): value is number {
	if (!Number.isInteger(value)) return false;
	const year = value as number;
	return year >= 2021 && year <= 2100;
}

export function isDocumentKindPreference(
	value: unknown,
): value is GeneratedDocument["kind"] {
	return isRecordKey(value, documentKindMetadata);
}

export function isTaxApplicationFormPreference(
	value: unknown,
): value is TaxDeductionApplicationForm {
	return isOptionValue(value, taxApplicationFormOptions);
}

export function isTaxApplicationDeliveryChannelPreference(
	value: unknown,
): value is TaxDeductionApplicationDeliveryChannel {
	return isOptionValue(value, taxApplicationDeliveryChannelOptions);
}

export function isProcedureSpecificConsentProcedurePreference(
	value: unknown,
): value is ProcedureSpecificConsentProcedure {
	return isOptionValue(value, procedureSpecificConsentProcedureOptions);
}

export function isPostVisitCareTopicPreference(
	value: unknown,
): value is PostVisitCareTopic {
	return isOptionValue(value, postVisitCareTopicOptions);
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

export function normalizedDocumentKind(
	value: unknown,
): GeneratedDocument["kind"] {
	return isDocumentKindPreference(value)
		? value
		: defaultUiPreferences.selectedDocumentKind;
}

export function normalizedTaxApplicationRelationshipSelect(
	value: unknown,
): TaxDeductionApplicationRelationship {
	return isOptionValue(value, taxApplicationRelationshipOptions)
		? value
		: "self";
}

export function normalizedTaxApplicationForm(
	value: unknown,
): TaxDeductionApplicationForm {
	return isTaxApplicationFormPreference(value)
		? value
		: defaultUiPreferences.taxApplicationForm;
}

export function normalizedTaxApplicationDeliveryChannel(
	value: unknown,
): TaxDeductionApplicationDeliveryChannel {
	return isTaxApplicationDeliveryChannelPreference(value)
		? value
		: defaultUiPreferences.taxApplicationDeliveryChannel;
}

export function normalizedProcedureSpecificConsentProcedure(
	value: unknown,
): ProcedureSpecificConsentProcedure {
	return isProcedureSpecificConsentProcedurePreference(value)
		? value
		: defaultUiPreferences.procedureConsentProcedureType;
}

export function normalizedMedicalDocumentReleaseChannel(
	value: unknown,
): MedicalDocumentReleaseChannel {
	return isRecordKey(value, medicalDocumentReleaseChannelLabels)
		? value
		: "paper";
}

export function normalizedDocumentVoidReasonCode(
	value: unknown,
): DocumentVoidReasonCode {
	return isRecordKey(value, documentVoidReasonLabels) ? value : "draft_error";
}

export function confirmedDocumentLiteral(value: boolean, label: string): true {
	if (!value) {
		throw new Error(
			`Не подтверждено обязательное условие документа: ${label}.`,
		);
	}
	return true;
}

export function documentTextLines(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

export function compactDocumentText(
	...values: Array<string | null | undefined>
): string {
	return values
		.map((value) => value?.trim() ?? "")
		.filter(Boolean)
		.join("\n");
}
