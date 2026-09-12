import type {
	AiJobKind,
	Dashboard,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
	DocumentIngestionTarget,
	ImportSourceKind,
	InstallmentPaymentStatus,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import { showToast } from "../components/GlobalToast";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { actionFailureToast } from "../lib/panelStateText";
import { countLabel } from "../lib/russianPlural.js";
import { telegramVisualCardFields } from "../workspaceStaticOptions";
import { treatmentAcceptanceVariantOptions } from "./AppointmentHelpers";
import { normalizedLocalOrganizationId } from "./AuthOnboardingHelpers";
import { isBrowserMigrationScanAbortError } from "./browserScanUtils";
import {
	xrayPregnancyStatusOptions,
	xrayPriorityOptions,
	xrayStudyTypeOptions,
} from "./ImagingHelpers";
import {
	type DenteTelegramPortalSection,
	denteTelegramHandoffTargets,
	telegramPublicUrlSensitivePathSegments,
	telegramPublicUrlSensitiveQueryKeys,
} from "./TelegramHelpers";
import {
	isOptionValue,
	isRecordKey,
	isStringUnionValue,
} from "./commonHelpers/predicateHelpers";

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

export const aiJobKindLabels: Record<AiJobKind, string> = {
	voice_transcription: "диктовка врача",
	visit_note_draft: "черновик приема",
	image_summary: "описание снимка",
	document_draft: "черновик документа",
	paper_ocr: "разбор бумажного журнала",
};

export function isImportSourceKind(value: unknown): value is ImportSourceKind {
	return isRecordKey(value, importSourceLabels);
}

export function isDocumentIngestionTarget(
	value: unknown,
): value is DocumentIngestionTarget {
	return isRecordKey(value, ingestionTargetLabels);
}

export function isSmartImportMode(value: unknown): value is SmartImportMode {
	return isRecordKey(value, smartImportModeLabels);
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

export { denteAdminSecretRequestHeaders };

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

export * from "./browserScanUtils";

export {
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
} from "./dateTimeUtils";

export {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "./localStorageHelpers";

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

export * from "./commonHelpers/documentDraftHelpers";
export * from "./commonHelpers/errorHelpers";
export * from "./commonHelpers/imagingDraftHelpers";
export * from "./commonHelpers/speechChunkHelpers";
export * from "./commonHelpers/uiPreferencesHelpers";
export * from "./commonHelpers/visitDraftHelpers";
export * from "./commonHelpers/pricelistHelpers";
export * from "./commonHelpers/predicateHelpers";

export {
	preparePricelistImage,
	compressPricelistImage,
	maxPricelistImageBase64Chars,
	pricelistImageMimeTypes,
	type PricelistImageMimeType,
} from "./commonHelpers/pricelistHelpers";

export {
	browserGeneratedId,
	createLocalQueueId,
	isRecordKey,
	isOptionValue,
	isStringUnionValue,
	isBooleanPreference,
	isBoundedPreferenceString,
	isNullableString,
	isPaymentMethod,
	isPricelistSourceKind,
	isAiJobKind,
	isAiRecognitionTarget,
	isImagingSourceKind,
	isImagingKindFilter,
	normalizedPaymentRefundCorrectionAction,
	normalizedPaymentRefundCorrectionMethod,
	normalizedClinicalRuleAction,
	normalizedClinicalRuleSeverity,
	normalizedServiceCategory,
	paymentRefundCorrectionActionOptions,
	paymentRefundCorrectionMethodOptions,
	aiJobKindPreferenceValues,
	type PaymentRefundCorrectionAction,
	type PaymentRefundCorrectionMethod,
} from "./commonHelpers/predicateHelpers";
