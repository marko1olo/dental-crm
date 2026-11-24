/**
 * apps/api/src/services/scanner/scannerZipExtractor.ts
 *
 * Streaming ZIP Archive Extractor for 3D Intraoral Dental Scans (up to 250MB).
 */

import path from "node:path";
import { inflateRawSync } from "node:zlib";

export interface ScanFileInput {
	name: string;
	buffer: Buffer;
}

export function extractScanFilesFromZip(buffer: Buffer): ScanFileInput[] {
	const results: ScanFileInput[] = [];
	if (!buffer || buffer.length < 22) {
		return results;
	}

	try {
		let eocdOffset = -1;
		for (
			let offset = buffer.length - 22;
			offset >= Math.max(0, buffer.length - 66_000);
			offset -= 1
		) {
			if (
				offset + 4 <= buffer.length &&
				buffer.readUInt32LE(offset) === 0x06054b50
			) {
				eocdOffset = offset;
				break;
			}
		}

		if (eocdOffset < 0 || eocdOffset + 22 > buffer.length) {
			return results;
		}

		const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
		const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
		if (centralOffset < 0 || centralOffset >= buffer.length) {
			return results;
		}

		let cursor = centralOffset;
		for (
			let i = 0;
			i < totalEntries && cursor + 46 <= buffer.length;
			i += 1
		) {
			if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
				break;
			}

			const method = buffer.readUInt16LE(cursor + 10);
			const compressedSize = buffer.readUInt32LE(cursor + 20);
			const fileNameLength = buffer.readUInt16LE(cursor + 28);
			const extraLength = buffer.readUInt16LE(cursor + 30);
			const commentLength = buffer.readUInt16LE(cursor + 32);
			const localOffset = buffer.readUInt32LE(cursor + 42);

			if (cursor + 46 + fileNameLength > buffer.length) {
				break;
			}

			const rawName = buffer
				.subarray(cursor + 46, cursor + 46 + fileNameLength)
				.toString("utf8")
				.replace(/\\/g, "/");

			const nextCursor =
				cursor + 46 + fileNameLength + extraLength + commentLength;

			// Skip directory markers, MACOSX junk and hidden files
			if (
				rawName.endsWith("/") ||
				rawName.startsWith("__MACOSX/") ||
				rawName.endsWith("/.DS_Store") ||
				rawName.includes("/~$")
			) {
				cursor = nextCursor;
				continue;
			}

			if (localOffset < 0 || localOffset + 30 > buffer.length) {
				cursor = nextCursor;
				continue;
			}

			if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
				cursor = nextCursor;
				continue;
			}

			const localNameLength = buffer.readUInt16LE(localOffset + 26);
			const localExtraLength = buffer.readUInt16LE(localOffset + 28);
			const dataStart = localOffset + 30 + localNameLength + localExtraLength;

			if (dataStart < 0 || dataStart + compressedSize > buffer.length) {
				cursor = nextCursor;
				continue;
			}

			const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
			let fileData: Buffer | null = null;
			const maxTotalBytes = 256 * 1024 * 1024;
			const currentTotalBytes = results.reduce((acc, item) => acc + item.buffer.length, 0);
			const remainingBytes = maxTotalBytes - currentTotalBytes;
			if (remainingBytes <= 0 || results.length >= 500) {
				throw new Error("Превышен безопасный лимит объёма или количества файлов в ZIP-архиве (защита от Zip-бомбы).");
			}
			if (rawName.includes("..") || rawName.includes("\0") || rawName.startsWith("/") || /^[a-zA-Z]:/.test(rawName)) {
				cursor = nextCursor;
				continue;
			}

			try {
				if (method === 0) {
					if (compressed.length > remainingBytes) {
						throw new Error("Размер файла в ZIP-архиве превышает допустимый суммарный лимит (256 МБ).");
					}
					fileData = compressed;
				} else if (method === 8) {
					fileData = inflateRawSync(compressed, {
						maxOutputLength: remainingBytes,
					});
				}
			} catch (inflateErr) {
				const errMsg = inflateErr instanceof Error ? inflateErr.message : String(inflateErr);
				if (errMsg.includes("maxOutputLength") || errMsg.includes("лимит") || errMsg.includes("ERR_BUFFER_TOO_LARGE")) {
					throw new Error("Превышен допустимый объём распаковки ZIP-архива (256 МБ, защита от Zip-бомбы).");
				}
				fileData = null;
			}

			if (fileData) {
				if (currentTotalBytes + fileData.length > maxTotalBytes) {
					throw new Error("Суммарный объём распакованного ZIP-архива превышает допустимый лимит (256 МБ).");
				}
				const cleanBaseName = path.basename(rawName);
				if (!cleanBaseName || cleanBaseName === "." || cleanBaseName === "..") {
					cursor = nextCursor;
					continue;
				}
				results.push({
					name: cleanBaseName,
					buffer: fileData,
				});
			}

			cursor = nextCursor;
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("Zip-бомбы") || msg.includes("лимит")) {
			throw err;
		}
		// Other malformed zip headers return whatever valid entries were read
	}

	return results;
}
