/**
 * Pure validator and honest exporter for local radiology files uploaded by the doctor.
 * Supports Part 10 DICOM (.dcm, .dicom), TIFF (.tif, .tiff), PNG (.png), JPG/JPEG (.jpg, .jpeg), WebP (.webp).
 * Standards: Mandate 8b (<= 800 lines), Mandate 8e (Doctor Autonomy).
 */

import { showToast } from "../GlobalToast";
import {
	createDicomSecondaryCaptureFile,
	triggerBinaryDownload,
} from "../visiograph/VisiographDicomExporter";
export {
	createDicomSecondaryCaptureFile,
	triggerBinaryDownload,
};
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { parseDicomSliceHeader } from "./realDicomVolumeLoader";
import type { RadiologyStudy } from "./types";

export interface SensorModelSpec {
	id: string;
	name: string;
	brand: "vatech" | "carestream" | "kavo" | "fona" | "woodpecker" | "planmeca" | "sirona" | "generic";
	resolution: string;
	pixelSpacing: number;
}

export const POPULAR_RVG_SENSORS: readonly SensorModelSpec[] = [
	{
		id: "vatech_ezsensor_hd",
		name: "Vatech EzSensor HD",
		brand: "vatech",
		resolution: "29.2 lp/mm (CMOS)",
		pixelSpacing: 0.035,
	},
	{
		id: "carestream_rvg_6200",
		name: "Carestream / Kodak RVG 5200 / 6200",
		brand: "carestream",
		resolution: "24.0 lp/mm (True Res)",
		pixelSpacing: 0.042,
	},
	{
		id: "kavo_gxs_700",
		name: "KaVo Gendex GXS-700",
		brand: "kavo",
		resolution: "25.0 lp/mm (Direct USB)",
		pixelSpacing: 0.04,
	},
	{
		id: "fona_cdrelite",
		name: "FONA CDRelite / Schick",
		brand: "fona",
		resolution: "28.0 lp/mm (Active CMOS)",
		pixelSpacing: 0.038,
	},
	{
		id: "woodpecker_isensor",
		name: "Woodpecker i-Sensor H1 / H2",
		brand: "woodpecker",
		resolution: "25.0 lp/mm (CsI CMOS)",
		pixelSpacing: 0.04,
	},
	{
		id: "planmeca_prosensor",
		name: "Planmeca ProSensor HD",
		brand: "planmeca",
		resolution: "33.7 lp/mm (Fiber-Optic)",
		pixelSpacing: 0.03,
	},
	{
		id: "sirona_xios_xg",
		name: "Dentsply Sirona XIOS XG Supreme",
		brand: "sirona",
		resolution: "33.3 lp/mm (WiFi / USB)",
		pixelSpacing: 0.04,
	},
];

export function validateRadiologyUploadFile(file: { name: string; type?: string }): {
	isValid: boolean;
	format: "dicom" | "tiff" | "image" | "unsupported";
} {
	const lowerName = file.name.toLowerCase();
	const isDicom = lowerName.endsWith(".dcm") || lowerName.endsWith(".dicom");
	const isTiff = lowerName.endsWith(".tif") || lowerName.endsWith(".tiff");
	const isImage =
		lowerName.endsWith(".png") ||
		lowerName.endsWith(".jpg") ||
		lowerName.endsWith(".jpeg") ||
		lowerName.endsWith(".webp") ||
		lowerName.endsWith(".bmp") ||
		(file.type?.startsWith("image/") ?? false);

	if (isDicom) return { isValid: true, format: "dicom" };
	if (isTiff) return { isValid: true, format: "tiff" };
	if (isImage) return { isValid: true, format: "image" };
	return { isValid: false, format: "unsupported" };
}

/**
 * Detects sensor apparatus brand from filename, directory path, or apparatus tag.
 */
