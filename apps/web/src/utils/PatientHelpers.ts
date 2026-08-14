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

import { countLabel } from "../lib/russianPlural.js";
import { logger } from "./logger";

export const toothRows = [
	[
		"18",
		"17",
		"16",
		"15",
		"14",
		"13",
		"12",
		"11",
		"21",
		"22",
		"23",
		"24",
		"25",
		"26",
		"27",
		"28",
	],
	[
		"48",
		"47",
		"46",
		"45",
		"44",
		"43",
		"42",
		"41",
		"31",
		"32",
		"33",
		"34",
		"35",
		"36",
		"37",
		"38",
	],
] as const;

export const toothStateByCode: Record<
	string,
	"watch" | "planned" | "done" | "missing"
> = {
	"16": "watch",
	"26": "done",
	"36": "planned",
	"46": "watch",
	"48": "missing",
};

export function patientName(patients: Patient[], patientId: string | null) {
	if (!patientId) return "Новый пациент";
	return (
		patients.find((patient) => patient.id === patientId)?.fullName ?? "Пациент"
	);
}

export function findPatient(patients: Patient[], patientId: string | null) {
	if (!patientId) return null;
	const direct = patients.find((patient) => patient.id === patientId);
	if (!direct) return null;
	if (direct.mergedIntoPatientId) {
		const target = patients.find((p) => p.id === direct.mergedIntoPatientId);
		if (target) return target;
	}
	return direct;
}

/**
 * Что печатается вместо суммы, которой программа не знает.
 *
 * Вынесено в имя, а не написано строкой по месту: разметке местами нужно
 * ОТЛИЧИТЬ неизвестное от суммы, не разбирая текст на части, — например чтобы
 * не подсвечивать красным долг, которого никто не считал.
 */

import { isOptionValue, buildPatientCorePayload } from "./CommonHelpers";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";

export type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export const patientIntakePregnancyStatusOptions: Array<{
	value: PatientIntakePregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна беременность" },
	{ value: "confirmed", label: "Беременность подтверждена" },
	{ value: "lactation", label: "Лактация" },
	{ value: "unknown", label: "Не уточнено" },
];

export type ClinicalToothSurface = ClinicalToothRow["surfaces"][number];

export type ClinicalToothStatus = ClinicalToothRow["status"];

export const clinicalToothSurfaceAliases: Record<string, ClinicalToothSurface> =
	{
		o: "occlusal",
		окклюзионная: "occlusal",
		окклюзионно: "occlusal",
		жевательная: "occlusal",
		жевательно: "occlusal",
		m: "mesial",
		медиальная: "mesial",
		мезиальная: "mesial",
		медиально: "mesial",
		мезиально: "mesial",
		d: "distal",
		дистальная: "distal",
		дистально: "distal",
		b: "buccal",
		щечная: "buccal",
		щечно: "buccal",
		вестибулярная: "buccal",
		l: "lingual",
		язычная: "lingual",
		язычно: "lingual",
		p: "palatal",
		небная: "palatal",
		небно: "palatal",
		i: "incisal",
		режущий: "incisal",
		"режущий край": "incisal",
		корень: "root",
		корневая: "root",
		root: "root",
		имплантация: "implant_site",
		"зона имплантации": "implant_site",
		"implant site": "implant_site",
		"не применимо": "not_applicable",
		нет: "not_applicable",
		"-": "not_applicable",
	};

export const clinicalToothStatusAliases: Record<string, ClinicalToothStatus> = {
	норма: "sound",
	"без патологии": "sound",
	наблюдение: "watch",
	контроль: "watch",
	кариес: "caries",
	caries: "caries",
	пульпит: "pulpitis_periodontitis",
	периодонтит: "pulpitis_periodontitis",
	эндо: "pulpitis_periodontitis",
	пародонт: "periodontal",
	пародонтология: "periodontal",
	отсутствует: "missing",
	удален: "missing",
	удаленый: "missing",
	удаленный: "missing",
	имплант: "implant",
	имплантат: "implant",
	ортопедия: "prosthetic",
	коронка: "prosthetic",
	протез: "prosthetic",
	ортодонтия: "orthodontic",
	брекеты: "orthodontic",
	элайнеры: "orthodontic",
	план: "planned",
	planned: "planned",
	запланировано: "planned",
	выполнено: "completed",
	completed: "completed",
	готово: "completed",
	иное: "other",
	другое: "other",
};

export function normalizedPatientIntakePregnancyStatus(
	value: unknown,
): PatientIntakePregnancyStatus {
	return isOptionValue(value, patientIntakePregnancyStatusOptions)
		? value
		: "unknown";
}

export function patientCoreDraftFromPatient(
	patient: Patient | null,
): PatientCoreDraft {
	return {
		fullName: patient?.fullName ?? "",
		birthDate: patient?.birthDate ?? "",
		phone: patient?.phone ?? "",
		email: patient?.email ?? "",
		notes: patient?.notes ?? "",
	};
}

export function patientCoreDraftSignature(draft: PatientCoreDraft): string {
	return JSON.stringify(buildPatientCorePayload(draft));
}

export const patientInsightRiskLabels: Record<
	Dashboard["patientInsights"][number]["riskLevel"],
	string
> = {
	low: "спокойно",
	watch: "контроль",
	high: "срочно",
};
