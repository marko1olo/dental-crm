import {
	imagingImportPreviewResponseSchema
} from "@dental/shared";
import {
	normalizeDate,
	normalizePhone,
	splitLine,
	type ImagingStudyKind,
	type ImagingSourceKind,
	type ImagingImportPreviewRow,
} from "@dental/shared";
import {
	kindLabels,
	dicomHeaderAliases,
	type DicomManifestField,
} from "./imagingConstants.js";
import { getPatientsFromDb } from "../../db/patientsQuery.js";

export const headerAliases: Record<
	string,
	keyof Pick<
		ImagingImportPreviewRow,
		| "patientName"
		| "phone"
		| "kind"
		| "title"
		| "toothCode"
		| "region"
		| "capturedAt"
		| "filePath"
		| "sourceName"
	>
> = {
	fio: "patientName",
	fullname: "patientName",
	name: "patientName",
	patient: "patientName",
	"patient name": "patientName",
	фио: "patientName",
	пациент: "patientName",
	клиент: "patientName",
	phone: "phone",
	tel: "phone",
	telephone: "phone",
	телефон: "phone",
	номер: "phone",
	modality: "kind",
	модальность: "kind",
	type: "kind",
	kind: "kind",
	тип: "kind",
	вид: "kind",
	title: "title",
	название: "title",
	tooth: "toothCode",
	зуб: "toothCode",
	region: "region",
	область: "region",
	date: "capturedAt",
	captured: "capturedAt",
	дата: "capturedAt",
	file: "filePath",
	path: "filePath",
	filepath: "filePath",
	файл: "filePath",
	путь: "filePath",
	source: "sourceName",
	источник: "sourceName",
};

export const kindSynonyms: Array<[RegExp, ImagingStudyKind]> = [
	[/ceph|cephal|trg|teleradi|трг|телерентг|цеф/i, "ceph"],
	[/cbct|кт|ккт|dicom|3d/i, "cbct"],
	[/opg|ортопан|ортопантом|оптг|pan/i, "opg"],
	[/bite/i, "bitewing"],
	[/rvg|rvg|прицел|прицель|periap/i, "periapical"],
	[/photo|фото|camera/i, "photo"],
];

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

export { normalizePhone };

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

export const dicomUidPatternCache = new Map<string, RegExp>();

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

export const dicomFieldValuePatternCache = new Map<string, RegExp>();

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
	patient: Awaited<ReturnType<typeof getPatientsFromDb>>[number] | undefined;
	ambiguous: boolean;
	weakMatch: boolean;
} {
	const normalizedName = patientName?.trim().toLowerCase();

	const phoneMatches = phone
		? patients.filter((patient) => normalizePhone(patient.phone) === phone)
		: [];
	if (phoneMatches.length === 1) {
		return { patient: phoneMatches[0], ambiguous: false, weakMatch: false };
	}
	if (phoneMatches.length > 1) {
		return { patient: undefined, ambiguous: true, weakMatch: false };
	}

	const nameMatches = normalizedName
		? patients.filter(
				(patient) => patient.fullName.trim().toLowerCase() === normalizedName,
			)
		: [];
	if (nameMatches.length === 1) {
		// Совпадение только по ФИО — слабое: однофамильцы с одинаковым именем
		// встречаются, поэтому автоматически такую строку не импортируем.
		return { patient: nameMatches[0], ambiguous: false, weakMatch: true };
	}
	if (nameMatches.length > 1) {
		return { patient: undefined, ambiguous: true, weakMatch: false };
	}

	return { patient: undefined, ambiguous: false, weakMatch: false };
}

export function parseManifestLine(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	line: string,
	rowNumber: number,
	sourceKind: ImagingSourceKind,
	sourceName: string,
): ImagingImportPreviewRow {
	const phone = extractPhone(line);
	const filePath = extractFilePath(line);
	const date = normalizeDate(
		line.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ?? null,
	);
	const kind = detectKind(line) ?? detectKind(filePath);
	const toothCode = extractTooth(line);
	const patientName =
		line
			.replace(filePath ?? "", "")
			.replace(phone ?? "", "")
			.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, "")
			.replace(
				/cbct|кт|ккт|dicom|ceph|trg|трг|телерентг|цеф|opg|оптг|прицельный|прицел|rvg|bitewing|фото/gi,
				"",
			)
			.replace(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/g, "")
			.split(/\s+/)
			.filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part))
			.slice(0, 4)
			.join(" ") || null;
	const { patient, ambiguous, weakMatch } = matchPatient(
		patients,
		patientName,
		phone,
	);
	const warnings: string[] = [];
	if (ambiguous) {
		warnings.push(
			"Найдено несколько пациентов с такими данными — выберите нужного вручную, иначе снимок попадёт в чужую карту",
		);
	} else if (!patient) {
		warnings.push("Пациент не найден, нужно сопоставление");
	} else if (weakMatch) {
		warnings.push(
			"Пациент найден только по ФИО (без телефона) — подтвердите совпадение вручную",
		);
	}
	if (!kind) warnings.push("Тип снимка не распознан");
	if (!filePath) warnings.push("Нет пути к файлу снимка");
	const blocked = !filePath || !kind;
	return {
		rowNumber,
		patientId: patient?.id ?? null,
		patientName: patient?.fullName ?? patientName,
		phone,
		kind,
		title: kind
			? `${kindLabels[kind]}${toothCode ? ` ${toothCode}` : ""}`
			: null,
		toothCode,
		region: toothCode ? null : "не указано",
		capturedAt: date,
		filePath,
		sourceKind: detectSourceKind(filePath ?? line, sourceKind),
		sourceName,
		// Автоматический импорт (status "ready") только при надёжном совпадении:
		// слабое совпадение по одному ФИО и неоднозначность требуют человека.
		status: blocked ? "blocked" : patient && !weakMatch ? "ready" : "warning",
		warnings,
	};
}

