import type { DicomSeriesViewer } from "@dental/shared";
import { getPatientsFromDb } from "../../db/patientsQuery.js";
import {
	dicomSeriesPreviewResponseSchema,
	normalizeDate
} from "@dental/shared";
import {
	parseManifestLine,
	normalizeModality,
	extractDicomFieldValue,
	extractDicomUid,
	parseInstanceNumber,
	parsePositiveInteger,
	detectSourceKind,
	normalizePhone,
	normalizeDicomUid,
	matchPatient
} from "./manifestParser.js";
import {
	dicomHeaderAliases
} from "./imagingConstants.js";
import {
	type DicomSeriesPreviewGroup,
	type DicomSeriesPreviewRow,
	type ImagingSourceKind,
	splitLine,
} from "@dental/shared";
import type { DicomHeaderMetadata } from "./imagingConstants.js";
import { isDicomArchiveVirtualEntryPath } from "./dicomParsing.js";
import {
	dicomFallbackSeriesKey,
	recommendedViewerFor,
	buildMprResourcePolicy,
	buildMprReadiness,
} from "./mprPolicy.js";
import { quoteManifestCell } from "./folderScanManifest.js";
import { expandDicomArchiveManifestLines } from "./dicomZipReader.js";
import {
	normalizeHeader,
	detectDelimiter,
	detectKind,
	extractTooth,
	modalityToKind,
} from "./manifestParser.js";
import {
	type ApiDicomScanOptions,
	throwIfApiDicomScanAborted,
	maybeYieldApiDicomScan,
	createApiDicomScanYieldState,
} from "./imagingHelpers.js";

