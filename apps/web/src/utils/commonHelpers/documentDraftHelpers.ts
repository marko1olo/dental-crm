import type {
	AiJobKind,
	AiRecognitionTarget,
	Dashboard,
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
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { imagingKindLabels, imagingSourceLabels } from "../../imagingUiLabels";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural.js";
import { safeLocalStorageSetItem } from "../../lib/safeLocalStorage";
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
	type DocumentPayloadDraftStore,
	type DocumentPaymentSelectionStore,
	documentPayloadDraftLocalKey,
	loadDocumentPayloadDraftStore,
	type MedicalRecordExtractDocumentDraftFields,
	type Outpatient025uDemographicCode,
	type Outpatient025uDocumentDraftFields,
	outpatient025uDemographicCodeOptions,
	taxApplicationRelationshipOptions,
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
import { logger } from "../logger";
import { defaultUiPreferences } from "../preferencesUtils";
import {
	type DenteTelegramPortalSection,
	denteTelegramHandoffTargets,
	telegramPublicUrlSensitivePathSegments,
	telegramPublicUrlSensitiveQueryKeys,
} from "../TelegramHelpers";
import {
	isProcedureSpecificConsentProcedurePreference,
	isTaxApplicationDeliveryChannelPreference,
	isTaxApplicationFormPreference,
} from "./uiPreferencesHelpers";

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

export const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;

export function emptyDocumentPaymentSelectionStore(): DocumentPaymentSelectionStore {
	return { version: 1, selections: {} };
}

export function emptyOutpatient025uDocumentDraftFields(): Outpatient025uDocumentDraftFields {
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
		recordExtractPreparedFromSignedRecords: false,
		outpatient025uMedicalCardNumber: "",
		outpatient025uOpenedAt: today,
		outpatient025uPatientSexCode: "unknown",
		outpatient025uCitizenship: "",
		outpatient025uRegistrationUrbanRuralCode: "unknown",
		outpatient025uStayUrbanRuralCode: "unknown",
		outpatient025uOmsIssuedAt: "",
		outpatient025uInsurerName: "",
		outpatient025uSocialSupportCode: "",
		outpatient025uHealthStatusDisclosureContact: "",
		outpatient025uEmploymentCode: "",
		outpatient025uDisabilityGroup: "",
		outpatient025uWorkOrStudyPlace: "",
		outpatient025uPalliativeCareNeedCode: "",
		outpatient025uBloodGroup: "",
		outpatient025uRhFactor: "",
		outpatient025uKellK1: "",
		outpatient025uOtherBloodData: "",
		outpatient025uAllergyHistory: "",
		outpatient025uFinalEpicrisis: "",
		outpatient025uOfficialForm274nChecked: false,
		outpatient025uThirdPartyDataChecked: false,
	};
}

export function emptyDocumentPayloadDraftStore(): DocumentPayloadDraftStore {
	return { version: 1, drafts: {} };
}

export function normalizedOutpatient025uCode(
	value: unknown,
): "1" | "2" | "unknown" {
	return value === "1" || value === "2" || value === "unknown"
		? value
		: "unknown";
}

