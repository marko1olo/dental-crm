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
import { defaultUiLanguageOption, isRecordKey } from "./CommonHelpers";

export const uiPreferencesServerPath = "/api/settings/preferences";

export const uiLanguageLabels: Record<UiLanguage, string> = {
	ru: "Русский",
};

export type UiLanguageOption = {
	value: UiLanguage;
	label: string;
	detail: string;
};

export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];

export function isUiLanguage(value: unknown): value is UiLanguage {
	return isRecordKey(value, uiLanguageLabels);
}

export function normalizeUiLanguageInput(value: unknown): UiLanguage {
	return isUiLanguage(value) ? value : "ru";
}

export function pickUiPreference<T>(
	source: Record<string, unknown>,
	key: keyof UiPreferencesInput,
	fallback: T,
	isValid: (value: unknown) => value is T,
): T {
	const value = source[key];
	return isValid(value) ? value : fallback;
}

export function persistUiPreferences(
	preferences: UiPreferences,
): UiPreferences | null {
	if (typeof window === "undefined") return null;
	try {
		safeLocalStorageSetItem(
			uiPreferencesStorageKey,
			JSON.stringify(preferences),
		);
		return preferences;
	} catch {
		// Preferences are convenience only. Clinical drafts use separate guarded storage.
		return null;
	}
}

// Перенесено в ./lib/denteRequestHeaders (модуль без импортов) 2026-07-28. Эта функция была
// единственным рантайм-ребром, замыкавшим цикл
// AppHelpers.tsx:305 -> workspaceShell.tsx:32 -> hooks/useWorkspaceProfile.ts:22 -> AppHelpers,
// которого madge не печатал. Реэкспорт оставлен намеренно: 15 вызывающих файлов и два мёртвых
// импорта (App.tsx, useAppLogic.tsx) компилируются без правок, поэтому миграция идёт по файлу за
// раз, а не одним свипом на 17 файлов. Полное обоснование — в шапке нового модуля.
//
// Импорт, а не только реэкспорт: `export { x } from "../y"` НЕ вносит имя в локальную область, а у
// этого файла есть два собственных вызова функции ниже. Typecheck поймал это сразу — TS2552 на
// обоих. Новый модуль не имеет импортов вообще, поэтому это ребро не может замкнуть никакой цикл.

export function uiPreferencesSyncErrorMessage(_error: unknown): string {
	return "Настройки интерфейса сохранены только на этом устройстве. Серверная синхронизация повторится автоматически.";
}

export const settingsTabGroups = [
	{ id: "account", title: "Мой аккаунт" },
	{ id: "main", title: "Основные" },
	{ id: "clinical", title: "Клинические" },
	{ id: "stock", title: "Учёт" },
	{ id: "marketing", title: "Маркетинг" },
	{ id: "system", title: "Системные" },
] as const;

export type SettingsTabGroup = (typeof settingsTabGroups)[number]["id"];

export const initialUiPreferences = {} as any;
