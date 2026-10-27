import { stat } from "node:fs/promises";
import type { DicomFirstFramePreviewResponse } from "@dental/shared";
import { emptyDicomFirstFramePreview, isDicomPixelPath } from "../dicomParsing.js";
import { isZipArchivePath } from "../dicomParsing.js";
import { collectDicomHeaderFiles } from "../folderScanManifest.js";
import {
	type ApiDicomScanOptions,
	createApiDicomScanYieldState,
	isApiDicomScanAbortError,
	maybeYieldApiDicomScan,
} from "../imagingHelpers.js";
import { dicomFirstFrameReadyResponse, parseDicomFirstFramePixel } from "./firstFramePixelParser.js";
import { readDicomFirstFramePreviewBuffer } from "./pixelDataLocator.js";

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
	const scan = await collectDicomHeaderFiles(input.folderPath, input.recursive, input.maxFiles, options, {
		maxFolders: input.maxFolders, maxEntriesPerFolder: input.maxEntriesPerFolder,
	});
	const files = scan.files.filter((fp) => !isZipArchivePath(fp) && isDicomPixelPath(fp));
	const warnings = [...scan.warnings];
	const requestedFileIndex = input.preferredFileIndex ?? null;
	const yieldState = createApiDicomScanYieldState();
	let bestReady: { sourceFileIndex: number; parsed: ReturnType<typeof parseDicomFirstFramePixel>; score: number } | null = null;

	if (!files.length) {
		return emptyDicomFirstFramePreview({
			folderPath: input.folderPath, status: "not_found",
			warnings: [...warnings, "Для предпросмотра первого кадра не найдены прямые файлы снимков."],
			nextAction: "Запустите разбор снимков или распакуйте архивы перед запросом быстрого предпросмотра.",
			requestedFileIndex,
		});
	}

	const preferredTargetIndex = typeof input.preferredFileIndex === "number" ? Math.min(files.length - 1, input.preferredFileIndex) : null;
	const candidateIndexes = preferredTargetIndex === null
		? files.map((_, i) => i)
		: files.map((_, i) => i).sort((l, r) => Math.abs(l - preferredTargetIndex) - Math.abs(r - preferredTargetIndex) || l - r);

	if (preferredTargetIndex !== null && requestedFileIndex !== null && preferredTargetIndex !== requestedFileIndex) {
		warnings.push(`Запрошенный срез снимков ${requestedFileIndex + 1} выше доступного диапазона; выбран ближайший доступный кандидат.`);
	}

	for (const index of candidateIndexes) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const filePath = files[index];
		if (!filePath) continue;
		const stats = await stat(filePath);
		if (stats.size > input.maxFileBytes) {
			warnings.push("Файл снимка выше байтового лимита легкого предпросмотра пропущен.");
			continue;
		}
		try {
			const previewBuffer = await readDicomFirstFramePreviewBuffer(filePath, input.maxFileBytes);
			warnings.push(...previewBuffer.warnings);
			if (!previewBuffer.buffer) continue;
			const parsed = parseDicomFirstFramePixel(previewBuffer.buffer, input.maxPreviewEdge);
			if (parsed.status !== "ready") {
				warnings.push(...parsed.warnings);
				continue;
			}
			const grayRange = parsed.previewGrayRange ?? 0;
			const grayMean = parsed.previewGrayMean ?? 0;
			const meanBalance = Math.min(grayMean, 255 - grayMean);
			const score = grayRange + meanBalance * 0.1;
			if (!bestReady || score > bestReady.score) bestReady = { sourceFileIndex: index, parsed, score };

			if (preferredTargetIndex !== null) {
				return dicomFirstFrameReadyResponse({
					sourceFileIndex: index, parsed,
					warnings: [...warnings, ...parsed.warnings, ...(index === preferredTargetIndex ? [] : [`Запрошенный срез снимков ${preferredTargetIndex + 1} не декодирован; показан ближайший читаемый срез ${index + 1}.`])],
					requestedFileIndex, selectableFileCount: files.length,
				});
			}
			if (grayRange >= 32 && meanBalance >= 4) {
				return dicomFirstFrameReadyResponse({
					sourceFileIndex: index, parsed, warnings: [...warnings, ...parsed.warnings],
					requestedFileIndex, selectableFileCount: files.length,
				});
			}
			warnings.push("Технически читаемый, но визуально пустой кандидат предпросмотра снимка пропущен.");
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			warnings.push("Файл снимка не удалось декодировать легким парсером предпросмотра.");
		}
	}

	if (bestReady) {
		return dicomFirstFrameReadyResponse({
			sourceFileIndex: bestReady.sourceFileIndex, parsed: bestReady.parsed,
			warnings: [...warnings, ...bestReady.parsed.warnings, "В ограниченном сканировании найдены только низкоконтрастные кандидаты предпросмотра снимка."],
			requestedFileIndex, selectableFileCount: files.length,
		});
	}

	return emptyDicomFirstFramePreview({
		folderPath: input.folderPath, status: "unsupported", warnings,
		nextAction: "Не удалось показать ни один читаемый первый срез; используйте внешний КТ-модуль или локальный обработчик.",
		requestedFileIndex, selectableFileCount: files.length,
	});
}
