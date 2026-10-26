/**
 * inferStudyKind.ts — Определение модальности исследования по имени файла
 * Mandate 8b: строго <= 120 строк.
 */

export type InferredImagingKind =
	| "periapical"
	| "bitewing"
	| "opg"
	| "cbct"
	| "photo_intraoral"
	| "photo_extraoral"
	| "other";

export function inferStudyKind(filename: string): InferredImagingKind {
	const lower = filename.toLowerCase();
	if (lower.includes("pano") || lower.includes("optg") || lower.includes("opg")) {
		return "opg";
	}
	if (
		lower.endsWith(".dcm") ||
		lower.endsWith(".dicom") ||
		lower.includes("cbct") ||
		lower.includes("ct") ||
		lower.includes("томограф")
	) {
		return "cbct";
	}
	if (
		lower.includes("photo") ||
		lower.includes("фото") ||
		lower.includes("intraoral") ||
		lower.includes("dsc_") ||
		lower.includes("img_")
	) {
		return "photo_intraoral";
	}
	if (lower.includes("bite") || lower.includes("прикус")) {
		return "bitewing";
	}
	return "periapical";
}
