/**
 * manifestParser.ts — Layer 1: Парсинг текстовых манифестов импорта снимков и серий DICOM, фиксация исследований в БД.
 */

import {
	type DicomSeriesPreviewRow,
	type ImagingImportPreviewRow,
	type ImagingSourceKind,
	dicomSeriesPreviewResponseSchema,
	imagingImportCommitResponseSchema,
	imagingImportPreviewResponseSchema,
	normalizeDate,
	splitLine,
} from "@dental/shared";
import { createImagingStudyInDb } from "../../../db/imagingQuery.js";
import { getPatientsFromDb } from "../../../db/patientsQuery.js";
import {
	detectDelimiter,
	detectKind,
	detectSourceKind,
	extractDicomFieldValue,
	extractDicomUid,
	extractFilePath,
	extractPhone,
	extractTooth,
	matchPatient,
	normalizeHeader,
	normalizeModality,
	normalizePhone,
	parseInstanceNumber,
} from "./normalization.js";
import {
	dicomHeaderAliases,
	headerAliases,
	kindLabels,
} from "./types.js";

export function parseManifestLine(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	line: string,
	rowNumber: number,
	sourceKind: ImagingSourceKind,
	sourceName: string,
): ImagingImportPreviewRow {
	const rawPath = extractFilePath(line);
	const phone = extractPhone(line);
	const tooth = extractTooth(line);
	const kind = detectKind(rawPath ?? line);
	const detectedSource = detectSourceKind(rawPath ?? line, sourceKind);

	const withoutExt = (rawPath ?? line)
		.replace(/\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)$/i, "")
		.replace(/[\\/]/g, " ")
		.replace(/[_\-;,|]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	const patientCandidate =
		withoutExt.length > 3 && !/^\d+$/.test(withoutExt) ? withoutExt : null;

	const { patient, ambiguous, weakMatch } = matchPatient(
		patients,
		patientCandidate,
		phone,
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
			"Пациент сопоставлен только по ФИО, телефон не указан — проверьте сопоставление",
		);

	if (!kind) warnings.push("Тип снимка не определен");
	if (!rawPath) warnings.push("Путь к файлу снимка не найден");

	const status =
		!rawPath || !kind || ambiguous
			? "blocked"
			: patient
				? "ready"
				: "warning";

	return {
		rowNumber,
		patientName: patient?.fullName ?? patientCandidate,
		phone: patient?.phone ?? phone,
		patientId: patient?.id ?? null,
		kind,
		toothCode: tooth,
		region: null,
		capturedAt: null,
		title: kind ? kindLabels[kind] : null,
		filePath: rawPath,
		sourceKind: detectedSource,
		sourceName,
		status,
		warnings,
	};
}

export async function parseImagingManifest(
	orgIdOrInput:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string; organizationId?: string }
		| string,
	maybeInput?:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
) {
	let orgId: string;
	let input: { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string } | undefined;

	if (typeof orgIdOrInput === "string") {
		orgId = orgIdOrInput;
		input = typeof maybeInput === "object" ? maybeInput : typeof maybeInput === "string" ? { rawText: maybeInput } : undefined;
	} else {
		orgId = orgIdOrInput.organizationId || "";
		input = orgIdOrInput;
	}

	if (!orgId) {
		throw new Error("Organization ID is required for imaging manifest parsing.");
	}
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
				else draft[field as keyof ImagingImportPreviewRow] = value as never;
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
					"Пациент сопоставлен только по ФИО, телефон не указан — проверьте сопоставление",
				);
			if (!kind) warnings.push("Тип снимка не определен");
			if (!draft.filePath) warnings.push("Путь к файлу снимка не найден");

			const status =
				!draft.filePath || !kind || ambiguous
					? "blocked"
					: patient
						? "ready"
						: "warning";

			return {
				rowNumber: draft.rowNumber ?? index + 2,
				patientName: patient?.fullName ?? draft.patientName ?? null,
				phone: patient?.phone ?? draft.phone ?? null,
				patientId: patient?.id ?? null,
				kind,
				toothCode: draft.toothCode ?? null,
				region: draft.region ?? null,
				capturedAt: draft.capturedAt ?? null,
				title: draft.title ?? (kind ? kindLabels[kind] : null),
				filePath: draft.filePath ?? null,
				sourceKind: source,
				sourceName: draft.sourceName ?? sourceName,
				status,
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
		parserNotes: hasHeader
			? ["Использован заголовок таблицы манифеста."]
			: ["Заголовок не распознан, использован эвристический разбор строк."],
	});
}

