import { dicomFirstFramePreviewResponseSchema } from "@dental/shared";
import {
	ApiDicomScanOptions,
	createApiDicomScanYieldState,
	maybeYieldApiDicomScan,
	isApiDicomScanAbortError
} from "./imagingHelpers.js";
import {
	collectDicomHeaderFiles,
	inferManifestFieldsFromPath,
	quoteManifestCell
} from "./folderScanManifest.js";
import {
	isDicomPixelPath
} from "./dicomParsing.js";
import {
	modalityToKind
} from "./manifestParser.js";
import { deflateSync } from "node:zlib";
import { open, stat } from "node:fs/promises";
import type { DicomFirstFramePreviewResponse } from "@dental/shared";
import {
	dicomFirstFrameHeaderReadLimit,
	dicomFirstFramePixelReadLimit,
	type DicomHeaderMetadata,
} from "./imagingConstants.js";
import {
	cleanDicomText,
	emptyDicomHeaderMetadata,
	emptyDicomFirstFramePreview,
	extractDicomMetadata,
	buildUnsupportedDicomResponse,
	buildDicomPreviewRgba,
	createDicomPixelSampler,
	dicomTransferSyntaxIsSupported,
	hasDicomMagic,
	parseDicomHeader,
	redactDicomPreviewText,
	redactDicomPreviewWarnings,
	isDicomArchiveVirtualEntryPath,
	isDicomArchivePath,
	isZipArchivePath,
	type DicomFirstFramePixelParse,
	type DicomImageMetadata,
} from "./dicomParsing.js";
import {
	readZipCentralDirectoryDetailed,
	inflateZipEntryPrefix,
	readExactFileRange,
} from "./dicomZipReader.js";

export function buildPngChunk(type: string, data: Buffer) {
	const typeBuffer = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
	return Buffer.concat([length, typeBuffer, data, crc]);
}

export let pngCrcTable: Uint32Array | null = null;

