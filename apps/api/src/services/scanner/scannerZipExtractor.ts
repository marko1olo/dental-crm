/**
 * apps/api/src/services/scanner/scannerZipExtractor.ts
 *
 * Streaming ZIP Archive Extractor for 3D Intraoral Dental Scans using yauzl (MIT).
 * Enforces Zip Slip, entry-count, and uncompressed byte-budget guards without buffering whole ZIPs or inflate streams synchronously.
 */

import path from "node:path";
import yauzl from "yauzl";

export interface ScanFileInput {
	name: string;
	buffer: Buffer;
}

const MAX_SCAN_ZIP_ENTRIES = 500;
const MAX_SCAN_ZIP_TOTAL_BYTES = 256 * 1024 * 1024;

function isUnsafeArchiveEntryName(rawName: string): boolean {
	if (
		rawName.endsWith("/") ||
		rawName.startsWith("__MACOSX/") ||
		rawName.endsWith("/.DS_Store") ||
		rawName === ".DS_Store" ||
		rawName.includes("/~$") ||
		rawName.includes("..") ||
		rawName.includes("\0") ||
		rawName.startsWith("/") ||
		/^[a-zA-Z]:/.test(rawName)
	) {
		return true;
	}
	return false;
}

async function extractFromYauzlZip(zipfile: yauzl.ZipFile): Promise<ScanFileInput[]> {
	const results: ScanFileInput[] = [];
	let currentTotalBytes = 0;

	try {
		for await (const entry of zipfile.eachEntry()) {
			const rawName = entry.fileName.replace(/\\/g, "/");
			if (isUnsafeArchiveEntryName(rawName)) {
				continue;
			}

			if (results.length >= MAX_SCAN_ZIP_ENTRIES) {
				throw new Error(
					"Превышен безопасный лимит объёма или количества файлов в ZIP-архиве (защита от Zip-бомбы).",
				);
			}

			const cleanBaseName = path.basename(rawName);
			if (!cleanBaseName || cleanBaseName === "." || cleanBaseName === "..") {
				continue;
			}

			const remainingBytes = MAX_SCAN_ZIP_TOTAL_BYTES - currentTotalBytes;
			if (remainingBytes <= 0 || entry.uncompressedSize > remainingBytes) {
				throw new Error(
					"Суммарный объём распакованного ZIP-архива превышает допустимый лимит (256 МБ, защита от Zip-бомбы).",
				);
			}

			const readStream = await zipfile.openReadStreamPromise(entry);
			const chunks: Buffer[] = [];
			let entryBytes = 0;

			try {
				for await (const chunk of readStream) {
					const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
					entryBytes += buf.length;
					if (currentTotalBytes + entryBytes > MAX_SCAN_ZIP_TOTAL_BYTES) {
						readStream.destroy();
						throw new Error(
							"Превышен допустимый объём распаковки ZIP-архива (256 МБ, защита от Zip-бомбы).",
						);
					}
					chunks.push(buf);
				}
			} catch (streamErr) {
				readStream.destroy();
				throw streamErr;
			}

			currentTotalBytes += entryBytes;
			results.push({
				name: cleanBaseName,
				buffer: Buffer.concat(chunks, entryBytes),
			});
		}
	} finally {
		try {
			zipfile.close();
		} catch {
			// игнорируем повторное закрытие yauzl
		}
	}

	return results;
}

export async function extractScanFilesFromZipPath(zipFilePath: string): Promise<ScanFileInput[]> {
	try {
		const zipfile = await yauzl.openPromise(zipFilePath, { lazyEntries: true });
		return await extractFromYauzlZip(zipfile);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("Zip-бомбы") || msg.includes("лимит")) {
			throw err;
		}
		return [];
	}
}

export async function extractScanFilesFromZipAsync(buffer: Buffer): Promise<ScanFileInput[]> {
	if (!buffer || buffer.length < 22) {
		return [];
	}
	try {
		const zipfile = await yauzl.fromBufferPromise(buffer, { lazyEntries: true });
		return await extractFromYauzlZip(zipfile);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("Zip-бомбы") || msg.includes("лимит")) {
			throw err;
		}
		return [];
	}
}

/**
 * Legacy-совместимая обёртка для внешних вызовов, ожидающих Promise<ScanFileInput[]>.
 */
export async function extractScanFilesFromZip(buffer: Buffer): Promise<ScanFileInput[]> {
	return extractScanFilesFromZipAsync(buffer);
}
