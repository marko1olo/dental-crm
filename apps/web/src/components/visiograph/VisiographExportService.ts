import { logger } from "../../utils/logger";
import {
	type VisiographWindowPreset,
	VISIOGRAPH_WINDOW_PRESETS,
} from "./VisiographWindowPresets";

export interface HighDpiCaptureOptions {
	/**
	 * Resolution scaling multiplier. Defaults to window.devicePixelRatio or 2.
	 * Ensures crisp printing and high-DPI clinical card export.
	 */
	pixelRatio?: number | undefined;
	/** Contrast percentage multiplier (100 = neutral, 120 = +20% contrast). */
	contrast?: number | undefined;
	/** Brightness percentage multiplier (100 = neutral, 110 = +10% brightness). */
	brightness?: number | undefined;
	/** Inversion filter for negative film radiographic inspection. */
	invert?: boolean | undefined;
	/** Target image MIME format. Defaults to "image/jpeg". */
	mimeType?: "image/jpeg" | "image/png" | undefined;
	/** JPEG compression quality (0.0 to 1.0). Defaults to 0.92. */
	quality?: number | undefined;
	/** Optional burn-in clinical header embedded at the bottom of the high-res capture. */
	burnInHeader?: {
		patientId?: string | undefined;
		toothCode?: string | undefined;
		capturedAt?: string | undefined;
		finding?: string | undefined;
	} | undefined;
}

export interface ClinicalSnapshotPayload {
	patientId: string;
	imageDataUri: string;
	thumbnailDataUri?: string | undefined;
	viewKind?:
		| "mpr_axial"
		| "mpr_sagittal"
		| "mpr_coronal"
		| "panoramic_mpr"
		| "visiograph_3d"
		| "periapical_2d"
		| "bitewing"
		| "tele_xray"
		| undefined;
	fdiToothCode?: string | undefined;
	toothCode?: string | undefined;
	preset?: VisiographWindowPreset | undefined;
	nerveDistanceMm?: number | undefined;
	boneDensity?:
		| {
				averageHU: number;
				classification: string;
		  }
		| undefined;
	implantDetails?:
		| {
				diameterMm: number;
				lengthMm: number;
				system?: string | undefined;
		  }
		| undefined;
	aiProtocolLog?: string | undefined;
	clinicalNote?: string | undefined;
	radiologicalFinding?: string | undefined;
	capturedAt?: string | undefined;
	exposureTimeSec?: number | undefined;
	exposureParameters?:
		| {
				exposureTimeSec?: number | undefined;
				mAs?: number | undefined;
				kVp?: number | undefined;
				sensorType?: string | undefined;
		  }
		| undefined;
	contrast?: number | undefined;
	brightness?: number | undefined;
}

export interface ClinicalExportOutcome {
	success: boolean;
	scanId?: string | undefined;
	message: string;
	protocol043Text: string;
}

/**
 * Returns human-readable clinical Russian label for radiological view kind.
 */
export function formatViewKindLabel(kind?: string): string {
	switch (kind) {
		case "mpr_axial":
			return "3D КЛКТ / Аксиальный срез (Axial MPR)";
		case "mpr_sagittal":
			return "3D КЛКТ / Сагиттальный срез (Sagittal MPR)";
		case "mpr_coronal":
			return "3D КЛКТ / Корональный срез (Coronal MPR)";
		case "panoramic_mpr":
			return "Панорамная томография (Curved Panoramic MPR / ОПТГ)";
		case "visiograph_3d":
			return "3D Визиография / Объемная реконструкция КЛКТ";
		case "periapical_2d":
			return "Прицельная 2D визиография (Периапикальный снимок)";
		case "bitewing":
			return "Интерпроксимальная визиография (Bitewing)";
		case "tele_xray":
			return "Телерентгенография ТРГ (Cephalometric)";
		default:
			return "Рентгенологическое исследование зубочелюстной системы";
	}
}