export function buildDicomSeriesGroups(rows: DicomSeriesPreviewRow[]) {
	const buckets = new Map<string, DicomSeriesPreviewRow[]>();
	rows.forEach((row) => {
		const key =
			row.seriesInstanceUid ??
			`${row.studyInstanceUid ?? "no-study"}|${row.seriesDescription ?? dicomFallbackSeriesKey(row.filePath, row)}`;
		const existing = buckets.get(key);
		if (existing) existing.push(row);
		else buckets.set(key, [row]);
	});

	return Array.from(buckets.values()).map(
		(seriesRows, index): DicomSeriesPreviewGroup => {
			const first = seriesRows[0];

			let kind: string | null | undefined;
			let modality: string | null | undefined;
			let patientId: string | null | undefined;
			let patientName: string | null | undefined;
			let studyInstanceUid: string | null | undefined;
			let seriesInstanceUid: string | null | undefined;
			let studyDescription: string | null | undefined;
			let seriesDescription: string | null | undefined;
			let capturedAt: string | null | undefined;
			let firstFilePath: string | null | undefined;
			let imageRows: number | null | undefined;
			let imageColumns: number | null | undefined;
			let bitsAllocated: number | null | undefined;
			let samplesPerPixel: number | null | undefined;

			let rowPixelBytes = 0;
			const warnings = new Set<string>();

			for (const row of seriesRows) {
				if (kind === undefined && row.kind) kind = row.kind;
				if (modality === undefined && row.modality) modality = row.modality;
				if (patientId === undefined && row.patientId) patientId = row.patientId;
				if (patientName === undefined && row.patientName)
					patientName = row.patientName;
				if (studyInstanceUid === undefined && row.studyInstanceUid)
					studyInstanceUid = row.studyInstanceUid;
				if (seriesInstanceUid === undefined && row.seriesInstanceUid)
					seriesInstanceUid = row.seriesInstanceUid;
				if (studyDescription === undefined && row.studyDescription)
					studyDescription = row.studyDescription;
				if (seriesDescription === undefined && row.seriesDescription)
					seriesDescription = row.seriesDescription;
				if (capturedAt === undefined && row.capturedAt)
					capturedAt = row.capturedAt;
				if (firstFilePath === undefined && row.filePath)
					firstFilePath = row.filePath;
				if (imageRows === undefined && row.imageRows) imageRows = row.imageRows;
				if (imageColumns === undefined && row.imageColumns)
					imageColumns = row.imageColumns;
				if (bitsAllocated === undefined && row.bitsAllocated)
					bitsAllocated = row.bitsAllocated;
				if (samplesPerPixel === undefined && row.samplesPerPixel)
					samplesPerPixel = row.samplesPerPixel;

				rowPixelBytes += row.estimatedPixelBytes ?? 0;

				if (row.warnings?.length) {
					for (const w of row.warnings) warnings.add(w);
				}
			}

			const kindNull = (kind ?? null) as DicomSeriesPreviewGroup["kind"];
			const modalityNull = modality ?? null;
			const patientIdNull = patientId ?? null;
			const patientNameNull = patientName ?? null;
			const studyInstanceUidNull = studyInstanceUid ?? null;
			const seriesInstanceUidNull = seriesInstanceUid ?? null;
			const studyDescriptionNull = studyDescription ?? null;
			const seriesDescriptionNull = seriesDescription ?? null;
			const capturedAtNull = capturedAt ?? null;
			const firstFilePathNull = firstFilePath ?? null;
			const imageRowsNull = imageRows ?? null;
			const imageColumnsNull = imageColumns ?? null;
			const bitsAllocatedNull = bitsAllocated ?? null;
			const samplesPerPixelNull = samplesPerPixel ?? null;

			const sourceKind = first?.sourceKind ?? "dicom_file";
			const sourceName = first?.sourceName ?? "dicom_series";
			const estimatedPixelBytes =
				rowPixelBytes > 0
					? rowPixelBytes
					: imageRowsNull && imageColumnsNull && bitsAllocatedNull
						? imageRowsNull *
							imageColumnsNull *
							(samplesPerPixelNull ?? 1) *
							Math.max(1, Math.ceil(bitsAllocatedNull / 8)) *
							seriesRows.length
						: null;
			if (!studyInstanceUidNull || !seriesInstanceUidNull)
				warnings.add(
					"Нет кодов исследования/серии: серия сгруппирована по папке или описанию",
				);
			if (!patientIdNull)
				warnings.add(
					"Пациент не сопоставлен: перед записью нужен ручной матчинг",
				);
			if (!kindNull) warnings.add("Тип исследования не распознан");
			if (kindNull === "cbct" && seriesRows.length < 8)
				warnings.add(
					"Для КЛКТ/КТ-срезов мало срезов: проверьте полный экспорт серии",
				);
			const blocked = !kindNull || !firstFilePathNull;
			const mprReadiness = buildMprReadiness({
				kind: kindNull,
				modality: modalityNull,
				fileCount: seriesRows.length,
				estimatedPixelBytes,
				firstFilePath: firstFilePathNull,
				sourceKind,
				hasStudySeriesUid: Boolean(
					studyInstanceUidNull && seriesInstanceUidNull,
				),
			});
			mprReadiness.blockers.forEach((blocker) => {
				warnings.add(blocker);
			});
			mprReadiness.warnings.forEach((warning) => {
				warnings.add(warning);
			});
			const status = blocked
				? "blocked"
				: patientIdNull && warnings.size === 0
					? "ready"
					: "warning";
			const recommendedViewer: DicomSeriesViewer = blocked
				? "none"
				: mprReadiness.volumeCandidate
					? mprReadiness.canOpenMpr
						? "cbct_mpr"
						: "external_dicom"
					: recommendedViewerFor({
							kind: kindNull,
							modality: modalityNull,
							fileCount: seriesRows.length,
						});
			return {
				id: `dicom-series-${index + 1}`,
				patientId: patientIdNull,
				patientName: patientNameNull,
				kind: kindNull,
				modality: modalityNull,
				studyInstanceUid: studyInstanceUidNull,
				seriesInstanceUid: seriesInstanceUidNull,
				studyDescription: studyDescriptionNull,
				seriesDescription: seriesDescriptionNull,
				capturedAt: capturedAtNull,
				fileCount: seriesRows.length,
				imageRows: imageRowsNull,
				imageColumns: imageColumnsNull,
				bitsAllocated: bitsAllocatedNull,
				samplesPerPixel: samplesPerPixelNull,
				estimatedPixelBytes,
				firstFilePath: firstFilePathNull,
				sourceKind,
				sourceName,
				recommendedViewer,
				mprReadiness,
				status,
				warnings: Array.from(warnings),
			};
		},
	);
}

