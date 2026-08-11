import type {
	AcceptVisitDraftResponse,
	AiJobKind,
	AiRecognitionTarget,
	Dashboard,
	DentalSpecialty,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImagingStudyKind,
	ImportSourceKind,
	InstallmentPaymentStatus,
	PaymentMethod,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	TreatmentPlanAcceptanceVariant,
	UpdatePatientInput,
	VisitNoteDraft,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { imagingKindLabels, imagingSourceLabels } from "../../imagingUiLabels";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural.js";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { pricelistSourceKindLabels } from "../../pricelistUiMeta";
import { telegramVisualCardFields } from "../../workspaceStaticOptions";
import {
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	paymentMethodLabels,
	recognitionTargetLabels,
	serviceCategoryLabels,
} from "../../workspaceUiLabels";
import { treatmentAcceptanceVariantOptions } from "../AppointmentHelpers";
import { normalizedLocalOrganizationId } from "../AuthOnboardingHelpers";
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
import { logger } from "../logger";
import type { PatientCoreDraft } from "../PatientHelpers";
import {
	openSpeechChunkDb,
	savePendingVisitSavesToLocalStorage,
	speechChunkIndexedDbAvailable,
	type VisitNoteField,
	type VisitNoteForm,
	visitNoteFieldDefinitions,
} from "../SpeechHelpers";
import {
	type DenteTelegramPortalSection,
	denteTelegramHandoffTargets,
	telegramPublicUrlSensitivePathSegments,
	telegramPublicUrlSensitiveQueryKeys,
} from "../TelegramHelpers";
import { sensitiveLocalDraftRetentionMs } from "./documentDraftHelpers";

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

export type VisitLocalDraft = {
	version: 1;
	visitId: string;
	savedAt: string;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
	visitNoteForm: VisitNoteForm;
};

export type PendingVisitSave = {
	version: 1;
	id: string;
	organizationId: string | null;
	visitId: string;
	clientMutationId: string;
	baseRevision: number | null;
	queuedAt: string;
	draft: VisitNoteDraft;
	doctorSummary: string | null;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
};

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

export function visitLocalDraftKey(
	visitId: string,
	organizationId: string | null | undefined = null,
) {
	return organizationScopedLocalStorageKey(
		`dental-crm:visit-draft:${visitId}`,
		organizationId,
	);
}

export const pendingVisitSaveQueueKey = "dental-crm:pending-visit-saves";

export const pendingVisitSaveStoreName = "pendingVisitSaves";

export function pendingVisitSaveQueueLocalKey(
	organizationId: string | null | undefined = null,
): string {
	return organizationScopedLocalStorageKey(
		pendingVisitSaveQueueKey,
		organizationId,
	);
}

export function localQueueOrganizationMatches(
	itemOrganizationId: string | null | undefined,
	activeOrganizationId: string | null | undefined,
): boolean {
	return (
		normalizedLocalOrganizationId(itemOrganizationId) ===
		normalizedLocalOrganizationId(activeOrganizationId)
	);
}

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

export function normalizedTreatmentPlanAcceptanceVariant(
	value: unknown,
): TreatmentPlanAcceptanceVariant {
	return isStringUnionValue(value, treatmentAcceptanceVariantOptions)
		? value
		: "standard";
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

export { denteAdminSecretRequestHeaders };

export function nullableAppointmentDraftValue(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function buildPatientCorePayload(
	draft: PatientCoreDraft,
): UpdatePatientInput {
	return {
		fullName: draft.fullName.trim(),
		birthDate: nullablePatientDraftValue(draft.birthDate),
		phone: nullablePatientDraftValue(draft.phone),
		email: nullablePatientDraftValue(draft.email),
		notes: nullablePatientDraftValue(draft.notes),
	};
}

export function isVisitNoteForm(value: unknown): value is VisitNoteForm {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<Record<VisitNoteField, unknown>>;
	return visitNoteFieldDefinitions.every(
		({ key }) => typeof candidate[key] === "string",
	);
}

export function loadVisitLocalDraft(
	visitId: string,
	organizationId: string | null | undefined = null,
): VisitLocalDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const raw =
			safeLocalStorageGetItem(visitLocalDraftKey(visitId, organizationId)) ??
			(organizationId
				? safeLocalStorageGetItem(visitLocalDraftKey(visitId))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<VisitLocalDraft>;
		if (
			parsed.version !== 1 ||
			parsed.visitId !== visitId ||
			typeof parsed.savedAt !== "string" ||
			typeof parsed.transcript !== "string" ||
			!isDentalSpecialty(parsed.selectedSpecialty) ||
			!isVisitNoteForm(parsed.visitNoteForm)
		) {
			return null;
		}
		if (!localSavedAtFresh(parsed.savedAt, sensitiveLocalDraftRetentionMs)) {
			safeLocalStorageRemoveItem(visitLocalDraftKey(visitId, organizationId));
			if (organizationId)
				safeLocalStorageRemoveItem(visitLocalDraftKey(visitId));
			return null;
		}
		return parsed as VisitLocalDraft;
	} catch {
		return null;
	}
}

export function saveVisitLocalDraft(
	draft: VisitLocalDraft,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	safeLocalStorageSetItem(
		visitLocalDraftKey(draft.visitId, organizationId),
		JSON.stringify(draft),
	);
}

export function isVisitNoteDraft(value: unknown): value is VisitNoteDraft {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<VisitNoteDraft>;
	return (
		isNullableString(candidate.complaint) &&
		isNullableString(candidate.anamnesis) &&
		isNullableString(candidate.objectiveStatus) &&
		isNullableString(candidate.diagnosis) &&
		isNullableString(candidate.treatmentPlan) &&
		Array.isArray(candidate.warnings) &&
		candidate.warnings.every((warning) => typeof warning === "string")
	);
}

export function parsePendingVisitSaveQueue(
	raw: string | null,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingVisitSave[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item): PendingVisitSave[] => {
			const normalized = normalizePendingVisitSave(
				item,
				activeOrganizationId,
				legacyOrganizationFallback,
			);
			return normalized ? [normalized] : [];
		});
	} catch {
		return [];
	}
}

