import {
	type AcceptVisitDraftResponse,
	type AiJobKind,
	type AiRecognitionTarget,
	type Appointment,
	buildRuleBasedVisitDraftFromTranscript,
	type ClinicalToothRow,
	type CreateAppointmentInput,
	type Dashboard,
	type DentalSpecialty,
	type DenteTelegramBotMode,
	type DenteTelegramFeature,
	type DenteTelegramLinkCodePublic,
	type DenteTelegramMessagePreview,
	type DenteTelegramOutboxResponse,
	type DenteTelegramPrivacyMode,
	type DenteTelegramVisualCardKey,
	type DenteTelegramVisualCardUrls,
	type DicomSeriesPreviewGroup,
	type DicomViewerToolStateBundleResponse,
	type DicomViewerWorkbenchManifestResponse,
	type DocumentIngestionResponse,
	type DocumentIngestionTarget,
	type DocumentIssueSignatureMode,
	type DocumentVoidReasonCode,
	documentKindMetadata,
	type GeneratedDocument,
	type ImagingSourceKind,
	type ImagingStudyKind,
	type ImagingViewerAnnotation,
	type ImagingViewerImplantPlan,
	type ImagingViewerSessionState,
	type ImagingViewerWindowPreset,
	type ImportSourceKind,
	type InstallmentPaymentStatus,
	type Patient,
	type PatientIntakePregnancyStatus,
	type PaymentMethod,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	type PricelistSourceKind,
	type ProcedureSpecificConsentProcedure,
	type SmartImportMode,
	type SpeechChunkUploadInput,
	type SpeechGatewayStatus,
	type SpeechProviderConnector,
	type SpeechTranscriptionResponse,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TaxDeductionApplicationRelationship,
	type TreatmentPlanAcceptanceVariant,
	type UiLanguage,
	type UpdateAppointmentInput,
	type UpdatePatientInput,
	type VisitNoteDraft,
	type XrayCbctReferralPregnancyStatus,
	type XrayCbctReferralPriority,
	type XrayCbctReferralStudyType,
} from "@dental/shared";
import type { CSSProperties } from "react";
import { showToast } from "../components/GlobalToast";
import type { CtImplantLibraryItem } from "../ctPlanningTools";
import {
	imagingKindLabels,
	imagingSourceLabels,
	type MprProjection,
	type MprWindowPreset,
} from "../imagingUiLabels";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { actionFailureToast } from "../lib/panelStateText";
import {
	readDenteClinicToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
} from "../mprControlMath";
import { pricelistSourceKindLabels } from "../pricelistUiMeta";
import {
	collectDicomWorkstationClientFacts,
	isBrowserImagingScanAbortError,
	isBrowserMigrationScanAbortError,
	localImagingFolderFingerprint,
} from "./browserScanUtils";
import {
	buildClinicProfileUpdatePayload,
	buildPatientAdministrativeProfilePayload,
	type ClinicProfileDraft,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	defaultAppointmentStartLocal,
	defaultStaffScheduleDraft,
	defaultWorkingDays,
	emptyClinicProfileDraft,
	isDentalSpecialty,
	isStaffRole,
	normalizedDentalSpecialty,
	normalizedStaffRole,
	normalizeOptionalWorkingDaysDraft,
	normalizeWorkingDaysDraft,
	nullableClinicDraftValue,
	nullablePatientDraftValue,
	type PatientAdministrativeProfileDraft,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	roleFocusOrder,
	type StaffScheduleDraft,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
} from "./clinicProfileUtils";
import {
	addMinutesToClinicDateTimeLocal,
	calendarDayInTimeZone,
	dateInputValuePlusDays,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isoDateLabel,
	isValidDateParts,
	minutesLabel,
	normalizeClockTime,
	shiftCalendarDay,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
} from "./dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "./localStorageHelpers";
import type { AppView } from "./routeUtils";
import {
	postVisitCareTopicOptions,
	telegramVisualCardFields,
} from "../workspaceStaticOptions";
import {
	defaultUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
	uiPreferencesStorageKey,
} from "./preferencesUtils";
import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	paymentMethodLabels,
	recognitionTargetLabels,
	serviceCategoryLabels,
} from "../workspaceUiLabels";
import { money, moneyUnknownLabel } from "./financeUtils";
import { countLabel } from "../lib/russianPlural.js";
import { logger } from "./logger";
import { emptyDocumentPaymentSelectionStore, emptyDocumentPayloadDraftStore, sensitiveLocalDraftRetentionMs, normalizeOutpatient025uDocumentDraftFields, normalizeMedicalRecordExtractDocumentDraftFields, isDocumentKindPreference, isRecordKey } from "./CommonHelpers";