export function detectRadiologySensorBrand(input: string): string {
	const lower = input.toLowerCase();
	if (lower.includes("ezsensor") || lower.includes("ezdent") || lower.includes("vatech")) {
		return "Vatech EzSensor HD";
	}
	if (lower.includes("carestream") || lower.includes("kodak") || lower.includes("rvg 5200") || lower.includes("rvg 6200") || lower.includes("rvg_6200") || lower.includes("rvg_5200") || lower.includes("cs imaging")) {
		return "Carestream / Kodak RVG 5200 / 6200";
	}
	if (lower.includes("kavo") || lower.includes("gendex") || lower.includes("gxs") || lower.includes("vixwin")) {
		return "KaVo Gendex GXS-700";
	}
	if (lower.includes("fona") || lower.includes("cdrelite") || lower.includes("schick")) {
		return "FONA CDRelite / Schick";
	}
	if (lower.includes("woodpecker") || lower.includes("i-sensor") || lower.includes("isensor")) {
		return "Woodpecker i-Sensor H1 / H2";
	}
	if (lower.includes("romexis") || lower.includes("planmeca") || lower.includes("prosensor")) {
		return "Planmeca ProSensor HD";
	}
	if (lower.includes("sidexis") || lower.includes("sirona") || lower.includes("xios")) {
		return "Dentsply Sirona XIOS XG Supreme";
	}
	return "Vatech EzSensor HD";
}

/**
 * Robustly extracts FDI tooth numbers (11..48) from a file name or projection label.
 * Supports bitewing and occlusal keyword patterns.
 */
export function extractTeethFromRadiologyFilename(filename: string): string[] {
	const lower = filename.toLowerCase();

	if (lower.includes("bitewing_q1q4") || lower.includes("bw_right") || lower.includes("bw_r") || lower.includes("прикус_прав")) {
		return ["17", "16", "15", "14", "47", "46", "45", "44"];
	}
	if (lower.includes("bitewing_q2q3") || lower.includes("bw_left") || lower.includes("bw_l") || lower.includes("прикус_лев")) {
		return ["24", "25", "26", "27", "34", "35", "36", "37"];
	}
	if (lower.includes("occlusal_upper") || lower.includes("окклюз_вч") || lower.includes("окклюзия_верх")) {
		return ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
	}
	if (lower.includes("occlusal_lower") || lower.includes("окклюз_нч") || lower.includes("окклюзия_низ")) {
		return ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	}

	// Match FDI tooth codes (11..48), preceded/followed by non-digit or string boundary (e.g. Tooth21, 46.dcm, 16_15)
	const regex = /(?:^|[^0-9])([1-4][1-8])(?![0-9])/g;
	const teeth: string[] = [];
	let match: RegExpExecArray | null;
	while ((match = regex.exec(filename)) !== null) {
		if (match[1]) teeth.push(match[1]);
	}
	if (teeth.length > 0) {
		return Array.from(new Set(teeth)).sort();
	}

	return [];
}

/**
 * Decodes raw 8-bit or 16-bit DICOM pixel data from an ArrayBuffer to a viewable Data URL.
 * Automatically computes windowing/contrast normalization.
 */
export function convertDicomBufferToDataUrl(buffer: ArrayBuffer): string | null {
	if (typeof document === "undefined" || buffer.byteLength < 132) return null;
	try {
		const header = parseDicomSliceHeader(buffer);
		if (header.pixelDataByteOffset <= 0 || header.cols <= 0 || header.rows <= 0) {
			return null;
		}
		const cols = header.cols;
		const rows = header.rows;
		const pixelByteLen = header.pixelDataByteLength || (buffer.byteLength - header.pixelDataByteOffset);
		if (pixelByteLen <= 0) return null;

		const canvas = document.createElement("canvas");
		canvas.width = cols;
		canvas.height = rows;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		const imgData = ctx.createImageData(cols, rows);
		const out = imgData.data;

		if (header.bitsAllocated === 8) {
			const raw8 = new Uint8Array(buffer, header.pixelDataByteOffset, Math.min(cols * rows, pixelByteLen));
			for (let i = 0; i < raw8.length; i++) {
				const v = raw8[i] ?? 0;
				const o = i * 4;
				out[o] = v;
				out[o + 1] = v;
				out[o + 2] = v;
				out[o + 3] = 255;
			}
		} else {
			// 16-bit allocated (typically 12 or 16 bits stored)
			const numWords = Math.min(cols * rows, Math.floor(pixelByteLen / 2));
			const isSigned = header.pixelRepresentation === 1;
			const view = new DataView(buffer, header.pixelDataByteOffset);
			const bits = header.bitsStored > 0 && header.bitsStored <= 16 ? header.bitsStored : 16;
			const mask = (1 << bits) - 1;

			let minVal = 65535;
			let maxVal = 0;
			const sampleStep = Math.max(1, Math.floor(numWords / 800));
			for (let i = 0; i < numWords; i += sampleStep) {
				const w = isSigned ? view.getInt16(i * 2, true) : view.getUint16(i * 2, true);
				const u = w & mask;
				if (u < minVal) minVal = u;
				if (u > maxVal) maxVal = u;
			}
			if (minVal >= maxVal) {
				minVal = 0;
				maxVal = (1 << bits) - 1;
			}

			const range = maxVal - minVal || 1;
			for (let i = 0; i < numWords; i++) {
				const w = isSigned ? view.getInt16(i * 2, true) : view.getUint16(i * 2, true);
				const u = w & mask;
				const norm = Math.max(0, Math.min(255, Math.round(((u - minVal) / range) * 255)));
				const o = i * 4;
				out[o] = norm;
				out[o + 1] = norm;
				out[o + 2] = norm;
				out[o + 3] = 255;
			}
		}

		ctx.putImageData(imgData, 0, 0);
		return canvas.toDataURL("image/png");
	} catch (err) {
		console.warn("[directRvgFileValidation] Failed to decode DICOM pixel data to data URL:", err);
		return null;
	}
}

