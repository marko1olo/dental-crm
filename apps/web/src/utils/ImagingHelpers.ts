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
import { offlineDraftOrganizationKey, redactedLocalDicomDownloadPath, uniqueDicomDownloadWarnings } from "./CommonHelpers";

export type ImagingViewerState = {
	rotationDeg: number;
	flipHorizontal: boolean;
	inverted: boolean;
	brightness: number;
	contrast: number;
	zoom: number;
	panX: number;
	panY: number;
	projection: MprProjection;
	preset: MprWindowPreset;
};

export type ImagingViewerPlan = {
	label: string;
	mode: "two_d" | "ceph" | "cbct_mpr" | "photo";
	primaryTools: string[];
	presets: string[];
	nextAction: string;
	warnings: string[];
};

export type MprAxisVisualizerStyle = CSSProperties & {
	"--mpr-axis-deg": string;
	"--mpr-slab-width": string;
	"--mpr-slice-position": string;
};

export function viewerWindowPresetForStudy(
	kind: ImagingStudyKind | null | undefined,
): ImagingViewerWindowPreset {
	if (kind === "cbct") return "bone";
	if (kind === "photo") return "photo";
	if (kind === "bitewing") return "caries";
	if (kind === "opg") return "perio";
	return "endo";
}

export type ImagingViewerLocalDraft = {
	state: ImagingViewerSessionState;
	annotations: ImagingViewerAnnotation[];
	clientSavedAt: string;
	serverSavedAt: string | null;
};

export type ImagingViewerSaveState =
	| "idle"
	| "local"
	| "saving"
	| "saved"
	| "queued"
	| "error";

export type DicomWorkbenchLocalDraft = {
	manifest: DicomViewerWorkbenchManifestResponse;
	clientSavedAt: string;
	seriesKey: string;
};

export type DicomWorkbenchIndexedDbDraft = DicomWorkbenchLocalDraft & {
	storageKey: string;
	organizationId: string | null;
};

export type MprWorkbenchState = {
	projection: MprProjection;
	axisDeg: number;
	slabMm: number;
	sliceIndex: number;
	windowPreset: MprWindowPreset;
	crosshair: boolean;
	linkedPlanes: boolean;
};

export type MprWorkbenchLocalDraft = {
	version: 1;
	seriesKey: string;
	state: MprWorkbenchState;
	clientSavedAt: string;
};

export type MprWorkbenchIndexedDbDraft = MprWorkbenchLocalDraft & {
	storageKey: string;
	organizationId: string | null;
};

export type LocalImagingFolderDraft = {
	version: 1;
	folderPath: string;
	safeDisplayName: string;
	sourceLabel: string;
	sourceKind: string;
	folderFingerprint: string | null;
	origin: "manual" | "discovery" | "organizer" | "workbench";
	savedAt: string;
};

export type DicomFirstFramePreviewMetadata = Partial<
	Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
>;

export type DicomFirstFramePreviewRequestContext = {
	folderPath: string;
	metadata: DicomFirstFramePreviewMetadata;
};

export type DicomFirstFramePreviewOptions = {
	preferredFileIndex?: number;
	resetViewer?: boolean;
};

export const imagingViewerLocalStoragePrefix = "dental-crm:imaging-viewer:";

export const dicomWorkbenchLocalStorageKey = "dental-crm:dicom-workbench:last";

export const mprWorkbenchLocalStoragePrefix = "dental-crm:ct-mpr-workbench:";

export const localImagingFolderStorageKey =
	"dental-crm:local-imaging-folder:last";

export function imagingViewerLocalKey(
	studyId: string,
	organizationId: string | null | undefined = null,
): string {
	const normalizedOrganizationId = organizationId?.trim();
	return `${imagingViewerLocalStoragePrefix}${normalizedOrganizationId ? `${normalizedOrganizationId}:` : ""}${studyId}`;
}

