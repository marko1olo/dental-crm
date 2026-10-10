import type {
	OnboardingDismissalState,
	OnboardingStep,
} from "./types.js";
import type { SettingsTabGroup } from "./clinicProfileHelpers.js";
import type {
	AiJobKind,
	AiRecognitionTarget,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImportSourceKind,
	OdontogramViewMode,
	SmartImportMode,
	UiLanguage,
	Dashboard,
} from "@dental/shared";
import {
	defaultUiPreferences,
	uiPreferencesStorageKey,
	loadUiPreferences,
	saveUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
} from "../utils/preferencesUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import {
	isStaffRole,
	isDentalSpecialty,
} from "../utils/clinicProfileUtils";
import { recognitionTargetLabels } from "../workspaceUiLabels";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	offlineDraftOrganizationKey,
	uiLanguageLabels,
	isUiLanguage,
	responseErrorMessage,
	isRecordKey,
} from "./uiFormatters.js";
import { isAppointmentStatusFilterPreference } from "./appointmentHelpers.js";
import {
	isPaymentMethod,
	isPricelistSourceKind,
} from "./financialHelpers.js";
import {
	loadDocumentIssueSignatureDraft,
	isDocumentKindPreference,
	isTaxApplicationFormPreference,
	isTaxApplicationDeliveryChannelPreference,
	isDocumentIssueSignatureModePreference,
	isProcedureSpecificConsentProcedurePreference,
	isPostVisitCareTopicPreference,
	isTaxDocumentYearPreference,
} from "./documentHelpers.js";
import {
	isImportSourceKind,
	isDocumentIngestionTarget,
	isImagingSourceKind,
	isSmartImportMode,
	isImagingKindFilter,
} from "./imagingHelpers.js";
import {
	isTelegramLinkSubjectTypePreference,
	isTelegramOutboxStatusFilterPreference,
	isTelegramOutboxTemplateFilterPreference,
} from "./telephonyHelpers.js";

export {
	defaultUiPreferences,
	loadUiPreferences,
	saveUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
	uiPreferencesStorageKey,
} from "../utils/preferencesUtils";

export const uiPreferencesServerPath = "/api/settings/preferences";

export const onboardingStorageKey = "dental-crm:onboarding:v1";

export function onboardingLocalKey(
	organizationId: string | null | undefined,
): string {
	return organizationScopedLocalStorageKey(
		onboardingStorageKey,
		organizationId,
	);
}

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

export const aiJobKindPreferenceValues: readonly AiJobKind[] = [
	"voice_transcription",
	"visit_note_draft",
	"image_summary",
	"document_draft",
	"paper_ocr",
];

export const aiJobKindLabels: Record<AiJobKind, string> = {
	voice_transcription: "диктовка врача",
	visit_note_draft: "черновик приема",
	image_summary: "описание снимка",
	document_draft: "черновик документа",
	paper_ocr: "разбор бумажного журнала",
};

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

export function isBooleanPreference(value: unknown): value is boolean {
	return typeof value === "boolean";
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

export function isBoundedPreferenceString(value: unknown): value is string {
	return typeof value === "string" && value.length <= 500;
}

export function isNullablePreferenceString(
	value: unknown,
): value is string | null {
	return value === null || isBoundedPreferenceString(value);
}

export function isOnboardingStepPreference(
	value: unknown,
): value is OnboardingStep {
	return (
		typeof value === "string" &&
		onboardingStepValues.includes(value as OnboardingStep)
	);
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
		scheduleDateFilter: pickUiPreference(
			source,
			"scheduleDateFilter",
			defaultUiPreferences.scheduleDateFilter,
			isBoundedPreferenceString,
		),
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

export function uiPreferencesSyncErrorMessage(_error: unknown): string {
	return "Настройки интерфейса сохранены только на этом устройстве. Серверная синхронизация повторится автоматически.";
}

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

export const workspaceScopeLabels: Record<
	Dashboard["clinicSettings"]["workspaceProfiles"][number]["scope"],
	string
> = {
	personal: "лично",
	clinic: "клиника",
	branch: "филиал",
	network: "сеть",
};

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

export const initialUiPreferences = {} as any;