export async function parseImagingManifest(
	orgIdOrInput:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
	maybeInput?:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
) {
	const orgId =
		typeof orgIdOrInput === "string" && maybeInput ? orgIdOrInput : "default";
	const input =
		typeof orgIdOrInput === "object"
			? orgIdOrInput
			: (maybeInput ?? orgIdOrInput);
	const rawText = typeof input === "string" ? input : (input?.rawText ?? "");
	const sourceName =
		typeof input === "string" ? "Manifest" : (input?.sourceName ?? "Manifest");
	const sourceKind =
		typeof input === "string"
			? "folder_watch"
			: (input?.sourceKind ?? "folder_watch");
	const lines = rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (!lines.length) {
		return imagingImportPreviewResponseSchema.parse({
			sourceName,
			sourceKind,
			totalRows: 0,
			readyRows: 0,
			warningRows: 0,
			blockedRows: 0,
			rows: [],
			parserNotes: ["Нет строк для разбора."],
		});
	}

	const delimiter = detectDelimiter(lines[0] ?? "");
	const headers = splitLine(lines[0] ?? "", delimiter).map(
		(cell) => headerAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);
	const rows: ImagingImportPreviewRow[] = await Promise.all(
		(hasHeader ? lines.slice(1) : lines).map(async (line, index) => {
			if (!hasHeader)
				return parseManifestLine(
					patients,
					line,
					index + 1,
					sourceKind,
					sourceName,
				);
			const cells = splitLine(line, delimiter);
			const draft: Partial<ImagingImportPreviewRow> = {
				rowNumber: index + 2,
				sourceKind: sourceKind,
				sourceName: sourceName,
				warnings: [],
			};
			headers.forEach((field, cellIndex) => {
				if (!field) return;
				const value = cells[cellIndex]?.trim() || null;
				if (field === "phone") draft.phone = normalizePhone(value);
				else if (field === "kind") draft.kind = detectKind(value);
				else if (field === "capturedAt")
					draft.capturedAt = normalizeDate(value);
				else draft[field] = value as never;
			});
			const { patient, ambiguous, weakMatch } = matchPatient(
				patients,
				draft.patientName ?? null,
				draft.phone ?? null,
			);
			const kind = draft.kind ?? detectKind(draft.filePath ?? "");
			const source = detectSourceKind(
				draft.filePath ?? draft.sourceName ?? "",
				sourceKind,
			);
			const warnings: string[] = [];
			if (ambiguous)
				warnings.push(
					"Найдено несколько пациентов с такими данными — выберите нужного вручную",
				);
			else if (!patient)
				warnings.push("Пациент не найден, нужно сопоставление");
			else if (weakMatch)
				warnings.push(
					"Пациент найден только по ФИО (без телефона) — подтвердите совпадение",
				);
			if (!kind) warnings.push("Тип снимка не распознан");
			if (!draft.filePath) warnings.push("Нет пути к файлу снимка");
			const blocked = !draft.filePath || !kind;
			return {
				rowNumber: draft.rowNumber ?? index + 2,
				patientId: patient?.id ?? null,
				patientName: patient?.fullName ?? draft.patientName ?? null,
				phone: draft.phone ?? null,
				kind,
				title:
					draft.title ??
					(kind
						? `${kindLabels[kind]}${draft.toothCode ? ` ${draft.toothCode}` : ""}`
						: null),
				toothCode: draft.toothCode ?? null,
				region: draft.region ?? null,
				capturedAt: draft.capturedAt ?? null,
				filePath: draft.filePath ?? null,
				sourceKind: source,
				sourceName: draft.sourceName ?? sourceName,
				// Автоматический импорт (status "ready") только при надёжном совпадении:
				// слабое совпадение по одному ФИО и неоднозначность требуют человека.
				status: blocked
					? "blocked"
					: patient && !weakMatch
						? "ready"
						: "warning",
				warnings,
			};
		}),
	);

	return imagingImportPreviewResponseSchema.parse({
		sourceName,
		sourceKind,
		totalRows: rows.length,
		readyRows: rows.filter((row) => row.status === "ready").length,
		warningRows: rows.filter((row) => row.status === "warning").length,
		blockedRows: rows.filter((row) => row.status === "blocked").length,
		rows,
		parserNotes: [
			"Парсер списка поддерживает CSV/TSV/текст с разделителем |, пути к КТ/снимкам, экспорты JPG/PNG/TIFF/BMP/WebP, подсказки RVG и синонимы ОПТГ/ТРГ/КЛКТ/прицельного снимка.",
			"Готовые строки можно позже провести через локальный обработчик: он скопирует файлы, рассчитает хэши и привяжет их к картам пациентов.",
		],
	});
}
