import type { FileHandle } from "node:fs/promises";
import {
	isApiDicomScanAbortError
} from "./imagingHelpers.js";
import {
	isZipArchivePath,
	isDicomLikeEntry,
	isDicomPixelPath
} from "./dicomParsing.js";
import {
	readZipCentralDirectoryDetailed,
	zipEntryPrefix
} from "./dicomZipReader.js";
import {
	dicomZipMetadataEntryLimit
} from "./imagingConstants.js";
import {
	dicomMetadataManifestRow,
	dicomMetadataManifestHeader
} from "./dicomPreview.js";
import { opendir, stat } from "node:fs/promises";
import path from "node:path";
import {
	type ImagingStudyKind,
	type ImagingSourceKind,
	splitLine,
} from "@dental/shared";
import {
	imagingFileExtensions,
	dicomDiscoverySkipDirectoryNames,
	dicomFirstFrameHeaderReadLimit,
	dicomArchiveExtensions,
	dicomPixelFileExtensions,
	dentalModelFileExtensions,
	type DicomHeaderMetadata,
} from "./imagingConstants.js";
import {
	apiDicomDefaultMaxFolders,
	apiDicomDefaultMaxEntriesPerFolder,
	type ApiDicomScanOptions,
	type ApiDicomFolderTraversalLimits,
	createApiDicomScanYieldState,
	maybeYieldApiDicomScan,
	throwIfApiDicomScanAborted,
} from "./imagingHelpers.js";
import {
	normalizeHeader,
	detectDelimiter,
	detectKind,
	detectSourceKind,
	extractTooth,
	modalityToKind,
	parseManifestLine,
} from "./manifestParser.js";
import {
	isDicomArchivePath,
	isDicomHeaderCandidatePath,
	parseDicomHeader,
	readFilePrefix,
} from "./dicomParsing.js";

export async function collectImagingFiles(
	root: string,
	recursive: boolean,
	maxFiles: number,
	options: ApiDicomScanOptions = {},
	limits: ApiDicomFolderTraversalLimits = {},
) {
	const files: string[] = [];
	const warnings: string[] = [];
	const queue = [path.resolve(root)];
	const maxFolders = Math.max(
		1,
		Math.floor(limits.maxFolders ?? apiDicomDefaultMaxFolders),
	);
	const maxEntriesPerFolder = Math.max(
		1,
		Math.floor(
			limits.maxEntriesPerFolder ?? apiDicomDefaultMaxEntriesPerFolder,
		),
	);
	const yieldState = createApiDicomScanYieldState();
	let queueIndex = 0;
	let foldersScanned = 0;
	let folderQueueLimitHit = false;

	const concurrencyLimit = 15;
	let activeWorkers = 0;
	let isDone = false;
	let errorToThrow: unknown = null;

	await new Promise<void>((resolve, reject) => {
		function spawnWorkers() {
			if (errorToThrow || isDone) return;

			while (
				activeWorkers < concurrencyLimit &&
				queueIndex < queue.length &&
				files.length < maxFiles &&
				foldersScanned < maxFolders
			) {
				const current = queue[queueIndex];
				queueIndex += 1;
				foldersScanned += 1;
				activeWorkers += 1;

				if (!current) {
					activeWorkers -= 1;
					continue;
				}

				processFolder(current).finally(() => {
					activeWorkers -= 1;
					if (errorToThrow) return;

					if (
						files.length >= maxFiles ||
						foldersScanned >= maxFolders ||
						queueIndex >= queue.length
					) {
						if (activeWorkers === 0 && !isDone) {
							isDone = true;
							resolve();
						}
					} else {
						spawnWorkers();
					}
				});
			}

			if (
				activeWorkers === 0 &&
				(queueIndex >= queue.length ||
					files.length >= maxFiles ||
					foldersScanned >= maxFolders)
			) {
				if (!isDone) {
					isDone = true;
					resolve();
				}
			}
		}

		async function processFolder(current: string) {
			try {
				await maybeYieldApiDicomScan(yieldState, options.signal);
				let entriesInspected = 0;
				const directory = await opendir(current);
				for await (const entry of directory) {
					if (files.length >= maxFiles) break;

					await maybeYieldApiDicomScan(yieldState, options.signal);
					entriesInspected += 1;
					if (entriesInspected > maxEntriesPerFolder) {
						warnings.push(
							`Проверка папки ограничена ${maxEntriesPerFolder} элементами: ${current}`,
						);
						break;
					}
					const entryName = entry.name.toString();
					const fullPath = path.join(current, entryName);
					if (entry.isDirectory()) {
						if (recursive) {
							const queuedFolders = queue.length - queueIndex;
							if (foldersScanned + queuedFolders < maxFolders) {
								queue.push(fullPath);
							} else {
								folderQueueLimitHit = true;
							}
						}
						continue;
					}
					if (!entry.isFile()) continue;
					if (!imagingFileExtensions.has(path.extname(entryName).toLowerCase()))
						continue;

					if (files.length < maxFiles) {
						files.push(fullPath);
						if (files.length >= maxFiles) {
							warnings.push(`Остановлено на лимите ${maxFiles} файлов.`);
							break;
						}
					}
				}
			} catch (error) {
				if (isApiDicomScanAbortError(error)) {
					errorToThrow = error;
					reject(error);
					return;
				}
				warnings.push(`Не удалось прочитать папку: ${current}`);
			}
		}

		spawnWorkers();
	});

	if (errorToThrow) throw errorToThrow;
	if (
		foldersScanned >= maxFolders ||
		folderQueueLimitHit ||
		queueIndex < queue.length
	) {
		warnings.push(`Сканирование папок остановлено на лимите ${maxFolders}.`);
	}

	return { files, warnings };
}

