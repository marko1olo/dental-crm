/**
 * archiveInspector.ts — Layer 1: Потоковая инспекция ZIP/DICOM архивов без полной
 * распаковки, проверка Part 10 сигнатуры и безопасная авто-распаковка в кэш.
 */

import { open, mkdir, stat, writeFile, copyFile, chmod } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createInflateRaw } from "node:zlib";
import { once } from "node:events";
import {
	hasDicomPart10Magic,
	buildStudyManifest,
	formatStudyManifestJson,
	generateWindowsUrlShortcut,
	generateMacWeblocShortcut,
	generateMacCommandShortcut,
	type DicomArchiveInspectionResult,
} from "@dental/shared";
import {
	parseDicomIngestBuffer,
	type DicomIngestMetadata,
} from "../dicomIngestMetadataParser.js";
import {
	ZIP_EOCD_SEARCH_WINDOW,
	ZIP_MAX_HEADER_PREFIX,
	JUNK_VIEWER_EXTENSIONS,
	JUNK_VIEWER_PATH_REGEX,
	type ZipCentralEntry,
	type StudyUnpackMetadata,
	type ArchiveStatsCollector,
} from "./types.js";

/**
 * Чтение префикса файла внутри ZIP (хранимого или сжатого Deflate)
 */
export async function readZipEntryPrefix(
	fileHandle: FileHandle,
	entry: ZipCentralEntry,
	maxBytes: number,
): Promise<Buffer | null> {
	if (entry.encrypted) return null;

	// Читаем Local File Header
	const localHdrBuf = Buffer.alloc(30);
	await fileHandle.read(localHdrBuf, 0, 30, entry.localHeaderOffset);
	if (localHdrBuf.readUInt32LE(0) !== 0x04034b50) return null;

	const fileNameLen = localHdrBuf.readUInt16LE(26);
	const extraLen = localHdrBuf.readUInt16LE(28);
	const dataStart = entry.localHeaderOffset + 30 + fileNameLen + extraLen;

	// Метод 0: Без сжатия (Store)
	if (entry.compressionMethod === 0) {
		const readLen = Math.min(entry.uncompressedSize, maxBytes);
		const buf = Buffer.alloc(readLen);
		await fileHandle.read(buf, 0, readLen, dataStart);
		return buf;
	}

	// Метод 8: Deflate
	if (entry.compressionMethod === 8) {
		return new Promise<Buffer | null>((resolve) => {
			const inflater = createInflateRaw();
			const chunks: Buffer[] = [];
			let totalOut = 0;
			let settled = false;

			const finish = (result: Buffer | null) => {
				if (settled) return;
				settled = true;
				inflater.removeAllListeners();
				inflater.destroy();
				resolve(result);
			};

			inflater.on("data", (chunk: Buffer) => {
				if (settled) return;
				const need = maxBytes - totalOut;
				if (need > 0) {
					const part = chunk.length > need ? chunk.subarray(0, need) : chunk;
					chunks.push(part);
					totalOut += part.length;
				}
				if (totalOut >= maxBytes) {
					finish(Buffer.concat(chunks, totalOut));
				}
			});

			inflater.on("error", () => finish(null));
			inflater.on("end", () => finish(Buffer.concat(chunks, totalOut)));

			void (async () => {
				const readBudget = Math.min(entry.compressedSize, 256 * 1024);
				const compBuf = Buffer.alloc(readBudget);
				await fileHandle.read(compBuf, 0, readBudget, dataStart);
				if (!inflater.write(compBuf)) {
					await once(inflater, "drain");
				}
				inflater.end();
			})().catch(() => finish(null));
		});
	}

	return null;
}

/**
 * ИНСПЕКЦИЯ ZIP-АРХИВА БЕЗ ПОЛНОЙ РАСПАКОВКИ:
 * Читает Central Directory, ищет файлы срезов и проверяет магическую 4-байтовую
 * сигнатуру DICM на 128-м байте первого среза!
 */