export function crc32(buffer: Buffer) {
	if (!pngCrcTable) {
		pngCrcTable = new Uint32Array(256);
		for (let index = 0; index < 256; index += 1) {
			let value = index;
			for (let bit = 0; bit < 8; bit += 1) {
				value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
			}
			pngCrcTable[index] = value >>> 0;
		}
	}

	let crc = 0xffffffff;
	const table = pngCrcTable;
	for (const byte of buffer) {
		const lookup = table[(crc ^ byte) & 0xff] ?? 0;
		crc = lookup ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export function rgbaToPngDataUrl(width: number, height: number, rgba: Buffer) {
	const signature = Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0;
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
	}

	const png = Buffer.concat([
		signature,
		buildPngChunk("IHDR", ihdr),
		buildPngChunk("IDAT", deflateSync(raw)),
		buildPngChunk("IEND", Buffer.alloc(0)),
	]);
	return `data:image/png;base64,${png.toString("base64")}`;
}

export function renderDicomPreviewImage(
	buffer: Buffer,
	metadata: DicomImageMetadata,
	maxPreviewEdge: number,
): {
	imageDataUrl: string;
	width: number;
	height: number;
	grayRange: number;
	grayMean: number;
	finalCenter: number;
	finalWindow: number;
	finalWarnings: string[];
} {
	const warnings = [...metadata.warnings];
	const {
		rows,
		columns,
		bitsAllocated,
		pixelRepresentation,
		rescaleIntercept,
		rescaleSlope,
		pixelDataOffset,
		windowCenter,
		windowWidth,
		photometricInterpretation,
	} = metadata;

	// We know rows and columns are non-null and > 0 here
	const r = rows as number;
	const c = columns as number;

	const scale = Math.min(1, maxPreviewEdge / Math.max(r, c));
	const width = Math.max(1, Math.round(c * scale));
	const height = Math.max(1, Math.round(r * scale));
	const bytesPerPixel = (bitsAllocated as number) / 8;
	const invert = photometricInterpretation === "MONOCHROME1";

	const sampleValue = createDicomPixelSampler(
		buffer,
		pixelDataOffset,
		bytesPerPixel,
		bitsAllocated as number,
		pixelRepresentation,
		rescaleSlope,
		rescaleIntercept,
	);

	let minValue = Number.POSITIVE_INFINITY;
	let maxValue = Number.NEGATIVE_INFINITY;
	const sampleStep = Math.max(1, Math.floor((r * c) / 250_000));
	for (let index = 0; index < r * c; index += sampleStep) {
		const value = sampleValue(index);
		if (value < minValue) minValue = value;
		if (value > maxValue) maxValue = value;
	}

	let center = windowCenter ?? (minValue + maxValue) / 2;
	let window =
		windowWidth && windowWidth > 1
			? windowWidth
			: Math.max(1, maxValue - minValue);

	let rendered = buildDicomPreviewRgba(
		width,
		height,
		r,
		c,
		invert,
		sampleValue,
		center,
		window,
	);
	if (
		windowCenter &&
		windowWidth &&
		maxValue > minValue &&
		(rendered.grayMax - rendered.grayMin < 24 ||
			rendered.grayMean < 8 ||
			rendered.grayMean > 247)
	) {
		center = (minValue + maxValue) / 2;
		window = Math.max(1, maxValue - minValue);
		rendered = buildDicomPreviewRgba(
			width,
			height,
			r,
			c,
			invert,
			sampleValue,
			center,
			window,
		);
		warnings.push(
			"Окно снимка дало низкоконтрастный предпросмотр; использовано min/max окно по выборке.",
		);
	}

	if (scale < 1)
		warnings.push(`Предпросмотр уменьшен с ${c}x${r} до ${width}x${height}.`);
	if (!windowCenter || !windowWidth)
		warnings.push(
			"Окно яркости/контраста отсутствовало; предпросмотр использовал min/max окно по выборке.",
		);

	return {
		imageDataUrl: rgbaToPngDataUrl(width, height, rendered.rgba),
		width,
		height,
		grayRange: rendered.grayMax - rendered.grayMin,
		grayMean: rendered.grayMean,
		finalCenter: center,
		finalWindow: window,
		finalWarnings: warnings,
	};
}

export function parseDicomFirstFramePixel(
	buffer: Buffer,
	maxPreviewEdge: number,
): DicomFirstFramePixelParse {
	const metadata = extractDicomMetadata(buffer, []);
	if (!metadata) {
		return {
			status: "unsupported",
			transferSyntaxUid: null,
			photometricInterpretation: null,
			sourceWidth: null,
			sourceHeight: null,
			bitsAllocated: null,
			bitsStored: null,
			pixelRepresentation: null,
			windowCenter: null,
			windowWidth: null,
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: ["Кадр снимка не найден в быстром предпросмотре."],
			nextAction:
				"Оставьте список серии или используйте отдельный КТ-просмотрщик.",
		};
	}

	if (metadata.isCompressed) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Сжатый формат снимка не поддерживается быстрым предпросмотром.",
			"Откройте снимок через внешний КТ-модуль или локальный обработчик.",
		);
	}
	if (
		!metadata.pixelDataOffset ||
		metadata.pixelDataOffset < 0 ||
		metadata.pixelDataLength <= 0
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Кадр снимка не найден в быстром предпросмотре.",
			"Оставьте список серии или используйте отдельный КТ-просмотрщик.",
		);
	}

	if (
		!dicomTransferSyntaxIsSupported(metadata.transferSyntaxUid) ||
		metadata.bigEndian
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Формат файла снимка не поддерживается быстрым предпросмотром.",
			"Откройте снимок через внешний КТ-модуль или локальный обработчик для этого формата.",
		);
	}

	const normalizedPhotometric =
		metadata.photometricInterpretation ?? "MONOCHROME2";
	metadata.photometricInterpretation = normalizedPhotometric; // update for render

	if (
		!metadata.rows ||
		!metadata.columns ||
		metadata.rows <= 0 ||
		metadata.columns <= 0 ||
		metadata.rows > 8192 ||
		metadata.columns > 8192
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Размер кадра не указан или слишком велик для быстрого предпросмотра.",
			"Откройте отдельный КТ-просмотрщик для такого размера изображения.",
		);
	}

	if (
		(metadata.samplesPerPixel ?? 1) !== 1 ||
		!["MONOCHROME1", "MONOCHROME2"].includes(normalizedPhotometric)
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Быстрый предпросмотр открывает только серые стоматологические снимки.",
			"Откройте этот файл в полном просмотрщике: формат нестандартный для быстрого предпросмотра.",
		);
	}

	if (metadata.bitsAllocated !== 8 && metadata.bitsAllocated !== 16) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Глубина изображения не поддерживается быстрым предпросмотром.",
			"Откройте этот файл в полном просмотрщике снимков.",
		);
	}

	const bytesPerPixel = metadata.bitsAllocated / 8;
	const expectedBytes = metadata.rows * metadata.columns * bytesPerPixel;
	if (
		metadata.pixelDataLength < expectedBytes ||
		metadata.pixelDataOffset + expectedBytes > buffer.length
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Данные первого кадра короче ожидаемого размера.",
			"Откройте полный КТ-просмотрщик: быстрый предпросмотр не может открыть этот кадр.",
		);
	}

	const result = renderDicomPreviewImage(buffer, metadata, maxPreviewEdge);

	return {
		status: "ready",
		transferSyntaxUid: metadata.transferSyntaxUid,
		photometricInterpretation: normalizedPhotometric,
		sourceWidth: metadata.columns,
		sourceHeight: metadata.rows,
		bitsAllocated: metadata.bitsAllocated,
		bitsStored: metadata.bitsStored,
		/*
		 * Отсутствующий тег (0028,0103) — это «неизвестно», а НЕ «0».
		 *
		 * БЫЛО: `metadata.pixelRepresentation ?? 0`. Ноль в этом теге DICOM —
		 * содержательное значение «беззнаковые значения пикселей», а не пустое место,
		 * поэтому подстановка превращала отсутствие атрибута в измеренный факт: ответ
		 * предпросмотра утверждал, что снимок размечен как беззнаковый, хотя разбор
		 * тега (0028,0103) его в файле не нашёл вовсе. Та же ветка «unsupported» на
		 * тот же самый отсутствующий тег отвечает null — то есть один разбор давал два
		 * разных ответа про одно и то же неизвестное.
		 *
		 * Контракт это допускает: pixelRepresentation объявлен
		 * `z.number().int().min(0).max(1).nullable()` в packages/shared/src/index.ts.
		 * Решение отрисовщика при этом НЕ МЕНЯЕТСЯ: renderDicomPreviewImage читает
		 * metadata.pixelRepresentation напрямую и трактует «не 1» как беззнаковый —
		 * это его собственный выбор по умолчанию, и он остаётся там, где стоял. Здесь
		 * же печатается разобранный атрибут, и печатать в нём выдуманный ноль нельзя.
		 */
		pixelRepresentation: metadata.pixelRepresentation,
		windowCenter: result.finalCenter,
		windowWidth: result.finalWindow,
		imageDataUrl: result.imageDataUrl,
		width: result.width,
		height: result.height,
		previewGrayRange: result.grayRange,
		previewGrayMean: result.grayMean,
		warnings: result.finalWarnings,
		nextAction:
			"Используйте это только как быстрый ориентировочный предпросмотр; для диагностики нужен просмотрщик КТ-срезов.",
	};
}