export function dicomWorkbenchSeriesKey(
	manifest: DicomViewerWorkbenchManifestResponse,
): string {
	return (
		manifest.toolStateBundle.seriesRef.seriesInstanceUid ??
		manifest.launchManifest.seriesInstanceUid ??
		manifest.toolStateBundle.seriesRef.firstFilePath ??
		manifest.toolStateBundle.seriesRef.sourceName
	);
}

export function dicomWorkbenchIndexedDbKey(
	organizationId: string | null | undefined = null,
): string {
	return `dicom-workbench:${offlineDraftOrganizationKey(organizationId)}`;
}

export function mprWorkbenchIndexedDbKey(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): string {
	return `mpr-workbench:${offlineDraftOrganizationKey(organizationId)}:${seriesKey}`;
}

export function mprWorkbenchSeriesKey(
	series: DicomSeriesPreviewGroup | null,
): string | null {
	if (!series) return null;
	const identity = [
		series.seriesInstanceUid,
		series.studyInstanceUid,
		series.id,
		series.sourceName,
		series.seriesDescription,
		series.studyDescription,
		series.capturedAt,
	]
		.filter((value): value is string => Boolean(value?.trim()))
		.join("|");
	if (!identity) return null;
	return localImagingFolderFingerprint(
		`${series.sourceKind}:${identity}:${series.fileCount}`,
	);
}

export function mprWorkbenchLocalKey(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): string {
	const normalizedOrganizationId = organizationId?.trim();
	return `${mprWorkbenchLocalStoragePrefix}${normalizedOrganizationId ? `${normalizedOrganizationId}:` : ""}${seriesKey}`;
}

export function isMprProjection(value: unknown): value is MprProjection {
	return (
		value === "axial" ||
		value === "coronal" ||
		value === "sagittal" ||
		value === "oblique" ||
		value === "panoramic_reconstruction" ||
		value === "three_d_volume" ||
		value === "mip" ||
		value === "panoramic" ||
		value === "3d_reconstruction"
	);
}

export function isMprWindowPreset(value: unknown): value is MprWindowPreset {
	return (
		value === "bone" ||
		value === "soft_tissue" ||
		value === "implant" ||
		value === "custom" ||
		value === "teeth"
	);
}

export function resolveMprWorkbenchProjection(
	value: unknown,
	availableProjections: MprProjection[],
): MprProjection {
	const projection = isMprProjection(value) ? value : null;
	if (projection && availableProjections.includes(projection))
		return projection;
	if (availableProjections.includes("axial")) return "axial";
	return availableProjections[0] ?? "axial";
}

export const dicomDownloadRedactionWarning =
	"Скачанный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции.";

export function redactedDicomDownloadReferenceId(
	value: string | null,
): string | null {
	if (!value) return null;
	const prefix = "dicomfile:";
	if (value.toLowerCase().startsWith(prefix)) {
		return `${prefix}${redactedLocalDicomDownloadPath(value.slice(prefix.length)) ?? value.slice(prefix.length)}`;
	}
	return redactedLocalDicomDownloadPath(value);
}

export function redactDicomDownloadText(value: string): string {
	return value
		.replace(
			/dicomfile:([A-Za-z]:[\\/][^\s\r\n]+)/gi,
			(_match, filePath: string) => {
				return `dicomfile:${redactedLocalDicomDownloadPath(filePath) ?? filePath}`;
			},
		)
		.replace(
			/[A-Za-z]:[\\/][^\r\n]*(?=:\s|$)/g,
			(match) => redactedLocalDicomDownloadPath(match) ?? match,
		)
		.replace(
			/\\\\[^\r\n]*(?=:\s|$)/g,
			(match) => redactedLocalDicomDownloadPath(match) ?? match,
		);
}

export function redactedDicomDownloadWarnings(warnings: string[]): string[] {
	return uniqueDicomDownloadWarnings(
		warnings.map((warning) => redactDicomDownloadText(warning)),
	);
}