export const documentPaymentSelectionStorageKey =
	"dental-crm:document-payment-selection:v1";

export const documentPayloadDraftStorageKey =
	"dental-crm:document-payload-drafts:v1";

export const documentIssueSignatureStorageKey =
	"dental-crm:document-issue-signature:v1";

export type DocumentPaymentSelectionEntry = {
	paymentIds: string[];
	savedAt: string;
};

export type DocumentPaymentSelectionStore = {
	version: 1;
	selections: Record<string, DocumentPaymentSelectionEntry>;
};

export type Outpatient025uDocumentDraftFields = {
	recordExtractPeriodStart: string;
	recordExtractPeriodEnd: string;
	recordExtractSourceVisitIds: string;
	recordExtractComplaintAndAnamnesis: string;
	recordExtractObjectiveStatus: string;
	recordExtractDiagnosis: string;
	recordExtractTreatmentProvided: string;
	recordExtractRecommendations: string;
	recordExtractDoctorFullName: string;
	recordExtractPreparedFromSignedRecords: boolean;
	outpatient025uMedicalCardNumber: string;
	outpatient025uOpenedAt: string;
	outpatient025uPatientSexCode: "1" | "2" | "unknown";
	outpatient025uCitizenship: string;
	outpatient025uRegistrationUrbanRuralCode: "1" | "2" | "unknown";
	outpatient025uStayUrbanRuralCode: "1" | "2" | "unknown";
	outpatient025uOmsIssuedAt: string;
	outpatient025uInsurerName: string;
	outpatient025uSocialSupportCode: string;
	outpatient025uHealthStatusDisclosureContact: string;
	outpatient025uEmploymentCode: string;
	outpatient025uDisabilityGroup: string;
	outpatient025uWorkOrStudyPlace: string;
	outpatient025uPalliativeCareNeedCode: string;
	outpatient025uBloodGroup: string;
	outpatient025uRhFactor: string;
	outpatient025uKellK1: string;
	outpatient025uOtherBloodData: string;
	outpatient025uAllergyHistory: string;
	outpatient025uFinalEpicrisis: string;
	outpatient025uOfficialForm274nChecked: boolean;
	outpatient025uThirdPartyDataChecked: boolean;
};

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
	kind: "outpatient_medical_card_025u" | "medical_record_extract";
	patientId: string;
	visitId: string | null;
	savedAt: string;
	fields:
		| Outpatient025uDocumentDraftFields
		| MedicalRecordExtractDocumentDraftFields;
};

export type DocumentPayloadDraftStore = {
	version: 1;
	drafts: Record<string, DocumentPayloadDraftEntry>;
};

export type DocumentIssueSignatureDraft = {
	version: 1;
	mode: DocumentIssueSignatureMode;
	staffFullName: string;
	staffRole: string;
	savedAt: string;
};

export const documentIssueSignatureModeLabels: Record<
	DocumentIssueSignatureMode,
	string
> = {
	paper_signed: "Бумажный экземпляр подписан",
	simple_electronic_signature: "Простая электронная подпись",
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

export function documentPaymentSelectionLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		documentPaymentSelectionStorageKey,
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
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
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
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn(error);
		// Signature defaults are convenience only; the server still requires explicit attestation on issue.
	}
}

export function normalizedDocumentPaymentSelectionIds(
	value: unknown,
): string[] {
	if (!Array.isArray(value)) return [];
	const paymentIds: string[] = [];
	const seenPaymentIds = new Set<string>();
	for (const rawPaymentId of value) {
		if (typeof rawPaymentId !== "string") continue;
		const paymentId = rawPaymentId.trim();
		if (!paymentId || paymentId.length > 120 || seenPaymentIds.has(paymentId))
			continue;
		seenPaymentIds.add(paymentId);
		paymentIds.push(paymentId);
		if (paymentIds.length >= 80) break;
	}
	return paymentIds;
}