export function dicomFirstFrameReadyResponse(input: {
	sourceFileIndex: number;
	parsed: DicomFirstFramePixelParse;
	warnings: string[];
	requestedFileIndex?: number | null;
	selectableFileCount: number;
}): DicomFirstFramePreviewResponse {
	return dicomFirstFramePreviewResponseSchema.parse({
		version: "dental-crm-dicom-first-frame-preview-v1",
		generatedAt: new Date().toISOString(),
		folderPath: "redacted-local-dicom-folder",
		status: "ready",
		sourceFileName: `dicom-frame-candidate-${input.sourceFileIndex + 1}`,
		sourceFileIndex: input.sourceFileIndex,
		requestedFileIndex: input.requestedFileIndex ?? null,
		selectableFileCount: input.selectableFileCount,
		transferSyntaxUid: input.parsed.transferSyntaxUid,
		photometricInterpretation: input.parsed.photometricInterpretation,
		width: input.parsed.width,
		height: input.parsed.height,
		sourceWidth: input.parsed.sourceWidth,
		sourceHeight: input.parsed.sourceHeight,
		bitsAllocated: input.parsed.bitsAllocated,
		bitsStored: input.parsed.bitsStored,
		pixelRepresentation: input.parsed.pixelRepresentation,
		windowCenter: input.parsed.windowCenter,
		windowWidth: input.parsed.windowWidth,
		imageDataUrl: input.parsed.imageDataUrl,
		warnings: redactDicomPreviewWarnings(input.warnings),
		nextAction: input.parsed.nextAction,
	});
}

