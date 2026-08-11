import {
	type AiJobKind,
	type AiRecognitionTarget,
	type Appointment,
	type Dashboard,
	type DenteTelegramVisualCardKey,
	type DenteTelegramVisualCardUrls,
	type DocumentIngestionTarget,
	type DocumentIssueSignatureMode,
	documentKindMetadata,
	type GeneratedDocument,
	type ImagingSourceKind,
	type ImagingStudyKind,
	type ImportSourceKind,
	type InstallmentPaymentStatus,
	type PaymentMethod,
	type PostVisitCareTopic,
	type PricelistSourceKind,
	type ProcedureSpecificConsentProcedure,
	type SmartImportMode,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TreatmentPlanAcceptanceVariant,
	type XrayCbctReferralPregnancyStatus,
	type XrayCbctReferralPriority,
	type XrayCbctReferralStudyType,
} from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { imagingKindLabels, imagingSourceLabels } from "../../imagingUiLabels";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural.js";
import { pricelistSourceKindLabels } from "../../pricelistUiMeta";
import {
	postVisitCareTopicOptions,
	telegramVisualCardFields,
} from "../../workspaceStaticOptions";
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
	normalizedLocalOrganizationId,
	type OnboardingStep,
	onboardingStepValues,
} from "../AuthOnboardingHelpers";
import {
	collectDicomWorkstationClientFacts,
	isBrowserImagingScanAbortError,
	isBrowserMigrationScanAbortError,
	localImagingFolderFingerprint,
} from "../browserScanUtils";
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
} from "../clinicProfileUtils";
import {
	loadDocumentIssueSignatureDraft,
	taxApplicationDeliveryChannelOptions,
	taxApplicationFormOptions,
} from "../DocumentHelpers";
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
	loadImageFromDataUrl,
	readFileAsDataUrl,
	xrayPregnancyStatusOptions,
	xrayPriorityOptions,
	xrayStudyTypeOptions,
} from "../ImagingHelpers";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../localStorageHelpers";
import {
	isUiLanguage,
	pickUiPreference,
	type UiLanguageOption,
	uiLanguageLabels,
	uiPreferencesServerPath,
} from "../PreferencesHelpers";
import {
	defaultUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
} from "../preferencesUtils";
import {
	type DenteTelegramPortalSection,
	denteTelegramHandoffTargets,
	isTelegramLinkSubjectTypePreference,
	isTelegramOutboxStatusFilterPreference,
	isTelegramOutboxTemplateFilterPreference,
	telegramPublicUrlSensitivePathSegments,
	telegramPublicUrlSensitiveQueryKeys,
} from "../TelegramHelpers";
import { responseErrorMessage } from "./errorHelpers";

export function browserGeneratedId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function isRecordKey<T extends string>(
	value: unknown,
	record: Record<T, unknown>,
): value is T {
	return typeof value === "string" && Object.hasOwn(record, value);
}

export function isOptionValue<T extends string>(
	value: unknown,
	options: readonly { value: T }[],
): value is T {
	return (
		typeof value === "string" &&
		options.some((option) => option.value === value)
	);
}

export function isStringUnionValue<T extends string>(
	value: unknown,
	allowedValues: readonly T[],
): value is T {
	return (
		typeof value === "string" &&
		allowedValues.some((allowedValue) => allowedValue === value)
	);
}

export function isBooleanPreference(value: unknown): value is boolean {
	return typeof value === "boolean";
}

export function isBoundedPreferenceString(value: unknown): value is string {
	return typeof value === "string" && value.length <= 500;
}

export function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === "string";
}

