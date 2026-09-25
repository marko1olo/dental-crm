/**
 * Pure validator for local radiology files uploaded by the doctor.
 * Supports Part 10 DICOM (.dcm, .dicom), TIFF (.tif, .tiff), PNG (.png), JPG/JPEG (.jpg, .jpeg), WebP (.webp).
 */
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
