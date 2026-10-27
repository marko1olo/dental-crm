/**
 * @file fileSearchHelper.ts
 * @description Классификаторы модальностей медицинских файлов и проверка доступности директорий.
 */

import path from "node:path";
import { isPathSafe } from "./desktopSecurity.js";

export function detectFileModalityAndCategory(
	fileName: string,
	fileSizeBytes: number,
): {
	modality: "dicom" | "rvg" | "photo" | "spreadsheet" | "document" | "report" | "unknown";
	category: "xray_study" | "pricelist" | "patient_database" | "clinical_report" | "general";
} {
	const ext = path.extname(fileName).toLowerCase().replace(/^\./, "");
	const lower = fileName.toLowerCase();

	if (ext === "dcm" || lower.includes("dicom") || lower.includes("cbct") || /(?:^|[_\-. ])ct(?:[_\-. ]|$)/i.test(fileName) || fileSizeBytes > 15 * 1024 * 1024) {
		return { modality: "dicom", category: "xray_study" };
	}
	if (ext === "rvg" || lower.includes("sensor") || lower.includes("rvg") || lower.includes("xray") || lower.includes("визиограф")) {
		return { modality: "rvg", category: "xray_study" };
	}
	if (["xlsx", "xls", "csv"].includes(ext)) {
		if (lower.includes("price") || lower.includes("прайс") || lower.includes("услуг") || lower.includes("service") || lower.includes("тариф")) {
			return { modality: "spreadsheet", category: "pricelist" };
		}
		if (lower.includes("patient") || lower.includes("пациент") || lower.includes("клиент") || lower.includes("база") || lower.includes("card")) {
			return { modality: "spreadsheet", category: "patient_database" };
		}
		return { modality: "spreadsheet", category: "general" };
	}
	if (["jpg", "jpeg", "png", "webp", "bmp", "tiff"].includes(ext)) {
		if (lower.includes("pano") || lower.includes("opg") || lower.includes("снимок") || lower.includes("xray")) {
			return { modality: "photo", category: "xray_study" };
		}
		return { modality: "photo", category: "general" };
	}
	if (["pdf", "doc", "docx", "txt", "rtf", "xml"].includes(ext)) {
		if (lower.includes("043") || lower.includes("выписка") || lower.includes("заключение") || lower.includes("протокол") || lower.includes("report") || lower.includes("согласие")) {
			return { modality: "report", category: "clinical_report" };
		}
		return { modality: "document", category: "general" };
	}
	return { modality: "unknown", category: "general" };
}

export function isDirectorySearchable(dirPath: string): boolean {
	if (!isPathSafe(dirPath)) return false;
	const lower = dirPath.toLowerCase().replace(/\\/g, "/");
	const forbiddenSubstrings = [
		"/windows",
		"/system volume information",
		"/$recycle.bin",
		"/program files/windowsapps",
		"/node_modules",
		"/.git",
		"/.vscode",
		"/.idea",
		"/.aws",
		"/.ssh",
	];
	for (const sub of forbiddenSubstrings) {
		if (lower.includes(sub)) return false;
	}
	return true;
}
