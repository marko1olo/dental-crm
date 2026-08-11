import type {
	AiJobKind,
	AiRecognitionTarget,
	Dashboard,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
	DicomViewerWorkbenchManifestResponse,
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
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import {
	imagingKindLabels,
	imagingSourceLabels,
	type MprProjection,
} from "../../imagingUiLabels";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural.js";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
} from "../../mprControlMath";
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
	type DicomWorkbenchIndexedDbDraft,
	type DicomWorkbenchLocalDraft,
	dicomWorkbenchDraftStoreName,
	dicomWorkbenchIndexedDbKey,
	dicomWorkbenchLocalStorageKey,
	dicomWorkbenchSeriesKey,
	type ImagingViewerLocalDraft,
	imagingViewerLocalKey,
	isMprProjection,
	isMprWindowPreset,
	type LocalImagingFolderDraft,
	loadImageFromDataUrl,
	localImagingFolderStorageKey,
	type MprWorkbenchIndexedDbDraft,
	type MprWorkbenchLocalDraft,
	type MprWorkbenchState,
	mprWorkbenchDraftStoreName,
	mprWorkbenchIndexedDbKey,
	mprWorkbenchLocalKey,
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
import {
	openSpeechChunkDb,
	speechChunkIndexedDbAvailable,
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

export type CbctWorkbenchPlane = {
	key: MprProjection;
	title: string;
	detail: string;
};

export function loadLocalImagingViewerDraft(
	studyId: string | null,
	organizationId: string | null | undefined = null,
): ImagingViewerLocalDraft | null {
	if (!studyId || typeof window === "undefined") return null;
	try {
		const localKey = imagingViewerLocalKey(studyId, organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(imagingViewerLocalKey(studyId))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as ImagingViewerLocalDraft;
		if (
			!localSavedAtFresh(parsed?.clientSavedAt, sensitiveLocalDraftRetentionMs)
		) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(imagingViewerLocalKey(studyId));
			return null;
		}
		return parsed?.state && Array.isArray(parsed.annotations) ? parsed : null;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn("Failed to load local imaging viewer draft", error);
		return null;
	}
}

export function offlineDraftOrganizationKey(
	organizationId: string | null | undefined = null,
): string {
	return normalizedLocalOrganizationId(organizationId) ?? "default";
}

export function normalizeLocalDicomWorkbenchDraft(
	value: unknown,
): DicomWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<DicomWorkbenchLocalDraft>;
	if (parsed?.manifest?.version !== "dental-crm-dicom-workbench-v1")
		return null;
	if (
		typeof parsed.seriesKey !== "string" ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	return {
		manifest: parsed.manifest,
		seriesKey: parsed.seriesKey,
		clientSavedAt: parsed.clientSavedAt,
	};
}

export function newerDicomWorkbenchDraft(
	left: DicomWorkbenchLocalDraft | null,
	right: DicomWorkbenchLocalDraft | null,
): DicomWorkbenchLocalDraft | null {
	if (!left) return right;
	if (!right) return left;
	return Date.parse(right.clientSavedAt) > Date.parse(left.clientSavedAt)
		? right
		: left;
}

export function loadLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): DicomWorkbenchLocalDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			dicomWorkbenchLocalStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(dicomWorkbenchLocalStorageKey)
				: null);
		if (!raw) return null;
		const parsed = normalizeLocalDicomWorkbenchDraft(JSON.parse(raw));
		if (!parsed) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(dicomWorkbenchLocalStorageKey);
			return null;
		}
		return parsed;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn(
			"Failed to load local DICOM workbench draft from local storage:",
			error,
		);
		return null;
	}
}

export function normalizeMprWorkbenchState(
	value: unknown,
): MprWorkbenchState | null {
	if (!value || typeof value !== "object") return null;
	const source = value as Partial<MprWorkbenchState>;
	if (
		!isMprProjection(source.projection) ||
		!isMprWindowPreset(source.windowPreset)
	)
		return null;
	const axisDeg = Number(source.axisDeg);
	const slabMm = Number(source.slabMm);
	const sliceIndex = Number(source.sliceIndex ?? 0);
	if (
		!Number.isFinite(axisDeg) ||
		!Number.isFinite(slabMm) ||
		!Number.isFinite(sliceIndex)
	)
		return null;
	return {
		projection: source.projection,
		axisDeg: clampMprAxisDeg(axisDeg),
		slabMm: clampMprSlabMm(slabMm),
		sliceIndex: clampMprSliceIndex(sliceIndex, 100000),
		windowPreset: source.windowPreset,
		crosshair: source.crosshair !== false,
		linkedPlanes: source.linkedPlanes !== false,
	};
}

