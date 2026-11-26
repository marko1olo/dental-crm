import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import yauzl from "yauzl";
import type { ZipEntry } from "./types.js";

const textDecoder = new TextDecoder("utf-8", { fatal: false });
const utf16LeDecoder = new TextDecoder("utf-16le", { fatal: false });
const utf16BeDecoder = new TextDecoder("utf-16be", { fatal: false });

export function decodeBase64(value: string | undefined): Buffer {
	if (!value?.trim()) return Buffer.alloc(0);
	try {
		const clean = value.includes(",") ? (value.split(",").pop() ?? "") : value;
		return Buffer.from(clean, "base64");
	} catch (err: unknown) {
		void err;
		return Buffer.alloc(0);
	}
}

export function normalizeText(value: string): string {
	return value
		.replace(/\0/g, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{4,}/g, "\n\n\n")
		.trim();
}

export function decodeText(buffer: Buffer): string {
	if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
		return normalizeText(utf16LeDecoder.decode(buffer.subarray(2)));
	}
	if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
		return normalizeText(utf16BeDecoder.decode(buffer.subarray(2)));
	}
	if (
		buffer.length >= 3 &&
		buffer[0] === 0xef &&
		buffer[1] === 0xbb &&
		buffer[2] === 0xbf
	) {
		return normalizeText(textDecoder.decode(buffer.subarray(3)));
	}
	return normalizeText(textDecoder.decode(buffer));
}

export function extensionOf(fileName: string): string {
	return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function fingerprintText(value: string): string {
	return createHash("sha256")
		.update(value)
		.digest("hex")
		.slice(0, 12)
		.toUpperCase();
}

export function safeFileLabel(fileName: string, prefix: string): string {
	const extension = extensionOf(fileName).replace(/[^a-z0-9]/g, "");
	const suffix = extension ? `.${extension}` : "";
	return `${prefix} #${fingerprintText(fileName)}${suffix}`;
}

export function isIgnoredArchiveEntry(name: string): boolean {
	const normalized = name.replace(/\\/g, "/");
	return (
		normalized.endsWith("/") ||
		normalized.startsWith("__MACOSX/") ||
		normalized.endsWith("/.DS_Store") ||
		normalized.includes("/~$")
	);
}

export function isImagingEntry(name: string): boolean {
	return /\.(?:dcm|dicom|ima|rvg|jpg|jpeg|png|webp|tif|tiff|bmp)$/i.test(name);
}

export function xmlDecode(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}

export function stripXmlTags(xml: string): string {
	return normalizeText(
		xmlDecode(
			xml
				.replace(/<w:tab\/>/g, "\t")
				.replace(/<\/w:tc>/g, "\t")
				.replace(/<\/w:tr>/g, "\n")
				.replace(/<\/w:p>/g, "\n")
				.replace(/<\/a:p>/g, "\n")
				.replace(/<\/row>/g, "\n")
				.replace(/<\/c>/g, "\t")
				.replace(/<[^>]+>/g, " "),
		).replace(/[ \t]{2,}/g, " "),
	);
}

export function looksTabular(text: string): boolean {
	const lines = text
		.split(/\r?\n/)
		.filter((line) => line.trim())
		.slice(0, 30);
	return lines.some(
		(line) =>
			line.includes("\t") ||
			line.split(";").length >= 3 ||
			line.split(",").length >= 4,
	);
}

export function countRows(text: string): number {
	return text.split(/\r?\n/).filter((line) => line.trim()).length;
}

export function readZipEntries(buffer: Buffer): {
	entries: ZipEntry[];
	warnings: string[];
} {
	const warnings: string[] = [];
	const entries: ZipEntry[] = [];

	if (!buffer || buffer.length < 22) {
		return { entries, warnings: ["zip_buffer_too_small"] };
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
			return { entries, warnings: ["zip_eocd_not_found"] };
		}

		const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
		const centralOffset = buffer.readUInt32LE(eocdOffset + 16);

		if (centralOffset < 0 || centralOffset >= buffer.length) {
			return { entries, warnings: ["zip_invalid_central_offset"] };
		}

		let cursor = centralOffset;
		let totalDecompressedBytes = 0;
		const maxTotalZipBytes = 50 * 1024 * 1024;

		for (
			let index = 0;
			index < totalEntries && cursor + 46 <= buffer.length;
			index += 1
		) {
			if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
				warnings.push("zip_central_directory_truncated");
				break;
			}

			const method = buffer.readUInt16LE(cursor + 10);
			const compressedSize = buffer.readUInt32LE(cursor + 20);
			const uncompressedSize = buffer.readUInt32LE(cursor + 24);
			const fileNameLength = buffer.readUInt16LE(cursor + 28);
			const extraLength = buffer.readUInt16LE(cursor + 30);
			const commentLength = buffer.readUInt16LE(cursor + 32);
			const localOffset = buffer.readUInt32LE(cursor + 42);

			if (cursor + 46 + fileNameLength > buffer.length) {
				warnings.push("zip_entry_name_out_of_bounds");
				break;
			}

			const name = buffer
				.subarray(cursor + 46, cursor + 46 + fileNameLength)
				.toString("utf8")
				.replace(/\\/g, "/");

			const nextCursor =
				cursor + 46 + fileNameLength + extraLength + commentLength;

			if (localOffset < 0 || localOffset + 30 > buffer.length) {
				warnings.push(
					`zip_local_header_out_of_bounds:${safeFileLabel(name, "Файл архива")}`,
				);
				cursor = nextCursor;
				continue;
			}

			if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
				warnings.push(
					`zip_local_header_missing:${safeFileLabel(name, "Файл архива")}`,
				);
				cursor = nextCursor;
				continue;
			}

			const localNameLength = buffer.readUInt16LE(localOffset + 26);
			const localExtraLength = buffer.readUInt16LE(localOffset + 28);
			const dataStart = localOffset + 30 + localNameLength + localExtraLength;

			if (dataStart < 0 || dataStart + compressedSize > buffer.length) {
				warnings.push(
					`zip_data_out_of_bounds:${safeFileLabel(name, "Файл архива")}`,
				);
				cursor = nextCursor;
				continue;
			}

			const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
			if (
				uncompressedSize > 20 * 1024 * 1024 ||
				totalDecompressedBytes + uncompressedSize > maxTotalZipBytes
			) {
				warnings.push("zip_bomb_size_limit_exceeded");
				break;
			}
			try {
				if (method === 0) {
					if (totalDecompressedBytes + compressed.length > maxTotalZipBytes) {
						warnings.push("zip_bomb_size_limit_exceeded");
						break;
					}
					totalDecompressedBytes += compressed.length;
					entries.push({ name, data: compressed });
				} else if (method === 8) {
					const remainingBudget = maxTotalZipBytes - totalDecompressedBytes;
					if (remainingBudget <= 0) {
						warnings.push("zip_bomb_size_limit_exceeded");
						break;
					}
					const inflated = inflateRawSync(compressed, {
						maxOutputLength: Math.min(20 * 1024 * 1024, remainingBudget),
					});
					totalDecompressedBytes += inflated.length;
					entries.push({
						name,
						data: inflated,
					});
				} else {
					warnings.push(
						`zip_unsupported_compression:${safeFileLabel(name, "Файл архива")}:${method}`,
					);
				}
			} catch (err: unknown) {
				if (err instanceof RangeError) {
					warnings.push("zip_bomb_size_limit_exceeded");
					break;
				}
				const reason = err instanceof Error ? err.message : "inflate_error";
				warnings.push(
					`zip_entry_inflate_failed:${safeFileLabel(name, "Файл архива")}:${reason}`,
				);
			}

			cursor = nextCursor;
		}
	} catch (err: unknown) {
		warnings.push(`zip_read_error:${err instanceof Error ? err.message : "corrupted_zip"}`);
	}

	return { entries, warnings };
}

