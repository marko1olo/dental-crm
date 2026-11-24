import path from "node:path";

/**
 * Может ли браузер показать этот файл снимка сам.
 *
 * Правило нужно в двух слоях сразу: маршрут решает, отдавать ли файл, а
 * построитель ссылок решает, куда вести `previewUrl`. Держать его в маршруте
 * нельзя — слой базы импортировал бы маршрут и получился бы цикл, поэтому
 * правило живёт отдельно.
 *
 * DICOM, архивы и всё неизвестное сюда не попадают намеренно: подсунуть их в
 * `<img>` значит показать сломанную картинку вместо честного объяснения, что
 * предпросмотра нет и снимок надо открыть в просмотрщике DICOM.
 */
export function browserRenderableImageMimeType(
	storagePath: string | null | undefined,
): string | null {
	if (!storagePath) return null;
	const extension = path.extname(storagePath).toLowerCase();
	if (extension === ".png") return "image/png";
	if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
	if (extension === ".webp") return "image/webp";
	if (extension === ".gif") return "image/gif";
	if (extension === ".bmp") return "image/bmp";
	return null;
}

/**
 * Проверяет, является ли файл снимком DICOM или специализированным форматом радиовизиографии (RVG/TIFF).
 */
export function isDicomOrRadiographFile(
	storagePath: string | null | undefined,
): boolean {
	if (!storagePath) return false;
	const extension = path.extname(storagePath).toLowerCase();
	return (
		extension === ".dcm" ||
		extension === ".dicom" ||
		extension === ".ima" ||
		extension === ".rvg" ||
		extension === ".tif" ||
		extension === ".tiff"
	);
}

export type ImagingMediaClassification =
	| "browser_image"
	| "dicom"
	| "radiograph_tiff"
	| "unsupported";

/**
 * Классифицирует тип медиафайла лучевой диагностики для корректной маршрутизации во вьюер или превью.
 */
export function classifyImagingFile(
	storagePath: string | null | undefined,
): ImagingMediaClassification {
	if (!storagePath) return "unsupported";
	if (browserRenderableImageMimeType(storagePath)) return "browser_image";
	const ext = path.extname(storagePath).toLowerCase();
	if (ext === ".dcm" || ext === ".dicom" || ext === ".ima" || ext === ".rvg") {
		return "dicom";
	}
	if (ext === ".tif" || ext === ".tiff") {
		return "radiograph_tiff";
	}
	return "unsupported";
}

export interface LightweightDicomPreviewSummary {
	readonly hasPixelData: boolean;
	readonly estimatedWidth?: number;
	readonly estimatedHeight?: number;
	readonly modality?: string;
	readonly isRenderableViaWeb: boolean;
	readonly suggestedViewer: "browser_img" | "dicom_web_viewer" | "external_app";
}

/**
 * Быстрое определение метаданных и применимости легковесного веб-превью без зависания CPU (Мандат 8e / 8k).
 * Для браузерных форматов (PNG/JPEG/WEBP) отдает мгновенный веб-рендер.
 * Для DICOM направляет во встроенный DICOM-вьюер без тяжелой фоновой перекодировки на сервере.
 */
export function inspectLightweightPreviewFeasibility(
	storagePath: string | null | undefined,
): LightweightDicomPreviewSummary {
	const classification = classifyImagingFile(storagePath);
	if (classification === "browser_image") {
		return {
			hasPixelData: true,
			isRenderableViaWeb: true,
			suggestedViewer: "browser_img",
		};
	}
	if (classification === "dicom") {
		return {
			hasPixelData: true,
			isRenderableViaWeb: false,
			suggestedViewer: "dicom_web_viewer",
		};
	}
	if (classification === "radiograph_tiff") {
		return {
			hasPixelData: true,
			isRenderableViaWeb: false,
			suggestedViewer: "external_app",
		};
	}
	return {
		hasPixelData: false,
		isRenderableViaWeb: false,
		suggestedViewer: "external_app",
	};
}