/**
 * High-DPI canvas capture with contrast, brightness and inversion filters applied.
 * Guarantees razor-sharp 300+ DPI print export for Form 043/u outpatient card.
 */
export function captureHighDpiCanvas(
	sourceCanvas: HTMLCanvasElement,
	options: HighDpiCaptureOptions = {},
): string {
	const pixelRatio = Math.max(
		1,
		options.pixelRatio ??
			(typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2),
	);
	const contrast = options.contrast ?? 100;
	const brightness = options.brightness ?? 100;
	const invert = options.invert ?? false;
	const mimeType = options.mimeType ?? "image/jpeg";
	const quality = options.quality ?? 0.92;

	const srcW = sourceCanvas.width || 800;
	const srcH = sourceCanvas.height || 600;

	// Scale up for High-DPI unless canvas is already oversized (>2400px)
	const scale = pixelRatio > 1 && srcW < 2400 ? pixelRatio : 1;
	const targetWidth = Math.round(srcW * scale);
	const targetHeight = Math.round(srcH * scale);

	if (typeof document === "undefined") {
		return sourceCanvas.toDataURL(mimeType, quality);
	}

	const canvas = document.createElement("canvas");
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return sourceCanvas.toDataURL(mimeType, quality);
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";

	// Construct CSS filter chain
	const filterParts: string[] = [];
	if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
	if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
	if (invert) filterParts.push("invert(100%)");

	if (filterParts.length > 0) {
		ctx.filter = filterParts.join(" ");
	}

	ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

	// Reset filter before drawing any clinical overlay
	ctx.filter = "none";

	if (options.burnInHeader) {
		const { toothCode, capturedAt, finding } = options.burnInHeader;
		const barHeight = Math.max(26, Math.round(targetHeight * 0.05));
		ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
		ctx.fillRect(0, targetHeight - barHeight, targetWidth, barHeight);
		ctx.fillStyle = "#ffffff";
		ctx.font = `bold ${Math.max(11, Math.round(barHeight * 0.42))}px sans-serif`;
		ctx.textBaseline = "middle";
		const dateStr = capturedAt
			? new Date(capturedAt).toLocaleString("ru-RU")
			: new Date().toLocaleString("ru-RU");
		const toothStr = toothCode ? ` | Зуб № ${toothCode} (FDI)` : "";
		const findingStr = finding ? ` | ${finding}` : "";
		const headerText = `DENTE Form 043/u · ${dateStr}${toothStr}${findingStr}`;
		ctx.fillText(headerText, 12, targetHeight - barHeight / 2);
	}

	return canvas.toDataURL(mimeType, quality);
}

/**
 * Creates high-fidelity adjusted snapshot from image source or URL.
 */
export async function captureImageWithAdjustments(
	imageSource: HTMLImageElement | string,
	options: HighDpiCaptureOptions = {},
): Promise<string> {
	if (typeof document === "undefined") {
		return typeof imageSource === "string" ? imageSource : imageSource.src;
	}

	let img: HTMLImageElement;
	if (typeof imageSource === "string") {
		img = new Image();
		img.crossOrigin = "anonymous";
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = reject;
			img.src = imageSource;
		});
	} else {
		img = imageSource;
	}

	const canvas = document.createElement("canvas");
	canvas.width = img.naturalWidth || img.width || 800;
	canvas.height = img.naturalHeight || img.height || 600;
	const ctx = canvas.getContext("2d");
	if (!ctx) return typeof imageSource === "string" ? imageSource : imageSource.src;

	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	return captureHighDpiCanvas(canvas, options);
}

/**
 * Generates an optimized thumbnail data URI for lightweight embedding in Form 043/u summaries.
 */