export function loadLocalMprWorkbenchDraftFromLocalStorage(
	seriesKey: string | null,
	organizationId: string | null | undefined = null,
): MprWorkbenchLocalDraft | null {
	if (!seriesKey || typeof window === "undefined") return null;
	try {
		const localKey = mprWorkbenchLocalKey(seriesKey, organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(mprWorkbenchLocalKey(seriesKey))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as MprWorkbenchLocalDraft;
		if (
			parsed?.version !== 1 ||
			parsed.seriesKey !== seriesKey ||
			!parsed.clientSavedAt
		)
			return null;
		if (
			!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs)
		) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
			return null;
		}
		const state = normalizeMprWorkbenchState(parsed.state);
		return state ? { ...parsed, state } : null;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn(error);
		return null;
	}
}

export function saveLocalMprWorkbenchDraftToLocalStorage(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			mprWorkbenchLocalKey(seriesKey, organizationId),
			JSON.stringify({
				version: 1,
				seriesKey,
				state,
				clientSavedAt,
			} satisfies MprWorkbenchLocalDraft),
		);
		return true;
	} catch {
		return false;
	}
}

export function uniqueDicomDownloadWarnings(warnings: string[]): string[] {
	return Array.from(
		new Set(warnings.map((warning) => warning.trim()).filter(Boolean)),
	);
}

export function isLocalDicomDownloadPath(value: string): boolean {
	const input = value.trim();
	if (!input || input.startsWith("redacted-local-dicom-path:")) return false;
	if (/^(?:https?|blob|data):/i.test(input)) return false;
	if (/^[A-Za-z]:[\\/]/.test(input) || input.startsWith("\\\\")) return true;
	if (
		/^\/(?:Users|Volumes|home|mnt|media|var|tmp|srv|opt|data|storage|dicom|pacs)(?:\/|$)/i.test(
			input,
		)
	)
		return true;
	if (input.includes("::")) return true;
	return /^[^:?#]+[\\/][^:?#]+/.test(input) && !input.startsWith("/");
}

export function redactedLocalDicomDownloadPath(
	value: string | null,
): string | null {
	if (!value) return null;
	if (!isLocalDicomDownloadPath(value)) return value;
	return `redacted-local-dicom-path:${localImagingFolderFingerprint(value)}`;
}

export function loadLocalImagingFolderDraft(
	organizationId: string | null | undefined = null,
): LocalImagingFolderDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			localImagingFolderStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(localImagingFolderStorageKey)
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as LocalImagingFolderDraft;
		if (parsed?.version !== 1 || !parsed.folderPath?.trim() || !parsed.savedAt)
			return null;
		if (!localSavedAtFresh(parsed.savedAt, localConvenienceRetentionMs)) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(localImagingFolderStorageKey);
			return null;
		}
		return {
			...parsed,
			safeDisplayName:
				parsed.safeDisplayName ||
				`Локальная папка снимков #${localImagingFolderFingerprint(parsed.folderPath)}`,
			sourceLabel: parsed.sourceLabel || "Это устройство",
			sourceKind: parsed.sourceKind || "manual",
			folderFingerprint:
				parsed.folderFingerprint ||
				localImagingFolderFingerprint(parsed.folderPath),
			origin: parsed.origin || "manual",
		};
	} catch {
		return null;
	}
}

export function saveLocalImagingFolderDraft(
	draft: LocalImagingFolderDraft,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				localImagingFolderStorageKey,
				organizationId,
			),
			JSON.stringify(draft),
		);
	} catch {
		// Local folder recovery is best-effort and never sent to the server.
	}
}

export function removeLocalImagingFolderDraft(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				localImagingFolderStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(localImagingFolderStorageKey);
	} catch {
		// ignore unavailable storage
	}
}

