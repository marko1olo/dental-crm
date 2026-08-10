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

export const onboardingStorageKey = "dental-crm:onboarding:v1";

export const denteAdminSecretHeaderName = "x-dente-admin-secret";

export function normalizedLocalOrganizationId(
	organizationId: string | null | undefined,
): string | null {
	const normalized = organizationId?.trim();
	return normalized || null;
}

export function onboardingLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		onboardingStorageKey,
		organizationId,
	);
}

export const onboardingTelegramVisualCardKeys: DenteTelegramVisualCardKey[] = [
	"mainMenu",
	"appointment",
	"documents",
	"tax",
	"billing",
	"care",
	"review",
	"staff",
];

export type OnboardingStep =
	| "intro"
	| "role"
	| "clinic"
	| "legal"
	| "team"
	| "sources"
	| "telegram"
	| "done";

export const onboardingStepValues: readonly OnboardingStep[] = [
	"intro",
	"role",
	"clinic",
	"legal",
	"team",
	"sources",
	"telegram",
	"done",
];

export type OnboardingDismissalState = {
	dismissed: boolean;
	savedAt: string;
	draftMode: boolean;
};

export function parseOnboardingDismissalState(
	raw: string | null,
): OnboardingDismissalState | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as {
			dismissed?: unknown;
			savedAt?: unknown;
			draftMode?: unknown;
			version?: unknown;
		};
		if (parsed.version !== 1 || typeof parsed.dismissed !== "boolean")
			return null;
		return {
			dismissed: parsed.dismissed,
			savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
			draftMode:
				typeof parsed.draftMode === "boolean" ? parsed.draftMode : false,
		};
	} catch {
		return null;
	}
}

export function loadOnboardingDismissalState(
	organizationId: string | null | undefined = null,
): OnboardingDismissalState | null {
	if (typeof window === "undefined") return null;
	try {
		const scopedVal = safeLocalStorageGetItem(
			onboardingLocalKey(organizationId),
		);
		if (scopedVal) {
			const parsed = parseOnboardingDismissalState(scopedVal);
			if (parsed) return parsed;
		}
		const unscopedVal = safeLocalStorageGetItem(onboardingStorageKey);
		return parseOnboardingDismissalState(unscopedVal);
	} catch {
		return null;
	}
}

export function mergeLocalOnboardingDismissal(
	preferences: UiPreferences,
	organizationId: string | null | undefined = null,
): UiPreferences {
	const localDismissal = loadOnboardingDismissalState(organizationId);
	if (!localDismissal) return preferences;
	const preferenceDismissedAt =
		preferences.onboardingDismissedAt ?? preferences.savedAt;
	if (
		localDismissal.savedAt &&
		(!preferenceDismissedAt || localDismissal.savedAt > preferenceDismissedAt)
	) {
		return {
			...preferences,
			onboardingDismissed: localDismissal.dismissed,
			onboardingDismissedAt: localDismissal.savedAt,
			onboardingDraftMode: localDismissal.dismissed
				? localDismissal.draftMode
				: false,
			onboardingStep: localDismissal.dismissed
				? preferences.onboardingStep
				: "intro",
			savedAt:
				localDismissal.savedAt > preferences.savedAt
					? localDismissal.savedAt
					: preferences.savedAt,
		};
	}
	return preferences;
}

export function saveOnboardingDismissed(
	dismissed: boolean,
	savedAt = new Date().toISOString(),
	draftMode = false,
	organizationId: string | null | undefined = null,
): OnboardingDismissalState {
	const state = {
		dismissed,
		savedAt,
		draftMode: dismissed ? draftMode : false,
	};
	if (typeof window === "undefined") return state;
	try {
		safeLocalStorageSetItem(
			onboardingLocalKey(organizationId),
			JSON.stringify({ version: 1, ...state }),
		);
	} catch {
		// Onboarding state is convenience only; real clinic settings are saved server-side.
	}
	return state;
}

export type AdminSecretSessionDomain =
	| "clinical"
	| "settings"
	| "schedule"
	| "telegram";

export type AdminSecretUnlockDomain = AdminSecretSessionDomain | "all";

export const onboardingSteps: Array<{
	id: OnboardingStep;
	title: string;
	detail: string;
}> = [
	{ id: "intro", title: "Режим запуска", detail: "демо или чистая" },
	{ id: "clinic", title: "Клиника", detail: "название и телефон" },
	{ id: "team", title: "Команда", detail: "первый врач и кресло" },
	{ id: "telegram", title: "ТГ-бот", detail: "бот, QR и отзывы" },
	{ id: "done", title: "Готово", detail: "проверка и старт" },
];

export const auth = {
	denteClinicalReadHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = { ...customHeaders };
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
	denteClinicalMutationHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...customHeaders,
		};
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
};