/**
 * Computes exact file name and MIME type for export without extension spoofing.
 * Prevents downloading JPEG with .dcm extension when DICOM buffer is unavailable.
 */
export function getDirectRvgExportFileName(
	teeth: string[],
	cardNumber: string,
	hasDicomBuffer: boolean,
	imageUrl: string,
): { filename: string; mimeType: string; isDicom: boolean } {
	const sanitizedCard = (cardNumber || "043-u").replace(/[/\\?%*:|"<>]/g, "-");
	const toothTag = teeth.length > 0 ? teeth.join("_") : "16";

	if (hasDicomBuffer) {
		return {
			filename: `RVG_Tooth_${toothTag}_${sanitizedCard}.dcm`,
			mimeType: "application/dicom",
			isDicom: true,
		};
	}

	const isPng = imageUrl.startsWith("data:image/png");
	const ext = isPng ? "png" : "jpg";
	const mime = isPng ? "image/png" : "image/jpeg";
	return {
		filename: `RVG_Tooth_${toothTag}_${sanitizedCard}.${ext}`,
		mimeType: mime,
		isDicom: false,
	};
}

export interface DirectRvgExportParams {
	readonly study: RadiologyStudy;
	readonly canvas: HTMLCanvasElement | null;
	readonly selectedTeeth: string[];
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientCardNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly capturedImage: string;
	readonly pixelSpacingMm: number;
	readonly onExportDicom?: ((study: RadiologyStudy) => void) | undefined;
}

/**
 * Executes direct RVG DICOM Part 10 or genuine raster export without extension spoofing.
 */
export function exportDirectRvgImageOrDicom({
	study,
	canvas,
	selectedTeeth,
	patientId,
	patientName,
	patientCardNumber,
	doctorName,
	capturedImage,
	pixelSpacingMm,
	onExportDicom,
}: DirectRvgExportParams): void {
	if (onExportDicom) {
		onExportDicom(study);
	}

	let dicomBytes: Uint8Array | null = null;
	if (canvas && canvas.width > 0 && canvas.height > 0) {
		try {
			dicomBytes = createDicomSecondaryCaptureFile(canvas, {
				patientId: patientId || "PAT-001",
				patientFullName: patientName || "UNKNOWN^PATIENT",
				clinicName: "ООО «Денте Стоматология»",
				doctorFullName: doctorName || "Лечащий врач",
				modality: "IO",
				toothCode: selectedTeeth.join(", "),
				scaleMmPerPixel: pixelSpacingMm || 0.035,
			});
		} catch (err) {
			console.warn(
				"DirectRvgCaptureModal: Failed to generate DICOM buffer, falling back to honest image export",
				err,
			);
		}
	}

	const exportInfo = getDirectRvgExportFileName(
		selectedTeeth,
		patientCardNumber || "043-u",
		Boolean(dicomBytes && dicomBytes.length > 0),
		capturedImage,
	);

	if (dicomBytes && dicomBytes.length > 0) {
		triggerBinaryDownload(dicomBytes, exportInfo.filename, exportInfo.mimeType);
		showToast(
			`Файл цифрового снимка DICOM Part 10 (.dcm) для зуба ${selectedTeeth.join(", ")} успешно экспортирован`,
			"success",
		);
	} else {
		const link = document.createElement("a");
		link.href = capturedImage;
		link.download = exportInfo.filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		const extLabel = exportInfo.filename.split(".").pop()?.toUpperCase() || "IMAGE";
		showToast(
			`Файл цифрового снимка (${extLabel}) для зуба ${selectedTeeth.join(", ")} успешно экспортирован`,
			"success",
		);
	}
}

export interface PersistRvgScanParams {
	readonly patientId?: string | undefined;
	readonly capturedImage: string;
	readonly selectedTeeth: string[];
	readonly clinicalNotes: string;
}

/**
 * Asynchronously persists captured RVG scan to backend server database.
 */
export function persistRvgScanToServer({
	patientId,
	capturedImage,
	selectedTeeth,
	clinicalNotes,
}: PersistRvgScanParams): void {
	if (!patientId || !capturedImage) return;
	if (!capturedImage.startsWith("data:image/") && !capturedImage.startsWith("blob:")) return;

	void (async () => {
		try {
			let imageBase64 = capturedImage;
			if (capturedImage.startsWith("blob:")) {
				const blob = await fetch(capturedImage).then((r) => r.blob());
				imageBase64 = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.onloadend = () => resolve(reader.result as string);
					reader.readAsDataURL(blob);
				});
			}
			await fetch("/api/xray/scans", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					imageBase64,
					originalFilename: `rvg_tooth_${selectedTeeth.join("_")}_${Date.now()}.jpg`,
					mimeType: "image/jpeg",
					kind: "periapical",
					toothCode: selectedTeeth[0] || null,
					notes: clinicalNotes,
					status: "done",
				}),
			}).catch((err) => {
				console.warn("[DirectRvgCaptureModal] Failed to persist scan to server:", err);
			});
		} catch (err) {
			console.warn("[DirectRvgCaptureModal] Server save error:", err);
		}
	})();
}