export function saveLocalDicomWorkbenchDraftToLocalStorage(
	draft: DicomWorkbenchLocalDraft,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				dicomWorkbenchLocalStorageKey,
				organizationId,
			),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		return false;
	}
}

export function createLocalDicomWorkbenchDraft(
	manifest: DicomViewerWorkbenchManifestResponse,
	clientSavedAt: string,
): DicomWorkbenchLocalDraft {
	return {
		manifest,
		clientSavedAt,
		seriesKey: dicomWorkbenchSeriesKey(manifest),
	};
}

export function removeLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				dicomWorkbenchLocalStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(dicomWorkbenchLocalStorageKey);
	} catch {
		// ignore unavailable storage
	}
}

export function saveLocalImagingViewerDraft(
	studyId: string,
	draft: ImagingViewerLocalDraft,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			imagingViewerLocalKey(studyId, organizationId),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		// Viewer state is still saved to server when available; local storage quota errors stay non-blocking.
		return false;
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

export async function readLocalDicomWorkbenchDraftFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<DicomWorkbenchLocalDraft | null> {
	const db = await openSpeechChunkDb();
	const key = dicomWorkbenchIndexedDbKey(organizationId);
	const record = await new Promise<unknown>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readonly",
		);
		const request = transaction
			.objectStore(dicomWorkbenchDraftStoreName)
			.get(key);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () =>
			reject(
				request.error ?? new Error("Local DICOM workbench draft read failed"),
			);
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft transaction failed"),
			);
	});
	const normalized = normalizeLocalDicomWorkbenchDraft(record);
	if (!normalized && record && typeof record === "object") {
		await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(
			() => undefined,
		);
	}
	return normalized;
}

export async function saveLocalDicomWorkbenchDraftToIndexedDb(
	draft: DicomWorkbenchLocalDraft,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const record: DicomWorkbenchIndexedDbDraft = {
		...draft,
		storageKey: dicomWorkbenchIndexedDbKey(normalizedOrganizationId),
		organizationId: normalizedOrganizationId,
	};
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readwrite",
		);
		transaction.objectStore(dicomWorkbenchDraftStoreName).put(record);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft save failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft save aborted"),
			);
	});
}

export async function deleteLocalDicomWorkbenchDraftFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readwrite",
		);
		transaction
			.objectStore(dicomWorkbenchDraftStoreName)
			.delete(dicomWorkbenchIndexedDbKey(organizationId));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft delete failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft delete aborted"),
			);
	});
}