export function zipText(entries: ZipEntry[], pathPattern: RegExp): string[] {
	return entries
		.filter((entry) => pathPattern.test(entry.name))
		.map((entry) => stripXmlTags(decodeText(entry.data)))
		.filter(Boolean);
}

/**
 * Потоковое чтение ZIP-архива из файла на диске или буфера на базе yauzl (MIT)
 * с защитой от Zip-бомбы (20 МБ на запись, 50 МБ суммарно, макс. 1000 записей).
 */
export async function readZipEntriesAsync(source: Buffer | string): Promise<{
	entries: ZipEntry[];
	warnings: string[];
}> {
	const warnings: string[] = [];
	const entries: ZipEntry[] = [];
	const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
	const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
	const MAX_ENTRIES = 1000;

	if (Buffer.isBuffer(source) && source.length < 22) {
		return { entries, warnings: ["zip_buffer_too_small"] };
	}

	let zipfile: yauzl.ZipFile | undefined;
	try {
		zipfile = Buffer.isBuffer(source)
			? await yauzl.fromBufferPromise(source, { lazyEntries: true })
			: await yauzl.openPromise(source, { lazyEntries: true });

		let totalDecompressedBytes = 0;
		for await (const entry of zipfile.eachEntry()) {
			const name = entry.fileName.replace(/\\/g, "/");
			if (name.endsWith("/")) {
				continue;
			}
			if (entries.length >= MAX_ENTRIES) {
				warnings.push("zip_entry_limit_reached");
				break;
			}
			if (
				entry.uncompressedSize > MAX_ENTRY_BYTES ||
				totalDecompressedBytes + entry.uncompressedSize > MAX_TOTAL_BYTES
			) {
				warnings.push("zip_bomb_size_limit_exceeded");
				break;
			}
			if (entry.isEncrypted()) {
				warnings.push(`zip_encrypted_entry:${safeFileLabel(name, "Файл архива")}`);
				continue;
			}

			try {
				const readStream = await zipfile.openReadStreamPromise(entry);
				const chunks: Buffer[] = [];
				let entryBytes = 0;
				let abortedByBomb = false;

				for await (const chunk of readStream) {
					const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
					entryBytes += buf.length;
					if (
						entryBytes > MAX_ENTRY_BYTES ||
						totalDecompressedBytes + entryBytes > MAX_TOTAL_BYTES
					) {
						abortedByBomb = true;
						readStream.destroy();
						break;
					}
					chunks.push(buf);
				}

				if (abortedByBomb) {
					warnings.push("zip_bomb_size_limit_exceeded");
					break;
				}

				totalDecompressedBytes += entryBytes;
				entries.push({ name, data: Buffer.concat(chunks, entryBytes) });
			} catch (entryErr: unknown) {
				const reason = entryErr instanceof Error ? entryErr.message : "inflate_error";
				warnings.push(
					`zip_entry_inflate_failed:${safeFileLabel(name, "Файл архива")}:${reason}`,
				);
			}
		}
	} catch (err: unknown) {
		warnings.push(`zip_read_error:${err instanceof Error ? err.message : "corrupted_zip"}`);
	} finally {
		try {
			zipfile?.close();
		} catch {
			// игнорируем повторное закрытие yauzl
		}
	}

	return { entries, warnings };
}
