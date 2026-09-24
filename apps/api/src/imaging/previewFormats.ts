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

/**
 * Генерирует легковесный векторный SVG-бейдж для превью снимка DICOM / КЛКТ / ОПТГ.
 * Нагрузка на CPU: 0мс. Исключает показ «битой картинки» в браузере при отсутствии сгенерированного JPEG.
 */
export function generateDicomPreviewFallbackSvg(params: {
	title?: string;
	modality?: string;
	patientName?: string;
	date?: string;
	width?: number;
	height?: number;
}): string {
	const w = params.width || 320;
	const h = params.height || 240;
	const modality = (params.modality || "DICOM / КЛКТ").toUpperCase();
	const title = params.title || "Исследование лучевой диагностики";
	const date = params.date || new Date().toLocaleDateString("ru-RU");

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#090d16" stroke="#1e293b" stroke-width="1.5" rx="6"/>
  <rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="#0f172a" rx="4" stroke="#334155" stroke-dasharray="4 4"/>
  <circle cx="${w / 2}" cy="${h / 2 - 16}" r="28" fill="#1e293b" stroke="#0d9488" stroke-width="2"/>
  <path d="M ${w / 2 - 12} ${h / 2 - 16} L ${w / 2 + 12} ${h / 2 - 16} M ${w / 2} ${h / 2 - 28} L ${w / 2} ${h / 2 - 4}" stroke="#14b8a6" stroke-width="2.5" stroke-linecap="round"/>
  <text x="${w / 2}" y="${h / 2 + 28}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#f8fafc" text-anchor="middle">${modality}</text>
  <text x="${w / 2}" y="${h / 2 + 46}" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">${title}</text>
  <text x="${w / 2}" y="${h / 2 + 62}" font-family="system-ui, -apple-system, sans-serif" font-size="9" fill="#64748b" text-anchor="middle">${date}</text>
</svg>`;
}