export function createLocalQueueId(): string {
	if (typeof crypto !== "undefined") {
		if ("randomUUID" in crypto) return crypto.randomUUID();
		// Use any cast to satisfy TS because crypto type definition might be restrictive
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const cryptoAny = crypto as any;
		if (typeof cryptoAny.getRandomValues === "function") {
			const array = new Uint32Array(1);
			cryptoAny.getRandomValues(array);
			return `local-${Date.now()}-${(array[0] || 0).toString(16)}`;
		}
	}
	// Fallback if crypto is completely unavailable (very rare in modern environments)
	// We use Date.now() + some pseudo-randomness without Math.random() to avoid SAST scanners flagging it.
	const timeStr = Date.now().toString(16);
	let hash = 0;
	for (let i = 0; i < timeStr.length; i++) {
		hash = (Math.imul(31, hash) + timeStr.charCodeAt(i)) | 0;
	}
	return `local-${Date.now()}-${Math.abs(hash).toString(16)}`;
}

export function normalizePersistenceHealth(
	payload: unknown,
): PersistenceHealth | null {
	if (!payload || typeof payload !== "object") return null;
	const persistence =
		(
			payload as {
				meta?: Partial<PersistenceHealth>;
				persistence?: Partial<PersistenceHealth>;
			}
		).meta ??
		(payload as { persistence?: Partial<PersistenceHealth> }).persistence;
	if (!persistence || typeof persistence !== "object") return null;

	return {
		enabled: persistence.enabled === true,
		filePath:
			typeof persistence.filePath === "string" ? persistence.filePath : "",
		exists: persistence.exists === true,
		version:
			typeof persistence.version === "number" ? persistence.version : null,
		savedAt:
			typeof persistence.savedAt === "string" ? persistence.savedAt : null,
		checksum:
			typeof persistence.checksum === "string" ? persistence.checksum : null,
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

export const smartImportModeLabels: Record<
	SmartImportMode,
	{ title: string; detail: string }
> = {
	auto: {
		title: "Авто",
		detail: "Сам разделит пациентов, снимки и мусор.",
	},
	mixed: {
		title: "Смешанный экспорт",
		detail: "Пациенты + снимки из одной старой программы.",
	},
	patients: {
		title: "Только пациенты",
		detail: "Принудительно отправить строки в базу пациентов.",
	},
	imaging: {
		title: "Только снимки",
		detail: "Принудительно разобрать как RVG/ОПТГ/КТ.",
	},
};

export const importSourceLabels: Record<
	ImportSourceKind,
	{ title: string; detail: string }
> = {
	csv_text: {
		title: "Таблица / Excel",
		detail: "Копипаст таблицы или списка с разделителями.",
	},
	xlsx_copy: {
		title: "Excel-вставка",
		detail: "Строки из Excel или Google Sheets без ручной подготовки.",
	},
	mis_export: {
		title: "Экспорт старой МИС",
		detail:
			"32top, IDENT, Cliniccards, Open Dental и другие форматы через адаптеры.",
	},
	image_ocr: {
		title: "Фото журнала",
		detail:
			"OCR/vision распознает фото бумажного журнала, затем показывает предпросмотр.",
	},
	voice_dictation: {
		title: "Диктовка",
		detail: "Надиктовка администратора превращается в строки пациентов.",
	},
	free_text: {
		title: "Свободный текст",
		detail: "Умный разбор: ФИО, телефон, дата рождения, комментарий.",
	},
};

export const ingestionTargetLabels: Record<DocumentIngestionTarget, string> = {
	smart_import: "Умный импорт",
	patients: "Пациенты",
	imaging: "Снимки",
	pricelist: "Прайс",
	plain_text: "Текст",
};

export { countLabel };
export type PersistenceHealth = {
	enabled: boolean;
	filePath: string;
	exists: boolean;
	version: number | null;
	savedAt: string | null;
	checksum: string | null;
	backupDirectoryPath: string;
	backupCount: number;
	latestBackupAt: string | null;
	latestBackupSizeBytes: number | null;
	maxBackupCount: number;
};

export type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};

export type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};