export async function parseDicomSeriesManifest(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const sourceLines = input.rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (!sourceLines.length) {
		return dicomSeriesPreviewResponseSchema.parse({
			sourceName: input.sourceName,
			sourceKind: input.sourceKind,
			totalRows: 0,
			totalSeries: 0,
			readySeries: 0,
			warningSeries: 0,
			blockedSeries: 0,
			rows: [],
			series: [],
			parserNotes: ["Нет строк списка снимков для разбора."],
		});
	}

	const delimiter = detectDelimiter(sourceLines[0] ?? "");
	const headers = splitLine(sourceLines[0] ?? "", delimiter).map(
		(cell) => dicomHeaderAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);

	const rows = (hasHeader ? sourceLines.slice(1) : sourceLines).map(
		(line, index) => {
			const base = parseManifestLine(
				patients,
				line,
				index + (hasHeader ? 2 : 1),
				input.sourceKind,
				input.sourceName,
			);
			return {
				...base,
				modality: normalizeModality(extractDicomFieldValue(line, ["modality", "модальность"])),
				studyInstanceUid: extractDicomUid(line, ["studyInstanceUid", "study", "studyuid"]),
				seriesInstanceUid: extractDicomUid(line, ["seriesInstanceUid", "series", "seriesuid"]),
				sopInstanceUid: extractDicomUid(line, ["sopInstanceUid", "sop", "sopuid"]),
				instanceNumber: parseInstanceNumber(extractDicomFieldValue(line, ["instanceNumber", "slice", "срез"])),
				studyDescription: null,
				seriesDescription: null,
				imageRows: null,
				imageColumns: null,
				bitsAllocated: null,
				samplesPerPixel: null,
				fileSizeBytes: null,
				estimatedPixelBytes: null,
			};
		},
	) as DicomSeriesPreviewRow[];

	return dicomSeriesPreviewResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		totalRows: rows.length,
		totalSeries: rows.length,
		readySeries: rows.filter((r) => r.status === "ready").length,
		warningSeries: rows.filter((r) => r.status === "warning").length,
		blockedSeries: rows.filter((r) => r.status === "blocked").length,
		rows,
		series: [],
		parserNotes: hasHeader
			? ["Использован заголовок таблицы DICOM-манифеста."]
			: ["Заголовок не распознан, использован эвристический разбор строк."],
	});
}

export async function commitImagingImport(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const preview = await parseImagingManifest(orgId, input);
	const readyRows = preview.rows.filter(
		(row) =>
			row.status === "ready" && row.patientId && row.kind && row.filePath,
	);
	const createdStudyIds = await Promise.all(
		readyRows.map(async (row) => {
			const study = await createImagingStudyInDb(orgId, {
				// biome-ignore lint/style/noNonNullAssertion: guaranteed by filter
				patientId: row.patientId!,
				// biome-ignore lint/style/noNonNullAssertion: guaranteed by filter
				kind: row.kind!,
				// biome-ignore lint/style/noNonNullAssertion: guaranteed by filter
				title: row.title ?? kindLabels[row.kind!],
				toothCode: row.toothCode,
				region: row.region,
				sourceKind: row.sourceKind,
				sourceName: row.sourceName,
				storagePath: row.filePath,
				capturedAt: row.capturedAt ?? undefined,
			});
			return study.id;
		}),
	);

	return imagingImportCommitResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		importedCount: createdStudyIds.length,
		skippedCount: preview.totalRows - createdStudyIds.length,
		createdStudyIds,
		preview,
	});
}