export async function parseDicomManifestLine(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	line: string,
	rowNumber: number,
	sourceKind: ImagingSourceKind,
	sourceName: string,
): Promise<DicomSeriesPreviewRow> {
	const base = parseManifestLine(
		patients,
		line,
		rowNumber,
		sourceKind,
		sourceName,
	);
	const modality = normalizeModality(
		extractDicomFieldValue(line, ["modality", "0008,0060", "\\(0008,0060\\)"]),
	);
	const studyInstanceUid = extractDicomUid(line, [
		"StudyInstanceUID",
		"Study UID",
		"StudyUID",
		"0020,000D",
		"\\(0020,000D\\)",
	]);
	const seriesInstanceUid = extractDicomUid(line, [
		"SeriesInstanceUID",
		"Series UID",
		"SeriesUID",
		"0020,000E",
		"\\(0020,000E\\)",
	]);
	const sopInstanceUid = extractDicomUid(line, [
		"SOPInstanceUID",
		"SOP UID",
		"SOPInstance",
		"0008,0018",
		"\\(0008,0018\\)",
	]);
	const studyDescription = extractDicomFieldValue(line, [
		"StudyDescription",
		"Study Description",
		"Study",
		"0008,1030",
		"\\(0008,1030\\)",
	]);
	const seriesDescription = extractDicomFieldValue(line, [
		"SeriesDescription",
		"Series Description",
		"Series",
		"0008,103E",
		"\\(0008,103E\\)",
	]);
	const instanceNumber = parseInstanceNumber(
		extractDicomFieldValue(line, [
			"InstanceNumber",
			"Instance Number",
			"Instance",
			"Slice",
			"0020,0013",
			"\\(0020,0013\\)",
		]) ?? base.filePath,
	);
	const imageRows = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"Rows",
			"ImageRows",
			"Image Rows",
			"0028,0010",
			"\\(0028,0010\\)",
		]),
	);
	const imageColumns = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"Columns",
			"ImageColumns",
			"Image Columns",
			"Cols",
			"0028,0011",
			"\\(0028,0011\\)",
		]),
	);
	const bitsAllocated = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"Bits Allocated",
			"BitDepth",
			"0028,0100",
			"\\(0028,0100\\)",
		]),
	);
	const samplesPerPixel = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"SamplesPerPixel",
			"Samples Per Pixel",
			"Samples",
			"0028,0002",
			"\\(0028,0002\\)",
		]),
	);
	const estimatedPixelBytes =
		parsePositiveInteger(
			extractDicomFieldValue(line, [
				"EstimatedPixelBytes",
				"Estimated Pixel Bytes",
				"PixelBytes",
			]),
		) ??
		(imageRows && imageColumns && bitsAllocated
			? imageRows *
				imageColumns *
				(samplesPerPixel ?? 1) *
				Math.max(1, Math.ceil(bitsAllocated / 8))
			: null);
	const kind =
		base.kind ??
		modalityToKind(
			modality,
			`${line} ${studyDescription ?? ""} ${seriesDescription ?? ""}`,
		);
	const warnings = [...base.warnings];
	if (!studyInstanceUid || !seriesInstanceUid)
		warnings.push(
			"Коды исследования/серии не найдены, используем папку как временную группу",
		);
	const blocked = !base.filePath || !kind;
	return {
		rowNumber,
		patientId: base.patientId,
		patientName: base.patientName,
		phone: base.phone,
		kind,
		modality,
		studyInstanceUid,
		seriesInstanceUid,
		sopInstanceUid,
		studyDescription,
		seriesDescription,
		instanceNumber,
		imageRows,
		imageColumns,
		bitsAllocated,
		samplesPerPixel,
		estimatedPixelBytes,
		capturedAt: base.capturedAt,
		filePath: base.filePath,
		sourceKind: detectSourceKind(base.filePath ?? line, sourceKind),
		sourceName,
		status: blocked ? "blocked" : base.patientId ? "ready" : "warning",
		warnings,
	};
}