export function quoteManifestCell(value: string | null) {
	if (!value) return "";
	if (!/[;"\n]/.test(value)) return value;
	return `"${value.replaceAll('"', '""')}"`;
}

export function inferManifestFieldsFromPath(filePath: string) {
	const parsed = path.parse(filePath);
	const originalName = parsed.name;
	const spacedName = originalName.replace(/[_()[\]{}.-]+/g, " ");
	const date =
		originalName
			.match(/\b\d{1,2}[.-]\d{1,2}[.-]\d{4}\b/)?.[0]
			?.replaceAll("-", ".") ?? null;
	const toothCode =
		spacedName.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/)?.[0] ?? null;
	const kind = detectKind(originalName) ?? detectKind(spacedName);
	const patientName =
		spacedName
			.replace(/\b\d{1,2}[ .-]\d{1,2}[ .-]\d{4}\b/g, " ")
			.replace(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/g, " ")
			.replace(
				/cbct|кт|ккт|dicom|ceph|trg|трг|телерентг|цеф|opg|оптг|ортопан|панорам|прицельный|прицел|rvg|bitewing|фото/gi,
				" ",
			)
			.split(/\s+/)
			.filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part))
			.slice(0, 4)
			.join(" ") || null;

	return {
		patientName,
		kind: kind ?? null,
		toothCode,
		date,
		filePath,
	};
}

export function buildFolderScanManifest(files: string[]) {
	const rows = files.map((filePath) => {
		const fields = inferManifestFieldsFromPath(filePath);
		return [
			fields.patientName,
			fields.kind,
			fields.toothCode,
			fields.date,
			fields.filePath,
			"folder_scan",
		]
			.map(quoteManifestCell)
			.join(";");
	});
	return ["patient;type;tooth;date;file;source", ...rows].join("\n");
}

export async function collectDicomHeaderFiles(
	root: string,
	recursive: boolean,
	maxFiles: number,
	options: ApiDicomScanOptions = {},
	limits: ApiDicomFolderTraversalLimits = {},
) {
	const files: string[] = [];
	const warnings: string[] = [];
	const queue = [path.resolve(root)];
	const maxFolders = Math.max(
		1,
		Math.floor(limits.maxFolders ?? apiDicomDefaultMaxFolders),
	);
	const maxEntriesPerFolder = Math.max(
		1,
		Math.floor(
			limits.maxEntriesPerFolder ?? apiDicomDefaultMaxEntriesPerFolder,
		),
	);
	const yieldState = createApiDicomScanYieldState();
	let queueIndex = 0;
	let foldersScanned = 0;
	let folderQueueLimitHit = false;

	while (
		queueIndex < queue.length &&
		files.length < maxFiles &&
		foldersScanned < maxFolders
	) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const current = queue[queueIndex];
		queueIndex += 1;
		if (!current) break;
		foldersScanned += 1;
		try {
			let entriesInspected = 0;
			const directory = await opendir(current);
			for await (const entry of directory) {
				await maybeYieldApiDicomScan(yieldState, options.signal);
				entriesInspected += 1;
				if (entriesInspected > maxEntriesPerFolder) {
					warnings.push(
						`Проверка папки снимков ограничена ${maxEntriesPerFolder} элементами: ${current}`,
					);
					break;
				}
				const entryName = entry.name.toString();
				const fullPath = path.join(current, entryName);
				if (entry.isDirectory()) {
					if (recursive) {
						const queuedFolders = queue.length - queueIndex;
						if (foldersScanned + queuedFolders < maxFolders)
							queue.push(fullPath);
						else folderQueueLimitHit = true;
					}
					continue;
				}
				if (!entry.isFile()) continue;
				if (!isDicomHeaderCandidatePath(fullPath)) continue;
				files.push(fullPath);
				if (files.length >= maxFiles) {
					warnings.push(
						`Сканирование метаданных снимков остановлено на лимите ${maxFiles} файлов.`,
					);
					break;
				}
			}
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			warnings.push(`Не удалось прочитать папку снимков: ${current}`);
		}
	}
	if (
		foldersScanned >= maxFolders ||
		folderQueueLimitHit ||
		queueIndex < queue.length
	) {
		warnings.push(
			`Сканирование папок снимков остановлено на лимите ${maxFolders}.`,
		);
	}

	return { files, warnings };
}

