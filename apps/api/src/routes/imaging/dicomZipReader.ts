import type { Stats } from "node:fs";
import { once } from "node:events";
import {
	zipEntryPreviewLimit
} from "./imagingConstants.js";
import {
	extractFilePath
} from "./manifestParser.js";
import {
	isDicomArchivePath,
	isZipArchivePath
} from "./dicomParsing.js";
import { createInflateRaw } from "node:zlib";
import { open, stat, type FileHandle } from "node:fs/promises";
import {
	zipCentralDirectoryReadLimit,
	zipEntryMetadataChunkBytes,
	zipEntryMetadataCompressedReadLimit,
	zipEocdSearchWindowBytes,
	dicomFirstFrameHeaderReadLimit,
	type ZipCentralDirectoryDetailedResult,
	type ZipCentralDirectoryEntry,
} from "./imagingConstants.js";
import {
	isDicomLikeEntry,
	parseDicomHeader,
} from "./dicomParsing.js";
import {
	dicomMetadataManifestHeader,
	dicomMetadataManifestRow,
} from "./dicomPreview.js";

export async function readExactFileRange(
	fileHandle: FileHandle,
	position: number,
	length: number,
): Promise<{ buffer: Buffer | null; warning: string | null }> {
	if (
		!Number.isSafeInteger(position) ||
		!Number.isSafeInteger(length) ||
		position < 0 ||
		length < 0
	) {
		return { buffer: null, warning: "invalid_file_range" };
	}
	const buffer = Buffer.alloc(length);
	let bytesRead = 0;
	while (bytesRead < length) {
		const { bytesRead: chunk } = await fileHandle.read(buffer, bytesRead, length - bytesRead, position + bytesRead);
		if (chunk <= 0) break;
		bytesRead += chunk;
	}
	if (bytesRead !== length)
		return { buffer: null, warning: "file_range_truncated" };
	return { buffer, warning: null };
}

export async function readZipCentralDirectoryDetailed(
	filePath: string,
): Promise<ZipCentralDirectoryDetailedResult> {
	const warnings: string[] = [];
	let stats: Stats;
	try {
		stats = await stat(filePath);
	} catch (err) {
		console.error("[Dente] Failed to stat ZIP file:", err);
		return {
			entries: [],
			warnings: [
				"ZIP-архив не найден на этом сервере; предпросмотр использует только путь к архиву.",
			],
			fileHandle: null,
		};
	}

	const fileHandle = await open(filePath, "r");
	const tailLength = Math.min(stats.size, zipEocdSearchWindowBytes);
	const tail = await readExactFileRange(
		fileHandle,
		stats.size - tailLength,
		tailLength,
	);
	if (!tail.buffer) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [`ZIP-tail read failed:${tail.warning ?? "unknown"}`],
			fileHandle: null,
		};
	}

	const buffer = tail.buffer;
	const searchStart = 0;
	let eocdOffset = -1;
	for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
		if (buffer.readUInt32LE(offset) === 0x06054b50) {
			eocdOffset = offset;
			break;
		}
	}
	if (eocdOffset < 0) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Центральный каталог ZIP не найден; архив может быть зашифрован, разделен на части или не поддерживаться.",
			],
			fileHandle: null,
		};
	}

	const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
	const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
	const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
	const diskEntries = buffer.readUInt16LE(eocdOffset + 8);
	const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
	const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
	if (
		diskNumber !== 0 ||
		centralDirectoryDisk !== 0 ||
		diskEntries !== totalEntries
	) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Обнаружен split/multi-disk ZIP-архив; предпросмотр метаданных работает только с цельным локальным ZIP.",
			],
			fileHandle: null,
		};
	}
	if (
		totalEntries === 0xffff ||
		centralDirectorySize === 0xffffffff ||
		centralDirectoryOffset === 0xffffffff
	) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Обнаружен ZIP64-архив; этот предпросмотр пропускает раскрытие центрального каталога ZIP64.",
			],
			fileHandle: null,
		};
	}
	if (centralDirectorySize > zipCentralDirectoryReadLimit) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				`Центральный каталог ZIP занимает ${Math.round(centralDirectorySize / 1024 / 1024)} МБ; предпросмотр метаданных ограничен.`,
			],
			fileHandle: null,
		};
	}
	if (centralDirectoryOffset + centralDirectorySize > stats.size) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Центральный каталог ZIP выходит за границы архива; архив не раскрыт.",
			],
			fileHandle: null,
		};
	}
	const centralDirectory = await readExactFileRange(
		fileHandle,
		centralDirectoryOffset,
		centralDirectorySize,
	);
	if (!centralDirectory.buffer) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				`ZIP central-directory read failed:${centralDirectory.warning ?? "unknown"}`,
			],
			fileHandle: null,
		};
	}

	const entries: ZipCentralDirectoryEntry[] = [];
	let cursor = 0;
	const directoryBuffer = centralDirectory.buffer;
	while (
		cursor + 46 <= directoryBuffer.length &&
		entries.length < Math.min(totalEntries, zipEntryPreviewLimit)
	) {
		if (directoryBuffer.readUInt32LE(cursor) !== 0x02014b50) break;
		const flags = directoryBuffer.readUInt16LE(cursor + 8);
		const compressionMethod = directoryBuffer.readUInt16LE(cursor + 10);
		const compressedSize = directoryBuffer.readUInt32LE(cursor + 20);
		const uncompressedSize = directoryBuffer.readUInt32LE(cursor + 24);
		const fileNameLength = directoryBuffer.readUInt16LE(cursor + 28);
		const extraLength = directoryBuffer.readUInt16LE(cursor + 30);
		const commentLength = directoryBuffer.readUInt16LE(cursor + 32);
		const localHeaderOffset = directoryBuffer.readUInt32LE(cursor + 42);
		const fileNameStart = cursor + 46;
		const fileNameEnd = fileNameStart + fileNameLength;
		if (fileNameEnd > directoryBuffer.length) break;
		const name = directoryBuffer.toString("utf8", fileNameStart, fileNameEnd);
		if (
			compressedSize === 0xffffffff ||
			uncompressedSize === 0xffffffff ||
			localHeaderOffset === 0xffffffff
		) {
			warnings.push(`zip64_entry_skipped:${name}`);
		} else if (
			localHeaderOffset + 30 > stats.size ||
			localHeaderOffset + compressedSize > stats.size
		) {
			warnings.push(`zip_entry_out_of_bounds:${name}`);
		} else {
			entries.push({
				name,
				compressionMethod,
				compressedSize,
				uncompressedSize,
				localHeaderOffset,
				encrypted: Boolean(flags & 1),
			});
		}
		cursor = fileNameEnd + extraLength + commentLength;
	}

	if (totalEntries > entries.length)
		warnings.push(
			`ZIP-предпросмотр вернул ${entries.length}/${totalEntries} записей центрального каталога.`,
		);
	return { entries, warnings, fileHandle };
}