export async function parseDicomSeriesManifest(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const sourceLines = input.rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const archiveExpansion = await expandDicomArchiveManifestLines(sourceLines);
	const lines = archiveExpansion.lines;
	if (!lines.length) {
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

	const delimiter = detectDelimiter(lines[0] ?? "");
	const headers = splitLine(lines[0] ?? "", delimiter).map(
		(cell) => dicomHeaderAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);
	const rows: DicomSeriesPreviewRow[] = await Promise.all(
		(hasHeader ? lines.slice(1) : lines).map(async (line, index) => {
			if (!hasHeader)
				return await parseDicomManifestLine(
					patients,
					line,
					index + 1,
					input.sourceKind,
					input.sourceName,
				);
			const cells = splitLine(line, delimiter);
			const draft: Partial<DicomSeriesPreviewRow> = {
				rowNumber: index + 2,
				sourceKind: input.sourceKind,
				sourceName: input.sourceName,
				warnings: [],
			};
			headers.forEach((field, cellIndex) => {
				if (!field) return;
				const value = cells[cellIndex]?.trim() || null;
				if (field === "phone") draft.phone = normalizePhone(value);
				else if (field === "kind") draft.kind = detectKind(value);
				else if (field === "modality")
					draft.modality = normalizeModality(value);
				else if (field === "capturedAt")
					draft.capturedAt = normalizeDate(value);
				else if (field === "instanceNumber")
					draft.instanceNumber = parseInstanceNumber(value);
				else if (
					field === "imageRows" ||
					field === "imageColumns" ||
					field === "bitsAllocated" ||
					field === "samplesPerPixel" ||
					field === "estimatedPixelBytes"
				) {
					draft[field] = parsePositiveInteger(value);
				} else if (
					field === "studyInstanceUid" ||
					field === "seriesInstanceUid" ||
					field === "sopInstanceUid"
				) {
					draft[field] = normalizeDicomUid(value);
				} else draft[field] = value as never;
			});
			const lineFallback = await parseDicomManifestLine(
				patients,
				line,
				index + 2,
				input.sourceKind,
				input.sourceName,
			);
			const {
				patient,
				ambiguous: patientAmbiguous,
				weakMatch: patientWeakMatch,
			} = matchPatient(
				patients,
				draft.patientName ?? lineFallback.patientName,
				draft.phone ?? lineFallback.phone,
			);
			const modality = draft.modality ?? lineFallback.modality;
			const kind =
				draft.kind ??
				modalityToKind(
					modality,
					`${draft.studyDescription ?? ""} ${draft.seriesDescription ?? ""}`,
				) ??
				lineFallback.kind;
			const filePath = draft.filePath ?? lineFallback.filePath;
			const warnings: string[] = [];
			if (patientAmbiguous)
				warnings.push(
					"Найдено несколько пациентов с такими данными — выберите нужного вручную",
				);
			else if (!patient)
				warnings.push("Пациент не найден, нужно сопоставление");
			else if (patientWeakMatch)
				warnings.push(
					"Пациент найден только по ФИО (без телефона) — подтвердите совпадение",
				);
			if (!kind) warnings.push("Тип исследования не распознан");
			if (!filePath) warnings.push("Нет пути к снимку");
			if (!draft.studyInstanceUid || !draft.seriesInstanceUid)
				warnings.push(
					"Коды исследования/серии не найдены, используем папку как временную группу",
				);
			const blocked = !filePath || !kind;
			return {
				rowNumber: draft.rowNumber ?? index + 2,
				patientId: patient?.id ?? null,
				patientName:
					patient?.fullName ?? draft.patientName ?? lineFallback.patientName,
				phone: draft.phone ?? lineFallback.phone,
				kind,
				modality,
				studyInstanceUid:
					draft.studyInstanceUid ?? lineFallback.studyInstanceUid,
				seriesInstanceUid:
					draft.seriesInstanceUid ?? lineFallback.seriesInstanceUid,
				sopInstanceUid: draft.sopInstanceUid ?? lineFallback.sopInstanceUid,
				studyDescription:
					draft.studyDescription ?? lineFallback.studyDescription,
				seriesDescription:
					draft.seriesDescription ?? lineFallback.seriesDescription,
				instanceNumber: draft.instanceNumber ?? lineFallback.instanceNumber,
				imageRows: draft.imageRows ?? lineFallback.imageRows,
				imageColumns: draft.imageColumns ?? lineFallback.imageColumns,
				bitsAllocated: draft.bitsAllocated ?? lineFallback.bitsAllocated,
				samplesPerPixel: draft.samplesPerPixel ?? lineFallback.samplesPerPixel,
				estimatedPixelBytes:
					draft.estimatedPixelBytes ??
					lineFallback.estimatedPixelBytes ??
					(draft.imageRows && draft.imageColumns && draft.bitsAllocated
						? draft.imageRows *
							draft.imageColumns *
							(draft.samplesPerPixel ?? 1) *
							Math.max(1, Math.ceil(draft.bitsAllocated / 8))
						: null),
				capturedAt: draft.capturedAt ?? lineFallback.capturedAt,
				filePath,
				sourceKind: detectSourceKind(
					filePath ?? draft.sourceName ?? "",
					input.sourceKind,
				),
				sourceName: draft.sourceName ?? input.sourceName,
				// Автоматический импорт (status "ready") только при надёжном совпадении:
				// слабое совпадение по одному ФИО и неоднозначность требуют человека.
				status: blocked
					? "blocked"
					: patient && !patientWeakMatch
						? "ready"
						: "warning",
				warnings,
			};
		}),
	);
	const series = buildDicomSeriesGroups(rows);

	return dicomSeriesPreviewResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		totalRows: rows.length,
		totalSeries: series.length,
		readySeries: series.filter((row) => row.status === "ready").length,
		warningSeries: series.filter((row) => row.status === "warning").length,
		blockedSeries: series.filter((row) => row.status === "blocked").length,
		rows,
		series,
		parserNotes: [
			...archiveExpansion.notes,
			"Предпросмотр серий снимков группирует по кодам исследования/серии, если они есть, иначе использует группировку по папкам.",
			"Тяжелые данные снимков здесь не хранятся; для КЛКТ/КТ-срезов нужен отдельный локальный обработчик или внешний просмотр.",
			"Строки без совпадения пациента остаются предупреждениями и не блокируют работу клиники.",
		],
	});
}