export async function buildDicomHeaderManifest(
	input: { files: string[]; sourceName: string; maxHeaderBytes: number },
	options: ApiDicomScanOptions = {},
) {
	const rows: string[] = [];
	const warnings: string[] = [];
	let filesParsed = 0;
	const yieldState = createApiDicomScanYieldState();

	for (const filePath of input.files) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		if (isZipArchivePath(filePath)) {
			const zip = await readZipCentralDirectoryDetailed(filePath);
			warnings.push(
				...zip.warnings.map((warning) => `${filePath}: ${warning}`),
			);
			if (zip.fileHandle === null) continue;
			const dicomEntries = zip.entries.filter((entry) =>
				isDicomLikeEntry(entry.name),
			);
			try {
				if (!dicomEntries.length) {
					warnings.push(
						`${filePath}: в ZIP не найдены записи снимков для чтения метаданных.`,
					);
					continue;
				}
				if (dicomEntries.length > dicomZipMetadataEntryLimit) {
					warnings.push(
						`${filePath}: сканирование метаданных читает только первые ${dicomZipMetadataEntryLimit}/${dicomEntries.length} записей снимков.`,
					);
				}

				const entriesToProcess = dicomEntries.slice(
					0,
					dicomZipMetadataEntryLimit,
				);
				const chunkSize = 25;
				for (let i = 0; i < entriesToProcess.length; i += chunkSize) {
					const chunk = entriesToProcess.slice(i, i + chunkSize);
					await maybeYieldApiDicomScan(yieldState, options.signal);
					const chunkResults = await Promise.all(
						chunk.map(async (entry) => {
							const prefix = await zipEntryPrefix(
								zip.fileHandle as FileHandle,
								entry,
								input.maxHeaderBytes,
							);
							return { entry, prefix };
						}),
					);

					for (const { entry, prefix } of chunkResults) {
						if (!prefix.buffer) {
							if (prefix.warning)
								warnings.push(`${filePath}: ${prefix.warning}`);
							continue;
						}
						const virtualPath = `${filePath}::${entry.name}`;
						const metadata = parseDicomHeader(prefix.buffer);
						filesParsed += 1;
						warnings.push(
							...metadata.warnings.map(
								(warning) => `${virtualPath}: ${warning}`,
							),
						);
						rows.push(
							dicomMetadataManifestRow(virtualPath, metadata, input.sourceName),
						);
					}
				}
			} finally {
				await zip.fileHandle.close();
			}
			continue;
		}

		if (!isDicomPixelPath(filePath)) continue;
		try {
			const metadata = parseDicomHeader(
				readFilePrefix(filePath, input.maxHeaderBytes),
			);
			filesParsed += 1;
			warnings.push(
				...metadata.warnings.map((warning) => `${filePath}: ${warning}`),
			);
			rows.push(dicomMetadataManifestRow(filePath, metadata, input.sourceName));
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			warnings.push(`${filePath}: не удалось прочитать метаданные снимка.`);
		}
	}

	return {
		rawText: [dicomMetadataManifestHeader(), ...rows].join("\n"),
		metadataRows: rows.length,
		filesParsed,
		warnings,
	};
}