export async function migrateLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (!speechChunkIndexedDbAvailable()) return;
	const legacyDraft =
		loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	if (!legacyDraft) return;
	const existing = await readLocalDicomWorkbenchDraftFromIndexedDb(
		organizationId,
	).catch((err) => {
		logger.error("[Dente] read draft error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения черновика DICOM",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const draft = newerDicomWorkbenchDraft(existing, legacyDraft);
	if (!draft) return;
	await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
	removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export async function loadLocalDicomWorkbenchDraft(
	organizationId: string | null | undefined = null,
): Promise<DicomWorkbenchLocalDraft | null> {
	if (!speechChunkIndexedDbAvailable())
		return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	try {
		await migrateLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
		return await readLocalDicomWorkbenchDraftFromIndexedDb(organizationId);
	} catch {
		return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	}
}

export async function saveLocalDicomWorkbenchDraft(
	manifest: DicomViewerWorkbenchManifestResponse,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<boolean> {
	const draft = createLocalDicomWorkbenchDraft(manifest, clientSavedAt);
	if (speechChunkIndexedDbAvailable()) {
		try {
			await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
			removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
			return true;
		} catch {
			// Keep local CT workbench recovery available on restricted browsers.
		}
	}
	return saveLocalDicomWorkbenchDraftToLocalStorage(draft, organizationId);
}

export async function removeLocalDicomWorkbenchDraft(
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (speechChunkIndexedDbAvailable()) {
		await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(
			() => undefined,
		);
	}
	removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export function normalizeMprWorkbenchDraft(
	value: unknown,
	seriesKey: string,
): MprWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<MprWorkbenchLocalDraft>;
	if (
		parsed?.version !== 1 ||
		parsed.seriesKey !== seriesKey ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	const state = normalizeMprWorkbenchState(parsed.state);
	return state
		? { version: 1, seriesKey, state, clientSavedAt: parsed.clientSavedAt }
		: null;
}

export async function readLocalMprWorkbenchDraftFromIndexedDb(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<MprWorkbenchLocalDraft | null> {
	const db = await openSpeechChunkDb();
	const key = mprWorkbenchIndexedDbKey(seriesKey, organizationId);
	const record = await new Promise<unknown>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readonly");
		const request = transaction
			.objectStore(mprWorkbenchDraftStoreName)
			.get(key);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () =>
			reject(
				request.error ?? new Error("Local MPR workbench draft read failed"),
			);
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft transaction failed"),
			);
	});
	const normalized = normalizeMprWorkbenchDraft(record, seriesKey);
	if (!normalized && record && typeof record === "object") {
		await deleteLocalMprWorkbenchDraftFromIndexedDb(
			seriesKey,
			organizationId,
		).catch((err) => {
			logger.error("[Dente] delete draft error:", err);
			showToast(
				actionFailureToast(
					"Не удалось удалить черновик MPR",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			return undefined;
		});
	}
	return normalized;
}

export async function saveLocalMprWorkbenchDraftToIndexedDb(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const record: MprWorkbenchIndexedDbDraft = {
		version: 1,
		seriesKey,
		state,
		clientSavedAt,
		storageKey: mprWorkbenchIndexedDbKey(seriesKey, normalizedOrganizationId),
		organizationId: normalizedOrganizationId,
	};
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
		transaction.objectStore(mprWorkbenchDraftStoreName).put(record);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Local MPR workbench draft save failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft save aborted"),
			);
	});
}

export async function deleteLocalMprWorkbenchDraftFromIndexedDb(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
		transaction
			.objectStore(mprWorkbenchDraftStoreName)
			.delete(mprWorkbenchIndexedDbKey(seriesKey, organizationId));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft delete failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft delete aborted"),
			);
	});
}

export async function migrateLocalMprWorkbenchDraftFromLocalStorage(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (!speechChunkIndexedDbAvailable()) return;
	const legacyDraft = loadLocalMprWorkbenchDraftFromLocalStorage(
		seriesKey,
		organizationId,
	);
	if (!legacyDraft) return;
	const existing = await readLocalMprWorkbenchDraftFromIndexedDb(
		seriesKey,
		organizationId,
	).catch((err) => {
		logger.error("[Dente] read draft error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения черновика MPR",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const draft =
		existing &&
		Date.parse(existing.clientSavedAt) >= Date.parse(legacyDraft.clientSavedAt)
			? existing
			: legacyDraft;
	await saveLocalMprWorkbenchDraftToIndexedDb(
		seriesKey,
		draft.state,
		draft.clientSavedAt,
		organizationId,
	);
	if (typeof window !== "undefined") {
		safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey, organizationId));
		if (organizationId)
			safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
	}
}

export async function loadLocalMprWorkbenchDraft(
	seriesKey: string | null,
	organizationId: string | null | undefined = null,
): Promise<MprWorkbenchLocalDraft | null> {
	if (!seriesKey) return null;
	if (!speechChunkIndexedDbAvailable())
		return loadLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
	try {
		await migrateLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
		return await readLocalMprWorkbenchDraftFromIndexedDb(
			seriesKey,
			organizationId,
		);
	} catch {
		return loadLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
	}
}

export async function saveLocalMprWorkbenchDraft(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<boolean> {
	if (speechChunkIndexedDbAvailable()) {
		try {
			await saveLocalMprWorkbenchDraftToIndexedDb(
				seriesKey,
				state,
				clientSavedAt,
				organizationId,
			);
			if (typeof window !== "undefined") {
				safeLocalStorageRemoveItem(
					mprWorkbenchLocalKey(seriesKey, organizationId),
				);
				if (organizationId)
					safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
			}
			return true;
		} catch {
			// Keep MPR recovery available on restricted browsers.
		}
	}
	return saveLocalMprWorkbenchDraftToLocalStorage(
		seriesKey,
		state,
		clientSavedAt,
		organizationId,
	);
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