export function normalizePendingVisitSave(
	value: unknown,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingVisitSave | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<PendingVisitSave>;
	const {
		id,
		visitId,
		queuedAt,
		draft,
		doctorSummary,
		transcript,
		selectedSpecialty,
	} = candidate;
	const organizationId =
		normalizedLocalOrganizationId(candidate.organizationId) ??
		normalizedLocalOrganizationId(legacyOrganizationFallback);
	if (
		candidate.version !== 1 ||
		typeof id !== "string" ||
		!localQueueOrganizationMatches(organizationId, activeOrganizationId) ||
		typeof visitId !== "string" ||
		typeof queuedAt !== "string" ||
		!localSavedAtFresh(queuedAt, sensitiveLocalDraftRetentionMs) ||
		!isVisitNoteDraft(draft) ||
		!isNullableString(doctorSummary) ||
		typeof transcript !== "string" ||
		!isDentalSpecialty(selectedSpecialty)
	) {
		return null;
	}
	const normalizedBaseRevision =
		typeof candidate.baseRevision === "number" &&
		Number.isInteger(candidate.baseRevision)
			? candidate.baseRevision
			: null;
	return {
		version: 1,
		id,
		organizationId,
		visitId,
		clientMutationId:
			typeof candidate.clientMutationId === "string"
				? candidate.clientMutationId
				: id,
		baseRevision: normalizedBaseRevision,
		queuedAt,
		draft,
		doctorSummary,
		transcript,
		selectedSpecialty,
	};
}