export async function inspectZipForDicom(
	filePath: string,
	errorsCollector?: string[],
): Promise<DicomArchiveInspectionResult> {
	let stats;
	try {
		stats = await stat(filePath);
	} catch {
		return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: 0, dicomFileNames: [], confidence: 0 };
	}

	if (stats.size < 132) {
		return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
	}

	let fileHandle: FileHandle | null = null;
	try {
		fileHandle = await open(filePath, "r");

		// 1. Ищем EOCD (End of Central Directory)
		const tailLength = Math.min(stats.size, ZIP_EOCD_SEARCH_WINDOW);
		const tailBuf = Buffer.alloc(tailLength);
		await fileHandle.read(tailBuf, 0, tailLength, stats.size - tailLength);

		let eocdOffset = -1;
		for (let i = tailBuf.length - 22; i >= 0; i--) {
			if (tailBuf.readUInt32LE(i) === 0x06054b50) {
				eocdOffset = i;
				break;
			}
		}

		if (eocdOffset < 0) {
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
		}

		const totalEntries = tailBuf.readUInt16LE(eocdOffset + 10);
		const centralDirSize = tailBuf.readUInt32LE(eocdOffset + 12);
		const centralDirOffset = tailBuf.readUInt32LE(eocdOffset + 16);

		if (centralDirOffset + centralDirSize > stats.size) {
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
		}

		// 2. Читаем Central Directory
		const cdBuf = Buffer.alloc(centralDirSize);
		await fileHandle.read(cdBuf, 0, centralDirSize, centralDirOffset);

		const entries: ZipCentralEntry[] = [];
		let cursor = 0;
		while (cursor + 46 <= cdBuf.length && entries.length < totalEntries) {
			if (cdBuf.readUInt32LE(cursor) !== 0x02014b50) break;
			const flags = cdBuf.readUInt16LE(cursor + 8);
			const method = cdBuf.readUInt16LE(cursor + 10);
			const compSize = cdBuf.readUInt32LE(cursor + 20);
			const uncompSize = cdBuf.readUInt32LE(cursor + 24);
			const nameLen = cdBuf.readUInt16LE(cursor + 28);
			const extraLen = cdBuf.readUInt16LE(cursor + 30);
			const commLen = cdBuf.readUInt16LE(cursor + 32);
			const localOffset = cdBuf.readUInt32LE(cursor + 42);

			const nameStart = cursor + 46;
			const nameEnd = nameStart + nameLen;
			if (nameEnd > cdBuf.length) break;

			const name = cdBuf.toString("utf8", nameStart, nameEnd);
			entries.push({
				name,
				compressionMethod: method,
				compressedSize: compSize,
				uncompressedSize: uncompSize,
				localHeaderOffset: localOffset,
				encrypted: Boolean(flags & 1),
			});

			cursor = nameEnd + extraLen + commLen;
		}

		// 3. Фильтруем кандидатов в DICOM файлы с тотальным исключением мусора и сторонних ридеров
		const nonJunkEntries = entries.filter((e) => {
			const lower = e.name.toLowerCase();
			const ext = path.extname(lower);
			if (JUNK_VIEWER_EXTENSIONS.has(ext)) return false;
			if (JUNK_VIEWER_PATH_REGEX.test(e.name)) return false;
			return true;
		});

		const candidateEntries = nonJunkEntries.filter((e) => {
			const lower = e.name.toLowerCase();
			return (
				lower.endsWith(".dcm") ||
				lower.endsWith(".dicom") ||
				lower.endsWith(".ima") ||
				/(?:^|\/)DICOMDIR$/i.test(e.name) ||
				/(?:^|\/)(?:CT|IMG|SERIES|SLICE)[0-9_.-]/i.test(e.name) ||
				(lower.includes("/dicom/") && !e.name.endsWith("/"))
			);
		});

		// Если явных расширений нет, но есть файлы без расширения > 132 байт (срезы томографов без .dcm)
		const finalCandidates =
			candidateEntries.length > 0
				? candidateEntries
				: nonJunkEntries.filter((e) => !e.name.endsWith("/") && e.uncompressedSize >= 132);

		if (finalCandidates.length === 0) {
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
		}

		// 4. Заглядываем внутрь первого файла: читаем первые байты
		const firstEntry = finalCandidates[0]!;
		const prefixBuffer = await readZipEntryPrefix(fileHandle, firstEntry, ZIP_MAX_HEADER_PREFIX);

		if (!prefixBuffer || prefixBuffer.length < 132) {
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
		}

		// 5. ПРОВЕРКА МАГИЧЕСКОЙ СИГНАТУРЫ DICM
		const isPart10Dicom = hasDicomPart10Magic(prefixBuffer);
		const isDicomdir = /(?:^|\/)DICOMDIR$/i.test(firstEntry.name);

		if (!isPart10Dicom && !isDicomdir) {
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
		}

		// 6. Парсим метаданные первого среза
		let metadata: DicomIngestMetadata | null = null;
		try {
			metadata = parseDicomIngestBuffer(prefixBuffer);
		} catch {
			// если буфер обрезан, используем базовые данные
		}

		const sliceCount = finalCandidates.length;
		const studyInstanceUid =
			metadata?.studyInstanceUid ||
			`archive.study.${path.basename(filePath).replace(/[^a-zA-Z0-9.-]/g, "_")}`;

		return {
			isDicomArchive: true,
			studyInstanceUid,
			seriesInstanceUid: metadata?.seriesInstanceUid,
			sopInstanceUid: metadata?.sopInstanceUid,
			patientName: metadata?.patientFullName ?? null,
			patientId: metadata?.patientChartNumber ?? null,
			patientBirthDate: metadata?.patientBirthDate ?? null,
			studyDate: metadata?.studyDate ?? null,
			modality: metadata?.modalityKind?.toUpperCase() ?? (sliceCount > 20 ? "CT" : "DX"),
			sliceCount,
			dimensions: metadata?.rows && metadata?.columns ? `${metadata.columns}x${metadata.rows}` : null,
			voxelSpacing: metadata?.sliceThickness ? `${metadata.sliceThickness}mm` : null,
			totalArchiveBytes: stats.size,
			dicomFileNames: finalCandidates.map((c) => c.name),
			confidence: 100,
		};
	} catch (err) {
		if (errorsCollector) {
			errorsCollector.push(`Ошибка инспекции ZIP ${filePath}: ${String(err)}`);
		}
		return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
	} finally {
		if (fileHandle) {
			await fileHandle.close();
		}
	}
}

