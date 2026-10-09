import {
	type AiJobKind,
	type AiRecognitionTarget,
	type Appointment,
	type Dashboard,
	documentKindMetadata,
	type GeneratedDocument,
	type ImagingSourceKind,
	type ImagingStudyKind,
	type OdontogramViewMode,
	type PaymentMethod,
	type PostVisitCareTopic,
	type PricelistSourceKind,
	type ProcedureSpecificConsentProcedure,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TreatmentPlanAcceptanceVariant,
} from "@dental/shared";
import { imagingKindLabels, imagingSourceLabels } from "../../imagingUiLabels";
import { pricelistSourceKindLabels } from "../../pricelistUiMeta";
import { postVisitCareTopicOptions } from "../../workspaceStaticOptions";
import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	paymentMethodLabels,
	recognitionTargetLabels,
	serviceCategoryLabels,
} from "../../workspaceUiLabels";
import { treatmentAcceptanceVariantOptions } from "../AppointmentHelpers";
import {
	type OnboardingStep,
	onboardingStepValues,
} from "../AuthOnboardingHelpers";
import { isDentalSpecialty, isStaffRole } from "../clinicProfileUtils";
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
} from "../dateTimeUtils";
import {
	loadDocumentIssueSignatureDraft,
	taxApplicationDeliveryChannelOptions,
	taxApplicationFormOptions,
} from "../DocumentHelpers";
import {
	defaultUiLanguageOption,
	isUiLanguage,
	pickUiPreference,
	uiPreferencesServerPath,
} from "../PreferencesHelpers";
import {
	defaultUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
} from "../preferencesUtils";
import {
	isTelegramLinkSubjectTypePreference,
	isTelegramOutboxStatusFilterPreference,
	isTelegramOutboxTemplateFilterPreference,
} from "../TelegramHelpers";
import { responseErrorMessage } from "../errorHelpers";
import {
	denteAdminSecretRequestHeaders,
	isBooleanPreference,
	isBoundedPreferenceString,
	isNullablePreferenceString,
	isOptionValue,
	isRecordKey,
	isStringUnionValue,
} from "./storageAdapters";
import {
	aiJobKindPreferenceValues,
	isDocumentIngestionTarget,
	isImportSourceKind,
	isSmartImportMode,
	paymentRefundCorrectionActionOptions,
	paymentRefundCorrectionMethodOptions,
	procedureSpecificConsentProcedureOptions,
} from "./tableAndLayoutPreferences";
import type {
	PaymentRefundCorrectionAction,
	PaymentRefundCorrectionMethod,
	ThemeMode,
} from "./types";

