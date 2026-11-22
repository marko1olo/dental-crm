/**
 * pacsDiskStorageEngine.ts — Файловые и потоковые операции локального хранилища PACS.
 * Декомпозиция монолита LocalPacsStorageService (Мандат 8b).
 */

import crypto from "node:crypto";
import { createReadStream, createWriteStream, existsSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
	type AllowedImagingFormat,
	InvalidMagicBytesError,
	detectImagingMagicBytes,
	getPacsTenantStorageDir,
	resolvePacsTenantStoragePath,
} from "./localPacsSanitizer.js";

export interface StoredTenantFileResult {
	readonly storagePath: string;
	readonly relativePath: string;
	readonly fileName: string;
	readonly fileSizeBytes: number;
	readonly sha256: string;
	readonly detectedFormat: AllowedImagingFormat;
}

export interface StoredXrayScanFileResult {
	readonly storagePath: string;
	readonly relativePath: string;
	readonly fileName: string;
	readonly fileSizeBytes: number;
	readonly sha256: string;
}

export interface TenantFileStreamResult {
	readonly stream: NodeJS.ReadableStream;
	readonly storagePath: string;
	readonly fileSizeBytes: number;
	readonly mimeType: string;
	readonly isRange: boolean;
	readonly rangeStart?: number | undefined;
	readonly rangeEnd?: number | undefined;
	readonly contentLength: number;
}