export function locateLittleEndianPixelData(
	buffer: Buffer,
): { valueOffset: number; valueLength: number } | null {
	const pixelTag = Buffer.from([0xe0, 0x7f, 0x10, 0x00]);
	const cursor = buffer.indexOf(pixelTag);
	while (cursor >= 0 && cursor + 8 <= buffer.length) {
		const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
		const explicitLongVr = [
			"OB",
			"OD",
			"OF",
			"OL",
			"OV",
			"OW",
			"SQ",
			"UC",
			"UR",
			"UT",
			"UN",
		].includes(vr);
		if (explicitLongVr && cursor + 12 <= buffer.length) {
			const valueLength = buffer.readUInt32LE(cursor + 8);
			if (valueLength !== 0xffffffff)
				return { valueOffset: cursor + 12, valueLength };
			return null;
		}
		const explicitShortVr = /^[A-Z]{2}$/.test(vr);
		if (explicitShortVr && cursor + 8 <= buffer.length) {
			const valueLength = buffer.readUInt16LE(cursor + 6);
			return { valueOffset: cursor + 8, valueLength };
		}
		const valueLength = buffer.readUInt32LE(cursor + 4);
		if (valueLength !== 0xffffffff)
			return { valueOffset: cursor + 8, valueLength };
		return null;
	}
	return null;
}

export async function readDicomFirstFramePreviewBuffer(
	filePath: string,
	maxFileBytes: number,
): Promise<{ buffer: Buffer | null; warnings: string[] }> {
	const warnings: string[] = [];
	const stats = await stat(filePath);
	const fileHandle = await open(filePath, "r");
	try {
		const prefixLength = Math.min(
			stats.size,
			maxFileBytes,
			dicomFirstFrameHeaderReadLimit,
		);
		const prefix = await readExactFileRange(fileHandle, 0, prefixLength);
		if (!prefix.buffer) {
			return {
				buffer: null,
				warnings: [
					`first_frame_header_read_failed:${prefix.warning ?? "unknown"}`,
				],
			};
		}
		const pixelData = locateLittleEndianPixelData(prefix.buffer);
		if (!pixelData) {
			warnings.push(
				"Pixel Data was not found inside the bounded first-frame header window.",
			);
			return { buffer: prefix.buffer, warnings };
		}
		const metadata = parseDicomHeader(prefix.buffer);
		const estimatedFrameBytes =
			metadata.imageRows && metadata.imageColumns && metadata.bitsAllocated
				? metadata.imageRows *
					metadata.imageColumns *
					(metadata.samplesPerPixel ?? 1) *
					Math.max(1, Math.ceil(metadata.bitsAllocated / 8))
				: Math.min(pixelData.valueLength, dicomFirstFramePixelReadLimit);
		const frameBytes = Math.min(
			pixelData.valueLength,
			estimatedFrameBytes,
			dicomFirstFramePixelReadLimit,
		);
		const requiredBytes = pixelData.valueOffset + frameBytes;
		if (requiredBytes > maxFileBytes) {
			return {
				buffer: null,
				warnings: ["first_frame_preview_byte_limit_exceeded"],
			};
		}
		if (requiredBytes > stats.size) {
			return {
				buffer: null,
				warnings: ["first_frame_pixel_range_out_of_bounds"],
			};
		}
		if (requiredBytes <= prefix.buffer.length)
			return { buffer: prefix.buffer.subarray(0, requiredBytes), warnings };
		const boundedFrame = await readExactFileRange(fileHandle, 0, requiredBytes);
		if (!boundedFrame.buffer) {
			return {
				buffer: null,
				warnings: [
					`first_frame_range_read_failed:${boundedFrame.warning ?? "unknown"}`,
				],
			};
		}
		return { buffer: boundedFrame.buffer, warnings };
	} finally {
		await fileHandle.close();
	}
}

