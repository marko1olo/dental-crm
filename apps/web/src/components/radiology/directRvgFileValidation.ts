/**
 * Pure validator and honest exporter for local radiology files uploaded by the doctor.
 * Supports Part 10 DICOM (.dcm, .dicom), TIFF (.tif, .tiff), PNG (.png), JPG/JPEG (.jpg, .jpeg), WebP (.webp).
 * Standards: Mandate 8b (<= 800 lines), Mandate 8e (Doctor Autonomy).
 */

import { showToast } from "../GlobalToast";
export {
	createDicomSecondaryCaptureFile,
	triggerBinaryDownload,
} from "../visiograph/VisiographDicomExporter";
import {
	createDicomSecondaryCaptureFile,
	triggerBinaryDownload,
} from "../visiograph/VisiographDicomExporter";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { RadiologyStudy } from "./types";

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
		(file.type?.startsWith("image/") ?? false);

	if (isDicom) return { isValid: true, format: "dicom" };
	if (isTiff) return { isValid: true, format: "tiff" };
	if (isImage) return { isValid: true, format: "image" };
	return { isValid: false, format: "unsupported" };
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
