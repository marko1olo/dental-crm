import type {
	ImagingViewerPlan,
} from "../types.js";
import type { CtImplantLibraryItem } from "../../ctPlanningTools";
import type {
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerImplantPlan,
	ImagingViewerWindowPreset,
	ImportSourceKind,
	SmartImportMode,
} from "@dental/shared";
import { localImagingFolderFingerprint } from "../../utils/browserScanUtils";

export function viewerWindowPresetForStudy(
	kind: ImagingStudyKind | null | undefined,
): ImagingViewerWindowPreset {
	if (kind === "cbct") return "bone";
	if (kind === "photo") return "photo";
	if (kind === "bitewing") return "caries";
	if (kind === "opg") return "perio";
	return "endo";
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