/**
 * Автоматическая распаковка ZIP-архива в целевой каталог кэша
 */
export async function unpackZipArchive(
	zipPath: string,
	destinationDir: string,
	studyMetadata?: StudyUnpackMetadata,
	statsCollector?: ArchiveStatsCollector,
	errorsCollector?: string[],
): Promise<string[]> {
	const extractedPaths: string[] = [];
	await mkdir(destinationDir, { recursive: true });

	const stats = await stat(zipPath);
	const fileHandle = await open(zipPath, "r");

	try {
		// Читаем Central Directory
		const tailLength = Math.min(stats.size, ZIP_EOCD_SEARCH_WINDOW);
		const tailBuf = Buffer.alloc(tailLength);
		await fileHandle.read(tailBuf, 0, tailLength, stats.size - tailLength);

		let eocdOffset = -1;
		for (let i = tailBuf.length - 22; i >= 0; i--) {
			if (tailBuf.readUInt32LE(i) === 0x06054b50) {
				eocdOffset = i;
				break;
			}
		}
		if (eocdOffset < 0) return extractedPaths;

		const totalEntries = tailBuf.readUInt16LE(eocdOffset + 10);
		const centralDirSize = tailBuf.readUInt32LE(eocdOffset + 12);
		const centralDirOffset = tailBuf.readUInt32LE(eocdOffset + 16);

		const cdBuf = Buffer.alloc(centralDirSize);
		await fileHandle.read(cdBuf, 0, centralDirSize, centralDirOffset);

		let cursor = 0;
		let entryIndex = 0;

		while (cursor + 46 <= cdBuf.length && entryIndex < totalEntries) {
			if (cdBuf.readUInt32LE(cursor) !== 0x02014b50) break;
			const method = cdBuf.readUInt16LE(cursor + 10);
			const compSize = cdBuf.readUInt32LE(cursor + 20);
			const uncompSize = cdBuf.readUInt32LE(cursor + 24);
			const nameLen = cdBuf.readUInt16LE(cursor + 28);
			const extraLen = cdBuf.readUInt16LE(cursor + 30);
			const commLen = cdBuf.readUInt16LE(cursor + 32);
			const localOffset = cdBuf.readUInt32LE(cursor + 42);

			const nameStart = cursor + 46;
			const nameEnd = nameStart + nameLen;
			const entryName = cdBuf.toString("utf8", nameStart, nameEnd);
			cursor = nameEnd + extraLen + commLen;
			entryIndex++;

			// Пропускаем папки
			if (entryName.endsWith("/") || entryName.endsWith("\\")) continue;

			// Тотальная фильтрация сторонних просмотрщиков (Zero-Viewer Bleed)
			const lowerEntry = entryName.toLowerCase();
			const ext = path.extname(lowerEntry);
			if (JUNK_VIEWER_EXTENSIONS.has(ext) || JUNK_VIEWER_PATH_REGEX.test(entryName)) {
				statsCollector?.onJunkSkipped?.(uncompSize);
				continue;
			}

			// Защита от path traversal (Zip Slip vulnerability)
			const safeFileName = path.basename(entryName);
			const outFilePath = path.join(destinationDir, safeFileName);

			// Читаем Local Header
			const localHdr = Buffer.alloc(30);
			await fileHandle.read(localHdr, 0, 30, localOffset);
			if (localHdr.readUInt32LE(0) !== 0x04034b50) continue;

			const fNameLen = localHdr.readUInt16LE(26);
			const extLen = localHdr.readUInt16LE(28);
			const dataStart = localOffset + 30 + fNameLen + extLen;

			let decompressedBuf: Buffer | null = null;

			if (method === 0) {
				// Без сжатия
				decompressedBuf = Buffer.alloc(uncompSize);
				await fileHandle.read(decompressedBuf, 0, uncompSize, dataStart);
			} else if (method === 8) {
				// Deflate
				const compBuf = Buffer.alloc(compSize);
				await fileHandle.read(compBuf, 0, compSize, dataStart);

				decompressedBuf = await new Promise<Buffer | null>((resolve) => {
					const inflater = createInflateRaw();
					const outChunks: Buffer[] = [];
					inflater.on("data", (chunk: Buffer) => outChunks.push(chunk));
					inflater.on("end", () => resolve(Buffer.concat(outChunks, uncompSize)));
					inflater.on("error", () => resolve(null));
					inflater.end(compBuf);
				});
			}

			if (!decompressedBuf || decompressedBuf.length === 0) continue;

			// Проверяем: это реальный DICOM файл или сопутствующий DICOMDIR / манифест
			const isPart10 = hasDicomPart10Magic(decompressedBuf);
			const isDicomdir = /(?:^|[\\/])DICOMDIR$/i.test(entryName);
			const isDicomExt = ext === ".dcm" || ext === ".dicom" || ext === ".ima";

			// Если файл не является DICOM-файлом (нет сигнатуры DICM на 128 байте, не DICOMDIR и не .dcm),
			// мы КАТЕГОРИЧЕСКИ НЕ ЗАСОРЯЕМ ДИСК чужим мусором!
			if (!isPart10 && !isDicomdir && !isDicomExt) {
				statsCollector?.onJunkSkipped?.(uncompSize);
				continue;
			}

			await writeFile(outFilePath, decompressedBuf);
			extractedPaths.push(outFilePath);

			// Throttled low-priority I/O: отдаем управление Node event loop каждые 10 файлов
			if (extractedPaths.length % 10 === 0) {
				await new Promise((r) => setImmediate(r));
			}
		}
	} finally {
		await fileHandle.close();
	}

	// Если распакованы файлы, организуем красивую упаковку и ярлыки прямого запуска
	if (extractedPaths.length > 0) {
		try {
			const dicomSlices = extractedPaths.filter((p) => !/DICOMDIR$/i.test(path.basename(p)));
			const studyUid =
				studyMetadata?.studyInstanceUid ||
				`study.${path.basename(destinationDir)}`;
			const patientName = studyMetadata?.patientFullName || null;
			const studyDate = studyMetadata?.studyDate || null;
			const modality = studyMetadata?.modalityKind?.toUpperCase() || (dicomSlices.length > 20 ? "CT" : "DX");
			const sliceCount = studyMetadata?.sliceCount || dicomSlices.length;

			// 1. Случай 1: 1 мультифреймовый файл DICOM
			if (dicomSlices.length === 1) {
				const firstSlice = dicomSlices[0]!;
				const targetVolumePath = path.join(destinationDir, "volume_multiframe.dcm");
				if (path.basename(firstSlice).toLowerCase() !== "volume_multiframe.dcm") {
					try {
						await copyFile(firstSlice, targetVolumePath);
					} catch {
						// fallback
					}
				}
			}

			// 2. Случай 2: Несколько срезов -> организуем slices/
			if (dicomSlices.length > 1) {
				const slicesDir = path.join(destinationDir, "slices");
				await mkdir(slicesDir, { recursive: true });
				for (let i = 0; i < dicomSlices.length; i++) {
					const srcSlice = dicomSlices[i]!;
					const pad = String(i + 1).padStart(4, "0");
					const targetSlicePath = path.join(slicesDir, `slice_${pad}.dcm`);
					try {
						await copyFile(srcSlice, targetSlicePath);
					} catch {
						// fallback
					}
				}
			}

			// 3. Ярлыки прямого открытия в нашей программе
			const shortcutOpts = {
				studyInstanceUid: studyUid,
			};
			const winShortcut = generateWindowsUrlShortcut(shortcutOpts);
			await writeFile(path.join(destinationDir, "Открыть в DENTE.url"), winShortcut, "utf8");

			const macWebloc = generateMacWeblocShortcut(shortcutOpts);
			await writeFile(path.join(destinationDir, "Открыть в DENTE.webloc"), macWebloc, "utf8");

			const macCommand = generateMacCommandShortcut(shortcutOpts);
			const macCommandPath = path.join(destinationDir, "Открыть_в_DENTE.command");
			await writeFile(macCommandPath, macCommand, "utf8");
			if (os.platform() !== "win32") {
				try {
					await chmod(macCommandPath, 0o755);
				} catch {
					// ignore chmod error
				}
			}

			// 4. Манифест study_manifest.json
			const manifest = buildStudyManifest({
				studyInstanceUid: studyUid,
				seriesInstanceUid: studyMetadata?.seriesInstanceUid,
				sopInstanceUid: studyMetadata?.sopInstanceUid,
				patientFullName: patientName,
				patientChartNumber: studyMetadata?.patientChartNumber,
				patientBirthDate: studyMetadata?.patientBirthDate,
				studyDate,
				modality,
				modalityKind: studyMetadata?.modalityKind || (dicomSlices.length > 20 ? "ct" : "intraoral"),
				sliceCount,
				packageLayout: dicomSlices.length === 1 ? "single_multiframe" : "series_slices",
				dimensions: studyMetadata?.rows && studyMetadata?.columns ? `${studyMetadata.columns}x${studyMetadata.rows}` : undefined,
				voxelSpacing: studyMetadata?.sliceThickness ? `${studyMetadata.sliceThickness}mm` : undefined,
				sliceThickness: studyMetadata?.sliceThickness,
				kvp: studyMetadata?.kvp,
				ma: studyMetadata?.ma,
				exposureTimeMs: studyMetadata?.exposureTimeMs,
				doseAreaProductDap: studyMetadata?.doseAreaProductDap != null ? String(studyMetadata.doseAreaProductDap) : undefined,
				effectiveDoseMsv: studyMetadata?.estimatedEffectiveDoseMsv,
				manufacturer: studyMetadata?.manufacturer,
				manufacturerModelName: studyMetadata?.manufacturerModelName,
			});

			await writeFile(
				path.join(destinationDir, "study_manifest.json"),
				formatStudyManifestJson(manifest),
				"utf8",
			);
		} catch (err) {
			if (errorsCollector) {
				errorsCollector.push(`Не удалось создать манифест/ярлыки в ${destinationDir}: ${String(err)}`);
			}
		}
	}

	return extractedPaths;
}