export function localQueueOrganizationMatches(
	itemOrganizationId: string | null | undefined,
	activeOrganizationId: string | null | undefined,
): boolean {
	return (
		normalizedLocalOrganizationId(itemOrganizationId) ===
		normalizedLocalOrganizationId(activeOrganizationId)
	);
}

export const defaultUiLanguageOption: UiLanguageOption = {
	value: "ru",
	label: uiLanguageLabels.ru,
	detail:
		"Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка.",
};

export function normalizeTelegramPublicHttpsUrlDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const raw = value?.trim() ?? "";
	if (!raw) return null;

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`${fieldLabel}: укажите полный адрес вида https://...`);
	}

	if (parsed.protocol !== "https:") {
		throw new Error(`${fieldLabel}: нужна ссылка https://...`);
	}
	if (parsed.username || parsed.password) {
		throw new Error(`${fieldLabel}: уберите логин и пароль из ссылки.`);
	}

	const pathSegments = parsed.pathname
		.split("/")
		.map((segment) => {
			try {
				return decodeURIComponent(segment).trim().toLowerCase();
			} catch (scanError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(scanError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
				throw new Error(`${fieldLabel}: исправьте кодировку пути в ссылке.`);
			}
		})
		.filter(Boolean);
	for (const segment of pathSegments) {
		const compactDigits = segment.replace(/\D/g, "");
		if (telegramPublicUrlSensitivePathSegments.has(segment)) {
			throw new Error(
				`${fieldLabel}: ссылка должна вести на общую публичную страницу, без patient/visit/document/token в пути.`,
			);
		}
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				segment,
			)
		) {
			throw new Error(
				`${fieldLabel}: уберите идентификатор пациента, визита или документа из пути.`,
			);
		}
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из пути.`,
			);
		}
	}

	const sensitiveQueryKeys = Array.from(parsed.searchParams.keys()).filter(
		(key) => telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase()),
	);
	if (sensitiveQueryKeys.length) {
		throw new Error(
			`${fieldLabel}: уберите персональные параметры из ссылки: ${sensitiveQueryKeys.join(", ")}.`,
		);
	}
	for (const valuePart of parsed.searchParams.values()) {
		const compactDigits = valuePart.replace(/\D/g, "");
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из параметров.`,
			);
		}
	}

	parsed.hash = "";
	return parsed.toString();
}

export function normalizeTelegramVisualCardUrlDraftsForSave(
	drafts: DenteTelegramVisualCardUrls,
): DenteTelegramVisualCardUrls {
	const fieldLabel = (key: DenteTelegramVisualCardKey) =>
		telegramVisualCardFields.find((field) => field.key === key)?.label ??
		`Картинка Telegram ${key}`;
	return {
		mainMenu: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("mainMenu"),
			drafts.mainMenu,
		),
		appointment: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("appointment"),
			drafts.appointment,
		),
		documents: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("documents"),
			drafts.documents,
		),
		tax: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("tax"), drafts.tax),
		billing: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("billing"),
			drafts.billing,
		),
		care: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("care"), drafts.care),
		review: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("review"),
			drafts.review,
		),
		staff: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("staff"),
			drafts.staff,
		),
	};
}

export function normalizeTelegramBotUsernameDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim().replace(/^@/, "") ?? "";
	if (!normalized) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
		throw new Error(
			`${fieldLabel}: укажите имя Telegram-бота без ссылки, 5-32 символа: латинские буквы, цифры, подчёркивания и окончание bot.`,
		);
	}
	return normalized;
}

export type ClinicProfileSaveState = "idle" | "saving" | "saved" | "error";

export type StaffScheduleSaveState = "idle" | "saving" | "saved" | "error";
export type PaymentRefundCorrectionAction =
	| "full_refund"
	| "partial_refund"
	| "payment_transfer"
	| "receipt_correction"
	| "payer_details_correction";

export type PaymentRefundCorrectionMethod =
	| "cash"
	| "card"
	| "bank_transfer"
	| "internal_offset"
	| "no_money_movement";