export function loadDocumentPaymentSelectionStore(
	organizationId: string | null | undefined = null,
): DocumentPaymentSelectionStore {
	if (typeof window === "undefined")
		return emptyDocumentPaymentSelectionStore();
	try {
		const localKey = documentPaymentSelectionLocalKey(organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(documentPaymentSelectionStorageKey)
				: null);
		if (!raw) return emptyDocumentPaymentSelectionStore();
		const parsed = JSON.parse(raw) as Partial<DocumentPaymentSelectionStore>;
		if (
			parsed?.version !== 1 ||
			!parsed.selections ||
			typeof parsed.selections !== "object"
		) {
			return emptyDocumentPaymentSelectionStore();
		}
		const selections: DocumentPaymentSelectionStore["selections"] = {};
		let pruned = false;
		for (const [key, rawEntry] of Object.entries(parsed.selections)) {
			if (
				!key ||
				key.length > 260 ||
				!rawEntry ||
				typeof rawEntry !== "object"
			) {
				pruned = true;
				continue;
			}
			const entry = rawEntry as Partial<DocumentPaymentSelectionEntry>;
			const savedAt =
				typeof entry.savedAt === "string" && entry.savedAt
					? entry.savedAt
					: null;
			if (
				!savedAt ||
				!localSavedAtFresh(savedAt, localConvenienceRetentionMs)
			) {
				pruned = true;
				continue;
			}
			selections[key] = {
				paymentIds: normalizedDocumentPaymentSelectionIds(entry.paymentIds),
				savedAt,
			};
		}
		if (pruned || organizationId) {
			if (Object.keys(selections).length) {
				safeLocalStorageSetItem(
					localKey,
					JSON.stringify({
						version: 1,
						selections,
					} satisfies DocumentPaymentSelectionStore),
				);
			} else {
				safeLocalStorageRemoveItem(localKey);
			}
			if (organizationId)
				safeLocalStorageRemoveItem(documentPaymentSelectionStorageKey);
		}
		return { version: 1, selections };
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to load signature draft", error);
		// Document payment selection is local operator convenience; read failures are safe to ignore.
		return emptyDocumentPaymentSelectionStore();
	}
}

export function loadDocumentPaymentSelection(
	organizationId: string | null | undefined,
	key: string | null,
): string[] | null {
	if (!key || typeof window === "undefined") return null;
	const entry =
		loadDocumentPaymentSelectionStore(organizationId).selections[key];
	return entry ? normalizedDocumentPaymentSelectionIds(entry.paymentIds) : null;
}

export function saveDocumentPaymentSelection(
	organizationId: string | null | undefined,
	key: string | null,
	paymentIds: string[],
): void {
	if (!key || typeof window === "undefined") return;
	try {
		const store = loadDocumentPaymentSelectionStore(organizationId);
		store.selections[key] = {
			paymentIds: normalizedDocumentPaymentSelectionIds(paymentIds),
			savedAt: new Date().toISOString(),
		};
		const trimmedSelections = Object.fromEntries(
			Object.entries(store.selections)
				.sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
				.slice(0, 80),
		);
		safeLocalStorageSetItem(
			documentPaymentSelectionLocalKey(organizationId),
			JSON.stringify({
				version: 1,
				selections: trimmedSelections,
			} satisfies DocumentPaymentSelectionStore),
		);
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save payment selection", error);
		// Document payment selection is local operator convenience; failed storage must not block document issue.
	}
}

export function documentPayloadDraftKey(
	kind: "outpatient_medical_card_025u" | "medical_record_extract",
	organizationId: string | null | undefined,
	patientId: string | null,
	visitId: string | null,
): string | null {
	const normalizedOrganizationId = organizationId?.trim();
	if (!normalizedOrganizationId || !patientId) return null;
	return `${kind}:${normalizedOrganizationId}:${patientId}:${visitId ?? "all-visits"}`;
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
				entry.kind !== "outpatient_medical_card_025u" &&
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
				entry.kind === "outpatient_medical_card_025u"
					? normalizeOutpatient025uDocumentDraftFields(entry.fields)
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

export const outpatient025uDemographicCodeOptions = [
	"1",
	"2",
	"unknown",
] as const;

export type Outpatient025uDemographicCode =
	(typeof outpatient025uDemographicCodeOptions)[number];

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
	{ value: "knd_1151156", label: "КНД 1151156, расходы с 2024" },
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

export function normalizedDocumentKind(
	value: unknown,
): GeneratedDocument["kind"] {
	return isDocumentKindPreference(value)
		? value
		: defaultUiPreferences.selectedDocumentKind;
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