export class PacsDiskStorageEngine {
	/**
	 * Streams a file into tenant-isolated storage while verifying magic bytes on the fly.
	 * Guarantees zero memory leaks even for large multi-gigabyte CBCT scans.
	 */
	public static async storeTenantFileStream(
		organizationId: string,
		rawFileName: string | undefined,
		sourceStream: NodeJS.ReadableStream,
		options: {
			maxSizeBytes?: number;
			allowedFormats?: AllowedImagingFormat[];
		} = {},
	): Promise<StoredTenantFileResult> {
		const tenantDir = getPacsTenantStorageDir(organizationId);
		await fs.mkdir(tenantDir, { recursive: true });

		const maxBytes = options.maxSizeBytes ?? 2 * 1024 * 1024 * 1024; // 2 GB max for CBCT
		const allowed = options.allowedFormats ?? ["dicom", "png", "jpeg", "heic"];

		const base = (rawFileName ?? "").split(/[\\/]/).pop()?.trim() ?? "";
		const safeName =
			base
				.replace(/[\x00-\x1F]/g, "")
				.replace(/[<>:"|?*]/g, "_")
				.slice(0, 160) || "radiology_scan.dcm";

		const uniqueName = `${Date.now()}_${crypto.randomUUID()}_${safeName}`;
		const targetPath = path.join(tenantDir, uniqueName);

		const hash = crypto.createHash("sha256");
		let totalBytes = 0;
		let headerBuffer = Buffer.alloc(0);
		let detectedFormat: AllowedImagingFormat | null = null;
		let formatChecked = false;

		const writeStream = createWriteStream(targetPath);

		const inspector = new Transform({
			transform(chunk: Buffer, _encoding, callback) {
				totalBytes += chunk.length;
				if (totalBytes > maxBytes) {
					return callback(
						new Error(
							`Превышен максимальный размер файла снимка (${Math.round(maxBytes / (1024 * 1024))} МБ).`,
						),
					);
				}

				hash.update(chunk);

				if (!formatChecked) {
					headerBuffer = Buffer.concat([headerBuffer, chunk]);
					if (headerBuffer.length >= 132) {
						detectedFormat = detectImagingMagicBytes(headerBuffer);
						formatChecked = true;
						if (!detectedFormat || !allowed.includes(detectedFormat)) {
							return callback(
								new InvalidMagicBytesError(
									`Недопустимый формат снимка (${detectedFormat ?? "неизвестный"}). Разрешены: ${allowed.join(", ").toUpperCase()}.`,
								),
							);
						}
					}
				}

				callback(null, chunk);
			},
			flush(callback) {
				if (!formatChecked) {
					detectedFormat = detectImagingMagicBytes(headerBuffer);
					formatChecked = true;
					if (!detectedFormat || !allowed.includes(detectedFormat)) {
						return callback(
							new InvalidMagicBytesError(
								`Недопустимый формат снимка (${detectedFormat ?? "неизвестный"}). Разрешены: ${allowed.join(", ").toUpperCase()}.`,
							),
						);
					}
				}
				callback();
			},
		});

		try {
			await pipeline(sourceStream, inspector, writeStream);
		} catch (err) {
			try {
				if (existsSync(targetPath)) {
					await fs.unlink(targetPath);
				}
			} catch {
				// ignore cleanup error
			}
			throw err;
		}

		const normalizedRelative = path.posix.join("uploads", "pacs", organizationId, uniqueName);

		return {
			storagePath: targetPath,
			relativePath: normalizedRelative,
			fileName: safeName,
			fileSizeBytes: totalBytes,
			sha256: hash.digest("hex"),
			detectedFormat: detectedFormat!,
		};
	}

	/**
	 * Convenience buffer-based storage method (streams under the hood).
	 */
	public static async storeTenantFileBuffer(
		organizationId: string,
		fileName: string,
		buffer: Buffer,
		options: {
			maxSizeBytes?: number;
			allowedFormats?: AllowedImagingFormat[];
		} = {},
	): Promise<StoredTenantFileResult> {
		return this.storeTenantFileStream(organizationId, fileName, Readable.from(buffer), options);
	}

	/**
	 * Safely stores a 2D X-ray (visiograph/panoramic) scan buffer in isolated tenant storage on disk.
	 */
	public static async storeXrayScanFile(
		organizationId: string,
		rawFileName: string | undefined,
		buffer: Buffer,
		mimeType = "image/jpeg",
	): Promise<StoredXrayScanFileResult> {
		const tenantDir = getPacsTenantStorageDir(organizationId);
		await fs.mkdir(tenantDir, { recursive: true });

		const maxBytes = 100 * 1024 * 1024; // 100 MB max for 2D X-ray
		if (buffer.length > maxBytes) {
			throw new Error(
				`Превышен максимальный размер файла рентген-снимка (${Math.round(maxBytes / (1024 * 1024))} МБ).`,
			);
		}

		let ext = ".jpg";
		if (mimeType.includes("png")) ext = ".png";
		else if (mimeType.includes("webp")) ext = ".webp";
		else if (mimeType.includes("dicom") || mimeType.includes("dcm")) ext = ".dcm";

		const base = (rawFileName ?? "").split(/[\\/]/).pop()?.trim() ?? "";
		let safeName =
			base
				.replace(/[\x00-\x1F]/g, "")
				.replace(/[<>:"|?*]/g, "_")
				.slice(0, 160) || `xray_${Date.now()}`;

		if (!path.extname(safeName)) {
			safeName += ext;
		}

		const uniqueName = `${Date.now()}_${crypto.randomUUID()}_${safeName}`;
		const targetPath = path.join(tenantDir, uniqueName);

		await fs.writeFile(targetPath, buffer);

		const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

		return {
			storagePath: targetPath,
			relativePath: uniqueName,
			fileName: safeName,
			fileSizeBytes: buffer.length,
			sha256,
		};
	}

	/**
	 * Safely retrieves a read stream for a tenant's radiology study file.
	 */
	public static async getTenantFileStream(
		organizationId: string,
		storagePathOrName: string,
		range?: { start?: number; end?: number },
	): Promise<TenantFileStreamResult> {
		const resolved = resolvePacsTenantStoragePath(organizationId, storagePathOrName);
		if (!existsSync(resolved)) {
			throw new Error("Файл снимка не найден на диске клиники.");
		}

		const stat = statSync(resolved);
		const totalSize = stat.size;

		let mimeType = "application/octet-stream";
		const ext = path.extname(resolved).toLowerCase();
		if (ext === ".dcm" || ext === ".dicom" || ext === ".ima" || ext === ".rvg") {
			mimeType = "application/dicom";
		} else if (ext === ".png") {
			mimeType = "image/png";
		} else if (ext === ".jpg" || ext === ".jpeg") {
			mimeType = "image/jpeg";
		} else if (ext === ".webp") {
			mimeType = "image/webp";
		} else if (ext === ".heic" || ext === ".heif") {
			mimeType = "image/heic";
		} else {
			try {
				const fd = await fs.open(resolved, "r");
				const probeBuf = Buffer.alloc(132);
				const { bytesRead } = await fd.read(probeBuf, 0, 132, 0);
				await fd.close();
				if (bytesRead >= 8) {
					const magic = detectImagingMagicBytes(probeBuf.subarray(0, bytesRead));
					if (magic === "dicom") mimeType = "application/dicom";
					else if (magic === "png") mimeType = "image/png";
					else if (magic === "jpeg") mimeType = "image/jpeg";
					else if (magic === "heic") mimeType = "image/heic";
				}
			} catch {
				// fallback to octet-stream
			}
		}

		if (range && (typeof range.start === "number" || typeof range.end === "number")) {
			const start = range.start ?? 0;
			const end = range.end ?? totalSize - 1;
			const clampedStart = Math.max(0, Math.min(start, totalSize - 1));
			const clampedEnd = Math.max(clampedStart, Math.min(end, totalSize - 1));
			const contentLength = clampedEnd - clampedStart + 1;
			const stream = createReadStream(resolved, { start: clampedStart, end: clampedEnd });
			return {
				stream,
				storagePath: resolved,
				fileSizeBytes: totalSize,
				mimeType,
				isRange: true,
				rangeStart: clampedStart,
				rangeEnd: clampedEnd,
				contentLength,
			};
		}

		const stream = createReadStream(resolved);
		return {
			stream,
			storagePath: resolved,
			fileSizeBytes: totalSize,
			mimeType,
			isRange: false,
			contentLength: totalSize,
		};
	}

	/**
	 * Safely deletes a file from tenant-isolated storage.
	 */
	public static async deleteTenantFile(
		organizationId: string,
		storagePathOrName: string,
	): Promise<boolean> {
		const resolved = resolvePacsTenantStoragePath(organizationId, storagePathOrName);
		if (existsSync(resolved)) {
			await fs.unlink(resolved);
			return true;
		}
		return false;
	}
}
