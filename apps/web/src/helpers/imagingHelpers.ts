/**
 * @file apps/web/src/helpers/imagingHelpers.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type DicomViewerToolStateBundleResponse,
	type DicomViewerWorkbenchManifestResponse,
	type ImagingSourceKind,
	type ImagingStudyKind,
	type ImagingViewerImplantPlan,
	type ImagingViewerWindowPreset,
	type SmartImportMode,
	type XrayCbctReferralPregnancyStatus,
	type XrayCbctReferralPriority,
	type XrayCbctReferralStudyType,
} from "@dental/shared";
import {
	type CtImplantLibraryItem,
} from "../ctPlanningTools";
import {
	type MprProjection,
	type MprWindowPreset,
	imagingKindLabels,
	imagingSourceLabels,
} from "../imagingUiLabels";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
} from "../mprControlMath";
import {
	localImagingFolderFingerprint,
} from "../utils/browserScanUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	logger,
} from "../utils/logger";
import {
	isOptionValue,
	isRecordKey,
	isStringUnionValue,
} from "./guardUtils";
import {
	imagingViewerLocalStoragePrefix,
	localImagingFolderStorageKey,
	sensitiveLocalDraftRetentionMs,
} from "./storageHelpers";
import {
	type ImagingViewerLocalDraft,
	type ImagingViewerPlan,
	type LocalImagingFolderDraft,
	type MprWorkbenchState,
} from "./types";

export function viewerWindowPresetForStudy(
	kind: ImagingStudyKind | null | undefined,
): ImagingViewerWindowPreset {
	if (kind === "cbct") return "bone";
	if (kind === "photo") return "photo";
	if (kind === "bitewing") return "caries";
	if (kind === "opg") return "perio";
	return "endo";
}

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