export function redactedDicomViewerToolStateBundleForDownload(
	bundle: DicomViewerToolStateBundleResponse,
): DicomViewerToolStateBundleResponse {
	const clone = JSON.parse(
		JSON.stringify(bundle),
	) as DicomViewerToolStateBundleResponse;
	clone.seriesRef.firstFilePath = redactedLocalDicomDownloadPath(
		clone.seriesRef.firstFilePath,
	);
	clone.viewports = clone.viewports.map((viewport) => ({
		...viewport,
		referencedImageId: redactedDicomDownloadReferenceId(
			viewport.referencedImageId,
		),
	}));
	clone.annotations = clone.annotations.map((annotation) => ({
		...annotation,
		referencedImageId: redactedDicomDownloadReferenceId(
			annotation.referencedImageId,
		),
		warnings: redactedDicomDownloadWarnings(annotation.warnings),
	}));
	clone.warnings = uniqueDicomDownloadWarnings([
		...redactedDicomDownloadWarnings(clone.warnings),
		dicomDownloadRedactionWarning,
	]).slice(0, 16);
	return clone;
}

export function redactedDicomWorkbenchManifestForDownload(
	manifest: DicomViewerWorkbenchManifestResponse,
): DicomViewerWorkbenchManifestResponse {
	const clone = JSON.parse(
		JSON.stringify(manifest),
	) as DicomViewerWorkbenchManifestResponse;
	clone.toolStateBundle = redactedDicomViewerToolStateBundleForDownload(
		clone.toolStateBundle,
	);
	clone.launchManifest.viewerUrl = redactedLocalDicomDownloadPath(
		clone.launchManifest.viewerUrl,
	);
	clone.warnings = uniqueDicomDownloadWarnings([
		...redactedDicomDownloadWarnings(clone.warnings),
		dicomDownloadRedactionWarning,
	]).slice(0, 16);
	clone.readiness.warnings = redactedDicomDownloadWarnings(
		clone.readiness.warnings,
	);
	clone.renderCachePlan.warnings = redactedDicomDownloadWarnings(
		clone.renderCachePlan.warnings,
	);
	clone.launchManifest.warnings = redactedDicomDownloadWarnings(
		clone.launchManifest.warnings,
	);
	return clone;
}

export function dicomWorkbenchManifestHasRedactedSource(
	manifest: DicomViewerWorkbenchManifestResponse | null,
): boolean {
	if (!manifest) return false;
	const firstFilePath = manifest.toolStateBundle.seriesRef.firstFilePath ?? "";
	return (
		firstFilePath.startsWith("redacted-local-dicom-path:") ||
		manifest.toolStateBundle.viewports.some((viewport) =>
			(viewport.referencedImageId ?? "").startsWith(
				"dicomfile:redacted-local-dicom-path:",
			),
		)
	);
}

export function ctImplantPlanFromLibraryItem(
	implant: CtImplantLibraryItem,
): ImagingViewerImplantPlan {
	return {
		itemId: implant.id,
		system: implant.system,
		line: implant.line,
		diameterMm: implant.diameterMm,
		lengthMm: implant.lengthMm,
		platform: implant.platform,
		indication: implant.indication,
		selectedAt: new Date().toISOString(),
	};
}

