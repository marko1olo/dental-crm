/**
 * normalization.ts — Layer 1: Функции нормализации строк, парсинга идентификаторов и сопоставления пациентов.
 */

import {
	type ImagingSourceKind,
	type ImagingStudyKind,
	normalizeDate,
} from "@dental/shared";
import type { getPatientsFromDb } from "../../../db/patientsQuery.js";
import {
	kindLabels,
	kindSynonyms,
} from "./types.js";

export function normalizeHeader(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replaceAll("_", " ")
		.replaceAll("-", " ")
		.replace(/\s+/g, " ");
}

export function detectDelimiter(headerLine: string) {
	const candidates = [";", ",", "\t", "|"];
	return (
		candidates
			.map((delimiter) => ({
				delimiter,
				count: headerLine.split(delimiter).length,
			}))
			.sort((left, right) => right.count - left.count)[0]?.delimiter ?? ";"
	);
}

export function normalizePhone(value: string | null) {
	if (!value) return null;
	const digits = value.replace(/\D/g, "");
	if (!digits) return null;
	if (digits.length === 10) return `+7${digits}`;
	if (digits.length === 11 && digits.startsWith("8"))
		return `+7${digits.slice(1)}`;
	if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
	return value.trim();
}

export function detectKind(value: string | null): ImagingStudyKind | null {
	if (!value) return null;
	return kindSynonyms.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

export function detectSourceKind(
	value: string | null,
	fallback: ImagingSourceKind,
): ImagingSourceKind {
	const text = value ?? "";
	if (/dicomweb|qido|wado/i.test(text)) return "dicomweb";
	if (/pacs|orthanc|dcm4chee/i.test(text)) return "pacs";
	if (fallback === "dicomweb" || fallback === "pacs") return fallback;
	if (/twain|wia/i.test(text)) return "twain_wia";
	if (
		/sensor|rvg|ezsensor|carestream|vatech|sopro|xios|schick|kodak|vistascan/i.test(
			text,
		)
	)
		return "sensor_bridge";
	if (
		/sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini view|dbswin|vistasoft|weasis|radiant|ohif|\.dcm|\.ima|\.zip|\.7z|\.rar|DICOMDIR|dicom/i.test(
			text,
		)
	) {
		return "dicom_file";
	}
	if (/watch|folder|папк/i.test(text)) return "folder_watch";
	return fallback;
}

export function extractFilePath(value: string) {
	const virtualArchivePath = value.match(
		/[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b|\\\\[^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b|\/[^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b/i,
	)?.[0];
	if (virtualArchivePath) return virtualArchivePath.trim();

	const absolutePath = value.match(
		/[A-Za-zА-Яа-яЁё]:[\\/][^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|[\\/]DICOMDIR\b)|\\\\[^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|[\\/]DICOMDIR\b)|\/[^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|\/DICOMDIR\b)/i,
	)?.[0];
	if (absolutePath) return absolutePath.trim();

	return (
		value.match(
			/\b[^\s;|,]+\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|\bDICOMDIR\b/i,
		)?.[0] ?? null
	);
}

export function extractTooth(value: string) {
	return value.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/)?.[0] ?? null;
}

export function extractPhone(value: string) {
	return normalizePhone(
		value.match(
			/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/,
		)?.[0] ?? null,
	);
}

export function normalizeDicomUid(value: string | null | undefined) {
	if (!value) return null;
	const uid = value.trim().match(/\b\d+(?:\.\d+){2,}\b/)?.[0] ?? null;
	return uid && uid.length <= 96 ? uid : null;
}

const dicomUidPatternCache = new Map<string, RegExp>();

export function extractDicomUid(value: string, labels: string[]) {
	for (const label of labels) {
		let pattern = dicomUidPatternCache.get(label);
		if (!pattern) {
			pattern = new RegExp(`${label}\\s*[:=]\\s*(\\d+(?:\\.\\d+){2,})`, "i");
			dicomUidPatternCache.set(label, pattern);
		}
		const match = pattern.exec(value);
		if (match?.[1]) return normalizeDicomUid(match[1]);
	}
	return null;
}

export function normalizeModality(value: string | null | undefined) {
	if (!value) return null;
	const normalized = value.trim().toUpperCase();
	if (/CBCT|КЛКТ|ККТ/.test(normalized)) return "CBCT";
	if (/\bCT\b|КТ/.test(normalized)) return "CT";
	if (/\bDX\b|DIGITAL RADIOGRAPHY/.test(normalized)) return "DX";
	if (/\bCR\b/.test(normalized)) return "CR";
	if (/\bPX\b|PAN|OPG|ОПТГ|ОРТОПАН/.test(normalized)) return "PX";
	if (/CEPH|TRG|ТРГ|ТЕЛЕРЕНТГ/.test(normalized)) return "CEPH";
	if (/\bIO\b|RVG|ПРИЦЕЛ/.test(normalized)) return "IO";
	if (/\bMR\b/.test(normalized)) return "MR";
	if (/\bUS\b/.test(normalized)) return "US";
	return normalized.slice(0, 24);
}

export function modalityToKind(
	modality: string | null,
	text: string | null,
): ImagingStudyKind | null {
	const detected = detectKind(text);
	if (detected) return detected;
	if (!modality) return null;
	if (modality === "CBCT" || modality === "CT" || modality === "MR")
		return "cbct";
	if (modality === "PX") return "opg";
	if (modality === "CEPH") return "ceph";
	if (modality === "DX" || modality === "CR" || modality === "IO")
		return "periapical";
	return null;
}

export function parseInstanceNumber(value: string | null | undefined) {
	if (!value) return null;
	const explicit = value.match(
		/(?:instance|slice|image|срез|кадр|номер)\D{0,12}(\d{1,6})/i,
	)?.[1];
	const fallback = value.match(
		/\b(\d{1,6})(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp))$/i,
	)?.[1];
	const parsed = Number(explicit ?? fallback ?? value.trim());
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parsePositiveInteger(value: string | null | undefined) {
	if (!value) return null;
	const parsed = Number(value.trim());
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const dicomFieldValuePatternCache = new Map<string, RegExp>();

export function extractDicomFieldValue(line: string, labels: string[]) {
	for (const label of labels) {
		let pattern = dicomFieldValuePatternCache.get(label);
		if (!pattern) {
			pattern = new RegExp(`${label}\\s*[:=]\\s*([^;|,]+)`, "i");
			dicomFieldValuePatternCache.set(label, pattern);
		}
		const match = pattern.exec(line);
		if (match?.[1]) return match[1].trim();
	}
	return null;
}

export function matchPatient(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	patientName: string | null,
	phone: string | null,
): {
	patient: Awaited<ReturnType<typeof getPatientsFromDb>>[number] | null;
	ambiguous: boolean;
	weakMatch: boolean;
} {
	if (phone) {
		const byPhone = patients.filter((p) => normalizePhone(p.phone) === phone);
		if (byPhone.length === 1)
			return { patient: byPhone[0] ?? null, ambiguous: false, weakMatch: false };
		if (byPhone.length > 1) {
			if (patientName) {
				const cleaned = patientName.trim().toLowerCase();
				const byBoth = byPhone.filter(
					(p) => p.fullName.trim().toLowerCase() === cleaned,
				);
				if (byBoth.length === 1)
					return {
						patient: byBoth[0] ?? null,
						ambiguous: false,
						weakMatch: false,
					};
			}
			return { patient: null, ambiguous: true, weakMatch: false };
		}
	}

	if (patientName) {
		const cleaned = patientName.trim().toLowerCase();
		const byName = patients.filter(
			(p) => p.fullName.trim().toLowerCase() === cleaned,
		);
		if (byName.length === 1)
			return { patient: byName[0] ?? null, ambiguous: false, weakMatch: true };
		if (byName.length > 1)
			return { patient: null, ambiguous: true, weakMatch: true };
	}

	return { patient: null, ambiguous: false, weakMatch: false };
}

export function cleanDicomText(value: Buffer): string | null {
	const text = value
		.toString("latin1")
		.replace(/\0/g, "")
		.replace(/\^/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return text || null;
}

export function normalizeDicomDate(value: string | null): string | null {
	if (!value) return null;
	const compact = value.match(/^(\d{4})(\d{2})(\d{2})$/);
	if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
	return normalizeDate(value);
}