export interface ProcessRadiologyFileResult {
	readonly imageUrl: string;
	readonly detectedSensor?: string | undefined;
	readonly matchedSensorId?: string | undefined;
	readonly detectedTeeth?: string[] | undefined;
	readonly suggestedProjection?: "bitewing" | "periapical" | undefined;
	readonly clinicalNote?: string | undefined;
}

/**
 * Reads and decodes a local radiology file (DICOM buffer, TIFF, PNG, JPG),
 * automatically extracting detected sensor brand, FDI tooth numbers, and image data URL.
 */
export async function readRadiologyFileForCapture(file: File): Promise<ProcessRadiologyFileResult> {
	const detectedSensor = detectRadiologySensorBrand(file.name);
	const matchedSensor = POPULAR_RVG_SENSORS.find((s) => s.name === detectedSensor);
	const detectedTeeth = extractTeethFromRadiologyFilename(file.name);

	let suggestedProjection: "bitewing" | "periapical" | undefined = undefined;
	if (detectedTeeth.length > 1) {
		const hasUpper = detectedTeeth.some((t) => ["14", "15", "16", "17", "24", "25", "26", "27"].includes(t));
		const hasLower = detectedTeeth.some((t) => ["44", "45", "46", "47", "34", "35", "36", "37"].includes(t));
		if (hasUpper && hasLower) suggestedProjection = "bitewing";
	}

	const lowerName = file.name.toLowerCase();
	const isDcm = lowerName.endsWith(".dcm") || lowerName.endsWith(".dicom");

	if (isDcm) {
		const buffer = await file.arrayBuffer();
		const decodedUrl = convertDicomBufferToDataUrl(buffer);
		if (decodedUrl) {
			return {
				imageUrl: decodedUrl,
				detectedSensor,
				matchedSensorId: matchedSensor?.id,
				detectedTeeth: detectedTeeth.length > 0 ? detectedTeeth : undefined,
				suggestedProjection,
				clinicalNote: `Загружен снимок DICOM: ${file.name} (${Math.round(file.size / 1024)} КБ, ${detectedSensor}).`,
			};
		}
	}

	// Standard image or fallback
	const dataUrl = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") resolve(reader.result);
			else reject(new Error("Failed to read file as Data URL"));
		};
		reader.onerror = () => reject(reader.error || new Error("File read error"));
		reader.readAsDataURL(file);
	});

	return {
		imageUrl: dataUrl,
		detectedSensor,
		matchedSensorId: matchedSensor?.id,
		detectedTeeth: detectedTeeth.length > 0 ? detectedTeeth : undefined,
		suggestedProjection,
		clinicalNote: `Загружен снимок: ${file.name} (${Math.round(file.size / 1024)} КБ).`,
	};
}