export async function inflateZipEntryPrefix(
	fileHandle: FileHandle,
	entry: ZipCentralDirectoryEntry,
	dataStart: number,
	maxHeaderBytes: number,
): Promise<{ buffer: Buffer | null; warning: string | null }> {
	return new Promise((resolve) => {
		const inflater = createInflateRaw();
		const chunks: Buffer[] = [];
		let outputBytes = 0;
		let settled = false;
		const finish = (result: {
			buffer: Buffer | null;
			warning: string | null;
		}) => {
			if (settled) return;
			settled = true;
			inflater.removeAllListeners();
			inflater.destroy();
			resolve(result);
		};

		inflater.on("data", (chunk: Buffer) => {
			if (settled) return;
			const remainingOutput = maxHeaderBytes - outputBytes;
			if (remainingOutput > 0) {
				const slice =
					chunk.length > remainingOutput
						? chunk.subarray(0, remainingOutput)
						: chunk;
				chunks.push(slice);
				outputBytes += slice.length;
			}
			if (outputBytes >= maxHeaderBytes) {
				finish({ buffer: Buffer.concat(chunks, outputBytes), warning: null });
			}
		});
		inflater.on("error", () =>
			finish({
				buffer: null,
				warning: `zip_entry_inflate_failed:${entry.name}`,
			}),
		);
		inflater.on("end", () =>
			finish({ buffer: Buffer.concat(chunks, outputBytes), warning: null }),
		);

		void (async () => {
			let position = dataStart;
			let compressedRemaining = entry.compressedSize;
			let budgetRemaining = Math.min(
				entry.compressedSize,
				zipEntryMetadataCompressedReadLimit,
			);
			while (!settled && compressedRemaining > 0 && budgetRemaining > 0) {
				const chunkLength = Math.min(
					zipEntryMetadataChunkBytes,
					compressedRemaining,
					budgetRemaining,
				);
				const chunk = await readExactFileRange(
					fileHandle,
					position,
					chunkLength,
				);
				if (!chunk.buffer) {
					finish({
						buffer: null,
						warning: `zip_entry_truncated:${entry.name}:${chunk.warning ?? "unknown"}`,
					});
					return;
				}
				position += chunkLength;
				compressedRemaining -= chunkLength;
				budgetRemaining -= chunkLength;
				try {
					if (!inflater.write(chunk.buffer)) await once(inflater, "drain");
				} catch (err) {
					console.error("[Dente] Failed to write to inflater:", err);
					if (!settled)
						finish({
							buffer: null,
							warning: `zip_entry_inflate_failed:${entry.name}`,
						});
					return;
				}
			}
			if (settled) return;
			if (compressedRemaining > 0 && budgetRemaining <= 0) {
				finish({
					buffer: null,
					warning: `zip_entry_header_inflate_budget_exceeded:${entry.name}`,
				});
				return;
			}
			inflater.end();
		})().catch((err: unknown) => {
			if (!settled) {
				finish({
					buffer: null,
					warning: `zip_entry_read_failed:${entry.name}:${err instanceof Error ? err.message : String(err)}`,
				});
			}
		});
	});
}