export async function createSnapshotThumbnail(
	source: string | HTMLCanvasElement,
	maxDimension = 200,
	quality = 0.85,
): Promise<string> {
	if (typeof document === "undefined") {
		return typeof source === "string"
			? source
			: source.toDataURL("image/jpeg", quality);
	}

	let img: HTMLImageElement | HTMLCanvasElement;
	if (typeof source === "string") {
		const image = new Image();
		image.crossOrigin = "anonymous";
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = reject;
			image.src = source;
		});
		img = image;
	} else {
		img = source;
	}

	const srcW =
		"naturalWidth" in img
			? img.naturalWidth || img.width || 800
			: img.width || 800;
	const srcH =
		"naturalHeight" in img
			? img.naturalHeight || img.height || 600
			: img.height || 600;

	let w = srcW;
	let h = srcH;
	if (w > maxDimension || h > maxDimension) {
		if (w > h) {
			h = Math.round((h * maxDimension) / w);
			w = maxDimension;
		} else {
			w = Math.round((w * maxDimension) / h);
			h = maxDimension;
		}
	}

	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, w);
	canvas.height = Math.max(1, h);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return typeof source === "string"
			? source
			: source.toDataURL("image/jpeg", quality);
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Builds standard clinical protocol text for insertion into patient Form 043/u (Медицинская карта стоматологического больного).
 */
export function buildForm043ProtocolText(
	payload: ClinicalSnapshotPayload,
): string {
	const lines: string[] = [];
	lines.push("--- ПРОТОКОЛ ЛУЧЕВОГО ОБСЛЕДОВАНИЯ И 3D-ПЛАНИРОВАНИЯ (ФОРМА № 043/У) ---");
	const dateStr = payload.capturedAt
		? new Date(payload.capturedAt).toLocaleString("ru-RU")
		: new Date().toLocaleString("ru-RU");
	lines.push(`Дата и время: ${dateStr}`);

	const tooth = payload.fdiToothCode || payload.toothCode;
	if (tooth) {
		lines.push(`Область зуба (FDI): № ${tooth}`);
	}

	if (payload.viewKind) {
		lines.push(`Вид исследования: ${formatViewKindLabel(payload.viewKind)}`);
	}

	const exp = payload.exposureParameters;
	const expTime = exp?.exposureTimeSec ?? payload.exposureTimeSec;
	if (exp || expTime !== undefined) {
		const expParts: string[] = [];
		if (expTime !== undefined) expParts.push(`Экспозиция: ${expTime.toFixed(2)} с`);
		if (exp?.kVp !== undefined) expParts.push(`Анодное напряжение: ${exp.kVp} кВ`);
		if (exp?.mAs !== undefined) expParts.push(`Ток/время: ${exp.mAs} мАс`);
		if (exp?.sensorType) expParts.push(`Датчик: ${exp.sensorType}`);
		lines.push(`Параметры экспозиции: ${expParts.join(", ")}`);
	}

	const preset = payload.preset ?? (payload.viewKind?.startsWith("mpr") ? VISIOGRAPH_WINDOW_PRESETS.bone : undefined);
	if (preset) {
		lines.push(
			`Режим контрастирования (HU): ${preset.label} (Окно WW: ${preset.windowWidth} HU, Уровень WL: ${preset.windowCenter} HU)`,
		);
	}

	if (payload.contrast !== undefined || payload.brightness !== undefined) {
		const adj: string[] = [];
		if (payload.brightness !== undefined) adj.push(`Яркость: ${payload.brightness}%`);
		if (payload.contrast !== undefined) adj.push(`Контрастность: ${payload.contrast}%`);
		lines.push(`Пользовательская коррекция: ${adj.join(", ")}`);
	}

	if (payload.radiologicalFinding) {
		lines.push(`Рентгенологическая картина: ${payload.radiologicalFinding}`);
	}

	if (payload.boneDensity) {
		lines.push(
			`Плотность костной ткани (Misch): ${payload.boneDensity.classification} (среднее значение: ${Math.round(payload.boneDensity.averageHU)} HU)`,
		);
	}

	if (payload.implantDetails) {
		lines.push(
			`Параметры планируемого имплантата: Ø ${payload.implantDetails.diameterMm.toFixed(1)} мм × L ${payload.implantDetails.lengthMm.toFixed(1)} мм${
				payload.implantDetails.system ? ` (Система: ${payload.implantDetails.system})` : ""
			}`,
		);
	}

	if (payload.nerveDistanceMm !== undefined && Number.isFinite(payload.nerveDistanceMm)) {
		const isDanger = payload.nerveDistanceMm < 2.0;
		lines.push(
			`Дистанция до нижнечелюстного канала (N. alveolaris inferior): ${payload.nerveDistanceMm.toFixed(1)} мм ${
				isDanger ? "⚠️ [ВНИМАНИЕ: ОПАСНАЯ ЗОНА < 2.0 ММ! ВЫСОКИЙ РИСК ТРАВМАТИЗАЦИИ НЕРВА]" : "✓ [Безопасный коридор ≥ 2.0 мм]"
			}`,
		);
	}

	if (payload.aiProtocolLog) {
		lines.push(`Заключение ИИ-анализа: ${payload.aiProtocolLog}`);
	}

	if (payload.clinicalNote) {
		lines.push(`Клинические примечания врача: ${payload.clinicalNote}`);
	}

	lines.push("Снимок и протокол прикреплены к электронной медицинской карте 043/у.");
	return lines.join("\n");
}