export function getSystemPreferredTheme(): "dark" | "light" {
	if (typeof window === "undefined" || !window.matchMedia) {
		return "light";
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function subscribeToSystemThemeChange(
	callback: (theme: "dark" | "light") => void,
): () => void {
	if (typeof window === "undefined" || !window.matchMedia) {
		return () => {};
	}
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	const handler = (e: MediaQueryListEvent) => {
		callback(e.matches ? "dark" : "light");
	};
	if (typeof mediaQuery.addEventListener === "function") {
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}
	// Fallback for older browsers
	mediaQuery.addListener(handler);
	return () => mediaQuery.removeListener(handler);
}

export function resolveEffectiveTheme(
	preference: ThemeMode | string,
): "dark" | "light" {
	if (preference === "system") {
		return getSystemPreferredTheme();
	}
	return preference === "dark" ? "dark" : "light";
}

export function applyThemeToDocument(theme: string): void {
	if (typeof document === "undefined") return;
	document.documentElement.setAttribute("data-theme", theme);
}

export function isOdontogramViewModePreference(
	value: unknown,
): value is OdontogramViewMode {
	return (
		value === "anatomical_svg" ||
		value === "compact_clinical" ||
		value === "classic_gost"
	);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
	return isRecordKey(value, paymentMethodLabels);
}

export function isPricelistSourceKind(
	value: unknown,
): value is PricelistSourceKind {
	return isRecordKey(value, pricelistSourceKindLabels);
}

export function isAiJobKind(value: unknown): value is AiJobKind {
	return (
		typeof value === "string" &&
		aiJobKindPreferenceValues.includes(value as AiJobKind)
	);
}

export function isAiRecognitionTarget(
	value: unknown,
): value is AiRecognitionTarget {
	return isRecordKey(value, recognitionTargetLabels);
}

export function isImagingSourceKind(
	value: unknown,
): value is ImagingSourceKind {
	return isRecordKey(value, imagingSourceLabels);
}

export function isImagingKindFilter(
	value: unknown,
): value is ImagingStudyKind | "all" {
	return value === "all" || isRecordKey(value, imagingKindLabels);
}

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

export function isAppointmentStatusFilterPreference(
	value: unknown,
): value is Appointment["status"] | "all" {
	return value === "all" || isRecordKey(value, appointmentLabels);
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
): value is "paper_signed" | "simple_electronic_signature" | "qualified_electronic_signature" {
	return (
		value === "paper_signed" ||
		value === "simple_electronic_signature" ||
		value === "qualified_electronic_signature"
	);
}

export function isOnboardingStepPreference(
	value: unknown,
): value is OnboardingStep {
	return (
		typeof value === "string" &&
		onboardingStepValues.includes(value as OnboardingStep)
	);
}

export function normalizedTreatmentPlanAcceptanceVariant(
	value: unknown,
): TreatmentPlanAcceptanceVariant {
	return isStringUnionValue(value, treatmentAcceptanceVariantOptions)
		? value
		: "standard";
}

export function normalizedPostVisitCareTopic(
	value: unknown,
): PostVisitCareTopic {
	return isPostVisitCareTopicPreference(value)
		? value
		: defaultUiPreferences.postVisitCareTopic;
}

export function normalizedPaymentRefundCorrectionAction(
	value: unknown,
): PaymentRefundCorrectionAction {
	return isStringUnionValue(value, paymentRefundCorrectionActionOptions)
		? value
		: "partial_refund";
}

export function normalizedPaymentRefundCorrectionMethod(
	value: unknown,
): PaymentRefundCorrectionMethod {
	return isStringUnionValue(value, paymentRefundCorrectionMethodOptions)
		? value
		: "card";
}

export function normalizedClinicalRuleAction(
	value: unknown,
): Dashboard["clinicalRules"][number]["action"] {
	return isRecordKey(value, clinicalRuleActionLabels)
		? value
		: "add_required_service";
}

export function normalizedClinicalRuleSeverity(
	value: unknown,
): Dashboard["clinicalRules"][number]["severity"] {
	return isRecordKey(value, clinicalRuleSeverityLabels) ? value : "warning";
}

export function normalizedServiceCategory(
	value: unknown,
): Dashboard["serviceCatalog"][number]["category"] {
	return isRecordKey(value, serviceCategoryLabels) ? value : "therapy";
}

export function normalizeUiPreferencesPayload(
	parsed: unknown,
): UiPreferences | null {
	if (
		!parsed ||
		typeof parsed !== "object" ||
		(parsed as { version?: unknown }).version !== 1
	) {
		return null;
	}
	const source = parsed as Record<string, unknown>;
	const legacyIssueSignatureDraft = loadDocumentIssueSignatureDraft();
	return {
		version: 1,
		uiLanguage: pickUiPreference(
			source,
			"uiLanguage",
			defaultUiPreferences.uiLanguage,
			isUiLanguage,
		),
		selectedWorkspaceRole: pickUiPreference(
			source,
			"selectedWorkspaceRole",
			defaultUiPreferences.selectedWorkspaceRole,
			isStaffRole,
		),
		selectedSpecialty: pickUiPreference(
			source,
			"selectedSpecialty",
			defaultUiPreferences.selectedSpecialty,
			isDentalSpecialty,
		),
		selectedProtocolId: pickUiPreference(
			source,
			"selectedProtocolId",
			defaultUiPreferences.selectedProtocolId,
			isNullablePreferenceString,
		),
		selectedPatientId: pickUiPreference(
			source,
			"selectedPatientId",
			defaultUiPreferences.selectedPatientId,
			isNullablePreferenceString,
		),
		scheduleDoctorFilterId: pickUiPreference(
			source,
			"scheduleDoctorFilterId",
			defaultUiPreferences.scheduleDoctorFilterId,
			isNullablePreferenceString,
		),
		scheduleAssistantFilterId: pickUiPreference(
			source,
			"scheduleAssistantFilterId",
			defaultUiPreferences.scheduleAssistantFilterId,
			isNullablePreferenceString,
		),
		scheduleChairFilterId: pickUiPreference(
			source,
			"scheduleChairFilterId",
			defaultUiPreferences.scheduleChairFilterId,
			isNullablePreferenceString,
		),
		scheduleDefaultDoctorUserId: pickUiPreference(
			source,
			"scheduleDefaultDoctorUserId",
			defaultUiPreferences.scheduleDefaultDoctorUserId,
			isNullablePreferenceString,
		),
		scheduleDefaultAssistantUserId: pickUiPreference(
			source,
			"scheduleDefaultAssistantUserId",
			defaultUiPreferences.scheduleDefaultAssistantUserId,
			isNullablePreferenceString,
		),
		scheduleDefaultChairId: pickUiPreference(
			source,
			"scheduleDefaultChairId",
			defaultUiPreferences.scheduleDefaultChairId,
			isNullablePreferenceString,
		),
		scheduleStatusFilter: pickUiPreference(
			source,
			"scheduleStatusFilter",
			defaultUiPreferences.scheduleStatusFilter,
			isAppointmentStatusFilterPreference,
		),
		scheduleDateFilter: (() => {
			const val = pickUiPreference(
				source,
				"scheduleDateFilter",
				defaultUiPreferences.scheduleDateFilter,
				isBoundedPreferenceString,
			);
			if (val) {
				const d = new Date();
				const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
				if (val <= todayIso) return "";
			}
			return val;
		})(),
		paymentMethod: pickUiPreference(
			source,
			"paymentMethod",
			defaultUiPreferences.paymentMethod,
			isPaymentMethod,
		),
		taxDocumentYear: pickUiPreference(
			source,
			"taxDocumentYear",
			defaultUiPreferences.taxDocumentYear,
			isTaxDocumentYearPreference,
		),
		selectedDocumentKind: pickUiPreference(
			source,
			"selectedDocumentKind",
			defaultUiPreferences.selectedDocumentKind,
			isDocumentKindPreference,
		),
		taxApplicationForm: pickUiPreference(
			source,
			"taxApplicationForm",
			defaultUiPreferences.taxApplicationForm,
			isTaxApplicationFormPreference,
		),
		taxApplicationDeliveryChannel: pickUiPreference(
			source,
			"taxApplicationDeliveryChannel",
			defaultUiPreferences.taxApplicationDeliveryChannel,
			isTaxApplicationDeliveryChannelPreference,
		),
		paymentReceiptTaxSupportRequested: pickUiPreference(
			source,
			"paymentReceiptTaxSupportRequested",
			defaultUiPreferences.paymentReceiptTaxSupportRequested,
			isBooleanPreference,
		),
		documentIssueSignatureMode: pickUiPreference(
			source,
			"documentIssueSignatureMode",
			legacyIssueSignatureDraft.mode,
			isDocumentIssueSignatureModePreference,
		),
		documentIssueStaffFullName: pickUiPreference(
			source,
			"documentIssueStaffFullName",
			legacyIssueSignatureDraft.staffFullName,
			isBoundedPreferenceString,
		).slice(0, 160),
		documentIssueStaffRole:
			pickUiPreference(
				source,
				"documentIssueStaffRole",
				legacyIssueSignatureDraft.staffRole,
				isBoundedPreferenceString,
			).slice(0, 120) || defaultUiPreferences.documentIssueStaffRole,
		procedureConsentProcedureType: pickUiPreference(
			source,
			"procedureConsentProcedureType",
			defaultUiPreferences.procedureConsentProcedureType,
			isProcedureSpecificConsentProcedurePreference,
		),
		postVisitCareTopic: pickUiPreference(
			source,
			"postVisitCareTopic",
			defaultUiPreferences.postVisitCareTopic,
			isPostVisitCareTopicPreference,
		),
		pricelistSourceKind: pickUiPreference(
			source,
			"pricelistSourceKind",
			defaultUiPreferences.pricelistSourceKind,
			isPricelistSourceKind,
		),
		usePricelistAi: pickUiPreference(
			source,
			"usePricelistAi",
			defaultUiPreferences.usePricelistAi,
			isBooleanPreference,
		),
		odontogramUseSurfaces: pickUiPreference(
			source,
			"odontogramUseSurfaces",
			defaultUiPreferences.odontogramUseSurfaces,
			isBooleanPreference,
		),
		odontogramViewMode: pickUiPreference(
			source,
			"odontogramViewMode",
			defaultUiPreferences.odontogramViewMode,
			isOdontogramViewModePreference,
		),
		recognitionKind: pickUiPreference(
			source,
			"recognitionKind",
			defaultUiPreferences.recognitionKind,
			isAiJobKind,
		),
		recognitionTarget: pickUiPreference(
			source,
			"recognitionTarget",
			defaultUiPreferences.recognitionTarget,
			isAiRecognitionTarget,
		),
		importSourceKind: pickUiPreference(
			source,
			"importSourceKind",
			defaultUiPreferences.importSourceKind,
			isImportSourceKind,
		),
		documentIngestionTarget: pickUiPreference(
			source,
			"documentIngestionTarget",
			defaultUiPreferences.documentIngestionTarget,
			isDocumentIngestionTarget,
		),
		imagingImportSourceKind: pickUiPreference(
			source,
			"imagingImportSourceKind",
			defaultUiPreferences.imagingImportSourceKind,
			isImagingSourceKind,
		),
		smartImportMode: pickUiPreference(
			source,
			"smartImportMode",
			defaultUiPreferences.smartImportMode,
			isSmartImportMode,
		),
		imagingKindFilter: pickUiPreference(
			source,
			"imagingKindFilter",
			defaultUiPreferences.imagingKindFilter,
			isImagingKindFilter,
		),
		dicomWebEndpointUrl: pickUiPreference(
			source,
			"dicomWebEndpointUrl",
			defaultUiPreferences.dicomWebEndpointUrl,
			isBoundedPreferenceString,
		),
		ohifBaseUrl: pickUiPreference(
			source,
			"ohifBaseUrl",
			defaultUiPreferences.ohifBaseUrl,
			isBoundedPreferenceString,
		),
		telegramBotConfigId: pickUiPreference(
			source,
			"telegramBotConfigId",
			defaultUiPreferences.telegramBotConfigId,
			isBoundedPreferenceString,
		)
			.trim()
			.slice(0, 160),
		telegramLinkSubjectType: pickUiPreference(
			source,
			"telegramLinkSubjectType",
			defaultUiPreferences.telegramLinkSubjectType,
			isTelegramLinkSubjectTypePreference,
		),
		telegramLinkStaffId: pickUiPreference(
			source,
			"telegramLinkStaffId",
			defaultUiPreferences.telegramLinkStaffId,
			isNullablePreferenceString,
		),
		telegramOutboxStatusFilter: pickUiPreference(
			source,
			"telegramOutboxStatusFilter",
			defaultUiPreferences.telegramOutboxStatusFilter,
			isTelegramOutboxStatusFilterPreference,
		),
		telegramOutboxTemplateFilter: pickUiPreference(
			source,
			"telegramOutboxTemplateFilter",
			defaultUiPreferences.telegramOutboxTemplateFilter,
			isTelegramOutboxTemplateFilterPreference,
		),
		onboardingDismissed: pickUiPreference(
			source,
			"onboardingDismissed",
			defaultUiPreferences.onboardingDismissed,
			isBooleanPreference,
		),
		onboardingDismissedAt: pickUiPreference(
			source,
			"onboardingDismissedAt",
			defaultUiPreferences.onboardingDismissedAt,
			isNullablePreferenceString,
		),
		onboardingStep: pickUiPreference(
			source,
			"onboardingStep",
			defaultUiPreferences.onboardingStep,
			isOnboardingStepPreference,
		),
		onboardingDraftMode: pickUiPreference(
			source,
			"onboardingDraftMode",
			defaultUiPreferences.onboardingDraftMode,
			isBooleanPreference,
		),
		soundNotificationsMuted: pickUiPreference(
			source,
			"soundNotificationsMuted",
			defaultUiPreferences.soundNotificationsMuted,
			isBooleanPreference,
		),
		savedAt: typeof source.savedAt === "string" ? source.savedAt : "",
	};
}

export function withSavedUiPreferenceTimestamp(
	preferences: UiPreferencesInput,
): UiPreferences {
	return {
		version: 1,
		...preferences,
		savedAt: new Date().toISOString(),
	};
}

export async function loadServerUiPreferences(
	adminSecret?: string,
): Promise<UiPreferences | null> {
	const response = await fetch(uiPreferencesServerPath, {
		headers: denteAdminSecretRequestHeaders({}, adminSecret),
	});
	if (!response.ok) return null;
	const payload = (await response.json()) as { preferences?: unknown };
	return normalizeUiPreferencesPayload(payload.preferences) ?? null;
}

export async function saveServerUiPreferences(
	preferences: UiPreferences,
	adminSecret?: string,
): Promise<void> {
	const response = await fetch(uiPreferencesServerPath, {
		method: "PUT",
		headers: denteAdminSecretRequestHeaders(
			{ "Content-Type": "application/json" },
			adminSecret,
		),
		body: JSON.stringify(preferences),
	});
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(response, "Настройки интерфейса не сохранены"),
		);
	}
}

export { defaultUiLanguageOption };

export {
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
};