export async function zipEntryPrefix(
	fileHandle: FileHandle,
	entry: ZipCentralDirectoryEntry,
	maxHeaderBytes: number,
): Promise<{ buffer: Buffer | null; warning: string | null }> {
	if (entry.encrypted)
		return {
			buffer: null,
			warning: `zip_encrypted_entry_skipped:${entry.name}`,
		};
	const offset = entry.localHeaderOffset;
	const header = await readExactFileRange(fileHandle, offset, 30);
	if (!header.buffer)
		return {
			buffer: null,
			warning: `zip_local_header_read_failed:${entry.name}:${header.warning ?? "unknown"}`,
		};
	if (header.buffer.readUInt32LE(0) !== 0x04034b50) {
		return { buffer: null, warning: `zip_local_header_missing:${entry.name}` };
	}

	const fileNameLength = header.buffer.readUInt16LE(26);
	const extraLength = header.buffer.readUInt16LE(28);
	const dataStart = offset + 30 + fileNameLength + extraLength;
	if (entry.compressionMethod === 0) {
		const prefixLength = Math.min(entry.uncompressedSize, maxHeaderBytes);
		return await readExactFileRange(fileHandle, dataStart, prefixLength);
	}
	if (entry.compressionMethod === 8) {
		return inflateZipEntryPrefix(fileHandle, entry, dataStart, maxHeaderBytes);
	}

	return {
		buffer: null,
		warning: `zip_unsupported_compression:${entry.name}:${entry.compressionMethod}`,
	};
}

export async function readZipCentralDirectory(
	filePath: string,
): Promise<{ entries: string[]; warnings: string[] }> {
	const detailed = await readZipCentralDirectoryDetailed(filePath);
	if (detailed.fileHandle !== null) await detailed.fileHandle.close();
	return {
		entries: detailed.entries.map((entry) => entry.name),
		warnings: detailed.warnings,
	};
}

export async function expandDicomArchiveManifestLines(
	lines: string[],
): Promise<{ lines: string[]; notes: string[] }> {
	const expandedLines: string[] = [];
	const notes: string[] = [];

	for (const line of lines) {
		const filePath = extractFilePath(line);
		if (!isDicomArchivePath(filePath)) {
			expandedLines.push(line);
			continue;
		}

		const archivePath = filePath?.split("::")[0] ?? filePath;
		if (!archivePath || !isZipArchivePath(archivePath)) {
			expandedLines.push(line);
			notes.push(
				`${archivePath ?? "Архив"} обнаружен; ZIP можно раскрыть для предпросмотра, 7z/RAR сначала нужно распаковать внешним инструментом.`,
			);
			continue;
		}

		const zip = await readZipCentralDirectory(archivePath);
		notes.push(...zip.warnings.map((warning) => `${archivePath}: ${warning}`));
		const dicomEntries = zip.entries.filter(isDicomLikeEntry);
		if (!dicomEntries.length) {
			expandedLines.push(line);
			notes.push(
				`${archivePath}: в центральном каталоге ZIP не найдены записи снимков.`,
			);
			continue;
		}

		notes.push(
			`${archivePath}: раскрыто ${Math.min(dicomEntries.length, zipEntryPreviewLimit)} записей снимков для предпросмотра серии.`,
		);
		for (const entry of dicomEntries.slice(0, zipEntryPreviewLimit)) {
			const virtualPath = `${archivePath}::${entry}`;
			expandedLines.push(
				filePath && line.includes(filePath)
					? line.replace(filePath, virtualPath)
					: `${line};${virtualPath}`,
			);
		}
	}

	return { lines: expandedLines, notes };
}