export async function buildDicomFirstFramePreview(
	input: {
		folderPath: string;
		recursive: boolean;
		maxFiles: number;
		maxFolders: number;
		maxEntriesPerFolder: number;
		maxFileBytes: number;
		maxPreviewEdge: number;
		preferredFileIndex?: number | undefined;
	},
	options: ApiDicomScanOptions = {},
): Promise<DicomFirstFramePreviewResponse> {
	const scan = await collectDicomHeaderFiles(
		input.folderPath,
		input.recursive,
		input.maxFiles,
		options,
		{
			maxFolders: input.maxFolders,
			maxEntriesPerFolder: input.maxEntriesPerFolder,
		},
	);
	const files = scan.files.filter(
		(filePath) => !isZipArchivePath(filePath) && isDicomPixelPath(filePath),
	);
	const warnings = [...scan.warnings];
	const requestedFileIndex = input.preferredFileIndex ?? null;
	const yieldState = createApiDicomScanYieldState();
	let bestReady: {
		sourceFileIndex: number;
		parsed: DicomFirstFramePixelParse;
		score: number;
	} | null = null;

	if (!files.length) {
		return emptyDicomFirstFramePreview({
			folderPath: input.folderPath,
			status: "not_found",
			warnings: [
				...warnings,
				"Для предпросмотра первого кадра не найдены прямые файлы снимков.",
			],
			nextAction:
				"Запустите разбор снимков или распакуйте архивы перед запросом быстрого предпросмотра.",
			requestedFileIndex,
		});
	}

	const preferredTargetIndex =
		typeof input.preferredFileIndex === "number"
			? Math.min(files.length - 1, input.preferredFileIndex)
			: null;
	const candidateIndexes =
		preferredTargetIndex === null
			? files.map((_, index) => index)
			: files
					.map((_, index) => index)
					.sort(
						(left, right) =>
							Math.abs(left - preferredTargetIndex) -
								Math.abs(right - preferredTargetIndex) || left - right,
					);
	if (
		preferredTargetIndex !== null &&
		requestedFileIndex !== null &&
		preferredTargetIndex !== requestedFileIndex
	) {
		warnings.push(
			`Запрошенный срез снимков ${requestedFileIndex + 1} выше доступного диапазона; выбран ближайший доступный кандидат.`,
		);
	}

	for (const index of candidateIndexes) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const filePath = files[index];
		if (!filePath) continue;
		const stats = await stat(filePath);
		if (stats.size > input.maxFileBytes) {
			warnings.push(
				"Файл снимка выше байтового лимита легкого предпросмотра пропущен.",
			);
			continue;
		}
		try {
			const previewBuffer = await readDicomFirstFramePreviewBuffer(
				filePath,
				input.maxFileBytes,
			);
			warnings.push(...previewBuffer.warnings);
			if (!previewBuffer.buffer) continue;
			const parsed = parseDicomFirstFramePixel(
				previewBuffer.buffer,
				input.maxPreviewEdge,
			);
			if (parsed.status !== "ready") {
				warnings.push(...parsed.warnings);
				continue;
			}
			const grayRange = parsed.previewGrayRange ?? 0;
			const grayMean = parsed.previewGrayMean ?? 0;
			const meanBalance = Math.min(grayMean, 255 - grayMean);
			const score = grayRange + meanBalance * 0.1;
			if (!bestReady || score > bestReady.score) {
				bestReady = { sourceFileIndex: index, parsed, score };
			}
			if (preferredTargetIndex !== null) {
				return dicomFirstFrameReadyResponse({
					sourceFileIndex: index,
					parsed,
					warnings: [
						...warnings,
						...parsed.warnings,
						...(index === preferredTargetIndex
							? []
							: [
									`Запрошенный срез снимков ${preferredTargetIndex + 1} не декодирован; показан ближайший читаемый срез ${index + 1}.`,
								]),
					],
					requestedFileIndex,
					selectableFileCount: files.length,
				});
			}
			if (grayRange >= 32 && meanBalance >= 4) {
				return dicomFirstFrameReadyResponse({
					sourceFileIndex: index,
					parsed,
					warnings: [...warnings, ...parsed.warnings],
					requestedFileIndex,
					selectableFileCount: files.length,
				});
			}
			warnings.push(
				"Технически читаемый, но визуально пустой кандидат предпросмотра снимка пропущен.",
			);
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			warnings.push(
				"Файл снимка не удалось декодировать легким парсером предпросмотра.",
			);
		}
	}

	if (bestReady) {
		return dicomFirstFrameReadyResponse({
			sourceFileIndex: bestReady.sourceFileIndex,
			parsed: bestReady.parsed,
			warnings: [
				...warnings,
				...bestReady.parsed.warnings,
				"В ограниченном сканировании найдены только низкоконтрастные кандидаты предпросмотра снимка.",
			],
			requestedFileIndex,
			selectableFileCount: files.length,
		});
	}

	return emptyDicomFirstFramePreview({
		folderPath: input.folderPath,
		status: "unsupported",
		warnings,
		nextAction:
			"Не удалось показать ни один читаемый первый срез; используйте внешний КТ-модуль или локальный обработчик.",
		requestedFileIndex,
		selectableFileCount: files.length,
	});
}

