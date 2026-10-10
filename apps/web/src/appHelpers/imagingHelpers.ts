import type {
	CbctWorkbenchPlane,
	DicomFirstFramePreviewMetadata,
	DicomFirstFramePreviewRequestContext,
	DicomFirstFramePreviewOptions,
	DicomWorkbenchIndexedDbDraft,
	DicomWorkbenchLocalDraft,
	ImagingViewerLocalDraft,
	ImagingViewerPlan,
	ImagingViewerSaveState,
	ImagingViewerState,
	LocalImagingFolderDraft,
} from "./types.js";
import type { CtImplantLibraryItem } from "../ctPlanningTools";
import type {
	DicomSeriesPreviewGroup,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerImplantPlan,
	ImagingViewerSessionState,
	ImagingViewerWindowPreset,
	ImportSourceKind,
	SmartImportMode,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import {
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
} from "../utils/draftDefaults";
import {
	imagingKindLabels,
	imagingSourceLabels,
} from "../imagingUiLabels";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import { localImagingFolderFingerprint } from "../utils/browserScanUtils";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";
import { showToast } from "../components/GlobalToast";
import { actionFailureToast } from "../lib/panelStateText";
import {
	offlineDraftOrganizationKey,
	sensitiveLocalDraftRetentionMs,
	normalizedLocalOrganizationId,
	isRecordKey,
	isOptionValue,
	isStringUnionValue,
} from "./uiFormatters.js";
import {
	openSpeechChunkDb,
	speechChunkIndexedDbAvailable,
	dicomWorkbenchDraftStoreName,
} from "./speechHelpers.js";

export { imagingSourceLabels } from "../imagingUiLabels";

export function viewerWindowPresetForStudy(
	kind: ImagingStudyKind | null | undefined,
): ImagingViewerWindowPreset {
	if (kind === "cbct") return "bone";
	if (kind === "photo") return "photo";
	if (kind === "bitewing") return "caries";
	if (kind === "opg") return "perio";
	return "endo";
}

export const imagingViewerLocalStoragePrefix = "dental-crm:imaging-viewer:";

export const dicomWorkbenchLocalStorageKey = "dental-crm:dicom-workbench:last";

export const localImagingFolderStorageKey =
	"dental-crm:local-imaging-folder:last";

export function imagingViewerLocalKey(
	studyId: string,
	organizationId: string | null | undefined = null,
): string {
	const normalizedOrganizationId = organizationId?.trim();
	return `${imagingViewerLocalStoragePrefix}${normalizedOrganizationId ? `${normalizedOrganizationId}:` : ""}${studyId}`;
}

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
		logger.warn("Failed to load local imaging viewer draft", error);
		return null;
	}
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
		logger.warn(
			"Failed to load local DICOM workbench draft from local storage:",
			error,
		);
		return null;
	}
}

export const dicomDownloadRedactionWarning =
	"Скачанный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции.";

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
	const clone = (typeof structuredClone === "function"
		? structuredClone(bundle)
		: JSON.parse(JSON.stringify(bundle))) as DicomViewerToolStateBundleResponse;
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
	const clone = (typeof structuredClone === "function"
		? structuredClone(manifest)
		: JSON.parse(JSON.stringify(manifest))) as DicomViewerWorkbenchManifestResponse;
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

export const smartImportModeLabels: Record<
	SmartImportMode,
	{ title: string; detail: string }
> = {
	auto: {
		title: "Авто",
		detail: "Автоматически классифицирует пациентов, снимки и сопутствующие данные.",
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

export const dicomFirstFrameStatusLabels: Record<string, string> = {
	ready: "готово",
	unsupported: "не поддерживается",
	not_found: "не найдено",
};

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