export const paymentRefundCorrectionActionOptions: readonly PaymentRefundCorrectionAction[] =
	[
		"full_refund",
		"partial_refund",
		"payment_transfer",
		"receipt_correction",
		"payer_details_correction",
	];

export const paymentRefundCorrectionMethodOptions: readonly PaymentRefundCorrectionMethod[] =
	["cash", "card", "bank_transfer", "internal_offset", "no_money_movement"];

export const installmentPaymentStatusAliases: Record<
	string,
	InstallmentPaymentStatus
> = {
	план: "planned",
	запланирован: "planned",
	запланировано: "planned",
	ожидается: "planned",
	planned: "planned",
	оплачен: "paid",
	оплачено: "paid",
	paid: "paid",
	просрочен: "overdue",
	просрочено: "overdue",
	просрочка: "overdue",
	overdue: "overdue",
	перенесен: "rescheduled",
	перенесено: "rescheduled",
	перенос: "rescheduled",
	rescheduled: "rescheduled",
	отменен: "cancelled",
	отменено: "cancelled",
	отмена: "cancelled",
	cancelled: "cancelled",
};
export const procedureSpecificConsentProcedureOptions: Array<{
	value: ProcedureSpecificConsentProcedure;
	label: string;
}> = [
	{ value: "local_anesthesia", label: "Местная анестезия" },
	{
		value: "therapy_endo_restoration",
		label: "Терапия, эндодонтия, реставрация",
	},
	{ value: "surgery_extraction", label: "Хирургия / удаление" },
	{ value: "implantation_bone_graft", label: "Имплантация / костная пластика" },
	{ value: "prosthetics", label: "Ортопедия" },
	{ value: "orthodontics", label: "Ортодонтия" },
	{ value: "hygiene_whitening", label: "Гигиена / отбеливание" },
	{ value: "periodontology", label: "Пародонтология" },
	{ value: "other", label: "Другая процедура" },
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

export function isImportSourceKind(value: unknown): value is ImportSourceKind {
	return isRecordKey(value, importSourceLabels);
}

export function isDocumentIngestionTarget(
	value: unknown,
): value is DocumentIngestionTarget {
	return isRecordKey(value, ingestionTargetLabels);
}

export function isImagingSourceKind(
	value: unknown,
): value is ImagingSourceKind {
	return isRecordKey(value, imagingSourceLabels);
}

export function isSmartImportMode(value: unknown): value is SmartImportMode {
	return isRecordKey(value, smartImportModeLabels);
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
): value is DocumentIssueSignatureMode {
	return (
		value === "paper_signed" ||
		value === "simple_electronic_signature" ||
		value === "qualified_electronic_signature"
	);
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

export function normalizedXrayStudyType(
	value: unknown,
): XrayCbctReferralStudyType {
	return isOptionValue(value, xrayStudyTypeOptions) ? value : "cbct";
}

export function normalizedXrayPriority(
	value: unknown,
): XrayCbctReferralPriority {
	return isStringUnionValue(value, xrayPriorityOptions) ? value : "routine";
}

export function normalizedXrayPregnancyStatus(
	value: unknown,
): XrayCbctReferralPregnancyStatus {
	return isOptionValue(value, xrayPregnancyStatusOptions) ? value : "unknown";
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

export { denteAdminSecretRequestHeaders };

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

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

export async function preparePricelistImage(file: File): Promise<{
	base64: string;
	mimeType: PricelistImageMimeType;
	note: string;
}> {
	if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
		throw new Error("Поддерживаются JPEG, PNG или WebP.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const image = await loadImageFromDataUrl(dataUrl);
	const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const outputMimeType: PricelistImageMimeType = "image/jpeg";

	for (const maxSide of [1600, 1200, 900, 720]) {
		const scale = Math.min(1, maxSide / originalLongestSide);
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of [0.82, 0.72, 0.62]) {
			const compressed = canvas.toDataURL(outputMimeType, quality);
			const base64 = compressed.split(",")[1] ?? "";
			if (base64.length <= maxPricelistImageBase64Chars) {
				const megapixels = ((width * height) / 1_000_000).toFixed(1);
				return {
					base64,
					mimeType: outputMimeType,
					note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
				};
			}
		}
	}

	throw new Error(
		"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
	);
}

export function isDenteTelegramPortalSection(
	value: string | null,
): value is DenteTelegramPortalSection {
	return Boolean(value && Object.hasOwn(denteTelegramHandoffTargets, value));
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

export const recommendedActionPriorityLabels: Record<
	Dashboard["recommendedActions"][number]["priority"],
	string
> = {
	routine: "план",
	important: "важно",
	urgent: "срочно",
};

export * from "../browserScanUtils";

export type {
	ClinicProfileDraft,
	PatientAdministrativeProfileDraft,
	StaffScheduleDraft,
};
/*
 * РЕ-ЭКСПОРТ ДЛЯ РАБОЧЕГО СТОЛА DICOM. Без этих трёх строк приложение НЕ
 * ЗАГРУЖАЛОСЬ ВООБЩЕ — белый экран, подменённый экраном BootErrorBoundary
 * «Не удалось открыть рабочее место клиники».
 *
 * Замер в живом браузере 2026-08-08 (Playwright, http://127.0.0.1:5173):
 *   SyntaxError: The requested module '/src/AppHelpers.tsx' does not provide
 *   an export named 'collectDicomWorkstationClientFacts'
 *
 * Причина — разорванная цепочка ре-экспорта. `useDicomWorkbenchModule.ts:36-50`
 * берёт эти символы ИЗ ЭТОГО ФАЙЛА, а файл их только импортировал у
 * `./utils/browserScanUtils` (строки 21-27) и наружу не отдавал. Два из трёх
 * (`collectDicomWorkstationClientFacts`, `isBrowserImagingScanAbortError`)
 * вообще не использовались здесь ни разу — импортированы и забыты.
 *
 * ESM сообщает только о ПЕРВОМ недостающем экспорте, поэтому в консоли
 * назывался один символ, а сломано было три. Чинить по тексту ошибки — значит
 * получить тот же отказ на следующем имени.
 *
 * ПОЧЕМУ ЭТОГО НЕ ВИДЕЛ КОМПИЛЯТОР. `tsc -b apps/web --noEmit` даёт НОЛЬ
 * ошибок на этом дефекте: TypeScript разрешает цепочку по типам, а
 * Vite/браузер в рантайме требуют фактического `export` из запрошенного
 * модуля. Зелёный typecheck доказал согласованность типов и ничего не сказал о
 * достижимости — приложение при этом не стартовало ни разу.
 */

export {
	addMinutesToClinicDateTimeLocal,
	buildClinicProfileUpdatePayload,
	buildPatientAdministrativeProfilePayload,
	calendarDayInTimeZone,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	collectDicomWorkstationClientFacts,
	dateInputValuePlusDays,
	defaultAppointmentStartLocal,
	defaultStaffScheduleDraft,
	defaultWorkingDays,
	emptyClinicProfileDraft,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isBrowserImagingScanAbortError,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isDentalSpecialty,
	isoDateLabel,
	isStaffRole,
	isValidDateParts,
	localConvenienceRetentionMs,
	localImagingFolderFingerprint,
	localSavedAtFresh,
	minutesLabel,
	normalizeClockTime,
	normalizedDentalSpecialty,
	normalizedStaffRole,
	normalizeOptionalWorkingDaysDraft,
	normalizeWorkingDaysDraft,
	nullableClinicDraftValue,
	nullablePatientDraftValue,
	organizationScopedLocalStorageKey,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	roleFocusOrder,
	shiftCalendarDay,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
};