export function dicomMetadataManifestRow(
	filePath: string,
	metadata: DicomHeaderMetadata,
	sourceName: string,
) {
	const fallback = inferManifestFieldsFromPath(filePath);
	const kind =
		modalityToKind(
			metadata.modality,
			`${metadata.studyDescription ?? ""} ${metadata.seriesDescription ?? ""}`,
		) ??
		fallback.kind ??
		null;
	return [
		metadata.patientName ?? fallback.patientName,
		kind,
		metadata.modality,
		metadata.studyInstanceUid,
		metadata.seriesInstanceUid,
		metadata.sopInstanceUid,
		metadata.studyDescription,
		metadata.seriesDescription,
		metadata.instanceNumber === null ? null : String(metadata.instanceNumber),
		metadata.imageRows === null ? null : String(metadata.imageRows),
		metadata.imageColumns === null ? null : String(metadata.imageColumns),
		metadata.bitsAllocated === null ? null : String(metadata.bitsAllocated),
		metadata.samplesPerPixel === null ? null : String(metadata.samplesPerPixel),
		metadata.estimatedPixelBytes === null
			? null
			: String(metadata.estimatedPixelBytes),
		metadata.capturedAt ?? fallback.date,
		filePath,
		sourceName,
	]
		.map(quoteManifestCell)
		.join(";");
}

export function dicomMetadataManifestHeader() {
	return [
		"patient",
		"kind",
		"modality",
		"StudyInstanceUID",
		"SeriesInstanceUID",
		"SOPInstanceUID",
		"StudyDescription",
		"SeriesDescription",
		"InstanceNumber",
		"Rows",
		"Columns",
		"BitDepth",
		"SamplesPerPixel",
		"EstimatedPixelBytes",
		"date",
		"file",
		"source",
	].join(";");
}