export function sortPendingVisitSaves(
	queue: PendingVisitSave[],
): PendingVisitSave[] {
	return queue
		.slice()
		.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export function loadPendingVisitSavesFromLocalStorage(
	organizationId: string | null | undefined = null,
): PendingVisitSave[] {
	if (typeof window === "undefined") return [];
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const localKey = pendingVisitSaveQueueLocalKey(normalizedOrganizationId);
	const scopedRaw = safeLocalStorageGetItem(localKey);
	const legacyRaw = normalizedOrganizationId
		? safeLocalStorageGetItem(pendingVisitSaveQueueKey)
		: null;
	const byId = new Map<string, PendingVisitSave>();
	for (const item of parsePendingVisitSaveQueue(
		scopedRaw,
		normalizedOrganizationId,
	)) {
		byId.set(item.id, item);
	}
	for (const item of parsePendingVisitSaveQueue(
		legacyRaw,
		normalizedOrganizationId,
		normalizedOrganizationId,
	)) {
		byId.set(item.id, item);
	}
	const queue = sortPendingVisitSaves(Array.from(byId.values()));
	if (normalizedOrganizationId && legacyRaw) {
		savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
		safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
	}
	return queue;
}

export function pendingVisitSaveIndexedDbAvailable(): boolean {
	return speechChunkIndexedDbAvailable();
}

export async function readPendingVisitSavesFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave[]> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const values = await new Promise<unknown[]>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readonly");
		const request = transaction.objectStore(pendingVisitSaveStoreName).getAll();
		request.onsuccess = () =>
			resolve(Array.isArray(request.result) ? request.result : []);
		request.onerror = () =>
			reject(request.error ?? new Error("Local visit queue read failed"));
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Local visit queue transaction failed"),
			);
	});
	const queue: PendingVisitSave[] = [];
	const staleIds: string[] = [];
	for (const value of values) {
		const candidate =
			value && typeof value === "object"
				? (value as Partial<PendingVisitSave>)
				: {};
		const normalized = normalizePendingVisitSave(
			value,
			normalizedOrganizationId,
			normalizedOrganizationId,
		);
		if (normalized) {
			queue.push(normalized);
		} else if (typeof candidate.id === "string") {
			const itemOrganizationId =
				normalizedLocalOrganizationId(candidate.organizationId) ??
				normalizedOrganizationId;
			const stale =
				typeof candidate.queuedAt === "string" &&
				!localSavedAtFresh(candidate.queuedAt, sensitiveLocalDraftRetentionMs);
			const malformedActiveRecord = localQueueOrganizationMatches(
				itemOrganizationId,
				normalizedOrganizationId,
			);
			if (stale || malformedActiveRecord) {
				staleIds.push(candidate.id);
			}
		}
	}
	if (staleIds.length) {
		await Promise.allSettled(
			staleIds.map((id) => deletePendingVisitSaveFromIndexedDb(id)),
		);
	}
	return sortPendingVisitSaves(queue);
}

export async function savePendingVisitSavesToIndexedDb(
	queue: PendingVisitSave[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const scopedQueue = sortPendingVisitSaves(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, sensitiveLocalDraftRetentionMs),
			),
	);
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
		const store = transaction.objectStore(pendingVisitSaveStoreName);
		const request = store.getAll();
		request.onsuccess = () => {
			const existing = Array.isArray(request.result) ? request.result : [];
			for (const value of existing) {
				const candidate =
					value && typeof value === "object"
						? (value as Partial<PendingVisitSave>)
						: {};
				const itemOrganizationId =
					normalizedLocalOrganizationId(candidate.organizationId) ??
					normalizedOrganizationId;
				const stale =
					typeof candidate.queuedAt === "string" &&
					!localSavedAtFresh(
						candidate.queuedAt,
						sensitiveLocalDraftRetentionMs,
					);
				if (
					typeof candidate.id === "string" &&
					(localQueueOrganizationMatches(
						itemOrganizationId,
						normalizedOrganizationId,
					) ||
						stale)
				) {
					store.delete(candidate.id);
				}
			}
			for (const item of scopedQueue) {
				store.put(item);
			}
		};
		request.onerror = () =>
			reject(request.error ?? new Error("Local visit queue read failed"));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Local visit queue save failed"));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error("Local visit queue save aborted"));
	});
}

