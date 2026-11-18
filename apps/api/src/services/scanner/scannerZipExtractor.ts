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

			try {
				if (method === 0) {
					fileData = compressed;
				} else if (method === 8) {
					// Inflate with 250MB limit to handle dense full-arch scans
					fileData = inflateRawSync(compressed, {
						maxOutputLength: 250 * 1024 * 1024,
					});
				}
			} catch {
				fileData = null;
			}

			if (fileData) {
				const cleanBaseName = path.basename(rawName);
				results.push({
					name: cleanBaseName || `scan_file_${i}.stl`,
					buffer: fileData,
				});
			}

			cursor = nextCursor;
		}
	} catch {
		// Return whatever entries were successfully extracted
	}

	return results;
}