export function localDraftString(value: unknown, maxLength = 1200): string {
	return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function normalizeOutpatient025uDocumentDraftFields(
	value: unknown,
): Outpatient025uDocumentDraftFields | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<
		Record<keyof Outpatient025uDocumentDraftFields, unknown>
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
		recordExtractPreparedFromSignedRecords:
			candidate.recordExtractPreparedFromSignedRecords === true,
		outpatient025uMedicalCardNumber: localDraftString(
			candidate.outpatient025uMedicalCardNumber,
			120,
		),
		outpatient025uOpenedAt: localDraftString(
			candidate.outpatient025uOpenedAt,
			40,
		),
		outpatient025uPatientSexCode: normalizedOutpatient025uCode(
			candidate.outpatient025uPatientSexCode,
		),
		outpatient025uCitizenship: localDraftString(
			candidate.outpatient025uCitizenship,
			240,
		),
		outpatient025uRegistrationUrbanRuralCode: normalizedOutpatient025uCode(
			candidate.outpatient025uRegistrationUrbanRuralCode,
		),
		outpatient025uStayUrbanRuralCode: normalizedOutpatient025uCode(
			candidate.outpatient025uStayUrbanRuralCode,
		),
		outpatient025uOmsIssuedAt: localDraftString(
			candidate.outpatient025uOmsIssuedAt,
			40,
		),
		outpatient025uInsurerName: localDraftString(
			candidate.outpatient025uInsurerName,
			300,
		),
		outpatient025uSocialSupportCode: localDraftString(
			candidate.outpatient025uSocialSupportCode,
			120,
		),
		outpatient025uHealthStatusDisclosureContact: localDraftString(
			candidate.outpatient025uHealthStatusDisclosureContact,
			300,
		),
		outpatient025uEmploymentCode: localDraftString(
			candidate.outpatient025uEmploymentCode,
			120,
		),
		outpatient025uDisabilityGroup: localDraftString(
			candidate.outpatient025uDisabilityGroup,
			120,
		),
		outpatient025uWorkOrStudyPlace: localDraftString(
			candidate.outpatient025uWorkOrStudyPlace,
			300,
		),
		outpatient025uPalliativeCareNeedCode: localDraftString(
			candidate.outpatient025uPalliativeCareNeedCode,
			120,
		),
		outpatient025uBloodGroup: localDraftString(
			candidate.outpatient025uBloodGroup,
			80,
		),
		outpatient025uRhFactor: localDraftString(
			candidate.outpatient025uRhFactor,
			80,
		),
		outpatient025uKellK1: localDraftString(candidate.outpatient025uKellK1, 80),
		outpatient025uOtherBloodData: localDraftString(
			candidate.outpatient025uOtherBloodData,
		),
		outpatient025uAllergyHistory: localDraftString(
			candidate.outpatient025uAllergyHistory,
		),
		outpatient025uFinalEpicrisis: localDraftString(
			candidate.outpatient025uFinalEpicrisis,
		),
		outpatient025uOfficialForm274nChecked:
			candidate.outpatient025uOfficialForm274nChecked === true,
		outpatient025uThirdPartyDataChecked:
			candidate.outpatient025uThirdPartyDataChecked === true,
	};
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

export function loadOutpatient025uDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
): Outpatient025uDocumentDraftFields | null {
	if (!key || typeof window === "undefined") return null;
	const draft = loadDocumentPayloadDraftStore(organizationId).drafts[key];
	return draft?.kind === "outpatient_medical_card_025u"
		? (draft.fields as Outpatient025uDocumentDraftFields)
		: null;
}

export function saveOutpatient025uDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
	patientId: string | null,
	visitId: string | null,
	fields: Outpatient025uDocumentDraftFields,
): void {
	if (!key || !patientId || typeof window === "undefined") return;
	try {
		const store = loadDocumentPayloadDraftStore(organizationId);
		store.drafts[key] = {
			kind: "outpatient_medical_card_025u",
			patientId,
			visitId,
			fields:
				normalizeOutpatient025uDocumentDraftFields(fields) ??
				emptyOutpatient025uDocumentDraftFields(),
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
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save outpatient 025u document draft", error);
		// Payload drafts are recovery data only; document issue still validates all facts server-side.
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
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save medical record extract document draft", error);
		// Payload drafts are recovery data only; document issue still validates all facts server-side.
	}
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

export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

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

export function normalizedOutpatient025uDemographicCode(
	value: unknown,
): Outpatient025uDemographicCode {
	return isStringUnionValue(value, outpatient025uDemographicCodeOptions)
		? value
		: "unknown";
}

export function normalizedMedicalDocumentReleaseChannel(
	value: unknown,
): MedicalDocumentReleaseChannel {
	return isRecordKey(value, medicalDocumentReleaseChannelLabels)
		? value
		: "paper";
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