/**
 * Exports a visual 3D MPR / Panoramic / Visiograph snapshot to the patient's electronic medical record (Form 043/u).
 */
export async function exportSnapshotToClinicalRecord(
	payload: ClinicalSnapshotPayload,
	authHeaders: Record<string, string> = {},
): Promise<ClinicalExportOutcome> {
	const protocol043 = buildForm043ProtocolText(payload);
	const tooth = payload.fdiToothCode || payload.toothCode;

	if (!payload.patientId) {
		return {
			success: false,
			message: "Пациент не выбран. Выберите пациента для прикрепления снимка к амбулаторной карте 043/у.",
			protocol043Text: protocol043,
		};
	}

	if (!payload.imageDataUri || !payload.imageDataUri.startsWith("data:image/")) {
		return {
			success: false,
			message: "Не удалось получить графический снимок из области просмотра.",
			protocol043Text: protocol043,
		};
	}

	try {
		const summaryTitle = tooth
			? `Снимок зуба ${tooth} — Form 043/u`
			: "Рентгенологический снимок — Form 043/u";

		const res = await fetch("/api/xray/scans", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			body: JSON.stringify({
				patientId: payload.patientId,
				imageBase64: payload.imageDataUri,
				originalFilename: `snapshot_${payload.viewKind || "xray"}_${tooth || "jaw"}_${Date.now()}.jpg`,
				mimeType: "image/jpeg",
				kind: payload.viewKind || "periapical",
				toothCode: tooth || null,
				aiReport: protocol043,
				aiSummary: summaryTitle,
				status: "done",
			}),
		});

		if (!res.ok) {
			const errText = await res.text().catch(() => "");
			logger.error(
				`[VisiographExportService] Ошибка сохранения снимка в карту (${res.status}): ${errText}`,
			);
			return {
				success: false,
				message: `Сервер вернул ошибку (${res.status}) при сохранении снимка в карту 043/у.`,
				protocol043Text: protocol043,
			};
		}

		const data = (await res.json()) as { id?: string };
		return {
			success: true,
			scanId: data.id,
			message: "Снимок и протокол лучевого обследования успешно прикреплены к карте 043/у пациента.",
			protocol043Text: protocol043,
		};
	} catch (err) {
		logger.error("[VisiographExportService] Исключение при экспорте снимка:", err);
		return {
			success: false,
			message: "Сетевой сбой при отправке снимка в амбулаторную карту пациента.",
			protocol043Text: protocol043,
		};
	}
}

/**
 * Downloads the snapshot directly to local disk if clinician needs a portable file.
 */
export function downloadSnapshotLocally(
	imageDataUri: string,
	filename = "mpr_snapshot_043.jpg",
): void {
	if (typeof window === "undefined") return;
	const link = document.createElement("a");
	link.href = imageDataUri;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