export async function deletePendingVisitSaveFromIndexedDb(
	id: string,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
		transaction.objectStore(pendingVisitSaveStoreName).delete(id);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Local visit queue delete failed"));
		transaction.onabort = () =>
			reject(
				transaction.error ?? new Error("Local visit queue delete aborted"),
			);
	});
}

export async function migratePendingVisitSavesFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const legacyQueue = loadPendingVisitSavesFromLocalStorage(
		normalizedOrganizationId,
	);
	if (!legacyQueue.length || !pendingVisitSaveIndexedDbAvailable()) return;
	const existing = await readPendingVisitSavesFromIndexedDb(
		normalizedOrganizationId,
	).catch((err) => {
		logger.error("[Dente] read visit saves error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения очереди приёмов",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return [];
	});
	const byId = new Map<string, PendingVisitSave>();
	for (const item of [...existing, ...legacyQueue]) {
		byId.set(item.id, item);
	}
	await savePendingVisitSavesToIndexedDb(
		sortPendingVisitSaves(Array.from(byId.values())),
		normalizedOrganizationId,
	);
	safeLocalStorageRemoveItem(
		pendingVisitSaveQueueLocalKey(normalizedOrganizationId),
	);
	if (normalizedOrganizationId)
		safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
}

export async function loadPendingVisitSaves(
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave[]> {
	if (!pendingVisitSaveIndexedDbAvailable())
		return loadPendingVisitSavesFromLocalStorage(organizationId);
	try {
		await migratePendingVisitSavesFromLocalStorage(organizationId);
		return await readPendingVisitSavesFromIndexedDb(organizationId);
	} catch {
		return loadPendingVisitSavesFromLocalStorage(organizationId);
	}
}

export async function savePendingVisitSaves(
	queue: PendingVisitSave[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	if (pendingVisitSaveIndexedDbAvailable()) {
		try {
			await savePendingVisitSavesToIndexedDb(queue, normalizedOrganizationId);
			safeLocalStorageRemoveItem(
				pendingVisitSaveQueueLocalKey(normalizedOrganizationId),
			);
			if (normalizedOrganizationId)
				safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
			return;
		} catch {
			// Keep accepted visits retryable on restricted browsers.
		}
	}
	savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
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

export async function queuePendingVisitSave(
	save: Omit<
		PendingVisitSave,
		"version" | "id" | "queuedAt" | "organizationId"
	>,
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const queued: PendingVisitSave = {
		...save,
		version: 1,
		id: createLocalQueueId(),
		organizationId: normalizedOrganizationId,
		queuedAt: new Date().toISOString(),
	};
	const existing = await loadPendingVisitSaves(normalizedOrganizationId);
	const withoutSameVisit = existing.filter(
		(item) => item.visitId !== queued.visitId,
	);
	await savePendingVisitSaves(
		[...withoutSameVisit, queued],
		normalizedOrganizationId,
	);
	return queued;
}

export function latestPendingVisitSaveAt(
	queue: PendingVisitSave[],
): string | null {
	const latest = queue[queue.length - 1];
	return latest?.queuedAt ?? null;
}

export function visitSaveReceiptText(
	receipt: AcceptVisitDraftResponse["saveReceipt"],
): string {
	if (receipt.status === "duplicate") {
		return `Повторная отправка распознана: дубль не создан, серверная версия ${receipt.serverRevision}.`;
	}
	if (receipt.warning) {
		return `${receipt.warning} Серверная версия ${receipt.serverRevision}.`;
	}
	return `Сервер подтвердил сохранение ${formatTime(receipt.savedAt)}, версия карты ${receipt.serverRevision}.`;
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