export const imagingViewerPlans: Record<ImagingStudyKind, ImagingViewerPlan> = {
	periapical: {
		label: "RVG / прицельный",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
		presets: ["endo", "caries", "implant"],
		nextAction: "Смотреть локально; ИИ-описание только как черновик.",
		warnings: [
			"Не заменяет диагноз врача.",
			"Измерения требуют калибровки датчика.",
		],
	},
	bitewing: {
		label: "Интерпроксимальный снимок",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "zoom", "compare"],
		presets: ["caries", "bone"],
		nextAction: "Смотреть локально; удобно для кариеса и контактов.",
		warnings: ["Сравнение серий требует одинаковой проекции."],
	},
	opg: {
		label: "ОПТГ / панорама",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
		presets: ["bone", "teeth", "implant"],
		nextAction:
			"2D-просмотрщик достаточен для обзора; КТ открывать отдельным рабочим местом срезов.",
		warnings: ["Панорама имеет искажения; линейные измерения проверять по КТ."],
	},
	ceph: {
		label: "ТРГ / цефалометрия",
		mode: "ceph",
		primaryTools: ["window/level", "rotate", "zoom", "landmarks"],
		presets: ["soft", "bone", "airway"],
		nextAction:
			"Для ортодонтии нужен отдельный цефалометрический анализ с точками и углами.",
		warnings: ["Точки/углы не должны автозаполняться без проверки врача."],
	},
	cbct: {
		label: "КЛКТ / КТ",
		mode: "cbct_mpr",
		primaryTools: ["MPR", "axial", "coronal", "sagittal", "panoramic curve"],
		presets: ["bone", "implant", "endo"],
		nextAction:
			"Открывать в просмотре КЛКТ/КТ-срезов; здесь только быстрый предпросмотр.",
		warnings: [
			"Нельзя диагностировать КЛКТ по одной плоской картинке.",
			"Нужны срезы серии, предварительная подготовка и полноценный просмотрщик КТ.",
		],
	},
	photo: {
		label: "Фото",
		mode: "photo",
		primaryTools: ["zoom", "rotate", "brightness", "contrast"],
		presets: ["clinical", "shade", "before/after"],
		nextAction:
			"Фото можно использовать для коммуникации и черновиков документов.",
		warnings: ["Цвет зависит от света и камеры."],
	},
	other: {
		label: "Другое изображение",
		mode: "two_d",
		primaryTools: ["zoom", "rotate", "brightness", "contrast"],
		presets: ["neutral"],
		nextAction:
			"Проверить источник и привязку к пациенту перед использованием.",
		warnings: ["Неизвестный тип требует ручной проверки."],
	},
};

export const imagingSourceChoices: ImagingSourceKind[] = [
	"folder_watch",
	"sensor_bridge",
	"dicom_file",
	"dicomweb",
	"pacs",
	"twain_wia",
	"manual_upload",
];

export const dicomFirstFrameStatusLabels: Record<string, string> = {
	ready: "готово",
	unsupported: "не поддерживается",
	not_found: "не найдено",
};

export const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";

export const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";

export const xrayPriorityOptions: readonly XrayCbctReferralPriority[] = [
	"routine",
	"urgent",
];

export const xrayStudyTypeOptions: Array<{
	value: XrayCbctReferralStudyType;
	label: string;
}> = [
	{ value: "rvg", label: "RVG / прицельный" },
	{ value: "opg", label: "ОПТГ" },
	{ value: "cbct", label: "КЛКТ / КТ" },
	{ value: "trg", label: "ТРГ" },
	{ value: "tmj", label: "ВНЧС" },
	{ value: "sinus", label: "Пазуха" },
	{ value: "photo_protocol", label: "Фотопротокол" },
	{ value: "other", label: "Другое" },
];

export const xrayPregnancyStatusOptions: Array<{
	value: XrayCbctReferralPregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна" },
	{ value: "confirmed", label: "Подтверждена" },
	{ value: "unknown", label: "Не уточнено" },
];

export const photoVideoMaterialOptions: Array<{
	value: PhotoVideoConsentMaterial;
	label: string;
}> = [
	{ value: "intraoral_photo", label: "Внутриротовые фото" },
	{ value: "face_photo", label: "Фото лица" },
	{ value: "video", label: "Видео" },
	{ value: "xray", label: "Рентген" },
	{ value: "cbct", label: "КЛКТ/КТ" },
	{ value: "scan", label: "Цифровые сканы" },
	{ value: "other", label: "Иные материалы" },
];

export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Снимок не удалось прочитать"));
		reader.onload = () =>
			resolve(typeof reader.result === "string" ? reader.result : "");
		reader.readAsDataURL(file);
	});
}

export function loadImageFromDataUrl(
	dataUrl: string,
): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Снимок не удалось распознать"));
		image.src = dataUrl;
	});
}
